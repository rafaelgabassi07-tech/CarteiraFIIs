
/**
 * SCRIPT DE SCRAPING DE ATIVOS (AÇÕES/FIIs)
 * 
 * Objetivo: Obter fundamentos (P/L, PVP, DY) e histórico de proventos do site Investidor10.
 * Tecnologias: Axios (HTTP) + Cheerio (HTML Parser)
 * Integração: Supabase (Banco de Dados)
 * 
 * Variáveis de Ambiente Necessárias:
 * - VITE_SUPABASE_URL (ou SUPABASE_URL)
 * - VITE_SUPABASE_KEY (ou SUPABASE_KEY)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Inicialização do Cliente Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de Cabeçalhos CORS (Permite acesso do frontend)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Validação e Normalização do Ticker
  const { ticker } = req.query;
  const stock = String(ticker).trim().toUpperCase();

  if (!stock || stock === 'UNDEFINED') {
    return res.status(400).json({ error: 'Ticker é obrigatório.' });
  }

  try {
    // 3. Determinação da URL Base (FIIs vs Ações vs ETFs)
    // Heurística: Final 11 geralmente é FII, exceto casos conhecidos (Unit/ETF).
    let typePath = 'acoes';
    let assetType = 'ACAO';
    
    // Exceções conhecidas para roteamento correto
    const KNOWN_STOCKS_11 = ['TAEE11', 'KLBN11', 'ALUP11', 'SAPR11', 'SANB11', 'BPAC11', 'TIET11', 'BBSE11', 'ENGI11', 'CPFE11'];
    const KNOWN_ETFS = ['BOVA11', 'SMAL11', 'IVVB11', 'HASH11', 'XINA11', 'GOLD11', 'NASD11'];

    if (KNOWN_ETFS.includes(stock)) {
        typePath = 'etfs';
        assetType = 'ETF';
    } else if (stock.endsWith('11') || stock.endsWith('11B')) {
        if (!KNOWN_STOCKS_11.includes(stock)) {
            typePath = 'fiis';
            assetType = 'FII';
        }
    } else if (stock.endsWith('34') || stock.endsWith('33')) {
        typePath = 'bdrs';
        assetType = 'ACAO';
    }

    const targetUrl = `https://investidor10.com.br/${typePath}/${stock.toLowerCase()}/`;

    // 4. Requisição HTTP (Disfarce de Navegador)
    // Headers essenciais para evitar bloqueio 403 (WAF/Cloudflare)
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Referer': 'https://investidor10.com.br/',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000 // Timeout de 15 segundos
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 5. Helpers de Parsing (Limpeza de dados)
    const parseMoney = (text: string) => {
      if (!text) return 0;
      // Remove tudo que não for dígito, vírgula, ponto ou traço
      const clean = text.replace(/[^\d.,-]/g, '').trim();
      if (!clean) return 0;
      // Converte formato BR (1.000,00) para JS (1000.00)
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    };

    const parseDate = (text: string): string | null => {
        const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
    };

    // 6. Extração de Dados Resiliente
    // Busca valores baseando-se em rótulos visuais (ex: "P/VP") em vez de depender apenas de classes CSS instáveis.
    const getCardValue = (labels: string[]) => {
       let value = '';
       
       // Estratégia A: Busca por atributo 'title' (Comum no Desktop)
       labels.forEach(label => {
           if (!value) {
               value = $(`div[title="${label}"] .value`).text().trim();
           }
       });
       
       // Estratégia B: Busca por texto dentro de spans/divs (Mobile/Cards Genéricos)
       if (!value) {
           $('span, div.name, p, strong').each((_, el) => {
               const txt = $(el).text().trim().toUpperCase();
               if (labels.some(l => txt === l.toUpperCase())) {
                   // Tenta encontrar o valor no próximo elemento ou no pai
                   const next = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
                   if (next && /\d/.test(next)) {
                       value = next;
                       return false; // Break loop
                   }
               }
           });
       }
       return parseMoney(value);
    };

    // Extração dos Fundamentos Chave
    const cotacao = getCardValue(['Cotação', 'Valor Atual', 'Preço']) || parseMoney($('.quotation-price').first().text());
    const dy = getCardValue(['Dividend Yield', 'DY', 'Yield']);
    const pvp = getCardValue(['P/VP', 'VPA', 'VP']);
    const pl = getCardValue(['P/L', 'PL', 'Preço/Lucro']);
    const vacancia = getCardValue(['Vacância Física', 'Vacância']);
    
    // Tratamento especial para Valor de Mercado (pode vir como texto ex: "2.5 B")
    let valMercadoStr = '';
    $('div, span').each((_, el) => {
        if ($(el).text().trim() === 'Valor de Mercado') {
             valMercadoStr = $(el).next().text().trim() || $(el).parent().find('.value').text().trim();
        }
    });

    // Segmento de Atuação
    let segment = 'Geral';
    const segmentEl = $('.segment-data .value, .sector-data .value').first();
    if (segmentEl.length) segment = segmentEl.text().trim();

    // 7. Persistência: Dados Fundamentais (Tabela 'ativos_metadata')
    const metadataPayload = {
        ticker: stock,
        type: assetType,
        segment: segment,
        current_price: cotacao,
        pvp: pvp,
        dy_12m: dy,
        pl: pl,
        vacancia: vacancia,
        valor_mercado: valMercadoStr,
        updated_at: new Date().toISOString()
    };

    const { error: metaError } = await supabase.from('ativos_metadata').upsert(metadataPayload, { onConflict: 'ticker' });
    if (metaError) console.error('Supabase Error (Metadata):', metaError);

    // 8. Extração e Persistência: Histórico de Proventos
    const dividendsToUpsert: any[] = [];
    const processedKeys = new Set();
    
    // Varre todas as tabelas buscando padrões de dividendos (Data Com / Pagamento / Valor)
    const tables = $('table');
    tables.each((_, table) => {
        const headerText = $(table).text().toLowerCase();
        if (headerText.includes('com') && headerText.includes('pagamento')) {
             $(table).find('tbody tr').each((__, tr) => {
                const tds = $(tr).find('td');
                if (tds.length >= 3) {
                    // Detecção dinâmica de colunas (fallback para padrão comum)
                    let tipoIdx = 0, comIdx = 1, pagIdx = 2, valIdx = 3;
                    if (tds.length === 3) { comIdx = 0; pagIdx = 1; valIdx = 2; tipoIdx = -1; }

                    const tipoRaw = tipoIdx >= 0 ? $(tds[tipoIdx]).text().toUpperCase() : 'DIV';
                    const tipo = tipoRaw.includes('JCP') ? 'JCP' : 'DIV';
                    const dataCom = parseDate($(tds[comIdx]).text());
                    const dataPag = parseDate($(tds[pagIdx]).text()) || dataCom;
                    const valor = parseMoney($(tds[valIdx]).text());

                    if (dataCom && valor > 0) {
                        const key = `${stock}-${dataCom}-${valor}`;
                        if (!processedKeys.has(key)) {
                            dividendsToUpsert.push({
                                ticker: stock,
                                type: tipo,
                                date_com: dataCom,
                                payment_date: dataPag,
                                rate: valor
                            });
                            processedKeys.add(key);
                        }
                    }
                }
             });
        }
    });

    if (dividendsToUpsert.length > 0) {
        await supabase.from('market_dividends').upsert(dividendsToUpsert, {
            onConflict: 'ticker, type, date_com, payment_date, rate', 
            ignoreDuplicates: true
        });
    }

    // 9. Retorno da API
    return res.status(200).json({
      success: true,
      ticker: stock,
      data: {
        price: cotacao,
        dy,
        pvp,
        pl,
        segment
      },
      dividends_found: dividendsToUpsert.length
    });

  } catch (error: any) {
    console.error(`Scraper Error [${stock}]:`, error.message);
    return res.status(500).json({ 
        error: 'Falha ao processar dados do ativo.', 
        details: error.message 
    });
  }
}
