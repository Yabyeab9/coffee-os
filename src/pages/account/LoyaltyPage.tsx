import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Gift, Award, Star, TrendingUp, Clock, CheckCircle2, Copy, Loader2, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

const SOURCE_LABELS: Record<string, string> = {
  order: 'Order',
  reservation: 'Reservation',
  referral: 'Referral Bonus',
  challenge_completion: 'Challenge',
  reward_redemption: 'Redeemed',
  gift_card: 'Gift Card',
  manual: 'Manual Adjustment',
};

export default function LoyaltyPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);

  const cafeId = profile?.cafe_id;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['loyalty_dashboard', profile?.id],
    queryFn: async () => {
      const res = await supabase.functions.invoke('loyalty-engine', {
        body: { action: 'get_dashboard', payload: { cafe_id: cafeId } },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled: !!profile?.id && !!cafeId,
  });

  // Real-time: invalidate query when loyalty_points or notifications change
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`loyalty_rt_${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loyalty_points', filter: `user_id=eq.${profile.id}` },
        () => { qc.invalidateQueries({ queryKey: ['loyalty_dashboard', profile.id] }); },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          const n = payload.new as any;
          if (n?.type === 'loyalty_points_earned' || n?.type === 'reward_redeemed' || n?.type === 'referral_reward') {
            qc.invalidateQueries({ queryKey: ['loyalty_dashboard', profile.id] });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, qc]);

  const handleRedeem = async () => {
    setIsRedeeming(true);
    try {
      const res = await supabase.functions.invoke('loyalty-engine', {
        body: { action: 'redeem', payload: { cafe_id: cafeId } },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error ?? 'Redemption failed');
      setRedemptionResult(res.data);
      setShowRedemptionDialog(true);
      qc.invalidateQueries({ queryKey: ['loyalty_dashboard', profile?.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  if (isLoading) return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-xl" />)}
      </div>
    </div>
  );

  if (isError) return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-center">
      <p className="text-destructive mb-4">Failed to load loyalty data.</p>
      <Button variant="outline" onClick={() => refetch()}>Retry</Button>
    </div>
  );

  const balance = data?.balance ?? 0;
  const etbAvailable = data?.etbAvailable ?? 0;
  const canRedeem = data?.canRedeem ?? false;
  const rewardUnitCost = data?.rewardUnitCost ?? 200;
  const etbPerUnit = data?.etbPerUnit ?? 100;
  const currentTier = data?.currentTier;
  const nextTier = data?.nextTier;
  const lifetime = data?.points?.lifetime_points ?? 0;
  const pointsThisMonth = data?.pointsThisMonth ?? 0;
  const totalRedeemed = data?.points?.total_redeemed ?? 0;
  const transactions: any[] = data?.transactions ?? [];
  const redemptions: any[] = data?.redemptions ?? [];

  const tierProgress = nextTier
    ? Math.min(100, Math.round(((lifetime - (currentTier?.point_threshold ?? 0)) / (nextTier.point_threshold - (currentTier?.point_threshold ?? 0))) * 100))
    : 100;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Heart className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-heading font-semibold">Loyalty &amp; Rewards</h1>
          <p className="text-sm text-muted-foreground">Your personal coffee wallet</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 border border-border md:col-span-2 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-5"><Star className="w-40 h-40" /></div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Available Balance</p>
          <div className="flex items-end gap-3 mb-1">
            <span className="text-5xl font-bold text-foreground tabular-nums">{balance.toLocaleString()}</span>
            <span className="text-muted-foreground mb-1.5">pts</span>
          </div>
          <p className="text-xl font-semibold text-primary mb-1">= {etbAvailable} ETB</p>
          <p className="text-xs text-muted-foreground mb-4">{rewardUnitCost} pts = {etbPerUnit} ETB</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleRedeem} disabled={!canRedeem || isRedeeming} className="gap-2">
              {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {canRedeem ? `Redeem ${etbAvailable} ETB` : `Need ${rewardUnitCost.toLocaleString()} pts to redeem`}
            </Button>
            {currentTier && (
              <Badge variant="outline" style={{ borderColor: currentTier.color ?? '#8B5CF6', color: currentTier.color ?? '#8B5CF6' }}>
                {currentTier.name} Tier
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Lifetime Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="glass rounded-xl p-6 border border-border flex flex-col justify-between">
          <Award className="w-6 h-6 text-primary mb-3" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Lifetime Earned</p>
            <p className="text-3xl font-bold">{lifetime.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">This month: <span className="text-foreground font-semibold">+{pointsThisMonth}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Total spent: <span className="text-foreground font-semibold">{totalRedeemed.toLocaleString()}</span></p>
          </div>
        </motion.div>
      </div>

      {/* Tier Progress */}
      {nextTier && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="glass rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Progress to <span className="text-primary">{nextTier.name}</span></p>
            <p className="text-xs text-muted-foreground">{lifetime.toLocaleString()} / {nextTier.point_threshold.toLocaleString()} pts</p>
          </div>
          <Progress value={tierProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{(nextTier.point_threshold - lifetime).toLocaleString()} more points to reach {nextTier.name}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Recent Activity
          </h3>
          {transactions.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground border border-border text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No activity yet. Complete an order to earn points.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 8).map((tx: any) => {
                const isEarned = tx.transaction_type === 'earned' || (tx.points ?? 0) > 0;
                const sourceLabel = SOURCE_LABELS[tx.source_type ?? tx.source ?? ''] ?? tx.source_type ?? 'Points';
                return (
                  <div key={tx.id} className="glass rounded-lg p-3 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {isEarned
                        ? <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <ArrowDownRight className="w-4 h-4 text-primary shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{tx.description || sourceLabel}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{sourceLabel}</Badge>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ml-2 ${isEarned ? 'text-emerald-500' : 'text-foreground'}`}>
                      {isEarned ? '+' : ''}{tx.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Redemptions */}
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4" /> Your Rewards
          </h3>
          {redemptions.filter((r: any) => r.status === 'active').length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground border border-border text-sm">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No active rewards. Redeem your points above.
            </div>
          ) : (
            <div className="space-y-3">
              {redemptions.filter((r: any) => r.status === 'active').map((r: any) => (
                <div key={r.id} className="glass rounded-xl p-4 border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-primary text-lg">{r.etb_value} ETB</p>
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-xs">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-background px-2 py-0.5 rounded border border-border flex-1">{r.redemption_code}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(r.redemption_code)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {r.expires_at && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires {new Date(r.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Redemption Success Dialog */}
      <Dialog open={showRedemptionDialog} onOpenChange={setShowRedemptionDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">{redemptionResult?.etbValue} ETB Reward Unlocked!</DialogTitle>
            <DialogDescription>Your reward has been added to your wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Points spent: <span className="font-semibold text-foreground">{redemptionResult?.redemption?.points_spent?.toLocaleString()}</span></p>
              <p>Remaining balance: <span className="font-semibold text-foreground">{redemptionResult?.newBalance?.toLocaleString()} pts</span></p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Redemption Code</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-bold flex-1">{redemptionResult?.code}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(redemptionResult?.code)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {redemptionResult?.expiresAt && (
              <p className="text-xs text-muted-foreground">Valid until {new Date(redemptionResult.expiresAt).toLocaleDateString()}</p>
            )}
          </div>
          <Button onClick={() => setShowRedemptionDialog(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}