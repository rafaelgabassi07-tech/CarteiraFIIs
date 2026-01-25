
import { Transaction, AssetType, DividendReceipt, AssetFundamentals, BrapiQuote } from '../types';

// --- HELPERS BÁSICOS ---

// Arredonda para 2 casas decimais de forma precisa
export const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper de data seguro para comparações cronológicas precisas
export const safeDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return null;
    const d = new Date(dateStr);
    // Ajusta para meio-dia UTC para evitar problemas de timezone virando o dia
    d.setUTCHours(12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
};

// Verifica se duas datas (YYYY-MM-DD) são o mesmo dia localmente
export const isSameDayLocal = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return today.getDate() === day && 
           (today.getMonth() + 1) === month && 
           today.getFullYear() === year;
};

// --- MAPPERS ---

export const mapSupabaseToTx = (record: any): Transaction => ({
  id: record.id,
  ticker: record.ticker,
  type: record.type,
  quantity: record.quantity,
  price: record.price,
  date: record.date,
  assetType: record.asset_type || AssetType.FII, 
});

// --- CÁLCULOS DE POSIÇÃO ---

// Calcula quantidade acumulada em uma data, considerando fracionário
export const getQuantityOnDate = (ticker: string, dateCom: string, transactions: Transaction[]) => {
  if (!ticker || !dateCom) return 0;
  const targetTime = safeDate(dateCom);
  if (!targetTime) return 0;
  
  let targetRoot = ticker.trim().toUpperCase();
  if (targetRoot.endsWith('F') && !targetRoot.endsWith('11') && !targetRoot.endsWith('11B') && targetRoot.length <= 6) {
      targetRoot = targetRoot.slice(0, -1);
  }

  return transactions
    .filter(t => {
        if (!t || !t.date || !t.ticker) return false;
        const txTime = safeDate(t.date);
        if (!txTime) return false;

        let txRoot = t.ticker.trim().toUpperCase();
        if (txRoot.endsWith('F') && !txRoot.endsWith('11') && !txRoot.endsWith('11B') && txRoot.length <= 6) {
            txRoot = txRoot.slice(0, -1);
        }

        return txRoot === targetRoot && txTime <= targetTime;
    })
    .reduce((acc, t) => {
        if (t.type === 'BUY') return acc + t.quantity;
        if (t.type === 'SELL') return acc - t.quantity;
        return acc;
    }, 0);
};

// --- PROCESSADOR PRINCIPAL DE PORTFÓLIO ---

interface PortfolioCalcResult {
    portfolio: any[];
    dividendReceipts: any[];
    totalDividendsReceived: number;
    invested: number;
    balance: number;
    salesGain: number;
}

export const processPortfolio = (
    transactions: Transaction[],
    dividends: DividendReceipt[],
    quotes: Record<string, BrapiQuote>,
    assetsMetadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>
): PortfolioCalcResult => {
    const todayStr = new Date().toISOString().split('T')[0];
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    
    // Ordena transações cronologicamente para cálculo correto de PM
    const sortedTxs = [...safeTxs].sort((a, b) => a.date.localeCompare(b.date));
    const safeDividends = Array.isArray(dividends) ? dividends : [];

    // 1. Processamento de Proventos
    const receipts = safeDividends.map(d => {
        if (!d || !d.ticker) return null;
        const normalizedTicker = d.ticker.trim().toUpperCase();
        // Usa a lógica de data com para saber quantas cotas o usuário tinha no dia de corte
        const qty = getQuantityOnDate(normalizedTicker, d.dateCom, sortedTxs);
        
        return { 
            ...d, 
            ticker: normalizedTicker,
            quantityOwned: qty, 
            totalReceived: qty * d.rate 
        };
    }).filter((r): r is any => !!r && r.totalReceived > 0.0001); 

    // Mapa auxiliar para somar dividendos por ativo
    const divPaidMap: Record<string, number> = {};
    let totalDividendsReceived = 0;
    
    receipts.forEach((r: any) => { 
        // Só soma no total o que já foi pago ou é hoje
        if (r.paymentDate <= todayStr) { 
            divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived; 
            totalDividendsReceived += r.totalReceived; 
        } 
    });

    // 2. Cálculo de Posições (Preço Médio)
    const positions: Record<string, any> = {};
    
    sortedTxs.forEach(t => {
      if (!t.ticker) return;
      const normalizedTicker = t.ticker.trim().toUpperCase();
      
      if (!positions[normalizedTicker]) {
          positions[normalizedTicker] = { 
              ticker: normalizedTicker, 
              quantity: 0, 
              averagePrice: 0, 
              assetType: t.assetType 
          };
      }
      
      const p = positions[normalizedTicker];
      
      if (t.type === 'BUY') { 
          const newQuantity = p.quantity + t.quantity;
          if (newQuantity > 0.000001) {
             const currentTotalCost = round(p.quantity * p.averagePrice);
             const additionalCost = round(t.quantity * t.price);
             p.averagePrice = (currentTotalCost + additionalCost) / newQuantity; 
          }
          p.quantity = newQuantity; 
      } else { 
          p.quantity -= t.quantity; 
          // Se vender tudo, zera PM
          if (p.quantity <= 0.000001) { 
              p.quantity = 0; 
              p.averagePrice = 0; 
          }
      }
    });

    // 3. Enriquecimento com Metadados e Cotações
    const finalPortfolio = Object.values(positions)
        .filter(p => p.quantity > 0.001) // Remove posições zeradas
        .map(p => {
            const normalizedTicker = p.ticker.trim().toUpperCase();
            
            // Tenta achar metadados (setor, tipo)
            let meta = assetsMetadata[normalizedTicker];
            // Fallback para raiz do ticker se for fracionário
            if (!meta && normalizedTicker.endsWith('F') && !normalizedTicker.endsWith('11F')) {
                meta = assetsMetadata[normalizedTicker.slice(0, -1)];
            }

            const quote = quotes[normalizedTicker];
            let segment = meta?.segment || 'Geral';
            segment = segment.replace('Seg: ', '').trim();
            if (segment.length > 20) segment = segment.substring(0, 20) + '...';

            // Soma dividendos (considerando ticker fracionário apontando pro normal)
            const dividendsReceived = divPaidMap[p.ticker] || (p.ticker.endsWith('F') ? divPaidMap[p.ticker.slice(0, -1)] : 0) || 0;

            return { 
                ...p, 
                totalDividends: dividendsReceived, 
                segment: segment, 
                currentPrice: quote?.regularMarketPrice || p.averagePrice, 
                dailyChange: quote?.regularMarketChangePercent || 0, 
                logoUrl: quote?.logourl, 
                assetType: meta?.type || p.assetType, 
                ...(meta?.fundamentals || {}) 
            };
        });

    // 4. Totais da Carteira
    const invested = round(finalPortfolio.reduce((a, p) => a + (p.averagePrice * p.quantity), 0));
    const balance = round(finalPortfolio.reduce((a, p) => a + ((p.currentPrice || p.averagePrice) * p.quantity), 0));
    
    // 5. Cálculo de Lucro com Vendas (Trade)
    let salesGain = 0; 
    const tracker: Record<string, { q: number; c: number }> = {};
    
    sortedTxs.forEach(t => {
      if (!t.ticker) return;
      const normalizedTicker = t.ticker.trim().toUpperCase();
      if (!tracker[normalizedTicker]) tracker[normalizedTicker] = { q: 0, c: 0 };
      const a = tracker[normalizedTicker];
      
      if (t.type === 'BUY') { 
          a.q += t.quantity; 
          a.c += round(t.quantity * t.price); 
      } else if (a.q > 0) { 
          // Preço médio no momento da venda
          const cost = round(t.quantity * (a.c / a.q)); 
          salesGain += round((t.quantity * t.price) - cost); 
          a.c -= cost; 
          a.q -= t.quantity; 
      }
    });

    return { 
        portfolio: finalPortfolio, 
        dividendReceipts: receipts, 
        totalDividendsReceived, 
        invested, 
        balance, 
        salesGain 
    };
};
