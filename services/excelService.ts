
import { read, utils } from 'xlsx';
import { Transaction, AssetType, DividendReceipt } from '../types';

/**
 * Utilitário para limpar strings de números brasileiros (ex: "1.024,50" -> 1024.50)
 */
const parseBrNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove R$, espaços e converte formato BR para float JS
  let str = String(val).trim().replace('R$', '').trim();
  
  // Trata números entre parênteses ou com sinal negativo no final
  const isNegative = str.includes('(') || str.endsWith('-');
  str = str.replace(/[()]/g, '').replace(/-$/, '');

  if (str === '') return 0;
  
  let num = 0;
  if (str.includes('.') && str.includes(',')) {
    num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  else if (str.includes(',')) {
    num = parseFloat(str.replace(',', '.'));
  }
  else {
    num = parseFloat(str);
  }

  return isNegative ? -Math.abs(num) : num;
};

/**
 * Converte data DD/MM/YYYY para YYYY-MM-DD
 */
const parseBrDate = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];

  const str = String(val).trim();
  const matchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchBR) {
      const day = matchBR[1].padStart(2, '0');
      const month = matchBR[2].padStart(2, '0');
      const year = matchBR[3];
      return `${year}-${month}-${day}`;
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);
  return ''; 
};

/**
 * Identifica o tipo de ativo baseado no Ticker
 */
const inferAssetType = (ticker: string): AssetType => {
  const t = ticker.trim().toUpperCase();
  if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33') || t.endsWith('34')) {
    return AssetType.FII; 
  }
  return AssetType.STOCK;
};

const extractTicker = (raw: string): string => {
    if (!raw) return '';
    const clean = raw.trim().toUpperCase();
    const matchStart = clean.match(/^([A-Z0-9]{4,6}[0-9]{1,2}B?)\s*[- ]/);
    if (matchStart) return matchStart[1];
    const matchCode = clean.match(/\b([A-Z]{4}[0-9]{1,2}B?)\b/);
    if (matchCode) return matchCode[1];
    return clean.split(' ')[0];
};

export const parseB3Excel = async (file: File): Promise<{ transactions: Transaction[], dividends: DividendReceipt[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = utils.sheet_to_json(worksheet, { defval: '' });

        const transactions: Transaction[] = [];
        const dividends: DividendReceipt[] = [];

        for (const row of jsonData) {
          const keys = Object.keys(row).reduce((acc, k) => {
              acc[k.toLowerCase().trim()] = k; 
              return acc;
          }, {} as Record<string, string>);

          // Dados comuns
          const dateKey = keys['data do negócio'] || keys['data'] || keys['data pregão'] || keys['dt. negociação'] || keys['data liquidação'];
          const dateStr = parseBrDate(row[dateKey]);
          
          const tickerKey = keys['código de negociação'] || keys['código'] || keys['ativo'] || keys['ticker'] || keys['produto'] || keys['papel'];
          const tickerStr = extractTicker(String(row[tickerKey] || ''));

          const typeVal = String(row[keys['movimentação'] || keys['tipo de movimentação'] || keys['histórico'] || keys['natureza'] || ''] || '').toLowerCase();
          
          // --- FLUXO DE DIVIDENDOS ---
          if (typeVal.includes('dividendo') || typeVal.includes('juros') || typeVal.includes('rendimento') || typeVal.includes('jcp')) {
              if (!dateStr || !tickerStr) continue;

              const valKey = keys['valor da operação'] || keys['valor total'] || keys['valor líquido'] || keys['valor'] || keys['crédito/débito'];
              const totalVal = Math.abs(parseBrNumber(row[valKey])); // Valor total recebido

              // Tenta achar quantidade para calcular rate unitário
              const qtyKey = keys['quantidade'] || keys['qtd'] || keys['qtde'];
              const quantity = Math.abs(parseBrNumber(row[qtyKey]));

              if (totalVal > 0) {
                  // Normalização de Tipo para bater com API (JCP, DIV, REND)
                  let type = 'DIV';
                  if (typeVal.includes('juros') || typeVal.includes('jcp')) type = 'JCP';
                  else if (typeVal.includes('rendimento')) type = 'REND';

                  // Normalização de Rate (Máximo 6 casas decimais para evitar conflito de float no DB)
                  const rate = quantity > 0 ? Number((totalVal / quantity).toFixed(6)) : 0; 
                  
                  dividends.push({
                      id: crypto.randomUUID(),
                      ticker: tickerStr,
                      type,
                      dateCom: dateStr, // Planilha B3 geralmente só tem a data do crédito.
                      paymentDate: dateStr,
                      rate: rate,
                      quantityOwned: quantity,
                      totalReceived: totalVal,
                      assetType: inferAssetType(tickerStr)
                  });
              }
              continue; // Pula lógica de transação
          }

          // --- FLUXO DE TRANSAÇÕES (ORDENS) ---
          
          if (!dateStr) continue;

          const qtyKey = keys['quantidade'] || keys['qtd'] || keys['qtde'] || keys['executada'];
          let quantity = parseBrNumber(row[qtyKey]);
          
          const priceKey = keys['preço'] || keys['preço unitário'] || keys['preco'] || keys['preço médio'];
          let price = parseBrNumber(row[priceKey]);

          const totalKey = keys['valor'] || keys['valor da operação'] || keys['valor total'] || keys['crédito/débito'] || keys['financeiro'];
          let totalValue = parseBrNumber(row[totalKey]);

          // Fallback: Inferir quantidade/preço se faltar
          if (quantity === 0 && totalValue !== 0 && price !== 0) {
              quantity = Math.abs(totalValue / price);
          }
          if (price === 0 && quantity !== 0 && totalValue !== 0) {
              price = Math.abs(totalValue / quantity);
          }

          // Validação Rígida para Ordens
          if (!tickerStr || quantity <= 0 || price <= 0) {
              continue; 
          }

          let type: 'BUY' | 'SELL' = 'BUY'; 

          if (typeVal.includes('venda') || typeVal === 'v' || typeVal.includes('sell')) {
              type = 'SELL';
          } else if (typeVal.includes('compra') || typeVal === 'c' || typeVal.includes('buy')) {
              type = 'BUY';
          } else {
              // Inferência por sinal financeiro ou descrição genérica "Liquidação"
              if (totalKey) {
                  const valRaw = String(row[totalKey]).toUpperCase();
                  if (valRaw.includes('D') || totalValue < 0) type = 'BUY';
                  else if (valRaw.includes('C') || totalValue > 0) type = 'SELL';
              }
          }

          transactions.push({
              id: crypto.randomUUID(),
              ticker: tickerStr,
              type,
              quantity: Math.floor(quantity),
              price: Math.abs(price),
              date: dateStr,
              assetType: inferAssetType(tickerStr)
          });
        }

        resolve({ transactions, dividends });
      } catch (err) {
        console.error("Excel Parse Error:", err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
