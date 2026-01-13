
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Lógica de Scraping Centralizada
async function scrapeTickerData(ticker: string) {
    try {
        const stock = ticker.toUpperCase().trim();
        let typePath = 'acoes';
        let assetType = 'ACAO';
        
        if (stock.endsWith('11') || stock.endsWith('11B')) {
            typePath = 'fiis';
            assetType = 'FII';
        }

        const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
        
        let html;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache'
        };

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

        // --- 1. Fundamentos ---
        const getFundamentalValue = (labels: string[]) => {
            let valFound = 0;
            $('span, div, p').each((_, el) => {
                const text = $(el).text().trim().toUpperCase();
                if (labels.some(l => text === l.toUpperCase())) {
                     const card = $(el).closest('div[class*="card"]');
                     let v = card.find('.value').text().trim();
                     if(v) { valFound = parseMoney(v); return false; }
                }
            });
            return valFound;
        };

        const cotacao = getFundamentalValue(["Cotação", "Valor Atual", "Preço"]);
        const pvp = getFundamentalValue(["P/VP", "P/VPA"]);
        const dy = getFundamentalValue(["DY", "Dividend Yield", "DY (12M)"]);
        
        // --- 2. Segmento (Lógica Aprimorada) ---
        let segment = 'Geral';
        const segmentEl = $('.segment-data .value, .sector-data .value').first();
        if (segmentEl.length) {
            segment = segmentEl.text().trim();
        } else {
            $('div.cell').each((_, el) => {
                const label = $(el).find('.name').text().trim().toLowerCase();
                if (label === 'segmento') {
                    const val = $(el).find('.value').text().trim();
                    if (val) segment = val;
                }
            });
            if (segment === 'Geral') {
                 const labelSpan = $('span:contains("Segmento"), span:contains("Setor")').first();
                 if (labelSpan.length) {
                     const nextText = labelSpan.next().text().trim();
                     if (nextText && nextText.length > 2) segment = nextText;
                 }
            }
        }

        // Atualiza Metadata
        await supabase.from('ativos_metadata').upsert({
            ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
        });

        // --- 3. Proventos (Regex Inteligente) ---
        const dividendsToUpsert: any[] = [];
        const processedKeys = new Set();
        
        $('table tr').each((_, tr) => {
            const cols = $(tr).find('td');
            if (cols.length >= 3) {
                let tipo = '';
                let dataCom = null;
                let dataPag = null;
                let valor = 0;

                cols.each((_, td) => {
                    const text = $(td).text().trim();
                    const textLower = text.toLowerCase();
                    
                    if (textLower.includes('jcp') || textLower.includes('juros')) tipo = 'JCP';
                    else if (textLower.includes('dividendo')) tipo = 'DIV';
                    else if (textLower.includes('rendimento')) tipo = 'REND';

                    if (/\d{2}\/\d{2}\/\d{4}/.test(text)) {
                        const parsedDate = parseDate(text);
                        if (parsedDate) {
                            if (!dataCom) dataCom = parsedDate;
                            else if (!dataPag) dataPag = parsedDate;
                        }
                    }

                    if ((text.includes(',') || text.includes('.')) && !text.includes('%') && /\d/.test(text)) {
                        const v = parseMoney(text);
                        if (v > 0 && v < 1000) valor = v;
                    }
                });

                if (!dataPag && dataCom) dataPag = dataCom;
                if (!tipo) tipo = assetType === 'FII' ? 'REND' : 'DIV';

                if (valor > 0 && dataCom && dataPag) {
                    const uniqueKey = `${stock}-${tipo}-${dataCom}-${dataPag}-${valor}`;
                    if (!processedKeys.has(uniqueKey)) {
                        dividendsToUpsert.push({
                            ticker: stock, type: tipo, date_com: dataCom, payment_date: dataPag, rate: valor
                        });
                        processedKeys.add(uniqueKey);
                    }
                }
            }
        });

        if (dividendsToUpsert.length > 0) {
            await supabase.from('market_dividends').upsert(dividendsToUpsert, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true 
            });
        }

        return { ticker, status: 'success', price: cotacao, dividends: dividendsToUpsert.length };

    } catch (error: any) {
        console.error(`Erro ao atualizar ${ticker}:`, error.message);
        return { ticker, status: 'error', error: error.message };
    }
}

function parseMoney(str: string) {
    if (!str) return 0;
    const clean = str.replace('R$', '').replace('%', '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
}

function parseDate(str: string) {
    if (!str || str.length < 8) return null;
    const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: transactions, error } = await supabase.from('transactions').select('ticker');
    if (error) throw error;

    const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker))];
    const batchSize = 3;
    const batch = uniqueTickers.slice(0, batchSize); 

    console.log(`[Cron] Atualizando lote de ${batch.length} ativos...`);

    const results = await Promise.all(batch.map((ticker: unknown) => scrapeTickerData(ticker as string)));

    return res.status(200).json({ success: true, processed: results.length, results });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: 'Falha Cron', details: error.message });
  }
}
