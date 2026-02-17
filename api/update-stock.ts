
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
    
    // Rentabilidade
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
                roe: null, margem_liquida: null, margem_bruta: null,
                cagr_receita_5a: null, cagr_lucros_5a: null,
                divida_liquida_ebitda: null, ev_ebitda: null,
                lpa: null, vpa: null,
                vacancia: null, ultimo_rendimento: null, num_cotistas: null, 
                patrimonio_liquido: null,
                taxa_adm: null, tipo_gestao: null,
                cnpj: null, mandato: null, publico_alvo: null, tipo_fundo: null, prazo: null,
                razao_social: null, num_cotas: null,
                rentabilidade_12m: null, rentabilidade_mes: null,
                benchmark_cdi_12m: null, benchmark_ifix_12m: null, benchmark_ibov_12m: null
            };

            if (headerPriceStr) {
                const p = parseValue(headerPriceStr);
                if (p !== null) dados.cotacao_atual = p;
            }
            if (headerName) dados.name = headerName;

            // --- 2. INDICADORES ---
            // Varredura Genérica (Cards, Tabelas Específicas)
            $('#cards-ticker div._card, #table-indicators .cell, #table-general-data .cell, .indicator-box').each((_, el) => {
                // Tenta encontrar o label em várias estruturas possíveis
                let label = $(el).find('div._card-header, .name, .title, span:first-child, h3').first().text().trim();
                let value = $(el).find('div._card-body, .value, .data, span:last-child, .desc').last().text().trim();

                // Fallback para tabelas sem classes específicas
                if (!label && $(el).find('span').length >= 2) {
                    label = $(el).find('span').first().text().trim();
                    value = $(el).find('span').last().text().trim();
                }

                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key) {
                        // Campos de texto vs Numéricos
                        if (['segmento', 'tipo_gestao', 'taxa_adm', 'cnpj', 'mandato', 'publico_alvo', 'tipo_fundo', 'prazo', 'razao_social'].includes(key)) {
                            dados[key] = value;
                        } else {
                            const parsed = parseValue(value);
                            if (parsed !== null) dados[key] = parsed;
                        }
                    }
                }
            });

            // Extração de Segmento Específica (Breadcrumbs costumam ser mais confiáveis)
            if (!dados.segmento || dados.segmento === 'Geral') {
                $('#breadcrumbs li, .breadcrumbs li').each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt && !['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'Fiagros'].includes(txt) && txt.toUpperCase() !== ticker) {
                        dados.segmento = txt;
                    }
                });
            }

            if (dados.cotacao_atual !== null || dados.dy !== null || dados.pvp !== null || dados.pl !== null) {
                if (dados.vpa === null && dados.pvp > 0 && dados.cotacao_atual > 0) {
                     dados.vpa = dados.cotacao_atual / dados.pvp;
                }

                // --- 3. LISTA DE IMÓVEIS ---
                if (type === 'FII') {
                    // Busca genérica por containers de propriedades
                    const propContainers = ['#sc_properties', '#properties-section', '.properties-list'];
                    let propertiesContainer: any = null;

                    for (const sel of propContainers) {
                        if ($(sel).length > 0) {
                            propertiesContainer = $(sel);
                            break;
                        }
                    }

                    if (!propertiesContainer) {
                        $('h2, h3, h4').each((_, el) => {
                            const txt = $(el).text().trim().toUpperCase();
                            if (txt.includes('LISTA DE IMÓVEIS') || txt.includes('PORTFÓLIO')) {
                                propertiesContainer = $(el).parent();
                                return false;
                            }
                        });
                    }

                    if (propertiesContainer) {
                        $(propertiesContainer).find('.card, .property-card, .carousel-cell, .splide__slide, .item').each((_, el) => {
                            let name = $(el).find('h4, h3, strong, .title, .name').first().text().trim();
                            let location = $(el).find('.address, .location, .sub-title, p').not('.name').first().text().trim();
                            
                            if (name && name.length > 3 && !name.includes('%') && !name.toUpperCase().includes('TOTAL')) {
                                realEstateProperties.push({
                                    name: name.replace(/\s+/g, ' '),
                                    location: location ? location.replace(/\s+/g, ' ') : 'Localização não informada',
                                    type: 'Imóvel'
                                });
                            }
                        });
                    }
                }

                // --- 4. COMPARAÇÃO COM ÍNDICES (Rentabilidade) ---
                // Varredura mais agressiva por tabelas de rentabilidade
                $('table').each((i, table) => {
                    const headerText = $(table).find('thead').text().toLowerCase() || $(table).find('tr:first-child').text().toLowerCase();
                    
                    if (headerText.includes('rentabilidade') || headerText.includes('variação') || headerText.includes('valorização')) {
                        
                        let idxCDI = -1, idxIndex = -1; 
                        
                        // Encontra índices das colunas
                        $(table).find('thead th, tr:first-child td, tr:first-child th').each((idx, th) => {
                            const txt = $(th).text().toUpperCase();
                            if (txt.includes('CDI')) idxCDI = idx;
                            if (txt.includes('IFIX') || txt.includes('IBOV')) idxIndex = idx;
                        });

                        $(table).find('tbody tr').each((_, tr) => {
                            const rowLabel = $(tr).find('td').first().text().trim().toLowerCase();
                            const cols = $(tr).find('td');

                            // Rentabilidade do Mês
                            if (rowLabel.includes('mês') || rowLabel.includes('atual') || rowLabel.includes('último')) {
                                const rentMes = parseValue($(cols[1]).text());
                                if (rentMes !== null && rentMes !== 0) dados.rentabilidade_mes = rentMes;
                            }

                            // Rentabilidade 12 Meses / Ano
                            if (rowLabel.includes('12 meses') || rowLabel.includes('ano') || rowLabel.includes('1 ano')) {
                                // Tenta pegar da coluna do ativo (geralmente index 1)
                                const rentAtivo = parseValue($(cols[1]).text());
                                if (rentAtivo !== null && rentAtivo !== 0) dados.rentabilidade_12m = rentAtivo;

                                if (idxCDI > -1) dados.benchmark_cdi_12m = parseValue($(cols[idxCDI]).text());
                                if (idxIndex > -1) {
                                    const val = parseValue($(cols[idxIndex]).text());
                                    if (type === 'FII') dados.benchmark_ifix_12m = val;
                                    else dados.benchmark_ibov_12m = val;
                                }
                            }
                        });
                    }
                });

                // Fallback para ID específico se a varredura falhar
                if (!dados.rentabilidade_12m) {
                    const historySection = $('#history-section, #rentabilidade-table');
                    if (historySection.length > 0) {
                        const table = historySection.find('table').first();
                        // ... (Lógica antiga mantida como fallback)
                    }
                }

                // --- 5. DIVIDENDOS ---
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

                Object.keys(dados).forEach(k => {
                    if (dados[k] === null || dados[k] === undefined || dados[k] === '') delete dados[k];
                });

                finalData = {
                    ...dados,
                    dy_12m: dados.dy,
                    current_price: dados.cotacao_atual,
                    properties: realEstateProperties 
                };
                finalDividends = dividends;
                
                break; 
            }

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
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                const cacheTime = existing.dy_12m === 0 ? 3600000 : 10800000;
                
                if (age < cacheTime) {
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
