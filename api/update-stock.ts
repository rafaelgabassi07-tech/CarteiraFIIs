
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

// --- AGENTE HTTPS & HEADERS ROBUSTOS (MIMIC REAL BROWSER) ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false // Ignora erros de SSL em alguns proxies
});

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
};

async function fetchHTML(url: string) {
    // Tenta até 3 vezes com delay exponencial
    for (let i = 0; i < 3; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: BROWSER_HEADERS,
                timeout: 10000,
                maxRedirects: 5
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; // 404 é erro real, não retry
            // Espera 1s, 2s, 4s...
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
        // Ex: "R$ 1.234,56" -> "1234.56"
        // Remove tudo que não é digito, virgula, ponto ou sinal de menos
        str = str.replace(/[^\d.,-]/g, '');
        
        // Lógica Brasileira:
        // Se tem vírgula, ela é o decimal. Remove pontos de milhar antes.
        if (str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } 
        // Se só tem ponto, assume que é decimal (padrão US/Code) ou milhar? 
        // No Investidor10 é padrão BR, então ponto sozinho geralmente é milhar se não tiver virgula, 
        // MAS valores pequenos (ex: 10.50) podem ser ambiguous. 
        // Assumiremos: Ponto = Milhar se houver mais de 3 digitos ou se o contexto for BRL. 
        // Simplificação segura: Investidor10 usa virgula para decimal.
        
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    } catch { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
}

const parseToISODate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    // Regex DD/MM/YYYY
    const matchBR = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (matchBR) {
        const day = matchBR[1].padStart(2, '0');
        const month = matchBR[2].padStart(2, '0');
        const year = matchBR[3];
        return `${year}-${month}-${day}`;
    }
    return null;
}

// Mapa de Chaves
const KEY_MAP: Record<string, string> = {
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp', 'p/vp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl', 'p/l': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonial': 'vp_cota', 'valpatrimonial': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'evebitda': 'ev_ebitda', 'ev/ebitda': 'ev_ebitda',
    'dividaliquidaebitda': 'divida_liquida_ebitda',
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'cagrreceita5anos': 'cagr_receita_5a', 'cagrreceita': 'cagr_receita_5a',
    'cagrlucros5anos': 'cagr_lucros_5a', 'cagrlucros': 'cagr_lucros_5a',
    
    // FIIs
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'patrimonioliquido': 'patrimonio_liquido', 'patrimonio': 'patrimonio_liquido',
    'valordemercado': 'val_mercado', 'valormercado': 'val_mercado',
    'taxadeadministracao': 'taxa_adm', 'taxaadm': 'taxa_adm',
    'tipodegestao': 'tipo_gestao', 'gestao': 'tipo_gestao',
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas'
};

// ---------------------------------------------------------
// SCRAPER LOGIC
// ---------------------------------------------------------

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
            } catch (e) { /* next */ }
        }

        if (!html) throw new Error('Ativo não encontrado');

        const $ = cheerio.load(html);
        const extracted: any = {};

        const addData = (k: string, v: string) => {
            const key = normalizeKey(k);
            if (KEY_MAP[key]) extracted[KEY_MAP[key]] = v;
        };

        // 1. CARDS DO TOPO (Seletores Genéricos)
        // Procura por blocos que tenham título e valor
        $('div[class*="card"], div[class*="cell"]').each((_, el) => {
            const txt = $(el).text().replace(/\s+/g, ' ').trim();
            // Tenta separar Label e Valor via Regex
            // Ex: "P/VP 0,95" ou "Cotação R$ 10,00"
            // Pega a última palavra como valor se for numero
            const parts = txt.split(' ');
            if (parts.length >= 2) {
                const val = parts.pop(); // Último
                const label = parts.join(''); // Resto junto
                addData(label, val || '');
            }
            
            // Tenta estrutura HTML explícita (Title / Value)
            const title = $(el).find('[class*="title"], [class*="name"], [class*="header"]').first().text().trim();
            const value = $(el).find('[class*="value"], [class*="desc"], [class*="data"]').first().text().trim();
            if (title && value) addData(title, value);
        });

        // 2. TABELAS (Itera sobre todas as tabelas)
        $('table').each((_, table) => {
            // Tabelas verticais (th=Label, td=Value)
            $(table).find('tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length === 2) {
                    addData($(tds[0]).text(), $(tds[1]).text());
                }
                // Tabelas de indicadores (Label na celula, Valor na outra)
                const cells = $(tr).find('div.cell, td');
                if (cells.length > 0) {
                    cells.each((_, c) => {
                        const t = $(c).find('.name').text();
                        const v = $(c).find('.value').text();
                        if (t && v) addData(t, v);
                    });
                }
            });
        });

        // 3. FALLBACK: TEXT SEARCH (Busca Brutal)
        // Se pvp ou dy estiverem vazios, varre o texto visivel
        if (!extracted.pvp || !extracted.dy) {
            const bodyText = $('body').text().replace(/\s+/g, ' ');
            const patterns = [
                { k: 'pvp', r: /P\/VP\s*([0-9,.]+)/i },
                { k: 'dy', r: /Dividend Yield\s*([0-9,.]+)%/i },
                { k: 'cotacao_atual', r: /Cotação\s*R\$\s*([0-9,.]+)/i },
                { k: 'vacancia', r: /Vacância\s*([0-9,.]+)%/i }
            ];
            patterns.forEach(p => {
                const match = bodyText.match(p.r);
                if (match && match[1]) {
                    const normK = KEY_MAP[p.k] || p.k;
                    if (!extracted[normK]) extracted[normK] = match[1];
                }
            });
        }

        // 4. SEGMENTO
        let segmento = '';
        $('#breadcrumbs, .breadcrumbs').find('li, span').each((_, el) => {
            const t = $(el).text().trim();
            if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                segmento = t;
            }
        });
        if (segmento) extracted.segmento = segmento;

        // 5. PROVENTOS (Tabelas)
        const dividends: any[] = [];
        $('table').each((_, table) => {
            const headerText = $(table).find('thead').text().toLowerCase();
            if (headerText.includes('data com') || headerText.includes('pagamento') || headerText.includes('valor')) {
                $(table).find('tbody tr').each((_, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 3) {
                        // Tenta identificar colunas dinamicamente ou por posição padrão
                        // Padrão inv10: Tipo | Data Com | Pagamento | Valor
                        let type = 'DIV';
                        let dateComStr = '';
                        let datePayStr = '';
                        let valStr = '';

                        // Heurística de posição
                        if (tds.length === 4) {
                            const tTxt = $(tds[0]).text().toLowerCase();
                            if (tTxt.includes('jur')) type = 'JCP';
                            else if (tTxt.includes('rend')) type = 'REND';
                            else if (tTxt.includes('amor')) type = 'AMORT';
                            
                            dateComStr = $(tds[1]).text();
                            datePayStr = $(tds[2]).text();
                            valStr = $(tds[3]).text();
                        } else if (tds.length === 3) {
                            // As vezes tipo não existe ou valor é 3a coluna
                            dateComStr = $(tds[0]).text();
                            datePayStr = $(tds[1]).text();
                            valStr = $(tds[2]).text();
                        }

                        const dateCom = parseToISODate(dateComStr);
                        const datePay = parseToISODate(datePayStr); // Pode ser null ou '-'
                        const val = cleanNumber(valStr);

                        if (dateCom && val > 0) {
                            dividends.push({
                                ticker: ticker.toUpperCase(),
                                type,
                                date_com: dateCom,
                                payment_date: datePay || null, // Se não tiver data pag, é NULL
                                rate: val
                            });
                        }
                    }
                });
            }
        });

        // 6. TRATAMENTO FINAL NUMÉRICO
        const finalData = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            segmento: extracted.segmento || 'Outros',
            updated_at: new Date().toISOString(),
            // Numéricos
            cotacao_atual: cleanNumber(extracted.cotacao_atual),
            dy: cleanNumber(extracted.dy),
            pvp: cleanNumber(extracted.pvp),
            pl: cleanNumber(extracted.pl),
            roe: cleanNumber(extracted.roe),
            vp_cota: cleanNumber(extracted.vp_cota),
            lpa: cleanNumber(extracted.lpa),
            vacancia: cleanNumber(extracted.vacancia),
            ultimo_rendimento: cleanNumber(extracted.ultimo_rendimento),
            margem_liquida: cleanNumber(extracted.margem_liquida),
            margem_bruta: cleanNumber(extracted.margem_bruta),
            divida_liquida_ebitda: cleanNumber(extracted.divida_liquida_ebitda),
            ev_ebitda: cleanNumber(extracted.ev_ebitda),
            cagr_receita_5a: cleanNumber(extracted.cagr_receita_5a),
            cagr_lucros_5a: cleanNumber(extracted.cagr_lucros_5a),
            num_cotistas: cleanNumber(extracted.num_cotistas),
            // Strings
            liquidez: extracted.liquidez || 'N/A',
            val_mercado: extracted.val_mercado || 'N/A',
            tipo_gestao: extracted.tipo_gestao || 'N/A',
            taxa_adm: extracted.taxa_adm || 'N/A',
            patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
        };

        return { metadata: finalData, dividends };

    } catch (e: any) {
        console.error(`Scrape Error [${ticker}]:`, e.message);
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha ao obter dados. Tente novamente.' });
        }

        const { metadata, dividends } = result;

        // Deduplica Dividendos (Chave composta: Ticker + Tipo + DataCom + Valor)
        const uniqueDivs = Array.from(new Map(dividends.map(item => [
            `${item.type}-${item.date_com}-${item.rate}`, item
        ])).values());

        // Salva Metadata
        if (metadata) {
            const dbPayload = {
                ticker: metadata.ticker,
                type: metadata.type,
                segment: metadata.segmento,
                pvp: metadata.pvp,
                pl: metadata.pl,
                dy_12m: metadata.dy,
                roe: metadata.roe,
                vacancia: metadata.vacancia,
                liquidez: metadata.liquidez,
                valor_mercado: metadata.val_mercado,
                updated_at: metadata.updated_at,
                lpa: metadata.lpa,
                vpa: metadata.vp_cota, 
                vp_cota: metadata.vp_cota,
                margem_liquida: metadata.margem_liquida,
                margem_bruta: metadata.margem_bruta,
                divida_liquida_ebitda: metadata.divida_liquida_ebitda,
                ev_ebitda: metadata.ev_ebitda,
                cagr_receita: metadata.cagr_receita_5a,
                cagr_lucro: metadata.cagr_lucros_5a,
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm,
                ultimo_rendimento: metadata.ultimo_rendimento,
                num_cotistas: metadata.num_cotistas
            };
            
            // Remove undefined/NaN que o DB rejeita
            Object.keys(dbPayload).forEach(k => {
                const val = (dbPayload as any)[k];
                if (val === undefined || (typeof val === 'number' && isNaN(val))) {
                    delete (dbPayload as any)[k];
                }
            });

            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends: uniqueDivs });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
