
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuração Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Inicializa Gemini 2.5
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPERS DE LIMPEZA E PARSE ---

// Remove blocos de código Markdown (```json ... ```)
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

// Converte formatos variados (1.000,00 | 10,5% | R$ 10) para float JS (1000.00 | 10.5 | 10)
function parseRobustNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (!val || val === 'N/A' || val === '-') return 0;
    
    let str = String(val).trim();
    
    // Tratamento de multiplicadores (B = Bilhão, M = Milhão - comum em Market Cap)
    let multiplier = 1;
    if (str.toUpperCase().includes('B')) multiplier = 1; // Geralmente MarketCap já vem formatado ou queremos manter a grandeza
    // Mas para campos numéricos puros como P/L, DY, etc, removemos sufixos não numéricos exceto . , -
    
    // Remove R$, %, espaços
    str = str.replace(/[R$%\s]/g, '');
    
    // Tratamento de formato BR (1.000,00) vs US (1,000.00)
    // Se tem vírgula e não tem ponto, assume vírgula como decimal (10,5 -> 10.5)
    if (str.includes(',') && !str.includes('.')) {
        str = str.replace(',', '.');
    } 
    // Se tem ponto e vírgula (1.200,50), remove ponto e troca vírgula
    else if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
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

  try {
    const { tickers } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Lista de tickers inválida.' });
    }

    const allTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
    
    if (allTickers.length === 0) return res.json({ data: [] });

    // Lote reduzido para garantir qualidade da busca
    const CHUNK_SIZE = 5; 
    const results: any[] = [];

    const baseSystemInstruction = `
        Você é um API de dados financeiros.
        
        OBJETIVO:
        Pesquise no Google (statusinvest, investidor10, funds explorer) os fundamentos MAIS RECENTES (2024/2025) para os ativos solicitados.
        
        REGRAS DE RETORNO:
        1. Retorne APENAS um JSON Array puro. Sem Markdown. Sem explicações.
        2. Use 0 para dados numéricos não encontrados.
        3. Para campos percentuais (DY, Vacância), retorne o número (ex: 10.5 para 10,5%).
        4. Identifique corretamente se é FII ou ACAO pelo ticker (final 11 geralmente FII, 3/4 Ação).
        
        SCHEMA DO JSON (obrigatório seguir estas chaves exatas):
        [
          {
            "ticker": "AAAA11",
            "type": "FII" | "ACAO",
            "segment": "Logística/Bancos/etc",
            "p_vp": number,
            "dy_12m": number,
            "market_cap": "string formatada (ex: 1.2B)",
            "liquidity": "string formatada (ex: 5.4M)",
            "p_l": number,
            "roe": number,
            "vacancy": number,
            "assets_value": "string formatada (Patrimônio Líquido)",
            "management_type": "Ativa" | "Passiva",
            "net_margin": number,
            "net_debt_ebitda": number,
            "ev_ebitda": number,
            "last_dividend": number
          }
        ]
    `;

    for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const batch = allTickers.slice(i, i + CHUNK_SIZE);
        
        const prompt = `Ativos: ${batch.join(', ')}. Busque e retorne JSON.`;

        try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
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
            console.error(`Erro API lote ${i}:`, innerErr);
        }
    }

    // Tratamento e Sanitização dos Dados antes do DB
    const dbPayload = results.map((item: any) => ({
        ticker: item.ticker,
        type: item.type,
        segment: item.segment || 'Geral',
        // Converte tudo para número puro para evitar erros no banco
        pvp: parseRobustNumber(item.p_vp),
        dy_12m: parseRobustNumber(item.dy_12m),
        pl: parseRobustNumber(item.p_l),
        roe: parseRobustNumber(item.roe),
        vacancia: parseRobustNumber(item.vacancy),
        // Mantém strings formatadas para exibição direta
        valor_mercado: item.market_cap || '-',
        liquidez: item.liquidity || '-',
        // Mais números
        margem_liquida: parseRobustNumber(item.net_margin),
        divida_liquida_ebitda: parseRobustNumber(item.net_debt_ebitda),
        ev_ebitda: parseRobustNumber(item.ev_ebitda),
        ultimo_rendimento: parseRobustNumber(item.last_dividend),
        // Strings informativas
        tipo_gestao: item.management_type || '-',
        patrimonio_liquido: item.assets_value || '-',
        taxa_adm: '-', // Geralmente difícil de pegar estruturado
        updated_at: new Date().toISOString()
    }));

    // Upsert no Supabase
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
