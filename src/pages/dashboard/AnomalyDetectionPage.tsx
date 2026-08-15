import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle, RefreshCw, Loader2, ShieldCheck,
  CheckCircle2, Flag, EyeOff, ChevronDown, ChevronUp,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Anomaly {
  id: string;
  customer_id: string | null;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
  status: 'pending_review' | 'reviewed' | 'flagged' | 'dismissed';
  reviewed_at: string | null;
  created_at: string;
  customer_name?: string;
}

const TYPE_LABELS: Record<string, string> = {
  abnormal_refund: 'Abnormal Refund',
  repeated_discount: 'Repeated Discount',
  suspicious_redemption: 'Suspicious Redemption',
  unusual_spike: 'Unusual Spike',
  duplicate_order: 'Duplicate Order',
};

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLES: Record<string, string> = {
  pending_review: 'bg-warning/15 text-warning',
  reviewed: 'bg-success/15 text-success',
  flagged: 'bg-destructive/15 text-destructive',
  dismissed: 'bg-muted text-muted-foreground',
};

// ── Detect helper: scan real orders for anomalies ─────────────────────────────
async function detectAnomalies(cafeId: string): Promise<void> {
  // 1. Fetch orders with refund status in the last 7 days
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: refunds } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, created_at')
    .eq('cafe_id', cafeId)
    .eq('payment_status', 'refunded')
    .gte('created_at', since.toISOString());

  // Group refunds by user
  const refundMap: Record<string, any[]> = {};
  (refunds ?? []).forEach(r => {
    if (!r.user_id) return;
    refundMap[r.user_id] = refundMap[r.user_id] ?? [];
    refundMap[r.user_id].push(r);
  });

  const inserts: Omit<Anomaly, 'id' | 'created_at' | 'reviewed_at' | 'customer_name'>[] = [];

  // Flag customers with ≥3 refunds in 7 days
  for (const [userId, rows] of Object.entries(refundMap)) {
    if (rows.length >= 3) {
      const totalAmount = rows.reduce((a, r) => a + (r.total_amount ?? 0), 0);
      inserts.push({
        customer_id: userId,
        anomaly_type: 'abnormal_refund',
        severity: rows.length >= 5 ? 'high' : 'medium',
        details: {
          count: rows.length,
          total_refunded: totalAmount,
          period: '7 days',
          order_ids: rows.map(r => r.id),
        },
        status: 'pending_review',
      });
    }
  }

  // 2. Detect unusual order volume spike (today vs 7-day avg)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact' })
    .eq('cafe_id', cafeId)
    .gte('created_at', todayStart.toISOString());
  const { count: weekCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('cafe_id', cafeId)
    .gte('created_at', since.toISOString());

  const todayCount = todayOrders?.length ?? 0;
  const dailyAvg = (weekCount ?? 0) / 7;
  if (dailyAvg > 0 && todayCount > dailyAvg * 3) {
    inserts.push({
      customer_id: null,
      anomaly_type: 'unusual_spike',
      severity: 'high',
      details: {
        today_orders: todayCount,
        daily_avg: Math.round(dailyAvg),
        multiplier: (todayCount / dailyAvg).toFixed(1),
      },
      status: 'pending_review',
    });
  }

  // Insert only if they don't already exist for today
  if (inserts.length > 0) {
    const insertPayload = inserts.map(a => ({ ...a, cafe_id: cafeId }));
    await supabase.from('transaction_anomalies').upsert(insertPayload, {
      onConflict: 'cafe_id,customer_id,anomaly_type',
      ignoreDuplicates: true,
    });
  }
}

// ── Row ────────────────────────────────────────────────────────────────────────
function AnomalyRow({ anomaly, onAction }: { anomaly: Anomaly; onAction: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);

  const act = async (status: string) => {
    setActing(true);
    await onAction(anomaly.id, status);
    setActing(false);
  };

  return (
    <div className={`border rounded-xl bg-card transition-all ${
      anomaly.status === 'pending_review' ? 'border-border' : 'border-border/50 opacity-70'
    }`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${SEVERITY_STYLES[anomaly.severity]}`}>
          {anomaly.severity.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {TYPE_LABELS[anomaly.anomaly_type] ?? anomaly.anomaly_type}
            </span>
            {anomaly.customer_name && (
              <span className="text-xs text-muted-foreground">— {anomaly.customer_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[anomaly.status]}`}>
              {anomaly.status.replace(/_/g, ' ')}
            </span>
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {new Date(anomaly.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="p-4 space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
                <pre>{JSON.stringify(anomaly.details, null, 2)}</pre>
              </div>
              {anomaly.status === 'pending_review' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={acting}
                    onClick={() => act('reviewed')}
                  >
                    {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Mark Reviewed
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={acting}
                    onClick={() => act('flagged')}
                  >
                    <Flag className="w-3 h-3" />
                    Flag
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    disabled={acting}
                    onClick={() => act('dismissed')}
                  >
                    <EyeOff className="w-3 h-3" />
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnomalyDetectionPage() {
  const { cafeId } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [scanning, setScanning] = useState(false);

  const fetchAnomalies = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('transaction_anomalies')
        .select('*')
        .eq('cafe_id', cafeId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) throw err;

      // Enrich with customer names
      const customerIds = [...new Set((data ?? []).map(a => a.customer_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', customerIds);
        (users ?? []).forEach(u => {
          nameMap[u.id] = u.full_name ?? u.email ?? 'Unknown';
        });
      }

      setAnomalies((data ?? []).map(a => ({
        ...a,
        customer_name: a.customer_id ? nameMap[a.customer_id] : undefined,
      })));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  const runScan = async () => {
    if (!cafeId) return;
    setScanning(true);
    try {
      await detectAnomalies(cafeId);
      await fetchAnomalies();
      toast.success('Scan complete');
    } catch {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleAction = async (id: string, status: string) => {
    const { error } = await supabase
      .from('transaction_anomalies')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Anomaly ${status.replace(/_/g, ' ')}`);
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a));
  };

  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);

  const filtered = filter === 'all'
    ? anomalies
    : anomalies.filter(a => a.status === filter);

  const pendingCount = anomalies.filter(a => a.status === 'pending_review').length;

  if (!cafeId) return (
    <div className="p-8 text-muted-foreground">No café assigned to your account.</div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-semibold">Transaction Anomaly Detection</h1>
            {pendingCount > 0 && (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Unusual refunds, discounts, redemptions, and order spikes detected from real data.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAnomalies} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
            Scan Now
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" onClick={fetchAnomalies} className="ml-auto text-destructive">Retry</Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} records</span>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : filtered.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No anomalies found. Run a scan to detect issues from live data.</p>
              </div>
            )
            : filtered.map(a => (
              <AnomalyRow key={a.id} anomaly={a} onAction={handleAction} />
            ))}
      </div>
    </div>
  );
}
