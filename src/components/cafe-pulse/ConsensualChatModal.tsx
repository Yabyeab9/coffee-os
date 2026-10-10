import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Conversation {
  id: string;
  cafe_id: string;
  initiator_session: string;
  recipient_session: string;
  initial_topic: string;
  status: 'pending' | 'accepted' | 'declined' | 'closed';
  created_at: string;
  expires_at: string;
}

export interface PrivateMessage {
  id: string;
  conversation_id: string;
  sender_session: string;
  content: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId: string;
  sessionToken: string;
}

export default function ConsensualChatModal({
  open,
  onOpenChange,
  cafeId,
  sessionToken,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [text, setText] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load conversations involving this session or open invitations
  const fetchConversations = useCallback(async () => {
    if (!cafeId || !sessionToken) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cafe_pulse_conversations')
        .select('*')
        .eq('cafe_id', cafeId)
        .or(`initiator_session.eq.${sessionToken},recipient_session.eq.${sessionToken},recipient_session.eq.open_invitation`)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversations((data as Conversation[]) ?? []);
      if (activeConv) {
        const refreshed = data?.find(c => c.id === activeConv.id);
        if (refreshed) setActiveConv(refreshed);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [cafeId, sessionToken, activeConv?.id]);

  useEffect(() => {
    if (open) {
      fetchConversations();
      // Realtime channel for instant invitation and status change sync
      const channel = supabase
        .channel(`pulse_conversations_${cafeId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cafe_pulse_conversations', filter: `cafe_id=eq.${cafeId}` },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, cafeId, fetchConversations]);

  // Load messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConv?.id) return;
    const { data } = await supabase
      .from('cafe_pulse_private_messages')
      .select('*')
      .eq('conversation_id', activeConv.id)
      .order('created_at', { ascending: true });

    setMessages((data as PrivateMessage[]) ?? []);
  }, [activeConv?.id]);

  useEffect(() => {
    if (activeConv?.id) {
      fetchMessages();
      // Realtime channel for live private messages
      const channel = supabase
        .channel(`pulse_pm_${activeConv.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'cafe_pulse_private_messages', filter: `conversation_id=eq.${activeConv.id}` },
          (payload) => {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new as PrivateMessage];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeConv?.id, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConv || activeConv.status !== 'accepted') return;

    try {
      const { error } = await supabase.from('cafe_pulse_private_messages').insert({
        conversation_id: activeConv.id,
        sender_session: sessionToken,
        content: text.trim().slice(0, 200),
      });

      if (error) throw error;
      setText('');
      fetchMessages();
    } catch {
      toast.error('Failed to send private message');
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !cafeId) return;

    try {
      const { error } = await supabase
        .from('cafe_pulse_conversations')
        .insert({
          cafe_id: cafeId,
          initiator_session: sessionToken,
          recipient_session: 'open_invitation',
          initial_topic: newTopic.trim(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Invitation open on the collective wavelength');
      setNewTopic('');
      setIsStartingNew(false);
      fetchConversations();
    } catch {
      toast.error('Failed to create invitation');
    }
  };

  const handleRespond = async (convId: string, status: 'accepted' | 'declined') => {
    try {
      const updatePayload: Record<string, any> = { status };
      if (status === 'accepted') {
        updatePayload.recipient_session = sessionToken;
      }
      const { error } = await supabase
        .from('cafe_pulse_conversations')
        .update(updatePayload)
        .eq('id', convId);
      if (error) throw error;

      toast.success(status === 'accepted' ? 'Connection accepted! Channel active.' : 'Invitation declined.');
      fetchConversations();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">Consensual 1-to-1 Wavelength</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Anonymous, mutual-opt-in connection. Zero names, phone numbers, or account links are ever shared.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Conversation List */}
          <div className="border border-border rounded-xl p-3 space-y-2 md:col-span-1 bg-muted/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Channels
              </span>
              <button
                onClick={() => setIsStartingNew(true)}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                + New Invite
              </button>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {loading ? (
                <p role="status" className="py-4 text-center text-xs text-muted-foreground">Syncing open channels…</p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No active channels.
                </p>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveConv(conv); setIsStartingNew(false); }}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                      activeConv?.id === conv.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <p className="font-medium truncate text-foreground">{conv.initial_topic}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        {conv.status}
                      </Badge>
                      <span className="text-muted-foreground">4h TTL</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Content or Start New */}
          <div className="md:col-span-2 border border-border rounded-xl p-4 flex flex-col justify-between min-h-[340px] bg-card">
            {isStartingNew ? (
              <form onSubmit={handleCreateInvitation} className="space-y-3 my-auto">
                <div className="space-y-1 text-center">
                  <ShieldCheck className="w-6 h-6 text-primary mx-auto" />
                  <h4 className="text-xs font-semibold text-foreground">Propose a Mutual Connection</h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Suggest a brief topic (e.g. "Looking for founders in specialty coffee" or "Deep work silence companion").
                  </p>
                </div>
                <Input
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="Topic of conversation…"
                  maxLength={100}
                  className="text-xs"
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsStartingNew(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!newTopic.trim()} className="text-xs">
                    Post Invitation
                  </Button>
                </div>
              </form>
            ) : activeConv ? (
              <div className="flex flex-col h-full justify-between space-y-3">
                <div className="border-b border-border/40 pb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{activeConv.initial_topic}</p>
                    <p className="text-[10px] text-muted-foreground">End-to-end anonymous · Ephemeral channel</p>
                  </div>
                  {activeConv.status === 'pending' && activeConv.initiator_session !== sessionToken && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => handleRespond(activeConv.id, 'declined')} className="text-xs h-6 px-2">
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => handleRespond(activeConv.id, 'accepted')} className="text-xs h-6 px-2">
                        Accept
                      </Button>
                    </div>
                  )}
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 max-h-[220px]">
                  {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {activeConv.status === 'pending'
                        ? 'Waiting for mutual consent before channel opens…'
                        : 'Channel open. Say hello on the shared frequency!'}
                    </p>
                  ) : (
                    messages.map(m => {
                      const isMe = m.sender_session === sessionToken;
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs ${
                              isMe
                                ? 'bg-foreground text-background rounded-br-sm'
                                : 'bg-muted border border-border text-foreground rounded-bl-sm'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                {activeConv.status === 'accepted' ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Type a safe message (max 200 chars)…"
                      maxLength={200}
                      className="text-xs h-8"
                    />
                    <Button type="submit" size="sm" disabled={!text.trim()} className="h-8 px-3 text-xs">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center pt-2 border-t border-border/30">
                    Messaging unlocks only upon mutual agreement.
                  </p>
                )}
              </div>
            ) : (
              <div className="my-auto text-center space-y-1.5 text-muted-foreground">
                <MessageCircle className="w-6 h-6 mx-auto stroke-[1.5]" />
                <p className="text-xs font-medium text-foreground">Select or start a channel</p>
                <p className="text-[11px]">Connect safely on the café's anonymous wavelength.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}