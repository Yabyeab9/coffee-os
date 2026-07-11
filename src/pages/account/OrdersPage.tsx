import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Coffee, ChevronRight, X } from 'lucide-react';
import type { Order } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OrdersPage() {
  const { profile, cafeId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!profile?.id || !cafeId) return;
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile.id)
        .eq('cafe_id', cafeId)
        .order('created_at', { ascending: false });
      
      setOrders(data || []);
      setIsLoading(false);
    }
    fetchOrders();
  }, [profile?.id, cafeId]);

  const cancelOrder = async (orderId: string) => {
    await supabase.from('orders').update({ order_status: 'cancelled' }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: 'cancelled' } : o));
  };

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{order.order_number}</h3>
                    <Badge variant="outline" className="capitalize text-xs py-0 h-5">{order.order_status}</Badge>
                    <Badge variant="secondary" className="capitalize text-xs py-0 h-5">{order.payment_status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-lg font-semibold text-primary">ETB {order.total_amount}</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-border/50">
                {order.order_status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => cancelOrder(order.id)} className="text-destructive hover:text-destructive border-border">
                    <X className="w-4 h-4 mr-1" /> Cancel Order
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => {}} className="ml-auto bg-primary/10 text-primary border-transparent hover:bg-primary/20">
                  View Details <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}