import React from 'react';
import { Laptop, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  coworkingRatio: number;
  totalSignals: number;
}

export default function CoworkingWavelengthWidget({
  coworkingRatio,
  totalSignals,
}: Props) {
  // The ratio comes from opt-in activity signals; it is not an audio measurement.
  const isHighFocus = coworkingRatio >= 60;
  const isModerateFocus = coworkingRatio >= 30 && coworkingRatio < 60;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Laptop className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Co-Working Wavelength Match
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px] font-normal">
          {totalSignals >= 3 ? `${coworkingRatio}% focus signals` : 'Private reading'}
        </Badge>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {totalSignals < 3
              ? 'The shared reading is private'
              : isHighFocus
              ? 'Focus is the strongest shared intention'
              : isModerateFocus
              ? 'Focus and other intentions are both present'
              : 'The room is leaning away from focus'}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {totalSignals < 3
              ? 'Fewer than three guests have opted in, so we do not infer what the room feels like.'
              : isHighFocus
              ? 'More of the current voluntary signals indicate working or reading than other activities.'
              : isModerateFocus
              ? 'Current guest-selected activities show a mixed room; choose the pace that suits you.'
              : 'Current guest-selected activities include more conversation, creative, or relaxed intentions.'}
          </p>
        </div>
      </div>

      <div className="pt-1 flex items-center gap-2 text-[10px] text-muted-foreground border-t border-border/30">
        <ShieldCheck className="w-3 h-3 text-muted-foreground/80 shrink-0" />
        <span>Opt-in activity only. No microphones, sound estimates, or individual profiles.</span>
      </div>
    </div>
  );
}
