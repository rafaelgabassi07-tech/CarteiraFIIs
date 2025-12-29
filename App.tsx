import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal, ChangelogModal, NotificationsModal, UpdateBanner, CloudStatusBanner, LockScreen } from './components/Layout';
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

const APP_VERSION = '7.0.4'; 

const STORAGE_KEYS = {
  TXS: 'investfiis_v4_transactions',
  TOKEN: 'investfiis_v4_brapi_token',
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

const App: React.FC = () => {
  const updateManager = useUpdateManager(APP_VERSION);
  
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden'>('hidden');

  // Lock Screen State
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
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TXS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [brapiToken, setBrapiToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TOKEN) || process.env.BRAPI_TOKEN || '');

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DIVS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEYS.INDICATORS);
          return saved ? JSON.parse(saved) : { ipca: 4.5, startDate: '' };
      } catch { return { ipca: 4.5, startDate: '' }; }
  });

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return saved ? new Date(saved) : null;
    } catch { return null; }
  });

  const prevDividendsRef = useRef<DividendReceipt[]>(geminiDividends);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken); }, [brapiToken]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PUSH_ENABLED, String(pushEnabled)); }, [pushEnabled]);
  useEffect(() => { 
    if (lastSyncTime) {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTime.toISOString());
    }
  }, [lastSyncTime]);
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
    if (privacyMode) document.body.classList.add('privacy-blur');
    else document.body.classList.remove('privacy-blur');
    localStorage.setItem(STORAGE_KEYS.PRIVACY, String(privacyMode));
  }, [privacyMode]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    if (type !== 'info') setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Função Central de Sincronização ---
  const syncAll = useCallback(async (force = false, transactionsToSync?: Transaction[]) => {
    const targetTransactions = transactionsToSync || transactions;
    const tickers: string[] = Array.from(new Set(targetTransactions.map(t => t.ticker.toUpperCase())));
    
    if (tickers.length === 0) return;

    setIsRefreshing(true);
    try {
      if (brapiToken) {
        const priceRes = await getQuotes(tickers, brapiToken, force);
        const newQuotes: Record<string, BrapiQuote> = {};
        priceRes.quotes.forEach(q => newQuotes[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...newQuotes }));
      }
      setIsAiLoading(true);
      
      let startDate = '';
      if (targetTransactions.length > 0) {
         startDate = targetTransactions.reduce((min, t) => t.date < min ? t.date : min, targetTransactions[0].date);
      }

      const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
      
      if (aiData.error === 'quota_exceeded') {
          showToast('info', 'IA em pausa (Cota). Usando cache.');
      } else if (force) {
          showToast('success', 'Carteira Sincronizada');
      }

      setGeminiDividends(aiData.dividends);
      setAssetsMetadata(aiData.metadata);
      
      if (aiData.indicators && typeof aiData.indicators.ipca_cumulative === 'number') {
          setMarketIndicators({
              ipca: aiData.indicators.ipca_cumulative,
              startDate: aiData.indicators.start_date_used
          });
      }
      
      setLastSyncTime(new Date());
      
    } catch (e) {
      // Erro silencioso em auto-sync para não atrapalhar UX
      if(force) showToast('error', 'Sem conexão');
    } finally {
      setIsRefreshing(false);
      setIsAiLoading(false);
    }
  }, [transactions, brapiToken, showToast]);

  // --- Background Refresh Logic (Visibility Change) ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Quando o usuário volta para o app (foreground)
      if (document.visibilityState === 'visible') {
        // Se a última sincronização foi há mais de 1 hora, tenta sincronizar suavemente
        const last = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        if (last) {
            const diff = Date.now() - new Date(last).getTime();
            if (diff > 60 * 60 * 1000) {
                console.log("🔄 Retorno ao app: Atualizando dados em background...");
                syncAll(false);
            }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncAll]);

  // --- Supabase & Auth Logic ---
  const fetchTransactionsFromCloud = useCallback(async () => {
    setIsCloudSyncing(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*');

    if (error) {
      showToast('error', 'Erro ao baixar dados da nuvem');
    } else if (data) {
      const mappedTxs: Transaction[] = data.map((t: any) => ({
        id: t.id,
        ticker: t.ticker,
        type: t.type,
        quantity: t.quantity,
        price: t.price,
        date: t.date,
        assetType: t.asset_type
      }));
      setTransactions(mappedTxs);
      showToast('success', 'Dados sincronizados com a nuvem');
      syncAll(false, mappedTxs);
    }
    setIsCloudSyncing(false);
  }, [showToast, syncAll]);

  useEffect(() => {
    // Inicia ouvindo as mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setIsAuthLoading(false); // <-- PONTO CHAVE: Só para de carregar DEPOIS do primeiro evento

        if (session) {
            setIsGuest(false);
            setCloudStatus('connected');
            setTimeout(() => setCloudStatus('hidden'), 2500);
            fetchTransactionsFromCloud();
        } else if (isGuest) {
            setCloudStatus('disconnected');
            syncAll();
        } else {
            setCloudStatus('hidden');
        }
    });

    return () => subscription.unsubscribe();
  }, [fetchTransactionsFromCloud, isGuest, syncAll]); // Dependências relevantes

  // Atualiza o banner se entrar no modo convidado explicitamente
  useEffect(() => {
      if (isGuest && !session) {
          setCloudStatus('disconnected');
      }
  }, [isGuest, session]);

  // --- Secure CRUD Operations with Rollback ---

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    const newTx = { ...t, id: crypto.randomUUID() };
    
    // 1. Atualização Otimista
    setTransactions(p => [...p, newTx]);

    if (session) {
      const { error } = await supabase.from('transactions').insert({
        id: newTx.id,
        user_id: session.user.id,
        ticker: newTx.ticker,
        type: newTx.type,
        quantity: newTx.quantity,
        price: newTx.price,
        date: newTx.date,
        asset_type: newTx.assetType
      });

      // 2. Rollback
      if (error) {
        showToast('error', 'Erro ao salvar. Verifique permissões.');
        console.error("Supabase Error:", error);
        setTransactions(p => p.filter(tx => tx.id !== newTx.id));
      }
    }
  };

  const handleUpdateTransaction = async (id: string, updated: Omit<Transaction, 'id'>) => {
    const originalTx = transactions.find(t => t.id === id);
    if (!originalTx) return;

    setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t));

    if (session) {
      const { error } = await supabase.from('transactions').update({
        ticker: updated.ticker,
        type: updated.type,
        quantity: updated.quantity,
        price: updated.price,
        date: updated.date,
        asset_type: updated.assetType
      }).eq('id', id);

      if (error) {
        showToast('error', 'Falha ao atualizar na nuvem');
        console.error("Supabase Error:", error);
        setTransactions(p => p.map(t => t.id === id ? originalTx : t));
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const deletedTx = transactions.find(t => t.id === id);
    if (!deletedTx) return;

    setTransactions(p => p.filter(t => t.id !== id));

    if (session) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      
      if (error) {
        showToast('error', 'Falha ao apagar na nuvem');
        console.error("Supabase Error:", error);
        setTransactions(p => [...p, deletedTx]);
      }
    }
  };

  const handleImportTransactions = async (importedTxs: Transaction[]) => {
    if (!Array.isArray(importedTxs)) return;

    setTransactions(importedTxs);

    if (session) {
        setIsCloudSyncing(true);
        showToast('info', 'Sincronizando backup na nuvem...');
        
        try {
            // Estratégia de Restauração: Limpar e Inserir
            // 1. Remove dados atuais do usuário para evitar duplicatas ou estados inconsistentes com o backup
            await supabase.from('transactions').delete().eq('user_id', session.user.id);
            
            // 2. Prepara dados para inserção
            const sbData = importedTxs.map(t => ({
                id: t.id, // Preserva IDs originais para consistência
                user_id: session.user.id,
                ticker: t.ticker,
                type: t.type,
                quantity: t.quantity,
                price: t.price,
                date: t.date,
                asset_type: t.assetType
            }));
            
            if (sbData.length > 0) {
                const { error } = await supabase.from('transactions').insert(sbData);
                if (error) throw error;
            }
            
            showToast('success', 'Backup restaurado e sincronizado!');
        } catch (e) {
            console.error("Erro na importação:", e);
            showToast('error', 'Erro ao salvar na nuvem. Dados locais atualizados.');
        } finally {
            setIsCloudSyncing(false);
        }
    } else {
        showToast('success', 'Backup restaurado localmente.');
    }
  };

  // --- Notificações ---
  const sendSystemNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!pushEnabled || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        // Tenta usar o Service Worker para notificação (mais robusto)
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body,
                icon: '/pwa-192x192.png',
                tag,
                vibrate: [200, 100, 200]
            } as any);
        });
      } catch (e) { console.warn('Erro notificação nativa', e); }
    }
  }, [pushEnabled]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) { showToast('error', 'Navegador não suporta notificações'); return; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushEnabled(true);
      showToast('success', 'Notificações Ativadas!');
      sendSystemNotification('InvestFIIs', 'Notificações push configuradas com sucesso.');
    } else {
      setPushEnabled(false);
      showToast('info', 'Permissão negada pelo navegador');
    }
  };

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => {
      if (prev.some(n => n.title === notification.title && (Date.now() - n.timestamp < 86400000))) return prev;
      sendSystemNotification(notification.title, notification.message, notification.category);
      return [{ ...notification, id: crypto.randomUUID(), timestamp: Date.now(), read: false }, ...prev];
    });
  }, [sendSystemNotification]);
  
  const markNotificationsAsRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); };
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const getQuantityOnDateMemo = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => getQuantityOnDate(ticker, dateCom, txs), []);

  const memoizedData = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const nowStr = new Date().toISOString().substring(0, 7);
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    const contribution = transactions
      .filter(t => t.type === 'BUY' && t.date.startsWith(nowStr))
      .reduce((acc, t) => acc + (t.quantity * t.price), 0);

    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qty = Math.max(0, getQuantityOnDateMemo(div.ticker, div.dateCom, sortedTxs));
      return { ...div, quantityOwned: qty, totalReceived: qty * div.rate };
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
    let salesGain = 0;

    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) {
        positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: divPaidMap[t.ticker] || 0, segment: assetsMetadata[t.ticker]?.segment || 'Geral' };
      }
      const p = positions[t.ticker];
      if (t.type === 'BUY') {
        const cost = p.quantity * p.averagePrice;
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? (cost + (t.quantity * t.price)) / p.quantity : 0;
      } else {
        salesGain += (t.quantity * t.price) - (t.quantity * p.averagePrice);
        p.quantity -= t.quantity;
      }
    });

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0)
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice,
        logoUrl: quotes[p.ticker]?.logourl,
        assetType: assetsMetadata[p.ticker]?.type || p.assetType,
        segment: assetsMetadata[p.ticker]?.segment || p.segment,
        ...assetsMetadata[p.ticker]?.fundamentals
      }));

    return { portfolio: finalPortfolio, dividendReceipts: receipts, salesGain: salesGain, totalDividendsReceived: totalDividendsReceived, monthlyContribution: contribution };
  }, [transactions, quotes, geminiDividends, getQuantityOnDateMemo, assetsMetadata]);

  const checkDailyEvents = useCallback((currentDividends: DividendReceipt[], portfolio: AssetPosition[]) => {
      const todayDate = new Date();
      const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
      
      currentDividends.forEach(div => {
         const asset = portfolio.find(p => p.ticker === div.ticker);
         if (div.paymentDate === today && div.totalReceived > 0) {
             const isJCP = div.type.toUpperCase().includes('JCP') || div.type.toUpperCase().includes('JUROS');
             let msg = `${div.ticker} pagou R$ ${div.totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})} em ${isJCP ? 'JCP' : 'Dividendos'}.`;
             addNotification({ title: `💰 Caiu na Conta: ${div.ticker}`, message: msg, type: 'success', category: 'payment' });
         }
         if (div.dateCom === today) {
             const yieldVal = asset && asset.currentPrice ? ((div.rate / asset.currentPrice) * 100).toFixed(2) : null;
             let msg = `Hoje é a data limite para garantir R$ ${div.rate.toFixed(4)}/cota.`;
             if (yieldVal) msg += ` Yield estimado: ${yieldVal}%.`;
             addNotification({ title: `📅 Data Com: ${div.ticker}`, message: msg, type: 'warning', category: 'datacom' });
         }
      });
  }, [addNotification]);

  useEffect(() => {
    if (geminiDividends.length > prevDividendsRef.current.length) {
      const newDivs = geminiDividends.filter(d => !prevDividendsRef.current.find(p => p.id === d.id));
      if (newDivs.length > 0) {
        const tickers = Array.from(new Set(newDivs.map(d => d.ticker))).join(', ');
        addNotification({ title: 'Novos Anúncios Rastreados', message: `A IA identificou ${newDivs.length} novos pagamentos para: ${tickers}.`, type: 'info', category: 'general' });
      }
    }
    prevDividendsRef.current = geminiDividends;
    if (memoizedData.portfolio.length > 0) checkDailyEvents(geminiDividends, memoizedData.portfolio);
  }, [geminiDividends, memoizedData.portfolio, addNotification, checkDailyEvents]);

  // Se estiver carregando auth, mostra tela de loading básica
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  // --- Lock Screen Check ---
  if (isLocked && savedPasscode) {
    return (
      <LockScreen 
        isOpen={true} 
        correctPin={savedPasscode}
        onUnlock={() => setIsLocked(false)}
        isBiometricsEnabled={isBiometricsEnabled}
      />
    );
  }

  if (!session && !isGuest) {
    return (
      <Login 
        onLoginSuccess={() => { }} 
        onGuestAccess={() => { setIsGuest(true); syncAll(); }} 
      />
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-500 bg-primary-light dark:bg-primary-dark">
      <div className="fixed top-24 inset-x-0 z-30 flex justify-center pointer-events-none">
        <UpdateBanner 
          isOpen={updateManager.showUpdateBanner} 
          onDismiss={() => updateManager.setShowUpdateBanner(false)} 
          onUpdate={() => { updateManager.setShowChangelog(true); }} 
          version={updateManager.availableVersion || 'Nova'} 
        />
      </div>

      <CloudStatusBanner status={cloudStatus} />

      {toast && (
        <div 
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] anim-fade-in-up is-visible w-auto max-w-[90%]"
          onClick={() => updateManager.isUpdateAvailable && updateManager.setShowChangelog(true)}
        >
          <div className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-900/10 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10 dark:border-black/5">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'info' ? 'bg-slate-800 dark:bg-slate-200' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                 {toast.type === 'info' ? <Loader2 className="w-3 h-3 text-white dark:text-slate-900 animate-spin" /> : toast.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}
             </div>
             <span className="text-[10px] font-bold text-white dark:text-slate-900 tracking-wide truncate">{toast.text}</span>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'}
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onSettingsClick={() => setShowSettings(true)}
        onRefresh={() => syncAll(true)}
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
            brapiToken={brapiToken} onSaveToken={setBrapiToken}
            transactions={transactions} onImportTransactions={handleImportTransactions}
            geminiDividends={geminiDividends} onImportDividends={setGeminiDividends}
            onResetApp={() => { 
                localStorage.clear(); 
                setIsGuest(false);
                window.location.reload(); 
            }}
            theme={theme} onSetTheme={setTheme}
            accentColor={accentColor} onSetAccentColor={setAccentColor}
            privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode}
            appVersion={APP_VERSION}
            availableVersion={updateManager.availableVersion} 
            updateAvailable={updateManager.isUpdateAvailable}
            onCheckUpdates={updateManager.checkForUpdates}
            onShowChangelog={() => updateManager.setShowChangelog(true)}
            releaseNotes={updateManager.releaseNotes}
            lastChecked={updateManager.lastChecked}
            pushEnabled={pushEnabled}
            onRequestPushPermission={requestPushPermission}
            lastSyncTime={lastSyncTime}
            onSyncAll={() => syncAll(false)}
          />
        ) : (
          <div key={currentTab} className="anim-fade-in is-visible">
            {currentTab === 'home' && (
                <Home 
                    portfolio={memoizedData.portfolio}
                    dividendReceipts={memoizedData.dividendReceipts}
                    salesGain={memoizedData.salesGain}
                    totalDividendsReceived={memoizedData.totalDividendsReceived}
                    isAiLoading={isAiLoading} 
                    inflationRate={marketIndicators.ipca}
                    portfolioStartDate={marketIndicators.startDate}
                    accentColor={accentColor}
                />
            )}
            {currentTab === 'portfolio' && <Portfolio {...memoizedData} />}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                monthlyContribution={memoizedData.monthlyContribution}
              />
            )}
          </div>
        )}
      </main>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}

      <ChangelogModal 
        isOpen={updateManager.showChangelog} 
        onClose={() => { if (updateManager.updateProgress === 0) updateManager.setShowChangelog(false); }} 
        version={updateManager.availableVersion || APP_VERSION} 
        notes={updateManager.releaseNotes}
        isUpdatePending={!updateManager.wasUpdated && updateManager.isUpdateAvailable}
        onUpdate={updateManager.startUpdateProcess}
        progress={updateManager.updateProgress}
      />
      
      <NotificationsModal 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={notifications}
        onClear={() => setNotifications([])}
      />
    </div>
  );
};

export default App;