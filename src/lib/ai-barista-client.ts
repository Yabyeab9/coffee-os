/**
 * AI Barista — data access layer.
 *
 * Every Supabase operation for the AI Barista lives here so the page
 * stays declarative. The module is defensive about schema age:
 * `ai_chat_sessions.mode` / `.title` arrive with migration 00003, so
 * writes attempt the enhanced form first and fall back to the base
 * columns, while the client keeps a device-local mode map that works
 * both before and after the migration is applied.
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────────── */

export type ChatMode = 'coffee' | 'roast';

export interface ChatSessionRow {
  id: string;
  customer_id: string;
  session_start: string | null;
  created_at: string;
  mode?: string | null;
  title?: string | null;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_text: string | null;
  message_type: string | null;
  recommendations: unknown;
  created_at: string;
}

export interface CaffeineLogRow {
  drink_name: string;
  caffeine_mg: number;
  consumed_at: string;
}

export interface CollaborationRow {
  id: string;
  cafe_id: string | null;
  host_id: string;
  guest_id: string | null;
  session_code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface CollaborationMessageRow {
  id: string;
  collaboration_id: string;
  author_id: string | null;
  role: 'host' | 'guest' | 'assistant';
  content: string;
  created_at: string;
}

export interface GiftRow {
  id: string;
  cafe_id: string | null;
  sender_id: string;
  recipient_name: string;
  recipient_contact: string | null;
  drink_id: string | null;
  drink_name: string | null;
  message: string | null;
  audio_note_url: string | null;
  qr_code: string | null;
  status: string | null;
  expires_at: string | null;
  created_at: string;
}

/* ── Device-local session mode map (works pre-migration) ── */

const MODE_KEY = 'coffee_os_barista_modes_v1';

function readModeMap(): Record<string, ChatMode> {
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ChatMode>) : {};
  } catch {
    return {};
  }
}

function writeModeMap(map: Record<string, ChatMode>) {
  try {
    window.localStorage.setItem(MODE_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal: mode falls back to 'coffee' for unknown sessions.
  }
}

export function getSessionMode(sessionId: string, row?: { mode?: string | null }): ChatMode {
  if (row?.mode === 'roast' || row?.mode === 'coffee') return row.mode;
  return readModeMap()[sessionId] ?? 'coffee';
}

export function setSessionModeLocal(sessionId: string, mode: ChatMode) {
  const map = readModeMap();
  map[sessionId] = mode;
  writeModeMap(map);
}

/** Derive a conversation title from its first customer message. */
export function deriveTitle(firstUserMessage: string | undefined | null): string | null {
  if (!firstUserMessage) return null;
  const clean = firstUserMessage.replace(/\s+/g, ' ').trim();
  return clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}…` : clean;
}

/* ── Sessions ────────────────────────────────────────────── */

export async function listSessions(customerId: string): Promise<ChatSessionRow[]> {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('customer_id', customerId)
    .order('session_start', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ChatSessionRow[];
}

/**
 * Create a session. Attempts to persist `mode` and `title` when the
 * columns exist (migration 00003); falls back to the base insert so
 * the feature works on the current deployed schema too.
 */
export async function createSession(
  customerId: string,
  mode: ChatMode,
  title?: string | null,
): Promise<ChatSessionRow> {
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({ customer_id: customerId, mode, title: title ?? null })
    .select()
    .single();

  if (error) {
    // Pre-migration schema: mode/title columns do not exist yet.
    const fallback = await supabase
      .from('ai_chat_sessions')
      .insert({ customer_id: customerId })
      .select()
      .single();
    if (fallback.error) throw fallback.error;
    const row = fallback.data as ChatSessionRow;
    setSessionModeLocal(row.id, mode);
    return row;
  }
  return data as ChatSessionRow;
}

export async function deleteSession(sessionId: string): Promise<void> {
  // Messages cascade with the session.
  const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function touchSessionTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({ title })
    .eq('id', sessionId);
  // Title column may not exist yet — the client derives titles on read.
  if (error) {
    // silently ignore; non-fatal
  }
}

/* ── Messages ──────────────────────────────────────────────── */

export async function listMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ChatMessageRow[];
}

export async function insertMessage(
  sessionId: string,
  role: ChatMessageRow['role'],
  content: string,
  messageType: string,
  recommendations?: unknown,
): Promise<ChatMessageRow | null> {
  const payload: Record<string, unknown> = {
    session_id: sessionId,
    role,
    content,
    message_text: content,
    message_type: messageType,
  };
  if (recommendations !== undefined) payload.recommendations = recommendations;

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert(payload)
    .select()
    .single();
  if (error) {
    // recommendations column may be absent in some deployments
    if (recommendations !== undefined) {
      delete payload.recommendations;
      const retry = await supabase
        .from('ai_chat_messages')
        .insert(payload)
        .select()
        .single();
      if (retry.error) {
        toast.error('Could not save the message to your history.');
        return null;
      }
      return retry.data as ChatMessageRow;
    }
    toast.error('Could not save the message to your history.');
    return null;
  }
  return data as ChatMessageRow;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase.from('ai_chat_messages').delete().eq('id', messageId);
  return !error;
}

/* ── Caffeine logging ──────────────────────────────────────── */

export async function logCaffeine(
  userId: string,
  drinkName: string,
  caffeineMg: number,
): Promise<CaffeineLogRow | null> {
  const { data, error } = await supabase
    .from('caffeine_logs')
    .insert({
      user_id: userId,
      drink_name: drinkName,
      caffeine_mg: caffeineMg,
      consumed_at: new Date().toISOString(),
    })
    .select('drink_name, caffeine_mg, consumed_at')
    .single();
  if (error) {
    toast.error('Could not log caffeine.');
    return null;
  }
  return data as CaffeineLogRow;
}

/* ── Reply feedback (ai_generations) ─────────────────────── */

export async function recordReplyFeedback(
  userId: string,
  cafeId: string | null,
  prompt: string,
  reply: string,
  feedback: 1 | -1,
): Promise<boolean> {
  const { error } = await supabase.from('ai_generations').insert({
    cafe_id: cafeId,
    user_id: userId,
    feature: 'barista_chat' as never,
    model: 'ai-barista',
    prompt,
    output: reply,
    feedback,
  });
  if (error) {
    // feature may be enum-constrained in some deployments — retry without it
    const retry = await supabase.from('ai_generations').insert({
      cafe_id: cafeId,
      user_id: userId,
      model: 'ai-barista',
      prompt,
      output: reply,
      feedback,
    } as never);
    if (retry.error) {
      toast.error('Could not record feedback.');
      return false;
    }
  }
  return true;
}

/* ── Collaborations (friend invitations, shared chats) ───── */

function generateSessionCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function createCollaboration(
  cafeId: string | null,
  hostId: string,
): Promise<CollaborationRow | null> {
  // Reuse an existing open room the host already has (one active room).
  const existing = await supabase
    .from('collaborative_taste_sessions')
    .select('*')
    .eq('customer_1_id', hostId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data) {
    return {
      id: existing.data.id,
      cafe_id: existing.data.cafe_id ?? null,
      host_id: existing.data.customer_1_id,
      guest_id: existing.data.customer_2_id ?? null,
      session_code: existing.data.session_code,
      status: existing.data.status,
      expires_at: existing.data.expires_at,
      created_at: existing.data.created_at,
    };
  }

  const code = generateSessionCode();
  const { data, error } = await supabase
    .from('collaborative_taste_sessions')
    .insert({
      cafe_id: cafeId,
      customer_1_id: hostId,
      session_code: code,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error) {
    toast.error('Could not create the collaboration room.');
    return null;
  }
  return {
    id: data.id,
    cafe_id: data.cafe_id ?? null,
    host_id: data.customer_1_id,
    guest_id: data.customer_2_id ?? null,
    session_code: data.session_code,
    status: data.status,
    expires_at: data.expires_at,
    created_at: data.created_at,
  };
}

/** Join (or look up) a collaboration by its invite code. */
export async function joinCollaboration(
  code: string,
  guestId: string,
): Promise<CollaborationRow | null> {
  const clean = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('collaborative_taste_sessions')
    .select('*')
    .eq('session_code', clean)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (!error) toast.error('No active session with that code.');
    return null;
  }

  // Claim the guest seat if it is empty and the guest isn't the host.
  if (!data.customer_2_id && data.customer_1_id !== guestId) {
    await supabase
      .from('collaborative_taste_sessions')
      .update({ customer_2_id: guestId, status: 'active' })
      .eq('id', data.id);
    data.customer_2_id = guestId;
    data.status = 'active';
  }

  return {
    id: data.id,
    cafe_id: data.cafe_id ?? null,
    host_id: data.customer_1_id,
    guest_id: data.customer_2_id ?? null,
    session_code: data.session_code,
    status: data.status,
    expires_at: data.expires_at,
    created_at: data.created_at,
  };
}

export async function listCollaborations(userId: string): Promise<CollaborationRow[]> {
  const { data, error } = await supabase
    .from('collaborative_taste_sessions')
    .select('*')
    .or(`customer_1_id.eq.${userId},customer_2_id.eq.${userId}`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    cafe_id: (row.cafe_id as string | null) ?? null,
    host_id: row.customer_1_id as string,
    guest_id: (row.customer_2_id as string | null) ?? null,
    session_code: row.session_code as string,
    status: row.status as string,
    expires_at: row.expires_at as string,
    created_at: row.created_at as string,
  }));
}

/* ── Shared chat messages (migration 00003 tables) ──────── */

export async function listSharedMessages(
  collaborationId: string,
): Promise<CollaborationMessageRow[]> {
  const { data, error } = await supabase
    .from('barista_collaboration_messages')
    .select('*')
    .eq('collaboration_id', collaborationId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as CollaborationMessageRow[];
}

export async function insertSharedMessage(
  collaborationId: string,
  authorId: string | null,
  role: CollaborationMessageRow['role'],
  content: string,
): Promise<CollaborationMessageRow | null> {
  const { data, error } = await supabase
    .from('barista_collaboration_messages')
    .insert({ collaboration_id: collaborationId, author_id: authorId, role, content })
    .select()
    .single();
  if (error) {
    toast.error('Could not save the shared message.');
    return null;
  }
  return data as CollaborationMessageRow;
}

/* ── Gifts ─────────────────────────────────────────────────── */

export async function listSentGifts(senderId: string): Promise<GiftRow[]> {
  const { data, error } = await supabase
    .from('coffee_gifts')
    .select('*')
    .eq('sender_id', senderId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as GiftRow[];
}

/* ── Default café resolution ─────────────────────────────── */

/**
 * Resolve the café to scope café-level features. Prefers the user's
 * own café and otherwise falls back to the first published café —
 * never a hardcoded UUID.
 */
export async function resolveCafeId(
  profileCafeId: string | null | undefined,
): Promise<string | null> {
  if (profileCafeId) return profileCafeId;
  const { data, error } = await supabase
    .from('cafes')
    .select('id')
    .eq('is_published', true)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}
