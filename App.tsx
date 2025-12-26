
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Bell, Calendar, DollarSign, X, ArrowRight, History, Clock, CheckCheck, BellRing } from 'lucide-react';

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
  isPast: boolean;
}

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EventCard: React.FC<{ event: MarketEvent }> = ({ event }) => (
  <div className={`p-4 rounded-[1.8rem] flex items-center gap-4 border animate-fade-in-up ${event.daysRemaining === 0 ? 'bg-gradient-to-r from-emerald-900/40 to-slate-900 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.04]'}`}>
      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-xs font-black ring-1 shrink-0 ${event.type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'}`}>
          {event.type === 'PAYMENT' ? <DollarSign className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
              <h4 className="font-black text-white text-base">{event.ticker}</h4>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${event.daysRemaining === 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 animate-pulse' : 'bg-white/5 text-slate-400'}`}>
                  {event.daysRemaining === 0 ? 'HOJE' : event.daysRemaining === 1 ? 'AMANHÃ' : `${event.daysRemaining} DIAS`}
              </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{event.description}</p>
          {event.amount && (
              <div className="text-emerald-400 font-black text-sm tabular-nums mt-1">R$ {formatCurrency(event.amount)} / cota</div>
          )}
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">
              {event.formattedDate}
          </div>
      </div>
  </div>
);

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
  
  // Estados para agrupamento de eventos
  const [todayEvents, setTodayEvents] = useState<MarketEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<MarketEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<MarketEvent[]>([]);
  
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

  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    // Normaliza para o meio do dia para evitar problemas de timezone
    const comDateObj = new Date(`${dateCom}T12:00:00`); 
    if (isNaN(comDateObj.getTime())) return 0;
    
    return txs
      .filter(t => t.ticker === ticker)
      .reduce((acc, t) => {
        const txDateObj = new Date(`${t.date}T12:00:00`);
        if (!isNaN(txDateObj.getTime()) && txDateObj <= comDateObj) {
            return t.type === 'BUY' ? acc + t.quantity : acc - t.quantity;
        }
        return acc;
      }, 0);
  }, []);

  const portfolioStartDate = useMemo(() => {
    if (transactions.length === 0) return new Date().toISOString();
    const dates = transactions.map(t => t.date).sort();
    return dates[0];
  }, [transactions]);

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

  // Lógica de Detecção de Eventos Próximos (Alertas) E Histórico
  useEffect(() => {
    if (geminiDividends.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayList: MarketEvent[] = [];
    const upcomingList: MarketEvent[] = [];
    const historyList: MarketEvent[] = [];
    const processedKeys = new Set<string>();

    geminiDividends.forEach(div => {
        const processEvent = (dateStr: string, type: 'PAYMENT' | 'DATA_COM', desc: string, amount?: number) => {
            if (!dateStr) return;
            
            const eventDate = new Date(dateStr + 'T12:00:00');
            if (isNaN(eventDate.getTime())) return;

            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const key = `${type}-${div.ticker}-${dateStr}`;
            
            if (processedKeys.has(key)) return;

            const eventObj: MarketEvent = {
                id: key,
                ticker: div.ticker,
                type,
                date: dateStr,
                formattedDate: dateStr.split('-').reverse().join('/'),
                daysRemaining: diffDays,
                amount,
                description: desc,
                isPast: diffDays < 0
            };

            if (diffDays === 0) {
               todayList.push(eventObj);
               processedKeys.add(key);
               
               // Lógica de Notificação com Preferências
               if ("Notification" in window && Notification.permission === "granted") {
                    const savedPrefs = localStorage.getItem('investfiis_prefs_notifications');
                    const prefs = savedPrefs ? JSON.parse(savedPrefs) : { payments: true, datacom: true };

                    // Verifica se o usuário permitiu este tipo de notificação
                    if ((type === 'PAYMENT' && prefs.payments) || (type === 'DATA_COM' && prefs.datacom)) {
                        const title = type === 'PAYMENT' ? `InvestFIIs: Pagamento ${div.ticker}` : `InvestFIIs: Data Com ${div.ticker}`;
                        const body = type === 'PAYMENT' ? `Recebimento de R$ ${amount?.toFixed(2)} por cota hoje.` : `Hoje é a data limite para garantir os proventos.`;
                        new Notification(title, { body, icon: "/manifest-icon-192.maskable.png" });
                    }
               }

            } else if (diffDays > 0 && diffDays <= 7) {
                upcomingList.push(eventObj);
                processedKeys.add(key);
            } else if (diffDays < 0 && diffDays >= -30) {
                historyList.push(eventObj);
                processedKeys.add(key);
            }
        };

        processEvent(div.paymentDate, 'PAYMENT', `Pagamento de ${div.type === 'DIVIDENDO' ? 'Dividendo' : 'JCP'}`, div.rate);
        processEvent(div.dateCom, 'DATA_COM', `Data Com (Corte)`);
    });

    upcomingList.sort((a, b) => a.daysRemaining - b.daysRemaining);
    historyList.sort((a, b) => b.daysRemaining - a.daysRemaining);

    setTodayEvents(todayList);
    setUpcomingEvents(upcomingList);
    setPastEvents(historyList);

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
    const isRecent = lastSync && (Date.now() - parseInt(lastSync, 10)) < 1000 * 60 * 60; // 1 hora
    
    if (!force && isRecent && lastSyncTickersRef.current === tickersStr) {
       console.log("Gemini: Dados recentes encontrados em cache. Pulando sincronização.");
       return;
    }

    setIsAiLoading(true);
    console.log("Gemini: Iniciando busca de dados de mercado para:", tickersStr);
    
    try {
      const data = await fetchUnifiedMarketData(uniqueTickers);
      
      if (data.dividends.length > 0) {
        setGeminiDividends(prev => {
          const merged = [...prev, ...data.dividends];
          const uniqueMap = new Map();
          merged.forEach(d => uniqueMap.set(d.id, d));
          return Array.from(uniqueMap.values());
        });
        if (force) showToast('success', `${data.dividends.length} proventos encontrados!`);
      } else if (force) {
        showToast('warning', 'IA não encontrou proventos recentes.');
      }

      if (data.sources) setSources(data.sources);
      
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      lastSyncTickersRef.current = tickersStr;
      
    } catch (e) {
      console.error("Gemini: Erro na sincronização", e);
      if (force) showToast('error', 'Falha ao conectar com IA de Dividendos');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    try {
      await Promise.all([syncBrapiData(true), handleAiSync(true)]);
      showToast('success', 'Carteira atualizada com sucesso');
    } catch (error) {
      showToast('error', 'Falha na atualização global');
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
                {/* Fixed truncated button and completed JSX */}
                <button 
                  onClick={handleApplyUpdate} 
                  className="relative z-10 bg-accent text-primary px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent/20"
                >
                  Reiniciar
                </button>
            </div>
          </div>
        )}
      </div>

      <Header 
        title={currentTab === 'home' ? 'Início' : currentTab === 'portfolio' ? 'Carteira' : 'Ordens'} 
        onSettingsClick={() => setShowSettings(true)}
        onRefresh={handleFullRefresh}
        isRefreshing={isRefreshing}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={todayEvents.length + upcomingEvents.length}
      />

      <main className="relative z-10">
        {currentTab === 'home' && (
          <Home 
            portfolio={portfolio} 
            dividendReceipts={dividendReceipts} 
            realizedGain={realizedGain}
            onAiSync={() => handleAiSync(true)}
            isAiLoading={isAiLoading}
            sources={sources}
            portfolioStartDate={portfolioStartDate}
          />
        )}
        {currentTab === 'portfolio' && (
          <Portfolio 
            portfolio={portfolio} 
            dividendReceipts={dividendReceipts} 
          />
        )}
        {currentTab === 'transactions' && (
          <Transactions 
            transactions={transactions} 
            onAddTransaction={(t) => {
                const newT = { ...t, id: Math.random().toString(36).substr(2, 9) };
                setTransactions(prev => [...prev, newT]);
                showToast('success', 'Transação adicionada');
            }}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={(id) => {
                setTransactions(prev => prev.filter(tx => tx.id !== id));
                showToast('success', 'Transação excluída');
            }}
          />
        )}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

      <SwipeableModal isOpen={showSettings} onClose={() => setShowSettings(false)}>
        <Settings 
          brapiToken={brapiToken} 
          onSaveToken={setBrapiToken} 
          transactions={transactions} 
          onImportTransactions={(data) => {
            setTransactions(data);
            setShowSettings(false);
          }}
          onResetApp={() => {
            setTransactions([]);
            setBrapiToken('');
            setGeminiDividends([]);
            localStorage.clear();
            window.location.reload();
          }}
        />
      </SwipeableModal>

      <SwipeableModal isOpen={showNotifications} onClose={() => setShowNotifications(false)}>
        <div className="px-6 pt-2 pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter">Eventos</h3>
                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mt-1">Datas de Proventos</p>
                </div>
                <button onClick={() => setShowNotifications(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-white/10">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-8">
                {todayEvents.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2">
                           <BellRing className="w-3.5 h-3.5" /> Acontecendo Hoje
                        </h4>
                        <div className="space-y-3">
                            {todayEvents.map(e => <EventCard key={e.id} event={e} />)}
                        </div>
                    </div>
                )}

                {upcomingEvents.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Próximos 7 Dias</h4>
                        <div className="space-y-3">
                            {upcomingEvents.map(e => <EventCard key={e.id} event={e} />)}
                        </div>
                    </div>
                )}

                {pastEvents.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Histórico Recente (30d)</h4>
                        <div className="space-y-3">
                            {pastEvents.map(e => <EventCard key={e.id} event={e} />)}
                        </div>
                    </div>
                )}

                {todayEvents.length === 0 && upcomingEvents.length === 0 && pastEvents.length === 0 && (
                    <div className="py-20 text-center opacity-40">
                        <CheckCheck className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Nenhum evento registrado</p>
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>

      {toast && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-fade-in-up ring-1 ring-white/10 backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : toast.type === 'error' ? 'bg-rose-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-xs font-black">{toast.text}</span>
        </div>
      )}
    </div>
  );
};

export default App;
