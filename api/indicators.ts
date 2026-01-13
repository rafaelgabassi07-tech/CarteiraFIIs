
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS para permitir chamadas do front-end
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Evita cache de erros
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // TENTATIVA 1: Banco Central do Brasil (Série 13522 - IPCA Acumulado 12 meses)
    const bcbUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';
    
    const response = await axios.get(bcbUrl, { timeout: 8000 });
    const data = response.data;

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
    
    throw new Error('BCB retornou dados inválidos');

  } catch (error: any) {
    console.error('[Indicators API] Falha no BCB, usando Fallback:', error.message);

    // TENTATIVA 2: Fallback fixo atualizado (Janeiro/2025)
    // Se a API do governo falhar, usamos a última média conhecida para não quebrar a UI
    return res.status(200).json({
        value: 4.62,
        source: 'Fallback (Segurança)',
        isError: true,
        timestamp: Date.now()
    });
  }
}
