
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
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
    
    // Teste com o modelo padrão recomendado
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Ping',
        config: { 
            maxOutputTokens: 1,
            temperature: 0
        }
    });
    
    return res.status(200).json({ 
        status: 'ok', 
        message: 'Gemini Operacional',
        timestamp: Date.now()
    });

  } catch (error: any) {
    console.error("Health Check Failed:", error);
    
    // Retorna mensagem de erro detalhada
    return res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Erro desconhecido ao conectar com Gemini API',
        details: error.toString()
    });
  }
}
