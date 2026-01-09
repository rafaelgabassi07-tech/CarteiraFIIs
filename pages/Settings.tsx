
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Download, Upload, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, RefreshCw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Box, Layers, Gauge, Info, Wallet, RotateCcw, Activity, Cloud, Loader2, Calendar, Target, TrendingUp, Search, ExternalLink, LogIn, LogOut, User, Mail, FileText, ScrollText, Aperture, CreditCard, Star, ArrowRightLeft, Clock, BarChart3, Signal, Zap } from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote, ReleaseNoteType } from '../types';
import { ThemeType } from '../App';
import { supabase } from '../services/supabase';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';

const BadgeDollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"/><path d="M12 8v8"/><path d="M9.5 10.5c5.5-2.5 5.5 5.5 0 3"/></svg>
);

type ServiceStatus = 'operational' | 'degraded' | 'error' | 'checking' | 'unknown';

interface SettingsProps {
  user: any;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  geminiDividends: DividendReceipt[];
  onImportDividends: (data: DividendReceipt[]) => void;
  onLogout: () => void;
  onResetApp: () => void;
  theme: ThemeType;
  onSetTheme: (theme: ThemeType) => void;
  accentColor: string;
  onSetAccentColor: (color: string) => void;
  privacyMode: boolean;
  onSetPrivacyMode: (enabled: boolean) => void;
  appVersion: string;
  availableVersion?: string | null;
  updateAvailable: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
  releaseNotes?: ReleaseNote[];
  lastChecked?: number | null; 
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  lastSyncTime?: Date | null;
  onSyncAll: (force: boolean) => Promise<void>;
  currentVersionDate: string | null;
  lastAiStatus: ServiceStatus;
  onForceUpdate: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout,
  transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, availableVersion, updateAvailable, onCheckUpdates, onShowChangelog, releaseNotes, lastChecked,
  pushEnabled, onRequestPushPermission, lastSyncTime, onSyncAll, currentVersionDate, lastAiStatus, onForceUpdate
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates' | 'about' | 'privacy'>('menu');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);
  
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'offline'>('idle');

  const [healthStatus, setHealthStatus] = useState<{ supabase: ServiceStatus; brapi: ServiceStatus }>({
    supabase: 'checking',
    brapi: 'checking',
  });
  const [isServicesChecking, setIsServicesChecking] = useState(false);
  
  const [cachedItemsCount, setCachedItemsCount] = useState({ quotes: 0, divs: 0 });
  const [networkType, setNetworkType] = useState<string>('Unknown');
  const [estLatency, setEstLatency] = useState<number | null>(null);

  const [storageData, setStorageData] = useState({ 
    totalBytes: 0,
    breakdown: { quotes: 0, divs: 0 } 
  });

  const [notifyDivs, setNotifyDivs] = useState(() => localStorage.getItem('investfiis_notify_divs') !== 'false');
  const [notifyDataCom, setNotifyDataCom] = useState(() => localStorage.getItem('investfiis_notify_datacom') !== 'false');
  const [notifyGoals, setNotifyGoals] = useState(() => localStorage.getItem('investfiis_notify_goals') !== 'false');
  const [notifyMarket, setNotifyMarket] = useState(() => localStorage.getItem('investfiis_notify_market') === 'true');
  const [notifyUpdates, setNotifyUpdates] = useState(() => localStorage.getItem('investfiis_notify_updates') !== 'false');
  
  // Settings States
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMarketUpdating, setIsMarketUpdating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Diagnostics State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagState, setDiagState] = useState<{
    step: 'idle' | 'running' | 'done' | 'error';
    logs: { id: number, text: string, type: 'info' | 'success' | 'error' | 'warn' }[];
    latency: number | null;
    cloudCount: number | null;
    localCount: number;
    integrity: boolean | null;
    writeTest: boolean | null;
  }>({
    step: 'idle',
    logs: [],
    latency: null,
    cloudCount: null,
    localCount: transactions.length,
    integrity: null,
    writeTest: null
  });

  // Modal States
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showForceUpdateConfirm, setShowForceUpdateConfirm] = useState(false);
  
  // State for Updates screen animation
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  // Função centralizada de verificação de serviços
  const runServiceCheck = useCallback(async () => {
    setIsServicesChecking(true);
    setHealthStatus({ supabase: 'checking', brapi: 'checking' });
    setEstLatency(null);

    // 1. Connection Info
    // @ts-ignore
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) setNetworkType(conn.effectiveType ? conn.effectiveType.toUpperCase() : (conn.type || 'WIFI'));
    
    // 2. Cache Info
    const quotesCache = localStorage.getItem('investfiis_v3_quote_cache');
    const qCount = quotesCache ? Object.keys(JSON.parse(quotesCache)).length : 0;
    setCachedItemsCount(prev => ({ ...prev, quotes: qCount }));

    const start = performance.now();
    
    const checkSupabase = async (): Promise<ServiceStatus> => {
        if (!user?.id) return 'error';
        const { error } = await supabase.from('transactions').select('id', { count: 'exact', head: true });
        return error ? 'error' : 'operational';
    };

    const checkBrapi = async (): Promise<ServiceStatus> => {
        try {
            if (!process.env.BRAPI_TOKEN) return 'error';
            const res = await fetch(`https://brapi.dev/api/quote/PETR4?token=${process.env.BRAPI_TOKEN}`);
            return res.ok ? 'operational' : 'degraded';
        } catch {
            return 'error';
        }
    };

    const [supabaseResult, brapiResult] = await Promise.all([checkSupabase(), checkBrapi()]);
    const end = performance.now();
    
    setEstLatency(Math.round(end - start));
    setHealthStatus({
        supabase: supabaseResult,
        brapi: brapiResult
    });
    setIsServicesChecking(false);
  }, [user]);

  // Efeito para verificar a saúde dos serviços quando a seção é aberta
  useEffect(() => {
    if (activeSection === 'integrations') {
        runServiceCheck();
    }
  }, [activeSection, runServiceCheck]);


  // Scroll Reset Effect
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    if (updateAvailable) setCheckStatus('available');
  }, [updateAvailable]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { localStorage.setItem('investfiis_notify_divs', String(notifyDivs)); }, [notifyDivs]);
  useEffect(() => { localStorage.setItem('investfiis_notify_datacom', String(notifyDataCom)); }, [notifyDataCom]);
  useEffect(() => { localStorage.setItem('investfiis_notify_goals', String(notifyGoals)); }, [notifyGoals]);
  useEffect(() => { localStorage.setItem('investfiis_notify_market', String(notifyMarket)); }, [notifyMarket]);
  useEffect(() => { localStorage.setItem('investfiis_notify_updates', String(notifyUpdates)); }, [notifyUpdates]);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const calculateStorage = () => {
    const getKeySize = (key: string) => {
        const item = localStorage.getItem(key);
        return item ? new Blob([item]).size : 0;
    };
    setStorageData({
        totalBytes: getKeySize('investfiis_v3_quote_cache') + getKeySize('investfiis_v4_div_cache'),
        breakdown: { 
            quotes: getKeySize('investfiis_v3_quote_cache'), 
            divs: getKeySize('investfiis_v4_div_cache') 
        }
    });
  };

  useEffect(() => { calculateStorage(); }, [geminiDividends, activeSection, message]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };
  
  const handleForceSync = async () => { 
      setIsSyncing(true); 
      try {
        await onSyncAll(false); // Sync normal do cloud
        showMessage('success', 'Nuvem sincronizada.');
      } catch (e) {
        showMessage('error', 'Erro ao sincronizar nuvem.');
      } finally {
        setIsSyncing(false); 
      }
  };

  const handleForceMarketUpdate = async () => {
      setIsMarketUpdating(true);
      try {
          // Limpeza profunda de dados de dividendos/IA antes de atualizar
          onImportDividends([]); // Limpa estado visual imediatamente
          localStorage.removeItem('investfiis_v4_div_cache'); // Limpa cache persistente do app
          localStorage.removeItem('investfiis_gemini_cache_v13_3pro'); // Limpa cache específico do serviço Gemini
          
          await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para UI reagir

          await onSyncAll(true); // Force = true limpa caches de mercado/IA (no serviço) e recarrega
          showMessage('success', 'Dados de mercado recarregados!');
      } catch (e) {
          showMessage('error', 'Falha ao atualizar mercado.');
      } finally {
          setIsMarketUpdating(false);
      }
  };

  const handleClearQuoteCache = () => { localStorage.removeItem('investfiis_v3_quote_cache'); calculateStorage(); showMessage('success', 'Cache limpo.'); };
  const handleClearDivCache = () => { localStorage.removeItem('investfiis_v4_div_cache'); onImportDividends([]); calculateStorage(); showMessage('success', 'Dados de IA limpos.'); };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ transactions, geminiDividends, version: appVersion, exportDate: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup_invest_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showMessage('success', 'Backup exportado!');
  };

  const handleImportClick = () => fileInputRef.current?.click();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToRestore(file);
    }
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!fileToRestore) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (typeof json !== 'object' || json === null || !Array.isArray(json.transactions)) {
          showMessage('error', 'Arquivo de backup inválido ou corrompido.');
          return;
        }
        onImportTransactions(json.transactions);
        if (json.geminiDividends && Array.isArray(json.geminiDividends)) {
          onImportDividends(json.geminiDividends);
        }
      } catch {
        showMessage('error', 'Erro ao processar o arquivo de backup.');
      } finally {
        setFileToRestore(null);
      }
    };
    reader.onerror = () => {
       showMessage('error', 'Não foi possível ler o arquivo.');
       setFileToRestore(null);
    };
    reader.readAsText(fileToRestore);
  };

  const handleCheckUpdate = async () => {
    if (updateAvailable) { onShowChangelog(); return; }
    if (!navigator.onLine) { setCheckStatus('offline'); setTimeout(() => setCheckStatus('idle'), 3000); return; }
    setCheckStatus('checking');
    const [_, hasUpdate] = await Promise.all([new Promise(r => setTimeout(r, 2000)), onCheckUpdates()]);
    if (hasUpdate) setCheckStatus('available');
    else { setCheckStatus('latest'); setTimeout(() => setCheckStatus('idle'), 3000); }
  };

  // Helper for Market Status
  const getMarketStatus = () => {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0 = Domingo, 6 = Sábado
    const utcHour = now.getUTCHours();
    
    // Horário de Brasília é UTC-3 (aproximado)
    const brHour = (utcHour - 3 + 24) % 24;
    
    const isWeekend = utcDay === 0 || utcDay === 6;
    
    if (isWeekend) return { label: 'Fechado (FDS)', color: 'text-slate-500', bg: 'bg-slate-200 dark:bg-white/10', icon: Moon };
    
    // Mercado B3 aproximado: 10:00 - 17:00 (Pregão) | 17:00 - 18:00 (After)
    if (brHour >= 10 && brHour < 17) return { label: 'Pregão Aberto', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Activity };
    if (brHour >= 17 && brHour < 18) return { label: 'After-market', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock };
    
    return { label: 'Fechado', color: 'text-slate-500', bg: 'bg-slate-200 dark:bg-white/10', icon: Moon };
  };

  const marketStatus = getMarketStatus();

  // Diagnostics Logic
  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    setDiagState(prev => ({
        ...prev,
        logs: [...prev.logs, { id: Date.now(), text, type }]
    }));
  };

  const runDiagnostics = async () => {
    setDiagState({ step: 'running', logs: [], latency: null, cloudCount: null, localCount: transactions.length, integrity: null, writeTest: null });
    
    addLog('Iniciando diagnósticos profundos...');
    
    if (!navigator.onLine) {
        addLog('Dispositivo offline. Testes cancelados.', 'error');
        setDiagState(prev => ({ ...prev, step: 'error' }));
        return;
    }
    
    if (!user) {
        addLog('Erro crítico: Usuário não autenticado.', 'error');
        setDiagState(prev => ({ ...prev, step: 'error' }));
        return;
    }

    try {
        // 1. Teste de Latência
        addLog('Testando latência de rede...');
        const start = performance.now();
        
        const { count, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        const end = performance.now();
        const latency = Math.round(end - start);
        
        if (countError) throw countError;
        setDiagState(prev => ({ ...prev, latency, cloudCount: count }));
        addLog(`Latência: ${latency}ms. Itens na nuvem: ${count}`, latency < 500 ? 'success' : 'warn');

        // 2. Integridade
        const localCount = transactions.length;
        if (localCount === count) {
            setDiagState(prev => ({ ...prev, integrity: true }));
            addLog('Integridade de contagem: OK', 'success');
        } else {
            setDiagState(prev => ({ ...prev, integrity: false }));
            addLog(`Discrepância detectada! Local: ${localCount} vs Nuvem: ${count}`, 'error');
        }

        // 3. Teste de Escrita (Round Trip)
        addLog('Testando permissões de escrita...');
        const testTx = {
            user_id: user.id,
            ticker: 'DIAG_TEST',
            type: 'BUY',
            quantity: 0,
            price: 0,
            date: new Date().toISOString(),
            asset_type: 'FII'
        };
        
        const { data: inserted, error: insertError } = await supabase.from('transactions').insert(testTx).select();
        if (insertError) throw insertError;
        
        if (inserted && inserted.length > 0) {
            const idToDelete = inserted[0].id;
            const { error: deleteError } = await supabase.from('transactions').delete().eq('id', idToDelete);
            if (deleteError) throw deleteError;
            setDiagState(prev => ({ ...prev, writeTest: true }));
            addLog('Teste de escrita e remoção: Sucesso', 'success');
        } else {
            throw new Error("Falha ao inserir registro de teste");
        }

        setDiagState(prev => ({ ...prev, step: 'done' }));
        addLog('Diagnóstico concluído com sucesso.', 'success');

    } catch (e: any) {
        console.error(e);
        addLog(`Erro crítico: ${e.message}`, 'error');
        setDiagState(prev => ({ ...prev, step: 'error' }));
    }
  };

  const getSectionTitle = (section: string) => {
    switch(section) {
        case 'notifications': return 'Notificações';
        case 'appearance': return 'Aparência';
        case 'privacy': return 'Privacidade';
        case 'integrations': return 'Conexões e Serviços';
        case 'data': return 'Alocação e Backup';
        case 'system': return 'Sistema';
        case 'updates': return 'Atualizações';
        case 'about': return 'Sobre o App';
        default: return 'Ajustes';
    }
  };

  const handleScroll = () => {
    if (notesContainerRef.current) {
      setIsHeaderCompact(notesContainerRef.current.scrollTop > 20);
    }
  };

  const getNoteIconAndColor = (type: ReleaseNoteType) => {
    switch (type) {
      case 'feat': return { Icon: Sparkles, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
      case 'fix': return { Icon: Check, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
      case 'ui': return { Icon: Palette, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-500/10' };
      case 'perf': return { Icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' };
      default: return { Icon: Star, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-white/10' };
    }
  };

  const MenuItem = ({ icon: Icon, label, value, onClick, isDestructive, hasUpdate, colorClass }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all border-b last:border-0 border-slate-100 dark:border-white/5 group gap-4`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isDestructive ? 'bg-rose-500/10 text-rose-500' : colorClass || 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}><Icon className="w-5 h-5" strokeWidth={2.5} /></div>
            <span className={`text-sm font-semibold text-left ${isDestructive ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {value && <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{value}</span>}
            {hasUpdate && <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>}
            <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
    </button>
  );

  const Section = ({ title, children }: any) => (
    <div className="mb-6 anim-fade-in-up is-visible">
        {title && <h3 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>}
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-white/5">{children}</div>
    </div>
  );

  const Toggle = ({ label, checked, onChange, icon: Icon, description }: any) => (
    <div onClick={onChange} className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer active:scale-[0.99] transition-all border border-slate-100 dark:border-white/5 ${checked ? 'bg-white dark:bg-[#0f172a] shadow-sm' : 'bg-slate-50 dark:bg-white/5'}`}>
        <div className="flex items-center gap-3">
          {Icon && <div className={`p-2 rounded-lg ${checked ? 'bg-accent/10 text-accent' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}><Icon className="w-4 h-4" strokeWidth={2.2} /></div>}
          <div>
            <span className={`text-sm font-semibold block ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</span>
            {description && <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{description}</p>}
          </div>
        </div>
        <div className={`transition-all duration-300 ${checked ? 'text-accent' : 'text-slate-300 dark:text-slate-600'}`}>
            {checked ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
        </div>
    </div>
  );

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
      {/* PREMIUM TOAST NOTIFICATION (LOCAL) */}
      {message && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none w-full max-w-sm px-4">
            <div className={`
              pointer-events-auto mx-auto flex items-center gap-3 p-2 pr-5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border transition-all duration-300 anim-fade-in-up is-visible
              ${message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10' 
                : message.type === 'error' 
                  ? 'bg-rose-500/10 border-rose-500/20 shadow-rose-500/10'
                  : 'bg-[#0f172a] dark:bg-white border-slate-200/20 dark:border-white/20 shadow-black/10'
              }
            `}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                 message.type === 'success' ? 'bg-emerald-500 text-white' :
                 message.type === 'error' ? 'bg-rose-500 text-white' :
                 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
               }`}>
                 {message.type === 'info' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} /> : 
                  message.type === 'success' ? <Check className="w-4 h-4" strokeWidth={3} /> : 
                  <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />}
               </div>
               <div className="min-w-0">
                 <p className={`text-[11px] font-bold leading-tight ${
                    message.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                    message.type === 'error' ? 'text-rose-700 dark:text-rose-400' :
                    'text-slate-900 dark:text-slate-900'
                 }`}>
                    {message.type === 'success' ? 'Sucesso' : message.type === 'error' ? 'Atenção' : 'Info'}
                 </p>
                 <p className={`text-[10px] font-semibold truncate ${
                    message.type === 'success' ? 'text-emerald-600/80 dark:text-emerald-300/80' :
                    message.type === 'error' ? 'text-rose-600/80 dark:text-rose-300/80' :
                    'text-slate-600 dark:text-slate-700'
                 }`}>
                    {message.text}
                 </p>
               </div>
            </div>
        </div> 
      )}

      {activeSection === 'menu' ? (
        <>
            <div className="mb-6 anim-fade-in-up is-visible">
               <h3 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta Cloud</h3>
               <div className="rounded-[2rem] overflow-hidden shadow-sm border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0f172a]">
                 <div className="p-6 space-y-4">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><User className="w-6 h-6" /></div>
                         <div className="overflow-hidden"><h3 className="font-bold text-slate-900 dark:text-white truncate">Conectado</h3><p className="text-xs text-slate-500 truncate">{user ? user.email : 'Carregando...'}</p></div>
                     </div>
                     <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all"><LogOut className="w-4 h-4" /> Sair da Conta</button>
                 </div>
               </div>
            </div>

            <Section title="Preferências">
                <MenuItem icon={Palette} label="Aparência" onClick={() => setActiveSection('appearance')} colorClass="bg-indigo-500/10 text-indigo-500" />
                <MenuItem icon={Bell} label="Notificações" onClick={() => setActiveSection('notifications')} value={pushEnabled ? 'Ativado' : ''} colorClass="bg-amber-500/10 text-amber-500" />
                <MenuItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" onClick={() => setActiveSection('privacy')} value={privacyMode ? 'Ativado' : 'Público'} colorClass="bg-slate-500/10 text-slate-500" />
            </Section>

            <Section title="Dados & Sincronização">
                <MenuItem icon={Globe} label="Conexões e Serviços" onClick={() => setActiveSection('integrations')} value="Online" colorClass="bg-sky-500/10 text-sky-500" />
                <MenuItem icon={Database} label="Backup e IA Cache" onClick={() => setActiveSection('data')} value={formatBytes(storageData.totalBytes)} colorClass="bg-emerald-500/10 text-emerald-500" />
            </Section>

            <Section title="Sistema">
                <MenuItem icon={RefreshCcw} label="Atualizações" onClick={() => setActiveSection('updates')} hasUpdate={updateAvailable} value={`v${appVersion}`} colorClass="bg-purple-500/10 text-purple-500" />
                <MenuItem icon={Info} label="Sobre o APP" onClick={() => setActiveSection('about')} colorClass="bg-slate-500/10 text-slate-500" />
                <MenuItem icon={ShieldAlert} label="Resetar Aplicativo" onClick={() => setActiveSection('system')} isDestructive />
            </Section>
            
            <div className="text-center mt-8 opacity-40"><p className="text-[10px] font-bold uppercase tracking-widest">InvestFIIs Ultra</p><p className="text-[9px]">Versão {appVersion}</p></div>
        </>
      ) : (
        <div className="anim-fade-in is-visible pt-2">
          <div className="flex items-center gap-3 mb-6 px-1">
              <button 
                onClick={() => setActiveSection('menu')} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
              >
                  <ArrowLeft className="w-4 h-4" strokeWidth={3} />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {getSectionTitle(activeSection)}
              </h2>
          </div>
          
          {/* --- CONTENT OF SECTIONS --- */}
          
          {/* UPDATES SECTION - Kept as is */}
          {activeSection === 'updates' && (
             <div className="h-[calc(100dvh-140px)] flex flex-col bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-xl">
                <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 ease-out-quint ${isHeaderCompact ? 'py-6 border-b border-slate-100 dark:border-white/5' : 'py-12'}`}>
                    <div className={`relative mb-4 transition-all duration-500 ${isHeaderCompact ? 'scale-75' : 'scale-100'}`}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-700 ${checkStatus === 'checking' ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : updateAvailable ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {checkStatus === 'checking' ? (
                                <Loader2 className="w-8 h-8 animate-spin" strokeWidth={2} />
                            ) : updateAvailable ? (
                                <Download className="w-8 h-8 animate-bounce" strokeWidth={2} />
                            ) : (
                                <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
                            )}
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                        {checkStatus === 'checking' ? 'Buscando...' : updateAvailable ? 'Nova Versão Disponível' : 'Tudo Atualizado'}
                    </h2>
                    
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
                        {updateAvailable ? `Versão ${availableVersion} pronta para instalar.` : `Você está na versão ${appVersion}`}
                    </p>

                    <button 
                        onClick={handleCheckUpdate}
                        disabled={checkStatus === 'checking'}
                        className={`group relative overflow-hidden px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 ${
                            updateAvailable 
                            ? 'bg-amber-500 text-white shadow-amber-500/20' 
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        }`}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {checkStatus === 'checking' ? 'Verificando...' : updateAvailable ? 'Atualizar Agora' : 'Buscar Atualizações'}
                        </span>
                    </button>
                    {lastChecked && (
                        <p className="text-[10px] text-slate-400 mt-3 opacity-60 font-mono">
                            Última verificação: {new Date(lastChecked).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
                
                <div ref={notesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
                   <div className="flex items-center gap-2 px-2">
                       <Sparkles className="w-4 h-4 text-indigo-500" />
                       <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                           Novidades da Versão
                       </h3>
                   </div>
                   {(releaseNotes && releaseNotes.length > 0) ? (
                      <div className="space-y-4">
                         {releaseNotes.map((note, i) => {
                            const { Icon, color, bg } = getNoteIconAndColor(note.type);
                            return (
                              <div key={i} className="flex gap-4 items-start">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg} ${color}`}>
                                      <Icon className="w-4 h-4" strokeWidth={2.5} />
                                  </div>
                                  <div className="pt-1">
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">{note.title}</h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{note.desc}</p>
                                  </div>
                              </div>
                            );
                         })}
                      </div>
                   ) : (
                       <div className="text-center py-10 opacity-50">
                           <p className="text-xs text-slate-400">Nenhuma nota de atualização disponível.</p>
                       </div>
                   )}
                   
                   <div className="pt-8 border-t border-slate-100 dark:border-white/5 mt-4">
                       <button 
                           onClick={() => setShowForceUpdateConfirm(true)}
                           className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest py-2"
                       >
                           Problemas? Reinstalar App
                       </button>
                   </div>
                </div>
             </div>
          )}

          {/* INTEGRATIONS & SERVICES DASHBOARD (ENHANCED) */}
          {activeSection === 'integrations' && (
            <div className="space-y-6">
                
                {/* 1. Network & Status Compact Bar */}
                <div className="flex items-center justify-between bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{isOnline ? 'Sistema Online' : 'Offline'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                            <span className="flex items-center gap-1.5"><Signal className="w-3 h-3" /> {networkType}</span>
                            <div className="h-3 w-[1px] bg-slate-200 dark:bg-white/10"></div>
                            <span className="flex items-center gap-1.5"><Gauge className="w-3 h-3" /> {estLatency ? `${estLatency}ms` : '-'}</span>
                        </div>
                        <button 
                            onClick={runServiceCheck} 
                            disabled={isServicesChecking}
                            className={`w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all active:scale-95 ${isServicesChecking ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* 2. Primary Actions - Manual Control (RESTORED & PROMINENT) */}
                <Section title="Controle Manual">
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleForceMarketUpdate}
                            disabled={isMarketUpdating}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-600 dark:text-indigo-400 p-4 rounded-2xl border border-indigo-500/20 flex flex-col items-center justify-center gap-2 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                {isMarketUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">Atualizar Mercado</span>
                                <span className="text-[9px] opacity-70 block leading-tight">Forçar nova busca completa</span>
                            </div>
                        </button>

                        <button 
                            onClick={handleForceSync}
                            disabled={isSyncing}
                            className="bg-sky-500/10 hover:bg-sky-500/20 active:scale-95 text-sky-600 dark:text-sky-400 p-4 rounded-2xl border border-sky-500/20 flex flex-col items-center justify-center gap-2 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-black uppercase tracking-wider block mb-0.5">Sincronizar Nuvem</span>
                                <span className="text-[9px] opacity-70 block leading-tight">Backup instantâneo</span>
                            </div>
                        </button>
                    </div>
                </Section>

                {/* 3. Service Detail Cards (Refined) */}
                <Section title="Infraestrutura & Serviços">
                    <div className="space-y-3">
                        {/* Supabase Card */}
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><Database className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Supabase Cloud</h4>
                                    <p className="text-[9px] text-slate-400 font-mono">AWS sa-east-1 • WSS</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${healthStatus.supabase === 'operational' ? 'bg-emerald-500/10 text-emerald-500' : healthStatus.supabase === 'checking' ? 'bg-slate-100 text-slate-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {healthStatus.supabase === 'operational' ? 'Online' : healthStatus.supabase === 'checking' ? 'Checking...' : 'Error'}
                            </div>
                        </div>

                        {/* Brapi Card */}
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><BarChart3 className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Brapi Finance</h4>
                                    <p className="text-[9px] text-slate-400 font-mono">Delay 15m • Cache: {cachedItemsCount.quotes}</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${healthStatus.brapi === 'operational' ? 'bg-blue-500/10 text-blue-500' : healthStatus.brapi === 'checking' ? 'bg-slate-100 text-slate-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {healthStatus.brapi === 'operational' ? 'Connected' : healthStatus.brapi === 'checking' ? 'Pinging...' : 'Degraded'}
                            </div>
                        </div>

                        {/* Gemini Card */}
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500"><Sparkles className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Google Gemini</h4>
                                        <p className="text-[9px] text-slate-400 font-mono">Model: 2.5 Pro (Stable)</p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${lastAiStatus === 'operational' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {lastAiStatus === 'operational' ? 'Ready' : 'Quota Limit'}
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden flex items-center">
                                <div className={`h-full rounded-full transition-all duration-500 ${lastAiStatus === 'operational' ? 'bg-indigo-500 w-[15%]' : 'bg-amber-500 w-[95%]'}`}></div>
                            </div>
                            <p className="text-[8px] text-right text-slate-400 mt-1 font-bold uppercase tracking-wider">Uso Estimado da Cota</p>
                        </div>
                    </div>
                </Section>

                {/* Advanced Diagnostics Button (Secondary) */}
                <div className="pt-2 pb-6">
                     <button onClick={() => { setShowDiagnostics(true); runDiagnostics(); }} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Activity className="w-5 h-5" /></div>
                            <div className="text-left">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block uppercase tracking-wide">Diagnóstico Avançado</span>
                                <span className="text-[9px] text-slate-400">Logs técnicos e testes de integridade</span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-8">
              <div>
                  <h3 className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema do Sistema</h3>
                  <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-[1.5rem] flex items-center">
                      {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map((mode) => (
                          <button 
                            key={mode.id} 
                            onClick={() => onSetTheme(mode.id as ThemeType)} 
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.2rem] transition-all duration-300 ${theme === mode.id ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                          >
                              <mode.icon className="w-4 h-4" strokeWidth={2.5} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">{mode.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-500/10 to-slate-700/10 p-6 rounded-[2.5rem] border border-slate-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    {privacyMode ? <EyeOff className="w-10 h-10 text-slate-500 mx-auto mb-3" /> : <Eye className="w-10 h-10 text-slate-500 mx-auto mb-3" />}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Configurações de Privacidade</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[200px] mx-auto">Oculta valores sensíveis da tela para evitar olhares curiosos em público.</p>
                    <button 
                        onClick={() => onSetPrivacyMode(!privacyMode)}
                        className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-rose-500 text-white' : 'bg-slate-700 text-white'}`}
                    >
                        {privacyMode ? 'Desativar Agora' : 'Ativar Modo Privacidade'}
                    </button>
                </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-12 py-10">
                <div className="text-center relative">
                    <div className="absolute inset-0 bg-accent blur-[80px] opacity-20 rounded-full"></div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-white dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
                            <Wallet className="w-10 h-10 text-slate-900 dark:text-white" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">InvestFIIs</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">v{appVersion} Pro</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 w-full max-w-xs text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Feito com paixão para simplificar sua jornada de investimentos. Focado em privacidade, performance e elegância.
                    </p>
                    
                    <div className="flex justify-center gap-8 pt-4 border-t border-slate-200 dark:border-white/5 w-3/4 mx-auto">
                        <button onClick={() => setShowTerms(true)} className="text-[10px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors">Termos</button>
                        <button onClick={() => setShowPrivacy(true)} className="text-[10px] font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors">Privacidade</button>
                    </div>
                </div>
                
                <div className="text-[9px] text-slate-300 dark:text-slate-600 font-mono">
                    Build 2025.06.29 • Cloud Only
                </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-[2.5rem] border border-amber-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <Bell className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Push Notifications</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[200px] mx-auto">Receba alertas em tempo real sobre dividendos e eventos da carteira.</p>
                    <button 
                        onClick={onRequestPushPermission}
                        className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all ${pushEnabled ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                    >
                        {pushEnabled ? 'Ativado ✓' : 'Ativar Notificações'}
                    </button>
                    {pushEnabled && <p className="text-[9px] text-slate-400 mt-2 font-medium">Toque novamente para desativar</p>}
                </div>

                <div className="mb-6 anim-fade-in-up is-visible">
                    <h3 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas Específicos</h3>
                    <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-white/5 space-y-3 p-3 bg-white dark:bg-[#0f172a]">
                        <Toggle label="Pagamentos Recebidos" description="Quando o dinheiro cair na conta" icon={BadgeDollarSignIcon} checked={notifyDivs} onChange={() => setNotifyDivs(!notifyDivs)} />
                        <Toggle label="Data Com" description="Avisar no último dia para garantir proventos" icon={Calendar} checked={notifyDataCom} onChange={() => setNotifyDataCom(!notifyDataCom)} />
                        <Toggle label="Metas Atingidas" description="Magic Number e objetivos de renda" icon={Target} checked={notifyGoals} onChange={() => setNotifyGoals(!notifyGoals)} />
                        <Toggle label="Atualizações do App" description="Novas versões e melhorias" icon={Rocket} checked={notifyUpdates} onChange={() => setNotifyUpdates(!notifyUpdates)} />
                    </div>
                </div>
            </div>
          )}

          {activeSection === 'data' && (
             <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 rounded-[2.5rem] border border-indigo-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <Database className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Backup & Restauração</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-[250px] mx-auto">Salve uma cópia de segurança dos seus dados ou restaure um backup anterior.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExport} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                            <Download className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Exportar</span>
                        </button>
                        <button onClick={handleImportClick} className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white p-4 rounded-3xl flex flex-col items-center justify-center gap-2 border border-slate-200/50 dark:border-white/5 active:scale-95 transition-all">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Importar</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                </div>

                 <Section title="Gerenciamento de Cache">
                    <div className="bg-white dark:bg-[#0f172a] p-4 space-y-2">
                        <button onClick={handleClearQuoteCache} className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Limpar Cache de Cotações</span>
                            <span className="text-xs text-slate-400 font-mono">{formatBytes(storageData.breakdown.quotes)}</span>
                        </button>
                        <button onClick={handleClearDivCache} className="w-full flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Limpar Dados de IA (Gemini)</span>
                            <span className="text-xs text-slate-400 font-mono">{formatBytes(storageData.breakdown.divs)}</span>
                        </button>
                    </div>
                 </Section>
             </div>
          )}

          {activeSection === 'system' && (
              <div className="space-y-6">
                  <Section title="Perigo">
                      <div className="p-6 bg-rose-50 dark:bg-rose-500/5 flex flex-col items-center text-center">
                          <ShieldAlert className="w-10 h-10 text-rose-500 mb-3" />
                          <h3 className="font-bold text-rose-600 dark:text-rose-400 mb-1">Apagar Tudo</h3>
                          <p className="text-xs text-rose-400 mb-4 max-w-[200px]">Esta ação removerá todas as transações e configurações permanentemente.</p>
                          <button onClick={onResetApp} className="px-6 py-3 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 shadow-lg shadow-rose-500/20">Confirmar Reset</button>
                      </div>
                  </Section>
              </div>
          )}
        </div>
      )}

      {/* Cloud Diagnostics Modal */}
      <SwipeableModal isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)}>
        {/* ... (mantido igual ao original) ... */}
        <div className="px-6 py-4 pb-8 min-h-[50vh]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">Diagnóstico</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saúde da Nuvem</p>
                    </div>
                </div>
                {diagState.step !== 'running' && (
                    <button onClick={runDiagnostics} className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">Re-testar</button>
                )}
            </div>

            <div className="space-y-4 font-mono text-xs">
                {/* Console Log */}
                <div className="bg-slate-900 rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto border border-white/10 shadow-inner">
                    {diagState.logs.length === 0 ? (
                        <span className="text-slate-500 animate-pulse">Aguardando início...</span>
                    ) : (
                        diagState.logs.map(log => (
                            <div key={log.id} className={`mb-1.5 flex gap-2 ${
                                log.type === 'error' ? 'text-rose-400' :
                                log.type === 'success' ? 'text-emerald-400' :
                                log.type === 'warn' ? 'text-amber-400' :
                                'text-slate-300'
                            }`}>
                                <span className="opacity-50">[{new Date(log.id).toLocaleTimeString('pt-BR', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                <span>{log.text}</span>
                            </div>
                        ))
                    )}
                    {diagState.step === 'running' && <div className="mt-2 h-1 w-4 bg-emerald-500 animate-pulse"></div>}
                </div>

                {/* Summary Cards */}
                {diagState.step !== 'idle' && (
                    <div className="grid grid-cols-2 gap-3 anim-fade-in-up is-visible">
                        <div className={`p-4 rounded-2xl border ${diagState.latency && diagState.latency < 500 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Latência</p>
                            <p className="text-xl font-black">{diagState.latency ? `${diagState.latency}ms` : '...'}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border ${diagState.integrity === false ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Sincronia</p>
                            <p className="text-xl font-black">{diagState.cloudCount !== null ? `${diagState.localCount}/${diagState.cloudCount}` : '...'}</p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {diagState.integrity === false && (
                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-center anim-fade-in-up is-visible">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-amber-500 font-bold mb-3">Discrepância Detectada</p>
                        <button 
                            onClick={() => { setShowDiagnostics(false); onSyncAll(true); }}
                            className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowRightLeft className="w-4 h-4" /> Forçar Ressincronização
                        </button>
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>

      {/* Force Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={showForceUpdateConfirm}
        title="Reinstalar App"
        message="Isso limpará o cache do navegador e recarregará a versão mais recente do servidor. Útil se o app estiver travado ou com comportamento estranho. Deseja continuar?"
        onConfirm={() => { onForceUpdate(); setShowForceUpdateConfirm(false); }}
        onCancel={() => setShowForceUpdateConfirm(false)}
      />

      <ConfirmationModal
        isOpen={!!fileToRestore}
        title="Restaurar Backup"
        message="Atenção: Restaurar um backup substituirá TODOS os seus dados atuais. Esta ação não pode ser desfeita. Deseja continuar?"
        onConfirm={handleConfirmRestore}
        onCancel={() => setFileToRestore(null)}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sair da Conta"
        message="Deseja realmente desconectar sua conta? Seus dados locais serão limpos para segurança e você precisará fazer login novamente."
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
