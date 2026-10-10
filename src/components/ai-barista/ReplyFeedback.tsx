import React, { useState } from 'react';
import { Check, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { recordReplyFeedback } from '@/lib/ai-barista-client';

interface Props {
  messageId: string;
  userId: string | null;
  cafeId: string | null;
  /** The customer message that triggered this reply (for the prompt record). */
  prompt: string;
  reply: string;
}

/**
 * Thumbs up / down on an AI reply. Feedback is persisted to
 * `ai_generations.feedback` so recommendation quality can be
 * measured — and it never alters the visible chat.
 */
export default function ReplyFeedback({
  messageId: _messageId,
  userId,
  cafeId,
  prompt,
  reply,
}: Props) {
  const [choice, setChoice] = useState<1 | -1 | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!userId) return null;

  const send = async (value: 1 | -1) => {
    if (choice || saving) return;
    setSaving(true);
    const ok = await recordReplyFeedback(userId, cafeId, prompt, reply, value);
    setSaving(false);
    if (ok) {
      setChoice(value);
      setDone(true);
      toast.success(value === 1 ? 'Thanks — the barista will learn from this.' : 'Noted. The barista will do better.');
      window.setTimeout(() => setDone(false), 1800);
    }
  };

  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => void send(1)}
        disabled={saving || choice !== null}
        title="Good reply"
        className={`p-1 rounded transition-colors disabled:opacity-40 ${
          choice === 1
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground/60 hover:text-foreground'
        }`}
      >
        {done && choice === 1 ? <Check className="w-3 h-3" /> : <ThumbsUp className="w-3 h-3" />}
      </button>
      <button
        type="button"
        onClick={() => void send(-1)}
        disabled={saving || choice !== null}
        title="Bad reply"
        className={`p-1 rounded transition-colors disabled:opacity-40 ${
          choice === -1
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground/60 hover:text-foreground'
        }`}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
      </button>
    </span>
  );
}
