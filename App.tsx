
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal, ChangelogModal, NotificationsModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType, VersionData, ReleaseNote, AppNotification } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { CheckCircle2, DownloadCloud, AlertCircle } from 'lucide-react';

const APP_VERSION = '4.7.0';
const STORAGE_KEYS = {
  TXS: 'investfiis_v4_transactions',
  TOKEN: 'investfiis_v4_brapi_token',
  DIVS: 'investfiis_v4_div_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
  PREFS_NOTIF: 'investfiis_prefs_notifications'
};

export type ThemeType = 'light' | 'dark' | 'system';

const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

const performSmartUpdate = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  if ('caches' in window) {
    try {
        const keys = await caches.keys();
        for (const key of keys) {
            await caches.delete(key);
        }
    } catch(e) { console.error("Cache clear error", e); }
  }
  window.location.reload();
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  
  // Controle de Changelog e Update
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogNotes, setChangelogNotes] = useState<ReleaseNote[]>([]);
  const [changelogVersion, setChangelogVersion] = useState(APP_VERSION);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
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
  const prevDividendsRef = useRef<DividendReceipt[]>(geminiDividends);
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken); }, [brapiToken]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
    localStorage.setItem(STORAGE_KEYS.ACCENT, accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (privacyMode) document.body.classList.add('privacy-blur');
    else document.body.classList.remove('privacy-blur');
    localStorage.setItem(STORAGE_KEYS.PRIVACY, String(privacyMode));
  }, [privacyMode]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    if (type !== 'info') setTimeout(() => setToast(null), 4000);
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      { ...notification, id: crypto.randomUUID(), timestamp: Date.now(), read: false },
      ...prev
    ]);
  }, []);

  useEffect(() => {
    if (geminiDividends.length > prevDividendsRef.current.length) {
      const newDivs = geminiDividends.filter(d => !prevDividendsRef.current.find(p => p.id === d.id));
      if (newDivs.length > 0) {
        addNotification({
          title: 'Novos Proventos',
          message: `${newDivs.length} novos pagamentos foram identificados pela IA.`,
          type: 'success'
        });
      }
    }
    prevDividendsRef.current = geminiDividends;
  }, [geminiDividends, addNotification]);

  // Controle de Versão e Atualizações
  const checkForUpdates = async (manual = false) => {
      if (manual) showToast('info', 'Buscando atualizações...');
      
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data: VersionData = await res.json();
          if (compareVersions(data.version, APP_VERSION) > 0) {
            // Nova atualização encontrada!
            setUpdateAvailable(true);
            setChangelogNotes(data.notes || []);
            setChangelogVersion(data.version);
            
            // Abre o modal automaticamente para mostrar o que há de novo (Proativo)
            setShowChangelog(true);

            showToast('info', 'Nova atualização disponível');
          } else if (manual) {
            showToast('success', 'Você já tem a versão mais recente.');
          }
        } else if (manual) {
             showToast('error', 'Falha ao buscar atualização.');
        }
      } catch(e) { 
          if (manual) showToast('error', 'Erro de conexão.');
      }
  };

  useEffect(() => {
    const handleVersionControl = async () => {
      const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
      
      // Checa se acabou de atualizar (Versão Atual > Ultima Vista)
      if (compareVersions(APP_VERSION, lastSeen) > 0) {
        try {
          const res = await fetch(`./version.json?t=${Date.now()}`);
          if (res.ok) {
            const data: VersionData = await res.json();
            // Mostra o changelog da versão ATUAL (Pós update)
            setChangelogNotes(data.notes || []);
            setChangelogVersion(APP_VERSION);
            setTimeout(() => setShowChangelog(true), 1500);
          }
        } catch(e) {}
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
      } else {
        // Se não acabou de atualizar, verifica se há uma NOVA disponível
        checkForUpdates();
      }
    };

    handleVersionControl();

    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') checkForUpdates();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = setInterval(() => checkForUpdates(), 15 * 60 * 1000);

    return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [showToast]);

  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    return txs
      .filter(t => t.ticker === ticker && t.date <= dateCom)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const memoizedData = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const nowStr = new Date().toISOString().substring(0, 7);
    const today = new Date();
    today.setHours(0,0,0,0);

    const contribution = transactions
      .filter(t => t.type === 'BUY' && t.date.startsWith(nowStr))
      .reduce((acc, t) => acc + (t.quantity * t.price), 0);

    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qty = Math.max(0, getQuantityOnDate(div.ticker, div.dateCom, sortedTxs));
      return { ...div, quantityOwned: qty, totalReceived: qty * div.rate };
    }).filter(r => r.totalReceived > 0);

    const divPaidMap: Record<string, number> = {};
    receipts.forEach(r => {
      const pDate = new Date(r.paymentDate + 'T12:00:00');
      if (pDate <= today) {
        divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived;
      }
    });

    const positions: Record<string, AssetPosition> = {};
    let gain = 0;
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
        const cost = p.quantity * p.averagePrice;
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? (cost + (t.quantity * t.price)) / p.quantity : 0;
      } else {
        gain += (t.quantity * t.price) - (t.quantity * p.averagePrice);
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
        segment: assetsMetadata[p.ticker]?.segment || p.segment
      }));

    return { portfolio: finalPortfolio, dividendReceipts: receipts, realizedGain: gain, monthlyContribution: contribution };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate, assetsMetadata]);

  const syncAll = useCallback(async (force = false) => {
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker.toUpperCase())));
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
      const aiData = await fetchUnifiedMarketData(tickers);
      setGeminiDividends(aiData.dividends);
      setAssetsMetadata(aiData.metadata);
      setSources(aiData.sources || []);
      if (force) showToast('success', 'Carteira Atualizada');
    } catch (e) {
      showToast('error', 'Falha na conexão');
    } finally {
      setIsRefreshing(false);
      setIsAiLoading(false);
    }
  }, [transactions, brapiToken, showToast]);

  useEffect(() => { syncAll(); }, []);

  return (
    <div className="min-h-screen transition-colors duration-500 bg-primary-light dark:bg-primary-dark">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm animate-fade-in-up" onClick={() => updateAvailable && setShowChangelog(true)}>
          <div className={`flex items-center gap-3 p-4 rounded-3xl shadow-2xl border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : toast.type === 'info' ? 'bg-indigo-500/90 border-indigo-400 cursor-pointer' : 'bg-rose-500/90 border-rose-400'} text-white`}>
            {updateAvailable ? <DownloadCloud className="w-5 h-5 animate-bounce" /> : toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="text-xs font-black uppercase tracking-wider">{toast.text}</span>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Minha Custódia' : 'Histórico de Ordens'}
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onSettingsClick={() => setShowSettings(true)}
        onRefresh={() => syncAll(true)}
        isRefreshing={isRefreshing || isAiLoading}
        updateAvailable={updateAvailable}
        onUpdateClick={() => setShowChangelog(true)}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={notifications.length}
      />

      <main className="max-w-screen-md mx-auto pt-2">
        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken}
            transactions={transactions} onImportTransactions={setTransactions}
            geminiDividends={geminiDividends} onImportDividends={setGeminiDividends}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
            theme={theme} onSetTheme={setTheme}
            accentColor={accentColor} onSetAccentColor={setAccentColor}
            privacyMode={privacyMode} onSetPrivacyMode={setPrivacyMode}
            appVersion={APP_VERSION}
            updateAvailable={updateAvailable}
            onCheckUpdates={() => checkForUpdates(true)}
            onShowChangelog={() => setShowChangelog(true)}
          />
        ) : (
          <div className="animate-fade-in">
            {currentTab === 'home' && <Home {...memoizedData} sources={sources} isAiLoading={isAiLoading} />}
            {currentTab === 'portfolio' && <Portfolio {...memoizedData} />}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])}
                onUpdateTransaction={(id, updated) => setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t))}
                onDeleteTransaction={(id) => setTransactions(p => p.filter(t => t.id !== id))}
                monthlyContribution={memoizedData.monthlyContribution}
              />
            )}
          </div>
        )}
      </main>

      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}

      <ChangelogModal 
        isOpen={showChangelog} 
        onClose={() => setShowChangelog(false)} 
        version={changelogVersion} 
        notes={changelogNotes}
        isUpdatePending={updateAvailable}
        onUpdate={performSmartUpdate}
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
