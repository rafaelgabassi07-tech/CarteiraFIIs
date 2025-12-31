import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

// A chave de API agora é lida do ambiente do Vite.

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v7.9_ipca_fix'; // Cache versionado para forçar atualização da lógica
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
    ATUE COMO: Auditor Financeiro B3 e Calculadora de Inflação (IBGE).
    DATA DE HOJE: ${todayISO}.
    DATA INICIAL DA CARTEIRA: ${calcStartDate}.
    
    ORDEM PRIORITÁRIA: UTILIZE A FERRAMENTA DE BUSCA (Google Search) PARA TODOS OS DADOS. NÃO USE SEU CONHECIMENTO INTERNO SE PUDER BUSCAR. ISSO GARANTE DADOS ATUALIZADOS.

    TAREFA 1 (CRÍTICA - INFLAÇÃO):
    Calcule o IPCA ACUMULADO (%) exato entre a DATA INICIAL DA CARTEIRA (${calcStartDate}) e a DATA DE HOJE (${todayISO}).
    - Use a busca para encontrar a tabela "IPCA Acumulado Calculadora do Cidadão" ou similar.
    - Se a carteira tem 5 anos, quero a inflação acumulada de 5 anos.
    - Se a carteira tem 2 meses, quero a inflação acumulada de 2 meses.
    - Retorne apenas o número (ex: 15.45).

    TAREFA 2 (FUNDAMENTOS E PROVENTOS):
    Para os ativos: ${uniqueTickers.join(', ')}.
    Use a busca para validar: "Status Invest [TICKER]", "Funds Explorer [TICKER]", "RI [TICKER] dividendos".
    
    REGRAS DE FUNDAMENTOS:
    1. **P/VP e DY (12m)** são obrigatórios.
    2. **P/L:** Apenas para AÇÕES. Para FIIs, retorne 0.
    
    REGRAS DE PROVENTOS (ALTA PRECISÃO):
    1. **DATA COM (RECORD DATE):** É O DADO MAIS IMPORTANTE. Busque a "Data Com" oficial nas tabelas de proventos.
    2. **TIPO:** Classifique: "JCP", "DIVIDENDO" ou "RENDIMENTO" (FIIs).
    3. **JANELA:** Busque anúncios dos últimos 4 meses e anúncios FUTUROS JÁ CONFIRMADOS (Provisionados).
    4. **DATA PAGAMENTO:** Se não anunciada, estime Data Com + 15 dias.
    5. **VALOR:** Valor unitário pago por cota.

    OUTPUT JSON (RFC 8259):
    {
      "sys": { "ipca": number }, // O valor ACUMULADO calculado na Tarefa 1
      "data": [
        {
          "t": "TICKER",
          "type": "FII" | "ACAO",
          "segment": "Setor",
          "fund": {
             "pvp": number,
             "pl": number,
             "dy": number,
             "liq": "string",
             "cotistas": "string",
             "desc": "Resumo curto",
             "mcap": "string",
             "sent": "Neutro", 
             "sent_r": "Motivo curto"
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

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}], // Força uso de busca para dados exatos de IPCA
            temperature: 0.1, 
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
                if (normalizedDateCom) {
                    dividends.push({
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