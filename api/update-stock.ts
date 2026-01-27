
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

// --- HELPERS DE PARSEAMENTO ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    try {
        if (typeof valueStr === 'number') return valueStr;
        
        let str = String(valueStr).trim();
        
        // Remove sufixos comuns de moeda/percentual
        str = str.replace(/^R\$\s?/, '').replace(/%$/, '').trim();
        
        if (!str || str === '-' || str === 'N/A') return 0;

        // Suporte a sufixos de magnitude (B = Bilhão, M = Milhão, K = Milhar)
        let multiplier = 1;
        if (str.toUpperCase().endsWith('B')) { multiplier = 1000000000; str = str.slice(0, -1); }
        else if (str.toUpperCase().endsWith('M')) { multiplier = 1000000; str = str.slice(0, -1); }
        else if (str.toUpperCase().endsWith('K')) { multiplier = 1000; str = str.slice(0, -1); }

        // Limpeza final de caracteres invisíveis
        str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

        const clean = str.replace(/[^0-9,.-]+/g, ""); 
        
        if (!clean) return 0;

        const hasComma = clean.includes(',');
        const hasDot = clean.includes('.');

        let result = 0;

        // Lógica de detecção de formato numérico (BR vs US)
        if (hasComma && !hasDot) {
             // 1000,00 -> BR
             result = parseFloat(clean.replace(',', '.')) || 0;
        } else if (!hasComma && hasDot) {
             // 1000.00 (US) ou 1.000 (BR milhar) - Assumimos BR se não tiver decimais óbvios, mas aqui removemos ponto
             // Contexto Investidor10: Pontos costumam ser milhar.
             result = parseFloat(clean.replace(/\./g, '')) || 0;
        } else if (hasComma && hasDot) {
             // Misto: 1.000,00 (BR) vs 1,000.00 (US)
             if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                 // BR: Ponto é milhar, Vírgula é decimal
                 result = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
             } else {
                 // US: Vírgula é milhar, Ponto é decimal
                 result = parseFloat(clean.replace(/,/g, '')) || 0;
             }
        } else {
            // Apenas números
            result = parseFloat(clean) || 0;
        }

        return result * multiplier;
    } catch (e) { return 0; }
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

    // Prioriza URL baseado no padrão do ticker
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
            // Se for erro de rede, tenta o próximo
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
            
            // --- ESTRATÉGIA DUPLA DE NORMALIZAÇÃO ---
            
            // 1. Normalização TEXTUAL (Preserva espaços para frases como "Margem Líquida")
            const kText = normalize(keyRaw.replace(/\n/g, ' ').replace(/\s+/g, ' '));
            
            // 2. Normalização AGRESSIVA (Remove tudo para siglas como "V.P.A", "P/VP")
            const kClean = keyRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            
            const v = valueRaw.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            if (v === '-' || v === '') return;

            // --- MAPEAMENTO POR SIGLAS (kClean) ---
            if (kClean === 'pvp') dados.pvp = parseValue(v);
            if (kClean === 'pl') dados.pl = parseValue(v);
            if (kClean === 'dy' || kClean === 'dividendyield') dados.dy = parseValue(v);
            if (kClean === 'cotacao' || kClean === 'valoratual') dados.cotacao_atual = parseValue(v);
            if (kClean === 'roe') dados.roe = parseValue(v);
            if (kClean === 'lpa') dados.lpa = parseValue(v);
            if (kClean === 'evebitda') dados.ev_ebitda = parseValue(v);

            // VPA (Tratamento especial para V.P.A / VPA / Valor Patrimonial p/ Ação)
            if (kClean === 'vpa' || kClean === 'vp' || kClean === 'valorpatrimonial' || kClean === 'valorpatrimonialporacao' || kClean === 'valorpatrimonialpacao') {
                const val = parseValue(v);
                // Heurística: Se < 5000 é unitário (VPA/VP), senão é total (Patrimônio Líquido)
                if (val < 5000) {
                    dados.vp_cota = val;
                    dados.vpa = val; 
                } else {
                    dados.patrimonio_liquido = v;
                }
            }

            // --- MAPEAMENTO POR TEXTO (kText) ---
            // Usamos 'includes' para ser flexível com variações do site
            
            if (kText.includes('patrimonio liquido') || kText.includes('patrim. liq')) dados.patrimonio_liquido = v;
            if (kText.includes('liquidez')) dados.liquidez = v;
            if (kText.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(v);
            if (kClean === 'numcotistas' || kText.includes('num. cotistas') || kText.includes('numero de cotistas')) dados.num_cotistas = parseValue(v);
            if (kText.includes('vacancia')) dados.vacancia = parseValue(v);
            
            // Indicadores de Eficiência (Ações)
            if (kText.includes('margem liquida')) dados.margem_liquida = parseValue(v);
            if (kText.includes('margem bruta')) dados.margem_bruta = parseValue(v);
            if (kText.includes('div. liq') || kText.includes('divida liquida')) {
                if (kText.includes('ebitda')) dados.divida_liquida_ebitda = parseValue(v);
            } else if (kClean === 'dividaliquidaebitda' || kClean === 'divliqebitda') {
                dados.divida_liquida_ebitda = parseValue(v);
            }
            
            // Crescimento (Ações)
            if (kText.includes('cagr') && kText.includes('receita')) dados.cagr_receita_5a = parseValue(v);
            if (kText.includes('cagr') && kText.includes('lucro')) dados.cagr_lucros_5a = parseValue(v);
        };

        // 1. CARDS DO TOPO
        $('div._card').each((_, el) => {
            let title = $(el).find('div._card-header').text().trim();
            let val = $(el).find('div._card-body').text().trim();
            if (title && val) processPair(title, val);
        });

        // 2. GRID DE INDICADORES (Essencial para Ações no Investidor10)
        // O seletor #table-indicators .cell é o principal container de indicadores fundamentalistas
        $('#table-indicators .cell, .indicators-list .cell').each((_, el) => {
            const title = $(el).find('.cell-header, span.name').text().trim();
            const val = $(el).find('.cell-value, span.value').text().trim();
            if (title && val) processPair(title, val);
        });

        // 3. VARREDURA GENÉRICA (Fallback)
        $('div.indicator-item, div.data-item').each((_, el) => {
            let title = $(el).find('.title, .label').first().text().trim();
            let val = $(el).find('.value, .data').first().text().trim();
            if (title && val) {
                title = title.replace(/\?$/, '').trim(); 
                processPair(title, val);
            }
        });

        // 4. TABELAS DE DADOS GERAIS
        $('.table-data .cell').each((_, el) => {
             const title = $(el).find('.name').text().trim();
             const val = $(el).find('.value').text().trim();
             if (title && val) {
                 processPair(title, val);
                 const k = normalize(title);
                 if (k.includes('segmento')) dados.segmento = val;
                 if (k.includes('tipo') && k.includes('gestao')) dados.tipo_gestao = val;
                 if (k.includes('taxa') && k.includes('admin')) dados.taxa_adm = val;
             }
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
                if (i === 0 && tableDivs.find('thead').length === 0) return;
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

        // Consolidação Final
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
