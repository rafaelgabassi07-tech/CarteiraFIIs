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
}

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout,
  transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
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
  const [showBiometricModal, setShowBiometricModal] = useState(false);
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

  const handleToggleBiometrics = () => {
      if (biometricsEnabled) {
          localStorage.setItem('investfiis_biometrics', 'false');
          setBiometricsEnabled(false);
          showMessage('info', 'Biometria desativada.');
          return;
      }
      // Abre o Modal de Confirmação em vez de chamar direto
      setShowBiometricModal(true);
  };

  const activateBiometrics = async () => {
      setShowBiometricModal(false); // Fecha o modal

      if (window.PublicKeyCredential) {
          try {
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
              showMessage('success', 'Biometria ativada com sucesso!');
          } catch (e) {
              console.error(e);
              showMessage('error', 'Falha na autenticação ou cancelado.');
          }
      } else {
          showMessage('error', 'Este dispositivo não suporta biometria web.');
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
      {/* Toast de Notificação Centralizado em formato de Pílula */}
      {message && (
        <div className="fixed top-6 left-0 w-full flex justify-center z-[1000] pointer-events-none">
          <div className="anim-fade-in-up is-visible pointer-events-auto">
            <div className={`flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full backdrop-blur-xl shadow-2xl border border-white/10 dark:border-black/5 ring-1 ring-black/5 ${
              message.type === 'success' ? 'bg-emerald-500/90' : 
              message.type === 'info' ? 'bg-indigo-500/90' : 
              'bg-rose-500/90'
            }`}>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                {message.type === 'success' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : 
                 message.type === 'info' ? <Info className="w-3.5 h-3.5 text-white" /> : 
                 <AlertTriangle className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">{message.text}</span>
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
                     <button onClick={onLogout} className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all"><LogOut className="w-4 h-4" /> Sair da Conta</button>
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
                
                {/* Central de Controle de Mercado (NOVO) */}
                <div className="bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent p-6 rounded-[2.5rem] border border-indigo-500/10 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Activity className="w-7 h-7" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Central de Mercado</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Gestão de Cotações e IA</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleForceMarketUpdate}
                            disabled={isMarketUpdating}
                            className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                             {isMarketUpdating ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Atualizando...</span>
                                </>
                             ) : (
                                <>
                                  <RefreshCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-700" />
                                  <span>Forçar Atualização</span>
                                </>
                             )}
                             {/* Shine Effect */}
                             <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-indigo-100 dark:border-white/5 backdrop-blur-sm">
                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Última Checagem</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {lastSyncTime ? lastSyncTime.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                                </p>
                            </div>
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-2xl border border-indigo-100 dark:border-white/5 backdrop-blur-sm">
                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Status da API</p>
                                <p className="text-xs font-bold text-emerald-500 tabular-nums flex items-center gap-1.5">
                                    <Signal className="w-3 h-3" />
                                    Online
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status da Nuvem e Bolsa */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-[#0f172a] p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-sky-500/10 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center mb-2"><Cloud className="w-5 h-5" /></div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Cloud Sync</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5 ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                {isOnline ? 'Conectado' : 'Offline'}
                            </p>
                        </div>
                        {isOnline && (
                             <button onClick={handleForceSync} disabled={isSyncing} className="absolute bottom-3 right-3 p-2 bg-slate-50 dark:bg-white/5 rounded-full text-slate-400 hover:text-sky-500 transition-colors">
                                 <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                             </button>
                        )}
                    </div>

                    <div className="bg-white dark:bg-[#0f172a] p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-colors ${marketStatus.bg}`}></div>
                        <div className="relative z-10">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${marketStatus.bg} ${marketStatus.color}`}><marketStatus.icon className="w-5 h-5" /></div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">B3 (Bolsa)</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${marketStatus.color}`}>
                                {marketStatus.label}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Services Health List */}
                <Section title="Saúde dos Serviços">
                    <div className="space-y-3">
                        {/* Supabase Card */}
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-emerald-500/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6 transition-opacity opacity-50 group-hover:opacity-100"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/10">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Supabase</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Banco de Dados & Auth</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Operacional</span>
                                </div>
                            </div>
                        </div>

                        {/* Brapi Card */}
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-indigo-500/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl -mr-6 -mt-6 transition-opacity opacity-50 group-hover:opacity-100"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center border border-indigo-500/10">
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Brapi API</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Cotações B3 (15min delay)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Gemini Card */}
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-amber-500/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl -mr-6 -mt-6 transition-opacity opacity-50 group-hover:opacity-100"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/10">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Gemini AI</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Google DeepMind</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">v2.5 Flash</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                <Section title="Rede e Dados">
                    <div className="p-1 bg-white dark:bg-[#0f172a]">
                        <Toggle 
                           label="Modo Economia de Dados" 
                           description="Reduz atualizações automáticas em redes móveis" 
                           icon={WifiOff} 
                           checked={dataSaver} 
                           onChange={() => setDataSaver(!dataSaver)} 
                        />
                    </div>
                </Section>

                {/* Advanced Diagnostics Button */}
                <div className="pt-2">
                     <button onClick={() => { setShowDiagnostics(true); runDiagnostics(); }} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Activity className="w-5 h-5" /></div>
                            <div className="text-left">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">Diagnóstico Avançado</span>
                                <span className="text-[9px] text-slate-400">Teste de latência e integridade</span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
          )}

          {activeSection === 'security' && (
              <div className="space-y-6">
                   <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-[2.5rem] border border-emerald-500/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Proteção do App</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[200px] mx-auto">Adicione uma camada extra de segurança ao abrir o InvestFIIs.</p>
                        
                        {!passcode ? (
                            <button 
                                onClick={handleEnablePin}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                                Ativar Bloqueio
                            </button>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="px-4 py-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Protegido com PIN
                                </div>
                                <button onClick={handleDisableSecurity} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2 hover:underline">Remover Proteção</button>
                            </div>
                        )}
                   </div>

                   {passcode && (
                       <Section title="Métodos de Desbloqueio">
                           <Toggle 
                               label="Biometria / FaceID" 
                               description="Usar impressão digital ou reconhecimento facial do dispositivo" 
                               icon={Fingerprint} 
                               checked={biometricsEnabled} 
                               onChange={handleToggleBiometrics} 
                            />
                       </Section>
                   )}
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

              <Section title="Efeitos & Acessibilidade">
                  <Toggle label="Efeito Glassmorphism" description="Transparência e desfoque nos elementos" icon={Layers} checked={glassMode} onChange={() => setGlassMode(!glassMode)} />
              </Section>
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

                <Section title="Estilo do Desfoque">
                  <div className="p-4 bg-white dark:bg-[#0f172a] space-y-3">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-500"><Aperture className="w-4 h-4" /></div>
                          <div>
                              <span className="text-sm font-semibold block text-slate-900 dark:text-white">Intensidade do Blur</span>
                              <p className="text-[10px] text-slate-400 font-medium">Ajuste o quão ilegível os dados ficam</p>
                          </div>
                      </div>
                      <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl">
                          {['low', 'medium', 'high'].map((level) => (
                              <button
                                key={level}
                                onClick={() => setBlurIntensity(level as any)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${blurIntensity === level ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                              >
                                {level === 'low' ? 'Suave' : level === 'medium' ? 'Médio' : 'Forte'}
                              </button>
                          ))}
                      </div>
                  </div>
              </Section>
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
          
          {activeSection === 'updates' && (
             <div className="h-[calc(100dvh-140px)] -mt-2 flex flex-col bg-gradient-to-b from-[#0b1121] to-[#020617] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                {/* --- Animated Header --- */}
                <div className={`relative z-10 text-center transition-all duration-500 ease-out-quint ${isHeaderCompact ? 'pt-4 pb-4 backdrop-blur-md bg-black/20 border-b border-white/5' : 'pt-10 pb-6'}`}>
                    <div className={`relative mx-auto transition-all duration-500 ease-out-quint ${isHeaderCompact ? 'w-16 h-16 mb-2' : 'w-24 h-24 mb-4'}`}>
                        <div className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-700 ${checkStatus === 'checking' ? 'bg-slate-100 dark:bg-white/5 scale-110' : updateAvailable ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {checkStatus === 'checking' ? (
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                            ) : updateAvailable ? (
                                <Rocket className="w-1/2 h-1/2 animate-bounce" strokeWidth={1.5} />
                            ) : (
                                <CheckCircle2 className="w-1/2 h-1/2" strokeWidth={1.5} />
                            )}
                        </div>
                        {checkStatus === 'checking' && <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/10"></div>}
                    </div>
                    
                    <h2 className={`font-black text-white tracking-tighter transition-all duration-500 ease-out-quint ${isHeaderCompact ? 'text-xl' : 'text-3xl'}`}>
                        {updateAvailable ? 'Nova Versão' : 'Tudo em Dia'}
                    </h2>
                    
                    <div className={`overflow-hidden transition-all duration-500 ease-out-quint ${isHeaderCompact ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'}`}>
                        <p className="text-sm font-medium text-slate-400 mt-1 mb-4">
                            {updateAvailable ? `A versão ${availableVersion || ''} está disponível.` : `Você está rodando a v${appVersion}`}
                        </p>
                    </div>

                    <div className="flex justify-center gap-3">
                      <button 
                          onClick={handleCheckUpdate}
                          disabled={checkStatus === 'checking'}
                          className={`group relative overflow-hidden px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center gap-2 duration-500 ease-out-quint ${isHeaderCompact ? 'scale-90' : 'scale-100'} ${
                              updateAvailable 
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/30' 
                              : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/30'
                          }`}
                      >
                          <span className="relative z-10 flex items-center gap-2">
                              {checkStatus === 'checking' ? <>Buscando...</> : updateAvailable ? <><Download className="w-4 h-4" /> Atualizar</> : <><RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> Verificar</>}
                          </span>
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                      </button>
                    </div>
                </div>
                
                {/* --- Scrollable Content --- */}
                <div ref={notesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-5 p-4 pb-20 overscroll-contain">
                   
                   {/* Technical Details Grid */}
                   <div className="grid grid-cols-2 gap-3 anim-fade-in-up is-visible">
                      <DetailCard label="Versão Instalada" value={`v${appVersion}`} icon={GitCommit} color="text-indigo-400" />
                      <DetailCard label="Data de Lançamento" value={formatDate(currentVersionDate)} icon={Calendar} color="text-slate-200" />
                      <DetailCard label="Última Verificação" value={formatTime(lastChecked)} icon={Clock} color="text-slate-400" />
                      <DetailCard label="Canal" value="Stable/Cloud" icon={Server} color="text-emerald-500" />
                   </div>

                   {/* Release Notes */}
                   {(releaseNotes && releaseNotes.length > 0) && (
                      <div className="space-y-3">
                         <h3 className={`text-xs font-bold text-slate-500 uppercase tracking-widest pl-2`}>
                           Notas da v{availableVersion || appVersion}
                         </h3>
                         {releaseNotes.map((note, i) => {
                            const { Icon, color, bg } = getNoteIconAndColor(note.type);
                            return (
                              <div key={i} className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${bg} ${color}`}>
                                      <Icon className="w-4 h-4" strokeWidth={2.5} />
                                  </div>
                                  <div>
                                      <h4 className="text-sm font-bold text-white leading-tight mb-1">{note.title}</h4>
                                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{note.desc}</p>
                                  </div>
                              </div>
                            );
                         })}
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>
      )}

      {/* Cloud Diagnostics Modal */}
      <SwipeableModal isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)}>
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

      <ConfirmationModal
        isOpen={!!fileToRestore}
        title="Restaurar Backup"
        message="Atenção: Restaurar um backup substituirá TODOS os seus dados atuais. Esta ação não pode ser desfeita. Deseja continuar?"
        onConfirm={handleConfirmRestore}
        onCancel={() => setFileToRestore(null)}
      />

      <ConfirmationModal
        isOpen={showBiometricModal}
        title="Ativar Biometria"
        message="Autentique-se agora para vincular sua biometria ao aplicativo."
        onConfirm={activateBiometrics}
        onCancel={() => setShowBiometricModal(false)}
      />

      {/* Security Setup Modal */}
      <SwipeableModal isOpen={showPinSetup} onClose={() => setShowPinSetup(false)}>
        <div className="px-6 py-4">
             <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Definir PIN</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">Crie uma senha de 4 dígitos para proteger seu acesso.</p>
             </div>
             
             <div className="flex justify-center gap-4 mb-8">
                 {[0, 1, 2, 3].map(i => (
                     <div key={i} className={`w-4 h-4 rounded-full border-2 border-slate-200 dark:border-white/20 ${newPin.length > i ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent'}`} />
                 ))}
             </div>
             
             <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                     <button 
                        key={num} 
                        onClick={() => {
                            if (newPin.length < 4) {
                                const val = newPin + num;
                                setNewPin(val);
                                if (val.length === 4) handleSavePin(val);
                            }
                        }}
                        className={`w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 text-xl font-bold flex items-center justify-center active:scale-90 transition-transform ${num === 0 ? 'col-start-2' : ''}`}
                     >
                         {num}
                     </button>
                 ))}
                 <button 
                    onClick={() => setNewPin(prev => prev.slice(0, -1))}
                    className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center active:scale-90 transition-transform col-start-3 row-start-4"
                 >
                     <Trash2 className="w-6 h-6 text-rose-500" />
                 </button>
             </div>
        </div>
      </SwipeableModal>
    </div>
  );
};