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

/** Protects dashboard routes — redirects unauthenticated users to /login */
export function AuthGuard({ roles }: { roles?: string[] } = {}) {
  const { session, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    } else if (roles && role && !roles.includes(role)) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, role, isLoading, navigate, location.pathname, roles]);

  if (isLoading) return <AuthLoader />;
  if (!session) return null;
  return <Outlet />;
}

/** Redirects already-logged-in users away from /login */
export function PublicOnlyGuard() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, isLoading, navigate]);

  if (isLoading) return <AuthLoader />;
  return <Outlet />;
}

/** Legacy passthrough — kept for backward compat */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
