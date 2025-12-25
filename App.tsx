
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
    const timer = setTimeout(() => setIsSplashActive(false), 1600);
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
    // Regra da B3: Proventos são devidos a quem possui o ativo no fechamento da Data-Com
    const target = date.split('T')[0];
    return txs
      .filter(t => t.ticker === ticker && t.date <= target)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const { portfolio, dividendReceipts, realizedGain } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    let totalRealizedGain = 0;
    
    // Assegura que as transações estão ordenadas por data para cálculo correto de PM
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    sortedTxs.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!positions[ticker]) {
        positions[ticker] = { ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
      }
      const p = positions[ticker];
      if (t.type === 'BUY') {
        const currentCost = p.quantity * p.averagePrice;
        const newCost = t.quantity * t.price;
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? (currentCost + newCost) / p.quantity : 0;
      } else {
        // Cálculo de Lucro/Prejuízo Realizado na venda
        const costOfSold = t.quantity * p.averagePrice;
        const revenueOfSold = t.quantity * t.price;
        totalRealizedGain += (revenueOfSold - costOfSold);
        p.quantity -= t.quantity;
      }
    });

    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, sortedTxs);
      const total = qtyAtDate * div.rate;
      const assetType = positions[div.ticker]?.assetType;
      
      if (total > 0 && positions[div.ticker]) {
        positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + total;
      }
      
      return { ...div, quantityOwned: qtyAtDate, totalReceived: total, assetType };
    }).filter(r => r.totalReceived > 0);

    receipts.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0)
      .map(p => {
        const quote = quotes[p.ticker];
        return {
          ...p,
          currentPrice: quote?.regularMarketPrice || p.averagePrice,
          logoUrl: quote?.logourl
        };
      });

    return { 
      portfolio: finalPortfolio, 
      dividendReceipts: receipts,
      realizedGain: totalRealizedGain
    };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  const handleAiSync = useCallback(async (force = false) => {
    // Explicitly typing Set to <string> to avoid "unknown[]" inference issues with Array.from in some TS configurations
    const uniqueTickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase()))).sort();
    if (uniqueTickers.length === 0) return;
    
    const tickersStr = uniqueTickers.join(',');
    const lastSync = localStorage.getItem(STORAGE_KEYS.SYNC);
    const isRecent = lastSync && (Date.now() - parseInt(lastSync, 10)) < 1000 * 60 * 60; // Cache de 1h

    if (!force && isRecent && lastSyncTickersRef.current === tickersStr) return;

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(uniqueTickers);
      
      // NOTA: Removemos qualquer lógica de atualização de preços via Gemini.
      // O estado `quotes` agora é gerido exclusivamente pela Brapi.
      
      // Merge inteligente de proventos
      setGeminiDividends(prev => {
        const merged = [...prev, ...data.dividends];
        const uniqueMap = new Map();
        merged.forEach(d => uniqueMap.set(d.id, d));
        return Array.from(uniqueMap.values());
      });

      if (data.sources) setSources(data.sources);
      
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      lastSyncTickersRef.current = tickersStr;
      if (force) showToast('success', 'Inteligência de Dividendos Sincronizada');
    } catch (e) {
      if (force) showToast('error', 'Erro ao consultar IA de Mercado');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    // Explicitly typing Set to <string> to avoid "unknown[]" inference issues with Array.from
    const tickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase())));
    try {
      if (brapiToken) {
        // Envia TRUE no último parâmetro para FORÇAR a atualização, ignorando o cache de 5min
        const brQuotes = await getQuotes(tickers, brapiToken, true);
        const map: Record<string, BrapiQuote> = {};
        brQuotes.forEach(q => map[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...map }));
      }
      await handleAiSync(true);
    } catch (error) {
      showToast('error', 'Falha na atualização em tempo real');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateTransaction = useCallback((id: string, updatedT: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedT, id } : t));
    showToast('success', 'Movimentação atualizada');
  }, [showToast]);

  useEffect(() => {
    if (transactions.length > 0 && !isAiLoading) {
      const timeout = setTimeout(() => handleAiSync(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [transactions.length, handleAiSync]);

  if (isSplashActive) {
    return (
      <div className="fixed inset-0 bg-primary z-[200] flex flex-col items-center justify-center animate-fade-in">
        <div className="relative mb-8 animate-float">
          <div className="w-24 h-24 bg-gradient-to-br from-accent to-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl">
            <TrendingUp className="w-12 h-12 text-primary" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-accent/20 blur-3xl -z-10 animate-pulse-neon rounded-full" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">InvestFIIs</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Finanças Inteligentes</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-slate-100 selection:bg-accent/30 overflow-x-hidden pb-10">
      {updateRegistration && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 glass text-white rounded-2xl flex items-center justify-between gap-3 shadow-2xl z-[150] animate-slide-up border border-accent/20">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Nova versão disponível</span>
          </div>
          <button onClick={handleApplyUpdate} className="bg-accent text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Atualizar</button>
        </div>
      )}

      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[150] transition-all duration-300 animate-fade-in-up backdrop-blur-2xl border border-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-[11px] font-black uppercase tracking-wider">{toast.text}</span>
        </div>
      )}

      <Header 
        title={showSettings ? 'Configurações' : currentTab === 'home' ? 'Resumo' : currentTab === 'portfolio' ? 'Minha Carteira' : 'Histórico'} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleFullRefresh} 
        isRefreshing={isRefreshing || isAiLoading} 
      />
      
      <main className="max-w-screen-sm mx-auto min-h-[calc(100vh-160px)]">
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
                realizedGain={realizedGain}
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
