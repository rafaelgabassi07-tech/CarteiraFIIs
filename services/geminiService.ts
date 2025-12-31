import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

// A chave de API agora é lida do ambiente do Vite.

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v8.0_strict_datacom'; // Cache versionado
const QUOTA_COOLDOWN_KEY = 'investfiis_quota_cooldown'; 

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

  const apiKey = process.env.API_KEY;
  if (!apiKey) return { dividends: [], metadata: {}, error: "API_KEY ausente" };

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    const todayISO = new Date().toISOString().split('T')[0];
    
    // Define a data de início padrão se não fornecida (12 meses atrás)
    let calcStartDate = startDate;
    if (!calcStartDate) {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        calcStartDate = d.toISOString().split('T')[0];
    }
    
    // Prompt OTIMIZADO para Auditoria de Proventos e IPCA Acumulado EXATO pela Data
    const prompt = `
    ATUE COMO: Auditor Financeiro B3 especializado em Eventos Corporativos (Proventos).
    DATA DE HOJE: ${todayISO}.
    JANELA DE ANÁLISE: De ${calcStartDate} até Hoje + Previsões Futuras (Provisionados).
    
    ATIVOS ALVO: ${uniqueTickers.join(', ')}.

    VOCÊ DEVE USAR O "GOOGLE SEARCH" PARA CADA ATIVO. NÃO ALUCINE DADOS.
    
    TAREFA 1 (CRÍTICA - DATA COM):
    Para calcular dividendos corretamente, a "DATA COM" (Record Date) é mais importante que a data de pagamento.
    - Busque tabelas oficiais de proventos (Status Invest, Funds Explorer, RI).
    - Para cada evento (Dividendo, JCP/JSCP, Rendimento), extraia:
      1. DATA COM (Record Date): O dia limite para ter a ação e receber.
      2. DATA PAGAMENTO: Quando o dinheiro cai.
      3. VALOR LÍQUIDO PREFERENCIALMENTE (se JCP, tente achar o valor líquido, senão bruto).
    
    TAREFA 2 (IPCA):
    Busque o IPCA ACUMULADO exato entre ${calcStartDate} e ${todayISO}. Retorne apenas o número (ex: 5.43).

    TAREFA 3 (FUNDAMENTOS):
    P/VP, DY (12m), Liquidez, Setor. Para FIIs, P/L é 0.

    OUTPUT JSON (RFC 8259) - ESTRUTURA RÍGIDA:
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
             "liq": "string (ex: 2.5M)",
             "cotistas": "string",
             "desc": "Resumo",
             "mcap": "string",
             "sent": "Neutro", 
             "sent_r": "Motivo"
          },
          "divs": [
             { 
               "com": "YYYY-MM-DD",  <-- EXTREMAMENTE IMPORTANTE
               "pag": "YYYY-MM-DD", 
               "val": number, 
               "tipo": "DIVIDENDO" | "JCP" | "RENDIMENTO" 
             }
          ]
        }
      ]
    }
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}], // Força uso de busca para dados exatos
            temperature: 0.0, // Zero criatividade, máxima precisão
        },
    });
    
    let parsedJson: any;
    try {
      if (response.text) {
          let cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
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
                
                // Só adiciona se tiver Data Com válida, pois é essencial para o cálculo
                if (normalizedDateCom) {
                    dividends.push({
                        ticker: ticker,
                        type: div.tipo ? div.tipo.toUpperCase() : 'DIVIDENDO', 
                        dateCom: normalizedDateCom,
                        paymentDate: normalizedDatePag || normalizedDateCom, // Fallback apenas para display, não lógica
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