// This Edge Function has been deprecated and is no longer used.
// API calls are now made directly from the client-side services (`services/brapiService.ts` and `services/geminiService.ts`).
// This file and the `supabase/functions` directory can be safely removed from the project.
// To remove from your Supabase project, run: `supabase functions delete market-data-proxy`

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ message: "This function is deprecated and no longer in use." }),
    { 
      status: 410, // Gone
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
