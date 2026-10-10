import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Compass, Sparkles, Coffee, Utensils, Award,
  ArrowRight, CheckCircle2, ShoppingBag, Heart,
  Flame, RefreshCw, Loader2, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface MenuItemWithCategory {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id?: string;
  seasonal?: boolean;
  is_featured?: boolean;
  is_available: boolean;
  status: string;
  tags?: string[];
  flavor_profile?: {
    notes?: string[];
    roast?: string;
    intensity?: number;
    type?: string;
  };
  menu_categories?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface ScoredRecommendation {
  item: MenuItemWithCategory;
  score: number;
  badge: string;
  reason: string;
  categoryType: 'favorite-category' | 'seasonal' | 'complementary' | 'featured' | 'bestseller';
}

export default function TrySomethingNewPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const navigate = useNavigate();

  // 1. Query full active menu and customer completed order history
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['try_something_new_engine', userId],
    queryFn: async () => {
      // Fetch all active available menu items
      const { data: menuItems, error: menuErr } = await supabase
        .from('menus')
        .select(`
          *,
          menu_categories:category_id (id, name, description)
        `)
        .eq('is_available', true)
        .eq('status', 'active');

      if (menuErr) throw menuErr;

      // Fetch customer paid/completed orders with ordered items
      let orderedItemIds = new Set<string>();
      let orderedCategoryCounts: Record<string, number> = {};
      let hasOrderedAnyPastry = false;
      let hasOrderedAnyDrink = false;
      let totalCustomerOrders = 0;

      if (userId) {
        const { data: userOrders, error: ordersErr } = await supabase
          .from('orders')
          .select(`
            id,
            payment_status,
            order_items (
              menu_item_id,
              quantity,
              menus:menu_item_id (id, category_id, name, menu_categories:category_id(name))
            )
          `)
          .eq('user_id', userId)
          .in('payment_status', ['paid', 'completed']);

        if (ordersErr) throw ordersErr;

        totalCustomerOrders = (userOrders || []).length;

        userOrders?.forEach(ord => {
          ord.order_items?.forEach((oi: any) => {
            if (oi.menu_item_id) {
              orderedItemIds.add(oi.menu_item_id);

              const catId = oi.menus?.category_id;
              const catName = (oi.menus?.menu_categories?.name || '').toLowerCase();

              if (catId) {
                orderedCategoryCounts[catId] = (orderedCategoryCounts[catId] || 0) + (oi.quantity || 1);
              }

              if (catName.includes('pastry') || catName.includes('food') || catName.includes('bakery')) {
                hasOrderedAnyPastry = true;
              } else {
                hasOrderedAnyDrink = true;
              }
            }
          });
        });
      }

      return {
        allMenu: (menuItems || []) as MenuItemWithCategory[],
        orderedItemIds,
        orderedCategoryCounts,
        hasOrderedAnyPastry,
        hasOrderedAnyDrink,
        totalCustomerOrders,
      };
    },
  });

  // 2. Recommendation Engine: Exclude tried items & rank untried items
  const engineResults = useMemo(() => {
    if (!data) return { untried: [], isNewCustomer: true, allExplored: false, totalCount: 0, triedCount: 0 };

    const { allMenu, orderedItemIds, orderedCategoryCounts, hasOrderedAnyPastry, hasOrderedAnyDrink, totalCustomerOrders } = data;
    const isNewCustomer = totalCustomerOrders === 0 || orderedItemIds.size === 0;

    // Filter STRICTLY untried products
    const untriedItems = allMenu.filter(item => !orderedItemIds.has(item.id));
    const allExplored = allMenu.length > 0 && untriedItems.length === 0;

    // Determine top preferred category ID
    let topCategoryId = '';
    let maxCount = 0;
    Object.entries(orderedCategoryCounts).forEach(([catId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCategoryId = catId;
      }
    });

    const scored: ScoredRecommendation[] = untriedItems.map(item => {
      let score = 70;
      let badge = 'Recommended';
      let reason = 'A customer favorite you haven\'t tried yet.';
      let categoryType: ScoredRecommendation['categoryType'] = 'bestseller';

      const catName = item.menu_categories?.name || '';
      const isPastry = catName.toLowerCase().includes('pastry') || catName.toLowerCase().includes('food');

      if (isNewCustomer) {
        if (item.is_featured) {
          score = 98;
          badge = 'Signature Discovery';
          reason = 'Our most acclaimed specialty brew — the perfect first experience at Coffee OS.';
          categoryType = 'featured';
        } else if (item.seasonal) {
          score = 94;
          badge = 'Seasonal Harvest';
          reason = 'Limited-time seasonal release crafted from rare Ethiopian highland lots.';
          categoryType = 'seasonal';
        } else {
          score = 88;
          badge = 'Cafe Classic';
          reason = 'A beloved staple among our local coffee connoisseurs in Addis Ababa.';
          categoryType = 'bestseller';
        }
      } else {
        // Customer has order history
        if (item.seasonal) {
          score = 96;
          badge = 'Untried Seasonal';
          reason = 'A limited-run seasonal roast in rotation that you haven\'t had the chance to sample.';
          categoryType = 'seasonal';
        } else if (item.category_id === topCategoryId) {
          score = 94;
          badge = 'Flavor Affinity';
          reason = `Based on your frequent orders in ${catName}, here's an untried roast with distinct tasting notes.`;
          categoryType = 'favorite-category';
        } else if (!hasOrderedAnyPastry && isPastry) {
          score = 91;
          badge = 'Complementary Pairing';
          reason = 'You frequently order coffee drinks — try pairing your cup with this freshly baked artisanal treat.';
          categoryType = 'complementary';
        } else if (item.is_featured) {
          score = 86;
          badge = 'Barista Pick';
          reason = 'A customer favorite single-origin lot that remains untried in your coffee passport.';
          categoryType = 'featured';
        } else {
          score = 80;
          badge = 'Untried Recipe';
          reason = `Expand beyond your usual picks with this artisanal ${catName} selection.`;
          categoryType = 'bestseller';
        }
      }

      return {
        item,
        score,
        badge,
        reason,
        categoryType,
      };
    });

    // Sort by recommendation score descending
    scored.sort((a, b) => b.score - a.score);

    return {
      untried: scored,
      isNewCustomer,
      allExplored,
      totalCount: allMenu.length,
      triedCount: orderedItemIds.size,
    };
  }, [data]);

  const handleOrder = (item: MenuItemWithCategory) => {
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
        <p className="text-destructive font-medium">Failed to calculate recommendations.</p>
        <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  const { untried, isNewCustomer, allExplored, totalCount, triedCount } = engineResults;
  const featuredRec = untried[0];
  const secondaryRecs = untried.slice(1, 7);
  const explorationPct = totalCount > 0 ? Math.round((triedCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Compass className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Try Something New</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Personalized discoveries excluding items you've already ordered.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start md:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh Insights
        </Button>
      </div>

      {/* Exploration Journey Summary */}
      <div className="glass rounded-2xl p-6 border border-border bg-gradient-to-r from-primary/5 via-transparent to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg text-foreground">Your Palate Exploration</h2>
            {isNewCustomer && (
              <Badge variant="secondary" className="text-xs">Fresh Palate</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isNewCustomer
              ? "You haven't placed an order yet. Here are our top-rated signature coffees to start your journey."
              : `You have tasted ${triedCount} out of ${totalCount} offerings on our active menu.`
            }
          </p>
          {!isNewCustomer && (
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span>{explorationPct}% Menu Discovered</span>
                <span className="text-primary font-bold">{untried.length} Untried Items</span>
              </div>
              <Progress value={explorationPct} className="h-2" />
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/menu">Browse Full Menu</Link>
          </Button>
        </div>
      </div>

      {/* ALL ITEMS ORDERED - Edge Case Completion Banner */}
      {allExplored && (
        <div className="glass rounded-2xl p-8 md:p-12 border border-primary/40 text-center space-y-4 bg-gradient-to-b from-primary/10 to-transparent">
          <Award className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
            Ultimate Coffee Explorer! ☕
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Incredible achievement! You have ordered every single offering on our current menu. Our head roaster is concocting brand new seasonal lots. In the meantime, revisit your past favorites or explore our Seasonal Discoveries!
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button asChild variant="default">
              <Link to="/account/seasonal-discoveries">View Seasonal Offerings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/account/orders">Revisit Past Orders</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Top Untried Recommendation Card */}
      {featuredRec && (
        <div className="glass rounded-3xl p-6 md:p-10 border border-primary/30 shadow-md relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Visual preview */}
            <div className="w-full md:w-5/12 aspect-[4/3] rounded-2xl overflow-hidden relative shadow-md bg-muted">
              {featuredRec.item.image_url ? (
                <img
                  src={featuredRec.item.image_url}
                  alt={featuredRec.item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Coffee className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-3 left-3">
                <Badge className="bg-primary text-primary-foreground font-semibold text-xs shadow-md">
                  {featuredRec.score}% MATCH
                </Badge>
              </div>
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="backdrop-blur-md bg-background/90 text-xs font-semibold">
                  {featuredRec.badge}
                </Badge>
              </div>
            </div>

            {/* Info and Call to action */}
            <div className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                    Top Untried Pick
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {featuredRec.item.price} {featuredRec.item.currency || 'ETB'}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
                  {featuredRec.item.name}
                </h3>
              </div>

              {/* Explicit recommendation reason */}
              <div className="bg-background/60 backdrop-blur-sm p-4 rounded-xl border border-border space-y-1">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Why this is recommended for you:
                </span>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {featuredRec.reason}
                </p>
              </div>

              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {featuredRec.item.description}
              </p>

              {/* Flavor notes */}
              {featuredRec.item.flavor_profile?.notes && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {featuredRec.item.flavor_profile.notes.map((note, i) => (
                    <span key={i} className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                      {note}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleOrder(featuredRec.item)}
                  className="gap-2 shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" /> Order This Drink
                </Button>
                <Button
                  variant="outline"
                  asChild
                >
                  <Link to={`/menu?search=${encodeURIComponent(featuredRec.item.name)}`}>
                    View Menu Details
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Untried Selections Grid */}
      {secondaryRecs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-heading text-foreground">More Untried Selections</h2>
            <span className="text-xs text-muted-foreground">Filtered from your past order records</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {secondaryRecs.map(({ item, score, badge, reason }) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl border border-border p-5 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] font-semibold text-primary bg-primary/10">
                      {badge}
                    </Badge>
                    <span className="font-bold text-foreground text-sm font-mono">
                      {item.price} {item.currency || 'ETB'}
                    </span>
                  </div>

                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Coffee className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-foreground line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                  </div>

                  {/* Recommendation logic quote */}
                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground block mb-0.5">Recommendation rationale:</span>
                    {reason}
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[11px] text-muted-foreground">
                    {item.menu_categories?.name || 'Specialty'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs hover:border-primary"
                    onClick={() => handleOrder(item)}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Order
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}