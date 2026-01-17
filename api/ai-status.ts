
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Teste minimalista para verificar chave de API e disponibilidade do modelo
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
        config: {
            maxOutputTokens: 1, // Resposta ultra curta para economizar
            temperature: 0
        }
    });

    return res.status(200).json({ 
        status: 'operational', 
        model: 'gemini-2.5-flash', 
        latency_check: 'ok' 
    });

  } catch (error: any) {
    console.error("Gemini Health Check Failed:", error);
    return res.status(503).json({ 
        status: 'error', 
        message: error.message || 'Service Unavailable' 
    });
  }
}
