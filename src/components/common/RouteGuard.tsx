import React, { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRedirectPathByRole } from '@/lib/auth-helpers';
import { Loader2 } from 'lucide-react';

function AuthLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

/**
 * AuthGuard — enforces Resolve → Verify → Render.
 *
 * While isLoading=true (auth state not yet resolved) we show only
 * <AuthLoader/> — we NEVER render layouts or children until both
 * session AND profile are fully resolved in a single atomic state update.
 *
 * This eliminates the flicker window where session=value, role=null.
 */
export function AuthGuard({
  roles,
  enforceDashboard,
  enforceAccount,
}: {
  roles?: string[];
  enforceDashboard?: boolean;
  enforceAccount?: boolean;
} = {}) {
  const { session, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for full auth resolution (session + profile) before acting
    if (isLoading) return;

    // Not authenticated → login
    if (!session) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    // /dashboard is for staff only — redirect customers to /account
    if (enforceDashboard && role === 'customer') {
      navigate('/account', { replace: true });
      return;
    }

    // /account is for customers only — redirect staff to /dashboard
    if (enforceAccount && role !== 'customer') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Role-gated routes (e.g. admin/owner only)
    if (roles && role && !roles.includes(role)) {
      navigate(getRedirectPathByRole(role), { replace: true });
    }
  }, [session, role, isLoading, navigate, location.pathname, roles, enforceDashboard, enforceAccount]);

  // Show loader until auth is fully resolved (no partial render)
  if (isLoading) return <AuthLoader />;

  // Not authenticated — effect handles redirect, render nothing in the meantime
  if (!session) return null;

  // Role checks — render nothing while redirect is in flight
  if (enforceDashboard && role === 'customer') return null;
  if (enforceAccount && role !== 'customer') return null;
  if (roles && role && !roles.includes(role)) return null;

  return <Outlet />;
}

/** Redirects already-authenticated users away from /login */
export function PublicOnlyGuard() {
  const { session, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate(getRedirectPathByRole(role), { replace: true });
    }
  }, [session, role, isLoading, navigate]);

  if (isLoading) return <AuthLoader />;
  return <Outlet />;
}

/** Legacy passthrough — kept for backward compat */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}