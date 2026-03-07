
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
  'BTCI11': 'https://logodownload.org/wp-content/uploads/2018/09/btg-pactual-logo-1.png',
  'KNCR11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNIP11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNRI11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'HGLG11': 'https://logodownload.org/wp-content/uploads/2019/08/credit-suisse-logo.png',
  'HGBS11': 'https://logodownload.org/wp-content/uploads/2019/08/credit-suisse-logo.png',
  'MXRF11': 'https://logodownload.org/wp-content/uploads/2019/11/xp-investimentos-logo.png',
  'XPLG11': 'https://logodownload.org/wp-content/uploads/2019/11/xp-investimentos-logo.png',
  'XPML11': 'https://logodownload.org/wp-content/uploads/2019/11/xp-investimentos-logo.png',
  'VISC11': 'https://vincipartners.com/wp-content/uploads/2020/06/vince-partners-logo.png',
  'VILG11': 'https://vincipartners.com/wp-content/uploads/2020/06/vince-partners-logo.png',
  'BTLG11': 'https://logodownload.org/wp-content/uploads/2018/09/btg-pactual-logo-1.png',
  'BRCR11': 'https://logodownload.org/wp-content/uploads/2018/09/btg-pactual-logo-1.png',
  'BCFF11': 'https://logodownload.org/wp-content/uploads/2018/09/btg-pactual-logo-1.png',
  'ALZR11': 'https://alziracapital.com/wp-content/uploads/2021/03/logo-alzira.png',
  'MCCI11': 'https://mauacapital.com/wp-content/uploads/2020/06/logo-maua.png',
  'RECT11': 'https://realestatecapital.com.br/wp-content/uploads/2020/06/logo-rec.png',
  'RECR11': 'https://realestatecapital.com.br/wp-content/uploads/2020/06/logo-rec.png',
  'TGAR11': 'https://tgcore.com.br/wp-content/uploads/2020/06/logo-tgcore.png',
  'HCTR11': 'https://hectarecapital.com.br/wp-content/uploads/2020/06/logo-hectare.png',
  'DEVA11': 'https://devantcapital.com.br/wp-content/uploads/2020/06/logo-devant.png',
  'IRDM11': 'https://iridiumgestao.com.br/wp-content/uploads/2020/06/logo-iridium.png',
  'CPTS11': 'https://capitânia.com.br/wp-content/uploads/2020/06/logo-capitania.png',
  'RBRR11': 'https://rbrasset.com.br/wp-content/uploads/2020/06/logo-rbr.png',
  'RBRP11': 'https://rbrasset.com.br/wp-content/uploads/2020/06/logo-rbr.png',
  'VGIR11': 'https://valora.com.br/wp-content/uploads/2020/06/logo-valora.png',
  'VGIP11': 'https://valora.com.br/wp-content/uploads/2020/06/logo-valora.png',
  'PLCR11': 'https://plurallcapital.com.br/wp-content/uploads/2020/06/logo-plurall.png',
  'GALG11': 'https://guardiancapital.com.br/wp-content/uploads/2020/06/logo-guardian.png',
  'TRXF11': 'https://trx.com.br/wp-content/uploads/2020/06/logo-trx.png',
  'GGRC11': 'https://ggrinvestimentos.com.br/wp-content/uploads/2020/06/logo-ggr.png',
  'VINO11': 'https://vincipartners.com/wp-content/uploads/2020/06/vince-partners-logo.png',
  'VRTA11': 'https://fator.com.br/wp-content/uploads/2020/06/logo-fator.png',
  'GTWR11': 'https://green-towers.com.br/wp-content/uploads/2020/06/logo-green-towers.png',
  'JSRE11': 'https://safra.com.br/wp-content/uploads/2020/06/logo-safra.png',
  'PVBI11': 'https://vbi-realestate.com/wp-content/uploads/2020/06/logo-vbi.png',
  'LVBI11': 'https://vbi-realestate.com/wp-content/uploads/2020/06/logo-vbi.png',
  'CVBI11': 'https://vbi-realestate.com/wp-content/uploads/2020/06/logo-vbi.png',
  'RVBI11': 'https://vbi-realestate.com/wp-content/uploads/2020/06/logo-vbi.png',
  'RZTR11': 'https://rizacapital.com.br/wp-content/uploads/2020/06/logo-riza.png',
  'RZAK11': 'https://rizacapital.com.br/wp-content/uploads/2020/06/logo-riza.png',
  'KNSC11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KFOF11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNCA11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNPW11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNRE11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNHY11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNPR11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNDP11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNID11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNSH11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'KNCC11': 'https://kinea.com.br/wp-content/uploads/2021/07/logo-kinea.png',
  'MALU11': 'https://logodownload.org/wp-content/uploads/2019/08/magalu-logo.png',
  'WEGE3': 'https://logodownload.org/wp-content/uploads/2019/08/weg-logo.png',
  'PETR4': 'https://logodownload.org/wp-content/uploads/2014/05/petrobras-logo.png',
  'VALE3': 'https://logodownload.org/wp-content/uploads/2014/05/vale-logo.png',
  'ITUB4': 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo.png',
  'BBDC4': 'https://logodownload.org/wp-content/uploads/2014/05/bradesco-logo.png',
  'BBAS3': 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo.png',
  'SANB11': 'https://logodownload.org/wp-content/uploads/2014/05/santander-logo.png',
  'ABEV3': 'https://logodownload.org/wp-content/uploads/2014/05/ambev-logo.png',
  'MGLU3': 'https://logodownload.org/wp-content/uploads/2019/08/magalu-logo.png',
  'B3SA3': 'https://logodownload.org/wp-content/uploads/2017/05/b3-logo.png',
  'RENT3': 'https://logodownload.org/wp-content/uploads/2017/05/localiza-logo.png',
  'SUZB3': 'https://logodownload.org/wp-content/uploads/2017/05/suzano-logo.png',
  'GGBR4': 'https://logodownload.org/wp-content/uploads/2017/05/gerdau-logo.png',
  'CSNA3': 'https://logodownload.org/wp-content/uploads/2017/05/csn-logo.png',
  'JBSS3': 'https://logodownload.org/wp-content/uploads/2017/05/jbs-logo.png',
  'BRFS3': 'https://logodownload.org/wp-content/uploads/2017/05/brf-logo.png',
  'MRFG3': 'https://logodownload.org/wp-content/uploads/2017/05/marfrig-logo.png',
  'BEEF3': 'https://logodownload.org/wp-content/uploads/2017/05/minerva-logo.png',
  'RAIZ4': 'https://logodownload.org/wp-content/uploads/2021/08/raizen-logo.png',
  'VBBR3': 'https://logodownload.org/wp-content/uploads/2017/05/vibra-energia-logo.png',
  'UGPA3': 'https://logodownload.org/wp-content/uploads/2017/05/ultrapar-logo.png',
  'HYPE3': 'https://logodownload.org/wp-content/uploads/2017/05/hypera-logo.png',
  'RADL3': 'https://logodownload.org/wp-content/uploads/2017/05/raiadrogasil-logo.png',
  'LREN3': 'https://logodownload.org/wp-content/uploads/2017/05/lojas-renner-logo.png',
  'AMER3': 'https://logodownload.org/wp-content/uploads/2017/05/americanas-logo.png',
  'VIIA3': 'https://logodownload.org/wp-content/uploads/2017/05/via-varejo-logo.png',
  'ASAI3': 'https://logodownload.org/wp-content/uploads/2021/03/assai-logo.png',
  'CRFB3': 'https://logodownload.org/wp-content/uploads/2017/05/carrefour-logo.png',
  'PCAR3': 'https://logodownload.org/wp-content/uploads/2017/05/pao-de-acucar-logo.png',
  'NTCO3': 'https://logodownload.org/wp-content/uploads/2017/05/natura-logo.png',
  'ELET3': 'https://logodownload.org/wp-content/uploads/2017/05/eletrobras-logo.png',
  'CPFE3': 'https://logodownload.org/wp-content/uploads/2017/05/cpfl-logo.png',
  'EQTL3': 'https://logodownload.org/wp-content/uploads/2017/05/equatorial-logo.png',
  'ENGI11': 'https://logodownload.org/wp-content/uploads/2017/05/energisa-logo.png',
  'EGIE3': 'https://logodownload.org/wp-content/uploads/2017/05/engie-logo.png',
  'TRPL4': 'https://logodownload.org/wp-content/uploads/2017/05/isa-cteep-logo.png',
  'TAEE11': 'https://logodownload.org/wp-content/uploads/2017/05/taesa-logo.png',
  'ALUP11': 'https://logodownload.org/wp-content/uploads/2017/05/alupar-logo.png',
  'CSAN3': 'https://logodownload.org/wp-content/uploads/2017/05/cosan-logo.png',
  'VIVT3': 'https://logodownload.org/wp-content/uploads/2014/05/vivo-logo.png',
  'TIMS3': 'https://logodownload.org/wp-content/uploads/2014/05/tim-logo.png',
  'SBSP3': 'https://logodownload.org/wp-content/uploads/2017/05/sabesp-logo.png',
  'SANB3': 'https://logodownload.org/wp-content/uploads/2014/05/santander-logo.png',
  'BPAC11': 'https://logodownload.org/wp-content/uploads/2018/09/btg-pactual-logo-1.png',
  'BBSE3': 'https://logodownload.org/wp-content/uploads/2014/05/bb-seguridade-logo.png',
  'PSSA3': 'https://logodownload.org/wp-content/uploads/2017/05/porto-seguro-logo.png',
  'IRBR3': 'https://logodownload.org/wp-content/uploads/2017/05/irb-brasil-logo.png',
  'WIZS3': 'https://logodownload.org/wp-content/uploads/2017/05/wiz-logo.png',
  'BRAP4': 'https://logodownload.org/wp-content/uploads/2014/05/bradespar-logo.png',
  'GOAU4': 'https://logodownload.org/wp-content/uploads/2017/05/gerdau-metalurgica-logo.png',
  'USIM5': 'https://logodownload.org/wp-content/uploads/2017/05/usiminas-logo.png',
  'CVCB3': 'https://logodownload.org/wp-content/uploads/2017/05/cvc-logo.png',
  'AZUL4': 'https://logodownload.org/wp-content/uploads/2017/05/azul-logo.png',
  'GOLL4': 'https://logodownload.org/wp-content/uploads/2017/05/gol-logo.png',
  'EMBR3': 'https://logodownload.org/wp-content/uploads/2017/05/embraer-logo.png',
  'TOTS3': 'https://logodownload.org/wp-content/uploads/2017/05/totvs-logo.png',
  'LWSA3': 'https://logodownload.org/wp-content/uploads/2020/06/locaweb-logo.png',
  'CASH3': 'https://logodownload.org/wp-content/uploads/2021/01/meliuz-logo.png',
  'POSI3': 'https://logodownload.org/wp-content/uploads/2017/05/positivo-logo.png',
  'MULT3': 'https://logodownload.org/wp-content/uploads/2017/05/multiplan-logo.png',
  'IGTI11': 'https://logodownload.org/wp-content/uploads/2017/05/iguatemi-logo.png',
  'CYRE3': 'https://logodownload.org/wp-content/uploads/2017/05/cyrela-logo.png',
  'MRVE3': 'https://logodownload.org/wp-content/uploads/2017/05/mrv-logo.png',
  'EZTC3': 'https://logodownload.org/wp-content/uploads/2017/05/eztec-logo.png',
  'JHSF3': 'https://logodownload.org/wp-content/uploads/2017/05/jhsf-logo.png',
  'DIRR3': 'https://logodownload.org/wp-content/uploads/2017/05/direcional-logo.png',
  'TEND3': 'https://logodownload.org/wp-content/uploads/2017/05/tenda-logo.png',
  'EVEN3': 'https://logodownload.org/wp-content/uploads/2017/05/even-logo.png',
  'CURY3': 'https://logodownload.org/wp-content/uploads/2017/05/cury-logo.png',
  'PLPL3': 'https://logodownload.org/wp-content/uploads/2017/05/plano-e-plano-logo.png',
  'MDNE3': 'https://logodownload.org/wp-content/uploads/2017/05/moura-dubeux-logo.png',
  'LAVV3': 'https://logodownload.org/wp-content/uploads/2017/05/lavvi-logo.png',
  'MELK3': 'https://logodownload.org/wp-content/uploads/2017/05/melnick-logo.png',
  'MTRE3': 'https://logodownload.org/wp-content/uploads/2017/05/mitre-logo.png',
  'TRIS3': 'https://logodownload.org/wp-content/uploads/2017/05/trisul-logo.png',
  'HBOR3': 'https://logodownload.org/wp-content/uploads/2017/05/helbor-logo.png',
  'SULA11': 'https://logodownload.org/wp-content/uploads/2017/05/sulamerica-logo.png',
  'QUAL3': 'https://logodownload.org/wp-content/uploads/2017/05/qualicorp-logo.png',
  'ODPV3': 'https://logodownload.org/wp-content/uploads/2017/05/odontoprev-logo.png',
  'FLRY3': 'https://logodownload.org/wp-content/uploads/2017/05/fleury-logo.png',
  'PARD3': 'https://logodownload.org/wp-content/uploads/2017/05/hermes-pardini-logo.png',
  'SMTO3': 'https://logodownload.org/wp-content/uploads/2017/05/sao-martinho-logo.png',
  'SLCE3': 'https://logodownload.org/wp-content/uploads/2017/05/slc-agricola-logo.png',
  'AGRO3': 'https://logodownload.org/wp-content/uploads/2017/05/brasilagro-logo.png',
  'MDIA3': 'https://logodownload.org/wp-content/uploads/2017/05/m-dias-branco-logo.png',
  'CAML3': 'https://logodownload.org/wp-content/uploads/2017/05/camil-logo.png',
  'SMFT3': 'https://logodownload.org/wp-content/uploads/2021/07/smartfit-logo.png',
  'ARZZ3': 'https://logodownload.org/wp-content/uploads/2017/05/arezzo-logo.png',
  'SOMA3': 'https://logodownload.org/wp-content/uploads/2020/07/grupo-soma-logo.png',
  'ALPA4': 'https://logodownload.org/wp-content/uploads/2017/05/alpargatas-logo.png',
  'GRND3': 'https://logodownload.org/wp-content/uploads/2017/05/grendene-logo.png',
  'VULC3': 'https://logodownload.org/wp-content/uploads/2017/05/vulcabras-logo.png',
  'LJQQ3': 'https://logodownload.org/wp-content/uploads/2017/05/quero-quero-logo.png',
  'AMBP3': 'https://logodownload.org/wp-content/uploads/2020/07/ambipar-logo.png',
  'SIMH3': 'https://logodownload.org/wp-content/uploads/2020/07/simpar-logo.png',
  'JSLG3': 'https://logodownload.org/wp-content/uploads/2017/05/jsl-logo.png',
  'MOVI3': 'https://logodownload.org/wp-content/uploads/2017/05/movida-logo.png',
  'STBP3': 'https://logodownload.org/wp-content/uploads/2017/05/santos-brasil-logo.png',
  'PORT3': 'https://logodownload.org/wp-content/uploads/2017/05/wilson-sons-logo.png',
  'RAIL3': 'https://logodownload.org/wp-content/uploads/2017/05/rumo-logo.png',
  'LOGN3': 'https://logodownload.org/wp-content/uploads/2017/05/log-in-logo.png',
  'TGMA3': 'https://logodownload.org/wp-content/uploads/2017/05/tegma-logo.png',
  'VLID3': 'https://logodownload.org/wp-content/uploads/2017/05/valid-logo.png',
  'TUPY3': 'https://logodownload.org/wp-content/uploads/2017/05/tupy-logo.png',
  'POMO4': 'https://logodownload.org/wp-content/uploads/2017/05/marcopolo-logo.png',
  'RAPT4': 'https://logodownload.org/wp-content/uploads/2017/05/randon-logo.png',
  'MYPK3': 'https://logodownload.org/wp-content/uploads/2017/05/iochpe-maxion-logo.png',
  'LEVE3': 'https://logodownload.org/wp-content/uploads/2017/05/mahle-metal-leve-logo.png',
  'SHUL4': 'https://logodownload.org/wp-content/uploads/2017/05/schulz-logo.png',
  'KEPL3': 'https://logodownload.org/wp-content/uploads/2017/05/kepler-weber-logo.png',
  'ROMI3': 'https://logodownload.org/wp-content/uploads/2017/05/industrias-romi-logo.png',
  'AERI3': 'https://logodownload.org/wp-content/uploads/2020/11/aeris-energy-logo.png',
  'UNIP6': 'https://logodownload.org/wp-content/uploads/2017/05/unipar-logo.png',
  'BRKM5': 'https://logodownload.org/wp-content/uploads/2017/05/braskem-logo.png',
  'DXCO3': 'https://logodownload.org/wp-content/uploads/2017/05/dexco-logo.png',
  'KLBN11': 'https://logodownload.org/wp-content/uploads/2017/05/klabin-logo.png',
  'RANI3': 'https://logodownload.org/wp-content/uploads/2017/05/irani-logo.png',
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
                // Apply Logo Override
                if (LOGO_OVERRIDES[ticker]) {
                    quote.logourl = LOGO_OVERRIDES[ticker];
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
