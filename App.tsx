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
      // Safe access to process.env for environments where it might not be defined (like Vite without polyfills)
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
    // Format comparison: ISO string "YYYY-MM-DD" works for lexical comparison
    // We assume transactions are stored as YYYY-MM-DD
    
    // Normalize target date to just YYYY-MM-DD to be safe
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

    // 1. Build base positions from transactions
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
        // Sell affects quantity but not average price (PM rule)
        p.quantity -= t.quantity;
      }
    });

    // 2. Calculate Dividends based on "Data Com" (lastDatePrior) logic
    Object.keys(pos).forEach(ticker => {
        const quote = quotes[ticker];
        const cashDividends = quote?.dividendsData?.cashDividends;

        if (cashDividends && Array.isArray(cashDividends)) {
            let dividendSum = 0;
            cashDividends.forEach(div => {
                // If the API provides a "Data Com" (lastDatePrior), use it.
                // Otherwise fallback to paymentDate (less accurate but safer than nothing).
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

    // 3. Convert to array, filter zero positions, and add current quotes
    return Object.values(pos)
      .filter(p => p.quantity > 0 || p.totalDividends! > 0) // Keep if has dividends even if sold out (optional, strictly keeping > 0 qty for now usually better for UI)
      .filter(p => p.quantity > 0) 
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));
  }, [transactions, quotes]);

  // Fetch Quotes
  useEffect(() => {
    const fetchMarketData = async () => {
        const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker))) as string[];
        if (uniqueTickers.length > 0 && brapiToken) {
            const results = await getQuotes(uniqueTickers, brapiToken);
            const quoteMap: Record<string, BrapiQuote> = {};
            results.forEach(q => quoteMap[q.symbol] = q);
            setQuotes(quoteMap);
        }
    };

    fetchMarketData();
    // Poll every 60s
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, [transactions, brapiToken]);


  // Transaction Handlers
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Rendering Pages
  const renderPage = () => {
    if (showSettings) {
        return <Settings 
            brapiToken={brapiToken} 
            onSaveToken={(t) => { setBrapiToken(t); setShowSettings(false); }} 
            onClose={() => setShowSettings(false)}
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