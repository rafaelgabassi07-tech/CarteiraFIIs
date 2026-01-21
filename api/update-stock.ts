
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

async function fetchHTML(url: string, referer: string) {
    for (let i = 0; i < 2; i++) {
        try {
            const response = await axios.get(url, {
                httpsAgent,
                headers: {
                    'User-Agent': getRandomAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': referer,
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000
            });
            return response.data;
        } catch (e: any) {
            if (e.response?.status === 404) throw e; 
            if (i === 1) throw e;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

// --- HELPERS DE PARSING AVANÇADO ---

function parseValue(valueStr: any): number {
    if (!valueStr) return 0;
    if (typeof valueStr === 'number') return valueStr;
    
    let str = String(valueStr).trim();
    if (!str || str === '-' || str === 'N/A' || str === '--') return 0;

    try {
        // Estratégia: Limpar tudo que não é número, vírgula, ponto ou traço
        // Preserva o sinal negativo se estiver no início
        const isNegative = str.startsWith('-');
        
        // Remove caracteres de moeda, porcentagem e letras
        str = str.replace(/[^0-9,.-]/g, ''); 
        
        // Lógica Brasileira (PT-BR): Vírgula é decimal
        if (str.includes(',')) {
            str = str.replace(/\./g, ''); // Remove milhar (pontos)
            str = str.replace(',', '.');  // Transforma vírgula em ponto
        } else {
            // Se não tem vírgula, mas tem ponto:
            // "1.200" -> Pode ser 1200 ou 1.2. Assumimos 1200 se for > 100 ou se tiver cara de milhar
            // Mas em sites BR, 10.50 geralmente não existe, é 10,50. 
            // Se tiver ponto, removemos assumindo que é milhar, a menos que seja pequeno.
            // Para simplificar: No Investidor10, números inteiros grandes usam ponto (ex: cotas).
        }

        const num = parseFloat(str);
        if (isNaN(num)) return 0;
        return isNegative && num > 0 ? -num : num;
    } catch { return 0; }
}

function normalizeKey(str: string) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, "") // Remove especiais
        .trim();
}

// Mapa de chaves normalizadas para colunas do Banco de Dados
const KEY_MAP: Record<string, string> = {
    // Cotação
    'cotacao': 'cotacao_atual', 'valoratual': 'cotacao_atual', 'preco': 'cotacao_atual',
    
    // Valuation
    'pvp': 'pvp', 'vp': 'pvp', 'psobrevp': 'pvp',
    'pl': 'pl', 'psorel': 'pl', 'precolucro': 'pl',
    'dy': 'dy', 'dividendyield': 'dy', 'dy12m': 'dy',
    'vpa': 'vp_cota', 'vpporcota': 'vp_cota', 'valorpatrimonialporcota': 'vp_cota',
    'lpa': 'lpa', 'lucroporacao': 'lpa',
    'evebitda': 'ev_ebitda',
    
    // Eficiência
    'roe': 'roe',
    'margemliquida': 'margem_liquida',
    'margembruta': 'margem_bruta',
    'margemebit': 'margem_ebit',
    'dividaliquidaebitda': 'divida_liquida_ebitda',
    
    // Crescimento
    'cagrreceita5anos': 'cagr_receita_5a', 
    'cagrlucros5anos': 'cagr_lucros_5a',
    
    // FIIs Específico
    'vacanciafisica': 'vacancia', 'vacancia': 'vacancia',
    'ultimorendimento': 'ultimo_rendimento', 'rendimento': 'ultimo_rendimento', 'ultrendimento': 'ultimo_rendimento',
    'patrimonioliquido': 'patrimonio_liquido',
    'numerodecotistas': 'num_cotistas', 'cotistas': 'num_cotistas',
    'taxadeadministracao': 'taxa_adm',
    'segmento': 'segmento', 'segmentodeatuacao': 'segmento',
    'tipodegestao': 'tipo_gestao',
    
    // Geral
    'liquidezmediadiaria': 'liquidez', 'liquidez': 'liquidez',
    'valordemercado': 'val_mercado'
};

// ---------------------------------------------------------
// SCRAPER ENGINE "HUNTER"
// ---------------------------------------------------------

async function scrapeInvestidor10(ticker: string) {
    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        
        const strategies = isFII 
            ? [`/fiis/${ticker.toLowerCase()}/`, `/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`]
            : [`/acoes/${ticker.toLowerCase()}/`, `/bdrs/${ticker.toLowerCase()}/`, `/fiis/${ticker.toLowerCase()}/`];

        let html = null;
        let finalType = isFII ? 'FII' : 'ACAO';

        for (const path of strategies) {
            try {
                html = await fetchHTML(`https://investidor10.com.br${path}`, 'https://investidor10.com.br');
                if (path.includes('fiis')) finalType = 'FII';
                else if (path.includes('bdrs')) finalType = 'BDR';
                else finalType = 'ACAO';
                break;
            } catch (e) { /* continue */ }
        }

        if (!html) throw new Error('Página não encontrada');

        const $ = cheerio.load(html);
        const extracted: any = {};

        // --- ESTRATÉGIA "HUNTER" (CAÇADOR) ---
        // Em vez de procurar classes específicas, procuramos pelo TEXTO do rótulo e pegamos o valor próximo.
        // Isso é muito mais robusto contra mudanças de layout.

        // Lista de textos que nos interessam (chaves do mapa desnormalizadas para busca fuzzy)
        const targetTexts = [
            'P/VP', 'Dividend Yield', 'DY', 'Cotação', 'P/L', 'Vacância Física', 
            'Último Rendimento', 'Valor de Mercado', 'Liquidez', 'ROE', 'VPA', 
            'Margem Líquida', 'Dívida Líquida / EBITDA', 'Patrimônio Líquido'
        ];

        // Varre todos os elementos que podem conter labels
        $('span, div, td, strong, b, h3, h4').each((_, el) => {
            // Pega apenas o texto direto do elemento, sem filhos, para evitar pegar o card inteiro
            const text = $(el).clone().children().remove().end().text().trim();
            
            if (!text || text.length > 50) return; // Ignora textos longos

            // Verifica se o texto contém algum dos nossos alvos
            // Normaliza para comparação
            const normText = normalizeKey(text);
            
            if (KEY_MAP[normText]) {
                const dbKey = KEY_MAP[normText];
                
                // Se já temos valor, pula (prioriza ocorrências no topo da página)
                if (extracted[dbKey]) return;

                // Tenta encontrar o valor nas proximidades:
                
                // 1. Irmão (Sibling)
                let value = $(el).next().text().trim();
                if (!value) value = $(el).siblings('.value').text().trim();
                if (!value) value = $(el).siblings('span').text().trim();
                
                // 2. Filho do Pai (Tio/Primo) - Comum em cards
                // Ex: <div class="card"><div class="header">Label</div><div class="body">Value</div></div>
                if (!value) {
                    const parent = $(el).parent();
                    value = parent.find('.value').text().trim();
                    if (!value) value = parent.next().text().trim(); // Se header e body são irmãos
                    if (!value) value = parent.find('div[class*="body"] span').text().trim();
                    if (!value) value = parent.find('span').last().text().trim();
                }

                // 3. Estrutura de Tabela (td anterior -> td atual)
                if (!value && $(el).is('td')) {
                    value = $(el).next('td').text().trim();
                }

                // Salva se achou algo que parece valor (contém número ou R$)
                if (value && (/[0-9]/.test(value) || value === '-')) {
                    extracted[dbKey] = value;
                }
            }
        });

        // --- FALLBACKS ESPECÍFICOS (SELETORES RÍGIDOS) ---
        // Caso o Hunter falhe, tentamos seletores conhecidos do Investidor10
        
        // Cotação no Header
        if (!extracted.cotacao_atual) {
            const headerVal = $('div._card.cotacao div._card-body span').text();
            if (headerVal) extracted.cotacao_atual = headerVal;
        }

        // Cards Padrão
        if (!extracted.dy) {
            $('div._card').each((_, el) => {
                const title = $(el).find('._card-header').text().toLowerCase();
                if (title.includes('dy') || title.includes('yield')) {
                    extracted.dy = $(el).find('._card-body').text();
                }
            });
        }

        // PÓS-PROCESSAMENTO
        const result = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            segmento: extracted.segmento || 'Geral',
            updated_at: new Date().toISOString(),
            
            // Valores Numéricos
            cotacao_atual: parseValue(extracted.cotacao_atual),
            dy: parseValue(extracted.dy),
            pvp: parseValue(extracted.pvp),
            pl: parseValue(extracted.pl),
            roe: parseValue(extracted.roe),
            vp_cota: parseValue(extracted.vp_cota),
            lpa: parseValue(extracted.lpa),
            vacancia: parseValue(extracted.vacancia),
            ultimo_rendimento: parseValue(extracted.ultimo_rendimento),
            
            // Margens e Dívidas
            margem_liquida: parseValue(extracted.margem_liquida),
            margem_bruta: parseValue(extracted.margem_bruta),
            divida_liquida_ebitda: parseValue(extracted.divida_liquida_ebitda),
            ev_ebitda: parseValue(extracted.ev_ebitda),
            cagr_receita_5a: parseValue(extracted.cagr_receita_5a),
            cagr_lucros_5a: parseValue(extracted.cagr_lucros_5a),

            // Strings / Mistos
            liquidez: extracted.liquidez || 'N/A',
            val_mercado: extracted.val_mercado || 'N/A',
            tipo_gestao: extracted.tipo_gestao || 'N/A',
            taxa_adm: extracted.taxa_adm || 'N/A',
            patrimonio_liquido: extracted.patrimonio_liquido || 'N/A',
            num_cotistas: extracted.num_cotistas || 'N/A'
        };

        return result;

    } catch (e: any) {
        console.error(`Erro Scraping ${ticker}: ${e.message}`);
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
            if (d.et === 3) labelTipo = 'REND'; 
            
            return {
                ticker: ticker.toUpperCase(),
                type: labelTipo,
                date_com: parseDateJSON(d.ed),
                payment_date: parseDateJSON(d.pd),
                rate: d.v
            };
        }).filter((d: any) => d.payment_date !== null && d.rate > 0);

    } catch (error: any) { 
        return []; 
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
        const proventos = await scrapeStatusInvestProventos(ticker);
        
        if (metadata) {
            const dbPayload = {
                ticker: metadata.ticker,
                type: metadata.type,
                segment: metadata.segmento,
                pvp: metadata.pvp,
                pl: metadata.pl,
                dy_12m: metadata.dy,
                roe: metadata.roe,
                vacancia: metadata.vacancia,
                liquidez: metadata.liquidez,
                valor_mercado: metadata.val_mercado,
                updated_at: metadata.updated_at,
                lpa: metadata.lpa,
                vpa: metadata.vp_cota,
                margem_liquida: metadata.margem_liquida,
                margem_bruta: metadata.margem_bruta,
                divida_liquida_ebitda: metadata.divida_liquida_ebitda,
                ev_ebitda: metadata.ev_ebitda,
                cagr_receita: metadata.cagr_receita_5a,
                cagr_lucro: metadata.cagr_lucros_5a,
                tipo_gestao: metadata.tipo_gestao,
                patrimonio_liquido: metadata.patrimonio_liquido,
                taxa_adm: metadata.taxa_adm,
                ultimo_rendimento: metadata.ultimo_rendimento
            };

            const { error: metaError } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
            if (metaError) console.error('Supabase Meta Error:', metaError);
        }

        if (proventos.length > 0) {
             await supabase.from('market_dividends').upsert(proventos, { 
                onConflict: 'ticker, type, date_com, payment_date, rate', 
                ignoreDuplicates: true 
            });
        }

        if (!metadata) {
            return res.status(404).json({ success: false, error: 'Dados não encontrados.' });
        }

        // Retorna o objeto exatamente como esperado pelo frontend
        return res.status(200).json({ success: true, data: metadata, dividends: proventos });

    } catch (e: any) {
        console.error(`Erro Handler ${ticker}:`, e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
