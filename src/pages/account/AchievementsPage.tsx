import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Shield, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function AchievementsPage() {
  const { profile } = useAuth();
  const userId = profile?.id;

  const { data: achievements } = useQuery({
    queryKey: ['achievements', userId],
    queryFn: async () => {
      const { data: badges } = await supabase.from('badges').select('*');
      const { data: userBadges } = await supabase.from('user_badges').select('*').eq('user_id', userId);
      return { badges: badges || [], userBadges: userBadges || [] };
    },
    enabled: !!userId
  });

  const earnedBadgeIds = new Set(achievements?.userBadges.map((ub) => ub.badge_id));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Achievements & Badges</h1>
      </div>
      <p className="text-muted-foreground">Unlock badges by completing actions and reaching milestones.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {achievements?.badges.map((badge) => {
          const isEarned = earnedBadgeIds.has(badge.id);
          return (
            <motion.div 
              key={badge.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className={`glass rounded-xl p-6 border flex flex-col items-center justify-center text-center relative ${isEarned ? 'border-primary/30 bg-primary/5' : 'border-border/50 opacity-60 grayscale'}`}
            >
              {!isEarned && (
                <div className="absolute top-3 right-3 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
              )}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isEarned ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {badge.icon === 'star' ? <Star className="w-8 h-8" /> : 
                 badge.icon === 'award' ? <Award className="w-8 h-8" /> : 
                 badge.icon === 'shield' ? <Shield className="w-8 h-8" /> : 
                 <Trophy className="w-8 h-8" />}
              </div>
              <h3 className={`font-semibold mb-1 ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>{badge.badge_name}</h3>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              {isEarned && (
                <div className="mt-4 text-[10px] uppercase font-semibold text-primary tracking-wider">Unlocked</div>
              )}
            </motion.div>
          );
        })}
        {achievements?.badges.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            No badges configured yet.
          </div>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Current Missions</h2>
        <div className="glass rounded-xl p-6 border border-border">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h4 className="font-semibold">Weekend Warrior</h4>
                  <p className="text-sm text-muted-foreground">Visit 3 times this weekend</p>
                </div>
                <span className="text-sm font-medium">1 / 3</span>
              </div>
              <Progress value={33} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h4 className="font-semibold">Coffee Explorer</h4>
                  <p className="text-sm text-muted-foreground">Try 5 different single-origin beans</p>
                </div>
                <span className="text-sm font-medium">4 / 5</span>
              </div>
              <Progress value={80} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
