import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioInsight } from "../types";

const getApiKey = () => {
    try {
        // @ts-ignore
        return process.env.GEMINI_API_KEY || '';
    } catch {
        return import.meta.env.VITE_GEMINI_API_KEY || '';
    }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export interface AIEducationalContent {
    title: string;
    message: string;
    type: 'motivation' | 'education';
}

export const generateAIInsights = async (): Promise<PortfolioInsight[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Gere 3 mensagens motivacionais curtas para investidores e 3 dicas de educação financeira baseadas em fatos reais e comprovados (ex: juros compostos, diversificação, foco no longo prazo). Retorne em JSON.",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            message: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['motivation', 'education'] }
                        },
                        required: ['title', 'message', 'type']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text) as AIEducationalContent[];
        
        return data.map((item, index) => ({
            id: `ai-insight-${item.type}-${index}-${Date.now()}`,
            type: item.type === 'motivation' ? 'success' : 'news',
            title: item.title,
            message: item.message,
            score: 80 - index, // Slightly lower than portfolio insights to not dominate
            timestamp: Date.now(),
            imageUrl: `https://picsum.photos/seed/ai-${item.type}-${index}/1080/1920?blur=2`
        }));
    } catch (error) {
        console.error("Error generating AI insights:", error);
        return [];
    }
};
