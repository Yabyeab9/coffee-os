import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Radio, Sparkles, RefreshCw, Eye, EyeOff, Coffee,
  Share2, ShieldCheck, Heart, Users, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useCafe } from '@/hooks/queries';
import { useNavigate } from 'react-router-dom';

import AtmosphereOverviewCard, { AtmosphereData } from '@/components/cafe-pulse/AtmosphereOverviewCard';
import CoworkingWavelengthWidget from '@/components/cafe-pulse/CoworkingWavelengthWidget';
import EphemeralCommunalBoard from '@/components/cafe-pulse/EphemeralCommunalBoard';
import PulseBroadcastModal, { MoodType, ActivityType } from '@/components/cafe-pulse/PulseBroadcastModal';
import ConsensualChatModal from '@/components/cafe-pulse/ConsensualChatModal';
import AtmosphereAcousticRadar from '@/components/cafe-pulse/AtmosphereAcousticRadar';

function getAnonToken() {
  let t = sessionStorage.getItem('cafe_pulse_anon_session');
  if (!t) {
    t = crypto.randomUUID();
    sessionStorage.setItem('cafe_pulse_anon_session', t);
  }
  return t;
}

export default function MoodPulsePage() {
  const { profile } = useAuth();
  const { data: cafe } = useCafe();
  const navigate = useNavigate();
  const sessionToken = useRef(getAnonToken()).current;

  // Modals state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);

  // Live atmosphere data
  const [atmosphere, setAtmosphere] = useState<AtmosphereData>({
    is_low_data: true,
    total_signals: 0,
    status_phrase: 'It is a quiet one so far.',
    message: 'Fewer than 3 visitors have broadcasted their pulse in the last 2 hours. The space remains in natural calm.',
    dominant_mood: null,
    mood_distribution: [],
    activity_distribution: [],
    coworking_ratio: 0,
  });

  // User's own active broadcast
  const [mySignal, setMySignal] = useState<{ mood: MoodType; activity: ActivityType } | null>(null);
  const [loading, setLoading] = useState(true);

  const cafeId = cafe?.id || profile?.cafe_id || '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

  // 1. Fetch Atmosphere from DB RPC
  const fetchAtmosphere = useCallback(async () => {
    if (!cafeId) return;
    try {
      const { data, error } = await supabase.rpc('get_cafe_pulse_atmosphere', {
        p_cafe_id: cafeId,
      });

      if (!error && data) {
        setAtmosphere(data as AtmosphereData);
      }
    } catch (err) {
      console.error('Failed to load atmosphere:', err);
    }
  }, [cafeId]);

  // 2. Fetch Own Signal
  const fetchOwnSignal = useCallback(async () => {
    if (!cafeId) return;
    try {
      const { data } = await supabase
        .from('cafe_pulse_signals')
        .select('*')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (data) {
        setMySignal({
          mood: data.mood_state as MoodType,
          activity: data.activity_state as ActivityType,
        });
      } else {
        setMySignal(null);
      }
    } catch {
      // ignore
    }
  }, [cafeId, sessionToken]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAtmosphere(), fetchOwnSignal()]);
    setLoading(false);
  }, [fetchAtmosphere, fetchOwnSignal]);

  useEffect(() => {
    loadData();

    // Realtime atmosphere synchronization on cafe_pulse_signals
    const channel = supabase
      .channel(`cafe_pulse_signals_${cafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_pulse_signals', filter: `cafe_id=eq.${cafeId}` },
        () => {
          fetchAtmosphere();
          fetchOwnSignal();
        }
      )
      .subscribe();

    const handleFocus = () => {
      fetchAtmosphere();
      fetchOwnSignal();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadData, cafeId, fetchAtmosphere, fetchOwnSignal]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Café Pulse</h1>
            <Badge variant="outline" className="text-[10px] font-normal tracking-wider uppercase">
              Collective Intelligence
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time ambient atmosphere, quiet co-working wavelength, and ephemeral communal resonance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Ghost Mode Toggle */}
          <button
            onClick={() => {
              const next = !ghostMode;
              setGhostMode(next);
              toast.info(next ? 'Ghost mode enabled: Observing quietly' : 'Ghost mode off');
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              ghostMode
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {ghostMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{ghostMode ? 'Ghost Mode' : 'Observing'}</span>
          </button>

          {/* Consensual 1-to-1 Escalation Channel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen(true)}
            className="text-xs h-8 flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Wavelength Chat</span>
          </Button>

          {/* Refresh button */}
          <button
            onClick={loadData}
            title="Refresh Pulse"
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. Atmosphere-First Hierarchy (Atmosphere Overview & Ambient Vibe Weather) */}
      <AtmosphereOverviewCard
        atmosphere={atmosphere}
        onBroadcastClick={() => setBroadcastOpen(true)}
        isBroadcasting={!!mySignal}
      />

      {/* 2. Middle Row: Co-working Wavelength & AI Barista Bridge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Co-working Wavelength */}
        <div className="md:col-span-2">
          <CoworkingWavelengthWidget
            coworkingRatio={atmosphere.coworking_ratio}
            totalSignals={atmosphere.total_signals}
          />
        </div>

        {/* AI Barista Bridge Card */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Barista Alignment
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pair today's ambient room atmosphere with tailored roast extraction and caffeine bio-clock advice.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/account/ai-recommendations')}
            className="w-full text-xs justify-between group mt-auto"
          >
            <span>Ask AI Barista for match</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
        </div>
      </div>

      {/* 2.5 Acoustic Guidance & Collaborative Sanctuary */}
      <AtmosphereAcousticRadar
        signalsCount={atmosphere.total_signals}
        moodCounts={(atmosphere.mood_distribution || []).reduce((acc: Record<string, number>, m) => {
          acc[m.mood] = m.count;
          return acc;
        }, {})}
        activityCounts={(atmosphere.activity_distribution || []).reduce((acc: Record<string, number>, a) => {
          acc[a.activity] = a.count;
          return acc;
        }, {})}
      />

      {/* 3. Ephemeral Communal Board & Barista Appreciation */}
      <div className="pt-2">
        <EphemeralCommunalBoard
          cafeId={cafeId}
          sessionToken={sessionToken}
        />
      </div>

      {/* Modals */}
      <PulseBroadcastModal
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        cafeId={cafeId}
        sessionToken={sessionToken}
        currentMood={mySignal?.mood ?? null}
        currentActivity={mySignal?.activity ?? null}
        onSignalUpdated={() => {
          fetchAtmosphere();
          fetchOwnSignal();
        }}
        onSignalRevoked={() => {
          fetchAtmosphere();
          fetchOwnSignal();
        }}
      />

      <ConsensualChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        cafeId={cafeId}
        sessionToken={sessionToken}
      />
    </div>
  );
}