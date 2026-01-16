// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Tenta usar a Service Role Key para ignorar RLS (permissões), senão usa a Key padrão
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- CONFIGURAÇÃO DE HEADER PARA EVITAR BLOQUEIOS ---

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];

const getRandomAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const httpsAgent = new https.Agent({ 
    keepAlive: true, 
    rejectUnauthorized: false 
});

async function fetchHtml(url, retries = 3) {
    try {
        const client = axios.create({
            httpsAgent,
            headers: {
                'User-Agent': getRandomAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://google.com/'
            },
            timeout: 15000 
        });
        const { data } = await client.get(url);
        return data;
    } catch (err) {
        if (retries > 0) {
            console.warn(`[Retry] Erro em ${url}: ${err.message}. Tentando novamente...`);
            await new Promise(r => setTimeout(r, 2000));
            return fetchHtml(url, retries - 1);
        }
        throw err;
    }
}

function parseValue(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim().replace(/R\$|%|\s/g, '');
    if (s === '-' || s === '--' || s === '') return 0;
    
    // Formato Brasileiro: 1.000,00 -> 1000.00
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}

const KEY_MAP = {
    'cotacao': 'current_price', 'valoratual': 'current_price', 'preoco': 'current_price',
    'pvp': 'pvp', 'p/vp': 'pvp', 'vp': 'pvp',
    'pl': 'pl', 'p/l': 'pl',
    'dy': 'dy_12m', 'dividendyield': 'dy_12m', 'yield': 'dy_12m',
    'roe': 'roe',
    'vacancia': 'vacancia', 'vacanciafisica': 'vacancia',
    'liquidez': 'liquidez', 'liquidezmediadiaria': 'liquidez',
    'valordemercado': 'valor_mercado', 'patrimonio': 'valor_mercado'
};

function normalizeKey(text) {
    return text?.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "").trim() || '';
}

async function scrapeInvestidor10(ticker, type) {
    // Tenta URL principal
    let url = `https://investidor10.com.br/${type}/${ticker.toLowerCase()}/`;
    let html;

    try {
        html = await fetchHtml(url);
    } catch (e) {
        // Se falhar (ex: 404 porque errou o tipo), tenta o outro tipo
        const altType = type === 'fiis' ? 'acoes' : 'fiis';
        url = `https://investidor10.com.br/${altType}/${ticker.toLowerCase()}/`;
        try {
            html = await fetchHtml(url);
            type = altType; // Corrige o tipo se achou no alternativo
        } catch {
            return null;
        }
    }

    const $ = cheerio.load(html);
    const result = {
        ticker: ticker.toUpperCase(),
        type: type === 'fiis' ? 'FII' : 'ACAO',
        updated_at: new Date().toISOString()
    };

    // Estratégia 1: Cards do Topo (_card)
    $('div._card').each((_, card) => {
        const keyText = $(card).find('div._card-header').text();
        const valText = $(card).find('div._card-body').text();
        const key = normalizeKey(keyText);
        if (KEY_MAP[key]) {
            result[KEY_MAP[key]] = ['liquidez', 'valor_mercado'].includes(KEY_MAP[key]) 
                ? valText.trim() 
                : parseValue(valText);
        }
    });

    // Estratégia 2: Tabela de Indicadores (#table-indicators .cell)
    $('#table-indicators .cell').each((_, cell) => {
        const keyText = $(cell).find('.name').text();
        const valText = $(cell).find('.value').text();
        const key = normalizeKey(keyText);
        if (KEY_MAP[key]) {
             result[KEY_MAP[key]] = ['liquidez', 'valor_mercado'].includes(KEY_MAP[key]) 
                ? valText.trim() 
                : parseValue(valText);
        }
    });
    
    // Segmento
    let segmento = 'Geral';
    // Tenta pegar do breadcrumb ou tags
    $('#breadcrumbs li a span').each((_, el) => {
        const t = $(el).text().trim();
        if (t && !['Início', 'Ações', 'FIIs', 'Home', ticker].includes(t)) segmento = t;
    });
    result['segment'] = segmento;

    return result;
}

export default async function handler(req, res) {
    // Permite CORS para chamada direta do App
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ticker = String(req.query.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    try {
        const isFII = ticker.endsWith('11') || ticker.endsWith('11B');
        const initialType = isFII ? 'fiis' : 'acoes';

        const data = await scrapeInvestidor10(ticker, initialType);
        
        if (data) {
            // Salva no Supabase
            const { error } = await supabase.from('ativos_metadata').upsert(data, { onConflict: 'ticker' });
            
            if (error) console.error('Supabase Error:', error);

            return res.status(200).json({ success: true, data });
        } else {
            return res.status(404).json({ error: 'Dados não encontrados no site fonte.' });
        }

    } catch (e) {
        console.error(`Erro fatal em ${ticker}:`, e);
        return res.status(500).json({ error: e.message });
    }
}