import React from 'react';
import { Laptop, Volume2, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  coworkingRatio: number;
  totalSignals: number;
}

export default function CoworkingWavelengthWidget({
  coworkingRatio,
  totalSignals,
}: Props) {
  // Derive noise & focus guideline truthfully
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
          {totalSignals >= 3 ? `${coworkingRatio}% Focused` : 'Calm Ambient'}
        </Badge>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center shrink-0">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {totalSignals < 3
              ? 'Ideal Uncrowded Focus Window'
              : isHighFocus
              ? 'Deep Work & Silent Productivity Environment'
              : isModerateFocus
              ? 'Balanced Co-Working & Soft Ambient Murmur'
              : 'Social & Collaborative Energy Prevailing'}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {totalSignals < 3
              ? 'Low visitor traffic provides prime acoustic isolation for laptop work or study.'
              : isHighFocus
              ? 'The majority of active guests are locked in focus. Keyboard clacks and pour-over steam predominate.'
              : isModerateFocus
              ? 'Gentle background hum, well-suited for casual meetings and creative ideation.'
              : 'Lively café flow. If taking calls or deep reading, headphones recommended.'}
          </p>
        </div>
      </div>

      <div className="pt-1 flex items-center gap-2 text-[10px] text-muted-foreground border-t border-border/30">
        <ShieldCheck className="w-3 h-3 text-muted-foreground/80 shrink-0" />
        <span>Aggregated anonymously from live voluntary visitor signals.</span>
      </div>
    </div>
  );
}
