
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        // Remove tudo que não é número, vírgula ou ponto
        const clean = s.replace(/[^\d.,-]/g, '');
        // Troca vírgula por ponto para JS entender
        return parseFloat(clean.replace('.', '').replace(',', '.')) || 0;
    };

    const parseDate = (str: string): string | null => {
        if (!str || str.length < 8) return null; 
        const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
    };

    // 3. Fundamentos
    let cotacao = parseVal($('._card-body span:contains("Cotação")').closest('.card').find('._card-body span').last().text());
    if(!cotacao) cotacao = parseVal($('.quotation-price').first().text());
    
    // P/VP e DY
    let pvp = parseVal($('div[title="P/VP"] .value').text());
    if (!pvp) pvp = parseVal($('.vp-value').text());

    let dy = parseVal($('div[title="Dividend Yield"] .value').text());
    if (!dy) dy = parseVal($('.dy-value').text());

    // 4. Segmento - Lógica Aprimorada e Limpeza
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

    // Salva Metadados
    await supabase.from('ativos_metadata').upsert({
        ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
    }, { onConflict: 'ticker' });

    // 5. Proventos - Lógica "Fuzzy" (Mais agressiva e robusta)
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();

    // Varre TODAS as linhas de tabela encontradas na página
    $('tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length < 2) return; // Precisa de pelo menos 2 colunas

        const rowText = $(tr).text();
        const rowHtml = $(tr).html() || '';

        // Tenta encontrar datas na linha (Formato DD/MM/AAAA)
        const datesFound: string[] = [];
        tds.each((_, td) => {
            const txt = $(td).text().trim();
            const date = parseDate(txt);
            if (date) datesFound.push(date);
        });

        // Tenta encontrar valores monetários na linha
        let valueFound = 0;
        tds.each((_, td) => {
            const txt = $(td).text().trim();
            if (txt.includes(',') && (txt.includes('R$') || /^\d/.test(txt))) {
                const val = parseVal(txt);
                // Filtra valores absurdos (acima de 500 reais por cota é improvável para div normal)
                if (val > 0 && val < 1000) { 
                    valueFound = val;
                }
            }
        });

        // Se achou pelo menos uma data e um valor, é um candidato forte
        if (datesFound.length > 0 && valueFound > 0) {
            // Lógica de Data Com vs Pagamento
            // Se tiver 2 datas: Assumimos a mais antiga como Com e a mais nova como Pagamento
            // Se tiver 1 data: Assumimos que é Com E Pagamento (para garantir entrada no gráfico)
            datesFound.sort(); 
            const dateCom = datesFound[0];
            const datePag = datesFound.length > 1 ? datesFound[datesFound.length - 1] : dateCom;

            // Determina Tipo
            let tipo = 'DIV';
            const lowerRow = rowText.toLowerCase();
            if (lowerRow.includes('jcp') || lowerRow.includes('juros')) tipo = 'JCP';
            else if (lowerRow.includes('rendimento')) tipo = 'REND';

            // Cria chave única
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
    });

    if (dividendsToUpsert.length > 0) {
        // Ordena por data decrescente para garantir os mais recentes
        dividendsToUpsert.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
        
        await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true
        });
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        segment: segment,
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length,
        method: 'fuzzy_v2'
    });

  } catch (error: any) {
    console.error(`[Scraper Error] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
