
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

  const { ticker, force } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') {
    return res.status(400).json({ error: 'Ticker obrigatório' });
  }

  try {
    // --- 0. Verificação de Cache ---
    if (force !== 'true') {
        const { data: cached } = await supabase
            .from('ativos_metadata')
            .select('updated_at')
            .eq('ticker', stock)
            .single();

        if (cached && cached.updated_at) {
            const lastUpdate = new Date(cached.updated_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);

            if (hoursDiff < 12) {
                console.log(`[Cache Hit] ${stock} atualizado há ${hoursDiff.toFixed(1)}h.`);
                return res.status(200).json({ success: true, cached: true });
            }
        }
    }

    // --- Início do Scraping ---
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    // Detecção básica de tipo pela URL
    if (stock.endsWith('11') || stock.endsWith('11B') || stock.endsWith('33') || stock.endsWith('34')) {
        typePath = 'fiis';
        assetType = 'FII';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    console.log(`[Scraper] Buscando dados para: ${stock}`);

    let html;
    
    // Headers para evitar bloqueio 403 (WAF bypass)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache'
    };

    if (process.env.SCRAPER_API_KEY) {
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

    // --- 1. Extração de Fundamentos (P/VP, DY, Cotação) ---
    const getCardValue = (searchTerms: string[]) => {
        let foundValue = 0;
        $('span, div, p').each((_, el) => {
            const text = $(el).text().trim().toUpperCase();
            if (searchTerms.some(term => text === term.toUpperCase())) {
                const card = $(el).closest('div[class*="card"]'); 
                if (card.length) {
                    let valStr = card.find('[class*="value"]').first().text().trim();
                    if (!valStr) {
                         card.find('span').each((_, span) => {
                             const t = $(span).text().trim();
                             if (/^\d+[.,]\d+/.test(t) || t.includes('R$') || t.includes('%')) valStr = t;
                         });
                    }
                    if (valStr) {
                        foundValue = parseMoney(valStr);
                        return false; 
                    }
                }
            }
        });
        return foundValue;
    };

    const cotacao = getCardValue(["Cotação", "Valor Atual", "Preço"]); 
    const pvp = getCardValue(["P/VP", "P/VPA", "VPA"]);
    const dy = getCardValue(["DY", "Dividend Yield", "DY (12M)"]);
    
    // --- 2. Extração de Segmento (Lógica Aprimorada) ---
    let segment = 'Geral';
    
    // Tentativa 1: Estrutura comum de Ações (.sector-data ou .segment-data)
    const segmentEl = $('.segment-data .value, .sector-data .value').first();
    if (segmentEl.length) {
        segment = segmentEl.text().trim();
    } else {
        // Tentativa 2: Busca por Label "Segmento" em tabelas de FIIs
        $('div.cell').each((_, el) => {
            const label = $(el).find('.name').text().trim().toLowerCase();
            if (label === 'segmento') {
                const val = $(el).find('.value').text().trim();
                if (val) segment = val;
            }
        });

        // Tentativa 3: Busca genérica em spans próximos
        if (segment === 'Geral') {
             const labelSpan = $('span:contains("Segmento"), span:contains("Setor")').first();
             if (labelSpan.length) {
                 const nextText = labelSpan.next().text().trim();
                 if (nextText && nextText.length > 2) segment = nextText;
             }
        }
    }

    console.log(`[Fundamentos] ${stock} -> P/VP: ${pvp}, DY: ${dy}, Seg: ${segment}`);

    // Salva Metadata
    const { error: metaError } = await supabase.from('ativos_metadata').upsert({
        ticker: stock, type: assetType, segment, current_price: cotacao, pvp, dy_12m: dy, updated_at: new Date()
    }, { onConflict: 'ticker' });

    if (metaError) console.error("Erro salvando metadata:", metaError);

    // --- 3. Extração de Proventos (Lógica Inteligente via Regex) ---
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set(); // Evita duplicatas na mesma execução

    $('table tr').each((_, tr) => {
        const rowText = $(tr).text().trim();
        const cols = $(tr).find('td');
        
        // Verifica se a linha tem colunas suficientes
        if (cols.length >= 3) {
            let tipo = '';
            let dataCom = null;
            let dataPag = null;
            let valor = 0;

            // Análise Célula a Célula (Independente da ordem das colunas)
            cols.each((idx, td) => {
                const text = $(td).text().trim();
                
                // 1. Detecta Tipo (JCP, Dividendo, Rendimento)
                const textLower = text.toLowerCase();
                if (textLower.includes('jcp') || textLower.includes('juros')) tipo = 'JCP';
                else if (textLower.includes('dividendo')) tipo = 'DIV';
                else if (textLower.includes('rendimento')) tipo = 'REND';

                // 2. Detecta Data (Formato DD/MM/AAAA)
                if (/\d{2}\/\d{2}\/\d{4}/.test(text)) {
                    const parsedDate = parseDate(text);
                    if (parsedDate) {
                        // A primeira data encontrada geralmente é Data Com, a segunda Pagamento.
                        // Mas em alguns layouts, a data de pagamento vem vazia (-).
                        if (!dataCom) dataCom = parsedDate;
                        else if (!dataPag) dataPag = parsedDate;
                    }
                }

                // 3. Detecta Valor Monetário (R$ 0,00 ou 0,00)
                // Evita pegar percentuais (%)
                if ((text.includes(',') || text.includes('.')) && !text.includes('%') && /\d/.test(text)) {
                    // Tenta parsear. Se for um número válido > 0 e parece dinheiro
                    const v = parseMoney(text);
                    if (v > 0 && v < 1000) { // Filtro de sanidade: provento unitário raramente passa de 1000
                        valor = v; 
                    }
                }
            });

            // Fallbacks e Validações Finais da Linha
            if (!dataPag && dataCom) dataPag = dataCom; // Se não tem data de pagamento, assume data com
            if (!tipo) tipo = assetType === 'FII' ? 'REND' : 'DIV'; // Tipo padrão

            if (valor > 0 && dataCom && dataPag) {
                const uniqueKey = `${stock}-${tipo}-${dataCom}-${dataPag}-${valor}`;
                if (!processedKeys.has(uniqueKey)) {
                    dividendsToUpsert.push({
                        ticker: stock, type: tipo, date_com: dataCom, payment_date: dataPag, rate: valor
                    });
                    processedKeys.add(uniqueKey);
                }
            }
        }
    });

    if (dividendsToUpsert.length > 0) {
        // Upsert ignorando duplicatas de chave primária
        await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true
        });
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        cached: false,
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length
    });

  } catch (error: any) {
    console.error(`[Scraper Fatal] ${stock}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}

function parseMoney(str: string) {
    if (!str) return 0;
    // Remove R$, %, espaços e caracteres invisíveis
    let clean = str.replace(/[R$\%\s]/g, '').trim();
    // Padrão brasileiro: 1.200,50 -> remove ponto, troca virgula por ponto
    clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

function parseDate(str: string) {
    if (!str || str.length < 8) return null; 
    // Tenta extrair DD/MM/YYYY mesmo se tiver texto ao redor
    const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return null;
}
