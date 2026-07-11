import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Calendar, Heart, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function AccountDashboardPage() {
  const { profile, cafeId } = useAuth();
  const [stats, setStats] = useState({ orders: 0, reservations: 0, points: 0, tier: 'bronze' });

  useEffect(() => {
    if (!profile?.id || !cafeId) return;
    const fetchStats = async () => {
      const [ordersRes, resRes, pointsRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('cafe_id', cafeId),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('cafe_id', cafeId),
        supabase.from('loyalty_points').select('*').eq('user_id', profile.id).eq('cafe_id', cafeId).maybeSingle()
      ]);
      setStats({
        orders: ordersRes.count || 0,
        reservations: resRes.count || 0,
        points: pointsRes.data?.points || 0,
        tier: pointsRes.data?.tier || 'bronze'
      });
    };
    fetchStats();
  }, [profile?.id, cafeId]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Manage your orders, reservations, and loyalty rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">Total Orders</h3>
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{stats.orders}</p>
        </div>
        
        <div className="glass rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-foreground">Reservations</h3>
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <p className="text-3xl font-semibold text-foreground">{stats.reservations}</p>
        </div>

        <div className="glass rounded-xl p-6 relative overflow-hidden lg:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
          <div className="relative flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Loyalty Rewards</h3>
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-semibold text-foreground mb-1">{stats.points} <span className="text-sm text-muted-foreground font-normal">points</span></p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium uppercase tracking-wider text-primary">{stats.tier} Member</span>
                <Link to="/menu" className="text-xs text-primary hover:underline flex items-center gap-1">Earn more <ArrowRight className="w-3 h-3" /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button asChild className="h-24 flex flex-col items-center justify-center gap-2 bg-card hover:bg-secondary border border-border text-foreground">
              <Link to="/menu">
                <ShoppingBag className="w-6 h-6 text-primary" />
                <span>New Order</span>
              </Link>
            </Button>
            <Button asChild className="h-24 flex flex-col items-center justify-center gap-2 bg-card hover:bg-secondary border border-border text-foreground">
              <Link to="/reservation">
                <Calendar className="w-6 h-6 text-accent" />
                <span>Book Table</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}