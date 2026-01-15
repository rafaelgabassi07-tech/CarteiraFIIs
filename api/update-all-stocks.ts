
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
);

// --- OTIMIZAÇÃO: AGENTE HTTPS ---
const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 128,
    maxFreeSockets: 20,
    timeout: 8000
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://investidor10.com.br/'
    },
    timeout: 8000
});

// --- HELPERS ---
const REGEX_CLEAN_NUMBER = /[^0-9,-]+/g;
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    try {
        return parseFloat(valueStr.replace(REGEX_CLEAN_NUMBER, "").replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function chunkArray(array: any[], size: number) {
    const results = [];
    for (let i = 0; i < array.length; i += size) {
        results.push(array.slice(i, i + size));
    }
    return results;
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

function cleanDoubledString(str: string) {
    if (!str) return "";
    const parts = str.split('R$');
    if (parts.length > 2) {
        return 'R$' + parts[1].trim(); 
    }
    return str;
}

// ---------------------------------------------------------
// PARTE 1: FUNDAMENTOS -> INVESTIDOR10
// ---------------------------------------------------------

async function scrapeFundamentos(ticker: string) {
    try {
        let html;
        try {
            // Tenta FIIs primeiro
            const res = await client.get(`https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`);
            html = res.data;
        } catch (e) {
            // Se falhar, tenta Ações
            const res = await client.get(`https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`);
            html = res.data;
        }

        const $ = cheerio.load(html);

        let dados: any = {
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
            payout: 'N/A', cagr_receita_5a: 'N/A', cagr_lucros_5a: 'N/A'
        };

        let cotacao_atual = 0;
        let num_cotas = 0;

        const processPair = (tituloRaw: string, valorRaw: string, origem = 'table', indicatorAttr: string | null = null) => {
            const titulo = normalize(tituloRaw); 
            let valor = valorRaw.trim();

            if (titulo.includes('mercado')) {
                valor = cleanDoubledString(valor);
                if (dados.val_mercado !== 'N/A' && origem === 'table') return;
            }

            if (!valor) return;

            // --- DATA-INDICATOR (Prioridade) ---
            if (indicatorAttr) {
                const ind = indicatorAttr.toUpperCase();
                if (ind === 'DIVIDA_LIQUIDA_EBITDA') { dados.divida_liquida_ebitda = valor; return; }
                if (ind === 'DY') { dados.dy = valor; return; }
                if (ind === 'P_L') { dados.pl = valor; return; }
                if (ind === 'P_VP') { dados.pvp = valor; return; }
                if (ind === 'ROE') { dados.roe = valor; return; }
                if (ind === 'MARGEM_LIQUIDA') { dados.margem_liquida = valor; return; }
            }

            // --- FALLBACK POR TEXTO ---
            if (dados.dy === 'N/A' && (titulo === 'dy' || titulo.includes('dividend yield') || titulo.includes('dy ('))) dados.dy = valor;
            if (dados.pvp === 'N/A' && titulo.includes('p/vp')) dados.pvp = valor;
            if (dados.liquidez === 'N/A' && titulo.includes('liquidez')) dados.liquidez = valor;
            if (dados.val_mercado === 'N/A' && titulo.includes('mercado')) dados.val_mercado = valor;
            
            // FIIs Específicos
            if (dados.segmento === 'N/A' && titulo.includes('segmento')) dados.segmento = valor;
            if (dados.vacancia === 'N/A' && titulo.includes('vacancia')) dados.vacancia = valor;
            
            // Ações Específicas
            if (dados.pl === 'N/A' && (titulo === 'p/l' || titulo.includes('p/l'))) dados.pl = valor;
            
            // Patrimônio (Fallback VPA)
            if (titulo.includes('patrimonial') || titulo.includes('patrimonio')) {
                const valorNumerico = parseValue(valor);
                if (valorNumerico > 10000) {
                    if (dados.patrimonio_liquido === 'N/A') dados.patrimonio_liquido = valor;
                } else {
                    if (dados.vp_cota === 'N/A') dados.vp_cota = valor;
                }
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
                processPair($(cols[0]).text(), $(cols[1]).text(), 'table', indicatorAttr || null);
            }
        });

        // Add cotacao to dataset for return
        dados.cotacao = cotacao_atual;

        return dados;
    } catch (error: any) {
        console.error(`Erro scraper fundamentos [${ticker}]:`, error.message);
        return { dy: '-', pvp: '-', cotacao: 0 };
    }
}

// ---------------------------------------------------------
// PARTE 2: PROVENTOS -> STATUSINVEST
// ---------------------------------------------------------

async function scrapeAsset(ticker: string) {
    try {
        const t = ticker.toUpperCase();
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

        const dividendos = earnings.map((d: any) => {
            const parseDateJSON = (dStr: string) => {
                if (!dStr || dStr.trim() === '' || dStr.trim() === '-') return null;
                const parts = dStr.split('/');
                if (parts.length !== 3) return null;
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            };
            let labelTipo = 'REND'; 
            if (d.et === 1) labelTipo = 'DIV';
            if (d.et === 2) labelTipo = 'JCP';
            if (d.etd) {
                const texto = d.etd.toUpperCase();
                if (texto.includes('JURO')) labelTipo = 'JCP';
                else if (texto.includes('DIVID')) labelTipo = 'DIV';
                else if (texto.includes('TRIBUTADO')) labelTipo = 'REND_TRIB';
            }
            return {
                dataCom: parseDateJSON(d.ed),
                paymentDate: parseDateJSON(d.pd),
                value: d.v,
                type: labelTipo,
                rawType: d.et
            };
        });

        return dividendos.filter((d: any) => d.paymentDate !== null).sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    } catch (error: any) { 
        console.error(`Erro StatusInvest API ${ticker}:`, error.message);
        return []; 
    }
}

// ---------------------------------------------------------
// PARTE 3: IPCA -> INVESTIDOR10
// ---------------------------------------------------------

async function scrapeIpca() {
    try {
        const url = 'https://investidor10.com.br/indices/ipca/';
        const { data } = await client.get(url);
        const $ = cheerio.load(data);

        const historico: any[] = [];
        let acumulado12m = '0,00';
        let acumuladoAno = '0,00';

        let $table = null;
        $('table').each((i, el) => {
            const headers = $(el).text().toLowerCase();
            if (headers.includes('acumulado 12 meses') || headers.includes('variação em %')) {
                $table = $(el);
                return false; 
            }
        });

        if ($table) {
            // @ts-ignore
            $table.find('tbody tr').each((i, el) => {
                const cols = $(el).find('td');
                if (cols.length >= 2) {
                    const dataRef = $(cols[0]).text().trim();
                    const valorStr = $(cols[1]).text().trim();
                    const acAnoStr = $(cols[2]).text().trim();
                    const ac12mStr = $(cols[3]).text().trim();

                    if (i === 0) {
                         acumulado12m = ac12mStr.replace('.', ','); 
                         acumuladoAno = acAnoStr.replace('.', ',');
                    }

                    if (dataRef && valorStr && i < 13) {
                         historico.push({
                             mes: dataRef,
                             valor: parseFloat(valorStr.replace('.', '').replace(',', '.')),
                             acumulado_12m: ac12mStr.replace('.', ','),
                             acumulado_ano: acAnoStr.replace('.', ',')
                         });
                    }
                }
            });
        }

        return {
            historico: historico.reverse(),
            acumulado_12m: acumulado12m,
            acumulado_ano: acumuladoAno
        };

    } catch (error) {
        console.error('Erro no Scraper IPCA:', error);
        return { historico: [], acumulado_12m: '0,00', acumulado_ano: '0,00' };
    }
}

// ---------------------------------------------------------
// HANDLER (API)
// ---------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        // --- MODO CRON (GET) ---
        // Executado automaticamente pelo Vercel Cron ou manualmente via URL
        if (req.method === 'GET') {
            // 1. Busca todos os tickers únicos do banco de dados
            const { data: transactions, error } = await supabase.from('transactions').select('ticker');
            if (error) throw error;

            const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker.toUpperCase()))];
            if (uniqueTickers.length === 0) return res.status(200).json({ message: "Nenhum ativo para atualizar." });

            const batches = chunkArray(uniqueTickers, 3); // Lotes de 3 para não estourar memória/timeout
            let processed = 0;

            for (const batch of batches) {
                await Promise.all(batch.map(async (ticker: string) => {
                    try {
                        // A. Scrape Fundamentos
                        const fund = await scrapeFundamentos(ticker);
                        const assetType = (ticker.endsWith('11') || ticker.endsWith('11B')) ? 'FII' : 'ACAO';
                        
                        // Salva Metadata
                        await supabase.from('ativos_metadata').upsert({
                            ticker,
                            type: assetType,
                            segment: fund.segmento !== 'N/A' ? fund.segmento : 'Geral',
                            current_price: parseValue(fund.cotacao),
                            pvp: parseValue(fund.pvp),
                            dy_12m: parseValue(fund.dy),
                            pl: parseValue(fund.pl),
                            vacancia: parseValue(fund.vacancia),
                            valor_mercado: fund.val_mercado,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'ticker' });

                        // B. Scrape Proventos
                        const proventos = await scrapeAsset(ticker);
                        if (proventos.length > 0) {
                            const dbProventos = proventos.map((p: any) => ({
                                ticker,
                                type: p.type,
                                date_com: p.dataCom,
                                payment_date: p.paymentDate,
                                rate: p.value
                            }));
                            
                            await supabase.from('market_dividends').upsert(dbProventos, {
                                onConflict: 'ticker, type, date_com, payment_date, rate',
                                ignoreDuplicates: true
                            });
                        }
                        processed++;
                    } catch (err) {
                        console.error(`Falha no Cron para ${ticker}:`, err);
                    }
                }));
                // Pequena pausa entre lotes
                await new Promise(r => setTimeout(r, 1000));
            }

            return res.status(200).json({ 
                success: true, 
                processed, 
                total: uniqueTickers.length,
                message: "Ciclo de atualização concluído." 
            });
        }

        // --- MODO PROXY/CLIENTE (POST) ---
        // Mantém a compatibilidade com a sua implementação anterior
        if (req.method === 'POST') {
            if (!req.body || !req.body.mode) throw new Error("Payload inválido");
            const { mode, payload } = req.body;

            if (mode === 'ipca') {
                const dados = await scrapeIpca();
                return res.status(200).json({ json: dados });
            }

            if (mode === 'fundamentos') {
                if (!payload.ticker) return res.json({ json: {} });
                const dados = await scrapeFundamentos(payload.ticker);
                return res.status(200).json({ json: dados });
            }

            if (mode === 'proventos_carteira' || mode === 'historico_portfolio') {
                if (!payload.fiiList) return res.json({ json: [] });
                const batches = chunkArray(payload.fiiList, 5);
                let finalResults: any[] = [];
                for (const batch of batches) {
                    const promises = batch.map(async (item: any) => {
                        const ticker = typeof item === 'string' ? item : item.ticker;
                        const defaultLimit = mode === 'historico_portfolio' ? 14 : 12;
                        const limit = typeof item === 'string' ? defaultLimit : (item.limit || defaultLimit);
                        const history = await scrapeAsset(ticker);
                        const recents = history.filter((h: any) => h.paymentDate && h.value > 0).slice(0, limit);
                        if (recents.length > 0) return recents.map((r: any) => ({ symbol: ticker.toUpperCase(), ...r }));
                        return null;
                    });
                    const batchResults = await Promise.all(promises);
                    finalResults = finalResults.concat(batchResults);
                    if (batches.length > 1) await new Promise(r => setTimeout(r, 200)); 
                }
                return res.status(200).json({ json: finalResults.filter(d => d !== null).flat() });
            }

            return res.status(400).json({ error: "Modo desconhecido" });
        }

        return res.status(405).json({ error: "Method Not Allowed" });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
