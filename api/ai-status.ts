
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Endpoint modificado para retornar status OK estático sem chamar o Gemini
  // Isso economiza requisições na cota da API.
  
  return res.status(200).json({ 
      status: 'ok', 
      message: 'Monitoramento de IA desativado (Economia de Quota)',
      latency: 0,
      timestamp: Date.now()
  });
}
