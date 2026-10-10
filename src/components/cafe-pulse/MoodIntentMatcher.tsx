import { useState } from 'react';
import { ArrowRight, Focus, MessageCircle, Palette, RotateCcw } from 'lucide-react';
import type { AtmosphereData } from './AtmosphereOverviewCard';

const INTENTS = [
  { id: 'focus', label: 'Focus', icon: Focus, activities: ['working', 'reading', 'studying'] },
  { id: 'connect', label: 'Connect', icon: MessageCircle, activities: ['chatting', 'socializing'] },
  { id: 'create', label: 'Create', icon: Palette, activities: ['creating'] },
  { id: 'reset', label: 'Reset', icon: RotateCcw, activities: ['relaxing'] },
] as const;

interface Props {
  atmosphere: AtmosphereData;
}

function matchesActivity(activities: readonly string[], activity: string) {
  return activities.some(candidate => candidate === activity.toLowerCase());
}

export default function MoodIntentMatcher({ atmosphere }: Props) {
  const [selectedIntent, setSelectedIntent] = useState<(typeof INTENTS)[number]['id']>('focus');
  const activityTotal = atmosphere.activity_distribution.reduce((sum, item) => sum + item.count, 0);
  const selected = INTENTS.find(intent => intent.id === selectedIntent) ?? INTENTS[0];
  const matchedActivities = atmosphere.activity_distribution.filter(item => matchesActivity(selected.activities, item.activity));
  const matchedCount = matchedActivities.reduce((sum, item) => sum + item.count, 0);
  const matchPercent = activityTotal ? Math.round((matchedCount / activityTotal) * 100) : 0;
  const canMatch = !atmosphere.is_low_data && activityTotal >= 3;
  const strongestIntent = INTENTS
    .map(intent => ({
      label: intent.label,
      count: atmosphere.activity_distribution
        .filter(item => matchesActivity(intent.activities, item.activity))
        .reduce((sum, item) => sum + item.count, 0),
    }))
    .sort((a, b) => b.count - a.count)[0];

  return (
    <section className="grid gap-6 border-b border-border/70 py-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-10 md:py-8">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">A better visit starts with a read</p>
        <h2 className="font-heading text-xl font-semibold text-foreground">What do you want from this visit?</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Match your intention to the activities guests have chosen to share right now. It is a live snapshot, not a prediction.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Choose your visit intention">
          {INTENTS.map(intent => {
            const Icon = intent.icon;
            const active = selectedIntent === intent.id;
            return (
              <button
                key={intent.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedIntent(intent.id)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm transition-colors ${
                  active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />{intent.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-24 items-center gap-4 border-l-2 border-primary/50 bg-card/50 px-4 py-3">
          {canMatch ? (
            <>
              <div className="min-w-16">
                <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">{matchPercent}%</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">match</p>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {selected.label === strongestIntent?.label
                    ? `${selected.label} is the strongest shared intention.`
                    : `${matchedCount} of ${activityTotal} activity signals match ${selected.label.toLowerCase()}.`}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {matchedCount} of {activityTotal} voluntary activity signals in the current room reading align with your choice.
                </p>
              </div>
              <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-primary sm:block" />
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">The room has not shared enough to make a match yet.</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We need at least three activity signals before showing a fit. Your choice stays on this device and is not shared.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}