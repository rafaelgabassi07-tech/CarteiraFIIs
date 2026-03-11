
import { BrapiQuote } from '../types';

// Função segura para obter o Token com fallback
const getBrapiToken = () => {
    // 1. Tenta via import.meta.env (Padrão Vite - Recomendado: VITE_BRAPI_TOKEN)
    const viteToken = import.meta.env.VITE_BRAPI_TOKEN;
    if (viteToken) return viteToken;

    // 2. Tenta via process.env (Injeção via define no vite.config.ts: BRAPI_TOKEN)
    // O Vite substitui 'process.env.BRAPI_TOKEN' pelo valor string durante o build.
    // Removemos a verificação de 'process' para permitir que a substituição funcione mesmo no browser.
    try {
        // @ts-ignore
        const envToken = process.env.BRAPI_TOKEN;
        if (envToken) return envToken.replace(/"/g, '');
    } catch (e) {
        // Ignora ReferenceError se process não estiver definido e a substituição não ocorrer
    }

    return '';
};

const BRAPI_TOKEN = getBrapiToken();
console.log('[BrapiService] Token Loaded:', BRAPI_TOKEN ? `YES (Length: ${BRAPI_TOKEN.length})` : 'NO');

export const isTokenValid = () => !!BRAPI_TOKEN && BRAPI_TOKEN.length > 5;

/**
 * Busca cotações de ativos na API da Brapi.
 * Alterado para buscar UM POR VEZ (individualmente) conforme solicitado,
 * mas em paralelo para performance.
 */
const LOGO_OVERRIDES: Record<string, string> = {
  'BTCI11': 'https://s3-sa-east-1.amazonaws.com/static.itau.com.br/marcas/logo-itau.png',
  'KNCR11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNIP11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNRI11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'HGLG11': 'https://www.credit-suisse.com/etc/designs/cs/images/logo.png',
  'HGBS11': 'https://www.credit-suisse.com/etc/designs/cs/images/logo.png',
  'MXRF11': 'https://www.xpi.com.br/assets/images/logo-xp.png',
  'XPLG11': 'https://www.xpi.com.br/assets/images/logo-xp.png',
  'XPML11': 'https://www.xpi.com.br/assets/images/logo-xp.png',
  'VISC11': 'https://vincipartners.com/wp-content/themes/vinci/assets/img/logo-vinci.png',
  'VILG11': 'https://vincipartners.com/wp-content/themes/vinci/assets/img/logo-vinci.png',
  'BTLG11': 'https://www.btgpactual.com/assets/images/logo-btg-pactual.svg',
  'BRCR11': 'https://www.btgpactual.com/assets/images/logo-btg-pactual.svg',
  'BCFF11': 'https://www.btgpactual.com/assets/images/logo-btg-pactual.svg',
  'ALZR11': 'https://alziracapital.com/wp-content/uploads/2021/03/logo-alzira.png',
  'MCCI11': 'https://mauacapital.com/wp-content/themes/maua/assets/img/logo-maua.png',
  'RECT11': 'https://realestatecapital.com.br/wp-content/themes/rec/assets/img/logo-rec.png',
  'RECR11': 'https://realestatecapital.com.br/wp-content/themes/rec/assets/img/logo-rec.png',
  'TGAR11': 'https://tgcore.com.br/wp-content/themes/tgcore/assets/img/logo-tgcore.png',
  'HCTR11': 'https://hectarecapital.com.br/wp-content/themes/hectare/assets/img/logo-hectare.png',
  'DEVA11': 'https://devantcapital.com.br/wp-content/themes/devant/assets/img/logo-devant.png',
  'IRDM11': 'https://iridiumgestao.com.br/wp-content/themes/iridium/assets/img/logo-iridium.png',
  'CPTS11': 'https://capitania.com.br/wp-content/themes/capitania/assets/img/logo-capitania.png',
  'RBRR11': 'https://rbrasset.com.br/wp-content/themes/rbr/assets/img/logo-rbr.png',
  'RBRP11': 'https://rbrasset.com.br/wp-content/themes/rbr/assets/img/logo-rbr.png',
  'VGIR11': 'https://valorainvestimentos.com.br/wp-content/themes/valora/assets/img/logo-valora.png',
  'VGIP11': 'https://valorainvestimentos.com.br/wp-content/themes/valora/assets/img/logo-valora.png',
  'RZTR11': 'https://rizacapital.com.br/wp-content/themes/riza/assets/img/logo-riza.png',
  'RZAK11': 'https://rizacapital.com.br/wp-content/themes/riza/assets/img/logo-riza.png',
  'RZAT11': 'https://rizacapital.com.br/wp-content/themes/riza/assets/img/logo-riza.png',
  'TRXF11': 'https://trx.com.br/wp-content/themes/trx/assets/img/logo-trx.png',
  'GGRC11': 'https://ggrinvestimentos.com.br/wp-content/themes/ggr/assets/img/logo-ggr.png',
  'VINO11': 'https://vincipartners.com/wp-content/themes/vinci/assets/img/logo-vinci.png',
  'PVBI11': 'https://vbi-realestate.com/wp-content/themes/vbi/assets/img/logo-vbi.png',
  'LVBI11': 'https://vbi-realestate.com/wp-content/themes/vbi/assets/img/logo-vbi.png',
  'CVBI11': 'https://vbi-realestate.com/wp-content/themes/vbi/assets/img/logo-vbi.png',
  'RVBI11': 'https://vbi-realestate.com/wp-content/themes/vbi/assets/img/logo-vbi.png',
};

export const searchAssets = async (query: string): Promise<{ results: any[], error?: string }> => {
  if (!isTokenValid()) {
    return { results: [], error: "Token não configurado" };
  }
  try {
    const response = await fetch(`https://brapi.dev/api/quote/list?search=${encodeURIComponent(query)}&limit=5&token=${BRAPI_TOKEN}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      return { results: [], error: "Erro na busca" };
    }
    const data = await response.json();
    return { results: data.stocks || [] };
  } catch (e) {
    return { results: [], error: "Erro de conexão API" };
  }
};

export const getQuotes = async (tickers: string[]): Promise<{ quotes: BrapiQuote[], error?: string }> => {
  if (!tickers || tickers.length === 0) {
    return { quotes: [] };
  }
  
  if (!isTokenValid()) {
    console.warn("[BrapiService] Token not found or invalid. Cotações em tempo real indisponíveis.");
    return { quotes: [], error: "Token não configurado" };
  }

  const uniqueTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
  
  try {
    // Busca individual (um request por ticker) em paralelo
    const promises = uniqueTickers.map(async (ticker) => {
        try {
            const response = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${BRAPI_TOKEN}`, {
                cache: 'no-store'
            });

            if (!response.ok) {
                console.warn(`[BrapiService] Falha ao buscar ${ticker}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                const quote = data.results[0] as BrapiQuote;
                
                // 1. Tenta Override
                if (LOGO_OVERRIDES[ticker]) {
                    quote.logourl = LOGO_OVERRIDES[ticker];
                } 
                // 2. Se não tiver logo ou for placeholder genérico, tenta o CDN da Brapi
                else if (!quote.logourl || quote.logourl.includes('placeholder')) {
                    quote.logourl = `https://static.brapi.dev/logo/${ticker}.png`;
                }

                return quote;
            }
            return null;
        } catch (err) {
            console.error(`[BrapiService] Erro ao buscar ${ticker}`, err);
            return null;
        }
    });

    const results = await Promise.all(promises);
    const validQuotes = results.filter((q): q is BrapiQuote => q !== null);

    return { quotes: validQuotes };

  } catch (e: any) {
    console.error("Brapi Service Error:", e);
    return { quotes: [], error: "Erro de conexão API" };
  }
};
