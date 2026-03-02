import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioInsight } from "../types";

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

export const generateAIInsights = async (): Promise<PortfolioInsight[]> => {
    if (!ai) return [];
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Gere 3 mensagens motivacionais curtas para investidores e 3 dicas de educação financeira baseadas em fatos reais e comprovados (ex: juros compostos, diversificação, foco no longo prazo). Para cada uma, forneça também um 'imagePrompt' curto e descritivo em inglês para gerar uma imagem minimalista e profissional relacionada ao tema. Retorne em JSON.",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            message: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['motivation', 'education'] },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ['title', 'message', 'type', 'imagePrompt']
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text) as (AIEducationalContent & { imagePrompt: string })[];
        
        const insights = await Promise.all(data.map(async (item, index) => {
            let imageUrl = `https://picsum.photos/seed/ai-${item.type}-${index}/1080/1920?blur=2`;
            
            try {
                // Tenta gerar imagem com Gemini
                const imgResponse = await ai!.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [{ text: `A high-quality, professional, minimalist vertical background image for a financial app story. Theme: ${item.imagePrompt}. Style: clean, modern, slightly blurred, abstract financial elements.` }]
                    },
                    config: {
                        imageConfig: {
                            aspectRatio: "9:16"
                        }
                    }
                });

                const imgPart = imgResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imgPart?.inlineData?.data) {
                    imageUrl = `data:image/png;base64,${imgPart.inlineData.data}`;
                }
            } catch (imgError) {
                console.warn("Failed to generate image for story:", item.title, imgError);
            }

            return {
                id: `ai-insight-${item.type}-${index}-${Date.now()}`,
                type: (item.type === 'motivation' ? 'success' : 'news') as any,
                title: item.title,
                message: item.message,
                score: 80 - index,
                timestamp: Date.now(),
                imageUrl
            };
        }));

        return insights;
    } catch (error) {
        console.error("Error generating AI insights:", error);
        return [];
    }
};
