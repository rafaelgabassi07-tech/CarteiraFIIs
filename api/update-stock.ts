
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

// --- HELPERS TÉCNICOS ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any): number | null {
    if (valueStr === undefined || valueStr === null) return null;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === '--' || str === 'N/A' || str === '%') return null;

    // Limpeza técnica de sufixos/prefixos
    str = str.replace(/^R\$\s?/, '').replace(/%$/, '').trim();

    // Tratamento de Multiplicadores (K, M, B)
    let multiplier = 1;
    const lastChar = str.slice(-1).toUpperCase();
    if (['B', 'M', 'K'].includes(lastChar)) {
        if (lastChar === 'B') multiplier = 1e9;
        else if (lastChar === 'M') multiplier = 1e6;
        else if (lastChar === 'K') multiplier = 1e3;
        str = str.slice(0, -1).trim();
    }

    str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

    // Detecção de Formato Numérico (BR vs US)
    const lastCommaIndex = str.lastIndexOf(',');
    const lastDotIndex = str.lastIndexOf('.');
    
    let clean = "";
    if (lastCommaIndex > lastDotIndex) {
        // Formato BR (1.000,00)
        clean = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIndex > lastCommaIndex) {
        // Formato US (1,000.00)
        clean = str.replace(/,/g, '');
    } else {
        // Ambíguo ou sem separador de milhar
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

// Mapeamento Técnico de Labels para Chaves Internas
function mapLabelToKey(label: string): string | null {
    const norm = normalize(label);
    if (!norm) return null;
    const cleanNorm = norm.replace(/\s+/g, ''); // Versão sem espaços para comparação robusta
    
    // Valuation & Preço
    if (cleanNorm === 'p/vp' || cleanNorm === 'vp' || cleanNorm === 'p/vpa') return 'pvp'; 
    if (cleanNorm === 'p/l' || cleanNorm === 'pl') return 'pl';
    
    // DY
    if (norm.includes('dy') || norm.includes('dividend yield')) return 'dy';
    
    if (norm === 'cotacao' || norm.includes('valor atual')) return 'cotacao_atual';
    
    // VPA (Valor Patrimonial por Cota)
    // Matches: "VPA", "VP/Cota", "Valor Patrimonial" (Exato), "VP por Cota"
    if (cleanNorm === 'vpa' || cleanNorm === 'vp/cota' || cleanNorm === 'vpcota' || (norm.includes('valor patrimonial') && !norm.includes('liquido'))) return 'vpa';
    
    if (norm === 'lpa') return 'lpa';
    if (cleanNorm === 'ev/ebitda') return 'ev_ebitda';
    
    // Efficiency
    if (norm === 'roe') return 'roe';
    if (norm === 'margem liquida') return 'margem_liquida';
    if (norm === 'margem bruta') return 'margem_bruta';
    
    // Growth & Debt
    if (norm.includes('cagr receitas')) return 'cagr_receita_5a';
    if (norm.includes('cagr lucros')) return 'cagr_lucros_5a';
    if (norm.includes('liquida/ebitda') || norm.includes('liq/ebitda')) return 'divida_liquida_ebitda';
    
    // Liquidity & Market
    if (norm.includes('liquidez')) return 'liquidez';
    if (norm.includes('valor de mercado')) return 'val_mercado';
    
    // FII Specifics
    if (norm.includes('ultimo rendimento')) return 'ultimo_rendimento';
    
    // Patrimônio Líquido (Total)
    // Matches: "Patrimônio Líquido", "Patrim. Líquido", "Patrimonio" (if not Valor Patrimonial)
    if ((norm.includes('patrim') && norm.includes('liquido')) || norm === 'patrimonio') return 'patrimonio_liquido'; 
    
    if (norm.includes('cotistas') || norm.includes('numero de cotistas')) return 'num_cotistas';
    
    // Vacância (Prioriza Física)
    if (norm.includes('vacancia') && !norm.includes('financeira')) return 'vacancia'; 
    
    if (norm.includes('tipo de gestao') || norm === 'gestao') return 'tipo_gestao';
    if (norm.includes('taxa de administracao') || norm.includes('taxa de admin')) return 'taxa_adm';
    if (norm.includes('segmento')) return 'segmento';

    return null;
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
            lpa: null, vpa: null,
            vacancia: null, ultimo_rendimento: null, num_cotistas: null, 
            patrimonio_liquido: null,
            taxa_adm: null, tipo_gestao: null
        };

        // --- ESTRATÉGIA TÉCNICA 1: Iteração por Cards/Tabelas Padrão ---
        const selectors = [
            'div._card', 
            '#table-indicators .cell', 
            '#table-general-data .cell', 
            '.indicator-box', 
            '.data-entry',
            '.cell' 
        ];
        
        selectors.forEach(selector => {
            $(selector).each((_, el) => {
                let label = $(el).find('div._card-header, .name, .title, span:first-child').first().text().trim();
                let value = $(el).find('div._card-body, .value, .data, span:last-child').last().text().trim();

                if (!label && !value) {
                    const spans = $(el).find('span');
                    if (spans.length >= 2) {
                        label = $(spans[0]).text().trim();
                        value = $(spans[1]).text().trim();
                    }
                }

                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key) {
                        // Só sobrescreve se ainda estiver null (first match wins usually best)
                        if (dados[key] === null) {
                            if (['segmento', 'tipo_gestao', 'taxa_adm'].includes(key)) {
                                dados[key] = value;
                            } else {
                                const parsed = parseValue(value);
                                if (parsed !== null) dados[key] = parsed;
                            }
                        }
                    }
                }
            });
        });

        // --- ESTRATÉGIA TÉCNICA 2: Fallback de Busca Textual Direta ---
        // Se campos críticos ainda estiverem vazios, varre o texto visível
        const missingKeys = Object.keys(dados).filter(k => dados[k] === null);
        
        if (missingKeys.length > 0) {
             $('span, div, p, strong, b').each((_, el) => {
                 const label = $(el).text().trim();
                 if (label.length > 50) return;

                 const key = mapLabelToKey(label);
                 
                 if (key && dados[key] === null) {
                     let value = $(el).next().text().trim();
                     
                     if (!value) {
                         const parent = $(el).parent();
                         value = parent.find('.value, .data').text().trim();
                         if (value === label) value = ''; 
                     }
                     
                     if (!value) {
                         value = $(el).parent().next().text().trim();
                     }

                     if (value) {
                         if (['segmento', 'tipo_gestao', 'taxa_adm'].includes(key)) {
                            dados[key] = value;
                        } else {
                            const parsed = parseValue(value);
                            if (parsed !== null) {
                                dados[key] = parsed;
                            }
                        }
                     }
                 }
             });
        }

        // 3. Extração de VP/Cota se ainda não encontrado (Cálculo reverso)
        if (dados.vpa === null && dados.pvp > 0 && dados.cotacao_atual > 0) {
             dados.vpa = dados.cotacao_atual / dados.pvp;
        }

        // --- EXTRAÇÃO DE DIVIDENDOS (Tabela Histórica) ---
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
            
            if (headers.length === 0) {
                tableDivs.find('tbody tr').first().find('td').each((_, td) => headers.push(normalize($(td).text())));
            }

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

                if (dateCom && rate !== null && rate > 0) {
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

        // DY fallback
        if ((dados.dy === null || dados.dy === 0) && dados.ultimo_rendimento && dados.cotacao_atual) {
            dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100; // Yield mensal (fallback)
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
