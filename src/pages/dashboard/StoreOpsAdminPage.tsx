import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Clock, AlertOctagon, TrendingUp, DollarSign,
  Coffee, Activity, Save, Loader2, CheckCircle2,
  Users, AlertTriangle, ShieldCheck, RefreshCw, XCircle,
  History, ArrowRight, Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const DEFAULT_CAFE_ID = '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

interface OperationalSettings {
  operational_status: 'open' | 'closed' | 'temporary_closure' | 'rush_hours';
  opening_time: string;
  closing_time: string;
  closure_enabled: boolean;
  closure_reason: string;
  wait_time_pickup: string;
  wait_time_dine_in: string;
  auto_accept_orders: boolean;
  dine_in_enabled: boolean;
  takeaway_enabled: boolean;
  delivery_enabled: boolean;
  audit_log?: Array<{
    timestamp: string;
    admin_id: string;
    action: string;
    details: string;
  }>;
}

const DEFAULT_SETTINGS: OperationalSettings = {
  operational_status: 'open',
  opening_time: '07:00',
  closing_time: '20:00',
  closure_enabled: false,
  closure_reason: 'Temporarily closed for scheduled maintenance. Back soon.',
  wait_time_pickup: '15',
  wait_time_dine_in: '25',
  auto_accept_orders: true,
  dine_in_enabled: true,
  takeaway_enabled: true,
  delivery_enabled: false,
};

export default function StoreOpsAdminPage() {
  const { cafeId, profile } = useAuth();
  const effectiveCafeId = cafeId || DEFAULT_CAFE_ID;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cafeName, setCafeName] = useState('Origin Coffee');
  const [settings, setSettings] = useState<OperationalSettings>(DEFAULT_SETTINGS);

  // Live indicators from authoritative tables
  const [liveMetrics, setLiveMetrics] = useState({
    todayRevenue: 0,
    todayOrdersCount: 0,
    activeOrderBacklog: 0,
    outOfStockCount: 0,
    activeStaffCount: 0,
    topSeller: 'Calculating...',
    topSellerQty: 0,
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [confirmClosureDialog, setConfirmClosureDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  // Load authoritative store data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Cafe Details & Settings
      const { data: cafeData, error: cafeErr } = await supabase
        .from('cafes')
        .select('name, settings')
        .eq('id', effectiveCafeId)
        .single();

      if (cafeErr) throw cafeErr;
      if (cafeData?.name) setCafeName(cafeData.name);

      const dbSettings = cafeData?.settings as Partial<OperationalSettings> | null;
      if (dbSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...dbSettings,
          closure_enabled: dbSettings.closure_enabled ?? (dbSettings.operational_status === 'closed' || dbSettings.operational_status === 'temporary_closure'),
        });
      }

      // 2. Compute Real Today's Metrics from authoritative DB tables
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Paid orders today
      const { data: todayOrders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total_amount, order_status, created_at')
        .eq('cafe_id', effectiveCafeId)
        .gte('created_at', todayStart.toISOString());

      if (ordersErr) console.error('Orders query error:', ordersErr);

      let rev = 0;
      let orderCount = 0;
      (todayOrders || []).forEach(o => {
        orderCount++;
        rev += Number(o.total_amount) || 0;
      });

      // Active Backlog (pending, confirmed, preparing)
      const { count: backlogCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('cafe_id', effectiveCafeId)
        .in('order_status', ['pending', 'confirmed', 'preparing']);

      // Out of Stock Menu Items
      const { count: oosCount } = await supabase
        .from('menus')
        .select('*', { count: 'exact', head: true })
        .eq('cafe_id', effectiveCafeId)
        .eq('available', false);

      // Staff Count on Duty
      const { count: staffCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('role', ['barista', 'staff', 'manager', 'admin', 'owner']);

      // Top Selling Item Today from order_items
      const { data: itemSales } = await supabase
        .from('order_items')
        .select('quantity, menus(name)')
        .limit(100);

      const itemTotals: Record<string, number> = {};
      (itemSales || []).forEach((row: any) => {
        const name = row.menus?.name;
        if (name) {
          itemTotals[name] = (itemTotals[name] || 0) + (row.quantity || 1);
        }
      });

      let topItem = 'None yet';
      let maxQty = 0;
      Object.entries(itemTotals).forEach(([name, qty]) => {
        if (qty > maxQty) {
          maxQty = qty;
          topItem = name;
        }
      });

      setLiveMetrics({
        todayRevenue: rev,
        todayOrdersCount: orderCount,
        activeOrderBacklog: backlogCount ?? 0,
        outOfStockCount: oosCount ?? 0,
        activeStaffCount: staffCount ?? 1,
        topSeller: topItem,
        topSellerQty: maxQty,
      });

      // 3. Load Audit Logs
      const { data: dbLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'cafes')
        .eq('record_id', effectiveCafeId)
        .order('created_at', { ascending: false })
        .limit(10);

      setAuditLogs(dbLogs || []);
    } catch (err: any) {
      console.error('Error loading store operations:', err);
      toast.error('Could not load authoritative store operations.');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCafeId]);

  useEffect(() => {
    loadData();

    // Realtime listener for order queue changes
    const channel = supabase
      .channel('store-ops-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Persist store configuration to database
  const saveConfiguration = async (updatedSettings: OperationalSettings, auditAction?: string) => {
    setIsSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from('cafes')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', effectiveCafeId);

      if (updateErr) throw updateErr;

      // Record audit trail
      const auditPayload = {
        table_name: 'cafes',
        record_id: effectiveCafeId,
        action: auditAction || 'UPDATE_STORE_SETTINGS',
        new_data: {
          operational_status: updatedSettings.operational_status,
          closure_enabled: updatedSettings.closure_enabled,
          opening_time: updatedSettings.opening_time,
          closing_time: updatedSettings.closing_time,
          wait_time_pickup: updatedSettings.wait_time_pickup,
        },
        user_id: profile?.id || null,
      };

      await supabase.from('audit_logs').insert(auditPayload);

      setSettings(updatedSettings);
      toast.success('Operational configuration persisted successfully.');
      loadData();
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChangeRequest = (newStatus: OperationalSettings['operational_status']) => {
    if (newStatus === 'closed' || newStatus === 'temporary_closure') {
      setPendingStatusChange(newStatus);
      setConfirmClosureDialog(true);
    } else {
      const updated = {
        ...settings,
        operational_status: newStatus,
        closure_enabled: false,
      };
      saveConfiguration(updated, `CHANGE_STATUS_TO_${newStatus.toUpperCase()}`);
    }
  };

  const confirmClosureAction = () => {
    if (!pendingStatusChange) return;
    const updated: OperationalSettings = {
      ...settings,
      operational_status: pendingStatusChange as any,
      closure_enabled: true,
    };
    saveConfiguration(updated, `STORE_CLOSURE_${pendingStatusChange.toUpperCase()}`);
    setConfirmClosureDialog(false);
    setPendingStatusChange(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading authoritative store control center...</span>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Operational (Open)</Badge>;
      case 'rush_hours':
        return <Badge className="bg-amber-600 text-white gap-1"><Activity className="w-3.5 h-3.5" /> Peak Rush Hours</Badge>;
      case 'temporary_closure':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Temporary Closure</Badge>;
      case 'closed':
      default:
        return <Badge variant="secondary" className="gap-1"><XCircle className="w-3.5 h-3.5" /> Closed</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Store className="w-7 h-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
              {cafeName} — Operational Control Center
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Authoritative store management, operating schedules, live order backlog, and emergency controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge(settings.operational_status)}
          <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Operational Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {liveMetrics.todayRevenue.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-muted-foreground block">{liveMetrics.todayOrdersCount} paid orders today</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Order Backlog Queue</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {liveMetrics.activeOrderBacklog}
          </div>
          <span className="text-[11px] text-muted-foreground block">Pending & prep in kitchen</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Inventory Stockouts</span>
            <Coffee className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {liveMetrics.outOfStockCount} items
          </div>
          <span className="text-[11px] text-muted-foreground block">Currently marked unavailable</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Staff on Duty</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-foreground">
            {liveMetrics.activeStaffCount} active
          </div>
          <span className="text-[11px] text-muted-foreground block">Baristas & shift managers</span>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Operating Status & Service Toggles */}
        <div className="glass rounded-2xl p-6 border border-border space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">Operational Status Mode</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Current Store State</Label>
              <Select
                value={settings.operational_status}
                onValueChange={(val) => handleStatusChangeRequest(val as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open (Accepting All Orders)</SelectItem>
                  <SelectItem value="rush_hours">Rush Hours (Higher Prep Estimates)</SelectItem>
                  <SelectItem value="temporary_closure">Temporary Closure (Pause Orders)</SelectItem>
                  <SelectItem value="closed">Closed (Scheduled Off-Hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <span className="text-xs font-semibold text-foreground block">Service Channel Availability</span>

              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">Dine-In Service</span>
                  <p className="text-xs text-muted-foreground">Allow table reservations & indoor seating</p>
                </div>
                <Switch
                  checked={settings.dine_in_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, dine_in_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">Pickup & Takeaway</span>
                  <p className="text-xs text-muted-foreground">Allow counter pickup orders</p>
                </div>
                <Switch
                  checked={settings.takeaway_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, takeaway_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">Auto-Accept Orders</span>
                  <p className="text-xs text-muted-foreground">Instantly move paid orders to 'preparing'</p>
                </div>
                <Switch
                  checked={settings.auto_accept_orders}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_accept_orders: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operating Hours & Lead Times */}
        <div className="glass rounded-2xl p-6 border border-border space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">Hours & Preparation Times</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Daily Operating Hours</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={settings.opening_time}
                  onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                  className="font-mono"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={settings.closing_time}
                  onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pickup Lead Time (min)</Label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.wait_time_pickup}
                  onChange={(e) => setSettings({ ...settings, wait_time_pickup: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Dine-In Lead Time (min)</Label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.wait_time_dine_in}
                  onChange={(e) => setSettings({ ...settings, wait_time_dine_in: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Emergency Closure Message */}
            <div className="pt-2">
              <Label className="text-xs font-medium">Public Status Notice</Label>
              <Input
                value={settings.closure_reason}
                onChange={(e) => setSettings({ ...settings, closure_reason: e.target.value })}
                placeholder="Notice displayed to customers when ordering is paused..."
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={() => saveConfiguration(settings, 'UPDATE_STORE_CONFIGURATION')}
          disabled={isSaving}
          className="gap-2 shadow-sm"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Persist Store Configuration
        </Button>
      </div>

      {/* Audit Trail Section */}
      <div className="glass rounded-2xl p-6 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Recent Operational Audit Trail</h3>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No prior state transitions recorded.</p>
        ) : (
          <div className="divide-y divide-border text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-mono font-medium text-foreground">{log.action}</span>
                  <p className="text-[11px] text-muted-foreground">
                    Status: {log.new_data?.operational_status || 'updated'}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Store Closure */}
      <Dialog open={confirmClosureDialog} onOpenChange={setConfirmClosureDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-destructive" />
              Confirm Store Closure
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-muted-foreground pt-2">
              Switching the store status to <strong>{pendingStatusChange}</strong> will immediately halt incoming orders and reservations on the customer mobile and web portals.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={() => setConfirmClosureDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClosureAction}>
              Confirm & Enforce Closure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}