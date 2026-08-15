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

  const { data: currentSub, isLoading, isError } = useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).eq('active', true).single();
      return data;
    },
    enabled: !!userId
  });

  const availablePlans = [
    {
      id: 'plan_coffee_pass',
      plan_name: 'Coffee Pass',
      description: 'Perfect for daily coffee drinkers.',
      monthly_price: 1500,
      billing_cycle: 'month',
      benefits: ['1 free coffee daily', '10% off pastries', 'Free sizing upgrades']
    },
    {
      id: 'plan_premium',
      plan_name: 'Premium Member',
      description: 'For the true coffee connoisseur.',
      monthly_price: 3000,
      billing_cycle: 'month',
      benefits: ['Unlimited free coffee', '20% off food', 'Priority reservations', 'Exclusive events']
    }
  ];

  const subscribeMutation = useMutation({
    mutationFn: async (plan: any) => {
      // In a real app we'd redirect to checkout. For MVP, we insert directly
      const { data: cafes } = await supabase.from('cafes').select('id').limit(1);
      const cafeId = cafes?.[0]?.id;
      if (!cafeId) throw new Error("No cafe available");

      const { data, error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        cafe_id: cafeId,
        plan_name: plan.plan_name,
        monthly_price: plan.monthly_price,
        benefits: plan.benefits,
        active: true,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Successfully subscribed!');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to subscribe')
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!currentSub) return;
      const { data, error } = await supabase.from('subscriptions').update({ active: false }).eq('id', currentSub.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to cancel')
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded"></div>
        <div className="h-48 bg-muted rounded-xl mt-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="h-64 bg-muted rounded-xl"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto text-center">
        <p className="text-destructive">Failed to load subscriptions.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Coffee className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Coffee Subscriptions</h1>
      </div>
      <p className="text-muted-foreground">Subscribe and save on your daily coffee habits.</p>

      {currentSub ? (
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
              <h3 className="text-2xl font-bold">{currentSub.plan_name}</h3>
              <p className="text-muted-foreground">{currentSub.monthly_price} ETB / month</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mb-6">
            <p>Started: {new Date(currentSub.starts_at).toLocaleDateString()}</p>
            <p>Next billing: {currentSub.expires_at ? new Date(currentSub.expires_at).toLocaleDateString() : 'Auto-renewing'}</p>
          </div>
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Cancel Subscription
          </Button>
        </motion.div>
      ) : (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Active Subscription</h2>
          <p className="text-muted-foreground mb-6">You don't have an active coffee pass. Choose a plan below to start saving.</p>
        </div>
      )}

      <h2 className="text-2xl font-semibold mt-12 mb-6">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availablePlans.map((plan) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 border border-border flex flex-col">
            <h3 className="text-xl font-bold mb-2">{plan.plan_name}</h3>
            <p className="text-muted-foreground text-sm mb-4 h-10">{plan.description}</p>
            <div className="mb-6">
              <span className="text-3xl font-bold">{plan.monthly_price}</span>
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
              onClick={() => subscribeMutation.mutate(plan)}
              disabled={subscribeMutation.isPending || currentSub?.plan_name === plan.plan_name}
            >
              {currentSub?.plan_name === plan.plan_name ? 'Current Plan' : 'Subscribe Now'}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
