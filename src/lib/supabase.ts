import { createClient } from '@supabase/supabase-js';
import type { LockFunc } from '@supabase/auth-js';

/**
 * Anonymous Café Pulse participation token.
 *
 * One token per browser session identifies "your" pulse signal, board notes and
 * wavelength channels without revealing who you are. It is also sent as the
 * `x-session-token` header on every Supabase request (see src/lib/supabase.ts)
 * so Row Level Security policies can authenticate session-owned rows.
 */
const PULSE_TOKEN_KEY = 'cafe_pulse_anon_session';

export function getPulseSessionToken(): string {
  try {
    let token = sessionStorage.getItem(PULSE_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem(PULSE_TOKEN_KEY, token);
    }
    return token;
  } catch {
    // sessionStorage unavailable (restricted context) — fall back to an
    // in-memory token so the page still functions for this tab.
    if (!memoryToken) memoryToken = crypto.randomUUID();
    return memoryToken;
  }
}

let memoryToken: string | null = null;

const supabaseUrl = 'https://btnlrvhhqtbfbhswufgm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bmxydmhocXRiZmJoc3d1ZmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MjkyNjEsImV4cCI6MjA5OTMwNTI2MX0.-__iQGULDGPZaXGoGdc7z-lAg5ORYrx9w6P7xuzOyGY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

const authLocks: Record<string, Promise<unknown>> = {};

const authLock: LockFunc = async (name, _acquireTimeout, fn) => {
  const previousLock = authLocks[name] ?? Promise.resolve();
  let release!: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  authLocks[name] = previousLock.finally(() => nextLock);

  await previousLock.catch(() => undefined);

  try {
    return await fn();
  } finally {
    release();
    if (authLocks[name] === nextLock) {
      delete authLocks[name];
    }
  }
};

/**
 * Every Supabase request carries the anonymous pulse token as a header so RLS
 * policies (see migration 00003) can verify ownership of session-based rows.
 * Harmless when the policies are not applied yet.
 */
const sessionAwareFetch: typeof fetch = (input, init) => {
  const token = getPulseSessionToken();
  const headers = new Headers(init?.headers);
  if (!headers.has('x-session-token')) headers.set('x-session-token', token);

  if (input instanceof Request) {
    const merged = new Headers(input.headers);
    if (!merged.has('x-session-token')) merged.set('x-session-token', token);
    return fetch(new Request(input, { headers: merged }), { ...init, headers });
  }
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: authLock,
  },
  global: {
    fetch: sessionAwareFetch,
  },
});

export type { User, Session } from '@supabase/supabase-js';
