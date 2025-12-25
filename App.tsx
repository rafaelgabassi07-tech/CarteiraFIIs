
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const autoSyncRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashActive(false), 2200);
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

  // Processamento unificado da carteira
  const { portfolio, dividendReceipts } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    
    // 1. Posições e Preço Médio
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

    // 2. Proventos
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

    // 3. Enriquecimento com Fallback Seguro
    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0 || (p.totalDividends || 0) > 0)
      .map(p => {
        const quote = quotes[p.ticker];
        return {
          ...p,
          // Se não houver cotação em tempo real, usa o preço médio para evitar erro de saldo zerado
          currentPrice: quote?.regularMarketPrice || p.averagePrice,
          logoUrl: quote?.logourl
        };
      });

    return { portfolio: finalPortfolio, dividendReceipts: receipts };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  const handleAiSync = useCallback(async (force = false) => {
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (tickers.length === 0) return;
    
    if (!force) {
      const last = localStorage.getItem(STORAGE_KEYS.SYNC);
      if (last && Date.now() - parseInt(last) < 1000 * 60 * 60) return;
    }

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(tickers);
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
      
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      if (force) showToast('success', 'Sincronizado com IA');
    } catch (e: any) {
      console.error("AI Sync Error:", e);
      if (force) showToast('error', 'Falha na IA: Tente novamente');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    try {
      if (brapiToken) {
        const brQuotes = await getQuotes(tickers, brapiToken);
        const map: Record<string, BrapiQuote> = {};
        brQuotes.forEach(q => map[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...map }));
      }
      await handleAiSync(true);
    } catch (error) {
      showToast('error', 'Erro na atualização de mercado');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateTransaction = useCallback((id: string, updatedT: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedT, id } : t));
    showToast('success', 'Transação atualizada!');
  }, [showToast]);

  useEffect(() => {
    if (!autoSyncRef.current && transactions.length > 0) {
      autoSyncRef.current = true;
      const timeout = setTimeout(() => handleAiSync(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [transactions.length, handleAiSync]);

  if (isSplashActive) {
    return (
      <div className="fixed inset-0 bg-primary z-[100] flex flex-col items-center justify-center p-6">
        <div className="relative mb-6 animate-pulse-neon">
          <div className="w-24 h-24 bg-gradient-to-br from-accent to-blue-600 rounded-3xl rotate-12 flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.3)]">
            <TrendingUp className="w-12 h-12 text-primary -rotate-12" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-white tracking-[0.2em] mb-2 uppercase">InvestFIIs</h1>
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-accent animate-[slideRight_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans selection:bg-accent/30 overflow-x-hidden">
      {updateRegistration && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 bg-accent text-primary rounded-2xl flex items-center justify-between gap-3 shadow-[0_0_40px_rgba(56,189,248,0.4)] z-[100] animate-fade-in-up border border-white/20">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin-slow" />
            <span className="text-xs font-black uppercase tracking-tight">Nova versão pronta!</span>
          </div>
          <button 
            onClick={handleApplyUpdate}
            className="bg-primary text-accent px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Aplicar
          </button>
        </div>
      )}

      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[80] transition-all duration-300 transform animate-fade-in-up backdrop-blur-xl border border-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.text}</span>
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
      
      <main className="max-w-screen-sm mx-auto min-h-screen">
        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken} 
            transactions={transactions} onImportTransactions={setTransactions}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
          />
        ) : (
          <div key={currentTab} className="animate-fade-in">
            {currentTab === 'home' && <Home portfolio={portfolio} dividendReceipts={dividendReceipts} />}
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
