import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Lock, History, Box, Layers, Gauge, Info, Wallet, FileJson, HardDrive, RotateCcw, XCircle, Smartphone, Wifi, Activity, Cloud, Server, Cpu, Radio, Zap, Loader2, Calendar, Target, TrendingUp, LayoutGrid, Sliders, ChevronDown, List, Search, WifiOff, MessageSquare, ExternalLink, LogIn, LogOut, User, Mail, ShieldCheck, FileText, Code2, ScrollText, Shield, PaintBucket, Fingerprint, KeyRound, Crown, Leaf, Flame, MousePointerClick, Aperture, Gem, CreditCard, Cpu as Chip, Star, ArrowRightLeft, Clock, BarChart3, Signal, Network, GitCommit } from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote, ReleaseNoteType } from '../types';
import { ThemeType } from '../App';
import { supabase } from '../services/supabase';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';

const BadgeDollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"/><path d="M12 8v8"/><path d="M9.5 10.5c5.5-2.5 5.5 5.5 0 3"/></svg>
);

interface SettingsProps {
  user: any; // User passed from App
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  geminiDividends: DividendReceipt[];
  onImportDividends: (data: DividendReceipt[]) => void;
  onForceResync: () => void;
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
}

export const Settings: React.FC<SettingsProps> = ({ 
  user,
  transactions, onImportTransactions,
  geminiDividends, onImportDividends, onForceResync, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, availableVersion, updateAvailable, onCheckUpdates, onShowChangelog, releaseNotes, lastChecked,
  pushEnabled, onRequestPushPermission, lastSyncTime, onSyncAll, currentVersionDate
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates' | 'about' | 'security' | 'privacy'>('menu');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);
  
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'offline'>('idle');
  
  // Visual Preferences
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem('investfiis_glass_mode') !== 'false');
  const [blurIntensity, setBlurIntensity] = useState<'low' | 'medium' | 'high'>(() => (localStorage.getItem('investfiis_blur_intensity') as any) || 'medium');

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
  const [dataSaver, setDataSaver] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMarketUpdating, setIsMarketUpdating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isServiceWorkerActive = 'serviceWorker' in navigator;

  // Security State
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('investfiis_passcode'));
  const [biometricsEnabled, setBiometricsEnabled] = useState(() => localStorage.getItem('investfiis_biometrics') === 'true');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  
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
  
  // State for Updates screen animation
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const notesContainerRef = useRef<HTMLDivElement>(null);

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

  // Visual Effects Logic
  useEffect(() => {
    localStorage.setItem('investfiis_glass_mode', String(glassMode));
    document.documentElement.classList.toggle('glass-effect', glassMode);
  }, [glassMode]);

  useEffect(() => {
    localStorage.setItem('investfiis_blur_intensity', blurIntensity);
    const blurMap = { low: '4px', medium: '8px', high: '16px' };
    document.documentElement.style.setProperty('--blur-amount', blurMap[blurIntensity]);
  }, [blurIntensity]);

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

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      window.location.reload(); // Força recarregamento para limpar estados e garantir o logout visual
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
          await onSyncAll(true); // Force = true limpa caches de mercado/IA
          showMessage('success', 'Dados de mercado atualizados!');
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

  // Security Functions
  const handleEnablePin = () => {
    setShowPinSetup(true);
    setNewPin('');
  };

  const handleSavePin = (pin: string) => {
    if (pin.length === 4) {
      localStorage.setItem('investfiis_passcode', pin);
      setPasscode(pin);
      setShowPinSetup(false);
      showMessage('success', 'PIN configurado com sucesso!');
    }
  };

  const handleDisableSecurity = () => {
    if (window.confirm('Tem certeza que deseja remover o bloqueio do app?')) {
      localStorage.removeItem('investfiis_passcode');
      localStorage.removeItem('investfiis_biometrics');
      setPasscode(null);
      setBiometricsEnabled(false);
      showMessage('info', 'Segurança desativada.');
    }
  };

  const handleToggleBiometrics = async () => {
      if (biometricsEnabled) {
          localStorage.setItem('investfiis_biometrics', 'false');
          setBiometricsEnabled(false);
          return;
      }

      if (window.PublicKeyCredential) {
          try {
              showMessage('info', 'Autentique para ativar...');
              const challenge = new Uint8Array(32);
              window.crypto.getRandomValues(challenge);
              
              await navigator.credentials.create({
                  publicKey: {
                      challenge,
                      rp: { name: "InvestFIIs" },
                      user: {
                          id: new Uint8Array(16),
                          name: "user",
                          displayName: "User"
                      },
                      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                      authenticatorSelection: { authenticatorAttachment: "platform" },
                      timeout: 60000,
                      attestation: "direct"
                  }
              });
              
              localStorage.setItem('investfiis_biometrics', 'true');
              setBiometricsEnabled(true);
              showMessage('success', 'Biometria/PIN do celular ativado!');
          } catch (e) {
              console.error(e);
              showMessage('error', 'Falha ao ativar biometria. Verifique se seu dispositivo suporta.');
          }
      } else {
          showMessage('error', 'Dispositivo não suporta autenticação web.');
      }
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
        case 'system': return 'Diagnóstico e Reparo';
        case 'updates': return 'Atualizações';
        case 'about': return 'Sobre o App';
        case 'security': return 'Segurança';
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

  const formatDate = (dateStr: string | null) => {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr + 'T00:00:00'); // Add time to parse as local date correctly
        return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch { return dateStr; }
  };

  const formatTime = (ts: number | null | undefined) => {
      if (!ts) return '--:--';
      return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const DetailCard = ({ label, value, icon: Icon, color }: any) => (
      <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
             <Icon className="w-3.5 h-3.5" />
             <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </div>
          <p className={`text-xs font-bold tabular-nums ${color || 'text-white'}`}>{value}</p>
      </div>
  );

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
    <div className="w-full flex items-start justify-between p-4 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b last:border-0 border-slate-100 dark:border-white/5 group">
        <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
            </div>
        </div>
        <button onClick={() => onChange(!checked)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors shrink-0 ${checked ? 'bg-accent' : 'bg-slate-200 dark:bg-white/10'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
  );

  return (
    <div className="pt-24 pb-28 max-w-lg mx-auto anim-fade-in-up is-visible">
      {message && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            {message.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400"/>}
            {message.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400"/>}
            {message.type === 'info' && <Info className="w-4 h-4 text-sky-400"/>}
            {message.text}
        </div>
      )}

      {activeSection !== 'menu' && (
        <div className="px-4 mb-4">
          <button onClick={() => setActiveSection('menu')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      )}

      {activeSection === 'menu' && (
        <div className="px-4">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/5 shadow-sm">
                <User className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-[250px] mx-auto">{user.email}</h2>
            <p className="text-xs text-slate-400 font-medium">Conta Gratuita</p>
          </div>
          
          <Section title="Geral">
            <MenuItem icon={Palette} label="Aparência" value={theme.charAt(0).toUpperCase() + theme.slice(1)} onClick={() => setActiveSection('appearance')} />
            <MenuItem icon={Bell} label="Notificações" value={pushEnabled ? 'Ativadas' : 'Inativas'} onClick={() => setActiveSection('notifications')} />
            <MenuItem icon={EyeOff} label="Privacidade" value={privacyMode ? 'Ativado' : 'Desativado'} onClick={() => setActiveSection('privacy')} />
            <MenuItem icon={Shield} label="Segurança" value={passcode ? 'PIN Ativado' : 'Inativo'} onClick={() => setActiveSection('security')} />
          </Section>

          <Section title="Dados & Sincronização">
            <MenuItem icon={Database} label="Backup e Restauração" onClick={() => setActiveSection('data')} />
            <MenuItem icon={Cpu} label="Diagnóstico e Reparo" onClick={() => setActiveSection('system')} colorClass="bg-amber-500/10 text-amber-500"/>
          </Section>

          <Section title="Aplicativo">
            <MenuItem icon={Rocket} label="Atualizações" value={`v${appVersion}`} hasUpdate={updateAvailable} onClick={() => setActiveSection('updates')} />
            <MenuItem icon={Info} label="Sobre o App" onClick={() => setActiveSection('about')} />
          </Section>

          <Section>
            <MenuItem icon={LogOut} label="Sair da Conta" onClick={handleLogout} isDestructive />
          </Section>
        </div>
      )}

      {activeSection === 'appearance' && (
        <div className="px-4">
            <Section title="Tema do App">
                <div className="p-4 grid grid-cols-3 gap-3 bg-white dark:bg-[#0f172a]">
                    <button onClick={() => onSetTheme('light')} className={`py-3 rounded-xl border-2 transition-all text-xs font-bold flex items-center justify-center gap-2 ${theme === 'light' ? 'border-accent bg-accent/5 text-accent' : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500'}`}><Sun className="w-4 h-4"/> Claro</button>
                    <button onClick={() => onSetTheme('dark')} className={`py-3 rounded-xl border-2 transition-all text-xs font-bold flex items-center justify-center gap-2 ${theme === 'dark' ? 'border-accent bg-accent/5 text-accent' : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500'}`}><Moon className="w-4 h-4"/> Escuro</button>
                    <button onClick={() => onSetTheme('system')} className={`py-3 rounded-xl border-2 transition-all text-xs font-bold flex items-center justify-center gap-2 ${theme === 'system' ? 'border-accent bg-accent/5 text-accent' : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-500'}`}><Monitor className="w-4 h-4"/> Sistema</button>
                </div>
            </Section>
            <Section title="Cor de Destaque">
                <div className="p-4 grid grid-cols-6 gap-3 bg-white dark:bg-[#0f172a]">
                    {['#0ea5e9', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'].map(color => (
                        <button key={color} onClick={() => onSetAccentColor(color)} className="w-10 h-10 rounded-full transition-all active:scale-90 flex items-center justify-center" style={{backgroundColor: color}}>
                            {accentColor === color && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                        </button>
                    ))}
                </div>
            </Section>
        </div>
      )}

      {activeSection === 'notifications' && (
        <div className="px-4">
            <Section title="Notificações Push">
                 <Toggle label="Alertas no Celular" checked={pushEnabled} onChange={onRequestPushPermission} icon={Smartphone} description="Receba notificações mesmo com o app fechado." />
            </Section>
            <Section title="Preferências de Alertas">
                <Toggle label="Pagamento de Proventos" checked={notifyDivs} onChange={setNotifyDivs} icon={BadgeDollarSignIcon} />
                <Toggle label="Aviso de 'Data Com'" checked={notifyDataCom} onChange={setNotifyDataCom} icon={Calendar} />
                <Toggle label="Novidades do App" checked={notifyUpdates} onChange={setNotifyUpdates} icon={Rocket} />
            </Section>
        </div>
      )}

      {activeSection === 'privacy' && (
        <div className="px-4">
            <Section title="Modo Privacidade">
                <Toggle label="Ocultar Valores" checked={privacyMode} onChange={onSetPrivacyMode} icon={EyeOff} description="Borra os valores monetários na tela inicial para discrição em locais públicos." />
            </Section>
        </div>
      )}
      
      {activeSection === 'security' && (
          <div className="px-4">
              <Section title="Bloqueio do App">
                  {passcode ? (
                      <>
                        <Toggle label="PIN Ativado" checked={!!passcode} onChange={handleDisableSecurity} icon={Lock} description={`PIN: ${"•".repeat(4)}`} />
                        <Toggle label="Desbloqueio Facial/Digital" checked={biometricsEnabled} onChange={handleToggleBiometrics} icon={Fingerprint} description="Use a biometria do seu celular para um acesso mais rápido e seguro." />
                      </>
                  ) : (
                      <MenuItem icon={KeyRound} label="Configurar PIN de Acesso" onClick={handleEnablePin} />
                  )}
              </Section>
              <SwipeableModal isOpen={showPinSetup} onClose={() => setShowPinSetup(false)}>
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-500"><KeyRound className="w-8 h-8"/></div>
                    <h3 className="text-xl font-bold text-white mb-2">Configure seu PIN</h3>
                    <p className="text-sm text-slate-400 mb-6">Crie um código de 4 dígitos para proteger seu app.</p>
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {Array(4).fill(0).map((_, i) => <div key={i} className={`w-4 h-4 rounded-full transition-colors ${newPin.length > i ? 'bg-white' : 'bg-white/20'}`}></div>)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto">
                        {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => handleSavePin(newPin + n)} className="h-16 rounded-full bg-white/5 text-xl font-bold text-white active:bg-white/20">{n}</button>)}
                        <div/>
                        <button onClick={() => handleSavePin(newPin + 0)} className="h-16 rounded-full bg-white/5 text-xl font-bold text-white active:bg-white/20">0</button>
                        <button onClick={() => setNewPin(p => p.slice(0, -1))} className="h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:bg-white/20"><ArrowLeft/></button>
                    </div>
                </div>
              </SwipeableModal>
          </div>
      )}

      {activeSection === 'data' && (
        <div className="px-4">
          <Section title="Backup na Nuvem">
              <MenuItem icon={Download} label="Exportar Backup Local" onClick={handleExport} value={`${transactions.length} ordens`} />
              <MenuItem icon={Upload} label="Restaurar de um Arquivo" onClick={handleImportClick} />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          </Section>
          <Section title="Gerenciamento de Cache">
              <MenuItem icon={FileJson} label="Cache de Cotações (Brapi)" value={formatBytes(storageData.breakdown.quotes)} onClick={handleClearQuoteCache} />
              <MenuItem icon={Sparkles} label="Cache de Proventos (IA)" value={formatBytes(storageData.breakdown.divs)} onClick={handleClearDivCache} />
          </Section>
          {fileToRestore && <ConfirmationModal isOpen={true} title="Restaurar Backup?" message={`Restaurar os dados de "${fileToRestore.name}" irá substituir TODAS as suas ordens na nuvem. Esta ação não pode ser desfeita.`} onConfirm={handleConfirmRestore} onCancel={() => setFileToRestore(null)} />}
        </div>
      )}

      {activeSection === 'system' && (
          <div className="px-4">
              <Section title="Manutenção da Conta">
                <div className="p-4 bg-white dark:bg-[#0f172a]">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Forçar Ressincronização</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Se seus dados parecerem inconsistentes, esta ação limpará o app e baixará uma cópia nova da nuvem. É a forma mais segura de corrigir problemas.</p>
                    <button onClick={onForceResync} className="w-full text-center py-3 bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest rounded-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Ressincronizar
                    </button>
                </div>
              </Section>
              <Section title="Ferramentas Avançadas">
                  <MenuItem icon={Cpu} label="Diagnóstico do Sistema" onClick={() => setShowDiagnostics(true)} />
              </Section>
              <SwipeableModal isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500"><Cpu className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Diagnóstico</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verificação de Saúde</p>
                        </div>
                    </div>
                    {diagState.step === 'idle' && (
                        <div className="text-center py-10">
                            <p className="text-sm text-slate-400 mb-6">Verifique a conexão com a nuvem, a integridade dos dados e as permissões de escrita.</p>
                            <button onClick={runDiagnostics} className="px-8 py-4 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-transform">Iniciar Testes</button>
                        </div>
                    )}
                    {(diagState.step === 'running' || diagState.step === 'done' || diagState.step === 'error') && (
                        <div>
                            <div className="bg-black/20 rounded-xl p-4 h-48 overflow-y-auto mb-4 font-mono text-xs">
                                {diagState.logs.map(log => <p key={log.id} className={log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : log.type === 'warn' ? 'text-amber-400' : 'text-slate-400'}>
                                    <span className="mr-2 opacity-50">{new Date(log.id).toLocaleTimeString()}</span>{log.text}
                                </p>)}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-lg flex items-center justify-between ${diagState.latency === null ? 'bg-white/5' : diagState.latency < 500 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                    <span className="text-xs font-bold text-slate-300">Latência</span>
                                    <span className="text-xs font-mono">{diagState.latency !== null ? `${diagState.latency}ms` : '...'}</span>
                                </div>
                                <div className={`p-3 rounded-lg flex items-center justify-between ${diagState.integrity === null ? 'bg-white/5' : diagState.integrity ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                    <span className="text-xs font-bold text-slate-300">Contagem</span>
                                    <span className="text-xs font-mono">{diagState.integrity === null ? '...' : diagState.integrity ? 'OK' : 'Falha'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              </SwipeableModal>
          </div>
      )}

      {activeSection === 'updates' && (
        <div className="px-4">
            <Section>
                <div className="p-5 bg-white dark:bg-[#0f172a] text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-4 text-accent"><Rocket className="w-8 h-8"/></div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Versão {appVersion}</h3>
                    <p className="text-xs text-slate-400 font-medium">Instalada em {formatDate(currentVersionDate)}</p>
                    <button onClick={handleCheckUpdate} disabled={checkStatus === 'checking'} className="mt-6 w-full relative bg-slate-100 dark:bg-white/5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-[0.1em] text-slate-600 dark:text-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                        {checkStatus === 'checking' && <><Loader2 className="w-4 h-4 animate-spin"/>Verificando...</>}
                        {checkStatus === 'latest' && <><CheckCircle2 className="w-4 h-4 text-emerald-500"/>Você está atualizado</>}
                        {checkStatus === 'offline' && <><WifiOff className="w-4 h-4 text-rose-500"/>Sem conexão</>}
                        {checkStatus === 'available' && <><Download className="w-4 h-4 text-accent animate-pulse"/>Instalar v{availableVersion}</>}
                        {checkStatus === 'idle' && 'Verificar Atualizações'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2">Última checagem: {formatTime(lastChecked)}</p>
                </div>
            </Section>
            {releaseNotes && releaseNotes.length > 0 && (
                <Section title="Novidades da Versão">
                    <div className="p-4 space-y-4 bg-white dark:bg-[#0f172a]">
                        {releaseNotes.map((note, i) => {
                            const { Icon, color, bg } = getNoteIconAndColor(note.type);
                            return (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}><Icon className="w-4 h-4"/></div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{note.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{note.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}
        </div>
      )}

      {activeSection === 'about' && (
        <div className="px-4 text-center">
            <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-lg"><Wallet className="w-9 h-9 text-white" strokeWidth={1.5}/></div>
                <h2 className="text-xl font-black text-white">InvestFIIs</h2>
                <p className="text-sm text-slate-400">Versão {appVersion}</p>
            </div>
            <Section>
                <p className="p-4 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0f172a]">Este app é uma ferramenta de estudo para aprimorar minhas habilidades em desenvolvimento de software, e não deve ser considerado como uma recomendação de investimento.</p>
                <MenuItem icon={Code2} label="Ver Código no GitHub" onClick={() => window.open('https://github.com/seu-usuario/investfiis', '_blank')} />
            </Section>
            <Section>
                <MenuItem icon={FileText} label="Termos de Serviço" onClick={() => setShowTerms(true)} />
                <MenuItem icon={ShieldCheck} label="Política de Privacidade" onClick={() => setShowPrivacy(true)} />
            </Section>
        </div>
      )}
    </div>
  );
};