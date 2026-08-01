import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Users, Package, Calendar, DollarSign, AlertTriangle, Lightbulb, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AiManagerPage() {
  const { data: summary } = useQuery({
    queryKey: ['ai_manager_summary'],
    queryFn: async () => {
      const { data } = await supabase.from('ai_manager_summaries').select('*').order('summary_date', { ascending: false }).limit(1).single();
      return data;
    }
  });

  const { data: alerts } = useQuery({
    queryKey: ['active_alerts'],
    queryFn: async () => {
      const { data } = await supabase.from('alerts').select('*').eq('status', 'active').order('triggered_at', { ascending: false });
      return data || [];
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">AI Manager</h1>
          <p className="text-muted-foreground mt-1">Your daily operational intelligence and insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-xl border border-primary/20 bg-primary/5">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Morning Briefing</h2>
            <p className="text-lg mb-6 leading-relaxed">
              Good morning! Yesterday was a strong day with <span className="font-semibold text-primary">15,000 ETB</span> in sales. 
              We are expecting a busy morning today, but your <span className="font-semibold text-destructive">milk stock</span> will run out tomorrow if not reordered.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" /> Sales
                </div>
                <div className="font-semibold">{summary?.sales_summary || '+12% vs last week'}</div>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" /> Customers
                </div>
                <div className="font-semibold">{summary?.customer_summary || '15 new customers'}</div>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="w-4 h-4" /> Inventory
                </div>
                <div className="font-semibold text-destructive">{summary?.inventory_summary || '2 items low'}</div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-xl border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> Recommendations</h3>
              <ul className="space-y-4">
                {(summary?.recommendations || ['Reorder milk from premium supplier today', 'Activate happy hour promotion 2-4 PM', 'Schedule one more barista for tomorrow morning']).map((rec: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6 rounded-xl border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Opportunities</h3>
              <ul className="space-y-4">
                {(summary?.opportunities || ['Upsell croissants with Americanos (40% conversion)', 'Send reactivation campaign to 12 inactive VIPs']).map((opp: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-xl border border-destructive/20 bg-destructive/5">
            <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Active Alerts
            </h3>
            
            <div className="space-y-3">
              {alerts?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center p-4">No active alerts</div>
              ) : (
                alerts?.map((alert: any) => (
                  <div key={alert.id} className="p-3 bg-background rounded border border-destructive/30">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">{alert.alert_type}</span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
                        alert.priority === 'Critical' ? 'bg-red-500/20 text-red-600' :
                        alert.priority === 'High' ? 'bg-orange-500/20 text-orange-600' : 'bg-yellow-500/20 text-yellow-600'
                      }`}>{alert.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{alert.message}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {}}>Acknowledge</Button>
                      <Button size="sm" className="h-7 text-xs w-full" onClick={() => {}}>Resolve</Button>
                    </div>
                  </div>
                ))
              )}
              {/* Fallback mock alerts if empty DB */}
              {alerts?.length === 0 && (
                <>
                  <div className="p-3 bg-background rounded border border-destructive/30">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">Low Inventory</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-600">Critical</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Whole milk stock is down to 5 liters (2 days remaining).</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {}}>Acknowledge</Button>
                      <Button size="sm" className="h-7 text-xs w-full" onClick={() => {}}>Resolve</Button>
                    </div>
                  </div>
                  <div className="p-3 bg-background rounded border border-orange-500/30">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">Staff Shortage</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold bg-orange-500/20 text-orange-600">High</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Tomorrow 12:00 PM peak is understaffed by 1 barista.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {}}>Acknowledge</Button>
                      <Button size="sm" className="h-7 text-xs w-full" onClick={() => {}}>Resolve</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
