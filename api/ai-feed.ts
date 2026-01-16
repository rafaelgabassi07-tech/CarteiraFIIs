
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuração Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Inicializa Gemini 2.5
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // Schema de Resposta Estrita para Fundamentos
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["FII", "ACAO"], description: "Classificação do ativo" },
          segment: { type: Type.STRING, description: "Setor ou segmento" },
          
          // Valuation Geral
          p_vp: { type: Type.NUMBER, description: "Preço sobre Valor Patrimonial (P/VP)" },
          dy_12m: { type: Type.NUMBER, description: "Dividend Yield 12 meses (%)" },
          market_cap: { type: Type.STRING, description: "Valor de Mercado formatado (ex: 1.2B)" },
          liquidity: { type: Type.STRING, description: "Liquidez Diária formatada" },
          
          // Específico Ações
          p_l: { type: Type.NUMBER, description: "Preço/Lucro (Apenas Ações)" },
          roe: { type: Type.NUMBER, description: "ROE % (Apenas Ações)" },
          net_margin: { type: Type.NUMBER, description: "Margem Líquida % (Apenas Ações)" },
          gross_margin: { type: Type.NUMBER, description: "Margem Bruta % (Apenas Ações)" },
          cagr_revenue: { type: Type.NUMBER, description: "CAGR Receita 5 Anos %" },
          cagr_profits: { type: Type.NUMBER, description: "CAGR Lucros 5 Anos %" },
          net_debt_ebitda: { type: Type.NUMBER, description: "Dívida Líquida/EBITDA (Apenas Ações)" },
          ev_ebitda: { type: Type.NUMBER, description: "EV/EBITDA (Apenas Ações)" },
          
          // Específico FIIs
          vacancy: { type: Type.NUMBER, description: "Vacância Física % (Apenas FIIs)" },
          assets_value: { type: Type.STRING, description: "Valor Patrimonial Total formatado (R$)" },
          management_type: { type: Type.STRING, description: "Gestão Ativa ou Passiva" },
          management_fee: { type: Type.STRING, description: "Taxa de Administração" },
          last_dividend: { type: Type.NUMBER, description: "Valor do último rendimento em R$" }
        },
        required: ["ticker", "p_vp", "dy_12m"]
      }
    };

    // Prompt Especializado em Fundamentos
    // Processamos em lotes de 30 para balancear contexto e performance, 
    // mas retornamos tudo em uma única resposta da API para o frontend.
    const CHUNK_SIZE = 30;
    const results = [];

    for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const batch = allTickers.slice(i, i + CHUNK_SIZE);
        
        const prompt = `
          Sua missão é extrair dados fundamentalistas atualizados para esta lista de ativos da B3: ${batch.join(', ')}.
          
          Utilize o Google Search para encontrar os dados mais recentes (2024/2025) em sites como Investidor10, StatusInvest ou Fundamentus.
          
          Regras de Extração:
          1. FIIs: Foque em Vacância, P/VP, DY 12m, Valor Patrimonial e Gestão.
          2. Ações: Foque em P/L, ROE, Margem Líquida, Dívida/EBITDA e CAGR.
          3. Retorne 0 ou null se o dado não existir.
          
          Responda estritamente com o JSON Array solicitado.
        `;

        try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1
              }
            });

            const jsonResponse = JSON.parse(response.text || '[]');
            results.push(...jsonResponse);
        } catch (innerErr) {
            console.error(`Erro no lote ${i}:`, innerErr);
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
        margem_bruta: item.gross_margin,
        divida_liquida_ebitda: item.net_debt_ebitda,
        ev_ebitda: item.ev_ebitda,
        cagr_receita: item.cagr_revenue,
        cagr_lucro: item.cagr_profits,
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
