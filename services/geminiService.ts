import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v5'; // Version bump for logic fix
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
  // Se a análise falhar, retorne uma string vazia para indicar uma data inválida.
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

  // Agrupamento de requisição (Todos os tickers em uma única chamada)
  const tickerKey = tickers.slice().sort().join('|');
  
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ Usando Cache Gemini (V5)");
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
    Referência de hoje: ${today}.
    Para CADA um dos seguintes ativos (${tickerListString}), extraia os dados solicitados.
    
    1.  **Dados Gerais**: Identifique o tipo ("FII" ou "ACAO") e o segmento.
    2.  **Fundamentos**: P/VP, P/L, DY (12m), Liquidez Diária, e número de Cotistas/Acionistas.
    3.  **Análise Rápida**: Gere um sentimento de curto prazo (Otimista, Neutro, Pessimista) e um motivo conciso.
    4.  **Proventos (Últimos 12 meses)**: Liste TODOS os proventos (Dividendos e JCP). CRÍTICO: Pagamentos anunciados na mesma "Data Com" mas com "Data de Pagamento" diferentes DEVEM ser listados como itens separados. Não agrupe parcelas.
    5.  **Contexto Macro**: Calcule o IPCA acumulado desde a data de início da carteira: ${portfolioStart}.

    A resposta DEVE ser um JSON válido, seguindo estritamente a estrutura abaixo:
    {
      "sys": { "ipca": <number>, "start_ref": "${portfolioStart}" },
      "assets": [
        {
          "t": "<TICKER>",
          "s": "<Segmento>",
          "type": "FII" | "ACAO",
          "f": { "pvp": <number>, "pl": <number>, "dy": <number>, "liq": "<string>", "cot": "<string>", "desc": "<string>", "sent": "<string>", "sent_why": "<string>" },
          "d": [ { "ty": "DIV" | "JCP", "dc": "YYYY-MM-DD", "dp": "YYYY-MM-DD", "v": <number> } ]
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
        systemInstruction: "Você é um especialista financeiro da B3 focado em dados de mercado. Sua tarefa é extrair informações de ativos com precisão absoluta, usando o Google Search como fonte primária para dados de proventos. A resposta DEVE ser um JSON válido, sem nenhum texto adicional.",
        temperature: 0.0,
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    const parsed = JSON.parse(jsonStr);
    
    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
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
          }
        };

        if (Array.isArray(asset.d)) {
            asset.d.forEach((div: any) => {
                const dc = normalizeDate(div.dc);
                const dp = normalizeDate(div.dp || div.dc);
                const val = normalizeValue(div.v);
                const divType = div.ty?.toUpperCase() || "RENDIMENTO";
                
                if (!dc || !val) return;
                
                const uniqueKey = `${ticker}-${divType}-${dc}-${dp}-${val}`.replace(/\s+/g, '');
                
                if (seenDividends.has(uniqueKey)) return;
                seenDividends.add(uniqueKey);
                
                result.dividends.push({
                    id: `DIV-${uniqueKey}`,
                    ticker,
                    type: divType,
                    dateCom: dc,
                    paymentDate: dp, 
                    rate: val,
                    quantityOwned: 0,
                    totalReceived: 0,
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
    return { dividends: [], metadata: {} };
  }
};