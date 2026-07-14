import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Award, Gift, ArrowRight } from 'lucide-react';
import type { LoyaltyPoint, LoyaltyTransaction } from '@/types/database';
import { Button } from '@/components/ui/button';

export default function LoyaltyPage() {
  const { profile } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyPoint | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  
  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      const [pointRes, txRes] = await Promise.all([
        supabase.from('loyalty_points').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('loyalty_transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(10)
      ]);
      setLoyalty(pointRes.data);
      setTransactions(txRes.data || []);
    }
    load();
  }, [profile?.id]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Loyalty & Rewards</h1>
        <p className="text-muted-foreground">Earn points with every purchase and unlock exclusive tier benefits.</p>
      </div>

      <div className="glass rounded-xl p-8 relative overflow-hidden border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">{loyalty?.tier || 'Bronze'} Member</p>
            <h2 className="text-4xl font-heading font-bold text-foreground">{loyalty?.points || 0} <span className="text-xl text-muted-foreground font-medium">pts</span></h2>
          </div>
          <Button onClick={() => {}} className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
            Redeem Rewards <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-heading font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent transactions.</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between glass p-4 rounded-xl border border-border">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.points > 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.description || tx.source}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`font-semibold ${tx.points > 0 ? 'text-primary' : 'text-foreground'}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
