import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btnlrvhhqtbfbhswufgm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bmxydmhocXRiZmJoc3d1ZmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MjkyNjEsImV4cCI6MjA5OTMwNTI2MX0.-__iQGULDGPZaXGoGdc7z-lAg5ORYrx9w6P7xuzOyGY';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type { User, Session } from '@supabase/supabase-js';
