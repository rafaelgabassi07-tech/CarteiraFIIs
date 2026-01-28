
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
    timeout: 15000,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
    },
    timeout: 15000,
    maxRedirects: 5
});

// --- HELPERS DE PARSEAMENTO ROBUSTOS ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any) {
    if (valueStr === undefined || valueStr === null) return 0;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === 'N/A') return 0;

    // Remove sufixos e prefixos
    str = str.replace(/^R\$\s?/, '').replace(/%$/, '').trim();

    // Tratamento de Multiplicadores
    let multiplier = 1;
    const lastChar = str.slice(-1).toUpperCase();
    if (['B', 'M', 'K'].includes(lastChar)) {
        if (lastChar === 'B') multiplier = 1e9;
        else if (lastChar === 'M') multiplier = 1e6;
        else if (lastChar === 'K') multiplier = 1e3;
        str = str.slice(0, -1).trim();
    }

    str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

    // Detecção Inteligente de Formato (BR vs US)
    const lastCommaIndex = str.lastIndexOf(',');
    const lastDotIndex = str.lastIndexOf('.');
    
    let clean = "";
    if (lastCommaIndex > lastDotIndex) {
        // BR (1.000,00)
        clean = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIndex > lastCommaIndex) {
        // US (1,000.00)
        clean = str.replace(/,/g, '');
    } else {
        // Ambíguo ou sem separador de milhar
        if (lastCommaIndex !== -1) clean = str.replace(',', '.');
        else clean = str;
    }

    clean = clean.replace(/[^0-9.-]/g, '');
    const result = parseFloat(clean);
    return isNaN(result) ? 0 : result * multiplier;
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

async function fetchHtmlWithRetry(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    const urlFii = `https://investidor10.com.br/fiis/${tickerLower}/`;
    const urlAcao = `https://investidor10.com.br/acoes/${tickerLower}/`;
    const urlBdr = `https://investidor10.com.br/bdrs/${tickerLower}/`;

    const urls = isLikelyFii ? [urlFii, urlAcao, urlBdr] : [urlAcao, urlFii, urlBdr];

    for (const url of urls) {
        try {
            const res = await client.get(url);
            let type = 'ACAO';
            if (url.includes('/fiis/')) type = 'FII';
            else if (url.includes('/bdrs/')) type = 'BDR';
            return { data: res.data, type };
        } catch (e: any) {
            if (e.response && e.response.status === 404) continue;
            continue; 
        }
    }
    throw new Error('Asset not found');
}

async function scrapeInvestidor10(ticker: string) {
    try {
        const { data: html, type: finalType } = await fetchHtmlWithRetry(ticker);
        const $ = cheerio.load(html);

        const dados: any = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            updated_at: new Date().toISOString(),
            dy: null, pvp: null, pl: null, 
            liquidez: null, val_mercado: null,
            segmento: null,
            roe: null, margem_liquida: null, margem_bruta: null,
            cagr_receita_5a: null, cagr_lucros_5a: null,
            divida_liquida_ebitda: null, ev_ebitda: null,
            lpa: null, vp_cota: null, vpa: null,
            vacancia: null, ultimo_rendimento: null, num_cotistas: null, patrimonio_liquido: null,
            taxa_adm: null, tipo_gestao: null
        };

        const processPair = (keyRaw: string, valueRaw: string) => {
            if (!keyRaw || !valueRaw) return;
            
            const kText = normalize(keyRaw.replace(/\n/g, ' ').replace(/\s+/g, ' '));
            const kClean = keyRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const v = valueRaw.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (v === '-' || v === '') return;

            // --- VALUATION & INDICADORES ---
            if (kClean === 'pvp' || kClean === 'vp') dados.pvp = parseValue(v);
            if (kClean === 'pl') dados.pl = parseValue(v);
            if (kClean === 'dy' || kClean === 'dividendyield' || kText === 'dividend yield') dados.dy = parseValue(v);
            if (kClean === 'cotacao' || kClean === 'valoratual') dados.cotacao_atual = parseValue(v);
            if (kClean === 'roe') dados.roe = parseValue(v);
            if (kClean === 'lpa') dados.lpa = parseValue(v);
            if (kClean === 'evebitda') dados.ev_ebitda = parseValue(v);

            // VPA
            if (kClean === 'vpa' || kClean === 'vp' || kClean.includes('valorpatrimonialpor') || kClean === 'valorpatrimonialcota') {
                const val = parseValue(v);
                if (val < 10000) { 
                    dados.vp_cota = val;
                    dados.vpa = val; 
                }
            }

            // --- DADOS GERAIS FIIs & AÇÕES ---
            if (kText.includes('liquidez')) dados.liquidez = v;
            
            // Patrimônio Líquido (Critical for FIIs)
            if (kText.includes('patrimonio liquido') || kText === 'patrimonio') dados.patrimonio_liquido = v;
            
            // Segmento
            if (kText === 'segmento' || kText === 'segmento de atuacao') dados.segmento = v;

            // FII Specifics
            if (kText.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(v);
            if (kClean === 'numcotistas' || kText.includes('num. cotistas') || kText.includes('numero de cotistas') || kText.includes('qtd cotistas')) dados.num_cotistas = parseValue(v);
            if (kText.includes('vacancia')) dados.vacancia = parseValue(v);
            
            // Gestão e Taxas (Busca Fuzzy)
            if (kText.includes('gestao') || kText === 'tipo de gestao') dados.tipo_gestao = v;
            if (kText.includes('taxa') && (kText.includes('admin') || kText.includes('adm'))) dados.taxa_adm = v;

            // Ações Specifics
            if (kText.includes('margem liquida')) dados.margem_liquida = parseValue(v);
            if (kText.includes('margem bruta')) dados.margem_bruta = parseValue(v);
            if (kClean.includes('dividaliquidaebitda') || kText.includes('div. liq. / ebitda')) dados.divida_liquida_ebitda = parseValue(v);
            if (kText.includes('cagr') && kText.includes('receita')) dados.cagr_receita_5a = parseValue(v);
            if (kText.includes('cagr') && kText.includes('lucro')) dados.cagr_lucros_5a = parseValue(v);
        };

        // --- ESTRATÉGIA 1: SELETORES ESTRUTURAIS ---
        $('div._card, #table-indicators .cell, #table-general-data .cell, .data-entry, .indicator-box').each((_, el) => {
            const title = $(el).find('.name, .title, div._card-header, span:first-child').text().trim();
            const val = $(el).find('.value, .data, div._card-body, span:last-child').text().trim();
            processPair(title, val);
        });

        $('ul li').each((_, el) => {
            const spans = $(el).find('span');
            if (spans.length >= 2) processPair($(spans[0]).text(), $(spans[1]).text());
        });

        // --- ESTRATÉGIA 2: BUSCA TEXTUAL (BRUTE FORCE) ---
        // Essencial para quando classes mudam ou estrutura é aninhada
        const forcedKeys = [
            'Taxa de Administração', 'Tipo de Gestão', 'Vacância Física', 
            'Número de Cotistas', 'Patrimônio Líquido', 'Segmento'
        ];

        forcedKeys.forEach(term => {
            // Se já temos o dado, pula
            const kNorm = normalize(term);
            if (kNorm.includes('taxa') && dados.taxa_adm) return;
            if (kNorm.includes('gestao') && dados.tipo_gestao) return;
            if (kNorm.includes('patrimonio') && dados.patrimonio_liquido) return;

            // Procura elementos que contenham o texto exato
            $(`*:contains('${term}')`).each((_, el) => {
                // Evita pegar o body ou html inteiro
                if ($(el).children().length > 5) return; 
                
                const text = $(el).text().trim();
                // Verifica se é um rótulo curto
                if (text.length < 50 && normalize(text).includes(normalize(term))) {
                    // Tenta achar o valor próximo
                    let val = $(el).next().text().trim(); // Irmão
                    if (!val) val = $(el).find('span').last().text().trim(); // Filho
                    if (!val) val = $(el).parent().next().text().trim(); // Tio (Grid layout)
                    if (!val) val = $(el).parent().find('.value').text().trim(); // Primo
                    
                    if (val && val.length < 100) {
                        processPair(text, val);
                    }
                }
            });
        });

        // --- EXTRAÇÃO DE DIVIDENDOS ---
        const dividends: any[] = [];
        let tableDivs = $('#table-dividends-history');
        
        if (tableDivs.length === 0) {
             $('h2, h3, h4').each((_, el) => {
                 const t = normalize($(el).text());
                 if (t.includes('dividendos') || t.includes('proventos')) {
                     const nextTable = $(el).nextAll('table').first();
                     if (nextTable.length) tableDivs = nextTable;
                     else {
                         const parentNextTable = $(el).parent().next().find('table').first();
                         if (parentNextTable.length) tableDivs = parentNextTable;
                     }
                 }
             });
        }

        if (tableDivs.length > 0) {
            const headers: string[] = [];
            tableDivs.find('thead th').each((_, th) => headers.push(normalize($(th).text())));
            if (headers.length === 0) tableDivs.find('tbody tr').first().find('td').each((_, td) => headers.push(normalize($(td).text())));

            let iType = -1, iCom = -1, iPay = -1, iVal = -1;
            headers.forEach((h, i) => {
                if (h.includes('tipo')) iType = i;
                if (h.includes('com') || h.includes('base')) iCom = i;
                if (h.includes('pagamento')) iPay = i;
                if (h.includes('valor') || h.includes('liquido')) iVal = i;
            });

            if (iVal === -1) {
                if (headers.length >= 4) { iType=0; iCom=1; iPay=2; iVal=3; }
                else { iCom=0; iPay=1; iVal=2; }
            }

            tableDivs.find('tbody tr').each((i, tr) => {
                if (i === 0 && tableDivs.find('thead').length === 0 && $(tr).find('td').first().text().match(/[a-z]/i)) return;
                
                const cols = $(tr).find('td');
                if (cols.length < 3) return;

                const typeRaw = iType !== -1 ? $(cols[iType]).text() : 'DIV';
                const dateComStr = iCom !== -1 ? $(cols[iCom]).text() : '';
                const datePayStr = iPay !== -1 ? $(cols[iPay]).text() : '';
                const valStr = iVal !== -1 ? $(cols[iVal]).text() : '';

                let type = 'DIV';
                const tNorm = normalize(typeRaw);
                if (tNorm.includes('jcp') || tNorm.includes('juros')) type = 'JCP';
                else if (tNorm.includes('rend')) type = 'REND';
                else if (tNorm.includes('amort')) type = 'AMORT';

                const rate = parseValue(valStr);
                const dateCom = parseDate(dateComStr);
                const paymentDate = parseDate(datePayStr);

                if (dateCom && rate > 0) {
                    dividends.push({
                        ticker: ticker.toUpperCase(),
                        type,
                        date_com: dateCom,
                        payment_date: paymentDate || null,
                        rate
                    });
                }
            });
        }

        if (!dados.dy && dados.ultimo_rendimento && dados.cotacao_atual) {
            dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100;
        }

        Object.keys(dados).forEach(k => {
            if (dados[k] === null || dados[k] === undefined || dados[k] === '') delete dados[k];
        });

        const finalMetadata = {
            ...dados,
            dy_12m: dados.dy,
            current_price: dados.cotacao_atual,
        };

        return { metadata: finalMetadata, dividends };

    } catch (e: any) {
        console.error(`Scraper error ${ticker}: ${e.message}`);
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    const force = req.query.force === 'true'; 
    
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                if (age < 10800000) { 
                     const { data: divs } = await supabase
                        .from('market_dividends')
                        .select('*')
                        .eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha ao obter dados.' });
        }

        const { metadata, dividends } = result;

        if (metadata) {
            const dbPayload = { ...metadata };
            delete dbPayload.dy;
            delete dbPayload.cotacao_atual;
            
            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        if (dividends.length > 0) {
             const uniqueDivs = Array.from(new Map(dividends.map(item => [
                `${item.type}-${item.date_com}-${item.rate}`, item
            ])).values());
            await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
