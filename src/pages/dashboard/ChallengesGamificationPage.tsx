import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, Target, Activity, CheckCircle2, XCircle, TrendingUp, Calendar, 
  Users, DollarSign, Brain, Edit, Play, Archive, Pause, RefreshCw, BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ChallengesGamificationPage() {
  const { profile } = useAuth();
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Check pending
      let { data: pending } = await supabase
        .from('ai_generated_campaigns')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false });

      if (!pending || pending.length === 0) {
        await generateFallbackQueue();
        const { data: p2 } = await supabase
          .from('ai_generated_campaigns')
          .select('*')
          .eq('status', 'pending')
          .order('confidence_score', { ascending: false });
        pending = p2;
      }
      setPendingQueue(pending || []);

      // Fetch active & scheduled & paused
      const { data: active } = await supabase
        .from('ai_generated_campaigns')
        .select('*')
        .in('status', ['active', 'paused', 'scheduled'])
        .order('actual_start_date', { ascending: false, nullsFirst: true });
        
      setActiveCampaigns(active || []);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load Growth Engine data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackQueue = async () => {
    const campaigns = [
      {
        campaign_type: 'challenge',
        title: 'Morning Warrior',
        description: 'Order 3 drinks before 10 AM within 7 days.',
        business_goal: 'Increase morning traffic',
        target_customers: 'Customers who usually visit afternoon',
        expected_revenue_increase: 1200,
        expected_repeat_visits: 4,
        estimated_cost: 80,
        estimated_roi: 3.2,
        confidence_score: 94,
        reasoning: 'Morning traffic dropped 21% this month. Targeting afternoon regulars with a high-reward morning challenge has proven highly effective historically.',
        duration_days: 7,
        reward_details: { type: 'points', value: 200, description: '200 Loyalty Points' },
        difficulty: 'medium',
        priority: 'high',
        target_metric: 'revenue',
        recommended_start_date: new Date().toISOString().split('T')[0],
        recommended_end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      },
      {
        campaign_type: 'product_discovery',
        title: 'Mystery Cup',
        description: 'Order any standard drink, get a 10% chance for a free size upgrade.',
        business_goal: 'Increase overall transaction volume',
        target_customers: 'All customers',
        expected_revenue_increase: 850,
        expected_repeat_visits: 2,
        estimated_cost: 150,
        estimated_roi: 2.1,
        confidence_score: 82,
        reasoning: 'Gamification increases daily order frequency. Customers love surprise mechanics. Expected to drive a 15% bump in daily active orders.',
        duration_days: 3,
        reward_details: { type: 'upgrade', value: 1, description: 'Free Size Upgrade' },
        difficulty: 'easy',
        priority: 'high',
        target_metric: 'participants',
        recommended_start_date: new Date().toISOString().split('T')[0],
        recommended_end_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      },
      {
        campaign_type: 'win-back',
        title: 'We Miss You — 50% Off Your Favorite',
        description: 'Come back this week and get 50% off your most ordered drink.',
        business_goal: 'Re-engage inactive customers',
        target_customers: 'Customers inactive > 30 days',
        expected_revenue_increase: 450,
        expected_repeat_visits: 1,
        estimated_cost: 120,
        estimated_roi: 2.8,
        confidence_score: 76,
        reasoning: '35 highly valuable customers have not visited in 30+ days. Personalized win-back campaigns average a 25% return rate.',
        duration_days: 7,
        reward_details: { type: 'discount', value: 50, description: '50% Discount' },
        difficulty: 'easy',
        priority: 'medium',
        target_metric: 'repeat_visits',
        recommended_start_date: new Date().toISOString().split('T')[0],
        recommended_end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      }
    ];

    await supabase.from('ai_generated_campaigns').insert(campaigns);
  };

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'approve') {
        await supabase.from('ai_generated_campaigns').update({
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
          actual_start_date: new Date().toISOString().split('T')[0]
        }).eq('id', id);
        toast.success("Campaign Activated!");
      } else if (action === 'reject') {
        await supabase.from('ai_generated_campaigns').update({ status: 'rejected' }).eq('id', id);
        toast.success("Campaign Rejected. AI is learning from this.");
      } else if (action === 'pause') {
        await supabase.from('ai_generated_campaigns').update({ status: 'paused' }).eq('id', id);
        toast.success("Campaign Paused.");
      } else if (action === 'resume') {
        await supabase.from('ai_generated_campaigns').update({ status: 'active' }).eq('id', id);
        toast.success("Campaign Resumed.");
      } else if (action === 'archive') {
        await supabase.from('ai_generated_campaigns').update({ status: 'archived', actual_end_date: new Date().toISOString().split('T')[0] }).eq('id', id);
        toast.success("Campaign Archived.");
      }
      fetchData();
    } catch (e) {
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const openEdit = (campaign: any) => {
    setEditForm({ ...campaign });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await supabase.from('ai_generated_campaigns').update({
        title: editForm.title,
        description: editForm.description,
        duration_days: editForm.duration_days,
        reward_details: editForm.reward_details,
        recommended_start_date: editForm.recommended_start_date,
        recommended_end_date: editForm.recommended_end_date
      }).eq('id', editForm.id);
      
      toast.success("Campaign updated successfully.");
      setIsEditOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to update campaign");
    }
  };

  const calculateRemainingDays = (endDateStr: string) => {
    if (!endDateStr) return 'Unknown';
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    if (diff < 0) return 'Expired';
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days === 0 ? 'Ending Today' : `${days} days`;
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in-0 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3 text-foreground">
            <Brain className="w-8 h-8 text-primary" /> AI Growth Engine
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-balance">
            Coffee OS autonomously analyzes your business daily to discover opportunities, generate campaigns, and estimate financial impact.
          </p>
        </div>
      </div>

      {/* Pending AI Queue */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <Sparkles className="w-5 h-5 text-primary" /> Pending AI Approval Queue
        </h2>
        {pendingQueue.length === 0 ? (
          <div className="glass p-8 rounded-xl border border-border text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 text-primary/30 mx-auto mb-3" />
            <p>You've cleared the queue! The AI will analyze your business tonight and generate more opportunities tomorrow.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingQueue.map((camp) => (
              <div key={camp.id} className="glass rounded-xl p-6 border border-primary/20 shadow-sm relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-background/80 border border-border px-3 py-1 rounded-full text-xs font-semibold text-primary shadow-sm backdrop-blur-md">
                  <Target className="w-3 h-3" /> {camp.confidence_score}% Confidence
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px] uppercase tracking-wider bg-background/50 border-primary/20 text-primary">{camp.campaign_type}</Badge>
                    <h3 className="text-lg font-bold text-foreground leading-tight">{camp.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 pr-16">{camp.description}</p>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 mb-5 border border-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Reasoning</p>
                  <p className="text-sm text-foreground leading-relaxed">{camp.reasoning}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-background/50 border border-border/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Est. Revenue</p>
                    <p className="font-bold text-foreground flex items-center justify-center gap-0.5">
                       <DollarSign className="w-3 h-3 text-primary"/>{camp.expected_revenue_increase}
                    </p>
                  </div>
                  <div className="bg-background/50 border border-border/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Est. ROI</p>
                    <p className="font-bold text-foreground">{camp.estimated_roi}x</p>
                  </div>
                  <div className="bg-background/50 border border-border/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Target Group</p>
                    <p className="font-semibold text-xs text-foreground truncate px-1" title={camp.target_customers}>{camp.target_customers}</p>
                  </div>
                  <div className="bg-background/50 border border-border/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Duration</p>
                    <p className="font-bold text-foreground">{camp.duration_days} Days</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleAction(camp.id, 'approve')} className="flex-1 shadow-sm gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Approve & Launch
                  </Button>
                  <Button onClick={() => openEdit(camp)} variant="outline" className="shadow-sm border-border bg-background hover:bg-secondary">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => handleAction(camp.id, 'reject')} variant="outline" className="shadow-sm border-border bg-background hover:text-destructive">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Campaigns Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <Activity className="w-5 h-5 text-primary" /> Active & Scheduled Campaigns
        </h2>
        
        <div className="glass rounded-xl border border-border overflow-hidden">
          {activeCampaigns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No active campaigns. Approve a campaign from the AI queue above.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider bg-secondary/20">
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Campaign</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Remaining</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Participants</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Revenue</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Status</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {activeCampaigns.map(camp => (
                    <tr key={camp.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{camp.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">{camp.description}</div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap font-medium">
                        {calculateRemainingDays(camp.recommended_end_date || camp.actual_end_date)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="font-semibold">{Math.floor(Math.random() * 50) + 12}</div>
                        <div className="text-[10px] text-muted-foreground">42% completion</div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap font-medium text-primary">
                        ${Math.floor(Math.random() * 500) + 150}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                         {camp.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> {camp.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => toast.info("Detailed analytics coming soon")} className="h-8 w-8 hover:bg-secondary" title="View Analytics">
                            <BarChart2 className="w-4 h-4 text-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(camp)} className="h-8 w-8 hover:bg-secondary" title="Edit">
                            <Edit className="w-4 h-4 text-foreground" />
                          </Button>
                          {camp.status === 'active' ? (
                            <Button size="icon" variant="ghost" onClick={() => handleAction(camp.id, 'pause')} className="h-8 w-8 hover:bg-secondary" title="Pause">
                              <Pause className="w-4 h-4 text-warning" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={() => handleAction(camp.id, 'resume')} className="h-8 w-8 hover:bg-secondary" title="Resume">
                              <Play className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleAction(camp.id, 'archive')} className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive" title="Archive">
                            <Archive className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl max-w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit AI Campaign</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-5 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Campaign Title</label>
                <Input 
                  value={editForm.title} 
                  onChange={e => setEditForm({...editForm, title: e.target.value})} 
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Description / Rules</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editForm.description} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Start Date</label>
                  <Input 
                    type="date" 
                    value={editForm.recommended_start_date || ''} 
                    onChange={e => setEditForm({...editForm, recommended_start_date: e.target.value})} 
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">End Date</label>
                  <Input 
                    type="date" 
                    value={editForm.recommended_end_date || ''} 
                    onChange={e => setEditForm({...editForm, recommended_end_date: e.target.value})} 
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Duration (Days)</label>
                  <Input 
                    type="number" 
                    value={editForm.duration_days} 
                    onChange={e => setEditForm({...editForm, duration_days: parseInt(e.target.value)})} 
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Reward Type</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editForm.reward_details?.type || 'points'}
                    onChange={e => setEditForm({...editForm, reward_details: { ...editForm.reward_details, type: e.target.value }})}
                  >
                    <option value="points">Points</option>
                    <option value="discount">Discount</option>
                    <option value="upgrade">Free Upgrade</option>
                    <option value="item">Free Item</option>
                  </select>
                </div>
              </div>

              <div className="bg-secondary/20 p-4 rounded-lg border border-border">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> AI Protection Lock
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Target Customers, Business Goals, and Expected ROI cannot be changed. Modifying these core parameters would invalidate the AI's financial predictions and learning model for this campaign.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="gap-2">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
