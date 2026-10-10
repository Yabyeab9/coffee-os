import React, { useMemo, useState } from 'react';
import {
  Search, Trash2, MessageSquare, Flame, Coffee, Loader2,
} from 'lucide-react';
import type { ChatMode, ChatSessionRow } from '@/lib/ai-barista-client';
import { getSessionMode } from '@/lib/ai-barista-client';

interface Props {
  sessions: ChatSessionRow[];
  firstMessages: Record<string, string | undefined>;
  activeSessionId: string | null;
  activeMode: ChatMode;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onNewChat: () => void;
  loading?: boolean;
}

/**
 * Conversation history — every saved thread, both modes, with
 * auto-derived titles, search and delete.
 */
export default function ConversationHistory({
  sessions,
  firstMessages,
  activeSessionId,
  activeMode,
  onSelect,
  onDelete,
  onNewChat,
  loading,
}: Props) {
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter(s => getSessionMode(s.id, s) === activeMode)
      .filter(s => {
        if (!q) return true;
        const title =
          s.title ?? firstMessages[s.id] ?? '';
        return title.toLowerCase().includes(q);
      })
      .slice(0, 30);
  }, [sessions, firstMessages, activeMode, query]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2.5 border-b border-border/40 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={onNewChat}
          className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="px-3 py-8 text-center space-y-1.5">
            <MessageSquare className="w-4 h-4 text-muted-foreground mx-auto" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {query
                ? 'No conversations match your search.'
                : 'No conversations yet — your barista is ready when you are.'}
            </p>
          </div>
        ) : (
          visible.map(session => {
            const mode = getSessionMode(session.id, session);
            const isActive = session.id === activeSessionId;
            const title =
              session.title ??
              firstMessages[session.id] ??
              'Untitled conversation';
            const time = session.session_start ?? session.created_at;
            const isDeleting = confirmDelete === session.id;
            return (
              <div
                key={session.id}
                className={`group relative rounded-lg border transition-colors ${
                  isActive
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-transparent hover:bg-muted/30'
                }`}
              >
                <button
                  onClick={() => onSelect(session.id)}
                  className="w-full text-left px-2.5 py-2 flex items-start gap-2"
                >
                  {mode === 'roast' ? (
                    <Flame className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                  ) : (
                    <Coffee className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-foreground truncate">
                      {title}
                    </span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {time
                        ? new Date(time).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (isDeleting) {
                      onDelete(session.id);
                      setConfirmDelete(null);
                    } else {
                      setConfirmDelete(session.id);
                      window.setTimeout(
                        () => setConfirmDelete(c => (c === session.id ? null : c)),
                        2500,
                      );
                    }
                  }}
                  title={isDeleting ? 'Confirm delete' : 'Delete conversation'}
                  className={`absolute right-1.5 top-1.5 p-1 rounded-md transition-colors ${
                    isDeleting
                      ? 'bg-destructive text-destructive-foreground'
                      : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10'
                  }`}
                >
                  {isDeleting ? (
                    <span className="text-[9px] font-bold px-0.5">Sure?</span>
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
