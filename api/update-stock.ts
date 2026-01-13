
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
    // 1. Definição da URL correta (FIIs vs Ações)
    // Investidor10 separa em /fiis/ e /acoes/
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    // Lógica simples: Se termina em 11 ou 11B, assume FII (ou Unit/ETF, mas a estrutura de página é similar a FII no site)
    if (stock.endsWith('11') || stock.endsWith('11B')) {
        typePath = 'fiis';
        assetType = 'FII';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;
    
    console.log(`[Scraper] Iniciando busca para ${stock} em: ${targetUrl}`);

    let html;

    // 2. Requisição HTTP (Proxy vs Direta)
    if (process.env.SCRAPER_API_KEY) {
        // Uso da ScraperAPI para evitar bloqueios e renderizar JS se necessário
        console.log(`[Proxy] Via ScraperAPI...`);
        const response = await axios.get('http://api.scraperapi.com', {
            params: {
                api_key: process.env.SCRAPER_API_KEY,
                url: targetUrl,
                render: 'true', // Importante para sites modernos
                country_code: 'br', // Tenta sair por IP brasileiro se possível
                premium: 'true'
            },
            timeout: 35000 
        });
        html = response.data;
    } else {
        // Acesso Direto (Fallback) - User-Agent atualizado para simular Chrome recente
        console.log(`[Direct] Acesso direto...`);
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.google.com.br/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 12000
        });
        html = response.data;
    }

    // 3. Parsing do HTML com Cheerio
    const $ = cheerio.load(html);

    // --- Extração de Fundamentos ---
    // Estrutura típica do Investidor10: div._card -> div._card-header (Label) -> div._card-body (Valor)
    const getFundamentalValue = (labels: string[]) => {
        // Tenta encontrar qualquer um dos labels fornecidos (ex: "P/VP" ou "VPA")
        for (const label of labels) {
            // Procura o span que contém o texto exato ou aproximado
            // .filter garante que pegamos o elemento que contém o texto
            const el = $(`span`).filter((i, el) => $(el).text().trim().toUpperCase() === label.toUpperCase()).first();
            
            if (el.length > 0) {
                // Sobe até o card pai e desce até o valor
                // O seletor ._card-body span.value é padrão no site
                let val = el.closest('div._card').find('div._card-body span.value').text().trim();
                
                if (val) return parseMoney(val);
            }
        }
        return 0;
    };

    // Mapeamento de campos fundamentais
    // Brapi cuida da cotação em tempo real, mas pegamos aqui para registro histórico/fallback
    const cotacao = getFundamentalValue(["Cotação", "Valor Atual", "Preço"]); 
    const pvp = getFundamentalValue(["P/VP", "P/VPA"]);
    const dy = getFundamentalValue(["DY", "Dividend Yield", "DY (12M)"]);
    
    // Segmento: Geralmente fica no topo ou em uma tabela de dados da empresa
    const segment = $('.segment-data .value').first().text().trim() || 
                    $('.sector-data .value').first().text().trim() || 'Geral';

    console.log(`[Dados] ${stock} -> Preço: ${cotacao} | P/VP: ${pvp} | DY: ${dy}`);

    // Salva metadados no Supabase (ativos_metadata)
    try {
        await supabase.from('ativos_metadata').upsert({
            ticker: stock,
            type: assetType,
            segment: segment,
            current_price: cotacao, // Usado apenas como referência/cache
            pvp: pvp,
            dy_12m: dy,
            updated_at: new Date()
        });
    } catch (e) { 
        console.warn("Erro ao salvar metadata (tabela pode não existir):", e); 
    }

    // --- Extração de Proventos (Tabela) ---
    // Seletor: #table-dividends-history
    const dividendsToUpsert: any[] = [];
    
    const tableRows = $('#table-dividends-history tbody tr');
    
    if (tableRows.length > 0) {
        tableRows.each((_, element) => {
            const cols = $(element).find('td');
            
            // Estrutura Padrão Investidor10:
            // Col 0: Tipo (Dividendo, JCP, Rendimento)
            // Col 1: Data Com (Data base)
            // Col 2: Data Pagamento
            // Col 3: Valor
            
            if (cols.length >= 4) {
                const tipoRaw = $(cols[0]).text().trim(); 
                const dataCom = parseDate($(cols[1]).text().trim());
                const dataPagamento = parseDate($(cols[2]).text().trim());
                const valor = parseMoney($(cols[3]).text().trim());

                // Normalização do Tipo
                let tipo = 'DIV';
                const tLower = tipoRaw.toLowerCase();
                if (tLower.includes('juros') || tLower.includes('jcp')) tipo = 'JCP';
                else if (tLower.includes('rendimento')) tipo = 'REND';

                // Validação mínima antes de adicionar
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
    } else {
        console.log(`[Aviso] Nenhuma tabela de proventos encontrada para ${stock}`);
    }

    // Salva proventos no Supabase (market_dividends)
    if (dividendsToUpsert.length > 0) {
        const { error } = await supabase.from('market_dividends').upsert(dividendsToUpsert, { 
            onConflict: 'ticker, type, date_com, payment_date, rate',
            ignoreDuplicates: true 
        });
        
        if (error) {
            console.error("[Supabase Error - Dividends]", error);
        } else {
            console.log(`[Sucesso] ${dividendsToUpsert.length} proventos salvos/atualizados.`);
        }
    }

    return res.status(200).json({ 
        success: true, 
        ticker: stock, 
        fundamentals: { price: cotacao, pvp, dy },
        dividends_found: dividendsToUpsert.length 
    });

  } catch (error: any) {
    console.error(`[Fatal Error] ${stock}:`, error.message);
    return res.status(500).json({ 
        error: 'Falha no scraping', 
        details: error.message, 
        is_proxy_used: !!process.env.SCRAPER_API_KEY 
    });
  }
}

// --- Helpers de Parsing ---

function parseMoney(str: string) {
    if (!str) return 0;
    // Remove R$, espaços e converte vírgula para ponto
    const clean = str.replace('R$', '').replace('%', '').replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
}

function parseDate(str: string) {
    if (!str || str === '-') return null;
    // Espera formato DD/MM/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
    }
    return null;
}
