
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
    timeout: 15000,
    maxRedirects: 5
});

// --- HELPERS DE PARSEAMENTO ---
const REGEX_NORMALIZE = /[\u0300-\u036f]/g;

function normalize(str: string) {
    if (!str) return '';
    return str.normalize("NFD").replace(REGEX_NORMALIZE, "").toLowerCase().trim();
}

function parseValue(valueStr: any) {
    if (!valueStr) return 0;
    try {
        if (typeof valueStr === 'number') return valueStr;
        
        let str = String(valueStr).trim();
        
        // Remove sufixos comuns de moeda/percentual
        str = str.replace(/^R\$\s?/, '').replace(/%$/, '').trim();
        
        if (!str || str === '-' || str === 'N/A') return 0;

        // Suporte a sufixos de magnitude (B = Bilhão, M = Milhão, K = Milhar)
        let multiplier = 1;
        if (str.toUpperCase().endsWith('B')) { multiplier = 1000000000; str = str.slice(0, -1); }
        else if (str.toUpperCase().endsWith('M')) { multiplier = 1000000; str = str.slice(0, -1); }
        else if (str.toUpperCase().endsWith('K')) { multiplier = 1000; str = str.slice(0, -1); }

        // Limpeza final de caracteres invisíveis
        str = str.replace(/\s/g, '').replace(/\u00A0/g, '');

        const clean = str.replace(/[^0-9,.-]+/g, ""); 
        
        if (!clean) return 0;

        const hasComma = clean.includes(',');
        const hasDot = clean.includes('.');

        let result = 0;

        // Lógica de detecção de formato numérico (BR vs US)
        if (hasComma && !hasDot) {
             // 1000,00 -> BR
             result = parseFloat(clean.replace(',', '.')) || 0;
        } else if (!hasComma && hasDot) {
             // 1000.00 (US) ou 1.000 (BR milhar) - Assumimos BR se não tiver decimais óbvios, mas aqui removemos ponto
             // Contexto Investidor10: Pontos costumam ser milhar.
             result = parseFloat(clean.replace(/\./g, '')) || 0;
        } else if (hasComma && hasDot) {
             // Misto: 1.000,00 (BR) vs 1,000.00 (US)
             if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                 // BR: Ponto é milhar, Vírgula é decimal
                 result = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
             } else {
                 // US: Vírgula é milhar, Ponto é decimal
                 result = parseFloat(clean.replace(/,/g, '')) || 0;
             }
        } else {
            // Apenas números
            result = parseFloat(clean) || 0;
        }

        return result * multiplier;
    } catch (e) { return 0; }
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

async function fetchHtmlWithRetry(ticker: string) {
    const tickerLower = ticker.toLowerCase();
    const isLikelyFii = ticker.endsWith('11') || ticker.endsWith('11B');
    
    const urlFii = `https://investidor10.com.br/fiis/${tickerLower}/`;
    const urlAcao = `https://investidor10.com.br/acoes/${tickerLower}/`;
    const urlBdr = `https://investidor10.com.br/bdrs/${tickerLower}/`;

    // Prioriza URL baseado no padrão do ticker
    const urls = isLikelyFii ? [urlFii, urlAcao, urlBdr] : [urlAcao, urlFii, urlBdr];

    for (const url of urls) {
        try {
            const res = await client.get(url);
            let type = 'ACAO';
            if (url.includes('/fiis/')) type = 'FII';
            else if (url.includes('/bdrs/')) type = 'BDR';
            return { data: res.data, type };
        } catch (e: any) {
            if (e.response && e.response.status === 404) continue;
            // Se for erro de rede, tenta o próximo
            continue;
        }
    }
    throw new Error('Asset not found');
}

async function scrapeInvestidor10(ticker: string) {
    try {
        const { data: html, type: finalType } = await fetchHtmlWithRetry(ticker);
        const $ = cheerio.load(html);

        const dados: any = {
            ticker: ticker.toUpperCase(),
            type: finalType,
            updated_at: new Date().toISOString(),
            dy: null, pvp: null, pl: null, 
            liquidez: null, val_mercado: null,
            segmento: null,
            roe: null, margem_liquida: null, margem_bruta: null,
            cagr_receita_5a: null, cagr_lucros_5a: null,
            divida_liquida_ebitda: null, ev_ebitda: null,
            lpa: null, vp_cota: null, vpa: null,
            vacancia: null, ultimo_rendimento: null, num_cotistas: null, patrimonio