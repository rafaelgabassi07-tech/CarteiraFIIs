
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Bell, Calendar, DollarSign, X, ArrowRight, History, Clock, CheckCheck, ShieldAlert, Sparkles, LayoutGrid, Info } from 'lucide-react';

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
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
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
  
  const lastSyncTickersRef = useRef<string>("");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 1200);
    const removeTimer = setTimeout(() => setIsSplashActive(false), 1600);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  useEffect(() => {
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);

  useEffect(() => {
    const handleUpdateEvent = (e: any) => setUpdateRegistration(e.detail);
    window.addEventListener('sw-update-available', handleUpdateEvent);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg && reg.waiting) setUpdateRegistration(reg);
        }).catch(() => {});
    }
    return () => window.removeEventListener('sw-update-available', handleUpdateEvent);
  }, []);

  const handleApplyUpdate = () => {
    if (updateRegistration?.waiting) {
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    if (brapiToken !== process.env.BRAPI_TOKEN) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken);
    }
    localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends));
  }, [transactions, brapiToken, geminiDividends]);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    const eligibleTxs = txs.filter(t => t.ticker === ticker && t.date <= dateCom);
    return eligibleTxs.reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const portfolioStartDate = useMemo(() => {
    if (transactions.length === 0) return new Date().toISOString();
    const dates = transactions.map(t => t.date).sort();
    return dates[0];
  }, [transactions]);

  const monthlyContribution = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions.reduce((acc, t) => {
      const tDate = new Date(t.date + 'T12:00:00');
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        const value = t.quantity * t.price;
        return t.type === 'BUY' ? acc + value : acc - value;
      }
      return acc;
    }, 0);
  }, [transactions]);

  const { portfolio, dividendReceipts, realizedGain } = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, sortedTxs);
      const eligibleQty = Math.max(0, qtyAtDate);
      const total = eligibleQty * div.rate;
      return { 
          ...div, 
          quantityOwned: eligibleQty, 
          totalReceived: total,
          assetType: sortedTxs.find(t => t.ticker === div.ticker)?.assetType 
      };
    }).filter(r => r.totalReceived > 0);

    receipts.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    const dividendsByTicker: Record<string, number> = {};
    receipts.forEach(r => dividendsByTicker[r.ticker] = (dividendsByTicker[r.ticker] || 0) + r.totalReceived);

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

  // Lógica de Notificações Aprimorada (Failsafe)
  useEffect(() => {
    if (geminiDividends.length === 0) {
      setUpcomingEvents([]);
      setPastEvents([]);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Failsafe: Filtrar apenas ativos que existem no portfolio atual
    const portfolioTickers = new Set(portfolio.map(p => p.ticker));
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFY_PREFS) || '{"payments": true, "datacom": true}');

    const upcoming: MarketEvent[] = [];
    const history: MarketEvent[] = [];
    const processedKeys = new Set<string>();

    geminiDividends.forEach(div => {
        // Só processa se o ativo estiver na carteira
        if (!portfolioTickers.has(div.ticker)) return;

        const processEvent = (dateStr: string, type: 'PAYMENT' | 'DATA_COM', desc: string, amount?: number) => {
            if (!dateStr) return;
            
            // Verifica preferências do usuário
            if (type === 'PAYMENT' && !prefs.payments) return;
            if (type === 'DATA_COM' && !prefs.datacom) return;

            const eventDate = new Date(dateStr + 'T12:00:00');
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const key = `${type}-${div.ticker}-${dateStr}-${amount || '0'}`; 
            if (processedKeys.has(key)) return;

            // Busca quantidade atual para estimar valor
            const currentPos = portfolio.find(p => p.ticker === div.ticker);
            const estimatedAmount = (amount || div.rate) * (currentPos?.quantity || 0);

            const eventObj: MarketEvent = {
                id: key, ticker: div.ticker, type, date: dateStr, 
                formattedDate: dateStr.split('-').reverse().join('/'),
                daysRemaining: diffDays, amount: estimatedAmount, description: desc, isPast: diffDays < 0
            };

            if (diffDays >= 0 && diffDays <= 15) { // Estendido para 15 dias para melhor planejamento
                upcoming.push(eventObj);
                processedKeys.add(key);
            } else if (diffDays < 0 && diffDays >= -60) { // Estendido para 60 dias de histórico
                history.push(eventObj);
                processedKeys.add(key);
            }
        };

        processEvent(div.paymentDate, 'PAYMENT', `Recebimento de ${div.type === 'DIVIDENDO' ? 'Dividendo' : 'JCP'}`, div.rate);
        processEvent(div.dateCom, 'DATA_COM', `Data Com (Corte Dividendos)`);
    });

    upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
    history.sort((a, b) => b.daysRemaining - a.daysRemaining);
    
    setUpcomingEvents(upcoming);
    setPastEvents(history);
  }, [geminiDividends, portfolio]);

  const syncBrapiData = useCallback(async (force = false) => {
    if (!brapiToken || transactions.length === 0) return;
    const uniqueTickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase())));
    setIsPriceLoading(true);
    try {
        const result = await getQuotes(uniqueTickers, brapiToken, force);
        if (result.error) {
          showToast('error', result.error);
        }
        const map: Record<string, BrapiQuote> = {};
        result.quotes.forEach(q => map[q.symbol] = q);
        if (Object.keys(map).length > 0) {
            setQuotes(prev => ({ ...prev, ...map }));
        }
    } catch (error) {
        console.error("Erro ao buscar cotações Brapi", error);
    } finally {
        setIsPriceLoading(false);
    }
  }, [brapiToken, transactions, showToast]);

  useEffect(() => {
    syncBrapiData(false);
  }, [syncBrapiData]);

  const handleAiSync = useCallback(async (force = false) => {
    const uniqueTickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase()))).sort();
    if (uniqueTickers.length === 0) return;
    
    const tickersStr = uniqueTickers.join(',');
    const lastSyncTime = localStorage.getItem(STORAGE_KEYS.SYNC);
    const lastSyncedTickers = localStorage.getItem(STORAGE_KEYS.SYNC_TICKERS);
    
    const isRecent = lastSyncTime && (Date.now() - parseInt(lastSyncTime, 10)) < AI_CACHE_DURATION;
    const isSameTickers = lastSyncedTickers === tickersStr;

    if (!force && isRecent && isSameTickers) {
        return;
    }

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(uniqueTickers);
      setGeminiDividends(prev => {
        const uniqueMap = new Map();
        prev.forEach(d => uniqueMap.set(d.id, d));
        data.dividends.forEach(d => uniqueMap.set(d.id, d));
        return Array.from(uniqueMap.values());
      });
      if (data.sources) setSources(data.sources);
      
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      localStorage.setItem(STORAGE_KEYS.SYNC_TICKERS, tickersStr);
      lastSyncTickersRef.current = tickersStr;
    } catch (e) {
      if (force) showToast('error', 'Erro na IA de Dividendos');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading || isPriceLoading) return;
    setIsRefreshing(true);
    try {
      await Promise.all([syncBrapiData(true), handleAiSync(true)]);
      showToast('success', 'Atualização completa concluída');
    } catch (error) {
      showToast('error', 'Falha na atualização');
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
      const timeout = setTimeout(() => handleAiSync(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [transactions.length, handleAiSync]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isSplashActive) {
    return (
      <div className={`fixed inset-0 bg-[#020617] z-[300] flex flex-col items-center justify-center transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative mb-8 animate-float">
          <div className="w-24 h-24 bg-gradient-to-tr from-accent to-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl ring-1 ring-white/10">
            <TrendingUp className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-accent/30 blur-[40px] -z-10 animate-pulse-slow rounded-full" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">InvestFIIs</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Finanças Inteligentes</p>
      </div>
    );
  }

  const nextPaydaySum = upcomingEvents.filter(e => e.type === 'PAYMENT' && e.daysRemaining <= 7).reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-primary text-slate-100 selection:bg-accent/30 overflow-x-hidden pb-10">
      <div className="fixed inset-x-0 top-0 pt-safe mt-2 z-[200] flex flex-col items-center gap-4 px-4 pointer-events-none">
        {updateRegistration && (
          <div className="w-full max-w-sm pointer-events-auto animate-slide-up">
            <div className="relative overflow-hidden bg-slate-900 border border-accent/40 p-4 rounded-3xl flex items-center justify-between gap-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/10 group">
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-accent/20 rounded-xl text-accent animate-pulse">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Atualização</h4>
                    <p className="text-xs font-bold text-white whitespace-nowrap">Nova versão disponível</p>
                  </div>
                </div>
                <button onClick={handleApplyUpdate} className="relative z-10 bg-accent text-primary px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent/20 tap-highlight">Atualizar</button>
            </div>
          </div>
        )}
        {toast && (
          <div className="w-full max-w-sm pointer-events-auto animate-fade-in-up">
            <div className={`p-4 rounded-[2rem] flex items-center gap-4 shadow-2xl backdrop-blur-2xl border border-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-rose-500/90'} text-white`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
              <span className="text-xs font-black uppercase tracking-wider">{toast.text}</span>
            </div>
          </div>
        )}
      </div>

      <Header 
        title={showSettings ? 'Configurações' : currentTab === 'home' ? 'Resumo' : currentTab === 'portfolio' ? 'Minha Carteira' : 'Histórico'} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleFullRefresh} 
        isRefreshing={isRefreshing || isAiLoading || isPriceLoading}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={upcomingEvents.length}
      />
      
      <main className="max-w-screen-md mx-auto min-h-[calc(100vh-160px)]">
        {!brapiToken && !showSettings && (
          <div className="mx-5 mb-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-fade-in flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-500">Token Brapi Ausente</p>
              <p className="text-[10px] text-rose-400/80">Vá em Configurações para adicionar seu Token e ver cotações em tempo real.</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Ajustar</button>
          </div>
        )}

        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken} 
            transactions={transactions} onImportTransactions={setTransactions}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
          />
        ) : (
          <div key={currentTab} className="animate-fade-in duration-300">
            {currentTab === 'home' && (
              <Home 
                portfolio={portfolio} 
                dividendReceipts={dividendReceipts} 
                isAiLoading={isAiLoading || isPriceLoading} 
                sources={sources}
                realizedGain={realizedGain}
                portfolioStartDate={portfolioStartDate}
              />
            )}
            {currentTab === 'portfolio' && (
              <Portfolio portfolio={portfolio} dividendReceipts={dividendReceipts} monthlyContribution={monthlyContribution} />
            )}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])} 
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={(id) => setTransactions(p => p.filter(x => x.id !== id))}
                monthlyContribution={monthlyContribution}
              />
            )}
          </div>
        )}
      </main>
      
      {/* MODAL NOTIFICAÇÕES APRIMORADO */}
      <SwipeableModal isOpen={showNotifications} onClose={() => setShowNotifications(false)}>
        <div className="px-6 pt-2 pb-10 flex flex-col h-full">
           <div className="flex items-center justify-between mb-8 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Eventos de Mercado</h3>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">Sua agenda personalizada</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => showToast('success', 'Tudo limpo!')} className="p-2 bg-white/5 rounded-xl text-slate-500 active:scale-90 transition-all">
                    <CheckCheck className="w-5 h-5" />
                 </button>
              </div>
           </div>

           {/* Filtros de Notificação */}
           <div className="flex bg-slate-950/40 p-1.5 rounded-[1.5rem] mb-8 border border-white/5 shrink-0">
               <button onClick={() => setNotificationFilter('all')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notificationFilter === 'all' ? 'bg-indigo-500 text-primary shadow-lg' : 'text-slate-500'}`}>Tudo</button>
               <button onClick={() => setNotificationFilter('upcoming')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notificationFilter === 'upcoming' ? 'bg-indigo-500 text-primary shadow-lg' : 'text-slate-500'}`}>Próximos</button>
               <button onClick={() => setNotificationFilter('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${notificationFilter === 'history' ? 'bg-indigo-500 text-primary shadow-lg' : 'text-slate-500'}`}>Passado</button>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
             
             {/* Card de Resumo de Pagamentos */}
             {nextPaydaySum > 0 && notificationFilter !== 'history' && (
               <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-slate-900 border border-emerald-500/20 p-6 rounded-[2.5rem] mb-6 animate-fade-in">
                  <div className="flex items-center gap-3 mb-2">
                     <Sparkles className="w-4 h-4 text-emerald-400" />
                     <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Previsão 7 Dias</span>
                  </div>
                  <div className="text-3xl font-black text-white tabular-nums">R$ {formatCurrency(nextPaydaySum)}</div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Estimado para receber na semana</p>
               </div>
             )}

             {/* Seção Futura */}
             {(notificationFilter === 'all' || notificationFilter === 'upcoming') && (
               <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Próximos Alertas</h4>
                 </div>
                 {upcomingEvents.length === 0 ? (
                   <div className="bg-white/[0.02] p-8 rounded-[2.5rem] flex flex-col items-center justify-center border border-dashed border-white/5">
                      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <CheckCheck className="w-7 h-7 text-emerald-500/30" />
                      </div>
                      <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest text-center leading-relaxed">Sua agenda está limpa.<br/>Nenhum evento nos próximos 15 dias.</p>
                   </div>
                 ) : (
                   upcomingEvents.map((event, idx) => (
                     <div key={event.id} className="relative glass p-5 rounded-[2.5rem] flex items-center gap-4 border border-white/[0.04] animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                       <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-black ring-1 shrink-0 ${event.type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'}`}>
                          {event.type === 'PAYMENT' ? <DollarSign className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-white text-base tracking-tighter">{event.ticker}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${event.daysRemaining === 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/5 text-slate-400'}`}>
                               {event.daysRemaining === 0 ? 'HOJE' : event.daysRemaining === 1 ? 'AMANHÃ' : `${event.daysRemaining} DIAS`}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{event.description}</p>
                          {event.type === 'PAYMENT' && event.amount && <div className="text-emerald-400 font-black text-sm tabular-nums mt-1">R$ {formatCurrency(event.amount)} <span className="text-[10px] text-slate-600 font-bold ml-1">estimado</span></div>}
                          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                             <Clock className="w-3 h-3" /> {event.formattedDate}
                          </div>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             )}

             {/* Seção Histórico */}
             {(notificationFilter === 'all' || notificationFilter === 'history') && pastEvents.length > 0 && (
               <div className="space-y-4 pt-4">
                 <div className="flex items-center gap-2 mb-2 px-1 border-t border-white/5 pt-6">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Histórico Recente</h4>
                 </div>
                 {pastEvents.map((event, idx) => (
                   <div key={event.id} className="bg-white/[0.02] p-4 rounded-3xl flex items-center gap-4 border border-white/[0.02] opacity-60 hover:opacity-100 transition-opacity" style={{ animationDelay: `${idx * 30}ms` }}>
                     <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-slate-500 shrink-0">
                        {event.type === 'PAYMENT' ? <CheckCircle2 className="w-4 h-4 text-emerald-500/50" /> : <Clock className="w-4 h-4" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-300 text-sm">{event.ticker}</h4>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{event.formattedDate}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{event.description}</p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>

           {/* Dica do Especialista */}
           <div className="mt-8 bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-[2rem] flex items-start gap-4 shrink-0">
              <Info className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Dica Pro</h4>
                 <p className="text-[10px] text-slate-500 leading-relaxed">
                    Eventos de "Data Com" são o limite para garantir o direito aos próximos proventos. Fique atento às datas marcadas em amarelo!
                 </p>
              </div>
           </div>
        </div>
      </SwipeableModal>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
