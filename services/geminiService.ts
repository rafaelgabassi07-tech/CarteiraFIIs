import { GoogleGenAI, Type } from "@google/genai";
import { DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from "../types";

export interface UnifiedMarketData {
  dividends: DividendReceipt[];
  metadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  indicators?: MarketIndicators;
  error?: string; // Flag para indicar erro de cota na UI
}

// A chave de API agora é lida do ambiente do Vite.

const GEMINI_CACHE_KEY = 'investfiis_gemini_cache_v7.2_grounded'; // Nova chave para forçar refresh com a nova lógica
const QUOTA_COOLDOWN_KEY = 'investfiis_quota_cooldown'; // Chave para o Circuit Breaker

const getAiCacheTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    // Cache mais curto durante a semana para pegar anúncios recentes, mais longo no FDS
    return isWeekend ? (24 * 60 * 60 * 1000) : (6 * 60 * 60 * 1000);
};

// --- Funções Auxiliares de Parsing ---
const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
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

/**
 * Busca dados unificados de mercado (dividendos, fundamentos) diretamente da API do Google Gemini.
 * Utiliza o modelo gemini-2.5-flash COM Google Search para garantir dados atualizados e precisos.
 */
export const fetchUnifiedMarketData = async (tickers: string[], startDate?: string, forceRefresh = false): Promise<UnifiedMarketData> => {
  if (!tickers || tickers.length === 0) return { dividends: [], metadata: {} };

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickerKey = uniqueTickers.slice().sort().join('|');
  const CACHE_TTL = getAiCacheTTL();

  // 1. Verificação do Circuit Breaker (Cota Excedida Recentemente)
  const cooldown = localStorage.getItem(QUOTA_COOLDOWN_KEY);
  if (cooldown && Date.now() < parseInt(cooldown)) {
      console.warn("🚫 [Gemini] Circuit Breaker Ativo (Cota Excedida). Usando Cache.");
      const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
      if (oldCache) {
          const parsed = JSON.parse(oldCache);
          return { ...parsed.data, error: 'quota_exceeded' };
      }
      return { dividends: [], metadata: {}, error: 'quota_exceeded' };
  }
  
  // 2. Verificação de Cache Padrão no Cliente
  if (!forceRefresh) {
    try {
        const cachedRaw = localStorage.getItem(GEMINI_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL;
            if (isFresh && cached.tickerKey === tickerKey) {
                console.log("⚡ [Gemini] Usando Cache Inteligente do Cliente");
                return cached.data;
            }
        }
    } catch (e) { console.warn("Cache Warning", e); }
  }

  console.log(`🤖 [Gemini API] Iniciando pesquisa profunda na Web para: ${uniqueTickers.join(', ')}`);

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
      const errorMsg = "Chave da API Gemini (API_KEY) não configurada.";
      console.error(errorMsg);
      return { dividends: [], metadata: {}, error: errorMsg };
  }

  try {
    // 3. Chamada direta para a API Gemini (gemini-2.5-flash) com Google Search
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    const today = new Date().toISOString().split('T')[0];
    const portfolioStart = startDate || `${new Date().getFullYear()}-01-01`;

    const prompt = `Atue como um analista de dados financeiros de alta precisão. Sua tarefa é buscar dados ATUALIZADOS na web para os ativos: ${uniqueTickers.join(', ')}.
    
    INSTRUÇÕES CRÍTICAS DE PESQUISA:
    1. Use o Google Search para encontrar os "Avisos aos Acionistas" e comunicados de proventos mais recentes (StatusInvest, FundsExplorer, RI das empresas).
    2. ATENÇÃO MÁXIMA AO JCP (Juros Sobre Capital Próprio): Muitos ativos anunciam JCP e Dividendos separadamente. Você DEVE capturar ambos. Não ignore JCP.
    3. Verifique a "Data Com", "Data Pagamento" e "Valor Líquido/Bruto" (use o líquido se possível para FIIs, bruto para Ações se não especificado, mas padronize o valor que cai na conta).
    
    RETORNO ESPERADO (JSON Rígido):
    Você deve responder APENAS um objeto JSON válido, sem markdown (sem \`\`\`json), contendo:
    {
      "sys": { "ipca": numero (ex: 4.51) },
      "data": [
        {
          "t": "TICKER",
          "type": "FII" ou "ACAO",
          "segment": "Segmento",
          "fund": {
             "pvp": numero,
             "pl": numero,
             "dy": numero (yield 12m),
             "liq": "string",
             "cotistas": "string",
             "desc": "string",
             "mcap": "string",
             "sent": "Otimista/Neutro/Pessimista",
             "sent_r": "Justificativa"
          },
          "divs": [
             { "com": "YYYY-MM-DD", "pag": "YYYY-MM-DD", "val": numero, "tipo": "DIVIDENDO" }
          ]
        }
      ]
    }
    
    Se houver discrepância, priorize fontes oficiais B3/RI. Responda APENAS o JSON.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: {
            // ATIVA O GOOGLE SEARCH PARA DADOS REAIS
            tools: [{googleSearch: {}}],
            // REMOVIDO: responseMimeType e responseSchema pois geram erro 400 com googleSearch
            temperature: 0.1, // Baixa temperatura para maior precisão factual
        },
    });
    
    // Tratamento robusto do JSON (Limpeza de Markdown)
    let parsedJson: any;
    try {
      if (response.text) {
          // Remove blocos de código markdown se a IA os adicionar, mesmo com o prompt pedindo para não
          let cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          // Remove possíveis textos antes ou depois do JSON
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
      console.error("Erro ao fazer parse do JSON da Gemini:", parseError);
      console.log("Raw Text:", response.text);
      throw new Error("Falha no processamento da resposta da IA (Formato inválido)");
    }

    const metadata: any = {};
    const dividends: any[] = [];
    
    if (parsedJson.data) {
      for (const asset of parsedJson.data) {
          // Normalização Crítica: Remove espaços e garante uppercase
          const ticker = asset.t ? asset.t.trim().toUpperCase() : '';
          
          if (!ticker) continue;

          metadata[ticker] = {
              type: asset.type === 'FII' ? 'FII' : 'ACAO', // Normalização forçada
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
          
          if (asset.divs) {
            for (const div of asset.divs) {
                const normalizedDateCom = normalizeDate(div.com);
                // Só adiciona se tiver Data Com válida para evitar erro de cálculo
                if (normalizedDateCom) {
                    dividends.push({
                        ticker: ticker,
                        type: div.tipo || 'PROVENTO', // Fallback se vier vazio
                        dateCom: normalizedDateCom,
                        paymentDate: normalizeDate(div.pag),
                        rate: normalizeValue(div.val),
                    });
                }
            }
          }
      }
    }
    
    const indicators = {
      ipca_cumulative: normalizeValue(parsedJson.sys?.ipca),
      start_date_used: portfolioStart,
    };
    
    const data = { dividends, metadata, indicators };
    
    // 4. Sucesso: Salva os dados no cache do cliente
    if (data.metadata && Object.keys(data.metadata).length > 0) {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tickerKey: tickerKey,
            data: data
        }));
    }
    
    return data;

  } catch (error: any) {
    console.error("Erro na chamada direta ao Gemini:", error.message);
    
    const isQuotaError = error.message && (error.message.toLowerCase().includes('quota') || error.message.includes('429'));
    if (isQuotaError) {
        console.error("⚠️ [Gemini] Cota Excedida. Ativando Circuit Breaker (5 min).");
        localStorage.setItem(QUOTA_COOLDOWN_KEY, (Date.now() + 5 * 60 * 1000).toString());
    }
    
    const oldCache = localStorage.getItem(GEMINI_CACHE_KEY);
    if (oldCache) {
        const parsed = JSON.parse(oldCache);
        return { ...parsed.data, error: isQuotaError ? 'quota_exceeded' : undefined };
    }
    
    return { dividends: [], metadata: {}, error: error.message };
  }
};