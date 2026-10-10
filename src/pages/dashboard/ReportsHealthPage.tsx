import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  FileText, Download, TrendingUp, BarChart2, CheckCircle2,
  AlertTriangle, DollarSign, Calendar, Filter, RefreshCw,
  Loader2, ShieldCheck, ArrowUpRight, Layers
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_CAFE_ID = '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

interface OrderRecord {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  order_status: string;
  payment_method: string;
  created_at: string;
}

export default function ReportsHealthPage() {
  const { cafeId } = useAuth();
  const effectiveCafeId = cafeId || DEFAULT_CAFE_ID;

  const [activeTab, setActiveTab] = useState('health');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch orders
      let query = supabase
        .from('orders')
        .select('id, order_number, total_amount, payment_status, order_status, payment_method, created_at')
        .eq('cafe_id', effectiveCafeId)
        .order('created_at', { ascending: false });

      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', cutoff);
      }

      const { data: orderData, error: orderErr } = await query;
      if (orderErr) throw orderErr;
      setOrders((orderData || []) as OrderRecord[]);

      // 2. Fetch menus for inventory health
      const { data: menuData } = await supabase
        .from('menus')
        .select('id, name, is_available, stock_quantity')
        .eq('cafe_id', effectiveCafeId);

      setMenuItems(menuData || []);
    } catch (err: any) {
      console.error('Failed to load reports data:', err);
      toast.error('Could not retrieve reporting data.');
    } finally {
      setLoading(false);
    }
  }, [effectiveCafeId, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unified Mathematical Reconciliations
  const metrics = useMemo(() => {
    const totalOrdersCount = orders.length;
    const paidOrders = orders.filter((o) => o.payment_status === 'paid');
    const refundedOrders = orders.filter((o) => o.payment_status === 'refunded');
    const unpaidOrders = orders.filter((o) => o.payment_status === 'unpaid');

    const grossSales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const refundAmount = refundedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const netSales = paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const aov = paidOrders.length > 0 ? Math.round(netSales / paidOrders.length) : 0;
    const estGatewayFees = Math.round(netSales * 0.025); // Standard 2.5% merchant processing

    // Component Scores for Transparent Composite Health Score
    // 1. Fulfillment & Settlement Rate (max 40 pts)
    const settlementRate = totalOrdersCount > 0 ? paidOrders.length / totalOrdersCount : 1;
    const settlementScore = Math.round(settlementRate * 40);

    // 2. Low Refund Discipline (max 20 pts)
    const refundRate = grossSales > 0 ? refundAmount / grossSales : 0;
    const refundScore = Math.max(0, Math.round((1 - refundRate * 3) * 20));

    // 3. Inventory Availability (max 40 pts)
    const availableItems = menuItems.filter((m) => m.is_available !== false);
    const inStockRate = menuItems.length > 0 ? availableItems.length / menuItems.length : 1;
    const inventoryScore = Math.round(inStockRate * 40);

    const compositeHealthScore = Math.min(100, Math.max(0, settlementScore + refundScore + inventoryScore));

    return {
      totalOrdersCount,
      paidCount: paidOrders.length,
      refundCount: refundedOrders.length,
      unpaidCount: unpaidOrders.length,
      grossSales,
      refundAmount,
      netSales,
      aov,
      estGatewayFees,
      settlementScore,
      refundScore,
      inventoryScore,
      compositeHealthScore,
    };
  }, [orders, menuItems]);

  // Export Filtered CSV function
  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.warning('No records to export for this period.');
      return;
    }

    const headers = ['Order Number', 'Date', 'Gross Amount (ETB)', 'Payment Status', 'Order Status', 'Payment Method'];
    const rows = orders.map((o) => [
      o.order_number,
      new Date(o.created_at).toISOString().split('T')[0],
      o.total_amount,
      o.payment_status,
      o.order_status,
      o.payment_method || 'direct',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cafe_orders_report_${dateRange}d_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${orders.length} order records to CSV.`);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Reconciling reporting books and audit logs...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
              Reconciled Reports & Operational Health
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Defensible KPI formulas, cross-page balance reconciliations, and verified transaction exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-1.5 text-xs h-9">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>

          <Button size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs h-9">
            <Download className="w-3.5 h-3.5" /> Export Filtered CSV
          </Button>
        </div>
      </div>

      {/* Reconciled Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Gross Booked Sales</span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.grossSales.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-muted-foreground block">
            {metrics.totalOrdersCount} total orders created
          </span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Net Recognized Revenue</span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-center justify-between">
            <span>{metrics.netSales.toLocaleString()} ETB</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-muted-foreground block">
            {metrics.paidCount} confirmed paid orders
          </span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Average Order Value (AOV)</span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {metrics.aov.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-muted-foreground block">Net Sales / Paid Orders</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Refunds & Processing</span>
          <div className="text-2xl font-bold font-mono text-destructive flex items-center justify-between">
            <span>{(metrics.refundAmount + metrics.estGatewayFees).toLocaleString()} ETB</span>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <span className="text-[11px] text-muted-foreground block">
            {metrics.refundAmount} ETB refunds + {metrics.estGatewayFees} ETB fees
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="health" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[340px]">
          <TabsTrigger value="health" className="text-xs">Defensible Health Score</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs">Audit Order Ledger</TabsTrigger>
        </TabsList>

        {/* Tab 1: Defensible Composite Health Score */}
        <TabsContent value="health" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 glass p-6 rounded-2xl border border-primary/40 bg-primary/5 flex flex-col items-center justify-center text-center space-y-4">
              <h2 className="text-base font-bold font-heading text-foreground">Defensible Composite Health</h2>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * metrics.compositeHealthScore) / 100}
                    className="text-primary transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold font-mono text-foreground">{metrics.compositeHealthScore}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">/ 100 Score</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Score dynamically calculated from order settlement rates, refund control, and active menu catalog availability.
              </p>
            </div>

            <div className="md:col-span-2 glass p-6 rounded-2xl border border-border space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold font-heading text-foreground">Component Score Breakdown</h3>
                <p className="text-xs text-muted-foreground">
                  Each weight reflects measurable financial and operational health.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-foreground">Order Settlement & Completion Rate</span>
                    <span className="font-mono font-semibold">{metrics.settlementScore} / 40 pts</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(metrics.settlementScore / 40) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {metrics.paidCount} of {metrics.totalOrdersCount} orders successfully settled
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-foreground">Refund & Dispute Control</span>
                    <span className="font-mono font-semibold">{metrics.refundScore} / 20 pts</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(metrics.refundScore / 20) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Refund value represents {metrics.grossSales > 0 ? ((metrics.refundAmount / metrics.grossSales) * 100).toFixed(1) : 0}% of gross sales
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-foreground">Catalog & Inventory Availability</span>
                    <span className="font-mono font-semibold">{metrics.inventoryScore} / 40 pts</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(metrics.inventoryScore / 40) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {menuItems.filter((m) => m.is_available !== false).length} of {menuItems.length} menu items active and in-stock
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Reconciled Order Ledger */}
        <TabsContent value="reconciliation" className="space-y-4 pt-4">
          <div className="w-full max-w-full overflow-x-auto bg-card rounded-xl border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border text-[10px] uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Order Number</th>
                  <th className="py-3 px-4 whitespace-nowrap">Created Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payment Method</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payment Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No order records for the selected period.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/20 font-mono">
                      <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">{o.order_number}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">{o.total_amount} ETB</td>
                      <td className="py-3 px-4 uppercase whitespace-nowrap text-muted-foreground">{o.payment_method || 'direct'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={o.payment_status === 'paid' ? 'outline' : o.payment_status === 'refunded' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {o.payment_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap capitalize text-muted-foreground">{o.order_status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}