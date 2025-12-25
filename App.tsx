
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const INITIAL_TRANSACTIONS_KEY = 'investfiis_transactions';
const BRAPI_TOKEN_KEY = 'investfiis_brapitoken';
const GEMINI_DIVIDENDS_KEY = 'investfiis_gemini_dividends_cache';
const LAST_GEMINI_SYNC_KEY = 'investfiis_last_gemini_sync';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(INITIAL_TRANSACTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [brapiToken, setBrapiToken] = useState(() => {
    const local = localStorage.getItem(BRAPI_TOKEN_KEY);
    return local || '';
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => {
    const saved = localStorage.getItem(GEMINI_DIVIDENDS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const hasRunAutoSync = useRef(false);
  const isAiLoadingRef = useRef(false);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(console.warn);
    }
  }, []);

  useEffect(() => { localStorage.setItem(INITIAL_TRANSACTIONS_KEY, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(BRAPI_TOKEN_KEY, brapiToken); }, [brapiToken]);
  useEffect(() => { localStorage.setItem(GEMINI_DIVIDENDS_KEY, JSON.stringify(geminiDividends)); }, [geminiDividends]);

  const getQuantityOnDate = useCallback((ticker: string, targetDateStr: string, transactionList: Transaction[]) => {
    if (!targetDateStr) return 0;
    const targetDate = targetDateStr.split('T')[0];
    return transactionList
      .filter(t => t.ticker === ticker && t.date <= targetDate)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const { portfolio, dividendReceipts } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    const receipts: DividendReceipt[] = [];
    
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

    if (geminiDividends.length > 0) {
      geminiDividends.forEach(div => {
         const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, transactions);
         if (qtyAtDate > 0) {
            const totalReceived = qtyAtDate * div.rate;
            receipts.push({ ...div, quantityOwned: qtyAtDate, totalReceived: totalReceived });
            if (positions[div.ticker]) {
              positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + totalReceived;
            }
         }
      });
    }

    receipts.sort((a, b) => (b.paymentDate || b.dateCom).localeCompare(a.paymentDate || a.dateCom));

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0 || (p.totalDividends && p.totalDividends > 0))
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));
      
    return { portfolio: finalPortfolio, dividendReceipts: receipts };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  const fetchMarketData = useCallback(async () => {
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (!brapiToken || uniqueTickers.length === 0) return;

    try {
      const results = await getQuotes(uniqueTickers, brapiToken);
      if (results.length > 0) {
        const newQuoteMap: Record<string, BrapiQuote> = {};
        results.forEach(q => newQuoteMap[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...newQuoteMap }));
      }
    } catch (error) {
      console.error("Brapi Error:", error);
    }
  }, [transactions, brapiToken]);

  const handleUnifiedSync = useCallback(async (force = false) => {
    if (isAiLoadingRef.current) return;
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (uniqueTickers.length === 0) return;

    const lastSync = localStorage.getItem(LAST_GEMINI_SYNC_KEY);
    if (!force && lastSync) {
      const diff = Date.now() - parseInt(lastSync, 10);
      if (diff < 12 * 60 * 60 * 1000) return; // Reduce sync interval check
    }

    setIsAiLoading(true);
    isAiLoadingRef.current = true;

    try {
      const unifiedData = await fetchUnifiedMarketData(uniqueTickers);
      localStorage.setItem(LAST_GEMINI_SYNC_KEY, Date.now().toString());

      const newQuotesFromAI: Record<string, BrapiQuote> = {};
      Object.entries(unifiedData.prices).forEach(([ticker, price]) => {
        newQuotesFromAI[ticker] = {
          symbol: ticker,
          regularMarketPrice: price,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
        } as BrapiQuote;
      });
      
      setQuotes(prev => ({ ...prev, ...newQuotesFromAI }));

      if (unifiedData.dividends.length > 0) {
        setGeminiDividends(unifiedData.dividends);
        if (force) showToast('success', 'Carteira atualizada via IA');
      }
    } catch (e: any) {
      if (e.message === 'COTA_EXCEDIDA') showToast('error', 'Cota da IA atingida.');
      else showToast('error', 'Falha na sincronização.');
    } finally {
      setIsAiLoading(false);
      isAiLoadingRef.current = false;
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    try {
      await fetchMarketData();
      await handleUnifiedSync(true);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 15 * 60 * 1000); 
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  useEffect(() => {
    if (hasRunAutoSync.current) return;
    const timeout = setTimeout(() => {
      hasRunAutoSync.current = true;
      handleUnifiedSync(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [handleUnifiedSync]);

  const renderPage = () => {
    if (showSettings) return (
      <Settings 
        brapiToken={brapiToken} 
        onSaveToken={setBrapiToken} 
        transactions={transactions}
        onImportTransactions={setTransactions}
        onResetApp={() => {
          setTransactions([]);
          setBrapiToken('');
          setGeminiDividends([]);
          setQuotes({});
          localStorage.clear();
          setShowSettings(false);
        }}
      />
    );

    switch (currentTab) {
      case 'home': return <Home portfolio={portfolio} dividendReceipts={dividendReceipts} onAiSync={() => handleUnifiedSync(true)} isAiLoading={isAiLoading} />;
      case 'portfolio': return <Portfolio portfolio={portfolio} />;
      case 'transactions': return (
        <Transactions 
          transactions={transactions} 
          onAddTransaction={(t) => setTransactions(prev => [...prev, { ...t, id: crypto.randomUUID() }])} 
          onDeleteTransaction={(id) => setTransactions(prev => prev.filter(x => x.id !== id))}
        />
      );
      default: return <Home portfolio={portfolio} dividendReceipts={dividendReceipts} onAiSync={() => handleUnifiedSync(true)} isAiLoading={isAiLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[80] transition-all duration-300 transform backdrop-blur-md ring-1 ring-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90 text-white shadow-emerald-500/20' : toast.type === 'error' ? 'bg-rose-500/90 text-white shadow-rose-500/20' : 'bg-amber-500/90 text-white shadow-amber-500/20'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
          <span className="text-sm font-bold">{toast.text}</span>
        </div>
      )}

      <Header 
        title={showSettings ? 'Configurações' : (currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Minha Carteira' : 'Transações')} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleFullRefresh} 
        isRefreshing={isRefreshing || isAiLoading} 
      />
      
      <main className="fade-in">{renderPage()}</main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
