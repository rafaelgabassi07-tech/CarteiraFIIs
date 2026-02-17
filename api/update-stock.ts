
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 10000, 
    rejectUnauthorized: false
});

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const client = axios.create({
    httpsAgent,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://investidor10.com.br/'
    },
    timeout: 12000, 
    maxRedirects: 5
});

// --- HELPERS AVANÇADOS ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any): number | null {
    if (valueStr === undefined || valueStr === null) return null;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === '--' || str === 'N/A' || str === 'null') return null;

    const lower = str.toLowerCase();
    let multiplier = 1;
    
    if (lower.includes('bilh')) multiplier = 1e9;
    else if (lower.includes('milh')) multiplier = 1e6;
    else if (lower.includes('mil')) multiplier = 1e3;
    
    const lastChar = str.slice(-1).toUpperCase();
    if (['B', 'M', 'K'].includes(lastChar)) {
        if (lastChar === 'B') multiplier = 1e9;
        else if (lastChar === 'M') multiplier = 1e6;
        else if (lastChar === 'K') multiplier = 1e3;
    }

    str = str.replace(/^R\$\s?/, '').replace('%', '').trim();
    str = str.replace(/\s/g, '').replace(/\u00A0/g, ''); 
    str = str.replace(/[a-zA-ZçÇãÃõÕáÁéÉíÍóÓúÚ]+/g, '');

    const lastCommaIndex = str.lastIndexOf(',');
    const lastDotIndex = str.lastIndexOf('.');
    
    let clean = "";
    if (lastCommaIndex > lastDotIndex) {
        clean = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIndex > lastCommaIndex) {
        clean = str.replace(/,/g, '');
    } else {
        if (lastCommaIndex !== -1) clean = str.replace(',', '.');
        else clean = str;
    }

    clean = clean.replace(/[^0-9.-]/g, '');
    
    if (!clean) return null;
    
    const result = parseFloat(clean);
    return isNaN(result) ? null : result * multiplier;
}

function cleanDoubledString(str: string) {
    if (!str) return '';
    const parts = str.split('R$');
    if (parts.length > 2) return 'R$' + parts[1].trim();
    return str;
}

function parseDate(dateStr: string) {
    if (!dateStr || dateStr === '-' || dateStr.length < 8) return null;
    try {
        const parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return null;
    } catch { return null; }
}

// --- FIELD MATCHERS (Expandido para cobrir gaps) ---
const FIELD_MATCHERS = [
    { key: 'dy',                   indicator: ['DY', 'DIVIDEND_YIELD'], text: (t: string) => t === 'dy' || t.includes('dividend yield') || t.includes('dy (') },
    { key: 'pvp',                  indicator: ['P_VP', 'VP'],           text: (t: string) => t.includes('p/vp') || (t.includes('vp') && !t.includes('cota') && !t.includes('patrim')) },
    { key: 'pl',                   indicator: ['P_L', 'PL'],            text: (t: string) => t === 'p/l' || t.includes('p/l') },
    { key: 'roe',                  indicator: ['ROE'],                  text: (t: string) => t.replace(/\./g, '') === 'roe' },
    { key: 'lpa',                  indicator: [],                       text: (t: string) => t.replace(/\./g, '') === 'lpa' },
    { key: 'liquidez',             indicator: [],                       text: (t: string) => t.includes('liquidez') },
    { key: 'val_mercado',          indicator: [],                       text: (t: string) => t.includes('mercado') && !t.includes('patrim') },
    { key: 'variacao_12m',         indicator: [],                       text: (t: string) => (t.includes('variacao') || t.includes('rentabilidade')) && (t.includes('12m') || t.includes('12 m') || t.includes('12 meses')) },
    { key: 'ultimo_rendimento',    indicator: [],                       text: (t: string) => t.includes('ultimo rendimento') },
    { key: 'segmento',             indicator: [],                       text: (t: string) => t.includes('segmento') },
    { key: 'vacancia',             indicator: [],                       text: (t: string) => t.includes('vacancia') },
    { key: 'cnpj',                 indicator: [],                       text: (t: string) => t.includes('cnpj') },
    { key: 'num_cotistas',         indicator: [],                       text: (t: string) => t.includes('cotistas') },
    { key: 'tipo_gestao',          indicator: [],                       text: (t: string) => t.includes('gestao') },
    { key: 'mandato',              indicator: [],                       text: (t: string) => t.includes('mandato') },
    { key: 'tipo_fundo',           indicator: [],                       text: (t: string) => t.includes('tipo de fundo') },
    { key: 'prazo_duracao',        indicator: [],                       text: (t: string) => t.includes('prazo') },
    { key: 'taxa_adm',             indicator: [],                       text: (t: string) => t.includes('taxa') && t.includes('administracao') },
    { key: 'cotas_emitidas',       indicator: [],                       text: (t: string) => t.includes('cotas') && (t.includes('emitidas') || t.includes('total')) },
    { key: 'publico_alvo',         indicator: [],                       text: (t: string) => t.includes('publico') && t.includes('alvo') },
    { key: 'razao_social',         indicator: [],                       text: (t: string) => t.includes('razao social') },
    { key: 'vp_cota',              indicator: [],                       text: (t: string) => t === 'vpa' || t.replace(/\./g, '') === 'vpa' || t.includes('vp por cota') || t.includes('valor patrimonial cota') },
    { key: 'patrimonio_liquido',   indicator: [],                       text: (t: string) => t.includes('patrimonio') && (t.includes('liquido') || t.includes('liq')) },
    // Stocks
    { key: 'margem_liquida',       indicator: ['MARGEM_LIQUIDA'],       text: (t: string) => t.includes('margem liquida') },
    { key: 'margem_bruta',         indicator: [],                       text: (t: string) => t.includes('margem bruta') },
    { key: 'ev_ebitda',            indicator: [],                       text: (t: string) => t.includes('ev/ebitda') },
    { key: 'divida_liquida_ebitda',indicator: ['DIVIDA_LIQUIDA_EBITDA'],text: (t: string) => { const c = t.replace(/[\s\/\.\-]/g, ''); return c.includes('div') && c.includes('liq') && c.includes('ebitda'); } },
    { key: 'cagr_receita_5a',      indicator: [],                       text: (t: string) => t.includes('cagr') && t.includes('receita') },
    { key: 'cagr_lucros_5a',       indicator: [],                       text: (t: string) => t.includes('cagr') && t.includes('lucro') },
];

function buildProcessPair(dados: any) {
    return function processPair(tituloRaw: string, valorRaw: string, origem = 'table', indicatorAttr: string | null = null) {
        const titulo = normalize(tituloRaw);
        let valor = (valorRaw || '').trim();

        if (titulo.includes('mercado')) {
            valor = cleanDoubledString(valor);
            if (dados.val_mercado !== null && origem === 'table') return;
        }

        if (!valor) return;

        for (const matcher of FIELD_MATCHERS) {
            // Prioridade 1: data-indicator
            if (indicatorAttr && matcher.indicator.includes(indicatorAttr.toUpperCase())) {
                dados[matcher.key] = valor;
                return;
            }
            // Prioridade 2: texto
            if (matcher.text(titulo)) {
                // Só sobrescreve se ainda não tiver valor ou se for mais específico
                if (!dados[matcher.key]) dados[matcher.key] = valor;
                return;
            }
        }
    };
}

async function scrapeInvestidor10(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    const urlFii = `https://investidor10.com.br/fiis/${tickerLower}/`;
    const urlFiagro = `https://investidor10.com.br/fiagros/${tickerLower}/`;
    const urlAcao = `https://investidor10.com.br/acoes/${tickerLower}/`;
    const urlBdr = `https://investidor10.com.br/bdrs/${tickerLower}/`;

    const urls = isLikelyFii ? [urlFii, urlFiagro, urlAcao, urlBdr] : [urlAcao, urlFii, urlFiagro, urlBdr];

    let finalData: any = null;
    let finalDividends: any[] = [];
    let realEstateProperties: any[] = [];

    for (const url of urls) {
        try {
            const res = await client.get(url, {
                headers: { 'User-Agent': getRandomAgent() }
            });
            
            if (res.data.length < 5000) continue;

            const $ = cheerio.load(res.data);
            
            let type = 'ACAO';
            if (url.includes('/fiis/')) type = 'FII';
            else if (url.includes('/fiagros/')) type = 'FII';
            else if (url.includes('/bdrs/')) type = 'BDR';

            const dados: any = {
                ticker: ticker.toUpperCase(),
                type: type,
                updated_at: new Date().toISOString(),
            };

            const processPair = buildProcessPair(dados);

            // --- 1. HEADER INFO ---
            const headerPriceStr = $('#header_action').find('div._card-body span.value').text().trim();
            const headerName = $('#header_action').find('h2.name-ticker').text().trim();
            
            if (headerPriceStr) dados.cotacao_atual = parseValue(headerPriceStr);
            if (headerName) dados.name = headerName;

            // --- 2. INDICADORES (Varredura Genérica) ---
            $('._card').each((i, el) => {
                const titulo = $(el).find('._card-header').text().trim();
                const valor  = $(el).find('._card-body').text().trim();
                processPair(titulo, valor, 'card');
            });

            $('.cell').each((i, el) => {
                let titulo = $(el).find('.name').text().trim();
                if (!titulo) titulo = $(el).children('span').first().text().trim();
                const valorEl = $(el).find('.value span').first();
                const valor = valorEl.length > 0 ? valorEl.text().trim() : $(el).find('.value').text().trim();
                processPair(titulo, valor, 'cell');
            });

            $('table tbody tr').each((i, row) => {
                const cols = $(row).find('td');
                if (cols.length >= 2) {
                    const label = $(cols[0]).text().trim();
                    const val = $(cols[1]).text().trim();
                    const indicatorAttr = $(cols[0]).find('[data-indicator]').attr('data-indicator');
                    processPair(label, val, 'table', indicatorAttr || null);
                }
            });

            // Fallback Segmento
            if (!dados.segmento || dados.segmento === 'Geral') {
                $('#breadcrumbs li, .breadcrumbs li').each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt && !['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'Fiagros'].includes(txt) && txt.toUpperCase() !== ticker) {
                        dados.segmento = txt;
                    }
                });
            }

            // --- 3. RENTABILIDADE DETALHADA ---
            $('table').each((_, table) => {
                const headerText = $(table).text().toLowerCase();
                if (headerText.includes('período') || headerText.includes('periodo') || headerText.includes('variação') || headerText.includes('rentabilidade')) {
                    let idxCDI = -1, idxIndex = -1, idxAsset = -1;
                    
                    $(table).find('thead th, tr:first-child td, tr:first-child th').each((idx, th) => {
                        const txt = $(th).text().toUpperCase();
                        if (txt.includes('CDI')) idxCDI = idx;
                        if (txt.includes('IFIX') || txt.includes('IBOV')) idxIndex = idx;
                        if (txt.includes(ticker) || txt.includes('FII') || txt.includes('AÇÃO') || txt.includes('RENTABILIDADE')) idxAsset = idx;
                    });
                    
                    if (idxAsset === -1) idxAsset = 1;

                    $(table).find('tbody tr').each((_, tr) => {
                        const rowLabel = $(tr).find('td').first().text().trim().toLowerCase();
                        const cols = $(tr).find('td');
                        if (!rowLabel) return;

                        const rentAtivo = parseValue($(cols[idxAsset]).text());
                        const rentCDI = idxCDI > -1 ? parseValue($(cols[idxCDI]).text()) : null;
                        const rentIndex = idxIndex > -1 ? parseValue($(cols[idxIndex]).text()) : null;

                        if (rowLabel.includes('1 mês') || rowLabel.includes('mês atual')) {
                            if (rentAtivo !== null) dados.rentabilidade_mes = rentAtivo;
                        }
                        else if (rowLabel.includes('12 meses') || rowLabel.includes('1 ano')) {
                            if (rentAtivo !== null) dados.rentabilidade_12m = rentAtivo;
                            if (rentCDI !== null) dados.benchmark_cdi_12m = rentCDI;
                            if (rentIndex !== null) {
                                if (type === 'FII') dados.benchmark_ifix_12m = rentIndex;
                                else dados.benchmark_ibov_12m = rentIndex;
                            }
                        }
                        else if (rowLabel.includes('24 meses') || rowLabel.includes('2 anos')) {
                            if (rentAtivo !== null) dados.rentabilidade_2y = rentAtivo;
                        }
                    });
                }
            });

            // --- 4. DIVIDENDOS ---
            const divTable = $('#table-dividends-history');
            if (divTable.length > 0) {
                divTable.find('tbody tr').each((i, tr) => {
                    const cols = $(tr).find('td');
                    if (cols.length < 3) return;

                    let typeDiv = 'DIV';
                    let dateComStr = '';
                    let datePayStr = '';
                    let valStr = '';

                    cols.each((idx, td) => {
                        const text = $(td).text().trim();
                        const normText = normalize(text);
                        if (normText.includes('jcp') || normText.includes('juros')) typeDiv = 'JCP';
                        else if (normText.includes('rendimento')) typeDiv = 'REND';
                        else if (normText.includes('dividendo')) typeDiv = 'DIV';
                        else if (normText.includes('amortiza')) typeDiv = 'AMORT';

                        if (text.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            if (!dateComStr) dateComStr = text;
                            else if (!datePayStr) datePayStr = text;
                        }
                        if (text.includes(',') && !text.includes('%') && !text.includes('/')) valStr = text;
                    });

                    const rate = parseValue(valStr);
                    const dateCom = parseDate(dateComStr);
                    const paymentDate = parseDate(datePayStr);

                    if (dateCom && rate !== null && rate > 0) {
                        dividends.push({ ticker: ticker.toUpperCase(), type: typeDiv, date_com: dateCom, payment_date: paymentDate || null, rate });
                    }
                });
            }

            // --- 5. IMÓVEIS ---
            $('#properties-section .card-propertie').each((i, el) => {
                const nome  = $(el).find('h3').text().trim();
                let location = '';
                $(el).find('small').each((j, small) => {
                    const t = $(small).text().trim();
                    if (t.includes('Estado:')) location = t.replace('Estado:', '').trim();
                });
                if (nome) realEstateProperties.push({ name: nome, location });
            });

            if ((!dados.dy || dados.dy === 'N/A') && dados.ultimo_rendimento && dados.cotacao_atual) {
                const ultRend = parseValue(dados.ultimo_rendimento);
                const cot = parseValue(dados.cotacao_atual);
                if (ultRend && cot) dados.dy = (ultRend / cot) * 100 * 12;
            }

            finalData = {
                ticker: dados.ticker,
                type: dados.type,
                name: dados.name,
                updated_at: dados.updated_at,
                segment: dados.segmento,
                
                current_price: parseValue(dados.cotacao_atual),
                dy_12m: parseValue(dados.dy),
                p_vp: parseValue(dados.pvp),
                p_l: parseValue(dados.pl),
                roe: parseValue(dados.roe),
                lpa: parseValue(dados.lpa),
                vpa: parseValue(dados.vp_cota),
                market_cap: dados.val_mercado || null,
                liquidity: dados.liquidez || null,
                
                profitability_12m: dados.rentabilidade_12m || parseValue(dados.variacao_12m),
                profitability_month: dados.rentabilidade_mes,
                profitability_2y: dados.rentabilidade_2y,
                benchmark_cdi_12m: dados.benchmark_cdi_12m,
                benchmark_ifix_12m: dados.benchmark_ifix_12m,
                benchmark_ibov_12m: dados.benchmark_ibov_12m,

                vacancy: parseValue(dados.vacancia),
                assets_value: dados.patrimonio_liquido,
                properties_count: parseValue(dados.num_cotistas),
                manager_type: dados.tipo_gestao,
                management_fee: dados.taxa_adm,
                last_dividend: parseValue(dados.ultimo_rendimento),
                
                cnpj: dados.cnpj,
                mandate: dados.mandato,
                target_audience: dados.publico_alvo,
                fund_type: dados.tipo_fundo,
                duration: dados.prazo_duracao,
                num_quotas: dados.cotas_emitidas,
                company_name: dados.razao_social || dados.name,

                net_margin: parseValue(dados.margem_liquida),
                gross_margin: parseValue(dados.margem_bruta),
                ev_ebitda: parseValue(dados.ev_ebitda),
                net_debt_ebitda: parseValue(dados.divida_liquida_ebitda),
                cagr_revenue: parseValue(dados.cagr_receita_5a),
                cagr_profits: parseValue(dados.cagr_lucros_5a),
                
                properties: realEstateProperties.length > 0 ? realEstateProperties : null
            };
            
            finalDividends = dividends;
            break; 
        } catch (e) {
            console.warn(`Attempt failed for ${url}:`, e);
            continue; 
        }
    }

    if (!finalData) return null; 

    return { metadata: finalData, dividends: finalDividends };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    const force = req.query.force === 'true'; 
    
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        let shouldScrape = force;
        
        if (!shouldScrape) {
            const { data: existing } = await supabase.from('ativos_metadata').select('*').eq('ticker', ticker).single();
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                const cacheTime = existing.dy_12m === 0 ? 3600000 : 10800000; 
                if (existing.rentabilidade_12m === null) shouldScrape = true;
                else if (age < cacheTime) {
                     const { data: divs } = await supabase.from('market_dividends').select('*').eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            } else shouldScrape = true;
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) return res.status(404).json({ success: false, error: 'Falha ao obter dados.' });

        const { metadata, dividends } = result;

        if (metadata) {
            const dbPayload = { ...metadata };
            Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);
            const { error } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (error) console.error('Error saving metadata:', error);
        }

        if (dividends.length > 0) {
             const today = new Date().toISOString().split('T')[0];
             const { error: delError } = await supabase.from('market_dividends').delete().eq('ticker', ticker.toUpperCase()).gte('payment_date', today);
             if (delError) console.warn('Clean up error (ignorable):', delError);
             const uniqueDivs = Array.from(new Map(dividends.map(item => [`${item.type}-${item.date_com}-${item.rate}`, item])).values());
             const { error } = await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
             if (error) console.error('Error saving dividends:', error);
        }

        return res.status(200).json({ success: true, data: metadata, dividends });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
