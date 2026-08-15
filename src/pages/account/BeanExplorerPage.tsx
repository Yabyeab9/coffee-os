import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Map, Coffee, ArrowRight, Compass, Info, Search, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BeanExplorerPage() {
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [beans, setBeans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('bean_library')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setBeans(data || []);
      } catch (err) {
        console.error('Error fetching beans:', err);
        toast.error('Failed to load bean library.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const regions = [
    { id: 'all', name: 'All Origins' },
    { id: 'africa', name: 'Africa' },
    { id: 'americas', name: 'Americas' },
    { id: 'asia', name: 'Asia Pacific' }
  ];

  const filteredBeans = beans.filter(b => {
    const matchesRegion = activeRegion === 'all' ? true : b.region_type === activeRegion;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      b.name.toLowerCase().includes(searchLower) || 
      b.origin.toLowerCase().includes(searchLower) ||
      (b.notes && b.notes.some((n: string) => n.toLowerCase().includes(searchLower)));
    return matchesRegion && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-semibold text-foreground">Bean Explorer</h1>
        </div>
        <div className="relative w-full md:w-64">
          <Input 
            placeholder="Search beans, notes, origins..." 
            className="pl-10 bg-background" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <p className="text-muted-foreground">Discover the stories, farms, and flavor profiles behind our coffee selection.</p>

      {/* Hero Section */}
      <div className="glass rounded-2xl border border-border overflow-hidden relative min-h-[300px] flex items-center shadow-md">
        <div className="absolute inset-0 z-0">
          {/* We'd use a real image here, but a gradient/pattern works for the prototype */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611162458324-aae1eb4129a4?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-8 md:p-12 max-w-xl">
          <Badge variant="outline" className="mb-4 text-primary border-primary/30 uppercase tracking-widest font-bold">Featured Origin</Badge>
          <h2 className="text-4xl font-black font-heading mb-4 leading-tight">Journey to Yirgacheffe</h2>
          <p className="text-lg text-muted-foreground mb-6">Discover the birthplace of coffee. High altitudes and heirloom varieties create the world's most distinct floral and tea-like coffees.</p>
          <Button className="gap-2" onClick={() => toast.success('Opening story...')}>
            Read the Story <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Interactive Region Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-4">
        {regions.map(region => (
          <Button 
            key={region.id}
            variant={activeRegion === region.id ? 'default' : 'outline'} 
            className="rounded-full px-6"
            onClick={() => setActiveRegion(region.id)}
          >
            {region.name}
          </Button>
        ))}
      </div>

      {/* Bean Library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {filteredBeans.map((bean, idx) => (
          <motion.div 
            key={bean.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-bold text-foreground font-heading">{bean.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-primary font-semibold">
                  <MapPin className="w-3.5 h-3.5" /> {bean.origin}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                <Coffee className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed flex-1">
              {bean.description}
            </p>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6 bg-background/50 rounded-xl p-4 border border-border/50">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Farm / Co-op</p>
                <p className="text-sm font-medium truncate" title={bean.farm}>{bean.farm}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Altitude</p>
                <p className="text-sm font-medium">{bean.altitude}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Process</p>
                <p className="text-sm font-medium">{bean.process}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Roast</p>
                <p className="text-sm font-medium">{bean.roast}</p>
              </div>
            </div>
            
            <div className="mt-auto">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Tasting Notes</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {(bean.notes || []).map((note: string) => (
                  <Badge key={note} variant="secondary" className="bg-secondary/50 hover:bg-secondary text-secondary-foreground font-medium py-1">
                    {note}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => toast.success('Added to order!')}>Order Drink</Button>
                <Button variant="outline" className="flex-1" onClick={() => toast.success('Added to cart!')}>Buy Beans</Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}