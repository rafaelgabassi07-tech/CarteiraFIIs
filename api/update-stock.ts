
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
    
    // Headers anti-bot
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Referer': 'https://google.com'
    };

    let html;
    if (process.env.SCRAPER_API_KEY) {
        const response = await axios.get('http://api.scraperapi.com', {
            params: { api_key: process.env.SCRAPER_API_KEY, url: targetUrl, render: 'true', country_code: 'br' },
            timeout: 40000 
        });
        html = response.data;
    } else {
        const response = await axios.get(targetUrl, { headers, timeout: 20000 });
        html = response.data;
    }

    const $ = cheerio.load(html);

    // Helpers de Parsing
    const parseVal = (s: string) => parseFloat(s.replace(/[R$\%\s.]/g, '').replace(',', '.')) || 0;
    const parseDate = (str: string): string | null => {
        if (!str || str.length < 8) return null; 
        const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
    };

    // 3. Fundamentos (Fallback para quando Brapi não tem)
    let cotacao = parseVal($('._card-body span:contains("Cotação")').closest('.card').find('._card-body span').last().text());
    if(!cotacao) cotacao = parseVal($('.quotation-price').first().text());
    
    let pvp = parseVal($('div[title="P/VP"] .value').text());
    let dy = parseVal($('div[title="Dividend Yield"] .value').text());

    // 4. Segmento - Lógica Aprimorada
    let segment = 'Geral';
    // Prioriza .segment-data (FIIs) e .sector-data (Ações)
    const segmentSelectors = [
        '.segment-data .value', 
        '.sector-data .value', 
        'div.cell:contains("Segmento") .value',
        'div.cell:contains("Setor") .value'
    ];
    
    for (const sel of segmentSelectors) {
        const txt = $(sel).first().text().trim();
        if (txt && txt.length > 2 && !txt.includes('-')) { 
            segment = txt; 
            break; 
        }
    }

    // Salva Metadados no Supabase
    await supabase.from('ativos_metadata').upsert({
        ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
    }, { onConflict: 'ticker' });

    // 5. Proventos
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();

    $('table').each((_, table) => {
        const headerMap: Record<string, number> = {};
        $(table).find('thead th').each((idx, th) => {
            const txt = $(th).text().toLowerCase().trim();
            if (txt.includes('com') || txt.includes('base')) headerMap.com = idx;
            if (txt.includes('pagamento')) headerMap.pag = idx;
            if (txt.includes('valor')) headerMap.val = idx;
            if (txt.includes('tipo')) headerMap.type = idx;
        });

        if (headerMap.com !== undefined && headerMap.val !== undefined) {
            $(table).find('tbody tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length < 2) return;
                
                const dateCom = parseDate($(tds[headerMap.com]).text().trim());
                const val = parseVal($(tds[headerMap.val]).text().trim());
                const datePag = (headerMap.pag !== undefined ? parseDate($(tds[headerMap.pag]).text().trim()) : null) || dateCom;
                
                let tipo = 'DIV';
                const typeRaw = headerMap.type !== undefined ? $(tds[headerMap.type]).text().toLowerCase() : '';
                if (typeRaw.includes('jcp') || typeRaw.includes('juros')) tipo = 'JCP';
                else if (typeRaw.includes('rendimento')) tipo = 'REND';

                if (dateCom && val > 0) {
                    const key = `${stock}-${tipo}-${dateCom}-${datePag}-${val}`;
                    if (!processedKeys.has(key)) {
                        dividendsToUpsert.push({ ticker: stock, type: tipo, date_com: dateCom, payment_date: datePag, rate: val });
                        processedKeys.add(key);
                    }
                }
            });
        }
    });

    if (dividendsToUpsert.length > 0) {
        await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true
        });
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        segment: segment,
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length
    });

  } catch (error: any) {
    console.error(`[Scraper Error] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
