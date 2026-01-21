
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- CONFIGURAÇÃO AXIOS ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false
});

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function fetchHTML(url: string, referer: string) {
    for (let i = 0; i < 2; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: {
                    'User-Agent': getRandomAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': referer,
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; 
            if (i === 1) throw e;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

// --- HELPERS DE PARSING AVANÇADO ---

function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === 'N/A' || str === '--') return 0;

    try {
        const isNegative = str.startsWith('-');
        str = str.replace(/[^0-9,.-]/g, ''); 
        
        if (str.includes(',')) {
            str = str.replace(/\./g, ''); // Remove milhar
            str = str.replace(',', '.');  // Decimal
        }

        const num = parseFloat(str);
        if (isNaN(num)) return 0;
        return isNegative && num > 0 ? -num : num;
    } catch { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, "") // Remove especiais
        .trim();
}

const parseBrDate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (str === '-' || str === '') return null;
    
    // DD/MM/YYYY
    if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const parts = str.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
}

// Mapa de chaves normalizadas para colunas do Banco de Dados
const KEY_MAP: Record<string, string> = {
    // Cotação
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    
    // Valuation
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonialporcota': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'evebitda': 'ev_ebitda',
    
    // Eficiência
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'margemebit': 'margem_ebit',
    'dividaliquidaebitda': 'divida_liquida_ebitda',
    
    // Crescimento
    'cagrreceita5anos': 'cagr_receita_5a', 
    'cagrlucros5anos': 'cagr_lucros_5a',
    
    // FIIs Específico
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento', 'ultrendimento': 'ultimo_rendimento',
    'patrimonioliquido': 'patrimonio_liquido',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas',
    'taxadeadministracao': 'taxa_adm',
    'segmento': 'segmento', 'segmentodeatuacao': 'segmento',
    'tipodegestao': 'tipo_gestao',
    
    // Geral
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'val_mercado'
};

// ---------------------------------------------------------
// SCRAPER ENGINE "HUNTER"
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        
        const strategies = isFII 
            ? [`/fiis/${ticker.toLowerCase()}/`, `/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`]
            : [`/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`, `/fiis/${ticker.toLowerCase()}/`];

        let html = null;
        let finalType = isFII ? 'FII' : 'ACAO';

        for (const path of strategies) {
            try {
                html = await fetchHTML(`https://investidor10.com.br${path}`, 'https://investidor10.com.br');
                if (path.includes('fiis')) finalType = 'FII';
                else if (path.includes('bdrs')) finalType = 'BDR';
                else finalType = 'ACAO';
                break;
            } catch (e) { /* continue */ }
        }

        if (!html) throw new Error('Página não encontrada');

        const $ = cheerio.load(html);
        const extracted: any = {};

        // 1. Extração de Metadados (Cards)
        $('span, div, td, strong, b, h3, h4').each((_, el) => {
            const text = $(el).clone().children().remove().end().text().trim();
            if (!text || text.length > 50) return; 

            const normText = normalizeKey(text);
            
            if (KEY_MAP[normText]) {
                const dbKey = KEY_MAP[normText];
                if (extracted[dbKey]) return;

                let value = $(el).next().text().trim();
                if (!value) value = $(el).siblings('.value').text().trim();
                if (!value) value = $(el).siblings('span').text().trim();
                
                if (!value) {
                    const parent = $(el).parent();
                    value = parent.find('.value').text().trim();
                    if (!value) value = parent.next().text().trim();
                    if (!value) value = parent.find('div[class*="body"] span').text().trim();
                    if (!value) value = parent.find('span').last().text().trim();
                }

                if (!value && $(el).is('td')) {
                    value = $(el).next('td').text().trim();
                }

                if (value && (/[0-9]/.test(value) || value === '-')) {
                    extracted[dbKey] = value;
                }
            }
        });

        // Fallbacks
        if (!extracted.cotacao_atual) {
            const headerVal = $('div._card.cotacao div._card-body span').text();
            if (headerVal) extracted.cotacao_atual = headerVal;
        }

        // 2. Extração de Dividendos (Tabela Histórica)
        // Isso captura pagamentos provisionados que o StatusInvest pode não mostrar
        const dividends: any[] = [];
        $('#table-dividends-history tbody tr').each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length >= 3) {
                // Colunas típicas: Tipo | Data Com | Data Pagamento | Valor
                const typeRaw = $(tds[0]).text().trim().toLowerCase();
                const dateComRaw = $(tds[1]).text().trim();
                const datePayRaw = $(tds[2]).text().trim();
                const valRaw = $(tds[3]).text().trim();

                const dateCom = parseBrDate(dateComRaw);
                const datePay = parseBrDate(datePayRaw); // Pode ser null se for "-"
                const val = parseValue(valRaw);

                // Normalização de Nomenclaturas
                let type = 'DIV';
                if (typeRaw.includes('juros') || typeRaw.includes('jcp')) type = 'JCP';
                else if (typeRaw.includes('rendimento')) type = 'REND';
                else if (typeRaw.includes('amortiza') || typeRaw.includes('restitui')) type = 'AMORT';
                else if (typeRaw.includes('dividend')) type = 'DIV';

                if (dateCom && val > 0) {
                    dividends.push({
                        ticker: ticker.toUpperCase(),
                        type,
                        date_com: dateCom,
                        payment_date: datePay || null, // Se null, é futuro sem data definida (mas raro no INV10)
                        rate: val,
                        source: 'INV10'
                    });
                }
            }
        });

        const result = {
            metadata: {
                ticker: ticker.toUpperCase(),
                type: finalType,
                segmento: extracted.segmento || 'Geral',
                updated_at: new Date().toISOString(),
                
                // Mapeamento explícito para o Supabase
                cotacao_atual: parseValue(extracted.cotacao_atual),
                dy: parseValue(extracted.dy),
                pvp: parseValue(extracted.pvp),
                pl: parseValue(extracted.pl),
                roe: parseValue(extracted.roe),
                vp_cota: parseValue(extracted.vp_cota),
                lpa: parseValue(extracted.lpa),
                vacancia: parseValue(extracted.vacancia),
                ultimo_rendimento: parseValue(extracted.ultimo_rendimento),
                margem_liquida: parseValue(extracted.margem_liquida),
                margem_bruta: parseValue(extracted.margem_bruta),
                divida_liquida_ebitda: parseValue(extracted.divida_liquida_ebitda),
                ev_ebitda: parseValue(extracted.ev_ebitda),
                cagr_receita_5a: parseValue(extracted.cagr_receita_5a),
                cagr_lucros_5a: parseValue(extracted.cagr_lucros_5a),
                liquidez: extracted.liquidez || 'N/A',
                val_mercado: extracted.val_mercado || 'N/A',
                tipo_gestao: extracted.tipo_gestao || 'N/A',
                taxa_adm: extracted.taxa_adm || 'N/A',
                patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
                num_cotistas: extracted.num_cotistas || 'N/A'
            },
            dividends: dividends
        };

        return result;

    } catch (e: any) {
        console.error(`Erro Scraping ${ticker}: ${e.message}`);
        return null;
    }
}

// ---------------------------------------------------------
// PROVENTOS (STATUS INVEST)
// ---------------------------------------------------------
async function scrapeStatusInvestProventos(ticker: string) {
    try {
        const t = ticker.toUpperCase().replace(/F$/, ''); // ITSA4F -> ITSA4
        let type = 'acoes';
        if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33') || t.endsWith('34')) type = 'fiis'; 

        const refererUrl = `https://statusinvest.com.br/${type}/${t.toLowerCase()}`;
        
        // chartProventsType=1 costuma trazer tudo (pagos e provisionados) ou 2 para pagos. 
        // Tentamos 2 padrão, mas o app quer futuros também.
        // O StatusInvest às vezes separa provisionados em outro endpoint, mas aqui vamos tentar o geral.
        const apiUrl = `https://statusinvest.com.br/${type}/companytickerprovents?ticker=${t}&chartProventsType=2`;

        const data = await fetchHTML(apiUrl, refererUrl);
        
        // StatusInvest retorna { assetEarningsModels: [...] }
        const earnings = data.assetEarningsModels || [];

        return earnings.map((d: any) => {
            const parseDateJSON = (dStr: string) => {
                if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                if (dStr.includes('/')) {
                    const parts = dStr.split('/');
                    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                if (dStr.includes('-') && dStr.length >= 10) return dStr.substring(0, 10);
                return null;
            };
            
            // Tipos Avançados
            let labelTipo = 'REND'; 
            const labelLower = String(d.etLabel || '').toLowerCase();

            if (d.et === 1) labelTipo = 'DIV';
            else if (d.et === 2) labelTipo = 'JCP';
            else if (d.et === 3 || type === 'fiis') labelTipo = 'REND';
            // Detecção via texto (mais seguro)
            else if (labelLower.includes('juros') || labelLower.includes('jcp')) labelTipo = 'JCP';
            else if (labelLower.includes('dividendo')) labelTipo = 'DIV';
            else if (labelLower.includes('amortiza') || labelLower.includes('restitui')) labelTipo = 'AMORT';
            
            return {
                ticker: ticker.toUpperCase(),
                type: labelTipo,
                date_com: parseDateJSON(d.ed),
                payment_date: parseDateJSON(d.pd),
                rate: d.v,
                source: 'STATUS'
            };
        }).filter((d: any) => d.rate > 0 && d.date_com); // Permite sem payment_date se for futuro

    } catch (error: any) { 
        console.warn(`Erro scraping proventos ${ticker}: ${error.message}`);
        return []; 
    }
}

// ---------------------------------------------------------
// HANDLER
// ---------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        // Executa em paralelo
        const [inv10Data, statusData] = await Promise.all([
            scrapeInvestidor10(ticker),
            scrapeStatusInvestProventos(ticker)
        ]);
        
        const metadata = inv10Data?.metadata;
        const inv10Dividends = inv10Data?.dividends || [];
        const statusDividends = statusData || [];

        // FUSÃO DE DIVIDENDOS (Merge inteligente)
        // Prioriza StatusInvest (geralmente mais limpo), mas preenche lacunas com Investidor10
        // Especialmente para "provisionados" que o StatusInvest pode esconder em type=2
        const finalDividends = [...statusDividends];
        
        inv10Dividends.forEach(dInv => {
            // Verifica duplicidade (mesmo tipo, valor e data com)
            const exists = finalDividends.find(dStatus => 
                dStatus.type === dInv.type &&
                dStatus.date_com === dInv.date_com &&
                Math.abs(dStatus.rate - dInv.rate) < 0.0001
            );

            if (!exists) {
                // Se não existe, adiciona (provavelmente é um futuro que só tem no INV10)
                finalDividends.push(dInv);
            } else {
                // Se existe, enriquece. Se StatusInvest não tinha data de pagamento (ex: futuro), mas INV10 tem
                if (!exists.payment_date && dInv.payment_date) {
                    exists.payment_date = dInv.payment_date;
                }
            }
        });

        // Persistência
        if (metadata) {
            const dbPayload = {
                ticker: metadata.ticker,
                type: metadata.type,
                segment: metadata.segmento,
                pvp: metadata.pvp,
                pl: metadata.pl,
                dy_12m: metadata.dy,
                roe: metadata.roe,
                vacancia: metadata.vacancia,
                liquidez: metadata.liquidez,
                valor_mercado: metadata.val_mercado,
                updated_at: metadata.updated_at,
                lpa: metadata.lpa,
                vpa: metadata.vp_cota, 
                vp_cota: metadata.vp_cota,
                margem_liquida: metadata.margem_liquida,
                margem_bruta: metadata.margem_bruta,
                divida_liquida_ebitda: metadata.divida_liquida_ebitda,
                ev_ebitda: metadata.ev_ebitda,
                cagr_receita: metadata.cagr_receita_5a,
                cagr_lucro: metadata.cagr_lucros_5a,
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm,
                ultimo_rendimento: metadata.ultimo_rendimento
            };

            // Limpa undefined
            Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

            const { error: metaError } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (metaError) console.error('Supabase Meta Error:', metaError);
        }

        if (finalDividends.length > 0) {
             // Prepara payload final, filtrando campos auxiliares
             const divPayload = finalDividends.map(d => ({
                 ticker: d.ticker,
                 type: d.type,
                 date_com: d.date_com,
                 payment_date: d.payment_date || '2099-12-31', // Garante que entre no banco mesmo sem data (placeholder futuro)
                 rate: d.rate
             }));

             await supabase.from('market_dividends').upsert(divPayload, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        if (!metadata) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados.' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends: finalDividends });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
