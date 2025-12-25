
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote } from './types';
import { getQuotes } from './services/brapiService';
import { DownloadCloud } from 'lucide-react';

const INITIAL_TRANSACTIONS_KEY = 'investfiis_transactions';
const BRAPI_TOKEN_KEY = 'investfiis_brapitoken';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(INITIAL_TRANSACTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [brapiToken, setBrapiToken] = useState(() => {
    const local = localStorage.getItem(BRAPI_TOKEN_KEY);
    return local || '';
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persistência
  useEffect(() => { localStorage.setItem(INITIAL_TRANSACTIONS_KEY, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(BRAPI_TOKEN_KEY, brapiToken); }, [brapiToken]);

  // Função crítica: Calcula a quantidade exata de cotas em uma data passada
  const getQuantityOnDate = useCallback((ticker: string, targetDateStr: string, transactionList: Transaction[]) => {
    // Normaliza para YYYY-MM-DD ignorando horas da API
    const targetDate = targetDateStr.split('T')[0];
    
    return transactionList
      .filter(t => t.ticker === ticker && t.date <= targetDate)
      .reduce((acc, t) => {
        return t.type === 'BUY' ? acc + t.quantity : acc - t.quantity;
      }, 0);
  }, []);

  // Cálculo do Portfólio e Proventos
  const portfolio = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    
    // 1. Calcula Posição Atual e Preço Médio
    transactions.forEach(t => {
      if (!positions[t.ticker]) {
        positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
      }
      const p = positions[t.ticker];
      if (t.type === 'BUY') {
        const totalCost = (p.quantity * p.averagePrice) + (t.quantity * t.price);
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? totalCost / p.quantity : 0;
      } else {
        p.quantity -= t.quantity;
      }
    });

    // 2. Calcula Proventos baseado na "Data Com" (lastDatePrior)
    Object.keys(positions).forEach(ticker => {
      const quote = quotes[ticker];
      const dividends = quote?.dividendsData?.cashDividends;
      
      if (dividends && Array.isArray(dividends)) {
        let sum = 0;
        dividends.forEach(div => {
          // A regra: Se você tinha o ativo na data base (lastDatePrior), você recebe.
          const refDate = div.lastDatePrior || div.paymentDate;
          if (refDate) {
            const qtyAtDate = getQuantityOnDate(ticker, refDate, transactions);
            if (qtyAtDate > 0) {
              sum += qtyAtDate * div.rate;
            }
          }
        });
        positions[ticker].totalDividends = sum;
      }
    });

    return Object.values(positions)
      .filter(p => p.quantity > 0 || (p.totalDividends && p.totalDividends > 0))
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));
  }, [transactions, quotes, getQuantityOnDate]);

  const fetchMarketData = useCallback(async (isManual = false) => {
    // Fix: Explicitly type uniqueTickers as string[] to avoid unknown[] inference from Array.from/Set
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (!brapiToken || uniqueTickers.length === 0) {
      if (isManual) setIsRefreshing(false);
      return;
    }

    if (isManual) setIsRefreshing(true);
    try {
      const results = await getQuotes(uniqueTickers, brapiToken);
      if (results.length > 0) {
        const newQuoteMap: Record<string, BrapiQuote> = {};
        results.forEach(q => newQuoteMap[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...newQuoteMap }));
      }
    } catch (error) {
      console.error("Erro ao atualizar cotações", error);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [transactions, brapiToken]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(() => fetchMarketData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const handleUpdateApp = () => {
    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  };

  const renderPage = () => {
    if (showSettings) return (
      <Settings 
        brapiToken={brapiToken} 
        onSaveToken={(t) => setBrapiToken(t)} 
        transactions={transactions}
        onImportTransactions={(data) => setTransactions(data)}
        onResetApp={() => {
          setTransactions([]);
          setBrapiToken('');
          setShowSettings(false);
        }}
      />
    );

    switch (currentTab) {
      case 'home': return <Home portfolio={portfolio} />;
      case 'portfolio': return <Portfolio portfolio={portfolio} />;
      case 'transactions': return (
        <Transactions 
          transactions={transactions} 
          onAddTransaction={(t) => setTransactions(prev => [...prev, { ...t, id: crypto.randomUUID() }])} 
          onDeleteTransaction={(id) => setTransactions(prev => prev.filter(x => x.id !== id))}
        />
      );
      default: return <Home portfolio={portfolio} />;
    }
  };

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans">
      {updateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] animate-slide-up">
          <div className="bg-slate-800/95 backdrop-blur-xl border border-accent/20 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DownloadCloud className="w-5 h-5 text-accent" />
              <p className="font-bold text-white text-sm">Nova versão disponível</p>
            </div>
            <button onClick={handleUpdateApp} className="bg-accent text-slate-950 text-xs font-bold py-2 px-4 rounded-lg">Atualizar</button>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Configurações' : (currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Minha Carteira' : 'Transações')} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={() => fetchMarketData(true)}
        isRefreshing={isRefreshing}
      />
      
      <main className="fade-in">{renderPage()}</main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
