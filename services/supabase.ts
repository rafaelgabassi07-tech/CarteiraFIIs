
import { createClient } from '@supabase/supabase-js';

// Graças à configuração do 'define' no vite.config.ts, process.env.KEY é substituído
// pelo valor correto (vindo de KEY ou VITE_KEY) em tempo de build.
// Mantemos o fallback para import.meta.env apenas como segurança extra.

const getSupabaseUrl = () => {
    try {
        // Tenta process.env mapeado primeiro, depois fallback direto para VITE_
        return process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || '';
    } catch {
        return '';
    }
};

const getSupabaseKey = () => {
    try {
        return process.env.SUPABASE_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY || '';
    } catch {
        return '';
    }
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_KEY = getSupabaseKey();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Supabase credentials missing. App will likely fail during auth/sync.");
}

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
