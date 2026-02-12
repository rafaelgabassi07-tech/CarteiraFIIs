
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Lista rotativa expandida de User-Agents
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
];

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    timeout: 20000, 
    maxRedirects: 5
});

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseValue(valueStr: any): number | null {
    if (typeof valueStr === 'number') return valueStr;
    if (!valueStr) return null;
    
    let str = String(valueStr).trim();
    if (str === '-' || str === '--' || str.toLowerCase() === 'n/a') return null;

    let multiplier = 1;
    if (str.toUpperCase().endsWith('K')) multiplier = 1e3;
    if (str.toUpperCase().endsWith('M')) multiplier = 1e6;
    if (str.toUpperCase().endsWith('B')) multiplier = 1e9;

    str = str.replace(/[R$%\sA-Za-z]/g, ''); 
    
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }

    const num = parseFloat(str);
    return isNaN(num) ? null : num * multiplier;
}

function getKeyFromLabel(label: string): string | null {
    const n = normalize(label);
    if (!n) return null;

    if (n === 'p/vp' || n === 'vp') return 'pvp';
    if (n.includes('dividend yield') || n === 'dy') return 'dy';
    if (n.includes('cotacao') || n.includes('valor atual')) return 'cotacao_atual';
    if (n.includes('liquidez')) return 'liquidez';
    if (n === 'valor de mercado') return 'val_mercado';
    
    if (n.includes('vacancia fisica') || n === 'vacancia') return 'vacancia';
    if (n.includes('ultimo rendimento')) return 'ultimo_rendimento';
    if (n.includes('patrimonio liquido')) return 'patrimonio_liquido';
    if (n.includes('numero de cotistas') || n.includes('qtd cotistas')) return 'num_cotistas';
    
    if (n === 'p/l' || n === 'pl') return 'pl';
    if (n === 'roe') return 'roe';
    if (n.includes('margem liquida')) return 'margem_liquida';
    if (n.includes('divida liquida / ebitda') || n.includes('div liq / ebitda')) return 'divida_liquida_ebitda';
    if (n === 'ev / ebitda') return 'ev_ebitda';
    if (n.includes('cagr receitas')) return 'cagr_receita_5a';

    return null;
}

async function scrapeInvestidor10(ticker: string) {
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    const tickerLower = ticker.toLowerCase();
    
    const urls = isLikelyFii 
        ? [`https://investidor10.com.br/fiis/${tickerLower}/`, `https://investidor10.com.br/acoes/${tickerLower}/`, `https://investidor10.com.br/fiagros/${tickerLower}/`]
        : [`https://investidor10.com.br/acoes/${tickerLower}/`, `https://investidor10.com.br/fiis/${tickerLower}/`, `https://investidor10.com.br/bdrs/${tickerLower}/`];

    let finalData: any = {};
    let foundAny = false;

    for (const url of urls) {
        try {
            const res = await client.get(url, {
                headers: {
                    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Referer': 'https://google.com'
                }
            });

            if (res.status !== 200) continue;
            
            const $ = cheerio.load(res.data);
            
            if ($('title').text().includes('404') || $('body').text().includes('Página não encontrada')) continue;

            if (url.includes('/fiis/') || url.includes('/fiagros/')) finalData.type = 'FII';
            else if (url.includes('/bdrs/')) finalData.type = 'BDR';
            else finalData.type = 'ACAO';

            // --- COLETA DE FUNDAMENTOS ---
            $('div, span, p').each((_, el) => {
                const text = $(el).text().trim();
                const key = getKeyFromLabel(text);
                
                if (key && !finalData[key]) {
                    let val = $(el).next().text().trim() || 
                              $(el).find('span').last().text().trim() ||
                              $(el).parent().find('.value').text().trim() ||
                              $(el).parent().next().text().trim();

                    if (!val) {
                        val = $(el).closest('div').find('._card-body, .value').text().trim();
                    }

                    if (val && val !== text) {
                        const parsed = parseValue(val);
                        if (parsed !== null) {
                            finalData[key] = parsed;
                            foundAny = true;
                        }
                    }
                }
            });

            $('.cell').each((_, cell) => {
                const label = $(cell).find('.name, .title').text().trim();
                const value = $(cell).find('.value, .data').text().trim();
                const key = getKeyFromLabel(label);
                if (key && value && !finalData[key]) {
                    const parsed = parseValue(value);
                    if (parsed !== null) {
                        finalData[key] = parsed;
                        foundAny = true;
                    }
                }
            });

            if (!finalData.segmento) {
                $('#breadcrumbs li, .breadcrumbs li').each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt && !['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'Fiagros'].includes(txt) && txt.toUpperCase() !== ticker) {
                        finalData.segmento = txt;
                    }
                });
            }

            if (foundAny) {
                finalData.ticker = ticker.toUpperCase();
                finalData.updated_at = new Date().toISOString();
                
                finalData.current_price = finalData.cotacao_atual;
                finalData.dy_12m = finalData.dy;
                
                if (!finalData.dy_12m && finalData.ultimo_rendimento && finalData.current_price) {
                    finalData.dy_12m = (finalData.ultimo_rendimento / finalData.current_price) * 100 * 12;
                }

                // --- COLETA DE DIVIDENDOS (LÓGICA ROBUSTA) ---
                const dividends: any[] = [];
                
                // Itera sobre TODAS as tabelas da página
                $('table').each((_, table) => {
                    // Mapeia índices das colunas baseado no texto do cabeçalho
                    let idxDataCom = -1;
                    let idxPagamento = -1;
                    let idxValor = -1;
                    let idxTipo = -1;

                    $(table).find('thead th').each((idx, th) => {
                        const txt = $(th).text().toLowerCase().trim();
                        if (txt.includes('com') || txt.includes('base')) idxDataCom = idx;
                        if (txt.includes('pagamento')) idxPagamento = idx;
                        if (txt.includes('valor')) idxValor = idx;
                        if (txt.includes('tipo')) idxTipo = idx;
                    });

                    // Se encontrou as colunas essenciais (Com e Valor são obrigatórios)
                    if (idxDataCom !== -1 && idxValor !== -1) {
                        $(table).find('tbody tr').each((_, tr) => {
                            const tds = $(tr).find('td');
                            
                            const extractDate = (idx: number) => {
                                if (idx === -1) return null;
                                const raw = $(tds[idx]).text().trim();
                                if (!raw || raw === '-' || raw.toLowerCase().includes('aguard')) return null;
                                const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                                return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
                            };

                            const dateCom = extractDate(idxDataCom);
                            let payDate = extractDate(idxPagamento); // Pode ser null
                            
                            const valStr = $(tds[idxValor]).text().trim();
                            const rate = parseValue(valStr);
                            
                            let type = 'DIV';
                            if (idxTipo !== -1) {
                                const rawType = $(tds[idxTipo]).text().trim().toLowerCase();
                                if (rawType.includes('jcp') || rawType.includes('juros')) type = 'JCP';
                                else if (rawType.includes('rendimento')) type = 'REND';
                                else if (rawType.includes('dividendo')) type = 'DIV';
                            }

                            // Validação: precisa de data com e valor positivo
                            if (dateCom && rate && rate > 0) {
                                dividends.push({
                                    ticker: ticker.toUpperCase(),
                                    type,
                                    date_com: dateCom,
                                    payment_date: payDate, // Mantém null se não tiver data, o frontend trata como "A Definir"
                                    rate
                                });
                            }
                        });
                    }
                });

                return { metadata: finalData, dividends };
            }
        } catch (e) {
            console.error(`Erro ao acessar ${url}:`, e.message);
        }
    }
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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
                // Cache de 3 horas
                if (age < 10800000) {
                    const { data: divs } = await supabase.from('market_dividends').select('*').eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [] });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados na fonte.' });
        }

        const { error: metaError } = await supabase.from('ativos_metadata').upsert(result.metadata, { onConflict: 'ticker' });
        
        if (result.dividends.length > 0) {
            const cleanDivs = result.dividends.map(d => ({
                ticker: d.ticker,
                type: d.type,
                date_com: d.date_com,
                payment_date: d.payment_date,
                rate: d.rate
            }));
            
            // Upsert seguro para evitar duplicatas, mas atualizando datas de pagamento que mudaram de null para valor real
            await supabase.from('market_dividends').upsert(cleanDivs, { onConflict: 'ticker,type,date_com,rate', ignoreDuplicates: false });
        }

        return res.status(200).json({ success: true, data: result.metadata, dividends: result.dividends });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
