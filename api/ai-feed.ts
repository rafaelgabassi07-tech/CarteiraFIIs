
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

function cleanJsonString(str: string): string {
    if (!str) return '[]';
    // Remove blocos de código Markdown e limpa espaços
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
    
    // Remove R$, %, espaços e caracteres invisíveis
    str = str.replace(/[R$%\s]/g, '');
    
    // Lógica para detectar formato BR (1.200,50) vs US (1,200.50)
    // Se houver vírgula, assumimos que é decimal BR, a menos que seja um separador único irrelevante
    if (str.includes(',')) {
        // Remove pontos de milhar (ex: 1.200,50 -> 1200,50)
        str = str.replace(/\./g, '');
        // Troca vírgula por ponto (1200,50 -> 1200.50)
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

  try {
    const { tickers } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Lista de tickers inválida.' });
    }

    const allTickers = Array.from(new Set(tickers.map(t => t.trim().toUpperCase())));
    
    if (allTickers.length === 0) return res.json({ data: [] });

    // AUMENTADO PARA 20: Tenta resolver a maioria das carteiras em UMA ÚNICA requisição
    const CHUNK_SIZE = 20; 
    const results: any[] = [];

    const baseSystemInstruction = `
        Você é um Crawler de Dados Financeiros especializado no site Investidor10.
        
        FONTE DE DADOS OBRIGATÓRIA:
        Use a ferramenta de busca para acessar dados atualizados de **investidor10.com.br** para cada ativo.
        
        OBJETIVO:
        Retornar um JSON Array com os indicadores fundamentalistas exatos encontrados no site.
        
        MAPEAMENTO DE CAMPOS (Crucial):
        - p_vp: "P/VP"
        - dy_12m: "Dividend Yield" (últimos 12 meses)
        - market_cap: "Valor de Mercado" (Ex: R$ 1,5 B)
        - liquidity: "Liquidez Diária" (Ex: R$ 2,5 M)
        - assets_value: "Valor Patrimonial" (para FIIs) ou "Patrimônio Líquido" (para Ações)
        - management_type: "Tipo de Gestão" (Ativa/Passiva)
        - last_dividend: "Último Rendimento" (Valor em R$)
        - vacancy: "Vacância Física" (Apenas FIIs, em %)
        - p_l: "P/L" (Apenas Ações)
        - roe: "ROE" (Apenas Ações)
        - net_debt_ebitda: "Dív. Líquida/EBITDA" (Apenas Ações)
        
        FORMATO:
        Retorne APENAS o JSON puro. Sem formatação Markdown. Use 0 ou "-" se o dado não existir.
        
        EXEMPLO DE SAÍDA:
        [
          {
            "ticker": "MXRF11",
            "type": "FII",
            "segment": "Papel",
            "p_vp": 1.02,
            "dy_12m": 12.5,
            "market_cap": "R$ 3.2B",
            "liquidity": "R$ 12M",
            "assets_value": "R$ 3.0B",
            "management_type": "Ativa",
            "last_dividend": 0.10,
            "vacancy": 0
          }
        ]
    `;

    for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const batch = allTickers.slice(i, i + CHUNK_SIZE);
        
        // Prompt otimizado para uma única passada eficiente
        const prompt = `
          Extraia os fundamentos do site Investidor10 para os ativos: ${batch.join(', ')}.
          Para cada ticker, pesquise especificamente: "site:investidor10.com.br ${batch.join(' OR ')}".
          Preencha todos os campos do schema JSON solicitado.
        `;

        try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1, // Zero criatividade, apenas extração de dados
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

    // Processamento e Normalização para o Banco de Dados
    const dbPayload = results.map((item: any) => ({
        ticker: item.ticker ? item.ticker.toUpperCase() : '',
        type: item.type,
        segment: item.segment || 'Geral',
        
        // Converte strings formatadas (R$, %) para números float puros
        pvp: parseRobustNumber(item.p_vp),
        dy_12m: parseRobustNumber(item.dy_12m),
        pl: parseRobustNumber(item.p_l),
        roe: parseRobustNumber(item.roe),
        vacancia: parseRobustNumber(item.vacancy),
        margem_liquida: parseRobustNumber(item.net_margin),
        divida_liquida_ebitda: parseRobustNumber(item.net_debt_ebitda),
        ev_ebitda: parseRobustNumber(item.ev_ebitda),
        ultimo_rendimento: parseRobustNumber(item.last_dividend),
        
        // Mantém como string para exibição formatada (ex: 1.5B)
        valor_mercado: item.market_cap || '-',
        liquidez: item.liquidity || '-',
        patrimonio_liquido: item.assets_value || '-',
        tipo_gestao: item.management_type || '-',
        
        updated_at: new Date().toISOString()
    })).filter(item => item.ticker !== ''); // Remove entradas vazias se houver erro

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
