import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, ChangelogModal, NotificationsModal, CloudStatusBanner, LockScreen, ConfirmationModal } from './components/Layout';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase } from './services/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

const APP_VERSION = '7.2.8'; 

const STORAGE_KEYS = {
  DIVS: 'investfiis_v4_div_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  PREFS_NOTIF: 'investfiis_prefs_notifications',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  PASSCODE: 'investfiis_passcode',
  BIOMETRICS: 'investfiis_biometrics',
  NOTIF_HISTORY: 'investfiis_notification_history_v2' // Chave para persistir notificações
};

export type ThemeType = 'light' | 'dark' | 'system';

// Helper function to calculate quantity on date (CORRIGIDA para Fracionário e Espaços)
const getQuantityOnDate = (ticker: string, dateCom: string, paymentDate: string, transactions: Transaction[]) => {
  // Estratégia de Data: Data Com > Data Pagamento > Retorna 0
  // Isso evita zerar cotas se a IA não retornar a Data Com exata
  const cutoffDate = dateCom || paymentDate;
  if (!cutoffDate) return 0;
  
  // Normalizador Inteligente: Remove 'F' final se parecer fracionário
  // Ex: converte PETR4F -> PETR4 e compara com PETR4
  const normalize = (t: string) => {
      const clean = t.trim().toUpperCase();
      // Tickers B3 geralmente tem 5+ chars (4 letras + numero). Se tiver F no final, remove.
      if (clean.endsWith('F') && clean.length >= 5 && /\d/.test(clean)) {
          return clean.slice(0, -1);
      }
      return clean;
  };

  const targetTicker = normalize(ticker);
  
  // A lógica "t.date <= cutoffDate" garante que a compra deve ter sido feita
  // ATÉ o dia da Data Com (inclusive). Se comprou depois, não entra na soma.
  return transactions
    .filter(t => {
       const txTicker = normalize(t.ticker);
       return txTicker === targetTicker && t.date <= cutoffDate;
    })
    .reduce((acc, t) => {
      if (t.type === 'BUY') return acc + t.quantity;
      if (t.type === 'SELL') return acc - t.quantity;
      return acc;
    }, 0);
};

// --- Supabase Helpers ---

const cleanTxForSupabase = (tx: Transaction | Omit<Transaction, 'id'>) => {
  const { assetType, ...restOfTx } = tx;
  return {
    ...restOfTx,
    asset_type: assetType, 
  };
};

const mapSupabaseToTx = (record: any): Transaction => {
  return {
    id: record.id,
    ticker: record.ticker,
    type: record.type,
    quantity: record.quantity,
    price: record.price,
    date: record.date,
    assetType: record.asset_type || AssetType.FII, 
  };
};

const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  
  // Estado de controle do SplashScreen
  const [appLoading, setAppLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0); 

  const [session, setSession] = useState<Session | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');

  // Ref para evitar stale closures no listener de auth
  const sessionRef = useRef<Session | null>(null);

  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem(STORAGE_KEYS.PASSCODE));
  const savedPasscode = localStorage.getItem(STORAGE_KEYS.PASSCODE);
  const isBiometricsEnabled = localStorage.getItem(STORAGE_KEYS.BIOMETRICS) === 'true';

  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  
  // Inicializa notificações com histórico salvo
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY);
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  // Transactions agora iniciam vazias. Sem fallback local.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); return s ? JSON.parse(s) : { ipca: 4.5, startDate: '' }; } catch { return { ipca: 4.5, startDate: '' }; } });
  
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled)); }, [pushEnabled]);
  // Persiste notificações ao mudar
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTIF_HISTORY, JSON.stringify(notifications.slice(0, 50))); }, [notifications]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
    localStorage.setItem(STORAGE_KEYS.ACCENT, accentColor);
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty('--color-accent-rgb', `${r} ${g} ${b}`);
  }, [accentColor]);

  useEffect(() => {
    document.body.classList.toggle('privacy-blur', privacyMode);
    localStorage.setItem(STORAGE_KEYS.PRIVACY, String(privacyMode));
  }, [privacyMode]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    if (type !== 'info') setTimeout(() => setToast(null), 3000);
  }, []);

  // --- MOTOR DE NOTIFICAÇÕES (NOVO) ---
  useEffect(() => {
    if (!session || geminiDividends.length === 0 || transactions.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Preferências do Usuário
    const notifyDivs = localStorage.getItem('investfiis_notify_divs') !== 'false';
    const notifyDataCom = localStorage.getItem('investfiis_notify_datacom') !== 'false';
    
    const newNotifications: AppNotification[] = [];

    geminiDividends.forEach(div => {
        // 1. Notificação de Pagamento (Hoje)
        if (div.paymentDate === today && notifyDivs) {
             const qty = getQuantityOnDate(div.ticker, div.dateCom, div.paymentDate, transactions);
             if (qty > 0) {
                 const total = qty * div.rate;
                 const id = `PAY-${div.ticker}-${today}`;
                 // Evita duplicatas
                 if (!notifications.some(n => n.id === id)) {
                     const notif: AppNotification = {
                         id,
                         title: `💰 ${div.ticker} Pagou!`,
                         message: `Caiu na conta: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}. (${div.type})`,
                         type: 'success',
                         category: 'payment',
                         timestamp: Date.now(),
                         read: false
                     };
                     newNotifications.push(notif);
                     
                     // Push do Navegador
                     if (pushEnabled && document.hidden) {
                         new Notification(notif.title, { body: notif.message, icon: '/vite.svg' });
                     }
                 }
             }
        }

        // 2. Notificação de Data Com (Hoje - Alerta de Oportunidade)
        if (div.dateCom === today && notifyDataCom) {
             const id = `DATACOM-${div.ticker}-${today}`;
             if (!notifications.some(n => n.id === id)) {
                 const notif: AppNotification = {
                     id,
                     title: `📅 Data Com: ${div.ticker}`,
                     message: `Hoje é o último dia para garantir R$ ${div.rate.toLocaleString('pt-BR', {minimumFractionDigits: 2})}/cota.`,
                     type: 'warning',
                     category: 'datacom',
                     timestamp: Date.now(),
                     read: false
                 };
                 newNotifications.push(notif);

                 if (pushEnabled && document.hidden) {
                    new Notification(notif.title, { body: notif.message, icon: '/vite.svg' });
                }
             }
        }
    });

    if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev]);
        showToast('info', `${newNotifications.length} novas notificações.`);
    }

  }, [geminiDividends, transactions, session, pushEnabled, showToast]);


  // --- Verificação de Tokens ---
  useEffect(() => {
    // Verifica se os tokens estão presentes no ambiente
    if (!process.env.BRAPI_TOKEN) {
      setTimeout(() => showToast('error', 'Token BRAPI não configurado!'), 2000);
    }
    if (!process.env.API_KEY) {
      setTimeout(() => showToast('error', 'Token Gemini (IA) não configurado!'), 3000);
    }
  }, [showToast]);

  // --- Funções de Sincronização ---

  const syncMarketData = useCallback(async (force: boolean = false, txsToUse: Transaction[] = transactions) => {
    const tickers = Array.from(new Set(txsToUse.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) {
      if (Object.keys(quotes).length > 0) setQuotes({});
      return;
    }
    
    setIsRefreshing(true);
    if (appLoading) setLoadingProgress(prev => Math.max(prev, 30));

    try {
      // BRAPI
      // Garante que só chama se tiver tickers e token
      if (process.env.BRAPI_TOKEN) {
          const { quotes: newQuotesData } = await getQuotes(tickers);
          if (newQuotesData.length > 0) {
            setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: any, q: any) => ({...acc, [q.symbol]: q }), {})}));
          }
      }
      
      if (appLoading) setLoadingProgress(prev => Math.max(prev, 60)); 

      // GEMINI (IA)
      if (process.env.API_KEY) {
          setIsAiLoading(true);
          const startDate = txsToUse.length > 0 ? txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date) : '';
          
          const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
          
          if (aiData.error === 'quota_exceeded') showToast('info', 'IA em pausa (Cota). Usando cache.');
          else if (force) showToast('success', 'Carteira Sincronizada');
          else if (aiData.error) console.warn("Erro Gemini:", aiData.error);
          
          if (aiData.dividends.length > 0) setGeminiDividends(aiData.dividends);
          if (Object.keys(aiData.metadata).length > 0) setAssetsMetadata(aiData.metadata);
          if (aiData.indicators?.ipca_cumulative) setMarketIndicators({ ipca: aiData.indicators.ipca_cumulative, startDate: aiData.indicators.start_date_used });
      }
      
      setLastSyncTime(new Date());
      
      if (appLoading) setLoadingProgress(prev => Math.max(prev, 90)); 

    } catch (e) { 
      if (force) showToast('error', 'Sem conexão'); 
      console.error(e);
    } finally { 
      setIsRefreshing(false); 
      setIsAiLoading(false); 
    }
  }, [transactions, showToast, quotes, appLoading]);

  // Função Principal de Sync com Controle de Banner
  const fetchTransactionsFromCloud = useCallback(async (force = false) => {
    setIsCloudSyncing(true);
    setCloudStatus('syncing');

    if (appLoading) setLoadingProgress(prev => Math.max(prev, 15)); 
    
    try {
      let query = supabase.from('transactions').select('*');
      
      // FILTRO CRÍTICO: Garante que só buscamos dados do usuário logado se a sessão existir
      if (session?.user?.id) {
          query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (data) {
        const cloudTxs: Transaction[] = data.map(mapSupabaseToTx);
        setTransactions(cloudTxs);
        
        // Sucesso: Mostra "Conectado" imediatamente e agenda para esconder
        setCloudStatus('connected');
        setTimeout(() => setCloudStatus('hidden'), 3000);
        
        if (appLoading) setLoadingProgress(prev => Math.max(prev, 25)); 

        // Dispara atualização de mercado em background, respeitando o FORCE
        if (cloudTxs.length > 0) {
            syncMarketData(force, cloudTxs);
        }
      } else {
         setCloudStatus('connected');
         setTimeout(() => setCloudStatus('hidden'), 3000);
      }
      return true;

    } catch (err: any) {
      console.error("Supabase fetch error:", err);
      showToast('error', 'Erro ao buscar dados da nuvem.');
      // Erro: Esconde o banner ou mostra desconectado
      setCloudStatus('disconnected');
      setTimeout(() => setCloudStatus('hidden'), 3000);
      return false;

    } finally {
      setIsCloudSyncing(false);
    }
  }, [showToast, syncMarketData, appLoading, session]);

  const handleSyncAll = useCallback(async (force: boolean) => {
    if (session) {
        await fetchTransactionsFromCloud(force);
    }
  }, [fetchTransactionsFromCloud, session]);

  // --- Auth & Startup Logic ---

  useEffect(() => {
    let mounted = true;
    setLoadingProgress(5);

    const timeout = setTimeout(() => {
      if (mounted && appLoading) {
        console.warn("Init timeout");
        setAppLoading(false);
      }
    }, 15000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      if (!mounted) return;
      
      const previousSessionId = sessionRef.current?.user?.id;
      const currentSessionId = currentSession?.user?.id;
      
      sessionRef.current = currentSession;
      setSession(currentSession);

      if (currentSessionId) {
        // Usuário logado ou restaurado
        if (!previousSessionId) {
            setLoadingProgress(15);
            setTimeout(() => fetchTransactionsFromCloud(false), 100);
        }
      } 
      else {
        // Usuário deslogado ou sem sessão
        setTransactions([]);
        setQuotes({});
        setGeminiDividends([]);
        setNotifications([]); // Limpa notificações ao deslogar
        setCloudStatus('hidden');
      }

      if (appLoading) {
          setLoadingProgress(100);
          setTimeout(() => {
              if (mounted) {
                  setAppLoading(false);
              }
          }, 600);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); 

  // --- Realtime Subscription (Supabase) ---
  useEffect(() => {
    if (!session) return;
    
    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        setTransactions(currentTxs => {
            if (eventType === 'INSERT') {
              if (currentTxs.some(t => t.id === newRecord.id)) return currentTxs;
              const newTx = mapSupabaseToTx(newRecord);
              if (!currentTxs.some(t => t.ticker === newTx.ticker)) {
                 setTimeout(() => syncMarketData(false, [...currentTxs, newTx]), 500);
              }
              return [...currentTxs, newTx];
            }
            if (eventType === 'UPDATE') {
                return currentTxs.map(t => t.id === newRecord.id ? mapSupabaseToTx(newRecord) : t);
            }
            if (eventType === 'DELETE') {
                return currentTxs.filter(t => t.id !== oldRecord.id);
            }
            return currentTxs;
        });
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [session, syncMarketData]);

  // --- Handlers de Transação (Cloud Only) ---

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!session) return;
    
    const tempId = crypto.randomUUID();
    const newTx = { ...t, id: tempId };
    
    setTransactions(p => [...p, newTx]);

    const record = cleanTxForSupabase(newTx);
    const { error } = await supabase.from('transactions').insert({ ...record, id: tempId, user_id: session.user.id });
    
    if (error) {
        console.error("Supabase insert error:", error);
        showToast('error', 'Erro ao salvar na nuvem.');
        setTransactions(p => p.filter(tx => tx.id !== tempId)); // Rollback
    } else {
        showToast('success', 'Ordem salva na nuvem');
    }
  };

  const handleUpdateTransaction = async (id: string, updated: Omit<Transaction, 'id'>) => {
    if (!session) return;
    
    const originalTx = transactions.find(t => t.id === id);
    const updatedTx = { ...updated, id };
    
    setTransactions(p => p.map(t => t.id === id ? updatedTx : t)); 

    const record = cleanTxForSupabase(updated);
    const { error } = await supabase.from('transactions').update(record).match({ id });
    
    if (error) {
        console.error("Supabase update error:", error);
        showToast('error', 'Falha ao atualizar na nuvem.');
        setTransactions(p => p.map(t => t.id === id ? originalTx! : t)); // Rollback
    } else {
        showToast('success', 'Ordem atualizada');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!session) return;

    const deletedTx = transactions.find(t => t.id === id);
    setTransactions(p => p.filter(t => t.id !== id)); 

    const { error } = await supabase.from('transactions').delete().match({ id });
    if (error) {
        console.error("Supabase delete error:", error);
        showToast('error', 'Falha ao apagar na nuvem.');
        setTransactions(p => [...p, deletedTx!]); // Rollback
    } else {
        showToast('success', 'Ordem removida');
    }
  };

  const onRequestDeleteConfirmation = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;
    setConfirmModal({
        isOpen: true,
        title: 'Confirmar Exclusão',
        message: `Deseja realmente apagar a ordem de ${txToDelete.type === 'BUY' ? 'compra' : 'venda'} de ${txToDelete.ticker}? Esta ação será sincronizada em todos os dispositivos.`,
        onConfirm: () => { handleDeleteTransaction(id); setConfirmModal(null); }
    });
  };

  const handleImportTransactions = async (importedTxs: Transaction[]) => {
    if (!Array.isArray(importedTxs) || !session) return;
    
    setIsCloudSyncing(true);
    setCloudStatus('syncing');
    showToast('info', 'Substituindo dados na nuvem...');
    
    try {
        await supabase.from('transactions').delete().eq('user_id', session.user.id);
        
        const sbData = importedTxs.map(t => {
            const record = cleanTxForSupabase(t);
            return { ...record, user_id: session.user.id, id: t.id || crypto.randomUUID() };
        });
        
        if (sbData.length > 0) {
            const { error } = await supabase.from('transactions').insert(sbData);
            if (error) throw error;
        }
        
        await fetchTransactionsFromCloud(true);
        showToast('success', 'Backup restaurado na nuvem!');
    } catch (e: any) {
        console.error("Supabase import error:", e);
        showToast('error', 'Erro ao restaurar backup na nuvem.');
        setCloudStatus('disconnected');
    } finally {
        setIsCloudSyncing(false);
    }
  };

  const markNotificationsAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  
  const getQuantityOnDateMemo = useCallback((ticker: string, dateCom: string, paymentDate: string, txs: Transaction[]) => getQuantityOnDate(ticker, dateCom, paymentDate, txs), []);

  const summaryData = useMemo(() => {
    let totalSalesGain = 0;
    const assetTracker: Record<string, { quantity: number; totalCost: number }> = {};
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const t of sortedTxs) {
        if (!assetTracker[t.ticker]) assetTracker[t.ticker] = { quantity: 0, totalCost: 0 };
        const asset = assetTracker[t.ticker];
        
        if (t.type === 'BUY') {
            asset.quantity += t.quantity;
            asset.totalCost += t.quantity * t.price;
        } else { // SELL
            if (asset.quantity > 0) {
                const averageCost = asset.totalCost / asset.quantity;
                const costOfSoldAssets = t.quantity * averageCost;
                const saleValue = t.quantity * t.price;
                totalSalesGain += saleValue - costOfSoldAssets;
                asset.totalCost = Math.max(0, asset.totalCost - costOfSoldAssets);
                asset.quantity = Math.max(0, asset.quantity - t.quantity);
            }
        }
    }
    return { salesGain: totalSalesGain };
  }, [transactions]);

  const memoizedData = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const todayStr = new Date().toISOString().split('T')[0];
    
    const receipts = geminiDividends.map(div => {
        // Cálculo de quantidade com fallback de data e normalização de ticker
        const qty = Math.max(0, getQuantityOnDateMemo(div.ticker, div.dateCom, div.paymentDate, sortedTxs));
        return {
            ...div, 
            quantityOwned: qty, 
            totalReceived: qty * div.rate
        };
    }).filter(r => r.totalReceived > 0);
    
    const divPaidMap: Record<string, number> = {};
    let totalDividendsReceived = 0;
    
    receipts.forEach(r => { 
        if (r.paymentDate <= todayStr) { 
            divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived; 
            totalDividendsReceived += r.totalReceived; 
        } 
    });
    
    const positions: Record<string, AssetPosition> = {};
    
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) {
          positions[t.ticker] = { 
              ticker: t.ticker, 
              quantity: 0, 
              averagePrice: 0, 
              assetType: t.assetType, 
              totalDividends: divPaidMap[t.ticker] || 0, 
              segment: assetsMetadata[t.ticker]?.segment || 'Geral' 
          };
      }
      const p = positions[t.ticker];
      
      if (t.type === 'BUY') { 
          p.averagePrice = (p.quantity * p.averagePrice + t.quantity * t.price) / (p.quantity + t.quantity); 
          p.quantity += t.quantity; 
      } else { 
          p.quantity -= t.quantity; 
      }
    });
    
    const finalPortfolio = Object.values(positions)
        .filter(p => p.quantity > 0.0001) 
        .map(p => ({ 
            ...p, 
            currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice, 
            logoUrl: quotes[p.ticker]?.logourl, 
            assetType: assetsMetadata[p.ticker]?.type || p.assetType, 
            segment: assetsMetadata[p.ticker]?.segment || p.segment, 
            ...assetsMetadata[p.ticker]?.fundamentals 
        }));
        
    const invested = finalPortfolio.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);
    const balance = finalPortfolio.reduce((acc, p) => acc + ((p.currentPrice || p.averagePrice) * p.quantity), 0);
    
    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived, invested, balance };
  }, [transactions, quotes, geminiDividends, getQuantityOnDateMemo, assetsMetadata]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) { showToast('error', 'Navegador não suporta notificações'); return; }
    const permission = await Notification.requestPermission();
    setPushEnabled(permission === 'granted');
    showToast(permission === 'granted' ? 'success' : 'info', permission === 'granted' ? 'Notificações Ativadas!' : 'Permissão negada.');
  };

  if (isLocked && savedPasscode) return <LockScreen isOpen={true} correctPin={savedPasscode} onUnlock={() => setIsLocked(false)} isBiometricsEnabled={isBiometricsEnabled} />;
  
  if (!session && !appLoading) return <Login />;

  return (
    <div className="min-h-screen transition-colors duration-500 bg-primary-light dark:bg-primary-dark">
      <SplashScreen finishLoading={!appLoading} realProgress={loadingProgress} />
      
      <CloudStatusBanner status={cloudStatus} />
      
      {toast && ( 
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] anim-fade-in-up is-visible w-auto max-w-[90%]"> 
            <div className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl shadow-xl"> 
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'info' ? 'bg-slate-800 dark:bg-slate-200' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {toast.type === 'info' ? <Loader2 className="w-3 h-3 text-white dark:text-slate-900 animate-spin" /> : toast.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}
                </div> 
                <span className="text-[10px] font-bold text-white dark:text-slate-900 tracking-wide truncate">{toast.text}</span> 
            </div> 
        </div> 
      )}

      {/* Só mostra conteúdo se tiver sessão confirmada e app não estiver carregando */}
      {session && !appLoading && (
        <>
            <Header 
              title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'} 
              showBack={showSettings} 
              onBack={() => setShowSettings(false)} 
              onSettingsClick={() => setShowSettings(true)} 
              onRefresh={() => fetchTransactionsFromCloud()} 
              isRefreshing={isRefreshing || isAiLoading || isCloudSyncing} 
              updateAvailable={updateManager.isUpdateAvailable} 
              onUpdateClick={() => updateManager.setShowChangelog(true)} 
              onNotificationClick={() => { setShowNotifications(true); markNotificationsAsRead(); }} 
              notificationCount={unreadCount} 
              appVersion={APP_VERSION} 
              bannerVisible={cloudStatus !== 'hidden'} 
            />
            
            <main className={`max-w-screen-md mx-auto pt-2 transition-all duration-500 ${cloudStatus !== 'hidden' ? 'mt-8' : 'mt-0'}`}>
              {showSettings ? (
                <Settings 
                  user={session.user}
                  transactions={transactions} onImportTransactions={handleImportTransactions} 
                  geminiDividends={geminiDividends} onImportDividends={setGeminiDividends} 
                  onResetApp={() => { localStorage.clear(); supabase.auth.signOut(); window.location.reload(); }} 
                  theme={theme} onSetTheme={setTheme} 
                  accentColor={accentColor} onSetAccentColor={setAccentColor} 
                  privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} 
                  appVersion={APP_VERSION} availableVersion={updateManager.availableVersion} 
                  updateAvailable={updateManager.isUpdateAvailable} onCheckUpdates={updateManager.checkForUpdates} 
                  onShowChangelog={() => updateManager.setShowChangelog(true)} releaseNotes={updateManager.releaseNotes} 
                  lastChecked={updateManager.lastChecked} pushEnabled={pushEnabled} onRequestPushPermission={requestPushPermission} 
                  lastSyncTime={lastSyncTime} onSyncAll={handleSyncAll}
                  currentVersionDate={updateManager.currentVersionDate} 
                />
              ) : (
                <div key={currentTab} className="anim-fade-in is-visible">
                  {currentTab === 'home' && (
                      <MemoizedHome 
                          {...memoizedData} 
                          salesGain={summaryData.salesGain} 
                          totalAppreciation={memoizedData.balance - memoizedData.invested} 
                          isAiLoading={isAiLoading} 
                          inflationRate={marketIndicators.ipca} 
                          portfolioStartDate={marketIndicators.startDate} 
                          accentColor={accentColor} 
                          invested={memoizedData.invested}
                          balance={memoizedData.balance}
                      />
                  )}
                  {currentTab === 'portfolio' && <MemoizedPortfolio {...memoizedData} />}
                  {currentTab === 'transactions' && ( 
                      <MemoizedTransactions 
                          transactions={transactions} 
                          onAddTransaction={handleAddTransaction} 
                          onUpdateTransaction={handleUpdateTransaction} 
                          onRequestDeleteConfirmation={onRequestDeleteConfirmation} 
                      /> 
                  )}
                </div>
              )}
            </main>
            
            {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
        </>
      )}

      <ChangelogModal isOpen={updateManager.showChangelog} onClose={() => !updateManager.isUpdating && updateManager.setShowChangelog(false)} version={updateManager.availableVersion || APP_VERSION} notes={updateManager.releaseNotes} isUpdatePending={!updateManager.wasUpdated && updateManager.isUpdateAvailable} onUpdate={updateManager.startUpdateProcess} isUpdating={updateManager.isUpdating} progress={updateManager.updateProgress} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onClear={() => setNotifications([])} />
      {confirmModal?.isOpen && ( <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} /> )}
    </div>
  );
};

export default App;