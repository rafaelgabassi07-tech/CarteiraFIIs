
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- CACHE TTL ---
const getTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    // Mercado Aberto (Seg-Sex, 10h-18h): 20 min
    const isMarketOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
    return isMarketOpen ? 20 * 60 * 1000 : 4 * 60 * 60 * 1000;
};

// --- AGENTE HTTPS & HEADERS ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false 
});

const getBrowserHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Referer': 'https://investidor10.com.br/',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1'
});

async function fetchHTML(url: string) {
    for (let i = 0; i < 3; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: getBrowserHeaders(),
                timeout: 8000 + (i * 2000), 
                maxRedirects: 5
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; 
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); 
            if (i === 2) throw e;
        }
    }
}

// --- PARSING HELPERS ---

function cleanNumber(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    if (['-', 'N/A', '', '--', 'null', '%'].includes(str)) return 0;

    try {
        // Remove sufixos comuns
        str = str.replace(/%|a\.a\.|R\$|\s/gi, '');
        str = str.replace(/[^\d.,-]/g, '');
        
        if (str.includes(',') && !str.includes('.')) {
            str = str.replace(',', '.');
        } else if (str.includes('.') && str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        }
        
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    } catch { return 0; }
}

const parseToISODate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    const matchBR = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (matchBR) {
        const day = matchBR[1].padStart(2, '0');
        const month = matchBR[2].padStart(2, '0');
        const year = matchBR[3];
        return `${year}-${month}-${day}`;
    }
    return null;
}

const KEY_MAP: Record<string, string> = {
    'cotacao': 'cotacao_atual', 'preco': 'cotacao_atual', 'valoratual': 'cotacao_atual',
    'pvp': 'pvp', 'p/vp': 'pvp', 'vp': 'pvp',
    'pl': 'pl', 'p/l': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vp_cota': 'vp_cota', 'valorpatrimonial': 'vp_cota',
    'lpa': 'lpa',
    'roe': 'roe',
    'vacancia': 'vacancia', 'vacanciafisica': 'vacancia',
    'patrimonioliquido': 'patrimonio_liquido', 'pliquido': 'patrimonio_liquido',
    'liquidez': 'liquidez', 'liquidezmediadiaria': 'liquidez',
    'valor_mercado': 'val_mercado', 'valormercado': 'val_mercado',
    'segmento': 'segmento',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas',
    'taxadeadministracao': 'taxa_adm', 'taxaadm': 'taxa_adm',
    'tipodegestao': 'tipo_gestao', 'gestao': 'tipo_gestao',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento'
};

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
}

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        // Tenta URLs na ordem mais provável
        const urls = isFII 
            ? [`https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`, `https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`]
            : [`https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`, `https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`, `https://investidor10.com.br/bdrs/${ticker.toLowerCase()}/`];

        let html = null;
        let finalType = isFII ? 'FII' : 'ACAO';

        for (const url of urls) {
            try {
                html = await fetchHTML(url);
                if (url.includes('fiis')) finalType = 'FII';
                else if (url.includes('bdrs')) finalType = 'BDR';
                else finalType = 'ACAO';
                break;
            } catch (e) { /* tenta próxima URL */ }
        }

        if (!html) throw new Error('Ativo não encontrado');

        const $ = cheerio.load(html);
        const extracted: any = {};

        // 1. EXTRAÇÃO VIA CARDS (Novo Layout: _card, _card-header, _card-body)
        const addData = (k: string, v: string) => {
            const key = normalizeKey(k);
            if (KEY_MAP[key] && !extracted[KEY_MAP[key]] && v && v !== '-') { 
                extracted[KEY_MAP[key]] = v.trim();
            }
        };

        // Varre Cards de Topo e Indicadores
        $('div._card').each((_, el) => {
            const header = $(el).find('div._card-header, div.header').first();
            const body = $(el).find('div._card-body, div.body').first();
            
            // Tenta pegar o título do header ou de um span interno
            let title = header.find('span').first().text() || header.text();
            
            // Tenta pegar valor do body ou de um span interno
            let value = body.find('span').first().text() || body.text();

            if (title && value) addData(title, value);
        });

        // Varre Células de Tabelas (Layout antigo/misto)
        $('.cell').each((_, el) => {
            const title = $(el).find('.name').text();
            const value = $(el).find('.value').text();
            if (title && value) addData(title, value);
        });

        // 2. EXTRAÇÃO ESPECÍFICA (FIIs - Características)
        // Muitas vezes "Taxa de Administração" está numa lista simples ou tabela sem classes padrão
        if (finalType === 'FII') {
            // Busca textual profunda em elementos de lista ou tabela
            $('li, td, div').each((_, el) => {
                const text = $(el).text().trim();
                
                // Taxa de Administração
                if (text.toLowerCase().includes('taxa de administração')) {
                    const next = $(el).next().text().trim() || $(el).find('span').last().text().trim();
                    // Às vezes o valor está no próprio texto após ":", às vezes no próximo elemento
                    let val = '';
                    if (text.includes(':')) val = text.split(':')[1].trim();
                    if (!val && next) val = next;
                    
                    if (val && !extracted.taxa_adm) extracted.taxa_adm = val;
                }

                // Tipo de Gestão
                if (text.toLowerCase().includes('tipo de gestão')) {
                    const next = $(el).next().text().trim() || $(el).find('span').last().text().trim();
                    let val = '';
                    if (text.includes(':')) val = text.split(':')[1].trim();
                    if (!val && next) val = next;
                    
                    if (val && !extracted.tipo_gestao) extracted.tipo_gestao = val;
                }
            });
        }

        // 3. ULTIMO RENDIMENTO (Widget Específico)
        if (!extracted.ultimo_rendimento) {
             $('div._card').each((_, el) => {
                 const headerText = $(el).find('div._card-header').text().toLowerCase();
                 if (headerText.includes('último rendimento')) {
                     const val = $(el).find('div._card-body').text().trim();
                     if (val) extracted.ultimo_rendimento = val;
                 }
             });
        }

        // 4. DIVIDENDOS (Tabela Histórica #table-dividends-history)
        const dividends: any[] = [];
        
        // Tenta encontrar a tabela específica de histórico
        let table = $('#table-dividends-history');
        // Fallback: Procura qualquer tabela com headers compatíveis
        if (table.length === 0) {
            $('table').each((_, t) => {
                const h = $(t).text().toLowerCase();
                if (h.includes('data com') && h.includes('pagamento') && h.includes('valor')) {
                    table = $(t);
                    return false;
                }
            });
        }

        if (table.length > 0) {
            table.find('tbody tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length >= 3) {
                    let type = 'DIV';
                    let dateComStr, datePayStr, valStr;

                    // Detecta colunas baseado no layout comum
                    if (tds.length >= 4) {
                        const typeTxt = $(tds[0]).text().toLowerCase();
                        if (typeTxt.includes('jcp')) type = 'JCP';
                        else if (typeTxt.includes('rend')) type = 'REND';
                        else if (typeTxt.includes('amort')) type = 'AMORT';
                        
                        dateComStr = $(tds[1]).text();
                        datePayStr = $(tds[2]).text();
                        valStr = $(tds[3]).text();
                    } else {
                        dateComStr = $(tds[0]).text();
                        datePayStr = $(tds[1]).text();
                        valStr = $(tds[2]).text();
                    }

                    const dateCom = parseToISODate(dateComStr);
                    const datePay = parseToISODate(datePayStr);
                    const val = cleanNumber(valStr);

                    if (dateCom && val > 0) {
                        dividends.push({
                            ticker: ticker.toUpperCase(),
                            type,
                            date_com: dateCom,
                            payment_date: datePay || null,
                            rate: val
                        });
                    }
                }
            });
        }

        // 5. SEGMENTO
        if (!extracted.segmento) {
            let seg = '';
            $('#breadcrumbs li, .breadcrumbs span').each((_, el) => {
                const t = $(el).text().trim();
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    seg = t;
                }
            });
            if (seg) extracted.segmento = seg;
        }

        const finalMetadata = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            segmento: extracted.segmento || 'Geral',
            updated_at: new Date().toISOString(),
            
            cotacao_atual: cleanNumber(extracted.cotacao_atual),
            dy: cleanNumber(extracted.dy),
            pvp: cleanNumber(extracted.pvp),
            pl: cleanNumber(extracted.pl),
            roe: cleanNumber(extracted.roe),
            vp_cota: cleanNumber(extracted.vp_cota),
            lpa: cleanNumber(extracted.lpa),
            vacancia: cleanNumber(extracted.vacancia),
            ultimo_rendimento: cleanNumber(extracted.ultimo_rendimento),
            
            liquidez: extracted.liquidez || 'N/A',
            val_mercado: extracted.val_mercado || 'N/A',
            patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
            num_cotistas: cleanNumber(extracted.num_cotistas) || 0,
            
            // Mantém como string se não for número puro, pois pode ser "Passiva", "Ativa" ou "1,5% a.a."
            taxa_adm: extracted.taxa_adm || null,
            tipo_gestao: extracted.tipo_gestao || null,

            margem_liquida: cleanNumber(extracted.margem_liquida),
            divida_liquida_ebitda: cleanNumber(extracted.divida_liquida_ebitda),
            ev_ebitda: cleanNumber(extracted.ev_ebitda),
            cagr_receita_5a: cleanNumber(extracted.cagr_receita_5a),
            cagr_lucros_5a: cleanNumber(extracted.cagr_lucros_5a)
        };

        return { metadata: finalMetadata, dividends };

    } catch (e: any) {
        console.error(`[SCRAPER ERROR] ${ticker}: ${e.message}`);
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
                .select('updated_at')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const lastUpdate = new Date(existing.updated_at).getTime();
                const now = Date.now();
                if (now - lastUpdate < getTTL()) {
                    return res.status(200).json({ success: true, cached: true });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha na coleta de dados.' });
        }

        const { metadata, dividends } = result;

        const uniqueDivs = Array.from(new Map(dividends.map(item => [
            `${item.type}-${item.date_com}-${item.rate}`, item
        ])).values());

        if (metadata) {
            // Prepara payload DB garantindo que undefined não vá
            const dbPayload: any = { ...metadata };
            // Mapeia chaves para colunas do DB se necessário (normalização feita no scraper, mas reforçando)
            dbPayload.dy_12m = metadata.dy;
            dbPayload.cagr_receita = metadata.cagr_receita_5a;
            dbPayload.cagr_lucro = metadata.cagr_lucros_5a;
            dbPayload.valor_mercado = metadata.val_mercado;

            // Remove chaves que não existem no DB ou auxiliares
            delete dbPayload.dy;
            delete dbPayload.cagr_receita_5a;
            delete dbPayload.cagr_lucros_5a;
            delete dbPayload.val_mercado;

            Object.keys(dbPayload).forEach(key => {
                const val = dbPayload[key];
                if (val === undefined || (typeof val === 'number' && isNaN(val))) {
                    delete dbPayload[key];
                }
            });

            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            
            if (uniqueDivs.length > 0) {
                 await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
            }
        }

        return res.status(200).json({ success: true, data: metadata, dividends: uniqueDivs });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
