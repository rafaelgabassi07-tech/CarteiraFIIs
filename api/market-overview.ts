
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

function extractJson(text: string) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            try { return JSON.parse(clean.substring(start, end + 1)); } catch (e2) {}
        }
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    // Cache agressivo de 1 hora na CDN e revalidação em background
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.API_KEY) return res.status(500).json({ error: "API Key missing" });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Prompt ultra-simplificado para reduzir tokens e latência
        const prompt = `
            Liste em JSON as 3 melhores oportunidades de FIIs (DY alto, P/VP<1) e 3 Ações (P/L baixo, sólidas) na B3 hoje.
            Inclua um resumo do sentimento do mercado em 3 palavras (Ex: "Otimista", "Cauteloso").
            
            JSON FORMAT:
            {
              "sentiment_summary": "String",
              "last_update": "HH:mm",
              "highlights": {
                "discounted_fiis": [{ "ticker": "AAA11", "name": "Nome", "price": 0.0, "p_vp": 0.0, "dy_12m": 0.0 }],
                "discounted_stocks": [{ "ticker": "AAA3", "name": "Nome", "price": 0.0, "p_l": 0.0, "p_vp": 0.0 }]
              }
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1
            }
        });

        const data = extractJson(response.text || '{}');
        
        // Grounding Metadata
        const sources: { title: string; uri: string }[] = [];
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
             if (c.web?.uri) sources.push({ title: c.web.title || 'Source', uri: c.web.uri });
        });

        if (!data || !data.highlights) throw new Error("Invalid format");
        
        data.sources = sources.slice(0, 3);
        
        return res.status(200).json(data);

    } catch (error: any) {
        console.error('Market API Error:', error);
        // Retorna erro estruturado mas com status 200 para o front tratar sem crashar
        return res.status(200).json({
            error: true,
            message: "Muitas requisições. Tente mais tarde.",
            highlights: { discounted_fiis: [], discounted_stocks: [] }
        });
    }
}
