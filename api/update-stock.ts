
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

// --- OTIMIZAÇÃO: AGENTE HTTPS & CLIENT ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 12000,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    },
    timeout: 12000,
    maxRedirects: 5
});

// --- REGEX & HELPERS (DO ARQUIVO FORNECIDO) ---
const REGEX_CLEAN_NUMBER = /[^0-9,-]+/g;
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    try {
        if (typeof valueStr === 'number') return valueStr;
        // Remove tudo que não é número, vírgula ou hífen
        const clean = String(valueStr).replace(REGEX_CLEAN_NUMBER, "").trim();
        if (!clean) return 0;
        // Converte formato BR (1.000,00) para JS (1000.00)
        return parseFloat(clean.replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function parseExtendedValue(str: string) {
    if (!str) return 0;
    const val = parseValue(str);
    const lower = str.toLowerCase();
    if (lower.includes('bilh')) return val * 1000000000;
    if (lower.includes('milh')) return val * 1000000;
    if (lower.includes('mil')) return val * 1000;
    return val;
}

function parseDate(dateStr: string) {
    if (!dateStr || dateStr === '-' || dateStr.length < 8) return null;
    try {
        // Aceita DD/MM/YYYY ou DD/MM/YY
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
    
    // Tenta primeiro como FII (mais comum na plataforma para usuarios desse perfil)
    // Se der 404, tenta como Ação.
    // Isso evita lógica complexa de detecção de string.
    try {
        const res = await client.get(`https://investidor10.com.br/fiis/${tickerLower}/`);
        return { data: res.data, type: 'FII' };
    } catch (e: any) {
        if (e.response && e.response.status === 404) {
            try {
                const res = await client.get(`https://investidor10.com.br/acoes/${tickerLower}/`);
                return { data: res.data, type: 'ACAO' };
            } catch (innerE: any) {
                // Tenta BDR como último recurso
                if (innerE.response && innerE.response.status === 404) {
                     const res = await client.get(`https://investidor10.com.br/bdrs/${tickerLower}/`);
                     return { data: res.data, type: 'BDR' };
                }
                throw innerE;
            }
        }
        throw e;
    }
}

// --- CORE SCRAPER ---

async function scrapeInvestidor10(ticker: string) {
    try {
        const { data: html, type: finalType } = await fetchHtmlWithRetry(ticker);
        const $ = cheerio.load(html);

        // Objeto base compatível com DB
        const dados: any = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            updated_at: new Date().toISOString(),
            // Inicia com N/A para saber o que não foi encontrado
            dy: null, pvp: null, pl: null, 
            liquidez: null, val_mercado: null,
            segmento: null
        };

        let cotacao_atual = 0;
        let num_cotas = 0;

        // Função de processamento de pares Chave/Valor
        // Varre o texto normalizado para encontrar as chaves
        const processPair = (tituloRaw: string, valorRaw: string) => {
            const titulo = normalize(tituloRaw);
            const valor = valorRaw.trim();
            if (!valor || valor === '-') return;

            // Mapeamentos Genéricos
            if (dados.dy === null && (titulo.includes('dividend yield') || titulo === 'dy')) dados.dy = parseValue(valor);
            if (dados.pvp === null && (titulo.includes('p/vp') || titulo === 'pvp' || titulo === 'vp')) dados.pvp = parseValue(valor);
            if (dados.pl === null && (titulo.includes('p/l') || titulo === 'pl')) dados.pl = parseValue(valor);
            
            if (dados.liquidez === null && titulo.includes('liquidez')) dados.liquidez = valor;
            if (dados.segmento === null && titulo.includes('segmento')) dados.segmento = valor;
            if (dados.vacancia === null && titulo.includes('vacancia')) dados.vacancia = parseValue(valor);
            
            if (dados.ultimo_rendimento === null && titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = parseValue(valor);
            if (dados.roe === null && titulo.includes('roe')) dados.roe = parseValue(valor);

            // Tratamento especial para Patrimônio/Valor de Mercado
            if (titulo.includes('mercado') && titulo.includes('valor')) dados.val_mercado = valor; // Salva string original "R$ 1,5 B"
            if (titulo.includes('patrimonio') && titulo.includes('liquido')) dados.patrimonio_liquido = valor;

            // Indicadores de Ações
            if (titulo.includes('margem liquida')) dados.margem_liquida = parseValue(valor);
            if (titulo.includes('margem bruta')) dados.margem_bruta = parseValue(valor);
            if (titulo.includes('div. liquida / ebitda') || titulo.includes('div liq / ebitda')) dados.divida_liquida_ebitda = parseValue(valor);
            if (titulo.includes('ev / ebitda')) dados.ev_ebitda = parseValue(valor);
            if (titulo.includes('cagr') && titulo.includes('receita')) dados.cagr_receita_5a = parseValue(valor);
            if (titulo.includes('cagr') && titulo.includes('lucro')) dados.cagr_lucros_5a = parseValue(valor);
            if (titulo.includes('lpa')) dados.lpa = parseValue(valor);
            
            // VP por Cota / VPA
            if (titulo.includes('patrimonial') && (titulo.includes('cota') || titulo.includes('acao'))) {
                 dados.vp_cota = parseValue(valor);
            } else if (titulo === 'vpa') {
                 dados.vp_cota = parseValue(valor);
            }

            // Captura de Cotas/Ações totais para cálculo de MarketCap se necessário
            if (titulo.includes('num') && (titulo.includes('cotas') || titulo.includes('acoes') || titulo.includes('papeis'))) {
                num_cotas = parseExtendedValue(valor);
            }
            // Cotistas
            if (titulo.includes('cotistas')) dados.num_cotistas = parseValue(valor);
        };

        // 1. Cotação Atual (Geralmente destaque no topo)
        $('div._card').each((_, el) => {
            const label = normalize($(el).find('div._card-header').text());
            if (label.includes('cotacao') || label.includes('valor atual')) {
                const val = $(el).find('div._card-body').text();
                cotacao_atual = parseValue(val);
            }
        });
        if (cotacao_atual > 0) dados.cotacao_atual = cotacao_atual;

        // 2. Varredura: Cards do novo layout
        $('div._card').each((_, el) => {
            const header = $(el).find('div._card-header, div.header').first().text() || $(el).find('span').first().text();
            const body = $(el).find('div._card-body, div.body').first().text() || $(el).find('span').last().text();
            processPair(header, body);
        });

        // 3. Varredura: Células de tabelas (Layout antigo/misto)
        $('.cell').each((_, el) => {
            processPair($(el).find('.name').text(), $(el).find('.value').text());
        });

        // 4. Varredura: Tabelas genéricas
        $('table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 2) processPair($(cols[0]).text(), $(cols[1]).text());
        });

        // 5. Fallback Segmento (Breadcrumbs)
        if (!dados.segmento) {
            let seg = 'Geral';
            $('#breadcrumbs li, .breadcrumbs span, .breadcrumb-item').each((_, el) => {
                const t = $(el).text().trim();
                if (t && !['Início', 'Home', 'Ações', 'FIIs', 'Fundos', 'BDRs'].includes(t) && t.toUpperCase() !== ticker) {
                    seg = t;
                }
            });
            dados.segmento = seg;
        }

        // 6. EXTRAÇÃO DE DIVIDENDOS (Histórico)
        const dividends: any[] = [];
        let tableRows = $('#table-dividends-history tbody tr');
        
        // Se não achou pelo ID, tenta achar tabela pelo cabeçalho
        if (tableRows.length === 0) {
            $('table').each((_, tbl) => {
                const h = normalize($(tbl).text());
                if (h.includes('com') && h.includes('pagamento') && h.includes('valor')) {
                    tableRows = $(tbl).find('tbody tr');
                    return false;
                }
            });
        }

        tableRows.each((_, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 3) {
                let type = 'DIV';
                let dateComStr = '', datePayStr = '', valStr = '';

                // Layout 4 colunas: [Tipo, DataCom, DataPag, Valor]
                if (cols.length >= 4) {
                    const tText = normalize($(cols[0]).text());
                    if (tText.includes('jcp') || tText.includes('juros')) type = 'JCP';
                    else if (tText.includes('rend')) type = 'REND';
                    else if (tText.includes('amort')) type = 'AMORT';
                    
                    dateComStr = $(cols[1]).text();
                    datePayStr = $(cols[2]).text();
                    valStr = $(cols[3]).text();
                } 
                // Layout 3 colunas: [DataCom, DataPag, Valor] (Assume DIV/REND)
                else {
                    dateComStr = $(cols[0]).text();
                    datePayStr = $(cols[1]).text();
                    valStr = $(cols[2]).text();
                }

                const dateCom = parseDate(dateComStr);
                const paymentDate = parseDate(datePayStr);
                const rate = parseValue(valStr);

                if (dateCom && rate > 0) {
                    dividends.push({
                        ticker: ticker.toUpperCase(),
                        type,
                        date_com: dateCom,
                        payment_date: paymentDate || null,
                        rate
                    });
                }
            }
        });

        // Limpeza e Alias para Frontend/DB
        const finalMetadata = {
            ...dados,
            dy_12m: dados.dy, // Alias DB
            current_price: dados.cotacao_atual, // Alias DB
        };

        // Remove chaves nulas/undefined
        Object.keys(finalMetadata).forEach(key => {
            if (finalMetadata[key] === null || finalMetadata[key] === undefined) {
                delete finalMetadata[key];
            }
        });

        return { metadata: finalMetadata, dividends };

    } catch (e: any) {
        console.error(`[SCRAPER ERROR] ${ticker}: ${e.message}`);
        return null;
    }
}

// HANDLER DA API SERVERLESS
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    const force = req.query.force === 'true'; 
    
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        // 1. Tenta Cache (se não forçado)
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing) {
                const lastUpdate = new Date(existing.updated_at || 0).getTime();
                // Cache de 1 hora
                if (Date.now() - lastUpdate < 3600000) {
                    // Busca dividendos do banco também
                    const { data: divs } = await supabase
                        .from('market_dividends')
                        .select('*')
                        .eq('ticker', ticker);
                        
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        // 2. Executa Scraper
        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha na coleta de dados.' });
        }

        const { metadata, dividends } = result;

        // 3. Salva no Banco (Upsert)
        if (metadata) {
            // Remove campos auxiliares que não estão no DB
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
