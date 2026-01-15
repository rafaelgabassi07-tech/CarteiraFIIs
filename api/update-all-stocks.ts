
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

async function scrapeTickerData(ticker: string) {
    try {
        const stock = ticker.toUpperCase().trim();
        let typePath = 'acoes';
        let assetType = 'ACAO';
        
        const KNOWN_ETFS = ['BOVA11', 'SMAL11', 'IVVB11', 'HASH11', 'XINA11', 'GOLD11', 'NASD11', 'SPXI11', 'EURP11'];
        const KNOWN_STOCKS_11 = ['TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'ENGI11', 'CPFE11'];

        if (KNOWN_ETFS.includes(stock)) {
            typePath = 'etfs';
            assetType = 'ETF';
        } else if (stock.endsWith('11') || stock.endsWith('11B')) {
            if (!KNOWN_STOCKS_11.includes(stock)) {
                typePath = 'fiis';
                assetType = 'FII';
            }
        } else if (stock.endsWith('34') || stock.endsWith('33')) {
            typePath = 'bdrs';
            assetType = 'ACAO';
        }

        const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Cache-Control': 'no-cache',
                'Referer': 'https://investidor10.com.br/'
            },
            timeout: 25000
        });

        const $ = cheerio.load(response.data);

        const parseMoney = (text: string) => {
             if (!text) return 0;
             const clean = text.replace(/[^\d.,-]/g, '').trim();
             return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
        };
        const parseDate = (text: string) => {
            const match = text?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
        };
        const normalizeKey = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        // Extração Híbrida (Map based)
        const dataMap: Record<string, string> = {};
        $('._card').each((_, el) => {
            const title = $(el).find('._card-header').text().trim();
            const value = $(el).find('._card-body').text().trim();
            if (title && value) dataMap[normalizeKey(title)] = value;
        });
        $('.cell').each((_, el) => {
            let title = $(el).find('.name').text().trim() || $(el).children('span').first().text().trim();
            let value = $(el).find('.value').text().trim() || $(el).children('span').last().text().trim();
            if (title && value) dataMap[normalizeKey(title)] = value;
        });

        const getVal = (keys: string[]) => {
            for (const k of keys) {
                const normalized = normalizeKey(k);
                const foundKey = Object.keys(dataMap).find(dk => dk.includes(normalized));
                if (foundKey) return parseMoney(dataMap[foundKey]);
            }
            return 0;
        };
        const getText = (keys: string[]) => {
            for (const k of keys) {
                const normalized = normalizeKey(k);
                const foundKey = Object.keys(dataMap).find(dk => dk === normalized || dk.includes(normalized));
                if (foundKey) return dataMap[foundKey];
            }
            return '';
        };

        const cotacao = getVal(['cotacao', 'valor atual']) || parseMoney($('.quotation-price').first().text());
        const dy = getVal(['dividend yield', 'dy']);
        const pvp = getVal(['p/vp', 'vpa', 'vp']);
        const pl = getVal(['p/l', 'pl']);
        const vacancia = getVal(['vacancia']);
        const valorMercado = getText(['valor de mercado', 'mercado']);

        let segment = getText(['segmento', 'segmentacao']);
        if (!segment || segment.length < 3) {
            $('#breadcrumbs a, .breadcrumbs a').each((i, el) => {
                 const txt = $(el).text().trim();
                 if (txt !== 'Início' && txt !== 'Ações' && txt !== 'FIIs' && txt !== stock) segment = txt;
            });
        }
        if (!segment) segment = 'Geral';

        if (cotacao === 0 && dy === 0 && pvp === 0) return { ticker, status: 'skipped', reason: 'zeros' };

        await supabase.from('ativos_metadata').upsert({
            ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, pl, vacancia, valor_mercado: valorMercado, updated_at: new Date().toISOString()
        }, { onConflict: 'ticker' });

        const dividendsToUpsert: any[] = [];
        const processedKeys = new Set();
        
        $('table').each((_, table) => {
            const headerText = $(table).text().toLowerCase();
            if (headerText.includes('com') && (headerText.includes('pagamento') || headerText.includes('valor'))) {
                 const map: Record<string, number> = {};
                 const cols = $(table).find('tr').first().find('th, td');
                 cols.each((idx, col) => {
                     const txt = $(col).text().toLowerCase().trim();
                     if (txt.includes('tipo')) map.tipo = idx;
                     if (txt.includes('com')) map.com = idx;
                     if (txt.includes('pagamento')) map.pag = idx;
                     if (txt.includes('valor')) map.val = idx;
                 });

                 const idxTipo = map.tipo ?? 0;
                 const idxCom = map.com ?? 1;
                 const idxPag = map.pag ?? 2;
                 const idxVal = map.val ?? 3;

                 $(table).find('tr').each((i, tr) => {
                     if ($(tr).find('th').length > 0) return;
                     const tds = $(tr).find('td');
                     if (tds.length >= 3) {
                         const tipoRaw = $(tds[idxTipo]).text().toUpperCase().trim();
                         const isJCP = tipoRaw.includes('JUROS') || tipoRaw.includes('JCP') || tipoRaw.includes('J.C.P');
                         const tipo = isJCP ? 'JCP' : 'DIV';
                         const dataCom = parseDate($(tds[idxCom]).text());
                         const dataPag = parseDate($(tds[idxPag]).text()) || dataCom;
                         const valor = parseMoney($(tds[idxVal]).text());

                         if (dataCom && valor > 0) {
                             const key = `${stock}-${dataCom}-${valor}`;
                             if (!processedKeys.has(key)) {
                                 dividendsToUpsert.push({ ticker: stock, type: tipo, date_com: dataCom, payment_date: dataPag, rate: valor });
                                 processedKeys.add(key);
                             }
                         }
                     }
                 });
            }
        });

        if (dividendsToUpsert.length > 0) {
            await supabase.from('market_dividends').upsert(dividendsToUpsert, { onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true });
        }

        return { ticker, status: 'success', price: cotacao };

    } catch (error: any) {
        return { ticker, status: 'error', error: error.message };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: transactions, error } = await supabase.from('transactions').select('ticker');
    if (error) throw error;
    
    const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker))];
    const BATCH_SIZE = 3; 
    const DELAY_MS = 2500; 
    const results = [];

    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map((ticker: unknown) => scrapeTickerData(ticker as string)));
        results.push(...batchResults);
        if (i + BATCH_SIZE < uniqueTickers.length) await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    return res.status(200).json({ success: true, total: uniqueTickers.length, results });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return res.status(500).json({ error: 'Falha Cron', details: error.message });
  }
}
