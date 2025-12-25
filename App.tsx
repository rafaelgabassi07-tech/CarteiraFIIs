import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote } from './types';
import { getQuotes } from './services/brapiService';
import { DownloadCloud, Sparkles } from 'lucide-react';

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
    // Priority: LocalStorage > Environment Variable > Empty
    const local = localStorage.getItem(BRAPI_TOKEN_KEY);
    if (local) return local;

    // Tenta ler do env (Vite faz a substituição do process.env.BRAPI_TOKEN por string em tempo de build)
    // Acessamos diretamente para garantir que a substituição ocorra.
    try {
       return process.env.BRAPI_TOKEN || '';
    } catch {
       return '';
    }
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Service Worker & Update Logic ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          
          // Se já tiver um worker esperando (atualização baixada mas não ativa)
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setUpdateAvailable(true);
          }

          // Monitora novas atualizações chegando
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova atualização instalada e pronta para ativar
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('Service Worker registration failed (likely due to preview environment restrictions):', error);
        });

      // Quando o novo worker assumir o controle, recarrega a página
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
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
        // Fallback
        window.location.reload();
    }
  };
  // -------------------------------------

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

  // Função centralizada para buscar dados
  const fetchMarketData = useCallback(async (isManual = false) => {
    const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker))) as string[];
    
    // Se não tiver token ou tickers, não tenta buscar
    if (!brapiToken || uniqueTickers.length === 0) {
      if (isManual) setIsRefreshing(false);
      return;
    }

    if (isManual) setIsRefreshing(true);

    try {
        const results = await getQuotes(uniqueTickers, brapiToken);
        // Atualiza as cotações com os novos resultados, mantendo as antigas se a busca falhar parcialmente (getQuotes já lida com cache)
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

  // Effect para busca automática e polling
  useEffect(() => {
    fetchMarketData();
    // Poll every 60s
    const interval = setInterval(() => fetchMarketData(false), 60000);
    return () => clearInterval(interval);
  }, [fetchMarketData]); 

  // Handler para refresh manual
  const handleManualRefresh = () => {
    fetchMarketData(true);
  };

  // Transaction Handlers
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleImportTransactions = (data: Transaction[]) => {
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
    <div className="min-h-screen bg-primary text-gray-100 font-sans selection:bg-accent selection:text-slate-900 relative">
      
      {/* UPDATE MODAL (FORCE UPDATE) */}
      {updateAvailable && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl border border-accent/20 shadow-2xl text-center max-w-sm w-full relative overflow-hidden">
            {/* Efeito de fundo */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-accent/20 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                <DownloadCloud className="w-8 h-8 text-accent animate-bounce" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                Atualização Disponível <Sparkles className="w-5 h-5 text-yellow-400" />
              </h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Uma nova versão do InvestFIIs foi detectada. Atualize agora para garantir as últimas funcionalidades e correções.
              </p>
              
              <button 
                onClick={handleUpdateApp}
                className="w-full bg-accent hover:bg-sky-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Atualizar Agora
              </button>
            </div>
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

      {!showSettings && (
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      )}
    </div>
  );
};

export default App;