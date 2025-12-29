import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal, ChangelogModal, NotificationsModal, CloudStatusBanner, LockScreen, ConfirmationModal } from './components/Layout';
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
import { Session } from '@supabase/supabase-js';

const APP_VERSION = '7.0.4'; 

const STORAGE_KEYS = {
  TXS: 'investfiis_v4_transactions',
  DIVS: 'investfiis_v4_div_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  PREFS_NOTIF: 'investfiis_prefs_notifications',
  INDICATORS: 'investfiis_v4_indicators',
  PUSH_ENABLED: 'investfiis_push_enabled',
  LAST_SYNC: 'investfiis_last_sync_time',
  GUEST_MODE: 'investfiis_guest_mode',
  PASSCODE: 'investfiis_passcode',
  BIOMETRICS: 'investfiis_biometrics'
};

export type ThemeType = 'light' | 'dark' | 'system';

// Helper function to calculate quantity on date
const getQuantityOnDate = (ticker: string, date: string, transactions: Transaction[]) => {
  return transactions
    .filter(t => t.ticker === ticker && t.date <= date)
    .reduce((acc, t) => {
      if (t.type === 'BUY') return acc + t.quantity;
      if (t.type === 'SELL') return acc - t.quantity;
      return acc;
    }, 0);
};

// Helper to prepare a transaction object for Supabase, mapping camelCase to snake_case
// and removing the original camelCase key to prevent column mismatch errors.
const cleanTxForSupabase = (tx: Omit<Transaction, 'id'> | Transaction) => {
  const { assetType, ...restOfTx } = tx;
  return {
    ...restOfTx,
    asset_type: assetType,
  };
};

const MemoizedHome = React.memo(Home);
const MemoizedPortfolio = React.memo(Portfolio);
const MemoizedTransactions = React.memo(Transactions);

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.TXS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); return s ? JSON.parse(s) : { ipca: 4.5, startDate: '' }; } catch { return { ipca: 4.5, startDate: '' }; } });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.LAST_SYNC); return s ? new Date(s) : null; } catch { return null; } });
  
  const prevDividendsRef = useRef<DividendReceipt[]>(geminiDividends);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled)); }, [pushEnabled]);
  useEffect(() => { if (lastSyncTime) localStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTime.toISOString()); }, [lastSyncTime]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.GUEST_MODE, String(isGuest)); }, [isGuest]);

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

  const syncAll = useCallback(async (force = false, transactionsToSync: Transaction[] = transactions) => {
    const tickers = Array.from(new Set(transactionsToSync.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) {
      setQuotes({});
      setGeminiDividends([]);
      setAssetsMetadata({});
      return;
    }
    setIsRefreshing(true);
    try {
      const { quotes: newQuotesData } = await getQuotes(tickers);
      setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc, q) => ({...acc, [q.symbol]: q }), {})}));
      
      setIsAiLoading(true);
      const startDate = transactionsToSync.length > 0 ? transactionsToSync.reduce((min, t) => t.date < min ? t.date : min, transactionsToSync[0].date) : '';
      const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
      
      if (aiData.error === 'quota_exceeded') showToast('info', 'IA em pausa (Cota). Usando cache.');
      else if (force) showToast('success', 'Carteira Sincronizada');
      
      setGeminiDividends(aiData.dividends);
      setAssetsMetadata(aiData.metadata);
      if (aiData.indicators?.ipca_cumulative) setMarketIndicators({ ipca: aiData.indicators.ipca_cumulative, startDate: aiData.indicators.start_date_used });
      setLastSyncTime(new Date());
    } catch (e) { if (force) showToast('error', 'Sem conexão'); } 
    finally { setIsRefreshing(false); setIsAiLoading(false); }
  }, [transactions, showToast]);

  const migrateGuestDataToCloud = useCallback(async (user_id: string) => {
    const localTxs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TXS) || '[]') as Transaction[];
    if (localTxs.length === 0) return;
    setCloudStatus('syncing');
    showToast('info', 'Migrando dados locais para a nuvem...');
    const dataToInsert = localTxs.map(tx => {
        const { id, ...rest } = tx;
        const record = cleanTxForSupabase(rest);
        return { ...record, user_id, id };
    });
    const { error } = await supabase.from('transactions').insert(dataToInsert);
    if (error) {
      console.error("Supabase migration error:", error);
      showToast('error', 'Erro ao migrar dados.');
    } else {
      showToast('success', 'Dados locais salvos na nuvem!');
    }
  }, [showToast]);

  const fetchTransactionsFromCloud = useCallback(async () => {
    setIsCloudSyncing(true);
    const { data, error } = await supabase.from('transactions').select('*');
    if (error) {
      console.error("Supabase fetch error:", error);
      showToast('error', 'Erro ao buscar dados da nuvem.');
    } else if (data) {
      const cloudTxs: Transaction[] = data.map((t: any) => ({ id: t.id, ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, assetType: t.asset_type }));
      setTransactions(cloudTxs);
      await syncAll(false, cloudTxs);
    }
    setIsCloudSyncing(false);
  }, [showToast, syncAll]);
  
  const stableSyncFunctions = useRef({ migrateGuestDataToCloud, fetchTransactionsFromCloud, syncAll });
  useEffect(() => {
    stableSyncFunctions.current = { migrateGuestDataToCloud, fetchTransactionsFromCloud, syncAll };
  }, [migrateGuestDataToCloud, fetchTransactionsFromCloud, syncAll]);

  useEffect(() => {
    let previousSession: Session | null = null;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      previousSession = initialSession;
      setSession(initialSession);
      setIsAuthLoading(false);
      if (!initialSession && localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true') {
        setCloudStatus('disconnected');
        stableSyncFunctions.current.syncAll(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      const wasGuest = localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true';
      const isNewLogin = !!currentSession && !previousSession;
      const isLogout = !currentSession && !!previousSession;
      
      setSession(currentSession);
      previousSession = currentSession;

      if (isNewLogin) {
        setIsGuest(false);
        if (wasGuest) {
          await stableSyncFunctions.current.migrateGuestDataToCloud(currentSession.user.id);
          await stableSyncFunctions.current.syncAll(false); // Sync metadata for migrated assets
          setCloudStatus('connected');
        } else {
          await stableSyncFunctions.current.fetchTransactionsFromCloud();
          setCloudStatus('connected');
        }
        setTimeout(() => setCloudStatus('hidden'), 3000);
      } else if (isLogout) {
        setTransactions([]);
        setQuotes({});
        setGeminiDividends([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const mapRecord = (r: any): Transaction => ({ id: r.id, ticker: r.ticker, type: r.type, quantity: r.quantity, price: r.price, date: r.date, assetType: r.asset_type });
        setTransactions(currentTxs => {
            if (eventType === 'INSERT') {
              if (currentTxs.some(t => t.id === newRecord.id)) return currentTxs;
              return [...currentTxs, mapRecord(newRecord)];
            }
            if (eventType === 'UPDATE') return currentTxs.map(t => t.id === newRecord.id ? mapRecord(newRecord) : t);
            if (eventType === 'DELETE') return currentTxs.filter(t => t.id !== oldRecord.id);
            return currentTxs;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    const newTx = { ...t, id: crypto.randomUUID() };
    setTransactions(p => [...p, newTx]);
    if (session) {
      const record = cleanTxForSupabase(newTx);
      const { error } = await supabase.from('transactions').insert({ ...record, user_id: session.user.id });
      if (error) {
        console.error("Supabase insert error:", error);
        showToast('error', 'Erro ao salvar.');
        setTransactions(p => p.filter(tx => tx.id !== newTx.id));
      }
    }
  };

  const handleUpdateTransaction = async (id: string, updated: Omit<Transaction, 'id'>) => {
    const originalTx = transactions.find(t => t.id === id);
    setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t));
    if (session && originalTx) {
      const record = cleanTxForSupabase(updated);
      const { error } = await supabase.from('transactions').update(record).match({ id });
      if (error) {
        console.error("Supabase update error:", error);
        showToast('error', 'Falha ao atualizar.');
        setTransactions(p => p.map(t => t.id === id ? originalTx : t));
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const deletedTx = transactions.find(t => t.id === id);
    setTransactions(p => p.filter(t => t.id !== id));
    if (session && deletedTx) {
      const { error } = await supabase.from('transactions').delete().match({ id });
      if (error) {
        console.error("Supabase delete error:", error);
        showToast('error', 'Falha ao apagar.');
        setTransactions(p => [...p, deletedTx]);
      }
    }
  };

  const onRequestDeleteConfirmation = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;
    setConfirmModal({
        isOpen: true,
        title: 'Confirmar Exclusão',
        message: `Deseja realmente apagar a ordem de ${txToDelete.type === 'BUY' ? 'compra' : 'venda'} de ${txToDelete.ticker}? Esta ação não pode ser desfeita.`,
        onConfirm: () => { handleDeleteTransaction(id); setConfirmModal(null); }
    });
  };

  const handleImportTransactions = async (importedTxs: Transaction[]) => {
    if (!Array.isArray(importedTxs)) return;
    const originalTxs = transactions;
    setTransactions(importedTxs);
    if (session) {
        setIsCloudSyncing(true);
        showToast('info', 'Sincronizando backup...');
        try {
            await supabase.from('transactions').delete().eq('user_id', session.user.id);
            const sbData = importedTxs.map(t => {
                const record = cleanTxForSupabase(t);
                return { ...record, user_id: session.user.id };
            });
            if (sbData.length > 0) {
              const { error } = await supabase.from('transactions').insert(sbData);
              if (error) throw error;
            }
            showToast('success', 'Backup restaurado!');
        } catch (e: any) {
            console.error("Supabase import error:", e);
            showToast('error', 'Erro na nuvem. Restaurando dados.');
            setTransactions(originalTxs);
        } finally {
            setIsCloudSyncing(false);
        }
    } else {
        showToast('success', 'Backup restaurado localmente.');
    }
  };

  const sendSystemNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!pushEnabled || !('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: './icon.svg', tag, vibrate: [200,100,200] } as any));
  }, [pushEnabled]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) { showToast('error', 'Navegador não suporta notificações'); return; }
    const permission = await Notification.requestPermission();
    setPushEnabled(permission === 'granted');
    showToast(permission === 'granted' ? 'success' : 'info', permission === 'granted' ? 'Notificações Ativadas!' : 'Permissão negada.');
    if(permission === 'granted') sendSystemNotification('InvestFIIs', 'Notificações configuradas com sucesso.');
  };

  const addNotification = useCallback((notification: Omit<AppNotification, 'id'|'timestamp'|'read'>) => {
    setNotifications(prev => {
      if (prev.some(n => n.title === notification.title && (Date.now() - n.timestamp < 86400000))) return prev;
      sendSystemNotification(notification.title, notification.message, notification.category);
      return [{ ...notification, id: crypto.randomUUID(), timestamp: Date.now(), read: false }, ...prev];
    });
  }, [sendSystemNotification]);
  
  const markNotificationsAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const getQuantityOnDateMemo = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => getQuantityOnDate(ticker, dateCom, txs), []);

  const summaryData = useMemo(() => {
    let totalSalesGain = 0;
    const assetTracker: Record<string, { quantity: number; totalCost: number }> = {};
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const t of sortedTxs) {
        if (!assetTracker[t.ticker]) {
            assetTracker[t.ticker] = { quantity: 0, totalCost: 0 };
        }
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
    const receipts = geminiDividends.map(div => ({...div, quantityOwned: Math.max(0, getQuantityOnDateMemo(div.ticker, div.dateCom, sortedTxs)), totalReceived: Math.max(0, getQuantityOnDateMemo(div.ticker, div.dateCom, sortedTxs)) * div.rate})).filter(r => r.totalReceived > 0);
    const divPaidMap: Record<string, number> = {};
    let totalDividendsReceived = 0;
    receipts.forEach(r => { if (r.paymentDate <= todayStr) { divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived; totalDividendsReceived += r.totalReceived; } });
    const positions: Record<string, AssetPosition> = {};
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: divPaidMap[t.ticker] || 0, segment: assetsMetadata[t.ticker]?.segment || 'Geral' };
      const p = positions[t.ticker];
      if (t.type === 'BUY') { p.averagePrice = (p.quantity * p.averagePrice + t.quantity * t.price) / (p.quantity + t.quantity); p.quantity += t.quantity; } 
      else { p.quantity -= t.quantity; }
    });
    const finalPortfolio = Object.values(positions).filter(p => p.quantity > 0.0001).map(p => ({ ...p, currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice, logoUrl: quotes[p.ticker]?.logourl, assetType: assetsMetadata[p.ticker]?.type || p.assetType, segment: assetsMetadata[p.ticker]?.segment || p.segment, ...assetsMetadata[p.ticker]?.fundamentals }));
    const invested = finalPortfolio.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);
    const balance = finalPortfolio.reduce((acc, p) => acc + ((p.currentPrice || p.averagePrice) * p.quantity), 0);
    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived, invested, balance };
  }, [transactions, quotes, geminiDividends, getQuantityOnDateMemo, assetsMetadata]);

  if (isAuthLoading) return <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex items-center justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  if (isLocked && savedPasscode) return <LockScreen isOpen={true} correctPin={savedPasscode} onUnlock={() => setIsLocked(false)} isBiometricsEnabled={isBiometricsEnabled} />;
  if (!session && !isGuest) return <Login onGuestAccess={() => setIsGuest(true)} />;

  return (
    <div className="min-h-screen transition-colors duration-500 bg-primary-light dark:bg-primary-dark">
      <CloudStatusBanner status={cloudStatus} />
      {toast && ( <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] anim-fade-in-up is-visible w-auto max-w-[90%]"> <div className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl shadow-xl"> <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'info' ? 'bg-slate-800 dark:bg-slate-200' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{toast.type === 'info' ? <Loader2 className="w-3 h-3 text-white dark:text-slate-900 animate-spin" /> : toast.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}</div> <span className="text-[10px] font-bold text-white dark:text-slate-900 tracking-wide truncate">{toast.text}</span> </div> </div> )}
      <Header title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'} showBack={showSettings} onBack={() => setShowSettings(false)} onSettingsClick={() => setShowSettings(true)} onRefresh={() => syncAll(true)} isRefreshing={isRefreshing || isAiLoading || isCloudSyncing} updateAvailable={updateManager.isUpdateAvailable} onUpdateClick={() => updateManager.setShowChangelog(true)} onNotificationClick={() => { setShowNotifications(true); markNotificationsAsRead(); }} notificationCount={unreadCount} appVersion={APP_VERSION} bannerVisible={cloudStatus !== 'hidden'} />
      <main className={`max-w-screen-md mx-auto pt-2 transition-all duration-500 ${cloudStatus !== 'hidden' ? 'mt-8' : 'mt-0'}`}>
        {showSettings ? (
          <Settings transactions={transactions} onImportTransactions={handleImportTransactions} geminiDividends={geminiDividends} onImportDividends={setGeminiDividends} onResetApp={() => { localStorage.clear(); supabase.auth.signOut(); setIsGuest(false); window.location.reload(); }} theme={theme} onSetTheme={setTheme} accentColor={accentColor} onSetAccentColor={setAccentColor} privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode} appVersion={APP_VERSION} availableVersion={updateManager.availableVersion} updateAvailable={updateManager.isUpdateAvailable} onCheckUpdates={updateManager.checkForUpdates} onShowChangelog={() => updateManager.setShowChangelog(true)} releaseNotes={updateManager.releaseNotes} lastChecked={updateManager.lastChecked} pushEnabled={pushEnabled} onRequestPushPermission={requestPushPermission} lastSyncTime={lastSyncTime} onSyncAll={() => syncAll(false)} />
        ) : (
          <div key={currentTab} className="anim-fade-in is-visible">
            {currentTab === 'home' && <MemoizedHome {...memoizedData} salesGain={summaryData.salesGain} totalAppreciation={memoizedData.balance - memoizedData.invested} isAiLoading={isAiLoading} inflationRate={marketIndicators.ipca} portfolioStartDate={marketIndicators.startDate} accentColor={accentColor} />}
            {currentTab === 'portfolio' && <MemoizedPortfolio {...memoizedData} />}
            {currentTab === 'transactions' && ( <MemoizedTransactions transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onRequestDeleteConfirmation={onRequestDeleteConfirmation} /> )}
          </div>
        )}
      </main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
      <ChangelogModal isOpen={updateManager.showChangelog} onClose={() => !updateManager.isUpdating && updateManager.setShowChangelog(false)} version={updateManager.availableVersion || APP_VERSION} notes={updateManager.releaseNotes} isUpdatePending={!updateManager.wasUpdated && updateManager.isUpdateAvailable} onUpdate={updateManager.startUpdateProcess} isUpdating={updateManager.isUpdating} progress={updateManager.updateProgress} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onClear={() => setNotifications([])} />
      {confirmModal?.isOpen && ( <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} /> )}
    </div>
  );
};

export default App;