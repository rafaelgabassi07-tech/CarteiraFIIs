
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuração Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Inicializa Gemini 2.5
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper para limpar JSON vindo de Markdown (ex: ```json ... ```)
function cleanJsonString(str: string): string {
    if (!str) return '[]';
    // Remove blocos de código markdown
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    // Tenta encontrar o início e fim do array JSON
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tickers } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Lista de tickers inválida.' });
    }

    // Normaliza tickers
    const allTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
    
    if (allTickers.length === 0) return res.json({ data: [] });

    // Processamos em lotes para evitar timeouts e limites de tokens
    const CHUNK_SIZE = 10; 
    const results: any[] = [];

    // Prompt Otimizado para Texto Puro (JSON no corpo)
    const baseSystemInstruction = `
        Você é um analista financeiro expert em B3. 
        Sua tarefa é usar a ferramenta Google Search para buscar dados fundamentalistas ATUALIZADOS (2024/2025).
        
        Você DEVE retornar APENAS um JSON Array válido, sem texto adicional, sem markdown, sem explicações.
        
        Estrutura do Objeto JSON para cada ativo:
        {
          "ticker": "STRING",
          "type": "FII" ou "ACAO",
          "segment": "STRING (Setor)",
          "p_vp": NUMBER (P/VP),
          "dy_12m": NUMBER (Dividend Yield 12m em %),
          "market_cap": "STRING (Valor Mercado Formatado ex: 1.2B)",
          "liquidity": "STRING (Liquidez Diária)",
          "p_l": NUMBER (P/L - Apenas Ações, 0 se FII),
          "roe": NUMBER (ROE % - Apenas Ações, 0 se FII),
          "vacancy": NUMBER (Vacância Física % - Apenas FIIs, 0 se Ação),
          "assets_value": "STRING (Valor Patrimonial Formatado)",
          "management_type": "STRING (Gestão Ativa/Passiva)",
          "management_fee": "STRING (Taxa Adm)",
          "net_margin": NUMBER (Margem Líq %),
          "net_debt_ebitda": NUMBER (Dívida Líq/EBITDA),
          "ev_ebitda": NUMBER (EV/EBITDA),
          "last_dividend": NUMBER (Último Provento R$)
        }
        
        Se um dado não for encontrado, use 0 ou null.
    `;

    for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const batch = allTickers.slice(i, i + CHUNK_SIZE);
        
        const prompt = `
          Busque dados fundamentalistas para: ${batch.join(', ')}.
          Retorne o JSON Array com os dados.
        `;

        try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                // IMPORTANTE: Removemos responseSchema e responseMimeType pois conflitam com Google Search em alguns modelos
                temperature: 0.1,
                systemInstruction: baseSystemInstruction
              }
            });

            const rawText = response.text || '';
            const cleanedJson = cleanJsonString(rawText);
            const batchResults = JSON.parse(cleanedJson);
            
            if (Array.isArray(batchResults)) {
                results.push(...batchResults);
            }
        } catch (innerErr) {
            console.error(`Erro no lote ${i} (${batch.join(',')}):`, innerErr);
        }
    }

    // Mapeamento e Salvamento no Banco
    const dbPayload = results.map((item: any) => ({
        ticker: item.ticker,
        type: item.type,
        segment: item.segment || 'Geral',
        pvp: item.p_vp || 0,
        dy_12m: item.dy_12m || 0,
        pl: item.p_l || 0,
        roe: item.roe || 0,
        vacancia: item.vacancy || 0,
        valor_mercado: item.market_cap,
        liquidez: item.liquidity,
        tipo_gestao: item.management_type,
        taxa_adm: item.management_fee,
        margem_liquida: item.net_margin,
        divida_liquida_ebitda: item.net_debt_ebitda,
        ev_ebitda: item.ev_ebitda,
        ultimo_rendimento: item.last_dividend,
        patrimonio_liquido: item.assets_value,
        updated_at: new Date().toISOString()
    }));

    if (dbPayload.length > 0) {
        const { error } = await supabase.from('ativos_metadata').upsert(dbPayload, { onConflict: 'ticker' });
        if (error) console.error("Erro Supabase:", error);
    }

    return res.status(200).json({ 
        success: true, 
        data: dbPayload, 
        count: dbPayload.length,
        source: 'Gemini 2.5 Flash Fundamentals' 
    });

  } catch (error: any) {
    console.error("Gemini AI Feed Fatal:", error);
    return res.status(500).json({ error: error.message });
  }
}
