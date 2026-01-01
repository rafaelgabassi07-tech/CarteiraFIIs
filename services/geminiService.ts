import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

// A chave de API agora é lida do ambiente do Vite.

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v9.0_smart_auditor'; // Cache versionado para nova lógica
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

  // Fix: Ensure correct initialization using process.env.API_KEY directly
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
    
    // Prompt "Smart Auditor"
    // Foca obsessivamente na diferença entre Dividendos e JCP e na Data Com correta.
    const prompt = `
    CONTEXTO: Você é um Auditor Financeiro Senior e Analista de Mercado B3.
    DATA HOJE: ${todayISO}.
    JANELA: Eventos ocorridos ou anunciados entre ${calcStartDate} e hoje, INCLUINDO provisões futuras já anunciadas.
    
    ATIVOS: ${uniqueTickers.join(', ')}.

    INSTRUÇÕES RÍGIDAS DE AUDITORIA:
    1. PROVENTOS (CRÍTICO):
       - Diferencie "DIVIDENDO" (Isento) de "JCP" (Tributado).
       - DATA COM (Record Date): É a data MAIS IMPORTANTE. É o dia final que o acionista precisava ter o papel. Não confunda com data de anúncio ou pagamento.
       - VALOR LÍQUIDO: Para JCP, se possível, forneça o valor líquido (após 15% IR). Se não achar, mande o bruto mas marque como "JCP".
       - Busque fontes confiáveis (RI das empresas, Status Invest, B3).

    2. INTELIGÊNCIA DE MERCADO (SENTIMENTO):
       - Para cada ativo, analise rapidamente as notícias recentes (últimos 30 dias).
       - Defina o sentimento: "Otimista", "Neutro" ou "Pessimista".
       - Dê uma razão curta (max 10 palavras). Ex: "Lucro recorde 4T24", "Incerteza fiscal", "Vacância alta".

    3. IPCA ACUMULADO:
       - Busque o índice oficial exato acumulado de ${calcStartDate} até hoje.

    FORMATO JSON OBRIGATÓRIO (RFC 8259):
    {
      "sys": { "ipca": number },
      "data": [
        {
          "t": "TICKER",
          "type": "FII" | "ACAO",
          "segment": "Setor",
          "fund": {
             "pvp": number,
             "pl": number, // 0 para FIIs
             "dy": number, // Yield 12m %
             "liq": "string (ex: 2.5M)",
             "cotistas": "string",
             "desc": "Resumo de 1 linha",
             "mcap": "string",
             "sent": "Otimista" | "Neutro" | "Pessimista", 
             "sent_r": "Motivo curto da analise"
          },
          "divs": [
             { 
               "com": "YYYY-MM-DD", 
               "pag": "YYYY-MM-DD", 
               "val": number, // Valor unitário
               "tipo": "DIVIDENDO" | "JCP" | "RENDIMENTO"
             }
          ]
        }
      ]
    }
    `;

    // Fix: Using gemini-3-pro-preview for complex reasoning task as per guidelines
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview", 
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}], // Obrigatório para dados live
            temperature: 0.1, // Baixa criatividade para evitar alucinação de números
        },
    });
    
    let parsedJson: any;
    try {
      // Fix: Access .text property directly
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
