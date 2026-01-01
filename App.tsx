import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { CheckCircle2, AlertCircle, Loader2, Sparkles, X, Download } from 'lucide-react';
import { useUpdateManager } from './hooks/useUpdateManager';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

const APP_VERSION = '7.3.5'; 

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
  NOTIF_HISTORY: 'investfiis_notification_history_v2' 
};

export type ThemeType = 'light' | 'dark' | 'system';

const getQuantityOnDate = (ticker: string, dateCom: string, transactions: Transaction[]) => {
  if (!dateCom || dateCom.length < 10) return 0;
  const targetDate = dateCom.substring(0, 10);
  const normalize = (t: string) => {
      const clean = t.trim().toUpperCase();
      if (clean.endsWith('F') && clean.length >= 5 && /\d/.test(clean)) return clean.slice(0, -1);
      return clean;
  };
  const targetTicker = normalize(ticker);
  return transactions
    .filter(t => {
       const txTicker = normalize(t.ticker);
       const txDate = t.date.substring(0, 10);
       return txTicker === targetTicker && txDate <= targetDate;
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

const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  
  const [appLoading, setAppLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0); 

  const [session, setSession] = useState<Session | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');

  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem(STORAGE_KEYS.PASSCODE));
  const savedPasscode = localStorage.getItem(STORAGE_KEYS.PASSCODE);
  const isBiometricsEnabled = localStorage.getItem(STORAGE_KEYS.BIOMETRICS) === 'true';

  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Estado local para controle da pílula de update visual
  const [showUpdatePill, setShowUpdatePill] = useState(false);
  
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PUSH_ENABLED) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  
  const [notifications, setNotifications] = useState<AppNotification[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY); return s ? JSON.parse(s) : []; } catch { return []; } });

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); return s ? JSON.parse(s) : { ipca: 4.5, startDate: '' }; } catch { return { ipca: 4.5, startDate: '' }; } });
  
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiStatus, setLastAiStatus] = useState<'operational' | 'degraded' | 'error' | 'unknown'>('unknown');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled)); }, [pushEnabled]);
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
    const r = parseInt(hex.substring(0, 2), 16); const g = parseInt(hex.substring(2, 4), 16); const b = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty('--color-accent-rgb', `${r} ${g} ${b}`);
  }, [accentColor]);

  useEffect(() => { document.body.classList.toggle('privacy-blur', privacyMode); localStorage.setItem(STORAGE_KEYS.PRIVACY, String(privacyMode)); }, [privacyMode]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    // FIX: Removemos a condição "if type !== info" para garantir que TODOS os toasts sumam sozinhos.
    // Isso evita que notificações como "IA em pausa" fiquem travadas na tela.
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
      // Quando há uma atualização, mostramos a pílula visual e adicionamos ao histórico,
      // mas NÃO disparamos um toast genérico que cubra o header.
      if (updateManager.isUpdateAvailable) {
          setShowUpdatePill(true);
          if (!notifications.some(n => n.id === `UPDATE-${updateManager.availableVersion}`)) {
              const notif: AppNotification = { 
                  id: `UPDATE-${updateManager.availableVersion}`, 
                  title: `Nova Versão ${updateManager.availableVersion}`, 
                  message: `Toque para instalar e ver as novidades.`, 
                  type: 'update', 
                  category: 'update', 
                  timestamp: Date.now(), 
                  read: false, 
                  actionLabel: 'Instalar', 
                  onAction: () => updateManager.setShowChangelog(true) 
              };
              setNotifications(prev => [notif, ...prev]);
          }
      }
  }, [updateManager.isUpdateAvailable, updateManager.availableVersion, notifications, updateManager]);

  useEffect(() => {
    if (!session || geminiDividends.length === 0 || transactions.length === 0) return;
    const today = new Date().toLocaleDateString('en-CA');
    const t = new Date(); t.setDate(t.getDate() + 1);
    const tomorrow = t.toLocaleDateString('en-CA');
    const notifyDivs = localStorage.getItem('investfiis_notify_divs') !== 'false';
    const notifyDataCom = localStorage.getItem('investfiis_notify_datacom') !== 'false';
    const newNotifications: AppNotification[] = [];
    geminiDividends.forEach(div => {
        if (div.paymentDate === today && notifyDivs) {
             const qty = getQuantityOnDate(div.ticker, div.dateCom, transactions);
             if (qty > 0 && !notifications.some(n => n.id === `PAY-${div.ticker}-${today}`)) newNotifications.push({ id: `PAY-${div.ticker}-${today}`, title: `💰 ${div.ticker}: Dinheiro na Conta!`, message: `Recebimento de R$ ${(qty * div.rate).toLocaleString('pt-BR', {minimumFractionDigits: 2})} referente a ${div.type}.`, type: 'success', category: 'payment', timestamp: Date.now(), read: false });
        }
        if (notifyDataCom) {
             const isToday = div.dateCom === today;
             if ((isToday || div.dateCom === tomorrow) && !notifications.some(n => n.id === `DATACOM-${div.ticker}-${div.dateCom}-${isToday ? 'TODAY' : 'TOMORROW'}`)) newNotifications.push({ id: `DATACOM-${div.ticker}-${div.dateCom}-${isToday ? 'TODAY' : 'TOMORROW'}`, title: `${isToday ? "🚨 ÚLTIMO DIA" : "📅 AMANHÃ"}: ${div.ticker}`, message: isToday ? `Hoje é o último dia para garantir R$ ${div.rate.toLocaleString('pt-BR', {minimumFractionDigits: 2})}/cota.` : `Prepare-se: Data Com de ${div.ticker} é amanhã!`, type: isToday ? 'warning' : 'info', category: 'datacom', timestamp: Date.now(), read: false });
        }
    });
    if (newNotifications.length > 0) setNotifications(prev => [...newNotifications, ...prev]);
  }, [geminiDividends, transactions, session, pushEnabled, notifications, showToast]);

  useEffect(() => { if (!process.env.BRAPI_TOKEN) setTimeout(() => showToast('error', 'Token BRAPI não configurado!'), 2000); if (!process.env.API_KEY) setTimeout(() => showToast('error', 'Token Gemini (IA) não configurado!'), 3000); }, [showToast]);

  const syncMarketData = useCallback(async (force = false, txsToUse: Transaction[], initialLoad = false) => {
    const tickers = Array.from(new Set(txsToUse.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) return;
    setIsRefreshing(true);
    if (initialLoad) setLoadingProgress(prev => Math.max(prev, 50));
    try {
      if (process.env.BRAPI_TOKEN) {
          const { quotes: newQuotesData } = await getQuotes(tickers);
          if (newQuotesData.length > 0) setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc: any, q: any) => ({...acc, [q.symbol]: q }), {})}));
      }
      if (initialLoad) setLoadingProgress(prev => Math.max(prev, 70)); 
      if (process.env.API_KEY) {
          setIsAiLoading(true);
          const startDate = txsToUse.length > 0 ? txsToUse.reduce((min, t) => t.date < min ? t.date : min, txsToUse[0].date) : '';
          const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
          
          if (aiData.error) {
            if (aiData.error.includes('quota')) {
              setLastAiStatus('degraded');
              showToast('info', 'IA em pausa (Cota). Usando cache.');
            } else if (aiData.error.includes('API_KEY')) {
              setLastAiStatus('error');
            } else {
              setLastAiStatus('degraded');
            }
          } else {
            setLastAiStatus('operational');
          }

          if (aiData.dividends.length > 0) setGeminiDividends(aiData.dividends);
          if (Object.keys(aiData.metadata).length > 0) setAssetsMetadata(aiData.metadata);
          if (aiData.indicators?.ipca_cumulative) setMarketIndicators({ ipca: aiData.indicators.ipca_cumulative, startDate: aiData.indicators.start_date_used });
      } else {
        setLastAiStatus('error');
      }
      setLastSyncTime(new Date());
      if (initialLoad) setLoadingProgress(prev => Math.max(prev, 90)); 
    } catch (e) { console.error(e); } finally { setIsRefreshing(false); setIsAiLoading(false); }
  }, [showToast]);

  const fetchTransactionsFromCloud = useCallback(async (currentSession: Session | null, force = false, initialLoad = false) => {
    setIsCloudSyncing(true);
    setCloudStatus('syncing');
    if (initialLoad) setLoadingProgress(prev => Math.max(prev, 25));
    try {
        if (!currentSession?.user?.id) { setTransactions([]); setCloudStatus('hidden'); return; }
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', currentSession.user.id);
        if (error) throw error;
        const cloudTxs: Transaction[] = data ? data.map(mapSupabaseToTx) : [];
        setTransactions(cloudTxs);
        setCloudStatus('connected');
        setTimeout(() => setCloudStatus('hidden'), 3000);
        
        if (initialLoad) setLoadingProgress(prev => Math.max(prev, 40));
        
        if (cloudTxs.length > 0) {
            await syncMarketData(force, cloudTxs, initialLoad);
        }
    } catch (err: any) {
        console.error("Supabase fetch error:", err);
        showToast('error', 'Erro ao buscar dados da nuvem.');
        setCloudStatus('disconnected');
    } finally {
        setIsCloudSyncing(false);
    }
  }, [showToast, syncMarketData]);

  // EFEITO DE INICIALIZAÇÃO E AUTENTICAÇÃO
  useEffect(() => {
    setLoadingProgress(10);
    // 1. Verifica a sessão inicial assim que o app carrega.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingProgress(20);
      // O splash screen será removido após este passo, permitindo que a UI apareça
      // enquanto os dados são carregados em segundo plano, se necessário.
      setTimeout(() => setAppLoading(false), 500);
    });

    // 2. Ouve por mudanças no estado de autenticação (login, logout).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Se o usuário fez logout, reseta a interface para o estado inicial.
      if (_event === 'SIGNED_OUT') {
        setCurrentTab('home');
        setShowSettings(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // EFEITO DE CARGA E LIMPEZA DE DADOS (Reativo à sessão)
  useEffect(() => {
    if (session?.user) {
      // Usuário está logado: carrega os dados da nuvem.
      // O 'true' indica que é a carga inicial, para atualizar a barra de progresso.
      fetchTransactionsFromCloud(session, false, transactions.length === 0);
    } else {
      // Usuário deslogado: limpa todos os dados sensíveis do estado e do storage.
      setTransactions([]);
      setQuotes({});
      setGeminiDividends([]);
      setAssetsMetadata({});
      setNotifications([]);
      localStorage.removeItem(STORAGE_KEYS.DIVS);
      localStorage.removeItem(STORAGE_KEYS.INDICATORS);
      localStorage.removeItem(STORAGE_KEYS.NOTIF_HISTORY);
    }
  }, [session, fetchTransactionsFromCloud]);

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    
    // Regardless of the outcome of signOut (which can fail with AuthSessionMissingError
    // on a stale session), the user's intent is to log out. We manually nullify the
    // session in the app's state to ensure the UI transitions to the login screen
    // and all user data is cleared. This creates a robust and predictable logout flow.
    setSession(null); 
    
    if (error) {
      console.error("Supabase signOut error occurred, but session was cleared locally:", error);
    }
  }, []);

  const handleSyncAll = useCallback(async (force: boolean) => {
    await fetchTransactionsFromCloud(session, force);
  }, [fetchTransactionsFromCloud, session]);

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!session) return;
    const tempId = crypto.randomUUID();
    const newTx = { ...t, id: tempId };
    setTransactions(p => [...p, newTx]);
    const { error } = await supabase.from('transactions').insert({ ...mapSupabaseToTx(newTx), asset_type: t.assetType, user_id: session.user.id });
    if (error) { showToast('error', 'Erro ao salvar.'); setTransactions(p => p.filter(tx => tx.id !== tempId)); } 
    else { setCloudStatus('connected'); setTimeout(() => setCloudStatus('hidden'), 3000); }
  };

  const handleUpdateTransaction = async (id: string, updated: Omit<Transaction, 'id'>) => {
    if (!session) return;
    const originalTx = transactions.find(t => t.id === id);
    setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t)); 
    const { error } = await supabase.from('transactions').update({ ...mapSupabaseToTx(updated), asset_type: updated.assetType }).match({ id });
    if (error) { showToast('error', 'Falha ao atualizar.'); setTransactions(p => p.map(t => t.id === id ? originalTx! : t)); }
    else { setCloudStatus('connected'); setTimeout(() => setCloudStatus('hidden'), 3000); }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!session) return;
    const deletedTx = transactions.find(t => t.id === id);
    setTransactions(p => p.filter(t => t.id !== id)); 
    const { error } = await supabase.from('transactions').delete().match({ id });
    if (error) { showToast('error', 'Falha ao apagar.'); setTransactions(p => [...p, deletedTx!]); }
    else { setCloudStatus('connected'); setTimeout(() => setCloudStatus('hidden'), 3000); }
  };

  const onRequestDeleteConfirmation = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (txToDelete) setConfirmModal({ isOpen: true, title: 'Confirmar Exclusão', message: `Deseja realmente apagar a ordem de ${txToDelete.type === 'BUY' ? 'compra' : 'venda'} de ${txToDelete.ticker}?`, onConfirm: () => { handleDeleteTransaction(id); setConfirmModal(null); } });
  };

  const handleImportTransactions = async (importedTxs: Transaction[]) => {
    if (!Array.isArray(importedTxs) || !session) return;
    setIsCloudSyncing(true); setCloudStatus('syncing'); showToast('info', 'Substituindo dados...');
    try {
        await supabase.from('transactions').delete().eq('user_id', session.user.id);
        if (importedTxs.length > 0) {
            const { error } = await supabase.from('transactions').insert(importedTxs.map(t => ({ ...mapSupabaseToTx(t), asset_type: t.assetType, user_id: session.user.id })));
            if (error) throw error;
        }
        await fetchTransactionsFromCloud(session, true);
    } catch (e: any) { console.error(e); showToast('error', 'Erro ao restaurar.'); setCloudStatus('disconnected'); } finally { setIsCloudSyncing(false); }
  };
  
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  
  const getQuantityOnDateMemo = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => getQuantityOnDate(ticker, dateCom, txs), []);

  const { salesGain } = useMemo(() => {
    let totalSalesGain = 0; const assetTracker: Record<string, { q: number; c: number }> = {};
    [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(t => {
      if (!assetTracker[t.ticker]) assetTracker[t.ticker] = { q: 0, c: 0 };
      const a = assetTracker[t.ticker];
      if (t.type === 'BUY') { a.q += t.quantity; a.c += t.quantity * t.price; } 
      else if (a.q > 0) { const avg = a.c / a.q; const cost = t.quantity * avg; totalSalesGain += t.quantity * t.price - cost; a.c -= cost; a.q -= t.quantity; }
    });
    return { salesGain: totalSalesGain };
  }, [transactions]);

  const memoizedData = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const todayStr = new Date().toISOString().split('T')[0];
    const receipts = geminiDividends.map(d => ({ ...d, quantityOwned: Math.max(0, getQuantityOnDateMemo(d.ticker, d.dateCom, sortedTxs)) })).map(r => ({ ...r, totalReceived: r.quantityOwned * r.rate })).filter(r => r.totalReceived > 0);
    const divPaidMap: Record<string, number> = {}; let totalDividendsReceived = 0;
    receipts.forEach(r => { if (r.paymentDate <= todayStr) { divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived; totalDividendsReceived += r.totalReceived; } });
    const positions: Record<string, any> = {};
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType };
      const p = positions[t.ticker];
      if (t.type === 'BUY') { p.averagePrice = (p.quantity * p.averagePrice + t.quantity * t.price) / (p.quantity + t.quantity); p.quantity += t.quantity; } else { p.quantity -= t.quantity; }
    });
    const finalPortfolio = Object.values(positions).filter(p => p.quantity > 1e-4).map(p => ({ ...p, totalDividends: divPaidMap[p.ticker] || 0, segment: assetsMetadata[p.ticker]?.segment || 'Geral', currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice, logoUrl: quotes[p.ticker]?.logourl, assetType: assetsMetadata[p.ticker]?.type || p.assetType, ...assetsMetadata[p.ticker]?.fundamentals }));
    const invested = finalPortfolio.reduce((a, p) => a + (p.averagePrice * p.quantity), 0);
    const balance = finalPortfolio.reduce((a, p) => a + ((p.currentPrice || p.averagePrice) * p.quantity), 0);
    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived, invested, balance };
  }, [transactions, quotes, geminiDividends, getQuantityOnDateMemo, assetsMetadata]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) { showToast('error', 'Navegador não suporta notificações'); return; }
    if (pushEnabled) { setPushEnabled(false); showToast('info', 'Notificações desativadas.'); return; }
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
      
      {/* UPDATE NOTIFICATION PILL - VISUAL PREMIUM (MOVED TO TOP) */}
      {showUpdatePill && (
        <div className="fixed top-28 left-0 w-full flex justify-center z-[1000] pointer-events-none px-6">
            <div className="anim-fade-in-up is-visible w-full max-w-sm pointer-events-auto">
                <div className="relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-r from-accent via-purple-500 to-accent bg-[length:200%_100%] animate-shimmer shadow-2xl shadow-accent/20">
                    <div className="bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-accent mb-0.5">Nova Versão Disponível</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Instalar v{updateManager.availableVersion}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => updateManager.setShowChangelog(true)} 
                                className="h-9 px-4 rounded-xl bg-accent text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/30 active:scale-95 transition-transform flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Update</span>
                            </button>
                            <button 
                                onClick={() => setShowUpdatePill(false)} 
                                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* STANDARD TOASTS - BOTTOM SAFE AREA */}
      {toast && ( 
        <div className="fixed bottom-24 left-0 w-full flex justify-center z-[900] pointer-events-none transition-all duration-300">
            <div className="anim-fade-in-up is-visible w-auto max-w-[90%] pointer-events-auto"> 
                <div className="flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full bg-slate-900/95 dark:bg-white/95 backdrop-blur-xl shadow-2xl border border-white/10 dark:border-black/5 ring-1 ring-black/5"> 
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'info' ? 'bg-slate-800 dark:bg-slate-200' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {toast.type === 'info' ? <Loader2 className="w-3 h-3 text-white dark:text-slate-900 animate-spin" /> : toast.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}
                    </div> 
                    <span className="text-[10px] font-bold text-white dark:text-slate-900 tracking-wide truncate">{toast.text}</span> 
                </div> 
            </div>
        </div> 
      )}

      {session && !appLoading && (
        <>
            <Header title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'} showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} onRefresh={() => fetchTransactionsFromCloud(session, false)} isRefreshing={isRefreshing || isAiLoading || isCloudSyncing} updateAvailable={updateManager.isUpdateAvailable} onUpdateClick={() => updateManager.setShowChangelog(true)} onNotificationClick={() => { setShowNotifications(true); setNotifications(prev => prev.map(n => ({...n, read: true}))); }} notificationCount={unreadCount} appVersion={APP_VERSION} bannerVisible={cloudStatus !== 'hidden'} />
            <main className={`max-w-screen-md mx-auto pt-2 transition-all duration-500 ${cloudStatus !== 'hidden' ? 'mt-8' : 'mt-0'}`}>
              {showSettings ? (
                <Settings onLogout={handleLogout} user={session.user} transactions={transactions} onImportTransactions={handleImportTransactions} geminiDividends={geminiDividends} onImportDividends={setGeminiDividends} onResetApp={() => { localStorage.clear(); supabase.auth.signOut(); window.location.reload(); }} theme={theme} onSetTheme={setTheme} accentColor={accentColor} onSetAccentColor={setAccentColor} privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} appVersion={APP_VERSION} availableVersion={updateManager.availableVersion} updateAvailable={updateManager.isUpdateAvailable} onCheckUpdates={updateManager.checkForUpdates} onShowChangelog={() => updateManager.setShowChangelog(true)} releaseNotes={updateManager.releaseNotes} lastChecked={updateManager.lastChecked} pushEnabled={pushEnabled} onRequestPushPermission={requestPushPermission} lastSyncTime={lastSyncTime} onSyncAll={handleSyncAll} currentVersionDate={updateManager.currentVersionDate} lastAiStatus={lastAiStatus} />
              ) : (
                <div key={currentTab} className="anim-fade-in is-visible">
                  {currentTab === 'home' && <MemoizedHome {...memoizedData} salesGain={salesGain} totalAppreciation={memoizedData.balance - memoizedData.invested} isAiLoading={isAiLoading} inflationRate={marketIndicators.ipca} portfolioStartDate={marketIndicators.startDate} accentColor={accentColor} />}
                  {currentTab === 'portfolio' && <MemoizedPortfolio {...memoizedData} />}
                  {currentTab === 'transactions' && <MemoizedTransactions transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onRequestDeleteConfirmation={onRequestDeleteConfirmation} />}
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