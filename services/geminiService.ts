
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string;
}

// Chave de cache atualizada para versionamento do Schema
export const GEMINI_CACHE_KEY = 'investfiis_market_data_v16_schema'; 
const LOCKED_MODEL_ID = "gemini-2.5-flash";

// Variável para rastrear requisições em andamento (Deduplicação de chamadas)
let activeRequest: { key: string, promise: Promise<UnifiedMarketData> } | null = null;

// --- Definição do Schema de Resposta (Tipagem Estrita) ---
const marketDataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sys: {
      type: Type.OBJECT,
      properties: {
        ipca_12m: { type: Type.NUMBER, description: "Inflação acumulada últimos 12 meses (IBGE/IPCA)." }
      }
    },
    assets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          segment: { type: Type.STRING, description: "Setor de atuação ex: Logística, Bancos, Shopping." },
          type: { type: Type.STRING, enum: ["ACAO", "FII"], description: "Classificação do ativo." },
          fundamentals: {
            type: Type.OBJECT,
            properties: {
              pvp: { type: Type.NUMBER, description: "Preço sobre Valor Patrimonial." },
              dy: { type: Type.NUMBER, description: "Dividend Yield acumulado 12 meses (em %)." },
              liq: { type: Type.STRING, description: "Liquidez diária média formatada." },
              mcap: { type: Type.STRING, description: "Valor de mercado formatado." },
              sentiment: { type: Type.STRING, enum: ["Otimista", "Neutro", "Pessimista"], description: "Consenso de mercado." },
              reason: { type: Type.STRING, description: "Breve motivo do sentimento (max 10 palavras)." }
            }
          },
          history: {
            type: Type.ARRAY,
            description: "Lista de proventos (Dividendos/JCP) anunciados/pagos nos últimos 12 meses.",
            items: {
              type: Type.OBJECT,
              properties: {
                com: { type: Type.STRING, description: "Data Com (YYYY-MM-DD)." },
                pay: { type: Type.STRING, description: "Data Pagamento (YYYY-MM-DD)." },
                val: { type: Type.NUMBER, description: "Valor líquido (ou bruto se JCP)." },
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Fallback simples
  return new Date().toISOString().split('T')[0];
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
    // Prepara payload removendo duplicatas exatas locais antes do envio
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

  // 1. DEDUPLICAÇÃO: Evita chamadas simultâneas idênticas (Erro 429)
  if (activeRequest && activeRequest.key === tickerKey && !forceRefresh) {
      console.log(`🔄 [Gemini] Reutilizando requisição ativa para ${uniqueTickers.length} ativos`);
      return activeRequest.promise;
  }

  // 2. CACHE LOCAL
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            // Cache válido por 4 horas para dados de mercado
            if ((Date.now() - cached.timestamp) < (4 * 60 * 60 * 1000) && cached.tickerKey === tickerKey) {
                console.log(`📦 [Gemini] Dados recuperados do cache local`);
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

        console.log(`🤖 [Gemini] Consultando dados para: ${uniqueTickers.length} ativos...`);

        const prompt = `
        Analise os seguintes ativos da B3 (Brasil): ${uniqueTickers.join(', ')}.
        Busque informações RECENTES e ATUALIZADAS (Data base hoje: ${new Date().toISOString().split('T')[0]}).
        
        Use a tool 'googleSearch' para verificar:
        1. Últimos proventos anunciados (Data Com, Pagamento, Valor).
        2. Valor de P/VP atual.
        3. Dividend Yield (DY) dos últimos 12 meses.
        4. Sentimento de mercado.
        `;

        const response = await ai.models.generateContent({
            model: LOCKED_MODEL_ID, 
            contents: prompt,
            config: {
                // Configuração Estrita: Força JSON perfeito baseada no Schema
                responseMimeType: "application/json",
                responseSchema: marketDataSchema,
                tools: [{googleSearch: {}}],
                temperature: 0.1, // Baixa criatividade para maior precisão
            },
        });
        
        // Coleta fontes (Grounding)
        const sources: {title: string, uri: string}[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    sources.push({ title: chunk.web.title || 'Fonte B3', uri: chunk.web.uri });
                }
            });
        }

        // Parsing Direto (O Schema garante que response.text é um JSON válido)
        const parsedJson = JSON.parse(response.text || '{"assets": []}');
        
        const metadata: any = {};
        const aiDividends: any[] = [];
        
        if (parsedJson.assets) {
          for (const asset of parsedJson.assets) {
              const t = asset.ticker.toUpperCase();
              
              // Garante normalização de AssetType
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
                      sources: sources.slice(0, 3) // Anexa as fontes reais
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

        // Sincroniza dados novos com a nuvem (Fire and forget)
        upsertDividendsToCloud(aiDividends);

        // Mesclagem Inteligente: Dados do Banco + Dados Novos da IA
        // Prioriza dados do banco se forem idênticos para manter consistência de ID
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
        
        // Salva no cache
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), tickerKey, data: finalData }));
        return finalData;

    } catch (error: any) {
        console.error("Gemini Data Error:", error);
        
        // Estratégia de Fallback para Erro 429 (Rate Limit)
        if (error.status === 429 || String(error).includes('429')) {
             console.warn("⚠️ Rate Limit Detectado. Usando cache antigo se disponível.");
             const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
             if (cachedRaw) {
                 return { ...JSON.parse(cachedRaw).data, error: "Modo Offline (Limite de API)" };
             }
        }

        // Fallback final: Apenas dados do banco de dados
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
