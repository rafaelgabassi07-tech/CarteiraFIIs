
import { createClient } from '@supabase/supabase-js';

// As credenciais agora são lidas do ambiente, tornando o app seguro e configurável.
// O usuário DEVE configurar essas variáveis no ambiente de produção (Vercel).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Credenciais do Supabase não configuradas no ambiente. Verifique SUPABASE_URL e SUPABASE_KEY.");
}

// Configuração com persistência de sessão explícita para garantir
// que o token JWT (auth.uid) esteja sempre disponível para as políticas RLS.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});