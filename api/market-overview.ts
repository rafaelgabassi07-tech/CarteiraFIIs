
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

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
            Você é um especialista em mercado financeiro (B3).
            Use o Google Search para encontrar as cotações e variações de HOJE (dados mais recentes possíveis).

            TAREFAS:
            1. Liste as 4 ações do Ibovespa com MAIOR ALTA percentual hoje (Gainers).
            2. Liste as 4 ações do Ibovespa com MAIOR BAIXA percentual hoje (Losers).
            3. Liste 4 Fundos Imobiliários (FIIs) que sejam boas oportunidades (P/VP < 0.98 e DY anual > 9%).

            FORMATO DE RESPOSTA (JSON PURO):
            Retorne APENAS um objeto JSON válido, sem markdown (\`\`\`json), sem comentários.
            Siga estritamente esta estrutura:
            {
                "gainers": [
                    { "ticker": "PETR4", "name": "Petrobras", "price": 40.50, "change": 2.5, "assetType": "STOCK", "type": "gain", "description": "Alta do petróleo no exterior" }
                ],
                "losers": [
                    { "ticker": "VALE3", "name": "Vale", "price": 60.20, "change": -1.2, "assetType": "STOCK", "type": "loss", "description": "Queda do minério" }
                ],
                "opportunities": [
                    { "ticker": "MXRF11", "name": "Maxi Renda", "price": 10.50, "change": 0, "assetType": "FII", "type": "opportunity", "description": "P/VP 0.98 • DY 12%" }
                ]
            }
        `;

        // Removido responseSchema para evitar conflito com Google Search Grounding
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1
            }
        });

        // Limpeza robusta do texto para extrair apenas o JSON
        let rawText = response.text || '{}';
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const startIndex = rawText.indexOf('{');
        const endIndex = rawText.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1) {
            rawText = rawText.substring(startIndex, endIndex + 1);
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error("Falha no parse JSON Gemini:", rawText);
            throw new Error("O modelo não retornou um JSON válido.");
        }

        // Função auxiliar para garantir tipos
        const normalize = (arr: any[], defaultType: string, defaultAsset: string) => {
            if (!Array.isArray(arr)) return [];
            return arr.slice(0, 4).map(item => ({
                ticker: item.ticker?.toUpperCase() || 'N/A',
                name: item.name || item.ticker,
                price: Number(item.price) || 0,
                change: Number(item.change) || 0,
                assetType: item.assetType || defaultAsset,
                type: defaultType,
                description: item.description || ''
            }));
        };

        const result = {
            gainers: normalize(data.gainers, 'gain', 'STOCK'),
            losers: normalize(data.losers, 'loss', 'STOCK'),
            opportunities: normalize(data.opportunities, 'opportunity', 'FII'),
            lastUpdate: Date.now()
        };

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Market Overview Fatal Error:', error);
        
        // Retorna objeto vazio com flag de erro para a UI tratar, em vez de 500
        return res.status(200).json({
            gainers: [],
            losers: [],
            opportunities: [],
            lastUpdate: Date.now(),
            error: true,
            message: "Serviço de inteligência momentaneamente indisponível."
        });
    }
}
