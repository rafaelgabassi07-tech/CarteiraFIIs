
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// Inicializa o cliente Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Configuração de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Prompt otimizado para busca de dados em tempo real
        const prompt = `
            Atue como um analista de mercado financeiro brasileiro (B3).
            Pesquise dados ATUALIZADOS de HOJE sobre o Ibovespa e IFIX.

            Tarefa 1: Identifique as 4 ações com MAIOR ALTA percentual hoje no Ibovespa.
            Tarefa 2: Identifique as 4 ações com MAIOR BAIXA percentual hoje no Ibovespa.
            Tarefa 3: Identifique 4 Fundos Imobiliários (FIIs) "Oportunidade" que tenham:
                      - P/VP entre 0.80 e 0.98 (descontados)
                      - Dividend Yield (DY) anual acima de 9%
                      - Boa liquidez.

            Retorne APENAS um objeto JSON (sem markdown) seguindo estritamente esta estrutura:
            {
                "gainers": [
                    { "ticker": "ABCD3", "name": "Nome Empresa", "price": 10.50, "change": 5.2, "assetType": "STOCK", "type": "gain", "description": "Alta de 5.2%" }
                ],
                "losers": [
                    { "ticker": "EFGH3", "name": "Nome Empresa", "price": 20.00, "change": -3.1, "assetType": "STOCK", "type": "loss", "description": "Queda de 3.1%" }
                ],
                "opportunities": [
                    { "ticker": "ABCD11", "name": "Nome Fundo", "price": 100.00, "change": 0, "assetType": "FII", "type": "opportunity", "description": "P/VP 0.90 • DY 11%" }
                ]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }], // Ativa busca em tempo real
                responseMimeType: 'application/json',
                temperature: 0.1 // Baixa temperatura para dados factuais
            }
        });

        // Parse e Validação do JSON
        let data;
        const rawText = response.text || '{}';
        
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            // Limpeza de fallback caso venha com markdown ```json
            const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            data = JSON.parse(cleanText);
        }

        // Garante que os arrays existam
        const result = {
            gainers: Array.isArray(data.gainers) ? data.gainers : [],
            losers: Array.isArray(data.losers) ? data.losers : [],
            opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
            lastUpdate: Date.now()
        };

        // Fallback Mock apenas se a IA falhar completamente em trazer dados
        if (result.gainers.length === 0) {
            result.gainers.push({ ticker: 'VALE3', name: 'Vale', price: 0, change: 0, assetType: 'STOCK', type: 'gain', description: 'Dados indisponíveis' });
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Gemini Market Data Error:', error);
        
        // Fallback Gracioso em caso de erro da API (Quota ou Timeout)
        return res.status(200).json({
            gainers: [{ ticker: 'IBOV', name: 'Ibovespa', price: 0, change: 0, assetType: 'STOCK', type: 'gain', description: 'Mercado (Offline)' }],
            losers: [],
            opportunities: [],
            lastUpdate: Date.now(),
            error: true
        });
    }
}
