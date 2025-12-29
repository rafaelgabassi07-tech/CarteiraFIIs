import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Lock, History, Box, Layers, Gauge, Info, Wallet, FileJson, HardDrive, RotateCcw, XCircle, Smartphone, Wifi, Activity, Cloud, Server, Cpu, Radio, Zap, Loader2, Calendar, Target, TrendingUp, LayoutGrid, Sliders, ChevronDown, List, Search, WifiOff, MessageSquare, ExternalLink, LogIn, LogOut, User, Mail, ShieldCheck, FileText, Code2, ScrollText, Shield, PaintBucket, Fingerprint, KeyRound, Crown, Leaf, Flame, MousePointerClick, Aperture, Gem, CreditCard, Cpu as Chip, Star } from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote, ReleaseNoteType } from '../types';
import { ThemeType } from '../App';
import { supabase } from '../services/supabase';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';

const BadgeDollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"/><path d="M12 8v8"/><path d="M9.5 10.5c5.5-2.5 5.5 5.5 0 3"/></svg>
);

interface SettingsProps {
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
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  lastSyncTime?: Date | null;
  onSyncAll: (force: boolean) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ 
  transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, pushEnabled, onRequestPushPermission, lastSyncTime, onSyncAll
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'about' | 'security' | 'privacy'>('menu');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);
  
  // Visual Preferences
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem('investfiis_glass_mode') !== 'false');
  const [blurIntensity, setBlurIntensity] = useState<'low' | 'medium' | 'high'>(() => (localStorage.getItem('investfiis_blur_intensity') as any) || 'medium');

  const [storageData, setStorageData] = useState({ 
    totalBytes: 0,
    breakdown: { tx: 0, quotes: 0, divs: 0 } 
  });

  const [notifyDivs, setNotifyDivs] = useState(() => localStorage.getItem('investfiis_notify_divs') !== 'false');
  const [notifyDataCom, setNotifyDataCom] = useState(() => localStorage.getItem('investfiis_notify_datacom') !== 'false');
  const [notifyGoals, setNotifyGoals] = useState(() => localStorage.getItem('investfiis_notify_goals') !== 'false');
  const [notifyMarket, setNotifyMarket] = useState(() => localStorage.getItem('investfiis_notify_market') === 'true');
  const [notifyUpdates, setNotifyUpdates] = useState(() => localStorage.getItem('investfiis_notify_updates') !== 'false');
  
  const [backendStatus, setBackendStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isServiceWorkerActive = 'serviceWorker' in navigator;

  // Security State
  const [passcode, setPasscode] = useState<string | null>(() => localStorage.getItem('investfiis_passcode'));
  const [biometricsEnabled, setBiometricsEnabled] = useState(() => localStorage.getItem('investfiis_biometrics') === 'true');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Supabase Auth States
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmAuthPassword, setConfirmAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showConfirmAuthPassword, setShowConfirmAuthPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Modal States
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Scroll Reset Effect
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
        totalBytes: getKeySize('investfiis_v4_transactions') + getKeySize('investfiis_v3_quote_cache') + getKeySize('investfiis_v4_div_cache'),
        breakdown: { 
            tx: getKeySize('investfiis_v4_transactions'), 
            quotes: getKeySize('investfiis_v3_quote_cache'), 
            divs: getKeySize('investfiis_v4_div_cache') 
        }
    });
  };

  useEffect(() => { calculateStorage(); }, [transactions, geminiDividends, activeSection, message]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
        if (authMode === 'signup') {
            if (authPassword !== confirmAuthPassword) throw new Error('As senhas não coincidem.');
            const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
            if (error) throw error;
            showMessage('info', 'Verifique seu e-mail para confirmar!');
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
            if (error) throw error;
            showMessage('success', 'Login realizado com sucesso!');
        }
        setAuthPassword(''); setConfirmAuthPassword('');
    } catch (err: any) {
        showMessage('error', err.message || 'Erro na autenticação');
    } finally {
        setAuthLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); showMessage('info', 'Desconectado.'); };
  
  const handleTestBackend = async () => {
    setBackendStatus('checking');
    try {
        const { error } = await supabase.functions.invoke('market-data-proxy', {
            body: { type: 'test' }
        });
        if (error) throw error;
        setBackendStatus('ok');
        showMessage('success', 'Serviços de backend operacionais!');
    } catch (e) {
        setBackendStatus('error');
        showMessage('error', 'Falha na comunicação com o servidor.');
    }
    setTimeout(() => setBackendStatus('idle'), 3000);
  };
  
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

  const getSectionTitle = (section: string) => {
    switch(section) {
        case 'notifications': return 'Notificações';
        case 'appearance': return 'Aparência';
        case 'privacy': return 'Privacidade';
        case 'integrations': return 'Conexões e Serviços';
        case 'data': return 'Alocação e Backup';
        case 'system': return 'Sistema';
        case 'about': return 'Sobre o App';
        case 'security': return 'Segurança';
        default: return 'Ajustes';
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
                  {user ? (
                     <div className="p-6 space-y-4">
                         <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><User className="w-6 h-6" /></div>
                             <div className="overflow-hidden"><h3 className="font-bold text-slate-900 dark:text-white truncate">Conectado</h3><p className="text-xs text-slate-500 truncate">{user.email}</p></div>
                         </div>
                         <button onClick={handleLogout} className="w-full py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all"><LogOut className="w-4 h-4" /> Sair da Conta</button>
                     </div>
                  ) : (
                     <div className="p-6 space-y-5">
                         <div className="flex items-center justify-between">
                             <h3 className="font-bold text-slate-900 dark:text-white text-sm">Login / Cadastro</h3>
                             <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                                 <button onClick={() => setAuthMode('login')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${authMode === 'login' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Entrar</button>
                                 <button onClick={() => setAuthMode('signup')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${authMode === 'signup' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Criar</button>
                             </div>
                         </div>
                         <div className="space-y-3">
                             <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="email" placeholder="E-mail" className="w-full bg-slate-50 dark:bg-black/20 pl-11 pr-4 py-3.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-accent/20 transition-all border border-slate-100 dark:border-white/5 text-slate-900 dark:text-white" value={authEmail} onChange={e => setAuthEmail(e.target.value)} /></div>
                             <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type={showAuthPassword ? 'text' : 'password'} placeholder="Senha" className="w-full bg-slate-50 dark:bg-black/20 pl-11 pr-12 py-3.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-accent/20 transition-all border border-slate-100 dark:border-white/5 text-slate-900 dark:text-white" value={authPassword} onChange={e => setAuthPassword(e.target.value)} /><button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                             {authMode === 'signup' && (<div className="relative anim-fade-in-up is-visible"><ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type={showConfirmAuthPassword ? 'text' : 'password'} placeholder="Confirme senha" className="w-full bg-slate-50 dark:bg-black/20 pl-11 pr-12 py-3.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-accent/20 transition-all border border-slate-100 dark:border-white/5 text-slate-900 dark:text-white" value={confirmAuthPassword} onChange={e => setConfirmAuthPassword(e.target.value)} /><button type="button" onClick={() => setShowConfirmAuthPassword(!showConfirmAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showConfirmAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>)}
                         </div>
                         <button onClick={handleAuth} disabled={authLoading} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all">{authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === 'login' ? 'Acessar Conta' : 'Criar Conta')}</button>
                     </div>
                  )}
               </div>
            </div>

            <Section title="Preferências">
                <MenuItem icon={Palette} label="Aparência" onClick={() => setActiveSection('appearance')} colorClass="bg-indigo-500/10 text-indigo-500" />
                <MenuItem icon={Bell} label="Notificações" onClick={() => setActiveSection('notifications')} value={pushEnabled ? 'Ativado' : ''} colorClass="bg-amber-500/10 text-amber-500" />
                <MenuItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" onClick={() => setActiveSection('privacy')} value={privacyMode ? 'Ativado' : 'Público'} colorClass="bg-slate-500/10 text-slate-500" />
                <MenuItem icon={ShieldCheck} label="Segurança" onClick={() => setActiveSection('security')} value={passcode ? 'Protegido' : 'Desativado'} colorClass="bg-emerald-500/10 text-emerald-500" />
            </Section>

            <Section title="Dados & Sincronização">
                <MenuItem icon={Globe} label="Conexões e Serviços" onClick={() => setActiveSection('integrations')} value={user ? 'Online' : 'Offline'} colorClass="bg-sky-500/10 text-sky-500" />
                <MenuItem icon={Database} label="Alocação e Backup" onClick={() => setActiveSection('data')} value={formatBytes(storageData.totalBytes)} colorClass="bg-emerald-500/10 text-emerald-500" />
            </Section>

            <Section title="Sistema">
                <MenuItem icon={Info} label="Sobre o APP" onClick={() => setActiveSection('about')} value={`v${appVersion}`} colorClass="bg-slate-500/10 text-slate-500" />
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
                    Build 2025.06.29 • Secure Enclave
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
                        disabled={pushEnabled}
                        className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all ${pushEnabled ? 'bg-emerald-500 text-white cursor-default' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                    >
                        {pushEnabled ? 'Ativado ✓' : 'Ativar Notificações'}
                    </button>
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

          {activeSection === 'integrations' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Status da Sincronização</h3><button onClick={handleForceSync} disabled={isSyncing} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-accent active:scale-90 transition-all"><RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /></button></div>
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-xs"><span className="font-bold text-slate-400">Última Atualização</span>{lastSyncTime ? (<div className="flex items-center gap-2 text-emerald-500 font-bold"><span>{lastSyncTime.toLocaleTimeString('pt-BR')}</span><CheckCircle2 className="w-4 h-4" /></div>) : (<span className="font-bold text-slate-400">Pendente</span>)}</div>
                </div>
                <Section title="Serviços de Backend (Edge Functions)">
                    <div className="bg-white dark:bg-[#0f172a] p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center"><Server className="w-6 h-6" /></div><div><h3 className="font-bold text-slate-900 dark:text-white">Proxy de Dados</h3><div className="flex items-center gap-1.5 text-xs font-bold mt-1"><span className={`w-2 h-2 rounded-full ${backendStatus === 'ok' ? 'bg-emerald-500' : backendStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`}></span><span className={`${backendStatus === 'ok' ? 'text-emerald-500' : backendStatus === 'error' ? 'text-rose-500' : 'text-slate-400'}`}>{backendStatus === 'ok' ? 'Operacional' : backendStatus === 'checking' ? 'Testando...' : backendStatus === 'error' ? 'Falha' : 'Não verificado'}</span></div></div></div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">As chaves de API agora são gerenciadas de forma segura no servidor.</p>
                        <button onClick={handleTestBackend} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">{backendStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Testar Conexão'}</button>
                    </div>
                </Section>
                <Section title="Diagnóstico do App">
                    <div className="bg-white dark:bg-[#0f172a] p-4 space-y-3">
                       <div className="flex items-center justify-between p-2 rounded-lg"><span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><Wifi className="w-4 h-4" /> Conexão com a Internet</span><span className={`text-xs font-bold ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>{isOnline ? 'Online' : 'Offline'}</span></div>
                       <div className="flex items-center justify-between p-2 rounded-lg"><span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><Smartphone className="w-4 h-4" /> Service Worker (PWA)</span><span className={`text-xs font-bold ${isServiceWorkerActive ? 'text-emerald-500' : 'text-rose-500'}`}>{isServiceWorkerActive ? 'Ativo' : 'Inativo'}</span></div>
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

      <ConfirmationModal
        isOpen={!!fileToRestore}
        title="Restaurar Backup"
        message="Atenção: Restaurar um backup substituirá TODOS os seus dados atuais. Esta ação não pode ser desfeita. Deseja continuar?"
        onConfirm={handleConfirmRestore}
        onCancel={() => setFileToRestore(null)}
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