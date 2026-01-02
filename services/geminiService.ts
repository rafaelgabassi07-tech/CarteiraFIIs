
import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

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
// Updated to gemini-3-pro-preview for advanced reasoning as per latest SDK guidelines.
const LOCKED_MODEL_ID = "gemini-3-pro-preview";
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
  
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ [Gemini] Usando Cache Inteligente");
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
    
    // Define a data de início padrão se não fornecida (12 meses atrás)
    let calcStartDate = startDate;
    if (!calcStartDate) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        calcStartDate = d.toISOString().split('T')[0];
    }
    
    // Prompt "Forensic Auditor" - Otimizado para Thinking Model
    const prompt = `
    VOCÊ É UM AUDITOR FORENSE DE MERCADO DE CAPITAIS (B3).
    Sua missão é extrair dados EXATOS e COMPROVÁVEIS.
    
    DATA BASE (HOJE): ${todayISO}
    PERÍODO DE ANÁLISE: ${calcStartDate} até o futuro (provisões).
    ATIVOS ALVO: ${uniqueTickers.join(', ')}.

    PROTOCOLO DE INVESTIGAÇÃO (Use seu Thinking Process para isso):
    1.  **BUSCA PRIMÁRIA:** Para cada ativo, busque "Histórico de proventos {TICKER} {ANO}", "Aviso aos Acionistas {TICKER}", "Fato Relevante proventos {TICKER}".
    2.  **CRUZAMENTO DE DADOS:** 
        -   Compare datas de "DATA COM" (Record Date) vs "DATA PAGAMENTO" (Payment Date). 
        -   A "DATA COM" é a data limite para ter o ativo. Se a Data Com foi ontem, o usuário já perdeu o direito se comprar hoje.
    3.  **DETECÇÃO DE JCP:** 
        -   JCP (Juros sobre Capital Próprio) tem 15% de IR retido na fonte.
        -   Se encontrar valor BRUTO, tente calcular o LÍQUIDO (Valor * 0.85) ou busque explicitamente o "valor líquido por ação".
    4.  **FUNDAMENTOS EM TEMPO REAL:**
        -   Busque o P/VP e DY atuais.
        -   Analise as manchetes recentes (últimos 15 dias) para determinar o Sentimento (Otimista/Neutro/Pessimista). Seja crítico.

    REGRAS DE SAÍDA JSON (RÍGIDAS):
    -   Retorne APENAS o JSON válido. Sem markdown, sem texto antes ou depois.
    -   Se não houver dividendos no período, retorne array vazio, não invente.
    -   Datas devem ser YYYY-MM-DD.

    SCHEMA JSON ALVO:
    {
      "sys": { "ipca": number }, // IPCA acumulado exato do período
      "data": [
        {
          "t": "TICKER",
          "type": "FII" | "ACAO",
          "segment": "Setor Exato (ex: Logística, Bancos)",
          "fund": {
             "pvp": number,
             "pl": number, // 0 para FIIs
             "dy": number, // Yield 12m %
             "liq": "string (ex: 2.5M)",
             "cotistas": "string",
             "desc": "Resumo técnico de 1 linha",
             "mcap": "string",
             "sent": "Otimista" | "Neutro" | "Pessimista", 
             "sent_r": "Justificativa factual baseada em notícias recentes"
          },
          "divs": [
             { 
               "com": "YYYY-MM-DD", // CRÍTICO: Data de corte
               "pag": "YYYY-MM-DD", // Data do dinheiro na conta
               "val": number, // Valor monetário unitário
               "tipo": "DIVIDENDO" | "JCP" | "RENDIMENTO"
             }
          ]
        }
      ]
    }
    `;

    // LOCKED MODEL: gemini-3-pro-preview
    // DO NOT CHANGE WITHOUT USER REQUEST
    const response = await ai.models.generateContent({
        model: LOCKED_MODEL_ID, 
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}], // Ferramenta de busca essencial
            temperature: 0.1, // Temperatura baixa para precisão factual
            // ATIVAÇÃO DO "CÉREBRO": Thinking Config
            // Permite que o modelo "pense", planeje as buscas e critique seus próprios resultados
            // antes de gerar a resposta final. Essencial para auditoria de datas.
            thinkingConfig: { thinkingBudget: 32768 }, 
        },
    });
    
    let parsedJson: any;
    try {
      // Accessing .text property directly as per Gemini API guidelines.
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
    const dividends: any[] = [];
    
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
                
                // Só adiciona se tiver Data Com válida (obrigatória para entitlement)
                if (normalizedDateCom) {
                    dividends.push({
                        ticker: ticker,
                        type: div.tipo ? div.tipo.toUpperCase() : 'DIVIDENDO', 
                        dateCom: normalizedDateCom,
                        paymentDate: normalizedDatePag || normalizedDateCom, // Se não tiver data pag, usa a com (raro)
                        rate: normalizeValue(div.val),
                    });
                }
            }
          }
      }
    }
    
    const data = { 
        dividends, 
        metadata, 
        indicators: {
            ipca_cumulative: normalizeValue(parsedJson.sys?.ipca),
            start_date_used: calcStartDate
        }
    };
    
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
    return { dividends: [], metadata: {}, error: error.message };
  }
};
