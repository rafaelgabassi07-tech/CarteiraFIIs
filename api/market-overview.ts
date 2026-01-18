
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const prompt = `
            Você é um analista de mercado B3. Pesquise dados de HOJE.
            
            1. Encontre 4 maiores ALTAS do IBOV hoje.
            2. Encontre 4 maiores BAIXAS do IBOV hoje.
            3. Encontre 4 FIIs descontados (P/VP < 1, DY > 9%).
            
            Preencha os campos estritamente.
        `;

        // Definição do Schema para garantir JSON perfeito
        const marketAssetSchema = {
            type: Type.OBJECT,
            properties: {
                ticker: { type: Type.STRING },
                name: { type: Type.STRING },
                price: { type: Type.NUMBER },
                change: { type: Type.NUMBER },
                assetType: { type: Type.STRING, enum: ["STOCK", "FII"] },
                type: { type: Type.STRING, enum: ["gain", "loss", "opportunity"] },
                description: { type: Type.STRING }
            },
            required: ["ticker", "price", "change", "type", "assetType"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        gainers: { type: Type.ARRAY, items: marketAssetSchema },
                        losers: { type: Type.ARRAY, items: marketAssetSchema },
                        opportunities: { type: Type.ARRAY, items: marketAssetSchema }
                    },
                    required: ["gainers", "losers", "opportunities"]
                },
                temperature: 0.1
            }
        });

        let data;
        const rawText = response.text || '{}';
        
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            // Fallback agressivo se o schema falhar (raro com responseSchema)
            const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                data = JSON.parse(cleanText.substring(start, end + 1));
            } else {
                throw new Error("Formato JSON inválido");
            }
        }

        const result = {
            gainers: Array.isArray(data.gainers) ? data.gainers : [],
            losers: Array.isArray(data.losers) ? data.losers : [],
            opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
            lastUpdate: Date.now()
        };

        // Fallback visual caso venha vazio
        if (result.gainers.length === 0) {
            result.gainers.push({ 
                ticker: 'IBOV', 
                name: 'Ibovespa', 
                price: 0, 
                change: 0, 
                assetType: 'STOCK', 
                type: 'gain', 
                description: 'Mercado em análise...' 
            });
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Gemini Market Data Error:', error);
        
        // Retorna estrutura válida mesmo em erro para não quebrar a UI
        return res.status(200).json({
            gainers: [{ ticker: 'OFFLINE', name: 'Serviço Indisponível', price: 0, change: 0, assetType: 'STOCK', type: 'gain', description: 'Tente recarregar' }],
            losers: [],
            opportunities: [],
            lastUpdate: Date.now(),
            error: true
        });
    }
}
