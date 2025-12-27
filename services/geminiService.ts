
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  sources?: { web: { uri: string; title: string } }[];
  indicators?: MarketIndicators;
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v2';
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 Horas de validade

// Helper para garantir formato YYYY-MM-DD independente do retorno da IA
const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  
  // Caso 1: Já é YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  // Caso 2: DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }

  // Caso 3: Tentar parsear data genérica
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
       return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return s; // Retorna original em último caso (fallback)
};

// Helper para garantir float correto (substitui vírgula por ponto se necessário)
const normalizeValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    return parseFloat(val.replace(',', '.').trim()) || 0;
  }
  return 0;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length ===0) return { dividends: [], metadata: {} };

  // 1. Verificação de Cache (Performance)
  const tickerKey = tickers.slice().sort().join('|');
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            const isSameAssets = cached.tickerKey === tickerKey;
            
            if (isFresh && isSameAssets) {
                console.log("⚡ Usando Cache Gemini");
                return cached.data;
            }
        }
    } catch (e) {
        console.warn("Erro ao ler cache Gemini", e);
    }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');
  const today = new Date().toISOString().split('T')[0];
  const portfolioStart = startDate || today; 

  // Prompt Otimizado para Velocidade (Menos Tokens de Saída)
  // REMOVIDO: Notícias (pesado)
  const prompt = `
    Hoje: ${today}. Início Carteira: ${portfolioStart}.
    Ativos: ${tickerListString}.

    TAREFA: Retornar JSON financeiro consolidado.
    USE GOOGLE SEARCH PARA DADOS RECENTES.
    SEJA CONCISO (Economize tokens).

    1. Dados: P/VP, P/L, DY 12m, Liquidez, Cotistas.
    2. Descrição: Max 15 palavras.
    3. Sentimento: Resumido (max 10 palavras).
    4. Proventos: Últimos 12 meses (Data Com, Pagto, Valor).
    5. Macro: IPCA acumulado (${portfolioStart} a ${today}).

    JSON OBRIGATÓRIO:
    {
      "sys": { "ipca": 0.00, "start_ref": "YYYY-MM-DD" },
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII/ACAO",
          "f": {
             "pvp": 0.00, "pl": 0.00, "dy": 0.00, "liq": "str", "cot": "str",
             "desc": "str", "sent": "str", "sent_why": "str"
          },
          "d": [ { "ty": "DIV/JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.00 } ]
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
        systemInstruction: "API JSON Estrita. Responda APENAS JSON válido. Datas ISO 8601 (YYYY-MM-DD). Sem Markdown.",
        temperature: 0.1,
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

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
        })).filter((s: any) => s.web.uri) || [],
        indicators: {
            ipca_cumulative: typeof parsed.sys?.ipca === 'number' ? parsed.sys.ipca : 0,
            start_date_used: normalizeDate(parsed.sys?.start_ref) || portfolioStart
        }
    };

    const seenDividends = new Set<string>();

    if (parsed?.assets && Array.isArray(parsed.assets)) {
      parsed.assets.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase().trim();
        if (!ticker) return;

        const fundamentals: AssetFundamentals = {
            p_vp: normalizeValue(asset.f?.pvp),
            p_l: normalizeValue(asset.f?.pl),
            dy_12m: normalizeValue(asset.f?.dy),
            liquidity: asset.f?.liq || 'N/A',
            shareholders: asset.f?.cot || 'N/A',
            description: asset.f?.desc || '',
            sentiment: asset.f?.sent || 'Neutro',
            sentiment_reason: asset.f?.sent_why || '',
            news: [] // Removido por performance
        };

        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: asset.type?.toUpperCase() === 'FII' ? AssetType.FII : AssetType.STOCK,
          fundamentals: fundamentals
        };

        if (Array.isArray(asset.d)) {
            asset.d.forEach((div: any) => {
                // Normalização robusta de dados
                const dc = normalizeDate(div.dc);
                const dp = normalizeDate(div.dp || div.dc);
                const val = normalizeValue(div.v);

                if (!dc || !val) return;
                
                const uniqueKey = `${ticker}-${dc}-${val}`.replace(/\s+/g, '');
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);

                const type = div.ty?.toUpperCase() || "DIVIDENDO";
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
                    ticker,
                    type: type,
                    dateCom: dc,
                    paymentDate: dp, 
                    rate: val,
                    quantityOwned: 0,
                    totalReceived: 0
                });
            });
        }
      });
    }

    // Salvar no Cache
    try {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tickerKey: tickerKey,
            data: result
        }));
    } catch (e) { console.warn("Cache Full"); }

    return result;
  } catch (error: any) {
    console.error("Erro Crítico Gemini:", error);
    return { dividends: [], metadata: {} };
  }
};
