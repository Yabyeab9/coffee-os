import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Coffee, ChevronRight, X } from 'lucide-react';
import type { Order } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('orders')
        .select('*, cafes(name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      
      setOrders(data || []);
      setIsLoading(false);
    }
    fetchOrders();
  }, [profile?.id]);

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ order_status: 'cancelled' }).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: 'cancelled' } : o));
    }
  };

  if (isLoading) {
    return <div className="p-10 flex justify-center min-h-[400px] items-center"><Coffee className="w-8 h-8 text-primary animate-pulse" /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">Order History</h1>
      
      {orders.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground glass rounded-xl">
          <ShoppingBag className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="glass rounded-xl p-5 border-l-4 border-l-primary/50">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Order #{order.order_number || order.id.substring(0, 8)}</h3>
                    <Badge variant="outline" className="capitalize text-xs py-0 h-5">{order.order_status}</Badge>
                    <Badge variant="secondary" className="capitalize text-xs py-0 h-5 bg-primary/10 text-primary hover:bg-primary/20">{order.payment_status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.cafes?.name && <span className="font-medium text-foreground mr-2">{order.cafes.name}</span>}
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  
                  <div className="mt-3 space-y-1">
                    {order.order_items?.map((item: any) => (
                      <p key={item.id} className="text-sm text-foreground">
                        <span className="text-muted-foreground">{item.quantity}x</span> {item.menu_items?.name || 'Item'}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="text-left md:text-right mt-2 md:mt-0">
                  <p className="text-lg font-semibold text-primary">{order.total_amount} ETB</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-border/50">
                {order.order_status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => cancelOrder(order.id)} className="text-destructive hover:text-destructive border-border">
                    <X className="w-4 h-4 mr-1" /> Cancel Order
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}