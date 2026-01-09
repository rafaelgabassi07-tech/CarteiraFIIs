
import { BrapiQuote } from '../types';

// Suporte tanto para o padrão Vite (import.meta.env) quanto para o legado (process.env)
const BRAPI_TOKEN = (import.meta as any).env?.VITE_BRAPI_TOKEN || process.env.BRAPI_TOKEN;

// Função auxiliar para esperar (delay)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// 🔒 SYSTEM LOCK: BRAPI REQUEST LOGIC (INDIVIDUAL MODE)
// A lógica agora faz requisições estritamente sequenciais (uma após a outra).
// Isso garante estabilidade máxima e evita condições de corrida na API.
// ============================================================================

/**
 * Busca cotações de ativos na API da Brapi.
 * Realiza requisições individualmente, ativo por ativo.
 * @param tickers - Array de tickers para buscar.
 * @returns Um objeto com as cotações e um possível erro.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!BRAPI_TOKEN) {
    const errorMsg = "Chave da API Brapi não encontrada. Configure VITE_BRAPI_TOKEN no .env";
    console.error(errorMsg);
    return { quotes: [], error: errorMsg };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  console.log(`📈 [Brapi Service] Buscando ${uniqueTickers.length} ativos (Modo Individual)...`);

  const validQuotes: BrapiQuote[] = [];
  const DELAY_BETWEEN_REQUESTS = 100; // Pequeno intervalo para não floodar a rede

  try {
    // Itera um por um (Sequencial)
    for (const ticker of uniqueTickers) {
        const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}&range=1d&interval=1d`;
        
        try {
            const response = await fetch(url);

            if (response.status === 429) {
                console.warn(`⚠️ [Brapi] Rate Limit no ativo ${ticker}. Pulando...`);
                // Em modo individual, apenas pulamos este e esperamos um pouco mais
                await delay(1000); 
                continue;
            }

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.error(`❌ [Brapi] Token Inválido ao buscar ${ticker}.`);
                }
                // Se falhar (404, etc), apenas loga e continua para o próximo
                console.warn(`⚠️ [Brapi] Falha ao buscar ${ticker}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                validQuotes.push(data.results[0]);
            }

        } catch (err) {
            console.warn(`❌ [Brapi] Erro de rede ao buscar ${ticker}`);
        }

        // Delay de cortesia entre requisições
        await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    console.log(`✅ [Brapi Service] Finalizado: ${validQuotes.length}/${uniqueTickers.length} obtidos.`);
    return { quotes: validQuotes };

  } catch (e: any) {
    console.error("Erro geral no serviço Brapi:", e.message);
    return { quotes: [], error: "Erro ao processar cotações." };
  }
};
