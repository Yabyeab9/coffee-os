import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Brain, TrendingUp, Users, DollarSign, AlertTriangle, UserCheck, ShieldAlert,
  RefreshCw, Zap, ArrowRight, CheckCircle2, XCircle, Clock, Target,
  BarChart2, Loader2, ChevronRight, Flame, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Opportunity {
  id: string;
  title: string;
  category: string;
  severity: string;
  explanation: string;
  supporting_data: Record<string, any>;
  estimated_impact: string | null;
  recommended_action: string | null;
  action_type: string | null;
  action_payload: Record<string, any>;
  confidence: number;
  status: string;
  generated_at: string;
}

interface BriefingSection {
  type: 'warning' | 'positive' | 'neutral' | 'opportunity';
  title: string;
  body: string;
  metric: string | null;
  action_label: string | null;
  action_type: string | null;
  action_payload?: Record<string, any>;
}

interface Briefing {
  sections: BriefingSection[];
  kpis: Record<string, any>;
  briefing_date: string;
  generated_at: string;
}

interface CustomerSegments {
  segments: { name: string; count: number }[];
  total: number;
}

interface RevenueOpportunities {
  top_pairings: { count: number; nameA: string; nameB: string }[];
  top_items: { count: number; name: string; price: number }[];
  order_count: number;
  message?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  critical: { color: 'border-destructive/30 bg-destructive/5',   dot: 'bg-destructive',  label: 'Critical' },
  high:     { color: 'border-orange-300/40 bg-orange-50/50 dark:bg-orange-950/20',    dot: 'bg-orange-500', label: 'High' },
  medium:   { color: 'border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20',       dot: 'bg-amber-500',  label: 'Medium' },
  low:      { color: 'border-border bg-background',              dot: 'bg-muted-foreground', label: 'Low' },
};

const SECTION_TYPE_CONFIG: Record<string, { bar: string; icon: React.ComponentType<any> }> = {
  warning:     { bar: 'bg-destructive', icon: AlertTriangle },
  positive:    { bar: 'bg-emerald-500', icon: TrendingUp },
  neutral:     { bar: 'bg-primary',     icon: BarChart2 },
  opportunity: { bar: 'bg-amber-500',   icon: Zap },
};

const SEGMENT_DISPLAY: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  high_value: { label: 'High-Value',  color: 'text-primary',   icon: Flame },
  at_risk:    { label: 'At-Risk',     color: 'text-destructive', icon: ShieldAlert },
  returning:  { label: 'Returning',   color: 'text-emerald-600 dark:text-emerald-400', icon: UserCheck },
  new:        { label: 'New',         color: 'text-blue-600 dark:text-blue-400',   icon: Sparkles },
  dormant:    { label: 'Dormant',     color: 'text-muted-foreground', icon: Clock },
};

function fmt(n: any) {
  if (n == null) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AiManagerPage() {
  const { cafeId } = useAuth();
  const navigate = useNavigate();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [segments, setSegments] = useState<CustomerSegments | null>(null);
  const [revenueOpps, setRevenueOpps] = useState<RevenueOpportunities | null>(null);

  const [briefingLoading, setBriefingLoading] = useState(false);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [updatingOppId, setUpdatingOppId] = useState<string | null>(null);

  const callEngine = useCallback(async (action: string, payload?: Record<string, any>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    const res = await supabase.functions.invoke('campaign-engine', {
      body: { action, payload: { cafe_id: cafeId, ...payload } },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }, [cafeId]);

  // ── Error states per section ──────────────────────────────────────────────
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [oppsError, setOppsError] = useState<string | null>(null);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  const loadBriefing = useCallback(async (signal?: AbortSignal) => {
    if (!cafeId) { setBriefingLoading(false); return; }
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const data = await callEngine('get_business_briefing');
      if (signal?.aborted) return;
      setBriefing(data?.briefing ?? null);
    } catch (e: any) {
      if (signal?.aborted) return;
      setBriefingError(e?.message ?? 'Could not load business briefing.');
    } finally {
      if (!signal?.aborted) setBriefingLoading(false);
    }
  }, [cafeId, callEngine]);

  const loadOpportunities = useCallback(async (signal?: AbortSignal) => {
    if (!cafeId) { setOppsLoading(false); return; }
    setOppsLoading(true);
    setOppsError(null);
    try {
      const data = await callEngine('detect_opportunities');
      if (signal?.aborted) return;
      setOpportunities(data?.opportunities ?? []);
      if ((data?.newly_detected ?? 0) > 0) {
        toast.success(`${data.newly_detected} new opportunit${data.newly_detected > 1 ? 'ies' : 'y'} detected.`);
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      setOppsError(e?.message ?? 'Could not scan for opportunities.');
    } finally {
      if (!signal?.aborted) setOppsLoading(false);
    }
  }, [cafeId, callEngine]);

  const loadSegments = useCallback(async (signal?: AbortSignal) => {
    if (!cafeId) return;
    setSegmentsLoading(true);
    setSegmentsError(null);
    try {
      const data = await callEngine('get_customer_segments');
      if (signal?.aborted) return;
      setSegments(data ?? null);
    } catch (e: any) {
      if (signal?.aborted) return;
      setSegmentsError(e?.message ?? 'Could not load customer segments.');
    } finally {
      if (!signal?.aborted) setSegmentsLoading(false);
    }
  }, [cafeId, callEngine]);

  const loadRevenueOpps = useCallback(async (signal?: AbortSignal) => {
    if (!cafeId) return;
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const data = await callEngine('get_revenue_opportunities');
      if (signal?.aborted) return;
      setRevenueOpps(data ?? null);
    } catch (e: any) {
      if (signal?.aborted) return;
      setRevenueError(e?.message ?? 'Could not load revenue opportunities.');
    } finally {
      if (!signal?.aborted) setRevenueLoading(false);
    }
  }, [cafeId, callEngine]);

  // Initial load: briefing + opportunities fire independently with cleanup.
  // Both start as false so no spinner shows before cafeId is resolved.
  useEffect(() => {
    if (!cafeId) return;
    const ac = new AbortController();
    loadBriefing(ac.signal);
    loadOpportunities(ac.signal);
    return () => ac.abort();
  }, [cafeId, loadBriefing, loadOpportunities]);

  const handleOpportunityAction = async (opp: Opportunity, status: 'in_progress' | 'completed' | 'dismissed') => {
    setUpdatingOppId(opp.id);
    try {
      await callEngine('update_opportunity_status', { opportunity_id: opp.id, status });
      setOpportunities(prev => prev.filter(o => o.id !== opp.id));

      // Navigate to relevant page when taking action
      if (status === 'in_progress' || status === 'completed') {
        if (opp.action_type === 'create_campaign') {
          toast.success('Opening Campaign Builder…');
          // Route to promotions with prefill state
          navigate('/dashboard/promotions');
        } else if (opp.action_type === 'view_menu') {
          navigate('/dashboard/menus');
        } else if (opp.action_type === 'view_analytics') {
          navigate('/dashboard/analytics');
        } else {
          toast.success('Opportunity marked as In Progress.');
        }
      } else {
        toast.success('Opportunity dismissed.');
      }
    } catch {
      toast.error('Failed to update opportunity.');
    } finally {
      setUpdatingOppId(null);
    }
  };

  const handleBriefingAction = (section: BriefingSection) => {
    if (!section.action_type) return;
    if (section.action_type === 'create_campaign') {
      navigate('/dashboard/promotions');
    } else if (section.action_type === 'view_menu') {
      navigate('/dashboard/menus');
    } else if (section.action_type === 'view_analytics') {
      navigate('/dashboard/analytics');
    }
  };

  const kpis = briefing?.kpis ?? {};

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            AI Business Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time insights generated from your actual order, customer, and menu data.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => loadBriefing()} disabled={briefingLoading} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${briefingLoading ? 'animate-spin' : ''}`} />
            Refresh Briefing
          </Button>
          <Button size="sm" onClick={() => loadOpportunities()} disabled={oppsLoading} className="h-8">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Scan Opportunities
          </Button>
        </div>
      </div>

      {/* KPIs from briefing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {briefingLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 border border-border animate-pulse">
              <div className="h-4 w-16 bg-muted rounded mb-3" />
              <div className="h-7 w-20 bg-muted rounded mb-1" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="glass rounded-xl p-4 border border-border">
              <TrendingUp className="w-4 h-4 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{fmt(kpis.orders_today)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Orders Today</p>
            </div>
            <div className="glass rounded-xl p-4 border border-border">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-foreground">{fmt(kpis.revenue_today)} <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue Today</p>
            </div>
            <div className="glass rounded-xl p-4 border border-border">
              <Users className="w-4 h-4 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{fmt(kpis.revenue_this_week)} <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                This Week
                {kpis.revenue_change_pct != null && (
                  <span className={`font-medium ${parseFloat(kpis.revenue_change_pct) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    ({parseFloat(kpis.revenue_change_pct) >= 0 ? '+' : ''}{kpis.revenue_change_pct}%)
                  </span>
                )}
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-border">
              <ShieldAlert className="w-4 h-4 text-destructive mb-2" />
              <p className="text-2xl font-bold text-foreground">{fmt(kpis.churn_risk_count)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Customers At Risk</p>
            </div>
          </>
        )}
      </div>

      <Tabs defaultValue="briefing" className="space-y-6">
        <TabsList className="h-9">
          <TabsTrigger value="briefing" className="text-xs">Daily Briefing</TabsTrigger>
          <TabsTrigger value="opportunities" className="text-xs">
            Opportunities
            {opportunities.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                {opportunities.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="segments" className="text-xs">Customers</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue Signals</TabsTrigger>
        </TabsList>

        {/* ── Daily Briefing ── */}
        <TabsContent value="briefing">
          {briefingLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : briefingError ? (
            <div className="py-16 flex flex-col items-center gap-4 border border-dashed border-destructive/30 rounded-2xl bg-destructive/5">
              <AlertTriangle className="w-10 h-10 text-destructive opacity-60" />
              <p className="text-sm text-destructive font-medium">{briefingError}</p>
              <Button size="sm" variant="outline" onClick={() => loadBriefing()} className="h-8 text-xs">
                <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
              </Button>
            </div>
          ) : !briefing || briefing.sections.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border rounded-2xl">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">Not enough data yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                The daily briefing generates after orders start flowing through the system.
              </p>
              <Button size="sm" variant="outline" onClick={() => loadBriefing()} className="mt-4 h-8 text-xs">
                <RefreshCw className="w-3 h-3 mr-1.5" /> Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Generated {new Date(briefing.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {briefing.briefing_date}
              </div>
              <AnimatePresence initial={false}>
                {briefing.sections.map((section, i) => {
                  const cfg = SECTION_TYPE_CONFIG[section.type] ?? SECTION_TYPE_CONFIG.neutral;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass rounded-xl border border-border overflow-hidden flex"
                    >
                      <div className={`w-1 shrink-0 ${cfg.bar}`} />
                      <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <p className="font-semibold text-foreground text-sm">{section.title}</p>
                            {section.metric && (
                              <Badge variant="outline" className="text-xs ml-auto shrink-0">{section.metric}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
                        </div>
                        {section.action_label && section.action_type && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBriefingAction(section)}
                            className="shrink-0 h-8 text-xs"
                          >
                            {section.action_label}
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── Opportunities ── */}
        <TabsContent value="opportunities">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {oppsLoading ? 'Scanning your data…' : oppsError ? 'Failed to scan.' : `${opportunities.length} open opportunit${opportunities.length !== 1 ? 'ies' : 'y'} detected from real business data`}
              </p>
              <Button variant="outline" size="sm" onClick={() => loadOpportunities()} disabled={oppsLoading} className="h-7 text-xs">
                <RefreshCw className={`w-3 h-3 mr-1 ${oppsLoading ? 'animate-spin' : ''}`} />
                Rescan
              </Button>
            </div>

            {oppsLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : oppsError ? (
              <div className="py-12 flex flex-col items-center gap-3 border border-dashed border-destructive/30 rounded-2xl bg-destructive/5">
                <AlertTriangle className="w-8 h-8 text-destructive opacity-60" />
                <p className="text-sm text-destructive">{oppsError}</p>
                <Button size="sm" variant="outline" onClick={() => loadOpportunities()} className="h-7 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-2xl">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-foreground">No open opportunities</p>
                <p className="text-sm text-muted-foreground mt-1">All caught up — click Rescan to check for new ones.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {opportunities.map((opp) => {
                  const sev = SEVERITY_CONFIG[opp.severity] ?? SEVERITY_CONFIG.medium;
                  return (
                    <motion.div
                      key={opp.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={`rounded-xl border p-5 space-y-3 ${sev.color}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sev.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground text-sm">{opp.title}</p>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize">
                              {opp.category}
                            </Badge>
                            <span className="ml-auto text-xs text-muted-foreground shrink-0">{opp.confidence}% confidence</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{opp.explanation}</p>
                        </div>
                      </div>

                      {opp.estimated_impact && (
                        <div className="ml-5 text-xs text-foreground font-medium flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" />
                          {opp.estimated_impact}
                        </div>
                      )}

                      {opp.recommended_action && (
                        <div className="ml-5 px-3 py-2 bg-background/60 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Recommended: </span>
                            {opp.recommended_action}
                          </p>
                        </div>
                      )}

                      {/* Supporting data */}
                      {Object.keys(opp.supporting_data ?? {}).length > 0 && (
                        <div className="ml-5 flex flex-wrap gap-2">
                          {Object.entries(opp.supporting_data).slice(0, 4).map(([k, v]) => (
                            <span key={k} className="text-[10px] bg-background/60 border border-border rounded px-2 py-0.5 text-muted-foreground">
                              {k.replace(/_/g, ' ')}: <strong className="text-foreground">{Array.isArray(v) ? v.join(', ') : String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="ml-5 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpportunityAction(opp, 'in_progress')}
                          disabled={updatingOppId === opp.id}
                          className="h-7 text-xs"
                        >
                          {updatingOppId === opp.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                          Take Action
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpportunityAction(opp, 'dismissed')}
                          disabled={updatingOppId === opp.id}
                          className="h-7 text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </TabsContent>

        {/* ── Customer Segments ── */}
        <TabsContent value="segments">
          <div className="space-y-6">
            {segmentsError ? (
              <div className="py-12 flex flex-col items-center gap-3 border border-dashed border-destructive/30 rounded-2xl bg-destructive/5">
                <AlertTriangle className="w-8 h-8 text-destructive opacity-60" />
                <p className="text-sm text-destructive">{segmentsError}</p>
                <Button size="sm" variant="outline" onClick={() => loadSegments()} className="h-7 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </div>
            ) : !segments ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <p className="text-muted-foreground text-sm">
                  Click below to analyze your customer base by behavior (last 60 days of orders).
                </p>
                <Button onClick={() => loadSegments()} disabled={segmentsLoading} className="gap-2">
                  {segmentsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Analyze Customer Segments
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {fmt(segments.total)} customers analyzed from the last 60 days of orders
                  </p>
                  <Button variant="outline" size="sm" onClick={() => loadSegments()} disabled={segmentsLoading} className="h-7 text-xs">
                    <RefreshCw className={`w-3 h-3 mr-1 ${segmentsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {segments.segments.map(seg => {
                    const cfg = SEGMENT_DISPLAY[seg.name] ?? { label: seg.name, color: 'text-foreground', icon: Users };
                    const Icon = cfg.icon;
                    const pct = segments.total > 0 ? ((seg.count / segments.total) * 100).toFixed(1) : '0';
                    return (
                      <div key={seg.name} className="glass rounded-xl border border-border p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${cfg.color}`} />
                          <p className="font-semibold text-foreground">{cfg.label}</p>
                        </div>
                        <div>
                          <p className={`text-3xl font-bold ${cfg.color}`}>{fmt(seg.count)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{pct}% of active customers</p>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        {seg.name === 'at_risk' && seg.count > 0 && (
                          <Button
                            size="sm"
                            onClick={() => navigate('/dashboard/promotions')}
                            className="w-full h-7 text-xs"
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Create Recovery Campaign
                          </Button>
                        )}
                        {seg.name === 'high_value' && seg.count > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/dashboard/promotions')}
                            className="w-full h-7 text-xs"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Create VIP Campaign
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Revenue Signals ── */}
        <TabsContent value="revenue">
          <div className="space-y-6">
            {revenueError ? (
              <div className="py-12 flex flex-col items-center gap-3 border border-dashed border-destructive/30 rounded-2xl bg-destructive/5">
                <AlertTriangle className="w-8 h-8 text-destructive opacity-60" />
                <p className="text-sm text-destructive">{revenueError}</p>
                <Button size="sm" variant="outline" onClick={() => loadRevenueOpps()} className="h-7 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </div>
            ) : !revenueOpps ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <p className="text-muted-foreground text-sm">
                  Analyze co-purchase patterns and top performers from the last 30 days.
                </p>
                <Button onClick={() => loadRevenueOpps()} disabled={revenueLoading} className="gap-2">
                  {revenueLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Analyze Revenue Signals
                </Button>
              </div>
            ) : revenueOpps.message ? (
              <div className="py-12 text-center text-muted-foreground text-sm">{revenueOpps.message}</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Based on {fmt(revenueOpps.order_count)} orders in the last 30 days</p>
                  <Button variant="outline" size="sm" onClick={() => loadRevenueOpps()} disabled={revenueLoading} className="h-7 text-xs">
                    <RefreshCw className={`w-3 h-3 mr-1 ${revenueLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {revenueOpps.top_items?.length > 0 && (
                  <div className="glass rounded-xl border border-border p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-primary" />
                      Top Performers This Month
                    </h3>
                    <div className="space-y-3">
                      {revenueOpps.top_items.map((item, i) => {
                        const maxCount = revenueOpps.top_items[0].count;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                                <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.count} orders</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {revenueOpps.top_pairings?.length > 0 && (
                  <div className="glass rounded-xl border border-border p-5">
                    <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Frequently Bought Together
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Use these pairings to create bundle campaigns or menu cross-sell prompts.</p>
                    <div className="space-y-3">
                      {revenueOpps.top_pairings.map((pair, i) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{pair.nameA}</span>
                              <span className="text-muted-foreground mx-2">+</span>
                              <span className="font-medium">{pair.nameB}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-muted-foreground">{pair.count}× paired</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              onClick={() => navigate('/dashboard/promotions')}
                            >
                              Bundle Campaign
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}