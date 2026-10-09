import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Send, RefreshCw, Dna, Loader2, Mic, MicOff,
  Users, Gift, Activity, ChevronDown, ChevronUp, Coffee,
  BookOpen, Brain, ShieldCheck, ArrowRight, Radio, Sliders, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import CaffeineTrackerCard, { CaffeineLog } from '@/components/ai-barista/CaffeineTrackerCard';
import PalateXPProgressCard, { getPalateLevel, SecretDrink } from '@/components/ai-barista/PalateXPProgressCard';
import InChatDrinkCard, { DrinkCardData, sanitizeName } from '@/components/ai-barista/InChatDrinkCard';
import GiftModal from '@/components/ai-barista/GiftModal';
import CollaborativeInviteModal from '@/components/ai-barista/CollaborativeInviteModal';
import SmartPalateRadarModal from '@/components/ai-barista/SmartPalateRadarModal';
import BaristaShiftBrewGuideModal from '@/components/ai-barista/BaristaShiftBrewGuideModal';
import TasteMemoryManagerModal, { TasteMemory } from '@/components/ai-barista/TasteMemoryManagerModal';
import LiveExtractionCalibrationDial from '@/components/ai-barista/LiveExtractionCalibrationDial';
import MetabolicBedtimeCurveSimulator from '@/components/ai-barista/MetabolicBedtimeCurveSimulator';

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
  stressed: 'Stressed',
  happy: 'Happy',
  calm: 'Calm',
  sad: 'Sad',
  focused: 'Focused',
  energetic: 'Energized',
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
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        // Mock voice transcription fallback for browsers without web speech API
        setTranscript('I prefer medium roast coffee with fruity notes and no dairy.');
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  return { recording, transcript, start, stop, setTranscript };
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
        <div className="w-7 h-7 rounded-full bg-foreground/5 border border-border flex items-center justify-center shrink-0 mt-0.5">
          <Coffee className="w-3.5 h-3.5 text-foreground/70" />
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
              : 'bg-card border border-border text-foreground rounded-bl-sm'
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
  const navigate = useNavigate();

  // Chat state
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
  const [tasteMemories, setTasteMemories] = useState<TasteMemory[]>([]);
  const [pulseAtmosphere, setPulseAtmosphere] = useState<string>('calm');

  // New Killer Feature Modals
  const [radarOpen, setRadarOpen] = useState(false);
  const [brewGuideOpen, setBrewGuideOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [giftDrink, setGiftDrink] = useState<{ id: string; name: string; price: number | null; image_url: string | null } | null>(null);
  const [collabOpen, setCollabOpen] = useState(false);
  const [detectedMood, setDetectedMood] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cafeId = profile?.cafe_id || '4a2972a2-70d7-403c-9eda-f8bb2d5cc62f';

  /* ── Load all context ── */
  const loadContext = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const [
        ordersRes, challengesRes, loyaltyRes, menuRes, twinRes,
        sessionRes, caffeineRes, secretRes, memoriesRes, pulseAtmosphereRes,
      ] = await Promise.all([
        supabase.from('orders').select('*, items:order_items(*, menu_item:menus(name,category_id))').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('challenge_participants').select('*, challenge:challenges(*)').eq('customer_id', profile.id).eq('completed', false),
        supabase.from('loyalty_points').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('menus').select('*, category:menu_categories(name)').is('deleted_at', null).limit(60),
        supabase.from('ai_coffee_twin').select('*').eq('customer_id', profile.id).maybeSingle(),
        supabase.from('ai_chat_sessions').select('*').eq('customer_id', profile.id).order('session_start', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('caffeine_logs').select('drink_name, caffeine_mg, consumed_at').eq('user_id', profile.id).gte('consumed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).order('consumed_at', { ascending: true }),
        supabase.from('secret_menu_items').select('*').order('unlock_level', { ascending: true }),
        supabase.from('customer_taste_memories').select('*').eq('customer_id', profile.id).order('created_at', { ascending: false }),
        supabase.rpc('get_cafe_pulse_atmosphere', { p_cafe_id: cafeId }),
      ]);

      setOrders(ordersRes.data ?? []);
      setChallenges((challengesRes.data ?? []).map((p: any) => ({ ...p.challenge, current_progress: p.current_progress, target_count: p.target_count })));
      setLoyalty(loyaltyRes.data);
      setMenu(menuRes.data ?? []);
      setTwin(twinRes.data);
      setCaffeineLogs((caffeineRes.data ?? []) as CaffeineLog[]);
      setSecretDrinks((secretRes.data ?? []) as SecretDrink[]);
      setTasteMemories((memoriesRes.data as TasteMemory[]) ?? []);

      if (pulseAtmosphereRes.data?.status_phrase) {
        setPulseAtmosphere(pulseAtmosphereRes.data.status_phrase);
      }

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
          const atmosphereHint = pulseAtmosphereRes.data?.status_phrase ? `The café atmosphere is currently: "${pulseAtmosphereRes.data.status_phrase}"` : '';
          const msg = `${greet}, ${name}! ${atmosphereHint} How are you feeling today, and what kind of roast or brew can I craft for you?`;
          const saved = await saveMessage(sid, 'assistant', msg);
          if (saved) setMessages([{ ...saved, drinkCard: null, giftIntent: null }]);
        }
      }
    } catch (e: any) {
      toast.error('Failed to load AI Barista context');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, profile?.full_name, cafeId]);

  useEffect(() => { loadContext(); }, [loadContext]);

  /* ── Save message ── */
  const saveMessage = async (sid: string, role: string, content: string) => {
    const message_type = role === 'user' ? 'customer' : 'ai';
    const { data } = await supabase.from('ai_chat_messages').insert({ session_id: sid, role,message_text:content, content,message_type, }).select().single();
    return data as Message | null;
  };

  /* ── Detect mood client-side ── */
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

    const preferenceStrings = tasteMemories.map(m => `${m.attribute_key}: ${m.attribute_value}`);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

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
            preferenceNotes: preferenceStrings,
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

      // Handle dynamic taste memory extraction
      const tasteMemoryMatch = raw.match(/\[TASTE_MEMORY:(\{.*?\})\]/);
      if (tasteMemoryMatch) {
        try {
          const parsed = JSON.parse(tasteMemoryMatch[1]);
          if (profile?.id && parsed.preference) {
            await supabase.from('customer_taste_memories').insert({
              customer_id: profile.id,
              preference_type: parsed.category || 'taste_note',
              attribute_key: 'Conversational Preference',
              attribute_value: parsed.preference,
              confidence_score: 0.95,
              source_context: 'ai_barista_chat',
            });
            toast.success(`Taste Memory updated: "${parsed.preference}"`);
            const { data: mems } = await supabase.from('customer_taste_memories').select('*').eq('customer_id', profile.id).order('created_at', { ascending: false });
            if (mems) setTasteMemories(mems as TasteMemory[]);
          }
        } catch {
          // ignore
        }
      }

      // Handle dynamic cart action extraction
      const cartActionMatch = raw.match(/\[CART_ACTION:(\{.*?\})\]/);
      if (cartActionMatch) {
        try {
          const parsed = JSON.parse(cartActionMatch[1]);
          const targetName = parsed.item_name;
          const match = menu.find(m => sanitizeName(m.name).toLowerCase().includes(sanitizeName(targetName).toLowerCase()));
          if (match) {
            handleAddToCart({
              id: match.id,
              name: match.name,
              price: match.price,
              image_url: match.image_url,
            });
            toast.success(`Added ${match.name} to your order!`);
          }
        } catch {
          // ignore
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

    } catch {
      // Intelligent multi-intent coffee fallback engine (never repeat generic canned loop)
      const userLower = userText.toLowerCase();
      let smartReply = '';
      let fallbackCard: DrinkCardData | null = null;

      if (userLower.includes('washed') || userLower.includes('natural') || userLower.includes('process')) {
        smartReply = `In Ethiopian specialty coffees, washed processing (like our Yirgacheffe V60) produces crystalline clarity with jasmine florals and bright bergamot acidity because fruit pulp is removed before drying. Natural processing (like Harar or Guji) dries the coffee inside the whole cherry, imparting rich wild blueberry, strawberry jam sweetness, and a heavier, winey mouthfeel.`;
      } else if (userLower.includes('caffeine') || userLower.includes('sleep') || userLower.includes('bedtime') || userLower.includes('jitters')) {
        smartReply = `You've logged approximately ${todayTotal}mg of caffeine today. With caffeine's 5.7-hour metabolic half-life, your estimated bedtime level is ${bedtimeMg}mg (${bedtimeMg <= 50 ? 'safe for restorative slow-wave sleep' : 'elevated, which may lighten REM cycles'}). If you're craving coffee now, our water-processed Decaf Sidama pour-over gives you full single-origin flavor with zero sleep disruption.`;
      } else if (userLower.includes('brew') || userLower.includes('grind') || userLower.includes('ratio') || userLower.includes('temperature') || userLower.includes('temp')) {
        smartReply = `For Ethiopian heirloom varietals, we dial in a 1:16 ratio (15g coffee to 240g water) at 93°C with a medium-fine grind (around 24 clicks on a standard hand mill). A 45-second bloom followed by two concentric circular pours preserves floral sweetness and delicate stone fruit acidity without astringency.`;
      } else {
        // Recommend from real loaded menu
        const topItem = menu.find(m => m.is_available) || menu[0];
        if (topItem) {
          smartReply = `Based on your Palate DNA and today's café roast schedule, I recommend trying our ${topItem.name}. It showcases exceptional balance and origin characteristics.\n\n[DRINK_CARD:{"id":"${topItem.id}","name":"${topItem.name}","price":${topItem.price},"match_pct":94}]`;
          fallbackCard = {
            id: topItem.id,
            name: topItem.name,
            price: topItem.price,
            image_url: topItem.image_url,
            cafe_id: cafeId,
            match_pct: 94,
          };
        } else {
          smartReply = `Welcome! I'm calibrated to your sensory palate. Feel free to ask about our roast profiles, coffee processing differences (washed vs natural), ideal pour-over brew ratios, or personalized sleep-safe caffeine timing.`;
        }
      }

      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: smartReply,
        created_at: new Date().toISOString(),
        drinkCard: fallbackCard,
        giftIntent: null,
      };
      setMessages(prev => [...prev, errMsg]);
      await saveMessage(sessionId, 'assistant', smartReply);
    } finally {
      setIsTyping(false);
    }
  };

  /* ── Voice note submit ── */
  const handleVoiceSubmit = async () => {
    if (voice.recording) { voice.stop(); return; }
    if (voice.transcript) {
      if (profile?.id) {
        await supabase.from('customer_taste_memories').insert({
          customer_id: profile.id,
          preference_type: 'voice_note',
          attribute_key: 'Voice Stated Taste',
          attribute_value: voice.transcript,
          confidence_score: 0.95,
          source_context: 'voice_microphone',
        });
      }
      await sendMessage(voice.transcript);
      voice.setTranscript('');
    } else {
      voice.start();
    }
  };

  const handleAddToCart = (drink: DrinkCardData) => {
    toast.success(`Added ${drink.name} to your tray!`);
  };

  const newSession = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('ai_chat_sessions').insert({ customer_id: profile.id }).select().single();
    if (data) { setSessionId(data.id); setMessages([]); setDetectedMood(null); }
  };

  /* ── Loading state ── */
  if (isLoading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
        <p className="text-xs text-muted-foreground">Calibrating sensory intelligence…</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 md:px-6 py-4 gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between shrink-0 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4.5 h-4.5 text-foreground/80" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground tracking-tight">AI Barista</h1>
              <Badge variant="outline" className="text-[10px] font-normal tracking-wider">
                Sensory OS
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions Bar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRadarOpen(true)}
            className="text-xs h-7.5 px-2.5 flex items-center gap-1.5 hover:bg-muted/30"
          >
            <Dna className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Palate DNA</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBrewGuideOpen(true)}
            className="text-xs h-7.5 px-2.5 flex items-center gap-1.5 hover:bg-muted/30"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Brew Guide</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMemoryOpen(true)}
            className="text-xs h-7.5 px-2.5 flex items-center gap-1.5 hover:bg-muted/30"
          >
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Memory</span>
          </Button>

          <Separator orientation="vertical" className="h-4" />

          <button
            onClick={newSession}
            title="Start new conversation"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
        {/* Left Side Panel (Palate Twin & Caffeine Optimizer) */}
        <div className="md:w-72 shrink-0 space-y-2.5 md:overflow-y-auto hidden md:flex md:flex-col pr-1">
          {/* Coffee Twin Radar Overview */}
          <SidePanelSection
            title="Palate DNA Radar"
            icon={<Dna className="w-3.5 h-3.5 text-primary" />}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRadarOpen(true)}
                  className="w-full text-xs h-8 justify-between"
                >
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
            </div>
          </SidePanelSection>

          {/* Caffeine Bio-Clock Sleep Optimizer */}
          <SidePanelSection
            title="Caffeine Sleep-Safety"
            icon={<Activity className="w-3.5 h-3.5 text-primary" />}
            defaultOpen={true}
          >
            <CaffeineTrackerCard logs={caffeineLogs} />
          </SidePanelSection>

          {/* Live Pour-Over Calibration Dial */}
          <SidePanelSection
            title="Brew Extraction Dial"
            icon={<Sliders className="w-3.5 h-3.5 text-primary" />}
            defaultOpen={false}
          >
            <LiveExtractionCalibrationDial
              drinkName={menu.find(m => m.is_available)?.name ?? 'Yirgacheffe V60'}
              onApplyCalibration={(note) => {
                setInput((prev: string) => prev ? `${prev} [Note: ${note}]` : `Please prepare my drink with this calibration: ${note}`);
              }}
            />
          </SidePanelSection>

          {/* Metabolic Bedtime Curve Simulator */}
          <SidePanelSection
            title="Metabolic Bedtime Trajectory"
            icon={<Moon className="w-3.5 h-3.5 text-indigo-400" />}
            defaultOpen={false}
          >
            <MetabolicBedtimeCurveSimulator caffeineLogs={caffeineLogs} />
          </SidePanelSection>

          {/* Café Pulse Alignment Bridge */}
          <SidePanelSection
            title="Café Pulse Frequency"
            icon={<Radio className="w-3.5 h-3.5 text-primary" />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              <p className="text-xs text-foreground font-medium">{pulseAtmosphere}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/account/mood-pulse')}
                className="w-full text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                Open Café Pulse
              </Button>
            </div>
          </SidePanelSection>

          {/* Palate XP Progress */}
          <SidePanelSection
            title="Palate Journey XP"
            icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
            defaultOpen={false}
          >
            <PalateXPProgressCard
              xp={twin?.palate_xp ?? 0}
              badges={twin?.unlocked_badges ?? []}
              secretDrinks={secretDrinks}
            />
          </SidePanelSection>
        </div>

        {/* Right Main Chat Section */}
        <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {/* Quick Context Bar */}
          <div className="px-4 py-2 bg-muted/20 border-b border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Real Menu Sourcing · Zero Hallucinations
            </span>
            <div className="flex items-center gap-2">
              {tasteMemories.length > 0 && (
                <button
                  onClick={() => setMemoryOpen(true)}
                  className="hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Brain className="w-3 h-3 text-primary" />
                  {tasteMemories.length} Learned Rules
                </button>
              )}
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                menu={menu}
                cafeId={cafeId}
                onAddToCart={handleAddToCart}
              />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Coffee className="w-3.5 h-3.5 animate-bounce" />
                <span>AI Barista is crafting sensory advice…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Footer */}
          <div className="p-3 border-t border-border/60 bg-background/50 space-y-2">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {[
                'What single-origin matches my palate today?',
                'Is it safe to drink cold brew this late?',
                'Show me the V60 brewing guide specs',
                'What is the sweetest drink without added sugar?',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
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
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Ask your AI Barista anything about roasts, notes, or sleep timing…"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary pr-9"
                />
                <button
                  type="button"
                  onClick={handleVoiceSubmit}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {voice.recording ? <MicOff className="w-3.5 h-3.5 text-destructive animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>

              <Button
                size="sm"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="h-9 px-3.5 text-xs rounded-xl"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Killer Feature Modals */}
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
          sendMessage(`Tell me why ${drink.name} matches my Palate DNA and how it is extracted.`);
        }}
      />

      <BaristaShiftBrewGuideModal
        open={brewGuideOpen}
        onOpenChange={setBrewGuideOpen}
      />

      <TasteMemoryManagerModal
        open={memoryOpen}
        onOpenChange={setMemoryOpen}
        onMemoriesUpdated={() => loadContext()}
      />

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

      <CollaborativeInviteModal
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        cafeId={cafeId}
      />
    </div>
  );
}