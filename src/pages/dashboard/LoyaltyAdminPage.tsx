import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Heart, Plus, Trash2, Loader2, Gift, Star, CreditCard, Users, TrendingUp, Award, CheckCircle2 } from 'lucide-react';

// ── Types (declared at module level, not inside the component) ─────────────────
interface LoyaltySettings {
  id: string;
  points_per_order: number;
  points_per_reservation: number;
  points_per_referral: number;
  points_per_currency_unit: number;
  currency_per_reward_unit: number;
  reward_unit_cost_points: number;
  minimum_redemption_points: number;
  max_redemption_per_order: number;
  redemption_expiry_days: number;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LoyaltyTier {
  id: string;
  tier_name: string;
  tier_level: number;
  point_threshold: number;
  multiplier: number;
}

interface LoyaltyReward {
  id: string;
  cafe_id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  discount_value: number | null;
  is_active: boolean;
  created_at: string;
}

interface RedemptionRow {
  id: string;
  user_id: string;
  points_spent: number;
  etb_value: number;
  status: string;
  created_at: string;
  users?: { full_name: string | null; email: string };
}

interface SubscriptionPlan {
  id: string;
  cafe_id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  is_active: boolean;
  created_at: string;
}

// ── Reward form defaults ───────────────────────────────────────────────────────
const EMPTY_REWARD = {
  name: '',
  description: '',
  points_required: 100,
  reward_type: 'discount',
  discount_value: 10,
  is_active: true,
};

const EMPTY_PLAN = {
  name: '',
  description: '',
  price_monthly: 0,
  price_yearly: null as number | null,
  features: [] as string[],
  is_active: true,
};

export default function LoyaltyAdminPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const cafeId = profile?.cafe_id;

  // ── Loyalty Settings ───────────────────────────────────────────────────────
  const { data: loyaltySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['loyalty_settings', cafeId],
    queryFn: async () => {
      if (!cafeId) return null;
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('cafe_id', cafeId)
        .single();
      if (error) throw error;
      return data as LoyaltySettings;
    },
    enabled: !!cafeId,
  });

  const [settingsForm, setSettingsForm] = useState<Partial<LoyaltySettings>>({});
  const [settingsDirty, setSettingsDirty] = useState(false);

  // Populate form once settings load
  useEffect(() => {
    if (loyaltySettings && !settingsDirty) {
      setSettingsForm({
        points_per_order: loyaltySettings.points_per_order,
        points_per_reservation: loyaltySettings.points_per_reservation,
        points_per_referral: loyaltySettings.points_per_referral ?? 100,
        reward_unit_cost_points: loyaltySettings.reward_unit_cost_points,
        minimum_redemption_points: loyaltySettings.minimum_redemption_points,
        currency_per_reward_unit: loyaltySettings.currency_per_reward_unit,
        max_redemption_per_order: loyaltySettings.max_redemption_per_order ?? 500,
        redemption_expiry_days: loyaltySettings.redemption_expiry_days ?? 365,
      });
    }
  }, [loyaltySettings, settingsDirty]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!loyaltySettings?.id) throw new Error('Settings not found');
      const { error } = await supabase
        .from('loyalty_settings')
        .update({ ...settingsForm, updated_at: new Date().toISOString() })
        .eq('id', loyaltySettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Loyalty settings saved');
      setSettingsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['loyalty_settings', cafeId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  function setField(key: keyof LoyaltySettings, val: number) {
    setSettingsForm(prev => ({ ...prev, [key]: val }));
    setSettingsDirty(true);
  }

  // ── Tiers ─────────────────────────────────────────────────────────────────
  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['loyalty_tiers', cafeId],
    queryFn: async () => {
      if (!cafeId) return [];
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .eq('cafe_id', cafeId)
        .order('tier_level', { ascending: true });
      if (error) throw error;
      return data as LoyaltyTier[];
    },
    enabled: !!cafeId,
  });

  const [newTier, setNewTier] = useState({ name: '', level: 1, threshold: 100, multiplier: 1.0 });

  const addTierMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('loyalty_tiers').insert({
        cafe_id: cafeId,
        tier_name: newTier.name,
        tier_level: newTier.level,
        point_threshold: newTier.threshold,
        multiplier: newTier.multiplier,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tier added');
      queryClient.invalidateQueries({ queryKey: ['loyalty_tiers', cafeId] });
      setNewTier({ name: '', level: 1, threshold: 100, multiplier: 1.0 });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loyalty_tiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tier removed');
      queryClient.invalidateQueries({ queryKey: ['loyalty_tiers', cafeId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Rewards ───────────────────────────────────────────────────────────────
  const { data: rewards } = useQuery({
    queryKey: ['loyalty_rewards', cafeId],
    queryFn: async () => {
      if (!cafeId) return [];
      // loyalty_redemptions table holds per-customer redemptions; for reward catalog
      // we use a simple table. If it doesn't exist yet we return empty.
      const { data, error } = await supabase
        .from('loyalty_redemptions')
        .select('*, users(full_name, email)')
        .eq('cafe_id', cafeId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        // Table may not have cafe_id index yet — tolerate
        return [] as RedemptionRow[];
      }
      return (data ?? []) as RedemptionRow[];
    },
    enabled: !!cafeId,
  });

  // Reward catalog — stored in ai_opportunities temporarily until a dedicated rewards table is added
  const [rewardDialog, setRewardDialog] = useState(false);
  const [rewardForm, setRewardForm] = useState(EMPTY_REWARD);
  const [rewardList, setRewardList] = useState<(typeof EMPTY_REWARD & { id: string; created_at: string })[]>([]);
  const [rewardLoading, setRewardLoading] = useState(false);

  // Load reward catalog from localStorage as ephemeral config (no dedicated table in schema)
  // stored as JSON in cafe's settings column — persisted server-side
  const { data: cafeSettings, refetch: refetchCafe } = useQuery({
    queryKey: ['cafe_settings_loyalty', cafeId],
    queryFn: async () => {
      if (!cafeId) return null;
      const { data } = await supabase.from('cafes').select('settings').eq('id', cafeId).single();
      return data?.settings as any;
    },
    enabled: !!cafeId,
  });

  const catalogRewards: typeof rewardList = cafeSettings?.loyalty_rewards ?? [];

  const saveReward = async () => {
    if (!rewardForm.name || !cafeId) return;
    setRewardLoading(true);
    const existing: any[] = cafeSettings?.loyalty_rewards ?? [];
    const newEntry = { ...rewardForm, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const updated = [...existing, newEntry];
    const { error } = await supabase
      .from('cafes')
      .update({ settings: { ...(cafeSettings ?? {}), loyalty_rewards: updated } })
      .eq('id', cafeId);
    setRewardLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Reward saved');
    setRewardDialog(false);
    setRewardForm(EMPTY_REWARD);
    refetchCafe();
  };

  const deleteReward = async (id: string) => {
    if (!cafeId) return;
    const existing: any[] = cafeSettings?.loyalty_rewards ?? [];
    const updated = existing.filter(r => r.id !== id);
    const { error } = await supabase
      .from('cafes')
      .update({ settings: { ...(cafeSettings ?? {}), loyalty_rewards: updated } })
      .eq('id', cafeId);
    if (error) { toast.error(error.message); return; }
    toast.success('Reward removed');
    refetchCafe();
  };

  const toggleRewardActive = async (id: string, current: boolean) => {
    if (!cafeId) return;
    const existing: any[] = cafeSettings?.loyalty_rewards ?? [];
    const updated = existing.map(r => r.id === id ? { ...r, is_active: !current } : r);
    await supabase
      .from('cafes')
      .update({ settings: { ...(cafeSettings ?? {}), loyalty_rewards: updated } })
      .eq('id', cafeId);
    refetchCafe();
  };

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const [planDialog, setPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [featureInput, setFeatureInput] = useState('');
  const [planSaving, setPlanSaving] = useState(false);

  const catalogPlans: any[] = cafeSettings?.subscription_plans ?? [];

  const savePlan = async () => {
    if (!planForm.name || !cafeId) return;
    setPlanSaving(true);
    const existing: any[] = cafeSettings?.subscription_plans ?? [];
    const newPlan = { ...planForm, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const updated = [...existing, newPlan];
    const { error } = await supabase
      .from('cafes')
      .update({ settings: { ...(cafeSettings ?? {}), subscription_plans: updated } })
      .eq('id', cafeId);
    setPlanSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Plan saved');
    setPlanDialog(false);
    setPlanForm(EMPTY_PLAN);
    setFeatureInput('');
    refetchCafe();
  };

  const deletePlan = async (id: string) => {
    if (!cafeId) return;
    const existing: any[] = cafeSettings?.subscription_plans ?? [];
    const updated = existing.filter(p => p.id !== id);
    await supabase
      .from('cafes')
      .update({ settings: { ...(cafeSettings ?? {}), subscription_plans: updated } })
      .eq('id', cafeId);
    refetchCafe();
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const { data: loyaltyStats } = useQuery({
    queryKey: ['loyalty_stats', cafeId],
    queryFn: async () => {
      if (!cafeId) return null;
      const [pointsRes, redemptionsRes] = await Promise.all([
        supabase.from('loyalty_points').select('current_points, total_earned, total_redeemed').eq('cafe_id', cafeId),
        supabase.from('loyalty_redemptions').select('points_spent, etb_value').eq('cafe_id', cafeId),
      ]);
      const members = pointsRes.data?.length ?? 0;
      const totalPoints = pointsRes.data?.reduce((s: number, r: any) => s + (r.current_points ?? 0), 0) ?? 0;
      const totalEarned = pointsRes.data?.reduce((s: number, r: any) => s + (r.total_earned ?? 0), 0) ?? 0;
      const totalRedemptions = redemptionsRes.data?.length ?? 0;
      const totalEtbValue = redemptionsRes.data?.reduce((s: number, r: any) => s + (Number(r.etb_value) ?? 0), 0) ?? 0;
      return { members, totalPoints, totalEarned, totalRedemptions, totalEtbValue };
    },
    enabled: !!cafeId,
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-2">
            <Heart className="w-8 h-8 text-primary" /> Loyalty & Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">Configure reward tiers, redeemable rewards, and subscription plans</p>
        </div>
      </div>

      {/* Stats row */}
      {loyaltyStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Members', value: loyaltyStats.members, icon: Users },
            { label: 'Points in Circulation', value: loyaltyStats.totalPoints.toLocaleString(), icon: Star },
            { label: 'Total Earned', value: loyaltyStats.totalEarned.toLocaleString(), icon: TrendingUp },
            { label: 'Redemptions', value: loyaltyStats.totalRedemptions, icon: Award },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="tiers">
        <TabsList className="mb-6">
          <TabsTrigger value="tiers">Tiers &amp; Points</TabsTrigger>
          <TabsTrigger value="rewards">Rewards Catalog</TabsTrigger>
          <TabsTrigger value="redemptions">Redemption Log</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
        </TabsList>

        {/* ── Tiers ──────────────────────────────────────────────────────── */}
        <TabsContent value="tiers">
          {/* ── Points Configuration ────────────────────────────────────── */}
          <div className="glass rounded-xl p-6 border border-border mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Points Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">How customers earn and redeem points</p>
              </div>
              {settingsDirty && (
                <Button
                  size="sm"
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                  className="h-8 text-xs"
                >
                  {saveSettingsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                  Save Changes
                </Button>
              )}
            </div>

            {settingsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { key: 'points_per_order' as const,            label: 'Points per Order',             hint: 'Awarded when an order is completed' },
                  { key: 'points_per_reservation' as const,      label: 'Points per Reservation',       hint: 'Awarded when a reservation is honoured' },
                  { key: 'points_per_referral' as const,         label: 'Points per Referral',          hint: 'Awarded when a referred user signs up' },
                  { key: 'reward_unit_cost_points' as const,     label: 'Points per Reward Unit',       hint: 'Points needed to unlock 1 reward unit (1 ETB)' },
                  { key: 'minimum_redemption_points' as const,   label: 'Minimum to Redeem',            hint: 'Minimum points balance required to redeem anything' },
                  { key: 'currency_per_reward_unit' as const,    label: 'ETB Value per Reward Unit',    hint: 'ETB value of each redeemed reward unit' },
                  { key: 'max_redemption_per_order' as const,    label: 'Max Redemption per Order (ETB)', hint: 'Cap how much loyalty credit can offset a single order' },
                  { key: 'redemption_expiry_days' as const,      label: 'Redemption Code Expiry (days)', hint: 'How many days before an unused redemption code expires' },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{field.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={field.key === 'currency_per_reward_unit' ? '0.01' : '1'}
                      value={settingsForm[field.key] ?? ''}
                      onChange={e => setField(field.key, field.key === 'currency_per_reward_unit' ? parseFloat(e.target.value) : parseInt(e.target.value))}
                      className="bg-background/50"
                    />
                    <p className="text-[11px] text-muted-foreground">{field.hint}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Tiers list ──────────────────────────────────────────────── */}
          <div className="glass rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Loyalty Tiers</h2>
            <div className="space-y-3 mb-8">
              {tiersLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (tiers ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No tiers configured yet. Add your first tier below.</p>
              ) : (
                (tiers ?? []).map(tier => (
                  <div key={tier.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-sm">{tier.tier_level}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{tier.tier_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tier.point_threshold.toLocaleString()} pts required · {tier.multiplier}× multiplier
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTierMutation.mutate(tier.id)}
                      disabled={deleteTierMutation.isPending}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-md font-semibold mb-4">Add New Tier</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tier Name</Label>
                  <Input value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} placeholder="e.g. Gold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Level</Label>
                  <Input type="number" min={1} value={newTier.level} onChange={e => setNewTier({ ...newTier, level: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Threshold Points</Label>
                  <Input type="number" min={0} value={newTier.threshold} onChange={e => setNewTier({ ...newTier, threshold: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Point Multiplier</Label>
                  <Input type="number" step="0.1" min={1} value={newTier.multiplier} onChange={e => setNewTier({ ...newTier, multiplier: parseFloat(e.target.value) })} />
                </div>
              </div>
              <Button
                onClick={() => addTierMutation.mutate()}
                className="mt-4"
                disabled={!newTier.name || addTierMutation.isPending}
              >
                {addTierMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Tier
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Rewards Catalog ─────────────────────────────────────────────── */}
        <TabsContent value="rewards">
          <div className="glass rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Redeemable Rewards</h2>
              <Button size="sm" onClick={() => { setRewardForm(EMPTY_REWARD); setRewardDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Reward
              </Button>
            </div>

            {catalogRewards.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Gift className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No rewards configured yet.</p>
                <p className="text-xs mt-1">Rewards let customers redeem points for discounts or free items.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catalogRewards.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">{r.name}</p>
                          <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                            {r.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {r.points_required.toLocaleString()} pts ·
                          {r.reward_type === 'discount' ? ` ${r.discount_value} ETB off` : ` ${r.reward_type}`}
                        </p>
                        {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Button variant="ghost" size="sm" onClick={() => toggleRewardActive(r.id, r.is_active)} className="h-8 w-8 p-0">
                        <CheckCircle2 className={`w-4 h-4 ${r.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteReward(r.id)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Redemption Log ───────────────────────────────────────────────── */}
        <TabsContent value="redemptions">
          <div className="glass rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Redemption History</h2>
            {!rewards || rewards.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No redemptions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2 pr-4">Customer</th>
                      <th className="text-left py-2 pr-4">Points Spent</th>
                      <th className="text-left py-2 pr-4">Value (ETB)</th>
                      <th className="text-left py-2 pr-4">Status</th>
                      <th className="text-left py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(rewards as RedemptionRow[]).map(r => (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 pr-4 font-medium">{(r as any).users?.full_name ?? (r as any).users?.email ?? r.user_id.slice(0, 8)}</td>
                        <td className="py-3 pr-4">{r.points_spent.toLocaleString()}</td>
                        <td className="py-3 pr-4">{Number(r.etb_value).toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={r.status === 'used' ? 'default' : r.status === 'expired' ? 'destructive' : 'secondary'} className="text-xs">
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Subscription Plans ───────────────────────────────────────────── */}
        <TabsContent value="subscriptions">
          <div className="glass rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Subscription Plans</h2>
              <Button size="sm" onClick={() => { setPlanForm(EMPTY_PLAN); setFeatureInput(''); setPlanDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Plan
              </Button>
            </div>

            {catalogPlans.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No subscription plans configured yet.</p>
                <p className="text-xs mt-1">Subscription plans offer customers recurring benefits for a monthly fee.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogPlans.map((plan: any) => (
                  <div key={plan.id} className="border border-border rounded-xl p-5 bg-background/50 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        <p className="text-2xl font-bold text-primary mt-1">ETB {plan.price_monthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        {plan.price_yearly && (
                          <p className="text-xs text-muted-foreground">ETB {plan.price_yearly}/yr</p>
                        )}
                      </div>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {plan.description && <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>}
                    {plan.features.length > 0 && (
                      <ul className="space-y-1 mb-4 flex-1">
                        {plan.features.map((f: string) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePlan(plan.id)}
                      className="mt-auto text-destructive border-destructive/30 hover:bg-destructive/10 self-end"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Reward Dialog ─────────────────────────────────────────────── */}
      <Dialog open={rewardDialog} onOpenChange={setRewardDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Redeemable Reward</DialogTitle>
            <DialogDescription>Customers can redeem points for this reward at checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Reward Name *</Label>
              <Input value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="e.g. Free Cappuccino" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={rewardForm.description} onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })} rows={2} placeholder="Optional details…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Points Required *</Label>
                <Input type="number" min={1} value={rewardForm.points_required} onChange={e => setRewardForm({ ...rewardForm, points_required: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Reward Type</Label>
                <Select value={rewardForm.reward_type} onValueChange={v => setRewardForm({ ...rewardForm, reward_type: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount (ETB)</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(rewardForm.reward_type === 'discount' || rewardForm.reward_type === 'percentage') && (
              <div className="space-y-1.5">
                <Label>Discount Value ({rewardForm.reward_type === 'percentage' ? '%' : 'ETB'})</Label>
                <Input type="number" min={0} step="0.01" value={rewardForm.discount_value ?? ''} onChange={e => setRewardForm({ ...rewardForm, discount_value: parseFloat(e.target.value) })} />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRewardDialog(false)}>Cancel</Button>
            <Button onClick={saveReward} disabled={!rewardForm.name || rewardLoading}>
              {rewardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Plan Dialog ───────────────────────────────────────────────── */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subscription Plan</DialogTitle>
            <DialogDescription>Create a recurring plan for your customers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Plan Name *</Label>
              <Input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Coffee Lover" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={planForm.description ?? ''} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} rows={2} placeholder="What does this plan include?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monthly Price (ETB) *</Label>
                <Input type="number" min={0} value={planForm.price_monthly} onChange={e => setPlanForm({ ...planForm, price_monthly: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Yearly Price (ETB)</Label>
                <Input type="number" min={0} value={planForm.price_yearly ?? ''} placeholder="Optional" onChange={e => setPlanForm({ ...planForm, price_yearly: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={e => setFeatureInput(e.target.value)}
                  placeholder="Add a feature…"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && featureInput.trim()) {
                      setPlanForm(p => ({ ...p, features: [...p.features, featureInput.trim()] }));
                      setFeatureInput('');
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (featureInput.trim()) {
                      setPlanForm(p => ({ ...p, features: [...p.features, featureInput.trim()] }));
                      setFeatureInput('');
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {planForm.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {planForm.features.map(f => (
                    <Badge
                      key={f}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPlanForm(p => ({ ...p, features: p.features.filter(x => x !== f) }))}
                    >
                      {f} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPlanDialog(false)}>Cancel</Button>
            <Button onClick={savePlan} disabled={!planForm.name || planSaving}>
              {planSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}