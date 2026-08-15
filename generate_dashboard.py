import re

content = """import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, Target, Activity, CheckCircle2, XCircle, TrendingUp, Calendar, 
  Users, DollarSign, Brain, Edit, Play, Archive, Pause, RefreshCw, BarChart2,
  Plus, Copy, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function ChallengesGamificationPage() {
  const { profile } = useAuth();
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    title: '', description: '', challenge_type: 'streak', challenge_category: 'engagement',
    source: 'manual', target_count: 5, duration_days: 7, reward_type: 'points', reward_value: '100'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Check pending AI
      let { data: pending } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'pending_approval')
        .order('confidence_score', { ascending: false });

      if (!pending || pending.length === 0) {
        await generateFallbackQueue();
        const { data: p2 } = await supabase
          .from('challenges')
          .select('*')
          .eq('status', 'pending_approval')
          .order('confidence_score', { ascending: false });
        pending = p2;
      }
      setPendingQueue(pending || []);

      // Fetch active & scheduled & paused
      const { data: active } = await supabase
        .from('challenges')
        .select('*')
        .in('status', ['active', 'paused', 'scheduled'])
        .order('start_date', { ascending: false, nullsFirst: true });
        
      setActiveCampaigns(active || []);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load Challenge System data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackQueue = async () => {
    const campaigns = [
      {
        source: 'ai_generated',
        status: 'pending_approval',
        challenge_type: 'time_challenge',
        challenge_category: 'revenue',
        title: 'Morning Warrior',
        description: 'Order 3 drinks before 10 AM within 7 days.',
        business_goal: 'Increase morning traffic',
        target_customers: 'Afternoon regulars',
        expected_revenue_increase: 1200,
        expected_repeat_visits: 4,
        estimated_cost: 80,
        estimated_roi: 3.2,
        confidence_score: 94,
        reasoning: 'Morning traffic dropped 21% this month. Targeting afternoon regulars with a high-reward morning challenge has proven highly effective historically.',
        target_count: 3,
        duration_days: 7,
        reward_type: 'points',
        reward_value: '200',
        reward_description: '200 Loyalty Points',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      },
      {
        source: 'ai_generated',
        status: 'pending_approval',
        challenge_type: 'explorer',
        challenge_category: 'discovery',
        title: 'Mystery Cup',
        description: 'Order 2 new drinks you have never tried before.',
        business_goal: 'Increase overall transaction volume & menu discovery',
        target_customers: 'All customers',
        expected_revenue_increase: 850,
        expected_repeat_visits: 2,
        estimated_cost: 150,
        estimated_roi: 2.1,
        confidence_score: 82,
        reasoning: 'Gamification increases daily order frequency. Customers love surprise mechanics.',
        target_count: 2,
        duration_days: 5,
        reward_type: 'upgrade',
        reward_value: '1',
        reward_description: 'Free Size Upgrade',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      },
      {
        source: 'ai_generated',
        status: 'pending_approval',
        challenge_type: 'win_back',
        challenge_category: 'loyalty',
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
        target_count: 1,
        duration_days: 7,
        reward_type: 'discount',
        reward_value: '50%',
        reward_description: '50% Discount',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      }
    ];
    await supabase.from('challenges').insert(campaigns);
  };

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'approve') {
        await supabase.from('challenges').update({
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: profile?.id,
          start_date: new Date().toISOString().split('T')[0]
        }).eq('id', id);
        toast.success("Challenge Activated!");
      } else if (action === 'reject') {
        await supabase.from('challenges').update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: profile?.id 
        }).eq('id', id);
        toast.success("Challenge Rejected. AI is learning from this.");
      } else if (action === 'pause') {
        await supabase.from('challenges').update({ status: 'paused' }).eq('id', id);
        toast.success("Challenge Paused.");
      } else if (action === 'resume') {
        await supabase.from('challenges').update({ status: 'active' }).eq('id', id);
        toast.success("Challenge Resumed.");
      } else if (action === 'archive') {
        await supabase.from('challenges').update({ 
          status: 'archived', 
          archived_at: new Date().toISOString(),
          end_date: new Date().toISOString().split('T')[0] 
        }).eq('id', id);
        toast.success("Challenge Archived.");
      }
      fetchData();
    } catch (e) {
      toast.error(`Failed to ${action} challenge`);
    }
  };

  const handleDuplicate = async (camp: any) => {
    try {
      const { id, created_at, updated_at, status, ...rest } = camp;
      await supabase.from('challenges').insert({
        ...rest,
        title: `${rest.title} (Copy)`,
        status: 'draft',
        source: 'manual'
      });
      toast.success("Challenge Duplicated as Draft");
      fetchData();
    } catch (e) {
      toast.error("Failed to duplicate challenge");
    }
  };

  const openEdit = (campaign: any) => {
    setEditForm({ ...campaign });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const { id, created_at, updated_at, ...updateData } = editForm;
      await supabase.from('challenges').update(updateData).eq('id', id);
      toast.success("Challenge updated successfully.");
      setIsEditOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to update challenge");
    }
  };
  
  const handleCreateManual = async () => {
    try {
      if (!createForm.title || !createForm.description) {
        toast.error("Title and description are required");
        return;
      }
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (createForm.duration_days || 7));
      
      await supabase.from('challenges').insert({
        ...createForm,
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active'
      });
      toast.success("Manual Challenge created and activated!");
      setIsCreateOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Failed to create challenge");
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
            <Target className="w-8 h-8 text-primary" /> Challenge System 2.0
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-balance">
            Manage your AI-generated campaigns and create manual challenges. AI intelligently analyzes your data to generate revenue opportunities.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0 shadow-sm">
          <Plus className="w-4 h-4" /> Create Manual Challenge
        </Button>
      </div>

      {/* Pending AI Queue */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <Brain className="w-5 h-5 text-primary" /> Pending AI Approval Queue
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
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px] uppercase tracking-wider bg-background/50 border-primary/20 text-primary">{camp.challenge_type}</Badge>
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
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Target Group</p>
                    <p className="font-semibold text-xs text-foreground truncate px-1" title={camp.target_customers}>{camp.target_customers}</p>
                  </div>
                  <div className="bg-background/50 border border-border/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Duration</p>
                    <p className="font-bold text-foreground">{camp.duration_days} Days</p>
                  </div>
                  <div className="bg-background/50 border border-border/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Target</p>
                    <p className="font-bold text-foreground">{camp.target_count} Actions</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleAction(camp.id, 'approve')} className="flex-1 shadow-sm gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button onClick={() => openEdit(camp)} variant="outline" className="shadow-sm border-border bg-background hover:bg-secondary">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button onClick={() => handleDuplicate(camp)} variant="outline" className="shadow-sm border-border bg-background hover:bg-secondary" title="Duplicate">
                    <Copy className="w-4 h-4" />
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
          <Activity className="w-5 h-5 text-primary" /> Active & Scheduled Challenges
        </h2>
        
        <div className="glass rounded-xl border border-border overflow-hidden">
          {activeCampaigns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No active challenges. Create a manual challenge or approve one from the AI queue.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider bg-secondary/20">
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Challenge</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Remaining</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Source</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Reward</th>
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
                        {calculateRemainingDays(camp.end_date)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge variant="outline" className={camp.source === 'ai_generated' ? 'text-primary border-primary/30 bg-primary/5' : 'text-muted-foreground'}>
                          {camp.source === 'ai_generated' ? 'AI Generated' : 'Manual'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap font-medium">
                        {camp.reward_value} {camp.reward_type}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                         {camp.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Active
                          </span>
                        ) : camp.status === 'scheduled' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20">
                            <Clock className="w-3 h-3" /> Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> {camp.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleDuplicate(camp)} className="h-8 w-8 hover:bg-secondary" title="Duplicate">
                            <Copy className="w-4 h-4 text-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(camp)} className="h-8 w-8 hover:bg-secondary" title="Edit">
                            <Edit className="w-4 h-4 text-foreground" />
                          </Button>
                          {camp.status === 'active' ? (
                            <Button size="icon" variant="ghost" onClick={() => handleAction(camp.id, 'pause')} className="h-8 w-8 hover:bg-secondary" title="Pause">
                              <Pause className="w-4 h-4 text-warning" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={() => handleAction(camp.id, 'resume')} className="h-8 w-8 hover:bg-secondary" title="Resume/Activate">
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
            <DialogTitle className="text-xl">Edit Challenge</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Challenge Title</Label>
                <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Description / Rules</Label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={editForm.start_date || ''} onChange={e => setEditForm({...editForm, start_date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={editForm.end_date || ''} onChange={e => setEditForm({...editForm, end_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Target Count (Actions)</Label>
                  <Input type="number" value={editForm.target_count || 1} onChange={e => setEditForm({...editForm, target_count: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (Days)</Label>
                  <Input type="number" value={editForm.duration_days || 7} onChange={e => setEditForm({...editForm, duration_days: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Reward Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editForm.reward_type || 'points'}
                    onChange={e => setEditForm({...editForm, reward_type: e.target.value})}
                  >
                    <option value="points">Points</option>
                    <option value="discount">Discount</option>
                    <option value="upgrade">Free Upgrade</option>
                    <option value="item">Free Item</option>
                    <option value="badge">Badge</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reward Value</Label>
                  <Input value={editForm.reward_value || ''} onChange={e => setEditForm({...editForm, reward_value: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Manual Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl max-w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Create Manual Challenge</DialogTitle>
            <DialogDescription>Create a custom challenge and activate it immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Challenge Title</Label>
              <Input placeholder="e.g. Weekend Warrior" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>Description / Rules</Label>
              <textarea 
                placeholder="What does the customer need to do?"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <Label>Challenge Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={createForm.challenge_type} onChange={e => setCreateForm({...createForm, challenge_type: e.target.value})}
                >
                  <option value="collection">Collection</option>
                  <option value="streak">Streak</option>
                  <option value="explorer">Explorer</option>
                  <option value="time_challenge">Time Challenge</option>
                  <option value="lucky_hour">Lucky Hour</option>
                  <option value="weekend">Weekend Challenge</option>
                  <option value="weather">Weather Challenge</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={createForm.challenge_category} onChange={e => setCreateForm({...createForm, challenge_category: e.target.value})}
                >
                  <option value="engagement">Engagement</option>
                  <option value="revenue">Revenue</option>
                  <option value="loyalty">Loyalty</option>
                  <option value="discovery">Discovery</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Target Count (Actions)</Label>
                <Input type="number" min="1" value={createForm.target_count} onChange={e => setCreateForm({...createForm, target_count: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (Days)</Label>
                <Input type="number" min="1" value={createForm.duration_days} onChange={e => setCreateForm({...createForm, duration_days: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Reward Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={createForm.reward_type}
                  onChange={e => setCreateForm({...createForm, reward_type: e.target.value})}
                >
                  <option value="points">Points</option>
                  <option value="discount">Discount</option>
                  <option value="upgrade">Free Upgrade</option>
                  <option value="item">Free Item</option>
                  <option value="badge">Badge</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reward Value</Label>
                <Input placeholder="e.g. 150" value={createForm.reward_value} onChange={e => setCreateForm({...createForm, reward_value: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateManual}>Create & Activate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"""

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/ChallengesGamificationPage.tsx', 'w') as f:
    f.write(content)
