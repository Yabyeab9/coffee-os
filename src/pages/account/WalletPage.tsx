import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Wallet, Gift, Tag, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';

export default function WalletPage() {
  const { profile } = useAuth();
  const userId = profile?.id;

  const { data: wallet } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      const { data: balance } = await supabase.from('wallet_balances').select('*').eq('user_id', userId).single();
      const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
      return { balance, transactions: txs };
    },
    enabled: !!userId
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Wallet className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Digital Wallet</h1>
      </div>
      <p className="text-muted-foreground">Manage your store credits, gift cards, and promotional balances.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 border border-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Store Credits</h3>
          <p className="text-3xl font-bold text-foreground">{wallet?.balance?.store_credits || 0} <span className="text-lg font-normal text-muted-foreground">ETB</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-6 border border-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center mb-4">
            <Gift className="w-6 h-6 text-info" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Gift Card Balance</h3>
          <p className="text-3xl font-bold text-foreground">{wallet?.balance?.gift_card_balance || 0} <span className="text-lg font-normal text-muted-foreground">ETB</span></p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.info('Redeem gift card feature coming soon')}>Redeem Code</Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6 border border-border flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center mb-4">
            <Tag className="w-6 h-6 text-warning" />
          </div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Promo Credits</h3>
          <p className="text-3xl font-bold text-foreground">{wallet?.balance?.promotional_credits || 0} <span className="text-lg font-normal text-muted-foreground">ETB</span></p>
        </motion.div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><RefreshCcw className="w-5 h-5" /> Recent Transactions</h3>
        <div className="glass rounded-xl p-2 border border-border">
          {(!wallet?.transactions || wallet.transactions.length === 0) ? (
            <div className="p-8 text-center text-muted-foreground">
              No recent wallet transactions.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {wallet.transactions.map((tx: any) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()} • {tx.balance_type}</p>
                  </div>
                  <div className={`font-semibold ${tx.transaction_type === 'credit' ? 'text-green-500' : 'text-foreground'}`}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}{tx.amount} ETB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
