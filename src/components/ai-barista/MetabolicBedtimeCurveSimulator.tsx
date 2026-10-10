import React, { useMemo } from 'react';
import { Moon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CaffeineLog } from '@/components/ai-barista/CaffeineTrackerCard';

interface Props {
  caffeineLogs: CaffeineLog[];
}

export default function MetabolicBedtimeCurveSimulator({ caffeineLogs }: Props) {
  const HALF_LIFE_HOURS = 5.7;

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayLogs = caffeineLogs.filter(l => l.consumed_at && l.consumed_at.startsWith(todayStr));
    const totalToday = todayLogs.reduce((acc, l) => acc + (l.caffeine_mg || 0), 0);

    // Bedtime assumed at 23:00 (11 PM)
    const bedtime = new Date(now);
    bedtime.setHours(23, 0, 0, 0);
    if (bedtime.getTime() < now.getTime()) {
      bedtime.setDate(bedtime.getDate() + 1);
    }

    // Trajectory at hourly intervals from now until +8 hours
    const trajectory: Array<{ hourLabel: string; mg: number }> = [];
    for (let i = 0; i <= 8; i++) {
      const pointTime = new Date(now.getTime() + i * 3600 * 1000);
      let remaining = 0;

      todayLogs.forEach(log => {
        const logTime = new Date(log.consumed_at).getTime();
        const elapsedHours = Math.max(0, (pointTime.getTime() - logTime) / (1000 * 3600));
        remaining += log.caffeine_mg * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS);
      });

      trajectory.push({
        hourLabel: pointTime.toLocaleTimeString([], { hour: 'numeric' }),
        mg: Math.round(remaining),
      });
    }

    // Bedtime exact remaining
    let bedtimeRemaining = 0;
    todayLogs.forEach(log => {
      const logTime = new Date(log.consumed_at).getTime();
      const elapsedHours = Math.max(0, (bedtime.getTime() - logTime) / (1000 * 3600));
      bedtimeRemaining += log.caffeine_mg * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS);
    });
    bedtimeRemaining = Math.round(bedtimeRemaining);

    const sleepSafe = bedtimeRemaining <= 50;
    const peakMg = trajectory[0]?.mg ?? totalToday;

    return {
      totalToday,
      bedtimeRemaining,
      sleepSafe,
      peakMg,
      trajectory,
    };
  }, [caffeineLogs]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-foreground">Metabolic Bedtime Trajectory</h4>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] font-normal ${
            stats.sleepSafe
              ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
              : 'border-amber-500/40 text-amber-500 bg-amber-500/10'
          }`}
        >
          {stats.sleepSafe ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Sleep Safe
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> REM Alert
            </span>
          )}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-muted-foreground text-[10px]">Today's Intake</span>
          <p className="font-bold text-foreground">{stats.totalToday} mg</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground text-[10px]">Est. at 11 PM Bedtime</span>
          <p className={`font-bold ${stats.sleepSafe ? 'text-emerald-500' : 'text-amber-500'}`}>
            {stats.bedtimeRemaining} mg
          </p>
        </div>
      </div>

      {/* Hourly Clearance Timeline */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Active Clearance Timeline (5.7h Half-life)</span>
          <span>Target &lt; 50mg</span>
        </div>
        <div className="flex items-end gap-1.5 h-16 pt-2 px-1 bg-muted/20 rounded-lg">
          {stats.trajectory.map((p, idx) => {
            const heightPct = stats.peakMg > 0 ? Math.max(12, Math.min(100, (p.mg / stats.peakMg) * 100)) : 15;
            const isSafe = p.mg <= 50;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[8px] text-muted-foreground font-mono">{p.mg}</span>
                <div
                  className={`w-full rounded-t transition-all ${
                    isSafe ? 'bg-emerald-500/60' : 'bg-amber-500/70'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[8px] text-muted-foreground/80">{p.hourLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
        {stats.sleepSafe
          ? 'Your active adenosine receptors are projected to clear by bedtime, ensuring unfragmented deep slow-wave sleep.'
          : 'High circulating bedtime caffeine. Consider switching to our water-processed Decaf Sidama pour-over or herbal infusion.'}
      </p>
    </div>
  );
}
