
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

        const systemInstruction = `
Você é um Analista de Mercado Financeiro Especialista em B3 (Brasil), integrado a um aplicativo de investimentos. Sua função é buscar dados atualizados da web e estruturá-los estritamente em formato JSON para serem consumidos pelo front-end.

### SUAS FONTES DE DADOS
Você DEVE utilizar a ferramenta 'Google Search' para encontrar as cotações, indicadores e variações mais recentes do dia para Ações e FIIs na B3.

### REGRAS DE NEGÓCIO PARA A PÁGINA "MERCADO"

1.  **Ativos Descontados (Oportunidades):**
    * **FIIs:** Busque fundos com P/VP (Preço sobre Valor Patrimonial) abaixo de 0.95, mas que tenham liquidez média diária acima de R$ 500k.
    * **Ações:** Busque empresas sólidas (Blue Chips ou Mid Caps) com P/L (Preço sobre Lucro) baixo em relação ao histórico ou P/VP descontado.

2.  **Maiores Variações (Do Dia):**
    * Identifique os 5 ativos (Ações ou FIIs) com maior variação positiva (%) no pregão de hoje.
    * Identifique os 5 ativos com maior variação negativa (%).

3.  **Dividendos (Maiores DY):**
    * Liste ativos com Dividend Yield (DY) anualizado (12 meses) superior a 10% (FIIs) ou superior à média do setor (Ações).

### FORMATO DE RESPOSTA OBRIGATÓRIO (JSON)
Não inclua "markdown", crases ou textos introdutórios. Retorne APENAS o objeto JSON seguindo este schema:

{
  "market_status": "Open/Closed",
  "last_update": "DD/MM/YYYY HH:mm",
  "highlights": {
    "discounted_fiis": [
      { "ticker": "ABCD11", "name": "Nome do Fundo", "price": 0.00, "p_vp": 0.00, "dy_12m": 0.00 }
    ],
    "discounted_stocks": [
      { "ticker": "ABCD3", "name": "Nome da Empresa", "price": 0.00, "p_l": 0.00, "p_vp": 0.00 }
    ],
    "top_gainers": [
      { "ticker": "ABCD3", "variation_percent": 0.00, "price": 0.00 }
    ],
    "top_losers": [
      { "ticker": "ABCD3", "variation_percent": -0.00, "price": 0.00 }
    ],
    "high_dividend_yield": [
      { "ticker": "ABCD11", "type": "FII/Ação", "dy_12m": 0.00, "last_dividend": 0.00 }
    ]
  }
}

### TRATAMENTO DE ERROS
Caso não consiga encontrar dados específicos para uma categoria, retorne um array vazio [] naquela chave, mas nunca quebre o formato JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Gere o relatório de mercado agora.",
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
                temperature: 0.1,
                responseMimeType: "application/json",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // 1. Extração de Fontes (Grounding Metadata)
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
        let rawText = response.text || '{}';
        
        // Embora responseMimeType ajude, o modelo ainda pode mandar markdown em alguns casos edge
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
            throw new Error("O modelo retornou dados mal formatados.");
        }

        // Adiciona as fontes ao objeto de resposta
        data.sources = sources.slice(0, 5);

        return res.status(200).json(data);

    } catch (error: any) {
        console.error('Market Overview Fatal Error:', error);
        
        return res.status(200).json({
            market_status: 'Erro',
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
            message: "Não foi possível analisar o mercado no momento."
        });
    }
}
