
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Lista de ativos final 11 que SÃO Ações (Units), não FIIs
const KNOWN_STOCKS_11 = [
    'TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'BIDI11', 'ENGI11', 'SULA11', 'CPFE11', 'IGTI11', 'ITUB11', 'BBDC11'
];

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
    // 0. Cache Check
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
    
    // Lógica: Se termina em 11, é FII... EXCETO se for uma Unit conhecida ou BDR (33/34)
    if ((stock.endsWith('11') || stock.endsWith('11B')) && !KNOWN_STOCKS_11.includes(stock)) {
        typePath = 'fiis';
        assetType = 'FII';
    } else if (stock.endsWith('33') || stock.endsWith('34')) {
        typePath = 'bdrs'; // Investidor10 geralmente usa /bdrs/
        assetType = 'ACAO'; // Tratamos BDR como Ação na carteira por simplificação ou crie AssetType.BDR se preferir
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    console.log(`[Scraper] ${stock} -> ${targetUrl}`);

    // 2. Fetch HTML
    let html;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' };

    if (process.env.SCRAPER_API_KEY) {
        const response = await axios.get('http://api.scraperapi.com', {
            params: { api_key: process.env.SCRAPER_API_KEY, url: targetUrl, render: 'false', country_code: 'br' },
            timeout: 40000 
        });
        html = response.data;
    } else {
        const response = await axios.get(targetUrl, { headers, timeout: 20000 });
        html = response.data;
    }

    const $ = cheerio.load(html);

    // 3. Fundamentos Básicos
    const parseVal = (s: string) => {
        if (!s) return 0;
        return parseFloat(s.replace(/[R$\%\s.]/g, '').replace(',', '.')) || 0;
    };
    
    // Tenta pegar de cards específicos primeiro (mais preciso)
    let cotacao = parseVal($('._card-body span:contains("Cotação")').closest('.card').find('._card-body span').last().text());
    if(!cotacao) cotacao = parseVal($('.quotation-price').first().text()); // Tentativa genérica
    if(!cotacao) cotacao = parseVal($('div[title="Valor Atual"] .value').text());

    let pvp = parseVal($('div[title="P/VP"] .value').text());
    let dy = parseVal($('div[title="Dividend Yield"] .value').text());

    // 4. Segmento (Busca Exaustiva)
    let segment = 'Geral';
    const segmentSelectors = [
        '.segment-data .value', 
        '.sector-data .value',
        'div.cell:contains("Segmento") .value',
        'div.cell:contains("Setor") .value',
        'span:contains("Segmento") + span', // Label + Value spans
        'span:contains("Setor") + span'
    ];

    for (const sel of segmentSelectors) {
        const txt = $(sel).first().text().trim();
        if (txt && txt.length > 2 && !txt.includes(':')) {
            segment = txt;
            break;
        }
    }
    
    // Salva Metadata
    await supabase.from('ativos_metadata').upsert({
        ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
    }, { onConflict: 'ticker' });

    // 5. Proventos (Table Header Parsing)
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();

    $('table').each((_, table) => {
        // Mapeia índices das colunas
        const headerMap: Record<string, number> = {};
        let hasValidHeader = false;

        $(table).find('thead th').each((idx, th) => {
            const txt = $(th).text().toLowerCase().trim();
            if (txt.includes('com') || txt.includes('base')) headerMap.com = idx;
            if (txt.includes('pagamento')) headerMap.pag = idx;
            if (txt.includes('valor')) headerMap.val = idx;
            if (txt.includes('tipo')) headerMap.type = idx;
        });

        // Se achou colunas de Data COM e Valor, é uma tabela útil
        if (headerMap.com !== undefined && headerMap.val !== undefined) {
            hasValidHeader = true;
            $(table).find('tbody tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length < 2) return;

                const dateComRaw = $(tds[headerMap.com]).text().trim();
                const valRaw = $(tds[headerMap.val]).text().trim();
                
                // Opcionais
                const datePagRaw = headerMap.pag !== undefined ? $(tds[headerMap.pag]).text().trim() : '';
                const typeRaw = headerMap.type !== undefined ? $(tds[headerMap.type]).text().trim() : '';

                // Parsing
                const dateCom = parseDate(dateComRaw);
                const datePag = parseDate(datePagRaw) || dateCom; // Fallback se pagamento vazio
                const val = parseVal(valRaw);

                let tipo = 'DIV';
                const tLower = typeRaw.toLowerCase();
                if (tLower.includes('jcp') || tLower.includes('juros')) tipo = 'JCP';
                else if (tLower.includes('rendimento')) tipo = 'REND';

                if (dateCom && val > 0) {
                    const key = `${stock}-${tipo}-${dateCom}-${datePag}-${val}`;
                    if (!processedKeys.has(key)) {
                        dividendsToUpsert.push({
                            ticker: stock, type: tipo, date_com: dateCom, payment_date: datePag, rate: val
                        });
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
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length,
        segment
    });

  } catch (error: any) {
    console.error(`[Scraper Error] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}

function parseDate(str: string): string | null {
    if (!str || str.length < 8) return null; 
    const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return null;
}
