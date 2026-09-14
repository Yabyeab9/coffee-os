import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowRight, Calendar, Star, Coffee, Sparkles, CloudRain, Sun, Moon,
  Zap, Heart, Tag, Gift, ChevronRight, Clock, AlertCircle, TrendingUp,
  Thermometer, Wind, Droplets
} from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getCafeBySlug, getMenuItems, getGallery, getTestimonials,
  getBlogPosts, getAnnouncements
} from '@/lib/api';
import type { Cafe, MenuItem, GalleryItem, Testimonial, BlogPost, Announcement } from '@/types/database';
import { getCafeSlug } from '@/lib/cafe-config';

const CAFE_SLUG = getCafeSlug();
const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_KEY ?? '';

// ─── Timeout-safe fetch ────────────────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))]);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeatherCtx {
  temp: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'cold' | 'windy';
  description: string;
  humidity: number;
}

interface PersonalizationData {
  firstName: string;
  orderCount: number;
  lastItemName: string | null;
  topCategoryName: string | null;
  topItemIds: string[];
  hasSufficientHistory: boolean;
}

interface ActiveCampaign {
  id: string;
  title: string;
  promo_message: string | null;
  discount_type: string | null;
  discount_value: number | null;
  image_url: string | null;
}

interface MoodRecommendation {
  menuItemId: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  reason: string;
}

type Vibe = 'Quiet Focus' | 'Social Energy' | 'Creative Buzz' | 'Comforted';

const VIBES: { id: Vibe; icon: React.ElementType; desc: string }[] = [
  { id: 'Quiet Focus',   icon: Moon,     desc: 'Deep work & reading' },
  { id: 'Social Energy', icon: Zap,      desc: 'Catch-ups & lively chats' },
  { id: 'Creative Buzz', icon: Sparkles, desc: 'Inspiring & moderate' },
  { id: 'Comforted',     icon: Heart,    desc: 'Cozy & warm' },
];

// Tags each vibe wants to match on the real menu
const VIBE_TAGS: Record<Vibe, string[]> = {
  'Quiet Focus':   ['single-origin', 'pour-over', 'light', 'filter', 'black', 'espresso'],
  'Social Energy': ['sharing', 'cold', 'frappe', 'latte', 'smoothie', 'social', 'sweet'],
  'Creative Buzz': ['specialty', 'seasonal', 'unique', 'discovery', 'signature'],
  'Comforted':     ['warm', 'milk', 'latte', 'cappuccino', 'hot chocolate', 'macchiato'],
};

// Weather item affinities
function weatherTagBoost(cond: WeatherCtx['condition'], tags: string[]): number {
  const t = tags.map(x => x.toLowerCase());
  if (cond === 'rainy' || cond === 'cold') {
    return t.some(x => ['warm', 'hot', 'latte', 'cappuccino', 'macchiato'].includes(x)) ? 2 : 0;
  }
  if (cond === 'sunny') {
    return t.some(x => ['cold', 'iced', 'cold brew', 'frappe', 'smoothie'].includes(x)) ? 2 : 0;
  }
  return 0;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-warning fill-warning' : 'text-border'}`} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const { session, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Core content — loads independently, never blocks hero
  const [cafe, setCafe]               = useState<Cafe | null>(null);
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [allItems, setAllItems]       = useState<MenuItem[]>([]);
  const [gallery, setGallery]         = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [posts, setPosts]             = useState<BlogPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [coreError, setCoreError]     = useState(false);

  // Ambient / mood
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('Creative Buzz');
  const [timeOfDay, setTimeOfDay]     = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [weather, setWeather]         = useState<WeatherCtx | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Mood-driven recommendations (from real menu, no DB table required)
  const [moodRecs, setMoodRecs]       = useState<MoodRecommendation[]>([]);

  // Personalization (requires auth — loads async, never blocks page)
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [personLoading, setPersonLoading] = useState(false);

  // Active campaigns (public)
  const [campaigns, setCampaigns]     = useState<ActiveCampaign[]>([]);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── 1. Time of day ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12)       setTimeOfDay('morning');
    else if (h >= 12 && h < 18) setTimeOfDay('afternoon');
    else                         setTimeOfDay('evening');
  }, []);

  // ── 2. Weather — real API with graceful fallback ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      setWeatherLoading(true);
      try {
        if (!WEATHER_API_KEY) throw new Error('no key');
        // Get rough location from browser
        const pos = await withTimeout(
          new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
          ),
          5000,
          null as unknown as GeolocationPosition
        );

        const lat = pos?.coords?.latitude  ?? 9.03;  // Addis Ababa fallback
        const lon = pos?.coords?.longitude ?? 38.74;

        const res = await withTimeout(
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`),
          6000,
          null as unknown as Response
        );

        if (!res || !res.ok) throw new Error('weather fetch failed');
        const data = await res.json();
        const main = (data.weather?.[0]?.main ?? '').toLowerCase();
        let condition: WeatherCtx['condition'] = 'sunny';
        if (main.includes('rain') || main.includes('drizzle') || main.includes('thunderstorm')) condition = 'rainy';
        else if (main.includes('cloud') || main.includes('mist') || main.includes('fog'))      condition = 'cloudy';
        else if (data.main?.temp < 12)                                                          condition = 'cold';
        else if (main.includes('wind'))                                                         condition = 'windy';

        if (!cancelled && mountedRef.current) {
          setWeather({
            temp: Math.round(data.main?.temp ?? 22),
            condition,
            description: data.weather?.[0]?.description ?? '',
            humidity: data.main?.humidity ?? 0,
          });
        }
      } catch {
        // Weather failure never breaks the page — derive from time of day only
        if (!cancelled && mountedRef.current) {
          const h = new Date().getHours();
          setWeather({ temp: h >= 12 && h < 18 ? 26 : 18, condition: 'sunny', description: '', humidity: 0 });
        }
      } finally {
        if (!cancelled && mountedRef.current) setWeatherLoading(false);
      }
    }
    loadWeather();
    return () => { cancelled = true; };
  }, []);

  // ── 3. Core content (cafe, menu, gallery…) ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadCore() {
      setCoreLoading(true);
      try {
        const c = await withTimeout(getCafeBySlug(CAFE_SLUG), 8000, null);
        if (!c) { if (!cancelled) setCoreError(true); return; }
        if (cancelled) return;
        setCafe(c);

        // Parallel fetches — each has its own timeout
        const [menuRes, galleryData, testiData, blogRes, annoData, campaignRes] = await Promise.all([
          withTimeout(getMenuItems(c.id, {}), 8000, { data: [] as MenuItem[], total: 0, page: 1, pageSize: 50, hasMore: false }),
          withTimeout(getGallery(c.id), 6000, [] as GalleryItem[]),
          withTimeout(getTestimonials(c.id), 6000, [] as Testimonial[]),
          withTimeout(getBlogPosts(c.id, { status: 'published', page: 1 }), 6000, { data: [] as BlogPost[], total: 0, page: 1, pageSize: 10, hasMore: false }),
          withTimeout(getAnnouncements(c.id), 5000, [] as Announcement[]),
          withTimeout(
            supabase.from('campaigns')
              .select('id,title,promo_message,discount_type,discount_value,image_url')
              .eq('cafe_id', c.id)
              .eq('status', 'active')
              .or('starts_at.is.null,starts_at.lte.now()')
              .or('ends_at.is.null,ends_at.gte.now()')
              .limit(3)
              .then(r => r.data ?? []) as Promise<ActiveCampaign[]>,
            5000, [] as ActiveCampaign[]
          ),
        ]);

        if (cancelled) return;
        const items = menuRes.data ?? [];
        setAllItems(items);
        setFeaturedItems(items.filter(i => i.is_featured).slice(0, 6));
        setGallery(galleryData.slice(0, 6));
        setTestimonials(testiData);
        setPosts(blogRes.data.slice(0, 3));
        setAnnouncements(annoData);
        setCampaigns(campaignRes);
      } catch (e) {
        if (!cancelled) setCoreError(true);
      } finally {
        if (!cancelled) setCoreLoading(false);
      }
    }
    loadCore();
    return () => { cancelled = true; };
  }, []);

  // ── 4. Mood recommendations from real menu (no dedicated DB table) ──────────
  useEffect(() => {
    if (allItems.length === 0) { setMoodRecs([]); return; }
    const vibeTags = VIBE_TAGS[selectedVibe];
    const weatherCond = weather?.condition ?? 'sunny';

    // Score every available item
    const scored = allItems
      .filter(i => i.is_available && i.status !== 'archived' && i.status !== 'inactive')
      .map(item => {
        const itemTags = (item.tags ?? []).map(t => t.toLowerCase());
        const nameDesc = `${item.name} ${item.description ?? ''}`.toLowerCase();
        let score = 0;
        vibeTags.forEach(vt => {
          if (itemTags.includes(vt)) score += 3;
          if (nameDesc.includes(vt)) score += 1;
        });
        score += weatherTagBoost(weatherCond, item.tags ?? []);
        return { item, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // If no tag matches, pick highest-scored featured items as fallback
    const finalItems = scored.length > 0
      ? scored
      : allItems
          .filter(i => i.is_available)
          .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
          .slice(0, 3)
          .map(item => ({ item, score: 0 }));

    const vibeReasonMap: Record<Vibe, string> = {
      'Quiet Focus':   'Perfect for focused work — a clean, undistracted experience.',
      'Social Energy': 'Great for sharing and lively conversation.',
      'Creative Buzz': 'Something to spark your creative session.',
      'Comforted':     'A warm classic to ease your day.',
    };

    setMoodRecs(finalItems.map(({ item }) => ({
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      image_url: item.image_url,
      reason: vibeReasonMap[selectedVibe],
    })));
  }, [selectedVibe, allItems, weather]);

  // ── 5. Personalization (auth-gated, async, never blocks) ───────────────────
  useEffect(() => {
    if (authLoading || !session?.user?.id) return;
    let cancelled = false;
    async function loadPersonalization() {
      setPersonLoading(true);
      try {
        const userId = session!.user.id;

        // Recent orders + order_items to build real preference profile
        const { data: orders } = await withTimeout(
          supabase
            .from('orders')
            .select('id, created_at, order_items(menu_item_id, quantity, menus(name, category_id))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20) as unknown as Promise<{ data: any[] | null; error: unknown }>,
          6000,
          { data: null as any[] | null, error: null }
        );

        if (cancelled) return;

        const orderRows = (orders as any[]) ?? [];
        const orderCount = orderRows.length;

        // Most recent item name
        let lastItemName: string | null = null;
        const firstOrder = orderRows[0];
        if (firstOrder?.order_items?.length > 0) {
          lastItemName = firstOrder.order_items[0]?.menus?.name ?? null;
        }

        // Most ordered category
        const catCounts: Record<string, number> = {};
        const itemCounts: Record<string, number> = {};
        orderRows.forEach((o: any) => {
          (o.order_items ?? []).forEach((oi: any) => {
            if (oi.menu_item_id) itemCounts[oi.menu_item_id] = (itemCounts[oi.menu_item_id] ?? 0) + (oi.quantity ?? 1);
            const catId = oi.menus?.category_id;
            if (catId) catCounts[catId] = (catCounts[catId] ?? 0) + (oi.quantity ?? 1);
          });
        });

        const topCatId = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const topItemIds = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

        // Resolve category name
        let topCategoryName: string | null = null;
        if (topCatId) {
          const { data: cat } = await supabase.from('menu_categories').select('name').eq('id', topCatId).maybeSingle();
          topCategoryName = cat?.name ?? null;
        }

        if (!cancelled && mountedRef.current) {
          setPersonalization({
            firstName: profile?.full_name?.split(' ')[0] ?? 'there',
            orderCount,
            lastItemName,
            topCategoryName,
            topItemIds,
            hasSufficientHistory: orderCount >= 3,
          });
        }
      } catch {
        // Personalization failure is silent — page works without it
      } finally {
        if (!cancelled) setPersonLoading(false);
      }
    }
    loadPersonalization();
    return () => { cancelled = true; };
  }, [session?.user?.id, authLoading, profile]);

  // ── Derived helpers ─────────────────────────────────────────────────────────
  const WeatherIcon = !weather || weather.condition === 'sunny' ? Sun
    : weather.condition === 'rainy' ? CloudRain
    : weather.condition === 'cold'  ? Thermometer
    : weather.condition === 'windy' ? Wind
    : Droplets;

  const greeting = timeOfDay === 'morning' ? 'Good morning'
    : timeOfDay === 'afternoon' ? 'Good afternoon'
    : 'Good evening';

  const heroBg = selectedVibe === 'Quiet Focus'   ? 'bg-zinc-950'
    : selectedVibe === 'Social Energy' ? 'bg-slate-900'
    : selectedVibe === 'Comforted'     ? 'bg-amber-950'
    : 'bg-background';

  const overlayClass = selectedVibe === 'Quiet Focus'   ? 'bg-black/70'
    : selectedVibe === 'Social Energy' ? 'bg-gradient-to-tr from-primary/40 to-black/60'
    : selectedVibe === 'Comforted'     ? 'bg-amber-900/50'
    : 'bg-gradient-to-t from-background via-background/75 to-transparent';

  // ── Personalized menu recs (top items from order history shown on homepage) ─
  const personalizedMenuItems = personalization?.hasSufficientHistory
    ? allItems.filter(i => personalization.topItemIds.includes(i.id) && i.is_available).slice(0, 3)
    : [];

  // ─── RENDER ────────────────────────────────────────────────────────────────
  // Core error state
  if (coreError && !cafe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3 opacity-70" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Couldn't load the menu</h2>
          <p className="text-sm text-muted-foreground mb-4">Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
        </div>
      </div>
    );
  }

  // Core loading — skeleton hero only, not full-page spinner
  const showHeroSkeleton = coreLoading && !cafe;

  return (
    <PublicLayout cafe={cafe ?? undefined as any} announcements={announcements}>

      {/* ── Active Campaign Banners ─────────────────────────────────────────── */}
      <AnimatePresence>
        {campaigns.map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-primary/10 border-b border-primary/20 px-4 py-2"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">{c.title}</span>
                {c.promo_message && <span className="text-muted-foreground hidden md:inline">— {c.promo_message}</span>}
              </div>
              <Link to="/menu">
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-primary/30 text-primary hover:bg-primary/10">
                  View Offer <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className={`relative min-h-[92vh] flex items-center overflow-hidden transition-colors duration-700 ${heroBg}`}>

        {/* Cover image */}
        {showHeroSkeleton ? (
          <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        ) : cafe?.cover_url && (
          <div className="absolute inset-0">
            <img
              src={cafe.cover_url}
              alt={cafe.name}
              className={`w-full h-full object-cover transition-all duration-700 ${selectedVibe === 'Quiet Focus' ? 'blur-sm scale-105' : ''}`}
            />
            <div className={`absolute inset-0 ${overlayClass}`} />
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy + vibe selector */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="space-y-8"
            >
              {/* Contextual status pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/20 backdrop-blur-md border border-white/10 text-white text-sm font-medium">
                {weatherLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <WeatherIcon className="w-4 h-4" />
                )}
                {weather?.condition === 'rainy'
                  ? "Perfect rainy-day coffee weather."
                  : `${greeting}. Welcome to ${cafe?.name ?? 'our café'}.`
                }
                {weather && !weatherLoading && (
                  <span className="text-white/60 ml-1 text-xs">{weather.temp}°C</span>
                )}
              </div>

              {showHeroSkeleton ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4 bg-white/10" />
                  <Skeleton className="h-16 w-1/2 bg-white/10" />
                </div>
              ) : (
                <h1 className="text-5xl md:text-7xl font-heading font-bold text-white tracking-tight leading-tight">
                  Not just coffee.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">
                    An experience.
                  </span>
                </h1>
              )}

              {/* Vibe Selector — real signal, drives DB recommendations */}
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> How do you want to feel today?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {VIBES.map(v => {
                    const Icon = v.icon;
                    const active = selectedVibe === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVibe(v.id as Vibe)}
                        className={`text-left p-3 rounded-xl border transition-all duration-300 backdrop-blur-md ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-2" />
                        <div className="font-semibold text-sm">{v.id}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">{v.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Mood-driven recommendations from real menu */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedVibe}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-5 pt-4 border-t border-white/10"
                  >
                    {moodRecs.length > 0 ? (
                      <>
                        <p className="text-xs text-white/60 uppercase tracking-wider mb-3">
                          {selectedVibe} picks — from today's menu
                        </p>
                        <div className="flex flex-col gap-2 mb-4">
                          {moodRecs.slice(0, 2).map(r => (
                            <div key={r.menuItemId} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Coffee className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-white text-sm font-medium truncate">{r.name}</span>
                              </div>
                              {r.price != null && (
                                <span className="text-white/70 text-xs shrink-0 ml-2">{r.price} {r.currency}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      !coreLoading && (
                        <p className="text-white/50 text-sm mb-4">Menu loading…</p>
                      )
                    )}
                    <div className="flex gap-3">
                      <Link to={`/menu?vibe=${encodeURIComponent(selectedVibe)}`} className="flex-1">
                        <Button className="w-full gap-2 bg-white text-black hover:bg-white/90">
                          Explore Menu <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to="/reservation">
                        <Button variant="ghost" className="gap-2 border border-white/60 text-white hover:bg-white/10">
                          Book Table
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Right: Personalization card (auth-gated, loads async) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block relative min-h-[320px]"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-80">
                {authLoading ? (
                  // Auth still initializing — skeleton, never block
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-3">
                    <Skeleton className="h-4 w-24 bg-white/10" />
                    <Skeleton className="h-6 w-48 bg-white/10" />
                    <Skeleton className="h-4 w-full bg-white/10" />
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                  </div>
                ) : session?.user ? (
                  personLoading ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-3">
                      <Skeleton className="h-4 w-24 bg-white/10" />
                      <Skeleton className="h-6 w-48 bg-white/10" />
                      <Skeleton className="h-4 w-full bg-white/10" />
                    </div>
                  ) : personalization?.hasSufficientHistory ? (
                    // Returning customer — real personalized card
                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl shadow-2xl text-white transform rotate-2 hover:rotate-0 transition-transform duration-500">
                      <div className="absolute -top-3 -right-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <Badge className="bg-primary/20 text-primary-foreground border-none mb-4 text-xs">Your Coffee OS</Badge>
                      <h3 className="text-xl font-bold mb-2">
                        {greeting}, {personalization.firstName}.
                      </h3>
                      <p className="text-white/80 text-sm leading-relaxed mb-4">
                        {personalization.orderCount} visits and counting.
                        {personalization.topCategoryName && (
                          <> You clearly love your <span className="text-primary font-semibold">{personalization.topCategoryName}</span>.</>
                        )}
                        {personalization.lastItemName && (
                          <> Last time you had <span className="font-medium">{personalization.lastItemName}</span>.</>
                        )}
                      </p>
                      {personalizedMenuItems.length > 0 && (
                        <div className="mb-4 space-y-1.5">
                          <p className="text-xs text-white/50 uppercase tracking-wider">Your usual picks</p>
                          {personalizedMenuItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                              <span className="text-sm font-medium truncate">{item.name}</span>
                              <span className="text-xs text-white/60 shrink-0 ml-2">{item.price} {item.currency}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Link to="/menu">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                          Order Now <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    // Logged in but not enough history
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-white">
                      <Badge className="bg-primary/20 text-primary-foreground border-none mb-4 text-xs">Learning your taste</Badge>
                      <h3 className="text-xl font-bold mb-2">{greeting}, {personalization?.firstName ?? profile?.full_name?.split(' ')[0]}.</h3>
                      <p className="text-white/70 text-sm leading-relaxed mb-6">
                        Coffee OS is still learning your preferences. A few more orders and we'll start making this feel like home.
                      </p>
                      <Link to="/menu">
                        <Button className="w-full bg-white text-black hover:bg-white/90">Explore Menu</Button>
                      </Link>
                    </div>
                  )
                ) : (
                  // Anonymous visitor
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-white">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" /> Invisible Concierge
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed mb-6">
                      Sign in to unlock Coffee OS. We learn your tastes, remember your favorites, and make every visit feel personal.
                    </p>
                    <Link to="/login">
                      <Button className="w-full bg-white text-black hover:bg-white/90">Unlock Experience</Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Featured / Mood Menu ────────────────────────────────────────────── */}
      <section className="section-pad bg-card/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Today's Picks</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
                {personalization?.hasSufficientHistory
                  ? `Your ${selectedVibe} Selection`
                  : 'Featured Selections'}
              </h2>
              {personalization?.hasSufficientHistory && (
                <p className="text-sm text-muted-foreground mt-1">
                  Based on your order history + today's {selectedVibe} mood
                </p>
              )}
            </div>
            <Link to="/menu" className="hidden md:flex">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
                Full Menu <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {coreLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl overflow-hidden border border-border">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Mood recs first if available, else featured items */}
              {(moodRecs.length > 0
                ? moodRecs.map(r => allItems.find(i => i.id === r.menuItemId)).filter(Boolean) as MenuItem[]
                : featuredItems
              ).slice(0, 6).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="glass rounded-xl overflow-hidden group card-hover"
                >
                  {item.image_url ? (
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full bg-secondary flex items-center justify-center">
                      <Coffee className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-heading font-semibold text-foreground">{item.name}</h3>
                      {item.price != null && (
                        <span className="text-primary font-semibold text-sm shrink-0">{item.price} {item.currency}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center md:hidden">
            <Link to="/menu">
              <Button variant="outline" className="border-border text-primary">
                View Full Menu <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Gallery ─────────────────────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Gallery</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">See the Space</h2>
            </div>
            <Link to="/gallery" className="hidden md:flex">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`overflow-hidden rounded-xl ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                <div className={`w-full overflow-hidden group ${i === 0 ? 'aspect-square md:aspect-auto md:h-full min-h-[200px]' : 'aspect-square'}`}>
                  <img
                    src={item.image_url}
                    alt={item.alt_text ?? item.caption ?? ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={i === 0 ? { minHeight: '300px' } : undefined}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="section-pad bg-card/30">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Reviews</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-3">What People Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="glass rounded-xl p-5"
                >
                  {t.rating != null && <StarRating rating={t.rating} />}
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4 line-clamp-4">"{t.content}"</p>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.author_name}</p>
                    {t.author_title && <p className="text-xs text-muted-foreground mt-0.5">{t.author_title}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Blog ────────────────────────────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Blog</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">From the Journal</h2>
            </div>
            <Link to="/blog" className="hidden md:flex">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
                All Posts <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link to={`/blog/${post.slug}`} className="group block glass rounded-xl overflow-hidden card-hover h-full">
                  {post.cover_url && (
                    <div className="aspect-[16/9] w-full overflow-hidden">
                      <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 capitalize">{tag}</Badge>
                      ))}
                    </div>
                    <h3 className="font-heading font-semibold text-foreground leading-snug group-hover:text-primary transition-colors mb-2">{post.title}</h3>
                    {post.excerpt && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>}
                    {post.published_at && (
                      <p className="text-[11px] text-muted-foreground mt-3">
                        {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── Mood Pulse — two-tier intelligence section ──────────────────────── */}
      <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
        >
          {/* Left: explanation — same for both tiers */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Live Now</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground leading-tight text-balance">
              Feel the café.<br />Anonymously.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Mood Pulse is a real-time energy layer — see what vibes are alive in the café right now,
              broadcast your mood anonymously, and resonate with others on the same wavelength.
              No names. No profiles. Just presence.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Quiet Focus', color: 'text-slate-400 border-slate-500/30 bg-slate-500/5' },
                { label: 'Social Energy', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
                { label: 'Creative Buzz', color: 'text-violet-400 border-violet-500/30 bg-violet-500/5' },
                { label: 'Comforted', color: 'text-rose-400 border-rose-500/30 bg-rose-500/5' },
                { label: 'Energized', color: 'text-orange-400 border-orange-500/30 bg-orange-500/5' },
              ].map(v => (
                <span key={v.label} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${v.color}`}>
                  {v.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: auth-gated card */}
          {session?.user ? (
            /* ── Logged-in tier: direct entry with teaser pulse ─────────── */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="glass rounded-2xl border border-border/60 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">You're in the café right now?</p>
                <Badge variant="secondary" className="text-[10px]">Mood Pulse</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set your vibe and join the anonymous energy stream.
                Your signal expires in 2 hours automatically.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'Quiet Focus', color: 'text-slate-400' },
                  { label: 'Creative Buzz', color: 'text-violet-400' },
                  { label: 'Social Energy', color: 'text-amber-400' },
                ] as const).map(v => (
                  <div
                    key={v.label}
                    className="flex flex-col items-center gap-1 py-3 rounded-lg border border-border/40 bg-secondary/30 text-center"
                  >
                    <span className={`text-[10px] font-medium leading-tight ${v.color}`}>{v.label}</span>
                  </div>
                ))}
              </div>
              <Link to="/account/mood-pulse" className="block">
                <Button className="w-full gap-2">
                  Open Mood Pulse <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          ) : (
            /* ── Logged-out tier: teaser with sign-in prompt ─────────────── */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="glass rounded-2xl border border-border/60 p-6 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Join the pulse</p>
                <p className="text-xs text-muted-foreground">Sign in to broadcast your mood and feel the café come alive.</p>
              </div>
              {/* Blurred preview rows — hint at what's inside */}
              <div className="space-y-2 select-none pointer-events-none" aria-hidden>
                {[
                  { bar: '72%', label: 'Social Energy', color: 'bg-amber-400' },
                  { bar: '48%', label: 'Creative Buzz', color: 'bg-violet-400' },
                  { bar: '28%', label: 'Quiet Focus',   color: 'bg-slate-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 blur-[1.5px]">
                    <span className="w-24 text-xs text-muted-foreground shrink-0">{row.label}</span>
                    <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: row.bar }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/login?returnTo=/account/mood-pulse" className="block">
                <Button variant="outline" className="w-full gap-2 border-border">
                  Sign in to join <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 p-10 md:p-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-3">
              Ready for your next cup?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {cafe?.tagline ?? 'Reserve your table and experience Ethiopian specialty coffee at its finest.'}
            </p>
            <Link to="/reservation">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Calendar className="w-4 h-4 mr-2" /> Reserve a Table
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

    </PublicLayout>
  );
}