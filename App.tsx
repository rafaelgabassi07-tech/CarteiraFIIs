import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, ChangelogModal, NotificationsModal, CloudStatusBanner, ConfirmationModal, InstallPromptModal, UpdateReportModal } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Transaction, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals, ServiceMetric, ThemeType, ScrapeResult, UpdateReportData } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData, triggerScraperUpdate, mapScraperToFundamentals } from './services/dataService';
import { Check, Loader2, AlertTriangle, Info, Database, Activity, Globe } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

const APP_VERSION = '8.6.3'; 

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  QUOTES: 'investfiis_v3_quote_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  NOTIF_HISTORY: 'investfiis_notification_history_v3', // Version bumped
  METADATA: 'investfiis_metadata_v2' 
};

// Arredonda para 2 casas decimais
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper de data seguro para comparações cronológicas precisas
const safeDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return null;
    const d = new Date(dateStr);
    // Ajusta para meio-dia UTC para evitar problemas de timezone virando o dia
    d.setUTCHours(12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
};

// Calcula quantidade acumulada em uma data, considerando fracionário
const getQuantityOnDate = (ticker: string, dateCom: string, transactions: Transaction[]) => {
  const targetTime = safeDate(dateCom);
  if (!targetTime) return 0;
  
  // Normaliza o ticker do PROVENTO para a raiz (ex: ITSA4F -> ITSA4)
  // Isso garante que se o banco tiver ITSA4F por engano, ele vira ITSA4 para comparar
  let targetRoot = ticker.trim().toUpperCase();
  if (targetRoot.endsWith('F') && !targetRoot.endsWith('11') && !targetRoot.endsWith('11B') && targetRoot.length <= 6) {
      targetRoot = targetRoot.slice(0, -1);
  }

  return transactions
    .filter(t => {
        const txTime = safeDate(t.date);
        if (!txTime) return false; // Ignora transações sem data válida

        let txRoot = t.ticker.trim().toUpperCase(); // Ticker da Transação
        
        // Normaliza o ticker da TRANSAÇÃO para a raiz (ex: ITSA4F -> ITSA4)
        if (txRoot.endsWith('F') && !txRoot.endsWith('11') && !txRoot.endsWith('11B') && txRoot.length <= 6) {
            txRoot = txRoot.slice(0, -1);
        }

        // Compara raízes e datas (via timestamp para precisão)
        return txRoot === targetRoot && txTime <= targetTime;
    })
    .reduce((acc, t) => {
        if (t.type === 'BUY') return acc + t.quantity;
        if (t.type === 'SELL') return acc - t.quantity;
        return acc;
    }, 0);
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

const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);

const App: React.FC = () => {
  // --- ESTADOS GLOBAIS ---
  const updateManager = useUpdateManager(APP_VERSION);
  
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
  
  // Estado Completo do Relatório
  const [lastUpdateReport, setLastUpdateReport] = useState<UpdateReportData>({ results: [], inflationRate: 0, totalDividendsFound: 0 });
  
  // Dados de Negócio
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY); return s ? JSON.parse(s) : []; } catch { return []; } });
  
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>(() => {
    try { const s = localStorage.getItem(STORAGE_KEYS.QUOTES); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  
  const [dividends, setDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  
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
  const [isScraping, setIsScraping] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status de Serviços
  const [isCheckingServices, setIsCheckingServices] = useState(false);
  
  // Ref para serviços para evitar re-renders cíclicos no checkServiceHealth
  const servicesRef = useRef<ServiceMetric[]>([
    { id: 'db', label: 'Supabase Database', url: getSupabaseUrl(), icon: Database, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'market', label: 'Brapi Market Data', url: 'https://brapi.dev', icon: Activity, status: 'unknown', latency: null, message: 'Aguardando verificação...' },
    { id: 'cdn', label: 'App CDN (Vercel)', url: window.location.origin, icon: Globe, status: 'operational', latency: null, message: 'Aplicação carregada localmente.' }
  ]);
  const [services, setServices] = useState<ServiceMetric[]>(servicesRef.current);

  // --- EFEITOS DE PERSISTÊNCIA ---
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(dividends)); }, [dividends]);
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

  // --- LOGICA DE NOTIFICAÇÕES INTELIGENTES ---
  useEffect(() => {
      if (dividends.length === 0 || transactions.length === 0) return;

      const today = new Date().toISOString().split('T')[0];
      const newNotifs: AppNotification[] = [];
      const existingIds = new Set(notifications.map(n => n.id));

      // 1. Verifica pagamentos de Hoje
      dividends.forEach(div => {
          // Só notifica se o usuário tem o ativo
          const qty = getQuantityOnDate(div.ticker, div.dateCom, transactions);
          if (qty > 0) {
              const total = qty * div.rate;
              
              // Notificação de Pagamento (Hoje)
              if (div.paymentDate === today) {
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

              // Notificação de Data Com (Hoje)
              if (div.dateCom === today) {
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

      if (newNotifs.length > 0) {
          setNotifications(prev => [...newNotifs, ...prev]);
          // Opcional: Vibrar dispositivo se suportado
          if (navigator.vibrate) navigator.vibrate(200);
      }

  }, [dividends, transactions]); // Dependências controladas para rodar apenas quando dados mudam

  // --- PWA INSTALL HANDLER ---
  useEffect(() => {
      const handler = (e: any) => {
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
    const currentServices = [...servicesRef.current];
    setServices(prev => prev.map(s => ({ ...s, status: 'checking', message: 'Testando conexão...' })));

    const checks = currentServices.map(async (s) => {
        const start = Date.now();
        let status: ServiceMetric['status'] = 'operational';
        let message = '';
        let latency = 0;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); 

            if (s.id === 'db') {
                const { error } = await supabase.from('transactions').select('id').limit(1).maybeSingle();
                if (error && error.code !== 'PGRST116') {
                    const { error: authError } = await supabase.auth.getSession();
                    if (authError) throw error; 
                }
                message = 'Conexão com Banco de Dados estabelecida.';
            } 
            else if (s.id === 'market') {
                await fetch('https://brapi.dev/api/quote/PETR4', { mode: 'no-cors', signal: controller.signal });
                message = 'API de Cotações acessível.';
            } 
            else if (s.id === 'cdn') {
                const res = await fetch(`${window.location.origin}/version.json?t=${Date.now()}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                message = 'Arquivos estáticos carregados.';
            }

            clearTimeout(timeoutId);
            latency = Date.now() - start;
            if (latency > 2000) status = 'degraded';

        } catch (e: any) {
            status = 'error';
            message = e.name === 'AbortError' ? 'Tempo limite excedido (Timeout)' : (e.message || 'Falha na conexão');
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
      const { quotes: newQuotesData } = await getQuotes(tickers);
      if (newQuotesData.length > 0) {
        setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: any, q: any) => ({...acc, [q.symbol]: q }), {})}));
      }
      
      if (initialLoad) setLoadingProgress(70); 
      
      const startDate = txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date);
      
      // 1. Busca dados iniciais do banco
      let data = await fetchUnifiedMarketData(tickers, startDate, force);

      if (data.dividends.length > 0) {
          setDividends(data.dividends);
      }
      if (Object.keys(data.metadata).length > 0) {
          // --- SMART MERGE LOGIC (Enhanced) ---
          // Previne que dados "vazios" do banco sobrescrevam dados ricos da memória (Optimistic UI)
          setAssetsMetadata(prev => {
              const next = { ...prev };
              Object.entries(data.metadata).forEach(([ticker, newMeta]) => {
                  const existing = prev[ticker];
                  
                  if (existing) {
                      // Cria cópia dos fundamentos
                      const mergedFundamentals = { ...(newMeta.fundamentals || {}) };
                      
                      // Campos que costumam desaparecer (FIIs)
                      // Incluído liquidity, manager_type, assets_value que são strings ou podem ser 'N/A'
                      const criticalFields = ['vacancy', 'last_dividend', 'dy_12m', 'p_vp', 'assets_value', 'liquidity', 'manager_type'] as const;
                      
                      criticalFields.forEach(field => {
                          const newVal = mergedFundamentals?.[field];
                          const oldVal = existing.fundamentals?.[field];
                          
                          // Validação estrita: se for 0, N/A, traço ou vazio, considera inválido
                          const isNewInvalid = newVal === undefined || newVal === null || 
                                               (field !== 'vacancy' && newVal === 0) || // Vacância 0 é válida
                                               newVal === 'N/A' || newVal === '-' || newVal === '' || newVal === '0';

                          const isOldValid = oldVal !== undefined && oldVal !== null && 
                                             oldVal !== 'N/A' && oldVal !== '-' && oldVal !== '' &&
                                             (field === 'vacancy' || oldVal !== 0);
                          
                          if (isNewInvalid && isOldValid) {
                              // @ts-ignore
                              mergedFundamentals[field] = oldVal;
                          }
                      });
                      
                      next[ticker] = {
                          ...newMeta,
                          fundamentals: mergedFundamentals
                      };
                  } else {
                      next[ticker] = newMeta;
                  }
              });
              return next;
          });
      }
      
      if (data.indicators) {
         setMarketIndicators({ 
             ipca: data.indicators.ipca_cumulative || 4.62, 
             startDate: data.indicators.start_date_used 
         });
      }
      
      if (initialLoad) setLoadingProgress(100); 
    } catch (e) { console.error(e); } finally { setIsRefreshing(false); }
  }, [dividends, pushEnabled, assetsMetadata]);

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

  // --- INICIALIZAÇÃO CRÍTICA ---
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

  // --- HANDLERS DA UI ---

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

  const handleManualScraperTrigger = async () => {
      if (transactions.length === 0) {
          showToast('info', 'Adicione ativos primeiro.');
          return;
      }
      
      setIsScraping(true);
      showToast('info', 'Iniciando busca combinada...');
      
      // Explicitly typing tickers as string[] to satisfy TypeScript compiler
      const tickers = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase()))) as string[];
      
      try {
          // 1. Aciona o Scraper (Investidor10/StatusInvest)
          // Agora retorna os dados brutos também (rawFundamentals)
          const scrapePromise = triggerScraperUpdate(tickers, (current, total) => {
              // Opcional: Atualizar UI de progresso
          });

          // 2. Aciona Brapi (Cotações em Tempo Real)
          const brapiPromise = getQuotes(tickers);

          const [results, brapiData] = await Promise.all([scrapePromise, brapiPromise]);
          
          showToast('info', 'Processando dados...');

          // 3. Atualização Otimista: Injeta os dados do Scraper diretamente na memória do App
          // Isso resolve o problema de dados não aparecerem até o próximo sync do banco
          const newMetadata = { ...assetsMetadata };
          let updatedCount = 0;

          const enrichedResults: ScrapeResult[] = results.map(r => {
              const brapiQuote = brapiData.quotes.find(q => q.symbol === r.ticker);
              let finalPrice = r.details?.price;
              let priceSource: 'Brapi' | 'Investidor10' | 'N/A' = 'Investidor10';

              if (brapiQuote && brapiQuote.regularMarketPrice > 0) {
                  finalPrice = brapiQuote.regularMarketPrice;
                  priceSource = 'Brapi';
              } else if (!finalPrice) {
                  priceSource = 'N/A';
              }

              // Se o scraper trouxe dados, atualiza o state global AGORA
              if (r.status === 'success' && r.rawFundamentals) {
                  const mappedFundamentals = mapScraperToFundamentals(r.rawFundamentals);
                  const isFII = r.ticker.endsWith('11') || r.ticker.endsWith('11B');
                  
                  newMetadata[r.ticker] = {
                      segment: r.rawFundamentals.segment || newMetadata[r.ticker]?.segment || 'Geral',
                      type: isFII ? AssetType.FII : AssetType.STOCK,
                      fundamentals: mappedFundamentals
                  };
                  updatedCount++;
              }

              return {
                  ...r,
                  details: {
                      ...r.details,
                      price: finalPrice
                  },
                  sourceMap: {
                      price: priceSource,
                      fundamentals: r.status === 'success' ? 'Investidor10' : 'N/A'
                  }
              };
          });
          
          // Aplica a atualização otimista
          if (updatedCount > 0) {
              setAssetsMetadata(newMetadata);
          }
          
          // 4. Sincroniza em background para persistência (Dividendos, Inflação, etc)
          // Não bloqueia a UI esperando isso terminar
          handleSyncAll(true);
          
          // 5. Monta o relatório
          const totalDividends = enrichedResults.reduce((acc, r) => acc + (r.dividendsFound?.length || 0), 0);
          
          setLastUpdateReport({
              results: enrichedResults,
              inflationRate: marketIndicators.ipca || 0,
              totalDividendsFound: totalDividends
          });
          
          showToast('success', 'Dados atualizados com sucesso!');
          setShowUpdateReport(true); 
      } catch (e) {
          console.error(e);
          showToast('error', 'Falha na atualização.');
      } finally {
          setIsScraping(false);
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

  const handleClearNotifications = useCallback(() => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // Mantém histórico, mas marca como lido visualmente no modal
  }, []);

  // --- CÁLCULOS DE PORTFÓLIO (Memoized) ---
  const memoizedPortfolioData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    // CORREÇÃO: Garante que o ticker do dividendo esteja perfeitamente normalizado
    const receipts = dividends.map(d => {
        const normalizedTicker = d.ticker.trim().toUpperCase();
        
        // Quantidade deve considerar ITSA4F vs ITSA4 (bidirecional)
        // Utiliza a nova função com timestamp para garantir elegibilidade exata
        const qty = getQuantityOnDate(normalizedTicker, d.dateCom, sortedTxs);
        
        return { 
            ...d, 
            ticker: normalizedTicker,
            quantityOwned: qty, 
            totalReceived: qty * d.rate 
        };
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
      const normalizedTicker = t.ticker.trim().toUpperCase();
      if (!positions[normalizedTicker]) positions[normalizedTicker] = { ticker: normalizedTicker, quantity: 0, averagePrice: 0, assetType: t.assetType };
      const p = positions[normalizedTicker];
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
            // Tenta buscar metadados para ITSA4F ou ITSA4
            // Se não achar metadata para ITSA4F, tenta ITSA4
            let meta = assetsMetadata[normalizedTicker];
            if (!meta && normalizedTicker.endsWith('F') && !normalizedTicker.endsWith('11F')) {
                meta = assetsMetadata[normalizedTicker.slice(0, -1)];
            }

            const quote = quotes[normalizedTicker];
            
            let segment = meta?.segment || 'Geral';
            segment = segment.replace('Seg: ', '').trim();
            if (segment.length > 20) segment = segment.substring(0, 20) + '...';

            return { 
                ...p, 
                // Se ticker for ITSA4F, tenta buscar dividendos de ITSA4
                totalDividends: divPaidMap[p.ticker] || (p.ticker.endsWith('F') ? divPaidMap[p.ticker.slice(0, -1)] : 0) || 0, 
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
      const normalizedTicker = t.ticker.trim().toUpperCase();
      if (!tracker[normalizedTicker]) tracker[normalizedTicker] = { q: 0, c: 0 };
      const a = tracker[normalizedTicker];
      if (t.type === 'BUY') { a.q += t.quantity; a.c += round(t.quantity * t.price); } 
      else if (a.q > 0) { const cost = round(t.quantity * (a.c / a.q)); salesGain += round((t.quantity * t.price) - cost); a.c -= cost; a.q -= t.quantity; }
    });

    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived, invested, balance, salesGain };
  }, [transactions, quotes, dividends, assetsMetadata]);

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
    <div className="min-h-screen bg-primary-light dark:bg-primary-dark">
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

        <>
            <Header 
                title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Ordens'} 
                showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} 
                isRefreshing={isRefreshing || isScraping} updateAvailable={updateManager.isUpdateAvailable} 
                onUpdateClick={() => updateManager.setShowChangelog(true)} onNotificationClick={() => setShowNotifications(true)} 
                notificationCount={notifications.filter(n=>!n.read).length} appVersion={APP_VERSION} bannerVisible={cloudStatus !== 'hidden'} 
                onRefresh={currentTab === 'portfolio' ? handleManualScraperTrigger : undefined}
                hideBorder={currentTab === 'transactions'}
            />
            <main className="max-w-xl mx-auto pt-[5.5rem] pb-28 min-h-screen px-4">
              {showSettings ? (
                <div className="anim-page-enter pt-4">
                  <Settings 
                      onLogout={handleLogout} user={session.user} transactions={transactions} onImportTransactions={setTransactions} 
                      dividends={dividends} onImportDividends={setDividends} onResetApp={handleSoftReset} 
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
                  {currentTab === 'home' && <MemoizedHome {...memoizedPortfolioData} transactions={transactions} totalAppreciation={memoizedPortfolioData.balance - memoizedPortfolioData.invested} inflationRate={marketIndicators.ipca} privacyMode={privacyMode} />}
                  {currentTab === 'portfolio' && <MemoizedPortfolio portfolio={memoizedPortfolioData.portfolio} dividends={dividends} privacyMode={privacyMode} />}
                  {currentTab === 'transactions' && <MemoizedTransactions transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onRequestDeleteConfirmation={handleDeleteTransaction} privacyMode={privacyMode} />}
                </div>
              )}
            </main>
            {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
            <ChangelogModal isOpen={updateManager.showChangelog} onClose={() => updateManager.setShowChangelog(false)} version={updateManager.availableVersion || APP_VERSION} notes={updateManager.releaseNotes} isUpdatePending={updateManager.isUpdateAvailable} onUpdate={updateManager.startUpdateProcess} isUpdating={updateManager.isUpdating} progress={updateManager.updateProgress} />
            <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onClear={handleClearNotifications} />
            <ConfirmationModal isOpen={!!confirmModal} title={confirmModal?.title || ''} message={confirmModal?.message || ''} onConfirm={() => confirmModal?.onConfirm()} onCancel={() => setConfirmModal(null)} />
            <InstallPromptModal isOpen={showInstallModal} onInstall={handleInstallApp} onDismiss={() => setShowInstallModal(false)} />
            <UpdateReportModal isOpen={showUpdateReport} onClose={() => setShowUpdateReport(false)} results={lastUpdateReport} />
        </>
    </div>
  );
};

export default App;