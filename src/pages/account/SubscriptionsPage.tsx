import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Coffee, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SubscriptionsPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ['subscription_plans'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: currentSub } = useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions').select('*, subscription_plans(*)').eq('user_id', userId).eq('status', 'active').single();
      return data;
    },
    enabled: !!userId
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke('subscription-engine', {
        body: { action: 'subscribe', payload: { plan_id: planId } }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Successfully subscribed!');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('subscription-engine', {
        body: { action: 'cancel' }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Coffee className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Coffee Subscriptions</h1>
      </div>
      <p className="text-muted-foreground">Subscribe and save on your daily coffee habits.</p>

      {currentSub && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 border border-primary/50 relative overflow-hidden bg-primary/5">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <Zap className="w-24 h-24 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Active Plan</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Coffee className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{currentSub.subscription_plans?.plan_name}</h3>
              <p className="text-muted-foreground">{currentSub.subscription_plans?.price} ETB / {currentSub.subscription_plans?.billing_cycle}</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mb-6">
            <p>Started: {new Date(currentSub.start_date).toLocaleDateString()}</p>
            <p>Next billing: {new Date(currentSub.next_billing_date).toLocaleDateString()}</p>
          </div>
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Cancel Subscription
          </Button>
        </motion.div>
      )}

      <h2 className="text-2xl font-semibold mt-12 mb-6">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 border border-border flex flex-col">
            <h3 className="text-xl font-bold mb-2">{plan.plan_name}</h3>
            <p className="text-muted-foreground text-sm mb-4 h-10">{plan.description}</p>
            <div className="mb-6">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground"> ETB / {plan.billing_cycle}</span>
            </div>
            
            <ul className="space-y-3 mb-8 flex-1">
              {(plan.benefits || []).map((benefit: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              className="w-full" 
              onClick={() => subscribeMutation.mutate(plan.id)}
              disabled={subscribeMutation.isPending || currentSub?.plan_id === plan.id}
            >
              {currentSub?.plan_id === plan.id ? 'Current Plan' : 'Subscribe Now'}
            </Button>
          </motion.div>
        ))}
        {plans?.length === 0 && (
          <div className="col-span-3 text-center p-8 text-muted-foreground glass rounded-xl border border-border">
            No subscription plans available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
