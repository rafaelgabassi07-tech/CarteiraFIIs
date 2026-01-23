
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

// --- INTELLIGENT CACHE (SERVER-SIDE) ---
// Define a validade do dado baseado no horário do mercado
const getTTL = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    // Mercado Aberto (Seg-Sex, 10h-18h): 20 min TTL
    const isMarketOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
    return isMarketOpen ? 20 * 60 * 1000 : 4 * 60 * 60 * 1000; // 4h se fechado
};

// --- AGENTE HTTPS & HEADERS (MIMIC REAL BROWSER) ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false 
});

const getBrowserHeaders = () => ({
    'User-Agent': [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    ][Math.floor(Math.random() * 3)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
});

async function fetchHTML(url: string) {
    for (let i = 0; i < 3; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: getBrowserHeaders(),
                timeout: 8000 + (i * 2000), // Timeout progressivo
                maxRedirects: 5
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; 
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Backoff exponencial
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
        // Remove símbolos e espaços
        str = str.replace(/[^\d.,-]/g, '');
        // Padrão BR: inverte ponto e vírgula se necessário
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

// Mapa de Chaves Normalizado
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
    'tipodegestao': 'tipo_gestao'
};

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
}

// ---------------------------------------------------------
// INTELLIGENT SCRAPER ENGINE
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        
        // Estratégia de URL: tenta FII, depois Ação, depois BDR
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
            } catch (e) { /* continue */ }
        }

        if (!html) throw new Error('Ativo não encontrado');

        const $ = cheerio.load(html);
        const extracted: any = {};

        // === ESTRATÉGIA 1: JSON-LD (Dados Estruturados - A mais confiável) ===
        try {
            const jsonLdScripts = $('script[type="application/ld+json"]');
            jsonLdScripts.each((_, el) => {
                try {
                    const json = JSON.parse($(el).html() || '{}');
                    // Procura por dados de ProdutoFinanceiro ou similar
                    if (json['@type'] === 'FinancialProduct' || json.name === ticker) {
                        if (json.offers?.price) extracted['cotacao_atual'] = json.offers.price;
                        if (json.description) extracted['description'] = json.description;
                    }
                } catch {}
            });
        } catch (e) { console.warn('JSON-LD parse error', e); }

        // === ESTRATÉGIA 2: VARREDURA VISUAL (Cards e Tabelas) ===
        const addData = (k: string, v: string) => {
            const key = normalizeKey(k);
            if (KEY_MAP[key] && !extracted[KEY_MAP[key]]) { // Não sobrescreve se já pegou (ex: do JSON-LD)
                extracted[KEY_MAP[key]] = v;
            }
        };

        // Cards Superiores
        $('div[class*="card"], div[class*="cell"]').each((_, el) => {
            const title = $(el).find('[class*="title"], [class*="name"], [class*="header"]').first().text().trim();
            const value = $(el).find('[class*="value"], [class*="desc"], [class*="data"]').first().text().trim();
            if (title && value) addData(title, value);
        });

        // Tabelas de Dados
        $('#table-indicators .cell, #table-basic-data .cell').each((_, el) => {
             const title = $(el).find('.name').text().trim();
             const value = $(el).find('.value, .desc').text().trim();
             if (title && value) addData(title, value);
        });

        // === ESTRATÉGIA 3: BUSCA TEXTUAL BRUTA (Fallback) ===
        // Se falhou em pegar P/VP ou DY, busca no texto bruto do HTML
        if (!extracted.pvp || !extracted.dy) {
            const bodyText = $('body').text().replace(/\s+/g, ' ');
            const patterns = [
                { k: 'pvp', r: /P\/VP\s*([0-9,.]+)/i },
                { k: 'dy', r: /Dividend Yield\s*([0-9,.]+)%/i },
                { k: 'vacancia', r: /Vacância\s*([0-9,.]+)%/i },
                { k: 'cotacao_atual', r: /Cotação\s*R\$\s*([0-9,.]+)/i }
            ];
            patterns.forEach(p => {
                const match = bodyText.match(p.r);
                if (match && match[1]) {
                    const normK = KEY_MAP[p.k] || p.k;
                    if (!extracted[normK]) extracted[normK] = match[1];
                }
            });
        }

        // === EXTRAÇÃO DE DIVIDENDOS ===
        const dividends: any[] = [];
        // Varre todas as tabelas em busca de padrões de proventos
        $('table').each((_, table) => {
            const header = $(table).find('thead').text().toLowerCase();
            // Assinatura de tabela de proventos: "Data Com" E "Valor"
            if (header.includes('data com') && header.includes('valor')) {
                $(table).find('tbody tr').each((_, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 3) {
                        // Tenta inferir colunas
                        let type = 'DIV';
                        let dateComStr, datePayStr, valStr;

                        // Se tem 4 colunas ou mais, geralmente: Tipo | Data Com | Pagamento | Valor
                        if (tds.length >= 4) {
                            const typeTxt = $(tds[0]).text().toLowerCase();
                            if (typeTxt.includes('juros') || typeTxt.includes('jcp')) type = 'JCP';
                            else if (typeTxt.includes('rend')) type = 'REND';
                            else if (typeTxt.includes('amort')) type = 'AMORT';
                            
                            dateComStr = $(tds[1]).text();
                            datePayStr = $(tds[2]).text();
                            valStr = $(tds[3]).text();
                        } else {
                            // 3 colunas: Data Com | Pagamento | Valor (Tipo assume DIV)
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
        });

        // === SEGMENTO (BREADCRUMB) ===
        if (!extracted.segmento) {
            let seg = '';
            $('#breadcrumbs, .breadcrumbs').find('li, span').each((_, el) => {
                const t = $(el).text().trim();
                // Filtra palavras comuns de navegação
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    seg = t;
                }
            });
            if (seg) extracted.segmento = seg;
        }

        // === SANITIZAÇÃO E VALIDAÇÃO FINAL ===
        const finalMetadata = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            segmento: extracted.segmento || 'Outros',
            updated_at: new Date().toISOString(),
            
            cotacao_atual: cleanNumber(extracted.cotacao_atual),
            dy: cleanNumber(extracted.dy),
            pvp: cleanNumber(extracted.pvp),
            pl: cleanNumber(extracted.pl),
            roe: cleanNumber(extracted.roe),
            vp_cota: cleanNumber(extracted.vp_cota),
            lpa: cleanNumber(extracted.lpa),
            vacancia: cleanNumber(extracted.vacancia),
            
            // Dados extras importantes
            liquidez: extracted.liquidez || 'N/A',
            val_mercado: extracted.val_mercado || 'N/A',
            patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
            num_cotistas: cleanNumber(extracted.num_cotistas) || 0,
            
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
        // === INTELLIGENT CACHE CHECK (SERVER SIDE) ===
        // Proteção contra "thundering herd": se o dado está fresco, não re-scrapar
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

        // Deduplicação de Dividendos
        const uniqueDivs = Array.from(new Map(dividends.map(item => [
            `${item.type}-${item.date_com}-${item.rate}`, item
        ])).values());

        // Atualização no Banco
        if (metadata) {
            const dbPayload: any = {
                ticker: metadata.ticker,
                type: metadata.type,
                segment: metadata.segmento,
                updated_at: metadata.updated_at,
                // Numéricos
                pvp: metadata.pvp,
                pl: metadata.pl,
                dy_12m: metadata.dy,
                roe: metadata.roe,
                vacancia: metadata.vacancia,
                lpa: metadata.lpa,
                vp_cota: metadata.vp_cota,
                margem_liquida: metadata.margem_liquida,
                margem_bruta: metadata.margem_bruta,
                divida_liquida_ebitda: metadata.divida_liquida_ebitda,
                ev_ebitda: metadata.ev_ebitda,
                cagr_receita: metadata.cagr_receita_5a,
                cagr_lucro: metadata.cagr_lucros_5a,
                num_cotistas: metadata.num_cotistas,
                ultimo_rendimento: metadata.ultimo_rendimento, 
                // Strings
                liquidez: metadata.liquidez,
                valor_mercado: metadata.val_mercado,
                patrimonio_liquido: metadata.patrimonio_liquido,
                tipo_gestao: metadata.tipo_gestao,
                taxa_adm: metadata.taxa_adm
            };

            // Remove chaves inválidas (undefined ou NaN) para não quebrar o insert
            Object.keys(dbPayload).forEach(key => {
                const val = dbPayload[key];
                if (val === undefined || (typeof val === 'number' && isNaN(val))) {
                    delete dbPayload[key];
                }
            });

            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            
            // Inserção de dividendos se houver
            if (uniqueDivs.length > 0) {
                 await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
            }
        }

        return res.status(200).json({ success: true, data: metadata, dividends: uniqueDivs });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
