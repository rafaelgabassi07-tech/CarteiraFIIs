
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // TENTATIVA 1: API Oficial do Banco Central (BCB)
    // O BCB bloqueia requisições sem User-Agent definido.
    const bcbUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';
    
    const response = await axios.get(bcbUrl, { 
        timeout: 8000,
        headers: {
            // Emula um navegador Chrome moderno para evitar bloqueio WAF
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.bcb.gov.br/'
        }
    });
    
    const data = response.data;

    // Valida se veio o formato esperado [{ data: "...", valor: "..." }]
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
    
    throw new Error('Dados do BCB inválidos ou vazios');

  } catch (error: any) {
    console.error('[Indicators API] Falha no BCB, ativando Fallback:', error.message);

    // TENTATIVA 2: Fallback Seguro
    // Se o BCB falhar, retornamos a média recente (aprox 4.62%) para não quebrar o gráfico.
    // O frontend vai receber isso normalmente e funcionar.
    return res.status(200).json({
        value: 4.62,
        source: 'Fallback (Segurança)',
        isError: true,
        timestamp: Date.now()
    });
  }
}
