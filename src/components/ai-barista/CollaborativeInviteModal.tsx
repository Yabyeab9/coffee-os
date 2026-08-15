import React, { useState } from 'react';
import { Users, Link2, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  cafeId: string;
}

function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CollaborativeInviteModal({ open, onClose, cafeId }: Props) {
  const { profile } = useAuth();
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!profile?.id) return;
    if (!contact.trim()) {
      toast.error('Enter your friend\'s email or phone');
      return;
    }
    setLoading(true);
    try {
      const code = generateSessionCode();
      const { error } = await supabase.from('collaborative_taste_sessions').insert({
        cafe_id: cafeId,
        customer_1_id: profile.id,
        session_code: code,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      });
      if (error) throw error;
      setSessionCode(code);
      toast.success('Session created!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContact('');
    setSessionCode(null);
    onClose();
  };

  const shareLink = sessionCode
    ? `${window.location.origin}/account/ai-recommendations?collab=${sessionCode}`
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Taste Discovery — Invite a Friend</DialogTitle>
        </DialogHeader>

        {!sessionCode ? (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Invite a friend to rate drinks together. The AI will learn your shared preferences and suggest drinks you'll both enjoy.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Friend's email or phone</label>
              <Input
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="friend@example.com"
                className="h-9 text-sm"
              />
            </div>
            <Button
              className="w-full h-9 text-xs gap-1.5"
              onClick={handleCreate}
              disabled={loading || !contact.trim()}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              Create Taste Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mx-auto">
              <Check className="w-5 h-5 text-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Session ready!</p>
              <p className="text-xs text-muted-foreground">Share this code with your friend</p>
              <p className="text-2xl font-mono font-semibold tracking-widest text-foreground">{sessionCode}</p>
            </div>
            {shareLink && (
              <button
                onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Link copied!'); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border border-border hover:border-foreground/30 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Copy invite link
              </button>
            )}
            <p className="text-[10px] text-muted-foreground text-center">Session expires in 24 hours</p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
