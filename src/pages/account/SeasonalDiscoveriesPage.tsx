import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Sparkles, Coffee, Utensils, CheckCircle2, ShoppingBag,
  Calendar, Flame, Tag, ArrowRight, Loader2, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface SeasonalItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id?: string;
  is_available: boolean;
  seasonal: boolean;
  status: string;
  tags?: string[];
  flavor_profile?: {
    notes?: string[];
    roast?: string;
    intensity?: number;
    type?: string;
  };
  availability_schedule?: {
    start_date?: string;
    end_date?: string;
    season?: string;
  };
  menu_categories?: {
    id: string;
    name: string;
    description?: string;
  };
  hasOrdered?: boolean;
}

export default function SeasonalDiscoveriesPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 1. Query seasonal items and categories from authoritative database
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seasonal_offerings', userId],
    queryFn: async () => {
      // Query active seasonal menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select(`
          *,
          menu_categories:category_id (id, name, description)
        `)
        .eq('seasonal', true)
        .eq('status', 'active')
        .order('name');

      if (menuError) throw menuError;

      // Query user order items to compute genuine tried status
      let userPurchasedItemIds = new Set<string>();
      if (userId) {
        const { data: userOrders } = await supabase
          .from('orders')
          .select('id, order_items(menu_item_id)')
          .eq('user_id', userId)
          .in('payment_status', ['paid', 'completed']);

        userOrders?.forEach(ord => {
          ord.order_items?.forEach((oi: any) => {
            if (oi.menu_item_id) userPurchasedItemIds.add(oi.menu_item_id);
          });
        });
      }

      // Filter by active availability schedule dates
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const activeItems = (menuData || []).filter((item: SeasonalItem) => {
        const schedule = item.availability_schedule;
        if (!schedule) return true;
        if (schedule.start_date && schedule.start_date > todayStr) return false;
        if (schedule.end_date && schedule.end_date < todayStr) return false;
        return true;
      }).map((item: SeasonalItem) => ({
        ...item,
        hasOrdered: userPurchasedItemIds.has(item.id),
      }));

      return activeItems as SeasonalItem[];
    },
  });

  const seasonalItems = data || [];

  // Derive categories dynamically from retrieved active items
  const categories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string }>();
    seasonalItems.forEach(item => {
      if (item.menu_categories) {
        catMap.set(item.menu_categories.id, {
          id: item.menu_categories.id,
          name: item.menu_categories.name,
        });
      }
    });
    return Array.from(catMap.values());
  }, [seasonalItems]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return seasonalItems;
    return seasonalItems.filter(item => item.menu_categories?.id === selectedCategory);
  }, [seasonalItems, selectedCategory]);

  // Calculate real progress
  const totalItems = seasonalItems.length;
  const triedItems = seasonalItems.filter(item => item.hasOrdered).length;
  const progressPercentage = totalItems > 0 ? Math.round((triedItems / totalItems) * 100) : 0;

  // Active season title inferred from database schedule or current month
  const currentSeason = useMemo(() => {
    const firstWithSeason = seasonalItems.find(i => i.availability_schedule?.season);
    if (firstWithSeason?.availability_schedule?.season) {
      return `${firstWithSeason.availability_schedule.season} Edition`;
    }
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring Harvest';
    if (month >= 5 && month <= 7) return 'Summer Harvest';
    if (month >= 8 && month <= 10) return 'Autumn Harvest';
    return 'Winter Warmth';
  }, [seasonalItems]);

  const handleOrder = (item: SeasonalItem) => {
    navigate(`/menu?search=${encodeURIComponent(item.name)}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto text-center space-y-4">
        <p className="text-destructive font-medium">Failed to load seasonal discoveries.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Seasonal Discoveries</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Limited-run roasts, cold crafts, and seasonal bakery items currently in rotation.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="self-start md:self-auto text-xs px-3 py-1 font-semibold border-primary/20">
          {currentSeason}
        </Badge>
      </div>

      {/* Progress & Milestone Card (Calculated from verified customer orders) */}
      {totalItems > 0 && (
        <div className="glass rounded-2xl p-6 md:p-8 border border-border relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex-1 w-full space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">Seasonal Taste Exploration</h2>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Try our seasonal selections before their harvest window closes.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl md:text-3xl font-black text-primary font-mono">{triedItems}</span>
                  <span className="text-muted-foreground text-sm font-medium">/{totalItems} sampled</span>
                </div>
              </div>

              <Progress value={progressPercentage} className="h-2.5" />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercentage}% Completed</span>
                {totalItems - triedItems > 0 ? (
                  <span>{totalItems - triedItems} remaining to experience</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All seasonal items sampled!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zero State if no seasonal items are active */}
      {totalItems === 0 && (
        <div className="glass p-12 rounded-2xl border border-border text-center space-y-4">
          <Coffee className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h3 className="font-semibold text-xl text-foreground">No Seasonal Offerings Currently Active</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Our baristas and roasters are currently preparing the upcoming season's harvest collection. In the meantime, discover our signature origin espresso and pour-over selections.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/menu">Explore Full Menu</Link>
          </Button>
        </div>
      )}

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="text-xs shrink-0"
          >
            All Seasonal ({seasonalItems.length})
          </Button>
          {categories.map(cat => {
            const count = seasonalItems.filter(i => i.menu_categories?.id === cat.id).length;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="text-xs shrink-0 gap-1.5"
              >
                {cat.name.toLowerCase().includes('pastry') || cat.name.toLowerCase().includes('food') ? (
                  <Utensils className="w-3.5 h-3.5" />
                ) : (
                  <Coffee className="w-3.5 h-3.5" />
                )}
                {cat.name} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Seasonal Products Grid */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const notes = item.flavor_profile?.notes || [];
            const roast = item.flavor_profile?.roast;
            const isAvailable = item.is_available !== false;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl border border-border overflow-hidden flex flex-col hover:border-primary/40 transition-all shadow-sm"
              >
                {/* Product Image */}
                <div className="aspect-[4/3] w-full overflow-hidden relative bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/60">
                      <Coffee className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {item.menu_categories?.name && (
                      <Badge variant="secondary" className="backdrop-blur-md bg-background/80 text-[10px]">
                        {item.menu_categories.name}
                      </Badge>
                    )}
                    {roast && (
                      <Badge variant="outline" className="backdrop-blur-md bg-background/80 text-[10px]">
                        {roast}
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    {item.hasOrdered ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> Tried
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="backdrop-blur-md bg-background/90 text-primary font-semibold text-[10px]">
                        New to Try
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-lg text-foreground leading-snug">
                        {item.name}
                      </h3>
                      <span className="font-bold text-primary text-base shrink-0 font-mono">
                        {item.price} {item.currency || 'ETB'}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Flavor Notes */}
                    {notes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {notes.map((note, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Limited harvest
                    </span>
                    <Button
                      size="sm"
                      disabled={!isAvailable}
                      onClick={() => handleOrder(item)}
                      className="gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {isAvailable ? 'Order Item' : 'Sold Out'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}