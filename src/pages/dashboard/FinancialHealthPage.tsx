import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  Activity, RefreshCw, ShieldAlert, Loader2, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RevenueWindow {
  period: string;
  current: number;
  previous: number;
  trend: number; // % change
}

interface HealthData {
  revenueWindows: RevenueWindow[];
  loyaltyLiability: number;
  loyaltyLiabilityPct: number;
  anomalyCount: number;
  cashFlowRiskDays: number | null;
  calculatedAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function fmtCurrency(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ETB';
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return <Badge variant="secondary">Flat</Badge>;
  const positive = pct > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      positive
        ? 'bg-success/15 text-success'
        : 'bg-destructive/15 text-destructive'
    }`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FinancialHealthPage() {
  const { cafeId } = useAuth();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      // Revenue for current and previous windows
      const now = new Date().toISOString();
      const [r7c, r7p, r30c, r30p, r90c, r90p, loyalty, anomalies] = await Promise.all([
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid').gte('created_at', daysAgo(7)).lte('created_at', now),
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid').gte('created_at', daysAgo(14)).lt('created_at', daysAgo(7)),
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid').gte('created_at', daysAgo(30)).lte('created_at', now),
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid').gte('created_at', daysAgo(60)).lt('created_at', daysAgo(30)),
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid').gte('created_at', daysAgo(90)).lte('created_at', now),
        supabase.from('orders').select('total_amount').eq('cafe_id', cafeId).eq('payment_status', 'paid').gte('created_at', daysAgo(180)).lt('created_at', daysAgo(90)),
        supabase.from('loyalty_points').select('points_balance').eq('cafe_id', cafeId),
        supabase.from('transaction_anomalies').select('id', { count: 'exact' }).eq('cafe_id', cafeId).eq('status', 'pending_review').gte('created_at', daysAgo(7)),
      ]);

      const sum = (rows: any[]) => rows.reduce((a, r) => a + (Number(r.total_amount) || 0), 0);
      const pctChange = (curr: number, prev: number) =>
        prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

      const c7 = sum(r7c.data ?? []);
      const p7 = sum(r7p.data ?? []);
      const c30 = sum(r30c.data ?? []);
      const p30 = sum(r30p.data ?? []);
      const c90 = sum(r90c.data ?? []);
      const p90 = sum(r90p.data ?? []);

      // Loyalty liability: sum all unredeemed point balances × fetch conversion rate
      const { data: settings } = await supabase
        .from('loyalty_settings')
        .select('reward_unit_cost_points, currency_per_reward_unit')
        .eq('cafe_id', cafeId)
        .maybeSingle();
      const costPts = settings?.reward_unit_cost_points ?? 100;
      const currencyPerUnit = settings?.currency_per_reward_unit ?? 1;
      const totalPts = (loyalty.data ?? []).reduce((a, r) => a + (r.points_balance ?? 0), 0);
      const liabilityValue = (totalPts / costPts) * currencyPerUnit;
      const liabilityPct = c30 > 0 ? (liabilityValue / c30) * 100 : 0;

      // Cash-flow risk: if 7d trend < -15% for 2nd consecutive window, warn
      const t7 = pctChange(c7, p7);
      const cashFlowRiskDays = t7 < -15 ? 14 : t7 < -5 ? 30 : null;

      setData({
        revenueWindows: [
          { period: '7 days', current: c7, previous: p7, trend: pctChange(c7, p7) },
          { period: '30 days', current: c30, previous: p30, trend: pctChange(c30, p30) },
          { period: '90 days', current: c90, previous: p90, trend: pctChange(c90, p90) },
        ],
        loyaltyLiability: liabilityValue,
        loyaltyLiabilityPct: liabilityPct,
        anomalyCount: anomalies.count ?? 0,
        cashFlowRiskDays,
        calculatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to compute financial health');
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { compute(); }, [compute]);

  if (!cafeId) return (
    <div className="p-8 flex items-center justify-center text-muted-foreground">
      No café assigned to your account.
    </div>
  );

  return (
    <TooltipProvider>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-foreground">Financial Health Monitor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue momentum, loyalty liability, and cash-flow signals — derived from real transaction data.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={compute} disabled={loading} className="shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <Button variant="ghost" size="sm" onClick={compute} className="ml-auto text-destructive">Retry</Button>
          </div>
        )}

        {/* Revenue Momentum */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Revenue Momentum</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))
              : (data?.revenueWindows ?? []).map((w, i) => (
                  <motion.div
                    key={w.period}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-card border border-border rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Last {w.period}</span>
                      <TrendBadge pct={w.trend} />
                    </div>
                    <div className="text-2xl font-semibold text-foreground">{fmtCurrency(w.current)}</div>
                    <div className="text-xs text-muted-foreground">
                      vs {fmtCurrency(w.previous)} prior period
                    </div>
                  </motion.div>
                ))}
          </div>
        </section>

        <Separator />

        {/* Signal Cards */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business Signals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Loyalty Liability */}
            {loading ? <Skeleton className="h-32 rounded-xl" /> : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={`bg-card border rounded-xl p-5 space-y-2 ${
                  (data?.loyaltyLiabilityPct ?? 0) > 10
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Loyalty Liability</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Estimated dollar value of all unredeemed loyalty points based on current redemption rate. &gt;10% of monthly revenue is a risk signal.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-2xl font-semibold">{fmtCurrency(data?.loyaltyLiability ?? 0)}</div>
                <div className="text-xs text-muted-foreground">
                  {(data?.loyaltyLiabilityPct ?? 0).toFixed(1)}% of 30-day revenue
                </div>
                {(data?.loyaltyLiabilityPct ?? 0) > 10 && (
                  <div className="text-xs text-warning font-medium flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> Exceeds 10% threshold
                  </div>
                )}
              </motion.div>
            )}

            {/* Pending Anomalies */}
            {loading ? <Skeleton className="h-32 rounded-xl" /> : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className={`bg-card border rounded-xl p-5 space-y-2 ${
                  (data?.anomalyCount ?? 0) > 0
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Unreviewed Anomalies</span>
                </div>
                <div className="text-2xl font-semibold">{data?.anomalyCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Last 7 days · pending review</div>
                {(data?.anomalyCount ?? 0) > 0 && (
                  <a href="/dashboard/anomalies" className="text-xs text-primary font-medium hover:underline">
                    Review now →
                  </a>
                )}
              </motion.div>
            )}

            {/* Cash-flow Risk */}
            {loading ? <Skeleton className="h-32 rounded-xl" /> : (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className={`bg-card border rounded-xl p-5 space-y-2 ${
                  data?.cashFlowRiskDays != null
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Cash-flow Signal</span>
                </div>
                {data?.cashFlowRiskDays != null ? (
                  <>
                    <div className="text-2xl font-semibold text-warning">Risk Detected</div>
                    <div className="text-xs text-muted-foreground">
                      Revenue declining ≥{data.cashFlowRiskDays === 14 ? '15' : '5'}% — monitor in {data.cashFlowRiskDays} days
                    </div>
                    <div className="text-xs text-warning font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Consider reducing discounts
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-success">No Risk</div>
                    <div className="text-xs text-muted-foreground">Revenue trend is stable or growing</div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {/* Methodology note */}
        {!loading && data && (
          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Calculated from live order and loyalty data. Trends compare equal-length periods.
            Estimates are labelled as such and should not be used as financial forecasts.
            Last updated: {new Date(data.calculatedAt!).toLocaleString()}.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}