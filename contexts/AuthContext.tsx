import React, { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  GUEST_MODE: 'investfiis_guest_mode',
  PASSCODE: 'investfiis_passcode',
  BIOMETRICS: 'investfiis_biometrics'
};

interface AuthContextType {
  session: Session | null;
  isAuthLoading: boolean;
  isGuest: boolean;
  setAsGuest: () => void;
  signOut: () => Promise<void>;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  savedPasscode: string | null;
  isBiometricsEnabled: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true');
  
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem(STORAGE_KEYS.PASSCODE));
  const savedPasscode = localStorage.getItem(STORAGE_KEYS.PASSCODE);
  const isBiometricsEnabled = localStorage.getItem(STORAGE_KEYS.BIOMETRICS) === 'true';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setIsGuest(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GUEST_MODE, String(isGuest));
  }, [isGuest]);

  const setAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setIsGuest(false);
    window.location.reload();
  };

  const value = {
    session,
    isAuthLoading,
    isGuest,
    setAsGuest,
    signOut,
    isLocked,
    setIsLocked,
    savedPasscode,
    isBiometricsEnabled
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};