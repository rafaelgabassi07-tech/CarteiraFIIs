import { read, utils } from 'xlsx';
import { Transaction, AssetType } from '../types';

/**
 * Utilitário para limpar strings de números brasileiros (ex: "1.024,50" -> 1024.50)
 */
const parseBrNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Remove R$, espaços e converte formato BR para float JS
  const str = String(val).trim().replace('R$', '').trim();
  if (str === '') return 0;
  
  // Se tiver pontos e virgulas (ex: 1.000,50)
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  // Se tiver apenas virgula (ex: 100,50)
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.'));
  }
  return parseFloat(str);
};

/**
 * Converte data DD/MM/YYYY para YYYY-MM-DD
 */
const parseBrDate = (val: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  
  // Se já for objeto Date (Excel às vezes devolve assim)
  if (val instanceof Date) {
      return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  // Formato DD/MM/YYYY
  if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = str.split('/');
      return `${year}-${month}-${day}`;
  }
  return str; // Retorna como está se não reconhecer
};

/**
 * Identifica o tipo de ativo baseado no Ticker
 */
const inferAssetType = (ticker: string): AssetType => {
  const t = ticker.trim().toUpperCase();
  if (t.endsWith('11') || t.endsWith('11B') || t.endsWith('33')) {
    return AssetType.FII; // Assumindo FII/ETF/BDR como FII por simplificação, ou poderia criar lógica mais complexa
  }
  return AssetType.STOCK;
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
        
        // Converte para JSON bruto (array de arrays ou array de objetos)
        const jsonData: any[] = utils.sheet_to_json(worksheet, { defval: '' });

        const transactions: Transaction[] = [];

        for (const row of jsonData) {
          // Normaliza chaves para minúsculo para facilitar comparação
          const keys = Object.keys(row).reduce((acc, k) => {
              acc[k.toLowerCase().trim()] = k; // guarda a chave original mapeada pela lowercase
              return acc;
          }, {} as Record<string, string>);

          // Tenta identificar colunas do padrão B3 (Área do Investidor - Extrato de Negociação)
          // Colunas comuns: "Data do Negócio", "Movimentação", "Código de Negociação", "Quantidade", "Preço", "Valor"
          
          let dateStr = '';
          let typeStr = '';
          let tickerStr = '';
          let quantity = 0;
          let price = 0;

          // 1. DATA
          const dateKey = keys['data do negócio'] || keys['data'] || keys['data pregão'];
          if (dateKey) dateStr = parseBrDate(row[dateKey]);

          // 2. MOVIMENTAÇÃO (Compra/Venda)
          const typeKey = keys['tipo de movimentação'] || keys['movimentação'] || keys['tipo'] || keys['natureza'];
          if (typeKey) typeStr = String(row[typeKey]).toLowerCase();

          // 3. TICKER (Código)
          // Na B3 nova muitas vezes vem "Código de Negociação". As vezes "Produto".
          const tickerKey = keys['código de negociação'] || keys['código'] || keys['ativo'] || keys['ticker'] || keys['produto'];
          if (tickerKey) {
             const rawTicker = String(row[tickerKey]);
             // Tenta extrair apenas o código se vier "WEGE3 - WEG S.A."
             const match = rawTicker.match(/^([A-Z0-9]{4,6})/); 
             tickerStr = match ? match[0] : rawTicker.split('-')[0].trim();
          }

          // 4. QUANTIDADE
          const qtyKey = keys['quantidade'] || keys['qtd'] || keys['qtde'];
          if (qtyKey) quantity = parseBrNumber(row[qtyKey]);

          // 5. PREÇO
          const priceKey = keys['preço'] || keys['preço unitário'] || keys['preco'];
          if (priceKey) price = parseBrNumber(row[priceKey]);

          // Validação Básica
          if (tickerStr && quantity > 0 && price > 0 && dateStr) {
              const type = typeStr.includes('venda') ? 'SELL' : 'BUY';
              
              // Filtra apenas Compra e Venda (ignora aluguel, leilão, etc se não for explícito)
              if (typeStr.includes('compra') || typeStr.includes('venda') || typeStr === 'c' || typeStr === 'v') {
                  transactions.push({
                      id: crypto.randomUUID(),
                      ticker: tickerStr.toUpperCase(),
                      type,
                      quantity,
                      price,
                      date: dateStr,
                      assetType: inferAssetType(tickerStr)
                  });
              }
          }
        }

        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};