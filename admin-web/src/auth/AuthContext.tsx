import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AxiosError } from 'axios';
import { getAdminSessionApi, loginApi } from '../api/adminAuthApi';
import {
  ADMIN_TOKEN_KEY,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from './tokenStorage';
import type { AdminSession } from '../types/admin';
import {
  subscribeAuthFailure,
  type AuthFailureReason,
} from './sessionEvents';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
export type LogoutReason =
  | 'manual'
  | 'idle'
  | 'expired'
  | 'forbidden'
  | 'signed_out_elsewhere';

export interface AuthContextValue {
  status: AuthStatus;
  session: AdminSession | null;
  error: string | null;
  logoutReason: LogoutReason | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (reason?: LogoutReason) => void;
  clearLogoutReason: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

const defaultIdleTimeoutMs = 15 * 60 * 1000;
const idleTimeoutMs = Number.parseInt(
  import.meta.env.VITE_ADMIN_IDLE_TIMEOUT_MS ?? `${defaultIdleTimeoutMs}`,
  10,
);

const activityEvents: Array<keyof WindowEventMap> = [
  'mousemove',
  'keydown',
  'scroll',
  'click',
  'touchstart',
];

function mapAuthFailureReason(reason: AuthFailureReason): LogoutReason {
  if (reason === 'forbidden') {
    return 'forbidden';
  }

  return 'expired';
}

function toAuthErrorMessage(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return 'Unable to complete sign-in right now.';
  }

  const status = error.response?.status;
  if (status === 401) {
    return 'Invalid email or password.';
  }
  if (status === 403) {
    return 'This account does not have admin access.';
  }

  return 'Unable to complete sign-in right now.';
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(null);
  const lastActivityAtRef = useRef<number>(0);

  const clearLogoutReason = useCallback(() => {
    setLogoutReason(null);
  }, []);

  const logout = useCallback((reason: LogoutReason = 'manual') => {
    clearAdminToken();
    setSession(null);
    setStatus('unauthenticated');
    setError(null);
    setLogoutReason(reason);
  }, []);

  const restoreSession = useCallback(async () => {
    const existingToken = getAdminToken();
    if (!existingToken) {
      setStatus('unauthenticated');
      setSession(null);
      setError(null);
      return;
    }

    try {
      const me = await getAdminSessionApi();
      setSession(me);
      setStatus('authenticated');
      setError(null);
      setLogoutReason(null);
      lastActivityAtRef.current = Date.now();
    } catch {
      logout('expired');
    }
  }, [logout]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLogoutReason(null);
      const response = await loginApi(email, password);
      setAdminToken(response.access_token);

      const me = await getAdminSessionApi();
      setSession(me);
      setStatus('authenticated');
      lastActivityAtRef.current = Date.now();
    } catch (error) {
      clearAdminToken();
      setSession(null);
      setStatus('unauthenticated');
      setError(toAuthErrorMessage(error));
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthFailure((reason) => {
      logout(mapAuthFailureReason(reason));
    });

    return unsubscribe;
  }, [logout]);

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== ADMIN_TOKEN_KEY) {
        return;
      }

      const hasToken = Boolean(event.newValue);
      if (!hasToken && status === 'authenticated') {
        logout('signed_out_elsewhere');
      }

      if (hasToken && status === 'unauthenticated') {
        void restoreSession();
      }
    }

    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [logout, restoreSession, status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    const updateActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, updateActivity, { passive: true });
    });

    const idleInterval = window.setInterval(() => {
      const elapsedMs = Date.now() - lastActivityAtRef.current;
      if (elapsedMs >= idleTimeoutMs) {
        logout('idle');
      }
    }, 5_000);

    return () => {
      window.clearInterval(idleInterval);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, updateActivity);
      });
    };
  }, [logout, status]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      error,
      logoutReason,
      login,
      logout,
      clearLogoutReason,
    }),
    [clearLogoutReason, error, login, logout, logoutReason, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
