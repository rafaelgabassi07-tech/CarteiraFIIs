import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

// A chave de API agora é lida do ambiente do Vite, injetado no momento da compilação.

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v7.0_proxy'; // Chave de cache mantida
const QUOTA_COOLDOWN_KEY = 'investfiis_quota_cooldown'; // Chave para o Circuit Breaker

const getAiCacheTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    return isWeekend ? (48 * 60 * 60 * 1000) : (4 * 60 * 60 * 1000);
};

// --- Funções Auxiliares de Parsing (movidas da Edge Function) ---
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
  let str = String(val).trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  if (str.includes(',') && str.includes('.')) {
    str = str.lastIndexOf(',') > str.lastIndexOf('.') ? str.replace(/\./g, '').replace(',', '.') : str.replace(/,/g, '');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// --- Esquema de Resposta para a Gemini (movido da Edge Function) ---
const unifiedDataSchema = {
  type: Type.OBJECT,
  properties: {
    sys: {
      type: Type.OBJECT,
      properties: {
        ipca: { type: Type.NUMBER, description: "IPCA acumulado (ex: 4.51 para 4.51%)" }
      }
    },
    data: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          t: { type: Type.STRING, description: "Ticker do ativo" },
          type: { type: Type.STRING, description: "FII ou ACAO" },
          segment: { type: Type.STRING, description: "Segmento de atuação" },
          fund: {
            type: Type.OBJECT,
            properties: {
              pvp: { type: Type.NUMBER, description: "P/VP do ativo" },
              pl: { type: Type.NUMBER, description: "P/L do ativo. Nulo para FIIs." },
              dy: { type: Type.NUMBER, description: "Dividend Yield dos últimos 12 meses (ex: 11.2 para 11.2%)" },
              liq: { type: Type.STRING, description: "Liquidez média diária (ex: 'R$ 10,5 mi')" },
              cotistas: { type: Type.STRING, description: "Número de cotistas/acionistas (ex: '1,1 mi')" },
              desc: { type: Type.STRING, description: "Breve descrição do ativo (até 250 chars)." },
              mcap: { type: Type.STRING, description: "Market Cap (ex: 'R$ 2,5 bi')" },
              sent: { type: Type.STRING, description: "Sentimento (Otimista, Neutro, Pessimista)" },
              sent_r: { type: Type.STRING, description: "Justificativa curta para o sentimento." }
            }
          },
          divs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                com: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)" },
                pag: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)" },
                val: { type: Type.NUMBER, description: "Valor por cota" },
                tipo: { type: Type.STRING, description: "Tipo (DIVIDENDO, JCP, etc.)" }
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Busca dados unificados de mercado (dividendos, fundamentos) diretamente da API do Google Gemini.
 * @param tickers - Array de tickers para buscar.
 * @param startDate - Data inicial para o cálculo do IPCA.
 * @param forceRefresh - Se verdadeiro, ignora o cache do cliente.
 * @returns Um objeto contendo os dados de mercado.
 */
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
  
  // 2. Verificação de Cache Padrão no Cliente
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ [Gemini] Usando Cache Inteligente do Cliente");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Warning", e); }
  }

  console.log(`🤖 [Gemini API] Buscando dados da IA diretamente...`);

  // FIX: Use process.env.API_KEY directly as per guidelines.
  if (!process.env.API_KEY) {
      const errorMsg = "Chave da API Gemini (API_KEY) não configurada.";
      console.error(errorMsg);
      return { dividends: [], metadata: {}, error: errorMsg };
  }

  try {
    // 3. Chamada direta para a API Gemini
    // FIX: Use process.env.API_KEY directly as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toISOString().split('T')[0];
    const portfolioStart = startDate || `${new Date().getFullYear()}-01-01`;

    const prompt = `Analise os ativos ${uniqueTickers.join(', ')}. Forneça seus fundamentos, dividendos recentes e futuros, e o IPCA acumulado de ${portfolioStart} até ${today}.`;

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: unifiedDataSchema,
            temperature: 0.1,
        },
    });
    
    const parsedJson = JSON.parse(response.text);

    const metadata: any = {};
    const dividends: any[] = [];
    
    if (parsedJson.data) {
      for (const asset of parsedJson.data) {
          const ticker = asset.t.toUpperCase();
          metadata[ticker] = {
              type: asset.type === 'FII' ? 'FII' : 'ACAO',
              segment: asset.segment,
              fundamentals: {
                  p_vp: normalizeValue(asset.fund.pvp),
                  p_l: normalizeValue(asset.fund.pl),
                  dy_12m: normalizeValue(asset.fund.dy),
                  liquidity: asset.fund.liq,
                  shareholders: asset.fund.cotistas,
                  description: asset.fund.desc,
                  market_cap: asset.fund.mcap,
                  sentiment: asset.fund.sent,
                  sentiment_reason: asset.fund.sent_r,
              },
          };
          
          if (asset.divs) {
            for (const div of asset.divs) {
                dividends.push({
                    ticker: ticker,
                    type: div.tipo,
                    dateCom: normalizeDate(div.com),
                    paymentDate: normalizeDate(div.pag),
                    rate: normalizeValue(div.val),
                });
            }
          }
      }
    }
    
    const indicators = {
      ipca_cumulative: normalizeValue(parsedJson.sys?.ipca),
      start_date_used: portfolioStart,
    };
    
    const data = { dividends, metadata, indicators };
    
    // 4. Sucesso: Salva os dados no cache do cliente
    if (data.metadata && Object.keys(data.metadata).length > 0) {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tickerKey: tickerKey,
            data: data
        }));
    }
    
    return data;

  } catch (error: any) {
    console.error("Erro na chamada direta ao Gemini:", error.message);
    
    const isQuotaError = error.message && (error.message.toLowerCase().includes('quota') || error.message.includes('429'));
    if (isQuotaError) {
        console.error("⚠️ [Gemini] Cota Excedida. Ativando Circuit Breaker (5 min).");
        localStorage.setItem(QUOTA_COOLDOWN_KEY, (Date.now() + 5 * 60 * 1000).toString());
    }
    
    // Fallback para o cache antigo em caso de qualquer erro
    const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
    if (oldCache) {
        const parsed = JSON.parse(oldCache);
        return { ...parsed.data, error: isQuotaError ? 'quota_exceeded' : undefined };
    }
    
    // Retorno final se não houver cache
    return { dividends: [], metadata: {}, error: error.message };
  }
};