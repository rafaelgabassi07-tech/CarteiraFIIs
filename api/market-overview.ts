
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "API Key not configured" });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Prompt específico para forçar o uso de dados recentes e formato estrito
        const prompt = `
            ATUE COMO UM ANALISTA DE MERCADO FINANCEIRO B3 (BRASIL).
            
            TAREFA:
            Use o Google Search para encontrar os dados de mercado MAIS RECENTES DE HOJE (cotações, altas, baixas).
            
            1. Encontre as 3 Ações do Ibovespa com MAIOR ALTA percentual hoje (Gainers).
            2. Encontre as 3 Ações do Ibovespa com MAIOR BAIXA percentual hoje (Losers).
            3. Encontre 3 Fundos Imobiliários (FIIs) que sejam boas oportunidades (P/VP < 1.0 e DY anual > 9%).
            
            SAÍDA OBRIGATÓRIA (JSON):
            Retorne APENAS um objeto JSON válido. Não use Markdown. Não explique nada.
            Siga estritamente esta estrutura:
            {
                "gainers": [
                    { "ticker": "PETR4", "name": "Petrobras", "price": 40.50, "change": 2.5, "assetType": "STOCK", "type": "gain", "description": "Motivo resumido da alta" }
                ],
                "losers": [
                    { "ticker": "VALE3", "name": "Vale", "price": 60.20, "change": -1.2, "assetType": "STOCK", "type": "loss", "description": "Motivo resumido da baixa" }
                ],
                "opportunities": [
                    { "ticker": "MXRF11", "name": "Maxi Renda", "price": 10.50, "change": 0, "assetType": "FII", "type": "opportunity", "description": "Indicadores chave (P/VP, DY)" }
                ]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2, // Baixa temperatura para dados mais factuais
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // 1. Extração de Fontes (Grounding Metadata) - Adicionada tipagem explícita
        const sources: { title: string; uri: string }[] = [];
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                    sources.push({ title: chunk.web.title, uri: chunk.web.uri });
                }
            });
        }

        // 2. Limpeza e Parse do JSON
        let rawText = response.text || '{}';
        
        // Remove blocos de código markdown se existirem
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Encontra o primeiro '{' e o último '}' para isolar o JSON
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
            throw new Error("O modelo retornou dados mal formatados.");
        }

        // 3. Normalização dos Dados
        const normalize = (arr: any[], defaultType: string, defaultAsset: string) => {
            if (!Array.isArray(arr)) return [];
            return arr.slice(0, 3).map(item => ({
                ticker: item.ticker?.toUpperCase() || 'N/A',
                name: item.name || item.ticker,
                price: typeof item.price === 'string' ? parseFloat(item.price.replace(',', '.')) : (item.price || 0),
                change: typeof item.change === 'string' ? parseFloat(item.change.replace(',', '.')) : (item.change || 0),
                assetType: item.assetType || defaultAsset,
                type: defaultType,
                description: item.description || ''
            }));
        };

        const result = {
            gainers: normalize(data.gainers, 'gain', 'STOCK'),
            losers: normalize(data.losers, 'loss', 'STOCK'),
            opportunities: normalize(data.opportunities, 'opportunity', 'FII'),
            lastUpdate: Date.now(),
            sources: sources.slice(0, 3) // Limita a 3 fontes para não poluir a UI
        };

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Market Overview Fatal Error:', error);
        
        // Retorna erro estruturado para a UI lidar (Botão Tentar Novamente)
        return res.status(200).json({
            error: true,
            message: "Não foi possível analisar o mercado no momento.",
            details: error.message,
            gainers: [], losers: [], opportunities: [], lastUpdate: Date.now()
        });
    }
}
