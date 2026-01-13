
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
        
        // --- 2. Segmento ---
        let segment = 'Geral';
        const segmentLabel = $('span:contains("Segmento"), span:contains("Setor")').first();
        if (segmentLabel.length) {
            let segText = segmentLabel.next().text().trim() || segmentLabel.parent().find('.value').text().trim();
            if (segText) segment = segText;
        } else {
             segment = $('.segment-data .value, .sector-data .value').first().text().trim() || 'Geral';
        }

        // Atualiza Metadata
        await supabase.from('ativos_metadata').upsert({
            ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
        });

        // --- 3. Proventos ---
        const dividendsToUpsert: any[] = [];
        
        $('table').each((_, table) => {
            const headersText = $(table).find('thead').text().toLowerCase();
            if ((headersText.includes('com') || headersText.includes('base')) && (headersText.includes('pagamento') || headersText.includes('valor'))) {
                const headerMap: any = { tipo: -1, dataCom: -1, dataPag: -1, valor: -1 };
                
                $(table).find('thead th').each((idx, th) => {
                    const h = $(th).text().trim().toLowerCase();
                    if (h.includes('tipo')) headerMap.tipo = idx;
                    if (h.includes('com') || h.includes('base')) headerMap.dataCom = idx;
                    if (h.includes('pagamento')) headerMap.dataPag = idx;
                    if (h.includes('valor')) headerMap.valor = idx;
                });

                if (headerMap.dataCom !== -1 && headerMap.valor !== -1) {
                    $(table).find('tbody tr').each((_, tr) => {
                        const cols = $(tr).find('td');
                        if (cols.length >= 3) {
                            const tipoRaw = headerMap.tipo !== -1 ? $(cols[headerMap.tipo]).text().trim() : 'Rendimento';
                            const dataComRaw = $(cols[headerMap.dataCom]).text().trim();
                            const dataPagRaw = headerMap.dataPag !== -1 ? $(cols[headerMap.dataPag]).text().trim() : dataComRaw;
                            const valorRaw = $(cols[headerMap.valor]).text().trim();

                            const dataCom = parseDate(dataComRaw);
                            const dataPagamento = parseDate(dataPagRaw);
                            const valor = parseMoney(valorRaw);

                            let tipo = 'DIV';
                            const tLower = tipoRaw.toLowerCase();
                            if (tLower.includes('juros') || tLower.includes('jcp')) tipo = 'JCP';
                            else if (tLower.includes('rendimento')) tipo = 'REND';

                            if (valor > 0 && dataCom && dataPagamento) {
                                dividendsToUpsert.push({
                                    ticker: stock, type: tipo, date_com: dataCom, payment_date: dataPagamento, rate: valor
                                });
                            }
                        }
                    });
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
    if (!str || str.includes('-') && str.length > 10) return null;
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
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
    // Batch reduzido para evitar timeout em conexões diretas
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
