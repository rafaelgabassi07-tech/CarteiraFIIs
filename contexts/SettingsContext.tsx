import React, { createContext, useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';

const STORAGE_KEYS = {
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  PUSH_ENABLED: 'investfiis_push_enabled',
  GLASS_MODE: 'investfiis_glass_mode',
  BLUR_INTENSITY: 'investfiis_blur_intensity',
};

interface SettingsContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  privacyMode: boolean;
  setPrivacyMode: (enabled: boolean) => void;
  pushEnabled: boolean;
  setPushEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  glassMode: boolean;
  setGlassMode: (enabled: boolean) => void;
  blurIntensity: 'low' | 'medium' | 'high';
  setBlurIntensity: (intensity: 'low' | 'medium' | 'high') => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem(STORAGE_KEYS.GLASS_MODE) !== 'false');
  const [blurIntensity, setBlurIntensity] = useState<'low' | 'medium' | 'high'>(() => (localStorage.getItem(STORAGE_KEYS.BLUR_INTENSITY) as any) || 'medium');

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-accent', accentColor);
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--color-accent-rgb', `${r} ${g} ${b}`);
    localStorage.setItem(STORAGE_KEYS.ACCENT, accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.body.classList.toggle('privacy-blur', privacyMode);
    localStorage.setItem(STORAGE_KEYS.PRIVACY, String(privacyMode));
  }, [privacyMode]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled));
  }, [pushEnabled]);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GLASS_MODE, String(glassMode));
    document.documentElement.classList.toggle('glass-effect', glassMode);
  }, [glassMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BLUR_INTENSITY, blurIntensity);
    const blurMap = { low: '4px', medium: '8px', high: '16px' };
    document.documentElement.style.setProperty('--blur-amount', blurMap[blurIntensity]);
  }, [blurIntensity]);
  
  const value = { theme, setTheme, accentColor, setAccentColor, privacyMode, setPrivacyMode, pushEnabled, setPushEnabled, glassMode, setGlassMode, blurIntensity, setBlurIntensity };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};