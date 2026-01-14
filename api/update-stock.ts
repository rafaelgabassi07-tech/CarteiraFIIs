
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Ativos Especiais e ETFs conhecidos
const KNOWN_STOCKS_11 = ['TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'BIDI11', 'ENGI11', 'SULA11', 'CPFE11', 'IGTI11', 'ITUB11', 'BBDC11'];
const KNOWN_ETFS = ['BOVA11', 'SMAL11', 'IVVB11', 'HASH11', 'QBTC11', 'ETH11', 'XINA11', 'GOLD11', 'BBSD11', 'ECOO11', 'GOVE11', 'ISUS11', 'MATB11', 'PIBB11', 'SPXI11'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker, force } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') return res.status(400).json({ error: 'Ticker obrigatório' });

  try {
    // Cache Check (Ignora se force=true)
    if (force !== 'true') {
        const { data: cached } = await supabase.from('ativos_metadata').select('updated_at').eq('ticker', stock).single();
        if (cached?.updated_at) {
            const hoursDiff = (Date.now() - new Date(cached.updated_at).getTime()) / 36e5;
            if (hoursDiff < 12) return res.status(200).json({ success: true, cached: true });
        }
    }

    // 1. Definição de URL Inteligente
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    if (KNOWN_ETFS.includes(stock)) {
        typePath = 'etfs';
        assetType = 'ETF'; 
    } else if ((stock.endsWith('11') || stock.endsWith('11B')) && !KNOWN_STOCKS_11.includes(stock)) {
        typePath = 'fiis';
        assetType = 'FII';
    } else if (stock.endsWith('33') || stock.endsWith('34')) {
        typePath = 'bdrs';
        assetType = 'ACAO';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    
    // Headers para simular navegador real
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    };

    let html;
    if (process.env.SCRAPER_API_KEY) {
        const response = await axios.get('http://api.scraperapi.com', {
            params: { api_key: process.env.SCRAPER_API_KEY, url: targetUrl, render: 'true', country_code: 'br' },
            timeout: 40000 
        });
        html = response.data;
    } else {
        const response = await axios.get(targetUrl, { headers, timeout: 25000 });
        html = response.data;
    }

    const $ = cheerio.load(html);

    // Helpers de Parsing
    const parseVal = (s: string) => {
        if (!s) return 0;
        const clean = s.replace(/[^\d.,-]/g, '');
        return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    };

    const parseDate = (str: string): string | null => {
        if (!str || str.length < 8) return null; 
        const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
    };

    // 3. SCANNER VISUAL DE DADOS
    // Em vez de confiar em classes CSS que mudam, procuramos pelo TEXTO do rótulo (ex: "P/L")
    // e pegamos o valor visualmente associado a ele.
    const findValueByLabel = (labels: string[]) => {
        // Tenta achar via title attribute (Comum no Desktop)
        for (const label of labels) {
            const val = $(`div[title="${label}"] .value`).text().trim();
            if (val) return val;
        }

        // Tenta achar varrendo spans/divs (Comum no Mobile)
        let foundValue = '';
        $('span, div.name, p, strong, div.title').each((_, el) => {
             const txt = $(el).text().trim().toUpperCase();
             // Verifica se o texto do elemento bate com algum dos labels procurados
             if (labels.some(l => txt === l.toUpperCase())) {
                 // Estratégia 1: O valor é o próximo irmão (Next Sibling)
                 let next = $(el).next().text().trim();
                 if (next && /\d/.test(next)) { foundValue = next; return false; }
                 
                 // Estratégia 2: O valor está dentro do mesmo container pai
                 next = $(el).parent().find('.value, .detail, span:not(.title):not(.name)').last().text().trim();
                 if (next && /\d/.test(next)) { foundValue = next; return false; }
             }
        });
        return foundValue;
    };

    // --- Extração de Fundamentos (Blindada contra mudanças de layout) ---
    
    // Cotação
    let cotacao = parseVal($('div[title="Cotação"] .value').text() || $('.quotation-price').first().text());
    if (!cotacao) cotacao = parseVal(findValueByLabel(['Cotação', 'Valor Atual', 'Preço']));

    // P/VP
    let pvp = parseVal(findValueByLabel(['P/VP', 'VPA', 'VP', 'P/VPA']));
    
    // DY
    let dy = parseVal(findValueByLabel(['Dividend Yield', 'DY', 'Yield']));

    // P/L (Preço/Lucro - Ações)
    let pl = parseVal(findValueByLabel(['P/L', 'PL', 'Preço/Lucro']));

    // ROE (Return on Equity)
    let roe = parseVal(findValueByLabel(['ROE', 'Return on Equity']));

    // Vacância (FIIs)
    let vacancia = parseVal(findValueByLabel(['Vacância Física', 'Vacância', 'Vacância F.']));

    // Liquidez
    let liquidezStr = findValueByLabel(['Liquidez Média Diária', 'Liquidez', 'Vol Médio']);
    if (!liquidezStr) liquidezStr = $('span:contains("Liquidez")').next().text().trim();

    // Valor de Mercado (Novo)
    let valorMercadoStr = findValueByLabel(['Valor de Mercado', 'Market Cap']);

    // 4. Segmento
    let segment = 'Geral';
    const segRaw = findValueByLabel(['Segmento', 'Setor', 'Segmento de Atuação']);
    if (segRaw && segRaw.length > 2) {
        segment = segRaw.replace(/^[\d\s.-]+/, '').replace(/\s+/g, ' ').trim();
        if (segment === segment.toUpperCase()) segment = segment.charAt(0) + segment.slice(1).toLowerCase();
    } else {
        // Fallback antigo
        const directSelectors = ['.segment-data .value', '.sector-data .value'];
        for (const sel of directSelectors) {
            const txt = $(sel).first().text().trim();
            if (txt && txt.length > 2) { segment = txt; break; }
        }
    }

    // Salva Metadados no Supabase
    await supabase.from('ativos_metadata').upsert({
        ticker: stock, 
        type: assetType, 
        segment, 
        current_price: cotacao, 
        pvp, 
        dy_12m: dy,
        pl,
        roe,
        vacancia,
        liquidez: liquidezStr,
        valor_mercado: valorMercadoStr,
        updated_at: new Date()
    }, { onConflict: 'ticker' });

    // 5. Proventos - Scanner de Tabelas
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();

    let tablesToScan = $('#table-dividends-history');
    // Se não achar a tabela específica, pega qualquer tabela que pareça de dividendos
    if (tablesToScan.length === 0) {
        tablesToScan = $('table').filter((_, el) => {
            const txt = $(el).text().toLowerCase();
            return (txt.includes('com') || txt.includes('base')) && (txt.includes('pagamento') || txt.includes('valor'));
        });
    }

    // Processa linhas da tabela
    tablesToScan.find('tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 2) return;
        const rowText = $(tr).text();
        if (rowText.toLowerCase().includes('variação') || rowText.toLowerCase().includes('volume')) return;
        processRow(tds, rowText);
    });

    // Fallback: Se não achou tabela, procura cards (layout mobile)
    if (dividendsToUpsert.length === 0) {
        $('div.grid-item, div.card-body').each((_, el) => {
             const txt = $(el).text();
             if (/\d{2}\/\d{2}\/\d{4}/.test(txt) && (txt.includes('R$') || txt.includes(','))) {
                 const pseudoRow = $(el).find('*');
                 processRow(pseudoRow, txt);
             }
        });
    }

    // Função genérica que tenta extrair data e valor de um conjunto de elementos HTML
    // Usa 'any' no Cheerio para evitar conflitos de versão de tipos no Vercel
    function processRow(elements: cheerio.Cheerio<any>, fullText: string) {
        const datesFound: string[] = [];
        let valueFound = 0;

        elements.each((_, el) => {
            const txt = $(el).text().trim();
            const date = parseDate(txt);
            if (date) datesFound.push(date);

            if (!txt.includes('%') && (txt.includes(',') || txt.includes('.')) && /\d/.test(txt)) {
                const val = parseVal(txt);
                // Filtro de sanidade: Dividendos > 0 e < 1000 (evita pegar cotação por engano)
                if (val > 0.001 && val < 1000) { 
                    if (txt.includes('R$') || valueFound === 0) {
                        valueFound = val;
                    }
                }
            }
        });

        if (datesFound.length > 0 && valueFound > 0) {
            datesFound.sort(); 
            const dateCom = datesFound[0];
            const datePag = datesFound.length > 1 ? datesFound[datesFound.length - 1] : dateCom;

            let tipo = 'DIV';
            const lowerText = fullText.toLowerCase();
            if (lowerText.includes('jcp') || lowerText.includes('juros')) tipo = 'JCP';
            else if (lowerText.includes('rendimento')) tipo = 'REND';

            const key = `${stock}-${tipo}-${dateCom}-${datePag}-${valueFound}`;
            
            if (!processedKeys.has(key)) {
                dividendsToUpsert.push({ 
                    ticker: stock, 
                    type: tipo, 
                    date_com: dateCom, 
                    payment_date: datePag, 
                    rate: valueFound 
                });
                processedKeys.add(key);
            }
        }
    }

    if (dividendsToUpsert.length > 0) {
        await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true
        });
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        segment: segment,
        fundamentals: { 
            price: cotacao, 
            pvp, 
            dy, 
            pl, 
            roe, 
            vacancia, 
            liquidez: liquidezStr,
            market_cap: valorMercadoStr
        },
        dividends_found: dividendsToUpsert.length,
        method: 'scanner_v8_resilient'
    });

  } catch (error: any) {
    console.error(`[Scraper Error] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
