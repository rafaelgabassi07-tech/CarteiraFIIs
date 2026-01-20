
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

// --- AGENTE HTTPS ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 128,
    maxFreeSockets: 20,
    timeout: 8000,
    rejectUnauthorized: false
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://investidor10.com.br/'
    },
    timeout: 12000
});

// --- HELPERS (Lógica fiel ao snippet fornecido) ---
const REGEX_CLEAN_NUMBER = /[^0-9,-]+/g;
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function parseValue(valueStr) {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    try {
        // Remove caracteres não numéricos exceto vírgula e hífen
        let clean = valueStr.replace(REGEX_CLEAN_NUMBER, "").trim();
        // Corrige casos onde sobra porcentagem ou espaços
        if (!clean || clean === '-') return 0;
        return parseFloat(clean.replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function normalize(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function cleanDoubledString(str) {
    if (!str) return "";
    const parts = str.split('R$');
    if (parts.length > 2) {
        return 'R$' + parts[1].trim(); 
    }
    return str;
}

function parseExtendedValue(str) {
    if (!str) return 0;
    const val = parseValue(str);
    const lower = str.toLowerCase();
    if (lower.includes('bilh')) return val * 1000000000;
    if (lower.includes('milh')) return val * 1000000;
    if (lower.includes('mil')) return val * 1000;
    return val;
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------------------------------------------------------
// SCRAPER DE FUNDAMENTOS
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker) {
    try {
        let html;
        let finalType = 'ACAO';
        let urlUsed = '';

        // Tenta identificar URL correta
        try {
            urlUsed = `https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`;
            const res = await client.get(urlUsed);
            html = res.data;
            finalType = 'FII';
        } catch (e) {
            urlUsed = `https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`;
            const res = await client.get(urlUsed);
            html = res.data;
            finalType = 'ACAO';
        }

        const $ = cheerio.load(html);

        let dados = {
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

        const processPair = (tituloRaw, valorRaw, origem = 'table', indicatorAttr = null) => {
            const titulo = normalize(tituloRaw); 
            let valor = valorRaw.trim();

            if (titulo.includes('mercado')) {
                valor = cleanDoubledString(valor);
                if (dados.val_mercado !== 'N/A' && origem === 'table') return;
            }

            if (!valor) return;

            // Prioridade: Atributo data-indicator (se existir)
            if (indicatorAttr) {
                const ind = indicatorAttr.toUpperCase();
                if (ind === 'DIVIDA_LIQUIDA_EBITDA') { dados.divida_liquida_ebitda = valor; return; }
                if (ind === 'DY') { dados.dy = valor; return; }
                if (ind === 'P_L') { dados.pl = valor; return; }
                if (ind === 'P_VP') { dados.pvp = valor; return; }
                if (ind === 'ROE') { dados.roe = valor; return; }
                if (ind === 'MARGEM_LIQUIDA') { dados.margem_liquida = valor; return; }
            }

            // Fallback por Texto
            // Geral
            if (dados.dy === 'N/A' && (titulo === 'dy' || titulo.includes('dividend yield') || titulo.includes('dy ('))) dados.dy = valor;
            if (dados.pvp === 'N/A' && titulo.includes('p/vp')) dados.pvp = valor;
            if (dados.liquidez === 'N/A' && titulo.includes('liquidez')) dados.liquidez = valor;
            if (dados.val_mercado === 'N/A' && titulo.includes('mercado')) dados.val_mercado = valor;
            if (dados.variacao_12m === 'N/A' && titulo.includes('variacao') && titulo.includes('12m')) dados.variacao_12m = valor;

            // FIIs
            if (dados.segmento === 'N/A' && titulo.includes('segmento')) dados.segmento = valor;
            if (dados.vacancia === 'N/A' && titulo.includes('vacancia')) dados.vacancia = valor;
            if (dados.ultimo_rendimento === 'N/A' && titulo.includes('ultimo rendimento')) dados.ultimo_rendimento = valor;
            if (dados.cnpj === 'N/A' && titulo.includes('cnpj')) dados.cnpj = valor;
            if (dados.num_cotistas === 'N/A' && titulo.includes('cotistas')) dados.num_cotistas = valor;
            if (dados.tipo_gestao === 'N/A' && titulo.includes('gestao')) dados.tipo_gestao = valor;
            if (dados.mandato === 'N/A' && titulo.includes('mandato')) dados.mandato = valor;
            if (dados.tipo_fundo === 'N/A' && titulo.includes('tipo de fundo')) dados.tipo_fundo = valor;
            if (dados.prazo_duracao === 'N/A' && titulo.includes('prazo')) dados.prazo_duracao = valor;
            if (dados.taxa_adm === 'N/A' && titulo.includes('taxa') && titulo.includes('administracao')) dados.taxa_adm = valor;
            if (dados.cotas_emitidas === 'N/A' && titulo.includes('cotas')) dados.cotas_emitidas = valor;
            if (dados.publico_alvo === 'N/A' && titulo.includes('publico') && titulo.includes('alvo')) dados.publico_alvo = valor;

            // Ações
            if (dados.pl === 'N/A' && (titulo === 'p/l' || titulo.includes('p/l'))) dados.pl = valor;
            if (dados.roe === 'N/A' && titulo.replace(/\./g, '') === 'roe') dados.roe = valor;
            if (dados.lpa === 'N/A' && titulo.replace(/\./g, '') === 'lpa') dados.lpa = valor;
            
            // Margens & Payout
            if (titulo.includes('margem liquida')) dados.margem_liquida = valor;
            if (titulo.includes('margem bruta')) dados.margem_bruta = valor;
            if (titulo.includes('margem ebit')) dados.margem_ebit = valor;
            if (titulo.includes('payout')) dados.payout = valor;

            // EV e Dívidas
            if (titulo.includes('ev/ebitda')) dados.ev_ebitda = valor;
            const tClean = titulo.replace(/[\s\/\.\-]/g, ''); 
            if (dados.divida_liquida_ebitda === 'N/A') {
                if (tClean.includes('div') && tClean.includes('liq') && tClean.includes('ebitda')) dados.divida_liquida_ebitda = valor;
            }
            if (tClean.includes('div') && tClean.includes('liq') && tClean.includes('patrim')) dados.divida_liquida_pl = valor;

            // CAGR
            if (titulo.includes('cagr') && titulo.includes('receita')) dados.cagr_receita_5a = valor;
            if (titulo.includes('cagr') && titulo.includes('lucro')) dados.cagr_lucros_5a = valor;

            // VPA/Patrimônio
            if (dados.vp_cota === 'N/A') {
                if (titulo === 'vpa' || titulo.replace(/\./g, '') === 'vpa' || titulo.includes('vp por cota')) dados.vp_cota = valor;
            }
            if (titulo.includes('patrimonial') || titulo.includes('patrimonio')) {
                const valorNumerico = parseValue(valor);
                const textoLower = valor.toLowerCase();
                if (textoLower.includes('milh') || textoLower.includes('bilh') || valorNumerico > 10000) {
                    if (dados.patrimonio_liquido === 'N/A') dados.patrimonio_liquido = valor;
                } else {
                    if (dados.vp_cota === 'N/A') dados.vp_cota = valor;
                }
            }

            if (titulo.includes('cotas') && (titulo.includes('emitidas') || titulo.includes('total'))) {
                num_cotas = parseValue(valor);
                if (dados.cotas_emitidas === 'N/A') dados.cotas_emitidas = valor;
            }
        };

        // --- EXECUÇÃO ---
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

        $('.cell').each((i, el) => {
            let titulo = $(el).find('.name').text().trim();
            if (!titulo) titulo = $(el).children('span').first().text().trim();
            let valorEl = $(el).find('.value span').first();
            let valor = (valorEl.length > 0) ? valorEl.text().trim() : $(el).find('.value').text().trim();
            processPair(titulo, valor, 'cell');
        });

        $('table tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 2) {
                const indicatorAttr = $(cols[0]).find('[data-indicator]').attr('data-indicator');
                processPair($(cols[0]).text(), $(cols[1]).text(), 'table', indicatorAttr);
            }
        });

        // Fallback Valor de Mercado
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

        return dados;

    } catch (error) {
        console.error(`Erro fatal em ${ticker}:`, error.message);
        return null;
    }
}

// ---------------------------------------------------------
// PROVENTOS (STATUS INVEST)
// ---------------------------------------------------------
async function scrapeStatusInvestProventos(ticker) {
    try {
        const t = ticker.toUpperCase().replace(/F$/, '');
        let type = 'acao';
        if (t.endsWith('11') || t.endsWith('11B')) type = 'fii'; 

        const url = `https://statusinvest.com.br/${type}/companytickerprovents?ticker=${t}&chartProventsType=2`;

        const { data } = await client.get(url, { 
            headers: { 
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://statusinvest.com.br/',
                'User-Agent': 'Mozilla/5.0'
            } 
        });

        const earnings = data.assetEarningsModels || [];

        return earnings.map(d => {
            const parseDateJSON = (dStr) => {
                if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                const parts = dStr.split('/');
                if (parts.length !== 3) return null;
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            };
            let labelTipo = 'REND'; 
            if (d.et === 1) labelTipo = 'DIV';
            if (d.et === 2) labelTipo = 'JCP';
            
            return {
                ticker: ticker.toUpperCase(),
                type: labelTipo,
                date_com: parseDateJSON(d.ed),
                payment_date: parseDateJSON(d.pd),
                rate: d.v
            };
        }).filter(d => d.payment_date !== null && d.rate > 0);

    } catch (error) { 
        return []; 
    }
}

// ---------------------------------------------------------
// HANDLER
// ---------------------------------------------------------
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const metadata = await scrapeInvestidor10(ticker);
        
        if (metadata) {
            // Prepara payload compatível com banco e campos extras
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
                
                // Mapeia campos extras para colunas específicas ou JSON se o DB suportar
                // Como não podemos migrar o DB agora, tentamos enviar. Se falhar, o Supabase ignora ou erra.
                // Idealmente, o usuário deve ter colunas para isso ou uma coluna json 'extra_data'.
                // Vamos tentar enviar os mais importantes que mapeiam para o AssetFundamentals
                lpa: parseValue(metadata.lpa),
                vpa: parseValue(metadata.vp_cota),
                margem_liquida: parseValue(metadata.margem_liquida),
                divida_liquida_ebitda: parseValue(metadata.divida_liquida_ebitda),
                cagr_receita: parseValue(metadata.cagr_receita_5a),
                cagr_lucro: parseValue(metadata.cagr_lucros_5a),
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm
            };

            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        const proventos = await scrapeStatusInvestProventos(ticker);
        if (proventos.length > 0) {
             await supabase.from('market_dividends').upsert(proventos, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        return res.status(200).json({ success: true, data: metadata });

    } catch (e) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ error: e.message });
    }
}
