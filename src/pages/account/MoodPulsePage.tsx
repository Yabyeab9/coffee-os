/**
 * MoodPulse OS — The UNEXPECTED Gen Z killer feature.
 *
 * What it is: A real-time, anonymous "coffee mood radio" — customers
 * broadcast what they're drinking + their current vibe, see a live pulse
 * of what everyone in the café is feeling right now, and discover people
 * on the same wavelength (without any identifiable info).
 *
 * Think: Spotify's "Friend Activity" × a café ambient display × a mood
 * social layer — but entirely anonymous by design. Gen Z loves presence
 * without identity. You feel the café come alive.
 *
 * Features:
 *  - Broadcast your current mood + drink (auto-expires in 2h, anonymous)
 *  - Live pulse chart showing the dominant moods in the café RIGHT NOW
 *  - "Resonance" — tap any signal to say "same energy" (no identity shared)
 *  - Ambient signal stream — curated micro-moments from the café's live context
 *  - "Ghost Mode" — go dark (no broadcasting, just watching)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio, Zap, Moon, Sparkles, Heart, Coffee, Eye, EyeOff,
  Volume2, VolumeX, RefreshCw, Signal, Waves, Flame,
  ArrowRight, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useCafe } from '@/hooks/queries';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mood = 'Quiet Focus' | 'Social Energy' | 'Creative Buzz' | 'Comforted' | 'Energized' | 'Melancholic';

interface MoodMeta {
  icon: React.ElementType;
  color: string;
  ring: string;
  dot: string;
  label: string;
  desc: string;
}

interface LiveSignal {
  id: string;
  mood: Mood;
  drink_hint: string;       // anonymized: "an espresso", "a cold brew"
  resonances: number;
  created_at: string;
  has_resonated?: boolean;  // client-side toggle
}

interface MoodPulse {
  mood: Mood;
  count: number;
  pct: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOODS: Record<Mood, MoodMeta> = {
  'Quiet Focus':   { icon: Moon,     color: 'text-slate-400',   ring: 'ring-slate-500/30',  dot: 'bg-slate-400',   label: 'Quiet Focus',   desc: 'deep in thought' },
  'Social Energy': { icon: Zap,      color: 'text-amber-400',   ring: 'ring-amber-500/30',  dot: 'bg-amber-400',   label: 'Social Energy', desc: 'full of energy' },
  'Creative Buzz': { icon: Sparkles, color: 'text-violet-400',  ring: 'ring-violet-500/30', dot: 'bg-violet-400',  label: 'Creative Buzz', desc: 'in the flow' },
  'Comforted':     { icon: Heart,    color: 'text-rose-400',    ring: 'ring-rose-500/30',   dot: 'bg-rose-400',    label: 'Comforted',     desc: 'warm & cozy' },
  'Energized':     { icon: Flame,    color: 'text-orange-400',  ring: 'ring-orange-500/30', dot: 'bg-orange-400',  label: 'Energized',     desc: 'fired up' },
  'Melancholic':   { icon: Waves,    color: 'text-blue-400',    ring: 'ring-blue-500/30',   dot: 'bg-blue-400',    label: 'Melancholic',   desc: 'quietly reflective' },
};

const DRINK_HINTS = [
  'an espresso', 'a cold brew', 'a cortado', 'a pour-over',
  'a flat white', 'a latte', 'a macchiato', 'a filter coffee',
  'a cappuccino', 'a matcha latte', 'something warm', 'a seasonal special',
];

const ALL_MOODS = Object.keys(MOODS) as Mood[];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function randomHint() {
  return DRINK_HINTS[Math.floor(Math.random() * DRINK_HINTS.length)];
}

/** Derive a stable anonymous session token (not tied to identity) */
function getAnonToken() {
  let t = sessionStorage.getItem('mp_anon');
  if (!t) { t = crypto.randomUUID(); sessionStorage.setItem('mp_anon', t); }
  return t;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PulseBar({ pulse, max }: { pulse: MoodPulse; max: number }) {
  const meta = MOODS[pulse.mood];
  const Icon = meta.icon;
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-28 shrink-0 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
        <span className="text-xs text-muted-foreground truncate">{meta.label}</span>
      </div>
      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${meta.dot}`}
          initial={{ width: 0 }}
          animate={{ width: `${max > 0 ? (pulse.count / max) * 100 : 0}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{pulse.count}</span>
    </motion.div>
  );
}

function SignalCard({
  sig,
  onResonate,
}: {
  sig: LiveSignal;
  onResonate: (id: string) => void;
}) {
  const meta = MOODS[sig.mood];
  const Icon = meta.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0"
    >
      {/* Mood dot */}
      <div className={`w-8 h-8 rounded-full ring-2 ${meta.ring} bg-card flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-tight">
          Someone enjoying <span className="text-primary font-medium">{sig.drink_hint}</span>
        </p>
        <p className={`text-xs ${meta.color} mt-0.5`}>{meta.desc}</p>
      </div>

      {/* Time + Resonate */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground">{timeAgo(sig.created_at)}</span>
        <button
          onClick={() => onResonate(sig.id)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all
            ${sig.has_resonated
              ? 'border-primary/50 text-primary bg-primary/10'
              : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
        >
          {sig.has_resonated ? <Check className="w-3 h-3" /> : <Signal className="w-3 h-3" />}
          <span>{sig.resonances}</span>
        </button>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MoodPulsePage() {
  const { profile } = useAuth();
  const { data: cafe } = useCafe();
  const anonToken = useRef(getAnonToken());

  // ── State ────────────────────────────────────────────────────────────────
  const [ghostMode, setGhostMode] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [myMood, setMyMood] = useState<Mood | null>(null);
  const [myDrinkHint, setMyDrinkHint] = useState(randomHint());
  const [mySignalId, setMySignalId] = useState<string | null>(null);

  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [pulse, setPulse] = useState<MoodPulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Fetch live signals ───────────────────────────────────────────────────
  const fetchSignals = useCallback(async () => {
    if (!cafe?.id) return;
    // Pull last 2h of anonymous signals
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('ambient_signals')
      .select('id, signal_type, signal_text, created_at')
      .eq('cafe_id', cafe.id)
      .eq('signal_type', 'social_context')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return;

    // Parse stored signals into LiveSignal shape
    const signals: LiveSignal[] = data.map((row: any) => {
      let parsed: Partial<LiveSignal> = {};
      try { parsed = JSON.parse(row.signal_text); } catch { /* ignore */ }
      return {
        id: row.id,
        mood: parsed.mood ?? 'Quiet Focus',
        drink_hint: parsed.drink_hint ?? 'something warm',
        resonances: parsed.resonances ?? 0,
        created_at: row.created_at,
        has_resonated: false,
      };
    });

    setLiveSignals(signals);

    // Compute pulse distribution
    const counts: Record<string, number> = {};
    for (const s of signals) counts[s.mood] = (counts[s.mood] ?? 0) + 1;
    const maxCount = Math.max(...Object.values(counts), 1);
    const pulseArr: MoodPulse[] = ALL_MOODS
      .map(m => ({ mood: m, count: counts[m] ?? 0, pct: Math.round(((counts[m] ?? 0) / signals.length) * 100) || 0 }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count);
    setPulse(pulseArr.length ? pulseArr : []);
    setLoading(false);
    setLastRefresh(new Date());
  }, [cafe?.id]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!cafe?.id) return;
    const channel = supabase
      .channel(`mood-pulse-${cafe.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ambient_signals',
        filter: `cafe_id=eq.${cafe.id}`,
      }, () => fetchSignals())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cafe?.id, fetchSignals]);

  // ── Broadcast mood ────────────────────────────────────────────────────────
  const broadcastMood = async () => {
    if (!cafe?.id || !myMood || ghostMode) return;
    setBroadcasting(true);
    try {
      const payload = JSON.stringify({
        mood: myMood,
        drink_hint: myDrinkHint,
        resonances: 0,
        anon_token: anonToken.current,
      });

      // Remove previous broadcast first
      if (mySignalId) {
        await supabase.from('ambient_signals').delete().eq('id', mySignalId);
      }

      const { data, error } = await supabase
        .from('ambient_signals')
        .insert({
          cafe_id: cafe.id,
          customer_id: profile?.id ?? null,
          signal_type: 'social_context',
          signal_text: payload,
          is_actionable: false,
          shown_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      setMySignalId(data.id);
      toast.success('Mood broadcast — the café feels you ✦');
      fetchSignals();
    } catch (err: any) {
      toast.error('Could not broadcast', { description: err.message });
    } finally {
      setBroadcasting(false);
    }
  };

  // ── Stop broadcasting ─────────────────────────────────────────────────────
  const stopBroadcast = async () => {
    if (mySignalId) {
      await supabase.from('ambient_signals').delete().eq('id', mySignalId);
      setMySignalId(null);
    }
    setMyMood(null);
    toast('Signal removed — you\'re off the pulse.');
  };

  // ── Resonate ──────────────────────────────────────────────────────────────
  const handleResonate = async (signalId: string) => {
    setLiveSignals(prev => prev.map(s => {
      if (s.id !== signalId) return s;
      const toggled = !s.has_resonated;
      const newCount = toggled ? s.resonances + 1 : Math.max(0, s.resonances - 1);
      // persist updated resonance count back into signal_text
      supabase
        .from('ambient_signals')
        .update({ signal_text: JSON.stringify({
          mood: s.mood,
          drink_hint: s.drink_hint,
          resonances: newCount,
          anon_token: anonToken.current,
        }) })
        .eq('id', signalId)
        .then(() => {});
      return { ...s, resonances: newCount, has_resonated: toggled };
    }));
  };

  // ── Ghost mode toggle ─────────────────────────────────────────────────────
  const toggleGhost = () => {
    if (!ghostMode && mySignalId) stopBroadcast();
    setGhostMode(g => !g);
  };

  // ── Dominant mood ──────────────────────────────────────────────────────────
  const dominant = pulse[0];
  const totalSignals = liveSignals.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Live</span>
          </div>
          <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight">Mood Pulse</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anonymous energy of everyone in the café right now
          </p>
        </div>
        <button
          onClick={toggleGhost}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all
            ${ghostMode
              ? 'border-muted-foreground/50 text-muted-foreground bg-muted/30'
              : 'border-border text-foreground hover:border-primary/40'}`}
        >
          {ghostMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {ghostMode ? 'Ghost Mode' : 'Visible'}
        </button>
      </div>

      {/* ── Live ambient pulse ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {totalSignals > 0 ? `${totalSignals} signal${totalSignals !== 1 ? 's' : ''} right now` : 'Quiet right now'}
            </span>
          </div>
          <button onClick={fetchSignals} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {dominant && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {(() => { const Icon = MOODS[dominant.mood].icon; return <Icon className={`w-4 h-4 ${MOODS[dominant.mood].color}`} />; })()}
            <span>Dominant vibe: <span className={`font-medium ${MOODS[dominant.mood].color}`}>{dominant.mood}</span> — {dominant.pct}% of the café</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-28 h-3 rounded bg-muted" />
                <div className="flex-1 h-1.5 rounded-full bg-muted" />
                <div className="w-6 h-3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : pulse.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Be the first to broadcast your mood today.</p>
        ) : (
          <div className="space-y-3">
            {pulse.map(p => (
              <PulseBar key={p.mood} pulse={p} max={pulse[0].count} />
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60">
          Refreshed {timeAgo(lastRefresh.toISOString())} · All signals anonymous · Auto-expire 2h
        </p>
      </div>

      {/* ── My Broadcast ──────────────────────────────────────────────── */}
      {!ghostMode && (
        <div className="rounded-xl border border-border/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              Your Signal
              {mySignalId && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
            </h2>
            {mySignalId && (
              <button onClick={stopBroadcast} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
                <X className="w-3 h-3" /> Stop
              </button>
            )}
          </div>

          {/* Mood selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">How are you feeling?</p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_MOODS.map(m => {
                const meta = MOODS[m];
                const Icon = meta.icon;
                const active = myMood === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMyMood(m)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all
                      ${active
                        ? `border-primary/50 bg-primary/10 ${meta.color}`
                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-center leading-tight">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drink hint */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Drinking…</p>
            <div className="flex flex-wrap gap-2">
              {DRINK_HINTS.slice(0, 6).map(h => (
                <button
                  key={h}
                  onClick={() => setMyDrinkHint(h)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all
                    ${myDrinkHint === h
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
                >
                  {h}
                </button>
              ))}
              <button
                onClick={() => setMyDrinkHint(randomHint())}
                className="text-xs px-3 py-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground transition-all"
              >
                ↻ random
              </button>
            </div>
          </div>

          <Button
            onClick={broadcastMood}
            disabled={!myMood || broadcasting}
            className="w-full"
          >
            {broadcasting
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Broadcasting…</>
              : mySignalId
                ? <><Check className="w-4 h-4 mr-2" /> Update Signal</>
                : <><Radio className="w-4 h-4 mr-2" /> Broadcast Mood</>}
          </Button>
        </div>
      )}

      {ghostMode && (
        <div className="rounded-xl border border-border/40 p-5 text-center space-y-2">
          <VolumeX className="w-6 h-6 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Ghost Mode — you're watching, not broadcasting.</p>
          <button onClick={toggleGhost} className="text-xs text-primary hover:underline">Unmute yourself</button>
        </div>
      )}

      <Separator className="opacity-30" />

      {/* ── Live Signal Stream ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Waves className="w-4 h-4 text-primary" /> Signal Stream
          </h2>
          <span className="text-xs text-muted-foreground">{totalSignals} active</span>
        </div>

        {liveSignals.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Coffee className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">The café is quiet.</p>
            <p className="text-xs text-muted-foreground/60">Be the first to set the mood today.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {liveSignals.map(sig => (
              <SignalCard key={sig.id} sig={sig} onResonate={handleResonate} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-muted/20 border border-border/30 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">How Mood Pulse works</h3>
        <div className="space-y-2">
          {[
            ['✦ Fully anonymous', 'No name, no photo, no identity — just energy.'],
            ['✦ Resonance', 'Tap the signal button on any card to say "same energy". Counts go up. That\'s it.'],
            ['✦ Ghost Mode', 'Watch the café pulse without broadcasting anything.'],
            ['✦ Auto-expire', 'Your signal disappears after 2 hours automatically.'],
          ].map(([title, body]) => (
            <div key={title} className="text-xs">
              <span className="text-foreground font-medium">{title} — </span>
              <span className="text-muted-foreground">{body}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
