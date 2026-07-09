import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { getReservationTrend, getMenuItems, getDashboardStats } from '@/lib/api';
import { Loader2, TrendingUp, Calendar, Coffee, Sparkles } from 'lucide-react';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

export default function AnalyticsPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
  const [stats, setStats] = useState<{ reservationsToday: number; totalReservations: number; galleryImages: number; aiGenerations: number } | null>(null);
  const [menuDistrib, setMenuDistrib] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [t, s, menuRes] = await Promise.all([
        getReservationTrend(resolvedId),
        getDashboardStats(resolvedId),
        getMenuItems(resolvedId),
      ]);
      setTrend(t);
      setStats(s);
      // Group by category for pie
      const catMap: Record<string, number> = {};
      menuRes.data.forEach(item => {
        const cat = (item as any).category?.name ?? 'Uncategorized';
        catMap[cat] = (catMap[cat] ?? 0) + 1;
      });
      setMenuDistrib(Object.entries(catMap).map(([name, value]) => ({ name, value })));
      setIsLoading(false);
    }
    load();
  }, [resolvedId]);

  if (isLoading) return <div className="p-6 flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  const METRIC_CARDS = [
    { label: 'Total Reservations', value: stats?.totalReservations ?? 0, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Today', value: stats?.reservationsToday ?? 0, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Gallery Images', value: stats?.galleryImages ?? 0, icon: Coffee, color: 'text-info', bg: 'bg-info/10' },
    { label: 'AI Generations', value: stats?.aiGenerations ?? 0, icon: Sparkles, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-xl font-heading font-semibold text-foreground">Analytics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {METRIC_CARDS.map(card => (
          <div key={card.label} className="glass rounded-xl p-5">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reservation Trend */}
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <h2 className="font-heading font-semibold text-foreground mb-5">Reservations (30 Days)</h2>
          {trend.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No reservation data yet.</div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'hsl(var(--muted-foreground))' }} itemStyle={{ color: 'hsl(var(--primary))' }} />
                  <Area type="monotone" dataKey="count" name="Reservations" stroke="hsl(var(--primary))" fill="url(#areaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Menu Distribution Pie */}
        <div className="glass rounded-xl p-5">
          <h2 className="font-heading font-semibold text-foreground mb-5">Menu by Category</h2>
          {menuDistrib.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No menu data.</div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={menuDistrib} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {menuDistrib.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
