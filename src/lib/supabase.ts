import { createClient } from '@supabase/supabase-js';
import type { LockFunc } from '@supabase/auth-js';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: authLock,
  },
});

export type { User, Session } from '@supabase/supabase-js';
