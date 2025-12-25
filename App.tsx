
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Bell, Calendar, DollarSign, X, ArrowRight } from 'lucide-react';

const STORAGE_KEYS = {
  TXS: 'investfiis_transactions',
  TOKEN: 'investfiis_brapitoken',
  DIVS: 'investfiis_gemini_dividends_cache',
  SYNC: 'investfiis_last_gemini_sync',
};

// Interface para eventos de notificação
interface MarketEvent {
  id: string;
  ticker: string;
  type: 'PAYMENT' | 'DATA_COM';
  date: string;
  formattedDate: string;
  daysRemaining: number;
  amount?: number;
  description: string;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

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
  const [upcomingEvents, setUpcomingEvents] = useState<MarketEvent[]>([]);
  
  const lastSyncTickersRef = useRef<string>("");

  useEffect(() => {
    // Splash screen timing refinement
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 1200);
    const removeTimer = setTimeout(() => setIsSplashActive(false), 1600);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  // Monitora controllerchange para recarregar a página suavemente após update do SW
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
    const handleUpdate = (e: any) => setUpdateRegistration(e.detail);
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const handleApplyUpdate = () => {
    if (updateRegistration?.waiting) {
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken);
    localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends));
  }, [transactions, brapiToken, geminiDividends]);

  // Request Notification Permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
  }, []);

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

  const { portfolio, dividendReceipts, realizedGain } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    let totalRealizedGain = 0;
    
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

  // Lógica de Detecção de Eventos Próximos (Alertas)
  useEffect(() => {
    if (geminiDividends.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alerts: MarketEvent[] = [];
    const processedKeys = new Set<string>();

    geminiDividends.forEach(div => {
        // Verifica Pagamento
        if (div.paymentDate) {
            const payDate = new Date(div.paymentDate + 'T12:00:00');
            const diffTime = payDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Eventos entre hoje (0) e daqui a 7 dias
            if (diffDays >= 0 && diffDays <= 7) {
                const key = `PAY-${div.ticker}-${div.paymentDate}`;
                if (!processedKeys.has(key)) {
                    alerts.push({
                        id: key,
                        ticker: div.ticker,
                        type: 'PAYMENT',
                        date: div.paymentDate,
                        formattedDate: div.paymentDate.split('-').reverse().join('/'),
                        daysRemaining: diffDays,
                        amount: div.rate,
                        description: `Pagamento de ${div.type === 'DIVIDENDO' ? 'Dividendo' : 'JCP'}`
                    });
                    processedKeys.add(key);

                    // Notificação do Sistema se for HOJE
                    if (diffDays === 0 && "Notification" in window && Notification.permission === "granted") {
                        new Notification("InvestFIIs: Pagamento Hoje!", {
                            body: `${div.ticker} paga R$ ${div.rate.toFixed(2)} por cota hoje.`,
                            icon: "/manifest-icon-192.maskable.png" // Assumindo icone padrão
                        });
                    }
                }
            }
        }

        // Verifica Data Com
        if (div.dateCom) {
            const comDate = new Date(div.dateCom + 'T12:00:00');
            const diffTime = comDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 3) {
                const key = `COM-${div.ticker}-${div.dateCom}`;
                if (!processedKeys.has(key)) {
                    alerts.push({
                        id: key,
                        ticker: div.ticker,
                        type: 'DATA_COM',
                        date: div.dateCom,
                        formattedDate: div.dateCom.split('-').reverse().join('/'),
                        daysRemaining: diffDays,
                        description: `Data Com (Corte)`
                    });
                    processedKeys.add(key);

                    if (diffDays === 0 && "Notification" in window && Notification.permission === "granted") {
                        new Notification("InvestFIIs: Data Com Hoje!", {
                            body: `Hoje é a data limite para garantir proventos de ${div.ticker}.`
                        });
                    }
                }
            }
        }
    });

    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
    setUpcomingEvents(alerts);

  }, [geminiDividends]);

  const syncBrapiData = useCallback(async (force = false) => {
    if (!brapiToken || transactions.length === 0) return;
    const uniqueTickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase())));
    try {
        const brQuotes = await getQuotes(uniqueTickers, brapiToken, force);
        const map: Record<string, BrapiQuote> = {};
        brQuotes.forEach(q => map[q.symbol] = q);
        if (Object.keys(map).length > 0) {
            setQuotes(prev => ({ ...prev, ...map }));
        }
    } catch (error) {
        console.error("Erro ao buscar cotações Brapi", error);
    }
  }, [brapiToken, transactions]);

  useEffect(() => {
    syncBrapiData(false);
  }, [syncBrapiData]);

  const handleAiSync = useCallback(async (force = false) => {
    const uniqueTickers: string[] = Array.from(new Set<string>(transactions.map(t => t.ticker.toUpperCase()))).sort();
    if (uniqueTickers.length === 0) return;
    const tickersStr = uniqueTickers.join(',');
    const lastSync = localStorage.getItem(STORAGE_KEYS.SYNC);
    const isRecent = lastSync && (Date.now() - parseInt(lastSync, 10)) < 1000 * 60 * 60;
    if (!force && isRecent && lastSyncTickersRef.current === tickersStr) return;
    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(uniqueTickers);
      setGeminiDividends(prev => {
        const merged = [...prev, ...data.dividends];
        const uniqueMap = new Map();
        merged.forEach(d => uniqueMap.set(d.id, d));
        return Array.from(uniqueMap.values());
      });
      if (data.sources) setSources(data.sources);
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      lastSyncTickersRef.current = tickersStr;
      if (force) showToast('success', 'Dividendos Atualizados');
    } catch (e) {
      if (force) showToast('error', 'Erro na IA de Dividendos');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    try {
      await Promise.all([syncBrapiData(true), handleAiSync(true)]);
      showToast('success', 'Dados atualizados com sucesso');
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
      const timeout = setTimeout(() => handleAiSync(false), 1500);
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

  return (
    <div className="min-h-screen bg-primary text-slate-100 selection:bg-accent/30 overflow-x-hidden pb-10">
      
      {/* Sistema de Notificações Superior Centralizado e Seguro para Mobile */}
      <div className="fixed inset-x-0 top-0 pt-safe mt-2 z-[200] flex flex-col items-center gap-4 px-4 pointer-events-none">
        
        {/* Banner de Nova Versão */}
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
                <button 
                  onClick={handleApplyUpdate} 
                  className="relative z-10 bg-accent text-primary px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent/20 tap-highlight"
                >
                  Atualizar
                </button>
            </div>
          </div>
        )}

        {/* Toasts (Sucesso/Erro) */}
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
        isRefreshing={isRefreshing || isAiLoading}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={upcomingEvents.length}
      />
      
      <main className="max-w-screen-md mx-auto min-h-[calc(100vh-160px)]">
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
      
      {/* Notifications Modal */}
      <SwipeableModal isOpen={showNotifications} onClose={() => setShowNotifications(false)}>
        <div className="px-6 pt-2 pb-10">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Alertas</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Eventos Próximos (7 Dias)</p>
              </div>
              <button onClick={() => setShowNotifications(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
           </div>

           <div className="space-y-3">
             {upcomingEvents.length === 0 ? (
               <div className="text-center py-24 opacity-50">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Sem alertas para esta semana</p>
               </div>
             ) : (
               upcomingEvents.map((event) => (
                 <div key={event.id} className="glass p-5 rounded-[2rem] flex items-center gap-4 border border-white/[0.04]">
                   <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-black ring-1 ${event.type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'}`}>
                      {event.type === 'PAYMENT' ? <DollarSign className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-black text-white text-base">{event.ticker}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${event.daysRemaining === 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/5 text-slate-400'}`}>
                           {event.daysRemaining === 0 ? 'HOJE' : event.daysRemaining === 1 ? 'AMANHÃ' : `${event.daysRemaining} DIAS`}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{event.description}</p>
                      {event.amount && (
                         <div className="text-emerald-400 font-black text-sm tabular-nums mt-1">R$ {formatCurrency(event.amount)} / cota</div>
                      )}
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                         {event.formattedDate}
                      </div>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </SwipeableModal>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
