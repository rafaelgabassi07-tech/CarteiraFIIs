
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Delay para respeitar limites de taxa do servidor de destino
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeTickerData(ticker: string) {
    try {
        const stock = ticker.toUpperCase().trim();
        let typePath = 'acoes';
        let assetType = 'ACAO';
        
        const KNOWN_STOCKS_11 = ['TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'ENGI11', 'CPFE11'];
        const KNOWN_ETFS = ['BOVA11', 'SMAL11', 'IVVB11', 'HASH11', 'XINA11', 'GOLD11', 'NASD11'];

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
        
        // Headers de navegador real (Chrome 121)
        const headers = { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://investidor10.com.br/'
        };

        const response = await axios.get(targetUrl, { headers, timeout: 20000 });
        const html = response.data;
        const $ = cheerio.load(html);

        const parseVal = (s: string) => {
             if (!s) return 0;
             const clean = s.replace(/[^\d.,-]/g, '').trim();
             return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
        };
        
        const parseDate = (str: string): string | null => {
            const match = str?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
        };

        const getCardValue = (labels: string[]) => {
            let value = '';
            labels.forEach(label => {
                if (!value) value = $(`div[title="${label}"] .value`).text().trim();
            });
            if (!value) {
                $('span, div.name').each((_, el) => {
                    const txt = $(el).text().trim().toUpperCase();
                    if (labels.some(l => txt === l.toUpperCase())) {
                        const next = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
                        if (next && /\d/.test(next)) value = next;
                    }
                });
            }
            return parseVal(value);
        };

        const cotacao = getCardValue(['Cotação', 'Valor Atual', 'Preço']) || parseVal($('.quotation-price').first().text());
        const pvp = getCardValue(['P/VP', 'VPA', 'VP']);
        const dy = getCardValue(['Dividend Yield', 'DY', 'Yield']);
        const pl = getCardValue(['P/L', 'PL', 'Preço/Lucro']);
        const vacancia = getCardValue(['Vacância Física', 'Vacância']);

        let valMercadoStr = '';
        $('div, span').each((_, el) => {
            if ($(el).text().trim() === 'Valor de Mercado') {
                 valMercadoStr = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
            }
        });

        let segment = 'Geral';
        const segmentEl = $('.segment-data .value, .sector-data .value').first();
        if (segmentEl.length) segment = segmentEl.text().trim();

        await supabase.from('ativos_metadata').upsert({
            ticker: stock, 
            type: assetType, 
            segment, 
            current_price: cotacao, 
            pvp, 
            dy_12m: dy,
            pl,
            vacancia,
            valor_mercado: valMercadoStr,
            updated_at: new Date().toISOString()
        }, { onConflict: 'ticker' });

        const dividendsToUpsert: any[] = [];
        const processedKeys = new Set();

        const tables = $('table');
        tables.each((_, table) => {
            const headerText = $(table).text().toLowerCase();
            if (headerText.includes('com') && headerText.includes('pagamento')) {
                 $(table).find('tbody tr').each((__, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 3) {
                        let tipoIdx = 0, comIdx = 1, pagIdx = 2, valIdx = 3;
                        if (tds.length === 3) { comIdx = 0; pagIdx = 1; valIdx = 2; tipoIdx = -1; }

                        const tipoRaw = tipoIdx >= 0 ? $(tds[tipoIdx]).text().toUpperCase() : 'DIV';
                        const tipo = tipoRaw.includes('JCP') ? 'JCP' : 'DIV';
                        const dataCom = parseDate($(tds[comIdx]).text());
                        const dataPag = parseDate($(tds[pagIdx]).text()) || dataCom;
                        const valor = parseVal($(tds[valIdx]).text());

                        if (dataCom && valor > 0) {
                            const key = `${stock}-${dataCom}-${valor}`;
                            if (!processedKeys.has(key)) {
                                dividendsToUpsert.push({
                                    ticker: stock,
                                    type: tipo,
                                    date_com: dataCom,
                                    payment_date: dataPag,
                                    rate: valor
                                });
                                processedKeys.add(key);
                            }
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

        return { ticker, status: 'success', price: cotacao, dividends: dividendsToUpsert.length };

    } catch (error: any) {
        return { ticker, status: 'error', error: error.message };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Autenticação básica para CRON
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: transactions, error } = await supabase.from('transactions').select('ticker');
    
    if (error) throw error;
    
    const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker))];
    const BATCH_SIZE = 5; 
    const batch = uniqueTickers.slice(0, BATCH_SIZE); 
    
    const results = [];
    for (const ticker of batch) {
        results.push(await scrapeTickerData(ticker as string));
        await delay(1000); 
    }

    return res.status(200).json({ success: true, processed: results.length, results });

  } catch (error: any) {
    return res.status(500).json({ error: 'Falha Cron', details: error.message });
  }
}
