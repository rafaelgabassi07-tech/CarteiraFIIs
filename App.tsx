
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav, SwipeableModal, ChangelogModal, NotificationsModal, UpdateBanner } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType, AppNotification, AssetFundamentals, ReleaseNote, VersionData } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { CheckCircle2, DownloadCloud, AlertCircle, Loader2, Info } from 'lucide-react';

const APP_VERSION = '5.5.0'; 

const STORAGE_KEYS = {
  TXS: 'investfiis_v4_transactions',
  TOKEN: 'investfiis_v4_brapi_token',
  DIVS: 'investfiis_v4_div_cache',
  THEME: 'investfiis_theme',
  ACCENT: 'investfiis_accent_color',
  PRIVACY: 'investfiis_privacy_mode',
  PREFS_NOTIF: 'investfiis_prefs_notifications',
  INDICATORS: 'investfiis_v4_indicators',
  LAST_SEEN_VERSION: 'investfiis_last_version_seen'
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

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType) || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCENT) || '#0ea5e9');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  
  // Estados de Atualização
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  
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

  const prevDividendsRef = useRef<DividendReceipt[]>(geminiDividends);
  const [sources, setSources] = useState<{ web: { uri: string; title: string } }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken); }, [brapiToken]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);

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

  const fetchVersionJson = async () => {
      try {
          const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
              const data: VersionData = await res.json();
              if (compareVersions(data.version, APP_VERSION) > 0) {
                  setAvailableVersion(data.version);
                  setReleaseNotes(data.notes || []);
                  setIsUpdateAvailable(true); // Garante que a UI de update apareça se JSON for mais novo
                  return true;
              }
          }
      } catch (e) { console.warn("Erro check version", e); }
      return false;
  };

  // --- LÓGICA DE ATUALIZAÇÃO MANUAL E ESTRITA ---
  const checkForUpdates = useCallback(async (manual = false) => {
    // 1. Verificação de Service Worker (Instalado e Esperando)
    if ('serviceWorker' in navigator) {
        let reg = swRegistrationRef.current;
        
        // Se não tivermos a referência, buscamos novamente
        if (!reg) {
            reg = await navigator.serviceWorker.getRegistration();
            swRegistrationRef.current = reg || null;
        }

        if (reg) {
            if (manual) {
                // Check forçado no servidor
                try { await reg.update(); } catch(e){}
            }

            // Se JÁ houver um SW esperando (waiting), ativamos a UI de update
            if (reg.waiting) {
                setIsUpdateAvailable(true);
                // Busca metadados (notas) do JSON
                fetchVersionJson(); 
                return true;
            }
        }
    }

    // 2. Fallback JSON (para notificações visuais mesmo sem SW pronto ainda)
    const jsonUpdated = await fetchVersionJson();
    return jsonUpdated;
  }, []);

  const performUpdate = () => {
    if ('serviceWorker' in navigator && swRegistrationRef.current && swRegistrationRef.current.waiting) {
        // Envia mensagem para o SW que está ESPERANDO (waiting) para assumir (skipWaiting)
        // Isso é o único momento que a atualização é aplicada
        swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
        // Fallback simples se não houver SW ou erro
        window.location.reload();
    }
  };

  useEffect(() => {
     // Check inicial ao carregar
     checkForUpdates();
     
     if ('serviceWorker' in navigator) {
         let refreshing = false;

         // Listener: Quando o SW novo assumir o controle (após skipWaiting), recarrega a página
         navigator.serviceWorker.addEventListener('controllerchange', () => {
             if (!refreshing) {
                 refreshing = true;
                 window.location.reload();
             }
         });

         navigator.serviceWorker.getRegistration().then(reg => {
             if (reg) {
                 swRegistrationRef.current = reg;
                 
                 // Caso 1: Já existe um esperando ao abrir o app
                 if (reg.waiting) {
                     setIsUpdateAvailable(true);
                     fetchVersionJson();
                 }

                 // Caso 2: Detecta nova instalação em segundo plano
                 reg.addEventListener('updatefound', () => {
                     const newWorker = reg.installing;
                     if (newWorker) {
                         newWorker.addEventListener('statechange', () => {
                             // Quando o novo worker terminar de instalar e entrar em espera (installed/waiting)
                             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                 setIsUpdateAvailable(true);
                                 fetchVersionJson();
                             }
                         });
                     }
                 });
             }
         });
     }

     // Lógica de "O que há de novo" (apenas visual, não afeta o update do código)
     const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
     if (compareVersions(APP_VERSION, lastSeen) > 0) {
         localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
         fetch(`./version.json?t=${Date.now()}`).then(r => r.json()).then(data => {
             if (data.version === APP_VERSION) setReleaseNotes(data.notes || []);
         }).catch(() => {});
     }
  }, [checkForUpdates]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    if (type !== 'info') setTimeout(() => setToast(null), 3000);
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => {
      if (prev.some(n => n.title === notification.title && (Date.now() - n.timestamp < 86400000))) return prev;
      return [
        { ...notification, id: crypto.randomUUID(), timestamp: Date.now(), read: false },
        ...prev
      ];
    });
  }, []);

  const getQuantityOnDate = useCallback((ticker: string, dateCom: string, txs: Transaction[]) => {
    return txs
      .filter(t => t.ticker === ticker && t.date <= dateCom)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  const memoizedData = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const nowStr = new Date().toISOString().substring(0, 7);
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const contribution = transactions
      .filter(t => t.type === 'BUY' && t.date.startsWith(nowStr))
      .reduce((acc, t) => acc + (t.quantity * t.price), 0);

    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qty = Math.max(0, getQuantityOnDate(div.ticker, div.dateCom, sortedTxs));
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
        salesGain += (t.quantity * t.price) - (t.quantity * p.averagePrice);
        p.quantity -= t.quantity;
      }
    });

    const totalRealizedGain = salesGain + totalDividendsReceived;

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

    return { portfolio: finalPortfolio, dividendReceipts: receipts, realizedGain: totalRealizedGain, monthlyContribution: contribution };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate, assetsMetadata]);

  const checkDailyEvents = useCallback((currentDividends: DividendReceipt[], portfolio: AssetPosition[]) => {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      currentDividends.forEach(div => {
         const asset = portfolio.find(p => p.ticker === div.ticker);
         
         if (div.paymentDate === today && div.totalReceived > 0) {
             const yieldOnCost = asset && asset.averagePrice > 0 
                ? ((div.rate / asset.averagePrice) * 100).toFixed(2) 
                : null;
             
             let msg = `Caiu na conta! ${div.ticker} pagou R$ ${div.totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.`;
             if (yieldOnCost) {
                 msg += ` Isso representa um retorno de ${yieldOnCost}% sobre seu custo médio neste mês.`;
             }

             addNotification({
                 title: `💰 Proventos: ${div.ticker}`,
                 message: msg,
                 type: 'success',
                 category: 'payment'
             });
         }

         if (div.dateCom === today) {
             const yieldVal = asset && asset.currentPrice 
                ? ((div.rate / asset.currentPrice) * 100).toFixed(2) 
                : null;

             let msg = `Último dia para garantir R$ ${div.rate.toFixed(4)}/cota.`;
             if (yieldVal) {
                 msg += ` Yield estimado do anúncio: ${yieldVal}%.`;
             }
             msg += " Durma posicionado para receber.";

             addNotification({
                 title: `📅 Data Com: ${div.ticker}`,
                 message: msg,
                 type: 'warning',
                 category: 'datacom'
             });
         }
      });
  }, [addNotification]);

  useEffect(() => {
    if (geminiDividends.length > prevDividendsRef.current.length) {
      const newDivs = geminiDividends.filter(d => !prevDividendsRef.current.find(p => p.id === d.id));
      if (newDivs.length > 0) {
        const tickers = Array.from(new Set(newDivs.map(d => d.ticker))).join(', ');
        addNotification({
          title: 'Novos Anúncios Rastreados',
          message: `A IA identificou ${newDivs.length} novos pagamentos para: ${tickers}. Verifique o extrato.`,
          type: 'info',
          category: 'general'
        });
      }
    }
    prevDividendsRef.current = geminiDividends;
    
    if (memoizedData.portfolio.length > 0) {
        checkDailyEvents(geminiDividends, memoizedData.portfolio);
    }
  }, [geminiDividends, memoizedData.portfolio, addNotification, checkDailyEvents]);

  // Wrapper para checagem manual
  const handleManualUpdateCheck = async (): Promise<boolean> => {
    const hasUpdates = await checkForUpdates(true);
    return hasUpdates;
  };

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
      
      let startDate = '';
      if (transactions.length > 0) {
         startDate = transactions.reduce((min, t) => t.date < min ? t.date : min, transactions[0].date);
      }

      const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
      
      setGeminiDividends(aiData.dividends);
      setAssetsMetadata(aiData.metadata);
      setSources(aiData.sources || []);
      
      if (aiData.indicators && typeof aiData.indicators.ipca_cumulative === 'number') {
          setMarketIndicators({
              ipca: aiData.indicators.ipca_cumulative,
              startDate: aiData.indicators.start_date_used
          });
      }

      if (force) showToast('success', 'Carteira Sincronizada');
    } catch (e) {
      showToast('error', 'Sem conexão');
    } finally {
      setIsRefreshing(false);
      setIsAiLoading(false);
    }
  }, [transactions, brapiToken, showToast]);

  useEffect(() => { syncAll(); }, []);

  return (
    <div className="min-h-screen transition-colors duration-500 bg-primary-light dark:bg-primary-dark">
      {/* Banner de Atualização que estava faltando */}
      <UpdateBanner 
        isOpen={isUpdateAvailable} 
        onDismiss={() => setIsUpdateAvailable(false)} 
        onUpdate={() => setShowChangelog(true)} 
        version={availableVersion || 'Nova'} 
      />

      {/* Dynamic Pill Toast */}
      {toast && (
        <div 
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-fade-in-up" 
          onClick={() => isUpdateAvailable && setShowChangelog(true)}
        >
          <div className="flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-900/10 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/10 dark:border-black/5">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'info' ? 'bg-slate-800 dark:bg-slate-200' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                 {toast.type === 'info' ? (
                    <Loader2 className="w-4 h-4 text-white dark:text-slate-900 animate-spin" />
                 ) : toast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                 ) : (
                    <AlertCircle className="w-4 h-4 text-white" />
                 )}
             </div>
             
             <span className="text-xs font-bold text-white dark:text-slate-900 tracking-wide">
                {toast.text}
             </span>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'}
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onSettingsClick={() => setShowSettings(true)}
        onRefresh={() => syncAll(true)}
        isRefreshing={isRefreshing || isAiLoading}
        updateAvailable={isUpdateAvailable}
        onUpdateClick={() => setShowChangelog(true)}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={notifications.length}
        appVersion={APP_VERSION}
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
            updateAvailable={isUpdateAvailable}
            onCheckUpdates={handleManualUpdateCheck}
            onShowChangelog={() => setShowChangelog(true)}
          />
        ) : (
          <div className="animate-fade-in">
            {currentTab === 'home' && (
                <Home 
                    {...memoizedData} 
                    sources={sources} 
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
        version={availableVersion || APP_VERSION} 
        notes={releaseNotes}
        isUpdatePending={isUpdateAvailable}
        onUpdate={performUpdate}
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
