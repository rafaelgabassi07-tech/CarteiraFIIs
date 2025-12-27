
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  sources?: { web: { uri: string; title: string } }[];
}

export const fetchUnifiedMarketData = async (tickers: string[]): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');
  const today = new Date().toISOString().split('T')[0];

  // Prompt Otimizado com Search Grounding
  const prompt = `
    Data de Hoje: ${today}.
    Investigue os seguintes ativos na B3: ${tickerListString}.
    
    PARA CADA ATIVO, extraia dados RECENTES usando o Google Search:

    1. **Dados Fundamentalistas (Latest):**
       - Preço/Valor Patrimonial (P/VP) (Número).
       - Preço/Lucro (P/L) (Número, null se for FII).
       - Dividend Yield 12 Meses (DY) (Número %, ex: 10.5).
       - Liquidez Diária Média (Texto formatado, ex: "R$ 5 M").
       - Número de Cotistas/Acionistas (Texto formatado).
       - Descrição curta do negócio (Max 120 chars).
       - Segmento de atuação.
       - Tipo: "FII" ou "ACAO".

    2. **Proventos (Últimos 12 Meses):**
       - Liste TODOS os dividendos e JCP com "Data Com", "Data Pagamento" e "Valor".
       - Importante: Datas no formato YYYY-MM-DD.

    3. **Notícias & Sentimento:**
       - 2 notícias recentes (Título, Fonte, Data, Link).
       - Sentimento geral (Otimista, Neutro, Pessimista) e motivo curto.

    SAÍDA JSON OBRIGATÓRIA (Sem Markdown):
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII/ACAO",
          "f": {
             "pvp": 0.00,
             "pl": 0.00,
             "dy": 0.00,
             "liq": "string",
             "cot": "string",
             "desc": "string",
             "sent": "string",
             "sent_why": "string",
             "news": [{ "ti": "Titulo", "src": "Fonte", "dt": "Data", "url": "Link" }]
          },
          "d": [
            { "ty": "DIV/JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.00 }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Você é uma API JSON estrita de dados financeiros da B3. Nunca use Markdown. Retorne apenas JSON válido.",
        temperature: 0.1, // Reduz alucinações
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    // Limpeza de Markdown caso o modelo insista em colocar ```json
    text = text.replace(/```json/g, '').replace(/```/g, '');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.warn("IA não retornou um JSON válido:", text);
        throw new Error("Formato inválido");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.map((chunk: any) => ({
          web: {
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || ''
          }
        })).filter((s: any) => s.web.uri) || []
    };

    const seenDividends = new Set<string>();

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase().trim();
        if (!ticker) return;

        // Parse Fundamentals com tratamento de segurança
        const fundamentals: AssetFundamentals = {
            p_vp: typeof asset.f?.pvp === 'number' ? asset.f.pvp : undefined,
            p_l: typeof asset.f?.pl === 'number' ? asset.f.pl : undefined,
            dy_12m: typeof asset.f?.dy === 'number' ? asset.f.dy : undefined,
            liquidity: asset.f?.liq || 'N/A',
            shareholders: asset.f?.cot || 'N/A',
            description: asset.f?.desc || '',
            sentiment: asset.f?.sent || 'Neutro',
            sentiment_reason: asset.f?.sent_why || '',
            news: Array.isArray(asset.f?.news) ? asset.f.news.map((n: any) => ({
                title: n.ti || 'Notícia',
                source: n.src || 'Web',
                date: n.dt || '',
                url: n.url || '#'
            })) : []
        };

        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK,
          fundamentals: fundamentals
        };

        if (Array.isArray(asset.d)) {
            asset.d.forEach((div: any) => {
                // Validação rigorosa de datas e valores
                if (!div.dc || !div.v || isNaN(Number(div.v))) return;
                
                const uniqueKey = `${ticker}-${div.dc}-${div.v}`.replace(/\s+/g, '');
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);

                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
                    ticker,
                    type: type,
                    dateCom: div.dc,
                    paymentDate: div.dp || div.dc, // Fallback para data com se pagamento não existir
                    rate: Number(div.v),
                    quantityOwned: 0,
                    totalReceived: 0
                });
            });
        }
      });
    }

    return result;
  } catch (error: any) {
    console.error("Erro Crítico Gemini:", error);
    return { dividends: [], metadata: {} };
  }
};
