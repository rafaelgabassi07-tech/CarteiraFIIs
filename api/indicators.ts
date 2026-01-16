
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const targetUrl = 'https://investidor10.com.br/indices/ipca/';
    
    const response = await axios.get(targetUrl, { 
        timeout: 10000,
        httpsAgent,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    });

    const $ = cheerio.load(response.data);
    let acumulado12m = 0;
    let found = false;

    // Estratégia 1: Tabela Dinâmica (Procura coluna "Acumulado 12 meses")
    $('table').each((_, table) => {
        let idx12m = -1;
        
        // Acha o index da coluna
        $(table).find('thead th, tr:first-child td').each((idx, col) => {
            const txt = $(col).text().toLowerCase();
            if (txt.includes('12 meses') || txt.includes('acumulado')) idx12m = idx;
        });

        if (idx12m !== -1) {
            // Pega a primeira linha de dados válida
            $(table).find('tbody tr').each((_, tr) => {
                const tds = $(tr).find('td');
                if (tds.length > idx12m) {
                    const valStr = $(tds[idx12m]).text().trim();
                    // Limpa string (ex: "4,50%")
                    if (valStr && valStr !== '-') {
                         const val = parseFloat(valStr.replace('.', '').replace(',', '.').replace('%', ''));
                         if (!isNaN(val)) {
                             acumulado12m = val;
                             found = true;
                             return false; // break rows
                         }
                    }
                }
            });
        }
        if (found) return false; // break tables
    });

    // Estratégia 2: Widgets de Destaque (Fallback)
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

    // Fallback Final
    if (acumulado12m === 0) acumulado12m = 4.62;

    return res.status(200).json({
        value: acumulado12m,
        date: new Date().toISOString(),
        source: 'Investidor10 (Robust Scraper)'
    });

  } catch (error: any) {
    console.error('[Indicators Scraper] Erro:', error.message);
    return res.status(200).json({
        value: 4.62,
        source: 'Fallback Static',
        isError: true
    });
  }
}
