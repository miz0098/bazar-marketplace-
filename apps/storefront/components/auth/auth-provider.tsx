'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AuthModal } from '@/components/auth/auth-modal';
import type { IdentityIntent } from '@/services/contracts/identity';

interface AuthModalContextValue {
  openAuth: (intent?: IdentityIntent) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [modal, setModal] = useState<{ open: boolean; intent: IdentityIntent }>({ open: false, intent: 'login' });
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openAuth = useCallback((intent: IdentityIntent = 'login') => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setModal({ open: true, intent });
  }, []);

  const closeAuth = useCallback(() => {
    const returnTarget = returnFocusRef.current;
    setModal((current) => ({ ...current, open: false }));
    returnFocusRef.current = null;
    window.requestAnimationFrame(() => returnTarget?.focus({ preventScroll: true }));
  }, []);

  const value = useMemo(() => ({ openAuth }), [openAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal initialIntent={modal.intent} open={modal.open} onClose={closeAuth} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error('useAuthModal must be used within AuthProvider.');
  return context;
}
