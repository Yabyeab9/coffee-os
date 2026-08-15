import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Leaf, Sun, Coffee, Search, ChevronRight, Lock, Gift, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function SeasonalDiscoveriesPage() {
  const { profile } = useAuth();
  const [seasonalDrinks, setSeasonalDrinks] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalSeasonal, setTotalSeasonal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all seasonal drinks
        const { data: drinksData, error: drinksError } = await supabase
          .from('seasonal_drinks')
          .select('*')
          .order('name');
          
        if (drinksError) throw drinksError;
        
        // Fetch user progress
        const { data: userDrinksData, error: userError } = await supabase
          .from('user_seasonal_drinks')
          .select('*')
          .eq('user_id', profile.id);
          
        if (userError) throw userError;
        
        // Combine data
        const userStatusMap = userDrinksData?.reduce((acc, curr) => {
          acc[curr.drink_id] = curr.status;
          return acc;
        }, {} as Record<string, string>) || {};
        
        const combinedDrinks = (drinksData || []).map(drink => ({
          ...drink,
          status: userStatusMap[drink.id] || 'untried'
        }));
        
        setSeasonalDrinks(combinedDrinks);
        setTotalSeasonal(combinedDrinks.length);
        setProgress(combinedDrinks.filter(d => d.status === 'tried').length);
        
      } catch (err) {
        console.error('Error fetching seasonal drinks:', err);
        toast.error('Failed to load seasonal discoveries.');
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

  const collectionName = seasonalDrinks.length > 0 ? seasonalDrinks[0].collection_name : 'Summer 2026 Collection';

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Sun className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-semibold text-foreground">Seasonal Discoveries</h1>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold text-sm tracking-wide border border-primary/20">
          {collectionName}
        </div>
      </div>
      <p className="text-muted-foreground">Explore our curated collection of seasonal drinks. Try them all before autumn arrives!</p>

      {/* Progress Card */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-border shadow-md relative overflow-hidden bg-gradient-to-r from-yellow-500/10 to-orange-500/5">
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
          <Sun className="w-64 h-64 text-yellow-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="text-xl font-bold mb-1">Summer Exploration Challenge</h2>
                <p className="text-sm text-muted-foreground">Try all 8 seasonal drinks to unlock the Summer Explorer badge and a free bag of our Solstice Blend.</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-primary">{progress}</span>
                <span className="text-muted-foreground font-medium">/{totalSeasonal}</span>
              </div>
            </div>
            
            <Progress value={totalSeasonal > 0 ? (progress / totalSeasonal) * 100 : 0} className="h-3" />
            
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Started June 1</span>
              <span>Ends Aug 31</span>
            </div>
          </div>
          
          <div className="shrink-0 w-32 h-32 rounded-full bg-background border-4 border-yellow-500/20 flex flex-col items-center justify-center relative shadow-inner">
            <Gift className="w-10 h-10 text-yellow-500 mb-1 opacity-50" />
            <span className="text-[10px] font-bold text-center leading-tight uppercase tracking-wider px-2">Reward Locked</span>
            <div className="absolute -bottom-2 bg-background border border-border px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
              {totalSeasonal - progress} LEFT
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {seasonalDrinks.map((drink, idx) => (
          <motion.div 
            key={drink.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`glass rounded-xl p-5 border flex flex-col relative transition-all duration-300 ${
              drink.status === 'tried' 
                ? 'border-primary/40 shadow-md bg-primary/5' 
                : 'border-border hover:border-primary/30 hover:shadow-sm'
            }`}
          >
            {drink.status === 'tried' && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider shadow-sm z-10 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Tried
              </div>
            )}
            
            <div className="flex-1 mb-4">
              <h3 className={`text-lg font-bold mb-2 pr-16 leading-tight ${drink.status === 'tried' ? 'text-primary' : 'text-foreground'}`}>
                {drink.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{drink.description}</p>
              
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {(drink.tags || []).map((tag: string) => (
                  <span key={tag} className="bg-background/80 border border-border/50 text-foreground text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <Button 
              variant={drink.status === 'tried' ? "outline" : "default"} 
              className="w-full mt-auto"
              onClick={() => toast.success(drink.status === 'tried' ? 'Added to order again!' : 'Added to order!')}
            >
              {drink.status === 'tried' ? 'Order Again' : 'Try It Now'}
            </Button>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 text-center p-8 glass rounded-2xl border border-dashed border-border">
        <Leaf className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
        <h3 className="font-semibold text-lg mb-2">Autumn Collection</h3>
        <p className="text-sm text-muted-foreground mb-4">Coming September 2026. Premium members get early access.</p>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('Early access unlocked!')}>
          <Lock className="w-3.5 h-3.5" /> Preview Collection
        </Button>
      </div>
    </div>
  );
}