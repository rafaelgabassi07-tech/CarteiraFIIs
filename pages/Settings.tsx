import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Lock, History, Box, Layers, Gauge, Info, Wallet, FileJson, HardDrive, RotateCcw, XCircle, Smartphone, Wifi, Activity, Cloud, Server, Cpu, Radio, Zap, Loader2, Calendar, Target, TrendingUp, LayoutGrid, Sliders, ChevronDown, List, Search, WifiOff, MessageSquare, ExternalLink, LogIn, LogOut, User, Mail, ShieldCheck, FileText, Code2, ScrollText, Shield, PaintBucket, Fingerprint, KeyRound, Crown, Leaf, Flame, MousePointerClick, Aperture, Gem, CreditCard, Cpu as Chip, Star, ArrowRightLeft, Clock, BarChart3, Signal, Network } from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote, ReleaseNoteType } from '../types';
import { ThemeType } from '../App';
import { supabase } from '../services/supabase';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';

const BadgeDollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"/><path d="M12 8v8"/><path d="M9.5 10.5c5.5-2.5 5.5 5.5 0 3"/></svg>
);

interface SettingsProps {
  user: any; // User passed from App
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  geminiDividends: DividendReceipt[];
  onImportDividends: (data: DividendReceipt[]) => void;
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
}

export const Settings: React.FC<SettingsProps> = ({ 
  user,
  transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, availableVersion, updateAvailable, onCheckUpdates, onShowChangelog, releaseNotes, lastChecked,
  pushEnabled, onRequestPushPermission, lastSyncTime, onSyncAll
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
  
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleLogout = async () => { await supabase.auth.signOut(); showMessage('info', 'Desconectado.'); };
  
  const handleForceSync = async () => { setIsSyncing(true); await onSyncAll(true); setIsSyncing(false); };
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
    
    // Horário de Brasília é UTC-3 (aproximado, ignorando horário de verão que não temos mais)
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
        // IMPORTANTE: Filtrar por user_id é crucial para segurança e performance, e para garantir que o count reflita os dados do usuário atual
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
      {message && <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[60] text-[10px] font-black uppercase tracking-widest text-white transition-all transform anim-fade-in-up is-visible ${message.type === 'success' ? 'bg-emerald-500' : message.type === 'info' ? 'bg-indigo-500' : 'bg-rose-500'}`}>{message.text}</div>}

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
                     <button onClick={handleLogout} className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all"><LogOut className="w-4 h-4" /> Sair da Conta</button>
                 </div>
               </div>
            </div>

            <Section title="Preferências">
                <MenuItem icon={Palette} label="Aparência" onClick={() => setActiveSection('appearance')} colorClass="bg-indigo-500/10 text-indigo-500" />
                <MenuItem icon={Bell} label="Notificações" onClick={() => setActiveSection('notifications')} value={pushEnabled ? 'Ativado' : ''} colorClass="bg-amber-500/10 text-amber-500" />
                <MenuItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" onClick={() => setActiveSection('privacy')} value={privacyMode ? 'Ativado' : 'Público'} colorClass="bg-slate-500/10 text-slate-500" />
                <MenuItem icon={ShieldCheck} label="Segurança" onClick={() => setActiveSection('security')} value={passcode ? 'Protegido' : 'Desativado'} colorClass="bg-emerald-500/10 text-emerald-500" />
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
          
          {activeSection === 'integrations' && (
            <div className="space-y-6">
                {/* Connection Status Hero */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-4 relative z-10">
                       <div className="flex items-center gap-3">
                           <div className="relative">
                               <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500"><Cloud className="w-6 h-6" strokeWidth={2} /></div>
                               <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#0f172a] p-0.5 rounded-full">
                                   <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                               </div>
                           </div>
                           <div>
                               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Cloud Sync</h3>
                               <p className={`text-[10px] font-bold ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>{isOnline ? 'Conectado' : 'Offline'}</p>
                           </div>
                       </div>
                       <button 
                           onClick={handleForceSync} 
                           disabled={isSyncing || !isOnline} 
                           className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/20 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                       >
                           <RotateCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                       </button>
                    </div>
                    
