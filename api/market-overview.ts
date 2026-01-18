
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
    
    // Timeout ajustado para 25s para acomodar o modelo Pro (mais lento, mas mais inteligente)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de processamento (25s)")), 25000)
    );

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.API_KEY) return res.status(500).json({ error: "API Key missing" });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Prompt ajustado para o modelo Pro
        const prompt = `
            ATUE COMO UM ANALISTA SÊNIOR DE MERCADO (CNPI).
            
            Tarefa:
            1. Pesquise no Google as condições atuais da B3.
            2. Selecione as 3 melhores oportunidades REAIS de FIIs (foco em Renda/DY) e 3 Ações (foco em Valor/PL) do momento.
            3. Resuma o sentimento do mercado em exatamente 3 palavras.
            
            JSON ESTRITO:
            {
              "sentiment_summary": "Otimista/Cautela/Baixa",
              "last_update": "HH:mm",
              "highlights": {
                "discounted_fiis": [{ "ticker": "XXXX11", "name": "Nome", "price": 0.0, "p_vp": 0.0, "dy_12m": 0.0 }],
                "discounted_stocks": [{ "ticker": "XXXX3", "name": "Nome", "price": 0.0, "p_l": 0.0, "p_vp": 0.0 }]
              }
            }
        `;

        const generationPromise = ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Modelo Pro para maior inteligência
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1, // Baixa temperatura para dados factuais
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Race entre a geração e o timeout
        const response: any = await Promise.race([generationPromise, timeoutPromise]);

        const data = extractJson(response.text || '{}');
        
        // Grounding Metadata
        const sources: { title: string; uri: string }[] = [];
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
             if (c.web?.uri) sources.push({ title: c.web.title || 'Source', uri: c.web.uri });
        });

        if (!data || !data.highlights) throw new Error("Formato inválido retornado pela IA");
        
        data.sources = sources.slice(0, 3);
        
        return res.status(200).json(data);

    } catch (error: any) {
        console.error('Market API Error:', error);
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        
        return res.status(200).json({
            error: true,
            message: error.message || "Serviço indisponível.",
            highlights: { discounted_fiis: [], discounted_stocks: [] }
        });
    }
}
