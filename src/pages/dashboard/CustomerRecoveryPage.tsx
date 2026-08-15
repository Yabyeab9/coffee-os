import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, RefreshCw, Loader2, AlertTriangle, CheckCircle2,
  XCircle, Clock, TrendingDown, Send, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecoveryAction {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  churn_risk_score: number;
  last_visit_days_ago: number;
  lifetime_value: number;
  recovery_action: {
    type: string;
    description: string;
    value: string;
    validity_days: number;
    reasoning: string;
  };
  estimated_recovery_probability: number;
  estimated_revenue: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'redeemed' | 'expired';
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function riskColor(score: number) {
  if (score >= 75) return 'text-destructive';
  if (score >= 50) return 'text-warning';
  return 'text-success';
}

function riskLabel(score: number) {
  if (score >= 75) return { label: 'High Risk', cls: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (score >= 50) return { label: 'Medium Risk', cls: 'bg-warning/15 text-warning border-warning/30' };
  return { label: 'Low Risk', cls: 'bg-success/15 text-success border-success/30' };
}

function buildRecoveryAction(customer: {
  id: string; full_name: string; email: string;
  last_order_days: number; total_spent: number; order_count: number;
}) {
  const risk = customer.last_order_days > 60 ? 75 : customer.last_order_days > 30 ? 55 : 30;
  const value = customer.total_spent / Math.max(customer.order_count, 1);
  const estRevenue = value * 0.65;

  let actionType = 'discount';
  let description = '15% off your next order';
  let actionValue = '15%';
  let validity = 7;
  let reasoning = '';

  if (customer.last_order_days > 60) {
    actionType = 'win_back';
    description = '20% off + free upgrade on next visit';
    actionValue = '20% + free upgrade';
    validity = 14;
    reasoning = `Last visited ${customer.last_order_days} days ago. Previously an active customer with ${customer.order_count} orders. High-value win-back candidate.`;
  } else if (customer.last_order_days > 30) {
    actionType = 'loyalty_bonus';
    description = 'Double loyalty points on your next 3 orders';
    actionValue = '2× points for 3 orders';
    validity = 10;
    reasoning = `${customer.last_order_days} days since last visit. Points incentive may re-establish weekly habit.`;
  } else {
    reasoning = `Declining visit frequency. A small discount may re-engage before churn solidifies.`;
  }

  return {
    churn_risk_score: risk,
    recovery_action: {
      type: actionType,
      description,
      value: actionValue,
      validity_days: validity,
      reasoning,
    },
    estimated_recovery_probability: Math.max(10, 80 - customer.last_order_days),
    estimated_revenue: Math.round(estRevenue),
  };
}

// ── Card ──────────────────────────────────────────────────────────────────────
function RecoveryCard({
  action, onApprove, onReject,
}: {
  action: RecoveryAction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [acting, setActing] = useState(false);
  const risk = riskLabel(action.churn_risk_score);

  const handleApprove = async () => {
    setActing(true);
    await onApprove(action.id);
    setActing(false);
  };
  const handleReject = async () => {
    setActing(true);
    await onReject(action.id);
    setActing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="bg-card border border-border rounded-xl p-5 space-y-4"
    >
      {/* Customer header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate">{action.customer_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${risk.cls}`}>
              {risk.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.customer_email}</p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${riskColor(action.churn_risk_score)}`}>
            {action.churn_risk_score}
          </div>
          <div className="text-xs text-muted-foreground">risk score</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-foreground">{action.last_visit_days_ago}d</div>
          <div className="text-xs text-muted-foreground">since visit</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-foreground">
            {action.lifetime_value.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">lifetime ETB</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-success">
            {action.estimated_recovery_probability}%
          </div>
          <div className="text-xs text-muted-foreground">recovery est.</div>
        </div>
      </div>

      {/* Recovery action */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Proposed Action</span>
        </div>
        <p className="text-sm font-medium text-foreground">{action.recovery_action.description}</p>
        <p className="text-xs text-muted-foreground">
          Valid for {action.recovery_action.validity_days} days · est. {action.estimated_revenue} ETB revenue
        </p>
        <p className="text-xs text-muted-foreground italic">{action.recovery_action.reasoning}</p>
      </div>

      {/* Actions */}
      {action.status === 'pending_approval' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm" className="flex-1 h-8 text-xs"
            onClick={handleApprove} disabled={acting}
          >
            {acting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Approve & Send
          </Button>
          <Button
            size="sm" variant="outline" className="h-8 text-xs"
            onClick={handleReject} disabled={acting}
          >
            <XCircle className="w-3 h-3 mr-1" />
            Reject
          </Button>
        </div>
      )}
      {action.status !== 'pending_approval' && (
        <div className="flex items-center gap-1.5">
          {action.status === 'approved' || action.status === 'sent' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground capitalize">{action.status.replace(/_/g, ' ')}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CustomerRecoveryPage() {
  const { cafeId, profile } = useAuth();
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending_approval');

  const fetchActions = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('customer_recovery_actions')
        .select('*')
        .eq('cafe_id', cafeId)
        .order('churn_risk_score', { ascending: false })
        .limit(100);
      if (err) throw err;

      const customerIds = [...new Set((data ?? []).map(a => a.customer_id))];
      let nameMap: Record<string, { name: string; email: string }> = {};
      if (customerIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', customerIds);
        (users ?? []).forEach(u => {
          nameMap[u.id] = { name: u.full_name ?? 'Unknown', email: u.email };
        });
      }

      setActions((data ?? []).map(a => ({
        ...a,
        customer_name: nameMap[a.customer_id]?.name ?? 'Unknown',
        customer_email: nameMap[a.customer_id]?.email ?? '',
      })));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load recovery actions');
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  const scanAtRisk = async () => {
    if (!cafeId) return;
    setScanning(true);
    try {
      // Find customers who visited regularly but haven't been back in 30+ days
      const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
      const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90);

      const { data: recent } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .eq('cafe_id', cafeId)
        .eq('payment_status', 'paid')
        .gte('created_at', cutoff90.toISOString());

      // Aggregate per user
      const userMap: Record<string, { total: number; count: number; lastDate: Date }> = {};
      (recent ?? []).forEach(o => {
        if (!o.user_id) return;
        const d = new Date(o.created_at);
        if (!userMap[o.user_id]) {
          userMap[o.user_id] = { total: 0, count: 0, lastDate: d };
        }
        userMap[o.user_id].total += Number(o.total_amount) || 0;
        userMap[o.user_id].count += 1;
        if (d > userMap[o.user_id].lastDate) userMap[o.user_id].lastDate = d;
      });

      // Filter: visited ≥2x in 90d but last visit > 30d ago
      const atRisk = Object.entries(userMap).filter(([, u]) => {
        const daysSince = Math.floor((Date.now() - u.lastDate.getTime()) / 86_400_000);
        return u.count >= 2 && daysSince >= 30;
      });

      if (atRisk.length === 0) {
        toast.info('No at-risk customers found in current data');
        setScanning(false);
        return;
      }

      // Fetch user details
      const ids = atRisk.map(([id]) => id);
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', ids);
      const userDetails = Object.fromEntries((users ?? []).map(u => [u.id, u]));

      const inserts: any[] = atRisk.map(([userId, u]) => {
        const daysSince = Math.floor((Date.now() - u.lastDate.getTime()) / 86_400_000);
        const customer = {
          id: userId,
          full_name: userDetails[userId]?.full_name ?? 'Customer',
          email: userDetails[userId]?.email ?? '',
          last_order_days: daysSince,
          total_spent: u.total,
          order_count: u.count,
        };
        const built = buildRecoveryAction(customer);
        return {
          cafe_id: cafeId,
          customer_id: userId,
          churn_risk_score: built.churn_risk_score,
          last_visit_days_ago: daysSince,
          lifetime_value: u.total,
          recovery_action: built.recovery_action,
          estimated_recovery_probability: built.estimated_recovery_probability,
          estimated_revenue: built.estimated_revenue,
          status: 'pending_approval',
        };
      });

      await supabase.from('customer_recovery_actions').upsert(inserts, {
        onConflict: 'cafe_id,customer_id',
        ignoreDuplicates: false,
      });

      await fetchActions();
      toast.success(`${inserts.length} at-risk customer${inserts.length !== 1 ? 's' : ''} identified`);
    } catch (err: any) {
      toast.error('Scan failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('customer_recovery_actions')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: profile?.id })
      .eq('id', id);
    if (error) { toast.error('Failed to approve'); return; }
    toast.success('Recovery action approved');
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const } : a));
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from('customer_recovery_actions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Action rejected');
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' as const } : a));
  };

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const filtered = filterStatus === 'all'
    ? actions
    : actions.filter(a => a.status === filterStatus);

  const pending = actions.filter(a => a.status === 'pending_approval').length;

  if (!cafeId) return <div className="p-8 text-muted-foreground">No café assigned.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-semibold">Customer Recovery Engine</h1>
            {pending > 0 && (
              <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">
                {pending} awaiting approval
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Detect at-risk customers from real visit data. Review and approve recovery actions before they're sent.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchActions} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={scanAtRisk} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Users className="w-3.5 h-3.5 mr-1.5" />}
            Scan At-Risk
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" onClick={fetchActions} className="ml-auto text-destructive">Retry</Button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {['pending_approval', 'approved', 'rejected', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            {s === 'pending_approval' && pending > 0 && ` (${pending})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
          : filtered.length === 0
            ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <TrendingDown className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No {filterStatus.replace(/_/g, ' ')} actions. Run a scan to identify at-risk customers.</p>
              </div>
            )
            : (
              <AnimatePresence>
                {filtered.map(a => (
                  <RecoveryCard key={a.id} action={a} onApprove={handleApprove} onReject={handleReject} />
                ))}
              </AnimatePresence>
            )}
      </div>
    </div>
  );
}
