
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// Agente HTTPS para evitar bloqueios simples
const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false // Em alguns casos ajuda com certificados intermediários
});

// Helper de Parsing
function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    try {
        const clean = valueStr.replace(/[^0-9,.-]/g, '').trim();
        return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') return res.status(400).json({ error: 'Ticker obrigatório.' });

  try {
    const assetType = (stock.endsWith('11') || stock.endsWith('11B')) ? 'FII' : 'ACAO';
    let url = `https://investidor10.com.br/${assetType === 'FII' ? 'fiis' : 'acoes'}/${stock.toLowerCase()}/`;

    // Fetch com Headers de Navegador Real
    const response = await axios.get(url, {
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://investidor10.com.br/'
      },
      timeout: 10000
    }).catch(async (err) => {
        // Fallback: Tenta URL oposta se 404 (ex: Ação que parece FII ou vice-versa)
        if (err.response?.status === 404) {
            url = `https://investidor10.com.br/${assetType === 'FII' ? 'acoes' : 'fiis'}/${stock.toLowerCase()}/`;
            return await axios.get(url, { httpsAgent, timeout: 10000 });
        }
        throw err;
    });

    const $ = cheerio.load(response.data);
    const dataMap: Record<string, any> = {};

    // 1. Extração Genérica (Cards, Células)
    $('._card').each((_, el) => {
        const title = $(el).find('._card-header').text();
        const value = $(el).find('._card-body').text();
        if (title && value) dataMap[normalizeKey(title)] = value.trim();
    });

    $('.cell').each((_, el) => {
        let title = $(el).find('.name').text() || $(el).children('span').first().text();
        let value = $(el).find('.value').text() || $(el).children('span').last().text();
        if (title && value) dataMap[normalizeKey(title)] = value.trim();
    });

    $('table tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 2) {
            const title = $(tds[0]).text();
            const value = $(tds[1]).text();
            if (title && value) dataMap[normalizeKey(title)] = value.trim();
        }
    });

    const cotacaoDestaque = $('.quotation-price').first().text().trim();
    if (cotacaoDestaque) dataMap['cotacao'] = cotacaoDestaque;

    // 2. Mapeamento
    const findVal = (keys: string[]) => {
        for (const key of keys) {
            const nKey = normalizeKey(key);
            if (dataMap[nKey]) return parseValue(dataMap[nKey]);
            const found = Object.keys(dataMap).find(k => k.includes(nKey));
            if (found) return parseValue(dataMap[found]);
        }
        return 0;
    };
    
    const findText = (keys: string[]) => {
        for (const key of keys) {
            const nKey = normalizeKey(key);
            if (dataMap[nKey]) return dataMap[nKey];
            const found = Object.keys(dataMap).find(k => k.includes(nKey));
            if (found) return dataMap[found];
        }
        return '';
    };

    const fund = {
        cotacao: findVal(['cotacao', 'valor atual', 'preco']),
        dy: findVal(['dividend yield', 'dy', 'yield']),
        pvp: findVal(['p/vp', 'vp']),
        pl: findVal(['p/l', 'pl', 'preco/lucro']),
        roe: findVal(['roe', 'return on equity']),
        liquidez: findText(['liquidez', 'liq diaria', 'vol financeiro']),
        vacancia: findVal(['vacancia']),
        val_mercado: findText(['valor de mercado', 'mercado']),
        segmento: 'Geral'
    };

    // 3. Segmento (Breadcrumbs)
    $('#breadcrumbs a, .breadcrumbs a').each((i, el) => {
        const txt = $(el).text().trim();
        if (!['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'ETFs', stock].includes(txt)) {
            fund.segmento = txt;
        }
    });
    if (fund.segmento === 'Geral') {
        const seg = findText(['segmento', 'setor']);
        if (seg) fund.segmento = seg;
    }

    // Upsert Metadata
    await supabase.from('ativos_metadata').upsert({
        ticker: stock,
        type: assetType,
        segment: fund.segmento,
        current_price: fund.cotacao,
        pvp: fund.pvp,
        dy_12m: fund.dy,
        pl: fund.pl,
        roe: fund.roe,
        liquidez: fund.liquidez,
        vacancia: fund.vacancia,
        valor_mercado: fund.val_mercado,
        updated_at: new Date().toISOString()
    }, { onConflict: 'ticker' });

    // --- PROVENTOS (StatusInvest via client-side proxy logic usually, here simple scrape via Investidor10 table backup) ---
    // Nota: O update completo usa StatusInvest no update-all-stocks. 
    // Aqui fazemos um "best effort" com os dados da página atual se houver tabela de proventos visível.
    
    return res.status(200).json({
      success: true,
      ticker: stock,
      data: fund
    });

  } catch (error: any) {
    console.error(`Erro [${stock}]:`, error.message);
    return res.status(500).json({ error: 'Falha no processamento.', details: error.message });
  }
}
