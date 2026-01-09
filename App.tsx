
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, ChangelogModal, NotificationsModal, CloudStatusBanner, ConfirmationModal } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { Check, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

const APP_VERSION = '8.2.0'; 

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  QUOTES: 'investfiis_v3_quote_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  PREFS_NOTIF: 'investfiis_prefs_notifications',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  NOTIF_HISTORY: 'investfiis_notification_history_v2' 
};

export type ThemeType = 'light' | 'dark' | 'system';

const getQuantityOnDate = (ticker: string, dateCom: string, transactions: Transaction[]) => {
  if (!dateCom || dateCom.length < 10) return 0;
  const targetDate = dateCom.substring(0, 10);
  const targetTicker = ticker.trim().toUpperCase();
  return transactions
    .filter(t => t.ticker.trim().toUpperCase() === targetTicker && (t.date || '').substring(0, 10) <= targetDate)
    .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
};

const mapSupabaseToTx = (record: any): Transaction => ({
  id: record.id,
  ticker: record.ticker,
  type: record.type,
  quantity: record.quantity,
  price: record.price,
  date: record.date,
  assetType: record.asset_type || AssetType.FII, 
});

const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  const [appLoading, setAppLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0); 
  const [session, setSession] = useState<Session | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');

  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>(() => {
    try { const s = localStorage.getItem(STORAGE_KEYS.QUOTES); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); return s ? JSON.parse(s) : { ipca: 4.5, startDate: '' }; } catch { return { ipca: 4.5, startDate: '' }; } });
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiStatus, setLastAiStatus] = useState<'operational' | 'degraded' | 'error' | 'unknown'>('unknown');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes)); }, [quotes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTIF_HISTORY, JSON.stringify(notifications.slice(0, 50))); }, [notifications]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent-rgb', accentColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(' ') || '14 165 233');
    localStorage.setItem(STORAGE_KEYS.ACCENT, accentColor);
  }, [accentColor]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast(null);
    setTimeout(() => { setToast({ type, text }); toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3500); }, 50);
  }, []);

  const syncMarketData = useCallback(async (force = false, txsToUse: Transaction[], initialLoad = false) => {
    const tickers = Array.from(new Set(txsToUse.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;
    setIsRefreshing(true);
    if (initialLoad) setLoadingProgress(50);
    try {
      if (process.env.BRAPI_TOKEN) {
          const { quotes: newQuotesData } = await getQuotes(tickers);
          if (newQuotesData.length > 0) {
            setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: any, q: any) => ({...acc, [q.symbol]: q }), {})}));
          }
      }
      if (initialLoad) setLoadingProgress(70); 
      if (process.env.API_KEY) {
          setIsAiLoading(true);
          const startDate = txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date);
          const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
          setLastAiStatus(aiData.error ? 'degraded' : 'operational');
          if (aiData.dividends.length > 0) setGeminiDividends(aiData.dividends);
          if (Object.keys(aiData.metadata).length > 0) setAssetsMetadata(aiData.metadata);
          if (aiData.indicators?.ipca_cumulative) setMarketIndicators({ ipca: aiData.indicators.ipca_cumulative, startDate: aiData.indicators.start_date_used });
      }
      if (initialLoad) setLoadingProgress(100); 
    } catch (e) { console.error(e); } finally { setIsRefreshing(false); setIsAiLoading(false); }
  }, []);

  const fetchTransactionsFromCloud = useCallback(async (currentSession: Session | null, force = false, initialLoad = false) => {
    setCloudStatus('syncing');
    if (initialLoad) setLoadingProgress(25);
    try {
        if (!currentSession?.user?.id) return;
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', currentSession.user.id);
        if (error) throw error;
        const cloudTxs = (data || []).map(mapSupabaseToTx);
        setTransactions(cloudTxs);
        setCloudStatus('connected');
        setTimeout(() => setCloudStatus('hidden'), 3000);
        if (cloudTxs.length > 0) await syncMarketData(force, cloudTxs, initialLoad);
    } catch (err) { showToast('error', 'Erro na nuvem.'); setCloudStatus('disconnected'); }
  }, [syncMarketData, showToast]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTransactions([]);
    setGeminiDividends([]);
    setQuotes({});
    setAssetsMetadata({});
    showToast('info', 'Desconectado com sucesso.');
  }, [showToast]);

  const handleSyncAll = useCallback(async (force = false) => {
    if (session) await fetchTransactionsFromCloud(session, force);
  }, [session, fetchTransactionsFromCloud]);

  // --- CRUD Handlers (Typed for MemoizedTransactions) ---
  const handleAddTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
      if (!session?.user?.id) return;
      const { error } = await supabase.from('transactions').insert({ ...t, user_id: session.user.id });
      if (error) {
        showToast('error', 'Erro ao salvar transação');
        return;
      }
      await fetchTransactionsFromCloud(session);
  }, [session, fetchTransactionsFromCloud, showToast]);

  const handleUpdateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
      const { error } = await supabase.from('transactions').update(t).eq('id', id);
      if (error) {
        showToast('error', 'Erro ao atualizar transação');
        return;
      }
      await fetchTransactionsFromCloud(session);
  }, [session, fetchTransactionsFromCloud, showToast]);

  const handleDeleteTransaction = useCallback((id: string) => {
      setConfirmModal({
          isOpen: true, 
          title: 'Apagar?', 
          message: 'Confirmar exclusão desta ordem?', 
          onConfirm: async () => {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) {
                 showToast('error', 'Erro ao excluir');
            } else {
                 setConfirmModal(null); 
                 await fetchTransactionsFromCloud(session);
            }
          }
      });
  }, [session, fetchTransactionsFromCloud, showToast]);
  // ----------------------------------------------------

  useEffect(() => {
    setLoadingProgress(10);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setLoadingProgress(20);
      else setAppLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) fetchTransactionsFromCloud(session, false, transactions.length === 0).finally(() => setAppLoading(false));
  }, [session]);

  const memoizedPortfolioData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    const receipts = geminiDividends.map(d => {
        const qty = getQuantityOnDate(d.ticker, d.dateCom, sortedTxs);
        return { ...d, quantityOwned: qty, totalReceived: qty * d.rate };
    }).filter(r => r.totalReceived > 0.0001);

    const divPaidMap: Record<string, number> = {};
    let totalDividendsReceived = 0;
    receipts.forEach(r => { 
        if (r.paymentDate <= todayStr) { 
            divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived; 
            totalDividendsReceived += r.totalReceived; 
        } 
    });

    const positions: Record<string, any> = {};
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType };
      const p = positions[t.ticker];
      if (t.type === 'BUY') { 
          p.averagePrice = (p.quantity * p.averagePrice + t.quantity * t.price) / (p.quantity + t.quantity); 
          p.quantity += t.quantity; 
      } else { p.quantity -= t.quantity; }
    });

    const finalPortfolio = Object.values(positions)
        .filter(p => p.quantity > 0.001)
        .map(p => ({ 
            ...p, 
            totalDividends: divPaidMap[p.ticker] || 0, 
            segment: assetsMetadata[p.ticker]?.segment || 'Geral', 
            currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice, 
            logoUrl: quotes[p.ticker]?.logourl, 
            assetType: assetsMetadata[p.ticker]?.type || p.assetType, 
            ...assetsMetadata[p.ticker]?.fundamentals 
        }));

    const invested = finalPortfolio.reduce((a, p) => a + (p.averagePrice * p.quantity), 0);
    const balance = finalPortfolio.reduce((a, p) => a + ((p.currentPrice || p.averagePrice) * p.quantity), 0);
    
    let salesGain = 0; const tracker: Record<string, { q: number; c: number }> = {};
    sortedTxs.forEach(t => {
      if (!tracker[t.ticker]) tracker[t.ticker] = { q: 0, c: 0 };
      const a = tracker[t.ticker];
      if (t.type === 'BUY') { a.q += t.quantity; a.c += t.quantity * t.price; } 
      else if (a.q > 0) { const cost = t.quantity * (a.c / a.q); salesGain += t.quantity * t.price - cost; a.c -= cost; a.q -= t.quantity; }
    });

    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived, invested, balance, salesGain };
  }, [transactions, quotes, geminiDividends, assetsMetadata]);

  if (!session && !appLoading) return <Login />;

  return (
    <div className="min-h-screen bg-primary-light dark:bg-primary-dark">
      <SplashScreen finishLoading={!appLoading} realProgress={loadingProgress} />
      <CloudStatusBanner status={cloudStatus} />
      {toast && ( 
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] w-full max-w-sm px-4">
            <div className={`
              flex items-center gap-3 p-4 rounded-xl shadow-xl border-l-[6px] anim-fade-in-up is-visible
              ${toast.type === 'success' ? 'bg-white dark:bg-slate-900 border-l-emerald-500 border-y border-r border-slate-100 dark:border-slate-800' : 
                toast.type === 'error' ? 'bg-white dark:bg-slate-900 border-l-rose-500 border-y border-r border-slate-100 dark:border-slate-800' :
                'bg-white dark:bg-slate-900 border-l-sky-500 border-y border-r border-slate-100 dark:border-slate-800'}
            `}>
               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                 toast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                 toast.type === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 
                 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
               }`}>
                 {toast.type === 'info' ? <Info className="w-4 h-4" /> : 
                  toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : 
                  <Check className="w-4 h-4" />}
               </div>
               <div className="min-w-0">
                 <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{toast.text}</p>
               </div>
            </div>
        </div> 
      )}

      {session && !appLoading && (
        <>
            <Header title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'} showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} isRefreshing={isRefreshing || isAiLoading} updateAvailable={updateManager.isUpdateAvailable} onUpdateClick={() => updateManager.setShowChangelog(true)} onNotificationClick={() => setShowNotifications(true)} notificationCount={notifications.filter(n=>!n.read).length} appVersion={APP_VERSION} bannerVisible={cloudStatus !== 'hidden'} />
            <main className="max-w-screen-md mx-auto pt-2">
              {showSettings ? (
                <Settings onLogout={handleLogout} user={session.user} transactions={transactions} onImportTransactions={setTransactions} geminiDividends={geminiDividends} onImportDividends={setGeminiDividends} onResetApp={() => { localStorage.clear(); window.location.reload(); }} theme={theme} onSetTheme={setTheme} accentColor={accentColor} onSetAccentColor={setAccentColor} privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} appVersion={APP_VERSION} updateAvailable={updateManager.isUpdateAvailable} onCheckUpdates={updateManager.checkForUpdates} onShowChangelog={() => updateManager.setShowChangelog(true)} pushEnabled={pushEnabled} onRequestPushPermission={() => setPushEnabled(!pushEnabled)} onSyncAll={handleSyncAll} lastAiStatus={lastAiStatus as any} onForceUpdate={() => window.location.reload()} currentVersionDate={updateManager.currentVersionDate} />
              ) : (
                <div key={currentTab} className="anim-fade-in is-visible">
                  {currentTab === 'home' && <MemoizedHome {...memoizedPortfolioData} transactions={transactions} totalAppreciation={memoizedPortfolioData.balance - memoizedPortfolioData.invested} isAiLoading={isAiLoading} inflationRate={marketIndicators.ipca} portfolioStartDate={marketIndicators.startDate} accentColor={accentColor} />}
                  {currentTab === 'portfolio' && <MemoizedPortfolio {...memoizedPortfolioData} />}
                  {currentTab === 'transactions' && <MemoizedTransactions transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onRequestDeleteConfirmation={handleDeleteTransaction} />}
                </div>
              )}
            </main>
            {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
        </>
      )}
      <ChangelogModal isOpen={updateManager.showChangelog} onClose={() => updateManager.setShowChangelog(false)} version={updateManager.availableVersion || APP_VERSION} notes={updateManager.releaseNotes} isUpdatePending={updateManager.isUpdateAvailable} onUpdate={updateManager.startUpdateProcess} isUpdating={updateManager.isUpdating} progress={updateManager.updateProgress} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onClear={() => setNotifications([])} />
      {confirmModal?.isOpen && ( <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} /> )}
    </div>
  );
};
export default App;
