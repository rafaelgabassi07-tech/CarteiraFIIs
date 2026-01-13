
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
    // 1. Definição da URL
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    // Regra prática para FIIs: Termina em 11/11B e não é unit de banco/energia comum (exceções existem, mas cobre 99%)
    // Para simplificar, assumimos que o usuário sabe o que está buscando, mas o site separa as rotas.
    if (stock.endsWith('11') || stock.endsWith('11B') || stock.endsWith('33') || stock.endsWith('34')) {
        typePath = 'fiis';
        assetType = 'FII';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    console.log(`[Scraper] Iniciando: ${stock} em ${targetUrl}`);

    // 2. Request (Com Headers de Navegador Real)
    let html;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };

    if (process.env.SCRAPER_API_KEY) {
        console.log('[Scraper] Usando Proxy...');
        const response = await axios.get('http://api.scraperapi.com', {
            params: { api_key: process.env.SCRAPER_API_KEY, url: targetUrl, render: 'false', country_code: 'br' },
            timeout: 30000 
        });
        html = response.data;
    } else {
        const response = await axios.get(targetUrl, { headers, timeout: 15000 });
        html = response.data;
    }

    const $ = cheerio.load(html);

    // --- 3. Extração de Fundamentos (Busca por Texto nos Cards) ---
    // O site usa cards com título e valor. Procuramos o elemento que contem o TEXTO do título.
    const getCardValue = (searchTerms: string[]) => {
        let value = 0;
        // Itera sobre todos os spans/divs que podem ser títulos
        $('div._card-header span, div.title span').each((_, el) => {
            const text = $(el).text().trim().toUpperCase();
            if (searchTerms.some(term => text === term.toUpperCase())) {
                // Achou o título, busca o valor no irmão ou filho do card
                const parent = $(el).closest('div._card');
                const valStr = parent.find('div._card-body span.value').text().trim();
                if (valStr) value = parseMoney(valStr);
            }
        });
        return value;
    };

    const cotacao = getCardValue(["Cotação", "Valor Atual", "Preço"]); 
    const pvp = getCardValue(["P/VP", "P/VPA", "VPA"]);
    const dy = getCardValue(["DY", "Dividend Yield", "DY (12M)"]);
    const segment = $('.segment-data .value').first().text().trim() || 'Geral';

    // Salva Metadata
    const { error: metaError } = await supabase.from('ativos_metadata').upsert({
        ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
    }, { onConflict: 'ticker' });

    if (metaError && metaError.code !== 'PGRST205') console.error('[Supabase Meta Error]', metaError);

    // --- 4. Extração de Proventos (Busca Semântica de Tabela) ---
    const dividendsToUpsert: any[] = [];
    
    // Em vez de buscar por ID, buscamos TODAS as tabelas e verificamos se o cabeçalho tem "Com" e "Pagamento"
    $('table').each((_, table) => {
        const headersText = $(table).find('thead').text().toLowerCase();
        if (headersText.includes('com') && headersText.includes('pagamento')) {
            // É a tabela certa!
            // Mapeia índices
            const headerMap: any = { tipo: -1, dataCom: -1, dataPag: -1, valor: -1 };
            
            $(table).find('thead th').each((idx, th) => {
                const h = $(th).text().trim().toLowerCase();
                if (h.includes('tipo')) headerMap.tipo = idx;
                if (h.includes('com') || h.includes('base')) headerMap.dataCom = idx;
                if (h.includes('pagamento')) headerMap.dataPag = idx;
                if (h.includes('valor')) headerMap.valor = idx;
            });

            // Se não achou headers exatos, usa fallback (0, 1, 2, 3)
            if (headerMap.dataCom === -1) { headerMap.tipo=0; headerMap.dataCom=1; headerMap.dataPag=2; headerMap.valor=3; }

            $(table).find('tbody tr').each((_, tr) => {
                const cols = $(tr).find('td');
                if (cols.length >= 4) {
                    const tipoRaw = $(cols[headerMap.tipo]).text().trim();
                    const dataComRaw = $(cols[headerMap.dataCom]).text().trim();
                    const dataPagRaw = $(cols[headerMap.dataPag]).text().trim();
                    const valorRaw = $(cols[headerMap.valor]).text().trim();

                    const dataCom = parseDate(dataComRaw); // YYYY-MM-DD
                    const dataPagamento = parseDate(dataPagRaw); // YYYY-MM-DD
                    const valor = parseMoney(valorRaw);

                    let tipo = 'DIV';
                    const tLower = tipoRaw.toLowerCase();
                    if (tLower.includes('jcp') || tLower.includes('juros')) tipo = 'JCP';
                    else if (tLower.includes('rendimento')) tipo = 'REND';

                    if (valor > 0 && dataCom && dataPagamento) {
                        dividendsToUpsert.push({
                            ticker: stock,
                            type: tipo,
                            date_com: dataCom,
                            payment_date: dataPagamento,
                            rate: valor
                        });
                    }
                }
            });
        }
    });

    if (dividendsToUpsert.length > 0) {
        const { error: divError } = await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate',
            ignoreDuplicates: true
        });
        if (divError && divError.code !== 'PGRST205') console.error('[Supabase Div Error]', divError);
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        found_dividends: dividendsToUpsert.length,
        price: cotacao,
        scraped_from: targetUrl
    });

  } catch (error: any) {
    console.error(`[Scraper Fatal] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}

function parseMoney(str: string) {
    if (!str) return 0;
    // Remove tudo que não é número ou vírgula/ponto
    const clean = str.replace(/[^\d.,]/g, '').replace(',', '.');
    // Se tiver mais de um ponto (milhar), mantem só o último
    // Simplificado: Assumimos formato PT-BR padrão 1.000,00 ou 1000,00
    // O Investidor10 usa vírgula para decimal.
    const brFormat = str.replace('R$', '').replace('%', '').trim();
    // Remove pontos de milhar e troca virgula por ponto
    const normalized = brFormat.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
}

function parseDate(str: string) {
    if (!str || str.includes('-')) return null;
    const parts = str.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
    return null;
}
