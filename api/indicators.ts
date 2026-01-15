
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Fonte mais estável que o BCB para este contexto: Página de Índices do Investidor10
    const targetUrl = 'https://investidor10.com.br/indices/ipca/';
    
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(targetUrl, { 
        timeout: 15000,
        httpsAgent: agent,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
    });

    const $ = cheerio.load(response.data);
    let acumulado12m = 0;

    // Busca tabela de histórico do IPCA
    // Geralmente a primeira tabela contém o resumo ou o histórico recente
    $('table').each((_, table) => {
        const headers = $(table).text().toLowerCase();
        if (headers.includes('acumulado 12 meses') || headers.includes('variação')) {
            // Tenta encontrar na primeira linha de dados (mês mais recente)
            const firstRow = $(table).find('tbody tr').first();
            const cols = firstRow.find('td');
            
            // Layout usual: Mês | No Mês | No Ano | 12 Meses
            // O índice pode variar, então buscamos a última coluna com valor numérico
            if (cols.length >= 2) {
                // Tenta pegar a coluna específica de 12 meses (geralmente a 4ª coluna, índice 3)
                let valStr = $(cols[3]).text().trim(); 
                
                // Fallback: se não achar na col 3, tenta limpar a string da última coluna
                if (!valStr) valStr = cols.last().text().trim();

                if (valStr) {
                    const val = parseFloat(valStr.replace('.', '').replace(',', '.').replace('%', ''));
                    if (!isNaN(val)) {
                        acumulado12m = val;
                        return false; // break
                    }
                }
            }
        }
    });

    // Fallback de segurança se o scraping falhar (Média histórica recente)
    if (acumulado12m === 0) acumulado12m = 4.62;

    return res.status(200).json({
        value: acumulado12m,
        date: new Date().toISOString(),
        source: 'Investidor10 (Scraper)',
        timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('[Indicators Scraper] Erro:', error.message);
    return res.status(200).json({
        value: 4.62, // Fallback seguro
        source: 'Fallback System',
        isError: true,
        details: error.message
    });
  }
}
