import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { LogoutReason } from '../auth/AuthContext';

interface LocationState {
  from?: string;
  reason?: LogoutReason | null;
}

function getLogoutMessage(reason: LogoutReason | null | undefined): string | null {
  if (!reason || reason === 'manual') {
    return null;
  }

  if (reason === 'idle') {
    return 'You were signed out after 15 minutes of inactivity.';
  }

  if (reason === 'forbidden') {
    return 'Your account no longer has permission to access admin routes.';
  }

  if (reason === 'signed_out_elsewhere') {
    return 'This admin session was signed out in another tab.';
  }

  return 'Your admin session expired. Please sign in again.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status, error, logoutReason, clearLogoutReason } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromPath = (location.state as LocationState | null)?.from ?? '/content';
  const locationReason = (location.state as LocationState | null)?.reason;
  const logoutMessage = getLogoutMessage(locationReason ?? logoutReason);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      clearLogoutReason();
      await login(email, password);
      navigate(fromPath, { replace: true });
    } catch {
      // Error message is handled by auth context.
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'authenticated') {
    return <Navigate to="/content" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Alpha Bucks</p>
        <h1>Admin Sign In</h1>
        <p className="muted">
          Sign in with an account that has <code>admin</code> or{' '}
          <code>super_admin</code> role.
        </p>
        {logoutMessage ? <p className="notice-text">{logoutMessage}</p> : null}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
