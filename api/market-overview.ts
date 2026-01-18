
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

        // Prompt otimizado para ser mais direto e rápido
        const prompt = `
            Gere um JSON com dados de mercado do Brasil (B3) de HOJE (ou último fechamento).
            
            1. "gainers": Top 3 ações do Ibovespa com maior alta (Ticker, Nome, Preço, Variação%).
            2. "losers": Top 3 ações do Ibovespa com maior baixa.
            3. "opportunities": 3 FIIs com P/VP < 1.0 e DY > 9%.
            
            Retorne APENAS o JSON. Formato:
            {
                "gainers": [{"ticker": "AAA3", "name": "Nome", "price": 10.0, "change": 5.0, "assetType": "STOCK", "type": "gain"}],
                "losers": [{"ticker": "BBB3", "name": "Nome", "price": 20.0, "change": -5.0, "assetType": "STOCK", "type": "loss"}],
                "opportunities": [{"ticker": "CCC11", "name": "Nome", "price": 100.0, "change": 0, "assetType": "FII", "type": "opportunity"}]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1,
                // Configurações de segurança para evitar bloqueios indevidos em dados financeiros
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            }
        });

        let rawText = response.text || '';
        
        // Limpeza agressiva de Markdown
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        
        if (start !== -1 && end !== -1) {
            rawText = rawText.substring(start, end + 1);
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error("JSON Parse Error:", rawText);
            // Fallback: tentar corrigir JSON mal formatado simples (ex: vírgulas extras)
            try {
                // Tenta remover vírgulas trailing
                const fixedText = rawText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                data = JSON.parse(fixedText);
            } catch (e2) {
                 throw new Error("Falha ao processar resposta do Gemini");
            }
        }

        const normalize = (arr: any[], defaultType: string, defaultAsset: string) => {
            if (!Array.isArray(arr)) return [];
            return arr.slice(0, 4).map(item => ({
                ticker: item.ticker?.toUpperCase() || 'N/A',
                name: item.name || item.ticker,
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                change: typeof item.change === 'number' ? item.change : parseFloat(item.change) || 0,
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

        // Verificação final de dados vazios
        if (result.gainers.length === 0 && result.losers.length === 0) {
            throw new Error("Dados vazios retornados pela IA");
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Market Overview Error:', error);
        
        // Em caso de erro, retorna estrutura de erro para o frontend tratar (mostrar botão de retry)
        return res.status(200).json({
            error: true,
            message: error.message || "Erro ao buscar dados de mercado.",
            gainers: [], losers: [], opportunities: [],
            lastUpdate: Date.now()
        });
    }
}
