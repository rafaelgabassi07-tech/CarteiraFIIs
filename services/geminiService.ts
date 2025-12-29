
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v6.6.1_pro';
const QUOTA_COOLDOWN_KEY = 'investfiis_quota_cooldown'; // Chave para o Circuit Breaker

// Lógica de Cache Dinâmico para IA
const getAiCacheTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // Fim de semana: 48 horas (economiza tokens)
    // Dia útil: 4 horas (padrão para fundamentos/dividendos)
    return isWeekend ? (48 * 60 * 60 * 1000) : (4 * 60 * 60 * 1000);
};

// --- Parsers Robustos ---

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  
  return ''; 
};

const normalizeValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = String(val).trim();
  str = str.replace(/[^\d.,-]/g, '');

  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
          str = str.replace(/\./g, '').replace(',', '.');
      } else {
          str = str.replace(/,/g, '');
      }
  } 
  else if (str.includes(',')) {
      str = str.replace(',', '.');
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');
  const CACHE_TTL = getAiCacheTTL();

  // 1. Verificação do Circuit Breaker (Cota Excedida Recentemente)
  const cooldown = localStorage.getItem(QUOTA_COOLDOWN_KEY);
  if (cooldown && Date.now() < parseInt(cooldown)) {
      console.warn("🚫 [Gemini] Circuit Breaker Ativo (Cota Excedida). Usando Cache.");
      const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
      if (oldCache) {
          const parsed = JSON.parse(oldCache);
          return { ...parsed.data, error: 'quota_exceeded' };
      }
      return { dividends: [], metadata: {}, error: 'quota_exceeded' };
  }
  
  // 2. Verificação de Cache Padrão
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ [Gemini] Usando Cache Inteligente");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Warning", e); }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const portfolioStart = startDate || `${currentYear}-01-01`; 

  console.log(`🤖 [Gemini] Buscando dados...`);

  const prompt = `
    DATA DE HOJE: ${today}.
    DATA INICIAL DA CARTEIRA: ${portfolioStart}.
    CONTEXTO: App financeiro.
    ATIVOS: ${uniqueTickers.join(', ')}.

    TAREFA:
    1. PROVENTOS (Dividendos/JCP) recentes/futuros.
    2. FUNDAMENTOS.
    3. MACROECONOMIA: IPCA acumulado de ${portfolioStart} até hoje.

    RETORNO JSON OBRIGATÓRIO:
    {
      "sys": { "ipca": number },
      "data": [
        {
          "t": "TICKER",
          "type": "FII" | "ACAO",
          "segment": "Setor",
          "fund": {
            "pvp": number, "pl": number, "dy12": number,
            "liq": "string", "mkcap": "string",
            "sent": "Otimista/Neutro/Pessimista", "reason": "Resumo"
          },
          "divs": [
            { "type": "DIVIDENDO", "datacom": "YYYY-MM-DD", "paydate": "YYYY-MM-DD", "val": number }
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
        systemInstruction: "Retorne apenas JSON válido.",
        temperature: 0.1, 
      }
    });

    let text = response.text;
    if (!text) throw new Error("IA retornou vazio");
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(text);

    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        indicators: {
            ipca_cumulative: normalizeValue(parsed.sys?.ipca || 0),
            start_date_used: portfolioStart
        }
    };

    if (parsed.data && Array.isArray(parsed.data)) {
      parsed.data.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase().trim();
        if (!ticker) return;
        const type = (asset.type === 'FII' || ticker.endsWith('11')) ? AssetType.FII : AssetType.STOCK;
        
        result.metadata[ticker] = {
            segment: asset.segment || (type === AssetType.FII ? 'FII' : 'Ações'),
            type: type,
            fundamentals: {
                p_vp: normalizeValue(asset.fund?.pvp),
                p_l: normalizeValue(asset.fund?.pl),
                dy_12m: normalizeValue(asset.fund?.dy12),
                liquidity: asset.fund?.liq || '-',
                market_cap: asset.fund?.mkcap || '-',
                sentiment: asset.fund?.sent || 'Neutro',
                sentiment_reason: asset.fund?.reason || '-'
            }
        };

        if (asset.divs && Array.isArray(asset.divs)) {
            asset.divs.forEach((d: any) => {
                const val = normalizeValue(d.val);
                const dc = normalizeDate(d.datacom);
                const dp = normalizeDate(d.paydate);
                if (val > 0 && dc) {
                    const uniqueId = `${ticker}-${dc}-${val.toFixed(4)}`;
                    result.dividends.push({
                        id: uniqueId, ticker, type: (d.type || 'DIV').toUpperCase(),
                        dateCom: dc, paymentDate: dp || dc, rate: val,
                        quantityOwned: 0, totalReceived: 0, assetType: type
                    });
                }
            });
        }
      });
    }

    if (result.metadata && Object.keys(result.metadata).length > 0) {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tickerKey: tickerKey,
            data: result
        }));
    }

    return result;

  } catch (error: any) {
    // Tratamento de Erro de Cota (429)
    const errorStr = error.toString().toLowerCase();
    const isQuotaError = errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('too many requests');

    if (isQuotaError) {
        console.error("⚠️ [Gemini] Cota Excedida. Ativando Circuit Breaker (5 min).");
        // Ativa o cooldown por 5 minutos
        localStorage.setItem(QUOTA_COOLDOWN_KEY, (Date.now() + 5 * 60 * 1000).toString());
        
        const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
        if (oldCache) {
            const parsed = JSON.parse(oldCache);
            return { ...parsed.data, error: 'quota_exceeded' };
        }
        return { dividends: [], metadata: {}, error: 'quota_exceeded' };
    }

    console.error("Gemini Error:", error);
    const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
    if (oldCache) return JSON.parse(oldCache).data;
    return { dividends: [], metadata: {} };
  }
};
