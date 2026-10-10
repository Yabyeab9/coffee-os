/**
 * Personal pulse history — stored on this device only.
 *
 * Mood Pulse signals are ephemeral by design (2h TTL server-side), so the
 * customer's own rhythm is kept locally. Nothing here is synced to the server;
 * the UI labels it as device-local so the promise stays honest.
 */

export interface PulseEntry {
  ts: number;
  mood: string;
  activity: string;
  drink?: string | null;
}

const STORAGE_KEY = 'coffee_os_pulse_history_v1';
const MAX_ENTRIES = 90;

export function getPulseHistory(): PulseEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is PulseEntry =>
        !!e && typeof e.ts === 'number' && typeof e.mood === 'string' && typeof e.activity === 'string',
    );
  } catch {
    return [];
  }
}

export function recordPulse(entry: Omit<PulseEntry, 'ts'>): PulseEntry[] {
  const history = getPulseHistory();
  const next = [{ ...entry, ts: Date.now() }, ...history].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: history is a convenience, the live pulse still works.
  }
  return next;
}

export interface PulseWeekStats {
  /** Distinct local days with at least one broadcast, newest first (max 7). */
  days: { key: string; label: string; entries: PulseEntry[] }[];
  topMood: { mood: string; count: number } | null;
  /** Consecutive days (ending today or yesterday) with a broadcast. */
  streakDays: number;
  totalEntries: number;
}

export function getPulseWeekStats(history: PulseEntry[] = getPulseHistory()): PulseWeekStats {
  const now = new Date();
  const dayKey = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const todayKey = dayKey(now.getTime());
  const yesterdayKey = dayKey(now.getTime() - 86_400_000);

  const byDay = new Map<string, PulseEntry[]>();
  for (const entry of history) {
    const key = dayKey(entry.ts);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  }

  const days = [...byDay.entries()]
    .sort((a, b) => b[1][0].ts - a[1][0].ts)
    .slice(0, 7)
    .map(([key, entries]) => {
      const d = new Date(entries[0].ts);
      return {
        key,
        label: d.toLocaleDateString([], { weekday: 'short' }),
        entries: entries.sort((a, b) => b.ts - a.ts),
      };
    });

  const moodCounts = new Map<string, number>();
  for (const entry of history) moodCounts.set(entry.mood, (moodCounts.get(entry.mood) ?? 0) + 1);
  const topMood = [...moodCounts.entries()]
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count)[0] ?? null;

  let streakDays = 0;
  const keys = new Set(byDay.keys());
  let cursor = now.getTime();
  if (!keys.has(dayKey(cursor))) {
    cursor -= 86_400_000; // streak may start yesterday if today is still untouched
    if (!keys.has(dayKey(cursor))) cursor = 0;
  }
  while (cursor > 0 && keys.has(dayKey(cursor))) {
    streakDays += 1;
    cursor -= 86_400_000;
  }

  return { days, topMood, streakDays, totalEntries: history.length };
}
