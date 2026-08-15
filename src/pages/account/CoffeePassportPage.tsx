import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coffee, MapPin, Calendar, Clock, Star, Map, BookOpen, Award, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function CoffeePassportPage() {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'stamps' | 'origins' | 'methods'>('stamps');
  const [stamps, setStamps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('coffee_passport_stamps')
          .select('*')
          .eq('user_id', profile.id)
          .order('stamp_date', { ascending: false });
        
        if (error) throw error;
        setStamps(data || []);
      } catch (err) {
        console.error('Error fetching stamps:', err);
        toast.error('Failed to load passport data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profile?.id]);

  // Derived data
  const originStamps = stamps.filter(s => s.stamp_type === 'origin');
  const methodStamps = stamps.filter(s => s.stamp_type === 'method');

  // Group origins
  const originGroups = originStamps.reduce((acc, curr) => {
    // For this example, we assume name contains the country or we group by some detail
    // We'll just group by the first word of the name for simplicity if no details exist
    const country = curr.name.split(' ')[0];
    if (!acc[country]) {
      acc[country] = { name: country, drinks: 0, favorite: curr.name };
    }
    acc[country].drinks += 1;
    return acc;
  }, {} as Record<string, any>);
  const origins = Object.values(originGroups).sort((a: any, b: any) => b.drinks - a.drinks);

  // Group methods
  const methodGroups = methodStamps.reduce((acc, curr) => {
    const method = curr.name;
    if (!acc[method]) {
      acc[method] = { name: method, count: 0, favorite: curr.details?.favorite || curr.name };
    }
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, any>);
  const methods = Object.values(methodGroups).sort((a: any, b: any) => b.count - a.count);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Map className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-semibold text-foreground">Coffee Passport</h1>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-mono text-sm tracking-widest font-semibold border border-primary/20">
          PASSPORT NO: {profile?.id?.substring(0, 8).toUpperCase() || 'CP-9824B'}
        </div>
      </div>
      <p className="text-muted-foreground">Track your coffee journey, collect stamps, and explore the world of coffee.</p>

      {/* Passport Profile Card */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-border shadow-md relative overflow-hidden bg-gradient-to-br from-background to-secondary/10">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Map className="w-48 h-48" />
        </div>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          <div className="w-32 h-32 rounded-xl bg-muted border-4 border-background shadow-sm overflow-hidden shrink-0">
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl">
              {profile?.full_name?.charAt(0) || 'C'}
            </div>
          </div>
          <div className="flex-1 w-full">
            <h2 className="text-2xl font-bold mb-1">{profile?.full_name || 'Coffee Explorer'}</h2>
            <p className="text-primary font-medium mb-6 uppercase tracking-wider text-sm">Issue Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Stamps</p>
                <p className="text-xl font-bold">{stamps.length}</p>
              </div>
              <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Origins</p>
                <p className="text-xl font-bold">{origins.length}</p>
              </div>
              <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Methods</p>
                <p className="text-xl font-bold">{methods.length}</p>
              </div>
              <div className="bg-background/60 p-3 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <p className="text-lg font-bold text-primary">Explorer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          variant={activeTab === 'stamps' ? 'default' : 'outline'} 
          className="rounded-full"
          onClick={() => setActiveTab('stamps')}
        >
          <Award className="w-4 h-4 mr-2" /> Stamps
        </Button>
        <Button 
          variant={activeTab === 'origins' ? 'default' : 'outline'} 
          className="rounded-full"
          onClick={() => setActiveTab('origins')}
        >
          <MapPin className="w-4 h-4 mr-2" /> Origins Explored
        </Button>
        <Button 
          variant={activeTab === 'methods' ? 'default' : 'outline'} 
          className="rounded-full"
          onClick={() => setActiveTab('methods')}
        >
          <Coffee className="w-4 h-4 mr-2" /> Brewing Methods
        </Button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'stamps' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {stamps.map((stamp, idx) => (
              <motion.div 
                key={stamp.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="aspect-square glass rounded-full border-2 border-primary/20 p-4 flex flex-col items-center justify-center text-center relative shadow-sm group hover:border-primary/50 transition-colors"
              >
                <div className="absolute inset-2 border border-dashed border-primary/30 rounded-full pointer-events-none" />
                <Award className="w-6 h-6 text-primary/60 mb-2" />
                <h4 className="font-bold text-sm leading-tight px-2">{stamp.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(stamp.stamp_date).toLocaleDateString()}</p>
                <div className="absolute inset-0 bg-background/95 opacity-0 group-hover:opacity-100 rounded-full flex flex-col items-center justify-center p-4 transition-opacity duration-300">
                  <MapPin className="w-4 h-4 text-primary mb-1" />
                  <p className="text-xs font-medium text-center">{stamp.location}</p>
                  <Badge variant="outline" className="mt-2 text-[9px] uppercase tracking-wider">{stamp.stamp_type}</Badge>
                </div>
              </motion.div>
            ))}
            
            {/* Empty slots for future stamps */}
            {Array.from({ length: Math.max(0, 12 - stamps.length) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square rounded-full border-2 border-dashed border-border/50 p-4 flex flex-col items-center justify-center text-center opacity-50">
                <div className="w-8 h-8 rounded-full bg-muted/50 mb-2" />
                <p className="text-xs text-muted-foreground">Empty Slot</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'origins' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 border border-border">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> World Map</h3>
              <div className="aspect-[4/3] bg-muted/30 rounded-lg flex items-center justify-center border border-border relative overflow-hidden">
                <Map className="w-full h-full p-12 opacity-10 text-primary" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="self-end bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-border/50">
                    <p className="text-xs font-semibold">Africa: 1 Origin</p>
                  </div>
                  <div className="self-start mt-auto bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-border/50">
                    <p className="text-xs font-semibold">Americas: 3 Origins</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {origins.map((origin: any, idx: number) => (
                <motion.div 
                  key={origin.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-xl p-5 border border-border flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-lg">{origin.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground">Favorite:</span> {origin.favorite}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-2xl font-black text-primary">{origin.drinks}</div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Drinks</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'methods' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {methods.map((method: any, idx: number) => (
                <motion.div 
                  key={method.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass rounded-xl p-6 border border-border flex gap-4 items-start"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Coffee className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg">{method.name}</h4>
                      <Badge variant="secondary" className="bg-background">{method.count}x</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Favorite:</span> {method.favorite}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-muted-foreground">Method unlocked</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="glass rounded-xl p-6 border border-border mt-8">
              <h3 className="font-bold mb-4">Methods to Explore</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {['Aeropress', 'Siphon', 'Chemex', 'Moka Pot'].map(method => (
                  <div key={method} className="bg-background/50 rounded-lg p-4 text-center border border-dashed border-border/80 opacity-60">
                    <Coffee className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium text-sm text-muted-foreground">{method}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}