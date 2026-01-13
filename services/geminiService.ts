
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Configuração: Usando Gemini 3 Flash Preview (Conforme Guidelines)
const GEMINI_CACHE_KEY = 'investfiis_gemini_v25_3flash_search'; 
const LOCKED_MODEL_ID = "gemini-3-flash-preview";

// Robust API Key Retrieval
const getApiKey = () => {
    const viteKey = (import.meta as any).env?.VITE_API_KEY;
    if (viteKey) {
        console.log("GeminiService: API Key encontrada via VITE_API_KEY");
        return viteKey;
    }
    try {
        if (process.env.API_KEY) {
            console.log("GeminiService: API Key encontrada via process.env.API_KEY");
            return process.env.API_KEY;
        }
    } catch {
        // ignore
    }
    console.warn("GeminiService: Nenhuma API Key encontrada.");
    return undefined;
};

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
            paymentDate: d.payment_date,
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

  // 1. Verificação de Cache Local
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            // Cache de 4 horas
            if ((Date.now() - cached.timestamp) < (4 * 60 * 60 * 1000) && cached.tickerKey === tickerKey) {
                console.log("GeminiService: Usando Cache Local");
                return cached.data;
            }
        }
    } catch (e) {}
  }

  const apiKey = getApiKey();
  if (!apiKey) {
      console.error("GeminiService: API Key ausente. Abortando requisição.");
      return { dividends: [], metadata: {}, error: "API_KEY ausente" };
  }

  const systemInstruction = `
  ATUE COMO UM ANALISTA DE DADOS DA B3 (BRASIL).
  
  OBJETIVO:
  Usar a ferramenta "GoogleSearch" para encontrar dados RECENTES (2024-2025) sobre os ativos solicitados.
  
  FORMATO DE RESPOSTA:
  Você DEVE retornar APENAS um JSON válido. Não use Markdown (\`\`\`json). Retorne o texto cru do JSON.
  
  O JSON deve seguir estritamente esta estrutura:
  {
    "sys": { "ipca_12m": number },
    "assets": [
      {
        "ticker": "string",
        "segment": "string",
        "type": "FII" | "ACAO",
        "fundamentals": {
            "pvp": number | null,
            "dy": number | null,
            "reason": "string (resumo curto de 1 frase)"
        },
        "history": [
           { "com": "YYYY-MM-DD", "pay": "YYYY-MM-DD", "val": number, "type": "DIV" | "JCP" | "REND" }
        ]
      }
    ]
  }
  `;

  const prompt = `
  ATIVOS: ${uniqueTickers.join(', ')}
  DATA DE CORTE: ${startDate || '2024-01-01'}
  
  BUSQUE AGORA:
  1. Valor IPCA acumulado 12 meses Brasil hoje.
  2. Para cada ativo: Dividendos anunciados após a data de corte, P/VP, DY e Segmento.
  `;

  try {
      console.log(`GeminiService: Iniciando requisição para ${uniqueTickers.length} ativos...`);
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
          model: LOCKED_MODEL_ID, 
          contents: prompt,
          config: {
              systemInstruction,
              tools: [{googleSearch: {}}],
              // NOTA: responseMimeType 'application/json' conflitua com googleSearch em alguns casos.
              // Usamos prompt engineering para forçar JSON e fazemos parse manual.
              temperature: 0.1,
              // Desativa filtros de segurança para evitar bloqueio de termos financeiros
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
              ]
          },
      });
      
      console.log("GeminiService: Resposta recebida.");

      // Processamento da Resposta
      const sources: {title: string, uri: string}[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
          chunks.forEach((chunk: any) => {
              if (chunk.web?.uri) {
                  sources.push({ title: chunk.web.title || 'Fonte Web', uri: chunk.web.uri });
              }
          });
      }

      let parsedJson: any = { assets: [] };
      let textResponse = response.text || "{}";
      
      // Limpeza de Markdown caso o modelo envie ```json ... ```
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
          parsedJson = JSON.parse(textResponse);
      } catch (parseError) {
          console.warn("GeminiService: Falha ao parsear JSON. Tentando correção...", parseError);
          console.debug("Raw Text:", textResponse);
      }

      const metadata: any = {};
      const aiDividends: any[] = [];
      
      if (parsedJson.assets && Array.isArray(parsedJson.assets)) {
        for (const asset of parsedJson.assets) {
            const t = asset.ticker?.toUpperCase() || "UNKNOWN";
            
            metadata[t] = {
                type: asset.type === 'FII' ? AssetType.FII : AssetType.STOCK,
                segment: asset.segment || 'Geral',
                fundamentals: {
                    p_vp: normalizeValue(asset.fundamentals?.pvp),
                    dy_12m: normalizeValue(asset.fundamentals?.dy),
                    liquidity: asset.fundamentals?.liq || '-',
                    market_cap: asset.fundamentals?.mcap || '-',
                    sentiment: 'Neutro',
                    sentiment_reason: asset.fundamentals?.reason || 'Dados obtidos via IA',
                    sources: sources.slice(0, 3)
                },
            };
            
            if (asset.history && Array.isArray(asset.history)) {
              asset.history.forEach((d: any) => {
                  const dCom = normalizeDate(d.com);
                  const dPay = normalizeDate(d.pay);
                  if (dCom && d.val > 0) {
                      aiDividends.push({
                          ticker: t,
                          type: d.type || 'REND',
                          dateCom: dCom,
                          paymentDate: dPay || dCom,
                          rate: normalizeValue(d.val),
                      });
                  }
              });
            }
        }
      }

      // Sync Cloud
      upsertDividendsToCloud(aiDividends);

      // Merge com dados do Supabase
      const storedDividends = await fetchStoredDividends(uniqueTickers);
      const combined = [...storedDividends];
      
      aiDividends.forEach(newDiv => {
          const exists = combined.some(old => 
              old.ticker === newDiv.ticker && 
              old.dateCom === newDiv.dateCom && 
              Math.abs(old.rate - newDiv.rate) < 0.001
          );
          if (!exists) combined.push(newDiv);
      });
      
      const finalData = { 
          dividends: combined, 
          metadata, 
          indicators: { 
              ipca_cumulative: normalizeValue(parsedJson.sys?.ipca_12m), 
              start_date_used: startDate || '' 
          }
      };
      
      localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tickerKey, data: finalData }));
      return finalData;

  } catch (error: any) {
      console.error("GeminiService: Erro Fatal na Requisição:", error);
      const storedFallback = await fetchStoredDividends(uniqueTickers);
      return { 
          dividends: storedFallback, 
          metadata: {}, 
          error: error.message || 'Erro de conexão com Gemini' 
      };
  }
};
