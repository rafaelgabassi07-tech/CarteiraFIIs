
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';

const STORAGE_KEYS = {
  TXS: 'investfiis_transactions',
  TOKEN: 'investfiis_brapitoken',
  DIVS: 'investfiis_gemini_dividends_cache',
  SYNC: 'investfiis_last_gemini_sync',
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSplashActive, setIsSplashActive] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.TXS) || '[]'));
  const [brapiToken, setBrapiToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TOKEN) || '');
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVS) || '[]'));
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const lastSyncTickersRef = useRef<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashActive(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleUpdate = (e: any) => setUpdateRegistration(e.detail);
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const handleApplyUpdate = () => {
    if (updateRegistration?.waiting) {
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken);
    localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends));
  }, [transactions, brapiToken, geminiDividends]);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getQuantityOnDate = useCallback((ticker: string, date: string, txs: Transaction[]) => {
    const target = date.split('T')[0];
    return txs
      .filter(t => t.ticker === ticker && t.date <= target)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const { portfolio, dividendReceipts } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    
    transactions.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!positions[ticker]) {
        positions[ticker] = { ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
      }
      const p = positions[ticker];
      if (t.type === 'BUY') {
        const cost = (p.quantity * p.averagePrice) + (t.quantity * t.price);
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? cost / p.quantity : 0;
      } else {
        p.quantity -= t.quantity;
      }
    });

    const uniqueDivsMap = new Map<string, DividendReceipt>();
    geminiDividends.forEach(d => uniqueDivsMap.set(d.id, d));
    
    const receipts: DividendReceipt[] = Array.from(uniqueDivsMap.values()).map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, transactions);
      const total = qtyAtDate * div.rate;
      const assetType = positions[div.ticker]?.assetType;
      
      if (total > 0 && positions[div.ticker]) {
        positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + total;
      }
      
      return { ...div, quantityOwned: qtyAtDate, totalReceived: total, assetType };
    }).filter(r => r.totalReceived > 0);

    receipts.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0 || (p.totalDividends || 0) > 0)
      .map(p => {
        const quote = quotes[p.ticker];
        return {
          ...p,
          currentPrice: quote?.regularMarketPrice || p.averagePrice,
          logoUrl: quote?.logourl
        };
      });

    return { portfolio: finalPortfolio, dividendReceipts: receipts };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  const handleAiSync = useCallback(async (force = false) => {
    const uniqueTickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase()))).sort();
    if (uniqueTickers.length === 0) return;
    
    const tickersStr = uniqueTickers.join(',');
    
    if (!force) {
      const lastSync = localStorage.getItem(STORAGE_KEYS.SYNC);
      const isRecent = lastSync && (Date.now() - parseInt(lastSync, 10)) < 1000 * 60 * 30;
      if (isRecent && lastSyncTickersRef.current === tickersStr) return;
    }

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(uniqueTickers);
      const aiQuotes: Record<string, BrapiQuote> = {};
      Object.entries(data.prices).forEach(([symbol, price]) => {
        aiQuotes[symbol] = { symbol, regularMarketPrice: price } as BrapiQuote;
      });
      
      setQuotes(prev => ({ ...prev, ...aiQuotes }));
      setGeminiDividends(prev => {
        const merged = [...prev, ...data.dividends];
        const unique = new Map();
        merged.forEach(d => unique.set(d.id, d));
        return Array.from(unique.values());
      });
      if (data.sources) {
        setSources(data.sources);
      }
      
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      lastSyncTickersRef.current = tickersStr;
      if (force) showToast('success', 'Mercado atualizado com sucesso');
    } catch (e: any) {
      if (force) showToast('error', 'Falha na conexão de mercado');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase())));
    try {
      if (brapiToken) {
        const brQuotes = await getQuotes(tickers, brapiToken);
        const map: Record<string, BrapiQuote> = {};
        brQuotes.forEach(q => map[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...map }));
      }
      await handleAiSync(true);
    } catch (error) {
      showToast('error', 'Erro na atualização de dados');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateTransaction = useCallback((id: string, updatedT: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedT, id } : t));
    setTimeout(() => handleAiSync(false), 800);
    showToast('success', 'Ordem atualizada!');
  }, [handleAiSync, showToast]);

  useEffect(() => {
    if (transactions.length > 0) {
      const timeout = setTimeout(() => handleAiSync(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [transactions.length, handleAiSync]);

  if (isSplashActive) {
    return (
      <div className="fixed inset-0 bg-primary z-[200] flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="relative mb-8 animate-float">
          <div className="w-20 h-20 bg-gradient-to-br from-accent to-blue-600 rounded-[1.5rem] rotate-12 flex items-center justify-center shadow-[0_12px_40px_rgba(56,189,248,0.4)] ring-1 ring-white/10">
            <TrendingUp className="w-10 h-10 text-primary -rotate-12" strokeWidth={3} />
          </div>
          {/* Subtle backglow */}
          <div className="absolute inset-0 bg-accent/20 blur-3xl -z-10 animate-pulse-neon rounded-full" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-[0.25em] mb-4 uppercase">InvestFIIs</h1>
        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-accent w-1/2 rounded-full animate-[shimmer_1.5s_infinite] shadow-[0_0_10px_#38bdf8]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-slate-100 font-sans selection:bg-accent/30 overflow-x-hidden pb-10">
      {updateRegistration && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 glass text-white rounded-2xl flex items-center justify-between gap-3 shadow-2xl z-[150] animate-slide-up border border-accent/20">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Nova versão pronta</span>
          </div>
          <button 
            onClick={handleApplyUpdate}
            className="bg-accent text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent/20"
          >
            Atualizar
          </button>
        </div>
      )}

      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[150] transition-all duration-300 transform animate-fade-in-up backdrop-blur-2xl border border-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-[11px] font-black uppercase tracking-wider">{toast.text}</span>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'InvestFIIs' : currentTab === 'portfolio' ? 'Patrimônio' : 'Histórico'} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleFullRefresh} 
        isRefreshing={isRefreshing || isAiLoading} 
      />
      
      <main className="max-w-screen-sm mx-auto min-h-[calc(100vh-160px)] px-1">
        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken} 
            transactions={transactions} onImportTransactions={setTransactions}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
          />
        ) : (
          <div key={currentTab} className="animate-fade-in duration-500">
            {currentTab === 'home' && (
              <Home 
                portfolio={portfolio} 
                dividendReceipts={dividendReceipts} 
                isAiLoading={isAiLoading} 
                sources={sources}
              />
            )}
            {currentTab === 'portfolio' && <Portfolio portfolio={portfolio} dividendReceipts={dividendReceipts} />}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])} 
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={(id) => setTransactions(p => p.filter(x => x.id !== id))}
              />
            )}
          </div>
        )}
      </main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
