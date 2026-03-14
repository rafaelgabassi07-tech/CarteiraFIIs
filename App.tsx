import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header, BottomNav, ChangelogModal, NotificationsModal, ConfirmationModal, InstallPromptModal, UpdateReportModal } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { News } from './pages/News';
import Watchlist from './pages/Watchlist';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Transaction, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals, ServiceMetric, ThemeType, ScrapeResult, UpdateReportData, PortfolioInsight } from './types';
import { getQuotes, isTokenValid } from './services/brapiService';
import { fetchUnifiedMarketData, triggerScraperUpdate, mapScraperToFundamentals, fetchFutureAnnouncements } from './services/dataService';
import { getQuantityOnDate, isSameDayLocal, mapSupabaseToTx, processPortfolio, normalizeTicker } from './services/portfolioRules';
import { generateAIInsights } from './services/aiService';
import { Check, Loader2, AlertTriangle, Info, Database, Activity, Globe } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase, SUPABASE_URL } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import { useScrollDirection } from './hooks/useScrollDirection';

const APP_VERSION = '8.9.2'; 

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  QUOTES: 'investfiis_v3_quote_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  NOTIF_HISTORY: 'investfiis_notification_history_v3',
  METADATA: 'investfiis_metadata_v2' 
};

// Helpers for safe localStorage access
const safeGetItem = <T,>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const safeGetString = (key: string, defaultVal: string): string => {
  try {
    return localStorage.getItem(key) || defaultVal;
  } catch {
    return defaultVal;
  }
};

// Pages like Home, Portfolio, Transactions are already memoized in their files.
// We only memoize News and Settings here to prevent re-renders.
const MemoizedNews = React.memo(News);
const MemoizedSettings = React.memo(Settings); 

// Helper para merge inteligente de dividendos sem duplicatas
const mergeDividends = (current: DividendReceipt[], incoming: DividendReceipt[]) => {
    const map = new Map<string, DividendReceipt>();
    
    const getStableKey = (d: DividendReceipt) => {
        const ticker = normalizeTicker(d.ticker);
        const type = d.type || 'DIV';
        // Usa a data COM como primária para deduplicação, pois é o evento gerador.
        // Se não tiver data COM, usa a de pagamento.
        const date = (d.dateCom || d.paymentDate || '').split('T')[0];
        const rate = Number(d.rate).toFixed(6);
        return `${ticker}-${type}-${date}-${rate}`;
    };

    // Indexa os atuais pela chave de negócio
    current.forEach(d => {
        map.set(getStableKey(d), d);
    });

    // Adiciona/Atualiza com os novos
    incoming.forEach(d => {
        map.set(getStableKey(d), d);
    });

    return Array.from(map.values());
};

// --- LOGO COMPONENT ---
// Defined explicitly as a component to prevent rendering issues with Header
const AppLogo = () => (
  <img src="./logo.svg" className="w-7 h-7 object-contain drop-shadow-sm" alt="InvestFIIs" />
);

const App: React.FC = () => {
  // --- ESTADOS GLOBAIS ---
  const updateManager = useUpdateManager(APP_VERSION);
  // Destructuring stable values to fix re-render dependency issue
  const { setShowChangelog, checkForUpdates, isUpdateAvailable, currentVersionDate, startUpdateProcess, isUpdating, updateProgress, releaseNotes, showChangelog: isChangelogOpen } = updateManager;

  const { scrollDirection, isTop } = useScrollDirection();
  
  // Controle de Inicialização
  const [isReady, setIsReady] = useState(false); 
  const [loadingProgress, setLoadingProgress] = useState(0); 
  
  // Auth
  const [session, setSession] = useState<Session | null>(null);
  
  // UI States
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUpdateReport, setShowUpdateReport] = useState(false);
  
  // Navigation State (Deep Linking interno)
  const [targetAssetTicker, setTargetAssetTicker] = useState<string | null>(null);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Preferências
  const [theme, setTheme] = useState<ThemeType>(() => safeGetString(STORAGE_KEYS.THEME, 'system') as ThemeType);
  const [accentColor, setAccentColor] = useState(() => safeGetString(STORAGE_KEYS.ACCENT, '#0ea5e9'));
  const [privacyMode, setPrivacyMode] = useState(() => safeGetString(STORAGE_KEYS.PRIVACY, 'false') === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => safeGetString(STORAGE_KEYS.PUSH_ENABLED, 'false') === 'true');
  
  // Feedback
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  // Estado Completo do Relatório
  const [lastUpdateReport, setLastUpdateReport] = useState<UpdateReportData>({ results: [], inflationRate: 0, totalDividendsFound: 0 });
  
  // Dados de Negócio
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => safeGetItem(STORAGE_KEYS.NOTIF_HISTORY, []));
  
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>(() => safeGetItem(STORAGE_KEYS.QUOTES, {}));
  
  const [dividends, setDividends] = useState<DividendReceipt[]>(() => {
      const cached = safeGetItem<DividendReceipt[]>(STORAGE_KEYS.DIVS, []);
      return mergeDividends([], cached);
  });
  
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, cdi: number, startDate: string}>(() => 
      safeGetItem(STORAGE_KEYS.INDICATORS, { ipca: 4.62, cdi: 11.25, startDate: '' })
  );
  
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>(() => 
      safeGetItem(STORAGE_KEYS.METADATA, {})
  );

  // Status de Processos
  const [isScraping, setIsScraping] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status de Serviços
  const [isCheckingServices, setIsCheckingServices] = useState(false);
  const [aiInsights, setAiInsights] = useState<PortfolioInsight[]>([]);
  
  const servicesRef = useRef<ServiceMetric[]>([
    { id: 'db', label: 'Supabase Database', url: SUPABASE_URL, icon: Database, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'market', label: 'Brapi Market Data', url: 'https://brapi.dev', icon: Activity, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'cdn', label: 'App CDN (Vercel)', url: window.location.origin, icon: Globe, status: 'operational', latency: null, message: 'Aplicação carregada localmente.' }
  ]);
  const [services, setServices] = useState<ServiceMetric[]>(servicesRef.current);

  // --- EFEITOS DE PERSISTÊNCIA ---
  useEffect(() => { try { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(dividends)); } catch {} }, [dividends]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes)); } catch {} }, [quotes]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); } catch {} }, [marketIndicators]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEYS.NOTIF_HISTORY, JSON.stringify(notifications.slice(0, 50))); } catch {} }, [notifications]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(assetsMetadata)); } catch {} }, [assetsMetadata]);

  // Tema e Cores
  useEffect(() => {
    try {
        const root = window.document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
        document.documentElement.style.setProperty('--color-accent-rgb', accentColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(' ') || '14 165 233');
        localStorage.setItem(STORAGE_KEYS.ACCENT, accentColor);
    } catch {}
  }, [accentColor]);

  useEffect(() => {
    try {
        localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled));
    } catch {}
  }, [pushEnabled]);

  // --- CORREÇÃO DE SCROLL ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab, showSettings]);

  // --- REVEAL APP ---
  useEffect(() => {
    if (isReady) {
        const timer = setTimeout(() => {
            document.body.classList.add('app-revealed');
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isReady]);


  // --- PWA INSTALL HANDLER ---
  useEffect(() => {
      const handler = (e: Event) => {
          e.preventDefault();
          setInstallPrompt(e);
          setTimeout(() => setShowInstallModal(true), 5000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
          setInstallPrompt(null);
      }
      setShowInstallModal(false);
  };

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast(null);
    setTimeout(() => { 
      setToast({ type, text }); 
      toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3500); 
    }, 50);
  }, []);

  const checkServiceHealth = useCallback(async () => {
    setIsCheckingServices(true);
    const currentServices = [...servicesRef.current];
    setServices(prev => prev.map(s => ({ ...s, status: 'checking', message: 'Testando conexão...' })));

    const checks = currentServices.map(async (s) => {
        const start = Date.now();
        let status: ServiceMetric['status'] = 'operational';
        let message = '';
        let latency = 0;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); 

            if (s.id === 'db') {
                // Supabase Check
                const { error } = await supabase.from('transactions').select('id').limit(1).maybeSingle();
                // Error PGRST116 means no rows found (but connection worked), so it's a success for health check.
                if (error && error.code !== 'PGRST116') {
                    const { error: authError } = await supabase.auth.getSession();
                    if (authError) throw error; // Real error
                }
                message = 'Conexão com Banco de Dados OK.';
            } 
            else if (s.id === 'market') {
                if (!isTokenValid()) {
                    throw new Error('Token Brapi não configurado.');
                }
                // Brapi Check - No-CORS allows opaque check. If fetch doesn't throw, server is reachable.
                await fetch('https://brapi.dev/api/quote/PETR4', { mode: 'no-cors', signal: controller.signal });
                message = 'API de Cotações acessível.';
            } 
            else if (s.id === 'cdn') {
                // CDN Check
                const res = await fetch(`${window.location.origin}/version.json?t=${Date.now()}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                message = 'Arquivos estáticos carregados.';
            }

            clearTimeout(timeoutId);
            latency = Date.now() - start;
            if (latency > 2500) status = 'degraded';

        } catch (e: unknown) {
            status = 'error';
            const error = e as Error;
            message = error.name === 'AbortError' ? 'Tempo limite (Timeout)' : (error.message || 'Falha');
            latency = 0;
        }

        return { ...s, status, latency, message };
    });

    const results = await Promise.all(checks);
    setServices(results);
    setIsCheckingServices(false);
  }, []); 

  // --- SINCRONIZAÇÃO DE DADOS ---

  const syncMarketData = useCallback(async (force = false, txsToUse: Transaction[], initialLoad = false) => {
    const tickers = Array.from(new Set(txsToUse.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;
    setIsRefreshing(true);
    if (initialLoad) setLoadingProgress(50);
    
    try {
      const { quotes: newQuotesData, error } = await getQuotes(tickers);
      if (error) {
          console.error("Brapi Error:", error);
          if (initialLoad) showToast('error', `Falha nas cotações: ${error}`);
      }
      
      if (newQuotesData && newQuotesData.length > 0) {
        setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: Record<string, BrapiQuote>, q: BrapiQuote) => ({...acc, [q.symbol]: q }), {})}));
      }
      
      if (initialLoad) setLoadingProgress(70); 
      
      // Busca dados unificados (Supabase cache ou Scraper se force=true)
      const startDate = txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date);
      
      // Se for initialLoad, forçamos o scraper para garantir dados frescos (Automatização)
      const shouldForce = force || initialLoad;
      let data = await fetchUnifiedMarketData(tickers, startDate, shouldForce);

      if (data.dividends.length > 0) {
          setDividends(prev => mergeDividends(prev, data.dividends));
      }
      if (Object.keys(data.metadata).length > 0) {
          setAssetsMetadata(prev => {
              const next = { ...prev };
              Object.entries(data.metadata).forEach(([ticker, newMeta]) => {
                  next[ticker] = newMeta;
              });
              return next;
          });
      }
      
      if (data.indicators) {
         setMarketIndicators({ 
             ipca: data.indicators.ipca_cumulative || 4.62, 
             cdi: data.indicators.cdi_cumulative || 11.25,
             startDate: data.indicators.start_date_used 
         });
      }

      // --- AUTOMATIZAÇÃO ROBÔ DA AGENDA ---
      // Calcula projeções baseadas nos dados atualizados e insere na agenda
      // Recalcula portfolio temporário para o robô ter qtd correta
      const tempPortfolio = processPortfolio(txsToUse, [], {}, data.metadata).portfolio;
      const predictions = await fetchFutureAnnouncements(tempPortfolio, txsToUse);
      
      if (predictions.length > 0) {
          const predictionReceipts: DividendReceipt[] = predictions.map(p => ({
              id: `pred-${p.ticker}-${p.paymentDate}-${p.rate}`,
              ticker: p.ticker,
              type: p.type,
              dateCom: p.dateCom,
              paymentDate: p.paymentDate,
              rate: p.rate,
              quantityOwned: p.quantity,
              totalReceived: p.projectedTotal,
              assetType: AssetType.FII,
              status: p.status
          }));
          setDividends(prev => mergeDividends(prev, predictionReceipts));
      }
      
      if (initialLoad) setLoadingProgress(100); 
    } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
  }, [dividends, pushEnabled, assetsMetadata]);

  // Função dedicada para atualização pontual de ativo (JIT)
  const refreshSingleAsset = useCallback(async (ticker: string) => {
      try {
          const { dividends: newDivs, metadata: newMeta } = await fetchUnifiedMarketData([ticker], undefined, true);
          
          if (newDivs.length > 0) {
              setDividends(prev => mergeDividends(prev, newDivs));
          }

          if (newMeta[ticker]) {
              setAssetsMetadata(prev => ({
                  ...prev,
                  [ticker]: newMeta[ticker]
              }));
          }
          
          const { quotes: q } = await getQuotes([ticker]);
          if(q.length > 0) {
              setQuotes(prev => ({...prev, [ticker]: q[0]}));
          }

      } catch (e) {
          console.error("Single asset refresh failed:", e);
      }
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
        
        if (cloudTxs.length > 0) {
            await syncMarketData(force, cloudTxs, initialLoad);
        } else {
             if (initialLoad) setLoadingProgress(100);
        }
    } catch (err) { 
        console.error(err);
        showToast('error', 'Erro na nuvem.'); 
        setCloudStatus('disconnected'); 
    }
  }, [syncMarketData, showToast]);

  useEffect(() => {
    const initApp = async () => {
        const startTime = Date.now();
        const MIN_SPLASH_TIME = 2500;
        setLoadingProgress(10);
        try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 5000));
            // @ts-ignore
            const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
            if (error) throw error;
            const initialSession = data?.session;
            setSession(initialSession);
            setLoadingProgress(50);
            if (initialSession) {
                // Initial Load = true triggers the automatic Scraper and Robot
                fetchTransactionsFromCloud(initialSession, false, true);
            }
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_SPLASH_TIME - elapsed);
            if (remainingTime > 0) {
                setLoadingProgress(80);
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
            setLoadingProgress(100);
        } catch (e) {
            console.warn("Auth check finished with error or timeout, defaulting to Login screen.", e);
            setSession(null);
        } finally {
            setIsReady(true);
        }
    };
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        if (event === 'SIGNED_IN' && newSession) {
            fetchTransactionsFromCloud(newSession, false, true);
        }
        if (!newSession) {
            setTransactions([]);
            setDividends([]);
        }
    });
    return () => subscription.unsubscribe();
  }, []); 

  const handleLogout = useCallback(async () => {
    setSession(null);
    setTransactions([]);
    setDividends([]);
    await supabase.auth.signOut();
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) { console.warn(e); }
    showToast('info', 'Desconectado com sucesso.');
  }, [showToast]);

  const handleSyncAll = useCallback(async (force = false) => {
    if (session) await fetchTransactionsFromCloud(session, force);
  }, [session, fetchTransactionsFromCloud]);

  const handleSoftReset = useCallback(() => {
      Object.keys(localStorage).forEach(key => {
          if (!key.startsWith('sb-') && !key.includes('supabase')) localStorage.removeItem(key);
      });
      window.location.reload();
  }, []);

  // Callbacks estabilizados para evitar re-render em MemoizedSettings
  const handleForceUpdate = useCallback(() => {
      window.location.reload();
  }, []);

  const handleRequestPushPermission = useCallback(() => {
      setPushEnabled(prev => !prev);
  }, []);

  const handleShowChangelog = useCallback(() => {
      setShowChangelog(true);
  }, [setShowChangelog]);

  // --- REFRESH MANUAL COMPLETO (ACÃO DO USUÁRIO) ---
  const handleManualRefresh = async () => {
      if (transactions.length === 0) {
          showToast('info', 'Adicione ativos primeiro.');
          return;
      }
      
      setIsRefreshing(true);
      showToast('info', 'Buscando atualizações de mercado...');
      
      try {
          const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase())));
          
          // 1. Atualiza Cotações (Brapi) - Rápido
          const { quotes: newQuotesData, error } = await getQuotes(tickers);
          if (error) showToast('error', `Brapi: ${error}`);
          
          if (newQuotesData && newQuotesData.length > 0) {
              setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: Record<string, BrapiQuote>, q: BrapiQuote) => ({...acc, [q.symbol]: q }), {})}));
          }
          
          // 2. Sincroniza dados unificados FORÇANDO O SCRAPER (forceRefresh = true)
          // Isso garante que novas informações sejam baixadas do Investidor10
          const startDate = transactions.reduce((min, t) => t.date < min ? t.date : min, transactions[0].date);
          const data = await fetchUnifiedMarketData(tickers, startDate, true); 
          
          if (data.dividends.length > 0) {
              setDividends(prev => mergeDividends(prev, data.dividends));
          }
          
          if (Object.keys(data.metadata).length > 0) {
              setAssetsMetadata(prev => {
                  const next = { ...prev };
                  Object.entries(data.metadata).forEach(([ticker, newMeta]) => {
                      next[ticker] = newMeta;
                  });
                  return next;
              });
          }

          // Atualiza relatório e mostra modal
          const results: ScrapeResult[] = tickers.map(t => ({
              ticker: t,
              status: 'success' as const,
          }));

          setLastUpdateReport({
              results: results,
              inflationRate: data.indicators?.ipca_cumulative || 0,
              cdiRate: data.indicators?.cdi_cumulative || 0,
              totalDividendsFound: data.dividends.length
          });
          setShowUpdateReport(true);

          showToast('success', 'Carteira atualizada com sucesso!');
      } catch (e) {
          console.error(e);
          showToast('error', 'Falha ao atualizar dados. Tente novamente.');
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleAddTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
      if (!session?.user?.id) return;
      const dbPayload = { ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, asset_type: t.assetType, user_id: session.user.id };
      const { error } = await supabase.from('transactions').insert(dbPayload);
      if (error) { showToast('error', 'Erro ao salvar'); return; }
      await fetchTransactionsFromCloud(session);
  }, [session, fetchTransactionsFromCloud, showToast]);

  const handleUpdateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
      const dbPayload: Record<string, unknown> = {};
      if (t.ticker !== undefined) dbPayload.ticker = t.ticker;
      if (t.type !== undefined) dbPayload.type = t.type;
      if (t.quantity !== undefined) dbPayload.quantity = t.quantity;
      if (t.price !== undefined) dbPayload.price = t.price;
      if (t.date !== undefined) dbPayload.date = t.date;
      if (t.assetType !== undefined) dbPayload.asset_type = t.assetType; 
      const { error } = await supabase.from('transactions').update(dbPayload).eq('id', id);
      if (error) { showToast('error', 'Erro ao atualizar'); return; }
      await fetchTransactionsFromCloud(session);
  }, [session, fetchTransactionsFromCloud, showToast]);

  const handleDeleteTransaction = useCallback((id: string) => {
      setConfirmModal({
          isOpen: true, title: 'Apagar?', message: 'Confirmar exclusão desta ordem?', 
          onConfirm: async () => {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) showToast('error', 'Erro ao excluir'); else { setConfirmModal(null); await fetchTransactionsFromCloud(session); }
          }
      });
  }, [session, fetchTransactionsFromCloud, showToast]);

  const handleMarkAllAsRead = useCallback(() => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleDeleteAllNotifications = useCallback(() => {
      setNotifications([]);
  }, []);

  const handleDeleteReadNotifications = useCallback(() => {
      setNotifications(prev => prev.filter(n => !n.read));
  }, []);

  // Handler para Navegação via Stories
  const handleViewAsset = useCallback((ticker: string) => {
      setTargetAssetTicker(ticker);
      setCurrentTab('portfolio');
  }, []);

  // --- CÁLCULOS DE PORTFÓLIO (Delegado para Serviço) ---
  const memoizedPortfolioData = useMemo(() => {
      return processPortfolio(transactions, dividends, quotes, assetsMetadata, marketIndicators.ipca);
  }, [transactions, quotes, dividends, assetsMetadata, marketIndicators]);

  // --- GERAÇÃO DE STORIES (INSIGHTS) ---
  useEffect(() => {
    const fetchAI = async () => {
        try {
            // Only fetch if portfolio is loaded (or if it's empty but we still want to fetch)
            // We can just pass the current portfolio state.
            const insights = await generateAIInsights(memoizedPortfolioData.portfolio || [], marketIndicators.ipca || 0);
            setAiInsights(insights);
        } catch (e) {
            console.error("AI Insights Error:", e);
        }
    };
    
    // We only want to run this once per session, or when portfolio changes significantly.
    // Since generateAIInsights caches per day, it's safe to call it when portfolio updates.
    fetchAI();
  }, [memoizedPortfolioData.portfolio, marketIndicators.ipca]);

  const insights = useMemo(() => {
      try {
          const safeAiInsights = Array.isArray(aiInsights) ? aiInsights : [];
          return [...safeAiInsights].sort((a, b) => (b.score || 0) - (a.score || 0));
      } catch (err) {
          console.error("Error generating insights:", err);
          return [];
      }
  }, [aiInsights]);

  // --- LOGICA DE NOTIFICAÇÕES INTELIGENTES ---
  useEffect(() => {
      if (!dividends || dividends.length === 0 || !transactions || transactions.length === 0) return;

      const newNotifs: AppNotification[] = [];
      const existingIds = new Set(notifications.map(n => n.id));

      // 1. Pagamentos e Data Com
      dividends.forEach(div => {
          if (!div || !div.ticker) return;
          const qty = getQuantityOnDate(div.ticker, div.dateCom, transactions);
          if (qty > 0) {
              const total = qty * div.rate;
              
              // Pagamento Hoje
              if (isSameDayLocal(div.paymentDate)) {
                  const id = `pay-${div.ticker}-${div.paymentDate}`;
                  if (!existingIds.has(id)) {
                      newNotifs.push({
                          id,
                          title: 'Pagamento Recebido 💰',
                          message: `${div.ticker} pagou R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})} hoje!`,
                          type: 'success',
                          category: 'payment',
                          timestamp: Date.now(),
                          read: false
                      });
                  }
              }

              // Lembrete de Pagamento Próximo (2 dias antes)
              const payDate = new Date(div.paymentDate);
              const twoDaysBefore = new Date();
              twoDaysBefore.setDate(twoDaysBefore.getDate() + 2);
              if (payDate.toDateString() === twoDaysBefore.toDateString()) {
                  const id = `pay-remind-${div.ticker}-${div.paymentDate}`;
                  if (!existingIds.has(id)) {
                      newNotifs.push({
                          id,
                          title: 'Pagamento Próximo ⏳',
                          message: `${div.ticker} pagará R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})} em 2 dias.`,
                          type: 'info',
                          category: 'payment',
                          timestamp: Date.now(),
                          read: false
                      });
                  }
              }

              // Data Com Hoje
              if (isSameDayLocal(div.dateCom)) {
                  const id = `datacom-${div.ticker}-${div.dateCom}`;
                  if (!existingIds.has(id)) {
                      newNotifs.push({
                          id,
                          title: 'Data Com Hoje 📅',
                          message: `Último dia para garantir proventos de ${div.ticker}.`,
                          type: 'info',
                          category: 'datacom',
                          timestamp: Date.now(),
                          read: false
                      });
                  }
              }
          }
      });

      // 2. Alertas de Preço (Variação > 5%)
      const ownedTickers = new Set(memoizedPortfolioData.portfolio.map(a => a.ticker));
      Object.entries(quotes).forEach(([ticker, quote]) => {
          if (!ownedTickers.has(ticker)) return; // Apenas ativos na carteira
          const change = quote.regularMarketChangePercent;
          if (change && Math.abs(change) >= 5) {
              const id = `price-${ticker}-${new Date().toISOString().split('T')[0]}`;
              if (!existingIds.has(id)) {
                  newNotifs.push({
                      id,
                      title: change > 0 ? 'Alta Expressiva 🚀' : 'Queda Expressiva 📉',
                      message: `${ticker} está com variação de ${change.toFixed(2)}% no dia.`,
                      type: change > 0 ? 'success' : 'warning',
                      category: 'alert',
                      timestamp: Date.now(),
                      read: false
                  });
              }
          }
      });

      // 3. Alertas de Rebalanceamento (Concentração > 20%)
      if (memoizedPortfolioData.portfolio.length > 0) {
          memoizedPortfolioData.portfolio.forEach(asset => {
              const weight = (asset.quantity * (asset.currentPrice || 0)) / memoizedPortfolioData.balance;
              if (weight > 0.20) {
                  const id = `rebalance-${asset.ticker}-${new Date().getMonth()}-${new Date().getFullYear()}`;
                  if (!existingIds.has(id)) {
                      newNotifs.push({
                          id,
                          title: 'Alerta de Concentração ⚖️',
                          message: `${asset.ticker} representa ${(weight * 100).toFixed(1)}% da sua carteira. Considere rebalancear.`,
                          type: 'warning',
                          category: 'alert',
                          timestamp: Date.now(),
                          read: false
                      });
                  }
              }
          });
      }

      // 4. Conquistas e Milestones (Patrimônio)
      const balance = memoizedPortfolioData.balance;
      const milestones = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
      milestones.forEach(m => {
          if (balance >= m) {
              const id = `milestone-${m}`;
              if (!existingIds.has(id)) {
                  newNotifs.push({
                      id,
                      title: 'Novo Patamar Atingido! 🏆',
                      message: `Parabéns! Você alcançou a marca de R$ ${m.toLocaleString('pt-BR')} em patrimônio.`,
                      type: 'success',
                      category: 'event',
                      timestamp: Date.now(),
                      read: false
                  });
              }
          }
      });

      if (newNotifs.length > 0) {
          setNotifications(prev => [...newNotifs, ...prev]);
          if (navigator.vibrate) navigator.vibrate(200);
      }

  }, [dividends, transactions, quotes, memoizedPortfolioData.balance]);

  // Determine header visibility logic
  // CRITICAL FIX: Force header visible in Settings to prevent flicker
  const isHeaderVisible = showSettings || scrollDirection === 'up' || isTop;

  // --- RENDERIZAÇÃO ---

  if (!isReady) return <SplashScreen finishLoading={false} realProgress={loadingProgress} />;

  if (!session) {
      return (
          <>
            <SplashScreen finishLoading={true} realProgress={100} />
            <InstallPromptModal isOpen={showInstallModal} onInstall={handleInstallApp} onDismiss={() => setShowInstallModal(false)} />
            <Login />
          </>
      );
  }

  return (
    <div className="min-h-screen bg-primary-light dark:bg-primary-dark text-zinc-900 dark:text-zinc-100 pb-safe">
      <SplashScreen finishLoading={true} realProgress={100} />
      
      <AnimatePresence>
        {toast && ( 
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[3000] w-full max-w-sm px-4"
          >
              <div className={`flex items-center gap-3 p-4 rounded-xl shadow-xl border-l-[6px] bg-white dark:bg-slate-900 border-y border-r border-slate-100 dark:border-slate-800 ${toast.type === 'success' ? 'border-l-emerald-500' : toast.type === 'error' ? 'border-l-rose-500' : 'border-l-sky-500'}`}>
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : toast.type === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600'}`}>
                   {toast.type === 'info' ? <Info className="w-4 h-4" /> : toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                 </div>
                 <div className="min-w-0"><p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{toast.text}</p></div>
              </div>
          </motion.div> 
        )}
      </AnimatePresence>

        <>
            <Header 
                title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Carteira' : currentTab === 'transactions' ? 'Ordens' : currentTab === 'watchlist' ? 'Favoritos' : 'Notícias'} 
                showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} 
                isRefreshing={isRefreshing || isScraping} updateAvailable={isUpdateAvailable} 
                onUpdateClick={() => setShowChangelog(true)} onNotificationClick={() => setShowNotifications(true)} 
                notificationCount={notifications.filter(n=>!n.read).length} appVersion={APP_VERSION} 
                cloudStatus={cloudStatus} 
                onRefresh={
                    currentTab === 'portfolio' ? handleManualRefresh : 
                    undefined
                }
                hideBorder={currentTab === 'transactions'}
                isVisible={isHeaderVisible}
                headerIcon={!showSettings ? <AppLogo /> : undefined} // Logo visível apenas nas abas principais
            />
            
            <main className="max-w-xl mx-auto pt-[4.5rem] pb-32 min-h-screen px-4">
              <AnimatePresence mode="wait">
                {showSettings ? (
                  <motion.div 
                    key="settings"
                    initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                    transition={{ 
                      type: 'spring', 
                      damping: 28, 
                      stiffness: 220,
                      mass: 0.8
                    }}
                    className="pt-4"
                  >
                    <MemoizedSettings 
                        onLogout={handleLogout} user={session.user} transactions={transactions} onImportTransactions={setTransactions} 
                        dividends={dividends} onImportDividends={setDividends} onResetApp={handleSoftReset} 
                        theme={theme} onSetTheme={setTheme} accentColor={accentColor} onSetAccentColor={setAccentColor} 
                        privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} appVersion={APP_VERSION} 
                        updateAvailable={isUpdateAvailable} onCheckUpdates={checkForUpdates} 
                        onShowChangelog={handleShowChangelog} pushEnabled={pushEnabled} 
                        onRequestPushPermission={handleRequestPushPermission} onSyncAll={handleSyncAll} 
                        onForceUpdate={handleForceUpdate} currentVersionDate={currentVersionDate}
                        services={services} onCheckConnection={checkServiceHealth} isCheckingConnection={isCheckingServices}
                        showToast={showToast}
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key={currentTab}
                    initial={{ opacity: 0, scale: 0.96, y: 15, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.96, y: -15, filter: 'blur(8px)' }}
                    transition={{ 
                      type: 'spring', 
                      damping: 25, 
                      stiffness: 200,
                      mass: 1
                    }}
                  >
                    {currentTab === 'home' && (
                        <Home 
                            {...memoizedPortfolioData} 
                            transactions={transactions}
                            marketDividends={dividends} // Passa dados brutos para a Agenda
                            totalAppreciation={memoizedPortfolioData.balance - memoizedPortfolioData.invested} 
                            privacyMode={privacyMode} 
                            onViewAsset={handleViewAsset}
                            insights={insights}
                        />
                    )}
                    {currentTab === 'portfolio' && (
                        <Portfolio 
                            portfolio={memoizedPortfolioData.portfolio} 
                            dividends={memoizedPortfolioData.dividendReceipts} 
                            marketDividends={dividends} // Passa dados brutos para o gráfico de histórico
                            privacyMode={privacyMode} 
                            onAssetRefresh={refreshSingleAsset} 
                            headerVisible={isHeaderVisible} 
                            targetAsset={targetAssetTicker} 
                            onClearTarget={() => setTargetAssetTicker(null)} 
                            transactions={transactions}
                            currentBalance={memoizedPortfolioData.balance}
                        />
                    )}
                    {currentTab === 'transactions' && <Transactions transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onRequestDeleteConfirmation={handleDeleteTransaction} privacyMode={privacyMode} />}
                    {currentTab === 'watchlist' && <Watchlist showToast={showToast} />}
                    {currentTab === 'news' && <MemoizedNews transactions={transactions} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
            
            <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} isVisible={!showSettings} />
            
            <ChangelogModal isOpen={isChangelogOpen} onClose={() => setShowChangelog(false)} version={APP_VERSION} notes={releaseNotes} onUpdate={startUpdateProcess} isUpdating={isUpdating} />
            <NotificationsModal 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
                notifications={notifications} 
                onMarkAllRead={handleMarkAllAsRead}
                onDeleteAll={handleDeleteAllNotifications}
                onDeleteRead={handleDeleteReadNotifications}
            />
            <ConfirmationModal {...confirmModal} onCancel={() => setConfirmModal(null)} />
            <UpdateReportModal isOpen={showUpdateReport} onClose={() => setShowUpdateReport(false)} results={lastUpdateReport} />
        </>
    </div>
  );
};

export default App;
