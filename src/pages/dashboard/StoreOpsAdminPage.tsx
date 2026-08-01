import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'motion/react';
import { Settings, Clock, AlertOctagon, TrendingUp, DollarSign, Coffee, Activity, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function StoreOpsAdminPage() {
  const { cafeId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [closureEnabled, setClosureEnabled] = useState(false);
  const [waitTimes, setWaitTimes] = useState({ pickup: '15', dineIn: '25' });
  const [stats, setStats] = useState({
    revenue: 0,
    popularItem: 'No orders yet',
    popularItemOrders: 0,
    peakTraffic: 'N/A'
  });

  useEffect(() => {
    async function loadData() {
      if (!cafeId) return;
      
      // Load cafe settings
      const { data: cafeData } = await supabase.from('cafes').select('settings').eq('id', cafeId).single();
      if (cafeData?.settings) {
        const settings: any = cafeData.settings;
        if (settings.closure_enabled !== undefined) setClosureEnabled(settings.closure_enabled);
        if (settings.wait_time_pickup !== undefined) setWaitTimes(prev => ({ ...prev, pickup: settings.wait_time_pickup }));
        if (settings.wait_time_dine_in !== undefined) setWaitTimes(prev => ({ ...prev, dineIn: settings.wait_time_dine_in }));
      }

      // Load analytics for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at, order_items(quantity, menus(name))')
        .eq('cafe_id', cafeId)
        .eq('payment_status', 'paid')
        .gte('created_at', todayStart.toISOString());

      if (orders && orders.length > 0) {
        let rev = 0;
        const itemsMap: Record<string, number> = {};
        const hoursMap: Record<number, number> = {};

        orders.forEach(o => {
          rev += (o.total_amount || 0);
          
          // Peak traffic hour
          const hour = new Date(o.created_at).getHours();
          hoursMap[hour] = (hoursMap[hour] || 0) + 1;

          // Items
          o.order_items?.forEach((oi: any) => {
            const name = oi.menus?.name || 'Unknown Item';
            itemsMap[name] = (itemsMap[name] || 0) + oi.quantity;
          });
        });

        // Most popular item
        let popItem = 'No orders yet';
        let popMax = 0;
        Object.entries(itemsMap).forEach(([name, count]) => {
          if (count > popMax) { popMax = count; popItem = name; }
        });

        // Peak traffic
        let peakHour = -1;
        let peakCount = 0;
        Object.entries(hoursMap).forEach(([h, count]) => {
          if (count > peakCount) { peakCount = count; peakHour = parseInt(h); }
        });

        setStats({
          revenue: rev,
          popularItem: popItem,
          popularItemOrders: popMax,
          peakTraffic: peakHour >= 0 ? `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour+1).toString().padStart(2, '0')}:00` : 'N/A'
        });
      }
      setIsLoading(false);
    }
    loadData();
  }, [cafeId]);

  const handleSave = async () => {
    if (!cafeId) return;
    setIsSaving(true);
    try {
      const { data: cafeData } = await supabase.from('cafes').select('settings').eq('id', cafeId).single();
      const currentSettings = cafeData?.settings || {};
      
      const newSettings = {
        ...currentSettings,
        closure_enabled: closureEnabled,
        wait_time_pickup: waitTimes.pickup,
        wait_time_dine_in: waitTimes.dineIn
      };

      const { error } = await supabase.from('cafes').update({ settings: newSettings }).eq('id', cafeId);
      if (error) throw error;
      
      toast.success('Store operations updated successfully');
    } catch (err: any) {
      toast.error('Failed to update operations: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-1">Store Operations</h1>
        <p className="text-muted-foreground text-sm">Manage daily analytics and emergency settings.</p>
      </div>

      {/* Quick Analytics Module */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Quick Analytics (Today)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Gross Revenue</p>
            <h3 className="text-2xl font-bold">{stats.revenue.toLocaleString()} ETB</h3>
          </div>
          
          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Coffee className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Most Popular Item</p>
            <h3 className="text-2xl font-bold">{stats.popularItem}</h3>
            <p className="text-xs text-muted-foreground mt-1">{stats.popularItemOrders} orders today</p>
          </div>

          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Activity className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Peak Traffic</p>
            <h3 className="text-2xl font-bold">{stats.peakTraffic}</h3>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Wait Times & Hours */}
        <div className="glass rounded-xl p-6 border border-border/50 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-4">
            <Clock className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold text-lg">Wait Times & Hours</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Est. (mins)</Label>
              <Input type="number" value={waitTimes.pickup} onChange={e => setWaitTimes({ ...waitTimes, pickup: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Dine-in Est. (mins)</Label>
              <Input type="number" value={waitTimes.dineIn} onChange={e => setWaitTimes({ ...waitTimes, dineIn: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <Label>Operating Hours (Today)</Label>
            <div className="flex gap-4">
              <Input type="time" defaultValue="07:00" />
              <span className="flex items-center text-muted-foreground">to</span>
              <Input type="time" defaultValue="20:00" />
            </div>
          </div>
        </div>

        {/* Emergency Controls */}
        <div className="glass rounded-xl p-6 border border-border/50 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-4">
            <AlertOctagon className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-lg text-destructive">Emergency Controls</h3>
          </div>
          
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground text-base font-semibold">Global Store Closure</Label>
                <p className="text-sm text-muted-foreground mt-1">Suspend all incoming orders and reservations.</p>
              </div>
              <Switch checked={closureEnabled} onCheckedChange={setClosureEnabled} className="data-[state=checked]:bg-destructive" />
            </div>

            {closureEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2">
                <Label>Closure Reason Message (Public)</Label>
                <Input defaultValue="Temporarily closed due to emergency. We will be back soon." />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
