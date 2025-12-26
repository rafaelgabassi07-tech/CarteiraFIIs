
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { Rocket, CheckCircle2, ChevronRight, Package, ArrowRight, DollarSign, Calendar, RefreshCw } from 'lucide-react';

const APP_VERSION = '2.7.0';
const STORAGE_KEYS = {
  TXS: 'investfiis_v3_transactions',
  TOKEN: 'investfiis_v3_brapi_token',
  DIVS: 'investfiis_v3_div_cache',
  SYNC: 'investfiis_v3_last_sync',
  THEME: 'investfiis_theme',
  VER_CHECK: 'investfiis_last_ver_check'
};

export type ThemeType = 'light' | 'dark' | 'system';

interface UpdateData {
  version: string;
  notes: Array<{ type: string; title: string; desc: string }>;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [toast, setToast] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.TXS) || '[]'));
  
  const [brapiToken, setBrapiToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TOKEN) || process.env.BRAPI_TOKEN || '');

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVS) || '[]'));
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persistence Effects
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken); }, [brapiToken]);

  // Theme Management
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Update System
  const checkUpdates = useCallback(async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUpdateData(data);
        if (data.version !== APP_VERSION) setShowUpdateModal(true);
      }
    } catch (e) { console.warn("Update check fail"); }
  }, []);

  useEffect(() => { checkUpdates(); }, [checkUpdates]);

  // Calculations
  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    return txs
      .filter(t => t.ticker === ticker && t.date <= dateCom)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const { portfolio, dividendReceipts, realizedGain, monthlyContribution } = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date();
    
    // Monthly Contribution
    const contribution = transactions
      .filter(t => t.type === 'BUY' && t.date.startsWith(now.toISOString().substring(0, 7)))
      .reduce((acc, t) => acc + (t.quantity * t.price), 0);

    // Dividend Calculations
    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qty = Math.max(0, getQuantityOnDate(div.ticker, div.dateCom, sortedTxs));
      const total = qty * div.rate;
      return { ...div, quantityOwned: qty, totalReceived: total };
    }).filter(r => r.totalReceived > 0);

    const divMap: Record<string, number> = {};
    receipts.forEach(r => {
      if (new Date(r.paymentDate + 'T12:00:00') <= now) {
        divMap[r.ticker] = (divMap[r.ticker] || 0) + r.totalReceived;
      }
    });

    // Positions
    const positions: Record<string, AssetPosition> = {};
    let gain = 0;
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) {
        positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: divMap[t.ticker] || 0 };
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

  // Sync Logic
  const syncAll = useCallback(async (force = false) => {
    const tickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;

    setIsRefreshing(true);
    try {
      // 1. Preços (Brapi)
      if (brapiToken) {
        setIsPriceLoading(true);
        const priceRes = await getQuotes(tickers, brapiToken, force);
        const newQuotes: Record<string, BrapiQuote> = {};
        priceRes.quotes.forEach(q => newQuotes[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...newQuotes }));
        setIsPriceLoading(false);
      }

      // 2. Dividendos (Gemini)
      setIsAiLoading(true);
      const aiData = await fetchUnifiedMarketData(tickers);
      setGeminiDividends(aiData.dividends);
      setSources(aiData.sources || []);
      setIsAiLoading(false);

      if (force) showToast('success', 'Carteira Sincronizada!');
    } catch (e) {
      showToast('error', 'Falha na sincronização.');
    } finally {
      setIsRefreshing(false);
    }
  }, [transactions, brapiToken, showToast]);

  useEffect(() => { syncAll(); }, []);

  const handleApplyUpdate = () => {
    if (window.caches) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    window.location.reload();
  };

  return (
    <div className="pb-20">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm animate-fade-in-up">
          <div className={`flex items-center gap-3 p-4 rounded-3xl shadow-2xl border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : 'bg-rose-500/90 border-rose-400'} text-white`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">{toast.text}</span>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Resumo' : currentTab === 'portfolio' ? 'Custódia' : 'Ordens'}
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onSettingsClick={() => setShowSettings(true)}
        onRefresh={() => syncAll(true)}
        isRefreshing={isRefreshing}
        notificationCount={0}
      />

      <main className="max-w-screen-md mx-auto px-4 pt-4">
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
            {currentTab === 'home' && <Home portfolio={portfolio} dividendReceipts={dividendReceipts} realizedGain={realizedGain} monthlyContribution={monthlyContribution} sources={sources} />}
            {currentTab === 'portfolio' && <Portfolio portfolio={portfolio} dividendReceipts={dividendReceipts} monthlyContribution={monthlyContribution} />}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={(t: any) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])}
                onUpdateTransaction={(id: string, updated: any) => setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t))}
                onDeleteTransaction={(id: string) => setTransactions(p => p.filter(t => t.id !== id))}
                monthlyContribution={monthlyContribution}
              />
            )}
          </div>
        )}
      </main>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}

      <SwipeableModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)}>
        <div className="p-8 bg-white dark:bg-slate-900 h-full flex flex-col">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center text-accent mx-auto mb-6 shadow-xl">
              <Package className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black tracking-tighter mb-2">Update Disponível</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">v{updateData?.version || 'Novo'}</p>
          </div>
          
          <div className="flex-1 space-y-4 mb-8">
            {updateData?.notes.map((note, idx) => (
              <div key={idx} className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">{note.title}</h4>
                  <p className="text-xs text-slate-500">{note.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleApplyUpdate} className="w-full bg-accent text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-95">
            Atualizar Agora <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </SwipeableModal>
    </div>
  );
};

export default App;
