import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, Bell, Calendar, DollarSign, X, ArrowRight, CheckCheck, BellRing, DownloadCloud } from 'lucide-react';

const STORAGE_KEYS = {
  TXS: 'investfiis_transactions',
  TOKEN: 'investfiis_brapitoken',
  DIVS: 'investfiis_gemini_dividends_cache',
  META: 'investfiis_asset_metadata',
  SYNC: 'investfiis_last_gemini_sync',
};

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
  const [assetMetadata, setAssetMetadata] = useState<Record<string, { segment: string; type: AssetType }>>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.META) || '{}'));
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVS) || '[]'));
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [todayEvents, setTodayEvents] = useState<MarketEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<MarketEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<MarketEvent[]>([]);
  
  const lastSyncTickersRef = useRef<string>("");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFadingOut(true), 1200);
    const removeTimer = setTimeout(() => setIsSplashActive(false), 1600);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      console.log('App: Update available event received');
      setUpdateRegistration(e.detail);
    };
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const handleUpdateApp = useCallback(() => {
    if (updateRegistration && updateRegistration.waiting) {
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [updateRegistration]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken);
    localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends));
    localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(assetMetadata));
  }, [transactions, brapiToken, geminiDividends, assetMetadata]);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    const comDateObj = new Date(`${dateCom}T23:59:59`); // Fim do dia da data com
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
    return [...transactions].sort((a, b) => a.date.localeCompare(b.date))[0].date;
  }, [transactions]);

  const { portfolio, dividendReceipts, realizedGain } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    let totalRealizedGain = 0;
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    sortedTxs.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!positions[ticker]) {
        positions[ticker] = { 
            ticker, 
            quantity: 0, 
            averagePrice: 0, 
            assetType: assetMetadata[ticker]?.type || t.assetType, 
            segment: assetMetadata[ticker]?.segment || "Carregando...",
            totalDividends: 0 
        };
      }
      const p = positions[ticker];
      if (t.type === 'BUY') {
        const currentCost = p.quantity * p.averagePrice;
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? (currentCost + (t.quantity * t.price)) / p.quantity : 0;
      } else {
        totalRealizedGain += t.quantity * (t.price - p.averagePrice);
        p.quantity -= t.quantity;
      }
    });

    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, sortedTxs);
      const total = qtyAtDate * div.rate;
      if (total > 0 && positions[div.ticker]) {
        positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + total;
      }
      return { ...div, quantityOwned: qtyAtDate, totalReceived: total };
    }).filter(r => r.totalReceived > 0);

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0)
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));

    return { portfolio: finalPortfolio, dividendReceipts: receipts, realizedGain: totalRealizedGain };
  }, [transactions, quotes, geminiDividends, assetMetadata, getQuantityOnDate]);

  useEffect(() => {
    if (geminiDividends.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayL: MarketEvent[] = [];
    const upL: MarketEvent[] = [];
    const pastL: MarketEvent[] = [];

    geminiDividends.forEach(div => {
      const dates = [
        { d: div.paymentDate, t: 'PAYMENT' as const, desc: `Pagamento ${div.ticker}`, v: div.rate },
        { d: div.dateCom, t: 'DATA_COM' as const, desc: `Data Com ${div.ticker}`, v: undefined }
      ];
      dates.forEach(ev => {
        if (!ev.d) return;
        const eDate = new Date(ev.d + 'T12:00:00');
        const diff = Math.ceil((eDate.getTime() - today.getTime()) / 86400000);
        const obj: MarketEvent = {
          id: `${ev.t}-${div.ticker}-${ev.d}`,
          ticker: div.ticker,
          type: ev.t,
          date: ev.d,
          formattedDate: ev.d.split('-').reverse().join('/'),
          daysRemaining: diff,
          amount: ev.v,
          description: ev.desc,
          isPast: diff < 0
        };
        if (diff === 0) todayL.push(obj);
        else if (diff > 0 && diff <= 7) upL.push(obj);
        else if (diff < 0 && diff >= -30) pastL.push(obj);
      });
    });
    setTodayEvents(todayL); setUpcomingEvents(upL.sort((a,b)=>a.daysRemaining-b.daysRemaining)); setPastEvents(pastL.sort((a,b)=>b.daysRemaining-a.daysRemaining));
  }, [geminiDividends]);

  const syncBrapiData = useCallback(async (force = false) => {
    if (!brapiToken || transactions.length === 0) return;
    const unique: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase()))) as string[];
    try {
      const brQuotes = await getQuotes(unique, brapiToken, force);
      const map: Record<string, BrapiQuote> = {};
      brQuotes.forEach(q => map[q.symbol] = q);
      setQuotes(prev => ({ ...prev, ...map }));
    } catch (e) { console.error(e); }
  }, [brapiToken, transactions]);

  const handleAiSync = useCallback(async (force = false) => {
    const unique: string[] = (Array.from(new Set(transactions.map(t => t.ticker.toUpperCase()))) as string[]).sort();
    if (unique.length === 0) return;
    const tickersStr = unique.join(',');
    if (!force && localStorage.getItem(STORAGE_KEYS.SYNC) && (Date.now() - parseInt(localStorage.getItem(STORAGE_KEYS.SYNC)!,10)) < 3600000 && lastSyncTickersRef.current === tickersStr) return;

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(unique);
      setAssetMetadata(prev => ({ ...prev, ...data.metadata }));
      if (data.dividends.length > 0) {
        setGeminiDividends(prev => {
          const map = new Map();
          [...prev, ...data.dividends].forEach(d => map.set(d.id, d));
          return Array.from(map.values());
        });
      }
      if (data.sources) setSources(data.sources);
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      lastSyncTickersRef.current = tickersStr;
    } catch (e) { showToast('error', 'Erro na sincronização inteligente'); }
    finally { setIsAiLoading(false); }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([syncBrapiData(true), handleAiSync(true)]);
    setIsRefreshing(false);
    showToast('success', 'Carteira atualizada');
  };

  useEffect(() => { syncBrapiData(); }, [syncBrapiData]);
  useEffect(() => { if(transactions.length > 0) handleAiSync(); }, [transactions.length, handleAiSync]);

  if (isSplashActive) return (
    <div className={`fixed inset-0 bg-primary z-[300] flex flex-col items-center justify-center transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <TrendingUp className="w-16 h-16 text-accent animate-float mb-4" strokeWidth={3} />
      <h1 className="text-2xl font-black text-white tracking-widest uppercase">InvestFIIs</h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-primary text-slate-100 pb-10">
      <Header 
        title={currentTab==='home'?'Início':currentTab==='portfolio'?'Carteira':'Ordens'} 
        onSettingsClick={()=>setShowSettings(true)}
        onRefresh={handleFullRefresh}
        isRefreshing={isRefreshing}
        onNotificationClick={()=>setShowNotifications(true)}
        notificationCount={todayEvents.length + upcomingEvents.length}
      />
      <main>
        {currentTab==='home' && <Home portfolio={portfolio} dividendReceipts={dividendReceipts} realizedGain={realizedGain} onAiSync={()=>handleAiSync(true)} isAiLoading={isAiLoading} sources={sources} portfolioStartDate={portfolioStartDate} />}
        {currentTab==='portfolio' && <Portfolio portfolio={portfolio} dividendReceipts={dividendReceipts} />}
        {currentTab==='transactions' && <Transactions transactions={transactions} onAddTransaction={(t)=>setTransactions(p=>[...p,{...t,id:Math.random().toString(36).substr(2,9)}])} onUpdateTransaction={(id,t)=>setTransactions(p=>p.map(x=>x.id===id?{...t,id}:x))} onDeleteTransaction={(id)=>setTransactions(p=>p.filter(x=>x.id!==id))} />}
      </main>
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      
      {/* Floating Update Button */}
      {updateRegistration && (
         <button 
            onClick={handleUpdateApp}
            className="fixed bottom-24 right-5 z-[200] flex items-center gap-3 bg-emerald-500 text-primary px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-xs uppercase tracking-widest animate-fade-in-up active:scale-95 transition-transform"
         >
            <DownloadCloud className="w-5 h-5 animate-bounce" />
            Nova Versão Disponível
         </button>
      )}

      <SwipeableModal isOpen={showSettings} onClose={()=>setShowSettings(false)}>
        <Settings brapiToken={brapiToken} onSaveToken={setBrapiToken} transactions={transactions} onImportTransactions={setTransactions} onResetApp={()=>{localStorage.clear(); window.location.reload();}} />
      </SwipeableModal>
      <SwipeableModal isOpen={showNotifications} onClose={()=>setShowNotifications(false)}>
        <div className="p-6 space-y-8">
            <h3 className="text-xl font-black text-white">Eventos de Mercado</h3>
            {todayEvents.length > 0 && <div className="space-y-3"><h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Hoje</h4>{todayEvents.map(e=><EventCard key={e.id} event={e}/>)}</div>}
            {upcomingEvents.length > 0 && <div className="space-y-3"><h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Próximos Dias</h4>{upcomingEvents.map(e=><EventCard key={e.id} event={e}/>)}</div>}
            {todayEvents.length===0 && upcomingEvents.length===0 && <div className="text-center py-10 opacity-40"><p className="text-xs">Nenhum evento próximo</p></div>}
        </div>
      </SwipeableModal>
      {toast && <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl flex items-center gap-3 animate-fade-in-up bg-slate-800 text-white border border-white/10`}><span className="text-xs font-bold">{toast.text}</span></div>}
    </div>
  );
};

export default App;