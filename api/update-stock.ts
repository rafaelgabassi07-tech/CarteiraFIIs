
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- CONFIGURAÇÃO AXIOS ---
// Agente simplificado para evitar timeouts em Serverless
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false
});

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// Função de Fetch com Retry e Rotação de UA
async function fetchHTML(url: string, referer: string) {
    for (let i = 0; i < 2; i++) { // 2 tentativas
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: {
                    'User-Agent': getRandomAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': referer,
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Cache-Control': 'no-cache'
                },
                timeout: 8000 // Timeout mais curto para falhar rápido e tentar prox
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; // 404 é definitivo
            if (i === 1) throw e; // Se falhar na última, lança erro
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

// --- HELPERS DE PARSING ---
const REGEX_CLEAN_NUMBER = /[^0-9,-]+/g;
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    try {
        let clean = String(valueStr).replace(REGEX_CLEAN_NUMBER, "").trim();
        if (!clean || clean === '-') return 0;
        return parseFloat(clean.replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function normalize(str: any) {
    if (!str) return '';
    return String(str).normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function cleanDoubledString(str: string) {
    if (!str) return "";
    const parts = str.split('R$');
    if (parts.length > 2) return 'R$' + parts[1].trim(); 
    return str;
}

function parseExtendedValue(str: string) {
    if (!str) return 0;
    const val = parseValue(str);
    const lower = str.toLowerCase();
    if (lower.includes('bilh')) return val * 1000000000;
    if (lower.includes('milh')) return val * 1000000;
    if (lower.includes('mil')) return val * 1000;
    return val;
}

function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------------------------------------------------------
// SCRAPER DE FUNDAMENTOS (INVESTIDOR10)
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        let html;
        let finalType = 'ACAO';
        const baseUrl = 'https://investidor10.com.br';
        
        // Estratégia de URL:
        // 1. Tenta /fiis/ se terminar com 11/11B
        // 2. Se falhar ou não for, tenta /acoes/
        // 3. Se falhar, tenta /bdrs/
        
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        let strategies = isFII 
            ? [`/fiis/${ticker.toLowerCase()}/`, `/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`]
            : [`/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`, `/fiis/${ticker.toLowerCase()}/`];

        for (const path of strategies) {
            try {
                html = await fetchHTML(`${baseUrl}${path}`, baseUrl);
                if (path.includes('fiis')) finalType = 'FII';
                else if (path.includes('bdrs')) finalType = 'BDR';
                else finalType = 'ACAO';
                break; // Sucesso
            } catch (e: any) {
                if (e.response?.status !== 404) console.warn(`Erro scraping ${path}: ${e.message}`);
                // Se for 404, continua para próxima estratégia
            }
        }

        if (!html) return null;

        const $ = cheerio.load(html);

        let dados: any = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            
            // Campos Comuns
            dy: 'N/A', pvp: 'N/A', pl: 'N/A', roe: 'N/A', lpa: 'N/A', vp_cota: 'N/A',
            val_mercado: 'N/A', liquidez: 'N/A', variacao_12m: 'N/A',

            // FIIs
            segmento: 'N/A', tipo_fundo: 'N/A', mandato: 'N/A', vacancia: 'N/A',
            patrimonio_liquido: 'N/A', ultimo_rendimento: 'N/A', cnpj: 'N/A',
            num_cotistas: 'N/A', tipo_gestao: 'N/A', prazo_duracao: 'N/A',
            taxa_adm: 'N/A', cotas_emitidas: 'N/A', publico_alvo: 'N/A',

            // Ações
            margem_liquida: 'N/A', margem_bruta: 'N/A', margem_ebit: 'N/A',
            divida_liquida_ebitda: 'N/A', divida_liquida_pl: 'N/A', ev_ebitda: 'N/A',
            payout: 'N/A', cagr_receita_5a: 'N/A', cagr_lucros_5a: 'N/A',

            updated_at: new Date().toISOString()
        };

        let cotacao_atual = 0;
        let num_cotas = 0;

        const processPair = (tituloRaw: string, valorRaw: string, origem = 'table', indicatorAttr: string | null = null) => {
            const titulo = normalize(tituloRaw); 
            let valor = String(valorRaw).trim();

            if (titulo.includes('mercado')) {
                valor = cleanDoubledString(valor);
                // Evita sobrescrever valor de mercado da tabela se já pegamos do card (geralmente card é mais limpo)
                if (dados.val_mercado !== 'N/A' && origem === 'table' && dados.val_mercado.includes('R$')) return;
            }

            if (!valor) return;

            // 1. Prioridade: Atributo data-indicator
            if (indicatorAttr) {
                const ind = indicatorAttr.toUpperCase();
                if (ind === 'DIVIDA_LIQUIDA_EBITDA') { dados.divida_liquida_ebitda = valor; return; }
                if (ind === 'DY') { dados.dy = valor; return; }
                if (ind === 'P_L') { dados.pl = valor; return; }
                if (ind === 'P_VP') { dados.pvp = valor; return; }
                if (ind === 'ROE') { dados.roe = valor; return; }
                if (ind === 'MARGEM_LIQUIDA') { dados.margem_liquida = valor; return; }
            }

            // 2. Fallback: Matching por Texto
            if (dados.dy === 'N/A' && (titulo === 'dy' || titulo.includes('dividend yield'))) dados.dy = valor;
            if (dados.pvp === 'N/A' && (titulo === 'p/vp' || titulo === 'vp')) dados.pvp = valor;
            if (dados.liquidez === 'N/A' && titulo.includes('liquidez')) dados.liquidez = valor;
            if (dados.val_mercado === 'N/A' && titulo.includes('mercado')) dados.val_mercado = valor;
            
            // FIIs
            if (dados.segmento === 'N/A' && titulo.includes('segmento')) dados.segmento = valor;
            if (dados.vacancia === 'N/A' && titulo.includes('vacancia')) dados.vacancia = valor;
            if (dados.ultimo_rendimento === 'N/A' && titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = valor;
            if (dados.num_cotistas === 'N/A' && titulo.includes('cotistas')) dados.num_cotistas = valor;
            if (dados.tipo_gestao === 'N/A' && titulo.includes('gestao')) dados.tipo_gestao = valor;
            if (dados.taxa_adm === 'N/A' && titulo.includes('taxa') && titulo.includes('administracao')) dados.taxa_adm = valor;
            
            // Ações
            if (dados.pl === 'N/A' && (titulo === 'p/l' || titulo.includes('p/l'))) dados.pl = valor;
            if (dados.roe === 'N/A' && titulo.replace(/\./g, '') === 'roe') dados.roe = valor;
            if (dados.lpa === 'N/A' && titulo.replace(/\./g, '') === 'lpa') dados.lpa = valor;
            if (dados.payout === 'N/A' && titulo.includes('payout')) dados.payout = valor;
            if (dados.margem_liquida === 'N/A' && titulo.includes('margem liquida')) dados.margem_liquida = valor;
            if (dados.margem_bruta === 'N/A' && titulo.includes('margem bruta')) dados.margem_bruta = valor;
            
            // VPA
            if (dados.vp_cota === 'N/A' && (titulo === 'vpa' || titulo.includes('vp por cota'))) dados.vp_cota = valor;
            
            // Patrimônio
            if (titulo.includes('patrimonial') || titulo.includes('patrimonio')) {
                const valorNumerico = parseValue(valor);
                if (valorNumerico > 5000) { // Valor alto = Patrimônio total
                    if (dados.patrimonio_liquido === 'N/A') dados.patrimonio_liquido = valor;
                } else { // Valor baixo = VPA
                    if (dados.vp_cota === 'N/A') dados.vp_cota = valor;
                }
            }

            if (dados.divida_liquida_ebitda === 'N/A' && titulo.includes('div') && titulo.includes('liq') && titulo.includes('ebitda')) dados.divida_liquida_ebitda = valor;
            if (dados.ev_ebitda === 'N/A' && titulo.includes('ev/ebitda')) dados.ev_ebitda = valor;

            if (titulo.includes('cagr') && titulo.includes('receita')) dados.cagr_receita_5a = valor;
            if (titulo.includes('cagr') && titulo.includes('lucro')) dados.cagr_lucros_5a = valor;

            if (titulo.includes('cotas') && (titulo.includes('emitidas') || titulo.includes('total'))) {
                num_cotas = parseValue(valor);
                dados.cotas_emitidas = valor;
            }
        };

        // --- PARSING ---
        
        // 1. Cards do Topo
        $('._card').each((i, el) => {
            const titulo = $(el).find('._card-header').text().trim();
            const valor = $(el).find('._card-body').text().trim();
            processPair(titulo, valor, 'card');
            if (normalize(titulo).includes('cotacao')) cotacao_atual = parseValue(valor);
        });

        if (cotacao_atual === 0) {
             const cEl = $('._card.cotacao ._card-body span').first();
             if (cEl.length) cotacao_atual = parseValue(cEl.text());
        }

        // 2. Células de Indicadores
        $('.cell').each((i, el) => {
            let titulo = $(el).find('.name').text().trim();
            if (!titulo) titulo = $(el).children('span').first().text().trim();
            let valorEl = $(el).find('.value span').first();
            let valor = (valorEl.length > 0) ? valorEl.text().trim() : $(el).find('.value').text().trim();
            processPair(titulo, valor, 'cell');
        });

        // 3. Tabelas
        $('table tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 2) {
                const indicatorAttr = $(cols[0]).find('[data-indicator]').attr('data-indicator');
                processPair($(cols[0]).text(), $(cols[1]).text(), 'table', indicatorAttr || null);
            }
        });

        // Valor de Mercado Fallback
        if (dados.val_mercado === 'N/A' || dados.val_mercado === '-') {
            let mercadoCalc = 0;
            if (cotacao_atual > 0 && num_cotas > 0) mercadoCalc = cotacao_atual * num_cotas;
            else if (dados.patrimonio_liquido !== 'N/A' && dados.pvp !== 'N/A') {
                const pl = parseExtendedValue(dados.patrimonio_liquido);
                const pvp = parseValue(dados.pvp);
                if (pl > 0 && pvp > 0) mercadoCalc = pl * pvp;
            }
            if (mercadoCalc > 0) {
                if (mercadoCalc > 1e9) dados.val_mercado = `R$ ${(mercadoCalc / 1e9).toFixed(2)} Bilhões`;
                else if (mercadoCalc > 1e6) dados.val_mercado = `R$ ${(mercadoCalc / 1e6).toFixed(2)} Milhões`;
                else dados.val_mercado = formatCurrency(mercadoCalc);
            }
        }

        dados.cotacao_atual = cotacao_atual; // Inclui cotação no objeto final
        return dados;

    } catch (error: any) {
        console.error(`Erro fatal Investidor10 em ${ticker}:`, error.message);
        return null;
    }
}

// ---------------------------------------------------------
// PROVENTOS (STATUS INVEST)
// ---------------------------------------------------------
async function scrapeStatusInvestProventos(ticker: string) {
    try {
        const t = ticker.toUpperCase().replace(/F$/, '');
        let type = 'acoes';
        if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33') || t.endsWith('34')) type = 'fiis'; 

        const refererUrl = `https://statusinvest.com.br/${type}/${t.toLowerCase()}`;
        const apiUrl = `https://statusinvest.com.br/${type}/companytickerprovents?ticker=${t}&chartProventsType=2`;

        const data = await fetchHTML(apiUrl, refererUrl);
        const earnings = data.assetEarningsModels || [];

        return earnings.map((d: any) => {
            const parseDateJSON = (dStr: string) => {
                if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                const parts = dStr.split('/');
                if (parts.length !== 3) return null;
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            };
            
            let labelTipo = 'REND'; 
            if (d.et === 1) labelTipo = 'DIV';
            if (d.et === 2) labelTipo = 'JCP';
            if (d.et === 3) labelTipo = 'REND'; // As vezes JCP/Rend misturam
            
            return {
                ticker: ticker.toUpperCase(),
                type: labelTipo,
                date_com: parseDateJSON(d.ed),
                payment_date: parseDateJSON(d.pd),
                rate: d.v
            };
        }).filter((d: any) => d.payment_date !== null && d.rate > 0);

    } catch (error: any) { 
        return []; // Falha silenciosa para proventos
    }
}

// ---------------------------------------------------------
// HANDLER
// ---------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const metadata = await scrapeInvestidor10(ticker);
        
        if (metadata) {
            // Upsert Metadata
            const dbPayload = {
                ticker: metadata.ticker,
                type: metadata.type,
                segment: metadata.segmento === 'N/A' ? 'Geral' : metadata.segmento,
                pvp: parseValue(metadata.pvp),
                pl: parseValue(metadata.pl),
                dy_12m: parseValue(metadata.dy),
                roe: parseValue(metadata.roe),
                vacancia: parseValue(metadata.vacancia),
                liquidez: metadata.liquidez,
                valor_mercado: metadata.val_mercado,
                updated_at: metadata.updated_at,
                lpa: parseValue(metadata.lpa),
                vpa: parseValue(metadata.vp_cota),
                margem_liquida: parseValue(metadata.margem_liquida),
                margem_bruta: parseValue(metadata.margem_bruta),
                divida_liquida_ebitda: parseValue(metadata.divida_liquida_ebitda),
                ev_ebitda: parseValue(metadata.ev_ebitda),
                cagr_receita: parseValue(metadata.cagr_receita_5a),
                cagr_lucro: parseValue(metadata.cagr_lucros_5a),
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm
            };

            const { error: metaError } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (metaError) console.error('Supabase Meta Error:', metaError);
        }

        const proventos = await scrapeStatusInvestProventos(ticker);
        if (proventos.length > 0) {
             const { error: divError } = await supabase.from('market_dividends').upsert(proventos, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
            if (divError) console.error('Supabase Div Error:', divError);
        }

        if (!metadata) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados no provedor.' });
        }

        return res.status(200).json({ success: true, data: metadata });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
