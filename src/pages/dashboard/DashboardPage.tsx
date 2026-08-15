import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useReservationTrend, useReservationsList } from '@/hooks/queries';
import { 
  Users, Calendar, TrendingUp, Sparkles, AlertCircle, ArrowRight,
  Coffee, Image, BookOpen, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-border',
};

const QUICK_ACTIONS = [
  { label: 'Orders', href: '/dashboard/orders', icon: Coffee, desc: 'Manage incoming orders' },
  { label: 'Reservations', href: '/dashboard/reservations', icon: Calendar, desc: 'Manage table bookings' },
  { label: 'QR Scanner', href: '/dashboard/scanner', icon: CheckCircle2, desc: 'Verify reservations' },
  { label: 'AI Manager', href: '/dashboard/ai-manager', icon: Sparkles, desc: 'View business insights', badge: 'Hot' },
];

export default function DashboardPage() {
  const { profile, cafeId } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats(cafeId || undefined);
  const { data: trend, isLoading: trendLoading } = useReservationTrend(cafeId || undefined);
  const { data: upcomingRes, isLoading: upcomingLoading } = useReservationsList(cafeId || undefined, { status: 'pending' });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const upcoming = upcomingRes?.data?.slice(0, 5) || [];

  if (!cafeId) {
    return (
      <div className="p-6 max-w-7xl mx-auto h-[50vh] flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-heading font-semibold text-foreground">No Cafe Selected</h2>
        <p className="text-muted-foreground mt-2">You need to be assigned to a cafe to view dashboard statistics.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening at your cafe today.</p>
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
          <Link to="/dashboard/menus">
            <Coffee className="w-4 h-4 mr-2" />
            Manage Menu
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Reservations Today', value: stats?.reservationsToday ?? 0, icon: Calendar, color: 'text-primary' },
          { label: 'Total Reservations', value: stats?.totalReservations ?? 0, icon: Users, color: 'text-accent' },
          { label: 'Gallery Images', value: stats?.galleryImages ?? 0, icon: Image, color: 'text-info' },
          { label: 'AI Operations', value: stats?.aiGenerations ?? 0, icon: Sparkles, color: 'text-warning' },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{s.label}</p>
                {statsLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <h3 className={`text-4xl font-heading font-semibold ${s.color}`}>{s.value}</h3>
                )}
              </div>
              <s.icon className={`w-6 h-6 ${s.color} opacity-80`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Reservation Trend */}
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-border/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-heading font-semibold text-foreground">30-Day Reservations</h2>
            <Link to="/dashboard/reservations" className="text-sm text-primary hover:underline flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="h-[300px] w-full min-w-0">
            {trendLoading ? (
              <div className="h-full w-full flex items-center justify-center"><Skeleton className="h-[250px] w-full" /></div>
            ) : trend && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <p>Not enough data for trend</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="glass rounded-xl p-6 border border-border/50">
            <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              {QUICK_ACTIONS.map((action, i) => (
                <Link key={i} to={action.href} className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border group">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      {action.label}
                      {action.badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">{action.badge}</span>}
                    </h4>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending Reservations */}
          <div className="glass rounded-xl p-6 border border-border/50 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                Pending Actions
                {upcoming.length > 0 && <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs">{upcoming.length}</span>}
              </h2>
            </div>
            
            <div className="space-y-4">
              {upcomingLoading ? (
                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : upcoming.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending reservations</p>
                </div>
              ) : (
                upcoming.map(res => (
                  <div key={res.id} className="flex flex-col p-3 border border-border/50 rounded-lg bg-card/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">{res.guest_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {new Date(res.reservation_date).toLocaleDateString()} at {res.reservation_time.slice(0,5)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase border ${STATUS_COLORS[res.status]}`}>
                        {res.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">Party of {res.party_size}</div>
                  </div>
                ))
              )}
              {upcoming.length > 0 && (
                <Button variant="outline" className="w-full text-xs h-8 border-border" asChild>
                  <Link to="/dashboard/reservations">View All Pending</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
