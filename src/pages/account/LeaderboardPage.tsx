import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LeaderboardPage() {
  const { profile } = useAuth();
  const userId = profile?.id;

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      // In a real app we'd aggregate this or use the leaderboards table. 
      // We will mock some data combined with real top users from loyalty_points for the prototype.
      const { data } = await supabase.from('loyalty_points').select('*, auth_users:user_id(id, raw_user_meta_data)').order('lifetime_points', { ascending: false }).limit(10);
      return data || [];
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Crown className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Leaderboard</h1>
      </div>
      <p className="text-muted-foreground">See how you rank against other coffee lovers.</p>

      <div className="glass rounded-xl border border-border overflow-hidden mt-8">
        <div className="p-4 bg-background/50 border-b border-border grid grid-cols-12 gap-4 items-center font-semibold text-sm text-muted-foreground">
          <div className="col-span-2 md:col-span-1 text-center">Rank</div>
          <div className="col-span-7 md:col-span-8">Customer</div>
          <div className="col-span-3 text-right">Points</div>
        </div>
        
        <div className="divide-y divide-border">
          {leaderboard?.map((entry: any, index: number) => {
            const isCurrentUser = entry.user_id === userId;
            const meta = entry.auth_users?.raw_user_meta_data || {};
            const name = meta.full_name || meta.name || `User ${entry.user_id.slice(0, 4)}`;
            
            return (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 grid grid-cols-12 gap-4 items-center transition-colors hover:bg-background/50 ${isCurrentUser ? 'bg-primary/5' : ''}`}
              >
                <div className="col-span-2 md:col-span-1 flex justify-center">
                  {index === 0 ? <Trophy className="w-6 h-6 text-yellow-500" /> : 
                   index === 1 ? <Medal className="w-6 h-6 text-gray-400" /> :
                   index === 2 ? <Medal className="w-6 h-6 text-amber-700" /> :
                   <span className="font-bold text-muted-foreground">#{index + 1}</span>}
                </div>
                <div className="col-span-7 md:col-span-8 flex items-center gap-3">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarFallback className="bg-background text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className={`font-medium truncate ${isCurrentUser ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {name} {isCurrentUser && '(You)'}
                  </span>
                </div>
                <div className="col-span-3 text-right font-bold text-foreground">
                  {entry.lifetime_points}
                </div>
              </motion.div>
            );
          })}
          {leaderboard?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No leaderboard data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
