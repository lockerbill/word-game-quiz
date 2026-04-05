import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../auth/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { status, session, logoutReason, logout } = useAuth();
  const hasAdminRole =
    session?.role === 'admin' || session?.role === 'super_admin';

  useEffect(() => {
    if (status === 'authenticated' && !hasAdminRole) {
      logout('forbidden');
    }
  }, [hasAdminRole, logout, status]);

  if (status === 'checking') {
    return <div className="centered-state">Checking admin session...</div>;
  }

  if (status === 'unauthenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`;
    const reason = logoutReason === 'manual' ? null : logoutReason;

    return <Navigate to="/login" replace state={{ from, reason }} />;
  }

  if (!hasAdminRole) {
    return <div className="centered-state">Checking admin permissions...</div>;
  }

  return <>{children}</>;
}
