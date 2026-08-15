import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Calendar, Heart, Award, ArrowRight, Loader2, Sparkles, Map, Compass, MapPin, Coffee, Trophy, User, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function AccountDashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ points: 0, tier: 'bronze' });
  const [latestOrder, setLatestOrder] = useState<any>(null);
  const [latestReservation, setLatestReservation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      try {
        const [ordersRes, resRes, pointsRes] = await Promise.all([
          supabase.from('orders').select('*, order_items(*, menus(name)), cafes(name)').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('reservations').select('*, cafes(name)').eq('user_id', profile.id).order('reservation_date', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('loyalty_points').select('*').eq('user_id', profile.id).maybeSingle()
        ]);
        
        setLatestOrder(ordersRes.data);
        setLatestReservation(resRes.data);
        setStats({
          points: pointsRes.data?.points || 0,
          tier: pointsRes.data?.tier || 'Bronze'
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profile?.id]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const wowFeatures = [
    { title: 'AI Personal Barista', icon: <Sparkles className="w-5 h-5 text-primary" />, desc: 'Chat with your smart coffee companion.', path: '/account/ai-recommendations', color: 'from-primary/10 to-transparent' },
    { title: 'Coffee Journey', icon: <Map className="w-5 h-5 text-accent" />, desc: 'Relive your coffee timeline and milestones.', path: '/account/coffee-journey', color: 'from-accent/10 to-transparent' },
    { title: 'Coffee Passport', icon: <MapPin className="w-5 h-5 text-green-500" />, desc: 'Collect stamps and explore origins.', path: '/account/coffee-passport', color: 'from-green-500/10 to-transparent' },
    { title: 'Seasonal Discoveries', icon: <Coffee className="w-5 h-5 text-yellow-500" />, desc: 'Curated drinks for the current season.', path: '/account/seasonal-discoveries', color: 'from-yellow-500/10 to-transparent' },
    { title: 'Coffee Personality', icon: <User className="w-5 h-5 text-purple-500" />, desc: 'Discover your unique taste profile.', path: '/account/coffee-personality', color: 'from-purple-500/10 to-transparent' },
    { title: 'Try Something New', icon: <Compass className="w-5 h-5 text-orange-500" />, desc: 'Expand your horizons safely.', path: '/account/try-something-new', color: 'from-orange-500/10 to-transparent' },
    { title: 'Coffee Challenges', icon: <Trophy className="w-5 h-5 text-blue-500" />, desc: 'Complete goals for exclusive rewards.', path: '/account/coffee-challenges', color: 'from-blue-500/10 to-transparent' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Welcome back, {profile?.full_name?.split(' ')[0] || 'Guest'}</h1>
        <p className="text-muted-foreground">Your premium coffee companion awaits. Manage orders, discover new flavors, and track your journey.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Quick Status */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Order */}
            <div className="glass rounded-xl p-6 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Latest Order
                </h3>
                <Link to="/account/orders" className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {latestOrder ? (
                <div className="bg-background/50 rounded-lg p-4 flex-1 border border-border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">Order #{latestOrder.order_number || latestOrder.id.substring(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(latestOrder.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                      {latestOrder.order_status}
                    </span>
                  </div>
                  <div className="space-y-1 mb-4">
                    {latestOrder.order_items?.slice(0, 2).map((item: any) => (
                      <p key={item.id} className="text-sm text-muted-foreground">
                        {item.quantity}x {item.menus?.name || 'Item'}
                      </p>
                    ))}
                    {latestOrder.order_items?.length > 2 && (
                      <p className="text-xs text-muted-foreground italic">+{latestOrder.order_items.length - 2} more items</p>
                    )}
                  </div>
                  <p className="font-bold text-foreground">{latestOrder.total_amount} ETB</p>
                </div>
              ) : (
                <div className="bg-background/50 rounded-lg p-6 flex flex-col items-center justify-center text-center flex-1 border border-dashed border-border">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground mb-4">You have no recent orders.</p>
                  <Button asChild variant="default" size="sm">
                    <Link to="/menu">Order Now</Link>
                  </Button>
                </div>
              )}
            </div>
            
            {/* Latest Reservation */}
            <div className="glass rounded-xl p-6 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Upcoming Reservation
                </h3>
                <Link to="/account/reservations" className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {latestReservation ? (
                <div className="bg-background/50 rounded-lg p-4 flex-1 border border-border">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{new Date(latestReservation.reservation_date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">{latestReservation.reservation_time.substring(0, 5)}</p>
                      {latestReservation.reservation_code && (
                        <p className="text-[10px] font-mono font-bold text-muted-foreground mt-1">CODE: {latestReservation.reservation_code}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      latestReservation.status === 'confirmed' || latestReservation.status === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-secondary text-foreground'
                    }`}>
                      {latestReservation.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{latestReservation.party_size} Guests</p>
                  {latestReservation.notes && (
                    <p className="text-xs text-muted-foreground truncate">Notes: {latestReservation.notes}</p>
                  )}
                </div>
              ) : (
                <div className="bg-background/50 rounded-lg p-6 flex flex-col items-center justify-center text-center flex-1 border border-dashed border-border">
                  <Calendar className="w-8 h-8 text-muted-foreground mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground mb-4">You have no upcoming reservations.</p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/reservations">Book a Table</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Loyalty Rewards Hero */}
          <div className="glass rounded-3xl p-8 relative overflow-hidden bg-gradient-to-r from-primary/10 via-background to-secondary/10 border border-primary/20 shadow-md">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-6 h-6 text-primary" />
                  <h3 className="font-bold text-foreground text-xl">Loyalty Status</h3>
                </div>
                <div className="flex items-end gap-3 mt-4">
                  <p className="text-5xl font-black text-primary">{stats.points}</p>
                  <span className="text-lg font-bold text-muted-foreground uppercase tracking-widest mb-1">PTS</span>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded shadow-sm">
                    {stats.tier} TIER
                  </span>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stats.tier === 'Bronze' ? `Earn ${100 - stats.points} more points for Silver` :
                     stats.tier === 'Silver' ? `Earn ${500 - stats.points} more points for Gold` : 'Highest tier reached!'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                <Button asChild className="w-full shadow-md">
                  <Link to="/account/loyalty">View Rewards</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/account/membership-card">Membership Card</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: WOW Features Grid */}
        <div className="lg:col-span-4">
          <div className="glass rounded-3xl p-6 border border-border h-full flex flex-col">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Explore
            </h3>
            
            <div className="space-y-4 flex-1">
              {wowFeatures.map((feat, idx) => (
                <Link key={idx} to={feat.path} className="block group">
                  <div className={`p-4 rounded-2xl border border-border/50 bg-gradient-to-br ${feat.color} hover:shadow-md transition-all hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {feat.icon}
                        <h4 className="font-bold text-sm text-foreground">{feat.title}</h4>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground pl-7">{feat.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}