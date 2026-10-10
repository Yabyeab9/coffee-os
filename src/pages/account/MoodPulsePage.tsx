import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Radio, Sparkles, RefreshCw, Eye, EyeOff, Users, ArrowUpRight,
  Clock3, Loader2, CircleAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import MoodIntentMatcher from '@/components/cafe-pulse/MoodIntentMatcher';

function getAnonToken() {
  let t = sessionStorage.getItem('cafe_pulse_anon_session');
  if (!t) {
    t = crypto.randomUUID();
    sessionStorage.setItem('cafe_pulse_anon_session', t);
  }
  return t;
}

const EMPTY_ATMOSPHERE: AtmosphereData = {
  is_low_data: true,
  total_signals: 0,
  status_phrase: 'It is a quiet one so far.',
  message: 'The shared room reading is not available yet.',
  dominant_mood: null,
  mood_distribution: [],
  activity_distribution: [],
  coworking_ratio: 0,
};

function createQuerySignal(parentSignal: AbortSignal, timeoutMs = 12_000) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal.reason);
  if (parentSignal.aborted) controller.abort(parentSignal.reason);
  else parentSignal.addEventListener('abort', abortFromParent, { once: true });
  const timer = window.setTimeout(() => controller.abort(new Error('Pulse request timed out')), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      parentSignal.removeEventListener('abort', abortFromParent);
    },
  };
}

export default function MoodPulsePage() {
  const { profile } = useAuth();
  const { data: cafe, isLoading: cafeLoading, error: cafeError, refetch: refetchCafe } = useCafe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sessionToken] = useState(() => getAnonToken());

  // Modals state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [ghostMode, setGhostMode] = useState(() => sessionStorage.getItem('cafe_pulse_observer_mode') === 'true');
  const [privacyUpdating, setPrivacyUpdating] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [signalRefreshError, setSignalRefreshError] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const cafeId = cafe?.id || profile?.cafe_id || '';

  const atmosphereQuery = useQuery<AtmosphereData>({
    queryKey: ['cafe_pulse_atmosphere', cafeId],
    queryFn: async ({ signal }) => {
      const request = createQuerySignal(signal);
      try {
        const { data, error } = await supabase.rpc('get_cafe_pulse_atmosphere', {
          p_cafe_id: cafeId,
        }).abortSignal(request.signal);
        if (error) throw error;
        if (!data) throw new Error('No atmosphere data returned');
        return data as AtmosphereData;
      } finally {
        request.cleanup();
      }
    },
    enabled: !!cafeId,
    retry: 0,
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });

  const signalQuery = useQuery<{ mood: MoodType; activity: ActivityType; expiresAt: string } | null>({
    queryKey: ['cafe_pulse_signal', cafeId, sessionToken],
    queryFn: async ({ signal }) => {
      const request = createQuerySignal(signal);
      try {
        const { data, error } = await supabase
          .from('cafe_pulse_signals')
          .select('mood_state, activity_state, expires_at')
          .eq('cafe_id', cafeId)
          .eq('session_token', sessionToken)
          .gt('expires_at', new Date().toISOString())
          .abortSignal(request.signal)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
          mood: data.mood_state as MoodType,
          activity: data.activity_state as ActivityType,
          expiresAt: data.expires_at,
        };
      } finally {
        request.cleanup();
      }
    },
    enabled: !!cafeId,
    retry: 0,
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });

  const atmosphere = atmosphereQuery.data ?? EMPTY_ATMOSPHERE;
  const mySignal = signalQuery.data;
  const signalExpiresAt = mySignal?.expiresAt ?? null;
  const loading = manualRefreshing || atmosphereQuery.isFetching || signalQuery.isFetching;
  const loadError = refreshError || atmosphereQuery.isError || atmosphereQuery.isRefetchError;
  const signalError = signalRefreshError || signalQuery.isError || signalQuery.isRefetchError;
  const lastUpdatedAt = atmosphereQuery.dataUpdatedAt || null;
  const refreshPulse = async () => {
    setManualRefreshing(true);
    setRefreshError(false);
    setSignalRefreshError(false);
    const request = createQuerySignal(new AbortController().signal);
    try {
      const [atmosphereResult, signalResult] = await Promise.all([
        supabase.rpc('get_cafe_pulse_atmosphere', { p_cafe_id: cafeId }).abortSignal(request.signal),
        signalQuery.refetch({ throwOnError: true }).then(() => null).catch(error => error),
      ]);
      if (atmosphereResult.error || !atmosphereResult.data) {
        setRefreshError(true);
      } else {
        queryClient.setQueryData(['cafe_pulse_atmosphere', cafeId], atmosphereResult.data as AtmosphereData);
      }
      setSignalRefreshError(signalResult !== null);
    } catch {
      setRefreshError(true);
    } finally {
      request.cleanup();
      setManualRefreshing(false);
    }
  };

  useEffect(() => {
    if (!cafeId) return;
    const refreshQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ['cafe_pulse_atmosphere', cafeId] });
      void queryClient.invalidateQueries({ queryKey: ['cafe_pulse_signal', cafeId, sessionToken] });
    };

    // Realtime atmosphere synchronization on cafe_pulse_signals
    const channel = supabase
      .channel(`cafe_pulse_signals_${cafeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_pulse_signals', filter: `cafe_id=eq.${cafeId}` },
        refreshQueries
      )
      .subscribe();

    const handleFocus = () => {
      if (document.visibilityState === 'visible') refreshQueries();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [cafeId, sessionToken, queryClient]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleObserverToggle = async () => {
    const next = !ghostMode;
    if (next) {
      setPrivacyUpdating(true);
      try {
        if (mySignal && cafeId) {
          const { error } = await supabase
            .from('cafe_pulse_signals')
            .delete()
            .eq('cafe_id', cafeId)
            .eq('session_token', sessionToken);
          if (error) throw error;
          queryClient.setQueryData(['cafe_pulse_signal', cafeId, sessionToken], null);
          void queryClient.invalidateQueries({ queryKey: ['cafe_pulse_atmosphere', cafeId] });
        }
        sessionStorage.setItem('cafe_pulse_observer_mode', 'true');
        setGhostMode(true);
        setBroadcastOpen(false);
        setChatOpen(false);
        toast.info(mySignal
          ? 'Observer mode on. Your active pulse was removed and participation is paused.'
          : 'Observer mode on. Your pulse and social participation are paused.');
      } catch {
        toast.error('Could not switch to observer mode. Your active pulse is unchanged.');
      } finally {
        setPrivacyUpdating(false);
      }
      return;
    }

    sessionStorage.setItem('cafe_pulse_observer_mode', 'false');
    setGhostMode(false);
    toast.info('Observer mode off. You can participate again.');
  };

  const handleBroadcastClick = () => {
    if (ghostMode) {
      sessionStorage.setItem('cafe_pulse_observer_mode', 'false');
      setGhostMode(false);
    }
    setBroadcastOpen(true);
  };

  const activityCounts = (atmosphere.activity_distribution || []).reduce((counts: Record<string, number>, item) => {
    counts[item.activity.toLowerCase()] = item.count;
    return counts;
  }, {});
  const pageLoading = cafeLoading || (atmosphereQuery.isLoading && !atmosphereQuery.data);
  const liveLabel = loadError ? 'Sync delayed' : lastUpdatedAt === null ? 'Connecting' : 'Live';
  const freshness = lastUpdatedAt === null
    ? 'Waiting for first reading'
    : now - lastUpdatedAt < 60_000
      ? 'Updated just now'
      : `Updated ${Math.floor((now - lastUpdatedAt) / 60_000)}m ago`;

  return (
    <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Radio className="h-3.5 w-3.5" /> Shared room signal
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold text-foreground md:text-3xl">Mood Pulse</h1>
            <Badge variant="outline" className="gap-1.5 text-[10px] font-normal">
              <span className={`h-1.5 w-1.5 rounded-full ${loadError ? 'bg-amber-400' : lastUpdatedAt === null ? 'bg-muted-foreground' : 'bg-emerald-400'}`} />
              {liveLabel} · {cafe?.name ?? 'Café'}
            </Badge>
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Read the room, find a setting that suits you, and share only what you choose.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={ghostMode}
            disabled={privacyUpdating}
            onClick={() => void handleObserverToggle()}
            className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
              ghostMode ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {privacyUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ghostMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {ghostMode ? 'Observer mode on' : 'Observe privately'}
          </button>
          <Button
            variant="outline"
            size="sm"
            disabled={ghostMode || !cafeId}
            onClick={() => setChatOpen(true)}
            className="h-10 gap-2 text-xs"
            title={ghostMode ? 'Turn off observer mode to use Wavelength Chat' : undefined}
          >
            <Users className="h-3.5 w-3.5" /> Wavelength chat
          </Button>
          <button
            type="button"
            onClick={() => void refreshPulse()}
            disabled={loading || !cafeId}
            aria-label="Refresh Mood Pulse"
            title="Refresh Mood Pulse"
            className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{freshness} · refreshes while you’re here</span>
        <span>Signals expire after 2 hours · no names shown</span>
      </div>

      {ghostMode && (
        <div role="status" className="flex items-start gap-3 border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-muted-foreground"><span className="font-medium text-foreground">Observer mode is on.</span> You can read the room, but your pulse, notes, reactions, and chat participation are paused.</p>
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span>{lastUpdatedAt ? 'The latest room refresh failed. Showing the last successful reading.' : 'Mood Pulse could not load the room reading.'}</span>
          <Button variant="outline" size="sm" onClick={() => void refreshPulse()} className="ml-auto">Retry</Button>
        </div>
      )}
      {signalError && !loadError && (
        <p role="status" className="text-xs text-muted-foreground">Your personal pulse could not be checked. The shared room reading is still available.</p>
      )}
      {cafeError && !cafeId && !cafeLoading && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" /> Could not find this café’s pulse.
          <Button variant="outline" size="sm" onClick={() => void refetchCafe()} className="ml-auto">Retry</Button>
        </div>
      )}

      {pageLoading ? (
        <section aria-label="Loading Mood Pulse" className="grid gap-6 border-y border-border/70 py-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-4 w-full max-w-xl" /><Skeleton className="h-10 w-40" /></div>
          <Skeleton className="h-32 w-32 rounded-full" />
        </section>
      ) : !cafeId ? (
        <section role="alert" className="border-y border-border/70 py-10 text-sm text-muted-foreground">
          This account is not connected to a café pulse yet.
        </section>
      ) : loadError && !lastUpdatedAt ? null : (
        <>
          <AtmosphereOverviewCard
            atmosphere={atmosphere}
            onBroadcastClick={handleBroadcastClick}
            isBroadcasting={!!mySignal}
            isGhostMode={ghostMode}
            signalExpiresAt={signalExpiresAt}
          />

          <MoodIntentMatcher atmosphere={atmosphere} />

          <div className="grid gap-6 py-2 md:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)] md:gap-8">
            <CoworkingWavelengthWidget
              coworkingRatio={atmosphere.coworking_ratio}
              totalSignals={atmosphere.total_signals}
            />
            <section className="flex flex-col justify-between gap-4 border-l-2 border-primary/40 bg-card/50 p-4">
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Personal next step</p>
                <h2 className="font-heading text-lg font-semibold text-foreground">Make your coffee fit the moment.</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">Use your room reading to guide the visit, then ask the AI Barista for a drink matched to your taste and plans.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/account/ai-recommendations')} className="w-full justify-between text-xs">
                Find a drink for this moment <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </section>
          </div>

          <AtmosphereAcousticRadar
            signalsCount={atmosphere.total_signals}
            activityCounts={activityCounts}
          />

          <section className="space-y-3 pt-3">
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Leave the room a little warmer</p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">The communal board</h2>
              </div>
              <p className="text-xs text-muted-foreground">Anonymous notes · posts expire in four hours</p>
            </div>
            <EphemeralCommunalBoard cafeId={cafeId} sessionToken={sessionToken} readOnly={ghostMode} />
          </section>
        </>
      )}

      <PulseBroadcastModal
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        cafeId={cafeId}
        sessionToken={sessionToken}
        currentMood={mySignal?.mood ?? null}
        currentActivity={mySignal?.activity ?? null}
        onSignalUpdated={() => void refreshPulse()}
        onSignalRevoked={() => void refreshPulse()}
      />

      <ConsensualChatModal
        open={chatOpen && !ghostMode}
        onOpenChange={setChatOpen}
        cafeId={cafeId}
        sessionToken={sessionToken}
      />
    </div>
  );
}