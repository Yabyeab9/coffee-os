import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Compass, Target, Flame, Heart, Share2, Sparkles, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function CoffeePersonalityPage() {
  const { profile } = useAuth();
  const [personality, setPersonality] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('coffee_personalities')
          .select('*')
          .eq('user_id', profile.id)
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        setPersonality(data);
      } catch (err) {
        console.error('Error fetching personality:', err);
        toast.error('Failed to load personality profile.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profile?.id]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!personality) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto text-center py-20 text-muted-foreground">
        <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-bold mb-2 text-foreground">No Profile Yet</h2>
        <p>Order a few more drinks and our AI will start analyzing your taste preferences!</p>
      </div>
    );
  }

  const traits = personality.traits || [];
  const topFlavors = personality.top_flavors || [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-semibold text-foreground">Coffee Personality</h1>
        </div>
        <Button variant="outline" className="gap-2 shadow-sm" onClick={() => toast.success('Sharing profile...')}>
          <Share2 className="w-4 h-4" /> Share Profile
        </Button>
      </div>
      <p className="text-muted-foreground">An AI-generated analysis of your coffee habits, taste preferences, and journey.</p>

      {/* Main Profile Card */}
      <div className="glass rounded-3xl p-1 border border-border/50 shadow-xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden relative mt-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="glass rounded-[22px] p-8 md:p-12 relative z-10 border border-white/10 dark:border-white/5 backdrop-blur-md">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent p-1 shadow-lg mb-6">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Compass className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            <Badge className="mb-4 text-xs tracking-widest uppercase font-bold px-3 py-1">Coffee Archetype</Badge>
            <h2 className="text-4xl md:text-5xl font-black font-heading mb-6 tracking-tight">{personality.personality_type}</h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              {personality.description}
            </p>
            
            <div className="w-full max-w-md bg-background/50 rounded-2xl p-6 border border-border/50 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Explorer Score</h4>
                <span className="text-2xl font-black text-primary">{personality.level}</span>
              </div>
              <Progress value={personality.level} className="h-3 bg-muted" />
              <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider font-semibold text-left">Level: Advanced Enthusiast</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        {/* Taste Spectrum */}
        <div className="glass rounded-2xl p-8 border border-border shadow-sm">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> Taste Spectrum</h3>
          <div className="space-y-8">
            {traits.map((trait: any) => (
              <div key={trait.name} className="space-y-2">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{trait.left}</span>
                  <span>{trait.right}</span>
                </div>
                <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border/80 z-10" />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${trait.value}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-primary/60 rounded-full"
                  />
                  {/* Indicator dot */}
                  <motion.div 
                    initial={{ left: 0 }}
                    animate={{ left: `calc(${trait.value}% - 6px)` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-sm border border-background z-20"
                  />
                </div>
                <p className="text-center font-bold text-sm">{trait.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Flavor Profile */}
        <div className="space-y-8">
          <div className="glass rounded-2xl p-8 border border-border shadow-sm h-full">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> Dominant Flavors</h3>
            
            <div className="space-y-5">
              {topFlavors.map((flavor: any, idx: number) => (
                <div key={flavor.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-foreground">{flavor.name}</span>
                    <span className="text-sm text-muted-foreground font-medium">{flavor.percentage}%</span>
                  </div>
                  <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${flavor.percentage}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`h-full ${flavor.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10 bg-primary/5 rounded-xl p-5 border border-primary/20">
              <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4" /> AI Insight
              </h4>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Your preference for floral and citrus notes indicates a strong affinity for washed African coffees. You rarely order dark roasts or heavily sweetened beverages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline badge component for this file
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-primary ${className}`}>
    {children}
  </span>
);