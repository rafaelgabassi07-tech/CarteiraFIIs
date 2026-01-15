
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
    timeout: 10000
});

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://investidor10.com.br/'
    },
    timeout: 15000
});

// --- HELPERS ---
function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    try {
        const clean = valueStr.replace(/[^0-9,.-]/g, '').trim();
        return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    } catch (e) { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
}

function chunkArray(array: any[], size: number) {
    const results = [];
    for (let i = 0; i < array.length; i += size) {
        results.push(array.slice(i, i + size));
    }
    return results;
}

// ---------------------------------------------------------
// PARTE 1: FUNDAMENTOS -> INVESTIDOR10
// ---------------------------------------------------------

async function scrapeFundamentos(ticker: string) {
    try {
        let html;
        try {
            const res = await client.get(`https://investidor10.com.br/fiis/${ticker.toLowerCase()}/`);
            html = res.data;
        } catch (e) {
            const res = await client.get(`https://investidor10.com.br/acoes/${ticker.toLowerCase()}/`);
            html = res.data;
        }

        const $ = cheerio.load(html);
        const dataMap: Record<string, any> = {};

        // 1. Extração Específica
        const cotacaoVal = $('._card.cotacao .value').text().trim();
        if (cotacaoVal) dataMap['cotacao'] = cotacaoVal;

        const dyVal = $('._card.dy ._card-body span').first().text().trim();
        if (dyVal) dataMap['dy'] = dyVal;

        const pvpVal = $('._card.vp ._card-body span').text().trim();
        if (pvpVal) dataMap['pvp'] = pvpVal;

        const plVal = $('._card.pl ._card-body span').text().trim();
        if (plVal) dataMap['pl'] = plVal;

        const liqVal = $('._card.val ._card-body span').text().trim();
        if (liqVal) dataMap['liquidez'] = liqVal;

        // 2. Varredura Tabela
        $('#table-indicators .cell').each((_, el) => {
            const title = $(el).find('.name').text().trim();
            const value = $(el).find('.value span').text().trim();
            if (title && value) {
                dataMap[normalizeKey(title)] = value;
            }
        });

        // 3. Fallback Genérico
        $('._card').each((_, el) => {
            const title = $(el).find('._card-header').text().trim();
            const value = $(el).find('._card-body').text().trim();
            if (title && value) dataMap[normalizeKey(title)] = value.trim();
        });

        const findVal = (keys: string[]) => {
            for (const key of keys) {
                const nKey = normalizeKey(key);
                if (dataMap[nKey]) return parseValue(dataMap[nKey]);
            }
            return 0;
        };
        
        const findText = (keys: string[]) => {
            for (const key of keys) {
                const nKey = normalizeKey(key);
                if (dataMap[nKey]) return dataMap[nKey];
            }
            return '';
        };

        const dados = {
            cotacao: parseValue(dataMap['cotacao']) || findVal(['cotacao', 'valor atual']),
            dy: parseValue(dataMap['dy']) || findVal(['dividend yield', 'dy']),
            pvp: parseValue(dataMap['pvp']) || findVal(['p/vp', 'pvp']),
            pl: parseValue(dataMap['pl']) || findVal(['p/l', 'pl']),
            roe: findVal(['roe', 'return on equity']),
            liquidez: dataMap['liquidez'] || findText(['liquidez diaria', 'liquidez']),
            vacancia: findVal(['vacancia']),
            val_mercado: findText(['valor patrimonial', 'patrimonio liquido', 'valor de mercado']),
            segmento: findText(['segmento'])
        };

        if (!dados.segmento || dados.segmento === 'Geral') {
             $('#breadcrumbs li a, .breadcrumb-item a').each((_, el) => {
                const txt = $(el).text().trim();
                if (!['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'ETFs', ticker.toUpperCase()].includes(txt)) {
                    dados.segmento = txt;
                }
            });
        }

        return dados;
    } catch (error: any) {
        console.error(`Erro scraper fundamentos [${ticker}]:`, error.message);
        return { 
            cotacao: 0, dy: 0, pvp: 0, pl: 0, roe: 0, 
            liquidez: '', vacancia: 0, val_mercado: '', segmento: 'Geral' 
        };
    }
}

// ---------------------------------------------------------
// PARTE 2: PROVENTOS -> STATUSINVEST (FUTURO E PASSADO)
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
            
            // Refinamento por texto
            if (d.etd) {
                const texto = d.etd.toUpperCase();
                if (texto.includes('JURO')) labelTipo = 'JCP';
                else if (texto.includes('DIVID')) labelTipo = 'DIV';
                else if (texto.includes('REND')) labelTipo = 'REND';
            }

            const dataCom = parseDateJSON(d.ed);
            let paymentDate = parseDateJSON(d.pd);

            // Se tem Data Com mas não tem Pagamento (Provisionado), usa Data Com como referência
            if (!paymentDate && dataCom) {
                paymentDate = dataCom; 
            }

            return {
                dataCom: dataCom,
                paymentDate: paymentDate,
                value: d.v,
                type: labelTipo,
                rawType: d.et
            };
        });

        // Filtra inválidos, mas mantém futuros
        return dividendos
            .filter((d: any) => d.dataCom !== null && d.value > 0)
            .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    } catch (error: any) { 
        console.error(`Erro StatusInvest API ${ticker}:`, error.message);
        return []; 
    }
}

// ---------------------------------------------------------
// PARTE 3: IPCA
// ---------------------------------------------------------

async function scrapeIpca() {
    // ... (Mantém lógica anterior do IPCA)
    try {
        const url = 'https://investidor10.com.br/indices/ipca/';
        const { data } = await client.get(url);
        const $ = cheerio.load(data);
        const historico: any[] = [];
        let acumulado12m = '0,00';
        let acumuladoAno = '0,00';

        $('table').each((i, table) => {
            const headerText = $(table).find('thead').text().toLowerCase();
            if (headerText.includes('acumulado 12 meses') || headerText.includes('no ano')) {
                let idx12m = -1;
                let idxAno = -1;
                let idxMes = -1;
                let idxVal = -1;

                $(table).find('thead th, tr:first-child td').each((idx, th) => {
                    const txt = $(th).text().toLowerCase();
                    if (txt.includes('mês') || txt.includes('data')) idxMes = idx;
                    if (txt.includes('valor') || txt.includes('no mês')) idxVal = idx;
                    if (txt.includes('12 meses')) idx12m = idx;
                    if (txt.includes('no ano')) idxAno = idx;
                });

                if (idx12m === -1 && $(table).find('tr').first().find('td').length >= 4) {
                    idxMes = 0; idxVal = 1; idxAno = 2; idx12m = 3;
                }

                if (idx12m !== -1) {
                    $(table).find('tbody tr').each((rIdx, tr) => {
                        const tds = $(tr).find('td');
                        if (tds.length > idx12m) {
                            const mes = $(tds[idxMes]).text().trim();
                            const val = $(tds[idxVal]).text().trim();
                            const acc12 = $(tds[idx12m]).text().trim();
                            const accAno = $(tds[idxAno]).text().trim();
                            if (rIdx === 0 && acc12) {
                                acumulado12m = acc12.replace('.', ',');
                                acumuladoAno = accAno.replace('.', ',');
                            }
                            if (mes && val) {
                                historico.push({
                                    mes,
                                    valor: parseFloat(val.replace('.', '').replace(',', '.')),
                                    acumulado_12m: acc12.replace('.', ','),
                                    acumulado_ano: accAno.replace('.', ',')
                                });
                            }
                        }
                    });
                }
            }
        });

        if (acumulado12m === '0,00') {
            $('.value').each((_, el) => {
                const parentText = $(el).parent().text().toLowerCase();
                if (parentText.includes('ipca') && parentText.includes('12 meses')) {
                    acumulado12m = $(el).text().trim().replace('.', ',');
                }
            });
        }

        return {
            historico: historico.slice(0, 13).reverse(), 
            acumulado_12m: acumulado12m,
            acumulado_ano: acumuladoAno
        };
    } catch (error) {
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
        if (req.method === 'GET') {
            const { data: transactions, error } = await supabase.from('transactions').select('ticker');
            if (error) throw error;

            const uniqueTickers = [...new Set((transactions || []).map((t: any) => t.ticker.toUpperCase()))];
            if (uniqueTickers.length === 0) return res.status(200).json({ message: "Nenhum ativo para atualizar." });

            const batches = chunkArray(uniqueTickers, 3); 
            let processed = 0;

            for (const batch of batches) {
                await Promise.all(batch.map(async (ticker: string) => {
                    try {
                        const fund = await scrapeFundamentos(ticker);
                        const assetType = (ticker.endsWith('11') || ticker.endsWith('11B')) ? 'FII' : 'ACAO';
                        
                        await supabase.from('ativos_metadata').upsert({
                            ticker,
                            type: assetType,
                            segment: fund.segmento,
                            current_price: fund.cotacao,
                            pvp: fund.pvp,
                            dy_12m: fund.dy,
                            pl: fund.pl,
                            roe: fund.roe,
                            liquidez: fund.liquidez,
                            vacancia: fund.vacancia,
                            valor_mercado: fund.val_mercado,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'ticker' });

                        // Scrape Proventos (Inclui futuros)
                        const proventos = await scrapeAsset(ticker);
                        if (proventos.length > 0) {
                            const dbProventos = proventos.map((p: any) => ({
                                ticker,
                                type: p.type,
                                date_com: p.dataCom,
                                payment_date: p.paymentDate, // Pode ser igual dataCom se não anunciado
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
                await new Promise(r => setTimeout(r, 1500));
            }

            return res.status(200).json({ 
                success: true, 
                processed, 
                total: uniqueTickers.length,
                message: "Ciclo de atualização concluído." 
            });
        }

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
                        const recents = history.slice(0, limit); // Pega os mais recentes (futuros inclusos)
                        if (recents.length > 0) return recents.map((r: any) => ({ symbol: ticker.toUpperCase(), ...r }));
                        return null;
                    });
                    const batchResults = await Promise.all(promises);
                    finalResults = finalResults.concat(batchResults);
                    if (batches.length > 1) await new Promise(r => setTimeout(r, 200)); 
                }
                return res.status(200).json({ json: finalResults.filter(d => d !== null).flat() });
            }
        }

        return res.status(405).json({ error: "Method Not Allowed" });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
