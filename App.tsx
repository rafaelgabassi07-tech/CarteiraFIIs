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

const APP_VERSION = '9.2.2';

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  QUOTES: 'investfiis_v3_quote_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  NOTIF_HISTORY: 'investfiis_notification_history_v3',
  METADATA: 'investfiis_metadata_v2',
  LAST_AUTO_SYNC: 'investfiis_last_auto_sync'
};

const mergeDividends = (current: DividendReceipt[], incoming: DividendReceipt[]) => {
    const map = new Map<string, DividendReceipt>();
    // Chave única composta: Ticker + Tipo + DataCom + Valor
    current.forEach(d => { const key = `${normalizeTicker(d.ticker)}-${d.type}-${d.dateCom}-${d.rate}`; map.set(key, d); });
    incoming.forEach(d => { const key = `${normalizeTicker(d.ticker)}-${d.type}-${d.dateCom}-${d.rate}`; map.set(key, d); });
    return Array.from(map.values());
};

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  const { setShowChangelog, checkForUpdates, isUpdateAvailable, availableVersion, currentVersionDate, startUpdateProcess, isUpdating, updateProgress, releaseNotes, showChangelog: isChangelogOpen } = updateManager;
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
  const [updateResults, setUpdateResults] = useState<UpdateReportData | null>(null);

  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#10b981'); 
  // Strict Boolean Initialization
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
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
  
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>(() => { 
      try { 
          const s = localStorage.getItem(STORAGE_KEYS.METADATA); 
          return s ? JSON.parse(s) : {}; 
      } catch { return {}; } 
  });

  const [isCheckingServices, setIsCheckingServices] = useState(false);
  const servicesRef = useRef<ServiceMetric[]>([
    { id: 'db', label: 'Supabase Database', url: SUPABASE_URL, icon: Database, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'market', label: 'Brapi Market Data', url: 'https://brapi.dev', icon: Activity, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'cdn', label: 'App CDN (Vercel)', url: window.location.origin, icon: Globe, status: 'operational', latency: null, message: 'Aplicação carregada localmente.' }
  ]);
  const [services, setServices] = useState<ServiceMetric[]>(servicesRef.current);

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

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PRIVACY, String(privacyMode)); }, [privacyMode]);

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
      if (newNotifs.length > 0) { 
          setNotifications(prev => [...newNotifs, ...prev].slice(0, 50)); 
      }
  }, [dividends, transactions]);

  // Auth & Initial Data
  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
      });
      return () => subscription.unsubscribe();
  }, []);

  // Sync Logic
  useEffect(() => {
      const sync = async () => {
          if (!transactions.length) {
              // Se não tem transações, tenta carregar do localStorage ou DB
              setIsReady(true);
              return;
          }
          
          setCloudStatus('syncing');
          setLoadingProgress(30);
          
          const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
          
          try {
              // 1. Quotes
              const quoteRes = await getQuotes(tickers);
              if (quoteRes.quotes) {
                  const qMap = { ...quotes };
                  quoteRes.quotes.forEach(q => { qMap[q.symbol] = q; });
                  setQuotes(qMap);
              }
              setLoadingProgress(60);

              // 2. Data Service (Dividends + Metadata + Indicators)
              const data = await fetchUnifiedMarketData(tickers);
              
              if (data.dividends.length > 0) {
                  setDividends(prev => mergeDividends(prev, data.dividends));
              }
              if (data.metadata) {
                  setAssetsMetadata(prev => ({ ...prev, ...data.metadata }));
              }
              if (data.indicators) {
                  setMarketIndicators({ ipca: data.indicators.ipca_cumulative, startDate: '' });
              }
              
              setLoadingProgress(100);
              setCloudStatus('connected');
          } catch (e) {
              console.error('Sync failed', e);
              setCloudStatus('disconnected');
          } finally {
              setIsReady(true);
              setTimeout(() => setCloudStatus('hidden'), 2000);
          }
      };

      sync();
      const interval = setInterval(sync, 300000); // 5 min refresh
      return () => clearInterval(interval);
  }, [transactions]); 

  // Handlers de dados
  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
      const newTx = { ...t, id: crypto.randomUUID() };
      setTransactions(prev => [...prev, newTx]);
      // Opcional: Persistir no Supabase aqui
  };

  const handleUpdateTransaction = async (id: string, t: Partial<Transaction>) => {
      setTransactions(prev => prev.map(x => x.id === id ? { ...x, ...t } : x));
  };

  const handleBulkDelete = async (ids: string[]) => {
      setTransactions(prev => prev.filter(x => !ids.includes(x.id)));
  };

  // Cálculo Principal
  const { portfolio, balance, invested, totalDividendsReceived, salesGain } = useMemo(() => 
      processPortfolio(transactions, dividends, quotes, assetsMetadata), 
  [transactions, dividends, quotes, assetsMetadata]);

  const totalAppreciation = balance - invested;

  return (
    <>
      <SplashScreen finishLoading={isReady} realProgress={loadingProgress} />
      
      {showSettings ? (
          <Settings 
            user={session?.user} 
            transactions={transactions}
            onImportTransactions={setTransactions}
            dividends={dividends}
            onImportDividends={setDividends}
            onLogout={() => supabase.auth.signOut()}
            onResetApp={() => {
                localStorage.clear();
                window.location.reload();
            }}
            theme={theme}
            onSetTheme={setTheme}
            accentColor={accentColor}
            onSetAccentColor={setAccentColor}
            privacyMode={privacyMode}
            onSetPrivacyMode={setPrivacyMode}
            appVersion={APP_VERSION}
            updateAvailable={isUpdateAvailable}
            onCheckUpdates={checkForUpdates}
            onShowChangelog={() => setShowChangelog(true)}
            pushEnabled={pushEnabled}
            onRequestPushPermission={() => setPushEnabled(true)}
            onSyncAll={async () => {}} 
            currentVersionDate={currentVersionDate}
            onForceUpdate={startUpdateProcess}
            services={services}
            onCheckConnection={async () => {}} 
            isCheckingConnection={isCheckingServices}
          />
      ) : (
        <>
          <Header 
            title="InvestFIIs" 
            isVisible={true}
            onSettingsClick={() => setShowSettings(true)}
            notificationCount={notifications.filter(n => !n.read).length}
            onNotificationClick={() => setShowNotifications(true)}
            updateAvailable={isUpdateAvailable}
            onUpdateClick={startUpdateProcess}
            cloudStatus={cloudStatus}
          />

          <main className="pt-20 px-4 min-h-screen">
            {currentTab === 'home' && (
                <Home 
                    portfolio={portfolio}
                    dividendReceipts={dividends}
                    salesGain={salesGain}
                    totalDividendsReceived={totalDividendsReceived}
                    invested={invested}
                    balance={balance}
                    totalAppreciation={totalAppreciation}
                    transactions={transactions}
                    privacyMode={privacyMode}
                />
            )}
            {currentTab === 'portfolio' && (
                <Portfolio 
                    portfolio={portfolio}
                    dividends={dividends}
                    privacyMode={privacyMode}
                    targetAsset={targetAssetTicker}
                    onClearTarget={() => setTargetAssetTicker(null)}
                />
            )}
            {currentTab === 'transactions' && (
                <Transactions 
                    transactions={transactions}
                    privacyMode={privacyMode}
                    onAddTransaction={handleAddTransaction}
                    onUpdateTransaction={handleUpdateTransaction}
                    onBulkDelete={handleBulkDelete}
                    onRequestDeleteConfirmation={(id) => {}}
                />
            )}
            {currentTab === 'news' && (
                <News transactions={transactions} />
            )}
          </main>

          <BottomNav 
            currentTab={currentTab} 
            onTabChange={setCurrentTab} 
            isVisible={true}
          />
        </>
      )}

      {/* Global Modals */}
      <NotificationsModal 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={notifications}
        onClear={() => setNotifications([])}
      />
      
      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => setShowChangelog(false)} 
        version={availableVersion || APP_VERSION} 
        notes={releaseNotes}
        isUpdatePending={isUpdateAvailable}
        onUpdate={startUpdateProcess}
        isUpdating={isUpdating}
      />

      <InstallPromptModal 
        isOpen={showInstallModal}
        onInstall={() => { installPrompt?.prompt(); setShowInstallModal(false); }}
        onDismiss={() => setShowInstallModal(false)}
      />
    </>
  );
};

export { App };