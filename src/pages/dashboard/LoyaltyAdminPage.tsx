import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function LoyaltyAdminPage() {
  const queryClient = useQueryClient();

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['loyalty_tiers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loyalty_tiers').select('*').order('tier_level', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const [newTier, setNewTier] = useState({ name: '', level: 1, threshold: 100, multiplier: 1.0 });

  const addTierMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('loyalty_tiers').insert({
        tier_name: newTier.name,
        tier_level: newTier.level,
        point_threshold: newTier.threshold,
        multiplier: newTier.multiplier
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tier added successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty_tiers'] });
      setNewTier({ name: '', level: 1, threshold: 100, multiplier: 1.0 });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loyalty_tiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tier deleted');
      queryClient.invalidateQueries({ queryKey: ['loyalty_tiers'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-2">
            <Heart className="w-8 h-8 text-primary" />
            Loyalty & Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">Configure reward tiers, points, and plans</p>
        </div>
      </div>

      <Tabs defaultValue="tiers">
        <TabsList className="mb-6">
          <TabsTrigger value="tiers">Tiers & Points</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <div className="glass rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Loyalty Tiers</h2>
            
            <div className="space-y-4 mb-8">
              {tiersLoading ? (
                <p>Loading tiers...</p>
              ) : tiers?.length === 0 ? (
                <p className="text-muted-foreground">No tiers configured.</p>
              ) : (
                tiers?.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
                    <div>
                      <p className="font-semibold text-foreground">{tier.tier_name} (Level {tier.tier_level})</p>
                      <p className="text-sm text-muted-foreground">Requires {tier.point_threshold} pts • {tier.multiplier}x Multiplier</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => deleteTierMutation.mutate(tier.id)} className="text-destructive border-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-md font-semibold mb-4">Add New Tier</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Tier Name</label>
                  <Input value={newTier.name} onChange={(e) => setNewTier({ ...newTier, name: e.target.value })} placeholder="e.g. Gold" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Level</label>
                  <Input type="number" value={newTier.level} onChange={(e) => setNewTier({ ...newTier, level: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Threshold Points</label>
                  <Input type="number" value={newTier.threshold} onChange={(e) => setNewTier({ ...newTier, threshold: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Point Multiplier</label>
                  <Input type="number" step="0.1" value={newTier.multiplier} onChange={(e) => setNewTier({ ...newTier, multiplier: parseFloat(e.target.value) })} />
                </div>
              </div>
              <Button onClick={() => addTierMutation.mutate()} className="mt-4" disabled={!newTier.name || addTierMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" /> Add Tier
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rewards">
          <div className="glass rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Redeemable Rewards</h2>
            <p className="text-muted-foreground">Admin reward configuration coming soon.</p>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <div className="glass rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Subscription Plans</h2>
            <p className="text-muted-foreground">Admin subscription configuration coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
