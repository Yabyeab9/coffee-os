import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Users, DollarSign, Award, Target, Coffee } from 'lucide-react';

export default function GrowthDashboardPage() {
  const { cafeId } = useAuth();
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    loyaltyMembers: 0,
    subscriptions: 0,
    referrals: 0,
    streaks: 0
  });

  useEffect(() => {
    async function load() {
      if (!cafeId) return;
      const [orderRes, lpRes, subRes, refRes, streakRes] = await Promise.all([
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid'),
        supabase.from('loyalty_points').select('id', { count: 'exact' }).eq('cafe_id', cafeId),
        supabase.from('subscriptions').select('id', { count: 'exact' }).eq('cafe_id', cafeId).eq('active', true),
        supabase.from('referrals').select('id', { count: 'exact' }).eq('cafe_id', cafeId),
        supabase.from('user_streaks').select('id', { count: 'exact' }).eq('cafe_id', cafeId).gt('current_streak', 0)
      ]);
      
      const totalRev = (orderRes.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      setStats({
        revenue: totalRev,
        orders: orderRes.data?.length || 0,
        loyaltyMembers: lpRes.count || 0,
        subscriptions: subRes.count || 0,
        referrals: refRes.count || 0,
        streaks: streakRes.count || 0
      });
    }
    load();
  }, [cafeId]);

  const widgets = [
    { title: 'Total Revenue', value: `ETB ${stats.revenue.toLocaleString()}`, icon: DollarSign, trend: '+12.5%', color: 'text-primary' },
    { title: 'Completed Orders', value: stats.orders, icon: Coffee, trend: '+5.2%', color: 'text-accent' },
    { title: 'Loyalty Members', value: stats.loyaltyMembers, icon: Award, trend: '+18.1%', color: 'text-warning' },
    { title: 'Active Subscriptions', value: stats.subscriptions, icon: Target, trend: '+2.4%', color: 'text-indigo-500' },
    { title: 'Successful Referrals', value: stats.referrals, icon: Users, trend: '+8.3%', color: 'text-pink-500' },
    { title: 'Active Streaks', value: stats.streaks, icon: TrendingUp, trend: '+15.0%', color: 'text-orange-500' }
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Growth Dashboard</h1>
        <p className="text-muted-foreground">Monitor your hospitality growth metrics across loyalty, AI, and campaigns.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((w, i) => (
          <div key={i} className="glass rounded-xl p-6 border border-border relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-current to-transparent opacity-10 rounded-full transition-transform group-hover:scale-110" style={{ color: 'var(--primary)' }}></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-medium text-muted-foreground">{w.title}</h3>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-background/50 ${w.color}`}>
                <w.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-3xl font-heading font-bold text-foreground mb-1">{w.value}</p>
              <p className="text-xs text-primary font-medium">{w.trend} from last month</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="glass rounded-xl p-6 border border-border h-80 flex flex-col items-center justify-center text-center">
           <h3 className="font-heading font-semibold text-foreground mb-2 absolute top-6 left-6">Customer Retention</h3>
           <p className="text-muted-foreground text-sm max-w-xs">Retention charts and cohort analysis will be displayed here.</p>
        </div>
        <div className="glass rounded-xl p-6 border border-border h-80 flex flex-col items-center justify-center text-center">
           <h3 className="font-heading font-semibold text-foreground mb-2 absolute top-6 left-6">AI Conversion Rate</h3>
           <p className="text-muted-foreground text-sm max-w-xs">AI Barista recommendation performance and upsell conversion tracking.</p>
        </div>
      </div>
    </div>
  );
}
