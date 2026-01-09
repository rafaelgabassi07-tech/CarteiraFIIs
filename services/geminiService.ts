
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Updated cache key to reflect model change to Flash 2.5.
const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v14_25flash'; 
// Updated to Gemini 2.5 Flash for speed and efficiency.
const LOCKED_MODEL_ID = "gemini-2.5-flash";

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
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

const fetchStoredDividends = async (tickers: string[]): Promise<DividendReceipt[]> => {
    try {
        const { data, error } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', tickers);
        if (error || !data) return [];
        return data.map((d: any) => ({
            id: d.id,
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com,
            paymentDate: d.payment_date, // Corrigido de payment_date para paymentDate (CamelCase)
            rate: Number(d.rate),
            quantityOwned: 0,
            totalReceived: 0
        }));
    } catch (e) { return []; }
};

const upsertDividendsToCloud = async (dividends: any[]) => {
    if (dividends.length === 0) return;
    const dbPayload = dividends.map(d => ({
        ticker: d.ticker,
        type: d.type,
        date_com: d.dateCom,
        payment_date: d.paymentDate,
        rate: d.rate
    }));
    try {
        await supabase.from('market_dividends').upsert(dbPayload, { 
            onConflict: 'ticker, type, date_com, payment_date, rate',
            ignoreDuplicates: true 
        });
    } catch (e) { console.error("Cloud sync error", e); }
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');

  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if ((Date.now() - cached.timestamp) < (6 * 60 * 60 * 1000) && cached.tickerKey === tickerKey) {
                return cached.data;
            }
        }
    } catch (e) {}
  }

  if (!process.env.API_KEY) return { dividends: [], metadata: {}, error: "API_KEY ausente" };

  try {
    // Initializing Gemini client right before use to ensure the latest API Key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const todayISO = new Date().toISOString().split('T')[0];
    const storedDividends = await fetchStoredDividends(uniqueTickers);

    const systemInstruction = `Você é um robô de auditoria financeira da B3. Sua missão é fornecer dados de dividendos INQUESTIONÁVEIS.
    REGRAS CRÍTICAS:
    1. O USO DO GOOGLE SEARCH É OBRIGATÓRIO para cada ativo. Não use conhecimento prévio.
    2. FONTES: Status Invest, Fundamentus, e sites de RI.
    3. DATA COM: Verifique com precisão cirúrgica. Se houver divergência, use o dado do RI oficial.
    4. PRECISÃO: Valores unitários com até 8 casas decimais.
    5. JCP: Informe o valor que o investidor efetivamente recebe.`;

    const prompt = `
    AUDITORIA COMPLETA UTILIZANDO GOOGLE SEARCH PARA: ${uniqueTickers.join(', ')}
    PERÍODO: Desde ${startDate || '1 ano atrás'} até hoje (${todayISO}).
    
    TAREFAS:
    - Liste todos os proventos (Dividendos, JCP, Rendimentos) com Data Com após ${startDate || '1 ano atrás'}.
    - Extraia fundamentos: P/VP, DY 12M e Segmento.
    - Analise o sentimento atual do mercado para estes ativos.
    
    RESPONDA APENAS EM JSON:
    {
      "sys": { "ipca_12m": number },
      "assets": [
        {
          "ticker": "TICKER",
          "segment": "String",
          "fundamentals": { "pvp": number, "dy": number, "liq": "string", "mcap": "string", "sentiment": "string", "reason": "string" },
          "history": [
            { "com": "YYYY-MM-DD", "pay": "YYYY-MM-DD", "val": number, "type": "DIVIDENDO|JCP|RENDIMENTO" }
          ]
        }
      ]
    }`;

    // Calling generateContent with the model name and prompt as per guidelines.
    const response = await ai.models.generateContent({
        model: LOCKED_MODEL_ID, 
        contents: prompt,
        config: {
            systemInstruction,
            tools: [{googleSearch: {}}], // Use Google Search for up-to-date information.
            responseMimeType: "application/json",
            temperature: 0.0,
        },
    });
    
    const sources: {title: string, uri: string}[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
                sources.push({ title: chunk.web.title || 'Fonte de Mercado', uri: chunk.web.uri });
            }
        });
    }

    // FIX: Limpeza robusta da string JSON retornada pela IA (remove blocos markdown)
    let rawText = response.text || "{}";
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedJson;
    try {
        parsedJson = JSON.parse(rawText);
    } catch (parseError) {
        console.warn("Falha no parse do JSON da IA, tentando correção manual...", parseError);
        parsedJson = { assets: [] }; // Fallback seguro
    }

    const metadata: any = {};
    const aiDividends: any[] = [];
    
    if (parsedJson.assets) {
      for (const asset of parsedJson.assets) {
          const t = asset.ticker.toUpperCase();
          metadata[t] = {
              type: t.endsWith('11') ? AssetType.FII : AssetType.STOCK,
              segment: asset.segment,
              fundamentals: {
                  p_vp: normalizeValue(asset.fundamentals?.pvp),
                  dy_12m: normalizeValue(asset.fundamentals?.dy),
                  liquidity: asset.fundamentals?.liq || '-',
                  market_cap: asset.fundamentals?.mcap || '-',
                  sentiment: asset.fundamentals?.sentiment || 'Neutro',
                  sentiment_reason: asset.fundamentals?.reason || 'Sem análise disponível',
                  sources: sources.slice(0, 5)
              },
          };
          
          if (asset.history) {
            asset.history.forEach((d: any) => {
                const dCom = normalizeDate(d.com);
                const dPay = normalizeDate(d.pay);
                if (dCom) {
                    aiDividends.push({
                        ticker: t,
                        type: d.type || 'DIVIDENDO',
                        dateCom: dCom,
                        paymentDate: dPay || dCom,
                        rate: normalizeValue(d.val),
                    });
                }
            });
          }
      }
    }

    // Salva na nuvem em background (sem await para não travar UI se lento)
    upsertDividendsToCloud(aiDividends);

    // Mescla com dados existentes para evitar perda se a IA falhar parcialmente
    const combined = [...storedDividends];
    aiDividends.forEach(newDiv => {
        const isDuplicate = combined.some(old => 
            old.ticker === newDiv.ticker && 
            old.dateCom === newDiv.dateCom && 
            Math.abs(old.rate - newDiv.rate) < 0.00001
        );
        if (!isDuplicate) combined.push(newDiv);
    });
    
    const finalData = { 
        dividends: combined, 
        metadata, 
        indicators: { ipca_cumulative: normalizeValue(parsedJson.sys?.ipca_12m), start_date_used: startDate || '' }
    };
    
    localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tickerKey, data: finalData }));
    return finalData;

  } catch (error: any) {
    console.error("Gemini Critical Audit Error:", error);
    const stored = await fetchStoredDividends(uniqueTickers);
    return { dividends: stored, metadata: {}, error: error.message };
  }
};
