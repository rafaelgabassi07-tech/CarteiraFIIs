import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid items payload' });
    }

    // Limit to 20 items to avoid timeout/quota issues
    const itemsToAnalyze = items.slice(0, 20);

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY missing');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
            Analyze the following financial news items and determine their sentiment and impact.
            
            For each item, provide:
            - sentiment: "positive", "negative", or "neutral"
            - impact: "high", "normal", or "risk"
            
            Strictly follow these rules:
            - "risk" impact is for news about bankruptcy, fraud, investigations, debt default, or severe crises.
            - "high" impact is for major earnings surprises, mergers/acquisitions, significant macro events (Selic/Fed), or large market moves.
            - "normal" impact is for routine news, daily fluctuations, or minor updates.
            
            Input JSON:
            ${JSON.stringify(itemsToAnalyze.map((item: any) => ({ id: item.id, title: item.title, summary: item.summary })))}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                            impact: { type: Type.STRING, enum: ["high", "normal", "risk"] }
                        },
                        required: ["id", "sentiment", "impact"]
                    }
                }
            }
        });

        const analysis = JSON.parse(response.text || "[]");
        return res.status(200).json(analysis);

    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        return res.status(500).json({ error: 'Failed to analyze news', details: error.message });
    }
}
