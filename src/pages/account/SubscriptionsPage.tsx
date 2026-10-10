import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee, CheckCircle2, Zap, ShieldCheck, Loader2,
  Calendar, CreditCard, Sparkles, AlertCircle, RefreshCw,
  XCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  description: string;
  price: number;
  billing_cycle: string;
  benefits: string[];
  is_active: boolean;
}

interface ActiveSubscription {
  id: string;
  user_id: string;
  plan_id?: string;
  plan_name: string;
  monthly_price: number;
  benefits: string[];
  starts_at: string;
  expires_at: string;
  next_billing_date?: string;
  active: boolean;
  status?: string;
  auto_renew?: boolean;
  payment_provider?: string;
}

export default function SubscriptionsPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  // 1. Fetch dynamic subscription plans from database
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    },
  });

  // 2. Fetch current customer active subscription from database
  const { data: currentSub, isLoading: subLoading, refetch: refetchSub } = useQuery<ActiveSubscription | null>({
    queryKey: ['active_subscription', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as ActiveSubscription | null;
    },
    enabled: !!userId,
  });

  // 3. Handle Chapa payment redirect verification (tx_ref callback)
  useEffect(() => {
    const txRef = searchParams.get('tx_ref');
    const status = searchParams.get('status');

    if (txRef && status === 'success' && userId) {
      setIsVerifying(true);
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('subscription-engine', {
            body: {
              action: 'verify_subscription_payment',
              payload: { tx_ref: txRef },
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          toast.success(data?.message || 'Subscription successfully activated!');
          await refetchSub();
          queryClient.invalidateQueries({ queryKey: ['active_subscription'] });
        } catch (err: any) {
          console.error('Verification error:', err);
          toast.error(err.message || 'Failed to verify subscription payment.');
        } finally {
          setIsVerifying(false);
          // Remove tx_ref from URL parameters
          searchParams.delete('tx_ref');
          searchParams.delete('status');
          setSearchParams(searchParams, { replace: true });
        }
      })();
    }
  }, [searchParams, userId, queryClient, refetchSub, setSearchParams]);

  // 4. Mutation to initialize Chapa payment server-side
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!userId) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setSubscribingPlanId(plan.id);
    try {
      const returnUrl = window.location.href;

      const { data, error } = await supabase.functions.invoke('subscription-engine', {
        body: {
          action: 'initialize_subscription_payment',
          payload: {
            plan_id: plan.id,
            return_url: returnUrl,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        toast.info('Redirecting to Chapa checkout...');
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received from gateway');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      toast.error(err.message || 'Failed to initialize subscription checkout');
      setSubscribingPlanId(null);
    }
  };

  // 5. Mutation to cancel subscription server-side
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!currentSub) return;
      const { data, error } = await supabase.functions.invoke('subscription-engine', {
        body: {
          action: 'cancel_subscription',
          payload: { subscription_id: currentSub.id },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Your subscription has been cancelled.');
      setCancelDialogOpen(false);
      refetchSub();
      queryClient.invalidateQueries({ queryKey: ['active_subscription'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel subscription.');
    },
  });

  const isLoading = plansLoading || subLoading;

  if (isLoading || isVerifying) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {isVerifying ? 'Verifying payment with Chapa...' : 'Loading subscription details...'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Coffee className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Coffee Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enjoy handcrafted daily coffees, exclusive microlot allocations, and VIP cafe benefits.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetchSub()} className="gap-2 self-start md:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Active Subscription Banner */}
      {currentSub ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 md:p-8 border border-primary/40 relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card shadow-sm"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Zap className="w-32 h-32 text-primary" />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-xs gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active Subscriber
                </Badge>
                {currentSub.auto_renew && (
                  <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                    Auto-Renewing
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mt-1">
                {currentSub.plan_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Billed at <span className="font-semibold text-foreground font-mono">{currentSub.monthly_price} ETB</span> / month via Chapa
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 text-xs"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel Subscription
              </Button>
            </div>
          </div>

          {/* Details & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-6">
            <div className="bg-background/60 p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Activated On
              </span>
              <p className="font-semibold text-sm text-foreground">
                {new Date(currentSub.starts_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>

            <div className="bg-background/60 p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Next Renewal Date
              </span>
              <p className="font-semibold text-sm text-foreground">
                {currentSub.expires_at
                  ? new Date(currentSub.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
                  : 'Continuous'
                }
              </p>
            </div>

            <div className="bg-background/60 p-4 rounded-xl border border-border space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Payment Gateway
              </span>
              <p className="font-semibold text-sm text-foreground capitalize">
                {currentSub.payment_provider || 'Chapa'} (Secured)
              </p>
            </div>
          </div>

          {/* Plan Entitlements */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Your Active Entitlements & Perks
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(currentSub.benefits || []).map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs md:text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="glass rounded-2xl p-8 border border-border text-center space-y-3 bg-muted/20">
          <Coffee className="w-12 h-12 text-primary mx-auto opacity-70" />
          <h2 className="text-xl font-bold font-heading text-foreground">No Active Subscription</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You do not currently have an active coffee pass. Select a plan below to unlock savings, free drinks, and exclusive roastery benefits.
          </p>
        </div>
      )}

      {/* Available Plans from Database */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Available Membership Plans</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transparent pricing with verified privileges. Checkout seamlessly via Chapa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentSub?.plan_name === plan.plan_name;
            const isSubscribing = subscribingPlanId === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-2xl p-6 border flex flex-col justify-between transition-all shadow-sm ${
                  isCurrent
                    ? 'border-primary shadow-md bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-bold font-heading text-foreground">{plan.plan_name}</h3>
                    {isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                        Current
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed min-h-[3rem]">
                    {plan.description}
                  </p>

                  <div className="py-2 border-y border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono text-foreground">{plan.price}</span>
                      <span className="text-xs font-medium text-muted-foreground">ETB / {plan.billing_cycle}</span>
                    </div>
                  </div>

                  {/* Benefits checklist */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-xs font-semibold text-foreground block">Included Privileges:</span>
                    <ul className="space-y-2">
                      {(plan.benefits || []).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border">
                  <Button
                    className="w-full gap-2 shadow-sm"
                    disabled={isCurrent || isSubscribing}
                    variant={isCurrent ? 'outline' : 'default'}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting to Chapa...
                      </>
                    ) : isCurrent ? (
                      'Current Active Plan'
                    ) : (
                      <>
                        Subscribe with Chapa <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading">
              Cancel Subscription?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-2">
              Are you sure you want to cancel your <strong>{currentSub?.plan_name}</strong>? You will lose your beverage discounts and subscriber perks at the end of the current billing cycle.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep My Plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="gap-2"
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}