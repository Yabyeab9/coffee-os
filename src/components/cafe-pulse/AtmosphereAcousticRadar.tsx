import React, { useMemo } from 'react';
import { Volume2, VolumeX, Users, Sparkles, Compass, Headphones } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Props {
  signalsCount: number;
  moodCounts: Record<string, number>;
  activityCounts: Record<string, number>;
}

export default function AtmosphereAcousticRadar({
  signalsCount,
  moodCounts,
  activityCounts,
}: Props) {
  const acousticAnalysis = useMemo(() => {
    const total = Math.max(1, signalsCount);
    const studying = (activityCounts['studying'] || 0) + (activityCounts['reading'] || 0);
    const working = activityCounts['working'] || 0;
    const socializing = activityCounts['socializing'] || 0;
    const quietFocusRatio = Math.round(((studying + working) / total) * 100);

    let acousticMode = 'Balanced Ambient Flow';
    let decibelEst = '48 - 54 dB';
    let seatingTip = 'Communal tables and bar counter have a gentle conversational cadence.';
    let icon = Volume2;

    if (quietFocusRatio >= 65) {
      acousticMode = 'Deep Work Sanctuary';
      decibelEst = '38 - 45 dB (Library Whispers)';
      seatingTip = 'Back banquette and window single-seats are in peak focus mode. Perfect for deep creative sprints.';
      icon = VolumeX;
    } else if (socializing / total >= 0.45) {
      acousticMode = 'Vibrant Social Gathering';
      decibelEst = '58 - 66 dB (Warm Buzz)';
      seatingTip = 'Center communal table is lively with creative discourse and laughter.';
      icon = Volume2;
    }

    return {
      quietFocusRatio,
      acousticMode,
      decibelEst,
      seatingTip,
      icon,
    };
  }, [signalsCount, moodCounts, activityCounts]);

  const Icon = acousticAnalysis.icon;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-primary" />
          <div>
            <h4 className="text-xs font-semibold text-foreground">Acoustic & Vibe Guidance</h4>
            <p className="text-[10px] text-muted-foreground">Collective wavelength analysis</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] font-normal border-primary/30 text-primary bg-primary/5">
          {acousticAnalysis.acousticMode}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
          <span className="text-[10px] text-muted-foreground">Acoustic Volume</span>
          <p className="font-semibold text-foreground mt-0.5">{acousticAnalysis.decibelEst}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40">
          <span className="text-[10px] text-muted-foreground">Focus Resonance</span>
          <p className="font-semibold text-foreground mt-0.5">{acousticAnalysis.quietFocusRatio}% Focus Share</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>Sanctuary Focus Index</span>
          <span>{acousticAnalysis.quietFocusRatio}%</span>
        </div>
        <Progress value={acousticAnalysis.quietFocusRatio} className="h-1.5" />
      </div>

      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2 text-xs">
        <Compass className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Seating Guidance: </strong>
          {acousticAnalysis.seatingTip}
        </p>
      </div>
    </div>
  );
}
