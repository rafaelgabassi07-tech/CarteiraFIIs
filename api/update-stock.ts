
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
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const client = axios.create({
    httpsAgent,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
    },
    timeout: 10000, 
    maxRedirects: 5
});

// --- HELPERS ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any): number | null {
    if (valueStr === undefined || valueStr === null) return null;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === '--' || str === 'N/A') return null;

    str = str.replace('%', '').trim();
    str = str.replace(/^R\$\s?/, '').trim();

    let multiplier = 1;
    const lastChar = str.slice(-1).toUpperCase();
    if (['B', 'M', 'K'].includes(lastChar)) {
        if (lastChar === 'B') multiplier = 1e9;
        else if (lastChar === 'M') multiplier = 1e6;
        else if (lastChar === 'K') multiplier = 1e3;
        str = str.slice(0, -1).trim();
    }

    str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

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

function mapLabelToKey(label: string): string | null {
    const norm = normalize(label);
    if (!norm) return null;
    const cleanNorm = norm.replace(/\s+/g, '');
    
    if (cleanNorm === 'p/vp' || cleanNorm === 'vp' || cleanNorm === 'p/vpa') return 'pvp'; 
    if (cleanNorm === 'p/l' || cleanNorm === 'pl') return 'pl';
    if (norm.includes('dy') || norm.includes('dividend yield')) return 'dy';
    if (norm === 'cotacao' || norm.includes('valor atual')) return 'cotacao_atual';
    if (norm.includes('cota') && (norm.includes('patrim') || norm.includes('vp'))) return 'vpa';
    if (cleanNorm === 'vpa' || cleanNorm === 'vp/cota' || cleanNorm === 'vpcota') return 'vpa';
    if (norm === 'lpa') return 'lpa';
    if (cleanNorm === 'ev/ebitda') return 'ev_ebitda';
    if (norm === 'roe') return 'roe';
    if (norm === 'margem liquida') return 'margem_liquida';
    if (norm === 'margem bruta') return 'margem_bruta';
    if (norm.includes('cagr receitas')) return 'cagr_receita_5a';
    if (norm.includes('cagr lucros')) return 'cagr_lucros_5a';
    if (norm.includes('liquida/ebitda') || norm.includes('liq/ebitda')) return 'divida_liquida_ebitda';
    if (norm.includes('liquidez')) return 'liquidez';
    if (norm.includes('valor de mercado')) return 'val_mercado';
    if (norm.includes('ultimo rendimento')) return 'ultimo_rendimento';
    if ((norm.includes('patrim') && (norm.includes('liquido') || norm.includes('liq'))) || norm === 'patrimonio' || norm === 'patrim.' || norm === 'valor patrimonial' || cleanNorm === 'valorpatrimonial' || cleanNorm === 'val.patrimonial') return 'patrimonio_liquido'; 
    if (norm.includes('cotistas') || norm.includes('numero de cotistas')) return 'num_cotistas';
    if (norm.includes('vacancia') && !norm.includes('financeira')) return 'vacancia'; 
    if (norm.includes('tipo de gestao') || norm === 'gestao') return 'tipo_gestao';
    if (norm.includes('taxa de administracao') || norm.includes('taxa de admin')) return 'taxa_adm';
    if (norm.includes('segmento') || norm === 'setor' || norm.includes('setor de atuacao')) return 'segmento';
    
    if (norm.includes('rentab') && (norm.includes('12') || norm.includes('ano'))) return 'rentabilidade_12m';
    if (norm.includes('rentab') && norm.includes('mes')) return 'rentabilidade_mes';

    return null;
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
    let benchmarks: any[] = [];

    for (const url of urls) {
        try {
            const res = await client.get(url, { headers: { 'User-Agent': getRandomAgent() } });
            if (res.data.length < 5000) continue;

            const $ = cheerio.load(res.data);
            
            let type = 'ACAO';
            if (url.includes('/fiis/')) type = 'FII';
            else if (url.includes('/fiagros/')) type = 'FII';
            else if (url.includes('/bdrs/')) type = 'BDR';

            const dados: any = {
                ticker: ticker.toUpperCase(), type, updated_at: new Date().toISOString(),
                dy: null, pvp: null, pl: null, liquidez: null, val_mercado: null, segmento: null,
                roe: null, margem_liquida: null, margem_bruta: null, cagr_receita_5a: null, cagr_lucros_5a: null,
                divida_liquida_ebitda: null, ev_ebitda: null, lpa: null, vpa: null,
                vacancia: null, ultimo_rendimento: null, num_cotistas: null, patrimonio_liquido: null,
                taxa_adm: null, tipo_gestao: null, rentabilidade_12m: null, rentabilidade_mes: null
            };

            // Scraping Indicators
            $('div._card, #table-indicators .cell, .indicator-box').each((_, el) => {
                let label = $(el).find('div._card-header, .name, .title').text().trim();
                let value = $(el).find('div._card-body, .value').text().trim();
                
                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key && dados[key] === null) {
                        if (['segmento', 'tipo_gestao', 'taxa_adm'].includes(key)) dados[key] = value;
                        else dados[key] = parseValue(value);
                    }
                }
            });

            // Segmento Fallback
            if (!dados.segmento) {
                $('#breadcrumbs li').each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt && !['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'Fiagros'].includes(txt) && txt.toUpperCase() !== ticker) {
                        dados.segmento = txt;
                    }
                });
            }

            // Fallbacks de Valor
            if (dados.dy === null) {
                 $('span, div, p').each((_, el) => {
                     if ($(el).text().trim().toLowerCase() === 'dividend yield') {
                         const val = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
                         dados.dy = parseValue(val);
                     }
                 });
            }
            if (dados.vpa === null && dados.pvp > 0 && dados.cotacao_atual > 0) {
                 dados.vpa = dados.cotacao_atual / dados.pvp;
            }

            // --- 1. IMÓVEIS (Lógica Reforçada) ---
            if (type === 'FII') {
                // Procura o título "LISTA DE IMÓVEIS"
                let headerFound = false;
                $('h2, h3, h4, .section-title').each((_, el) => {
                    const txt = $(el).text().trim().toUpperCase();
                    if (txt.includes('LISTA DE IMÓVEIS') || txt.includes('PROPRIEDADES')) {
                        headerFound = true;
                        // Procura nos elementos irmãos e descendentes do container
                        const container = $(el).closest('div, section').parent();
                        
                        container.find('.card, .property-card, .carousel-cell, .item').each((i, item) => {
                            let name = $(item).find('h3, h4, strong, .name, .title').first().text().trim();
                            let loc = $(item).find('p, span, .address').not('.name').first().text().trim();
                            
                            // Heurística de fallback: Pegar texto de divs internas se classes falharem
                            if (!name) {
                                const divs = $(item).find('div');
                                if (divs.length > 0) name = $(divs[0]).text().trim();
                            }

                            if (name && name.length > 3 && !name.includes('%') && !name.includes('R$')) {
                                realEstateProperties.push({
                                    name: name.replace(/\s+/g, ' '),
                                    location: loc ? loc.replace(/\s+/g, ' ') : 'Localização não informada',
                                    type: 'Imóvel'
                                });
                            }
                        });
                        return false; // Break
                    }
                });

                // Se não achou pelo título, tenta pelo ID hardcoded frequente
                if (realEstateProperties.length === 0) {
                    $('#sc-properties, #sc-portfolio-fii').find('.card').each((_, el) => {
                        const name = $(el).find('.name, .title').text().trim();
                        const location = $(el).find('.address').text().trim();
                        if (name) realEstateProperties.push({ name, location, type: 'Imóvel' });
                    });
                }
            }

            // --- 2. BENCHMARKS (Tabela de Comparação) ---
            // Procura tabela com "Rentabilidade" e "IFIX" ou "CDI"
            $('table').each((_, table) => {
                const headerText = $(table).find('thead').text().toLowerCase();
                if (headerText.includes('rentabilidade') && (headerText.includes('ifix') || headerText.includes('cdi') || headerText.includes('ibov'))) {
                    
                    // Mapeia colunas
                    const headers: string[] = [];
                    $(table).find('thead th, tr:first-child td').each((_, th) => {
                        headers.push($(th).text().trim().toLowerCase());
                    });

                    // Procura linhas de interesse (Mês, Ano, 12M)
                    $(table).find('tbody tr').each((_, tr) => {
                        const rowData: any = {};
                        $(tr).find('td').each((idx, td) => {
                            if (headers[idx]) rowData[headers[idx]] = $(td).text().trim();
                        });

                        // Tenta identificar o label da linha (1º coluna geralmente)
                        const label = Object.values(rowData)[0] as string;
                        if (!label) return;

                        // Se a linha for relevante (12 meses, 2 anos, etc)
                        if (['12 meses', '24 meses', '2 anos', '5 anos', 'ano atual', 'mês atual'].some(k => label.toLowerCase().includes(k))) {
                            const obj: any = { label };
                            
                            // Extrai valores das colunas
                            Object.keys(rowData).forEach(key => {
                                const val = parseValue(rowData[key]);
                                if (key.includes(ticker.toLowerCase())) obj.asset = val;
                                else if (key.includes('cdi')) obj.cdi = val;
                                else if (key.includes('ifix')) obj.ifix = val;
                                else if (key.includes('ibov')) obj.ibov = val;
                            });

                            if (obj.asset !== undefined) benchmarks.push(obj);
                        }
                    });
                }
            });

            // --- 3. DIVIDENDOS (Histórico Completo) ---
            const specificTable = $('#table-dividends-history');
            let tableDivs = specificTable.length ? specificTable : null;
            
            if (!tableDivs) {
                $('table').each((_, table) => {
                    const txt = $(table).text().toLowerCase();
                    if ((txt.includes('tipo') || txt.includes('data com')) && (txt.includes('pagamento') || txt.includes('valor'))) {
                        tableDivs = $(table);
                        return false; 
                    }
                });
            }

            if (tableDivs) {
                tableDivs.find('tbody tr').each((i, tr) => {
                    const cols = $(tr).find('td');
                    if (cols.length < 3) return;

                    let typeDiv = 'DIV';
                    let dateComStr = '';
                    let datePayStr = '';
                    let valStr = '';

                    cols.each((_, td) => {
                        const text = $(td).text().trim();
                        const normText = normalize(text);

                        if (normText.includes('jcp')) typeDiv = 'JCP';
                        else if (normText.includes('rendimento')) typeDiv = 'REND';
                        else if (normText.includes('amortiza')) typeDiv = 'AMORT';

                        if (text.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            if (!dateComStr) dateComStr = text;
                            else if (!datePayStr) datePayStr = text;
                        }

                        if (!text.includes('%') && (text.includes('R$') || text.match(/\d+,\d+/))) {
                            valStr = text;
                        }
                    });

                    const rate = parseValue(valStr);
                    const dateCom = parseDate(dateComStr);
                    const paymentDate = parseDate(datePayStr);

                    if (dateCom && rate !== null && rate > 0) {
                        finalDividends.push({ ticker: ticker.toUpperCase(), type: typeDiv, date_com: dateCom, payment_date: paymentDate || null, rate });
                    }
                });
            }

            if ((dados.dy === null || dados.dy === 0) && dados.ultimo_rendimento && dados.cotacao_atual) {
                dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100 * 12; 
            }

            Object.keys(dados).forEach(k => {
                if (dados[k] === null || dados[k] === undefined || dados[k] === '') delete dados[k];
            });

            finalData = {
                ...dados,
                dy_12m: dados.dy,
                current_price: dados.cotacao_atual,
                properties: realEstateProperties,
                benchmarks: benchmarks
            };
            
            break; 
        } catch (e) {
            continue;
        }
    }

    if (!finalData) return res.status(404).json({ success: false, error: 'Dados não encontrados' });

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
        if (!force) {
            const { data: existing } = await supabase.from('ativos_metadata').select('*').eq('ticker', ticker).single();
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                if (age < 3600000) { // 1 hora cache
                     const { data: divs } = await supabase.from('market_dividends').select('*').eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        if (!result || !result.metadata) return res.status(404).json({ success: false });

        const { metadata, dividends } = result;

        const dbPayload = { ...metadata };
        delete dbPayload.dy;
        delete dbPayload.cotacao_atual;
        
        await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });

        if (dividends.length > 0) {
             const today = new Date().toISOString().split('T')[0];
             await supabase.from('market_dividends').delete().eq('ticker', ticker).gte('payment_date', today);
             
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
