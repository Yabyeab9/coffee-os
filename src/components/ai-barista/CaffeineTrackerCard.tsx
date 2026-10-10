import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Plus, Loader2 } from 'lucide-react';

export interface CaffeineLog {
  drink_name: string;
  caffeine_mg: number;
  consumed_at: string;
}

export interface CaffeineSuggestion {
  name: string;
  caffeine_mg: number;
}

interface Props {
  logs: CaffeineLog[];
  /** Menu-derived suggestions so logged amounts come from real menu data. */
  suggestions?: CaffeineSuggestion[];
  /** Called with (drink name, mg). Returns falsey on failure. */
  onQuickLog?: (drinkName: string, caffeineMg: number) => Promise<boolean>;
}

const HALF_LIFE_HOURS = 5.7;
const BEDTIME_HOUR = 22; // 10 PM

function decayMg(mg: number, hours: number) {
  return mg * Math.pow(0.5, hours / HALF_LIFE_HOURS);
}

function sleepRisk(mgAtBedtime: number): { label: string; color: string } {
  if (mgAtBedtime > 50) return { label: 'High', color: 'text-destructive' };
  if (mgAtBedtime > 30) return { label: 'Moderate', color: 'text-warning' };
  return { label: 'Low', color: 'text-success' };
}

export default function CaffeineTrackerCard({ logs, suggestions = [], onQuickLog }: Props) {
  const now = new Date();
  const [logOpen, setLogOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMg, setCustomMg] = useState('');
  const [saving, setSaving] = useState(false);

  const todayLogs = logs.filter(l => {
    const d = new Date(l.consumed_at);
    return d.toDateString() === now.toDateString();
  });

  const submitLog = async (drinkName: string, caffeineMg: number) => {
    if (!onQuickLog || !drinkName.trim() || !(caffeineMg > 0)) return;
    setSaving(true);
    try {
      const ok = await onQuickLog(drinkName.trim(), Math.round(caffeineMg));
      if (ok) {
        setLogOpen(false);
        setCustomName('');
        setCustomMg('');
      }
    } finally {
      setSaving(false);
    }
  };

  // Build 24-point hourly curve
  const chartData = useMemo(() => {
    return Array.from({ length: 25 }, (_, h) => {
      const hourMg = todayLogs.reduce((sum, log) => {
        const consumedHour = new Date(log.consumed_at).getHours() + new Date(log.consumed_at).getMinutes() / 60;
        if (h < consumedHour) return sum;
        const elapsed = h - consumedHour;
        return sum + decayMg(log.caffeine_mg, elapsed);
      }, 0);
      return { hour: `${h}:00`, mg: Math.round(hourMg), h };
    });
  }, [todayLogs]);

  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentMg = chartData.find(d => d.h >= Math.floor(currentHour))?.mg ?? 0;
  const bedtimeMg = chartData.find(d => d.h === BEDTIME_HOUR)?.mg ?? 0;
  const risk = sleepRisk(bedtimeMg);
  const totalConsumed = todayLogs.reduce((s, l) => s + l.caffeine_mg, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">Now: {currentMg}mg</p>
          <p className="text-xs text-muted-foreground">at bedtime: {bedtimeMg}mg</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
          risk.label === 'High'
            ? 'border-destructive/30 bg-destructive/8 text-destructive'
            : risk.label === 'Moderate'
              ? 'border-yellow-300/40 bg-yellow-50/60 text-yellow-700'
              : 'border-success/30 bg-success/8 text-success'
        }`}>
          {risk.label} sleep risk
        </span>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="h"
              ticks={[6, 12, 18, 22]}
              tickFormatter={h => `${h}h`}
              tick={{ fontSize: 9, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, Math.max(totalConsumed + 20, 60)]} />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-background border border-border rounded-md px-2 py-1 text-xs shadow-none">
                    {payload[0].payload.hour} — {payload[0].value}mg
                  </div>
                ) : null
              }
            />
            <ReferenceLine x={BEDTIME_HOUR} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.8} />
            <ReferenceLine x={Math.round(currentHour)} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" strokeOpacity={0.6} />
            <Line
              type="monotone"
              dataKey="mg"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {todayLogs.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">No caffeine logged today</p>
      )}

      {todayLogs.length > 0 && (
        <div className="space-y-0.5 max-h-20 overflow-y-auto">
          {todayLogs.map((l, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground">
              <span className="truncate">{l.drink_name}</span>
              <span className="shrink-0 ml-2">{l.caffeine_mg}mg · {new Date(l.consumed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}

      {onQuickLog && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          {!logOpen ? (
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <Plus className="w-3 h-3" /> Log a drink
            </button>
          ) : (
            <div className="space-y-2">
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, 4).map(s => (
                    <button
                      key={s.name}
                      type="button"
                      disabled={saving}
                      onClick={() => void submitLog(s.name, s.caffeine_mg)}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                      title={`Log ${s.caffeine_mg}mg from the menu`}
                    >
                      {s.name} · {s.caffeine_mg}mg
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Drink"
                  maxLength={60}
                  className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  value={customMg}
                  onChange={e => setCustomMg(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="mg"
                  inputMode="numeric"
                  className="w-14 text-xs px-2 py-1.5 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={saving || !customName.trim() || !(Number(customMg) > 0)}
                  onClick={() => void submitLog(customName, Number(customMg))}
                  className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-xs disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
