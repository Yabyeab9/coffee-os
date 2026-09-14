import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Coffee, ShoppingBag, Gift, Tag, ChevronRight, X, AlertCircle, Loader2, Sparkles, Moon, Zap, Heart, ExternalLink, CheckCircle } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MenuItem } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useCafe, useMenuCategories, useMenuItems, useAnnouncements } from '@/hooks/queries';
import RedemptionPicker from '@/components/loyalty/RedemptionPicker';

// ── Vibe config (mirrors HomePage) ────────────────────────────────────────────
type Vibe = 'Quiet Focus' | 'Social Energy' | 'Creative Buzz' | 'Comforted';

const VIBE_TAGS: Record<Vibe, string[]> = {
  'Quiet Focus':   ['single-origin', 'pour-over', 'light', 'filter', 'black', 'espresso'],
  'Social Energy': ['sharing', 'cold', 'frappe', 'latte', 'smoothie', 'social', 'sweet'],
  'Creative Buzz': ['specialty', 'seasonal', 'unique', 'discovery', 'signature'],
  'Comforted':     ['warm', 'milk', 'latte', 'cappuccino', 'hot chocolate', 'macchiato'],
};

const VIBE_META: Record<Vibe, { icon: React.ElementType; desc: string; color: string }> = {
  'Quiet Focus':   { icon: Moon,     desc: 'Deep work & reading',       color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'Social Energy': { icon: Zap,      desc: 'Catch-ups & lively chats',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Creative Buzz': { icon: Sparkles, desc: 'Inspiring & creative',       color: 'bg-violet-50 text-violet-700 border-violet-200' },
  'Comforted':     { icon: Heart,    desc: 'Cozy & warm',                color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const VIBE_REASON: Record<Vibe, string> = {
  'Quiet Focus':   'Clean, undistracted — perfect for focused work.',
  'Social Energy': 'Great for sharing and lively conversation.',
  'Creative Buzz': 'Something to spark your creative session.',
  'Comforted':     'A warm classic to ease your day.',
};

const ALL_VIBES = Object.keys(VIBE_TAGS) as Vibe[];

function scoreItem(item: MenuItem, vibe: Vibe): number {
  const tags = (item.tags ?? []).map(t => t.toLowerCase());
  const nameDesc = `${item.name} ${item.description ?? ''}`.toLowerCase();
  let score = 0;
  for (const vt of VIBE_TAGS[vibe]) {
    if (tags.includes(vt)) score += 3;
    if (nameDesc.includes(vt)) score += 1;
  }
  return score;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ActiveCampaign {
  id: string;
  title: string;
  promo_message: string | null;
  discount_type: 'percentage' | 'fixed' | 'free_item' | 'bogo' | null;
  discount_value: number | null;
  min_purchase: number | null;
  max_discount: number | null;
  per_customer_limit: number;
  total_redemptions: number;
  usage_limit: number | null;
  target_audience: string;
  // which items are eligible (empty = all items)
  eligible_item_ids: string[];
}

interface CartEntry { item: MenuItem; qty: number }

// ── Discount calculator ───────────────────────────────────────────────────────
function calcDiscount(campaign: ActiveCampaign, subtotal: number, cartItemIds: string[]): number {
  if (!campaign.discount_value || !campaign.discount_type) return 0;
  if (campaign.min_purchase && subtotal < campaign.min_purchase) return 0;

  let eligible = subtotal;
  if (campaign.eligible_item_ids.length > 0) {
    // Only discount the eligible portion — caller passes full subtotal when all items match
    if (!cartItemIds.some(id => campaign.eligible_item_ids.includes(id))) return 0;
  }

  let discount = 0;
  if (campaign.discount_type === 'percentage') {
    discount = (eligible * campaign.discount_value) / 100;
  } else if (campaign.discount_type === 'fixed') {
    discount = campaign.discount_value;
  }

  if (campaign.max_discount && discount > campaign.max_discount) discount = campaign.max_discount;
  return Math.min(discount, eligible);
}

export default function MenuPage() {
  const { session, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: cafe, isLoading: isCafeLoading } = useCafe();
  const { data: categoriesData } = useMenuCategories(cafe?.id);
  const { data: menuRes, isLoading: isMenuLoading } = useMenuItems(cafe?.id);
  const { data: announcementsData } = useAnnouncements(cafe?.id);

  const categories = categoriesData || [];
  const allItems: MenuItem[] = menuRes?.data || [];
  const announcements = announcementsData || [];
  const isLoading = isCafeLoading || isMenuLoading;

  // ── Vibe state — read from URL, kept in sync ────────────────────────────────
  const rawVibe = searchParams.get('vibe') ?? '';
  const activeVibe: Vibe | null = ALL_VIBES.includes(rawVibe as Vibe) ? (rawVibe as Vibe) : null;

  const setVibe = useCallback((vibe: Vibe | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (vibe) next.set('vibe', vibe);
      else next.delete('vibe');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Campaigns
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<ActiveCampaign | null>(null);
  const [customerRedemptionCounts, setCustomerRedemptionCounts] = useState<Record<string, number>>({});

  // Cart
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment path: DIRECT (no redemption) | REDEEMED (loyalty code applied)
  const [paymentMode, setPaymentMode] = useState<'DIRECT' | 'REDEEMED'>('DIRECT');
  const [appliedRedemptionCode, setAppliedRedemptionCode] = useState<string | null>(null);
  const [appliedRedemptionDiscount, setAppliedRedemptionDiscount] = useState(0);

  // Normal text search (independent of vibe)
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // ── Load active campaigns ───────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    if (!cafe?.id) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('campaigns')
      .select('id,title,promo_message,discount_type,discount_value,min_purchase,max_discount,per_customer_limit,total_redemptions,usage_limit,target_audience')
      .eq('cafe_id', cafe.id)
      .eq('status', 'active')
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`);

    if (!data) return;

    // For each campaign fetch its eligible item IDs
    const enriched = await Promise.all(
      (data as any[]).map(async (c) => {
        const { data: cmi } = await supabase
          .from('campaign_menu_items')
          .select('menu_item_id')
          .eq('campaign_id', c.id);
        return { ...c, eligible_item_ids: (cmi ?? []).map((x: any) => x.menu_item_id) };
      })
    );
    setCampaigns(enriched);
  }, [cafe?.id]);

  // ── Load customer's existing redemptions ────────────────────────────────────
  const loadRedemptions = useCallback(async () => {
    if (!session?.user?.id || campaigns.length === 0) return;
    const ids = campaigns.map(c => c.id);
    const { data } = await supabase
      .from('campaign_redemptions')
      .select('campaign_id')
      .eq('customer_id', session.user.id)
      .in('campaign_id', ids);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      counts[r.campaign_id] = (counts[r.campaign_id] ?? 0) + 1;
    });
    setCustomerRedemptionCounts(counts);
  }, [session?.user?.id, campaigns]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadRedemptions(); }, [loadRedemptions]);

  // ── Eligibility check per campaign for the current user ────────────────────
  const isCampaignEligible = useCallback((c: ActiveCampaign): boolean => {
    // Usage cap hit
    if (c.usage_limit && c.total_redemptions >= c.usage_limit) return false;
    // Customer already redeemed their limit
    const redeemed = customerRedemptionCounts[c.id] ?? 0;
    if (redeemed >= c.per_customer_limit) return false;
    // Audience targeting
    if (c.target_audience !== 'all' && !session?.user) return false;
    return true;
  }, [customerRedemptionCounts, session?.user]);

  // ── Items eligible for the selected campaign ────────────────────────────────
  const eligibleItemIds = selectedCampaign?.eligible_item_ids ?? [];

  const isEligibleForCampaign = (itemId: string): boolean => {
    if (!selectedCampaign) return false;
    if (eligibleItemIds.length === 0) return true; // all items
    return eligibleItemIds.includes(itemId);
  };

  // ── Cart helpers ────────────────────────────────────────────────────────────
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

  const removeFromCart = (itemId: string) => setCart(prev => prev.filter(p => p.item.id !== itemId));

  // ── Subtotal, campaign discount, loyalty discount, total ───────────────────
  const subtotal = cart.reduce((s, c) => s + ((c.item.price ?? 0) * c.qty), 0);
  const TAX_RATE = 0.15;

  const campaignDiscount = selectedCampaign && isCampaignEligible(selectedCampaign)
    ? calcDiscount(selectedCampaign, subtotal, cart.map(c => c.item.id))
    : 0;

  const taxableAmount   = subtotal - campaignDiscount;
  const taxAmount       = taxableAmount * TAX_RATE;
  const grossTotal      = taxableAmount + taxAmount;
  // Loyalty can cover up to the full gross total
  const loyaltyDiscount = Math.min(appliedRedemptionDiscount, grossTotal);
  const totalAmount     = Math.max(0, grossTotal - loyaltyDiscount);
  const isZeroPay       = totalAmount === 0 && cart.length > 0;

  // ── Checkout — strictly separated DIRECT vs REDEEMED paths ─────────────────
  const clearCart = () => {
    setCart([]);
    setIsCheckoutOpen(false);
    setSelectedCampaign(null);
    setPaymentMode('DIRECT');
    setAppliedRedemptionCode(null);
    setAppliedRedemptionDiscount(0);
  };

  const recordCampaign = async (orderId: string) => {
    if (!selectedCampaign || campaignDiscount <= 0 || !profile) return;
    await Promise.all([
      supabase.from('campaign_redemptions').insert({
        campaign_id: selectedCampaign.id,
        customer_id: profile.id,
        order_id: orderId,
        discount_applied: campaignDiscount,
      }),
      supabase.from('campaigns')
        .update({ total_redemptions: (selectedCampaign.total_redemptions ?? 0) + 1 })
        .eq('id', selectedCampaign.id),
    ]);
  };
  // ── Payment confirmation state ──────────────────────────────────────────────
  const pendingOrderRef = useRef<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState<string | null>(null);
  const [ordersPopupBlocked, setOrdersPopupBlocked] = useState(false);

  const paymentHandledRef = useRef(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Finalize successful payment ONCE ────────────────────────────────────────
  const handlePaymentConfirmed = useCallback(() => {
    if (paymentHandledRef.current) return;

    paymentHandledRef.current = true;

    setPaymentPending(false);
    setPaymentCheckoutUrl(null);

    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    clearCart();

    const opened = openOrdersWindowOnce();

    if (!opened) {
      setOrdersPopupBlocked(true);
    }

    toast.success(
      'Payment confirmed! Your order is now being prepared. ☕',
      {
        description: opened
          ? 'Your order is now open in a new tab.'
          : 'Your order is confirmed. Please open My Orders from the menu.',
      }
    );
  }, []);

  // ── Verify current order status from backend ─────────────────────────────────
  const checkPendingPayment = useCallback(async () => {
    const pending = pendingOrderRef.current;

    if (!pending || paymentHandledRef.current) {
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id, payment_status, order_status')
      .eq('id', pending.orderId)
      .maybeSingle();

    if (error) {
      console.error('[PAYMENT] Status check failed:', error);
      return;
    }

    if (!data) {
      console.warn(
        '[PAYMENT] Order not visible while waiting for confirmation:',
        pending.orderId
      );
      return;
    }

    console.log('[PAYMENT] Current order state:', {
      id: data.id,
      payment_status: data.payment_status,
      order_status: data.order_status,
    });

    if (data.payment_status === 'paid') {
      handlePaymentConfirmed();
    }
  }, [handlePaymentConfirmed]);

  // ── Realtime + fallback confirmation ────────────────────────────────────────
  useEffect(() => {
    const pending = pendingOrderRef.current;

    if (!paymentPending || !pending || paymentHandledRef.current) {
      return;
    }

    let disposed = false;

    console.log('[PAYMENT] Starting confirmation listener:', {
      orderId: pending.orderId,
      orderNumber: pending.orderNumber,
    });

    // Always check immediately in case the webhook already finished
    checkPendingPayment();

    // ── PRIMARY: Supabase Realtime ────────────────────────────────────────────
    const channel = supabase
      .channel(`payment-confirmation-${pending.orderId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${pending.orderId}`,
        },
        (payload) => {
          if (disposed || paymentHandledRef.current) {
            return;
          }

          const newRow = payload.new as {
            id?: string;
            payment_status?: string;
            order_status?: string;
          };

          console.log('[PAYMENT REALTIME] Order updated:', newRow);

          if (
            newRow.id === pending.orderId &&
            newRow.payment_status === 'paid'
          ) {
            handlePaymentConfirmed();
          }
        }
      )
      .subscribe((status) => {
        console.log('[PAYMENT REALTIME] Subscription status:', status);

        if (status === 'SUBSCRIBED') {
          console.log(
            '[PAYMENT REALTIME] Listening for order:',
            pending.orderId
          );

          // Race protection:
          // webhook could have completed between the first DB check
          // and the realtime subscription becoming active.
          checkPendingPayment();
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.warn(
            '[PAYMENT REALTIME] Realtime unavailable; fallback polling remains active.'
          );
        }
      });

    realtimeChannelRef.current = channel;

    // ── FALLBACK: DB polling ──────────────────────────────────────────────────
    // Realtime is primary. Polling exists only as resilience against:
    // - realtime disconnect
    // - websocket failure
    // - browser/network instability
    // - webhook/realtime timing races
    fallbackIntervalRef.current = setInterval(() => {
      if (!disposed && !paymentHandledRef.current) {
        checkPendingPayment();
      }
    }, 5000);

    // ── Reconcile immediately when customer returns from Chapa ───────────────
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !disposed &&
        !paymentHandledRef.current
      ) {
        console.log(
          '[PAYMENT] Tab became visible; reconciling payment state.'
        );

        checkPendingPayment();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    // ── Also reconcile when browser regains network ───────────────────────────
    const handleOnline = () => {
      if (
        !disposed &&
        !paymentHandledRef.current
      ) {
        console.log(
          '[PAYMENT] Network restored; reconciling payment state.'
        );

        checkPendingPayment();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      disposed = true;

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      window.removeEventListener('online', handleOnline);

      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }

      if (realtimeChannelRef.current) {
        supabase.removeChannel(
          realtimeChannelRef.current
        );
        realtimeChannelRef.current = null;
      }
    };
  }, [
    paymentPending,
    checkPendingPayment,
    handlePaymentConfirmed,
  ]);

  const sendToChapa = async (orderId: string, orderNumber: string, amount: number) => {
    const initResponse = await supabase.functions.invoke('chapa-initialize', {
      body: {
        amount: amount.toFixed(2),
        currency: 'ETB',
        email: profile!.email || 'customer@example.com',
        first_name: profile!.full_name || 'Customer',
        tx_ref: orderNumber,
      },
    });
    if (initResponse.error) throw initResponse.error;
    const { checkout_url } = initResponse.data;
    if (!checkout_url) throw new Error('No checkout URL returned from payment gateway');

    // Open Chapa in a NEW TAB — receipt stays visible; this tab polls for paid status
    pendingOrderRef.current = { orderId, orderNumber };
    setPaymentCheckoutUrl(checkout_url);
    const win = window.open(checkout_url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked — show manual link
      toast.info('Please open the payment window below.', { duration: 10000 });
    }
    setPaymentPending(true);
    setIsCheckoutOpen(false);
  };

  const handleCheckout = async () => {
    if (!profile) {
      toast.error('Please sign in to place an order.');
      navigate('/login?returnTo=/menu');
      return;
    }
    if (!cafe) return;
    setIsSubmitting(true);

    try {
      const items = cart.map(c => ({ menu_item_id: c.item.id, quantity: c.qty }));

      // ── PATH A: DIRECT — no redemption code applied ─────────────────────
      if (paymentMode === 'DIRECT') {
        const { data, error } = await supabase.rpc('process_direct_checkout', {
          p_cafe_id: cafe.id,
          p_items: items,
        });
        if (error) throw error;
        await recordCampaign(data.order_id);
        // sendToChapa opens a new tab — sets paymentPending, closes modal
        await sendToChapa(data.order_id, data.order_number, data.amount_to_pay);
        return;
      }

      // ── PATH B: REDEEMED — loyalty code explicitly applied ──────────────
      if (paymentMode === 'REDEEMED' && appliedRedemptionCode) {
        const { data, error } = await supabase.rpc('process_checkout_with_redemption', {
          p_cafe_id: cafe.id,
          p_items: items,
          p_redemption_code: appliedRedemptionCode,
        });
        if (error) throw error;
        await recordCampaign(data.order_id);

        if (data.is_zero_pay) {
          toast.success('Order placed! Your rewards covered the full amount. ☕');
          clearCart();
          navigate('/account/orders');
          return;
        }

        await sendToChapa(data.order_id, data.order_number, data.amount_to_pay);
        return;
      }
    } catch (err: any) {
      toast.error('Checkout failed.', { description: err.message });
      // Preserve cart + input. Reset only transient submitting flag so retry works immediately.
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment-pending overlay (shows after Chapa tab is opened)
  const PaymentPendingOverlay = paymentPending ? (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass max-w-sm w-full p-8 rounded-2xl border border-border text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-heading font-semibold text-foreground">Complete Payment</h2>
          <p className="text-sm text-muted-foreground">
            A secure payment window opened in a new tab. Complete your payment there — this page updates automatically.
          </p>
        </div>
        {paymentCheckoutUrl && (
          <Button asChild variant="outline" className="w-full">
            <a href={paymentCheckoutUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Reopen Payment Window
            </a>
          </Button>
        )}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          Waiting for payment confirmation…
        </div>
      </div>
    </div>
  ) : null;

  // ── Vibe-scored recommendations (top 4 items by vibe score) ────────────────
  const vibeRecommendations = useMemo<MenuItem[]>(() => {
    if (!activeVibe) return [];
    const available = allItems.filter(i => i.is_available && i.status === 'active');
    return available
      .map(i => ({ item: i, score: scoreItem(i, activeVibe) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  }, [activeVibe, allItems]);

  // ── Filtering (vibe does NOT constrain the main grid — it lives in a separate section) ─
  const filtered = allItems.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      (item.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch && item.is_available && item.status === 'active';
  });

  if (isLoading || !cafe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Coffee className="w-6 h-6 text-primary animate-pulse" />
      </div>
    );
  }

  const vibeMeta = activeVibe ? VIBE_META[activeVibe] : null;
  const VibeIcon = vibeMeta?.icon;
  const totalCartQty = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>

      {/* ── Active Campaign Banners ─────────────────────────────────────────── */}
      <AnimatePresence>
        {campaigns.filter(c => isCampaignEligible(c)).map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`border-b px-4 py-2.5 ${selectedCampaign?.id === c.id
              ? 'bg-primary/15 border-primary/30'
              : 'bg-primary/8 border-primary/15'}`}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground truncate">{c.title}</span>
                {c.promo_message && (
                  <span className="text-muted-foreground hidden md:inline truncate">— {c.promo_message}</span>
                )}
                {c.discount_type === 'percentage' && c.discount_value && (
                  <Badge className="bg-primary/15 text-primary border-primary/20 shrink-0 text-xs">
                    {c.discount_value}% off
                  </Badge>
                )}
                {c.discount_type === 'fixed' && c.discount_value && (
                  <Badge className="bg-primary/15 text-primary border-primary/20 shrink-0 text-xs">
                    {c.discount_value} ETB off
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedCampaign?.id === c.id ? (
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs border-primary/30 text-primary bg-primary/10"
                    onClick={() => setSelectedCampaign(null)}>
                    <X className="w-3 h-3 mr-1" /> Remove
                  </Button>
                ) : (
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setSelectedCampaign(c)}>
                    Apply <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <section className="section-pad pb-6 max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Our Offerings</p>
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-3">The Menu</h1>
          <p className="text-muted-foreground max-w-lg">
            {cafe.description ?? "Single-origin coffees, specialty brews, and traditional Ethiopian experiences."}
          </p>
          {selectedCampaign && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
              <Tag className="w-3.5 h-3.5" />
              <span>"{selectedCampaign.title}" applied</span>
              {campaignDiscount > 0 && subtotal > 0 && (
                <span className="text-primary font-bold">— saves {campaignDiscount.toFixed(0)} ETB</span>
              )}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── Vibe Banner ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeVibe && vibeMeta && VibeIcon && (
          <motion.section
            key="vibe-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-7xl mx-auto px-4 md:px-8 mb-2"
          >
            <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${vibeMeta.color}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <VibeIcon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-sm">{activeVibe}</span>
                  <span className="mx-2 opacity-40">·</span>
                  <span className="text-sm opacity-70">{vibeMeta.desc}</span>
                </div>
              </div>
              <button
                onClick={() => setVibe(null)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Clear vibe"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Vibe Recommendations ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeVibe && vibeRecommendations.length > 0 && (
          <motion.section
            key="vibe-recs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 md:px-8 mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Recommended for <span className="text-primary">{activeVibe}</span>
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">{VIBE_REASON[activeVibe]}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vibeRecommendations.map((item, i) => {
                const hasCampaignBadge = isEligibleForCampaign(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className={`glass rounded-xl overflow-hidden group relative cursor-pointer ring-1 ${hasCampaignBadge ? 'ring-primary/40' : 'ring-border/60'}`}
                    onClick={() => addToCart(item)}
                  >
                    {item.image_url ? (
                      <div className="aspect-square w-full overflow-hidden">
                        <img src={item.image_url} alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="aspect-square w-full bg-secondary flex items-center justify-center">
                        <Coffee className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-medium text-sm text-foreground leading-snug line-clamp-1">{item.name}</p>
                      <p className="text-xs text-primary font-semibold mt-0.5">{item.price} ETB</p>
                      <div className="mt-2 w-full py-1.5 text-center text-xs font-medium rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Add to order
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Vibe active but no items scored — helpful fallback */}
        {activeVibe && vibeRecommendations.length === 0 && !isLoading && (
          <motion.div
            key="vibe-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 md:px-8 mb-6"
          >
            <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No items are tagged for this vibe yet — browse the full menu below.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky Filter Bar ───────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-y border-border/40 py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Vibe switcher pills — compact, always visible */}
            <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 shrink-0">
              {ALL_VIBES.map(v => {
                const meta = VIBE_META[v];
                const Icon = meta.icon;
                return (
                  <button
                    key={v}
                    onClick={() => setVibe(activeVibe === v ? null : v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all shrink-0 ${
                      activeVibe === v
                        ? 'bg-primary/15 text-primary border-primary/30 font-medium'
                        : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {v}
                  </button>
                );
              })}
            </div>

            {/* Category pills */}
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

            <div className="relative shrink-0 w-full md:w-56">
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

      {/* ── Full Menu Grid ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {activeVibe && !search && activeCategory === 'all' && (
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground px-3">Full Menu</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Coffee className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="mb-4">No items match your search.</p>
            {(search || activeCategory !== 'all') && (
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setActiveCategory('all'); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => {
              const hasCampaignBadge = isEligibleForCampaign(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  className={`glass rounded-xl overflow-hidden card-hover group relative ${hasCampaignBadge ? 'ring-1 ring-primary/30' : ''}`}
                >
                  {hasCampaignBadge && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> Offer
                      </Badge>
                    </div>
                  )}
                  {item.image_url ? (
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img src={item.image_url} alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                        <div className="text-right shrink-0">
                          {hasCampaignBadge && selectedCampaign?.discount_type === 'percentage' && selectedCampaign.discount_value && (
                            <p className="text-[10px] line-through text-muted-foreground">{item.price} ETB</p>
                          )}
                          <span className="text-primary font-semibold text-sm">
                            {hasCampaignBadge && selectedCampaign?.discount_type === 'percentage' && selectedCampaign.discount_value
                              ? `${(item.price * (1 - selectedCampaign.discount_value / 100)).toFixed(0)} ETB`
                              : `${item.price} ETB`}
                          </span>
                        </div>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(item.tags ?? []).slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 capitalize">{tag}</Badge>
                      ))}
                    </div>
                    <Button onClick={() => addToCart(item)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Order Now
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Floating Cart Button ─────────────────────────────────────────────── */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsCheckoutOpen(true)}
            className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 px-6 py-6 rounded-full flex items-center gap-3"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-semibold">{totalCartQty} item{totalCartQty !== 1 ? 's' : ''}</span>
            {(campaignDiscount + loyaltyDiscount) > 0 && (
              <Badge className="bg-white/20 text-white text-xs px-1.5 py-0">
                −{(campaignDiscount + loyaltyDiscount).toFixed(0)}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* ── Checkout Modal ───────────────────────────────────────────────────── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 max-h-[90dvh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-semibold text-foreground">Your Order</h2>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cart items */}
              <div className="max-h-48 overflow-y-auto space-y-3 mb-4 pr-1">
                {cart.map(c => (
                  <div key={c.item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground text-sm shrink-0">{c.qty}×</span>
                      <span className="text-foreground font-medium truncate">{c.item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-primary font-semibold text-sm">ETB {((c.item.price ?? 0) * c.qty).toFixed(0)}</span>
                      <button onClick={() => removeFromCart(c.item.id)}
                        className="text-muted-foreground hover:text-destructive text-[10px] uppercase">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Applied campaign badge */}
              {selectedCampaign && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-primary min-w-0">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium truncate">{selectedCampaign.title}</span>
                  </div>
                  <button onClick={() => setSelectedCampaign(null)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Loyalty redemption picker — only for logged-in users */}
              {session && (
                <div className="mb-4">
                  <RedemptionPicker
                    orderTotal={grossTotal}
                    appliedCode={appliedRedemptionCode}
                    appliedDiscount={appliedRedemptionDiscount}
                    onApply={(code, discount) => {
                      setAppliedRedemptionCode(code);
                      setAppliedRedemptionDiscount(discount);
                      setPaymentMode('REDEEMED');
                    }}
                    onClear={() => {
                      setAppliedRedemptionCode(null);
                      setAppliedRedemptionDiscount(0);
                      setPaymentMode('DIRECT');
                    }}
                  />
                </div>
              )}

              {/* Totals */}
              <div className="pt-3 border-t border-border/50 space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>ETB {subtotal.toFixed(2)}</span>
                </div>
                {campaignDiscount > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Promo ({selectedCampaign?.title})</span>
                    <span>− ETB {campaignDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (15%)</span><span>ETB {taxAmount.toFixed(2)}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Reward Credit</span>
                    <span>− ETB {loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border/50">
                  <span>{isZeroPay ? 'Total (Fully Covered)' : 'Total'}</span>
                  <span className="text-primary">
                    {isZeroPay ? 'ETB 0.00 ☕' : `ETB ${totalAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Zero-pay note */}
              {isZeroPay && (
                <div className="mb-4 text-xs text-primary bg-primary/8 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5 shrink-0" />
                  Your loyalty rewards cover this order in full — no payment required!
                </div>
              )}

              {/* Campaign eligibility warning */}
              {selectedCampaign && !isCampaignEligible(selectedCampaign) && (
                <div className="mb-4 flex items-start gap-2 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>This offer has reached its redemption limit for your account.</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1 border-border">
                  Back
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={isSubmitting || cart.length === 0}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing…</>
                    : isZeroPay ? 'Place Order (Free)' : 'Pay & Place Order'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {PaymentPendingOverlay}
    </PublicLayout>
  );
}