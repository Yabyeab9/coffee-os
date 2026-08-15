import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Compass, Target, ArrowRight, Zap, Trophy, TrendingUp, Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TrySomethingNewPage() {
  const { profile } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [expansionPath, setExpansionPath] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [recsRes, pathRes] = await Promise.all([
          supabase.from('try_something_new_recs').select('*').eq('user_id', profile.id).order('match_score', { ascending: false }),
          supabase.from('taste_expansion_steps').select('*').eq('user_id', profile.id).order('step_number', { ascending: true })
        ]);
        
        if (recsRes.error) throw recsRes.error;
        if (pathRes.error) throw pathRes.error;
        
        setRecommendations(recsRes.data || []);
        setExpansionPath(pathRes.data || []);
      } catch (err) {
        console.error('Error fetching recs:', err);
        toast.error('Failed to load recommendations.');
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

  const currentStep = expansionPath.find(s => s.status === 'current')?.step_number || 1;
  const totalSteps = Math.max(1, expansionPath.length);
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100 || 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Compass className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-semibold text-foreground">Try Something New</h1>
        </div>
      </div>
      <p className="text-muted-foreground">Expand your coffee horizons. We've curated recommendations just slightly outside your comfort zone.</p>

      {/* Featured Suggestion */}
      {recommendations.length > 0 && (
      <div className="glass rounded-3xl p-8 md:p-12 border border-primary/30 shadow-lg relative overflow-hidden bg-gradient-to-br from-primary/10 to-transparent mt-8">
        <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none">
          <Compass className="w-96 h-96 text-primary" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-4xl font-black font-heading leading-tight">Step out of<br/>your comfort zone.</h2>
            <p className="text-lg text-foreground/80 leading-relaxed max-w-lg">
              You've stuck to your usual drinks for your last few orders. Break the cycle today and explore new flavors with AI Recommendations.
            </p>
          </div>
          
          <div className="shrink-0 w-full md:w-auto">
            <div className="bg-background/80 backdrop-blur-md rounded-2xl p-6 border border-border shadow-xl w-full max-w-sm mx-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl">{recommendations[0].name}</h3>
                <div className="bg-primary text-primary-foreground text-xs font-black px-2 py-1 rounded shadow-sm">
                  {recommendations[0].match_score}% MATCH
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {recommendations[0].reason}
              </p>
              <Button className="w-full" onClick={() => toast.success('Added to order!')}>Order This Drink</Button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Taste Expansion Path */}
      {expansionPath.length > 0 && (
      <div className="mt-12">
        <h3 className="text-2xl font-bold mb-8 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" /> Your Expansion Path</h3>
        <div className="glass rounded-2xl p-8 border border-border">
          <div className="flex justify-between items-center mb-10 relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-border -z-10 -translate-y-1/2 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            {expansionPath.map((step, idx) => (
              <div key={step.step_number} className="flex flex-col items-center relative z-10" style={{ width: `${100/totalSteps}%` }}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-background shadow-md font-bold mb-3 transition-colors ${
                  step.status === 'completed' ? 'bg-primary text-primary-foreground' : 
                  step.status === 'current' ? 'bg-background border-primary text-primary' : 
                  'bg-muted text-muted-foreground'
                }`}>
                  {step.step_number}
                </div>
                <h4 className={`font-bold text-center text-sm md:text-base ${step.status === 'current' ? 'text-primary' : ''}`}>{step.name}</h4>
                <p className="text-xs text-center text-muted-foreground mt-1 hidden md:block px-2">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
      
      {/* More Suggestions */}
      {recommendations.length > 1 && (
      <div className="mt-12">
        <h3 className="text-2xl font-bold mb-6">More Suggestions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.slice(1).map(rec => (
            <div key={rec.id} className="glass rounded-xl p-6 border border-border flex flex-col justify-between">
               <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg pr-2">{rec.name}</h4>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">{rec.comfort_zone}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{rec.reason}</p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {(rec.tags || []).map((tag: string) => (
                  <span key={tag} className="text-[10px] uppercase tracking-wider bg-secondary px-2 py-0.5 rounded font-medium">{tag}</span>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-auto" onClick={() => toast.success('Added to order!')}>Try It</Button>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}