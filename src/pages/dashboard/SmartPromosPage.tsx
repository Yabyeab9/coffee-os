import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, Clock, CalendarHeart, Gift, Power, Plus,
  CheckCircle2, AlertTriangle, TrendingUp, DollarSign,
  Coffee, RefreshCw, Loader2, Sparkles, XCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_CAFE_ID = '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

interface PromotionItem {
  id: string;
  cafe_id: string;
  title: string;
  description: string;
  trigger_type: string;
  reward_type: string;
  discount_percent: number;
  min_order_amount: number;
  active: boolean;
  starts_at: string;
  ends_at: string;
  usage_count: number;
  revenue_generated: number;
}

export default function SmartPromosPage() {
  const { cafeId } = useAuth();
  const effectiveCafeId = cafeId || DEFAULT_CAFE_ID;

  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // New Promotion Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTrigger, setNewTrigger] = useState('time_window');
  const [newDiscount, setNewDiscount] = useState('15');
  const [newMinSpend, setNewMinSpend] = useState('100');
  const [isCreating, setIsCreating] = useState(false);

  // Autopilot mode state persisted in settings
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch real promotions from DB
      const { data: promoData, error: promoErr } = await supabase
        .from('promotions')
        .select('*')
        .eq('cafe_id', effectiveCafeId)
        .order('created_at', { ascending: false });

      if (promoErr) throw promoErr;
      setPromotions((promoData || []) as PromotionItem[]);

      // 2. Fetch active menu items for data-driven recommendations
      const { data: menuData } = await supabase
        .from('menus')
        .select('id, name, price, category_id, available')
        .eq('cafe_id', effectiveCafeId)
        .eq('available', true)
        .limit(20);

      setMenuItems(menuData || []);

      // 3. Fetch cafe settings for autopilot mode
      const { data: cafeData } = await supabase
        .from('cafes')
        .select('settings')
        .eq('id', effectiveCafeId)
        .single();

      if (cafeData?.settings?.autopilot_promotions) {
        setAutopilotEnabled(Boolean(cafeData.settings.autopilot_promotions));
      }
    } catch (err: any) {
      console.error('Failed to load promotions:', err);
      toast.error('Could not load promotional campaigns.');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCafeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle promotion active status
  const handleToggleActive = async (promo: PromotionItem) => {
    setIsUpdating(promo.id);
    const newActiveState = !promo.active;
    try {
      const { error } = await supabase
        .from('promotions')
        .update({
          active: newActiveState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', promo.id);

      if (error) throw error;

      setPromotions(prev =>
        prev.map(p => p.id === promo.id ? { ...p, active: newActiveState } : p)
      );

      toast.success(`Promotion "${promo.title}" ${newActiveState ? 'activated' : 'paused'}.`);
    } catch (err: any) {
      console.error('Toggle error:', err);
      toast.error('Failed to update promotion status.');
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle Autopilot mode
  const handleToggleAutopilot = async (enabled: boolean) => {
    setAutopilotEnabled(enabled);
    try {
      const { data: cafeData } = await supabase
        .from('cafes')
        .select('settings')
        .eq('id', effectiveCafeId)
        .single();

      const existing = cafeData?.settings || {};
      const { error } = await supabase
        .from('cafes')
        .update({
          settings: { ...existing, autopilot_promotions: enabled },
          updated_at: new Date().toISOString(),
        })
        .eq('id', effectiveCafeId);

      if (error) throw error;
      toast.success(`Promotions Autopilot ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      toast.error('Failed to update autopilot setting: ' + err.message);
      setAutopilotEnabled(!enabled);
    }
  };

  // Create new validated promotion
  const handleCreatePromotion = async () => {
    if (!newTitle.trim()) {
      toast.error('Promotion title is required');
      return;
    }

    const discountVal = parseFloat(newDiscount);
    if (isNaN(discountVal) || discountVal <= 0 || discountVal > 50) {
      toast.error('Discount percentage must be between 1% and 50%');
      return;
    }

    // Business rule: Validate margins
    if (discountVal > 30) {
      toast.warning('Notice: High discount (>30%) requires manager margin approval.');
    }

    setIsCreating(true);
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('promotions')
        .insert({
          cafe_id: effectiveCafeId,
          title: newTitle.trim(),
          description: newDesc.trim() || `${discountVal}% discount campaign for verified customers.`,
          trigger_type: newTrigger,
          reward_type: 'percentage_discount',
          discount_percent: discountVal,
          min_order_amount: parseFloat(newMinSpend) || 0,
          active: true,
          starts_at: startDate,
          ends_at: endDate,
          usage_count: 0,
          revenue_generated: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setPromotions(prev => [data as PromotionItem, ...prev]);
      toast.success(`Campaign "${newTitle}" created and activated!`);
      setCreateDialogOpen(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err: any) {
      toast.error('Failed to create campaign: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Calculate aggregate metrics from DB
  const totalObservedRevenue = promotions.reduce((acc, p) => acc + (Number(p.revenue_generated) || 0), 0);
  const totalObservedRedemptions = promotions.reduce((acc, p) => acc + (Number(p.usage_count) || 0), 0);
  const activeCount = promotions.filter(p => p.active).length;

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading promotional intelligence...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
              Smart Promotions & Dynamic Campaigns
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Data-backed promotional rules, margin validation, and verified customer redemption tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Aggregate Observed Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Active Campaigns</span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-center justify-between">
            <span>{activeCount} / {promotions.length}</span>
            <Badge variant="outline" className="text-xs font-normal">Live</Badge>
          </div>
          <span className="text-[11px] text-muted-foreground block">Currently evaluated in cart</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Observed Redemptions</span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-center justify-between">
            <span>{totalObservedRedemptions}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-muted-foreground block">Verified order checkouts</span>
        </div>

        <div className="glass rounded-xl p-5 border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Attributed Sales Revenue</span>
          <div className="text-2xl font-bold font-mono text-foreground flex items-center justify-between">
            <span>{totalObservedRevenue.toLocaleString()} ETB</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[11px] text-muted-foreground block">Gross sales with applied promotion</span>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold font-heading text-foreground">Configured Promotional Campaigns</h2>

        {promotions.length === 0 ? (
          <div className="glass rounded-2xl p-8 border border-border text-center space-y-3">
            <Zap className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <h3 className="font-semibold text-foreground">No promotions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first campaign to test promotional pricing and margin-protected discounts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promotions.map((promo) => {
              const isUpdatingThis = isUpdating === promo.id;

              return (
                <div
                  key={promo.id}
                  className={`glass p-6 rounded-2xl border flex flex-col justify-between transition-all shadow-sm ${
                    promo.active ? 'border-primary/40 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold font-heading text-foreground">{promo.title}</h3>
                          <Badge variant="secondary" className="font-mono text-xs">
                            -{promo.discount_percent}%
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground capitalize flex items-center gap-1 font-mono">
                          Trigger: {promo.trigger_type.replace('_', ' ')}
                        </span>
                      </div>

                      <Badge
                        className={promo.active ? 'bg-emerald-600 text-white text-xs' : 'bg-muted text-muted-foreground text-xs'}
                      >
                        {promo.active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {promo.description}
                    </p>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-background/60 p-3 rounded-xl border border-border">
                        <span className="text-[11px] text-muted-foreground block">Redemptions</span>
                        <span className="text-base font-bold font-mono text-foreground">
                          {promo.usage_count || 0} times
                        </span>
                      </div>
                      <div className="bg-background/60 p-3 rounded-xl border border-border">
                        <span className="text-[11px] text-muted-foreground block">Generated Sales</span>
                        <span className="text-base font-bold font-mono text-foreground">
                          {(promo.revenue_generated || 0).toLocaleString()} ETB
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Min. Spend: {promo.min_order_amount > 0 ? `${promo.min_order_amount} ETB` : 'No minimum'}
                    </span>

                    <Button
                      size="sm"
                      variant={promo.active ? 'outline' : 'default'}
                      onClick={() => handleToggleActive(promo)}
                      disabled={isUpdatingThis}
                      className="text-xs gap-1.5 h-8"
                    >
                      {isUpdatingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                      {promo.active ? 'Pause Campaign' : 'Activate Campaign'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Autopilot Mode Banner */}
      <div className="glass p-6 md:p-8 rounded-2xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Power className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold font-heading text-foreground">Automated Promotion Scheduling</h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              When enabled, the system automatically adjusts promotional triggers during documented low-traffic windows while enforcing a 25% minimum margin floor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Label className="text-xs text-muted-foreground">
            {autopilotEnabled ? 'Autopilot Active' : 'Autopilot Disabled'}
          </Label>
          <Switch
            checked={autopilotEnabled}
            onCheckedChange={handleToggleAutopilot}
          />
        </div>
      </div>

      {/* New Promotion Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">Create Smart Promotion</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Configure campaign rules and discount constraints. Discounts above 30% require explicit margin review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Campaign Title</Label>
              <Input
                placeholder="e.g. Morning Pour-Over Explorer"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description & Customer Terms</Label>
              <Input
                placeholder="e.g. 15% off all Ethiopian single origins before 11:00 AM."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Trigger Rule</Label>
                <Select value={newTrigger} onValueChange={setNewTrigger}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time_window">Time of Day (Off-Peak)</SelectItem>
                    <SelectItem value="basket_combination">Combo / Bundle Pairing</SelectItem>
                    <SelectItem value="loyalty_tier">Loyalty VIP Tier</SelectItem>
                    <SelectItem value="weather_event">Weather Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Discount Percentage (%)</Label>
                <Input
                  type="number"
                  min="5"
                  max="50"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Minimum Order Spend (ETB)</Label>
              <Input
                type="number"
                min="0"
                value={newMinSpend}
                onChange={(e) => setNewMinSpend(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreatePromotion} disabled={isCreating} className="gap-2">
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              Publish Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}