import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  role: UserRole | null;
  cafeId: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isEditor: boolean;
  isCustomer: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile?: any | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error?.message ?? null, profile: null };
    const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle();
    return { error: null, profile };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: 'miaoda-gg.com',
      options: { redirectTo: redirectTo ?? `${window.location.origin}/account` },
    });
    if (data?.url) window.open(data.url, '_self');
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    // Trigger automatically handles user row creation
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const role = profile?.role ?? null;
  const cafeId = profile?.cafe_id ?? null;

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      role,
      cafeId,
      isLoading,
      isAdmin: role === 'admin',
      isOwner: role === 'admin' || role === 'owner',
      isEditor: role === 'admin' || role === 'owner' || role === 'manager' || role === 'editor',
      isCustomer: role === 'customer',
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
