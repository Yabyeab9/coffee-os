import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Tag, Plus, Calendar, Megaphone, Pencil, Trash2, Copy, Pause, Play,
  Archive, BarChart2, Sparkles, ChevronDown, Loader2, X, Check, Clock,
  Users, TrendingUp, DollarSign, Settings, Eye, RefreshCw, Target,
  CheckCircle2, AlertTriangle, MoreHorizontal, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { MenuItem } from '@/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  cafe_id: string;
  title: string;
  description: string | null;
  campaign_type: string;
  discount_type: string | null;
  discount_value: number | null;
  min_purchase: number | null;
  max_discount: number | null;
  target_audience: string;
  promo_message: string | null;
  ai_generated_copy: string | null;
  image_url: string | null;
  status: string;
  source: string;
  starts_at: string | null;
  ends_at: string | null;
  start_time: string | null;
  end_time: string | null;
  usage_limit: number | null;
  per_customer_limit: number;
  total_redemptions: number;
  ai_reasoning: string | null;
  expected_revenue: number | null;
  estimated_cost: number | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'archived';
type CampaignFilter = 'all' | CampaignStatus;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft:     { label: 'Draft',     color: 'bg-muted text-muted-foreground border-border',                  icon: Pencil },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: Clock },
  active:    { label: 'Active',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: Play },
  paused:    { label: 'Paused',    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Pause },
  expired:   { label: 'Expired',   color: 'bg-secondary text-muted-foreground border-border',              icon: AlertTriangle },
  archived:  { label: 'Archived',  color: 'bg-secondary text-muted-foreground border-border',              icon: Archive },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'All Customers',
  new: 'New Customers',
  loyal: 'Loyal Customers',
  at_risk: 'At-Risk Customers',
  vip: 'VIP Customers',
  specific: 'Specific Segment',
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  discount:      'Discount',
  loyalty_bonus: 'Loyalty Bonus',
  free_item:     'Free Item',
  bogo:          'Buy One Get One',
  bundle:        'Bundle Deal',
};

// ─── Analytics Dialog ─────────────────────────────────────────────────────────
function CampaignAnalyticsDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setIsLoading(true);
      const res = await supabase.functions.invoke('campaign-engine', {
        body: { action: 'get_analytics', payload: { campaign_id: campaign.id } },
      });
      setData(res.data);
      setIsLoading(false);
    }
    load();
  }, [campaign.id]);

  const fmt = (n: number | null | undefined) =>
    n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Analytics — {campaign.title}
          </DialogTitle>
          <DialogDescription>
            Real-time performance data from order redemptions.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !data || !data.has_data ? (
          <div className="py-12 text-center text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No redemptions yet</p>
            <p className="text-sm mt-1">Analytics will appear once customers start redeeming this campaign.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Redemptions', value: fmt(data.total_redemptions), icon: Tag },
                { label: 'Unique Customers', value: fmt(data.unique_customers), icon: Users },
                { label: 'Revenue Generated', value: `${fmt(data.revenue_generated)} ETB`, icon: TrendingUp },
                { label: 'Discount Cost', value: `${fmt(data.total_discount_cost)} ETB`, icon: DollarSign },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass rounded-xl p-4 border border-border">
                  <Icon className="w-4 h-4 text-primary mb-2" />
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {data.avg_order_value != null && (
              <div className="glass rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Average Order Value</p>
                  <p className="text-xs text-muted-foreground mt-0.5">For orders that used this campaign</p>
                </div>
                <span className="text-2xl font-bold text-primary">{fmt(data.avg_order_value)} ETB</span>
              </div>
            )}

            {data.redemption_rate != null && (
              <div className="glass rounded-xl p-4 border border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Usage Limit Progress</span>
                  <span className="text-muted-foreground">{fmt(data.total_redemptions)} / {fmt(campaign.usage_limit)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, data.redemption_rate)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{data.redemption_rate?.toFixed(1)}% of limit used</p>
              </div>
            )}

            {Object.keys(data.daily_trend ?? {}).length > 0 && (
              <div className="glass rounded-xl p-4 border border-border">
                <p className="text-sm font-medium text-foreground mb-3">Daily Redemptions (recent)</p>
                <div className="flex items-end gap-1 h-16">
                  {Object.entries(data.daily_trend)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-14)
                    .map(([date, count]: [string, any]) => {
                      const max = Math.max(...Object.values(data.daily_trend) as number[]);
                      const pct = max > 0 ? (count / max) * 100 : 0;
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1 group" title={`${date}: ${count}`}>
                          <div className="w-full bg-primary/20 rounded-t group-hover:bg-primary/40 transition-colors" style={{ height: `${Math.max(4, pct)}%` }} />
                          <span className="text-[9px] text-muted-foreground rotate-45 origin-left hidden md:block">{date.slice(5)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Campaign Form ────────────────────────────────────────────────────────────
interface CampaignFormData {
  title: string;
  description: string;
  campaign_type: string;
  discount_type: string;
  discount_value: string;
  min_purchase: string;
  max_discount: string;
  target_audience: string;
  promo_message: string;
  starts_at: string;
  ends_at: string;
  start_time: string;
  end_time: string;
  usage_limit: string;
  per_customer_limit: string;
  selectedMenuItemIds: string[];
}

const emptyForm = (): CampaignFormData => ({
  title: '', description: '', campaign_type: 'discount', discount_type: 'percentage',
  discount_value: '', min_purchase: '', max_discount: '', target_audience: 'all',
  promo_message: '', starts_at: '', ends_at: '', start_time: '', end_time: '',
  usage_limit: '', per_customer_limit: '1', selectedMenuItemIds: [],
});

function campaignToForm(c: Campaign): CampaignFormData {
  return {
    title: c.title,
    description: c.description ?? '',
    campaign_type: c.campaign_type,
    discount_type: c.discount_type ?? 'percentage',
    discount_value: c.discount_value?.toString() ?? '',
    min_purchase: c.min_purchase?.toString() ?? '',
    max_discount: c.max_discount?.toString() ?? '',
    target_audience: c.target_audience,
    promo_message: c.promo_message ?? '',
    starts_at: c.starts_at ? c.starts_at.slice(0, 16) : '',
    ends_at: c.ends_at ? c.ends_at.slice(0, 16) : '',
    start_time: c.start_time ?? '',
    end_time: c.end_time ?? '',
    usage_limit: c.usage_limit?.toString() ?? '',
    per_customer_limit: c.per_customer_limit.toString(),
    selectedMenuItemIds: [],
  };
}

function CampaignSheet({
  isOpen, onClose, editingCampaign, cafeId, menuItems, onSaved, prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingCampaign: Campaign | null;
  cafeId: string;
  menuItems: MenuItem[];
  onSaved: () => void;
  prefill?: Partial<CampaignFormData>;
}) {
  const [form, setForm] = useState<CampaignFormData>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingCampaign) {
      setForm(campaignToForm(editingCampaign));
      // load menu items for this campaign
      supabase.from('campaign_menu_items').select('menu_item_id').eq('campaign_id', editingCampaign.id).then(({ data }) => {
        setForm(f => ({ ...f, selectedMenuItemIds: data?.map(d => d.menu_item_id) ?? [] }));
      });
    } else {
      setForm({ ...emptyForm(), ...(prefill ?? {}) });
    }
    setGeneratedCopy('');
  }, [isOpen, editingCampaign, prefill]);

  const set = (k: keyof CampaignFormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const generateCopy = async () => {
    setIsGeneratingCopy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsGeneratingCopy(false); return; }
    const res = await supabase.functions.invoke('campaign-engine', {
      body: {
        action: 'generate_ai_copy',
        payload: {
          campaign_type: form.campaign_type,
          target_audience: form.target_audience,
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value) || null,
          cafe_id: cafeId,
        },
      },
    });
    if (res.data?.copy) {
      setGeneratedCopy(res.data.copy);
    } else {
      toast.error('Could not generate copy. Try again.');
    }
    setIsGeneratingCopy(false);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    setIsSaving(true);
    try {
      const payload: any = {
        cafe_id: cafeId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        campaign_type: form.campaign_type,
        discount_type: form.discount_type || null,
        discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
        min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        target_audience: form.target_audience,
        promo_message: form.promo_message.trim() || null,
        ai_generated_copy: generatedCopy || (editingCampaign?.ai_generated_copy ?? null),
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        per_customer_limit: parseInt(form.per_customer_limit) || 1,
        updated_at: new Date().toISOString(),
      };

      let campaignId = editingCampaign?.id;
      if (editingCampaign) {
        const { error } = await supabase.from('campaigns').update(payload).eq('id', editingCampaign.id);
        if (error) throw error;
      } else {
        payload.status = 'draft';
        payload.source = 'manual';
        const { data, error } = await supabase.from('campaigns').insert(payload).select('id').single();
        if (error) throw error;
        campaignId = data.id;
      }

      // Sync menu items
      if (campaignId && form.selectedMenuItemIds.length >= 0) {
        await supabase.from('campaign_menu_items').delete().eq('campaign_id', campaignId);
        if (form.selectedMenuItemIds.length > 0) {
          await supabase.from('campaign_menu_items').insert(
            form.selectedMenuItemIds.map(mid => ({ campaign_id: campaignId, menu_item_id: mid }))
          );
        }
      }

      toast.success(editingCampaign ? 'Campaign updated.' : 'Campaign created as Draft.');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMenuItem = (id: string) => {
    set('selectedMenuItemIds',
      form.selectedMenuItemIds.includes(id)
        ? form.selectedMenuItemIds.filter(x => x !== id)
        : [...form.selectedMenuItemIds, id]
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
              Campaign Details
            </h3>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Weekend Flash Sale" className="px-3" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Internal notes about this campaign" rows={2} className="px-3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <Select value={form.campaign_type} onValueChange={v => set('campaign_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAMPAIGN_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={form.target_audience} onValueChange={v => set('target_audience', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUDIENCE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Discount Config */}
          {['discount', 'bogo', 'bundle'].includes(form.campaign_type) && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                Discount Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={v => set('discount_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (ETB)</SelectItem>
                      <SelectItem value="free_item">Free Item</SelectItem>
                      <SelectItem value="bogo">Buy One Get One</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {form.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount (ETB)'}
                  </Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={form.discount_value}
                    onChange={e => set('discount_value', e.target.value)}
                    placeholder={form.discount_type === 'percentage' ? '10' : '50'}
                    className="px-3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min. Purchase (ETB)</Label>
                  <Input type="number" min="0" step="0.01" value={form.min_purchase} onChange={e => set('min_purchase', e.target.value)} placeholder="0" className="px-3" />
                </div>
                {form.discount_type === 'percentage' && (
                  <div className="space-y-2">
                    <Label>Max Discount Cap (ETB)</Label>
                    <Input type="number" min="0" step="0.01" value={form.max_discount} onChange={e => set('max_discount', e.target.value)} placeholder="No cap" className="px-3" />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Schedule */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
              Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className="px-3" />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="px-3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Daily Start Time (optional)</Label>
                <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="px-3" />
              </div>
              <div className="space-y-2">
                <Label>Daily End Time (optional)</Label>
                <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="px-3" />
              </div>
            </div>
          </section>

          {/* Limits */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
              Usage Limits
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Redemption Limit</Label>
                <Input type="number" min="1" value={form.usage_limit} onChange={e => set('usage_limit', e.target.value)} placeholder="Unlimited" className="px-3" />
              </div>
              <div className="space-y-2">
                <Label>Per Customer Limit</Label>
                <Input type="number" min="1" value={form.per_customer_limit} onChange={e => set('per_customer_limit', e.target.value)} className="px-3" />
              </div>
            </div>
          </section>

          {/* Applicable Menu Items */}
          {menuItems.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
                Applicable Menu Items
                <span className="font-normal normal-case text-xs ml-2">(leave empty = applies to all)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleMenuItem(item.id)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      form.selectedMenuItemIds.includes(item.id)
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="block font-medium truncate">{item.name}</span>
                    <span className="text-xs opacity-70">{item.price} ETB</span>
                  </button>
                ))}
              </div>
              {form.selectedMenuItemIds.length > 0 && (
                <p className="text-xs text-primary">{form.selectedMenuItemIds.length} item{form.selectedMenuItemIds.length > 1 ? 's' : ''} selected</p>
              )}
            </section>
          )}

          {/* Promo Message + AI Copy */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">
              Customer-Facing Copy
            </h3>
            <div className="space-y-2">
              <Label>Promotional Message</Label>
              <Textarea
                value={form.promo_message}
                onChange={e => set('promo_message', e.target.value)}
                placeholder="Short message shown to customers"
                rows={2}
                className="px-3"
              />
            </div>
            <div className="space-y-3 p-4 border border-primary/20 rounded-xl bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" />
                  AI Copy Generator
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateCopy}
                  disabled={isGeneratingCopy}
                  className="border-primary/30 text-primary hover:bg-primary/10 h-7"
                >
                  {isGeneratingCopy ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Generate
                </Button>
              </div>
              {generatedCopy ? (
                <div className="space-y-2">
                  <p className="text-sm text-foreground leading-relaxed bg-background/60 rounded-lg p-3 border border-border">
                    {generatedCopy}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { set('promo_message', generatedCopy); setGeneratedCopy(''); toast.success('Copy applied to promotional message.'); }}
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Check className="w-3 h-3 mr-1" /> Apply This Copy
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Generates copy based on your actual order data, audience, and discount settings.
                </p>
              )}
            </div>
          </section>
        </div>

        <SheetFooter className="p-6 border-t border-border bg-background">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={save} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editingCampaign ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-xs gap-1 py-0.5 px-2 ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PromotionsAdminPage() {
  const { cafeId } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const [searchQ, setSearchQ] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [analyticsCampaign, setAnalyticsCampaign] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Partial<CampaignFormData> | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!cafeId) return;
    setIsLoading(true);
    try {
      const [campRes, menuRes] = await Promise.all([
        supabase.from('campaigns').select('*').eq('cafe_id', cafeId).order('created_at', { ascending: false }),
        supabase.from('menus').select('id, name, price, category_id, is_available, cafe_id, description, currency, image_url, status, is_featured, preparation_time, tags, allergens, ingredients, images, inventory_tracking, stock_quantity, low_stock_threshold, seasonal, visibility, sku, deleted_at, created_at, updated_at').eq('cafe_id', cafeId).is('deleted_at', null).eq('status', 'active').limit(100),
      ]);
      setCampaigns(campRes.data ?? []);
      setMenuItems((menuRes.data ?? []) as MenuItem[]);
    } catch {
      toast.error('Failed to load promotions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = (p?: Partial<CampaignFormData>) => {
    setEditingCampaign(null);
    setPrefill(p);
    setIsSheetOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setPrefill(undefined);
    setIsSheetOpen(true);
  };

  const setStatus = async (c: Campaign, status: string) => {
    const { error } = await supabase.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', c.id);
    if (error) { toast.error('Failed to update status.'); return; }
    toast.success(`Campaign ${STATUS_CONFIG[status]?.label ?? status}.`);
    fetchData();
  };

  const duplicate = async (c: Campaign) => {
    const { id, created_at, updated_at, total_redemptions, ...rest } = c;
    const { error } = await supabase.from('campaigns').insert({
      ...rest,
      title: `${c.title} (Copy)`,
      status: 'draft',
      total_redemptions: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) { toast.error('Failed to duplicate.'); return; }
    toast.success('Campaign duplicated as Draft.');
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', deletingId);
    if (error) { toast.error('Delete failed.'); return; }
    toast.success('Campaign deleted.');
    setDeletingId(null);
    fetchData();
  };

  const filtered = campaigns.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (searchQ && !c.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  // Stat counts
  const counts = {
    all: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    expired: campaigns.filter(c => c.status === 'expired').length,
    archived: campaigns.filter(c => c.status === 'archived').length,
  };

  const totalRedemptions = campaigns.filter(c => c.status === 'active').reduce((s, c) => s + c.total_redemptions, 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground mb-1">Campaign Management</h1>
          <p className="text-muted-foreground text-sm">Full lifecycle management — Draft → Scheduled → Active → Paused → Expired → Archived</p>
        </div>
        <Button onClick={() => openCreate()} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: counts.all, icon: Megaphone, color: 'text-foreground' },
          { label: 'Active Now', value: counts.active, icon: Play, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Drafts', value: counts.draft, icon: Pencil, color: 'text-muted-foreground' },
          { label: 'Active Redemptions', value: totalRedemptions, icon: Tag, color: 'text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-border">
            <Icon className={`w-4 h-4 mb-2 ${color}`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'active', 'draft', 'scheduled', 'paused', 'expired', 'archived'] as CampaignFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filter === f
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-background'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label ?? f}
              <span className="ml-1.5 opacity-60">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 md:max-w-xs">
          <Input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search campaigns…"
            className="h-8 px-3 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-8 w-8 p-0 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 text-center border border-dashed border-border rounded-2xl"
        >
          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-foreground">
            {searchQ ? 'No campaigns match your search.' : filter !== 'all' ? `No ${STATUS_CONFIG[filter]?.label ?? filter} campaigns.` : 'No campaigns yet.'}
          </p>
          {filter === 'all' && !searchQ && (
            <Button variant="outline" onClick={() => openCreate()} className="mt-4">
              Create Your First Campaign
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map(c => {
              const isActive = c.status === 'active';
              const isPaused = c.status === 'paused';
              const isDraft = c.status === 'draft';
              const isScheduled = c.status === 'scheduled';
              const usagePct = c.usage_limit ? (c.total_redemptions / c.usage_limit) * 100 : null;
              const discLabel = c.discount_type === 'percentage'
                ? `${c.discount_value}% off`
                : c.discount_type === 'fixed'
                ? `${c.discount_value} ETB off`
                : c.discount_type === 'free_item'
                ? 'Free item'
                : c.discount_type === 'bogo'
                ? 'BOGO'
                : CAMPAIGN_TYPE_LABELS[c.campaign_type] ?? c.campaign_type;

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="glass rounded-xl border border-border overflow-hidden"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{c.title}</h3>
                        <StatusBadge status={c.status} />
                        {c.source === 'ai_generated' && (
                          <Badge variant="outline" className="text-xs gap-1 py-0.5 px-2 bg-primary/5 text-primary border-primary/20">
                            <Sparkles className="w-3 h-3" /> AI
                          </Badge>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {discLabel}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {AUDIENCE_LABELS[c.target_audience] ?? c.target_audience}
                        </span>
                        {c.starts_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(c.starts_at).toLocaleDateString()} {c.ends_at && `→ ${new Date(c.ends_at).toLocaleDateString()}`}
                          </span>
                        )}
                        {c.total_redemptions > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="w-3 h-3" />
                            {c.total_redemptions} redeemed
                          </span>
                        )}
                      </div>
                      {usagePct !== null && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[160px]">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, usagePct)}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{c.total_redemptions}/{c.usage_limit}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isDraft && (
                        <Button size="sm" onClick={() => setStatus(c, 'active')} className="h-8 text-xs">
                          <Play className="w-3 h-3 mr-1" /> Activate
                        </Button>
                      )}
                      {isScheduled && (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(c, 'active')} className="h-8 text-xs">
                          <Play className="w-3 h-3 mr-1" /> Launch Now
                        </Button>
                      )}
                      {isActive && (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(c, 'paused')} className="h-8 text-xs">
                          <Pause className="w-3 h-3 mr-1" /> Pause
                        </Button>
                      )}
                      {isPaused && (
                        <Button size="sm" onClick={() => setStatus(c, 'active')} className="h-8 text-xs">
                          <Play className="w-3 h-3 mr-1" /> Resume
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAnalyticsCampaign(c)}>
                            <BarChart2 className="w-4 h-4 mr-2" /> View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(c)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!['archived', 'expired'].includes(c.status) && (
                            <DropdownMenuItem onClick={() => setStatus(c, 'scheduled')} disabled={isScheduled}>
                              <Clock className="w-4 h-4 mr-2" /> Set to Scheduled
                            </DropdownMenuItem>
                          )}
                          {c.status !== 'archived' && (
                            <DropdownMenuItem onClick={() => setStatus(c, 'archived')}>
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingId(c.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Campaign Form Sheet */}
      {cafeId && (
        <CampaignSheet
          isOpen={isSheetOpen}
          onClose={() => { setIsSheetOpen(false); setEditingCampaign(null); }}
          editingCampaign={editingCampaign}
          cafeId={cafeId}
          menuItems={menuItems}
          onSaved={fetchData}
          prefill={prefill}
        />
      )}

      {/* Analytics Dialog */}
      {analyticsCampaign && (
        <CampaignAnalyticsDialog
          campaign={analyticsCampaign}
          onClose={() => setAnalyticsCampaign(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={v => { if (!v) setDeletingId(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              This will permanently delete the campaign and all associated redemption records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}