
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
        'Upgrade-Insecure-Requests': '1'
    },
    timeout: 10000, 
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
    if (!str || str === '-' || str === '--' || str === 'N/A') return null;

    // Remove % para permitir processamento de indicadores percentuais (DY, ROE, etc)
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
    
    // Mapeamentos Específicos Corrigidos
    if (norm === 'cnpj') return 'cnpj';
    if (norm === 'mandato') return 'mandato';
    if (norm.includes('publico alvo') || norm.includes('publico-alvo')) return 'publico_alvo';
    if (norm.includes('tipo de fundo')) return 'tipo_fundo';
    if (norm.includes('prazo') || norm.includes('duracao')) return 'prazo';
    if (norm.includes('razao social')) return 'razao_social';
    if (norm.includes('cotas emitidas') || norm.includes('numero de cotas')) return 'num_cotas';
    
    // Rentabilidade (Fallback para Cards)
    if ((norm.includes('rentab') || norm.includes('variacao')) && (norm.includes('12') || norm.includes('ano'))) return 'rentabilidade_12m';
    if ((norm.includes('rentab') || norm.includes('variacao')) && norm.includes('mes')) return 'rentabilidade_mes';

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

            // --- 1. HEADER INFO ---
            const headerPriceStr = $('#header_action').find('div._card-body span.value').text().trim();
            const headerName = $('#header_action').find('h2.name-ticker').text().trim();
            
            const dados: any = {
                ticker: ticker.toUpperCase(),
                type: type,
                updated_at: new Date().toISOString(),
                dy: null, pvp: null, pl: null, 
                liquidez: null, val_mercado: null,
                segmento: null,
                roe: null, margem_liquida: null,
                rentabilidade_12m: null, rentabilidade_mes: null, benchmark_cdi_12m: null,
                vacancia: null, num_cotistas: null
            };

            if (headerPriceStr) {
                const p = parseValue(headerPriceStr);
                if (p !== null) dados.cotacao_atual = p;
            }
            if (headerName) dados.name = headerName;

            // --- 2. INDICADORES (Cards e Tabelas Gerais) ---
            $('#cards-ticker div._card, #table-indicators .cell, #table-general-data .cell, .indicator-box').each((_, el) => {
                let label = $(el).find('div._card-header, .name, .title, span:first-child, h3').first().text().trim();
                let value = $(el).find('div._card-body, .value, .data, span:last-child, .desc').last().text().trim();

                if (!label && $(el).find('span').length >= 2) {
                    label = $(el).find('span').first().text().trim();
                    value = $(el).find('span').last().text().trim();
                }

                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key) {
                        const parsed = parseValue(value);
                        if (parsed !== null || ['segmento', 'mandato', 'razao_social'].includes(key)) {
                            dados[key] = parsed !== null ? parsed : value;
                        }
                    }
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

            // --- 3. RENTABILIDADE (Tabelas) ---
            $('table').each((_, table) => {
                const headerText = $(table).text().toLowerCase();
                if (headerText.includes('período') || headerText.includes('periodo') || headerText.includes('variação') || headerText.includes('rentabilidade')) {
                    
                    let idxCDI = -1, idxIndex = -1, idxAsset = -1;
                    
                    // Mapeia colunas
                    $(table).find('thead th, tr:first-child td, tr:first-child th').each((idx, th) => {
                        const txt = $(th).text().toUpperCase();
                        if (txt.includes('CDI')) idxCDI = idx;
                        if (txt.includes('IFIX') || txt.includes('IBOV')) idxIndex = idx;
                        if (txt.includes(ticker) || txt.includes('FII') || txt.includes('AÇÃO')) idxAsset = idx;
                    });
                    
                    // Se não achou header explícito, assume padrão (0=Label, 1=Ativo, 2=CDI/Index)
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
            const dividends: any[] = [];
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

                        if (text.includes(',') && !text.includes('%') && !text.includes('/')) {
                            if (!valStr) valStr = text;
                        }
                    });

                    const rate = parseValue(valStr);
                    const dateCom = parseDate(dateComStr);
                    const paymentDate = parseDate(datePayStr);

                    if (dateCom && rate !== null && rate > 0) {
                        dividends.push({ 
                            ticker: ticker.toUpperCase(), 
                            type: typeDiv, 
                            date_com: dateCom, 
                            payment_date: paymentDate || null, 
                            rate 
                        });
                    }
                });
            }

            if ((dados.dy === null || dados.dy === 0) && dados.ultimo_rendimento && dados.cotacao_atual) {
                dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100 * 12; 
            }

            finalData = {
                ...dados,
                dy_12m: dados.dy,
                current_price: dados.cotacao_atual,
                properties: realEstateProperties 
            };
            finalDividends = dividends;
            
            break; 
        } catch (e) {
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
        // Se force=true OU rentabilidade_12m for null no cache, força atualização
        let shouldScrape = force;
        
        if (!shouldScrape) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                const cacheTime = existing.dy_12m === 0 ? 3600000 : 10800000;
                
                // Força atualização se dados de rentabilidade estiverem faltando
                if (existing.rentabilidade_12m === null) {
                    shouldScrape = true;
                } else if (age < cacheTime) {
                     const { data: divs } = await supabase
                        .from('market_dividends')
                        .select('*')
                        .eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            } else {
                shouldScrape = true;
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
            
            const { error } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (error) console.error('Error saving metadata:', error);
        }

        if (dividends.length > 0) {
             const today = new Date().toISOString().split('T')[0];
             const { error: delError } = await supabase.from('market_dividends')
                .delete()
                .eq('ticker', ticker.toUpperCase())
                .gte('payment_date', today);
             
             if (delError) console.warn('Clean up error (ignorable):', delError);

             const uniqueDivs = Array.from(new Map(dividends.map(item => [
                `${item.type}-${item.date_com}-${item.rate}`, item
            ])).values());
            
            const { error } = await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
            if (error) console.error('Error saving dividends:', error);
        }

        return res.status(200).json({ success: true, data: metadata, dividends });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
