
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Atualizamos a chave de cache para garantir que os usuários baixem os novos dados com a nova lógica
export const GEMINI_CACHE_KEY = 'investfiis_scraping_v18_sources'; 
const LOCKED_MODEL_ID = "gemini-2.5-flash";

// Variável para evitar chamadas duplicadas (Erro 429)
let activeRequest: { key: string, promise: Promise<UnifiedMarketData> } | null = null;

// --- 1. DEFINIÇÃO DO SCHEMA (O MOLDE DOS DADOS) ---
// Isso garante que a IA devolva exatamente o que o app precisa, sem texto extra.
const marketDataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sys: {
      type: Type.OBJECT,
      properties: {
        ipca_12m: { type: Type.NUMBER, description: "Inflação acumulada 12 meses (IBGE)." }
      }
    },
    assets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          segment: { type: Type.STRING, description: "Setor (ex: Logística, Bancos)." },
          type: { type: Type.STRING, enum: ["ACAO", "FII"], description: "Tipo do ativo." },
          fundamentals: {
            type: Type.OBJECT,
            properties: {
              pvp: { type: Type.NUMBER, description: "P/VP (Preço sobre Valor Patrimonial)." },
              dy: { type: Type.NUMBER, description: "Dividend Yield acumulado 12 meses (%)." },
              liq: { type: Type.STRING, description: "Liquidez diária formatada (ex: R$ 5M)." },
              mcap: { type: Type.STRING, description: "Valor de Mercado." },
              sentiment: { type: Type.STRING, enum: ["Otimista", "Neutro", "Pessimista"] },
              reason: { type: Type.STRING, description: "Motivo curto do sentimento." }
            }
          },
          history: {
            type: Type.ARRAY,
            description: "Lista de proventos com Datacom e Pagamento (últimos 12 meses).",
            items: {
              type: Type.OBJECT,
              properties: {
                com: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)." },
                pay: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)." },
                val: { type: Type.NUMBER, description: "Valor do provento." },
                type: { type: Type.STRING, enum: ["DIVIDENDO", "JCP", "RENDIMENTO"] }
              }
            }
          }
        },
        required: ["ticker", "type", "fundamentals"]
      }
    }
  }
};

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  // Tenta formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().split('T')[0];
};

// Busca dividendos salvos no Supabase (Backup)
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

// Salva os dados novos na nuvem para não precisar consultar a IA toda hora
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
    } catch (e) { console.error("Cloud sync warning", e); }
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');

  // --- CONTROLE DE FLUXO (Evita Erro 429) ---
  if (activeRequest && activeRequest.key === tickerKey && !forceRefresh) {
      console.log(`🔄 [Gemini] Reutilizando requisição ativa.`);
      return activeRequest.promise;
  }

  // --- CACHE LOCAL (Prioridade 1) ---
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            // Cache válido por 6 horas
            if ((Date.now() - cached.timestamp) < (6 * 60 * 60 * 1000) && cached.tickerKey === tickerKey) {
                console.log(`📦 [Gemini] Dados recuperados do cache local.`);
                return cached.data;
            }
        }
    } catch (e) {}
  }

  if (!process.env.API_KEY) return { dividends: [], metadata: {}, error: "API_KEY ausente" };

  const fetchTask = async (): Promise<UnifiedMarketData> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const storedDividends = await fetchStoredDividends(uniqueTickers);

        console.log(`🤖 [Gemini] Iniciando Scraping Inteligente para ${uniqueTickers.length} ativos...`);

        // --- 2. O PROMPT (A ORDEM DE SCRAPING) ---
        const prompt = `
        Atue como um Crawler Financeiro especializado na B3.
        
        ALVOS: ${uniqueTickers.join(', ')}.
        DATA HOJE: ${new Date().toISOString().split('T')[0]}.
        
        INSTRUÇÃO DE SCRAPING (Busca Web Obrigatória):
        Para cada ativo listado, use a tool 'googleSearch' para encontrar os dados ATUAIS nos sites "Status Invest" e "Investidor10".
        
        EXTRAIA EXATAMENTE:
        1. FUNDAMENTOS:
           - P/VP (Preço sobre Valor Patrimonial) atualizado.
           - Dividend Yield (DY) acumulado dos últimos 12 meses.
           - Liquidez média diária.
           
        2. PROVENTOS (Últimos 12 meses):
           - Data Com (Data de corte).
           - Data de Pagamento.
           - Valor R$ por cota.
           - Tipo (Dividendo/JCP).

        REGRAS DE CONFLITO:
        - Se Status Invest e Investidor10 discordarem, use o dado do Status Invest.
        - Se não encontrar Data de Pagamento futura, use a Data Com como referência provisória.
        `;

        const response = await ai.models.generateContent({
            model: LOCKED_MODEL_ID, 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: marketDataSchema, // Aplica o molde JSON
                tools: [{googleSearch: {}}], // Ativa o acesso à internet
                temperature: 0.1, // Baixa criatividade para garantir fidelidade aos números
            },
        });
        
        // Extrai as fontes usadas para dar credibilidade
        const sources: {title: string, uri: string}[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    sources.push({ title: chunk.web.title || 'Fonte Web', uri: chunk.web.uri });
                }
            });
        }

        const parsedJson = JSON.parse(response.text || '{"assets": []}');
        
        const metadata: any = {};
        const aiDividends: any[] = [];
        
        // Processa o JSON retornado pela IA
        if (parsedJson.assets) {
          for (const asset of parsedJson.assets) {
              const t = asset.ticker.toUpperCase();
              
              // Define tipo baseado no ticker se a IA falhar (ex: final 11 é geralmente FII/Unit)
              let assetType = AssetType.FII;
              if (asset.type === 'ACAO') assetType = AssetType.STOCK;
              else if (t.endsWith('3') || t.endsWith('4')) assetType = AssetType.STOCK;

              metadata[t] = {
                  type: assetType,
                  segment: asset.segment || 'Geral',
                  fundamentals: {
                      p_vp: asset.fundamentals.pvp,
                      dy_12m: asset.fundamentals.dy,
                      liquidity: asset.fundamentals.liq,
                      market_cap: asset.fundamentals.mcap,
                      sentiment: asset.fundamentals.sentiment,
                      sentiment_reason: asset.fundamentals.reason,
                      sources: sources.slice(0, 4) // Anexa as fontes (StatusInvest, etc)
                  },
              };
              
              if (asset.history && Array.isArray(asset.history)) {
                asset.history.forEach((d: any) => {
                    const dCom = normalizeDate(d.com);
                    const dPay = normalizeDate(d.pay);
                    if (d.val > 0) {
                        aiDividends.push({
                            ticker: t,
                            type: d.type || 'DIVIDENDO',
                            dateCom: dCom,
                            paymentDate: dPay || dCom,
                            rate: Number(d.val),
                        });
                    }
                });
              }
          }
        }

        upsertDividendsToCloud(aiDividends);

        // Mescla dados do banco (histórico antigo) com dados novos da IA
        const combined = [...storedDividends];
        aiDividends.forEach(newDiv => {
            const isDuplicate = combined.some(old => 
                old.ticker === newDiv.ticker && 
                old.dateCom === newDiv.dateCom && 
                Math.abs(old.rate - newDiv.rate) < 0.001
            );
            if (!isDuplicate) combined.push(newDiv);
        });
        
        const finalData = { 
            dividends: combined, 
            metadata, 
            indicators: { ipca_cumulative: parsedJson.sys?.ipca_12m || 4.5, start_date_used: startDate || '' }
        };
        
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tickerKey, data: finalData }));
        return finalData;

    } catch (error: any) {
        console.error("Gemini Scraping Error:", error);
        
        // Tratamento de Rate Limit (Erro 429)
        if (error.status === 429 || String(error).includes('429')) {
             console.warn("⚠️ Rate Limit Detectado. Tentando usar cache antigo.");
             const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
             if (cachedRaw) {
                 return { ...JSON.parse(cachedRaw).data, error: "Modo Offline (Limite API Google)" };
             }
        }

        // Se tudo falhar, retorna o que tem no banco de dados
        const stored = await fetchStoredDividends(uniqueTickers);
        return { dividends: stored, metadata: {}, error: "Serviço indisponível temporariamente" };
    } finally {
        if (activeRequest && activeRequest.key === tickerKey) {
            activeRequest = null;
        }
    }
  };

  const promise = fetchTask();
  activeRequest = { key: tickerKey, promise };
  return promise;
};
