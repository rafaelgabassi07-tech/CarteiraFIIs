
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://statusinvest.com.br/'
    },
    timeout: 15000
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

async function scrapeAsset(ticker: string) {
    try {
        const t = ticker.toUpperCase();
        let type = 'acao';
        if (t.endsWith('11') || t.endsWith('11B')) type = 'fii'; 

        // Endpoint que retorna lista completa (passado e futuro)
        const url = `https://statusinvest.com.br/${type}/companytickerprovents?ticker=${t}&chartProventsType=2`;

        const { data } = await client.get(url, { 
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        const earnings = data.assetEarningsModels || [];

        const dividendos = earnings.map((d: any) => {
            const parseDateJSON = (dStr: string) => {
                if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                const parts = dStr.split('/');
                if (parts.length !== 3) return null;
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            };

            let labelTipo = 'REND'; 
            if (d.et === 1) labelTipo = 'DIV';
            if (d.et === 2) labelTipo = 'JCP';
            
            if (d.etd) {
                const texto = d.etd.toUpperCase();
                if (texto.includes('JURO')) labelTipo = 'JCP';
                else if (texto.includes('DIVID')) labelTipo = 'DIV';
                else if (texto.includes('REND')) labelTipo = 'REND';
            }

            const dataCom = parseDateJSON(d.ed);
            let paymentDate = parseDateJSON(d.pd);

            // Se pagamento ainda não definido (Provisionado), usa Data Com como referência
            if (!paymentDate && dataCom) {
                paymentDate = dataCom;
            }

            return {
                dataCom: dataCom,
                paymentDate: paymentDate,
                value: d.v,
                type: labelTipo,
                rawType: d.et
            };
        });

        // Filtra inválidos, mas mantém futuros
        return dividendos
            .filter((d: any) => d.dataCom !== null && d.value > 0)
            .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    } catch (error: any) { 
        console.error(`Erro StatusInvest API ${ticker}:`, error.message);
        return []; 
    }
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

    // 1. Scrape Fundamentos
    const response = await axios.get(url, {
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://investidor10.com.br/'
      },
      timeout: 10000
    }).catch(async (err) => {
        if (err.response?.status === 404) {
            url = `https://investidor10.com.br/${assetType === 'FII' ? 'acoes' : 'fiis'}/${stock.toLowerCase()}/`;
            return await axios.get(url, { httpsAgent, timeout: 10000 });
        }
        throw err;
    });

    const $ = cheerio.load(response.data);
    const dataMap: Record<string, any> = {};

    const cotacaoVal = $('._card.cotacao .value').text().trim();
    if (cotacaoVal) dataMap['cotacao'] = cotacaoVal;

    const dyVal = $('._card.dy ._card-body span').first().text().trim();
    if (dyVal) dataMap['dy'] = dyVal;

    const pvpVal = $('._card.vp ._card-body span').text().trim();
    if (pvpVal) dataMap['pvp'] = pvpVal;

    const plVal = $('._card.pl ._card-body span').text().trim();
    if (plVal) dataMap['pl'] = plVal;

    const liqVal = $('._card.val ._card-body span').text().trim();
    if (liqVal) dataMap['liquidez'] = liqVal;

    $('#table-indicators .cell').each((_, el) => {
        const title = $(el).find('.name').text().trim();
        const value = $(el).find('.value span').text().trim();
        if (title && value) {
            dataMap[normalizeKey(title)] = value;
        }
    });

    $('._card').each((_, el) => {
        const title = $(el).find('._card-header').text();
        const value = $(el).find('._card-body').text();
        if (title && value) dataMap[normalizeKey(title)] = value.trim();
    });

    const findVal = (keys: string[]) => {
        for (const key of keys) {
            const nKey = normalizeKey(key);
            if (dataMap[nKey]) return parseValue(dataMap[nKey]);
        }
        return 0;
    };
    
    const findText = (keys: string[]) => {
        for (const key of keys) {
            const nKey = normalizeKey(key);
            if (dataMap[nKey]) return dataMap[nKey];
        }
        return '';
    };

    const fund = {
        cotacao: parseValue(dataMap['cotacao']) || findVal(['cotacao', 'valor atual']),
        dy: parseValue(dataMap['dy']) || findVal(['dividend yield', 'dy']),
        pvp: parseValue(dataMap['pvp']) || findVal(['p/vp', 'pvp']),
        pl: parseValue(dataMap['pl']) || findVal(['p/l', 'pl']),
        roe: findVal(['roe', 'return on equity']),
        liquidez: dataMap['liquidez'] || findText(['liquidez diaria', 'liquidez']),
        vacancia: findVal(['vacancia']),
        val_mercado: findText(['valor patrimonial', 'patrimonio liquido', 'valor de mercado']),
        segmento: findText(['segmento'])
    };

    if (!fund.segmento || fund.segmento === 'Geral') {
        $('#breadcrumbs li a, .breadcrumb-item a').each((_, el) => {
            const txt = $(el).text().trim();
            if (!['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'ETFs', stock].includes(txt)) {
                fund.segmento = txt;
            }
        });
    }

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

    // 2. Scrape Proventos (Inclui futuros e JCP)
    const proventos = await scrapeAsset(stock);
    if (proventos.length > 0) {
        const dbProventos = proventos.map((p: any) => ({
            ticker: stock,
            type: p.type,
            date_com: p.dataCom,
            payment_date: p.paymentDate,
            rate: p.value
        }));
        
        await supabase.from('market_dividends').upsert(dbProventos, {
            onConflict: 'ticker, type, date_com, payment_date, rate',
            ignoreDuplicates: true
        });
    }

    return res.status(200).json({
      success: true,
      ticker: stock,
      data: fund,
      dividends_count: proventos.length
    });

  } catch (error: any) {
    console.error(`Erro [${stock}]:`, error.message);
    return res.status(500).json({ error: 'Falha no processamento.', details: error.message });
  }
}
