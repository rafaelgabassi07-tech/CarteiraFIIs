
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') return res.status(400).json({ error: 'Ticker obrigatório.' });

  try {
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    // Lógica de roteamento de tipo
    const KNOWN_ETFS = ['BOVA11', 'SMAL11', 'IVVB11', 'HASH11', 'XINA11', 'GOLD11', 'NASD11', 'SPXI11', 'EURP11'];
    const KNOWN_STOCKS_11 = ['TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'ENGI11', 'CPFE11', 'ITUB11', 'BBDC11'];

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

    // --- UTILS ---
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

    // --- EXTRAÇÃO DE DADOS (HÍBRIDA: Mobile Cells + Desktop Cards) ---
    const dataMap: Record<string, string> = {};

    // 1. Desktop Cards (._card)
    $('._card').each((_, el) => {
        const title = $(el).find('._card-header').text().trim();
        const value = $(el).find('._card-body').text().trim();
        if (title && value) dataMap[normalizeKey(title)] = value;
    });

    // 2. Mobile Cells (.cell)
    $('.cell').each((_, el) => {
        let title = $(el).find('.name').text().trim();
        if (!title) title = $(el).children('span').first().text().trim(); // Estrutura variada
        let value = $(el).find('.value').text().trim(); 
        if (!value) value = $(el).children('span').last().text().trim();

        if (title && value) dataMap[normalizeKey(title)] = value;
    });

    // 3. Header Principal (Cotação destaque)
    const cotacaoDestaque = $('.quotation-price').first().text().trim();
    if (cotacaoDestaque) dataMap['cotacao'] = cotacaoDestaque;

    // --- MAPEAMENTO FINAL ---
    const getVal = (keys: string[]) => {
        for (const k of keys) {
            const normalized = normalizeKey(k);
            // Busca exata ou parcial
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

    const cotacao = getVal(['cotacao', 'valor atual', 'preco']) || parseMoney(cotacaoDestaque);
    const dy = getVal(['dividend yield', 'dy', 'yield']);
    const pvp = getVal(['p/vp', 'vpa', 'vp']);
    const pl = getVal(['p/l', 'pl', 'preco/lucro']);
    const vacancia = getVal(['vacancia']);
    const valorMercado = getText(['valor de mercado', 'mercado']);

    // --- SEGMENTO APRIMORADO ---
    let segment = getText(['segmento', 'segmentacao']);
    
    // Fallback: Breadcrumbs
    if (!segment || segment.length < 3) {
        $('#breadcrumbs a, .breadcrumbs a').each((i, el) => {
             const txt = $(el).text().trim();
             // Geralmente o último ou penúltimo item é o setor
             if (txt !== 'Início' && txt !== 'Ações' && txt !== 'FIIs' && txt !== stock) {
                 segment = txt;
             }
        });
    }
    if (!segment) segment = 'Geral';

    // Safety Check
    if (cotacao === 0 && dy === 0 && pvp === 0) {
        throw new Error("Dados zerados. Bloqueio ou ticker inválido.");
    }

    // Salvar Metadata
    await supabase.from('ativos_metadata').upsert({
        ticker: stock,
        type: assetType,
        segment: segment,
        current_price: cotacao,
        pvp, dy_12m: dy, pl, vacancia,
        valor_mercado: valorMercado,
        updated_at: new Date().toISOString()
    }, { onConflict: 'ticker' });

    // --- EXTRAÇÃO DE DIVIDENDOS (JCP FIX) ---
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();
    
    $('table').each((_, table) => {
        const headerText = $(table).text().toLowerCase();
        
        if (headerText.includes('com') && (headerText.includes('pagamento') || headerText.includes('valor'))) {
             // Mapeamento dinâmico de colunas
             const map: Record<string, number> = {};
             
             // Analisa headers (thead ou primeira tr)
             const cols = $(table).find('tr').first().find('th, td');
             cols.each((idx, col) => {
                 const txt = $(col).text().toLowerCase().trim();
                 if (txt.includes('tipo')) map.tipo = idx;
                 if (txt.includes('com')) map.com = idx;
                 if (txt.includes('pagamento')) map.pag = idx;
                 if (txt.includes('valor')) map.val = idx;
             });

             // Defaults se falhar
             const idxTipo = map.tipo ?? 0;
             const idxCom = map.com ?? 1;
             const idxPag = map.pag ?? 2;
             const idxVal = map.val ?? 3;

             $(table).find('tr').each((i, tr) => {
                 // Pula header
                 if ($(tr).find('th').length > 0) return;
                 
                 const tds = $(tr).find('td');
                 if (tds.length >= 3) {
                     const tipoRaw = $(tds[idxTipo]).text().toUpperCase().trim();
                     
                     // Detecção Robusta de JCP
                     const isJCP = tipoRaw.includes('JUROS') || tipoRaw.includes('JCP') || tipoRaw.includes('J.C.P') || tipoRaw.includes('CAPITAL');
                     const tipo = isJCP ? 'JCP' : 'DIV';

                     const dataCom = parseDate($(tds[idxCom]).text());
                     const dataPag = parseDate($(tds[idxPag]).text()) || dataCom;
                     const valor = parseMoney($(tds[idxVal]).text());

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
            onConflict: 'ticker, type, date_com, payment_date, rate', 
            ignoreDuplicates: true
        });
    }

    return res.status(200).json({
      success: true,
      ticker: stock,
      data: { price: cotacao, dy, pvp, segment },
      dividends_found: dividendsToUpsert.length
    });

  } catch (error: any) {
    console.error(`Erro [${stock}]:`, error.message);
    return res.status(500).json({ error: 'Falha no processamento.', details: error.message });
  }
}
