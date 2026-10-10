import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Send, RefreshCw, Dna, Loader2,
  Activity, ChevronDown, ChevronUp, Coffee,
  BookOpen, Brain, ShieldCheck, ArrowRight, Radio, Sliders, Moon,
  Copy, RotateCcw, CircleAlert, Users, Gift, History, PanelLeft, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addToTray } from '@/lib/tray';

import CaffeineTrackerCard, { type CaffeineLog } from '@/components/ai-barista/CaffeineTrackerCard';
import PalateXPProgressCard, { getPalateLevel, type SecretDrink } from '@/components/ai-barista/PalateXPProgressCard';
import InChatDrinkCard, { sanitizeName } from '@/components/ai-barista/InChatDrinkCard';
import GiftModal from '@/components/ai-barista/GiftModal';
import SmartPalateRadarModal from '@/components/ai-barista/SmartPalateRadarModal';
import BaristaShiftBrewGuideModal from '@/components/ai-barista/BaristaShiftBrewGuideModal';
import TasteMemoryManagerModal, { type TasteMemory } from '@/components/ai-barista/TasteMemoryManagerModal';
import LiveExtractionCalibrationDial from '@/components/ai-barista/LiveExtractionCalibrationDial';
import MetabolicBedtimeCurveSimulator from '@/components/ai-barista/MetabolicBedtimeCurveSimulator';
import ChatModeTabs from '@/components/ai-barista/ChatModeTabs';
import ConversationHistory from '@/components/ai-barista/ConversationHistory';
import CollaborativeChatModal from '@/components/ai-barista/CollaborativeChatModal';
import SharedChatRoom from '@/components/ai-barista/SharedChatRoom';
import GiftCenterModal from '@/components/ai-barista/GiftCenterModal';
import ReplyFeedback from '@/components/ai-barista/ReplyFeedback';
import VoiceInput from '@/components/ai-barista/VoiceInput';
import {
  createSession,
  deleteMessage,
  deleteSession,
  deriveTitle,
  getSessionMode,
  insertMessage,
  joinCollaboration,
  listMessages,
  listSessions,
  logCaffeine,
  resolveCafeId,
  touchSessionTitle,
  type ChatMode,
  type ChatSessionRow,
  type CollaborationRow,
} from '@/lib/ai-barista-client';
import {
  parseDrinkCard,
  parseGiftIntent,
  parseTasteMemory,
  parseCartAction,
  cleanBubbleText,
  type DrinkCardData,
} from '@/components/ai-barista/chat-tags';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  drinkCard: DrinkCardData | null;
  giftIntent: { drink_name: string } | null;
  moodTag: string | null;
  /** Display-only marker for a delivery failure — never persisted. */
  isError?: boolean;
}

interface CoffeeTwin {
  strength_preference: number;
  sweetness_preference: number;
  temperature_preference: string;
  milk_preference: string;
  adventure_level: number;
  confidence_score: number;
  data_points: number;
  palate_xp: number;
  palate_level: number;
  unlocked_badges: { badge: string; earned_at: string }[];
}

const MOOD_LABEL: Record<string, string> = {
  stressed: 'Stressed',
  happy: 'Happy',
  calm: 'Calm',
  sad: 'Sad',
  focused: 'Focused',
  energetic: 'Energized',
};

const TYPING_PHRASES = [
  'crafting sensory advice…',
  'tasting the roast…',
  'consulting your palate DNA…',
  'checking the caffeine ledger…',
  'weighing the extraction…',
  'calibrating the flavor radar…',
];

const TITLE_CACHE_KEY = 'coffee_os_barista_titles_v1';

function readTitleCache(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(TITLE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeTitleCache(map: Record<string, string>) {
  try {
    window.localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal: titles fall back to the first message.
  }
}

/* ─────────────────────────────────────────────
   Rich text renderer (paragraphs, bullets, bold)
───────────────────────────────────────────── */
function renderRichText(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, index) => {
    const key = `rich-${index}`;
    const trimmed = line.trim();
    if (!trimmed) {
      nodes.push(<div key={`${key}-sp`} className="h-1.5" />);
      return;
    }
    const isBullet = /^[-•*]\s+/.test(trimmed);
    const content = isBullet ? trimmed.replace(/^[-•*]\s+/, '') : trimmed;
    const parts = content.split(/\*\*(.+?)\*\*/g);
    const body = parts.map((part, i) =>
      i % 2 === 1 ? <strong key={`${key}-${i}`} className="font-semibold">{part}</strong> : <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>,
    );
    nodes.push(
      isBullet ? (
        <div key={key} className="flex gap-1.5">
          <span className="text-primary shrink-0">•</span>
          <span>{body}</span>
        </div>
      ) : (
        <div key={key}>{body}</div>
      ),
    );
  });
  return nodes;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Request timed out')), ms);
    promise.then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); },
    );
  });
}

/* ─────────────────────────────────────────────
   Message bubble
───────────────────────────────────────────── */
function MessageBubble({
  msg, menu, cafeId, userId, onAddToCart, onLogCaffeine, onRegenerate, onRetry,
  onFeedback, lastUserText, isLastAssistant,
}: {
  msg: Message;
  menu: any[];
  cafeId: string | null;
  userId: string | null;
  onAddToCart: (drink: DrinkCardData) => void;
  onLogCaffeine?: (drink: DrinkCardData, mg: number) => void;
  onRegenerate?: () => void;
  onRetry?: () => void;
  onFeedback?: (messageId: string, prompt: string, reply: string) => void;
  lastUserText: string;
  isLastAssistant?: boolean;
}) {
  const isUser = msg.role === 'user';
  const isError = !!msg.isError;
  const prose = cleanBubbleText(msg.content);

  let card: DrinkCardData | null = msg.drinkCard ?? null;
  if (card) {
    const menuItem = menu.find(m => m.id === card!.id || sanitizeName(m.name) === sanitizeName(card!.name));
    if (menuItem) {
      card = {
        ...card,
        name: menuItem.name,
        image_url: menuItem.image_url ?? card.image_url,
        price: menuItem.price ?? card.price,
        flavor_profile: menuItem.flavor_profile ?? card.flavor_profile,
        caffeine_mg: menuItem.caffeine_mg ?? card.caffeine_mg,
        cafe_id: cafeId ?? undefined,
      };
    } else {
      card = { ...card, cafe_id: cafeId ?? undefined };
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(prose);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isUser && (
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
          isError ? 'bg-destructive/10 border-destructive/40' : 'bg-foreground/5 border-border'
        }`}>
          {isError ? <CircleAlert className="w-3.5 h-3.5 text-destructive" /> : <Coffee className="w-3.5 h-3.5 text-foreground/70" />}
        </div>
      )}
      <div className={`max-w-[82%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {msg.moodTag && !isUser && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground self-start">
            {MOOD_LABEL[msg.moodTag] ?? msg.moodTag}
          </span>
        )}
        {prose && (
          <div className={`px-3.5 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed ${
            isUser
              ? 'bg-foreground text-background rounded-br-sm'
              : isError
                ? 'bg-destructive/5 border border-destructive/30 text-foreground rounded-bl-sm'
                : 'bg-card border border-border text-foreground rounded-bl-sm'
          }`}
          role={isError ? 'alert' : undefined}
          >
            {renderRichText(prose)}
          </div>
        )}
        {card && !isUser && (
          <InChatDrinkCard
            drink={card}
            onAddToCart={onAddToCart}
            onLogCaffeine={onLogCaffeine}
          />
        )}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && !isError && prose && (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={copyText}
                title="Copy reply"
                className="text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              {isLastAssistant && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  title="Regenerate reply"
                  className="text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              {isLastAssistant && onFeedback && (
                <ReplyFeedback
                  messageId={msg.id}
                  userId={userId}
                  cafeId={cafeId}
                  prompt={lastUserText}
                  reply={prose}
                />
              )}
            </span>
          )}
          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function AiRecommendationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Chat state
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [titleCache, setTitleCache] = useState<Record<string, string>>(readTitleCache);
  const [firstMessages, setFirstMessages] = useState<Record<string, string | undefined>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ChatMode>('coffee');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typingPhrase, setTypingPhrase] = useState(TYPING_PHRASES[0]);

  // Context data
  const [twin, setTwin] = useState<CoffeeTwin | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [caffeineLogs, setCaffeineLogs] = useState<CaffeineLog[]>([]);
  const [secretDrinks, setSecretDrinks] = useState<SecretDrink[]>([]);
  const [tasteMemories, setTasteMemories] = useState<TasteMemory[]>([]);
  const [pulseAtmosphere, setPulseAtmosphere] = useState<string>('');
  const [cafeId, setCafeId] = useState<string | null>(null);

  // Modals & panels
  const [radarOpen, setRadarOpen] = useState(false);
  const [brewGuideOpen, setBrewGuideOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [giftCenterOpen, setGiftCenterOpen] = useState(false);
  const [giftDrink, setGiftDrink] = useState<{ id: string; name: string; price: number | null; image_url: string | null } | null>(null);
  const [sharedRoom, setSharedRoom] = useState<{ collaboration: CollaborationRow; myRole: 'host' | 'guest' } | null>(null);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [failedHistory, setFailedHistory] = useState<Message[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingPhraseTimer = useRef<number>(0);

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    messagesContainer?.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Rotate the typing indicator so the wait feels alive.
  useEffect(() => {
    if (!isTyping) return;
    let idx = 0;
    setTypingPhrase(TYPING_PHRASES[0]);
    typingPhraseTimer.current = window.setInterval(() => {
      idx = (idx + 1) % TYPING_PHRASES.length;
      setTypingPhrase(TYPING_PHRASES[idx]);
    }, 2600);
    return () => window.clearInterval(typingPhraseTimer.current);
  }, [isTyping]);

  /* ── Load café-level + customer context ── */
  const loadContext = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const resolvedCafe = await resolveCafeId(profile.cafe_id);
      setCafeId(resolvedCafe);

      const queries = await Promise.allSettled([
        supabase.from('orders').select('*, items:order_items(*, menu_item:menus(name,category_id))').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('challenge_participants').select('*, challenge:challenges(*)').eq('customer_id', profile.id).eq('completed', false),
        supabase.from('loyalty_points').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('menus').select('*, category:menu_categories(name)').is('deleted_at', null).limit(60),
        supabase.from('ai_coffee_twin').select('*').eq('customer_id', profile.id).maybeSingle(),
        supabase.from('caffeine_logs').select('drink_name, caffeine_mg, consumed_at').eq('user_id', profile.id).gte('consumed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).order('consumed_at', { ascending: true }),
        supabase.from('secret_menu_items').select('*').order('unlock_level', { ascending: true }),
        supabase.from('customer_taste_memories').select('*').eq('customer_id', profile.id).order('created_at', { ascending: false }),
        resolvedCafe
          ? supabase.rpc('get_cafe_pulse_atmosphere', { p_cafe_id: resolvedCafe })
          : Promise.resolve({ data: null }),
      ]);

      const [ordersRes, challengesRes, loyaltyRes, menuRes, twinRes, caffeineRes, secretRes, memoriesRes, pulseRes] = queries;

      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data ?? []);
      if (challengesRes.status === 'fulfilled') {
        setChallenges((challengesRes.value.data ?? []).map((p: any) => ({ ...p.challenge, current_progress: p.current_progress, target_count: p.target_count })));
      }
      if (loyaltyRes.status === 'fulfilled') setLoyalty(loyaltyRes.value.data);
      if (menuRes.status === 'fulfilled') setMenu(menuRes.value.data ?? []);
      if (twinRes.status === 'fulfilled') setTwin(twinRes.value.data);
      if (caffeineRes.status === 'fulfilled') setCaffeineLogs((caffeineRes.value.data ?? []) as CaffeineLog[]);
      if (secretRes.status === 'fulfilled') setSecretDrinks((secretRes.value.data ?? []) as SecretDrink[]);
      if (memoriesRes.status === 'fulfilled') setTasteMemories((memoriesRes.value.data as TasteMemory[]) ?? []);
      if (pulseRes.status === 'fulfilled' && pulseRes.value.data?.status_phrase) {
        setPulseAtmosphere(pulseRes.value.data.status_phrase);
      }
    } catch {
      toast.error('Could not load some AI Barista context.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, profile?.cafe_id]);

  /* ── Sessions ─────────────────────────────── */
  const refreshSessions = useCallback(async () => {
    if (!profile?.id) return [];
    try {
      const rows = await listSessions(profile.id);
      setSessions(rows);
      return rows;
    } catch {
      return [];
    }
  }, [profile?.id]);

  const loadMessagesFor = useCallback(async (sessionId: string) => {
    try {
      const rows = await listMessages(sessionId);
      const msgs: Message[] = rows
        .filter(r => r.role === 'user' || r.role === 'assistant')
        .map(r => ({
          id: r.id,
          role: r.role as 'user' | 'assistant',
          content: r.content,
          created_at: r.created_at,
          drinkCard: parseDrinkCard(r.content),
          giftIntent: parseGiftIntent(r.content),
          moodTag: null,
        }));
      setMessages(msgs);
      // Remember the first customer message for the history title.
      const firstUser = rows.find(r => r.role === 'user');
      if (firstUser) {
        setFirstMessages(prev => ({ ...prev, [sessionId]: firstUser.content }));
      }
      return msgs;
    } catch {
      setMessages([]);
      return [];
    }
  }, []);

  const ensureGreeting = useCallback(async (
    sid: string,
    mode: ChatMode,
    name: string,
  ): Promise<Message[]> => {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const atmosphereHint = pulseAtmosphere ? ` The café right now: “${pulseAtmosphere}”.` : '';
    const content = mode === 'roast'
      ? `Alright ${name}, pull up a chair. Tell me your usual order and I'll tell you exactly what's wrong with it. Fair warning — I've read your palate DNA and I am not afraid to use it.`
      : `${greet}, ${name}!${atmosphereHint} What are you in the mood for — a focused pick-me-up, something comforting, or a new flavour to explore?`;
    const saved = await insertMessage(sid, 'assistant', content, 'ai');
    return saved ? [{
      id: saved.id,
      role: 'assistant',
      content: saved.content,
      created_at: saved.created_at,
      drinkCard: null,
      giftIntent: null,
      moodTag: null,
    }] : [];
  }, [pulseAtmosphere]);

  /** Get or create the session for a given chat mode. */
  const ensureSessionForMode = useCallback(async (
    mode: ChatMode,
    allSessions: ChatSessionRow[],
  ): Promise<ChatSessionRow | null> => {
    const existing = allSessions.find(s => getSessionMode(s.id, s) === mode);
    if (existing) return existing;
    const name = profile?.full_name?.split(' ')[0] ?? 'there';
    const created = await createSession(profile!.id, mode);
    await ensureGreeting(created.id, mode, name);
    return created;
  }, [profile?.id, profile?.full_name, ensureGreeting]);

  const switchToSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const mode = session ? getSessionMode(sessionId, session) : activeMode;
    setActiveMode(mode);
    setActiveSessionId(sessionId);
    setFailedHistory(null);
    await loadMessagesFor(sessionId);
    setHistoryOpen(false);
  }, [sessions, activeMode, loadMessagesFor]);

  const newChat = useCallback(async () => {
    if (!profile?.id) return;
    const mode = activeMode;
    const created = await createSession(profile.id, mode);
    const all = await refreshSessions();
    setActiveSessionId(created.id);
    setFailedHistory(null);
    setDetectedMood(null);
    const name = profile?.full_name?.split(' ')[0] ?? 'there';
    const greeting = await ensureGreeting(created.id, mode, name);
    setMessages(greeting);
    // The new session is now the most recent of its mode.
    void all;
    setHistoryOpen(false);
  }, [profile?.id, profile?.full_name, activeMode, refreshSessions, ensureGreeting]);

  const removeSession = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    setTitleCache(prev => {
      const next = { ...prev };
      delete next[sessionId];
      writeTitleCache(next);
      return next;
    });
    const remaining = await refreshSessions();
    if (activeSessionId === sessionId) {
      const modeSession = remaining.find(s => getSessionMode(s.id, s) === activeMode);
      if (modeSession) {
        await switchToSession(modeSession.id);
      } else {
        await newChat();
      }
    }
  }, [activeSessionId, activeMode, refreshSessions, switchToSession, newChat]);

  /* ── Initial load ── */
  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const all = await refreshSessions();
      if (cancelled) return;

      // Deep-link: /account/ai-recommendations?collab=CODE
      const collabCode = searchParams.get('collab');
      if (collabCode) {
        const room = await joinCollaboration(collabCode, profile.id);
        if (room && !cancelled) {
          setSharedRoom({ collaboration: room, myRole: room.host_id === profile.id ? 'host' : 'guest' });
        }
      }

      const mode = activeMode;
      const modeSession = all.find(s => getSessionMode(s.id, s) === mode);
      if (modeSession) {
        setActiveSessionId(modeSession.id);
        await loadMessagesFor(modeSession.id);
      } else {
        const created = await ensureSessionForMode(mode, all);
        if (created && !cancelled) {
          setActiveSessionId(created.id);
          await loadMessagesFor(created.id);
        }
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  /* ── Mood detection (client-side signal, shown as a tag) ── */
  const detectMoodLocal = (msgs: Message[]): string | null => {
    const recent = msgs.slice(-3).map(m => m.content.toLowerCase()).join(' ');
    if (/\b(tired|exhausted|overwhelmed|stressed|anxious|busy)\b/.test(recent)) return 'stressed';
    if (/\b(happy|great|excited|love|amazing|wonderful)\b/.test(recent)) return 'happy';
    if (/\b(relax|chill|calm|peaceful)\b/.test(recent)) return 'calm';
    if (/\b(sad|down|depressed|unhappy)\b/.test(recent)) return 'sad';
    if (/\b(focus|concentrate|work|study)\b/.test(recent)) return 'focused';
    if (/\b(energet|pump|active|ready)\b/.test(recent)) return 'energetic';
    return null;
  };

  /* ── Send message ── */
  const sendMessage = async (overrideText?: string) => {
    const userText = (overrideText ?? input).trim();
    if (!userText || !activeSessionId || isTyping) return;
    setInput('');

    const userMsg: Message = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
      drinkCard: null,
      giftIntent: null,
      moodTag: null,
    };
    const nextMessages = [...messages.filter(m => !m.isError), userMsg];
    setMessages(nextMessages);
    setFirstMessages(prev =>
      prev[activeSessionId] ? prev : { ...prev, [activeSessionId]: userText },
    );

    const persisted = await insertMessage(activeSessionId, 'user', userText, 'customer');
    if (!persisted) {
      toast.error('This message was not saved to your history.', {
        description: 'The chat still works — but it will not be here after a refresh.',
      });
    } else {
      // Cache the title derived from the first message of the thread.
      const isFirst = !firstMessages[activeSessionId];
      if (isFirst) {
        const title = deriveTitle(userText) ?? userText;
        setTitleCache(prev => {
          const next = { ...prev, [activeSessionId!]: title };
          writeTitleCache(next);
          return next;
        });
        void touchSessionTitle(activeSessionId, title);
      }
    }

    const mood = detectMoodLocal(nextMessages);
    setDetectedMood(mood);

    setIsTyping(true);
    try {
      await requestAssistant(nextMessages, mood);
      setFailedHistory(null);
    } catch (error) {
      showDeliveryError(error, nextMessages);
    } finally {
      setIsTyping(false);
    }
  };

  /* Retry a failed delivery. The user message is already in `failedHistory`. */
  const retryLast = async () => {
    if (isTyping || !failedHistory || !activeSessionId) return;
    const history = failedHistory;
    setMessages(prev => prev.filter(m => !m.isError));
    setIsTyping(true);
    try {
      await requestAssistant(history, detectMoodLocal(history));
      setFailedHistory(null);
    } catch (error) {
      showDeliveryError(error, history);
    } finally {
      setIsTyping(false);
    }
  };

  /* Re-ask the barista for a fresh answer — the old assistant
     message is deleted from history so threads never duplicate. */
  const regenerateLast = async () => {
    if (isTyping || !activeSessionId) return;
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.isError);
    const lastUserIdx = [...messages].map((m, i) => ({ m, i })).reverse().find(x => x.m.role === 'user')?.i;
    if (lastUserIdx === undefined) return;

    const trimmed = messages.slice(0, lastUserIdx + 1);
    setMessages(trimmed);
    if (lastAssistant) {
      void deleteMessage(lastAssistant.id);
    }
    setIsTyping(true);
    try {
      await requestAssistant(trimmed, detectMoodLocal(trimmed));
      setFailedHistory(null);
    } catch (error) {
      showDeliveryError(error, trimmed);
    } finally {
      setIsTyping(false);
    }
  };

  const showDeliveryError = (error: unknown, history: Message[]) => {
    setFailedHistory(history);
    setMessages(prev => [
      ...prev.filter(m => !m.isError),
      {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: describeDeliveryError(error),
        created_at: new Date().toISOString(),
        drinkCard: null,
        giftIntent: null,
        moodTag: null,
        isError: true,
      },
    ]);
  };

  const describeDeliveryError = (error: unknown): string => {
    const raw = String((error as any)?.message ?? error ?? '');
    if (/timed? out|abort/i.test(raw)) {
      return 'The barista took too long to answer — the café connection may be busy. Try again in a moment.';
    }
    if (/upstream|overload|UNAVAILABLE|502|503|500|non-2xx/i.test(raw)) {
      return 'The espresso machine on the other end is momentarily overloaded. Wait a few seconds, then try again.';
    }
    if (/failed to fetch|network/i.test(raw)) {
      return 'Could not reach the AI Barista. Check your connection and try again.';
    }
    return 'The AI Barista could not complete that reply. Nothing was lost — press Try again when you are ready.';
  };

  /* ── One AI request plus its side effects ── */
  const requestAssistant = async (history: Message[], mood: string | null) => {
    if (!activeSessionId) throw new Error('No active conversation. Start a new chat.');
    const myId = profile?.id;
    if (!myId) throw new Error('Please sign in to chat with your barista.');

    const todayTotal = caffeineLogs.reduce((s, l) => s + l.caffeine_mg, 0);
    const BEDTIME_HOUR = 22;
    const now = new Date();
    const hoursToBed = Math.max(0, BEDTIME_HOUR - (now.getHours() + now.getMinutes() / 60));
    const bedtimeMg = Math.round(todayTotal * Math.pow(0.5, hoursToBed / 5.7));

    const palateLevel = twin?.palate_level ?? 1;
    const palateXp = twin?.palate_xp ?? 0;
    const { current } = getPalateLevel(palateXp);
    const preferenceStrings = tasteMemories.map(m => `${m.attribute_key}: ${m.attribute_value}`);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    // Mode directive steers the tone without inventing a new pipeline.
    const notes: string[] = [];
    if (pulseAtmosphere) notes.push(`Current café room reading: "${pulseAtmosphere}"`);
    if (typeof todayTotal === 'number') notes.push(`Customer caffeine logged today: ${todayTotal}mg`);
    if (typeof menu.length === 'number') notes.push(`Menu items available: ${menu.length}`);
    if (activeMode === 'roast') {
      notes.push(
        'Barista mode: ROAST CHAT. The customer switched to Roast Chat — be playfully cheeky: ' +
        'lovingly roast their drink choices and caffeine habits with wit, while staying genuinely ' +
        'helpful. Always ground every recommendation in the live menu. Roast the coffee, not the human.',
      );
    }
    const contextMessage = notes.length
      ? [{ role: 'user' as const, content: `[Barista context — not a customer message. ${notes.join(' · ')}. Use it only if relevant.]` }]
      : [];
    const requestMessages = [
      ...contextMessage,
      ...history.filter(m => !m.isError).slice(-10).map(m => ({ role: m.role, content: m.content })),
    ];

    const res = await withTimeout(
      supabase.functions.invoke('ai-barista', {
        body: {
          messages: requestMessages,
          context: {
            profile: profile
              ? { id: profile.id, full_name: profile.full_name, cafe_id: profile.cafe_id }
              : null,
            twin,
            orders: orders.slice(0, 5),
            challenges,
            loyalty,
            menu,
            caffeineToday: todayTotal,
            caffeineBedtime: bedtimeMg,
            palateXp,
            palateLevel,
            palateTitle: current.title,
            preferenceNotes: preferenceStrings,
          },
        },
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      }),
      75_000,
    );

    if (res.error) {
      let detail = res.error.message ?? 'The request to the AI Barista failed.';
      try {
        const contextText = await (res.error as any)?.context?.text?.();
        if (contextText) detail = `${detail} — ${contextText}`;
      } catch {
        // error body unavailable; generic message is enough
      }
      throw new Error(detail);
    }

    const raw: string = res.data?.reply ?? res.data?.message ?? '';
    if (!raw.trim()) throw new Error('The AI Barista returned an empty reply.');
    const drinkCard = parseDrinkCard(raw);
    const giftIntent = parseGiftIntent(raw);

    // Gift intent → open the gift flow with a menu-matched drink
    if (giftIntent || res.data?.gift_intent) {
      const drinkHint = (giftIntent?.drink_name ?? res.data?.drink_hint ?? '').trim();
      const match = drinkHint
        ? menu.find(m => sanitizeName(m.name).toLowerCase().includes(drinkHint.toLowerCase()))
        : undefined;
      if (match) {
        setGiftDrink({ id: match.id, name: match.name, price: match.price, image_url: match.image_url });
      } else {
        toast.info(
          drinkHint
            ? `No menu item matches “${drinkHint}” yet — mention another drink to gift.`
            : 'Which drink would you like to gift? Name it and I will open the gift card.',
        );
      }
    }

    // Taste memory extraction (deduplicated before writing)
    const tasteMemoryMatch = parseTasteMemory(raw);
    if (tasteMemoryMatch) {
      const preference = String(tasteMemoryMatch.preference ?? '').trim();
      if (profile?.id && preference) {
        const duplicate = tasteMemories.some(
          m => (m.attribute_value ?? '').trim().toLowerCase() === preference.toLowerCase(),
        );
        if (!duplicate) {
          const { data: inserted, error: memError } = await supabase
            .from('customer_taste_memories')
            .insert({
              customer_id: profile.id,
              cafe_id: profile.cafe_id ?? cafeId ?? null,
              preference_type: tasteMemoryMatch.category || 'taste_note',
              attribute_key: 'Conversational Preference',
              attribute_value: preference,
              confidence_score: 0.9,
              source_context: 'ai_barista_chat',
            })
            .select()
            .maybeSingle();
          if (!memError && inserted) {
            toast.success(`Taste memory saved: “${preference}”`);
            setTasteMemories(prev => [inserted as TasteMemory, ...prev]);
          }
        }
      }
    }

    // Cart action extraction → shared tray
    const cartActionMatch = parseCartAction(raw);
    if (cartActionMatch) {
      const targetName = String(cartActionMatch.item_name ?? '');
      const match = targetName
        ? menu.find(m => sanitizeName(m.name).toLowerCase().includes(sanitizeName(targetName).toLowerCase()))
        : undefined;
      if (match) {
        addToTray({
          id: match.id,
          name: sanitizeName(match.name),
          price: match.price,
          image_url: match.image_url,
          cafe_id: match.cafe_id ?? cafeId ?? '',
          caffeine_mg: match.caffeine_mg ?? null,
        });
        toast.success(`${sanitizeName(match.name)} added to your tray`);
      }
    }

    const assistantMsg: Message = {
      id: `local-${Date.now() + 1}`,
      role: 'assistant',
      content: raw,
      created_at: new Date().toISOString(),
      drinkCard,
      giftIntent,
      moodTag: mood,
    };
    setMessages(prev => [...prev.filter(m => !m.isError), assistantMsg]);
    const saved = await insertMessage(
      activeSessionId,
      'assistant',
      raw,
      'ai',
      drinkCard ? JSON.parse(JSON.stringify(drinkCard)) : undefined,
    );
    if (saved) {
      setMessages(prev =>
        prev.map(m => (m.id === assistantMsg.id ? { ...m, id: saved.id } : m)),
      );
    }

    // Keep the live context fresh for the next turn.
    const [caffeineRes, memoriesRes] = await Promise.allSettled([
      supabase.from('caffeine_logs').select('drink_name, caffeine_mg, consumed_at').eq('user_id', myId).gte('consumed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).order('consumed_at', { ascending: true }),
      supabase.from('customer_taste_memories').select('*').eq('customer_id', myId).order('created_at', { ascending: false }),
    ]);
    if (caffeineRes.status === 'fulfilled') setCaffeineLogs((caffeineRes.value.data ?? []) as CaffeineLog[]);
    if (memoriesRes.status === 'fulfilled') setTasteMemories((memoriesRes.value.data as TasteMemory[]) ?? []);
  };

  /* ── Voice input fills the composer for review ── */
  const handleVoiceTranscript = useCallback((text: string) => {
    setInput(prev => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  }, []);

  /* ── Caffeine logging (real writes to caffeine_logs) ── */
  const handleLogCaffeine = useCallback(async (drink: DrinkCardData, mg: number) => {
    if (!profile?.id || !(mg > 0)) return;
    const row = await logCaffeine(profile.id, sanitizeName(drink.name), mg);
    if (row) {
      toast.success(`Logged ${mg}mg from ${sanitizeName(drink.name)}`);
      setCaffeineLogs(prev => [...prev, row]);
    }
  }, [profile?.id]);

  const handleQuickLog = useCallback(async (drinkName: string, mg: number): Promise<boolean> => {
    if (!profile?.id) return false;
    const row = await logCaffeine(profile.id, drinkName, mg);
    if (row) {
      toast.success(`Logged ${mg}mg from ${drinkName}`);
      setCaffeineLogs(prev => [...prev, row]);
      return true;
    }
    return false;
  }, [profile?.id]);

  /* ── Feedback wiring ── */
  const lastUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') return cleanBubbleText(messages[i].content);
    }
    return '';
  }, [messages]);

  const handleFeedback = useCallback((_messageId: string, _prompt: string, _reply: string) => {
    // ReplyFeedback persists to ai_generations internally.
  }, []);

  /* ── Collaborations ── */
  const handleOpenRoom = useCallback((collaboration: CollaborationRow, myRole: 'host' | 'guest') => {
    setSharedRoom({ collaboration, myRole });
  }, []);

  /* ── Dynamic suggestion chips ── */
  const suggestionChips = useMemo(() => {
    const chips: string[] = [];
    const hour = new Date().getHours();
    const todayTotal = caffeineLogs.reduce((s, l) => s + l.caffeine_mg, 0);
    if (todayTotal > 200 && hour >= 15) {
      chips.push('Is it safe to drink anything else tonight?');
    } else if (activeMode === 'roast') {
      chips.push('Roast my usual order');
    }
    chips.push(
      'What single-origin matches my palate today?',
      'Show me the V60 brewing guide specs',
    );
    if (twin) {
      chips.push('What is the sweetest drink without added sugar?');
    }
    chips.push('Gift a drink for my friend');
    return chips.slice(0, 5);
  }, [caffeineLogs, activeMode, twin]);

  const modeCounts = useMemo(() => {
    const counts = { coffee: 0, roast: 0 };
    for (const s of sessions) {
      const mode = getSessionMode(s.id, s);
      counts[mode] += 1;
    }
    return counts;
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;

  const caffeineSuggestions = useMemo(() => {
    return menu
      .filter(m => (m.caffeine_mg ?? 0) > 0 && m.is_available)
      .slice(0, 4)
      .map(m => ({ name: sanitizeName(m.name), caffeine_mg: m.caffeine_mg as number }));
  }, [menu]);

  /* ── Loading state ── */
  if (isLoading && !activeSessionId) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-4rem)]">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">Calibrating sensory intelligence…</p>
        </div>
      </div>
    );
  }

  const contextPanel = (
    <div className="space-y-2.5">
      {/* Palate DNA Radar */}
      <SidePanelSection title="Palate DNA Radar" icon={<Dna className="w-3.5 h-3.5 text-primary" />} defaultOpen>
        <div className="space-y-3">
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={() => setRadarOpen(true)} className="w-full text-xs h-8 justify-between">
              <span>Interactive 5-Axis Radar</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </Button>
          </div>
          {twin && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              {([['Strength', twin.strength_preference], ['Sweetness', twin.sweetness_preference], ['Adventure', twin.adventure_level]] as [string, number][]).map(([label, val]) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{label}</span><span>{val}/10</span>
                  </div>
                  <Progress value={val * 10} className="h-1" />
                </div>
              ))}
              <div className="flex gap-1.5 flex-wrap pt-1">
                <Badge variant="outline" className="text-[9px] font-normal">{twin.temperature_preference}</Badge>
                <Badge variant="outline" className="text-[9px] font-normal">{twin.milk_preference} milk</Badge>
              </div>
            </div>
          )}
          {!twin && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your palate DNA is still being learned. Chat about what you love
              and the barista will map it here.
            </p>
          )}
        </div>
      </SidePanelSection>

      {/* Caffeine Sleep-Safety */}
      <SidePanelSection title="Caffeine Sleep-Safety" icon={<Activity className="w-3.5 h-3.5 text-primary" />} defaultOpen>
        <CaffeineTrackerCard
          logs={caffeineLogs}
          suggestions={caffeineSuggestions}
          onQuickLog={handleQuickLog}
        />
      </SidePanelSection>

      {/* Live Pour-Over Calibration Dial */}
      <SidePanelSection title="Brew Extraction Dial" icon={<Sliders className="w-3.5 h-3.5 text-primary" />}>
        <LiveExtractionCalibrationDial
          drinkName={menu.find(m => m.is_available)?.name ?? 'Yirgacheffe V60'}
          onApplyCalibration={(note) => {
            setInput(prev => (prev ? `${prev} [Note: ${note}]` : `Please prepare my drink with this calibration: ${note}`));
          }}
        />
      </SidePanelSection>

      {/* Metabolic Bedtime Curve Simulator */}
      <SidePanelSection title="Metabolic Bedtime Trajectory" icon={<Moon className="w-3.5 h-3.5 text-indigo-400" />}>
        <MetabolicBedtimeCurveSimulator caffeineLogs={caffeineLogs} />
      </SidePanelSection>

      {/* Café Pulse Alignment Bridge */}
      <SidePanelSection title="Café Pulse Frequency" icon={<Radio className="w-3.5 h-3.5 text-primary" />}>
        <div className="space-y-2">
          <p className="text-xs text-foreground font-medium">{pulseAtmosphere || 'Quiet for now'}</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/account/mood-pulse')} className="w-full text-xs h-7 text-muted-foreground hover:text-foreground">
            Open Café Pulse
          </Button>
        </div>
      </SidePanelSection>

      {/* Palate XP Progress */}
      <SidePanelSection title="Palate Journey XP" icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}>
        <PalateXPProgressCard
          xp={twin?.palate_xp ?? 0}
          badges={twin?.unlocked_badges ?? []}
          secretDrinks={secretDrinks}
        />
      </SidePanelSection>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-[1600px] mx-auto px-3 md:px-6 py-4 gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between shrink-0 border-b border-border/40 pb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setHistoryOpen(true)}
            className="md:hidden p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Conversation history"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <Sparkles className="w-4.5 h-4.5 text-foreground/80 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground tracking-tight truncate">AI Barista</h1>
              <Badge variant="outline" className="text-[10px] font-normal tracking-wider shrink-0">
                Sensory OS
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setRadarOpen(true)} className="text-xs h-7.5 px-2 flex items-center gap-1.5 hover:bg-muted/30">
            <Dna className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Palate DNA</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setBrewGuideOpen(true)} className="text-xs h-7.5 px-2 flex items-center gap-1.5 hover:bg-muted/30">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Brew Guide</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMemoryOpen(true)} className="text-xs h-7.5 px-2 flex items-center gap-1.5 hover:bg-muted/30">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Memory</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setGiftCenterOpen(true)} className="text-xs h-7.5 px-2 flex items-center gap-1.5 hover:bg-muted/30">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Gifts</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCollabOpen(true)} className="text-xs h-7.5 px-2 flex items-center gap-1.5 hover:bg-muted/30">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Tasting Room</span>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <button
            onClick={() => void newChat()}
            title="Start new conversation"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setInsightsOpen(o => !o)}
            className="md:hidden p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle insights panel"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Conversation history — desktop column */}
        <div className="hidden md:block md:w-60 shrink-0 min-h-0">
          <div className="h-full rounded-xl border border-border bg-card overflow-hidden">
            <ConversationHistory
              sessions={sessions}
              firstMessages={{ ...firstMessages, ...titleCache }}
              activeSessionId={activeSessionId}
              activeMode={activeMode}
              onSelect={(id) => void switchToSession(id)}
              onDelete={(id) => void removeSession(id)}
              onNewChat={() => void newChat()}
            />
          </div>
        </div>

        {/* Mobile history drawer */}
        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border md:hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/40">
                <span className="text-xs font-semibold text-foreground">Conversations</span>
                <button onClick={() => setHistoryOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <ConversationHistory
                  sessions={sessions}
                  firstMessages={{ ...firstMessages, ...titleCache }}
                  activeSessionId={activeSessionId}
                  activeMode={activeMode}
                  onSelect={(id) => void switchToSession(id)}
                  onDelete={(id) => void removeSession(id)}
                  onNewChat={() => void newChat()}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {historyOpen && (
          <div className="fixed inset-0 bg-background/60 z-40 md:hidden" onClick={() => setHistoryOpen(false)} />
        )}

        {/* Chat column */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
          {/* Mode tabs */}
          <ChatModeTabs
            mode={activeMode}
            counts={modeCounts}
            onModeChange={(mode) => {
              if (mode === activeMode) return;
              setActiveMode(mode);
              void (async () => {
                const all = await refreshSessions();
                const existing = all.find(s => getSessionMode(s.id, s) === mode);
                if (existing) {
                  await switchToSession(existing.id);
                } else {
                  const created = await createSession(profile!.id, mode);
                  const name = profile?.full_name?.split(' ')[0] ?? 'there';
                  await ensureGreeting(created.id, mode, name);
                  setActiveSessionId(created.id);
                  await loadMessagesFor(created.id);
                }
              })();
            }}
          />

          {/* Chat card */}
          <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
            {/* Quick Context Bar */}
            <div className="px-4 py-2 bg-muted/20 border-b border-border/40 flex items-center justify-between text-xs text-muted-foreground gap-2">
              <span className="flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Real Menu Sourcing · Zero Hallucinations</span>
                <span className="sm:hidden">Live Menu Data</span>
              </span>
              <div className="flex items-center gap-2 min-w-0">
                {activeSession && getSessionMode(activeSession.id, activeSession) === 'roast' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-orange-400/30 text-orange-400 shrink-0">
                    <Coffee className="w-3 h-3" /> Roast mode
                  </span>
                )}
                <span className="text-[10px] shrink-0">
                  Mood: {detectedMood ? (MOOD_LABEL[detectedMood] ?? detectedMood) : 'No signal yet'}
                </span>
                {tasteMemories.length > 0 && (
                  <button
                    onClick={() => setMemoryOpen(true)}
                    className="hover:underline flex items-center gap-1 text-[11px] shrink-0"
                  >
                    <Brain className="w-3 h-3 text-primary" />
                    {tasteMemories.length} Learned Rules
                  </button>
                )}
              </div>
            </div>

            {/* Message List */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  menu={menu}
                  cafeId={cafeId}
                  userId={profile?.id ?? null}
                  onAddToCart={() => {}}
                  onLogCaffeine={handleLogCaffeine}
                  onRegenerate={regenerateLast}
                  onRetry={retryLast}
                  onFeedback={handleFeedback}
                  lastUserText={lastUserText}
                  isLastAssistant={index === messages.length - 1 && msg.role === 'assistant' && !msg.isError}
                />
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Coffee className="w-3.5 h-3.5 animate-bounce" />
                  <span>AI Barista is {typingPhrase}</span>
                </div>
              )}
            </div>

            {/* Prompt Input Footer */}
            <div className="p-3 border-t border-border/60 bg-background/50 space-y-2">
              {/* Dynamic Suggestion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {suggestionChips.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => void sendMessage(prompt)}
                    className="px-2.5 py-1 rounded-full border border-border/60 bg-muted/10 hover:bg-muted/40 text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void sendMessage();
                    }}
                    placeholder={
                      activeMode === 'roast'
                        ? 'Dare the barista… or ask for a real recommendation…'
                        : 'Ask your AI Barista anything about roasts, notes, or sleep timing…'
                    }
                    maxLength={2000}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary pr-9"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <VoiceInput onTranscript={handleVoiceTranscript} disabled={isTyping} />
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="h-9 px-3.5 text-xs rounded-xl"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Insights panel — mobile collapsible, desktop hidden (lives in side column) */}
          <AnimatePresence>
            {insightsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden"
              >
                <div className="max-h-[60dvh] overflow-y-auto">{contextPanel}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Context side panel — desktop */}
        <div className="hidden md:block md:w-72 shrink-0 min-h-0 md:overflow-y-auto pr-1">
          {contextPanel}
        </div>
      </div>

      {/* Modals */}
      <SmartPalateRadarModal
        open={radarOpen}
        onOpenChange={setRadarOpen}
        userPalate={twin ? {
          acidity: twin.adventure_level,
          body: twin.strength_preference,
          sweetness: twin.sweetness_preference,
          bitterness: 10 - twin.sweetness_preference,
          floral_notes: twin.adventure_level,
        } : { acidity: 6, body: 6, sweetness: 5, bitterness: 4, floral_notes: 6 }}
        menuItems={menu}
        onSelectDrink={drink => {
          void sendMessage(`Tell me why ${drink.name} matches my Palate DNA and how it is extracted.`);
        }}
      />

      <BaristaShiftBrewGuideModal open={brewGuideOpen} onOpenChange={setBrewGuideOpen} />

      <TasteMemoryManagerModal
        open={memoryOpen}
        onOpenChange={setMemoryOpen}
        onMemoriesUpdated={() => {
          void (async () => {
            if (!profile?.id) return;
            const { data } = await supabase
              .from('customer_taste_memories')
              .select('*')
              .eq('customer_id', profile.id)
              .order('created_at', { ascending: false });
            setTasteMemories((data as TasteMemory[]) ?? []);
          })();
        }}
      />

      {giftDrink && (
        <GiftModal
          open={!!giftDrink}
          onClose={() => setGiftDrink(null)}
          drinkId={giftDrink.id}
          drinkName={giftDrink.name}
          drinkPrice={giftDrink.price}
          drinkImage={giftDrink.image_url}
          cafeId={cafeId ?? ''}
        />
      )}

      <GiftCenterModal
        open={giftCenterOpen}
        onClose={() => setGiftCenterOpen(false)}
        onSendNew={() => {
          setGiftCenterOpen(false);
          toast.info('Ask the barista: "gift my friend a drink" — name any menu item.');
        }}
      />

      <CollaborativeChatModal
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        cafeId={cafeId}
        onOpenRoom={handleOpenRoom}
      />

      {sharedRoom && (
        <SharedChatRoom
          collaboration={sharedRoom.collaboration}
          myRole={sharedRoom.myRole}
          menu={menu}
          onClose={() => setSharedRoom(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Collapsible side section
───────────────────────────────────────────── */
function SidePanelSection({
  title, icon, children, defaultOpen = true,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
