import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trophy, Target, Clock, Flame, Sparkles, Loader2, CheckCircle2, ArrowRight, Star, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

function getRemainingLabel(endDate: string | null): string {
  if (!endDate) return 'No limit';
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
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
    win_back: <Clock className="w-5 h-5 text-warning" />,
    time_challenge: <Clock className="w-5 h-5 text-indigo-500" />,
  };
  return map[type?.toLowerCase()] ?? <Sparkles className="w-5 h-5 text-primary" />;
}

export default function CoffeeChallengesPage() {
  const { profile, cafeId } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [participations, setParticipations] = useState<Map<string, any>>(new Map());
  const [tab, setTab] = useState<'active' | 'completed' | 'expired'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [completionDialog, setCompletionDialog] = useState<any>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.id || !cafeId) return;
    setIsLoading(true);
    try {
      // Fetch challenges + live participation data from DB in one call
      const { data: fnData } = await supabase.functions.invoke('challenge-engine', {
        body: { action: 'get_customer_challenges', payload: { cafe_id: cafeId } },
      });
      setChallenges(fnData?.challenges ?? []);
      const map = new Map<string, any>((fnData?.participations ?? []).map((p: any) => [p.challenge_id, p]));
      setParticipations(map);
    } catch {
      toast.error('Could not load challenges');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, cafeId]);

  useEffect(() => { load(); }, [load]);

  // Real-time: re-fetch when challenge_participants row changes for this user
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
          // Update just the affected participation in place — no full refetch needed
          setParticipations(prev => {
            const next = new Map(prev);
            next.set(updated.challenge_id, updated);
            return next;
          });
          // Show completion toast if newly completed
          if (updated.completed) {
            const ch = challenges.find(c => c.id === updated.challenge_id);
            if (ch) setCompletionDialog(ch);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, challenges]);

  const handleJoin = async (challenge: any) => {
    setJoiningId(challenge.id);
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          customer_id: profile!.id,
          current_progress: 0,
          target_count: challenge.target_count ?? 1,
          completed: false,
        })
        .select()
        .single();
      if (error) throw error;
      setParticipations(prev => new Map(prev).set(challenge.id, data));
      toast.success(`Joined: ${challenge.title}`);
    } catch {
      toast.error('Could not join challenge');
    } finally {
      setJoiningId(null);
    }
  };

  const allActive = challenges.filter(c => {
    const end = c.end_date ? new Date(c.end_date) : null;
    return !end || end > new Date();
  });
  const allCompleted = challenges.filter(c => participations.get(c.id)?.completed);
  const allExpired = challenges.filter(c => c.end_date && new Date(c.end_date) <= new Date());
  const displayed = tab === 'active' ? allActive : tab === 'completed' ? allCompleted : allExpired;

  if (isLoading) return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-heading font-semibold">Challenges</h1>
          <p className="text-sm text-muted-foreground">Complete challenges, earn rewards</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="active">
            Active <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">{allActive.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">{allCompleted.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
      </Tabs>

      {displayed.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground border border-border">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{tab === 'active' ? 'No active challenges right now. Check back soon!' : 'Nothing here yet.'}</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayed.map((ch, i) => {
              const part = participations.get(ch.id);
              const joined = !!part;
              const completed = part?.completed ?? false;
              // Progress always comes from DB (set by challenge-engine) — never computed on frontend
              const progress = part?.current_progress ?? 0;
              const target = part?.target_count ?? ch.target_count ?? 1;
              const pct = Math.min(100, Math.round((progress / target) * 100));
              const remaining = getRemainingLabel(ch.end_date);
              const isExpired = remaining === 'Ended';

              return (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass rounded-xl p-5 border border-border flex flex-col gap-4 ${completed ? 'bg-primary/5 border-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        {completed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : getTypeIcon(ch.challenge_type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight">{ch.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ch.description}</p>
                      </div>
                    </div>
                    {completed && <Badge className="shrink-0 text-[10px]">Completed</Badge>}
                  </div>

                  {joined && !completed && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress} of {target} completed</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{remaining}</span>
                      {(ch.reward_points ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary" />{ch.reward_points} pts</span>
                      )}
                    </div>
                    {!joined && !isExpired && (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleJoin(ch)} disabled={joiningId === ch.id}>
                        {joiningId === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Join
                      </Button>
                    )}
                    {joined && !completed && !isExpired && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.location.href = '/order'}>
                        Order Now <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Completion Dialog */}
      <Dialog open={!!completionDialog} onOpenChange={() => setCompletionDialog(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Challenge Completed!</DialogTitle>
            <DialogDescription>{completionDialog?.title}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              You earned <span className="font-bold text-foreground">{completionDialog?.reward_points ?? 0} points</span>
            </p>
          </div>
          <Button onClick={() => setCompletionDialog(null)}>View Loyalty</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}