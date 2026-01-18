
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
    
    // Timeout handling wrapper para Vercel
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de processamento (25s)")), 25000)
    );

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const systemInstruction = `
            Você é um API Backend Financeiro.
            Sua tarefa é buscar dados AGORA no Google e retornar JSON PURO.
            
            REGRAS ESTRITAS:
            1. NÃO use Markdown.
            2. NÃO inclua explicações.
            3. NÃO inclua citações no JSON (ex: [1]).
            4. Se faltar dado, use 0 ou null.
            
            DADOS A BUSCAR (HOJE):
            - 3 FIIs com P/VP < 0.95 e DY > 9% (discounted_fiis)
            - 3 Ações Blue Chips baratas (P/L baixo) (discounted_stocks)
            - 3 Maiores Altas do Ibovespa HOJE (top_gainers)
            - 3 Maiores Baixas do Ibovespa HOJE (top_losers)
            - 3 Ativos com alto DY (high_dividend_yield)

            SCHEMA DE RESPOSTA:
            {
              "market_status": "Aberto" ou "Fechado",
              "last_update": "HH:mm DD/MM",
              "highlights": {
                "discounted_fiis": [{ "ticker": "XPLG11", "name": "XP Log", "price": 100.50, "p_vp": 0.90, "dy_12m": 9.5 }],
                "discounted_stocks": [{ "ticker": "BBAS3", "name": "Banco do Brasil", "price": 27.00, "p_l": 4.5, "p_vp": 0.8 }],
                "top_gainers": [{ "ticker": "PETR4", "variation_percent": 2.5, "price": 40.00 }],
                "top_losers": [{ "ticker": "VALE3", "variation_percent": -1.2, "price": 60.00 }],
                "high_dividend_yield": [{ "ticker": "VGIP11", "type": "FII", "dy_12m": 14.0, "last_dividend": 0.80 }]
              }
            }
        `;

        const generationPromise = ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Gere o JSON de mercado agora.",
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
                temperature: 0.1,
                // Removido responseMimeType para evitar conflito com Google Search tools
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
        
        // Estrutura de fallback para a UI não quebrar completamente
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
            message: error.message || "Erro ao conectar com Gemini."
        });
    }
}
