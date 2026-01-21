
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

// Função de Fetch com Retry
async function fetchHTML(url: string, referer: string) {
    for (let i = 0; i < 2; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: {
                    'User-Agent': getRandomAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': referer,
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 9000
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; 
            if (i === 1) throw e;
            await new Promise(r => setTimeout(r, 1500));
        }
    }
}

// --- HELPERS DE PARSING ---

function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === 'N/A') return 0;

    try {
        // Tenta capturar a primeira sequência numérica válida que pareça um float BR ou US
        // Ex: R$ 1.234,56 -> 1234.56
        str = str.replace(/[R$%\s]/g, '');
        str = str.replace(/\./g, ''); // Remove milhar
        str = str.replace(',', '.'); // Decimais
        
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    } catch { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    // Remove acentos, lowercase, remove caracteres especiais
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

// --- MAPA DE DADOS ---
// Mapeia chaves normalizadas (do HTML) para colunas do Banco de Dados
const KEY_MAP: Record<string, string> = {
    // Cotação
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    
    // Valuation
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonialporcota': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'ev/ebitda': 'ev_ebitda', 'evebitda': 'ev_ebitda',
    
    // Eficiência
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'margemebit': 'margem_ebit',
    'dividaliquida/ebitda': 'divida_liquida_ebitda', 'dl/ebitda': 'divida_liquida_ebitda',
    
    // Crescimento
    'cagrreceita5anos': 'cagr_receita_5a', 'cagrreceita': 'cagr_receita_5a',
    'cagrlucros5anos': 'cagr_lucros_5a', 'cagrlucro': 'cagr_lucros_5a',
    
    // FIIs Específico
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento', 'ultrendimento': 'ultimo_rendimento',
    'patrimonioliquido': 'patrimonio_liquido',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas',
    'taxadeadministracao': 'taxa_adm',
    'segmento': 'segmento',
    'tipodegestao': 'tipo_gestao',
    
    // Geral
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'val_mercado'
};

// ---------------------------------------------------------
// SCRAPER ENGINE
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        
        // Tenta URLs em ordem de probabilidade
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

        // ESTRATÉGIA 1: Cards do Topo (Geralmente contêm Cotação, DY, P/VP, P/L)
        // Refinado para buscar em estruturas aninhadas
        $('div._card').each((_, el) => {
            const key = $(el).find('div._card-header').text();
            const val = $(el).find('div._card-body').text();
            if (key && val) {
                const norm = normalizeKey(key);
                if (KEY_MAP[norm]) extracted[KEY_MAP[norm]] = val.trim();
            }
        });

        // ESTRATÉGIA FII: Cards Específicos de FIIs (#cards-ticker)
        $('#cards-ticker ._card').each((_, el) => {
             const key = $(el).find('._card-header span').text() || $(el).find('._card-header').text();
             const val = $(el).find('._card-body span').text() || $(el).find('._card-body').text();
             if (key && val) {
                const norm = normalizeKey(key);
                if (KEY_MAP[norm]) extracted[KEY_MAP[norm]] = val.trim();
             }
        });

        // ESTRATÉGIA 2: Células de Tabela (Indicadores, Dados FIIs)
        $('.cell').each((_, el) => {
            const key = $(el).find('.name').text() || $(el).find('span').first().text();
            const val = $(el).find('.value').text() || $(el).find('span').last().text();
            if (key && val) {
                const norm = normalizeKey(key);
                if (KEY_MAP[norm] && !extracted[KEY_MAP[norm]]) extracted[KEY_MAP[norm]] = val.trim();
            }
        });

        // ESTRATÉGIA 3: Tabelas Genéricas (Fallback)
        $('table tr').each((_, tr) => {
            const tds = $(tr).find('td');
            if (tds.length >= 2) {
                const key = $(tds[0]).text();
                const val = $(tds[1]).text();
                if (key && val) {
                    const norm = normalizeKey(key);
                    if (KEY_MAP[norm] && !extracted[KEY_MAP[norm]]) extracted[KEY_MAP[norm]] = val.trim();
                }
            }
        });

        // ESTRATÉGIA 4: Cotação Específica (Header)
        if (!extracted.cotacao_atual) {
            const headerPrice = $('div._card.cotacao div._card-body').text();
            if (headerPrice) extracted.cotacao_atual = headerPrice;
        }

        // PÓS-PROCESSAMENTO
        const result = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            segmento: extracted.segmento || 'Geral',
            updated_at: new Date().toISOString(),
            
            // Valores Numéricos
            cotacao_atual: parseValue(extracted.cotacao_atual),
            dy: parseValue(extracted.dy),
            pvp: parseValue(extracted.pvp),
            pl: parseValue(extracted.pl),
            roe: parseValue(extracted.roe),
            vp_cota: parseValue(extracted.vp_cota),
            lpa: parseValue(extracted.lpa),
            vacancia: parseValue(extracted.vacancia),
            ultimo_rendimento: parseValue(extracted.ultimo_rendimento),
            
            // Margens e Dívidas
            margem_liquida: parseValue(extracted.margem_liquida),
            margem_bruta: parseValue(extracted.margem_bruta),
            divida_liquida_ebitda: parseValue(extracted.divida_liquida_ebitda),
            ev_ebitda: parseValue(extracted.ev_ebitda),
            cagr_receita_5a: parseValue(extracted.cagr_receita_5a),
            cagr_lucros_5a: parseValue(extracted.cagr_lucros_5a),

            // Strings / Mistos
            liquidez: extracted.liquidez || 'N/A',
            val_mercado: extracted.val_mercado || 'N/A',
            tipo_gestao: extracted.tipo_gestao || 'N/A',
            taxa_adm: extracted.taxa_adm || 'N/A',
            patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
            num_cotistas: extracted.num_cotistas || 'N/A'
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
        const t = ticker.toUpperCase().replace(/F$/, '');
        let type = 'acoes';
        if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33') || t.endsWith('34')) type = 'fiis'; 

        const refererUrl = `https://statusinvest.com.br/${type}/${t.toLowerCase()}`;
        const apiUrl = `https://statusinvest.com.br/${type}/companytickerprovents?ticker=${t}&chartProventsType=2`;

        const data = await fetchHTML(apiUrl, refererUrl);
        const earnings = data.assetEarningsModels || [];

        return earnings.map((d: any) => {
            const parseDateJSON = (dStr: string) => {
                if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                const parts = dStr.split('/');
                if (parts.length !== 3) return null;
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            };
            
            let labelTipo = 'REND'; 
            if (d.et === 1) labelTipo = 'DIV';
            if (d.et === 2) labelTipo = 'JCP';
            if (d.et === 3) labelTipo = 'REND'; 
            
            return {
                ticker: ticker.toUpperCase(),
                type: labelTipo,
                date_com: parseDateJSON(d.ed),
                payment_date: parseDateJSON(d.pd),
                rate: d.v
            };
        }).filter((d: any) => d.payment_date !== null && d.rate > 0);

    } catch (error: any) { 
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
        const metadata = await scrapeInvestidor10(ticker);
        
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

            const { error: metaError } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (metaError) console.error('Supabase Meta Error:', metaError);
        }

        const proventos = await scrapeStatusInvestProventos(ticker);
        if (proventos.length > 0) {
             await supabase.from('market_dividends').upsert(proventos, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        if (!metadata) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados.' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends: proventos });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
