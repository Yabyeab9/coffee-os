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
export function AuthGuard({ roles, enforceDashboard, enforceAccount }: { roles?: string[]; enforceDashboard?: boolean; enforceAccount?: boolean } = {}) {
  const { session, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }
    
    // Redirect customers away from dashboard
    if (enforceDashboard && role === 'customer') {
      navigate('/account', { replace: true });
      return;
    }

    // Redirect admins away from customer account? Actually maybe admins shouldn't use /account, but let's just make sure customers stay out of dashboard.
    if (enforceAccount && role !== 'customer') {
      // If we want admins out of account, uncomment:
      // navigate('/dashboard', { replace: true });
    }

    if (roles && role && !roles.includes(role)) {
      navigate(role === 'customer' ? '/account' : '/dashboard', { replace: true });
    }
  }, [session, role, isLoading, navigate, location.pathname, roles, enforceDashboard, enforceAccount]);

  if (isLoading) return <AuthLoader />;
  if (!session) return null;
  
  // Extra safety render check
  if (enforceDashboard && role === 'customer') return null;

  return <Outlet />;
}

/** Redirects already-logged-in users away from /login */
export function PublicOnlyGuard() {
  const { session, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session) {
      navigate(role === 'customer' ? '/account' : '/dashboard', { replace: true });
    }
  }, [session, role, isLoading, navigate]);

  if (isLoading) return <AuthLoader />;
  return <Outlet />;
}

/** Legacy passthrough — kept for backward compat */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
