
import { createClient } from '@supabase/supabase-js';

// Função segura para obter variáveis de ambiente em diferentes contextos (Vercel, Local, Vite)
const getEnv = (key: string, viteKey: string) => {
    // 1. Tenta via Vite (import.meta.env)
    const viteVal = (import.meta as any).env?.[viteKey];
    if (viteVal) return viteVal;

    // 2. Tenta via process.env (substituído pelo Vite define em build time)
    try {
        return process.env[key];
    } catch {
        return undefined;
    }
};

const SUPABASE_URL = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL') || '';
const SUPABASE_KEY = getEnv('SUPABASE_KEY', 'VITE_SUPABASE_KEY') || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase credentials missing. App will likely fail during auth/sync.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
