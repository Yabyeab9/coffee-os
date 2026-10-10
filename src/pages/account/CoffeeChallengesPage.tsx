import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Trophy, Target, Clock, Flame, Sparkles, Loader2,
  CheckCircle2, ArrowRight, Star, Gift, Calendar,
  ShieldAlert, RefreshCw, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

const DEFAULT_CAFE_ID = '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

function getRemainingLabel(endDate: string | null, startDate: string | null): string {
  const now = Date.now();
  if (startDate) {
    const startDiff = new Date(startDate).getTime() - now;
    if (startDiff > 0) {
      const days = Math.ceil(startDiff / 86400000);
      return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    }
  }

  if (!endDate) return 'Ongoing';
  const diff = new Date(endDate).getTime() - now;
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Ends today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function getTypeIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    streak: <Flame className="w-5 h-5 text-orange-500" />,
    explorer: <Target className="w-5 h-5 text-blue-500" />,
    collection: <Trophy className="w-5 h-5 text-yellow-500" />,
    time_challenge: <Clock className="w-5 h-5 text-indigo-500" />,
  };
  return map[type?.toLowerCase()] ?? <Sparkles className="w-5 h-5 text-primary" />;
}

export default function CoffeeChallengesPage() {
  const { profile, cafeId } = useAuth();
  const effectiveCafeId = cafeId || DEFAULT_CAFE_ID;
  const [challenges, setChallenges] = useState<any[]>([]);
  const [participations, setParticipations] = useState<Map<string, any>>(new Map());
  const [tab, setTab] = useState<'active' | 'upcoming' | 'completed' | 'expired'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [completionDialog, setCompletionDialog] = useState<any>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      // 1. Fetch real challenges from DB
      const { data: dbChallenges, error: chErr } = await supabase
        .from('challenges')
        .select('*')
        .eq('cafe_id', effectiveCafeId)
        .is('deleted_at', null)
        .order('start_date', { ascending: true });

      if (chErr) throw chErr;

      // 2. Fetch customer participations from DB
      const { data: dbParticipations, error: partErr } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('customer_id', profile.id);

      if (partErr) throw partErr;

      setChallenges(dbChallenges || []);
      const map = new Map<string, any>((dbParticipations || []).map((p: any) => [p.challenge_id, p]));
      setParticipations(map);
    } catch (err: any) {
      console.error('Failed to load challenges:', err);
      toast.error('Could not load challenges.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, effectiveCafeId]);

  useEffect(() => { load(); }, [load]);

  // Real-time: update participations dynamically
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`challenges_realtime_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `customer_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.challenge_id) return;
          setParticipations(prev => {
            const next = new Map(prev);
            next.set(updated.challenge_id, updated);
            return next;
          });
          if (updated.completed && !updated.reward_redeemed) {
            const ch = challenges.find(c => c.id === updated.challenge_id);
            if (ch) setCompletionDialog({ ...ch, participation: updated });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, challenges]);

  const handleJoin = async (challenge: any) => {
    if (!profile?.id) return;
    setJoiningId(challenge.id);
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          customer_id: profile.id,
          current_progress: 0,
          target_count: challenge.target_count ?? 1,
          completed: false,
          reward_redeemed: false,
        })
        .select()
        .single();

      if (error) throw error;
      setParticipations(prev => new Map(prev).set(challenge.id, data));
      toast.success(`Joined challenge: ${challenge.title}!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not join challenge.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleClaimReward = async (challenge: any, participation: any) => {
    if (!profile?.id || !participation) return;
    setClaimingId(challenge.id);
    try {
      const rewardPoints = challenge.reward_points || 0;

      // 1. Mark reward redeemed
      const { error: updErr } = await supabase
        .from('challenge_participants')
        .update({
          reward_redeemed: true,
          redeemed_at: new Date().toISOString(),
          reward_issued: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', participation.id);

      if (updErr) throw updErr;

      // 2. Issue points to loyalty_points
      if (rewardPoints > 0) {
        const { data: lp } = await supabase
          .from('loyalty_points')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        const newBal = (lp?.points_balance ?? 0) + rewardPoints;
        if (lp) {
          await supabase.from('loyalty_points').update({
            points_balance: newBal,
            lifetime_points: (lp.lifetime_points ?? 0) + rewardPoints,
            total_earned: (lp.total_earned ?? 0) + rewardPoints,
            updated_at: new Date().toISOString(),
          }).eq('user_id', profile.id);
        } else {
          await supabase.from('loyalty_points').insert({
            user_id: profile.id,
            points_balance: rewardPoints,
            lifetime_points: rewardPoints,
            total_earned: rewardPoints,
          });
        }

        await supabase.from('loyalty_transactions').insert({
          user_id: profile.id,
          transaction_type: 'earned',
          points: rewardPoints,
          source: 'challenge_completion',
          source_type: 'challenge',
          source_id: challenge.id,
          balance_after: newBal,
          description: `+${rewardPoints} pts — Completed challenge: ${challenge.title}`,
        });
      }

      setParticipations(prev => {
        const next = new Map(prev);
        next.set(challenge.id, { ...participation, reward_redeemed: true, reward_issued: true });
        return next;
      });

      toast.success(`🎉 Claimed ${rewardPoints} Loyalty Points!`);
      if (completionDialog) setCompletionDialog(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to claim reward. Please try again.');
    } finally {
      setClaimingId(null);
    }
  };

  // Group challenges strictly according to active date windows and completion status
  const todayStr = new Date().toISOString().split('T')[0];

  const activeChallenges = useMemo(() => {
    return challenges.filter(c => {
      const part = participations.get(c.id);
      if (part?.completed) return false;
      const isScheduled = c.status === 'scheduled' || (c.start_date && c.start_date > todayStr);
      if (isScheduled) return false;
      const isPast = c.status === 'archived' || (c.end_date && c.end_date < todayStr);
      if (isPast) return false;
      return c.status === 'active';
    });
  }, [challenges, participations, todayStr]);

  const upcomingChallenges = useMemo(() => {
    return challenges.filter(c => {
      return c.status === 'scheduled' || (c.start_date && c.start_date > todayStr);
    });
  }, [challenges, todayStr]);

  const completedChallenges = useMemo(() => {
    return challenges.filter(c => {
      const part = participations.get(c.id);
      return part?.completed === true;
    });
  }, [challenges, participations]);

  const expiredChallenges = useMemo(() => {
    return challenges.filter(c => {
      const part = participations.get(c.id);
      if (part?.completed) return false;
      return c.status === 'archived' || (c.end_date && c.end_date < todayStr);
    });
  }, [challenges, participations, todayStr]);

  const displayed =
    tab === 'active'
      ? activeChallenges
      : tab === 'upcoming'
      ? upcomingChallenges
      : tab === 'completed'
      ? completedChallenges
      : expiredChallenges;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Coffee Challenges</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Engage with our seasonal challenges, explore varieties, and unlock loyalty rewards.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => load()} className="gap-2 self-start md:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="active" className="text-xs">
            Active
            <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1 font-semibold">
              {activeChallenges.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs">
            Upcoming
            <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1 font-semibold">
              {upcomingChallenges.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed
            <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1 font-semibold">
              {completedChallenges.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="expired" className="text-xs">
            Expired
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Empty State */}
      {displayed.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground border border-border space-y-3">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-25 text-primary" />
          <h3 className="font-semibold text-lg text-foreground">
            {tab === 'active' && 'No Active Challenges'}
            {tab === 'upcoming' && 'No Upcoming Challenges Scheduled'}
            {tab === 'completed' && 'No Completed Challenges Yet'}
            {tab === 'expired' && 'No Expired Challenges'}
          </h3>
          <p className="text-sm max-w-sm mx-auto">
            {tab === 'active' && 'All current challenges have either ended or been completed. Check back soon for new arrivals!'}
            {tab === 'upcoming' && 'New seasonal quests will be scheduled shortly by our master roasters.'}
            {tab === 'completed' && 'Complete active quests with your orders to unlock badges and bonus loyalty points.'}
            {tab === 'expired' && 'No archived challenge history found.'}
          </p>
        </div>
      )}

      {/* Challenge Cards Grid */}
      {displayed.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayed.map((ch, i) => {
              const part = participations.get(ch.id);
              const joined = !!part;
              const completed = part?.completed ?? false;
              const rewardRedeemed = part?.reward_redeemed ?? false;
              const progress = part?.current_progress ?? 0;
              const target = part?.target_count ?? ch.target_count ?? 1;
              const pct = Math.min(100, Math.round((progress / target) * 100));
              const remaining = getRemainingLabel(ch.end_date, ch.start_date);
              const isUpcoming = tab === 'upcoming';
              const isExpired = tab === 'expired';

              return (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass rounded-2xl p-6 border flex flex-col justify-between transition-all shadow-sm ${
                    completed
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-muted/80 border border-border">
                          {getTypeIcon(ch.challenge_type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground leading-snug">{ch.title}</h3>
                          <span className="text-[11px] text-muted-foreground capitalize flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> {remaining}
                          </span>
                        </div>
                      </div>

                      {completed ? (
                        <Badge className="bg-emerald-600 text-white text-xs gap-1 shadow-sm shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </Badge>
                      ) : joined ? (
                        <Badge variant="outline" className="text-primary border-primary/30 text-xs shrink-0">
                          In Progress
                        </Badge>
                      ) : isUpcoming ? (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Not Started
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {ch.description}
                    </p>

                    {/* Progress indicator (for joined challenges) */}
                    {joined && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Verified Progress</span>
                          <span className="text-foreground font-mono">{progress} / {target} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )}

                    {/* Reward description */}
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-muted-foreground font-medium">{ch.reward_description || 'Reward'}</span>
                      </div>
                      {ch.reward_points > 0 && (
                        <Badge variant="secondary" className="font-mono text-primary font-bold">
                          +{ch.reward_points} pts
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-border mt-5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {ch.start_date && ch.end_date
                        ? `${new Date(ch.start_date).toLocaleDateString()} – ${new Date(ch.end_date).toLocaleDateString()}`
                        : 'Seasonal Window'
                      }
                    </span>

                    {completed ? (
                      rewardRedeemed ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-400 bg-emerald-50 text-xs">
                          Reward Claimed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs shadow-sm"
                          disabled={claimingId === ch.id}
                          onClick={() => handleClaimReward(ch, part)}
                        >
                          <Gift className="w-3.5 h-3.5" />
                          {claimingId === ch.id ? 'Claiming...' : 'Claim Points'}
                        </Button>
                      )
                    ) : joined ? (
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                        <a href="/menu">
                          Order Qualifying Drink <ArrowRight className="w-3 h-3" />
                        </a>
                      </Button>
                    ) : isUpcoming || isExpired ? (
                      <Badge variant="secondary" className="h-8 text-xs text-muted-foreground px-3 inline-flex items-center">
                        {isUpcoming ? 'Opens Soon' : 'Closed'}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        disabled={joiningId === ch.id}
                        onClick={() => handleJoin(ch)}
                      >
                        {joiningId === ch.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Target className="w-3.5 h-3.5" />
                        )}
                        Join Challenge
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Completion Modal */}
      {completionDialog && (
        <Dialog open={!!completionDialog} onOpenChange={() => setCompletionDialog(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-heading">
                Quest Completed! 🎉
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-2">
                Congratulations! You have successfully completed the <strong>{completionDialog.title}</strong> challenge.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted/50 p-4 rounded-xl border border-border text-center space-y-1">
              <span className="text-xs text-muted-foreground">Earned Reward</span>
              <p className="font-bold text-foreground text-base">
                {completionDialog.reward_description || `${completionDialog.reward_points} Loyalty Points`}
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              {!completionDialog.participation?.reward_redeemed && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleClaimReward(completionDialog, completionDialog.participation)}
                >
                  Claim Reward Now
                </Button>
              )}
              <Button variant="outline" onClick={() => setCompletionDialog(null)}>
                Dismiss
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}