
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
// Added ChevronRight to the lucide-react imports
import { AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Bell, Calendar, DollarSign, X, ArrowRight, History, Clock, CheckCheck, ShieldAlert, Sparkles, LayoutGrid, Info, Zap, ArrowUpCircle, ChevronRight } from 'lucide-react';

const STORAGE_KEYS = {
  TXS: 'investfiis_transactions',
  TOKEN: 'investfiis_brapitoken',
  DIVS: 'investfiis_gemini_dividends_cache',
  SYNC: 'investfiis_last_gemini_sync',
  SYNC_TICKERS: 'investfiis_last_synced_tickers',
  NOTIFY_PREFS: 'investfiis_prefs_notifications'
};

const AI_CACHE_DURATION = 24 * 60 * 60 * 1000;

interface MarketEvent {
  id: string;
  ticker: string;
  type: 'PAYMENT' | 'DATA_COM';
  date: string;
  formattedDate: string;
  daysRemaining: number;
  amount?: number;
  description: string;
  isPast: boolean;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'upcoming' | 'history'>('all');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.TXS) || '[]'));
  
  const [brapiToken, setBrapiToken] = useState(() => {
    const envToken = process.env.BRAPI_TOKEN;
    const localToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return envToken || localToken || '';
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVS) || '[]'));
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  
  const [upcomingEvents, setUpcomingEvents] = useState<MarketEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<MarketEvent[]>([]);

  // Escuta por atualizações do Service Worker (A PROVA DE FALHAS)
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const reg = (e as CustomEvent).detail;
      setSwRegistration(reg);
    };
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 1200);
    const removeTimer = setTimeout(() => setIsSplashActive(false), 1600);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleApplyUpdate = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    const eligibleTxs = txs.filter(t => t.ticker === ticker && t.date <= dateCom);
    return eligibleTxs.reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  // Cálculo de Aporte Mensal Real Dinâmico
  const monthlyContribution = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions
      .filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'BUY';
      })
      .reduce((acc, t) => acc + (t.quantity * t.price), 0);
  }, [transactions]);

  const { portfolio, dividendReceipts, realizedGain } = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, sortedTxs);
      const eligibleQty = Math.max(0, qtyAtDate);
      const total = eligibleQty * div.rate;
      const assetInfo = sortedTxs.find(t => t.ticker === div.ticker);
      
      return { 
          ...div, 
          quantityOwned: eligibleQty, 
          totalReceived: total,
          assetType: assetInfo?.assetType || AssetType.FII 
      };
    }).filter(r => r.totalReceived > 0);

    receipts.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const dividendsByTicker: Record<string, number> = {};
    receipts.forEach(r => {
      if (new Date(r.paymentDate + 'T12:00:00') <= new Date()) {
        dividendsByTicker[r.ticker] = (dividendsByTicker[r.ticker] || 0) + r.totalReceived;
      }
    });

    const positions: Record<string, AssetPosition> = {};
    let totalRealizedGain = 0;
    
    sortedTxs.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!positions[ticker]) {
        positions[ticker] = { 
            ticker, 
            quantity: 0, 
            averagePrice: 0, 
            assetType: t.assetType, 
            totalDividends: dividendsByTicker[ticker] || 0 
        };
      }
      const p = positions[ticker];
      if (t.type === 'BUY') {
        const currentCost = p.quantity * p.averagePrice;
        const newCost = t.quantity * t.price;
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? (currentCost + newCost) / p.quantity : 0;
      } else {
        const costOfSold = t.quantity * p.averagePrice;
        const revenueOfSold = t.quantity * t.price;
        totalRealizedGain += (revenueOfSold - costOfSold);
        p.quantity -= t.quantity;
      }
    });

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

    return { portfolio: finalPortfolio, dividendReceipts: receipts, realizedGain: totalRealizedGain };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  useEffect(() => {
    if (geminiDividends.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const portfolioTickers = new Set(portfolio.map(p => p.ticker));
    const upcoming: MarketEvent[] = [];
    const history: MarketEvent[] = [];
    const processedKeys = new Set<string>();

    geminiDividends.forEach(div => {
        if (!portfolioTickers.has(div.ticker)) return;
        const processEvent = (dateStr: string, type: 'PAYMENT' | 'DATA_COM', desc: string, amount?: number) => {
            if (!dateStr) return;
            const eventDate = new Date(dateStr + 'T12:00:00');
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const key = `${type}-${div.ticker}-${dateStr}`; 
            if (processedKeys.has(key)) return;
            const currentPos = portfolio.find(p => p.ticker === div.ticker);
            const estimatedAmount = (amount || div.rate) * (currentPos?.quantity || 0);
            const eventObj: MarketEvent = {
                id: key, ticker: div.ticker, type, date: dateStr, 
                formattedDate: dateStr.split('-').reverse().join('/'),
                daysRemaining: diffDays, amount: estimatedAmount, description: desc, isPast: diffDays < 0
            };
            if (diffDays >= 0 && diffDays <= 60) { upcoming.push(eventObj); processedKeys.add(key); }
            else if (diffDays < 0 && diffDays >= -60) { history.push(eventObj); processedKeys.add(key); }
        };
        processEvent(div.paymentDate, 'PAYMENT', `Renda de ${div.type}`, div.rate);
        processEvent(div.dateCom, 'DATA_COM', `Data Com B3`);
    });
    upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
    history.sort((a, b) => b.daysRemaining - a.daysRemaining);
    setUpcomingEvents(upcoming);
    setPastEvents(history);
  }, [geminiDividends, portfolio]);

  const syncBrapiData = useCallback(async (force = false) => {
    if (!brapiToken || transactions.length === 0) return;
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase())));
    setIsPriceLoading(true);
    try {
        const result = await getQuotes(uniqueTickers, brapiToken, force);
        if (result.error) showToast('error', result.error);
        const map: Record<string, BrapiQuote> = {};
        result.quotes.forEach(q => map[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...map }));
    } catch (e) {
        console.error("Brapi Fail", e);
    } finally {
        setIsPriceLoading(false);
    }
  }, [brapiToken, transactions, showToast]);

  const handleAiSync = useCallback(async (force = false) => {
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase()))).sort();
    if (uniqueTickers.length === 0) return;
    const tickersStr = uniqueTickers.join(',');
    const lastSyncTime = localStorage.getItem(STORAGE_KEYS.SYNC);
    const lastSyncedTickers = localStorage.getItem(STORAGE_KEYS.SYNC_TICKERS);
    if (!force && lastSyncTime && (Date.now() - parseInt(lastSyncTime, 10)) < AI_CACHE_DURATION && lastSyncedTickers === tickersStr) return;
    setIsAiLoading(true);
    try {
      // Added explicit cast to string[] to satisfy the compiler and fix the 'unknown[]' assignment error
      const data = await fetchUnifiedMarketData(uniqueTickers as string[]);
      setGeminiDividends(data.dividends);
      if (data.sources) setSources(data.sources);
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      localStorage.setItem(STORAGE_KEYS.SYNC_TICKERS, tickersStr);
    } catch (e) {
      if (force) showToast('error', 'Falha ao conectar com Gemini');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading || isPriceLoading) return;
    setIsRefreshing(true);
    try {
      await Promise.all([syncBrapiData(true), handleAiSync(true)]);
      showToast('success', 'Carteira Atualizada');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { syncBrapiData(); handleAiSync(); }, [syncBrapiData, handleAiSync]);

  return (
    <div className="min-h-screen bg-primary text-slate-100 pb-10">
      <div className="fixed inset-x-0 top-0 pt-safe mt-2 z-[200] flex flex-col items-center gap-4 px-4 pointer-events-none">
        {toast && (
          <div className="w-full max-w-sm pointer-events-auto animate-fade-in-up">
            <div className={`p-4 rounded-[2rem] flex items-center gap-4 shadow-2xl backdrop-blur-md border border-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span className="text-xs font-black uppercase tracking-wider">{toast.text}</span>
            </div>
          </div>
        )}
        
        {/* Banner de Atualização Crítica */}
        {swRegistration && (
          <div className="w-full max-w-sm pointer-events-auto animate-fade-in-up">
             <button 
                onClick={handleApplyUpdate}
                className="w-full bg-indigo-600 hover:bg-indigo-500 p-4 rounded-[2rem] flex items-center justify-between shadow-[0_15px_30px_rgba(79,70,229,0.4)] border border-white/20 group transition-all"
             >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"><ArrowUpCircle className="w-5 h-5 animate-bounce" /></div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Nova Versão v2.5.0</p>
                      <p className="text-xs font-black text-white uppercase tracking-tighter">Toque para atualizar agora</p>
                   </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        )}
      </div>

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Resumo' : currentTab === 'portfolio' ? 'Meus Ativos' : 'Movimentações'} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleFullRefresh} 
        isRefreshing={isRefreshing || isAiLoading || isPriceLoading}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={upcomingEvents.length}
      />
      
      <main className="max-w-screen-md mx-auto">
        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken} 
            transactions={transactions} onImportTransactions={setTransactions}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
          />
        ) : (
          <div key={currentTab} className="animate-fade-in">
            {currentTab === 'home' && <Home portfolio={portfolio} dividendReceipts={dividendReceipts} isAiLoading={isAiLoading || isPriceLoading} sources={sources} realizedGain={realizedGain} monthlyContribution={monthlyContribution} />}
            {currentTab === 'portfolio' && <Portfolio portfolio={portfolio} dividendReceipts={dividendReceipts} monthlyContribution={monthlyContribution} />}
            {currentTab === 'transactions' && <Transactions transactions={transactions} onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])} onUpdateTransaction={(id, updated) => setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t))} onDeleteTransaction={(id) => setTransactions(p => p.filter(x => x.id !== id))} monthlyContribution={monthlyContribution} />}
          </div>
        )}
      </main>
      
      <SwipeableModal isOpen={showNotifications} onClose={() => setShowNotifications(false)}>
        <div className="px-6 pt-2 pb-10 flex flex-col h-full">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Agenda B3</h3>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">Próximos Pagamentos</p>
              </div>
           </div>
           <div className="flex bg-slate-950/40 p-1.5 rounded-[1.5rem] mb-8 border border-white/5">
               <button onClick={() => setNotificationFilter('all')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notificationFilter === 'all' ? 'bg-indigo-500 text-primary' : 'text-slate-500'}`}>Tudo</button>
               <button onClick={() => setNotificationFilter('upcoming')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notificationFilter === 'upcoming' ? 'bg-indigo-500 text-primary' : 'text-slate-500'}`}>Pendentes</button>
               <button onClick={() => setNotificationFilter('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notificationFilter === 'history' ? 'bg-indigo-500 text-primary' : 'text-slate-500'}`}>Histórico</button>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
             {(notificationFilter === 'all' || notificationFilter === 'upcoming') && upcomingEvents.map((event, idx) => (
                <div key={event.id} className="bg-white/[0.02] p-5 rounded-[2.2rem] flex items-center gap-4 border border-white/[0.04] animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${event.type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                    {event.type === 'PAYMENT' ? <DollarSign className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black text-white text-base tracking-tighter">{event.ticker}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${event.daysRemaining <= 3 ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-500'}`}>
                        {event.daysRemaining === 0 ? 'HOJE' : `D-${event.daysRemaining}`}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{event.description}</p>
                    {event.amount && event.type === 'PAYMENT' && <div className="text-emerald-400 font-black text-sm mt-1">Estimado R$ {event.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>}
                  </div>
                </div>
             ))}
             {(notificationFilter === 'all' || notificationFilter === 'history') && pastEvents.map((event, idx) => (
                <div key={event.id} className="bg-white/[0.01] p-4 rounded-3xl flex items-center gap-4 border border-white/[0.02] opacity-50 grayscale">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-600">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300 text-sm">{event.ticker}</span>
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{event.formattedDate}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium">{event.description}</p>
                  </div>
                </div>
             ))}
           </div>
        </div>
      </SwipeableModal>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
