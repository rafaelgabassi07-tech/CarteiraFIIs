
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Handling
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { ticker, force } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') {
    return res.status(400).json({ error: 'Ticker obrigatório' });
  }

  try {
    // --- 0. Verificação de Cache (Economia de Requisições) ---
    if (force !== 'true') {
        const { data: cached } = await supabase
            .from('ativos_metadata')
            .select('updated_at')
            .eq('ticker', stock)
            .single();

        if (cached && cached.updated_at) {
            const lastUpdate = new Date(cached.updated_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);

            if (hoursDiff < 12) {
                console.log(`[Cache Hit] ${stock} atualizado há ${hoursDiff.toFixed(1)}h.`);
                return res.status(200).json({ success: true, cached: true });
            }
        }
    }

    // --- Início do Scraping ---
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    if (stock.endsWith('11') || stock.endsWith('11B') || stock.endsWith('33') || stock.endsWith('34')) {
        typePath = 'fiis';
        assetType = 'FII';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    console.log(`[Scraper] Buscando fundamentos para: ${stock} (Modo: ${process.env.SCRAPER_API_KEY ? 'Proxy' : 'Direto'})`);

    let html;
    
    // Headers ultra-realistas para evitar bloqueio 403 sem proxy
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };

    if (process.env.SCRAPER_API_KEY) {
        const response = await axios.get('http://api.scraperapi.com', {
            params: { api_key: process.env.SCRAPER_API_KEY, url: targetUrl, render: 'false', country_code: 'br' },
            timeout: 30000 
        });
        html = response.data;
    } else {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        html = response.data;
    }

    const $ = cheerio.load(html);

    // --- 1. Extração Robusta de Fundamentos ---
    const getCardValue = (searchTerms: string[]) => {
        let foundValue = 0;
        $('span, div, p').each((_, el) => {
            const text = $(el).text().trim().toUpperCase();
            if (searchTerms.some(term => text === term.toUpperCase())) {
                const card = $(el).closest('div[class*="card"]'); 
                if (card.length) {
                    let valStr = card.find('[class*="value"]').first().text().trim();
                    if (!valStr) {
                         card.find('span').each((_, span) => {
                             const t = $(span).text().trim();
                             if (/^\d+[.,]\d+/.test(t) || t.includes('R$') || t.includes('%')) {
                                 valStr = t;
                             }
                         });
                    }
                    if (valStr) {
                        foundValue = parseMoney(valStr);
                        return false; 
                    }
                }
            }
        });
        return foundValue;
    };

    const cotacao = getCardValue(["Cotação", "Valor Atual", "Preço"]); 
    const pvp = getCardValue(["P/VP", "P/VPA", "VPA"]);
    const dy = getCardValue(["DY", "Dividend Yield", "DY (12M)"]);
    
    // Extração de Segmento
    let segment = 'Geral';
    const segmentEl = $('.segment-data .value, .sector-data .value, span:contains("Segmento") + span, span:contains("Setor") + span').first();
    if (segmentEl.length) segment = segmentEl.text().trim();

    console.log(`[Dados Extraídos] ${stock} -> P/VP: ${pvp}, DY: ${dy}, Preço: ${cotacao}`);

    // Salva Metadata
    const { error: metaError } = await supabase.from('ativos_metadata').upsert({
        ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
    }, { onConflict: 'ticker' });

    if (metaError) console.error("Erro salvando metadata:", metaError);

    // --- 2. Extração de Proventos ---
    const dividendsToUpsert: any[] = [];
    
    $('table').each((_, table) => {
        const headersText = $(table).find('thead').text().toLowerCase();
        if (headersText.includes('com') && headersText.includes('pagamento')) {
            const headerMap: any = { tipo: 0, dataCom: 1, dataPag: 2, valor: 3 };
            
            $(table).find('thead th').each((idx, th) => {
                const h = $(th).text().trim().toLowerCase();
                if (h.includes('tipo')) headerMap.tipo = idx;
                if (h.includes('com') || h.includes('base')) headerMap.dataCom = idx;
                if (h.includes('pagamento')) headerMap.dataPag = idx;
                if (h.includes('valor')) headerMap.valor = idx;
            });

            $(table).find('tbody tr').each((_, tr) => {
                const cols = $(tr).find('td');
                if (cols.length >= 4) {
                    const tipoRaw = $(cols[headerMap.tipo]).text().trim();
                    const dataComRaw = $(cols[headerMap.dataCom]).text().trim();
                    const dataPagRaw = $(cols[headerMap.dataPag]).text().trim();
                    const valorRaw = $(cols[headerMap.valor]).text().trim();

                    const dataCom = parseDate(dataComRaw);
                    const dataPagamento = parseDate(dataPagRaw);
                    const valor = parseMoney(valorRaw);

                    let tipo = 'DIV';
                    const tLower = tipoRaw.toLowerCase();
                    if (tLower.includes('jcp') || tLower.includes('juros')) tipo = 'JCP';
                    else if (tLower.includes('rendimento')) tipo = 'REND';

                    if (valor > 0 && dataCom && dataPagamento) {
                        dividendsToUpsert.push({
                            ticker: stock, type: tipo, date_com: dataCom, payment_date: dataPagamento, rate: valor
                        });
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
        cached: false,
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length
    });

  } catch (error: any) {
    console.error(`[Scraper Fatal] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}

function parseMoney(str: string) {
    if (!str) return 0;
    let clean = str.replace(/[R$\%\s]/g, '').trim();
    clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function parseDate(str: string) {
    if (!str || str.includes('-')) return null;
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return null;
}
