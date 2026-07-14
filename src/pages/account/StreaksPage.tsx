import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Flame, Trophy } from 'lucide-react';
import type { UserStreak } from '@/types/database';

export default function StreaksPage() {
  const { profile } = useAuth();
  const [streak, setStreak] = useState<UserStreak | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      const { data } = await supabase.from('user_streaks').select('*').eq('user_id', profile.id).maybeSingle();
      if (data) {
        setStreak(data);
      }
    }
    load();
  }, [profile?.id]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Coffee Streaks</h1>
        <p className="text-muted-foreground">Keep your streak alive by visiting us every week.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-8 border border-primary/20 flex flex-col items-center text-center">
          <Flame className={`w-24 h-24 mb-4 ${streak?.current_streak && streak.current_streak > 0 ? 'text-orange-500 fill-orange-500/20' : 'text-muted-foreground'}`} />
          <h2 className="text-5xl font-heading font-bold text-foreground mb-2">{streak?.current_streak || 0}</h2>
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Week Streak</p>
        </div>

        <div className="glass rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-4 border-b border-border/50 pb-6">
            <Trophy className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Longest Streak</p>
              <p className="text-2xl font-bold text-foreground">{streak?.longest_streak || 0} weeks</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-3">Next Reward Milestone</p>
            <div className="w-full bg-secondary rounded-full h-3 mb-2">
              <div className="bg-primary h-3 rounded-full" style={{ width: `${Math.min(100, ((streak?.current_streak || 0) % 4) * 25)}%` }}></div>
            </div>
            <p className="text-xs text-muted-foreground text-right">{4 - ((streak?.current_streak || 0) % 4)} weeks until free coffee</p>
          </div>
        </div>
      </div>
    </div>
  );
}
