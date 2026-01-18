
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // Responde imediatamente a requisições OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verifica se a chave existe no ambiente
  if (!process.env.API_KEY) {
      return res.status(500).json({ 
          status: 'error', 
          message: 'API Key não configurada nas variáveis de ambiente da Vercel.' 
      });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Realiza um teste muito leve (apenas 1 token) para validar a chave e o modelo
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Ping',
        config: { 
            maxOutputTokens: 1,
            temperature: 0
        }
    });
    
    // Se chegou aqui, a chave é válida e o serviço está online
    return res.status(200).json({ 
        status: 'ok', 
        message: 'Gemini Operacional',
        timestamp: Date.now()
    });

  } catch (error: any) {
    console.error("Health Check Failed:", error);
    
    // Retorna erro detalhado para ajudar no debug
    return res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Falha na conexão com Gemini API' 
    });
  }
}
