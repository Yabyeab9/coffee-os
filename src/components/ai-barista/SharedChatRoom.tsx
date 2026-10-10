import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Coffee, Flame, Loader2, Send, Users, X, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  insertSharedMessage,
  listSharedMessages,
  type CollaborationMessageRow,
  type CollaborationRow,
} from '@/lib/ai-barista-client';
import { parseDrinkCard, cleanBubbleText, type DrinkCardData } from './chat-tags';
import InChatDrinkCard from './InChatDrinkCard';

interface Props {
  collaboration: CollaborationRow;
  myRole: 'host' | 'guest';
  menu: Array<Record<string, any>>;
  onClose: () => void;
}

interface SharedMessage {
  id: string;
  role: 'host' | 'guest' | 'assistant';
  authorId: string | null;
  authorName: string | null;
  content: string;
  created_at: string;
  drinkCard?: DrinkCardData | null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Request timed out')),
      ms,
    );
    promise.then(
      v => { window.clearTimeout(timer); resolve(v); },
      e => { window.clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * The shared tasting room. Both participants see the same
 * live conversation; the AI Barista replies into the shared
 * thread. Messages persist in `barista_collaboration_messages`
 * (migration 00003) and arrive in real time via postgres_changes.
 */
export default function SharedChatRoom({
  collaboration,
  myRole,
  menu,
  onClose,
}: Props) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<SharedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const collabId = collaboration.id;
  const myId = profile?.id ?? null;
  const myName = profile?.full_name ?? (myRole === 'host' ? 'Host' : 'Guest');

  /* ── Load existing shared messages ── */
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listSharedMessages(collabId);
      setMessages(
        rows.map(r => ({
          id: r.id,
          role: r.role,
          authorId: r.author_id,
          authorName: null,
          content: r.content,
          created_at: r.created_at,
          drinkCard: parseDrinkCard(r.content),
        })),
      );
    } catch (err) {
      // The shared-chat tables arrive with migration 00003.
      setLoadError(
        'Shared chats need the latest database update (migration 00003). ' +
          'Please apply it in your Supabase dashboard, then reopen this room.',
      );
    } finally {
      setLoading(false);
    }
  }, [collabId]);

  /* ── Realtime updates ── */
  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`barista_shared_${collabId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'barista_collaboration_messages',
          filter: `collaboration_id=eq.${collabId}`,
        },
        payload => {
          const row = payload.new as CollaborationMessageRow;
          setMessages(prev =>
            prev.some(m => m.id === row.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: row.id,
                    role: row.role,
                    authorId: row.author_id,
                    authorName: null,
                    content: row.content,
                    created_at: row.created_at,
                    drinkCard: parseDrinkCard(row.content),
                  },
                ],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [collabId, load]);

  /* ── Autoscroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── Send a turn into the shared thread ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping || !myId) return;
    setInput('');

    const mine = await insertSharedMessage(collabId, myId, myRole, text);
    if (!mine) return;
    setMessages(prev => [
      ...prev,
      {
        id: mine.id,
        role: myRole,
        authorId: myId,
        authorName: myName,
        content: text,
        created_at: mine.created_at,
        drinkCard: null,
      },
    ]);

    setIsTyping(true);
    try {
      const historyForAi = [...messages, {
        id: mine.id,
        role: myRole,
        authorId: myId,
        authorName: myName,
        content: text,
        created_at: mine.created_at,
        drinkCard: null,
      }].slice(-12);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const requestMessages = [
        {
          role: 'user' as const,
          content:
            '[Barista context — not a customer message. This is a shared tasting room with two guests. ' +
            `You are replying to the whole room. Menu items available: ${menu.length}. Use menu data only if relevant.]`,
        },
        ...historyForAi.map(m => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: m.role === 'assistant'
            ? cleanBubbleText(m.content)
            : `${m.authorName ?? 'Guest'}: ${m.content}`,
        })),
      ];

      const res = await withTimeout(
        supabase.functions.invoke('ai-barista', {
          body: { messages: requestMessages, context: { menu } },
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        }),
        75_000,
      );

      if (res.error) throw new Error(res.error.message ?? 'AI Barista request failed');

      const raw: string = res.data?.reply ?? '';
      if (!raw.trim()) throw new Error('The AI Barista returned an empty reply.');

      const saved = await insertSharedMessage(collabId, null, 'assistant', raw);
      const assistantMsg: SharedMessage = {
        id: saved?.id ?? `local-${Date.now()}`,
        role: 'assistant',
        authorId: null,
        authorName: null,
        content: raw,
        created_at: new Date().toISOString(),
        drinkCard: parseDrinkCard(raw),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          authorId: null,
          authorName: null,
          content: 'The barista could not answer right now — the café connection may be busy. Try again in a moment.',
          created_at: new Date().toISOString(),
          drinkCard: null,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const otherLabel = myRole === 'host' ? 'Guest' : 'Host';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-2xl h-[min(85dvh,720px)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Tasting Room <span className="font-mono text-xs text-muted-foreground">{collaboration.session_code}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                You are the {myRole} · {otherLabel}{' '}
                {collaboration.status === 'active' ? 'is in the room' : 'has not joined yet'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Close room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <AlertCircle className="w-6 h-6 text-warning" />
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{loadError}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <Coffee className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                The table is set. Say hello to your friend and the barista —
                ask for a drink you would both enjoy.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.role === myRole && msg.authorId === myId;
              const isAssistant = msg.role === 'assistant';
              const prose = cleanBubbleText(msg.content);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {!isMe && (
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isAssistant ? 'bg-foreground/5 border-border' : 'bg-primary/10 border-primary/25'
                      }`}
                    >
                      {isAssistant ? (
                        <Coffee className="w-3.5 h-3.5 text-foreground/70" />
                      ) : msg.role === 'host' ? (
                        <Users className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Flame className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                  )}
                  <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && !isAssistant && (
                      <span className="text-[10px] text-muted-foreground">
                        {msg.role === 'host' ? 'Host' : 'Guest'}
                      </span>
                    )}
                    {prose && (
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-foreground text-background rounded-br-sm'
                            : isAssistant
                              ? 'bg-card border border-border text-foreground rounded-bl-sm'
                              : 'bg-primary/10 border border-primary/20 text-foreground rounded-bl-sm'
                        }`}
                      >
                        {prose}
                      </div>
                    )}
                    {msg.drinkCard && !isMe && (
                      <InChatDrinkCard
                        drink={{ ...msg.drinkCard, cafe_id: collaboration.cafe_id ?? undefined }}
                        onAddToCart={() => {}}
                      />
                    )}
                    <span className="text-[10px] text-muted-foreground px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <Coffee className="w-3.5 h-3.5 animate-bounce" />
              <span>The barista is crafting a reply for the table…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-border/60 bg-background/50">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={`Message the room as ${myRole}…`}
              maxLength={500}
              className="flex-1 min-w-0 text-xs px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isTyping}
              className="h-9 px-3.5 text-xs rounded-xl"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
