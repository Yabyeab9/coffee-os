import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, Moon, Zap, Sparkles, Heart, Flame, Waves, Check, X, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type MoodType = 'Quiet Focus' | 'Social Energy' | 'Creative Buzz' | 'Comforted' | 'Energized' | 'Melancholic';
export type ActivityType = 'working' | 'reading' | 'chatting' | 'creating' | 'relaxing';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId: string;
  sessionToken: string;
  currentMood: MoodType | null;
  currentActivity: ActivityType | null;
  onSignalUpdated: () => void;
  onSignalRevoked: () => void;
}

const MOOD_OPTIONS: { id: MoodType; label: string; icon: any; desc: string }[] = [
  { id: 'Quiet Focus', label: 'Quiet Focus', icon: Moon, desc: 'Deep reading or study' },
  { id: 'Social Energy', label: 'Social Energy', icon: Zap, desc: 'Conversations & catching up' },
  { id: 'Creative Buzz', label: 'Creative Buzz', icon: Sparkles, desc: 'Ideating, writing, sketching' },
  { id: 'Comforted', label: 'Comforted', icon: Heart, desc: 'Savoring a cozy pause' },
  { id: 'Energized', label: 'Energized', icon: Flame, desc: 'Ready to conquer the day' },
  { id: 'Melancholic', label: 'Melancholic', icon: Waves, desc: 'Reflective & mellow' },
];

const ACTIVITY_OPTIONS: { id: ActivityType; label: string }[] = [
  { id: 'working', label: 'Laptop / Work' },
  { id: 'reading', label: 'Reading Book / Articles' },
  { id: 'chatting', label: 'Catching Up with Friends' },
  { id: 'creating', label: 'Designing / Writing' },
  { id: 'relaxing', label: 'People Watching / Relaxing' },
];

export default function PulseBroadcastModal({
  open,
  onOpenChange,
  cafeId,
  sessionToken,
  currentMood,
  currentActivity,
  onSignalUpdated,
  onSignalRevoked,
}: Props) {
  const [selectedMood, setSelectedMood] = useState<MoodType>(currentMood ?? 'Quiet Focus');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(currentActivity ?? 'working');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedMood(currentMood ?? 'Quiet Focus');
    setSelectedActivity(currentActivity ?? 'working');
  }, [open, currentMood, currentActivity]);

  const handleBroadcast = async () => {
    if (!cafeId) return;
    setSubmitting(true);
    try {
      // Clean previous signal from this session
      const { error: removeError } = await supabase
        .from('cafe_pulse_signals')
        .delete()
        .eq('cafe_id', cafeId)
        .eq('session_token', sessionToken);
      if (removeError) throw removeError;

      // Insert new signal with 2 hour TTL
      const { error } = await supabase.from('cafe_pulse_signals').insert({
        cafe_id: cafeId,
        session_token: sessionToken,
        mood_state: selectedMood,
        activity_state: selectedActivity,
      });

      if (error) throw error;
      toast.success(`You are broadcasting "${selectedMood}" to the space (2h TTL)`);
      onSignalUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to broadcast signal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('cafe_pulse_signals')
        .delete()
        .eq('cafe_id', cafeId)
        .eq('session_token', sessionToken);
      if (error) throw error;

      toast.info('Your pulse broadcast has been discontinued');
      onSignalRevoked();
      onOpenChange(false);
    } catch {
      toast.error('Failed to discontinue pulse');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">Broadcast Your Café Vibe</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            100% anonymous. Your pulse joins the room's ambient energy and automatically expires in 2 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Mood Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Select Your Current Atmosphere State
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOOD_OPTIONS.map(m => {
                const Icon = m.icon;
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedMood(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-medium text-foreground">{m.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              What are you focusing on?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_OPTIONS.map(act => (
                <button
                  key={act.id}
                  type="button"
                  aria-pressed={selectedActivity === act.id}
                  onClick={() => setSelectedActivity(act.id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    selectedActivity === act.id
                      ? 'border-foreground bg-foreground text-background font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            {currentMood ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevoke}
                disabled={submitting}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                Go Dark (Revoke Signal)
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBroadcast}
                disabled={submitting}
                className="text-xs"
              >
                {submitting ? 'Broadcasting…' : 'Broadcast to Space'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
