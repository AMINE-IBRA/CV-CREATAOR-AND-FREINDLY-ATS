import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError, SESSION_EXPIRED_EVENT } from '../lib/api';
import type { User } from '../types/resume';

export type Theme = 'light' | 'dark' | 'system';
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  localStorage.setItem('cv_theme', theme);
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionError: string | null;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  updateUser: (user: User) => void;
}
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const version = useRef(0);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    const theme = (updated as User & { theme?: Theme }).theme;
    if (theme) applyTheme(theme);
  }, []);
  const clearSession = useCallback(() => {
    version.current++;
    setUser(null);
    setSessionError(null);
    setIsLoading(false);
  }, []);
  const refreshSession = useCallback(async () => {
    const current = ++version.current;
    setIsLoading(true);
    setSessionError(null);
    try {
      const { user: restored } = await api.get<{ user: User }>('/auth/me');
      if (current === version.current) updateUser(restored);
    } catch (error) {
      if (current !== version.current) return;
      if (error instanceof ApiError && error.status === 401) setUser(null);
      else setSessionError(error instanceof Error ? error.message : 'Unable to verify your session.');
    } finally {
      if (current === version.current) setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    localStorage.removeItem('auth_token');
    const saved = localStorage.getItem('cv_theme');
    applyTheme(saved === 'light' || saved === 'dark' ? saved : 'system');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => { if (localStorage.getItem('cv_theme') === 'system') applyTheme('system'); };
    media.addEventListener('change', followSystem);
    window.addEventListener(SESSION_EXPIRED_EVENT, clearSession);
    void refreshSession();
    return () => {
      version.current++;
      media.removeEventListener('change', followSystem);
      window.removeEventListener(SESSION_EXPIRED_EVENT, clearSession);
    };
  }, [clearSession, refreshSession]);

  async function login(email: string, password: string) {
    const { user: loggedIn } = await api.post<{ user: User }>('/auth/login', { email: email.trim(), password });
    version.current++;
    setSessionError(null);
    updateUser(loggedIn);
    setIsLoading(false);
  }
  async function register(name: string, email: string, password: string) {
    const { user: registered } = await api.post<{ user: User }>('/auth/register', { name: name.trim(), email: email.trim(), password });
    version.current++;
    setSessionError(null);
    updateUser(registered);
    setIsLoading(false);
  }
  async function logout() {
    await api.post('/auth/logout');
    clearSession();
  }
  return <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, sessionError, refreshSession, login, register, logout, clearSession, updateUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
