
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Endpoint desativado após remoção do Gemini
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return res.status(404).json({ error: "Feature disabled" });
}
