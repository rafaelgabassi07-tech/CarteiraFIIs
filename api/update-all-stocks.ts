
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Lógica de Scraping Centralizada (cópia aprimorada do handler individual)
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

        if (process.env.SCRAPER_API_KEY) {
             const response = await axios.get('http://api.scraperapi.com', {
                params: {
                    api_key: process.env.SCRAPER_API_KEY,
                    url: targetUrl,
                    render: 'true',
                    country_code: 'br',
                    premium: 'true'
                },
                timeout: 35000 
            });
            html = response.data;
        } else {
             const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://www.google.com.br/',
                    'Cache-Control': 'no-cache'
                },
                timeout: 12000
            });
            html = response.data;
        }

        const $ = cheerio.load(html);

        // --- Seletores de Fundamentos ---
        const getFundamentalValue = (labels: string[]) => {
            for (const label of labels) {
                const el = $(`span`).filter((i, el) => $(el).text().trim().toUpperCase() === label.toUpperCase()).first();
                if (el.length > 0) {
                    let val = el.closest('div._card').find('div._card-body span.value').text().trim();
                    if (val) return parseMoney(val);
                }
            }
            return 0;
        };

        const cotacao = getFundamentalValue(["Cotação", "Valor Atual", "Preço"]);
        const pvp = getFundamentalValue(["P/VP", "P/VPA"]);
        const dy = getFundamentalValue(["DY", "Dividend Yield", "DY (12M)"]);
        
        const segment = $('.segment-data .value').first().text().trim() || 
                        $('.sector-data .value').first().text().trim() || 'Geral';

        // Atualiza Metadata
        await supabase.from('ativos_metadata').upsert({
            ticker: stock,
            type: assetType,
            segment: segment,
            current_price: cotacao,
            pvp: pvp,
            dy_12m: dy,
            updated_at: new Date()
        });

        // --- Seletores de Proventos ---
        const dividendsToUpsert: any[] = [];
        $('#table-dividends-history tbody tr').each((_, element) => {
            const cols = $(element).find('td');
            if (cols.length >= 4) {
                const tipoRaw = $(cols[0]).text().trim(); 
                const dataCom = parseDate($(cols[1]).text().trim());
                const dataPagamento = parseDate($(cols[2]).text().trim());
                const valor = parseMoney($(cols[3]).text().trim());

                let tipo = 'DIV';
                const tLower = tipoRaw.toLowerCase();
                if (tLower.includes('juros') || tLower.includes('jcp')) tipo = 'JCP';
                else if (tLower.includes('rendimento')) tipo = 'REND';

                if (valor > 0 && dataCom && dataPagamento) {
                    dividendsToUpsert.push({
                        ticker: stock,
                        type: tipo,
                        date_com: dataCom,
                        payment_date: dataPagamento,
                        rate: valor
                    });
                }
            }
        });

        if (dividendsToUpsert.length > 0) {
            await supabase.from('market_dividends').upsert(dividendsToUpsert, { 
                onConflict: 'ticker, type, date_com, payment_date, rate',
                ignoreDuplicates: true 
            });
        }

        return { ticker, status: 'success', price: cotacao, dividends: dividendsToUpsert.length };

    } catch (error: any) {
        console.error(`Erro ao atualizar ${ticker}:`, error.message);
        return { ticker, status: 'error', error: error.message };
    }
}

// Helpers
function parseMoney(str: string) {
    if (!str) return 0;
    const clean = str.replace('R$', '').replace('%', '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
}

function parseDate(str: string) {
    if (!str || str === '-') return null;
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CRON Security
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Busca todos os tickers
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('ticker');

    if (error) throw error;

    const uniqueTickers = [...new Set(transactions.map((t: any) => t.ticker))];
    
    // Batch Size Limitado (Vercel Timeout Constraints)
    // Se usar Proxy, limitamos mais pois é mais lento
    const batchSize = process.env.SCRAPER_API_KEY ? 4 : 8;
    const batch = uniqueTickers.slice(0, batchSize); 

    console.log(`[Cron] Atualizando lote de ${batch.length} ativos...`);

    // 2. Executa
    const results = await Promise.all(batch.map(ticker => scrapeTickerData(ticker)));

    return res.status(200).json({
        success: true,
        processed: results.length,
        results
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return res.status(500).json({ error: 'Falha Cron', details: error.message });
  }
}
