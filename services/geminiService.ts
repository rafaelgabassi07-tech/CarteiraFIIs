
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  sources?: { web: { uri: string; title: string } }[];
  indicators?: MarketIndicators;
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v4'; // Version bump for cache
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
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return s; 
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

  // Agrupamento de requisição (Todos os tickers em uma única chamada)
  const tickerKey = tickers.slice().sort().join('|');
  
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ Usando Cache Gemini 2.5");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Error", e); }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');
  const today = new Date().toISOString().split('T')[0];
  const portfolioStart = startDate || today; 

  // Prompt otimizado para Gemini 2.5 Flash
  const prompt = `
    DATA DE HOJE: ${today}.
    LISTA DE ATIVOS: ${tickerListString}.
    
    CONTEXTO: Carteira dedicada estritamente a FIIs (Fundos Imobiliários) e Ações Brasileiras.
    
    TAREFA: Retorne um JSON com dados financeiros consolidados.
    
    1. CLASSIFICAÇÃO: "FII" ou "ACAO".
    2. FUNDAMENTOS: P/VP, P/L, DY 12m, Liquidez, Cotistas/Acionistas.
    3. SENTIMENTO: Otimista/Neutro/Pessimista (curto) e motivo.
    4. PROVENTOS: Todos os dividendos/JCP anunciados ou pagos nos últimos 12 meses (Data Com e Pagamento).
    5. MACRO: IPCA acumulado desde ${portfolioStart}.

    JSON APENAS:
    {
      "sys": { "ipca": 0.00, "start_ref": "${portfolioStart}" },
      "assets": [
        {
          "t": "TICKER",
          "s": "Segmento",
          "type": "FII" | "ACAO",
          "f": { "pvp": 0.00, "pl": 0.00, "dy": 0.00, "liq": "str", "cot": "str", "desc": "str", "sent": "str", "sent_why": "str" },
          "d": [ { "ty": "DIV" | "JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": 0.00 } ]
        }
      ]
    }
  `;

  try {
    // Atualizado para gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "Você é um especialista em mercado financeiro (B3). Responda estritamente em JSON válido, sem blocos de código markdown.",
        temperature: 0.1,
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    
    // Limpeza robusta de markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Tenta extrair JSON se houver texto ao redor
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    const parsed = JSON.parse(jsonStr);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        sources: groundingChunks?.map((chunk: any) => ({
          web: { uri: chunk.web?.uri || '', title: chunk.web?.title || '' }
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

        let type = AssetType.STOCK;
        // Inferência de tipo robusta
        const declaredType = asset.type?.toUpperCase();
        if (declaredType === 'FII' || ticker.endsWith('11') || ticker.endsWith('11B')) type = AssetType.FII; 
        else if (declaredType === 'ACAO' || ticker.endsWith('3') || ticker.endsWith('4')) type = AssetType.STOCK;

        result.metadata[ticker] = { 
          segment: asset.s || "Geral", 
          type: type,
          fundamentals: {
            p_vp: normalizeValue(asset.f?.pvp),
            p_l: normalizeValue(asset.f?.pl),
            dy_12m: normalizeValue(asset.f?.dy),
            liquidity: asset.f?.liq || 'N/A',
            shareholders: asset.f?.cot || 'N/A',
            description: asset.f?.desc || '',
            sentiment: asset.f?.sent || 'Neutro',
            sentiment_reason: asset.f?.sent_why || '',
            news: []
          }
        };

        if (Array.isArray(asset.d)) {
            asset.d.forEach((div: any) => {
                const dc = normalizeDate(div.dc);
                const dp = normalizeDate(div.dp || div.dc);
                const val = normalizeValue(div.v);
                if (!dc || !val) return;
                
                // ID único para evitar duplicatas
                const uniqueKey = `${ticker}-${dc}-${val}`.replace(/\s+/g, '');
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
                    ticker,
                    type: div.ty?.toUpperCase() || "RENDIMENTO",
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

    localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        tickerKey: tickerKey,
        data: result
    }));

    return result;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    // Retorna vazio em caso de erro para não quebrar a UI
    return { dividends: [], metadata: {} };
  }
};
