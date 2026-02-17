
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const httpsAgent = new https.Agent({ 
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 15000, 
    rejectUnauthorized: false
});

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const client = axios.create({
    httpsAgent,
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
    },
    timeout: 15000, 
    maxRedirects: 5
});

// --- HELPERS ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any): number | null {
    if (valueStr === undefined || valueStr === null) return null;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === '--' || str === 'N/A') return null;

    str = str.replace('%', '').trim();
    str = str.replace(/^R\$\s?/, '').trim();

    let multiplier = 1;
    const lastChar = str.slice(-1).toUpperCase();
    if (['B', 'M', 'K'].includes(lastChar)) {
        if (lastChar === 'B') multiplier = 1e9;
        else if (lastChar === 'M') multiplier = 1e6;
        else if (lastChar === 'K') multiplier = 1e3;
        str = str.slice(0, -1).trim();
    }

    str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

    const lastCommaIndex = str.lastIndexOf(',');
    const lastDotIndex = str.lastIndexOf('.');
    
    let clean = "";
    if (lastCommaIndex > lastDotIndex) {
        clean = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDotIndex > lastCommaIndex) {
        clean = str.replace(/,/g, '');
    } else {
        if (lastCommaIndex !== -1) clean = str.replace(',', '.');
        else clean = str;
    }

    clean = clean.replace(/[^0-9.-]/g, '');
    if (!clean) return null;
    
    const result = parseFloat(clean);
    return isNaN(result) ? null : result * multiplier;
}

function parseDate(dateStr: string) {
    if (!dateStr || dateStr === '-' || dateStr.length < 8) return null;
    try {
        const parts = dateStr.trim().split('/');
        if (parts.length === 3) {
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return null;
    } catch { return null; }
}

function mapLabelToKey(label: string): string | null {
    const norm = normalize(label);
    if (!norm) return null;
    
    // Mapeamento específico para Investidor10
    if (norm === 'cotacao' || norm.includes('valor atual')) return 'cotacao_atual';
    if (norm.includes('razao social')) return 'company_name';
    if (norm.includes('cnpj')) return 'cnpj';
    if (norm.includes('publico') && norm.includes('alvo')) return 'target_audience';
    if (norm.includes('mandato')) return 'mandate';
    if (norm.includes('segmento')) return 'segmento';
    if (norm.includes('tipo de fundo')) return 'fund_type';
    if (norm.includes('prazo')) return 'duration';
    if (norm.includes('tipo de gestao')) return 'manager_type';
    if (norm.includes('taxa de administracao')) return 'management_fee';
    if (norm.includes('vacancia') && !norm.includes('financeira')) return 'vacancia';
    if (norm.includes('numero de cotistas')) return 'num_cotistas';
    if (norm.includes('cotas emitidas')) return 'num_quotas';
    if (norm.includes('valor patrimonial p/ cota') || norm === 'vp/cota') return 'vpa';
    if (norm === 'valor patrimonial') return 'patrimonio_liquido';
    if (norm.includes('ultimo rendimento')) return 'ultimo_rendimento';
    if (norm === 'p/vp') return 'pvp';
    if (norm === 'liquidez diaria') return 'liquidez';
    if (norm.includes('dy') && norm.includes('12m')) return 'dy';
    if (norm.includes('valor de mercado')) return 'val_mercado';
    if (norm === 'p/l') return 'pl';
    if (norm === 'roe') return 'roe';

    return null;
}

async function scrapeInvestidor10(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    // Tenta URL principal baseado na heurística do ticker
    const urlFii = `https://investidor10.com.br/fiis/${tickerLower}/`;
    const urlAcao = `https://investidor10.com.br/acoes/${tickerLower}/`;
    
    // Ordem de tentativa
    const urls = isLikelyFii ? [urlFii, urlAcao] : [urlAcao, urlFii];

    let finalData: any = null;
    let finalDividends: any[] = [];
    let realEstateProperties: any[] = [];

    for (const url of urls) {
        try {
            const res = await client.get(url, { headers: { 'User-Agent': getRandomAgent() } });
            if (res.data.length < 5000) continue;

            const $ = cheerio.load(res.data);
            
            // Verifica se a página é válida (tem header de ação/fii)
            const headerContainer = $('#header_action');
            if (headerContainer.length === 0) continue;

            let type = url.includes('/fiis/') ? 'FII' : 'ACAO';

            // --- 1. DADOS BÁSICOS (Header & Cards) ---
            const dados: any = {
                ticker: ticker.toUpperCase(),
                type: type,
                updated_at: new Date().toISOString(),
                // Inicializa nulos
                dy: null, pvp: null, pl: null, liquidez: null, val_mercado: null,
                segmento: null, roe: null, margem_liquida: null, margem_bruta: null,
                cagr_receita_5a: null, cagr_lucros_5a: null, divida_liquida_ebitda: null,
                ev_ebitda: null, lpa: null, vpa: null, vacancia: null,
                ultimo_rendimento: null, num_cotistas: null, patrimonio_liquido: null,
                taxa_adm: null, tipo_gestao: null,
                // Novos campos da imagem
                company_name: null, cnpj: null, target_audience: null, mandate: null,
                fund_type: null, duration: null, num_quotas: null,
                // Rentabilidade
                profitability_month: null, profitability_real_month: null,
                profitability_3m: null, profitability_real_3m: null,
                profitability_12m: null, profitability_real_12m: null,
                profitability_2y: null, profitability_real_2y: null,
                profitability_5y: null, profitability_real_5y: null,
                profitability_10y: null, profitability_real_10y: null,
                benchmark_cdi_12m: null, benchmark_ifix_12m: null, benchmark_ibov_12m: null
            };

            const headerPriceStr = headerContainer.find('div._card-body span.value').text().trim();
            const headerName = headerContainer.find('h2.name-ticker').text().trim();
            
            if (headerPriceStr) dados.cotacao_atual = parseValue(headerPriceStr);
            if (headerName) dados.name = headerName;

            // Cards Superiores
            $('#cards-ticker div._card').each((_, el) => {
                const label = $(el).find('div._card-header span').first().text().trim();
                const value = $(el).find('div._card-body span').first().text().trim();
                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key) dados[key] = parseValue(value);
                }
            });

            // --- 2. INFORMAÇÕES GERAIS (Grid "Informações sobre...") ---
            // Procura por divs com classe 'cell' dentro de um container de informações
            const infoSection = $('#table-general-data, #informations-section');
            if (infoSection.length > 0) {
                infoSection.find('.cell').each((_, el) => {
                    const label = $(el).find('.name, span:first-child').text().trim();
                    const value = $(el).find('.value, span:last-child').text().trim(); 
                    
                    if (label && value) {
                        const key = mapLabelToKey(label);
                        if (key) {
                            // Campos de texto mantêm string, outros tentam parse numérico
                            if (['cnpj', 'company_name', 'target_audience', 'mandate', 'segmento', 'fund_type', 'duration', 'manager_type', 'management_fee', 'liquidez', 'val_mercado', 'patrimonio_liquido', 'num_quotas'].includes(key)) {
                                dados[key] = value;
                            } else {
                                dados[key] = parseValue(value);
                            }
                        }
                    }
                });
            }

            // --- 3. TABELA DE RENTABILIDADE (Complexa) ---
            // A tabela geralmente tem header: [1 mês, 3 meses, 1 ano, 2 anos, 5 anos, 10 anos]
            // E linhas com label "Rentabilidade" e "Rentabilidade Real"
            const rentabTable = $('table.table-rentabilidade, #table-rentabilidade');
            if (rentabTable.length > 0) {
                // Mapeia índices das colunas
                const colMap: Record<number, string> = {};
                rentabTable.find('thead th').each((idx, th) => {
                    const txt = $(th).text().toLowerCase().trim();
                    if (txt.includes('1 m')) colMap[idx] = 'month';
                    else if (txt.includes('3 m')) colMap[idx] = '3m';
                    else if (txt.includes('1 a') || txt.includes('12 m')) colMap[idx] = '12m';
                    else if (txt.includes('2 a')) colMap[idx] = '2y';
                    else if (txt.includes('5 a')) colMap[idx] = '5y';
                    else if (txt.includes('10 a')) colMap[idx] = '10y';
                });

                rentabTable.find('tbody tr').each((_, tr) => {
                    const rowLabel = $(tr).find('td').first().text().trim().toLowerCase();
                    const isReal = rowLabel.includes('real');
                    
                    if (rowLabel.includes('rentabilidade')) {
                        $(tr).find('td').each((idx, td) => {
                            const period = colMap[idx];
                            if (period) {
                                const valStr = $(td).text().trim();
                                if (valStr && valStr !== '-') {
                                    const val = parseValue(valStr);
                                    const key = isReal ? `profitability_real_${period}` : `profitability_${period}`;
                                    dados[key] = val;
                                }
                            }
                        });
                    }
                });
            }

            // --- 4. BENCHMARKS (Comparação com Índices) ---
            // Tenta achar valores de CDI/IFIX na tabela de comparação (se existir)
            $('#history-section table, .table-comparison').find('tr').each((_, tr) => {
                const rowText = $(tr).text().toLowerCase();
                if (rowText.includes('1 ano') || rowText.includes('12 meses')) {
                    // Tenta extrair valores brutos das colunas
                    $(tr).find('td').each((_, td) => {
                        // Heurística fraca, mas tenta pegar valores
                    });
                }
            });

            // --- 5. DIVIDENDOS 12M ---
            const divTable = $('#table-dividends-history');
            if (divTable.length > 0) {
                divTable.find('tbody tr').each((_, tr) => {
                    const cols = $(tr).find('td');
                    if (cols.length < 3) return;

                    let typeDiv = 'DIV';
                    let dateComStr = '';
                    let datePayStr = '';
                    let valStr = '';

                    cols.each((_, td) => {
                        const txt = $(td).text().trim();
                        const norm = normalize(txt);
                        if (norm.includes('jcp') || norm.includes('juros')) typeDiv = 'JCP';
                        else if (norm.includes('rendimento')) typeDiv = 'REND';
                        else if (norm.includes('amortiza')) typeDiv = 'AMORT';

                        if (txt.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            if (!dateComStr) dateComStr = txt;
                            else if (!datePayStr) datePayStr = txt;
                        }
                        if (txt.includes(',') && !txt.includes('/') && !txt.includes('%')) {
                            if (!valStr) valStr = txt;
                        }
                    });

                    const rate = parseValue(valStr);
                    const dateCom = parseDate(dateComStr);
                    const paymentDate = parseDate(datePayStr);

                    if (dateCom && rate !== null && rate > 0) {
                        finalDividends.push({
                            ticker: ticker.toUpperCase(),
                            type: typeDiv,
                            date_com: dateCom,
                            payment_date: paymentDate || null,
                            rate
                        });
                    }
                });
            }

            // --- 6. IMÓVEIS (FIIs) ---
            if (type === 'FII') {
                const propContainers = ['#sc_properties', '#properties-section', '.properties-list'];
                let container: any = null;
                for (const sel of propContainers) {
                    if ($(sel).length > 0) { container = $(sel); break; }
                }

                if (container) {
                    container.find('.card, .property-card, .carousel-cell, .item').each((_, el) => {
                        let name = $(el).find('h4, h3, strong, .title, .name').first().text().trim();
                        let location = $(el).find('.address, .location, .sub-title, p').not('.name').first().text().trim();
                        if (name && name.length > 3 && !name.includes('%')) {
                            realEstateProperties.push({
                                name: name.replace(/\s+/g, ' '),
                                location: location ? location.replace(/\s+/g, ' ') : 'Localização não informada',
                                type: 'Imóvel'
                            });
                        }
                    });
                }
            }

            // Ajustes finais
            if ((dados.dy === null || dados.dy === 0) && dados.ultimo_rendimento && dados.cotacao_atual) {
                dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100 * 12;
            }
            if (dados.vpa === null && dados.pvp > 0 && dados.cotacao_atual > 0) {
                dados.vpa = dados.cotacao_atual / dados.pvp;
            }

            // Limpa chaves vazias
            Object.keys(dados).forEach(k => {
                if (dados[k] === null || dados[k] === undefined || dados[k] === '') delete dados[k];
            });

            finalData = {
                ...dados,
                dy_12m: dados.dy,
                current_price: dados.cotacao_atual,
                properties: realEstateProperties
            };
            
            break; // Sucesso na URL atual
        } catch (e) {
            continue; // Tenta próxima URL
        }
    }

    if (!finalData) return null;
    return { metadata: finalData, dividends: finalDividends };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    const force = req.query.force === 'true'; 
    
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                // Cache de 3 horas
                if (age < 10800000) {
                     const { data: divs } = await supabase.from('market_dividends').select('*').eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha ao obter dados.' });
        }

        const { metadata, dividends } = result;

        // Salva metadados
        if (metadata) {
            const dbPayload = { ...metadata };
            delete dbPayload.dy; // Mapeado para dy_12m no banco
            delete dbPayload.cotacao_atual; // Mapeado para current_price no banco
            
            await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        }

        // Salva dividendos
        if (dividends.length > 0) {
             const today = new Date().toISOString().split('T')[0];
             // Limpa futuros para evitar duplicatas erradas
             await supabase.from('market_dividends').delete().eq('ticker', ticker).gte('payment_date', today);

             const uniqueDivs = Array.from(new Map(dividends.map(item => [
                `${item.type}-${item.date_com}-${item.rate}`, item
            ])).values());
            
            await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
        }

        return res.status(200).json({ success: true, data: metadata, dividends });

    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
