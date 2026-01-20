
import { createClient } from '@supabase/supabase-js';

// Função segura para obter URL e KEY
// O acesso deve ser ESTÁTICO (process.env.NOME) para o Vite conseguir substituir o valor no build.
// Acesso dinâmico (process.env[key]) falha e causa crash no navegador.

const getSupabaseUrl = () => {
    // 1. Vite (dev/build padrão)
    const vite = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (vite) return vite;
    
    // 2. Process Env (Vercel/Define Plugin)
    try {
        return process.env.SUPABASE_URL;
    } catch {
        return '';
    }
};

const getSupabaseKey = () => {
    // 1. Vite (dev/build padrão)
    const vite = (import.meta as any).env?.VITE_SUPABASE_KEY;
    if (vite) return vite;
    
    // 2. Process Env (Vercel/Define Plugin)
    try {
        return process.env.SUPABASE_KEY;
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
