import React from 'react';
import { motion } from 'motion/react';
import { Radio, Users, Wind, Sparkles, Coffee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface AtmosphereData {
  is_low_data: boolean;
  total_signals: number;
  status_phrase: string;
  message: string;
  dominant_mood: string | null;
  mood_distribution: { mood: string; count: number; pct: number }[];
  activity_distribution: { activity: string; count: number; pct: number }[];
  coworking_ratio: number;
}

interface Props {
  atmosphere: AtmosphereData;
  onBroadcastClick: () => void;
  isBroadcasting: boolean;
}

export default function AtmosphereOverviewCard({
  atmosphere,
  onBroadcastClick,
  isBroadcasting,
}: Props) {
  if (atmosphere.is_low_data) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border border-border bg-muted/30 flex items-center justify-center mx-auto">
          <Wind className="w-5 h-5 text-muted-foreground stroke-[1.5]" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <Badge variant="outline" className="text-[10px] font-normal tracking-wide uppercase px-2.5 py-0.5 border-border">
            Truthful Ambient State · Rolling 2h
          </Badge>
          <h2 className="text-lg md:text-xl font-medium tracking-tight text-foreground">
            {atmosphere.status_phrase}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {atmosphere.message}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onBroadcastClick}
            className="text-xs px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all font-medium inline-flex items-center gap-2"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            {isBroadcasting ? 'Update Your Signal' : 'Be First to Broadcast Vibe'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Live Ambient Atmosphere
            </span>
            <span className="text-[11px] text-muted-foreground">· 2-Hour Rolling Pulse</span>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            {atmosphere.status_phrase}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{atmosphere.total_signals} Present</p>
            <p className="text-[11px] text-muted-foreground">Voluntary Signals</p>
          </div>
          <button
            onClick={onBroadcastClick}
            className="text-xs px-3.5 py-1.5 rounded-full border border-border hover:bg-muted/40 transition-colors font-medium flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-primary" />
            {isBroadcasting ? 'Pulse Active' : 'Broadcast Vibe'}
          </button>
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <span className="text-xs font-medium text-muted-foreground block">
          Current Mood Composition
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {atmosphere.mood_distribution.map(item => (
            <div key={item.mood} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">{item.mood}</span>
                <span className="text-muted-foreground">{item.count} ({item.pct}%)</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-500"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
