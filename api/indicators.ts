
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

const MODERN_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. API Banco Central (Série 13522 - IPCA 12m)
  try {
      const bcbUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';
      const { data } = await axios.get(bcbUrl, { 
          timeout: 5000,
          httpsAgent,
          headers: { 'Accept': 'application/json' }
      });
      
      if (Array.isArray(data) && data.length > 0 && data[0].valor) {
          const val = parseFloat(data[0].valor);
          if (!isNaN(val)) {
              return res.status(200).json({
                  value: val,
                  date: new Date().toISOString(),
                  source: 'Banco Central do Brasil (SGS)',
                  refDate: data[0].data
              });
          }
      }
  } catch (e: any) {
      console.warn('[Indicators] BCB API falhou, tentando scraper:', e.message);
  }

  // 2. FALLBACK: Scraper Investidor10
  try {
    const targetUrl = 'https://investidor10.com.br/indices/ipca/';
    
    const response = await axios.get(targetUrl, { 
        timeout: 10000,
        httpsAgent,
        headers: MODERN_HEADERS
    });

    const $ = cheerio.load(response.data);
    let acumulado12m = 0;
    let found = false;

    $('table').each((_, table) => {
        let idx12m = -1;
        $(table).find('thead th, tr:first-child td').each((idx, col) => {
            const txt = $(col).text().toLowerCase();
            if (txt.includes('12 meses') || txt.includes('acumulado')) idx12m = idx;
        });

        if (idx12m !== -1) {
            $(table).find('tbody tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length > idx12m) {
                    const valStr = $(tds[idx12m]).text().trim();
                    if (valStr && valStr !== '-') {
                         const val = parseFloat(valStr.replace('.', '').replace(',', '.').replace('%', ''));
                         if (!isNaN(val)) {
                             acumulado12m = val;
                             found = true;
                             return false; 
                         }
                    }
                }
            });
        }
        if (found) return false;
    });

    // Fallback Widgets
    if (!found) {
        $('.value').each((_, el) => {
            const parentText = $(el).parent().text().toLowerCase();
            if (parentText.includes('ipca') && (parentText.includes('12 meses') || parentText.includes('acumulado'))) {
                const val = parseFloat($(el).text().trim().replace('.', '').replace(',', '.').replace('%', ''));
                if (!isNaN(val)) {
                    acumulado12m = val;
                    return false;
                }
            }
        });
    }

    if (acumulado12m > 0) {
        return res.status(200).json({
            value: acumulado12m,
            date: new Date().toISOString(),
            source: 'Investidor10 (Scraper)'
        });
    }

    throw new Error("Nenhum dado encontrado nas fontes.");

  } catch (error: any) {
    console.error('[Indicators] Erro Fatal:', error.message);
    return res.status(503).json({
        error: "Unable to fetch real inflation data",
        isError: true
    });
  }
}
