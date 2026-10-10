import React, { useEffect, useState } from 'react';
import {
  Gift, Loader2, Send, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { listSentGifts, type GiftRow } from '@/lib/ai-barista-client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSendNew: () => void;
}

/**
 * Gift Center — every voucher you have sent, with its QR
 * code, recipient and expiry. Real data from `coffee_gifts`.
 */
export default function GiftCenterModal({ open, onClose, onSendNew }: Props) {
  const { profile } = useAuth();
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !profile?.id) return;
    let active = true;
    setLoading(true);
    setError(false);
    listSentGifts(profile.id)
      .then(rows => {
        if (active) setGifts(rows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, profile?.id]);

  const now = Date.now();
  const activeGifts = gifts.filter(g => {
    if (!g.expires_at) return true;
    return new Date(g.expires_at).getTime() > now;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">Gift Center</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Every voucher you have sent — with its QR code for redemption
            at the café counter.
          </DialogDescription>
        </DialogHeader>

        <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={onSendNew}>
          <Send className="w-3.5 h-3.5" /> Send a new gift
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-warning" />
            Could not load your gifts.
          </div>
        ) : gifts.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center space-y-2">
            <Gift className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              No gifts yet. Ask your barista to gift a drink to a friend and
              the voucher will appear here with its QR code.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {gifts.map(gift => {
              const expired = gift.expires_at
                ? new Date(gift.expires_at).getTime() <= now
                : false;
              const isActive = activeGifts.some(g => g.id === gift.id);
              return (
                <div
                  key={gift.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isActive
                      ? 'border-border bg-card'
                      : 'border-border/40 bg-muted/20 opacity-70'
                  }`}
                >
                  <div className="shrink-0">
                    {gift.qr_code ? (
                      <div className="bg-white rounded-lg p-1.5">
                        <QRCodeDataUrl text={gift.qr_code} width={64} />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Gift className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {gift.drink_name ?? 'Drinks voucher'} → {gift.recipient_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {gift.recipient_contact ?? ''}
                    </p>
                    {gift.message && (
                      <p className="text-[11px] text-muted-foreground italic truncate mt-0.5">
                        “{gift.message}”
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {expired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" /> Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-success">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid until{' '}
                          {gift.expires_at
                            ? new Date(gift.expires_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {gift.status ?? 'pending'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
