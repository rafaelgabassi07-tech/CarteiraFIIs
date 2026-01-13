
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
    
    // Headers anti-bot
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
        const response = await axios.get(targetUrl, { headers, timeout: 20000 });
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

    // 3. Fundamentos Básicos
    let cotacao = parseVal($('._card-body span:contains("Cotação")').closest('.card').find('._card-body span').last().text());
    if(!cotacao) cotacao = parseVal($('.quotation-price').first().text());
    
    // P/VP e DY
    let pvp = parseVal($('div[title="P/VP"] .value').text());
    if (!pvp) pvp = parseVal($('.vp-value').text());

    let dy = parseVal($('div[title="Dividend Yield"] .value').text());
    if (!dy) dy = parseVal($('.dy-value').text());

    // 4. Novos Fundamentos (P/L, ROE, Vacância, Liquidez)
    // Tenta seletores comuns do Investidor10 para desktop e mobile
    let pl = parseVal($('div[title="P/L"] .value').text());
    let roe = parseVal($('div[title="ROE"] .value').text());
    
    // Vacância (Específico FIIs)
    let vacancia = parseVal($('div[title="Vacância Física"] .value').text());
    
    // Liquidez Média Diária (Tratamento para String com M/K)
    let liquidezStr = $('div[title="Liquidez Média Diária"] .value').text().trim();
    // Se não achou pelo title, tenta buscar pelo label próximo
    if (!liquidezStr) {
        liquidezStr = $('.data-item:contains("Liquidez") .value').text().trim();
    }

    // 5. Segmento - Lógica Aprimorada e Limpeza
    let segment = 'Geral';
    
    const directSelectors = ['.segment-data .value', '.sector-data .value', '.segment .value'];
    for (const sel of directSelectors) {
        const txt = $(sel).first().text().trim();
        if (txt && txt.length > 2) { segment = txt; break; }
    }

    if (segment === 'Geral') {
        $('div.cell, div.card, div.data-item, li').each((_, el) => {
            const label = $(el).find('.title, .name, span:first-child, strong').text().trim().toLowerCase();
            if (label.includes('segmento') || label.includes('setor')) {
                const val = $(el).find('.value, .detail, span:last-child').text().trim();
                if (val && val.length > 2 && !val.includes('...')) {
                    segment = val;
                    return false; 
                }
            }
        });
    }

    if (segment && segment !== 'Geral') {
        segment = segment.replace(/^[\d\s.-]+/, ''); 
        segment = segment.replace(/\s+/g, ' ');
        if (segment === segment.toUpperCase()) {
            segment = segment.charAt(0) + segment.slice(1).toLowerCase();
        }
        segment = segment.trim();
    }

    // Salva Metadados (Incluindo novos campos)
    // Nota: O Supabase precisa ter essas colunas ou ser JSONB. 
    // Assumimos que a tabela suporta ou ignora colunas extras se não existirem, 
    // mas o ideal é que 'ativos_metadata' tenha colunas pl, roe, vacancia, liquidez.
    await supabase.from('ativos_metadata').upsert({
        ticker: stock, 
        type: assetType, 
        segment, 
        current_price: cotacao, 
        pvp, 
        dy_12m: dy,
        pl,          // Novo
        roe,         // Novo
        vacancia,    // Novo (FII)
        liquidez: liquidezStr, // Novo
        updated_at: new Date()
    }, { onConflict: 'ticker' });

    // 5. Proventos - Lógica Híbrida
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();

    let tablesToScan = $('#table-dividends-history');
    if (tablesToScan.length === 0) {
        tablesToScan = $('table').filter((_, el) => {
            const txt = $(el).text().toLowerCase();
            return (txt.includes('com') || txt.includes('base')) && (txt.includes('pagamento') || txt.includes('valor'));
        });
    }

    tablesToScan.find('tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 2) return;
        const rowText = $(tr).text();
        if (rowText.toLowerCase().includes('variação') || rowText.toLowerCase().includes('volume')) return;
        processRow(tds, rowText);
    });

    if (dividendsToUpsert.length === 0) {
        $('tr, div.card, div.cell').each((_, el) => {
            const txt = $(el).text().toLowerCase();
            if (txt.includes('jcp') || txt.includes('dividendo') || txt.includes('rendimento')) {
                const tds = $(el).find('td, span.value, div.detail');
                processRow(tds, txt);
            }
        });
    }

    function processRow(elements: cheerio.Cheerio<cheerio.Element>, fullText: string) {
        const datesFound: string[] = [];
        let valueFound = 0;

        elements.each((_, el) => {
            const txt = $(el).text().trim();
            const date = parseDate(txt);
            if (date) datesFound.push(date);

            if (!txt.includes('%') && (txt.includes(',') || txt.includes('.')) && /\d/.test(txt)) {
                const val = parseVal(txt);
                if (val > 0 && val < 500) { 
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
        dividendsToUpsert.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
        await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true
        });
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        segment: segment,
        fundamentals: { price: cotacao, pvp, dy, pl, roe, vacancia, liquidez: liquidezStr },
        dividends_found: dividendsToUpsert.length,
        method: 'hybrid_v5_enhanced'
    });

  } catch (error: any) {
    console.error(`[Scraper Error] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
