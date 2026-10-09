import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, Trash2, Plus, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export interface TasteMemory {
  id: string;
  preference_type: string;
  attribute_key: string;
  attribute_value: string;
  confidence_score: number;
  source_context: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemoriesUpdated?: () => void;
}

export default function TasteMemoryManagerModal({
  open,
  onOpenChange,
  onMemoriesUpdated,
}: Props) {
  const { profile } = useAuth();
  const [memories, setMemories] = useState<TasteMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_taste_memories')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data ?? []);
    } catch (err: any) {
      console.error('Failed to load taste memories:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (open) fetchMemories();
  }, [open, fetchMemories]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customer_taste_memories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMemories(prev => prev.filter(m => m.id !== id));
      toast.success('Memory removed');
      onMemoriesUpdated?.();
    } catch (err: any) {
      toast.error('Failed to delete memory');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newVal.trim() || !profile?.id) return;
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('customer_taste_memories')
        .insert({
          cafe_id: profile.cafe_id ?? null,
          customer_id: profile.id,
          preference_type: 'taste_preference',
          attribute_key: newKey.trim(),
          attribute_value: newVal.trim(),
          confidence_score: 1.0,
          source_context: 'user_explicit_entry',
        })
        .select()
        .single();

      if (error) throw error;
      setMemories(prev => [data, ...prev]);
      setNewKey('');
      setNewVal('');
      toast.success('Taste preference recorded');
      onMemoriesUpdated?.();
    } catch (err: any) {
      toast.error('Failed to save memory');
    } finally {
      setAdding(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all learned taste memories?')) return;
    try {
      const { error } = await supabase
        .from('customer_taste_memories')
        .delete()
        .eq('customer_id', profile?.id);

      if (error) throw error;
      setMemories([]);
      toast.success('All AI taste memories wiped cleanly');
      onMemoriesUpdated?.();
    } catch (err: any) {
      toast.error('Failed to wipe memories');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <DialogTitle className="text-base font-semibold">AI Memory Transparency</DialogTitle>
            </div>
            {memories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
              >
                Clear All
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Zero hidden tracking. Every taste rule stored by your AI Barista is transparent, editable, and revocable.
          </DialogDescription>
        </DialogHeader>

        {/* Add Memory Form */}
        <form onSubmit={handleAdd} className="flex gap-2 items-center pt-2">
          <Input
            placeholder="Attribute (e.g. Milk Choice)"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            className="text-xs h-8 flex-1"
          />
          <Input
            placeholder="Preference (e.g. Oat Milk Only)"
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            className="text-xs h-8 flex-1"
          />
          <Button type="submit" size="sm" disabled={adding} className="h-8 px-3 text-xs shrink-0">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </form>

        {/* Memory List */}
        <div className="space-y-2 mt-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading verified memory records…
            </div>
          ) : memories.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-xl p-4 space-y-1.5">
              <ShieldCheck className="w-5 h-5 text-muted-foreground mx-auto" />
              <p className="text-xs font-medium text-foreground">No taste memories stored yet</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Tell your AI Barista what you love or dislike in chat, or manually add your taste rules above.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {memories.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/10 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{m.attribute_key}:</span>
                      <span className="text-xs text-foreground/90">{m.attribute_value}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>Source: {m.source_context.replace('_', ' ')}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        {Math.round(m.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(m.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
