import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Handling
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { ticker } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') {
    return res.status(400).json({ error: 'Ticker obrigatório' });
  }

  try {
    // Detecção inteligente de tipo de ativo para URL correta
    // FIIs geralmente terminam em 11 ou 11B, Ações em 3, 4, 5, 6
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    if (stock.endsWith('11') || stock.endsWith('11B')) {
        typePath = 'fiis';
        assetType = 'FII';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    
    console.log(`[Scraper] Buscando ${stock} em ${targetUrl}`);

    let html;

    // LÓGICA ANTI-BLOQUEIO (Proxy vs Direto)
    if (process.env.SCRAPER_API_KEY) {
        // Modo Robusto: Usa ScraperAPI para rotacionar IP e evitar Cloudflare
        // render=true força o ScraperAPI a usar um browser headless, passando por desafios JS do Cloudflare
        console.log(`[Proxy] Usando ScraperAPI (render=true) para evitar bloqueio...`);
        const response = await axios.get('http://api.scraperapi.com', {
            params: {
                api_key: process.env.SCRAPER_API_KEY,
                url: targetUrl,
                render: 'true' 
            }
        });
        html = response.data;
    } else {
        // Modo Fallback: Tenta acesso direto fingindo ser um browser
        console.log(`[Direct] Tentando acesso direto com Headers aprimorados...`);
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.google.com.br/', // O "Pulo do Gato": finge vir do Google
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 10000 // Aumentado levemente para dar chance ao handshake
        });
        html = response.data;
    }

    const $ = cheerio.load(html);

    // 1. Dados Fundamentais (Cards)
    const cotacao = parseMoney($('div._card-body span:contains("Cotação")').parent().find('div._card-body span.value').text());
    const pvp = parseMoney($('div._card-body span:contains("P/VP")').parent().find('div._card-body span.value').text());
    const dy = parseMoney($('div._card-body span:contains("DY")').parent().find('div._card-body span.value').text());
    
    // Tenta pegar segmento se disponível
    const segment = $('.segment-data .value').first().text().trim() || 'Geral';

    // Salva metadados se a tabela 'ativos_metadata' existir (Opcional, mas útil)
    try {
        await supabase.from('ativos_metadata').upsert({
            ticker: stock,
            type: assetType,
            segment: segment,
            current_price: cotacao,
            pvp: pvp,
            dy_12m: dy,
            updated_at: new Date()
        });
    } catch (e) { /* Tabela pode não existir */ }

    // 2. Extração de Proventos (Tabela)
    // Mapeamos para o formato da tabela 'market_dividends' usada pelo app
    const dividendsToUpsert: any[] = [];
    
    $('#table-dividends-history tbody tr').each((_, element) => {
      const cols = $(element).find('td');
      const tipoRaw = $(cols[0]).text().trim(); 
      const dataCom = parseDate($(cols[1]).text().trim());
      const dataPagamento = parseDate($(cols[2]).text().trim());
      const valor = parseMoney($(cols[3]).text().trim());

      let tipo = 'DIV';
      if (tipoRaw.toLowerCase().includes('juros') || tipoRaw.toLowerCase().includes('jcp')) tipo = 'JCP';
      else if (tipoRaw.toLowerCase().includes('rendimento')) tipo = 'REND';

      if (valor > 0 && dataCom && dataPagamento) {
        dividendsToUpsert.push({
            ticker: stock,
            type: tipo,
            date_com: dataCom,
            payment_date: dataPagamento,
            rate: valor
        });
      }
    });

    // Salva na tabela principal do App: market_dividends
    if (dividendsToUpsert.length > 0) {
        const { error } = await supabase.from('market_dividends').upsert(dividendsToUpsert, { 
            onConflict: 'ticker, type, date_com, payment_date, rate',
            ignoreDuplicates: true 
        });
        
        if (error) {
            console.error("[Supabase Error]", error);
        }
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length 
    });

  } catch (error: any) {
    console.error(error);
    // Retorna erro detalhado para debug, mas em prod idealmente seria genérico
    return res.status(500).json({ error: 'Falha no scraping', details: error.message, is_proxy_used: !!process.env.SCRAPER_API_KEY });
  }
}

// Helpers
function parseMoney(str: string) {
    if (!str) return 0;
    const clean = str.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function parseDate(str: string) {
    if (!str || str === '-') return null;
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return null;
}
