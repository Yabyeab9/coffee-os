import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

// Atomically set session + profile + isLoading in one render to eliminate
// the race window where session=value, profile=null, isLoading=false.
interface AuthState {
  session: Session | null;
  profile: User | null;
  isLoading: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    profile: null,
    isLoading: true,
  });

  // Track whether initializeAuth has completed so onAuthStateChange
  // doesn't redundantly re-run for the INITIAL_SESSION.
  const initDone = useRef(false);

  const fetchProfileData = useCallback(async (userId: string): Promise<User | null> => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = authState.session?.user?.id;
    if (!userId) return;
    const profile = await fetchProfileData(userId);
    setAuthState(prev => ({ ...prev, profile }));
  }, [authState.session, fetchProfileData]);

  useEffect(() => {
    let mounted = true;



    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;

        if (initialSession?.user?.id) {
          const profile = await fetchProfileData(initialSession.user.id);
          if (mounted) {
            // Atomic: session + profile + isLoading=false in one setState call
            setAuthState({ session: initialSession, profile, isLoading: false });
          }
        } else {
          if (mounted) {
            setAuthState({ session: null, profile: null, isLoading: false });
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Auth initialization failed' }));
        }
      } finally {
        initDone.current = true;
      }
    };

    initializeAuth();

    // Listen for post-init auth events (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        // INITIAL_SESSION fires synchronously during getSession() — skip it
        // because initializeAuth already handles the initial state.
        if (event === 'INITIAL_SESSION') return;

        // For SIGNED_OUT: clear state atomically, no profile fetch needed
        if (!currentSession) {
          setAuthState({ session: null, profile: null, isLoading: false });
          return;
        }

        // For SIGNED_IN / TOKEN_REFRESHED: fetch profile, then set atomically
        // Never expose an intermediate state where session is set but profile is null.
        const profile = await fetchProfileData(currentSession.user.id);
        if (mounted) {
          setAuthState({ session: currentSession, profile, isLoading: false });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileData]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error?.message ?? null, profile: null };
    const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle();
    return { error: null, profile };
  };

 const signInWithGoogle = async (redirectTo?: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/account`,
    },
  })

  if (error) {
    console.error('Google sign-in error:', error)
    return { error: error.message }
  }

  return { error: null }
}


  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };

    // If a referral code was in the URL (?ref=CODE), apply it after sign-up
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode && data?.user?.id) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.access_token) {
          await supabase.functions.invoke('loyalty-engine', {
            body: { action: 'apply_referral_code', payload: { referral_code: refCode } },
          });
        }
      } catch {
        // non-fatal
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setAuthState({ session: null, profile: null, isLoading: false });
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const { session, profile, isLoading } = authState;
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