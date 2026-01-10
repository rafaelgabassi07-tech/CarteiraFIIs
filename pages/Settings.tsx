
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Download, Upload, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, RefreshCw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Box, Layers, Gauge, Info, Wallet, RotateCcw, Activity, Cloud, Loader2, Calendar, Target, TrendingUp, Search, ExternalLink, LogIn, LogOut, User, Mail, FileText, ScrollText, Aperture, CreditCard, Star, ArrowRightLeft, Clock, BarChart3, Signal, Zap, Lock, Smartphone } from 'lucide-react';
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

// Helper function to get the title for each settings section
const getSectionTitle = (section: string) => {
  switch (section) {
    case 'appearance': return 'Aparência e Tema';
    case 'notifications': return 'Notificações';
    case 'privacy': return 'Privacidade';
    case 'integrations': return 'Status dos Serviços';
    case 'data': return 'Backup e Memória';
    case 'updates': return 'Sistema & Updates';
    case 'about': return 'Sobre o Projeto';
    case 'system': return 'Resetar Aplicativo';
    default: return 'Ajustes';
  }
};

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
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMarketUpdating, setIsMarketUpdating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showForceUpdateConfirm, setShowForceUpdateConfirm] = useState(false);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  // Function to handle file restoration from JSON backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions) {
          onImportTransactions(json.transactions);
        }
        if (json.geminiDividends) {
          onImportDividends(json.geminiDividends);
        }
        showMessage('success', 'Backup restaurado com sucesso!');
      } catch (err) {
        console.error("Erro ao restaurar backup:", err);
        showMessage('error', 'Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const runServiceCheck = useCallback(async () => {
    setIsServicesChecking(true);
    setHealthStatus({ supabase: 'checking', brapi: 'checking' });
    setEstLatency(null);

    // @ts-ignore
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) setNetworkType(conn.effectiveType ? conn.effectiveType.toUpperCase() : (conn.type || 'WIFI'));
    
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
        } catch { return 'error'; }
    };
    const [supabaseResult, brapiResult] = await Promise.all([checkSupabase(), checkBrapi()]);
    const end = performance.now();
    setEstLatency(Math.round(end - start));
    setHealthStatus({ supabase: supabaseResult, brapi: brapiResult });
    setIsServicesChecking(false);
  }, [user]);

  useEffect(() => {
    if (activeSection === 'integrations') runServiceCheck();
  }, [activeSection, runServiceCheck]);

  useEffect(() => { window.scrollTo(0, 0); }, [activeSection]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearQuoteCache = () => { localStorage.removeItem('investfiis_v3_quote_cache'); showMessage('success', 'Cache limpo.'); };
  const handleClearDivCache = () => { localStorage.removeItem('investfiis_v4_div_cache'); onImportDividends([]); showMessage('success', 'Dados de IA limpos.'); };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ transactions, geminiDividends, version: appVersion, exportDate: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup_invest_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showMessage('success', 'Backup exportado!');
  };

  const handleCheckUpdate = async () => {
    if (updateAvailable) { onShowChangelog(); return; }
    setCheckStatus('checking');
    const [_, hasUpdate] = await Promise.all([new Promise(r => setTimeout(r, 2000)), onCheckUpdates()]);
    if (hasUpdate) setCheckStatus('available');
    else { setCheckStatus('latest'); setTimeout(() => setCheckStatus('idle'), 3000); }
  };

  const MenuItem = ({ icon: Icon, label, value, onClick, isDestructive, hasUpdate, index = 0, colorClass }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:scale-[0.98] transition-all border-b last:border-0 border-zinc-200 dark:border-zinc-800 group gap-4 anim-fade-in-up`} style={{ animationDelay: `${index * 50}ms` }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isDestructive ? 'bg-rose-500/10 text-rose-500' : (colorClass || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400')}`}>
                <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className={`text-sm font-bold text-left ${isDestructive ? 'text-rose-500' : 'text-zinc-800 dark:text-zinc-200'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {value && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{value}</span>}
            {hasUpdate && <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>}
            <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
    </button>
  );

  const Section = ({ title, children }: any) => (
    <div className="mb-8 anim-fade-in-up is-visible">
        {title && <h3 className="px-5 mb-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{title}</h3>}
        <div className="rounded-[2rem] overflow-hidden shadow-card dark:shadow-card-dark border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">{children}</div>
    </div>
  );

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
      {activeSection === 'menu' ? (
        <>
            <div className="mb-8 anim-fade-in-up is-visible">
               <h3 className="px-5 mb-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Conta</h3>
               <div className="rounded-[2rem] overflow-hidden shadow-card dark:shadow-card-dark border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                 <div className="p-6 space-y-5">
                     <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30"><User className="w-7 h-7" /></div>
                         <div className="overflow-hidden">
                             <h3 className="font-black text-zinc-900 dark:text-white truncate">Investidor Cloud</h3>
                             <p className="text-xs text-zinc-500 truncate font-medium">{user ? user.email : 'Carregando...'}</p>
                         </div>
                     </div>
                     <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all"><LogOut className="w-4 h-4" /> Desconectar Conta</button>
                 </div>
               </div>
            </div>

            <Section title="Interface">
                <MenuItem 
                    icon={Palette} 
                    label="Aparência e Tema" 
                    onClick={() => setActiveSection('appearance')} 
                    index={1} 
                    colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                />
                <MenuItem 
                    icon={Bell} 
                    label="Notificações" 
                    onClick={() => setActiveSection('notifications')} 
                    value={pushEnabled ? 'On' : 'Off'} 
                    index={2} 
                    colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                />
                <MenuItem 
                    icon={privacyMode ? EyeOff : Eye} 
                    label="Privacidade" 
                    onClick={() => setActiveSection('privacy')} 
                    value={privacyMode ? 'Ativo' : ''} 
                    index={3} 
                    colorClass="bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"
                />
            </Section>

            <Section title="Dados & Serviços">
                <MenuItem 
                    icon={Signal} 
                    label="Status dos Serviços" 
                    onClick={() => setActiveSection('integrations')} 
                    value="OK" 
                    index={4} 
                    colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                />
                <MenuItem 
                    icon={Database} 
                    label="Backup e Memória" 
                    onClick={() => setActiveSection('data')} 
                    index={5} 
                    colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                />
            </Section>

            <Section title="Suporte">
                <MenuItem 
                    icon={RefreshCcw} 
                    label="Sistema & Updates" 
                    onClick={() => setActiveSection('updates')} 
                    hasUpdate={updateAvailable} 
                    value={`v${appVersion}`} 
                    index={6} 
                    colorClass="bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400"
                />
                <MenuItem 
                    icon={Info} 
                    label="Sobre o Projeto" 
                    onClick={() => setActiveSection('about')} 
                    index={7} 
                    colorClass="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                />
                <MenuItem 
                    icon={ShieldAlert} 
                    label="Resetar Aplicativo" 
                    onClick={() => setActiveSection('system')} 
                    isDestructive 
                    index={8} 
                />
            </Section>
        </>
      ) : (
        <div className="anim-fade-in is-visible">
          <div className="flex items-center gap-3 mb-8 px-1">
              <button onClick={() => setActiveSection('menu')} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white hover:bg-zinc-200 transition-all active:scale-90"><ArrowLeft className="w-5 h-5" strokeWidth={3} /></button>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{getSectionTitle(activeSection)}</h2>
          </div>
          
          {activeSection === 'appearance' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-card">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Selecione o Modo</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map((mode) => (
                            <button 
                                key={mode.id} 
                                onClick={() => onSetTheme(mode.id as ThemeType)} 
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${theme === mode.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg scale-105' : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                            >
                                <mode.icon className="w-6 h-6 mb-2" strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-wider">{mode.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
                <div className="bg-blue-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Database className="w-32 h-32" /></div>
                    <Database className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-xl font-black mb-2">Backup de Segurança</h3>
                    <p className="text-xs font-medium opacity-80 mb-6">Mantenha seus dados seguros fora da nuvem.</p>
                    <div className="flex gap-3">
                        <button onClick={handleExport} className="flex-1 py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Exportar JSON</button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-4 bg-blue-600 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Restaurar</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
                
                <Section title="Gerenciamento de Cache">
                    <div className="p-2 space-y-1">
                        <button onClick={handleClearQuoteCache} className="w-full flex justify-between items-center p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Cotações da Brapi</span>
                            <span className="text-[10px] font-mono text-zinc-400">Limpar</span>
                        </button>
                        <button onClick={handleClearDivCache} className="w-full flex justify-between items-center p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Inteligência Artificial</span>
                            <span className="text-[10px] font-mono text-zinc-400">Limpar</span>
                        </button>
                    </div>
                </Section>
            </div>
          )}
        </div>
      )}

      {/* Reutilizando ConfirmationModals etc do arquivo original... */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        title="Sair da Conta"
        message="Deseja realmente desconectar? Você precisará entrar novamente para acessar seus dados."
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
