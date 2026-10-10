import { Radio, EyeOff, Clock3 } from 'lucide-react';

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
  isGhostMode: boolean;
  signalExpiresAt: string | null;
}

const MOOD_COLORS: Record<string, string> = {
  'Quiet Focus': '#77b7b0',
  'Social Energy': '#e9a46f',
  'Creative Buzz': '#c7b46d',
  Comforted: '#d47e70',
  Energized: '#e47d55',
  Melancholic: '#899cb5',
};

export default function AtmosphereOverviewCard({
  atmosphere,
  onBroadcastClick,
  isBroadcasting,
  isGhostMode,
  signalExpiresAt,
}: Props) {
  const chartMoods = atmosphere.mood_distribution.filter(item => item.count > 0);
  const chartTotal = chartMoods.reduce((sum, item) => sum + item.pct, 0);
  let cursor = 0;
  const chartStops = chartMoods.map(item => {
    const start = cursor;
    cursor += chartTotal ? (item.pct / chartTotal) * 100 : 0;
    return `${MOOD_COLORS[item.mood] ?? '#a67051'} ${start}% ${cursor}%`;
  });
  const expiresIn = signalExpiresAt
    ? Math.max(0, Math.ceil((new Date(signalExpiresAt).getTime() - Date.now()) / 60_000))
    : null;

  return (
    <section className="relative overflow-hidden border-y border-border/70 bg-card/35 px-5 py-7 md:px-8 md:py-9">
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
              <span className={`h-2 w-2 rounded-full ${atmosphere.is_low_data ? 'bg-muted-foreground' : 'bg-emerald-400'}`} />
              {atmosphere.is_low_data ? 'A quiet signal' : 'Live room reading'}
            </span>
            <span className="text-xs text-muted-foreground">Rolling two-hour window · anonymous by design</span>
          </div>
          <div className="max-w-2xl space-y-2">
            <h2 className="font-heading text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              {atmosphere.status_phrase}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {atmosphere.is_low_data
                ? 'We only reveal a shared read when at least three guests opt in. Until then, the room keeps its privacy.'
                : atmosphere.message}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBroadcastClick}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              {isGhostMode ? <EyeOff className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              {isGhostMode ? 'Exit observer mode to share' : isBroadcasting ? 'Update my pulse' : 'Share my pulse'}
            </button>
            {isBroadcasting && expiresIn !== null && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {expiresIn > 0 ? `Your signal expires in ${Math.floor(expiresIn / 60)}h ${expiresIn % 60}m` : 'Your signal is expiring'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 md:pr-2">
          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full p-[7px] md:h-36 md:w-36"
            style={{ background: !atmosphere.is_low_data && chartStops.length ? `conic-gradient(from -90deg, ${chartStops.join(', ')})` : 'conic-gradient(from -90deg, hsl(var(--border)) 0 100%)' }}
            aria-label={atmosphere.is_low_data ? 'Mood composition hidden until three voluntary signals are available' : 'Current mood composition'}>
            <div className="grid h-full w-full place-items-center rounded-full border border-border/70 bg-background text-center">
              <div>
                <div className="font-heading text-2xl font-semibold tabular-nums text-foreground md:text-3xl">
                  {atmosphere.is_low_data ? '—' : atmosphere.total_signals}
                </div>
                <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  {atmosphere.is_low_data ? 'private' : 'signals'}
                </div>
              </div>
            </div>
          </div>
          {!atmosphere.is_low_data && (
            <div className="hidden min-w-32 space-y-2 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Room mix</p>
              {chartMoods.slice(0, 4).map(item => (
                <div key={item.mood} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MOOD_COLORS[item.mood] ?? '#a67051' }} />
                  <span className="min-w-0 flex-1 truncate text-foreground">{item.mood}</span>
                  <span className="tabular-nums text-muted-foreground">{item.pct}%</span>
                </div>
              ))}
            </div>
          )}
          {atmosphere.is_low_data && (
            <div className="max-w-36 text-xs leading-relaxed text-muted-foreground">
              {atmosphere.total_signals < 3 ? 'Shared readings unlock at 3 voluntary signals.' : 'Only the collective mood mix is shown.'}
            </div>
          )}
        </div>
      </div>
      {atmosphere.is_low_data && (
        <div className="mt-5 border-t border-border/50 pt-4 text-xs text-muted-foreground sm:hidden">
          Shared readings unlock at three voluntary signals. Individual moods are never shown.
        </div>
      )}
    </section>
  );
}
