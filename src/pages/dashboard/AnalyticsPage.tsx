import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, useReservationTrend, useMenuItems } from '@/hooks/queries';
import { Loader2, TrendingUp, Calendar, Coffee, Sparkles, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

export default function AnalyticsPage() {
  const { cafeId } = useAuth();
  
  const { data: trend, isLoading: trendLoading } = useReservationTrend(cafeId || undefined);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(cafeId || undefined);
  const { data: menuRes, isLoading: menuLoading } = useMenuItems(cafeId || undefined);

  const menuDistrib = useMemo(() => {
    if (!menuRes?.data) return [];
    const catMap: Record<string, number> = {};
    menuRes.data.forEach(item => {
      const cat = (item as any).category?.name ?? 'Uncategorized';
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [menuRes?.data]);

  if (!cafeId) {
    return (
      <div className="p-6 max-w-7xl mx-auto h-[50vh] flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-xl font-heading font-semibold text-foreground">No Cafe Selected</h2>
        <p className="text-muted-foreground mt-2">You need to be assigned to a cafe to view analytics.</p>
      </div>
    );
  }

  const METRIC_CARDS = [
    { label: 'Total Reservations', value: stats?.totalReservations ?? 0, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Today', value: stats?.reservationsToday ?? 0, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Gallery Images', value: stats?.galleryImages ?? 0, icon: Coffee, color: 'text-info', bg: 'bg-info/10' },
    { label: 'AI Generations', value: stats?.aiGenerations ?? 0, icon: Sparkles, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in-0">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Analytics</h1>
        <p className="text-muted-foreground">Detailed insights and performance metrics for your cafe.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRIC_CARDS.map((m, i) => (
          <div key={i} className="glass p-6 rounded-xl border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${m.bg}`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{m.label}</p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <h3 className="text-2xl font-heading font-semibold text-foreground">{m.value}</h3>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Area Chart */}
        <div className="glass p-6 rounded-xl border border-border/50 flex flex-col h-[400px]">
          <h3 className="font-heading font-semibold text-foreground mb-6">Reservation Trends (30 Days)</h3>
          <div className="flex-1 min-h-0 w-full">
            {trendLoading ? (
               <Skeleton className="w-full h-full" />
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
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
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

        {/* Menu Distribution Pie Chart */}
        <div className="glass p-6 rounded-xl border border-border/50 flex flex-col h-[400px]">
          <h3 className="font-heading font-semibold text-foreground mb-6">Menu Items by Category</h3>
          <div className="flex-1 min-h-0 w-full">
            {menuLoading ? (
              <Skeleton className="w-full h-full" />
            ) : menuDistrib && menuDistrib.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={menuDistrib} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {menuDistrib.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                <Coffee className="w-8 h-8 mb-2 opacity-50" />
                <p>No menu data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
