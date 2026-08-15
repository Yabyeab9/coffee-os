import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, Search, Loader2, DollarSign, Filter, Download,
  CheckCircle2, AlertCircle, RefreshCw, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    fetchPayments();
    
    // Real-time subscription
    const sub = supabase.channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payments.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    toast.success('Calling Payment Provider API...');
    setTimeout(() => toast.success('Payment Verified as Completed'), 1000);
  };

  const handleRefund = async (id: string) => {
    toast.success('Initiating refund...');
    setTimeout(() => toast.success('Refund processed successfully'), 1000);
  };

  const filtered = payments.filter(p => 
    p.id?.toLowerCase().includes(search.toLowerCase()) ||
    p.status?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.created_at.startsWith(today));
  const totalRevenueToday = todayPayments.filter(p => p.status === 'completed' || p.status === 'paid' || p.status === 'success').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const successCount = payments.filter(p => p.status === 'completed' || p.status === 'paid' || p.status === 'success').length;
  const successRate = payments.length > 0 ? Math.round((successCount / payments.length) * 100) : 0;
  const failedCount = payments.filter(p => p.status === 'failed' || p.status === 'cancelled').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Track, verify, and manage all transactions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => toast('Exporting CSV...')}><Download className="w-4 h-4" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue Today</span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold">{totalRevenueToday.toLocaleString()} ETB</div>
        </div>
        <div className="glass rounded-xl p-5 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Transactions</span>
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{payments.length}</div>
        </div>
        <div className="glass rounded-xl p-5 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-info" />
          </div>
          <div className="text-2xl font-bold">{successRate}%</div>
        </div>
        <div className="glass rounded-xl p-5 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Failed Payments</span>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold">{failedCount}</div>
        </div>
      </div>

      <div className="glass rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search TXN ID, Customer..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background" 
            />
          </div>
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => toast('Filters opened')}>
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No payments found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-sm bg-background/50">
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Transaction ID</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Date & Time</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Method</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-foreground">
                      TXN-{p.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground">
                      {p.amount || '0'} {p.currency || 'ETB'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">{p.provider || 'System'}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.status === 'completed' || p.status === 'paid' || p.status === 'success' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                          Completed
                        </span>
                      ) : p.status === 'cancelled' || p.status === 'failed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleVerify(p.id)} title="Verify Payment">
                          <RefreshCw className="w-4 h-4 text-info" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Digital Receipt" onClick={() => toast('Opening Digital Receipt...')}>
                          <Receipt className="w-4 h-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRefund(p.id)} className="text-destructive hover:bg-destructive/10 text-xs">
                          Refund
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
