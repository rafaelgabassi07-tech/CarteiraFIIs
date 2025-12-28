
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v6.4.2'; // Version bump for model change
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 Horas

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  try {
    const d = new Date(s);
    if (d && !isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return ''; 
};

const normalizeValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  if (typeof val === 'string') {
    let clean = val.replace(/[R$\s]/g, '').trim();
    if (clean.includes(',') && clean.indexOf(',') > clean.length - 4) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
        clean = clean.replace(/,/g, '');
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const tickerKey = tickers.slice().sort().join('|');
  
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ Usando Cache Gemini (V6.4.2)");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Error", e); }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');
  const today = new Date().toISOString().split('T')[0];
  const portfolioStart = startDate || today; 

  const prompt = `
    Hoje é ${today}. Analise estes ativos brasileiros: ${tickerListString}.
    
    Tarefa:
    1. Identifique se é "FII" ou "ACAO" e o segmento.
    2. Fundamentos: P/VP, P/L, DY (12m), Liquidez, Cotistas.
    3. Sentimento de Mercado: Curto/médio prazo (Otimista/Neutro/Pessimista) e motivo curto.
    4. Proventos (Últimos 12 meses): Liste Dividendos e JCP pagos ou anunciados. Importante: "Data Com" define o direito.
    5. IPCA Acumulado desde ${portfolioStart}.

    Retorne APENAS JSON válido:
    {
      "sys": { "ipca": number, "start_ref": "YYYY-MM-DD" },
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII" | "ACAO",
          "f": { "pvp": number, "pl": number, "dy": number, "liq": "string", "cot": "string", "desc": "string", "sent": "string", "sent_why": "string" },
          "d": [ { "ty": "DIV"|"JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": number } ]
        }
      ]
    }
  `;

  try {
    // Usando Gemini 2.5 Flash conforme solicitado
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Você é um API financeira estrita. Retorne apenas JSON puro. Sem markdown. Busque dados reais.",
        temperature: 0.1,
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    
    // Limpeza robusta de markdown caso o modelo alucine
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    const parsed = JSON.parse(jsonStr);
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        indicators: {
            ipca_cumulative: normalizeValue(parsed.sys?.ipca),
            start_date_used: parsed.sys?.start_ref || today
        }
    };

    if (parsed.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase();
        if (!ticker) return;

        // Metadata & Fundamentals
        result.metadata[ticker] = {
            segment: asset.s || 'Outros',
            type: asset.type === 'FII' ? AssetType.FII : AssetType.STOCK,
            fundamentals: {
                p_vp: normalizeValue(asset.f?.pvp),
                p_l: normalizeValue(asset.f?.pl),
                dy_12m: normalizeValue(asset.f?.dy),
                liquidity: asset.f?.liq || '-',
                shareholders: asset.f?.cot || '-',
                description: asset.f?.desc || '',
                sentiment: asset.f?.sent || 'Neutro',
                sentiment_reason: asset.f?.sent_why || ''
            }
        };

        // Dividends
        if (asset.d && Array.isArray(asset.d)) {
            asset.d.forEach((d: any) => {
                const dateCom = normalizeDate(d.dc);
                const paymentDate = normalizeDate(d.dp);
                const rate = normalizeValue(d.v);

                if (dateCom && rate > 0) {
                    result.dividends.push({
                        id: `${ticker}-${dateCom}-${d.ty}-${rate}`,
                        ticker: ticker,
                        type: d.ty || 'DIVIDENDO',
                        dateCom: dateCom,
                        paymentDate: paymentDate || dateCom, // Fallback se não tiver data de pagamento
                        rate: rate,
                        quantityOwned: 0, // Será calculado no App.tsx
                        totalReceived: 0,
                        assetType: asset.type === 'FII' ? AssetType.FII : AssetType.STOCK
                    });
                }
            });
        }
      });
    }

    localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        tickerKey: tickerKey,
        data: result
    }));

    return result;

  } catch (error) {
    console.error("Gemini Error:", error);
    return { dividends: [], metadata: {} };
  }
};
