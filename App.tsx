
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, ChangelogModal, NotificationsModal, CloudStatusBanner, ConfirmationModal, InstallPromptModal } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals, ServiceMetric } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { Check, Loader2, AlertTriangle, Info, Database, Activity, Globe } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

export type ThemeType = 'light' | 'dark' | 'system';

const APP_VERSION = '8.3.13'; 

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  QUOTES: 'investfiis_v3_quote_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  NOTIF_HISTORY: 'investfiis_notification_history_v2',
  METADATA: 'investfiis_metadata_v2' 
};

// Arredonda para 2 casas decimais
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Calcula quantidade em Data Com
 */
const getQuantityOnDate = (ticker: string, dateCom: string, transactions: Transaction[]) => {
  if (!dateCom || dateCom.length < 10) return 0;
  const targetDate = dateCom.substring(0, 10); 
  const targetTicker = ticker.trim().toUpperCase();

  return transactions
    .filter(t => {
        const txDate = (t.date || '').substring(0, 10);
        return t.ticker.trim().toUpperCase() === targetTicker && txDate <= targetDate;
    })
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

const getSupabaseUrl = () => {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    return url || 'https://supabase.com';
};

// Memoização dos componentes de página para performance
const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);

const App: React.FC = () => {
  // --- ESTADOS GLOBAIS ---
  // Inicialização "Lazy" do SessionStorage/LocalStorage para evitar delay no primeiro render
  const updateManager = useUpdateManager(APP_VERSION);
  
  // Controle de Inicialização
  const [isReady, setIsReady] = useState(false); // Indica se o React terminou de montar e verificar Auth
  const [loadingProgress, setLoadingProgress] = useState(0); 
  
  // Auth
  const [session, setSession] = useState<Session | null>(null);
  
  // UI States
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Preferências
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  
  // Feedback
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  // Dados de Negócio (Iniciam vazios ou do cache para não quebrar render)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY); return s ? JSON.parse(s) : []; } catch { return []; } });
  
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>(() => {
    try { const s = localStorage.getItem(STORAGE_KEYS.QUOTES); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { 
      try { 
          const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); 
          return s ? JSON.parse(s) : { ipca: 4.62, startDate: '' }; 
      } catch { return { ipca: 4.62, startDate: '' }; } 
  });
  
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>(() => {
      try { const s = localStorage.getItem(STORAGE_KEYS.METADATA); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // Status de Processos
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status de Serviços
  const [isCheckingServices, setIsCheckingServices] = useState(false);
  const [services, setServices] = useState<ServiceMetric[]>([
    { id: 'db', label: 'Supabase Database', url: getSupabaseUrl(), icon: Database, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'market', label: 'Brapi Market Data', url: 'https://brapi.dev', icon: Activity, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'cdn', label: 'App CDN (Vercel)', url: window.location.origin, icon: Globe, status: 'operational', latency: null, message: 'Aplicação carregada localmente.' }
  ]);

  // --- EFEITOS DE PERSISTÊNCIA ---
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes)); }, [quotes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTIF_HISTORY, JSON.stringify(notifications.slice(0, 50))); }, [notifications]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(assetsMetadata)); }, [assetsMetadata]);

  // Tema e Cores
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

  // --- PWA INSTALL HANDLER ---
  useEffect(() => {
      const handler = (e: any) => {
          e.preventDefault();
          setInstallPrompt(e);
          // Pequeno delay para não aparecer em cima do splash screen ou login
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

  // --- FUNÇÕES AUXILIARES ---

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
    const newServices = [...services]; 
    setServices(prev => prev.map(s => s.id !== 'ai' ? { ...s, status: 'checking' } : s));

    const checkService = async (index: number) => {
      const s = { ...newServices[index] };
      const start = Date.now();
      let logMessage = '';

      try {
        if (s.id === 'db') {
            logMessage = `[INFO] Connecting to Supabase Auth...\n[TARGET] ${s.url}`;
            const { error } = await supabase.auth.getSession();
            if (error) throw error;
            logMessage += `\n[OK] Auth Handshake successful.`;
        } else if (s.url && s.id !== 'ai') {
            await fetch(s.url, { mode: 'no-cors', cache: 'no-store' });
            logMessage += `\n[OK] Response received.`;
        }
        
        const latency = Date.now() - start;
        newServices[index] = { 
          ...s, 
          status: latency > 1500 ? 'degraded' : 'operational',
          latency,
          message: `${logMessage}\n[STATS] Latency: ${latency}ms`
        };
      } catch (e: any) {
        newServices[index] = { 
            ...s, 
            status: 'error', 
            latency: null,
            message: `${logMessage}\n[ERROR] Connection failed: ${e.message}`
        };
      }
    };

    await Promise.all(newServices.map((s, i) => s.id !== 'ai' ? checkService(i) : Promise.resolve()));
    setServices(newServices);
    setIsCheckingServices(false);
  }, [services]);

  // --- SINCRONIZAÇÃO DE DADOS ---

  const syncMarketData = useCallback(async (force = false, txsToUse: Transaction[], initialLoad = false) => {
    const tickers = Array.from(new Set(txsToUse.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;
    setIsRefreshing(true);
    if (initialLoad) setLoadingProgress(50);
    
    try {
      // 1. Cotações (BRAPI)
      const { quotes: newQuotesData } = await getQuotes(tickers);
      if (newQuotesData.length > 0) {
        setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: any, q: any) => ({...acc, [q.symbol]: q }), {})}));
      }
      
      if (initialLoad) setLoadingProgress(70); 
      
      setIsAiLoading(true);
      // 2. Dados Fundamentais e Proventos (SUPABASE - Populado pelo Scraper)
      const startDate = txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date);
      const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
      
      if (aiData.dividends.length > 0) {
          setGeminiDividends(aiData.dividends);
      }
      if (Object.keys(aiData.metadata).length > 0) {
          setAssetsMetadata(prev => ({...prev, ...aiData.metadata}));
      }
      
      if (aiData.indicators) {
         setMarketIndicators({ 
             ipca: aiData.indicators.ipca_cumulative || 4.62, // Fallback se vier zero
             startDate: aiData.indicators.start_date_used 
         });
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
        
        // Dispara sync de mercado em background (sem await para não travar UI)
        if (cloudTxs.length > 0) {
            syncMarketData(force, cloudTxs, initialLoad).catch(e => console.error("Bg sync error", e));
        }
    } catch (err) { 
        showToast('error', 'Erro na nuvem.'); 
        setCloudStatus('disconnected'); 
    }
  }, [syncMarketData, showToast]);

  // --- INICIALIZAÇÃO CRÍTICA (REFACTOR) ---
  useEffect(() => {
    const initApp = async () => {
        // Marca o tempo de início para controle de duração mínima do splash
        const startTime = Date.now();
        const MIN_SPLASH_TIME = 3000; // 3 segundos de exibição mínima
        
        setLoadingProgress(10);
        
        try {
            // Promise Race: Auth vs Timeout
            // Evita que o app trave na tela de carregamento se a Auth demorar demais (5s)
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 5000));
            
            // @ts-ignore
            const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
            
            if (error) throw error;
            const initialSession = data?.session;
            
            setSession(initialSession);
            setLoadingProgress(50);

            if (initialSession) {
                // Se tem sessão, buscamos dados na nuvem (sem await para liberar UI, mas aguardamos no Promise.all depois se necessário)
                // Aqui optamos por liberar rápido e deixar sync em background, mas respeitando o tempo mínimo visual
                fetchTransactionsFromCloud(initialSession, false, true);
            }

            // CALCULA O TEMPO DECORRIDO
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_SPLASH_TIME - elapsed);

            // Se o carregamento foi muito rápido, aguarda o restante do tempo e simula progresso
            if (remainingTime > 0) {
                setLoadingProgress(80);
                await new Promise(resolve => setTimeout(resolve, remainingTime));
            }
            
            setLoadingProgress(100);

        } catch (e) {
            console.warn("Auth check finished with error or timeout, defaulting to Login screen.", e);
            setSession(null);
        } finally {
            // Libera a UI IMEDIATAMENTE após o tempo mínimo
            setIsReady(true);
        }
    };

    initApp();

    // Listener de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, newSession) => {
        setSession(newSession);
        if (!newSession) {
            setTransactions([]);
            setGeminiDividends([]);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- HANDLERS DA UI ---

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTransactions([]);
    setGeminiDividends([]);
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

  const handleManualScraperTrigger = async () => {
      if (transactions.length === 0) {
          showToast('info', 'Cadastre ativos primeiro.');
          return;
      }
      setIsScraping(true);
      const uniqueTickers = [...new Set(transactions.map(t => t.ticker))];
      const BATCH_SIZE = 3;
      let processed = 0;
      
      showToast('info', `Atualizando ${uniqueTickers.length} ativos...`);
      try {
          for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
              const batch = uniqueTickers.slice(i, i + BATCH_SIZE);
              await Promise.all(batch.map(async (ticker) => {
                 try {
                   const res = await fetch(`/api/update-stock?ticker=${ticker}&force=true`);
                   if (res.ok) processed++;
                 } catch (e) { console.error(`Falha ao atualizar ${ticker}`, e); }
              }));
              if (i + BATCH_SIZE < uniqueTickers.length) await new Promise(resolve => setTimeout(resolve, 800));
          }
          if (processed > 0) {
              showToast('success', 'Dados atualizados! Sincronizando tela...');
              await new Promise(resolve => setTimeout(resolve, 500));
              await syncMarketData(true, transactions); 
          } else {
              showToast('error', 'Falha ao conectar com servidor.');
          }
      } catch (e) { showToast('error', 'Erro na atualização.'); } finally { setIsScraping(false); }
  };

  const handleAddTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
      if (!session?.user?.id) return;
      const dbPayload = { ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, asset_type: t.assetType, user_id: session.user.id };
      const { error } = await supabase.from('transactions').insert(dbPayload);
      if (error) { showToast('error', 'Erro ao salvar'); return; }
      await fetchTransactionsFromCloud(session);
  }, [session, fetchTransactionsFromCloud, showToast]);

  const handleUpdateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
      const dbPayload: any = {};
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

  // --- CÁLCULOS DE PORTFÓLIO (Memoized) ---
  const memoizedPortfolioData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    // Processamento de Dividendos
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

    // Processamento de Posições
    const positions: Record<string, any> = {};
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType };
      const p = positions[t.ticker];
      if (t.type === 'BUY') { 
          const newQuantity = p.quantity + t.quantity;
          if (newQuantity > 0.000001) {
             const currentTotalCost = round(p.quantity * p.averagePrice);
             const additionalCost = round(t.quantity * t.price);
             p.averagePrice = (currentTotalCost + additionalCost) / newQuantity; 
          }
          p.quantity = newQuantity; 
      } else { 
          p.quantity -= t.quantity; 
          if (p.quantity <= 0.000001) { p.quantity = 0; p.averagePrice = 0; }
      }
    });

    const finalPortfolio = Object.values(positions)
        .filter(p => p.quantity > 0.001)
        .map(p => {
            const normalizedTicker = p.ticker.trim().toUpperCase();
            const meta = assetsMetadata[normalizedTicker];
            const quote = quotes[normalizedTicker];
            
            let segment = meta?.segment || 'Geral';
            segment = segment.replace('Seg: ', '').trim();
            if (segment.length > 20) segment = segment.substring(0, 20) + '...';

            return { 
                ...p, 
                totalDividends: divPaidMap[p.ticker] || 0, 
                segment: segment, 
                currentPrice: quote?.regularMarketPrice || p.averagePrice, 
                dailyChange: quote?.regularMarketChangePercent || 0, 
                logoUrl: quote?.logourl, 
                assetType: meta?.type || p.assetType, 
                ...(meta?.fundamentals || {}) 
            };
        });

    const invested = round(finalPortfolio.reduce((a, p) => a + (p.averagePrice * p.quantity), 0));
    const balance = round(finalPortfolio.reduce((a, p) => a + ((p.currentPrice || p.averagePrice) * p.quantity), 0));
    
    let salesGain = 0; const tracker: Record<string, { q: number; c: number }> = {};
    sortedTxs.forEach(t => {
      if (!tracker[t.ticker]) tracker[t.ticker] = { q: 0, c: 0 };
      const a = tracker[t.ticker];
      if (t.type === 'BUY') { a.q += t.quantity; a.c += round(t.quantity * t.price); } 
      else if (a.q > 0) { const cost = round(t.quantity * (a.c / a.q)); salesGain += round((t.quantity * t.price) - cost); a.c -= cost; a.q -= t.quantity; }
    });

    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived, invested, balance, salesGain };
  }, [transactions, quotes, geminiDividends, assetsMetadata]);

  // --- RENDERIZAÇÃO ---

  // Se não estiver pronto, deixa o HTML Splash aparecer e segura o React
  // (Embora o React renderize null, o HTML splash statico cobre a tela)
  if (!isReady) return <SplashScreen finishLoading={false} realProgress={loadingProgress} />;

  // Se estiver pronto mas sem sessão, mostra Login
  if (!session) {
      return (
          <>
            <SplashScreen finishLoading={true} realProgress={100} />
            <InstallPromptModal isOpen={showInstallModal} onInstall={handleInstallApp} onDismiss={() => setShowInstallModal(false)} />
            <Login />
          </>
      );
  }

  // App Principal
  return (
    <div className="min-h-screen bg-primary-light dark:bg-primary-dark">
      {/* Sinaliza para o componente Splash que ele pode sumir */}
      <SplashScreen finishLoading={true} realProgress={100} />
      
      <CloudStatusBanner status={cloudStatus} />
      
      {toast && ( 
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] w-full max-w-sm px-4">
            <div className={`flex items-center gap-3 p-4 rounded-xl shadow-xl border-l-[6px] anim-fade-in-up bg-white dark:bg-slate-900 border-y border-r border-slate-100 dark:border-slate-800 ${toast.type === 'success' ? 'border-l-emerald-500' : toast.type === 'error' ? 'border-l-rose-500' : 'border-l-sky-500'}`}>
               <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : toast.type === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600'}`}>
                 {toast.type === 'info' ? <Info className="w-4 h-4" /> : toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
               </div>
               <div className="min-w-0"><p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{toast.text}</p></div>
            </div>
        </div> 
      )}

      {/* Main Content */}
        <>
            <Header 
                title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'} 
                showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} 
                isRefreshing={isRefreshing || isAiLoading || isScraping} updateAvailable={updateManager.isUpdateAvailable} 
                onUpdateClick={() => updateManager.setShowChangelog(true)} onNotificationClick={() => setShowNotifications(true)} 
                notificationCount={notifications.filter(n=>!n.read).length} appVersion={APP_VERSION} bannerVisible={cloudStatus !== 'hidden'} 
                onRefreshClick={currentTab === 'portfolio' ? handleManualScraperTrigger : undefined}
            />
            <main className="max-w-xl mx-auto pt-[5.5rem] pb-28 min-h-screen px-4">
              {showSettings ? (
                <div className="anim-page-enter pt-4">
                  <Settings 
                      onLogout={handleLogout} user={session.user} transactions={transactions} onImportTransactions={setTransactions} 
                      geminiDividends={geminiDividends} onImportDividends={setGeminiDividends} onResetApp={handleSoftReset} 
                      theme={theme} onSetTheme={setTheme} accentColor={accentColor} onSetAccentColor={setAccentColor} 
                      privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} appVersion={APP_VERSION} 
                      updateAvailable={updateManager.isUpdateAvailable} onCheckUpdates={updateManager.checkForUpdates} 
                      onShowChangelog={() => updateManager.setShowChangelog(true)} pushEnabled={pushEnabled} 
                      onRequestPushPermission={() => setPushEnabled(!pushEnabled)} onSyncAll={handleSyncAll} 
                      onForceUpdate={() => window.location.reload()} currentVersionDate={updateManager.currentVersionDate}
                      services={services} onCheckConnection={checkServiceHealth} isCheckingConnection={isCheckingServices}
                  />
                </div>
              ) : (
                <div key={currentTab} className="anim-page-enter">
                  {currentTab === 'home' && <MemoizedHome {...memoizedPortfolioData} transactions={transactions} totalAppreciation={memoizedPortfolioData.balance - memoizedPortfolioData.invested} isAiLoading={isAiLoading} inflationRate={marketIndicators.ipca} privacyMode={privacyMode} />}
                  {currentTab === 'portfolio' && <MemoizedPortfolio portfolio={memoizedPortfolioData.portfolio} privacyMode={privacyMode} />}
                  {currentTab === 'transactions' && <MemoizedTransactions transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onRequestDeleteConfirmation={handleDeleteTransaction} privacyMode={privacyMode} />}
                </div>
              )}
            </main>
            {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
            <ChangelogModal isOpen={updateManager.showChangelog} onClose={() => updateManager.setShowChangelog(false)} version={updateManager.availableVersion || APP_VERSION} notes={updateManager.releaseNotes} isUpdatePending={updateManager.isUpdateAvailable} onUpdate={updateManager.startUpdateProcess} isUpdating={updateManager.isUpdating} progress={updateManager.updateProgress} />
            <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onClear={() => setNotifications([])} />
            <ConfirmationModal isOpen={!!confirmModal} title={confirmModal?.title || ''} message={confirmModal?.message || ''} onConfirm={() => confirmModal?.onConfirm()} onCancel={() => setConfirmModal(null)} />
            <InstallPromptModal isOpen={showInstallModal} onInstall={handleInstallApp} onDismiss={() => setShowInstallModal(false)} />
        </>
    </div>
  );
};

export default App;
