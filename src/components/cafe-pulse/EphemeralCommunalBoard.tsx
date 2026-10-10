import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, Sparkles, Send, Flag, Clock, Loader2, Headphones, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface PulseMessage {
  id: string;
  sender_session: string;
  content: string;
  message_type: 'public_board' | 'barista_appreciation' | 'vibe_note';
  created_at: string;
  expires_at: string;
  parent_message_id?: string | null;
}

interface ReactionCount {
  [reactionType: string]: number;
}

interface Props {
  cafeId: string;
  sessionToken: string;
  readOnly?: boolean;
}

const REACTION_ICONS: Record<string, { icon: any; label: string }> = {
  heart: { icon: Heart, label: 'Warmth' },
  coffee: { icon: Sparkles, label: 'Cheers' },
  headphones: { icon: Headphones, label: 'In the zone' },
};

export default function EphemeralCommunalBoard({
  cafeId,
  sessionToken,
  readOnly = false,
}: Props) {
  const [messages, setMessages] = useState<PulseMessage[]>([]);
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<'public_board' | 'barista_appreciation' | 'vibe_note'>('public_board');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [posting, setPosting] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  
  // Reactions state: messageId -> { reactionType: count }
  const [reactions, setReactions] = useState<Record<string, ReactionCount>>({});
  // User's own reactions: `${messageId}_${reactionType}` -> boolean
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  
  // In-line reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messageRequest = useRef(0);

  useEffect(() => {
    if (readOnly) {
      setReplyingToId(null);
      setReplyText('');
    }
  }, [readOnly]);

  const fetchReactions = useCallback(async (msgIds: string[]) => {
    if (!msgIds.length) return;
    try {
      const { data } = await supabase
        .from('cafe_pulse_message_reactions')
        .select('message_id, reaction_type, session_token')
        .in('message_id', msgIds);

      if (data) {
        const counts: Record<string, ReactionCount> = {};
        const mine = new Set<string>();

        data.forEach((r: any) => {
          if (!counts[r.message_id]) counts[r.message_id] = {};
          counts[r.message_id][r.reaction_type] = (counts[r.message_id][r.reaction_type] || 0) + 1;
          if (r.session_token === sessionToken) {
            mine.add(`${r.message_id}_${r.reaction_type}`);
          }
        });

        setReactions(counts);
        setMyReactions(mine);
      }
    } catch {
      // ignore
    }
  }, [sessionToken]);

  const fetchMessages = useCallback(async () => {
    if (!cafeId) return;
    const requestId = ++messageRequest.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cafe_pulse_messages')
        .select('*')
        .eq('cafe_id', cafeId)
        .eq('is_flagged', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) throw error;
      if (requestId !== messageRequest.current) return;
      const list = (data as PulseMessage[]) ?? [];
      setMessages(list);
      setLoadError(false);
      if (list.length > 0) {
        void fetchReactions(list.map(m => m.id));
      }
    } catch (err) {
      console.error('Failed to fetch pulse messages:', err);
      if (requestId === messageRequest.current) setLoadError(true);
    } finally {
      if (requestId === messageRequest.current) setLoading(false);
    }
  }, [cafeId, fetchReactions]);

  useEffect(() => {
    fetchMessages();

    // Live Realtime listener for new communal messages & reactions
    const msgChannel = supabase
      .channel(`cafe_pulse_board_${cafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_pulse_messages', filter: `cafe_id=eq.${cafeId}` },
        () => {
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_pulse_message_reactions' },
        () => {
          setMessages(current => {
            if (current.length) fetchReactions(current.map(m => m.id));
            return current;
          });
        }
      )
      .subscribe();

    const handleFocus = () => {
      if (document.visibilityState === 'visible') void fetchMessages();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      messageRequest.current += 1;
      supabase.removeChannel(msgChannel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [cafeId, fetchMessages, fetchReactions]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const text = content.trim();
    if (!text || text.length > 200 || !cafeId) return;

    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('cafe_pulse_messages')
        .insert({
          cafe_id: cafeId,
          sender_session: sessionToken,
          content: text,
          message_type: noteType,
        })
        .select()
        .single();

      if (error) throw error;
      setMessages(prev => [data, ...prev]);
      setContent('');
      toast.success('Your anonymous note is posted on the communal board (4h TTL)');
    } catch {
      toast.error('Failed to post note. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    if (readOnly) return;
    const text = replyText.trim();
    if (!text || text.length > 150 || !cafeId) return;

    setSendingReply(true);
    try {
      const { error } = await supabase
        .from('cafe_pulse_messages')
        .insert({
          cafe_id: cafeId,
          sender_session: sessionToken,
          content: text,
          message_type: 'vibe_note',
          parent_message_id: parentId,
        });

      if (error) throw error;
      setReplyText('');
      setReplyingToId(null);
      toast.success('In-line reply posted anonymously.');
          void fetchMessages();
    } catch {
      toast.error('Failed to submit reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleReaction = async (msgId: string, reactionType: string) => {
    if (readOnly) return;
    const key = `${msgId}_${reactionType}`;
    const alreadyReacted = myReactions.has(key);

    try {
      if (alreadyReacted) {
        const { error } = await supabase
          .from('cafe_pulse_message_reactions')
          .delete()
          .match({ message_id: msgId, reaction_type: reactionType, session_token: sessionToken });
        if (error) throw error;

        setMyReactions(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setReactions(prev => ({
          ...prev,
          [msgId]: {
            ...prev[msgId],
            [reactionType]: Math.max(0, (prev[msgId]?.[reactionType] || 1) - 1),
          },
        }));
      } else {
        const { error } = await supabase
          .from('cafe_pulse_message_reactions')
          .insert({
            message_id: msgId,
            reaction_type: reactionType,
            session_token: sessionToken,
          });
        if (error) throw error;

        setMyReactions(prev => new Set(prev).add(key));
        setReactions(prev => ({
          ...prev,
          [msgId]: {
            ...prev[msgId],
            [reactionType]: (prev[msgId]?.[reactionType] || 0) + 1,
          },
        }));
      }
    } catch {
      toast.error('Could not update this reaction. Please try again.');
    }
  };

  const handleReport = async (msgId: string) => {
    if (reportedIds.has(msgId)) return;
    try {
      const { error } = await supabase.from('cafe_pulse_reports').insert({
        cafe_id: cafeId,
        reporter_session: sessionToken,
        reported_message_id: msgId,
        reason: 'Inappropriate or offensive community content',
      });
      if (error) throw error;
      setReportedIds(prev => new Set(prev).add(msgId));
      toast.info('Thank you. Message flagged for barista review.');
    } catch {
      toast.error('Failed to submit flag');
    }
  };

  // Group top-level messages and nested replies
  const topLevelMessages = messages.filter(m => !m.parent_message_id);
  const repliesByParent: Record<string, PulseMessage[]> = {};
  messages.filter(m => m.parent_message_id).forEach(r => {
    const pId = r.parent_message_id!;
    if (!repliesByParent[pId]) repliesByParent[pId] = [];
    repliesByParent[pId].push(r);
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Ephemeral Communal Board
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> Auto-expires in 4 hours · Live Sync
        </span>
      </div>

      {/* Post Form */}
      {readOnly ? (
        <div role="status" className="border-l-2 border-primary/50 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Observer mode is on. Notes, replies, and reactions are paused; reporting remains available for safety.
        </div>
      ) : <form onSubmit={handlePost} className="space-y-2">
        <div className="flex gap-1.5 pb-1">
          {[
            { key: 'public_board', label: 'Communal Wall' },
            { key: 'barista_appreciation', label: 'Barista Shoutout' },
            { key: 'vibe_note', label: 'Ambient Thought' },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setNoteType(t.key as any)}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                noteType === t.key
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={200}
            placeholder={
              noteType === 'barista_appreciation'
                ? 'Leave a warm note for the baristas behind the bar…'
                : 'Share an anonymous thought or vibe from your table…'
            }
            className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[64px] resize-none"
          />
          <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
            {content.length}/200
          </span>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={posting || !content.trim()}
            className="h-7 text-xs px-3"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Broadcast Note
          </Button>
        </div>
      </form>}

      {/* Messages Feed */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {loading && messages.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
            Reading ambient frequency…
          </div>
        ) : loadError && messages.length === 0 ? (
          <div role="alert" className="flex flex-wrap items-center justify-center gap-3 py-6 text-center text-xs text-destructive">
            <span>Could not load the communal board.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void fetchMessages()}>Retry</Button>
          </div>
        ) : topLevelMessages.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-border/80 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">The board is calm and empty</p>
            <p className="text-[11px] text-muted-foreground">
              {readOnly ? 'Nothing has been shared in this window.' : 'Leave an unhurried note or a barista compliment.'}
            </p>
          </div>
        ) : (
          topLevelMessages.map(msg => {
            const msgReplies = repliesByParent[msg.id] || [];
            const msgReactions = reactions[msg.id] || {};

            return (
              <div
                key={msg.id}
                className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 font-normal ${
                      msg.message_type === 'barista_appreciation'
                        ? 'border-rose-400/40 text-rose-500 bg-rose-50/20'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {msg.message_type === 'barista_appreciation' ? 'Barista Love' : 'Communal Note'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleReport(msg.id)}
                      title="Flag note"
                      className="text-muted-foreground/50 hover:text-destructive text-[10px] p-0.5"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-foreground leading-relaxed break-words">{msg.content}</p>

                {/* Reactions + Reply toolbar */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <div className="flex items-center gap-1.5">
                    {Object.entries(REACTION_ICONS).map(([type, { icon: Icon }]) => {
                      const count = msgReactions[type] || 0;
                      const active = myReactions.has(`${msg.id}_${type}`);

                      return (
                        <button
                          key={type}
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleToggleReaction(msg.id, type)}
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            active
                              ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                              : 'border-transparent text-muted-foreground hover:bg-muted/30'
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${active ? 'fill-current' : ''}`} />
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setReplyingToId(replyingToId === msg.id ? null : msg.id)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Reply {msgReplies.length > 0 && `(${msgReplies.length})`}</span>
                  </button>
                </div>

                {/* In-line Reply composer */}
                {replyingToId === msg.id && (
                  <div className="pt-2 pl-3 border-l-2 border-primary/40 space-y-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write a warm anonymous reply…"
                        maxLength={150}
                        className="w-full text-xs p-1.5 px-2.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(msg.id);
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setReplyingToId(null); setReplyText(''); }}
                        className="h-6 text-[10px] px-2"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={sendingReply || !replyText.trim()}
                        onClick={() => handleSendReply(msg.id)}
                        className="h-6 text-[10px] px-2.5"
                      >
                        {sendingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Send'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Nested Replies Display */}
                {msgReplies.length > 0 && (
                  <div className="space-y-1.5 pt-1 pl-3 border-l-2 border-border/60">
                    {msgReplies.map(r => (
                      <div key={r.id} className="text-xs bg-background/60 p-2 rounded border border-border/40 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">Anonymous Response</span>
                          <span>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-foreground/90">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}