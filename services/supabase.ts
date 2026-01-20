import { createClient } from '@supabase/supabase-js';

// Função robusta para obter URL/KEY
const getSupabaseUrl = () => {
    try {
        // 1. Tenta via process.env (Vite Define replacement)
        if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'undefined') return process.env.SUPABASE_URL;
        
        // 2. Tenta via import.meta.env (Vite Nativo)
        if ((import.meta as any).env?.VITE_SUPABASE_URL) return (import.meta as any).env.VITE_SUPABASE_URL;
        
        return '';
    } catch {
        return '';
    }
};

const getSupabaseKey = () => {
    try {
        if (process.env.SUPABASE_KEY && process.env.SUPABASE_KEY !== 'undefined') return process.env.SUPABASE_KEY;
        if ((import.meta as any).env?.VITE_SUPABASE_KEY) return (import.meta as any).env.VITE_SUPABASE_KEY;
        return '';
    } catch {
        return '';
    }
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_KEY = getSupabaseKey();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase credentials missing or invalid. App will likely fail during auth/sync.");
}

// Inicializa o cliente com configurações de resiliência
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});