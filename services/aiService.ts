import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioInsight, InsightType } from "../types";

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
    type: 'motivation' | 'education';
}

const CACHE_KEY = 'investfiis_daily_stories_cache';

const TOPICS = [
    "Juros Compostos", "Diversificação", "Longo Prazo", "Reserva de Emergência", 
    "FIIs vs Ações", "Mindset Milionário", "Volatilidade", "Dividendos", 
    "Rebalanceamento", "Inflação", "Selic", "Renda Passiva", "Value Investing",
    "Growth Investing", "Small Caps", "Blue Chips", "Criptomoedas", "ETFs",
    "BDRs", "Mercado Americano", "Psicologia do Investidor", "Viés da Confirmação",
    "Efeito Manada", "Custo de Oportunidade", "Alocação de Ativos", "Risco vs Retorno"
];

const getRandomTopics = (count: number) => {
    const shuffled = [...TOPICS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join(", ");
};

export const generateAIInsights = async (): Promise<PortfolioInsight[]> => {
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
        const topics = getRandomTopics(3);
        const prompt = `Gere 3 mensagens curtas e variadas para investidores: 1 motivacional, 1 curiosidade histórica sobre finanças e 1 dica prática sobre: ${topics}. Baseie-se em fatos. Retorne em JSON.`;

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
                            type: { type: Type.STRING, enum: ['motivation', 'education', 'curiosity'] }
                        },
                        required: ['title', 'message', 'type']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text) as AIEducationalContent[];
        
        const stories = await Promise.all(data.map(async (item, index) => {
            let imageUrl = `https://picsum.photos/seed/ai-${item.type}-${index}-${todayStr}/1080/1920?blur=2`;
            
            try {
                // Tenta gerar/buscar uma imagem temática usando o modelo com busca
                const imgResponse = await ai!.models.generateContent({
                    model: 'gemini-3.1-flash-image-preview',
                    contents: {
                        parts: [
                            { text: `Uma imagem vertical (9:16) artística, moderna e minimalista para um app de investimentos sobre o tema: "${item.title}". Estilo fintech premium, cores sóbrias (azul, verde esmeralda, dourado), iluminação cinematográfica.` }
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

            return {
                id: `ai-insight-${index}-${todayStr}`, // Stable ID for the day
                type: (item.type === 'motivation' ? 'success' : 'news') as InsightType,
                title: item.title,
                message: item.message,
                score: 80 - index,
                timestamp: Date.now(),
                imageUrl
            };
        }));

        // Cache the new stories
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                date: todayStr,
                stories: stories
            }));
        } catch (e) {
            console.warn("Failed to save stories cache", e);
        }

        return stories;

    } catch (error) {
        console.error("Error generating AI insights:", error);
        return [];
    }
};
