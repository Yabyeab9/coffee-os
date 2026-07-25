import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Calendar, Heart, Award, ArrowRight, Loader2 } from 'lucide-react';
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
          supabase.from('orders').select('*, order_items(*, menu_items(name)), cafes(name)').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
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

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Welcome back, {profile?.full_name?.split(' ')[0] || 'Guest'}</h1>
        <p className="text-muted-foreground">Manage your orders, reservations, and loyalty rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Latest Order */}
        <div className="glass rounded-xl p-6 relative overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Latest Order
            </h3>
            <Link to="/account/orders" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {latestOrder ? (
            <div className="bg-background/50 rounded-lg p-4 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Order #{latestOrder.order_number || latestOrder.id.substring(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(latestOrder.created_at).toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary capitalize">
                  {latestOrder.order_status}
                </span>
              </div>
              <div className="space-y-1 mb-4">
                {latestOrder.order_items?.slice(0, 2).map((item: any) => (
                  <p key={item.id} className="text-sm text-muted-foreground">
                    {item.quantity}x {item.menu_items?.name || 'Item'}
                  </p>
                ))}
                {latestOrder.order_items?.length > 2 && (
                  <p className="text-xs text-muted-foreground italic">+{latestOrder.order_items.length - 2} more items</p>
                )}
              </div>
              <p className="font-medium text-foreground">Total: {latestOrder.total_amount} ETB</p>
            </div>
          ) : (
            <div className="bg-background/50 rounded-lg p-6 flex flex-col items-center justify-center text-center flex-1">
              <ShoppingBag className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">You have no recent orders.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/menu">Order Now</Link>
              </Button>
            </div>
          )}
        </div>
        
        {/* Latest Reservation */}
        <div className="glass rounded-xl p-6 relative overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Upcoming Reservation
            </h3>
            <Link to="/account/reservations" className="text-sm text-accent hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {latestReservation ? (
            <div className="bg-background/50 rounded-lg p-4 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{new Date(latestReservation.reservation_date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">{latestReservation.reservation_time.substring(0, 5)}</p>
                  {latestReservation.reservation_code && (
                    <p className="text-xs font-mono text-muted-foreground mt-1">Code: {latestReservation.reservation_code}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${
                  latestReservation.status === 'confirmed' || latestReservation.status === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-secondary text-foreground'
                }`}>
                  {latestReservation.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-foreground mb-1">{latestReservation.party_size} guests</p>
              {latestReservation.notes && (
                <p className="text-xs text-muted-foreground truncate">Notes: {latestReservation.notes}</p>
              )}
            </div>
          ) : (
            <div className="bg-background/50 rounded-lg p-6 flex flex-col items-center justify-center text-center flex-1">
              <Calendar className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">You have no upcoming reservations.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/reservation">Book a Table</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Loyalty Rewards */}
        <div className="glass rounded-xl p-6 relative overflow-hidden lg:col-span-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
          <div className="relative flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Loyalty Rewards
              </h3>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-4xl font-semibold text-foreground mb-2">{stats.points} <span className="text-lg text-muted-foreground font-normal">points</span></p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium uppercase tracking-wider rounded">
                    {stats.tier} Member
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {stats.tier === 'Bronze' ? `Earn ${100 - stats.points} more points for Silver` :
                     stats.tier === 'Silver' ? `Earn ${500 - stats.points} more points for Gold` : 'Highest tier reached!'}
                  </p>
                </div>
              </div>
              <Button asChild variant="default">
                <Link to="/menu">Earn more points</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}