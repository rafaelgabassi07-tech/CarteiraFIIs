
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { Rocket, CheckCircle2, Package, ArrowRight } from 'lucide-react';

const APP_VERSION = '3.1.7';
const STORAGE_KEYS = {
  TXS: 'investfiis_v4_transactions',
  TOKEN: 'investfiis_v4_brapi_token',
  DIVS: 'investfiis_v4_div_cache',
  THEME: 'investfiis_theme',
};

export type ThemeType = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [toast, setToast] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TXS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [brapiToken, setBrapiToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TOKEN) || process.env.BRAPI_TOKEN || '');

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DIVS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persistence
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken); }, [brapiToken]);

  // Theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Update Check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.version !== APP_VERSION) setShowUpdateModal(true);
        }
      } catch {}
    };
    check();
  }, []);

  // Calculations
  const getQuantityOnDate = useCallback((ticker: string, dateLimit: string, txs: Transaction[]) => {
    return txs
      .filter(t => t.ticker === ticker && t.date <= dateLimit)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const memoizedData = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const nowStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    const today = new Date();
    today.setHours(0,0,0,0);

    const contribution = transactions
      .filter(t => t.type === 'BUY' && t.date.startsWith(nowStr))
      .reduce((acc, t) => acc + (t.quantity * t.price), 0);

    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qty = Math.max(0, getQuantityOnDate(div.ticker, div.dateCom, sortedTxs));
      return { ...div, quantityOwned: qty, totalReceived: qty * div.rate };
    }).filter(r => r.totalReceived > 0);

    const divPaidMap: Record<string, number> = {};
    receipts.forEach(r => {
      const pDate = new Date(r.paymentDate + 'T12:00:00');
      if (pDate <= today) {
        divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived;
      }
    });

    const positions: Record<string, AssetPosition> = {};
    let gain = 0;
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) {
        positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: divPaidMap[t.ticker] || 0 };
      }
      const p = positions[t.ticker];
      if (t.type === 'BUY') {
        const cost = p.quantity * p.averagePrice;
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? (cost + (t.quantity * t.price)) / p.quantity : 0;
      } else {
        gain += (t.quantity * t.price) - (t.quantity * p.averagePrice);
        p.quantity -= t.quantity;
      }
    });

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0)
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));

    return { portfolio: finalPortfolio, dividendReceipts: receipts, realizedGain: gain, monthlyContribution: contribution };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  const syncAll = useCallback(async (force = false) => {
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;

    setIsRefreshing(true);
    try {
      if (brapiToken) {
        const priceRes = await getQuotes(tickers, brapiToken, force);
        const newQuotes: Record<string, BrapiQuote> = {};
        priceRes.quotes.forEach(q => newQuotes[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...newQuotes }));
      }
      setIsAiLoading(true);
      const aiData = await fetchUnifiedMarketData(tickers);
      setGeminiDividends(aiData.dividends);
      setSources(aiData.sources || []);
      if (force) showToast('success', 'Carteira Atualizada');
    } catch (e) {
      showToast('error', 'Falha na conexão');
    } finally {
      setIsRefreshing(false);
      setIsAiLoading(false);
    }
  }, [transactions, brapiToken, showToast]);

  useEffect(() => { syncAll(); }, []);

  return (
    <div className="min-h-screen transition-colors duration-500 bg-primary-light dark:bg-primary-dark">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm animate-fade-in-up">
          <div className={`flex items-center gap-3 p-4 rounded-3xl shadow-2xl border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : 'bg-rose-500/90 border-rose-400'} text-white`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">{toast.text}</span>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Minha Custódia' : 'Histórico de Ordens'}
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onSettingsClick={() => setShowSettings(true)}
        onRefresh={() => syncAll(true)}
        isRefreshing={isRefreshing || isAiLoading}
      />

      <main className="max-w-screen-md mx-auto pt-2">
        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken}
            transactions={transactions} onImportTransactions={setTransactions}
            geminiDividends={geminiDividends} onImportDividends={setGeminiDividends}
            theme={theme} onSetTheme={setTheme}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
          />
        ) : (
          <div className="animate-fade-in">
            {currentTab === 'home' && <Home {...memoizedData} sources={sources} isAiLoading={isAiLoading} />}
            {currentTab === 'portfolio' && <Portfolio {...memoizedData} />}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])}
                onUpdateTransaction={(id, updated) => setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t))}
                onDeleteTransaction={(id) => setTransactions(p => p.filter(t => t.id !== id))}
                monthlyContribution={memoizedData.monthlyContribution}
              />
            )}
          </div>
        )}
      </main>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}

      <SwipeableModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)}>
        <div className="p-8 bg-white dark:bg-slate-900 h-full flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-6 shadow-inner"><Rocket className="w-12 h-12" /></div>
            <h3 className="text-3xl font-black mb-2">Upgrade Pronto!</h3>
            <p className="text-slate-500 mb-10">Uma nova versão do InvestFIIs está disponível com melhorias de performance e UI.</p>
            <button onClick={() => window.location.reload()} className="w-full bg-accent text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">Recarregar agora <ArrowRight className="w-5 h-5" /></button>
        </div>
      </SwipeableModal>
    </div>
  );
};

export default App;
