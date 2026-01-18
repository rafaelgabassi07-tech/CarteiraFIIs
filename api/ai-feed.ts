
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

    const CHUNK_SIZE = 20; 
    const results: any[] = [];

    const baseSystemInstruction = `
        Você é um Crawler de Dados Financeiros especializado no site Investidor10.
        
        FONTE DE DADOS OBRIGATÓRIA:
        Use a ferramenta de busca para acessar dados atualizados de **investidor10.com.br** para cada ativo.
        
        OBJETIVO:
        Retornar um JSON Array com os indicadores fundamentalistas exatos encontrados no site.
        
        MAPEAMENTO DE CAMPOS:
        - p_vp: "P/VP"
        - dy_12m: "Dividend Yield"
        - market_cap: "Valor de Mercado"
        - liquidity: "Liquidez Diária"
        - assets_value: "Valor Patrimonial" ou "Patrimônio Líquido"
        - management_type: "Tipo de Gestão"
        - last_dividend: "Último Rendimento"
        - vacancy: "Vacância Física"
        - p_l: "P/L"
        - roe: "ROE"
        - net_debt_ebitda: "Dív. Líquida/EBITDA"
        
        FORMATO:
        Retorne APENAS o JSON puro. Sem Markdown. Use 0 ou "-" se o dado não existir.
    `;

    for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const batch = allTickers.slice(i, i + CHUNK_SIZE);
        
        const prompt = `
          Extraia fundamentos de: ${batch.join(', ')}.
          Pesquise: "site:investidor10.com.br ${batch.join(' OR ')}".
        `;

        try {
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1,
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
