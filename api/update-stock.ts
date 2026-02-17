
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
function parseValue(valueStr: any): number | null {
    if (valueStr === undefined || valueStr === null) return null;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === '--' || str === 'N/A') return null;

    str = str.replace('%', '').replace(/^R\$\s?/, '').trim();

    // Tratamento de escalas (K, M, B)
    let multiplier = 1;
    const lastChar = str.slice(-1).toUpperCase();
    if (['B', 'M', 'K'].includes(lastChar)) {
        if (lastChar === 'B') multiplier = 1e9;
        else if (lastChar === 'M') multiplier = 1e6;
        else if (lastChar === 'K') multiplier = 1e3;
        str = str.slice(0, -1).trim();
    }

    // Limpeza de caracteres invisíveis e formatação BR
    str = str.replace(/\s/g, '').replace(/\u00A0/g, '');
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    let clean = "";
    if (lastComma > lastDot) {
        clean = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        clean = str.replace(/,/g, '');
    } else {
        clean = lastComma !== -1 ? str.replace(',', '.') : str;
    }

    const result = parseFloat(clean.replace(/[^0-9.-]/g, ''));
    return isNaN(result) ? null : result * multiplier;
}

function parseDate(dateStr: string) {
    if (!dateStr || dateStr.length < 8) return null;
    try {
        const parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        }
        return null;
    } catch { return null; }
}

async function scrapeInvestidor10(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    const urls = isLikelyFii 
        ? [`https://investidor10.com.br/fiis/${tickerLower}/`, `https://investidor10.com.br/fiagros/${tickerLower}/`, `https://investidor10.com.br/acoes/${tickerLower}/`] 
        : [`https://investidor10.com.br/acoes/${tickerLower}/`, `https://investidor10.com.br/bdrs/${tickerLower}/`, `https://investidor10.com.br/fiis/${tickerLower}/`];

    let finalData: any = null;
    let finalDividends: any[] = [];
    let realEstateProperties: any[] = [];
    let benchmarks: any[] = [];

    for (const url of urls) {
        try {
            const res = await client.get(url, { headers: { 'User-Agent': getRandomAgent() } });
            if (res.data.length < 3000) continue; // Página inválida ou muito curta

            const $ = cheerio.load(res.data);
            
            // Detecta tipo real baseado na URL de sucesso
            let type = 'ACAO';
            if (url.includes('/fiis/') || url.includes('/fiagros/')) type = 'FII';
            else if (url.includes('/bdrs/')) type = 'BDR';

            // --- 1. DADOS FUNDAMENTAIS ---
            const dados: any = {
                ticker: ticker.toUpperCase(), type, updated_at: new Date().toISOString(),
                dy: null, pvp: null, pl: null, liquidez: null, val_mercado: null, segmento: null,
                roe: null, margem_liquida: null, vacancia: null, ultimo_rendimento: null
            };

            // Mapeamento simples de chaves
            const keyMap: Record<string, string> = {
                'p/vp': 'pvp', 'vp': 'pvp', 'p/l': 'pl', 'dy': 'dy', 'dividend yield': 'dy',
                'liquidez media diaria': 'liquidez', 'valor de mercado': 'val_mercado',
                'roe': 'roe', 'margem liquida': 'margem_liquida', 'vacancia fisica': 'vacancia',
                'ultimo rendimento': 'ultimo_rendimento', 'cotacao': 'cotacao_atual'
            };

            // Varre os cards principais (_card) e tabela de indicadores
            $('div._card, #table-indicators .cell').each((_, el) => {
                const label = $(el).find('div._card-header, .name span').text().trim().toLowerCase();
                const value = $(el).find('div._card-body, .value span').text().trim();
                
                if (label && value) {
                    for (const k in keyMap) {
                        if (label.includes(k)) {
                            const parsed = parseValue(value);
                            if (parsed !== null) dados[keyMap[k]] = parsed;
                            break;
                        }
                    }
                }
            });

            // Segmento
            if (!dados.segmento) {
                $('#breadcrumbs li').each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt && !['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'Fiagros'].includes(txt) && txt.toUpperCase() !== ticker) {
                        dados.segmento = txt;
                    }
                });
            }

            // Fallback Cotação
            if (!dados.cotacao_atual) {
                const val = $('div._card-body').first().text().trim(); // Geralmente o primeiro card é cotação
                dados.cotacao_atual = parseValue(val);
            }

            // --- 2. LISTA DE IMÓVEIS (Específico FIIs) ---
            // Estratégia: Buscar ID #sc-properties (Padrão Investidor10)
            if (type === 'FII') {
                const propertiesContainer = $('#sc-properties, #sc-portfolio-fii, .properties-list');
                
                if (propertiesContainer.length > 0) {
                    propertiesContainer.find('.card-property, .card').each((_, el) => {
                        const name = $(el).find('.card-header h3, h4, .title').text().trim();
                        const location = $(el).find('.card-body p, .address, .description').first().text().trim();
                        
                        if (name && name.length > 2 && !name.includes('%')) {
                            realEstateProperties.push({
                                name: name.replace(/\s+/g, ' '),
                                location: location ? location.replace(/\s+/g, ' ') : 'Localização não informada',
                                type: 'Imóvel'
                            });
                        }
                    });
                }
                
                // Fallback: Tabela de Imóveis (Layout Antigo)
                if (realEstateProperties.length === 0) {
                    $('table').each((_, table) => {
                        const header = $(table).find('thead').text().toLowerCase();
                        if (header.includes('imóvel') && header.includes('endereço')) {
                            $(table).find('tbody tr').each((_, tr) => {
                                const cols = $(tr).find('td');
                                if (cols.length >= 2) {
                                    realEstateProperties.push({
                                        name: $(cols[0]).text().trim(),
                                        location: $(cols[1]).text().trim(),
                                        type: 'Imóvel'
                                    });
                                }
                            });
                        }
                    });
                }
            }

            // --- 3. BENCHMARKS (Rentabilidade) ---
            // Estratégia: Buscar ID #table-rentabilidade ou tabela com texto "12 meses"
            const rentabSection = $('#rentabilidade, #sc-rentabilidade');
            let rentabTable = rentabSection.find('table');
            
            if (rentabTable.length === 0) {
                // Busca genérica por tabela
                $('table').each((_, table) => {
                    const txt = $(table).text().toLowerCase();
                    if (txt.includes('rentabilidade') && (txt.includes('cdi') || txt.includes('ifix') || txt.includes('ibov'))) {
                        rentabTable = $(table);
                        return false;
                    }
                });
            }

            if (rentabTable.length > 0) {
                const headers: string[] = [];
                rentabTable.find('thead th').each((_, th) => headers.push($(th).text().trim().toLowerCase()));
                if (headers.length === 0) rentabTable.find('tr:first-child td').each((_, td) => headers.push($(td).text().trim().toLowerCase()));

                rentabTable.find('tbody tr').each((_, tr) => {
                    const rowData: any = {};
                    $(tr).find('td').each((idx, td) => {
                        if (headers[idx]) rowData[headers[idx]] = $(td).text().trim();
                    });

                    // Identifica a label (primeira coluna)
                    const label = Object.values(rowData)[0] as string;
                    if (label && ['12 meses', '24 meses', 'ano atual', 'mês atual'].some(k => label.toLowerCase().includes(k))) {
                        const bench: any = { label };
                        
                        Object.keys(rowData).forEach(k => {
                            const val = parseValue(rowData[k]);
                            if (k.includes(ticker.toLowerCase())) bench.asset = val;
                            else if (k.includes('cdi')) bench.cdi = val;
                            else if (k.includes('ifix')) bench.ifix = val;
                            else if (k.includes('ibov')) bench.ibov = val;
                        });

                        if (bench.asset !== undefined) benchmarks.push(bench);
                    }
                });
            }

            // --- 4. HISTÓRICO DE DIVIDENDOS ---
            const divTable = $('#table-dividends-history');
            if (divTable.length > 0) {
                divTable.find('tbody tr').each((_, tr) => {
                    const cols = $(tr).find('td');
                    if (cols.length >= 3) {
                        const typeRaw = $(cols[0]).text().trim().toLowerCase();
                        const dateComRaw = $(cols[1]).text().trim();
                        const datePayRaw = $(cols[2]).text().trim();
                        const valRaw = $(cols[3]).text().trim();

                        let typeDiv = 'DIV';
                        if (typeRaw.includes('jcp')) typeDiv = 'JCP';
                        else if (typeRaw.includes('rendimento')) typeDiv = 'REND';
                        else if (typeRaw.includes('amortiza')) typeDiv = 'AMORT';

                        const rate = parseValue(valRaw);
                        const dateCom = parseDate(dateComRaw);
                        const paymentDate = parseDate(datePayRaw);

                        if (dateCom && rate !== null && rate > 0) {
                            finalDividends.push({
                                ticker: ticker.toUpperCase(),
                                type: typeDiv,
                                date_com: dateCom,
                                payment_date: paymentDate || null,
                                rate
                            });
                        }
                    }
                });
            }

            // Salva dados capturados e encerra
            if (dados.cotacao_atual || finalDividends.length > 0) {
                if ((dados.dy === null || dados.dy === 0) && dados.ultimo_rendimento && dados.cotacao_atual) {
                    dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100 * 12;
                }

                // Limpa chaves nulas
                Object.keys(dados).forEach(k => {
                    if (dados[k] === null || dados[k] === undefined) delete dados[k];
                });

                finalData = {
                    ...dados,
                    dy_12m: dados.dy,
                    current_price: dados.cotacao_atual,
                    properties: realEstateProperties,
                    benchmarks: benchmarks
                };
                break; // Sucesso, sai do loop de URLs
            }

        } catch (e) {
            console.error(`Erro ao processar ${url}:`, e);
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
        // Cache Check (Supabase)
        if (!force) {
            const { data: existing } = await supabase.from('ativos_metadata').select('*').eq('ticker', ticker).single();
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                if (age < 3600000) { // 1h Cache
                     const { data: divs } = await supabase.from('market_dividends').select('*').eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        // Scrape
        const result = await scrapeInvestidor10(ticker);
        if (!result) return res.status(404).json({ success: false, error: 'Dados não encontrados' });

        const { metadata, dividends } = result;

        // Save Metadata
        const dbPayload = { ...metadata };
        delete dbPayload.dy; // Remove legacy keys
        delete dbPayload.cotacao_atual;
        await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });

        // Save Dividends
        if (dividends.length > 0) {
             const today = new Date().toISOString().split('T')[0];
             // Limpa dividendos futuros antigos para evitar duplicatas erradas
             await supabase.from('market_dividends').delete().eq('ticker', ticker).gte('payment_date', today);
             
             // Upsert novos
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
