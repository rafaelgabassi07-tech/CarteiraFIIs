
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import https from 'https';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400'); // Cache de 1 hora na CDN, 24h stale

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // URL do BCB: Série 13522 = IPCA Acumulado 12 meses
    const bcbUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';
    
    // CRÍTICO: Agente HTTPS que ignora erros de certificado (comum em sites .gov.br)
    const agent = new https.Agent({  
      rejectUnauthorized: false 
    });

    const response = await axios.get(bcbUrl, { 
        timeout: 10000, // 10 segundos
        httpsAgent: agent,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.bcb.gov.br/',
            'Origin': 'https://www.bcb.gov.br',
            'Connection': 'keep-alive'
        }
    });
    
    const data = response.data;

    // Validação robusta da resposta
    if (Array.isArray(data) && data.length > 0 && data[0].valor) {
        const value = parseFloat(data[0].valor);
        if (!isNaN(value)) {
            return res.status(200).json({
                value: value,
                date: data[0].data,
                source: 'BCB (Oficial)',
                timestamp: Date.now()
            });
        }
    }
    
    throw new Error('Formato de dados do BCB inesperado.');

  } catch (error: any) {
    console.error('[Indicators API] Erro:', error.message);

    // Fallback Inteligente
    // Se a API falhar, retornamos um valor fixo aproximado (Média 2024/2025) para não quebrar a UI
    return res.status(200).json({
        value: 4.62,
        source: 'Fallback (Segurança)',
        isError: true,
        details: error.message,
        timestamp: Date.now()
    });
  }
}
