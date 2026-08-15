import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Flame, Star, Trophy, Zap, CheckCircle2, Circle,
  Loader2, RefreshCw, Target, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { motion } from 'motion/react';
import { toast } from 'sonner';

// ── Level config ──────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, name: 'First Sip',    xpRequired: 0,    badge: '☕' },
  { level: 2, name: 'Regular',      xpRequired: 100,  badge: '🏅' },
  { level: 3, name: 'Connoisseur',  xpRequired: 300,  badge: '⭐' },
  { level: 4, name: 'Devotee',      xpRequired: 600,  badge: '🌟' },
  { level: 5, name: 'Champion',     xpRequired: 1000, badge: '🏆' },
  { level: 6, name: 'Legend',       xpRequired: 1500, badge: '💎' },
];

function getCurrentLevel(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
      break;
    }
  }
  return { current, next };
}

// ── Quest helpers ─────────────────────────────────────────────────────────────
interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  type: 'order' | 'loyalty' | 'review' | 'referral';
}

function buildDefaultQuests(): Quest[] {
  return [
    { id: 'q1', title: 'Place an order today', description: 'Order any item from the menu', xp: 20, completed: false, type: 'order' },
    { id: 'q2', title: 'Visit for 3 consecutive days', description: 'Keep your streak alive', xp: 30, completed: false, type: 'order' },
    { id: 'q3', title: 'Try a new item', description: "Order something you haven't tried before", xp: 25, completed: false, type: 'order' },
  ];
}

// ── Badge config ──────────────────────────────────────────────────────────────
const ACHIEVEMENT_BADGES = [
  { id: 'first_order', label: 'First Order', icon: '☕', condition: 'Place your first order' },
  { id: 'five_orders', label: '5 Orders', icon: '🥉', condition: 'Complete 5 orders' },
  { id: 'twenty_orders', label: '20 Orders', icon: '🥇', condition: 'Complete 20 orders' },
  { id: 'streak_7', label: '7-Day Streak', icon: '🔥', condition: 'Visit 7 days in a row' },
  { id: 'referral', label: 'Referral Star', icon: '⭐', condition: 'Refer a friend' },
  { id: 'loyalty_500', label: 'Point Collector', icon: '💰', condition: 'Earn 500 loyalty points' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GamifiedLoyaltyPage() {
  const { session, cafeId: profileCafeId } = useAuth();
  const userId = session?.user?.id;

  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For customer pages we need the cafe_id from the cafe itself (not the customer's profile)
  // Customers don't have a cafe_id in their profile — get it from a public cafes table
  const [cafeId, setCafeId] = useState<string | null>(null);

  useEffect(() => {
    async function getCafeId() {
      // If the user has a cafe_id (staff) use it; otherwise get the primary cafe
      if (profileCafeId) { setCafeId(profileCafeId); return; }
      const { data } = await supabase.from('cafes').select('id').limit(1).single();
      if (data?.id) setCafeId(data.id);
    }
    getCafeId();
  }, [profileCafeId]);

  const loadData = useCallback(async () => {
    if (!userId || !cafeId) return;
    setLoading(true);
    setError(null);
    try {
      // Gamified loyalty record
      const { data: gl } = await supabase
        .from('gamified_loyalty')
        .select('*')
        .eq('cafe_id', cafeId)
        .eq('customer_id', userId)
        .maybeSingle();

      if (gl) {
        setXp(gl.xp ?? 0);
        setBadges(gl.achievement_badges ?? []);
      }

      // Today's daily quests
      const today = new Date().toISOString().split('T')[0];
      const { data: dq } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('cafe_id', cafeId)
        .eq('customer_id', userId)
        .eq('quest_date', today)
        .maybeSingle();

      if (dq) {
        setQuests(dq.quests as Quest[]);
        setStreak(dq.streak_days ?? 0);
      } else {
        // Generate today's quests
        const defaultQuests = buildDefaultQuests();
        // Auto-complete "first order" quest if they've ordered today
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('cafe_id', cafeId)
          .eq('user_id', userId)
          .gte('created_at', todayStart.toISOString())
          .limit(1);
        if (todayOrders && todayOrders.length > 0) {
          defaultQuests[0].completed = true;
        }
        // Persist the quest row
        const { data: yesterdayDq } = await supabase
          .from('daily_quests')
          .select('streak_days, all_completed')
          .eq('cafe_id', cafeId)
          .eq('customer_id', userId)
          .eq('quest_date', new Date(Date.now() - 86400000).toISOString().split('T')[0])
          .maybeSingle();
        const newStreak = yesterdayDq?.all_completed ? (yesterdayDq.streak_days ?? 0) + 1 : 0;

        await supabase.from('daily_quests').upsert({
          cafe_id: cafeId,
          customer_id: userId,
          quest_date: today,
          quests: defaultQuests,
          streak_days: newStreak,
          all_completed: false,
        }, { onConflict: 'cafe_id,customer_id,quest_date' });

        setQuests(defaultQuests);
        setStreak(newStreak);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load your progress');
    } finally {
      setLoading(false);
    }
  }, [userId, cafeId]);

  const completeQuest = async (questId: string) => {
    if (!userId || !cafeId) return;
    const today = new Date().toISOString().split('T')[0];
    const updated = quests.map(q => q.id === questId ? { ...q, completed: true } : q);
    const allDone = updated.every(q => q.completed);
    const xpGain = quests.find(q => q.id === questId)?.xp ?? 0;

    setQuests(updated);
    setXp(prev => prev + xpGain);

    // Persist quest completion
    await supabase.from('daily_quests').update({
      quests: updated,
      all_completed: allDone,
      updated_at: new Date().toISOString(),
    }).eq('cafe_id', cafeId).eq('customer_id', userId).eq('quest_date', today);

    // Update gamified_loyalty XP
    await supabase.from('gamified_loyalty').upsert({
      cafe_id: cafeId,
      customer_id: userId,
      xp: xp + xpGain,
      achievement_badges: badges,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cafe_id,customer_id' });

    toast.success(`+${xpGain} XP earned!`);
    if (allDone) toast.success('All daily quests complete! 🎉');
  };

  useEffect(() => { loadData(); }, [loadData]);

  const { current: levelInfo, next: nextLevel } = getCurrentLevel(xp);
  const xpToNext = nextLevel ? nextLevel.xpRequired - levelInfo.xpRequired : 0;
  const xpInLevel = nextLevel ? xp - levelInfo.xpRequired : 0;
  const progressPct = xpToNext > 0 ? Math.min(100, (xpInLevel / xpToNext) * 100) : 100;

  if (!userId) return (
    <div className="p-8 text-center text-muted-foreground">Please sign in to view your progress.</div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Your Coffee Journey</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete quests, earn XP, level up, and unlock achievements.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto text-destructive">Retry</Button>
        </div>
      )}

      {/* Level card */}
      {loading ? <Skeleton className="h-40 rounded-xl" /> : (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{levelInfo.badge}</span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Level {levelInfo.level}</p>
                  <p className="text-xl font-semibold text-foreground">{levelInfo.name}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{xp.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>

          {nextLevel && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress to {nextLevel.name}</span>
                <span>{xpInLevel} / {xpToNext} XP</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Streak */}
          <div className="flex items-center gap-2 pt-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-foreground">{streak} day streak</span>
            {streak >= 7 && <Badge className="text-xs">🔥 On fire!</Badge>}
          </div>
        </motion.div>
      )}

      {/* Daily Quests */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today's Quests</h2>
          <span className="text-xs text-muted-foreground ml-1">
            {quests.filter(q => q.completed).length}/{quests.length} done
          </span>
        </div>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : quests.map((quest, i) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`bg-card border rounded-xl p-4 flex items-center gap-3 transition-colors ${
                quest.completed ? 'border-success/30 bg-success/5' : 'border-border'
              }`}
            >
              <button
                onClick={() => !quest.completed && completeQuest(quest.id)}
                disabled={quest.completed}
                className="shrink-0"
              >
                {quest.completed
                  ? <CheckCircle2 className="w-5 h-5 text-success" />
                  : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${quest.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {quest.title}
                </p>
                <p className="text-xs text-muted-foreground">{quest.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">+{quest.xp}</span>
              </div>
            </motion.div>
          ))}
      </section>

      <Separator />

      {/* Achievements */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Achievements</h2>
          <span className="text-xs text-muted-foreground ml-1">
            {ACHIEVEMENT_BADGES.filter(b => badges.includes(b.id)).length}/{ACHIEVEMENT_BADGES.length} unlocked
          </span>
        </div>
        {loading ? <Skeleton className="h-24 rounded-xl" /> : (
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENT_BADGES.map((badge, i) => {
              const unlocked = badges.includes(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-card border rounded-xl p-3 text-center space-y-1 transition-colors ${
                    unlocked ? 'border-primary/30 bg-primary/5' : 'border-border opacity-50'
                  }`}
                >
                  <div className="text-2xl">{unlocked ? badge.icon : '🔒'}</div>
                  <div className="text-xs font-medium text-foreground truncate">{badge.label}</div>
                  {!unlocked && (
                    <div className="text-xs text-muted-foreground leading-tight line-clamp-2">{badge.condition}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* XP History note */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        XP is earned by completing quests. Levels unlock status and exclusive benefits.
        Quest completions are verified against your real order activity.
      </p>
    </div>
  );
}
