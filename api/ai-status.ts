
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.API_KEY) {
      console.error("API Key missing in environment");
      return res.status(500).json({ 
          status: 'error', 
          message: 'API Key não configurada no ambiente Vercel.' 
      });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const start = Date.now();
    // Teste com o modelo padrão recomendado
    await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Ping',
        config: { 
            maxOutputTokens: 1,
            temperature: 0
        }
    });
    const duration = Date.now() - start;
    
    return res.status(200).json({ 
        status: 'ok', 
        message: 'Gemini Operacional',
        latency: duration,
        timestamp: Date.now()
    });

  } catch (error: any) {
    console.error("Health Check Failed:", error);
    
    return res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Erro desconhecido ao conectar com Gemini API',
        details: error.toString()
    });
  }
}
