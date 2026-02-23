import { Request, Response } from 'express';
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

export async function getIndicators(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const results: any = {
      ipca: 4.50,
      cdi: 11.25,
      date: new Date().toISOString(),
      sources: []
  };

  // 1. IPCA (Série 13522 - IPCA 12m)
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
              results.ipca = val;
              results.sources.push('BCB (IPCA 12m)');
          }
      }
  } catch (e: any) {
      console.warn('[Indicators] IPCA BCB falhou:', e.message);
  }

  // 2. CDI (Série 4391 - CDI acumulado nos últimos 12 meses)
  try {
      const cdiUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/1?formato=json';
      const { data } = await axios.get(cdiUrl, { 
          timeout: 5000,
          httpsAgent,
          headers: { 'Accept': 'application/json' }
      });
      
      if (Array.isArray(data) && data.length > 0 && data[0].valor) {
          const val = parseFloat(data[0].valor);
          if (!isNaN(val)) {
              results.cdi = val;
              results.sources.push('BCB (CDI 12m)');
          }
      }
  } catch (e: any) {
      console.warn('[Indicators] CDI BCB falhou:', e.message);
  }

  // 3. FALLBACK IPCA Scraper if BCB failed for IPCA
  if (!results.sources.includes('BCB (IPCA 12m)')) {
      try {
        const targetUrl = 'https://investidor10.com.br/indices/ipca/';
        const response = await axios.get(targetUrl, { 
            timeout: 10000,
            httpsAgent,
            headers: MODERN_HEADERS
        });

        const $ = cheerio.load(response.data);
        let acumulado12m = 0;
        
        $('table').each((_, table) => {
            const headerText = $(table).text().toLowerCase();
            if (headerText.includes('acumulado 12 meses') || headerText.includes('variação em %')) {
                const firstRow = $(table).find('tbody tr').first();
                const cols = firstRow.find('td');
                if (cols.length >= 2) {
                    const valStr = $(cols[3]).text().trim() || $(cols[1]).text().trim();
                    const val = parseFloat(valStr.replace('.', '').replace(',', '.').replace('%', ''));
                    if (!isNaN(val)) {
                        acumulado12m = val;
                        return false; 
                    }
                }
            }
        });

        if (acumulado12m > 0) {
            results.ipca = acumulado12m;
            results.sources.push('Investidor10 (IPCA Scraper)');
        }
      } catch (e) {}
  }

  return res.status(200).json({
      value: results.ipca, // Mantém compatibilidade com quem espera apenas o valor do IPCA
      ipca: results.ipca,
      cdi: results.cdi,
      date: results.date,
      sources: results.sources,
      isError: results.sources.length === 0
  });
}
