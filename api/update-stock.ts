
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

const client = axios.create({
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
    },
    timeout: 10000, 
    maxRedirects: 5
});

// --- INTELIGÊNCIA DE PARSING ---

const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

// Analisa se uma string parece dinheiro (R$ ou formato decimal puro) E NÃO é porcentagem
function parseMoneySmart(valueStr: any): number | null {
    if (!valueStr) return null;
    let str = String(valueStr).trim();
    
    // Regra 1: Se tem %, é Yield/Taxa, não valor monetário. Abortar.
    if (str.includes('%')) return null;
    
    // Regra 2: Deve conter números
    if (!/\d/.test(str)) return null;

    // Limpeza
    str = str.replace(/^R\$\s?/, '').replace(/\s/g, '').replace(/\u00A0/g, '');

    // Detecção de formato BR (1.000,00) vs US (1,000.00)
    // Assumimos BR se houver vírgula no final ou se não houver ponto
    if (str.includes(',') && !str.includes('.')) {
        str = str.replace(',', '.');
    } else if (str.includes('.') && str.includes(',')) {
        // Se o último separador for vírgula, é decimal (BR)
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }

    const val = parseFloat(str);
    // Filtro de sanidade: Dividendos > 1000 ou < 0.0001 são suspeitos (provavelmente erro de parse)
    if (isNaN(val) || val <= 0.00001 || val > 5000) return null;

    return val;
}

// Analisa se uma string é uma data válida
function parseDateSmart(dateStr: string): string | null {
    if (!dateStr || dateStr.length < 8) return null;
    const clean = dateStr.trim();
    
    // Formato DD/MM/AAAA
    const matchBR = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchBR) {
        return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
    }
    // Formato AAAA-MM-DD
    const matchISO = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) {
        return clean.substring(0, 10);
    }
    return null;
}

// Identifica o tipo de provento baseado em palavras-chave
function identifyTypeSmart(text: string): string {
    const norm = normalize(text);
    if (norm.includes('jcp') || norm.includes('juros') || norm.includes('capital')) return 'JCP';
    if (norm.includes('rend') || norm.includes('rendimento')) return 'REND';
    if (norm.includes('amort') || norm.includes('amortizacao')) return 'AMORT';
    return 'DIV'; // Padrão
}

// Mapeamento de metadados fundamentais
function mapLabelToKey(label: string): string | null {
    const norm = normalize(label);
    if (!norm) return null;
    const cleanNorm = norm.replace(/\s+/g, '');
    
    if (cleanNorm === 'p/vp' || cleanNorm === 'vp' || cleanNorm === 'p/vpa') return 'pvp'; 
    if (cleanNorm === 'p/l' || cleanNorm === 'pl') return 'pl';
    if (norm.includes('dy') || norm.includes('dividend yield')) return 'dy';
    if (norm === 'cotacao' || norm.includes('valor atual')) return 'cotacao_atual';
    if (norm.includes('cota') && (norm.includes('patrim') || norm.includes('vp'))) return 'vpa';
    if (cleanNorm === 'vpa' || cleanNorm === 'vp/cota' || cleanNorm === 'vpcota') return 'vpa';
    if (norm === 'lpa') return 'lpa';
    if (cleanNorm === 'ev/ebitda') return 'ev_ebitda';
    if (norm === 'roe') return 'roe';
    if (norm === 'margem liquida') return 'margem_liquida';
    if (norm === 'margem bruta') return 'margem_bruta';
    if (norm.includes('cagr receitas')) return 'cagr_receita_5a';
    if (norm.includes('cagr lucros')) return 'cagr_lucros_5a';
    if (norm.includes('liquida/ebitda') || norm.includes('liq/ebitda')) return 'divida_liquida_ebitda';
    if (norm.includes('liquidez')) return 'liquidez';
    if (norm.includes('valor de mercado')) return 'val_mercado';
    if (norm.includes('ultimo rendimento')) return 'ultimo_rendimento';
    if ((norm.includes('patrim') && (norm.includes('liquido') || norm.includes('liq'))) || norm === 'patrimonio' || norm === 'patrim.' || norm === 'valor patrimonial' || cleanNorm === 'valorpatrimonial' || cleanNorm === 'val.patrimonial') return 'patrimonio_liquido'; 
    if (norm.includes('cotistas') || norm.includes('numero de cotistas')) return 'num_cotistas';
    if (norm.includes('vacancia') && !norm.includes('financeira')) return 'vacancia'; 
    if (norm.includes('tipo de gestao') || norm === 'gestao') return 'tipo_gestao';
    if (norm.includes('taxa de administracao') || norm.includes('taxa de admin')) return 'taxa_adm';
    if (norm.includes('segmento') || norm === 'setor' || norm.includes('setor de atuacao')) return 'segmento';

    return null;
}

async function scrapeInvestidor10(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    // Tenta URLs comuns em ordem de probabilidade
    const urls = isLikelyFii 
        ? [`https://investidor10.com.br/fiis/${tickerLower}/`, `https://investidor10.com.br/fiagros/${tickerLower}/`]
        : [`https://investidor10.com.br/acoes/${tickerLower}/`, `https://investidor10.com.br/bdrs/${tickerLower}/`];

    // Adiciona fallback reverso
    if (isLikelyFii) urls.push(`https://investidor10.com.br/acoes/${tickerLower}/`);
    else urls.push(`https://investidor10.com.br/fiis/${tickerLower}/`);

    let finalData: any = null;
    let finalDividends: any[] = [];

    for (const url of urls) {
        try {
            const res = await client.get(url);
            if (res.data.length < 3000) continue; // Conteúdo muito curto = erro ou soft 404

            const $ = cheerio.load(res.data);
            
            // Metadados básicos
            const dados: any = {
                ticker: ticker.toUpperCase(),
                type: url.includes('/fiis/') || url.includes('/fiagros/') ? 'FII' : 'ACAO',
                updated_at: new Date().toISOString(),
                dy: null, pvp: null, pl: null, 
                liquidez: null, val_mercado: null,
                segmento: null,
                roe: null, margem_liquida: null, margem_bruta: null,
                cagr_receita_5a: null, cagr_lucros_5a: null,
                divida_liquida_ebitda: null, ev_ebitda: null,
                lpa: null, vpa: null,
                vacancia: null, ultimo_rendimento: null, num_cotistas: null, 
                patrimonio_liquido: null,
                taxa_adm: null, tipo_gestao: null
            };

            // 1. Extração de Cards (Indicadores)
            $('div._card, .indicator-box').each((_, el) => {
                const label = $(el).find('div._card-header, .name, .title').first().text().trim();
                const value = $(el).find('div._card-body, .value, .data').first().text().trim();
                if (label && value) {
                    const key = mapLabelToKey(label);
                    if (key) {
                        if (['segmento', 'tipo_gestao', 'taxa_adm'].includes(key)) {
                            dados[key] = value;
                        } else {
                            const p = parseMoneySmart(value); // Reusa logica smart para numeros
                            if (p !== null) dados[key] = p;
                        }
                    }
                }
            });

            // 2. Extração de Tabelas de Dados Gerais
            $('#table-indicators .cell, #table-general-data .cell').each((_, el) => {
                const label = $(el).find('span:first-child').text().trim();
                const value = $(el).find('span:last-child').text().trim();
                const key = mapLabelToKey(label);
                if (key && dados[key] === null) {
                    const p = parseMoneySmart(value);
                    if (p !== null) dados[key] = p;
                }
            });

            // Extração de Segmento (Breadcrumbs)
            if (!dados.segmento) {
                $('#breadcrumbs li, .breadcrumbs li').each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt && !['Início', 'Home', 'Ações', 'FIIs', 'BDRs', 'Fiagros'].includes(txt) && txt.toUpperCase() !== ticker) {
                        dados.segmento = txt;
                    }
                });
            }

            // --- INTELIGÊNCIA DE DIVIDENDOS ---
            // Procura TODAS as tabelas, não apenas por ID.
            // Analisa cada linha para ver se contém o padrão: [DATA] + [VALOR MONETÁRIO]
            const dividendsFound: any[] = [];
            
            $('table').each((_, table) => {
                $(table).find('tr').each((__, tr) => {
                    const tds = $(tr).find('td');
                    if (tds.length < 2) return; // Linha muito curta

                    let rowDateCom: string | null = null;
                    let rowDatePay: string | null = null;
                    let rowValue: number | null = null;
                    let rowType: string = 'DIV';
                    let foundPercentage = false;

                    // Escaneia células da linha
                    tds.each((___, td) => {
                        const txt = $(td).text().trim();
                        
                        // 1. É Data?
                        const d = parseDateSmart(txt);
                        if (d) {
                            if (!rowDateCom) rowDateCom = d; // Primeira data é Datacom
                            else rowDatePay = d; // Segunda data é Pagamento
                            return;
                        }

                        // 2. É Tipo?
                        if (txt.length < 20 && (normalize(txt).includes('jcp') || normalize(txt).includes('dividendo') || normalize(txt).includes('rendimento'))) {
                            rowType = identifyTypeSmart(txt);
                            return;
                        }

                        // 3. É Porcentagem? (Yield - IGNORAR PARA VALOR)
                        if (txt.includes('%')) {
                            foundPercentage = true;
                            return; 
                        }

                        // 4. É Valor Monetário? (Prioridade para valores com R$ ou decimais claros)
                        const v = parseMoneySmart(txt);
                        if (v !== null) {
                            // Se já temos um valor, ficamos com o maior (assumindo que o menor pode ser imposto ou erro)
                            // OU ficamos com o último encontrado (geralmente Líquido na direita)
                            rowValue = v;
                        }
                    });

                    // Validação Heurística:
                    // Precisa ter pelo menos DataCom e Valor.
                    if (rowDateCom && rowValue !== null) {
                        dividendsFound.push({
                            ticker: ticker.toUpperCase(),
                            type: rowType,
                            date_com: rowDateCom,
                            payment_date: rowDatePay || null, // Pode ser null (A definir)
                            rate: rowValue
                        });
                    }
                });
            });

            if (dividendsFound.length > 0) {
                finalDividends = dividendsFound;
            }

            // Fallback de DY calculado se faltar
            if (!dados.dy && dados.ultimo_rendimento && dados.cotacao_atual) {
                dados.dy = (dados.ultimo_rendimento / dados.cotacao_atual) * 100 * 12;
            }

            // Cleanup
            Object.keys(dados).forEach(k => {
                if (dados[k] === null || dados[k] === undefined || dados[k] === '') delete dados[k];
            });

            finalData = {
                ...dados,
                dy_12m: dados.dy,
                current_price: dados.cotacao_atual,
            };
            
            // Se encontrou dados válidos, para o loop de URLs
            if (finalData.current_price || finalDividends.length > 0) break;

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
        // Cache Check (Supabase)
        if (!force) {
            const { data: existing } = await supabase
                .from('ativos_metadata')
                .select('*')
                .eq('ticker', ticker)
                .single();
            
            if (existing && existing.updated_at) {
                const age = Date.now() - new Date(existing.updated_at).getTime();
                // Cache de 3h para dados gerais, mas se não tiver DY, tenta atualizar em 1h
                const cacheTime = existing.dy_12m ? 10800000 : 3600000; 
                
                if (age < cacheTime) {
                     const { data: divs } = await supabase
                        .from('market_dividends')
                        .select('*')
                        .eq('ticker', ticker);
                    return res.status(200).json({ success: true, data: existing, dividends: divs || [], cached: true });
                }
            }
        }

        // Live Scrape
        const result = await scrapeInvestidor10(ticker);
        
        if (!result) {
            return res.status(404).json({ success: false, error: 'Falha ao obter dados (Fonte indisponível).' });
        }

        const { metadata, dividends } = result;

        // Persistência Metadata
        if (metadata) {
            const dbPayload = { ...metadata };
            // Remove campos calculados não presentes no DB se necessário, ou mapeia
            delete dbPayload.dy; 
            delete dbPayload.cotacao_atual; 
            
            const { error } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (error) console.warn('Metadata save warning:', error.message);
        }

        // Persistência Dividendos (Lógica Inteligente de Merge)
        if (dividends.length > 0) {
             const today = new Date().toISOString().split('T')[0];
             
             // Remove proventos FUTUROS existentes para evitar duplicatas de projeção antiga
             // Mantém histórico passado
             await supabase.from('market_dividends')
                .delete()
                .eq('ticker', ticker.toUpperCase())
                .gte('payment_date', today);

             // Deduplica payload
             const uniqueDivs = Array.from(new Map(dividends.map(item => [
                `${item.type}-${item.date_com}-${item.rate.toFixed(4)}`, item
            ])).values());
            
            const { error } = await supabase.from('market_dividends').upsert(uniqueDivs, { onConflict: 'ticker,type,date_com,rate' });
            if (error) console.warn('Dividends save warning:', error.message);
        }

        return res.status(200).json({ success: true, data: metadata, dividends });

    } catch (e: any) {
        console.error('Update Stock Fatal:', e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
