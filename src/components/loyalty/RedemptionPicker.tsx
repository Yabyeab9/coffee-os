/**
 * RedemptionPicker — lets a customer choose an active loyalty redemption
 * code to apply to an order or reservation.
 *
 * Props:
 *  - userId: current user id (to fetch their active redemptions)
 *  - orderTotal: total amount the redemption will be applied against
 *  - onApply(code, discountAmount): called when the user selects a code
 *  - onClear(): called when the user removes the applied code
 *  - appliedCode: currently applied code (controlled)
 *  - appliedDiscount: currently applied discount amount (controlled)
 */
import React, { useEffect, useState } from 'react';
import { Gift, X, ChevronRight, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface Redemption {
  id: string;
  redemption_code: string;
  etb_value: number;
  expires_at: string | null;
}

interface RedemptionPickerProps {
  orderTotal: number;
  onApply: (code: string, discountAmount: number) => void;
  onClear: () => void;
  appliedCode: string | null;
  appliedDiscount: number;
}

export default function RedemptionPicker({
  orderTotal, onApply, onClear, appliedCode, appliedDiscount,
}: RedemptionPickerProps) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const { data } = await supabase
        .from('loyalty_redemptions')
        .select('id, redemption_code, etb_value, expires_at')
        .eq('status', 'active')
        .or('applied_order_id.is.null,applied_reservation_id.is.null')
        .is('applied_order_id', null)
        .is('applied_reservation_id', null)
        .order('created_at', { ascending: false });
      setRedemptions(
        (data ?? []).filter(r => !r.expires_at || new Date(r.expires_at) > new Date())
      );
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking rewards…
      </div>
    );
  }

  if (redemptions.length === 0) return null;

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 text-sm">
        <div className="flex items-center gap-2 text-primary min-w-0">
          <Gift className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono font-semibold">{appliedCode}</span>
          <span className="text-primary/70">–{appliedDiscount.toFixed(0)} ETB</span>
        </div>
        <button onClick={onClear} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Gift className="w-3 h-3" /> Apply Reward
      </p>
      {redemptions.map(r => {
        const discount = Math.min(r.etb_value, orderTotal);
        return (
          <button
            key={r.id}
            onClick={() => onApply(r.redemption_code, discount)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-mono text-xs font-semibold text-foreground">{r.redemption_code}</span>
                <span className="ml-2 text-xs text-primary font-medium">{r.etb_value} ETB</span>
                {r.expires_at && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    exp. {new Date(r.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="secondary" className="text-[10px]">–{discount.toFixed(0)} ETB</Badge>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        );
      })}
    </div>
  );
}