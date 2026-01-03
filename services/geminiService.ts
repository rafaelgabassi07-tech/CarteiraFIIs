
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";
import { supabase } from "./supabase";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

// A chave de API agora é lida do ambiente do Vite.

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v9.2_forensic_auditor'; // Cache atualizado para v9.2 (Thinking Model)
const QUOTA_COOLDOWN_KEY = 'investfiis_quota_cooldown'; 

// --- BLOQUEIO DE MODELO ---
// Updated to gemini-2.5-flash (stable) as explicitly requested.
const LOCKED_MODEL_ID = "gemini-2.5-flash";
// --------------------------

const getAiCacheTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    // Cache de 4 horas durante semana, 24h fim de semana
    return isWeekend ? (24 * 60 * 60 * 1000) : (4 * 60 * 60 * 1000);
};

// --- Funções Auxiliares de Parsing ---
const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  
  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  // Tenta converter DD/MM/YYYY
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return ''; // Data inválida
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

// --- SUPABASE HELPERS ---

// Busca histórico existente no banco para economizar tokens
const fetchStoredDividends = async (tickers: string[]): Promise<DividendReceipt[]> => {
    try {
        const { data, error } = await supabase
            .from('market_dividends')
            .select('*')
            .in('ticker', tickers);

        if (error || !data) return [];

        return data.map((d: any) => ({
            id: d.id, // ID interno do banco
            ticker: d.ticker,
            type: d.type,
            dateCom: d.date_com,
            paymentDate: d.payment_date,
            rate: Number(d.rate),
            quantityOwned: 0, // Será calculado no App.tsx
            totalReceived: 0  // Será calculado no App.tsx
        }));
    } catch (e) {
        console.warn("Supabase Cache Read Error (Ignorable if offline):", e);
        return [];
    }
};

// Salva novos dados encontrados pela IA no banco (Crowdsourcing)
const upsertDividendsToCloud = async (dividends: any[]) => {
    if (dividends.length === 0) return;
    
    // Mapeia para o formato do banco (snake_case)
    const dbPayload = dividends.map(d => ({
        ticker: d.ticker,
        type: d.type,
        date_com: d.dateCom,
        payment_date: d.paymentDate,
        rate: d.rate
    }));

    try {
        const { error } = await supabase
            .from('market_dividends')
            .upsert(dbPayload, { 
                onConflict: 'ticker, type, date_com, payment_date, rate',
                ignoreDuplicates: true 
            });
            
        if (error) console.error("Erro ao salvar histórico na nuvem:", error.message);
        else console.log(`☁️ [Cloud] ${dividends.length} proventos sincronizados.`);
    } catch (e) {
        console.error("Supabase Write Error:", e);
    }
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');
  const CACHE_TTL = getAiCacheTTL();

  const cooldown = localStorage.getItem(QUOTA_COOLDOWN_KEY);
  if (cooldown && Date.now() < parseInt(cooldown)) {
      console.warn("🚫 [Gemini] Circuit Breaker Ativo. Usando Cache.");
      const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
      if (oldCache) {
          const parsed = JSON.parse(oldCache);
          return { ...parsed.data, error: 'quota_exceeded' };
      }
      return { dividends: [], metadata: {}, error: 'quota_exceeded' };
  }
  
  // 1. Tenta Cache Local Rápido (Se não for forceRefresh)
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ [Gemini] Usando Cache Local");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Warning", e); }
  }

  // Use process.env.API_KEY directly for initialization
  if (!process.env.API_KEY) return { dividends: [], metadata: {}, error: "API_KEY ausente" };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const todayISO = new Date().toISOString().split('T')[0];
    
    // 2. Busca dados históricos do Supabase (Cloud Cache)
    const storedDividends = await fetchStoredDividends(uniqueTickers);
    console.log(`📦 [Supabase] Recuperados ${storedDividends.length} registros históricos.`);

    // Determina a data de corte para a IA
    // Se temos dados no banco, pedimos para a IA buscar apenas do último mês registrado em diante
    // para cobrir lacunas ou novos anúncios.
    let aiSearchStartDate = startDate;
    
    if (storedDividends.length > 0) {
        // Encontra a data mais recente no banco
        const sortedDates = storedDividends
            .map(d => d.paymentDate)
            .sort((a, b) => b.localeCompare(a));
            
        if (sortedDates.length > 0) {
            const latestDbDate = new Date(sortedDates[0]);
            // Recua 45 dias da última data conhecida para garantir que pegamos correções ou "Datas Com" recentes
            latestDbDate.setDate(latestDbDate.getDate() - 45);
            aiSearchStartDate = latestDbDate.toISOString().split('T')[0];
            console.log(`🤖 [IA] Solicitando busca incremental a partir de: ${aiSearchStartDate}`);
        }
    } else {
        // Se não tem nada no banco, define padrão (12 meses atrás)
        if (!aiSearchStartDate) {
            const d = new Date();
            d.setFullYear(d.getFullYear() - 1);
            aiSearchStartDate = d.toISOString().split('T')[0];
        }
        console.log(`🤖 [IA] Solicitando histórico completo a partir de: ${aiSearchStartDate}`);
    }
    
    // Prompt "Forensic Auditor" - Otimizado para Thinking Model e Busca Incremental
    const prompt = `
    VOCÊ É UM AUDITOR FORENSE DE MERCADO DE CAPITAIS (B3).
    Sua missão é extrair dados EXATOS e COMPROVÁVEIS.
    
    DATA BASE (HOJE): ${todayISO}
    PERÍODO DE BUSCA OBRIGATÓRIO: ${aiSearchStartDate} até o FUTURO (Provisões/Agendados).
    ATIVOS ALVO: ${uniqueTickers.join(', ')}.

    IMPORTANTE: Eu já tenho dados antigos no banco. Foque sua energia computacional em encontrar:
    1.  Novos anúncios de dividendos/JCP recentes (últimos 45 dias).
    2.  Provisões futuras e datas "Com" que ocorrerão em breve.
    3.  Fundamentos atualizados em tempo real (P/VP, DY, Sentimento).

    PROTOCOLO DE INVESTIGAÇÃO (Use seu Thinking Process):
    1.  **BUSCA RECENTE:** Para cada ativo, busque "Aviso aos Acionistas {TICKER} ${new Date().getFullYear()}", "Data Com {TICKER} ${new Date().getMonth() + 1}/${new Date().getFullYear()}".
    2.  **CRUZAMENTO DE DADOS:** 
        -   Se a Data Com foi ontem ou hoje, marque claramente.
    3.  **FUNDAMENTOS:**
        -   Busque o P/VP e DY atuais.
        -   Analise as manchetes recentes (últimos 15 dias) para o Sentimento.

    REGRAS DE SAÍDA JSON (RÍGIDAS):
    -   Retorne APENAS o JSON válido.
    -   Datas devem ser YYYY-MM-DD.

    SCHEMA JSON ALVO:
    {
      "sys": { "ipca": number },
      "data": [
        {
          "t": "TICKER",
          "type": "FII" | "ACAO",
          "segment": "Setor Exato",
          "fund": {
             "pvp": number,
             "pl": number,
             "dy": number,
             "liq": "string",
             "cotistas": "string",
             "desc": "Resumo",
             "mcap": "string",
             "sent": "Otimista" | "Neutro" | "Pessimista", 
             "sent_r": "Justificativa"
          },
          "divs": [
             { 
               "com": "YYYY-MM-DD",
               "pag": "YYYY-MM-DD",
               "val": number,
               "tipo": "DIVIDENDO" | "JCP" | "RENDIMENTO"
             }
          ]
        }
      ]
    }
    `;

    // LOCKED MODEL: gemini-2.5-flash
    const response = await ai.models.generateContent({
        model: LOCKED_MODEL_ID, 
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}], // Ferramenta de busca essencial
            temperature: 0.1, // Temperatura baixa para precisão factual
            thinkingConfig: { thinkingBudget: 16384 }, // Budget ajustado para eficiência
        },
    });
    
    let parsedJson: any;
    try {
      const responseText = response.text;
      if (responseText) {
          let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBrace = cleanText.indexOf('{');
          const lastBrace = cleanText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
              cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          }
          parsedJson = JSON.parse(cleanText);
      } else {
          throw new Error("Resposta vazia da IA");
      }
    } catch (parseError) {
      console.error("Erro Parse JSON:", parseError);
      throw new Error("Falha formato IA");
    }

    const metadata: any = {};
    const aiDividends: any[] = [];
    
    if (parsedJson.data) {
      for (const asset of parsedJson.data) {
          const ticker = asset.t ? asset.t.trim().toUpperCase() : '';
          if (!ticker) continue;

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
          
          if (asset.divs && Array.isArray(asset.divs)) {
            for (const div of asset.divs) {
                const normalizedDateCom = normalizeDate(div.com);
                const normalizedDatePag = normalizeDate(div.pag);
                
                if (normalizedDateCom) {
                    aiDividends.push({
                        ticker: ticker,
                        type: div.tipo ? div.tipo.toUpperCase() : 'DIVIDENDO', 
                        dateCom: normalizedDateCom,
                        paymentDate: normalizedDatePag || normalizedDateCom,
                        rate: normalizeValue(div.val),
                    });
                }
            }
          }
      }
    }

    // 3. Salva os novos dados da IA no Supabase (Async - não bloqueia UI)
    upsertDividendsToCloud(aiDividends);

    // 4. Merge: Junta o histórico do banco com as novidades da IA
    // Remove duplicatas baseado em Ticker + DataPagamento + Valor
    const combinedDividends = [...storedDividends];
    
    aiDividends.forEach(aiDiv => {
        const exists = combinedDividends.some(
            dbDiv => dbDiv.ticker === aiDiv.ticker && 
                     dbDiv.paymentDate === aiDiv.paymentDate && 
                     Math.abs(dbDiv.rate - aiDiv.rate) < 0.001 // Tolerância float
        );
        if (!exists) {
            combinedDividends.push({
                ...aiDiv,
                quantityOwned: 0, 
                totalReceived: 0
            });
        }
    });
    
    const data = { 
        dividends: combinedDividends, 
        metadata, 
        indicators: {
            ipca_cumulative: normalizeValue(parsedJson.sys?.ipca),
            start_date_used: aiSearchStartDate || ''
        }
    };
    
    // Cache local também é atualizado
    if (data.metadata && Object.keys(data.metadata).length > 0) {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tickerKey: tickerKey,
            data: data
        }));
    }
    
    return data;

  } catch (error: any) {
    console.error("Erro Gemini:", error.message);
    const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
    if (oldCache) {
        const parsed = JSON.parse(oldCache);
        return { ...parsed.data, error: 'api_error_fallback' };
    }
    // Fallback: Se der erro na IA, pelo menos retorna o que tem no banco
    const storedOnly = await fetchStoredDividends(uniqueTickers);
    if (storedOnly.length > 0) {
        return { dividends: storedOnly, metadata: {}, error: 'partial_data_db_only' };
    }
    return { dividends: [], metadata: {}, error: error.message };
  }
};
