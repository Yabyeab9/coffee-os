import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, DollarSign, Loader2 } from 'lucide-react';

export default function ExecDashboardsPage() {
  const [stats, setStats] = useState<{revenue: number, customers: number, orders: number} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: orders } = await supabase.from('orders').select('total_amount, user_id');
      const rev = (orders || []).reduce((a, b) => a + (Number(b.total_amount) || 0), 0);
      const cust = new Set((orders || []).map(o => o.user_id)).size;
      setStats({ revenue: rev, customers: cust, orders: (orders || []).length });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">High-level real-time performance derived from orders.</p>
        </div>
      </div>
      {loading || !stats ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-4"><span className="font-semibold text-muted-foreground">Total Revenue</span><DollarSign className="w-5 h-5 text-green-500" /></div>
            <div className="text-3xl font-bold">{stats.revenue.toLocaleString()} ETB</div>
          </div>
          <div className="glass p-6 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-4"><span className="font-semibold text-muted-foreground">Unique Customers</span><Users className="w-5 h-5 text-blue-500" /></div>
            <div className="text-3xl font-bold">{stats.customers.toLocaleString()}</div>
          </div>
          <div className="glass p-6 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-4"><span className="font-semibold text-muted-foreground">Total Orders</span><LayoutDashboard className="w-5 h-5 text-primary" /></div>
            <div className="text-3xl font-bold">{stats.orders.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
