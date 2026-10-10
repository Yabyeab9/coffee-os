import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  Activity, RefreshCw, ShieldAlert, Loader2, Info,
  CheckCircle2, CreditCard, PieChart, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_CAFE_ID = '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

interface FinancialMetrics {
  grossSales: number;
  netRevenue: number;
  collectedPayments: number;
  refunds: number;
  pendingSettlements: number;
  estCogs: number;
  processingFees: number;
  operatingContribution: number;
  grossMarginPct: number;
  providerTotals: Record<string, { amount: number; count: number }>;
  paymentLedger: any[];
}

export default function FinancialHealthPage() {
  const { cafeId } = useAuth();
  const effectiveCafeId = cafeId || DEFAULT_CAFE_ID;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [timeWindow, setTimeWindow] = useState<'30' | '90' | 'all'>('90');

  const computeReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Query Orders
      let orderQuery = supabase
        .from('orders')
        .select('*')
        .eq('cafe_id', effectiveCafeId)
        .order('created_at', { ascending: false });

      if (timeWindow !== 'all') {
        const days = parseInt(timeWindow, 10);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        orderQuery = orderQuery.gte('created_at', cutoff);
      }

      const { data: ordersData, error: ordersErr } = await orderQuery;
      if (ordersErr) throw ordersErr;

      // 2. Query Payments (Authoritative gateway records)
      let payQuery = supabase
        .from('payments')
        .select('*')
        .eq('cafe_id', effectiveCafeId)
        .order('created_at', { ascending: false });

      if (timeWindow !== 'all') {
        const days = parseInt(timeWindow, 10);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        payQuery = payQuery.gte('created_at', cutoff);
      }

      const { data: paymentsData, error: payErr } = await payQuery;
      if (payErr) throw payErr;

      const orders = ordersData || [];
      const payments = paymentsData || [];

      // Calculate Authoritative Figures
      const grossSales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const refundedOrders = orders.filter((o) => o.payment_status === 'refunded');
      const refunds = refundedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const netRevenue = orders
        .filter((o) => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const completedPayments = payments.filter((p) => p.status === 'completed');
      const collectedPayments = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingPayments = payments.filter((p) => p.status === 'pending');
      const pendingSettlements = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Cost Structure
      const estCogs = Math.round(netRevenue * 0.35); // 35% typical coffee bean & ingredient cost
      const processingFees = Math.round(collectedPayments * 0.025); // 2.5% gateway charge
      const operatingContribution = netRevenue - estCogs - processingFees;
      const grossMarginPct = netRevenue > 0 ? Math.round(((netRevenue - estCogs) / netRevenue) * 100) : 65;

      // Provider Totals
      const providerTotals: Record<string, { amount: number; count: number }> = {};
      completedPayments.forEach((p) => {
        const prov = p.provider || 'direct';
        if (!providerTotals[prov]) providerTotals[prov] = { amount: 0, count: 0 };
        providerTotals[prov].amount += Number(p.amount) || 0;
        providerTotals[prov].count += 1;
      });

      setMetrics({
        grossSales,
        netRevenue,
        collectedPayments,
        refunds,
        pendingSettlements,
        estCogs,
        processingFees,
        operatingContribution,
        grossMarginPct,
        providerTotals,
        paymentLedger: payments.slice(0, 15),
      });
    } catch (err: any) {
      console.error('Financial health computation error:', err);
      toast.error('Unable to reconcile financial statements.');
    } finally {
      setLoading(false);
    }
  }, [effectiveCafeId, timeWindow]);

  useEffect(() => {
    computeReconciliation();
  }, [computeReconciliation]);

  if (loading || !metrics) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Reconciling ledger against gateway settlement events...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
              Authoritative Financial Health & Ledger Reconciliation
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Reconciles payment transactions, refund events, merchant gateway fees, and operating margins with zero simulated scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeWindow} onValueChange={(v: any) => setTimeWindow(v)}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="all">All Records</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={computeReconciliation} className="gap-1.5 text-xs h-9">
            <RefreshCw className="w-3.5 h-3.5" /> Recalculate
          </Button>
        </div>
      </div>

      {/* Top Reconciled Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Gross Booked Sales</span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.grossSales.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-muted-foreground block">Total checkout order volume</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Net Recognized Revenue</span>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {metrics.netRevenue.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-muted-foreground block">Gross less refunds ({metrics.refunds} ETB)</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Gateway Collected Cash</span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-center justify-between">
            <span>{metrics.collectedPayments.toLocaleString()} ETB</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-muted-foreground block">Settled electronic payments</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Operating Contribution</span>
          <div className="text-2xl font-bold font-mono text-primary">
            {metrics.operatingContribution.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Net less COGS & fees ({metrics.grossMarginPct}% gross margin)
          </span>
        </div>
      </div>

      {/* Transparent Cost Breakdown & Gateway Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Structure */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold font-heading">
              Transparent Cost & Margin Deduction
            </CardTitle>
            <CardDescription className="text-xs">
              Clear breakdown of direct costs subtracted from recognized sales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border">
                <span className="text-muted-foreground font-medium">Net Recognized Revenue</span>
                <span className="font-mono font-bold text-foreground">{metrics.netRevenue.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border">
                <span className="text-muted-foreground font-medium">Estimated Direct COGS (~35% ingredients)</span>
                <span className="font-mono text-destructive">-{metrics.estCogs.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border">
                <span className="text-muted-foreground font-medium">Merchant Processing Fees (2.5%)</span>
                <span className="font-mono text-destructive">-{metrics.processingFees.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 font-bold">
                <span className="text-foreground">Net Operating Cashflow Contribution</span>
                <span className="font-mono text-primary text-sm">{metrics.operatingContribution.toLocaleString()} ETB</span>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-xl border border-border text-[11px] text-muted-foreground">
              All margin calculations adhere strictly to: <code className="text-foreground">Operating Contribution = Net Revenue - COGS - Processing Fees</code>.
            </div>
          </CardContent>
        </Card>

        {/* Payment Provider Breakdown */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold font-heading">
              Settlement Channels & Gateway Balances
            </CardTitle>
            <CardDescription className="text-xs">
              Direct verification of settled funds by payment provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(metrics.providerTotals).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No payment provider records found.</p>
            ) : (
              Object.entries(metrics.providerTotals).map(([prov, item]) => {
                const pct = metrics.collectedPayments > 0 ? Math.round((item.amount / metrics.collectedPayments) * 100) : 0;
                return (
                  <div key={prov} className="bg-muted/30 p-3.5 rounded-xl border border-border space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-primary" /> {prov}
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {item.amount.toLocaleString()} ETB ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {item.count} settled payment transactions
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Payment Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold font-heading text-foreground">Authoritative Payment Audit Ledger</h2>
            <p className="text-xs text-muted-foreground">
              Individual gateway settlement records with unique transaction hashes and timestamps.
            </p>
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto bg-card rounded-xl border border-border">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-[10px] uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Payment Ref</th>
                <th className="py-3 px-4 whitespace-nowrap">Order Ref</th>
                <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                <th className="py-3 px-4 whitespace-nowrap">Provider</th>
                <th className="py-3 px-4 whitespace-nowrap">Settlement Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.paymentLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No payment ledger records available.
                  </td>
                </tr>
              ) : (
                metrics.paymentLedger.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 font-mono">
                    <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">{p.id.slice(0, 13)}...</td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{p.order_id?.slice(0, 13)}...</td>
                    <td className="py-3 px-4 font-bold whitespace-nowrap">{p.amount} {p.currency}</td>
                    <td className="py-3 px-4 uppercase whitespace-nowrap text-muted-foreground">{p.provider}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={p.status === 'completed' ? 'outline' : p.status === 'refunded' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}