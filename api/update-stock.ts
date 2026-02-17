
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

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
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
    timeout: 15000, 
    maxRedirects: 5
});

// --- HELPERS ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

// Parse numérico estrito (retorna null se não for número)
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

// Parse de data
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

// Mapeamento expandido
function mapLabelToKey(label: string): string | null {
    const norm = normalize(label);
    if (!norm) return null;
    
    if (norm === 'cotacao' || norm.includes('valor atual')) return 'cotacao_atual';
    if (norm.includes('razao social')) return 'company_name';
    if (norm.includes('cnpj')) return 'cnpj';
    if (norm.includes('publico')) return 'target_audience';
    if (norm.includes('mandato')) return 'mandate';
    if (norm.includes('segmento')) return 'segment_secondary';
    if (norm.includes('tipo de fundo')) return 'fund_type';
    if (norm.includes('prazo')) return 'duration';
    if (norm.includes('tipo de gestao') || norm === 'gestao') return 'manager_type';
    if (norm.includes('taxa de admin')) return 'management_fee';
    if (norm.includes('vacancia') && !norm.includes('financeira')) return 'vacancia';
    if (norm.includes('numero de cotistas') || norm.includes('num cotistas')) return 'num_cotistas';
    if (norm.includes('cotas emitidas')) return 'num_quotas';
    if (norm.includes('valor patrimonial p/ cota') || norm === 'vp/cota' || norm === 'vp cota') return 'vpa';
    if (norm === 'valor patrimonial' || norm === 'patrimonio liquido') return 'assets_value';
    if (norm.includes('ultimo rendimento')) return 'last_dividend';
    if (norm === 'p/vp' || norm === 'pvp') return 'pvp';
    if (norm === 'liquidez diaria') return 'liquidez';
    if (norm.includes('dy') && norm.includes('12m')) return 'dy';
    if (norm.includes('valor de mercado')) return 'val_mercado';
    if (norm === 'p/l') return 'pl';
    if (norm === 'roe') return 'roe';

    return null;
}

// Lista de chaves que DEVEM ser tratadas como texto (não tentar parse numérico)
const STRING_KEYS = [
    'company_name', 'cnpj', 'target_audience', 'mandate', 'segment_secondary', 
    'fund_type', 'duration', 'manager_type', 'management_fee', 'liquidez', 
    'val_mercado', 'assets_value', 'num_quotas'
];

async function scrapeInvestidor10(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    const urlFii = `https://investidor10.com.br/fiis/${tickerLower}/`;
    const urlAcao = `https://investidor10.com.br/acoes/${tickerLower}/`;
    
    // Tenta primeiro a URL mais provável
    const urls = isLikelyFii ? [urlFii, urlAcao] : [urlAcao, urlFii];

    let finalData: any = null;
    let finalDividends: any[] = [];
    let realEstateProperties: any[] = [];

    for (const url of urls) {
        try {
            const res = await client.get(url, { headers: { 'User-Agent': getRandomAgent() } });
            if (res.data.length < 5000) continue;

            const $ = cheerio.load(res.data);
            
            // Validação simples se página carregou
            const headerContainer = $('#header_action');
            if (headerContainer.length === 0) continue;

            let type = url.includes('/fiis/') ? 'FII' : 'ACAO';

            // --- 1. HEADER (Preço, Nome) ---
            const dados: any = {
                ticker: ticker.toUpperCase(),
                type: type,
                updated_at: new Date().toISOString(),
                // Inicializa nulos para garantir estrutura
                dy: null, pvp: null, pl: null, vacancia: null,
                profitability_month: null, profitability_12m: null,
                // Strings nulas
                company_name: null, cnpj: null, segment_secondary: null
            };

            const headerPriceStr = headerContainer.find('div._card-body span.value').text().trim();
            const headerName = headerContainer.find('h2.name-ticker').text().trim();
            
            if (headerPriceStr) dados.cotacao_atual = parseValue(headerPriceStr);
            if (headerName) dados.name = headerName;

            // --- 2. CARDS DO TOPO (Indicadores Principais) ---
            $('#cards-ticker div._card').each((_, el) => {
                const label = $(el).find('div._card-header span').first().text().trim();
                const value = $(el).find('div._card-body span').first().text().trim();
                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key) dados[key] = parseValue(value);
                }
            });

            // --- 3. INFORMAÇÕES GERAIS (Estratégia Múltipla) ---
            // Tenta container padrão .cell (Investidor10 Desktop)
            let foundInfo = false;
            
            const extractInfo = (label: string, value: string) => {
                if (!label || !value) return;
                const key = mapLabelToKey(label);
                if (key) {
                    if (STRING_KEYS.includes(key)) {
                        dados[key] = value.replace(/\s+/g, ' ').trim();
                    } else {
                        dados[key] = parseValue(value);
                    }
                    foundInfo = true;
                }
            };

            // Método A: Container #table-general-data (Estrutura Grid)
            $('#table-general-data .cell').each((_, el) => {
                const label = $(el).find('.name span').first().text().trim() || $(el).find('.name').text().trim();
                const value = $(el).find('.value span').first().text().trim() || $(el).find('.value').text().trim();
                extractInfo(label, value);
            });

            // Método B: Se falhar A, tenta buscar tabela genérica próxima ao título "Informações sobre..."
            if (!foundInfo) {
                $('h2, h3, h4').each((_, h) => {
                    if ($(h).text().toLowerCase().includes('informações sobre')) {
                        // Procura tabela ou lista próxima
                        const container = $(h).nextAll('div, table').first();
                        container.find('.cell, tr').each((_, row) => {
                            const label = $(row).find('.name, td:first-child').text().trim();
                            const value = $(row).find('.value, td:last-child').text().trim();
                            extractInfo(label, value);
                        });
                    }
                });
            }

            // --- 4. RENTABILIDADE (Tabela Específica) ---
            const rentabTable = $('table.table-rentabilidade, #table-rentabilidade');
            if (rentabTable.length > 0) {
                const colMap: Record<number, string> = {};
                rentabTable.find('thead th').each((idx, th) => {
                    const txt = $(th).text().toLowerCase().trim();
                    if (txt.includes('1 m')) colMap[idx] = 'month';
                    else if (txt.includes('3 m')) colMap[idx] = '3m';
                    else if (txt.includes('1 a') || txt.includes('12 m')) colMap[idx] = '12m';
                    else if (txt.includes('2 a')) colMap[idx] = '2y';
                });

                rentabTable.find('tbody tr').each((_, tr) => {
                    const rowLabel = $(tr).find('td').first().text().trim().toLowerCase();
                    const isReal = rowLabel.includes('real');
                    
                    if (rowLabel.includes('rentabilidade')) {
                        $(tr).find('td').each((idx, td) => {
                            const period = colMap[idx];
                            if (period) {
                                const valStr = $(td).text().trim();
                                const val = parseValue(valStr);
                                if (val !== null) {
                                    const key = isReal ? `profitability_real_${period}` : `profitability_${period}`;
                                    dados[key] = val;
                                }
                            }
                        });
                    }
                });
            }

            // --- 5. DIVIDENDOS (Histórico) ---
            $('#table-dividends-history tbody tr').each((_, tr) => {
                const cols = $(tr).find('td');
                if (cols.length >= 3) {
                    let type = 'DIV';
                    let dateComStr = '';
                    let datePayStr = '';
                    let valStr = '';

                    cols.each((_, td) => {
                        const txt = $(td).text().trim();
                        const norm = normalize(txt);
                        if (norm.includes('jcp')) type = 'JCP';
                        else if (norm.includes('rendimento')) type = 'REND';
                        else if (norm.includes('amortiza')) type = 'AMORT';

                        if (txt.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            if (!dateComStr) dateComStr = txt;
                            else if (!datePayStr) datePayStr = txt;
                        }
                        if (txt.includes(',') && !txt.includes('%')) {
                            if (!valStr && !txt.includes('/')) valStr = txt;
                        }
                    });

                    const rate = parseValue(valStr);
                    const dateCom = parseDate(dateComStr);
                    const paymentDate = parseDate(datePayStr);

                    if (dateCom && rate !== null && rate > 0) {
                        finalDividends.push({
                            ticker: ticker.toUpperCase(),
                            type,
                            date_com: dateCom,
                            payment_date: paymentDate || null,
                            rate
                        });
                    }
                }
            });

            // --- 6. IMÓVEIS ---
            if (type === 'FII') {
                const propContainer = $('#sc_properties, #properties-section, .properties-list');
                propContainer.find('.card, .property-card, .item').each((_, el) => {
                    let name = $(el).find('h4, h3, .title, .name').first().text().trim();
                    let location = $(el).find('.address, .location, .sub-title, p').not('.name').first().text().trim();
                    
                    if (name && name.length > 3 && !name.includes('%')) {
                        realEstateProperties.push({
                            name: name.replace(/\s+/g, ' '),
                            location: location ? location.replace(/\s+/g, ' ') : 'Localização não informada',
                            type: 'Imóvel'
                        });
                    }
                });
            }

            // Cálculos finais
            if ((dados.dy === null || dados.dy === 0) && dados.last_dividend && dados.cotacao_atual) {
                dados.dy = (dados.last_dividend / dados.cotacao_atual) * 100 * 12;
            }
            if (dados.vpa === null && dados.pvp > 0 && dados.cotacao_atual > 0) {
                dados.vpa = dados.cotacao_atual / dados.pvp;
            }

            // Remove chaves nulas para não sobrescrever DB com null
            Object.keys(dados).forEach(k => {
                if (dados[k] === null || dados[k] === undefined || dados[k] === '') delete dados[k];
            });

            finalData = {
                ...dados,
                dy_12m: dados.dy,
                current_price: dados.cotacao_atual,
                properties: realEstateProperties
            };
            
            break; // Sucesso na URL
        } catch (e) {
            continue; // Tenta próxima URL
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
        if (!force) {
            const { data: existing } = await supabase.from('ativos_metadata').select('*').eq('ticker', ticker).single();
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                if (age < 10800000) { // 3h Cache
                     const { data: divs } = await supabase.from('market_dividends').select('*').eq('ticker', ticker);
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
