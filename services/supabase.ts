
import { createClient } from '@supabase/supabase-js';

// Credenciais fornecidas
const SUPABASE_URL = 'https://xwzmqhlleumgzaxwmbhk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_X_PJxb1Wk5Gg6wqgiWsOKA_aYtl2uV-';

// Configuração com persistência de sessão explícita para garantir
// que o token JWT (auth.uid) esteja sempre disponível para as políticas RLS.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});