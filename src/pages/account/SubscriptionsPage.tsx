import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Coffee, CheckCircle, CreditCard } from 'lucide-react';
import type { Subscription } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PLANS = [
  {
    name: 'Starter',
    price: 499,
    benefits: ['1 free coffee every week', '10% discount on all orders']
  },
  {
    name: 'Premium',
    price: 999,
    benefits: ['2 free drinks every week', 'Priority reservations', 'VIP rewards access', '15% discount on all orders']
  },
  {
    name: 'Business',
    price: 2499,
    benefits: ['Team ordering up to 5 people', 'Meeting room priority', 'Corporate invoices', 'Free delivery']
  }
];

export default function SubscriptionsPage() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      const { data } = await supabase.from('subscriptions').select('*').eq('user_id', profile.id).eq('active', true).maybeSingle();
      setSubscription(data);
    }
    load();
  }, [profile?.id]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Coffee Memberships</h1>
        <p className="text-muted-foreground">Subscribe and save with our exclusive membership plans.</p>
      </div>

      {subscription ? (
        <div className="glass rounded-xl p-8 border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full"></div>
          <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary border-none">Active Subscription</Badge>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 relative z-10">
            <div>
              <h2 className="text-3xl font-heading font-bold text-foreground mb-1">{subscription.plan_name} Plan</h2>
              <p className="text-muted-foreground">Renews on {new Date(subscription.expires_at || Date.now()).toLocaleDateString()}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-2xl font-bold text-primary">ETB {subscription.monthly_price} <span className="text-sm text-muted-foreground font-normal">/mo</span></p>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <h3 className="font-semibold text-foreground mb-3">Your Benefits:</h3>
            {(subscription.benefits as string[] || []).map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-6 border-t border-border/50">
            <Button variant="outline" onClick={() => {}} className="border-border text-primary hover:bg-secondary">Cancel Plan</Button>
            <Button onClick={() => {}} className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto">Upgrade Plan</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className="glass rounded-xl p-6 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-heading font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-primary">ETB {plan.price}</span>
                  <span className="text-muted-foreground mb-1">/mo</span>
                </div>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {plan.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{b}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => {}} className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                <CreditCard className="w-4 h-4 mr-2" /> Subscribe Now
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
