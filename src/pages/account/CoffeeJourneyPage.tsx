import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Map, MapPin, Coffee, Star, Trophy, Target, ArrowRight, Activity, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CoffeeJourneyPage() {
  const { profile } = useAuth();
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile?.id) return;
      try {
        setIsLoading(true);
        const { data } = await supabase
          .from('taste_evolution_data')
          .select('*')
          .eq('customer_id', profile.id)
          .maybeSingle();
        
        if (data) {
          setEvolutionData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [profile?.id]);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  // Fallback defaults if no real data yet
  const preferences = evolutionData?.preference_evolution || { bitter: 40, sweet: 60, complex: 50 };
  const nextItem = evolutionData?.category_exploration?.[0] || 'Try a Single Origin Pour Over';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Taste Evolution Dashboard</h1>
        <p className="text-muted-foreground mt-1">A real-time mapping of your coffee journey and expanding palate.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preference Radar */}
        <div className="glass rounded-xl p-6 border border-border">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" /> Taste Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Sweetness</span>
                <span className="font-medium text-foreground">{preferences.sweet}%</span>
              </div>
              <Progress value={preferences.sweet} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Bitterness</span>
                <span className="font-medium text-foreground">{preferences.bitter}%</span>
              </div>
              <Progress value={preferences.bitter} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Complexity</span>
                <span className="font-medium text-foreground">{preferences.complex}%</span>
              </div>
              <Progress value={preferences.complex} className="h-2" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
            Your profile has shifted {preferences.sweet > 50 ? 'towards sweeter, balanced drinks' : 'towards bold, intense flavors'} over your last 10 orders. 
          </p>
        </div>

        {/* Predictive Roadmap */}
        <div className="glass rounded-xl p-6 border border-border">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Map className="w-5 h-5 text-primary" /> Predictive Roadmap
          </h2>
          <div className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Next Milestone</h3>
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 text-warning shrink-0" />
                <div>
                  <p className="text-foreground font-semibold">{nextItem}</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on your recent interest in complex flavor profiles, this is the perfect next step.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
