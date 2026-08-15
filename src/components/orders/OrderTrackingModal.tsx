import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee, CheckCircle2, Clock, Loader2, X, Package, Star, ChevronRight,
  AlertCircle, PartyPopper,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface TrackingData {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  orders_ahead: number;
  estimated_min_minutes: number;
  estimated_max_minutes: number;
  total_items: number;
  created_at: string;
}

interface OrderTrackingModalProps {
  orderId: string | null;
  orderNumber: string;
  initialStatus: string;
  initialPaymentStatus: string;
  items?: { name: string; quantity: number }[];
  onClose: () => void;
}

const STATUS_STEPS = [
  { key: 'pending',            label: 'Order Received',       icon: Coffee },
  { key: 'payment_confirmed',  label: 'Payment Confirmed',    icon: CheckCircle2 },
  { key: 'preparing',          label: 'Preparing',            icon: Coffee },
  { key: 'ready',              label: 'Ready for Pickup',     icon: Package },
  { key: 'served',             label: 'Served',               icon: Star },
];

function getStepIndex(orderStatus: string, paymentStatus: string): number {
  if (orderStatus === 'served' || orderStatus === 'completed') return 4;
  if (orderStatus === 'ready') return 3;
  if (orderStatus === 'preparing') return 2;
  if (paymentStatus === 'paid') return 1;
  return 0;
}

export default function OrderTrackingModal({
  orderId, orderNumber, initialStatus, initialPaymentStatus, items, onClose
}: OrderTrackingModalProps) {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.rpc('get_order_queue_position', { p_order_id: orderId });
      if (error) throw error;
      setTracking(data as TrackingData);
    } catch (e: any) {
      setLoadError(e.message ?? 'Could not load tracking data.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Realtime subscription — live status & queue position updates
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order_tracking_${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, load]);

  const orderStatus  = tracking?.order_status  ?? initialStatus;
  const paymentStatus = tracking?.payment_status ?? initialPaymentStatus;
  const ordersAhead  = tracking?.orders_ahead ?? 0;
  const estMin       = tracking?.estimated_min_minutes ?? 0;
  const estMax       = tracking?.estimated_max_minutes ?? 0;
  const currentStep  = getStepIndex(orderStatus, paymentStatus);

  const isCancelled  = orderStatus === 'cancelled';
  const isCompleted  = orderStatus === 'completed' || orderStatus === 'served';
  const isReady      = orderStatus === 'ready';
  const isPreparing  = orderStatus === 'preparing';

  // Contextual status headline
  const headline = isCancelled     ? 'Order Cancelled'
    : isCompleted                  ? 'Order Completed ✓'
    : isReady                      ? 'Your order is ready! 🎉'
    : isPreparing && ordersAhead === 0 ? 'Preparing now ☕'
    : isPreparing                  ? `Preparing your order`
    : ordersAhead === 0            ? "You're next 🎉"
    : ordersAhead === 1            ? '1 order ahead of you'
    : `${ordersAhead} orders ahead of you`;

  const subline = isCancelled      ? 'This order was cancelled.'
    : isCompleted                  ? 'Thank you for your order.'
    : isReady                      ? 'Please collect your order at the counter.'
    : isPreparing                  ? 'Our baristas are working on your order.'
    : paymentStatus !== 'paid'     ? 'Waiting for payment confirmation.'
    : '';

  return (
    <Dialog open={!!orderId} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm p-0 overflow-hidden rounded-2xl border-border/60 bg-card">

        {/* Header */}
        <div className="relative bg-foreground px-6 pt-6 pb-8 text-background overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <Coffee className="absolute -right-8 -top-8 w-40 h-40" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-background/60 hover:text-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-[10px] uppercase tracking-widest text-background/50 mb-1">Order Tracking</p>
          <p className="font-mono text-sm font-semibold text-background/80 mb-3">{orderNumber}</p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-background/70">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading tracking…</span>
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-2 text-background/70">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-sm">{loadError}</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={headline}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold text-background leading-snug">{headline}</h2>
                {subline && <p className="text-sm text-background/60 mt-1">{subline}</p>}

                {/* Estimated wait badge */}
                {!isCancelled && !isCompleted && !isReady && estMax > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-background/10 rounded-full px-3 py-1 text-sm text-background/80">
                    <Clock className="w-3.5 h-3.5" />
                    ~{estMin}–{estMax} min estimated wait
                  </div>
                )}

                {/* Orders ahead indicator */}
                {!isCancelled && !isCompleted && !isReady && ordersAhead > 0 && (
                  <div className="mt-2 text-sm text-background/50">
                    {ordersAhead} active order{ordersAhead !== 1 ? 's' : ''} ahead of yours
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Status Timeline */}
          {!isCancelled && (
            <div className="space-y-0">
              {STATUS_STEPS.map((step, idx) => {
                const done    = idx < currentStep;
                const active  = idx === currentStep;
                const pending = idx > currentStep;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        done   ? 'bg-primary text-primary-foreground' :
                        active ? 'bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-background' :
                                 'bg-muted text-muted-foreground'
                      }`}>
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : active ? (
                          isLoading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <step.icon className="w-3.5 h-3.5" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                        )}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`w-px h-5 mt-0.5 transition-colors duration-500 ${done ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                    <div className={`pb-0 pt-1 min-w-0 ${idx < STATUS_STEPS.length - 1 ? 'mb-0' : ''}`}>
                      <p className={`text-sm leading-tight transition-colors duration-300 ${
                        done   ? 'text-primary font-medium' :
                        active ? 'text-foreground font-semibold' :
                                 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isCancelled && (
            <div className="text-center py-4 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-destructive/50" />
              <p className="text-sm text-muted-foreground">This order was cancelled.</p>
            </div>
          )}

          {isReady && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-primary/5 rounded-xl p-4 border border-primary/20 text-center"
            >
              <PartyPopper className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground">Your order is ready!</p>
              <p className="text-xs text-muted-foreground mt-1">Please collect at the counter.</p>
            </motion.div>
          )}

          {/* Order summary */}
          {items && items.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Items</p>
              <div className="space-y-1">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{it.name}</span>
                    <Badge variant="secondary" className="text-[10px]">×{it.quantity}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment badge */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Payment</span>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                paymentStatus === 'paid' || paymentStatus === 'completed'
                  ? 'border-emerald-400/40 text-emerald-600 bg-emerald-50'
                  : paymentStatus === 'failed'
                  ? 'border-destructive/40 text-destructive'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {paymentStatus === 'completed' ? 'Paid' : paymentStatus}
            </Badge>
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}