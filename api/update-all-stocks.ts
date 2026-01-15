
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Função reutilizável de scraping (Sincronizada com update-stock.ts)
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
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://investidor10.com.br/'
            },
            timeout: 15000
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

        const getCardValue = (labels: string[]) => {
           let value = '';
           labels.forEach(label => { if (!value) value = $(`div[title="${label}"] .value`).text().trim(); });
           if (!value) {
               $('span, div.name, p').each((_, el) => {
                   if (labels.some(l => $(el).text().trim().toUpperCase() === l.toUpperCase())) {
                       const next = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
                       if (/\d/.test(next)) value = next;
                   }
               });
           }
           return parseMoney(value);
        };

        const cotacao = getCardValue(['Cotação', 'Valor Atual', 'Preço']) || parseMoney($('.quotation-price').first().text());
        const dy = getCardValue(['Dividend Yield', 'DY', 'Yield']);
        const pvp = getCardValue(['P/VP', 'VPA', 'VP']);
        const pl = getCardValue(['P/L', 'PL', 'Preço/Lucro']);
        const vacancia = getCardValue(['Vacância Física', 'Vacância']);
        
        let segment = 'Geral';
        const segmentEl = $('.segment-data .value, .sector-data .value').first();
        if (segmentEl.length) segment = segmentEl.text().trim();

        let valMercadoStr = '';
        $('div, span').each((_, el) => {
            if ($(el).text().trim() === 'Valor de Mercado') valMercadoStr = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
        });

        // Safety Check: Se tudo for zero, aborta este ticker
        if (cotacao === 0 && dy === 0 && pvp === 0) return { ticker, status: 'skipped', reason: 'zeros' };

        // Upsert Metadata
        await supabase.from('ativos_metadata').upsert({
            ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, pl, vacancia, valor_mercado: valMercadoStr, updated_at: new Date().toISOString()
        });

        // Upsert Dividends
        const dividendsToUpsert: any[] = [];
        const processedKeys = new Set();
        $('table').each((_, table) => {
            if ($(table).text().toLowerCase().includes('com') && $(table).text().toLowerCase().includes('pagamento')) {
                 $(table).find('tbody tr').each((__, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length >= 3) {
                        let tipoIdx = 0, comIdx = 1, pagIdx = 2, valIdx = 3;
                        if (tds.length === 3) { comIdx = 0; pagIdx = 1; valIdx = 2; tipoIdx = -1; }
                        const tipo = (tipoIdx >= 0 ? $(tds[tipoIdx]).text().toUpperCase() : 'DIV').includes('JCP') ? 'JCP' : 'DIV';
                        const dCom = parseDate($(tds[comIdx]).text());
                        const dPag = parseDate($(tds[pagIdx]).text()) || dCom;
                        const val = parseMoney($(tds[valIdx]).text());
                        if (dCom && val > 0) {
                            const key = `${dCom}-${val}`;
                            if (!processedKeys.has(key)) {
                                dividendsToUpsert.push({ ticker: stock, type: tipo, date_com: dCom, payment_date: dPag, rate: val });
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
  // Autenticação básica para CRON (opcional)
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Busca todos os tickers cadastrados
    const { data: transactions, error } = await supabase.from('transactions').select('ticker');
    if (error) throw error;
    
    const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker))];
    
    // 2. Processamento em Lotes (Batching) para evitar Timeout e Rate Limit
    const BATCH_SIZE = 3; // Pequeno para não sobrecarregar
    const DELAY_MS = 2000; // 2 segundos entre lotes
    const results = [];

    // Loop que garante processamento de TODOS os itens
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
        const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
        
        // Processa lote em paralelo
        const batchResults = await Promise.all(batch.map((ticker: unknown) => scrapeTickerData(ticker as string)));
        results.push(...batchResults);

        // Delay para não parecer ataque DDoS
        if (i + BATCH_SIZE < uniqueTickers.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    return res.status(200).json({ success: true, total: uniqueTickers.length, results });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return res.status(500).json({ error: 'Falha Cron', details: error.message });
  }
}
