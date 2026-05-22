'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextValue {
  currentUser: string | null;
  login: (name: string) => void;
  logout: () => void;
  logAction: (action: string, details?: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'guddy_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setCurrentUser(stored);
    setHydrated(true);
  }, []);

  const login = useCallback((name: string) => {
    sessionStorage.setItem(SESSION_KEY, name);
    setCurrentUser(name);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  }, []);

  const logAction = useCallback(async (action: string, details?: Record<string, unknown>) => {
    const user = sessionStorage.getItem(SESSION_KEY) ?? 'Unknown';
    try {
      await supabase.from('audit_log').insert({
        staff_name: user,
        action,
        details: details ?? null,
      });
    } catch {
      // Silent fail — audit logging should never break the app
    }
  }, []);

  // Don't render until hydrated to avoid SSR mismatch
  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, logAction }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
