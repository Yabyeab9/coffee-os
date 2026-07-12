import React, { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

function AuthLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

/** Protects dashboard/account routes — redirects unauthenticated users to /login */
export function AuthGuard({ roles }: { roles?: string[] } = {}) {
  const { session, role, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    const currentRole = role || profile?.role;

    if (!session) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    } else if (roles && currentRole && !roles.includes(currentRole)) {
      // FIX: If a customer hits an admin route, send them to /account instead of /dashboard
      const dest = currentRole === 'customer' ? '/account' : '/dashboard';
      navigate(dest, { replace: true });
    }
  }, [session, role, profile, isLoading, navigate, location.pathname, roles]);

  if (isLoading) return <AuthLoader />;
  if (!session) return null;
  return <Outlet />;
}

/** Redirects already-logged-in users away from /login based on their role */
export function PublicOnlyGuard() {
  const { session, role, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      const currentRole = role || profile?.role;
      
      // CRITICAL: If session exists but role hasn't arrived in state yet, 
      // wait for it so we don't accidentally send a customer to /dashboard
      if (!currentRole) return; 

      const dest = currentRole === 'customer' ? '/account' : '/dashboard';
      navigate(dest, { replace: true });
    }
  }, [session, role, profile, isLoading, navigate]);

  // Show loader if auth is working OR if we have a session but are waiting on the role string
  if (isLoading || (session && !(role || profile?.role))) {
    return <AuthLoader />;
  }
  
  return <Outlet />;
}

/** Legacy passthrough — kept for backward compat */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}