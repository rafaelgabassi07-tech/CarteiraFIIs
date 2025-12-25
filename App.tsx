import React, { useState, useEffect, useMemo } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote } from './types';
import { getQuotes } from './services/brapiService';

// Initial dummy data to show functionality if empty
const INITIAL_TRANSACTIONS_KEY = 'investfiis_transactions';
const BRAPI_TOKEN_KEY = 'investfiis_brapitoken';

const App: React.FC = () => {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(INITIAL_TRANSACTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [brapiToken, setBrapiToken] = useState(() => {
    // Priority: LocalStorage > Environment Variable > Empty
    let envToken = '';
    try {
      if (typeof process !== 'undefined' && process.env && process.env.BRAPI_TOKEN) {
        envToken = process.env.BRAPI_TOKEN;
      }
    } catch (e) {
      // ignore
    }
    return localStorage.getItem(BRAPI_TOKEN_KEY) || envToken;
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});

  // Persist Transactions
  useEffect(() => {
    localStorage.setItem(INITIAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
  }, [transactions]);

  // Persist Token
  useEffect(() => {
    localStorage.setItem(BRAPI_TOKEN_KEY, brapiToken);
  }, [brapiToken]);

  // Helper: Calculate quantity of an asset on a specific date (Data Com)
  const getQuantityOnDate = (ticker: string, targetDateStr: string, transactionList: Transaction[]) => {
    const targetDate = targetDateStr.split('T')[0];

    return transactionList
      .filter(t => t.ticker === ticker && t.date <= targetDate)
      .reduce((acc, t) => {
        if (t.type === 'BUY') return acc + t.quantity;
        if (t.type === 'SELL') return acc - t.quantity;
        return acc;
      }, 0);
  };

  // Calculate Portfolio Position & Dividends
  const portfolio = useMemo(() => {
    const pos: Record<string, AssetPosition> = {};

    transactions.forEach(t => {
      if (!pos[t.ticker]) {
        pos[t.ticker] = {
          ticker: t.ticker,
          quantity: 0,
          averagePrice: 0,
          assetType: t.assetType,
          totalDividends: 0
        };
      }

      const p = pos[t.ticker];

      if (t.type === 'BUY') {
        const totalCost = (p.quantity * p.averagePrice) + (t.quantity * t.price);
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? totalCost / p.quantity : 0;
      } else {
        p.quantity -= t.quantity;
      }
    });

    Object.keys(pos).forEach(ticker => {
        const quote = quotes[ticker];
        const cashDividends = quote?.dividendsData?.cashDividends;

        if (cashDividends && Array.isArray(cashDividends)) {
            let dividendSum = 0;
            cashDividends.forEach(div => {
                const referenceDate = div.lastDatePrior || div.paymentDate;
                
                if (referenceDate) {
                    const quantityOwned = getQuantityOnDate(ticker, referenceDate, transactions);
                    if (quantityOwned > 0) {
                        dividendSum += quantityOwned * div.rate;
                    }
                }
            });
            pos[ticker].totalDividends = dividendSum;
        }
    });

    return Object.values(pos)
      .filter(p => p.quantity > 0 || p.totalDividends! > 0)
      .filter(p => p.quantity > 0) 
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));
  }, [transactions, quotes]);

  // Fetch Quotes - Automaticamente busca ao alterar transações
  useEffect(() => {
    const fetchMarketData = async () => {
        const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker))) as string[];
        
        // Se não tiver token, não tenta buscar
        if (!brapiToken) return;

        if (uniqueTickers.length > 0) {
            try {
                const results = await getQuotes(uniqueTickers, brapiToken);
                // IMPORTANTE: Só atualiza se vier dados válidos. 
                // Isso protege contra limpar o estado em caso de erro de rede (offline)
                if (results && results.length > 0) {
                    const quoteMap: Record<string, BrapiQuote> = {};
                    results.forEach(q => quoteMap[q.symbol] = q);
                    setQuotes(quoteMap);
                }
            } catch (error) {
                console.error("Falha ao atualizar cotações:", error);
            }
        }
    };

    fetchMarketData();
    // Poll every 60s
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, [transactions, brapiToken]); // Dependência 'transactions' garante atualização automática ao lançar ativo


  // Transaction Handlers
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleImportTransactions = (data: Transaction[]) => {
    // Basic validation could be improved, but sufficient for JSON restore
    setTransactions(data);
  };

  const handleResetApp = () => {
    setTransactions([]);
    setBrapiToken('');
    localStorage.removeItem(INITIAL_TRANSACTIONS_KEY);
    localStorage.removeItem(BRAPI_TOKEN_KEY);
    setShowSettings(false);
  };

  // Rendering Pages
  const renderPage = () => {
    if (showSettings) {
        return <Settings 
            brapiToken={brapiToken} 
            onSaveToken={(t) => setBrapiToken(t)} 
            transactions={transactions}
            onImportTransactions={handleImportTransactions}
            onResetApp={handleResetApp}
        />;
    }

    switch (currentTab) {
      case 'home':
        return <Home portfolio={portfolio} />;
      case 'portfolio':
        return <Portfolio portfolio={portfolio} />;
      case 'transactions':
        return <Transactions 
            transactions={transactions} 
            onAddTransaction={handleAddTransaction} 
            onDeleteTransaction={handleDeleteTransaction}
        />;
      default:
        return <Home portfolio={portfolio} />;
    }
  };

  const getTitle = () => {
      if (showSettings) return 'Configurações';
      switch(currentTab) {
          case 'home': return 'Visão Geral';
          case 'portfolio': return 'Minha Carteira';
          case 'transactions': return 'Transações';
          default: return 'InvestFIIs';
      }
  };

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans selection:bg-accent selection:text-slate-900">
      <Header 
        title={getTitle()} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
      />
      
      <main className="fade-in">
        {renderPage()}
      </main>

      {!showSettings && (
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      )}
    </div>
  );
};

export default App;