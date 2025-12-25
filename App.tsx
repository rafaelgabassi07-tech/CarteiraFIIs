import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, PortfolioSummary } from './types';
import { getQuotes } from './services/brapiService';
import { DownloadCloud } from 'lucide-react';

// Initial dummy data to show functionality if empty
const INITIAL_TRANSACTIONS_KEY = 'investfiis_transactions';
const BRAPI_TOKEN_KEY = 'investfiis_brapitoken';

const App: React.FC = () => {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);

  // Update State
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(INITIAL_TRANSACTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [brapiToken, setBrapiToken] = useState(() => {
    const local = localStorage.getItem(BRAPI_TOKEN_KEY);
    if (local) return local;
    try { return process.env.BRAPI_TOKEN || ''; } catch { return ''; }
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Service Worker & Update Logic ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setUpdateAvailable(true);
          }
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => console.warn('SW error:', error));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdateApp = () => {
    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  };
  // -------------------------------------

  // Persist Transactions & Token
  useEffect(() => { localStorage.setItem(INITIAL_TRANSACTIONS_KEY, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(BRAPI_TOKEN_KEY, brapiToken); }, [brapiToken]);

  // Helper: Calculate quantity
  // CORREÇÃO: Garante que a comparação de data seja segura (string YYYY-MM-DD)
  const getQuantityOnDate = (ticker: string, targetDateStr: string, transactionList: Transaction[]) => {
    // Normaliza a data alvo para YYYY-MM-DD (remove hora se houver)
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
    
    // 1. Agrupa posições baseadas em transações
    transactions.forEach(t => {
      if (!pos[t.ticker]) {
        pos[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
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

    // 2. Calcula dividendos baseado nas cotações carregadas
    Object.keys(pos).forEach(ticker => {
        const quote = quotes[ticker];
        const cashDividends = quote?.dividendsData?.cashDividends;
        
        if (cashDividends && Array.isArray(cashDividends)) {
            let dividendSum = 0;
            cashDividends.forEach(div => {
                // A data de referência é a Data COM (lastDatePrior) ou Data de Pagamento
                const rawDate = div.lastDatePrior || div.paymentDate;
                if (rawDate) {
                    // Normaliza para garantir formato compatível com as transações
                    const quantityOwned = getQuantityOnDate(ticker, rawDate, transactions);
                    if (quantityOwned > 0) {
                        dividendSum += quantityOwned * div.rate;
                    }
                }
            });
            pos[ticker].totalDividends = dividendSum;
        }
    });

    return Object.values(pos)
      .filter(p => p.quantity > 0 || (p.totalDividends && p.totalDividends > 0)) // Mostra se tem qtd ou se já pagou dividendos
      .filter(p => p.quantity > 0) // Por enquanto filtra apenas ativos em carteira para simplificar visualização
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));
  }, [transactions, quotes]);

  // Market Data Fetcher
  const fetchMarketData = useCallback(async (isManual = false) => {
    const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker))) as string[];
    
    if (!brapiToken || uniqueTickers.length === 0) {
      if (isManual) setIsRefreshing(false);
      return;
    }

    if (isManual) setIsRefreshing(true);

    try {
        const results = await getQuotes(uniqueTickers, brapiToken);
        if (results && results.length > 0) {
            setQuotes(prevQuotes => {
                const newQuoteMap = { ...prevQuotes };
                results.forEach(q => newQuoteMap[q.symbol] = q);
                return newQuoteMap;
            });
        }
    } catch (error) {
        console.error("Falha ao atualizar cotações:", error);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [transactions, brapiToken]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(() => fetchMarketData(false), 60000);
    return () => clearInterval(interval);
  }, [fetchMarketData]); 

  const handleManualRefresh = () => fetchMarketData(true);

  // Transaction Actions
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...t, id: crypto.randomUUID() }]);
  };
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  const handleImportTransactions = (data: Transaction[]) => setTransactions(data);
  const handleResetApp = () => {
    setTransactions([]);
    setBrapiToken('');
    localStorage.removeItem(INITIAL_TRANSACTIONS_KEY);
    localStorage.removeItem(BRAPI_TOKEN_KEY);
    setShowSettings(false);
  };

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
    <div className="min-h-screen bg-primary text-gray-100 font-sans selection:bg-accent selection:text-slate-900 relative">
      
      {/* UPDATE NOTIFICATION */}
      {updateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] animate-slide-up">
          <div className="bg-slate-800/95 backdrop-blur-xl border border-accent/20 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between ring-1 ring-black/20">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-xl">
                <DownloadCloud className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">Nova versão disponível</p>
                <p className="text-[10px] text-slate-400 font-medium">Melhorias e correções prontas.</p>
              </div>
            </div>
            <button onClick={handleUpdateApp} className="bg-accent hover:bg-sky-400 text-slate-950 text-xs font-bold py-2 px-4 rounded-lg shadow-lg shadow-accent/10 active:scale-95 transition-all">
              Atualizar
            </button>
          </div>
        </div>
      )}

      <Header 
        title={getTitle()} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />
      
      <main className="fade-in">
        {renderPage()}
      </main>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;