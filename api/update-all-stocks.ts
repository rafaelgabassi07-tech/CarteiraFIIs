
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

const KNOWN_STOCKS_11 = ['TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'BIDI11', 'ENGI11', 'SULA11', 'CPFE11', 'IGTI11', 'ITUB11', 'BBDC11'];
const KNOWN_ETFS = ['BOVA11', 'SMAL11', 'IVVB11', 'HASH11', 'QBTC11', 'ETH11', 'XINA11', 'GOLD11', 'BBSD11', 'ECOO11', 'GOVE11', 'ISUS11', 'MATB11', 'PIBB11', 'SPXI11'];

async function scrapeTickerData(ticker: string) {
    try {
        const stock = ticker.toUpperCase().trim();
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
        
        const headers = { 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };

        let html;
        if (process.env.SCRAPER_API_KEY) {
             const response = await axios.get('http://api.scraperapi.com', {
                params: { api_key: process.env.SCRAPER_API_KEY, url: targetUrl, render: 'true', country_code: 'br' },
                timeout: 35000 
            });
            html = response.data;
        } else {
             const response = await axios.get(targetUrl, { headers, timeout: 15000 });
            html = response.data;
        }

        const $ = cheerio.load(html);
        const parseVal = (s: string) => parseFloat(s.replace(/[R$\%\s.]/g, '').replace(',', '.')) || 0;
        const parseDate = (str: string): string | null => {
            const match = str?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
        };

        let cotacao = parseVal($('._card-body span:contains("Cotação")').closest('.card').find('._card-body span').last().text()) || parseVal($('.quotation-price').first().text());
        let pvp = parseVal($('div[title="P/VP"] .value').text());
        let dy = parseVal($('div[title="Dividend Yield"] .value').text());
        let segment = 'Geral';
        const segmentSelectors = ['.segment-data .value', '.sector-data .value', 'div.cell:contains("Segmento") .value'];
        for (const sel of segmentSelectors) {
            const txt = $(sel).first().text().trim();
            if (txt && txt.length > 2) { segment = txt; break; }
        }

        await supabase.from('ativos_metadata').upsert({
            ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
        });

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
                    if (typeRaw.includes('jcp')) tipo = 'JCP'; else if (typeRaw.includes('rendimento')) tipo = 'REND';

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

        if (dividendsToUpsert.length < 2) {
            $('tr').each((_, tr) => {
                 const txt = $(tr).text();
                 if (/\d{2}\/\d{2}\/\d{4}/.test(txt) && /[0-9],[0-9]/.test(txt)) {
                     const tds = $(tr).find('td');
                     let dCom: string | null = null;
                     let val = 0;
                     let tipo = 'DIV';
                     tds.each((_, td) => {
                         const t = $(td).text().trim();
                         const asDate = parseDate(t);
                         if (asDate && !dCom) dCom = asDate;
                         const asVal = parseVal(t);
                         if (asVal > 0 && asVal < 500 && t.includes(',')) val = asVal;
                         if (t.toLowerCase().includes('jcp')) tipo = 'JCP';
                     });
                     if (dCom && val > 0) {
                          const key = `${stock}-${tipo}-${dCom}-${dCom}-${val}`;
                          if (!processedKeys.has(key)) {
                              dividendsToUpsert.push({ ticker: stock, type: tipo, date_com: dCom, payment_date: dCom, rate: val });
                              processedKeys.add(key);
                          }
                     }
                 }
            });
        }

        if (dividendsToUpsert.length > 0) {
            await supabase.from('market_dividends').upsert(dividendsToUpsert, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true 
            });
        }

        return { ticker, status: 'success', price: cotacao, dividends: dividendsToUpsert.length };

    } catch (error: any) {
        return { ticker, status: 'error', error: error.message };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) { /* auth logic */ }

  try {
    const { data: transactions, error } = await supabase.from('transactions').select('ticker');
    if (error) throw error;
    const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker))];
    const batchSize = 3; 
    const batch = uniqueTickers.slice(0, batchSize); 
    const results = await Promise.all(batch.map((ticker: unknown) => scrapeTickerData(ticker as string)));
    return res.status(200).json({ success: true, processed: results.length, results });
  } catch (error: any) {
    return res.status(500).json({ error: 'Falha Cron', details: error.message });
  }
}
