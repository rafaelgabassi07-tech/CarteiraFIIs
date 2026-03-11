import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioInsight, InsightType, AssetPosition } from "../types";

const getApiKey = () => {
    try {
        // @ts-ignore
        const key = process.env.GEMINI_API_KEY;
        if (key) return key;
    } catch {}
    try {
        // @ts-ignore
        const key = import.meta.env.VITE_GEMINI_API_KEY;
        if (key) return key;
    } catch {}
    return '';
};

let ai: GoogleGenAI | null = null;
try {
    const key = getApiKey();
    if (key) {
        ai = new GoogleGenAI({ apiKey: key });
    } else {
        console.warn("Gemini API Key is missing. AI features will be disabled.");
    }
} catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
}

export interface AIEducationalContent {
    title: string;
    message: string;
    type: 'motivation' | 'education' | 'curiosity';
    topic?: string;
}

const CACHE_KEY = 'investfiis_daily_stories_cache_v2';
const HISTORY_KEY = 'investfiis_ai_history_v1';

const TOPICS = [
    "Juros Compostos", "Diversificação", "Longo Prazo", "Reserva de Emergência", 
    "FIIs vs Ações", "Mindset Milionário", "Volatilidade", "Dividendos", 
    "Rebalanceamento", "Inflação", "Selic", "Renda Passiva", "Value Investing",
    "Growth Investing", "Small Caps", "Blue Chips", "Criptomoedas", "ETFs",
    "BDRs", "Mercado Americano", "Psicologia do Investidor", "Viés da Confirmação",
    "Efeito Manada", "Custo de Oportunidade", "Alocação de Ativos", "Risco vs Retorno",
    "Fundos de Papel", "Fundos de Tijolo", "Vacância", "Cap Rate", "P/VP",
    "Dividend Yield", "Bonificação", "Desdobramento", "Grupamento", "IPO",
    "Follow-on", "Subscrição", "Day Trade vs Buy & Hold", "Análise Fundamentalista",
    "Análise Técnica", "Governança Corporativa", "Tag Along", "Free Float",
    "Commodities", "Dólar", "Ouro", "Tesouro Direto", "LCI/LCA", "CDB",
    "Previdência Privada", "Planejamento Sucessório", "Independência Financeira",
    "FIRE Movement", "Minimalismo Financeiro", "Gastos Essenciais", "Orçamento 50/30/20",
    "Dívida Boa vs Dívida Ruim", "Cartão de Crédito", "Score de Crédito",
    "Financiamento Imobiliário", "Aluguel vs Compra", "Carro Próprio vs Uber",
    "Seguro de Vida", "Viés de Ancoragem", "Falácia do Custo Irrecuperável",
    "FOMO (Fear Of Missing Out)", "FUD (Fear, Uncertainty, Doubt)", "Bear Market",
    "Bull Market", "Circuit Breaker", "Insider Trading", "Manipulação de Mercado",
    "Bolhas Financeiras", "Crise de 1929", "Bolha das Pontocom", "Crise de 2008",
    "Tulipomania", "História do Dinheiro", "Padrão Ouro", "Bretton Woods",
    "Bitcoin Halving", "Blockchain", "DeFi", "NFTs", "Metaverso", "Web3",
    "ESG", "Investimento de Impacto", "Crowdfunding", "Peer-to-Peer Lending",
    "Open Finance", "Pix", "Real Digital (Drex)", "Economia Comportamental",
    "Livros de Finanças", "Filmes sobre Mercado Financeiro", "Frases de Warren Buffett",
    "Filosofia Estoica e Investimentos", "Meditação e Trading", "Saúde Mental e Dinheiro"
];

const getRecentTopics = (): string[] => {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        // Filter history for the last 10 days to ensure variety
        const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
        return history.filter((h: { timestamp: number }) => h.timestamp > tenDaysAgo).map((h: { topic: string }) => h.topic);
    } catch {
        return [];
    }
};

const saveTopicsToHistory = (topics: string[]) => {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const newEntries = topics.map(t => ({ topic: t, timestamp: Date.now() }));
        // Keep only the last 100 entries to prevent storage bloat
        const updatedHistory = [...history, ...newEntries].slice(-100); 
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch {}
};

const getRandomTopicsFromPool = (pool: string[], count: number) => {
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export const generateAIInsights = async (portfolio: AssetPosition[], ipca: number): Promise<PortfolioInsight[]> => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Try to load from cache
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.date === todayStr && parsed.stories && parsed.stories.length > 0) {
                console.log("[AI Service] Returning cached stories for today");
                return parsed.stories;
            }
        }
    } catch (e) {
        console.warn("Failed to load stories cache", e);
    }

    if (!ai) return [];

    try {
        // 2. Select Topics avoiding repetition
        const recentTopics = getRecentTopics();
        const availableTopics = TOPICS.filter(t => !recentTopics.includes(t));
        
        // If we run out of fresh topics (unlikely given the list size), fallback to full list
        const pool = availableTopics.length >= 3 ? availableTopics : TOPICS;
        const selectedTopics = getRandomTopicsFromPool(pool, 2);
        
        console.log(`[AI Service] Selected topics: ${selectedTopics.join(', ')} (Avoided: ${recentTopics.length} recent topics)`);

        // Prepare portfolio summary for Gemini
        const totalValue = portfolio.reduce((acc, p) => acc + (p.currentPrice || 0) * p.quantity, 0);
        const topAssets = [...portfolio].sort((a, b) => ((b.currentPrice || 0) * b.quantity) - ((a.currentPrice || 0) * a.quantity)).slice(0, 3);
        const portfolioSummary = `
            Valor Total: R$ ${totalValue.toFixed(2)}
            IPCA Atual: ${ipca}%
            Top 3 Ativos: ${topAssets.map(a => `${a.ticker} (R$ ${((a.currentPrice || 0) * a.quantity).toFixed(2)})`).join(', ')}
        `;

        // 3. Generate Content
        const prompt = `
            Atue como um mentor financeiro experiente e criativo.
            Gere 5 "Stories" curtos e engajadores para um app de investimentos.
            
            Tópicos educacionais selecionados para hoje: ${selectedTopics.join(', ')}.
            
            Resumo da Carteira do Usuário:
            ${portfolioSummary}
            
            Requisitos:
            1. Crie 2 stories do tipo 'portfolio' (análise personalizada da carteira do usuário, elogiando a diversificação, alertando sobre concentração, ou comentando sobre os top ativos e o IPCA).
            2. Crie 1 story do tipo 'motivation' (inspiracional, foco no longo prazo).
            3. Crie 1 story do tipo 'education' (dica prática ou conceito explicado de forma simples, baseado nos tópicos).
            4. Crie 1 story do tipo 'curiosity' (fato histórico ou dado interessante sobre mercado, baseado nos tópicos).
            
            Diretrizes de Estilo:
            - Texto curto, direto e impactante (máximo 140 caracteres por mensagem).
            - Use emojis com moderação para dar vida.
            - Evite clichês genéricos como "compre na baixa e venda na alta".
            - Traga uma perspectiva nova ou um dado concreto.
            - NÃO repita informações óbvias.
            
            Retorne APENAS um JSON array.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            message: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['portfolio', 'motivation', 'education', 'curiosity'] },
                            topic: { type: Type.STRING } // Optional, helps with debugging/tracking
                        },
                        required: ['title', 'message', 'type']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text) as (AIEducationalContent | { title: string, message: string, type: 'portfolio', topic?: string })[];
        
        // 4. Generate Images
        const stories = await Promise.all(data.map(async (item, index) => {
            let imageUrl = `https://picsum.photos/seed/ai-${item.type}-${index}-${todayStr}/1080/1920?blur=2`;
            
            try {
                // Tenta gerar/buscar uma imagem temática usando o modelo com busca
                const imgResponse = await ai!.models.generateContent({
                    model: 'gemini-3.1-flash-image-preview',
                    contents: {
                        parts: [
                            { text: `Uma imagem vertical (9:16) artística, moderna e minimalista para um app de investimentos sobre o tema: "${item.title}". Estilo fintech premium, cores sóbrias (azul, verde esmeralda, dourado), iluminação cinematográfica. Sem texto na imagem.` }
                        ]
                    },
                    config: {
                        imageConfig: {
                            aspectRatio: "9:16"
                        },
                        tools: [
                            {
                                googleSearch: {
                                    // @ts-ignore
                                    searchTypes: {
                                        imageSearch: {}
                                    }
                                } as any
                            }
                        ]
                    }
                });

                const imgPart = imgResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imgPart?.inlineData) {
                    imageUrl = `data:image/png;base64,${imgPart.inlineData.data}`;
                }
            } catch (e) {
                console.warn("Failed to generate AI image for story:", e);
            }

            let insightType: InsightType = 'news';
            if (item.type === 'portfolio') insightType = 'opportunity';
            else if (item.type === 'motivation') insightType = 'success';
            else if (item.type === 'education') insightType = 'magic-number';
            else if (item.type === 'curiosity') insightType = 'news';

            return {
                id: `ai-insight-${index}-${todayStr}`, // Stable ID for the day
                type: insightType,
                title: item.title,
                message: item.message,
                score: 80 - index,
                timestamp: Date.now(),
                imageUrl
            };
        }));

        // 5. Save to Cache & History
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                date: todayStr,
                stories: stories
            }));
            
            // Save used topics to history to avoid repetition
            saveTopicsToHistory(selectedTopics);
            
        } catch (e) {
            console.warn("Failed to save stories cache", e);
        }

        return stories;

    } catch (error) {
        console.error("Error generating AI insights:", error);
        return [];
    }
};
