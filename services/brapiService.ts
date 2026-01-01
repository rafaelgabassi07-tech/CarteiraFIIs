
import { BrapiQuote } from '../types';

// A chave de API agora é lida do ambiente do Vite.
const BRAPI_TOKEN = process.env.BRAPI_TOKEN;

// ============================================================================
// 🔒 SYSTEM LOCK: BRAPI REQUEST LOGIC
// ============================================================================
// ATENÇÃO: A lógica abaixo foi definida especificamente para realizar requisições
// individuais por ticker (Single Request per Asset) para garantir estabilidade.
// NÃO ALTERE a forma como o 'fetch' é realizado ou como o array de promises
// é construído, a menos que solicitado EXPLICITAMENTE pelo usuário.
// ============================================================================

/**
 * Busca cotações de ativos na API da Brapi.
 * Agora realiza uma requisição individual por ativo (1 request por ticker).
 * @param tickers - Array de tickers para buscar.
 * @returns Um objeto com as cotações e um possível erro.
 */
export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  if (!BRAPI_TOKEN) {
    const errorMsg = "Chave da API Brapi (BRAPI_TOKEN) não configurada no .env";
    console.error(errorMsg);
    // Retorna vazio mas loga erro crítico para o desenvolvedor
    return { quotes: [], error: errorMsg };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  // Log de diagnóstico
  console.log(`📈 [Brapi Service] Buscando cotações para ${uniqueTickers.length} ativos...`);

  try {
    // 🔒 LOCKED: Promise.all com map individual. Não agrupar tickers na URL.
    const fetchPromises = uniqueTickers.map(async (ticker) => {
      const url = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}&range=1d&interval=1d`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
           console.warn(`⚠️ [Brapi] Falha ao buscar ${ticker}: HTTP ${response.status}`);
           return null;
        }
        const data = await response.json();
        // A Brapi retorna { results: [...] } mesmo para single quote
        return data.results && data.results.length > 0 ? data.results[0] : null;
      } catch (err) {
        console.warn(`❌ [Brapi] Erro de rede ao buscar ${ticker}`, err);
        return null;
      }
    });

    // Aguarda todas as requisições terminarem (em paralelo)
    const results = await Promise.all(fetchPromises);

    // Filtra nulos (falhas)
    const validQuotes = results.filter((q): q is BrapiQuote => q !== null);
    
    console.log(`✅ [Brapi Service] Sucesso: ${validQuotes.length}/${uniqueTickers.length} cotações obtidas.`);

    return { quotes: validQuotes };

  } catch (e: any) {
    console.error("Erro geral no serviço Brapi:", e.message);
    return { quotes: [], error: "Erro ao processar cotações." };
  }
};
// ============================================================================
// 🔒 END LOCK
// ============================================================================
