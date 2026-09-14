import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Coffee, Heart, Plus, Sparkles, RefreshCcw, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import OrderTrackingModal from '@/components/orders/OrderTrackingModal';

interface TrackingTarget {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  items: { name: string; quantity: number }[];
}

export default function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingTarget, setTrackingTarget] = useState<TrackingTarget | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, menus(name)), cafes(name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setOrders(data || []);
    } catch {
      toast.error('Could not load your orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Realtime: live payment_status + order_status updates without page refresh
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('orders_page_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setOrders(prev =>
            prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
          );
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Also need to add toast import — comment removed, toast already imported line 9
  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ order_status: 'cancelled' }).eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: 'cancelled' } : o));
      toast.success('Order cancelled successfully');
    } catch {
      toast.error('Could not cancel the order. Please try again.');
    }
  };

  const openTracking = (order: any) => {
    setTrackingTarget({
      orderId: order.id,
      orderNumber: order.order_number || `#${order.id.substring(0, 8).toUpperCase()}`,
      orderStatus: order.order_status,
      paymentStatus: order.payment_status,
      items: (order.order_items ?? []).map((i: any) => ({
        name: i.menus?.name || 'Item',
        quantity: i.quantity,
      })),
    });
  };

  if (isLoading) {
    return <div className="p-10 flex justify-center min-h-[400px] items-center"><Coffee className="w-8 h-8 text-primary animate-pulse" /></div>;
  }

  const activeStatuses = ['pending', 'preparing', 'ready', 'ready_for_pickup', 'served'];
  const activeOrders = orders.filter(o => activeStatuses.includes(o.order_status));
  const historyOrders = orders.filter(o => !activeStatuses.includes(o.order_status));

  const paymentBadgeClass = (status: string) =>
    status === 'paid' || status === 'completed'
      ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
      : status === 'failed'
      ? 'text-destructive border-destructive/30 bg-destructive/5'
      : 'text-muted-foreground border-border';

  const paymentLabel = (status: string) =>
    status === 'completed' ? 'Paid' : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-heading font-semibold text-foreground">Orders</h1>
          </div>
          <Button asChild className="shrink-0 gap-2 font-medium shadow-md">
            <Link to="/menu">
              <Plus className="w-4 h-4" /> New Order
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 p-1">
            <TabsTrigger value="active" className="font-medium">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="history" className="font-medium">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 outline-none">
            {activeOrders.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground glass rounded-xl border border-border">
                <Coffee className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No active orders</h3>
                <p className="mb-6 max-w-md mx-auto">You don't have any orders currently being prepared. Craving a coffee?</p>
                <Button asChild variant="outline">
                  <Link to="/menu">Start a New Order</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {activeOrders.map(order => (
                  <div key={order.id} className="glass rounded-xl p-6 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-foreground truncate">
                            {order.order_number || `#${order.id.substring(0, 8).toUpperCase()}`}
                          </h3>
                          <Badge variant="default" className="capitalize px-3 py-1 font-semibold">
                            {order.order_status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                          {order.cafes?.name && <span className="font-medium text-foreground">{order.cafes.name}</span>}
                          <span>•</span>
                          <span>{new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        </p>
                        <div className="mt-4 bg-background/50 rounded-lg p-3 space-y-1.5 border border-border">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm text-foreground">
                              <span>
                                <span className="text-muted-foreground mr-2">{item.quantity}×</span>
                                {item.menus?.name || 'Item'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-left md:text-right mt-2 md:mt-0 flex flex-col gap-1.5 shrink-0">
                        <p className="text-2xl font-bold text-primary">
                          {order.total_amount} <span className="text-sm font-normal text-muted-foreground">ETB</span>
                        </p>
                        <Badge variant="outline" className={`capitalize text-[10px] ${paymentBadgeClass(order.payment_status)}`}>
                          {paymentLabel(order.payment_status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border mt-4">
                      {order.order_status === 'pending' && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => cancelOrder(order.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-border"
                        >
                          Cancel Order
                        </Button>
                      )}
                      <Button
                        variant="default" size="sm"
                        className="ml-auto gap-1.5"
                        onClick={() => openTracking(order)}
                      >
                        <Navigation className="w-3.5 h-3.5" /> Track Order
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 outline-none">
            {historyOrders.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground glass rounded-xl border border-border">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Your order history is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyOrders.map((order, idx) => (
                  <div key={order.id} className="glass rounded-xl p-5 border border-border hover:border-primary/30 transition-colors flex flex-col">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {order.order_number || new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </h3>
                        <p className="text-xs text-muted-foreground">{order.cafes?.name || 'Coffee OS Cafe'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground">{order.total_amount} <span className="text-[10px] text-muted-foreground">ETB</span></p>
                        <Badge variant="outline" className={`mt-1 capitalize text-[10px] ${paymentBadgeClass(order.payment_status)}`}>
                          {paymentLabel(order.payment_status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 mt-2 mb-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {order.order_items?.map((i: any) => `${i.quantity}× ${i.menus?.name}`).join(', ')}
                      </p>
                      {idx === 0 && (
                        <div className="inline-flex mt-2 items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" /> Most Recent
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <Button variant="outline" size="sm" className="flex-1 gap-2 h-9" asChild>
                        <Link to="/menu">
                          <RefreshCcw className="w-3.5 h-3.5" /> Order Again
                        </Link>
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-9 shrink-0 gap-1.5 text-muted-foreground"
                        onClick={() => openTracking(order)}
                      >
                        <Navigation className="w-3.5 h-3.5" /> Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Track Order Modal */}
      {trackingTarget && (
        <OrderTrackingModal
          orderId={trackingTarget.orderId}
          orderNumber={trackingTarget.orderNumber}
          initialStatus={trackingTarget.orderStatus}
          initialPaymentStatus={trackingTarget.paymentStatus}
          items={trackingTarget.items}
          onClose={() => setTrackingTarget(null)}
        />
      )}
    </>
  );
}