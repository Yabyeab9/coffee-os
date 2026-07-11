import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Coffee, ShoppingBag, Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCafeBySlug, getMenuItems, getMenuCategories, getAnnouncements } from '@/lib/api';
import type { Cafe, MenuItem, MenuCategory, Announcement } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const CAFE_SLUG = 'origin';

const DIETARY_LABELS: Record<string, string> = {
  'vegetarian': 'Vegetarian',
  'vegan': 'Vegan',
  'gluten-free': 'Gluten-Free',
};

export default function MenuPage() {
  const { session, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Simple cart state for this page
  const [cart, setCart] = useState<{item: MenuItem, qty: number}[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) { setIsLoading(false); return; }
      setCafe(c);
      const [cats, menuRes, annoData] = await Promise.all([
        getMenuCategories(c.id),
        getMenuItems(c.id),
        getAnnouncements(c.id),
      ]);
      setCategories(cats);
      setAllItems(menuRes.data);
      setAnnouncements(annoData);
      setIsLoading(false);
    }
    load();
  }, []);

  const addToCart = (item: MenuItem) => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) return prev.map(p => p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { item, qty: 1 }];
    });
    toast.success(`Added ${item.name} to order`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(p => p.item.id !== itemId));
  };

  const handleCheckout = async () => {
    if (!profile || !cafe) return;
    setIsSubmitting(true);
    
    try {
      const subtotal = cart.reduce((sum, c) => sum + ((c.item.price || 0) * c.qty), 0);
      const tax = subtotal * 0.15;
      const totalAmount = subtotal + tax;

      // Create order
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        user_id: profile.id,
        cafe_id: cafe.id,
        subtotal,
        tax,
        service_fee: 0,
        total_amount: totalAmount,
        payment_status: 'unpaid',
        order_status: 'pending'
      }).select('id').single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = cart.map(c => ({
        order_id: orderData.id,
        menu_item_id: c.item.id,
        quantity: c.qty,
        unit_price: c.item.price || 0,
        total_price: (c.item.price || 0) * c.qty
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success('Order placed successfully!');
      setCart([]);
      setIsCheckoutOpen(false);
      navigate('/account/orders');

    } catch (error: any) {
      toast.error('Failed to place order', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = allItems.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch && item.is_available;
  });

  if (isLoading || !cafe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Coffee className="w-6 h-6 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      {/* Header */}
      <section className="section-pad pb-8 max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Our Offerings</p>
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-3">
            The Menu
          </h1>
          <p className="text-muted-foreground max-w-lg">
            Single-origin coffees, specialty brews, and traditional Ethiopian experiences — all sourced from Ethiopia's finest highland farms.
          </p>
        </motion.div>
      </section>

      {/* Filters */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-y border-border/40 py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 flex-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0 ${
                  activeCategory === 'all' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0 ${
                    activeCategory === cat.id ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative shrink-0 w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="pl-9 bg-input border-border text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Coffee className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No items found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="glass rounded-xl overflow-hidden card-hover group"
              >
                {item.image_url ? (
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-secondary flex items-center justify-center">
                    <Coffee className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading font-semibold text-foreground leading-snug">{item.name}</h3>
                    {item.price != null && (
                      <span className="text-primary font-semibold text-sm shrink-0">
                        {item.price} <span className="text-xs text-muted-foreground">{item.currency}</span>
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 capitalize">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => addToCart(item)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                      Order Now
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => {}} className="shrink-0 border-border text-muted-foreground hover:text-foreground">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={() => setIsCheckoutOpen(true)} className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 px-6 py-6 rounded-full flex items-center gap-3">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-semibold">{cart.length} item{cart.length > 1 ? 's' : ''}</span>
          </Button>
        </div>
      )}

      {/* Quick Checkout Modal Overlay */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Your Order</h2>
            <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-2">
              {cart.map(c => (
                <div key={c.item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">{c.qty}x</span>
                    <span className="text-foreground font-medium">{c.item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-semibold text-sm">ETB {(c.item.price || 0) * c.qty}</span>
                    <button onClick={() => removeFromCart(c.item.id)} className="text-muted-foreground hover:text-destructive text-sm uppercase text-[10px]">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-border/50 space-y-2 mb-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>ETB {cart.reduce((sum, c) => sum + ((c.item.price || 0) * c.qty), 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (15%)</span>
                <span>ETB {(cart.reduce((sum, c) => sum + ((c.item.price || 0) * c.qty), 0) * 0.15).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border/50">
                <span>Total</span>
                <span className="text-primary">ETB {(cart.reduce((sum, c) => sum + ((c.item.price || 0) * c.qty), 0) * 1.15).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1 border-border">Back to Menu</Button>
              <Button onClick={handleCheckout} disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
