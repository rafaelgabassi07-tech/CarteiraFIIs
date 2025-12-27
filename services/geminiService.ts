
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

  // Instrução reforçada para retornar JSON com DADOS FUNDAMENTALISTAS + PROVENTOS + NOTÍCIAS
  const prompt = `
    Data de Hoje: ${today}.
    Atue como Analista Financeiro Sênior da B3.
    Use a Google Search para obter dados RECENTES para: ${tickerListString}.
    
    1. Obtenha proventos (dividendos/JCP) dos últimos 12 meses.
    2. Obtenha indicadores fundamentalistas ATUAIS: P/VP, P/L (para ações), DY 12M (Yield anualizado), Liquidez Diária média, Número de Cotistas/Acionistas e uma BREVE descrição do negócio (máx 150 caracteres).
    3. Pesquise 2 ou 3 notícias RECENTES e RELEVANTES sobre o ativo (Título, Fonte, Data e Link).
    4. Baseado nas notícias recentes, defina um SENTIMENTO (Otimista, Neutro ou Pessimista) e uma razão super curta (ex: "Resultado trimestral acima do esperado").

    REGRA DE FORMATAÇÃO OBRIGATÓRIA:
    Responda EXCLUSIVAMENTE um objeto JSON cru.
    
    Formato esperado:
    {
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII ou STOCK",
          "f": {
             "pvp": 0.00 (Number),
             "pl": 0.00 (Number, null se FII),
             "dy": 0.00 (Number, % anual),
             "liq": "R$ X M (String formatada)",
             "cot": "X mil (String formatada)",
             "desc": "Texto curto sobre o ativo.",
             "sent": "Otimista/Neutro/Pessimista",
             "sent_why": "Motivo curto",
             "news": [
                { "ti": "Título", "src": "Fonte", "dt": "Data/Hora", "url": "Link" }
             ]
          },
          "d": [
            {
              "ty": "DIVIDENDO ou JCP",
              "dc": "YYYY-MM-DD",
              "dp": "YYYY-MM-DD",
              "v": 0.00
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

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

        // Parse Fundamentals
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
                if (!div.dc || !div.v) return;
                
                const uniqueKey = `${ticker}-${div.dc}-${div.v}`.replace(/\s+/g, '');
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);

                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
                    ticker,
                    type: type,
                    dateCom: div.dc,
                    paymentDate: div.dp || div.dc,
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
