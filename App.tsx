
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, ChangelogModal, NotificationsModal, ConfirmationModal, InstallPromptModal, UpdateReportModal } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { News } from './pages/News';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Transaction, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals, ServiceMetric, ThemeType, UpdateReportData } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/dataService';
import { getQuantityOnDate, isSameDayLocal, mapSupabaseToTx, processPortfolio, normalizeTicker } from './services/portfolioRules';
import { Database, Activity, Globe } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase, SUPABASE_URL } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import { useScrollDirection } from './hooks/useScrollDirection';

const APP_VERSION = '9.2.1'; // Bump Version

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  QUOTES: 'investfiis_v3_quote_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  NOTIF_HISTORY: 'investfiis_notification_history_v3',
  METADATA: 'investfiis_metadata_v2', // Chave crítica para cache de fundamentos
  LAST_AUTO_SYNC: 'investfiis_last_auto_sync'
};

const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);
const MemoizedNews = React.memo(News);
const MemoizedSettings = React.memo(Settings);

// Helper para merge inteligente de dividendos
const mergeDividends = (current: DividendReceipt[], incoming: DividendReceipt[]) => {
    const map = new Map<string, DividendReceipt>();
    current.forEach(d => { const key = `${normalizeTicker(d.ticker)}-${d.type}-${d.dateCom}-${d.rate}`; map.set(key, d); });
    incoming.forEach(d => { const key = `${normalizeTicker(d.ticker)}-${d.type}-${d.dateCom}-${d.rate}`; map.set(key, d); });
    return Array.from(map.values());
};

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  const { setShowChangelog, checkForUpdates, isUpdateAvailable, currentVersionDate, startUpdateProcess, isUpdating, updateProgress, releaseNotes, showChangelog: isChangelogOpen } = updateManager;
  const { scrollDirection, isTop } = useScrollDirection();
  
  const [isReady, setIsReady] = useState(false); 
  const [loadingProgress, setLoadingProgress] = useState(0); 
  const [session, setSession] = useState<Session | null>(null);
  
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpdateReport, setShowUpdateReport] = useState(false);
  const [targetAssetTicker, setTargetAssetTicker] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Prefs
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#10b981'); 
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  // Dados - Inicialização Lazy com LocalStorage para performance imediata
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.QUOTES); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [dividends, setDividends] = useState<DividendReceipt[]>(() => { 
      try { 
          const s = localStorage.getItem(STORAGE_KEYS.DIVS); 
          const parsed = s ? JSON.parse(s) : []; 
          return Array.isArray(parsed) ? parsed.filter(d => d.paymentDate && /^\d{4}-\d{2}-\d{2}$/.test(d.paymentDate)) : [];
      } catch { return []; } 
  });
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); return s ? JSON.parse(s) : { ipca: 4.62, startDate: '' }; } catch { return { ipca: 4.62, startDate: '' }; } });
  
  // Cacheamento de Metadados (Fundamentos: DY, PVP, Vacância, etc.)
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>(() => { 
      try { 
          const s = localStorage.getItem(STORAGE_KEYS.METADATA); 
          return s ? JSON.parse(s) : {}; 
      } catch { return {}; } 
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingServices, setIsCheckingServices] = useState(false);
  
  const servicesRef = useRef<ServiceMetric[]>([
    { id: 'db', label: 'Supabase Database', url: SUPABASE_URL, icon: Database, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'market', label: 'Brapi Market Data', url: 'https://brapi.dev', icon: Activity, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'cdn', label: 'App CDN (Vercel)', url: window.location.origin, icon: Globe, status: 'operational', latency: null, message: 'Aplicação carregada localmente.' }
  ]);
  const [services, setServices] = useState<ServiceMetric[]>(servicesRef.current);

  // Effects de Persistência - Salva automaticamente sempre que o estado muda
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(dividends)); }, [dividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes)); }, [quotes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTIF_HISTORY, JSON.stringify(notifications.slice(0, 50))); }, [notifications]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(assetsMetadata)); }, [assetsMetadata]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent-rgb', accentColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(' ') || '16 185 129');
    localStorage.setItem(STORAGE_KEYS.ACCENT, accentColor);
  }, [accentColor]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled)); }, [pushEnabled]);
  useEffect(() => { window.scrollTo(0, 0); }, [currentTab, showSettings]);
  useEffect(() => { if (isReady) { setTimeout(() => { document.body.classList.add('app-revealed'); }, 100); } }, [isReady]);

  // Notificações Locais
  useEffect(() => {
      if (!dividends || dividends.length === 0 || !transactions || transactions.length === 0) return;
      const newNotifs: AppNotification[] = [];
      const existingIds = new Set(notifications.map(n => n.id));
      dividends.forEach(div => {
          if (!div || !div.ticker) return;
          const qty = getQuantityOnDate(div.ticker, div.dateCom, transactions);
          if (qty > 0) {
              const total = qty * div.rate;
              if (isSameDayLocal(div.paymentDate)) {
                  const id = `pay-${div.ticker}-${div.paymentDate}`;
                  if (!existingIds.has(id)) {
                      newNotifs.push({ id, title: 'Pagamento Recebido 💰', message: `${div.ticker} pagou R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})} hoje!`, type: 'success', category: 'payment', timestamp: Date.now(), read: false });
                  }
              }
              if (isSameDayLocal(div.dateCom)) {
                  const id = `datacom-${div.ticker}-${div.dateCom}`;
                  if (!existingIds.has(id)) {
                      newNotifs.push({ id, title: 'Data Com Hoje 📅', message: `Último dia para garantir proventos de ${div.ticker}.`, type: 'info', category: 'datacom', timestamp: Date.now(), read: false });
                  }
              }
          }
      });
      if (newNotifs.length > 0) { setNotifications(prev => [...newNotifs, ...prev]); if (navigator.vibrate) navigator.vibrate(200); }
  }, [dividends, transactions]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast(null);
    setTimeout(() => { setToast({ type, text }); toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3500); }, 50);
  }, []);

  const checkConnection = useCallback(async () => {
      setIsCheckingServices(true);
      const newServices = [...servicesRef.current];
      
      const checkUrl = async (url: string) => {
          const start = Date.now();
          try {
              await fetch(url, { method: 'HEAD', mode: 'no-cors' }); 
              return Date.now() - start;
          } catch {
              return null;
          }
      };

      const dbPing = await checkUrl(SUPABASE_URL || '');
      newServices[0] = { ...newServices[0], status: dbPing ? 'operational' : 'error', latency: dbPing };

      const marketPing = await checkUrl('https://brapi.dev');
      newServices[1] = { ...newServices[1], status: marketPing ? 'operational' : 'degraded', latency: marketPing };

      newServices[2] = { ...newServices[2], status: 'operational', latency: 10 };

      setServices(newServices);
      setIsCheckingServices(false);
  }, []);

  const syncMarketData = useCallback(async (force = false, txsToUse: Transaction[], initialLoad = false) => {
    const tickers = Array.from(new Set(txsToUse.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;
    
    if (force && !initialLoad) setIsRefreshing(true); 
    if (initialLoad) setLoadingProgress(50);
    
    try {
      // 1. Cotações (Brapi) - Atualização Rápida
      const { quotes: newQuotesData } = await getQuotes(tickers);
      if (newQuotesData.length > 0) {
        setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: any, q: any) => ({...acc, [q.symbol]: q }), {})}));
      }
      
      if (initialLoad) setLoadingProgress(70); 
      
      const startDate = txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date);
      
      // 2. Fundamentos e Dividendos (Supabase + Scraper)
      // Aqui removemos a trava de tempo. A função fetchUnifiedMarketData decide inteligentemente se precisa do scraper.
      // O 'force' aqui é apenas um sinalizador manual do usuário, mas o fetchUnifiedMarketData tem sua própria lógica de 'staleness'.
      let data = await fetchUnifiedMarketData(tickers, startDate, force);

      if (data.dividends.length > 0) {
          setDividends(prev => mergeDividends(prev, data.dividends));
      }
      if (Object.keys(data.metadata).length > 0) {
          setAssetsMetadata(prev => {
              const next = { ...prev };
              Object.entries(data.metadata).forEach(([ticker, newMeta]) => { next[ticker] = newMeta; });
              return next;
          });
      }
      if (data.indicators) {
         setMarketIndicators({ ipca: data.indicators.ipca_cumulative || 4.62, startDate: data.indicators.start_date_used });
      }
      
      localStorage.setItem(STORAGE_KEYS.LAST_AUTO_SYNC, Date.now().toString());
      if (initialLoad) setLoadingProgress(100); 

    } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
  }, [dividends, assetsMetadata]);

  const refreshSingleAsset = useCallback(async (ticker: string) => {
      try {
          const { dividends: newDivs, metadata: newMeta } = await fetchUnifiedMarketData([ticker], undefined, true);
          if (newDivs.length > 0) setDividends(prev => mergeDividends(prev, newDivs));
          if (newMeta[ticker]) setAssetsMetadata(prev => ({ ...prev, [ticker]: newMeta[ticker] }));
          const { quotes: q } = await getQuotes([ticker]);
          if(q.length > 0) setQuotes(prev => ({...prev, [ticker]: q[0]}));
      } catch (e) { console.error("Single asset refresh failed:", e); }
  }, []);

  const fetchTransactionsFromCloud = useCallback(async (currentSession: Session | null, initialLoad = false) => {
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
        
        if (cloudTxs.length > 0) {
            // REMOVIDA: A lógica que impedia o sync se fosse recente.
            // Agora, ao carregar as transações, SEMPRE disparamos a verificação de integridade dos dados.
            // O controle de "spam" é feito internamente pelo fetchUnifiedMarketData (verifica data de cada ativo).
            
            await syncMarketData(false, cloudTxs, initialLoad);
        } else {
             if (initialLoad) setLoadingProgress(100);
        }
    } catch (err) { 
        console.error(err);
        showToast('error', 'Erro de conexão.'); 
        setCloudStatus('disconnected'); 
    }
  }, [syncMarketData, showToast]);

  useEffect(() => {
    const initApp = async () => {
        const startTime = Date.now();
        setLoadingProgress(10);
        try {
            const { data } = await supabase.auth.getSession();
            const initialSession = data?.session;
            setSession(initialSession);
            setLoadingProgress(50);
            if (initialSession) {
                await fetchTransactionsFromCloud(initialSession, true);
            }
            const elapsed = Date.now() - startTime;
            if (elapsed < 2000) await new Promise(resolve => setTimeout(resolve, 2000 - elapsed));
            setLoadingProgress(100);
        } catch (e) {
            console.warn("Init error:", e);
            setSession(null);
        } finally {
            setIsReady(true);
        }
    };
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        if (event === 'SIGNED_IN' && newSession) fetchTransactionsFromCloud(newSession, true);
        if (!newSession) { setTransactions([]); setDividends([]); }
    });
    return () => subscription.unsubscribe();
  }, []); 

  const handleLogout = useCallback(async () => {
    setSession(null); setTransactions([]); setDividends([]);
    await supabase.auth.signOut();
    try { Object.keys(localStorage).forEach(key => { if (key.startsWith('sb-')) localStorage.removeItem(key); }); } catch {}
  }, []);

  const memoizedPortfolioData = useMemo(() => {
      return processPortfolio(transactions, dividends, quotes, assetsMetadata);
  }, [transactions, quotes, dividends, assetsMetadata]);

  const isHeaderVisible = showSettings || scrollDirection === 'up' || isTop;

  if (!isReady) return <SplashScreen finishLoading={false} realProgress={loadingProgress} />;
  if (!session) return <> <SplashScreen finishLoading={true} realProgress={100} /> <InstallPromptModal isOpen={showInstallModal} onInstall={() => installPrompt?.prompt()} onDismiss={() => setShowInstallModal(false)} /> <Login /> </>;

  return (
    <div className="min-h-screen bg-[#F2F2F2] dark:bg-black text-zinc-900 dark:text-white pb-safe">
      <SplashScreen finishLoading={true} realProgress={100} />
      
      {toast && ( 
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] w-auto max-w-sm px-4">
            <div className="bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 anim-scale-in backdrop-blur-md shadow-xl">
               {toast.text}
            </div>
        </div> 
      )}

      <>
        <Header 
            title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Carteira' : currentTab === 'transactions' ? 'Extrato' : 'Notícias'} 
            showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} 
            updateAvailable={isUpdateAvailable} onUpdateClick={() => setShowChangelog(true)} 
            onNotificationClick={() => setShowNotifications(true)} notificationCount={notifications.filter(n=>!n.read).length} 
            cloudStatus={cloudStatus} 
            isVisible={isHeaderVisible}
        />
        
        <main className="max-w-xl mx-auto pt-28 pb-32 min-h-screen px-6">
          {showSettings ? (
            <div className="pt-2">
              <MemoizedSettings onLogout={handleLogout} user={session.user} transactions={transactions} onImportTransactions={setTransactions} dividends={dividends} onImportDividends={setDividends} onResetApp={() => { localStorage.clear(); window.location.reload(); }} theme={theme} onSetTheme={setTheme} accentColor={accentColor} onSetAccentColor={setAccentColor} privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} appVersion={APP_VERSION} updateAvailable={isUpdateAvailable} onCheckUpdates={checkForUpdates} onShowChangelog={() => setShowChangelog(true)} pushEnabled={pushEnabled} onRequestPushPermission={() => setPushEnabled(!pushEnabled)} onSyncAll={() => fetchTransactionsFromCloud(session, true)} onForceUpdate={() => window.location.reload()} currentVersionDate={currentVersionDate} services={services} onCheckConnection={checkConnection} isCheckingConnection={isCheckingServices} />
            </div>
          ) : (
            <div key={currentTab} className="anim-page-enter">
              {currentTab === 'home' && <MemoizedHome {...memoizedPortfolioData} transactions={transactions} totalAppreciation={memoizedPortfolioData.balance - memoizedPortfolioData.invested} inflationRate={marketIndicators.ipca} privacyMode={privacyMode} onViewAsset={(t) => { setTargetAssetTicker(t); setCurrentTab('portfolio'); }} />}
              {currentTab === 'portfolio' && <MemoizedPortfolio portfolio={memoizedPortfolioData.portfolio} dividends={dividends} privacyMode={privacyMode} onAssetRefresh={refreshSingleAsset} headerVisible={isHeaderVisible} targetAsset={targetAssetTicker} onClearTarget={() => setTargetAssetTicker(null)} />}
              
              {currentTab === 'transactions' && 
                <MemoizedTransactions 
                    transactions={transactions} 
                    onAddTransaction={async (t) => { 
                        const { error } = await supabase.from('transactions').insert({...t, user_id: session.user.id}); 
                        if(!error) fetchTransactionsFromCloud(session); 
                    }} 
                    onUpdateTransaction={async (id, t) => { 
                        const { error } = await supabase.from('transactions').update(t).eq('id', id); 
                        if(!error) fetchTransactionsFromCloud(session); 
                    }} 
                    onBulkDelete={async (ids) => {
                        const { error } = await supabase.from('transactions').delete().in('id', ids);
                        if(!error) fetchTransactionsFromCloud(session);
                    }}
                    onRequestDeleteConfirmation={(id) => setConfirmModal({ 
                        isOpen: true, 
                        title: 'Excluir?', 
                        message: 'Esta ação não pode ser desfeita.', 
                        onConfirm: async () => { 
                            await supabase.from('transactions').delete().eq('id', id); 
                            fetchTransactionsFromCloud(session); 
                            setConfirmModal(null); 
                        } 
                    })} 
                    privacyMode={privacyMode} 
                />
              }
              
              {currentTab === 'news' && <MemoizedNews transactions={transactions} />}
            </div>
          )}
        </main>
        
        {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} isVisible={isHeaderVisible} />}
        
        <ChangelogModal isOpen={isChangelogOpen} onClose={() => setShowChangelog(false)} version={APP_VERSION} notes={releaseNotes} isUpdatePending={isUpdateAvailable} onUpdate={startUpdateProcess} isUpdating={isUpdating} progress={updateProgress} />
        <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onClear={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} />
        <ConfirmationModal isOpen={!!confirmModal} title={confirmModal?.title} message={confirmModal?.message} onConfirm={confirmModal?.onConfirm} onCancel={() => setConfirmModal(null)} />
        <InstallPromptModal isOpen={showInstallModal} onInstall={() => installPrompt?.prompt()} onDismiss={() => setShowInstallModal(false)} />
      </>
    </div>
  );
};

export default App;
