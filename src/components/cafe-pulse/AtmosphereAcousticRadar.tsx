import { BookOpen, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  signalsCount: number;
  activityCounts: Record<string, number>;
}

const ACTIVITY_GROUPS = [
  { label: 'Focus', activities: ['working', 'reading', 'studying'], icon: BookOpen, color: 'bg-teal-400' },
  { label: 'Connect', activities: ['chatting', 'socializing'], icon: MessageCircle, color: 'bg-orange-300' },
  { label: 'Create & unwind', activities: ['creating', 'relaxing'], icon: Sparkles, color: 'bg-amber-300' },
];

export default function AtmosphereAcousticRadar({ signalsCount, activityCounts }: Props) {
  const activityTotal = Object.values(activityCounts).reduce((sum, count) => sum + count, 0);
  const groups = ACTIVITY_GROUPS.map(group => ({
    ...group,
    count: group.activities.reduce((sum, activity) => sum + (activityCounts[activity] ?? 0), 0),
  }));
  const hasPrivateSample = signalsCount < 3;
  const hasActivityData = activityTotal > 0;

  return (
    <section className="border-y border-border/70 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Room reading</p>
          <h3 className="mt-1 font-heading text-lg font-semibold text-foreground">What the room is here for</h3>
        </div>
        <Badge variant="outline" className="gap-1.5 text-[10px] font-normal">
          <ShieldCheck className="h-3 w-3" /> Guest-selected, not recorded
        </Badge>
      </div>

      {hasPrivateSample || !hasActivityData ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {hasPrivateSample
            ? 'Activity stays private until at least three guests opt in. No audio is captured or analyzed.'
            : 'There is not enough activity detail in the current pulse to describe a room pattern.'}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-3">
          {groups.map(group => {
            const Icon = group.icon;
            const share = Math.round((group.count / activityTotal) * 100);
            return (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" />{group.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{share}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${group.label}: ${share}% of activity signals`}>
                  <div className={`h-full rounded-full transition-[width] duration-500 ${group.color}`} style={{ width: `${share}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{group.count} voluntary activity {group.count === 1 ? 'signal' : 'signals'}</p>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        A snapshot of chosen intentions, not a measurement of sound, occupancy, or individual behavior.
      </p>
    </section>
  );
}