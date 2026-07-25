import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Calendar, Image, Sparkles, TrendingUp, ArrowRight, Coffee, Users, BookOpen, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getReservationTrend, getReservations } from '@/lib/api';
import type { Reservation } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats { reservationsToday: number; totalReservations: number; galleryImages: number; aiGenerations: number; }

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-border',
};

const QUICK_ACTIONS = [
  { label: 'Add Menu Item', href: '/dashboard/menus', icon: Coffee, desc: 'Create a new menu item' },
  { label: 'Upload Photos', href: '/dashboard/gallery', icon: Image, desc: 'Add to gallery' },
  { label: 'Write Blog Post', href: '/dashboard/blog', icon: BookOpen, desc: 'Publish new content' },
  { label: 'AI Studio', href: '/dashboard/ai-studio', icon: Sparkles, desc: 'Generate content with AI', badge: 'New' },
];

export default function DashboardPage() {
  const { profile, cafeId } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);
  const resolvedCafeId = cafeId ?? DEMO_CAFE_ID;

  useEffect(() => {
    async function load() {
      const [s, t, r] = await Promise.all([
        getDashboardStats(resolvedCafeId),
        getReservationTrend(resolvedCafeId),
        getReservations(resolvedCafeId, { status: 'pending' }),
      ]);
      setStats(s);
      setTrend(t);
      setUpcoming(r.data.slice(0, 5));
    }
    load();
  }, [resolvedCafeId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const STAT_CARDS = [
    { label: "Today's Reservations", value: stats?.reservationsToday ?? '—', icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', href: '/dashboard/reservations' },
    { label: 'Total Reservations', value: stats?.totalReservations ?? '—', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', href: '/dashboard/reservations' },
    { label: 'Gallery Images', value: stats?.galleryImages ?? '—', icon: Image, color: 'text-info', bg: 'bg-info/10', href: '/dashboard/gallery' },
    { label: 'AI Generations', value: stats?.aiGenerations ?? '—', icon: Sparkles, color: 'text-warning', bg: 'bg-warning/10', href: '/dashboard/ai-studio' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link to={card.href} className="block glass rounded-xl p-5 card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservation Trend Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-semibold text-foreground">Reservation Trend</h2>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </div>
          {trend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="count" name="Reservations" stroke="hsl(var(--primary))" fill="url(#colorRes)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Upcoming Reservations */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-foreground">Pending Reservations</h2>
            <Link to="/dashboard/reservations" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
              No pending reservations.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.reservation_date} at {r.reservation_time} · {r.party_size} guests
                    </p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[r.status]}`}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-heading font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
            >
              <Link to={action.href} className="block glass rounded-xl p-4 card-hover group text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                  <action.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  {action.badge && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">{action.badge}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
