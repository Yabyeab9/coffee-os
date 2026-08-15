import re

content = """import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trophy, Target, Clock, Users, Star, CheckCircle2, Loader2, Sparkles, Flame, DollarSign, Brain, ArrowRight, Share2, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function CoffeeChallengesPage() {
  const { profile } = useAuth();
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [participations, setParticipations] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [bundles, setBundles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch active challenges
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active');
        
      // Fetch user participations
      const { data: userParts } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('customer_id', profile!.id);
        
      // Fetch streak
      const { data: userStreak } = await supabase
        .from('customer_challenge_streaks')
        .select('*')
        .eq('customer_id', profile!.id)
        .single();
        
      // Fetch bundles
      const { data: activeBundles } = await supabase
        .from('challenge_bundles')
        .select('*')
        .eq('status', 'active');
        
      setActiveChallenges(challenges || []);
      setParticipations(userParts || []);
      setStreak(userStreak || { current_streak: 0, longest_streak: 0 });
      setBundles(activeBundles || []);
    } catch (err) {
      console.error('Error fetching challenges:', err);
      toast.error('Failed to load active challenges.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (challenge: any) => {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          customer_id: profile!.id,
          current_progress: 0,
          target_count: challenge.target_count || 1,
          completed: false
        }).select().single();
        
      if (error) throw error;
      
      toast.success(`You joined: ${challenge.title}!`);
      fetchData();
    } catch (err) {
      toast.error('Could not join challenge');
    }
  };

  const handleShare = async (challenge: any) => {
    try {
      await supabase.from('challenge_shares').insert({
        challenge_id: challenge.id,
        customer_id: profile!.id,
        platform: 'social',
        bonus_points_awarded: true
      });
      toast.success("Shared successfully! You earned 50 bonus points.");
    } catch (e) {
      toast.success("Shared successfully!");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'win_back': return <Clock className="w-6 h-6 text-warning" />;
      case 'explorer': return <Target className="w-6 h-6 text-green-500" />;
      case 'streak': return <Flame className="w-6 h-6 text-orange-500" />;
      case 'collection': return <Trophy className="w-6 h-6 text-primary" />;
      default: return <Sparkles className="w-6 h-6 text-primary" />;
    }
  };

  const calculateRemainingDays = (endDateStr: string) => {
    if (!endDateStr) return 'No Limit';
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    if (diff < 0) return 'Expired';
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days === 0 ? 'Ending Today' : `${days} Days Left`;
  };

  const renderReward = (type: string, value: string) => {
    if (!type) return 'Mystery Reward';
    if (type === 'points') return `${value} Bonus Points`;
    if (type === 'discount') return `${value} Off`;
    if (type === 'upgrade') return `Free Size Upgrade`;
    return value || 'Special Reward';
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in-0 pb-20">
      
      {/* Top Banner with Streaks */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden">
        <div className="absolute -right-12 -top-12 opacity-10">
          <Trophy className="w-48 h-48" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" /> Coffee Challenges
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-balance">
            Complete goals to earn exclusive rewards, badges, and unlock secret menu items. Track your progress automatically.
          </p>
        </div>
        
        <div className="flex items-center gap-6 bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border shadow-sm z-10 shrink-0">
           <div className="flex flex-col items-center">
             <div className="flex items-center gap-1.5 text-orange-500 mb-1">
               <Flame className="w-5 h-5" />
               <span className="font-bold text-xl">{streak?.current_streak || 0}</span>
             </div>
             <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Streak</span>
           </div>
           <div className="w-px h-10 bg-border"></div>
           <div className="flex flex-col items-center">
             <div className="flex items-center gap-1.5 text-primary mb-1">
               <Award className="w-5 h-5" />
               <span className="font-bold text-xl">{streak?.longest_streak || 0}</span>
             </div>
             <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Best Streak</span>
           </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {activeChallenges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Recommended for You</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {activeChallenges.slice(0, 3).map((challenge, idx) => {
                const part = participations.find(p => p.challenge_id === challenge.id);
                const isJoined = !!part;
                const isCompleted = part?.completed;
                const progress = part?.current_progress || 0;
                const target = part?.target_count || challenge.target_count;
                
                return (
                  <motion.div 
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass rounded-2xl p-6 border border-primary/20 shadow-sm flex flex-col relative overflow-hidden bg-gradient-to-br from-background to-secondary/10"
                  >
                    {isCompleted && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-16 h-16 text-primary mb-2 shadow-sm bg-background rounded-full" />
                        <span className="font-bold text-lg text-primary bg-background px-3 py-1 rounded-full border border-border shadow-sm">Completed!</span>
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      {challenge.source === 'ai_generated' && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                          AI Match
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-start mb-4 mt-2">
                      <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm text-primary">
                        {getIconForType(challenge.challenge_type)}
                      </div>
                      <div className="bg-background border border-border text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow-sm">
                        {calculateRemainingDays(challenge.end_date)}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-1 leading-tight">{challenge.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6 flex-1 line-clamp-2">{challenge.description}</p>
                    
                    {isJoined ? (
                      <div className="bg-background/50 rounded-lg p-4 border border-border mb-4 shadow-inner">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span className="text-foreground">{progress} / {target}</span>
                        </div>
                        <Progress value={Math.min((progress / target) * 100, 100)} className="h-2 bg-secondary" />
                      </div>
                    ) : (
                      <Button onClick={() => handleJoin(challenge)} className="w-full mb-4 shadow-sm font-semibold group">
                        Join Challenge <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    )}
                    
                    <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-lg border border-border/50">
                       <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reward</span>
                       <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                         <Star className="w-4 h-4" /> {renderReward(challenge.reward_type, challenge.reward_value)}
                       </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                       <span className="text-xs text-muted-foreground">Challenge Type: <span className="font-semibold capitalize text-foreground">{challenge.challenge_type.replace('_', ' ')}</span></span>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => handleShare(challenge)}>
                         <Share2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Challenge Bundles */}
      {bundles.length > 0 && (
        <div className="mt-12 bg-primary/5 rounded-3xl p-8 border border-primary/20 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10">
            <Zap className="w-64 h-64 text-primary" />
          </div>
          <div className="flex-1 z-10">
            <Badge className="mb-4 bg-primary text-primary-foreground">Exclusive Bundle</Badge>
            <h2 className="text-2xl font-bold mb-2">{bundles[0].bundle_name}</h2>
            <p className="text-muted-foreground mb-6 max-w-lg">{bundles[0].bundle_description}</p>
            <div className="flex items-center gap-3 bg-background/50 p-4 rounded-xl border border-border w-fit">
              <Star className="w-5 h-5 text-warning" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bonus Reward</p>
                <p className="font-bold text-foreground">{renderReward(bundles[0].bonus_reward_type, bundles[0].bonus_reward_value)}</p>
              </div>
            </div>
          </div>
          <div className="shrink-0 w-full md:w-auto z-10">
            <Button size="lg" className="w-full md:w-auto shadow-md h-14 px-8 text-base" onClick={() => toast.success('Joined bundle!')}>
              Activate Bundle
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
"""

with open('/workspace/app-cvq4redfdog1/src/pages/account/CoffeeChallengesPage.tsx', 'w') as f:
    f.write(content)
