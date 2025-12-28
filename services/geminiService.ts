
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v6.6.0'; // Version match
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 Horas

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  return ''; 
};

const normalizeValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  if (typeof val === 'string') {
    // Remove currency symbols and extra spaces
    let clean = val.replace(/[R$\s]/g, '').trim();
    
    // Check for Brazilian format (1.000,00) vs US format (1,000.00 or 1000.00)
    if (clean.includes(',') && !clean.includes('.')) {
        // Only commas (e.g., 10,50) -> Replace comma with dot
        clean = clean.replace(',', '.');
    } else if (clean.includes('.') && clean.includes(',')) {
        // Mixed (e.g. 1.000,50 or 1,000.50)
        if (clean.indexOf(',') > clean.indexOf('.')) {
            // 1.000,50 -> Remove dot, replace comma
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,000.50 -> Remove comma
            clean = clean.replace(/,/g, '');
        }
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
                console.log("⚡ Usando Cache Gemini");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Error", e); }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const tickerListString = tickers.join(', ');
  const today = new Date().toISOString().split('T')[0];
  const portfolioStart = startDate || today; 

  // Prompt otimizado para garantir FIIs e Ações estrito, com simplificação
  const prompt = `
    Hoje é ${today}. Analise estes ativos: ${tickerListString}.
    
    OBJETIVO: Classificar e extrair dados para uma carteira simples de FIIs e Ações.
    
    Tarefas:
    1. Identifique ESTRITAMENTE se é "FII" ou "ACAO". 
       - Se for ETF, BDR, Stock Internacional ou outro, classifique como "ACAO" para simplificação da interface.
       - Defina o segmento de atuação de forma resumida.
    2. Fundamentos (Use 0 se não encontrar): P/VP (number), P/L (number), DY 12m (number, ex: 10.5), Liquidez (texto curto), Cotistas (texto).
    3. Sentimento: Resumido (Otimista/Neutro/Pessimista) e motivo curto.
    4. Proventos (Últimos 12 meses): Liste Dividendos e JCP.
       - 'dc': Data Com (YYYY-MM-DD).
       - 'dp': Data Pagamento (YYYY-MM-DD).
       - 'v': Valor líquido (number).
    5. IPCA Acumulado desde ${portfolioStart} (number).

    Retorne APENAS este JSON (sem markdown):
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // Forçamos o modelo a agir como um parser de dados estrito
        systemInstruction: "Você é um backend financeiro para um app dedicado EXCLUSIVAMENTE a FIIs e Ações. Retorne JSON estrito. Valores monetários devem ser NUMBERS.",
        temperature: 0.1,
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    
    // Limpeza robusta
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Tenta encontrar o objeto JSON se houver texto extra
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        text = text.substring(start, end + 1);
    }

    const parsed = JSON.parse(text);
    
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
            segment: asset.s || 'Geral',
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
                        paymentDate: paymentDate || dateCom,
                        rate: rate,
                        quantityOwned: 0, 
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
    console.error("Gemini Parse Error:", error);
    // Retorna vazio para não quebrar a UI
    return { dividends: [], metadata: {} };
  }
};
