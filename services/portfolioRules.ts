
import { Transaction, AssetType, DividendReceipt, AssetFundamentals, BrapiQuote } from '../types';

// --- HELPERS MATEMÁTICOS ---

// Resolve o problema de ponto flutuante do JS (ex: 0.1 + 0.2 = 0.30000000000000004)
export const preciseAdd = (a: number, b: number) => Math.round((a + b) * 10000) / 10000;
export const preciseSub = (a: number, b: number) => Math.round((a - b) * 10000) / 10000;
export const preciseMul = (a: number, b: number) => Math.round((a * b) * 10000) / 10000;
export const preciseDiv = (a: number, b: number) => b === 0 ? 0 : Math.round((a / b) * 10000) / 10000;

// Arredonda para 2 casas decimais para exibição monetária final
export const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Normaliza Tickers (Remove 'F' final se for ação fracionária, mantém 11, 11B, 34, etc)
export const normalizeTicker = (rawTicker: string): string => {
    if (!rawTicker) return '';
    const clean = rawTicker.trim().toUpperCase();
    
    // Se terminar com F e tiver tamanho <= 6 (ex: PETR4F -> PETR4), remove o F.
    // Exceções: 11F (se existir), ou tickers maiores.
    if (clean.endsWith('F') && clean.length <= 6 && !clean.endsWith('11F')) {
        return clean.slice(0, -1);
    }
    return clean;
};

// --- CORREÇÃO DE DATAS ---
// O problema "1 dia de atraso" acontece quando new Date('2024-05-15') cria meia-noite UTC.
// No Brasil (UTC-3), isso vira 21:00 do dia anterior.
// Esta função cria a data usando os componentes locais (Ano, Mês, Dia) explicitamente.
export const parseDateToLocal = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length < 10) return null;
    
    try {
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
        // Cria data ao meio-dia local para evitar qualquer problema de virada de dia
        return new Date(year, month - 1, day, 12, 0, 0); 
    } catch {
        return null;
    }
};

// Helper de data seguro para comparações cronológicas precisas
export const safeDate = (dateStr: string) => {
    const d = parseDateToLocal(dateStr);
    return d ? d.getTime() : null;
};

// Verifica se duas datas (YYYY-MM-DD) são o mesmo dia localmente
export const isSameDayLocal = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const d = parseDateToLocal(dateString);
    
    return d ? (
        today.getDate() === d.getDate() && 
        today.getMonth() === d.getMonth() && 
        today.getFullYear() === d.getFullYear()
    ) : false;
};

// --- MAPPERS ---

export const mapSupabaseToTx = (record: any): Transaction => ({
  id: record.id,
  ticker: normalizeTicker(record.ticker), // Normaliza já na entrada
  type: record.type,
  quantity: Number(record.quantity),
  price: Number(record.price),
  date: record.date,
  assetType: record.asset_type || AssetType.FII, 
});

// --- CÁLCULOS DE POSIÇÃO ---

// Calcula quantidade acumulada em uma data
// Otimização: Assume que transactions está ordenado por data
export const getQuantityOnDate = (ticker: string, dateCom: string, sortedTransactions: Transaction[]) => {
  const targetRoot = normalizeTicker(ticker);
  const targetTime = safeDate(dateCom);
  
  if (!targetRoot || !targetTime) return 0;

  let acc = 0;
  for (const t of sortedTransactions) {
        // Otimização: Se a transação é posterior à data alvo, paramos o loop
        // (Requer array ordenado, que é garantido no processPortfolio)
        const txTime = safeDate(t.date);
        if (txTime && txTime > targetTime) break;

        // Verifica Ticker Normalizado
        if (normalizeTicker(t.ticker) !== targetRoot) continue;
        
        if (t.type === 'BUY') acc = preciseAdd(acc, t.quantity);
        if (t.type === 'SELL') acc = preciseSub(acc, t.quantity);
  }
  return acc;
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
    
    // Normaliza todas as transações para garantir consistência
    const safeTxs = (transactions || []).map(t => ({
        ...t,
        ticker: normalizeTicker(t.ticker)
    })).sort((a, b) => a.date.localeCompare(b.date)); // Ordenação Cronológica é VITAL para PM

    const safeDividends = dividends || [];

    // 1. Processamento de Proventos
    // Mapa auxiliar para somar dividendos por ativo para exibição no card
    const divPaidMap: Record<string, number> = {};
    let totalDividendsReceived = 0;

    const receipts = safeDividends.map(d => {
        if (!d || !d.ticker) return null;
        const normalizedTicker = normalizeTicker(d.ticker);
        
        // Calcula quantidade EXATA na data COM
        const qty = getQuantityOnDate(normalizedTicker, d.dateCom, safeTxs);
        
        if (qty <= 0) return null;

        const totalVal = preciseMul(qty, d.rate);

        // Soma ao total global se já passou da data de pagamento
        if (d.paymentDate <= todayStr) {
            divPaidMap[normalizedTicker] = preciseAdd(divPaidMap[normalizedTicker] || 0, totalVal);
            totalDividendsReceived = preciseAdd(totalDividendsReceived, totalVal);
        }

        return { 
            ...d, 
            ticker: normalizedTicker,
            quantityOwned: qty, 
            totalReceived: totalVal 
        };
    }).filter((r): r is any => !!r); 

    // 2. Cálculo de Posições (Preço Médio & Lucro de Venda)
    const positions: Record<string, any> = {};
    let salesGain = 0;

    safeTxs.forEach(t => {
      const ticker = t.ticker; // Já normalizado
      
      if (!positions[ticker]) {
          positions[ticker] = { 
              ticker: ticker, 
              quantity: 0, 
              averagePrice: 0, 
              totalCost: 0,
              assetType: t.assetType 
          };
      }
      
      const p = positions[ticker];
      
      if (t.type === 'BUY') { 
          // Novo Custo Total = Custo Anterior + (Qtd Nova * Preço Novo)
          const transactionCost = preciseMul(t.quantity, t.price);
          p.totalCost = preciseAdd(p.totalCost, transactionCost);
          p.quantity = preciseAdd(p.quantity, t.quantity);
          
          // PM = Custo Total / Quantidade Total
          if (p.quantity > 0) {
              p.averagePrice = preciseDiv(p.totalCost, p.quantity);
          }
      } 
      else if (t.type === 'SELL') { 
          // Lucro = (Preço Venda - Preço Médio) * Quantidade Vendida
          const profitPerShare = preciseSub(t.price, p.averagePrice);
          const tradeProfit = preciseMul(profitPerShare, t.quantity);
          salesGain = preciseAdd(salesGain, tradeProfit);

          // Atualiza Quantidade e Custo Total Proporcional
          // O PM não muda na venda, mas o Custo Total diminui proporcionalmente
          p.quantity = preciseSub(p.quantity, t.quantity);
          p.totalCost = preciseMul(p.quantity, p.averagePrice);

          // Zera PM se liquidou posição (evita resquícios de ponto flutuante)
          if (p.quantity <= 0.000001) { 
              p.quantity = 0; 
              p.averagePrice = 0; 
              p.totalCost = 0;
          }
      }
    });

    // 3. Enriquecimento com Metadados e Cotações e Totais
    let totalInvested = 0;
    let totalBalance = 0;

    const finalPortfolio = Object.values(positions)
        .filter(p => p.quantity > 0.0001) // Remove posições zeradas
        .map(p => {
            // Metadados
            const meta = assetsMetadata[p.ticker];
            
            // Cotação
            const quote = quotes[p.ticker];
            const currentPrice = quote?.regularMarketPrice || p.averagePrice; // Fallback pro PM se sem cotação
            
            // Formatação de Segmento
            let segment = meta?.segment || 'Geral';
            segment = segment.replace('Seg: ', '').trim();
            if (segment.length > 25) segment = segment.substring(0, 25) + '...';

            // Cálculos Finais do Ativo
            const equity = preciseMul(p.quantity, currentPrice);
            const cost = p.totalCost; // Use o totalCost acumulado que é mais preciso que qty * PM arredondado

            totalInvested = preciseAdd(totalInvested, cost);
            totalBalance = preciseAdd(totalBalance, equity);

            return { 
                ...p, 
                totalDividends: divPaidMap[p.ticker] || 0, 
                segment: segment, 
                currentPrice: currentPrice, 
                dailyChange: quote?.regularMarketChangePercent || 0, 
                logoUrl: quote?.logourl, 
                assetType: meta?.type || p.assetType, 
                // Fundamentos vindos do JSON/Scraper
                ...(meta?.fundamentals || {}) 
            };
        });

    return { 
        portfolio: finalPortfolio, 
        dividendReceipts: receipts, 
        totalDividendsReceived: round(totalDividendsReceived), 
        invested: round(totalInvested), 
        balance: round(totalBalance), 
        salesGain: round(salesGain) 
    };
};
