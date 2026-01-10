import { createClient } from '@supabase/supabase-js';

// As credenciais agora são lidas do ambiente, tornando o app seguro e configurável.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Validação em runtime: Se as chaves estiverem vazias, o cliente lançará erro
// apenas quando for utilizado ou inicializado, permitindo que o React carregue
// o ErrorBoundary antes do crash fatal do script.
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