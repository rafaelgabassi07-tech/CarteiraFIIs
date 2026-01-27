
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
        str = str.replace('R$', '').replace('%', '').trim();
        
        if (!str || str === '-') return 0;

        // Suporte a sufixos de magnitude (B = Bilhão, M = Milhão)
        let multiplier = 1;
        if (str.toUpperCase().endsWith('B')) { multiplier = 1000000000; str = str.slice(0, -1); }
        else if (str.toUpperCase().endsWith('M')) { multiplier = 1000000; str = str.slice(0, -1); }
        else if (str.toUpperCase().endsWith('K')) { multiplier = 1000; str = str.slice(0, -1); }

        // Remove caracteres invisíveis e espaços non-breaking
        str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

        const clean = str.replace(/[^0-9,.-]+/g, ""); 
        
        if (!clean) return 0;

        const hasComma = clean.includes(',');
        const hasDot = clean.includes('.');

        let result = 0;

        // 1.000,00 (Formato BR Padrão)
        if (hasComma && !hasDot) {
             result = parseFloat(clean.replace(',', '.')) || 0;
        }
        // 1.000 (Sem decimais) ou 1000
        else if (!hasComma && hasDot) {
             result = parseFloat(clean.replace(/\./g, '')) || 0;
        }
        // 1.000,50 (Misto)
        else if (hasComma && hasDot) {
             if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                 result = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
             } else {
                 result = parseFloat(clean.replace(/,/g, '')) || 0;
             }
        }
        // Apenas números
        else {
            result = parseFloat(clean.replace(',', '.')) || 0;
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
            throw e;
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
            lpa: null, vp_cota: null,
            vacancia: null, ultimo_rendimento: null, num_cotistas: null, patrimonio_liquido: null,
            taxa_adm: null, tipo_gestao: null
        };

        const processPair = (tituloRaw: string, valorRaw: string) => {
            const titulo = normalize(tituloRaw);
            const tituloClean = titulo.replace(/[^a-z0-9]/g, ''); 
            const valor = valorRaw ? valorRaw.trim() : '';
            if (!valor || valor === '-') return;

            // --- DY ---
            if (dados.dy === null && (tituloClean === 'dy' || tituloClean === 'dividendyield' || titulo.includes('dividend'))) dados.dy = parseValue(valor);
            
            // --- P/VP ---
            if (dados.pvp === null && (tituloClean === 'pvp' || titulo === 'p/vp')) dados.pvp = parseValue(valor);
            
            // --- VPA / VP ---
            // Prioridade para VPA de ações ou VP de cota
            if (dados.vp_cota === null) {
                if (tituloClean === 'vpa' || tituloClean === 'vp' || tituloClean === 'valorpatrimonialcota' || tituloClean === 'valorpatrimonialporacao') {
                    dados.vp_cota = parseValue(valor);
                } else if (titulo.includes('patrimonial') && (titulo.includes('cota') || titulo.includes('acao'))) {
                    dados.vp_cota = parseValue(valor);
                }
            }
            // Fallback Genérico para "Valor Patrimonial"
            if (titulo === 'valor patrimonial' && dados.vp_cota === null) {
                 const v = parseValue(valor);
                 if (v < 10000) dados.vp_cota = v; else dados.patrimonio_liquido = valor; // Salva string original se for PL
            }

            // --- PL (Patrimonio Liquido - String) ---
            if (!dados.patrimonio_liquido && (tituloClean === 'patrimonioliquido' || (titulo.includes('patrimonio') && titulo.includes('liquido')))) {
                // Se o valor for muito grande, é PL do fundo/empresa
                dados.patrimonio_liquido = valor;
            }

            if (dados.pl === null && (tituloClean === 'pl' || titulo.includes('p/l'))) dados.pl = parseValue(valor);
            if (dados.liquidez === null && titulo.includes('liquidez')) dados.liquidez = valor; 
            if (dados.segmento === null && titulo.includes('segmento')) dados.segmento = valor;
            if (titulo.includes('mercado') && titulo.includes('valor')) dados.val_mercado = valor;

            if (titulo.includes('vacancia')) dados.vacancia = parseValue(valor);
            if (titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(valor);
            if (tituloClean.includes('cotistas')) dados.num_cotistas = parseValue(valor);

            // --- FIIs Específicos ---
            if (titulo.includes('taxa') && titulo.includes('administra')) dados.taxa_adm = valor;
            if (titulo.includes('gestao')) dados.tipo_gestao = valor;

            // --- AÇÕES ---
            if (tituloClean === 'roe' || titulo.includes('roe')) dados.roe = parseValue(valor);
            if (titulo.includes('margem liquida')) dados.margem_liquida = parseValue(valor);
            if (titulo.includes('margem bruta')) dados.margem_bruta = parseValue(valor);

            if (tituloClean.includes('ebitda')) {
                if (tituloClean.includes('div') && tituloClean.includes('liq')) dados.divida_liquida_ebitda = parseValue(valor);
                else if (tituloClean.includes('ev')) dados.ev_ebitda = parseValue(valor);
            }
            if (titulo.includes('cagr')) {
                if (titulo.includes('receita')) dados.cagr_receita_5a = parseValue(valor);
                if (titulo.includes('lucro')) dados.cagr_lucros_5a = parseValue(valor);
            }
            if (tituloClean === 'lpa' || titulo.includes('lpa')) dados.lpa = parseValue(valor);
        };

        // ESTRATÉGIA 1: Cards do Topo
        $('div._card').each((_, el) => {
            const header = $(el).find('div._card-header').text() || $(el).find('.header').text() || $(el).find('span').first().text();
            const body = $(el).find('div._card-body').text() || $(el).find('.body').text() || $(el).find('span').last().text();
            processPair(header, body);
        });

        // ESTRATÉGIA 2: Tabelas de Características (Comum em FIIs para Taxa Adm/Gestão)
        $('div#table-general-data, .table-general-data, table').each((_, table) => {
            $(table).find('tr, .cell').each((__, row) => {
                const title = $(row).find('h6, span.title, th, .cell-title').first().text();
                const value = $(row).find('span.value, td, .cell-value').first().text();
                if (title && value) processPair(title, value);
            });
        });

        // ESTRATÉGIA 3: Histórico de Indicadores (Ações VPA/PL)
        const historicoHeader = $('h2, h3, h4').filter((_, el) => {
            const t = normalize($(el).text());
            return t.includes('historico') && t.includes('indicadores');
        }).first();

        if (historicoHeader.length > 0) {
            let tableHistorico = historicoHeader.nextAll().find('table').first();
            if (tableHistorico.length === 0) tableHistorico = historicoHeader.parent().find('table').first();
            if (tableHistorico.length === 0) tableHistorico = historicoHeader.nextAll('table').first();

            if (tableHistorico.length > 0) {
                let idxAtual = -1;
                const headers = tableHistorico.find('thead tr').first().find('th, td');
                
                headers.each((i, h) => {
                    const txt = normalize($(h).text());
                    if (txt.includes('atual') || txt.includes('hoje')) {
                        idxAtual = i;
                    }
                });

                if (idxAtual === -1 && headers.length > 1) idxAtual = headers.length - 1;

                if (idxAtual > 0) {
                    tableHistorico.find('tbody tr').each((_, tr) => {
                        const cols = $(tr).find('td');
                        if (cols.length > idxAtual) {
                            const label = $(cols[0]).text(); 
                            const val = $(cols[idxAtual]).text(); 
                            processPair(label, val);
                        }
                    });
                }
            }
        }

        // ESTRATÉGIA 4: Células e Listas Genéricas
        $('.cell, .data-item, .indicator-item').each((_, el) => {
            const label = $(el).find('.name, .label, .title').text();
            const val = $(el).find('.value, .data, .number').text();
            processPair(label, val);
        });

        const cotacaoEl = $('div._card').filter((i, el) => {
            const t = normalize($(el).text());
            return t.includes('cotacao') || t.includes('valor atual');
        }).first();
        if (cotacaoEl.length) {
            dados.cotacao_atual = parseValue(cotacaoEl.find('div._card-body').text());
        }

        if (!dados.segmento) {
            $('#breadcrumbs li, .breadcrumbs span, .breadcrumb-item').each((_, el) => {
                const t = $(el).text().trim();
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    dados.segmento = t;
                }
            });
        }

        // --- EXTRAÇÃO ROBUSTA DE DIVIDENDOS ---
        const dividends: any[] = [];
        let table = $('#table-dividends-history');
        if (table.length === 0) {
             const divHeader = $('h2, h3, h4').filter((_, el) => {
                const t = normalize($(el).text());
                return t.includes('historico') && (t.includes('dividendos') || t.includes('proventos'));
            }).first();
            
            if (divHeader.length > 0) {
                table = divHeader.nextAll().find('table').first();
                if (table.length === 0) table = divHeader.parent().find('table').first();
                if (table.length === 0) table = divHeader.nextAll('table').first();
            }
        }
        
        if (table.length === 0) {
            $('table').each((_, tbl) => {
                const h = normalize($(tbl).text());
                if (h.includes('com') && h.includes('pagamento') && (h.includes('valor') || h.includes('liquido') || h.includes('provento'))) {
                    table = $(tbl);
                    return false; 
                }
            });
        }

        if (table.length > 0) {
            const headers: string[] = [];
            let headerRow = table.find('thead tr').first();
            if (headerRow.length === 0) headerRow = table.find('tbody tr').first();

            headerRow.find('th, td').each((_, cell) => {
                headers.push(normalize($(cell).text()));
            });

            let idxType = -1;
            let idxDateCom = -1;
            let idxDatePay = -1;
            let idxValue = -1;

            headers.forEach((h, i) => {
                if (h.includes('tipo')) idxType = i;
                if (h.includes('com') || h.includes('base')) idxDateCom = i;
                if (h.includes('pagamento')) idxDatePay = i;
                if (h.includes('valor') || h.includes('liquido') || h.includes('rendimento')) idxValue = i;
            });

            if (idxValue === -1) {
                if (headers.length >= 4) { idxValue = 3; idxDatePay = 2; idxDateCom = 1; idxType = 0; }
                else if (headers.length === 3) { idxValue = 2; idxDatePay = 1; idxDateCom = 0; }
            }

            table.find('tbody tr').each((i, el) => {
                if (i === 0 && table.find('thead').length === 0) return;

                const cols = $(el).find('td');
                if (cols.length < 3) return;

                let type = 'DIV';
                let dateComStr = idxDateCom !== -1 && cols[idxDateCom] ? $(cols[idxDateCom]).text() : '';
                let datePayStr = idxDatePay !== -1 && cols[idxDatePay] ? $(cols[idxDatePay]).text() : '';
                let valStr = idxValue !== -1 && cols[idxValue] ? $(cols[idxValue]).text() : '';
                let typeStr = idxType !== -1 && cols[idxType] ? $(cols[idxType]).text() : '';

                if (!valStr && cols.length >= 4) valStr = $(cols[3]).text(); 
                if (!valStr && cols.length === 3) valStr = $(cols[2]).text();

                const tText = normalize(typeStr);
                if (tText.includes('jcp') || tText.includes('capital')) type = 'JCP';
                else if (tText.includes('rend')) type = 'REND';
                else if (tText.includes('amort')) type = 'AMORT';

                const dateCom = parseDate(dateComStr);
                const paymentDate = parseDate(datePayStr);
                const rate = parseValue(valStr);

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

        if (dados.vp_cota !== null && dados.vpa === undefined) {
            dados.vpa = dados.vp_cota;
        }

        const finalMetadata = {
            ...dados,
            dy_12m: dados.dy, 
            current_price: dados.cotacao_atual,
        };

        Object.keys(finalMetadata).forEach(key => {
            if (finalMetadata[key] === null || finalMetadata[key] === undefined || finalMetadata[key] === '') delete finalMetadata[key];
        });

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
            if (dbPayload.vpa && !dbPayload.vp_cota) dbPayload.vp_cota = dbPayload.vpa;
            
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
