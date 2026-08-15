import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface CaffeineLog {
  drink_name: string;
  caffeine_mg: number;
  consumed_at: string;
}

interface Props {
  logs: CaffeineLog[];
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

export default function CaffeineTrackerCard({ logs }: Props) {
  const now = new Date();
  const todayLogs = logs.filter(l => {
    const d = new Date(l.consumed_at);
    return d.toDateString() === now.toDateString();
  });

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
            <ReferenceLine x={BEDTIME_HOUR} stroke="#E5E7EB" strokeDasharray="3 3" />
            <ReferenceLine x={Math.round(currentHour)} stroke="#111827" strokeDasharray="2 2" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="mg"
              stroke="#111827"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#111827', strokeWidth: 0 }}
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
    </div>
  );
}
