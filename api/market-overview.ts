
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Função utilitária para extrair JSON de texto misto (com markdown ou citações)
function extractJson(text: string) {
    if (!text) return null;
    try {
        // Tenta parse direto
        return JSON.parse(text);
    } catch (e) {
        // Tenta limpar blocos de código
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Tenta encontrar o objeto JSON principal
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        
        if (start !== -1 && end !== -1) {
            try {
                return JSON.parse(clean.substring(start, end + 1));
            } catch (e2) {
                console.error("Falha ao extrair JSON substring:", clean.substring(start, end + 1));
            }
        }
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    // Default Cache: 15 min na CDN, update em background
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=600');
    
    // Timeout reduzido para 15s para evitar 504 do Vercel (Hobby Tier limit ~10s, Pro ~60s)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de processamento (15s)")), 15000)
    );

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const systemInstruction = `
            ATUE COMO UM AGREGADOR DE DADOS FINANCEIROS B3 (BRASIL).
            
            TAREFA ÚNICA:
            Faça uma busca no Google AGORA e retorne um resumo do mercado de hoje em JSON.
            
            RETORNE APENAS ESTE JSON (Sem markdown, sem texto extra):
            {
              "market_status": "Aberto" | "Fechado",
              "last_update": "HH:mm",
              "highlights": {
                "discounted_fiis": [ { "ticker": "AAAA11", "name": "Nome", "price": 0.0, "p_vp": 0.0, "dy_12m": 0.0 } ], // Top 3 FIIs descontados
                "discounted_stocks": [ { "ticker": "AAAA3", "name": "Nome", "price": 0.0, "p_l": 0.0, "p_vp": 0.0 } ], // Top 3 Ações baratas
                "top_gainers": [ { "ticker": "AAAA3", "variation_percent": 0.0, "price": 0.0 } ], // Top 3 Altas IBOV hoje
                "top_losers": [ { "ticker": "AAAA3", "variation_percent": -0.0, "price": 0.0 } ], // Top 3 Baixas IBOV hoje
                "high_dividend_yield": [ { "ticker": "AAAA11", "type": "FII", "dy_12m": 0.0, "last_dividend": 0.0 } ] // Top 3 DY
              }
            }
        `;

        const generationPromise = ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Resumo de mercado B3 agora.",
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
                temperature: 0.1,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Race entre a geração e o timeout
        const response: any = await Promise.race([generationPromise, timeoutPromise]);

        // 1. Extração de Fontes
        const sources: { title: string; uri: string }[] = [];
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                    sources.push({ title: chunk.web.title, uri: chunk.web.uri });
                }
            });
        }

        // 2. Parse do JSON
        const rawText = response.text || '{}';
        const data = extractJson(rawText);

        if (!data) {
            console.error("Falha Parse JSON:", rawText);
            throw new Error("IA retornou formato inválido.");
        }

        // Adiciona as fontes ao objeto de resposta
        data.sources = sources.slice(0, 5);

        return res.status(200).json(data);

    } catch (error: any) {
        console.error('Market Overview Error:', error);
        
        // IMPORTANTE: Remove cache em caso de erro para não persistir o estado de falha
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        
        const isQuotaError = error.message?.includes('429') || error.status === 429;
        
        // Retorna 200 com flag de erro para que o frontend receba o JSON e exiba a mensagem amigável
        return res.status(200).json({
            market_status: 'Indisponível',
            last_update: new Date().toLocaleString('pt-BR'),
            highlights: {
                discounted_fiis: [],
                discounted_stocks: [],
                top_gainers: [],
                top_losers: [],
                high_dividend_yield: []
            },
            sources: [],
            error: true,
            message: isQuotaError ? "Muitas requisições. Tente em 1 min." : (error.message || "Erro ao conectar com Gemini.")
        });
    }
}
