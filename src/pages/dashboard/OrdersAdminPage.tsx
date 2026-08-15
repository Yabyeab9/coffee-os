import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { adminUpdateOrderStatus } from '@/lib/api';
import { useAdminQueueStats } from '@/hooks/queries';
import {
  ShoppingBag, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  Loader2, RefreshCw, X, ChevronDown, ChevronUp, User,
  Coffee, CreditCard, Timer, Flame, Bell, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  menus?: { name: string; preparation_time?: number };
}

interface Order {
  id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  created_at: string;
  updated_at?: string;
  status_changed_at?: string;
  admin_notes?: string;
  order_type?: string;
  loyalty_discount?: number;
  users?: { full_name: string | null; email: string } | null;
  order_items?: OrderItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DELAY_THRESHOLD_MINS = 20; // minutes in 'preparing' before flagged as delayed

const COLUMN_CONFIG: { status: string; label: string; accent: string; emptyMsg: string }[] = [
  { status: 'pending',   label: 'New Orders',  accent: 'border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/20',   emptyMsg: 'No new orders' },
  { status: 'preparing', label: 'Preparing',   accent: 'border-blue-400/40 bg-blue-50/30 dark:bg-blue-950/20',     emptyMsg: 'Nothing preparing' },
  { status: 'ready',     label: 'Ready',       accent: 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/20', emptyMsg: 'No orders ready' },
];

const ACTION_CONFIG: Record<string, { label: string; nextStatus: string; variant: 'default' | 'outline' | 'ghost' }[]> = {
  pending:   [{ label: 'Accept & Prepare', nextStatus: 'preparing', variant: 'default'  }, { label: 'Cancel', nextStatus: 'cancelled', variant: 'ghost' }],
  preparing: [{ label: 'Mark Ready',       nextStatus: 'ready',     variant: 'default'  }, { label: 'Cancel', nextStatus: 'cancelled', variant: 'ghost' }],
  ready:     [{ label: 'Complete',          nextStatus: 'completed', variant: 'outline'  }, { label: 'Cancel', nextStatus: 'cancelled', variant: 'ghost' }],
};

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  preparing: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  ready:     'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

// ─── Internal hook: all of today's orders ─────────────────────────────────────
function useAdminAllOrders(cafeId?: string) {
  return useQuery({
    queryKey: ['admin_all_orders', cafeId],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menus (
              name,
              preparation_time
            )
          )
        `)
        .eq('cafe_id', cafeId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return orders ?? [];
    },
    enabled: !!cafeId,
    refetchInterval: 30_000,
  });
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function minutesAgo(isoString?: string): number {
  if (!isoString) return 0;
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
}

function formatAge(isoString: string): string {
  const mins = minutesAgo(isoString);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function estimatedPrepMins(order: Order): number {
  const items = order.order_items ?? [];
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const maxPrepTime = Math.max(...items.map(i => i.menus?.preparation_time ?? 5), 5);
  return Math.max(5, maxPrepTime + Math.floor(totalItems * 1.5));
}

function isDelayed(order: Order): boolean {
  if (order.order_status !== 'preparing') return false;
  const sinceChanged = minutesAgo(order.status_changed_at ?? order.created_at);
  return sinceChanged >= DELAY_THRESHOLD_MINS;
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────
function OrderDetailModal({
  order,
  onClose,
  onAction,
  actioning,
}: {
  order: Order;
  onClose: () => void;
  onAction: (orderId: string, status: string) => void;
  actioning: string | null;
}) {
  const items = order.order_items ?? [];
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const ageInQueue = minutesAgo(order.created_at);
  const inStatusMins = minutesAgo(order.status_changed_at ?? order.created_at);
  const prepEst = estimatedPrepMins(order);
  const delayed = isDelayed(order);
  const actions = ACTION_CONFIG[order.order_status] ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-base">
            <ShoppingBag className="w-4 h-4 text-primary" />
            {order.order_number}
            <span className={`ml-auto text-xs border px-2 py-0.5 rounded-full font-sans capitalize ${STATUS_BADGE[order.order_status] ?? STATUS_BADGE.cancelled}`}>
              {order.order_status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Delay warning */}
          {delayed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Preparing for {inStatusMins}m — expected ~{prepEst}m
            </div>
          )}

          {/* Customer */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {order.users?.full_name ?? 'Guest Customer'}
              </p>
              {order.users?.email && (
                <p className="text-xs text-muted-foreground truncate">{order.users.email}</p>
              )}
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Placed</p>
              <p className="font-medium text-foreground">{formatAge(order.created_at)}</p>
              <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-xs text-muted-foreground mb-1">In queue</p>
              <p className={`font-medium ${ageInQueue > 30 ? 'text-destructive' : 'text-foreground'}`}>{ageInQueue}m</p>
              <p className="text-xs text-muted-foreground">Est. prep: ~{prepEst}m</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Items ({totalItems})
            </p>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {item.quantity}
                    </span>
                    <span className="text-foreground">{item.menus?.name ?? 'Item'}</span>
                    {item.menus?.preparation_time && (
                      <span className="text-[10px] text-muted-foreground">~{item.menus.preparation_time}m</span>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-2">{Number(item.total_price).toFixed(2)} ETB</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Payment</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${
                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              }`}>{order.payment_status}</span>
            </div>
            <span className="font-semibold text-foreground">{Number(order.total_amount).toFixed(2)} ETB</span>
          </div>

          {order.loyalty_discount != null && Number(order.loyalty_discount) > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-right">
              Loyalty discount: -{Number(order.loyalty_discount).toFixed(2)} ETB
            </p>
          )}

          {order.admin_notes && (
            <div className="text-xs text-muted-foreground px-3 py-2 rounded bg-secondary/30 border border-border">
              <span className="font-medium">Notes: </span>{order.admin_notes}
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex gap-2 pt-1">
              {actions.map(a => (
                <Button
                  key={a.nextStatus}
                  size="sm"
                  variant={a.variant}
                  disabled={actioning === order.id}
                  onClick={() => onAction(order.id, a.nextStatus)}
                  className={`flex-1 h-9 text-xs ${a.nextStatus === 'cancelled' ? 'text-destructive border-destructive/30 hover:bg-destructive/10' : ''}`}
                >
                  {actioning === order.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onAction,
  actioning,
  onSelect,
}: {
  order: Order;
  onAction: (id: string, status: string) => void;
  actioning: string | null;
  onSelect: (order: Order) => void;
}) {
  const items = order.order_items ?? [];
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const ageInQueue = minutesAgo(order.created_at);
  const inStatusMins = minutesAgo(order.status_changed_at ?? order.created_at);
  const delayed = isDelayed(order);
  const actions = ACTION_CONFIG[order.order_status] ?? [];
  const isActioning = actioning === order.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`bg-card rounded-xl border p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors ${
        delayed ? 'border-destructive/40' : 'border-border'
      }`}
      onClick={() => onSelect(order)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{order.order_number}</span>
            {delayed && (
              <span className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full border border-destructive/20">
                <Flame className="w-3 h-3" /> Delayed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {order.users?.full_name ?? 'Guest'} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ageInQueue > 15 && order.order_status === 'pending' && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{ageInQueue}m</span>
          )}
          {order.order_status === 'preparing' && (
            <span className={`text-[10px] font-medium ${delayed ? 'text-destructive' : 'text-blue-600 dark:text-blue-400'}`}>{inStatusMins}m</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize font-medium ${
            order.payment_status === 'paid'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
          }`}>{order.payment_status}</span>
        </div>
      </div>

      {/* Items preview */}
      <div className="text-xs text-muted-foreground">
        {items.slice(0, 3).map((item, i) => (
          <span key={item.id}>
            {i > 0 && ', '}
            {item.quantity > 1 && <span className="font-medium text-foreground">{item.quantity}× </span>}
            {item.menus?.name ?? 'Item'}
          </span>
        ))}
        {items.length > 3 && <span> +{items.length - 3} more</span>}
        <span className="ml-1 text-muted-foreground">({totalItems} items)</span>
      </div>

      {/* Total + Actions */}
      <div className="flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-semibold text-foreground">{Number(order.total_amount).toFixed(2)} ETB</span>
        {actions.length > 0 && (
          <div className="flex gap-1.5">
            {actions.filter(a => a.nextStatus !== 'cancelled').map(a => (
              <Button
                key={a.nextStatus}
                size="sm"
                variant={a.variant}
                disabled={isActioning}
                onClick={() => onAction(order.id, a.nextStatus)}
                className="h-7 text-xs px-3"
              >
                {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : a.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              disabled={isActioning}
              onClick={() => onAction(order.id, 'cancelled')}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
              title="Cancel order"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats, isLoading }: {
  stats: {
    pending_count: number; preparing_count: number; ready_count: number;
    completed_today: number; cancelled_today: number;
    avg_prep_minutes: number | null; delayed_count: number;
    longest_waiting_minutes: number | null;
  } | null | undefined;
  isLoading: boolean;
}) {
  const items = [
    { label: 'Waiting',       value: stats?.pending_count ?? 0,   icon: Bell,         accent: 'text-amber-600 dark:text-amber-400' },
    { label: 'Preparing',     value: stats?.preparing_count ?? 0, icon: Coffee,       accent: 'text-blue-600 dark:text-blue-400' },
    { label: 'Ready',         value: stats?.ready_count ?? 0,     icon: CheckCircle2, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Done Today',    value: stats?.completed_today ?? 0, icon: Package,      accent: 'text-primary' },
    { label: 'Delayed',       value: stats?.delayed_count ?? 0,   icon: AlertTriangle, accent: 'text-destructive' },
    {
      label: 'Avg Prep',
      value: stats?.avg_prep_minutes != null ? `${stats.avg_prep_minutes}m` : '—',
      icon: Timer,
      accent: 'text-muted-foreground',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {items.map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="glass rounded-xl p-3 border border-border text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${s.accent}`} />
            <p className={`text-xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recently Completed ───────────────────────────────────────────────────────
function RecentlyCompleted({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState(false);
  const recent = useMemo(() =>
    orders
      .filter(o => o.order_status === 'completed' || o.order_status === 'cancelled')
      .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
      .slice(0, expanded ? 10 : 5),
    [orders, expanded]
  );

  if (recent.length === 0) return null;

  return (
    <div className="glass rounded-xl border border-border/50 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Recent Completions
          <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{recent.length}</span>
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-4 font-medium">Order #</th>
                <th className="text-left py-2 pr-4 font-medium">Customer</th>
                <th className="text-left py-2 pr-4 font-medium">Total</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recent.map(o => (
                <tr key={o.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-foreground">{o.order_number}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{o.users?.full_name ?? 'Guest'}</td>
                  <td className="py-2.5 pr-4 text-foreground">{Number(o.total_amount).toFixed(2)} ETB</td>
                  <td className="py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${STATUS_BADGE[o.order_status] ?? STATUS_BADGE.cancelled}`}>
                      {o.order_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersAdminPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const [actioning, setActioning] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch all today's orders (active + recently completed for history)
  const { data: allOrdersRes, isLoading, error, refetch } = useAdminAllOrders(cafeId ?? undefined);
  const { data: stats, isLoading: statsLoading } = useAdminQueueStats(cafeId ?? undefined);

  // Realtime subscription
  useEffect(() => {
    if (!cafeId) return;
    const channel = supabase
      .channel(`admin_orders_${cafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `cafe_id=eq.${cafeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin_all_orders', cafeId] });
          queryClient.invalidateQueries({ queryKey: ['admin_queue_stats', cafeId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cafeId, queryClient]);

  const handleAction = useCallback(async (orderId: string, newStatus: string) => {
    setActioning(orderId);
    try {
      await adminUpdateOrderStatus(orderId, newStatus);
      queryClient.invalidateQueries({ queryKey: ['admin_all_orders', cafeId] });
      queryClient.invalidateQueries({ queryKey: ['admin_queue_stats', cafeId] });
      toast.success(`Order ${newStatus === 'cancelled' ? 'cancelled' : `marked as ${newStatus}`}`);
      // Close detail modal if the order was just actioned
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setActioning(null);
    }
  }, [cafeId, queryClient, selectedOrder]);

  // Derived data — computed before any conditional return (Rules of Hooks)
 const allOrders: Order[] = allOrdersRes ?? [];

  const queueOrders = useMemo(() =>
    allOrders
      .filter(o => ['pending', 'preparing', 'ready'].includes(o.order_status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [allOrders]
  );

  const byStatus = useCallback(
    (status: string) => queueOrders.filter(o => o.order_status === status),
    [queueOrders]
  );

  if (!cafeId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">No café assigned to your account.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Live Order Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time operational command center · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-8 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} isLoading={statsLoading} />

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load orders.
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto h-7 text-xs text-destructive hover:bg-destructive/10">
            Retry
          </Button>
        </div>
      )}

      {/* Queue Columns */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 rounded-lg" />
              {Array.from({ length: 2 }).map((_, j) => <Skeleton key={j} className="h-32 rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMN_CONFIG.map(col => {
            const colOrders = byStatus(col.status);
            return (
              <div key={col.status} className="space-y-3">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${col.accent}`}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.label}</span>
                  <span className="text-xs font-bold text-foreground bg-background/60 px-2 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[120px]">
                  <AnimatePresence initial={false}>
                    {colOrders.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-border/40 text-muted-foreground text-sm"
                      >
                        <Clock className="w-5 h-5 mb-1.5 opacity-40" />
                        {col.emptyMsg}
                      </motion.div>
                    ) : (
                      colOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onAction={handleAction}
                          actioning={actioning}
                          onSelect={setSelectedOrder}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent completions */}
      {!isLoading && <RecentlyCompleted orders={allOrders} />}

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={handleAction}
          actioning={actioning}
        />
      )}
    </div>
  );
}
