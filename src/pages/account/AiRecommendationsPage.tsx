import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, RefreshCw, Dna, Loader2, Mic, MicOff,
  Users, Gift, Activity, ChevronDown, ChevronUp, Coffee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import CaffeineTrackerCard, { CaffeineLog } from '@/components/ai-barista/CaffeineTrackerCard';
import PalateXPProgressCard, { getPalateLevel, SecretDrink } from '@/components/ai-barista/PalateXPProgressCard';
import InChatDrinkCard, { DrinkCardData, sanitizeName } from '@/components/ai-barista/InChatDrinkCard';
import GiftModal from '@/components/ai-barista/GiftModal';
import CollaborativeInviteModal from '@/components/ai-barista/CollaborativeInviteModal';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  drinkCard?: DrinkCardData | null;
  giftIntent?: { drink_name: string } | null;
  moodTag?: string | null;
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

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

/** Parse a [DRINK_CARD:{...}] tag from an AI response */
function parseDrinkCard(text: string): DrinkCardData | null {
  const m = text.match(/\[DRINK_CARD:(\{[^}]+\})\]/);
  if (!m) return null;
  try { return JSON.parse(m[1]) as DrinkCardData; } catch { return null; }
}

/** Parse a [GIFT_INTENT:{...}] tag */
function parseGiftIntent(text: string): { drink_name: string } | null {
  const m = text.match(/\[GIFT_INTENT:(\{[^}]+\})\]/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/** Strip embedded tags so the bubble only shows prose */
function cleanBubbleText(text: string): string {
  return text
    .replace(/\[DRINK_CARD:\{[^}]+\}\]/g, '')
    .replace(/\[GIFT_INTENT:\{[^}]+\}\]/g, '')
    .trim();
}

const MOOD_LABEL: Record<string, string> = {
  stressed: '😰 Stressed',
  happy: '😊 Happy',
  calm: '😌 Calm',
  sad: '😔 Sad',
  focused: '🎯 Focused',
  energetic: '⚡ Energetic',
};

/* ─────────────────────────────────────────────
   Voice recorder hook
───────────────────────────────────────────── */
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        // Simple transcript extraction — in production wire to Whisper edge fn
        setTranscript('[voice note recorded]');
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setTimeout(() => stop(), 30_000);
    } catch { toast.error('Microphone access denied'); }
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  return { recording, transcript, setTranscript, start, stop };
}

/* ─────────────────────────────────────────────
   SidePanel section wrapper
───────────────────────────────────────────── */
function SidePanelSection({
  title, icon, children, defaultOpen = true,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Message bubble
───────────────────────────────────────────── */
function MessageBubble({
  msg, menu, cafeId, onAddToCart,
}: {
  msg: Message;
  menu: any[];
  cafeId: string;
  onAddToCart: (drink: DrinkCardData) => void;
}) {
  const isUser = msg.role === 'user';
  const prose = cleanBubbleText(msg.content);

  // Enrich drinkCard with full menu data (image, flavor_profile, cafe_id)
  let card: DrinkCardData | null = msg.drinkCard ?? null;
  if (card) {
    const menuItem = menu.find(m => m.id === card!.id || sanitizeName(m.name) === sanitizeName(card!.name));
    if (menuItem) {
      card = {
        ...card,
        name: menuItem.name,
        image_url: menuItem.image_url ?? card.image_url,
        price: menuItem.price ?? card.price,
        flavor_profile: menuItem.flavor_profile ?? undefined,
        cafe_id: cafeId,
      };
    } else {
      card = { ...card, cafe_id: cafeId };
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-foreground/6 border border-border flex items-center justify-center shrink-0 mt-0.5">
          <Coffee className="w-3 h-3 text-foreground/60" />
        </div>
      )}
      <div className={`max-w-[78%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {msg.moodTag && !isUser && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground self-start">
            {MOOD_LABEL[msg.moodTag] ?? msg.moodTag}
          </span>
        )}
        {prose && (
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-foreground text-background rounded-br-md'
              : 'bg-muted/30 border border-border text-foreground rounded-bl-md'
          }`}>
            {prose}
          </div>
        )}
        {card && !isUser && (
          <InChatDrinkCard drink={card} onAddToCart={onAddToCart} />
        )}
        <span className="text-[10px] text-muted-foreground px-1">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function AiRecommendationsPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Context data
  const [twin, setTwin] = useState<CoffeeTwin | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [caffeineLogs, setCaffeineLogs] = useState<CaffeineLog[]>([]);
  const [secretDrinks, setSecretDrinks] = useState<SecretDrink[]>([]);
  const [preferenceNotes, setPreferenceNotes] = useState<string[]>([]);

  // UI state
  const [giftDrink, setGiftDrink] = useState<{ id: string; name: string; price: number | null; image_url: string | null } | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Load all context ── */
  const loadContext = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const [
        ordersRes, challengesRes, loyaltyRes, menuRes, twinRes,
        sessionRes, caffeineRes, secretRes, insightsRes,
      ] = await Promise.all([
        supabase.from('orders').select('*, items:order_items(*, menu_item:menus(name,category_id))').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('challenge_participants').select('*, challenge:challenges(*)').eq('customer_id', profile.id).eq('completed', false),
        supabase.from('loyalty_points').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('menus').select('*, category:menu_categories(name)').eq('cafe_id', profile.cafe_id).is('deleted_at', null).limit(60),
        supabase.from('ai_coffee_twin').select('*').eq('customer_id', profile.id).maybeSingle(),
        supabase.from('ai_chat_sessions').select('*').eq('customer_id', profile.id).order('session_start', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('caffeine_logs').select('drink_name, caffeine_mg, consumed_at').eq('user_id', profile.id).gte('consumed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).order('consumed_at', { ascending: true }),
        supabase.from('secret_menu_items').select('*').eq('cafe_id', profile.cafe_id).order('unlock_level', { ascending: true }),
        supabase.from('ai_customer_insights').select('preference_notes').eq('customer_id', profile.id).maybeSingle(),
      ]);

      setOrders(ordersRes.data ?? []);
      setChallenges((challengesRes.data ?? []).map((p: any) => ({ ...p.challenge, current_progress: p.current_progress, target_count: p.target_count })));
      setLoyalty(loyaltyRes.data);
      setMenu(menuRes.data ?? []);
      setTwin(twinRes.data);
      setCaffeineLogs((caffeineRes.data ?? []) as CaffeineLog[]);
      setSecretDrinks((secretRes.data ?? []) as SecretDrink[]);
      setPreferenceNotes(insightsRes.data?.preference_notes ?? []);

      // Session setup
      let sid = sessionRes.data?.id ?? null;
      if (!sid) {
        const { data: ns } = await supabase.from('ai_chat_sessions').insert({ customer_id: profile.id }).select().single();
        sid = ns?.id ?? null;
      }
      setSessionId(sid);

      if (sid) {
        const { data: msgs } = await supabase.from('ai_chat_messages').select('*').eq('session_id', sid).order('created_at', { ascending: true }).limit(50);
        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m => ({ ...m, drinkCard: parseDrinkCard(m.content), giftIntent: parseGiftIntent(m.content) })));
        } else {
          const hour = new Date().getHours();
          const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
          const name = profile.full_name?.split(' ')[0] ?? 'there';
          const msg = `${greet}, ${name} — what can I get you today?`;
          const saved = await saveMessage(sid, 'assistant', msg);
          if (saved) setMessages([{ ...saved, drinkCard: null, giftIntent: null }]);
        }
      }
    } catch (e: any) {
      toast.error('Failed to load AI context');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, profile?.cafe_id, profile?.full_name]);

  useEffect(() => { loadContext(); }, [loadContext]);

  /* ── Save message ── */
  const saveMessage = async (sid: string, role: string, content: string) => {
    const { data } = await supabase.from('ai_chat_messages').insert({ session_id: sid, role, content }).select().single();
    return data as Message | null;
  };

  /* ── Detect mood client-side (mirrors edge fn logic) ── */
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
    if (!userText || !sessionId || isTyping) return;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
      drinkCard: null,
      giftIntent: null,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await saveMessage(sessionId, 'user', userText);

    // Update mood
    const mood = detectMoodLocal(nextMessages);
    setDetectedMood(mood);

    setIsTyping(true);

    // Build caffeine context
    const todayTotal = caffeineLogs.reduce((s, l) => s + l.caffeine_mg, 0);
    const BEDTIME_HOUR = 22;
    const now = new Date();
    const hoursTobed = Math.max(0, BEDTIME_HOUR - (now.getHours() + now.getMinutes() / 60));
    const bedtimeMg = Math.round(todayTotal * Math.pow(0.5, hoursTobed / 5.7));

    const palateLevel = twin?.palate_level ?? 1;
    const palateXp = twin?.palate_xp ?? 0;
    const { current } = getPalateLevel(palateXp);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await supabase.functions.invoke('ai-barista', {
        body: {
          messages: nextMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          context: {
            profile,
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
            preferenceNotes,
          },
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.error) throw new Error(await (res.error as any)?.context?.text?.() ?? res.error.message);

      const raw: string = res.data?.reply ?? res.data?.message ?? '';
      const drinkCard = parseDrinkCard(raw);
      const giftIntent = parseGiftIntent(raw);

      // Handle gift intent
      if (giftIntent || res.data?.gift_intent) {
        const drinkHint = giftIntent?.drink_name ?? res.data?.drink_hint ?? '';
        const match = menu.find(m => sanitizeName(m.name).toLowerCase().includes(drinkHint.toLowerCase()));
        if (match) {
          setGiftDrink({ id: match.id, name: match.name, price: match.price, image_url: match.image_url });
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: raw,
        created_at: new Date().toISOString(),
        drinkCard,
        giftIntent,
        moodTag: mood,
      };
      setMessages(prev => [...prev, assistantMsg]);
      await saveMessage(sessionId, 'assistant', raw);

    } catch (e: any) {
      const fallback = `I'm here to help! Try asking: "What should I drink?", "How many points do I have?", or "Help me finish my challenge."`;
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallback,
        created_at: new Date().toISOString(),
        drinkCard: null,
        giftIntent: null,
      };
      setMessages(prev => [...prev, errMsg]);
      await saveMessage(sessionId, 'assistant', fallback);
    } finally {
      setIsTyping(false);
    }
  };

  /* ── Voice note submit ── */
  const handleVoiceSubmit = async () => {
    if (voice.recording) { voice.stop(); return; }
    if (voice.transcript) {
      // Save preference to DB
      if (profile?.id) {
        await supabase.from('ai_customer_insights').upsert({
          customer_id: profile.id,
          preference_notes: [...preferenceNotes, voice.transcript],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'customer_id' });
        setPreferenceNotes(prev => [...prev, voice.transcript]);
      }
      await sendMessage(voice.transcript);
      voice.setTranscript('');
    } else {
      voice.start();
    }
  };

  /* ── New session ── */
  const newSession = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('ai_chat_sessions').insert({ customer_id: profile.id }).select().single();
    if (data) { setSessionId(data.id); setMessages([]); setDetectedMood(null); }
  };

  const cafeId = profile?.cafe_id ?? '';

  /* ── Loading state ── */
  if (isLoading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
        <p className="text-xs text-muted-foreground">Loading AI Barista…</p>
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 md:px-6 py-4 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4.5 h-4.5 text-foreground/70" />
          <h1 className="text-base font-semibold text-foreground tracking-tight">AI Barista</h1>
          {detectedMood && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hidden md:inline">
              {MOOD_LABEL[detectedMood]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollabOpen(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Taste with a friend</span>
          </button>
          <Separator orientation="vertical" className="h-4 hidden md:block" />
          <button
            onClick={newSession}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New chat</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">

        {/* ── Side Panel ── */}
        <div className="md:w-68 shrink-0 space-y-2 md:overflow-y-auto hidden md:flex md:flex-col">

          {/* Coffee Twin */}
          {twin && (
            <SidePanelSection
              title="Coffee Twin"
              icon={<Dna className="w-3.5 h-3.5 text-muted-foreground" />}
            >
              <div className="space-y-2.5">
                {([['Strength', twin.strength_preference], ['Sweetness', twin.sweetness_preference], ['Adventure', twin.adventure_level]] as [string, number][]).map(([label, val]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{label}</span><span>{val}/10</span>
                    </div>
                    <Progress value={val * 10} className="h-0.5" />
                  </div>
                ))}
                <div className="flex gap-1.5 flex-wrap pt-1">
                  <Badge variant="outline" className="text-[10px] font-normal">{twin.temperature_preference}</Badge>
                  <Badge variant="outline" className="text-[10px] font-normal">{twin.milk_preference} milk</Badge>
                  <Badge variant="outline" className="text-[10px] font-normal ml-auto">{twin.confidence_score}% confidence</Badge>
                </div>
              </div>
            </SidePanelSection>
          )}

          {/* Caffeine Bio-Clock */}
          <SidePanelSection
            title="Caffeine Bio-Clock"
            icon={<Activity className="w-3.5 h-3.5 text-muted-foreground" />}
          >
            <CaffeineTrackerCard logs={caffeineLogs} />
          </SidePanelSection>

          {/* Palate XP */}
          <SidePanelSection
            title="Palate Journey"
            icon={<Sparkles className="w-3.5 h-3.5 text-muted-foreground" />}
            defaultOpen={true}
          >
            <PalateXPProgressCard
              xp={twin?.palate_xp ?? 0}
              badges={twin?.unlocked_badges ?? []}
              secretDrinks={secretDrinks}
            />
          </SidePanelSection>

          {/* Voice preferences */}
          {preferenceNotes.length > 0 && (
            <SidePanelSection
              title="My Preferences"
              icon={<Mic className="w-3.5 h-3.5 text-muted-foreground" />}
              defaultOpen={false}
            >
              <div className="space-y-1">
                {preferenceNotes.slice(-5).map((n, i) => (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">· {n}</p>
                ))}
              </div>
            </SidePanelSection>
          )}
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 min-w-0 flex flex-col border border-border rounded-xl overflow-hidden bg-background">

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                menu={menu}
                cafeId={cafeId}
                onAddToCart={drink => {
                  toast.success(`${sanitizeName(drink.name)} added to cart`);
                }}
              />
            ))}

            {/* Gift intent trigger */}
            {messages.some(m => m.giftIntent) && !giftDrink && (
              <div className="flex justify-start">
                <button
                  onClick={() => {
                    const gi = messages.find(m => m.giftIntent)?.giftIntent;
                    if (gi) {
                      const match = menu.find(m => sanitizeName(m.name).toLowerCase().includes(gi.drink_name.toLowerCase()));
                      if (match) setGiftDrink({ id: match.id, name: match.name, price: match.price, image_url: match.image_url });
                      else setGiftDrink({ id: '', name: gi.drink_name, price: null, image_url: null });
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border hover:border-foreground/20 transition-colors text-foreground"
                >
                  <Gift className="w-3.5 h-3.5" />
                  Open gift panel
                </button>
              </div>
            )}

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-foreground/6 border border-border flex items-center justify-center shrink-0">
                  <Coffee className="w-3 h-3 text-foreground/60" />
                </div>
                <div className="flex gap-1 px-3 py-2 rounded-2xl rounded-bl-md bg-muted/30 border border-border">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {[
              'What should I drink?',
              'Use my loyalty points',
              'Help with my challenge',
              'Something cozy',
              'Send a gift ☕',
            ].map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border hover:border-foreground/25 text-muted-foreground hover:text-foreground transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
            {/* Voice toggle */}
            <button
              onClick={handleVoiceSubmit}
              title={voice.recording ? 'Stop recording' : 'Record a voice preference'}
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                voice.recording
                  ? 'border-destructive/40 bg-destructive/8 text-destructive'
                  : 'border-border hover:border-foreground/25 text-muted-foreground hover:text-foreground'
              }`}
            >
              {voice.recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={voice.recording ? 'Recording… tap mic to stop' : 'Ask me anything…'}
              disabled={isTyping}
              className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />

            {/* Gift shortcut */}
            <button
              onClick={() => {
                const first = menu.find(m => m.is_available !== false && !m.deleted_at);
                if (first) setGiftDrink({ id: first.id, name: first.name, price: first.price, image_url: first.image_url });
              }}
              title="Send a gift"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-border hover:border-foreground/25 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Gift className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-foreground/15 hover:border-foreground/30 text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Gift Modal */}
      {giftDrink && (
        <GiftModal
          open={!!giftDrink}
          onClose={() => setGiftDrink(null)}
          drinkId={giftDrink.id}
          drinkName={giftDrink.name}
          drinkPrice={giftDrink.price}
          drinkImage={giftDrink.image_url}
          cafeId={cafeId}
        />
      )}

      {/* Collaborative invite */}
      <CollaborativeInviteModal
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        cafeId={cafeId}
      />
    </div>
  );
}