import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Wallet, Gift, Tag, RefreshCcw, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function WalletPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();

  // ── Wallet data ────────────────────────────────────────────────────────────
  const { data: wallet, isLoading, isError } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      const [{ data: balance }, { data: txs }] = await Promise.all([
        supabase.from('wallet_balances').select('*').eq('user_id', userId).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId)
          .order('created_at', { ascending: false }).limit(20),
      ]);
      return { balance: balance ?? null, transactions: txs ?? [] };
    },
    enabled: !!userId,
  });

  // ── Gift card redemption state ─────────────────────────────────────────────
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ amount: number; currency: string } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const openRedeemDialog = () => {
    setCode('');
    setRedeemResult(null);
    setRedeemError(null);
    setRedeemOpen(true);
  };

  const handleRedeem = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) { setRedeemError('Please enter a gift card code.'); return; }
    if (!userId || !profile) { setRedeemError('You must be signed in to redeem a gift card.'); return; }

    setRedeeming(true);
    setRedeemError(null);
    setRedeemResult(null);

    try {
      // 1. Look up the code — only unredeemed codes are visible per RLS
      const { data: giftCard, error: lookupErr } = await supabase
        .from('gift_card_codes')
        .select('id, code, amount, currency, is_redeemed, expires_at')
        .eq('code', trimmedCode)
        .single();

      if (lookupErr || !giftCard) {
        setRedeemError('This code is invalid or has already been redeemed.');
        return;
      }

      // 2. Check expiry
      if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
        setRedeemError('This gift card has expired.');
        return;
      }

      // 3. Mark code as redeemed atomically
      const { error: updateErr } = await supabase
        .from('gift_card_codes')
        .update({
          is_redeemed: true,
          redeemed_by: userId,
          redeemed_at: new Date().toISOString(),
        })
        .eq('id', giftCard.id)
        .eq('is_redeemed', false); // guard against race condition

      if (updateErr) {
        setRedeemError('This code was just redeemed by another request. Please try a different code.');
        return;
      }

      // 4. Credit the user's gift_card_balance
      const currentBalance = wallet?.balance?.gift_card_balance ?? 0;
      const { error: balErr } = await supabase
        .from('wallet_balances')
        .upsert({
          user_id: userId,
          gift_card_balance: Number(currentBalance) + Number(giftCard.amount),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (balErr) throw balErr;

      // 5. Record the transaction
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: giftCard.amount,
        transaction_type: 'credit',
        balance_type: 'gift_card_balance',
        description: `Gift card redeemed — ${trimmedCode}`,
        reference_id: giftCard.id,
      });

      // 6. Refresh wallet data
      queryClient.invalidateQueries({ queryKey: ['wallet', userId] });

      setRedeemResult({ amount: giftCard.amount, currency: giftCard.currency });
      toast.success(`Gift card redeemed — ${giftCard.amount} ${giftCard.currency} added to your balance.`);
    } catch (err: any) {
      setRedeemError(err?.message ?? 'An unexpected error occurred. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  // ── Loading / error skeletons ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => <div key={i} className="h-40 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto text-center">
        <p className="text-destructive">Failed to load wallet data. Please try again later.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Wallet className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Digital Wallet</h1>
      </div>
      <p className="text-muted-foreground">Manage your store credits, gift cards, and promotional balances.</p>

      {/* ── Balance Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 border border-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Store Credits</h3>
          <p className="text-3xl font-bold text-foreground">
            {wallet?.balance?.store_credits ?? 0}{' '}
            <span className="text-lg font-normal text-muted-foreground">ETB</span>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6 border border-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center mb-4">
            <Gift className="w-6 h-6 text-info" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Gift Card Balance</h3>
          <p className="text-3xl font-bold text-foreground">
            {wallet?.balance?.gift_card_balance ?? 0}{' '}
            <span className="text-lg font-normal text-muted-foreground">ETB</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-border"
            onClick={openRedeemDialog}
          >
            Redeem Code
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6 border border-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <RefreshCcw className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Refund Balance</h3>
          <p className="text-3xl font-bold text-foreground">
            {wallet?.balance?.refund_balance ?? 0}{' '}
            <span className="text-lg font-normal text-muted-foreground">ETB</span>
          </p>
        </motion.div>
      </div>

      {/* ── Recent Transactions ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <RefreshCcw className="w-5 h-5" /> Recent Transactions
        </h3>
        <div className="glass rounded-xl p-2 border border-border">
          {(!wallet?.transactions || wallet.transactions.length === 0) ? (
            <div className="p-8 text-center text-muted-foreground">
              No recent wallet transactions.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {wallet.transactions.map((tx: any) => (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{tx.balance_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className={`font-semibold shrink-0 ${tx.transaction_type === 'credit' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.transaction_type === 'credit' ? '+' : '−'}{tx.amount} ETB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Gift Card Redemption Dialog ────────────────────────────────────── */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" /> Redeem Gift Card
            </DialogTitle>
            <DialogDescription>
              Enter your gift card code to add its value to your Gift Card Balance.
            </DialogDescription>
          </DialogHeader>

          {redeemResult ? (
            // ── Success state ──────────────────────────────────────────────
            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">Redeemed successfully!</p>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-bold">{redeemResult.amount} {redeemResult.currency}</span> has been added to your Gift Card Balance.
              </p>
              <Button onClick={() => setRedeemOpen(false)} className="mt-2 w-full">
                Done
              </Button>
            </div>
          ) : (
            // ── Entry state ────────────────────────────────────────────────
            <>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gift-code">Gift Card Code</Label>
                  <Input
                    id="gift-code"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setRedeemError(null); }}
                    placeholder="e.g. GIFT-XXXX-XXXX"
                    className="font-mono tracking-widest uppercase"
                    disabled={redeeming}
                    onKeyDown={e => { if (e.key === 'Enter') handleRedeem(); }}
                  />
                </div>

                {redeemError && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{redeemError}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setRedeemOpen(false)} disabled={redeeming}>
                  Cancel
                </Button>
                <Button onClick={handleRedeem} disabled={redeeming || !code.trim()}>
                  {redeeming
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying…</>
                    : 'Redeem'
                  }
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}