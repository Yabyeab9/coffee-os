import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Brain, RefreshCw, Loader2, AlertTriangle, Users,
  Target, Zap, TrendingUp, ArrowRight, PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────
type LifecycleState = 'new' | 'active' | 'high_value' | 'at_risk' | 'churned';

interface LifecycleRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  lifecycle_state: LifecycleState;
  clv_estimate: number;
  avg_order_value: number;
  order_frequency_days: number;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  retention_action: {
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  } | null;
}

const STATE_CONFIG: Record<LifecycleState, { label: string; color: string; pieColor: string; description: string }> = {
  new: {
    label: 'New',
    color: 'bg-info/15 text-info border-info/30',
    pieColor: 'hsl(210 40% 50%)',
    description: 'First order within 30 days',
  },
  active: {
    label: 'Active',
    color: 'bg-success/15 text-success border-success/30',
    pieColor: 'hsl(150 40% 40%)',
    description: 'Ordered within last 30 days',
  },
  high_value: {
    label: 'High Value',
    color: 'bg-primary/15 text-primary border-primary/30',
    pieColor: 'hsl(28 45% 45%)',
    description: 'Top 10% by lifetime value',
  },
  at_risk: {
    label: 'At Risk',
    color: 'bg-warning/15 text-warning border-warning/30',
    pieColor: 'hsl(38 60% 50%)',
    description: '30–60 days since last order',
  },
  churned: {
    label: 'Churned',
    color: 'bg-destructive/15 text-destructive border-destructive/30',
    pieColor: 'hsl(0 60% 45%)',
    description: 'No order in 60+ days',
  },
};

const RETENTION_ACTIONS: Record<LifecycleState, { type: string; description: string; priority: 'low' | 'medium' | 'high' }> = {
  new: { type: 'welcome', description: 'Send welcome offer: 10% off second order', priority: 'medium' },
  active: { type: 'loyalty_boost', description: 'Invite to loyalty program upgrade', priority: 'low' },
  high_value: { type: 'vip', description: 'Invite to VIP tier with exclusive benefits', priority: 'low' },
  at_risk: { type: 'recovery', description: 'Send personalised re-engagement offer', priority: 'high' },
  churned: { type: 'win_back', description: 'Launch win-back campaign: 25% off + free item', priority: 'high' },
};

function classifyLifecycle(
  daysSinceOrder: number,
  totalSpent: number,
  orderCount: number,
  highValueThreshold: number,
  firstOrderDaysAgo: number,
): LifecycleState {
  if (daysSinceOrder > 60) return 'churned';
  if (totalSpent >= highValueThreshold) return 'high_value';
  if (daysSinceOrder > 30) return 'at_risk';
  if (firstOrderDaysAgo <= 30 && orderCount <= 2) return 'new';
  return 'active';
}

function estimateCLV(avgOrderValue: number, frequencyDays: number, retentionDays = 365): number {
  if (frequencyDays <= 0) return 0;
  const ordersPerYear = retentionDays / frequencyDays;
  return Math.round(avgOrderValue * ordersPerYear * 0.8); // 20% discount for uncertainty
}

// ── Customer Row ───────────────────────────────────────────────────────────────
function CustomerRow({ r }: { r: LifecycleRecord }) {
  const cfg = STATE_CONFIG[r.lifecycle_state];
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{r.customer_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{r.customer_email}</p>
      </div>
      <div className="hidden md:flex items-center gap-6 text-right shrink-0">
        <div>
          <div className="text-xs font-semibold">{r.total_orders}</div>
          <div className="text-xs text-muted-foreground">orders</div>
        </div>
        <div>
          <div className="text-xs font-semibold">{r.total_spent.toLocaleString()} ETB</div>
          <div className="text-xs text-muted-foreground">lifetime</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-primary">{r.clv_estimate.toLocaleString()} ETB</div>
          <div className="text-xs text-muted-foreground">CLV est.</div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CustomerIntelligencePage() {
  const { cafeId } = useAuth();
  const [records, setRecords] = useState<LifecycleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [filterState, setFilterState] = useState<string>('all');

  const fetchRecords = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('customer_lifecycle_states')
        .select('*')
        .eq('cafe_id', cafeId)
        .order('clv_estimate', { ascending: false })
        .limit(200);
      if (err) throw err;

      const ids = (data ?? []).map(r => r.customer_id);
      let nameMap: Record<string, { name: string; email: string }> = {};
      if (ids.length > 0) {
        const { data: users } = await supabase
          .from('users').select('id, full_name, email').in('id', ids);
        (users ?? []).forEach(u => {
          nameMap[u.id] = { name: u.full_name ?? 'Unknown', email: u.email };
        });
      }

      setRecords((data ?? []).map(r => ({
        ...r,
        customer_name: nameMap[r.customer_id]?.name ?? 'Unknown',
        customer_email: nameMap[r.customer_id]?.email ?? '',
        retention_action: r.retention_action ?? RETENTION_ACTIONS[r.lifecycle_state as LifecycleState],
      })));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  const computeLifecycles = async () => {
    if (!cafeId) return;
    setComputing(true);
    try {
      // Fetch all paid orders in the last 180 days
      const since = new Date(); since.setDate(since.getDate() - 180);
      const { data: orders } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .eq('cafe_id', cafeId)
        .eq('payment_status', 'paid')
        .gte('created_at', since.toISOString());

      const userMap: Record<string, {
        total: number; count: number;
        firstDate: Date; lastDate: Date; dates: Date[];
      }> = {};

      (orders ?? []).forEach(o => {
        if (!o.user_id) return;
        const d = new Date(o.created_at);
        if (!userMap[o.user_id]) {
          userMap[o.user_id] = { total: 0, count: 0, firstDate: d, lastDate: d, dates: [] };
        }
        userMap[o.user_id].total += Number(o.total_amount) || 0;
        userMap[o.user_id].count += 1;
        userMap[o.user_id].dates.push(d);
        if (d > userMap[o.user_id].lastDate) userMap[o.user_id].lastDate = d;
        if (d < userMap[o.user_id].firstDate) userMap[o.user_id].firstDate = d;
      });

      // High-value threshold = top 10% by spend
      const allSpend = Object.values(userMap).map(u => u.total).sort((a, b) => b - a);
      const hvThreshold = allSpend[Math.floor(allSpend.length * 0.1)] ?? Infinity;

      const upserts = Object.entries(userMap).map(([userId, u]) => {
        const daysSince = Math.floor((Date.now() - u.lastDate.getTime()) / 86_400_000);
        const firstDaysAgo = Math.floor((Date.now() - u.firstDate.getTime()) / 86_400_000);
        const avgOrderValue = u.total / u.count;

        // Average inter-visit gap
        const sortedDates = [...u.dates].sort((a, b) => a.getTime() - b.getTime());
        let avgGapDays = 30;
        if (sortedDates.length > 1) {
          const gaps = sortedDates.slice(1).map((d, i) =>
            (d.getTime() - sortedDates[i].getTime()) / 86_400_000
          );
          avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        }

        const state = classifyLifecycle(daysSince, u.total, u.count, hvThreshold, firstDaysAgo);
        const clv = estimateCLV(avgOrderValue, avgGapDays);

        return {
          cafe_id: cafeId,
          customer_id: userId,
          lifecycle_state: state,
          clv_estimate: clv,
          avg_order_value: Math.round(avgOrderValue),
          order_frequency_days: Math.round(avgGapDays),
          total_orders: u.count,
          total_spent: Math.round(u.total),
          last_order_date: u.lastDate.toISOString().split('T')[0],
          retention_action: RETENTION_ACTIONS[state],
          calculated_at: new Date().toISOString(),
        };
      });

      if (upserts.length > 0) {
        await supabase.from('customer_lifecycle_states').upsert(upserts, {
          onConflict: 'cafe_id,customer_id',
        });
      }

      await fetchRecords();
    } catch (err: any) {
      setError(err?.message ?? 'Computation failed');
    } finally {
      setComputing(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Aggregates
  const stateCounts = Object.keys(STATE_CONFIG).reduce((acc, s) => {
    acc[s] = records.filter(r => r.lifecycle_state === s).length;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(STATE_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: stateCounts[key] ?? 0,
    color: cfg.pieColor,
  })).filter(d => d.value > 0);

  const totalCLV = records.reduce((a, r) => a + r.clv_estimate, 0);
  const avgCLV = records.length > 0 ? Math.round(totalCLV / records.length) : 0;

  const filtered = filterState === 'all'
    ? records
    : records.filter(r => r.lifecycle_state === filterState);

  if (!cafeId) return <div className="p-8 text-muted-foreground">No café assigned.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Customer Lifetime Value & Retention</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lifecycle classification, CLV estimates, and retention recommendations from real order data.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={computeLifecycles} disabled={computing}>
            {computing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1.5" />}
            Compute Lifecycles
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" onClick={fetchRecords} className="ml-auto text-destructive">Retry</Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs">Customers</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">Retention Actions</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : [
                { label: 'Total Customers', value: records.length, icon: Users },
                { label: 'Avg CLV (12mo est.)', value: avgCLV.toLocaleString() + ' ETB', icon: TrendingUp },
                { label: 'At Risk', value: stateCounts['at_risk'] ?? 0, icon: AlertTriangle },
                { label: 'Churned', value: stateCounts['churned'] ?? 0, icon: Target },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card border border-border rounded-xl p-4 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <kpi.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <div className="text-xl font-semibold text-foreground">{kpi.value}</div>
                </motion.div>
              ))}
          </div>

          {/* Chart + state breakdown */}
          {!loading && records.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Lifecycle Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RePieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(value, name) => [`${value} customers`, name]} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">State Summary</h3>
                {Object.entries(STATE_CONFIG).map(([key, cfg]) => {
                  const count = stateCounts[key] ?? 0;
                  const pct = records.length > 0 ? (count / records.length) * 100 : 0;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{cfg.description}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cfg.pieColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <PieChart className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No lifecycle data yet. Click "Compute Lifecycles" to analyse your customers.</p>
            </div>
          )}
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers" className="mt-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['all', ...Object.keys(STATE_CONFIG)].map(s => (
              <button
                key={s}
                onClick={() => setFilterState(s)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  filterState === s
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {s === 'all' ? 'All' : STATE_CONFIG[s as LifecycleState].label}
                {s !== 'all' && ` (${stateCounts[s] ?? 0})`}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4"><Skeleton className="h-8 w-full" /></div>
                ))
              : filtered.length === 0
                ? <div className="py-12 text-center text-sm text-muted-foreground">No customers in this state.</div>
                : filtered.map(r => <CustomerRow key={r.id} r={r} />)
            }
          </div>
        </TabsContent>

        {/* Retention Actions */}
        <TabsContent value="actions" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(RETENTION_ACTIONS).map(([state, action]) => {
              const cfg = STATE_CONFIG[state as LifecycleState];
              const count = stateCounts[state] ?? 0;
              return (
                <div key={state} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{count} customers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm text-foreground">{action.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      action.priority === 'high'
                        ? 'bg-destructive/10 text-destructive'
                        : action.priority === 'medium'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {action.priority} priority
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            CLV estimates use average order value × estimated annual visit frequency × 0.8 uncertainty discount.
            Lifecycle classification uses real order history — not assumptions.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
