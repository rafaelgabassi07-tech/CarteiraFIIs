
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS para permitir que o front-end chame esta função
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // TENTATIVA 1: Banco Central do Brasil (Série 13522 - IPCA Acumulado 12 meses)
    // Fonte oficial e mais precisa.
    const bcbUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';
    
    // Timeout curto para não travar se o BCB estiver lento
    const response = await axios.get(bcbUrl, { timeout: 5000 });
    const data = response.data;

    // Formato esperado: [{ "data": "01/06/2025", "valor": "4.23" }]
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

    throw new Error('Formato inválido ou indisponível no BCB');

  } catch (error: any) {
    console.error('[Indicators API] Falha no BCB, tentando BrasilAPI:', error.message);

    try {
        // TENTATIVA 2: BrasilAPI (Fallback robusto)
        const brasilApiUrl = 'https://brasilapi.com.br/api/taxas/v1';
        const response = await axios.get(brasilApiUrl, { timeout: 5000 });
        const taxas = response.data;
        
        const ipcaObj = taxas.find((t: any) => t.nome === 'IPCA');
        
        if (ipcaObj && ipcaObj.valor) {
             return res.status(200).json({
                value: parseFloat(ipcaObj.valor),
                source: 'BrasilAPI (Fallback)',
                timestamp: Date.now()
            });
        }
    } catch (fallbackError) {
        console.error('[Indicators API] Falha no Fallback:', fallbackError);
    }

    // TENTATIVA 3: Retornar valor fixo de segurança (IPCA médio recente) para não quebrar a UI
    // Retorna 200 mesmo assim para o front não explodir
    return res.status(200).json({
        value: 4.62, // Valor de segurança
        source: 'Hardcoded (Erro Geral)',
        isError: true,
        timestamp: Date.now()
    });
  }
}
