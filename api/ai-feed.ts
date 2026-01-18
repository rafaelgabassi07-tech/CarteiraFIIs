
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuração Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- HELPERS DE LIMPEZA E PARSE ---

function cleanJsonString(str: string): string {
    if (!str) return '[]';
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned;
}

function parseRobustNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (!val || val === 'N/A' || val === '-' || val === '--') return 0;
    
    let str = String(val).trim();
    str = str.replace(/[R$%\s]/g, '');
    
    if (str.includes(',')) {
        str = str.replace(/\./g, '');
        str = str.replace(',', '.');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.API_KEY) {
      return res.status(500).json({ error: "API Key not configured" });
  }

  try {
    // Inicializa dentro do handler para garantir acesso às env vars
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const { tickers } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Lista de tickers inválida.' });
    }

    const allTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
    
    if (allTickers.length === 0) return res.json({ data: [] });

    // Tamanho do lote ajustado para modelo Pro
    const CHUNK_SIZE = 10; 
    const results: any[] = [];

    const baseSystemInstruction = `
        Você é um Extrator de Dados Financeiros de Alta Precisão.
        
        FONTE: Use o Google Search para encontrar os dados ATUAIS no site "investidor10.com.br" ou "statusinvest.com.br".
        
        EXTRAÇÃO:
        Retorne um JSON Array com objetos contendo:
        - p_vp, dy_12m, market_cap, liquidity
        - assets_value (Patrimônio Líquido)
        - management_type (Gestão Ativa/Passiva)
        - last_dividend (Valor em R$)
        - vacancy (Vacância Física %)
        - p_l, roe, net_debt_ebitda
        
        IMPORTANTE: Se o dado não existir, use "-". Seja preciso nos números.
    `;

    for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const batch = allTickers.slice(i, i + CHUNK_SIZE);
        
        const prompt = `
          Extraia fundamentos numéricos exatos para: ${batch.join(', ')}.
        `;

        try {
            const response = await ai.models.generateContent({
              model: 'gemini-1.5-pro-002', // Modelo Produção Estável
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.0, // Zero criatividade, apenas dados
                systemInstruction: baseSystemInstruction
              }
            });

            const rawText = response.text || '';
            const cleanedJson = cleanJsonString(rawText);
            
            try {
                const batchResults = JSON.parse(cleanedJson);
                if (Array.isArray(batchResults)) {
                    results.push(...batchResults);
                }
            } catch (jsonErr) {
                console.error(`Erro parse JSON lote ${i}:`, jsonErr);
            }
        } catch (innerErr) {
            console.error(`Erro API Gemini lote ${i}:`, innerErr);
        }
    }

    const dbPayload = results.map((item: any) => ({
        ticker: item.ticker ? item.ticker.toUpperCase() : '',
        type: item.type,
        segment: item.segment || 'Geral',
        pvp: parseRobustNumber(item.p_vp),
        dy_12m: parseRobustNumber(item.dy_12m),
        pl: parseRobustNumber(item.p_l),
        roe: parseRobustNumber(item.roe),
        vacancia: parseRobustNumber(item.vacancy),
        margem_liquida: parseRobustNumber(item.net_margin),
        divida_liquida_ebitda: parseRobustNumber(item.net_debt_ebitda),
        ev_ebitda: parseRobustNumber(item.ev_ebitda),
        ultimo_rendimento: parseRobustNumber(item.last_dividend),
        valor_mercado: item.market_cap || '-',
        liquidez: item.liquidity || '-',
        patrimonio_liquido: item.assets_value || '-',
        tipo_gestao: item.management_type || '-',
        updated_at: new Date().toISOString()
    })).filter(item => item.ticker !== '');

    if (dbPayload.length > 0) {
        const { error } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        if (error) console.error("Erro Supabase Upsert:", error);
    }

    return res.status(200).json({ 
        success: true, 
        count: dbPayload.length,
        data: dbPayload 
    });

  } catch (error: any) {
    console.error("Gemini Feed Fatal:", error);
    return res.status(500).json({ error: error.message });
  }
}
