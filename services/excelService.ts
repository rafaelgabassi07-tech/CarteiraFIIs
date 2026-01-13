
import { read, utils } from 'xlsx';
import { Transaction, AssetType } from '../types';

/**
 * Utilitário para limpar strings de números brasileiros (ex: "1.024,50" -> 1024.50)
 */
const parseBrNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove R$, espaços e converte formato BR para float JS
  let str = String(val).trim().replace('R$', '').trim();
  
  // Trata números entre parênteses ou com sinal negativo no final (comum em contabilidade)
  const isNegative = str.includes('(') || str.endsWith('-');
  str = str.replace(/[()]/g, '').replace(/-$/, '');

  if (str === '') return 0;
  
  let num = 0;
  // Se tiver pontos e virgulas (ex: 1.000,50)
  if (str.includes('.') && str.includes(',')) {
    num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  // Se tiver apenas virgula (ex: 100,50)
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
  
  // Se já for objeto Date
  if (val instanceof Date) {
      return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  
  // Formato DD/MM/YYYY
  const matchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchBR) {
      const day = matchBR[1].padStart(2, '0');
      const month = matchBR[2].padStart(2, '0');
      const year = matchBR[3];
      return `${year}-${month}-${day}`;
  }
  
  // Tenta formato ISO direto YYYY-MM-DD
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10);

  return ''; 
};

/**
 * Identifica o tipo de ativo baseado no Ticker
 */
const inferAssetType = (ticker: string): AssetType => {
  const t = ticker.trim().toUpperCase();
  if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33') || t.endsWith('34')) {
    return AssetType.FII; // Assumindo FII/ETF/BDR como FII por simplificação
  }
  return AssetType.STOCK;
};

/**
 * Extrai o Ticker limpo de descrições longas da B3
 * Ex: "HGLG11 - CSHG LOGISTICA" -> "HGLG11"
 * Ex: "FII HGLG11" -> "HGLG11"
 */
const extractTicker = (raw: string): string => {
    if (!raw) return '';
    const clean = raw.trim().toUpperCase();
    
    // Padrão comum: Ticker no início seguido de hífen ou espaço
    // Ex: WEGE3 - WEG S/A
    const matchStart = clean.match(/^([A-Z0-9]{4,6}[0-9]{1,2}B?)\s*[- ]/);
    if (matchStart) return matchStart[1];

    // Padrão B3 novo: Descrição completa onde o ticker pode estar no meio ou início
    // Tenta encontrar padrão de ticker isolado (XXXX3, XXXX4, XXXX11, XXXX11B)
    const matchCode = clean.match(/\b([A-Z]{4}[0-9]{1,2}B?)\b/);
    if (matchCode) return matchCode[1];

    // Fallback: retorna a primeira palavra
    return clean.split(' ')[0];
};

export const parseB3Excel = async (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'array' });
        
        // Pega a primeira aba
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converte para JSON bruto
        const jsonData: any[] = utils.sheet_to_json(worksheet, { defval: '' });

        const transactions: Transaction[] = [];

        for (const row of jsonData) {
          // Normaliza chaves para minúsculo para facilitar comparação
          const keys = Object.keys(row).reduce((acc, k) => {
              acc[k.toLowerCase().trim()] = k; 
              return acc;
          }, {} as Record<string, string>);

          // --- ESTRATÉGIA DE DETECÇÃO --- //
          
          // 1. Identificar se a linha é um PROVENTO (Dividendo, JCP, Rendimento)
          // Se for, ignoramos, pois o app foca em transações de compra/venda (Custódia)
          const typeVal = String(row[keys['movimentação'] || keys['tipo de movimentação'] || keys['histórico'] || ''] || '').toLowerCase();
          
          if (typeVal.includes('dividendo') || typeVal.includes('juros') || typeVal.includes('rendimento') || typeVal.includes('jcp')) {
              continue;
          }

          // 2. Mapeamento de Colunas
          
          // DATA
          const dateKey = keys['data do negócio'] || keys['data'] || keys['data pregão'] || keys['dt. negociação'];
          let dateStr = parseBrDate(row[dateKey]);
          if (!dateStr) continue; // Sem data, linha inválida

          // QUANTIDADE (Essencial para ser uma ordem)
          const qtyKey = keys['quantidade'] || keys['qtd'] || keys['qtde'] || keys['executada'];
          let quantity = parseBrNumber(row[qtyKey]);
          
          // PREÇO (Essencial)
          const priceKey = keys['preço'] || keys['preço unitário'] || keys['preco'] || keys['preço médio'];
          let price = parseBrNumber(row[priceKey]);

          // TICKER
          const tickerKey = keys['código de negociação'] || keys['código'] || keys['ativo'] || keys['ticker'] || keys['produto'] || keys['papel'];
          let tickerStr = extractTicker(String(row[tickerKey] || ''));

          // VALOR TOTAL (Para fallback de tipo)
          const totalKey = keys['valor'] || keys['valor da operação'] || keys['valor total'] || keys['crédito/débito'];
          let totalValue = parseBrNumber(row[totalKey]);

          // --- VALIDAÇÃO E LÓGICA --- //

          // Se não achou Quantidade ou Preço, tenta inferir se for um extrato simples
          // (Alguns extratos B3 antigos tinham formato diferente)
          if (quantity === 0 && totalValue !== 0 && price !== 0) {
              quantity = Math.abs(totalValue / price);
          }

          // Validação Crítica: Para ser uma transação de custódia, precisamos de Ticker, Qtd e Preço.
          if (!tickerStr || quantity <= 0 || price <= 0) {
              continue; 
          }

          // Determinar TIPO (Compra vs Venda)
          let type: 'BUY' | 'SELL' = 'BUY'; // Default

          if (typeVal.includes('venda') || typeVal === 'v' || typeVal.includes('sell')) {
              type = 'SELL';
          } else if (typeVal.includes('compra') || typeVal === 'c' || typeVal.includes('buy')) {
              type = 'BUY';
          } else {
              // Se não estiver explícito no texto (ex: "Liquidação"), tenta pelo sinal do Valor Financeiro
              // Na B3: Débito (Negativo) = Compra, Crédito (Positivo) = Venda
              if (totalKey) {
                  if (String(row[totalKey]).toUpperCase().includes('D')) { // Débito
                      type = 'BUY';
                  } else if (String(row[totalKey]).toUpperCase().includes('C')) { // Crédito
                      type = 'SELL';
                  } else if (totalValue < 0) {
                      type = 'BUY';
                  } else if (totalValue > 0) {
                      type = 'SELL';
                  }
              }
          }

          // Filtra operações "Liquidação" que não são compra/venda de ativos (ex: liquidação de proventos)
          // Se passou pela validação de Quantidade > 0 e Preço > 0, é muito provável que seja uma ordem real.
          
          transactions.push({
              id: crypto.randomUUID(),
              ticker: tickerStr,
              type,
              quantity: Math.floor(quantity), // Garante inteiro
              price: Math.abs(price), // Garante positivo
              date: dateStr,
              assetType: inferAssetType(tickerStr)
          });
        }

        resolve(transactions);
      } catch (err) {
        console.error("Excel Parse Error:", err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
