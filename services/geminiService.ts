
import { GoogleGenAI } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
}

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v6.6.1_pro'; // Cache Key Updated
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 Horas de Cache

// --- Parsers Robustos ---

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  
  // ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  // BR (DD/MM/YYYY)
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
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
  
  let str = String(val).trim();
  
  // Remove currency symbols (R$, $, etc) and whitespace
  str = str.replace(/[^\d.,-]/g, '');

  if (!str) return 0;

  // Lógica para detectar decimal:
  // Se tem vírgula e ponto: 1.200,50 -> remove ponto, troca virgula por ponto
  if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
          // Formato BR: 1.000,00
          str = str.replace(/\./g, '').replace(',', '.');
      } else {
          // Formato US incorreto misturado: 1,000.00 -> remove virgula
          str = str.replace(/,/g, '');
      }
  } 
  // Se só tem vírgula: 10,50 -> troca por ponto
  else if (str.includes(',')) {
      str = str.replace(',', '.');
  }
  // Se só tem ponto, assume que é decimal se tiver poucas casas ou se o valor for pequeno
  // Mas cuidado com 1.000 (mil). Normalmente APIs retornam floats puros (10.5)

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  // Remove duplicatas e normaliza
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');
  
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

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  
  // Define a data de início da carteira (ou 1 de jan do ano atual se não houver)
  const portfolioStart = startDate || `${currentYear}-01-01`; 

  console.log(`🤖 [Gemini] Buscando dados. Início da Carteira: ${portfolioStart}`);

  // Prompt Especializado em Proventos (FIIs & Ações) e IPCA Personalizado
  const prompt = `
    DATA DE HOJE: ${today}.
    DATA INICIAL DA CARTEIRA: ${portfolioStart}.
    CONTEXTO: Aplicativo financeiro brasileiro.
    ATIVOS ALVO: ${uniqueTickers.join(', ')}.

    TAREFA CRÍTICA:
    Para cada ativo, pesquise no Google Search os dados mais recentes de:
    1. PROVENTOS (Dividendos/JCP/Rendimentos) anunciados recentemente.
       - Prioridade MÁXIMA para datas futuras (Data Com ou Pagamento futuros).
       - Busque "Aviso aos Acionistas [TICKER] ${currentYear}" ou "Relatório Gerencial [TICKER]".
    2. FUNDAMENTOS ATUAIS.
    3. SENTIMENTO DE MERCADO.
    
    4. DADOS MACROECONÔMICOS (CRUCIAL):
       - Calcule ou pesquise a inflação acumulada (IPCA - IBGE) do Brasil EXATAMENTE desde a DATA INICIAL DA CARTEIRA (${portfolioStart}) até a data de hoje (${today}).
       - Se a data for recente (ex: menos de 1 mês), retorne o IPCA do mês corrente ou último disponível.
       - O campo "sys.ipca" deve conter esse valor percentual acumulado no período específico.

    RETORNO OBRIGATÓRIO (JSON PURO):
    {
      "sys": { 
        "ipca": number, // Ex: 2.5 (significa 2.5% acumulado desde ${portfolioStart})
        "ref_date": "${today}" 
      },
      "data": [
        {
          "t": "TICKER",
          "type": "FII" | "ACAO",
          "segment": "Setor Exato",
          "fund": {
            "pvp": number,
            "pl": number,
            "dy12": number,
            "liq": "string",
            "mkcap": "string",
            "sent": "Otimista/Neutro/Pessimista",
            "reason": "Motivo curto"
          },
          "divs": [
            {
              "type": "DIVIDENDO" | "JCP" | "RENDIMENTO",
              "datacom": "YYYY-MM-DD",
              "paydate": "YYYY-MM-DD",
              "val": number
            }
          ]
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
        // Instrução de sistema para forçar precisão matemática e formatação
        systemInstruction: "Você é um assistente especializado em mercado financeiro B3. Sua prioridade é precisão em DATAS e VALORES monetários. O IPCA deve ser calculado com base na data de início fornecida. Retorne apenas JSON válido RFC8259.",
        temperature: 0.1, 
      }
    });

    let text = response.text;
    if (!text) throw new Error("IA retornou resposta vazia");
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (jsonErr) {
        console.error("Erro de Parse JSON:", jsonErr, text);
        throw new Error("Formato inválido da IA");
    }

    const result: UnifiedMarketData = { 
        dividends: [], 
        metadata: {},
        indicators: {
            ipca_cumulative: normalizeValue(parsed.sys?.ipca || 0),
            start_date_used: portfolioStart
        }
    };

    if (parsed.data && Array.isArray(parsed.data)) {
      parsed.data.forEach((asset: any) => {
        const ticker = asset.t?.toUpperCase().trim();
        if (!ticker) return;

        const type = (asset.type === 'FII' || ticker.endsWith('11')) ? AssetType.FII : AssetType.STOCK;
        
        result.metadata[ticker] = {
            segment: asset.segment || (type === AssetType.FII ? 'Fundo Imobiliário' : 'Ações'),
            type: type,
            fundamentals: {
                p_vp: normalizeValue(asset.fund?.pvp),
                p_l: normalizeValue(asset.fund?.pl),
                dy_12m: normalizeValue(asset.fund?.dy12),
                liquidity: asset.fund?.liq || '-',
                market_cap: asset.fund?.mkcap || '-',
                sentiment: asset.fund?.sent || 'Neutro',
                sentiment_reason: asset.fund?.reason || 'Análise indisponível no momento.',
                shareholders: '-' 
            }
        };

        if (asset.divs && Array.isArray(asset.divs)) {
            asset.divs.forEach((d: any) => {
                const val = normalizeValue(d.val);
                const dc = normalizeDate(d.datacom);
                const dp = normalizeDate(d.paydate);

                if (val > 0 && dc) {
                    const typeLabel = (d.type || 'DIVIDENDO').toUpperCase();
                    const uniqueId = `${ticker}-${dc}-${val.toFixed(4)}`;
                    
                    result.dividends.push({
                        id: uniqueId,
                        ticker: ticker,
                        type: typeLabel,
                        dateCom: dc,
                        paymentDate: dp || dc, 
                        rate: val,
                        quantityOwned: 0,
                        totalReceived: 0,
                        assetType: type
                    });
                }
            });
        }
      });
    }

    if (result.metadata && Object.keys(result.metadata).length > 0) {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tickerKey: tickerKey,
            data: result
        }));
    }

    return result;

  } catch (error) {
    console.error("Gemini Critical Error:", error);
    const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
    if (oldCache) {
        return JSON.parse(oldCache).data;
    }
    return { dividends: [], metadata: {} };
  }
};
