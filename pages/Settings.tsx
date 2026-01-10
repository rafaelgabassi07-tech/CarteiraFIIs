
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
  const [notifyUpdates, setNotifyUpdates] = useState(() => localStorage.getItem('investfiis_notify_updates') !== 'false');
  
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions) { onImportTransactions(json.transactions); }
        if (json.geminiDividends) { onImportDividends(json.geminiDividends); }
        showMessage('success', 'Backup restaurado com sucesso!');
      } catch (err) {
        showMessage('error', 'Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
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

  useEffect(() => { if (activeSection === 'integrations') runServiceCheck(); }, [activeSection, runServiceCheck]);
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

  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    setDiagState(prev => ({ ...prev, logs: [...prev.logs, { id: Date.now(), text, type }] }));
  };

  const runDiagnostics = async () => {
    setDiagState(prev => ({ ...prev, step: 'running', logs: [] }));
    addLog('Iniciando diagnósticos...');
    if (!navigator.onLine) { addLog('Dispositivo offline.', 'error'); setDiagState(p => ({ ...p, step: 'error' })); return; }
    try {
        const start = performance.now();
        const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const end = performance.now();
        if (error) throw error;
        const lat = Math.round(end - start);
        setDiagState(p => ({ ...p, latency: lat, cloudCount: count, integrity: count === transactions.length, step: 'done' }));
        addLog(`Latência: ${lat}ms`, lat < 500 ? 'success' : 'warn');
        addLog(count === transactions.length ? 'Sincronia OK' : 'Discrepância detectada', count === transactions.length ? 'success' : 'error');
    } catch (e: any) {
        addLog(`Erro: ${e.message}`, 'error');
        setDiagState(p => ({ ...p, step: 'error' }));
    }
  };

  const MenuItem = ({ icon: Icon, label, value, onClick, isDestructive, hasUpdate, index = 0, colorClass }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:scale-[0.98] transition-all border-b last:border-0 border-zinc-100 dark:border-zinc-800 group gap-4 anim-fade-in-up`} style={{ animationDelay: `${index * 50}ms` }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-11 h-11 rounded-[1.25rem] flex items-center justify-center shrink-0 transition-all group-hover:scale-105 ${isDestructive ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30' : (colorClass || 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800')}`}>
                <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className={`text-sm font-black text-left tracking-tight ${isDestructive ? 'text-rose-600' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {value && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600">{value}</span>}
            {hasUpdate && <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>}
            <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
    </button>
  );

  const Section = ({ title, children }: any) => (
    <div className="mb-8 anim-fade-in-up is-visible">
        {title && <h3 className="px-6 mb-3 text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">{title}</h3>}
        <div className="rounded-[2.5rem] overflow-hidden shadow-card dark:shadow-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">{children}</div>
    </div>
  );

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
      {activeSection === 'menu' ? (
        <>
            <div className="mb-10 anim-fade-in-up is-visible">
               <div className="rounded-[2.5rem] overflow-hidden shadow-card dark:shadow-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                 <div className="p-7 space-y-6">
                     <div className="flex items-center gap-5">
                         <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30"><User className="w-8 h-8" /></div>
                         <div className="overflow-hidden">
                             <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tight leading-none mb-1">Perfil Cloud</h3>
                             <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-medium">{user ? user.email : 'Carregando...'}</p>
                         </div>
                     </div>
                     <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-[0.15em] rounded-2xl flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30 active:scale-95 transition-all shadow-sm"><LogOut className="w-4 h-4" /> Encerrar Sessão</button>
                 </div>
               </div>
            </div>

            <Section title="Interface">
                <MenuItem icon={Palette} label="Aparência e Tema" onClick={() => setActiveSection('appearance')} index={1} colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 border-violet-100 dark:border-violet-900/30" />
                <MenuItem icon={Bell} label="Notificações" onClick={() => setActiveSection('notifications')} value={pushEnabled ? 'Ativo' : 'Desligado'} index={2} colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" />
                <MenuItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" onClick={() => setActiveSection('privacy')} value={privacyMode ? 'Protegido' : ''} index={3} colorClass="bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 border-teal-100 dark:border-teal-900/30" />
            </Section>

            <Section title="Dados & Serviços">
                <MenuItem icon={Signal} label="Status da Rede" onClick={() => setActiveSection('integrations')} value="OK" index={4} colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" />
                <MenuItem icon={Database} label="Backup e IA Cache" onClick={() => setActiveSection('data')} index={5} colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" />
            </Section>

            <Section title="Suporte">
                <MenuItem icon={RefreshCcw} label="Sistema & Updates" onClick={() => setActiveSection('updates')} hasUpdate={updateAvailable} value={`v${appVersion}`} index={6} colorClass="bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border-sky-100 dark:border-sky-900/30" />
                <MenuItem icon={Info} label="Sobre o App" onClick={() => setActiveSection('about')} index={7} colorClass="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" />
                <MenuItem icon={ShieldAlert} label="Apagar Todos os Dados" onClick={() => setActiveSection('system')} isDestructive index={8} />
            </Section>
        </>
      ) : (
        <div className="anim-fade-in is-visible">
          <div className="flex items-center gap-4 mb-10 px-1">
              <button onClick={() => setActiveSection('menu')} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white hover:bg-zinc-200 transition-all active:scale-90"><ArrowLeft className="w-6 h-6" strokeWidth={3} /></button>
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-1">{getSectionTitle(activeSection)}</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Configuração</p>
              </div>
          </div>
          
          {activeSection === 'appearance' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8 text-center">Esquema de Cores</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map((mode) => (
                            <button 
                                key={mode.id} 
                                onClick={() => onSetTheme(mode.id as ThemeType)} 
                                className={`flex flex-col items-center justify-center p-5 rounded-3xl border transition-all ${theme === mode.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl scale-105' : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                            >
                                <mode.icon className="w-6 h-6 mb-2" strokeWidth={2.5} />
                                <span className="text-[10px] font-black uppercase tracking-wider">{mode.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
              <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-teal-100 dark:border-teal-900/30">
                {privacyMode ? <EyeOff className="w-10 h-10" /> : <Eye className="w-10 h-10" />}
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Ocultar Valores Sensíveis</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">Ative esta opção para esconder os saldos da tela principal, ideal para uso em público.</p>
              <button onClick={() => onSetPrivacyMode(!privacyMode)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                {privacyMode ? 'Desativar Proteção' : 'Ativar Proteção'}
              </button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center mb-6">
                  <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-100 dark:border-amber-900/30">
                    <Bell className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Push Notifications</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">Mantenha-se informado sobre novos proventos e atualizações importantes.</p>
                  <button onClick={onRequestPushPermission} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${pushEnabled ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-amber-500 text-white'}`}>
                    {pushEnabled ? 'Desativar Notificações' : 'Ativar Agora'}
                  </button>
                </div>
                <Section title="Alertas Individuais">
                  <div className="p-2 space-y-2">
                    {[
                      { id: 'divs', icon: BadgeDollarSignIcon, label: 'Proventos Recebidos', checked: notifyDivs, set: setNotifyDivs },
                      { id: 'com', icon: Calendar, label: 'Avisos de Data Com', checked: notifyDataCom, set: setNotifyDataCom },
                      { id: 'upd', icon: Rocket, label: 'Lançamento de Versões', checked: notifyUpdates, set: setNotifyUpdates }
                    ].map(n => (
                      <button key={n.id} onClick={() => n.set(!n.checked)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${n.checked ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                            <n.icon className="w-4 h-4" />
                          </div>
                          <span className={`text-xs font-black tracking-tight ${n.checked ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>{n.label}</span>
                        </div>
                        {n.checked ? <ToggleRight className="w-8 h-8 text-zinc-900 dark:text-white" /> : <ToggleLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />}
                      </button>
                    ))}
                  </div>
                </Section>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
                <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-xl shadow-blue-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Database className="w-32 h-32" /></div>
                    <Database className="w-14 h-14 mx-auto mb-6" strokeWidth={1.5} />
                    <h3 className="text-2xl font-black mb-2 tracking-tight">Cópia de Segurança</h3>
                    <p className="text-sm font-medium opacity-80 mb-8 leading-relaxed">Exporte seus dados em JSON para backup físico ou restaure registros anteriores.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleExport} className="py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg">Exportar</button>
                        <button onClick={() => fileInputRef.current?.click()} className="py-4 bg-blue-700 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform">Restaurar</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
                
                <Section title="Gerenciamento de Cache Local">
                    <div className="p-3 space-y-2">
                        <button onClick={handleClearQuoteCache} className="w-full flex justify-between items-center p-5 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
                            <div>
                              <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight">Cotações da Brapi</span>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Limpar memória temporária</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-rose-500">Limpar</span>
                        </button>
                        <button onClick={handleClearDivCache} className="w-full flex justify-between items-center p-5 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
                            <div>
                              <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight">Dados de IA (Gemini)</span>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Reiniciar histórico de IA</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-rose-500">Limpar</span>
                        </button>
                    </div>
                </Section>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
              <div className="w-24 h-24 bg-white dark:bg-zinc-950 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-zinc-100 dark:border-zinc-800">
                <img src="./logo.svg" alt="InvestFIIs" className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">InvestFIIs Pro</h2>
              <div className="inline-block px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100 dark:border-emerald-900/30">Stable v{appVersion}</div>
              
              <div className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed max-w-xs mx-auto">
                <p>Desenvolvido para ser a ferramenta mais rápida e direta de acompanhamento de ativos na B3.</p>
                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex justify-center gap-10">
                  <button onClick={() => setShowTerms(true)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Termos</button>
                  <button onClick={() => setShowPrivacy(true)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">Privacidade</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">{isOnline ? 'Cloud Online' : 'Cloud Offline'}</span>
                    </div>
                    <button onClick={runServiceCheck} disabled={isServicesChecking} className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-90 transition-all ${isServicesChecking ? 'animate-spin' : ''}`}>
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'supa', icon: Database, label: 'Supabase DB', status: healthStatus.supabase, color: 'emerald' },
                      { id: 'brapi', icon: BarChart3, label: 'Brapi API', status: healthStatus.brapi, color: 'blue' },
                      { id: 'gemini', icon: Sparkles, label: 'Gemini AI', status: lastAiStatus === 'operational' ? 'operational' : 'degraded', color: 'indigo' }
                    ].map(s => (
                      <div key={s.id} className="flex items-center justify-between p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${s.color}-50 dark:bg-${s.color}-900/20 text-${s.color}-600 dark:text-${s.color}-400 border border-${s.color}-100 dark:border-${s.color}-900/30`}>
                            <s.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight">{s.label}</span>
                            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{s.status === 'operational' ? 'Conectado' : s.status === 'checking' ? 'Pinging...' : 'Instável'}</span>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.status === 'operational' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {s.status === 'operational' ? 'Online' : 'Erro'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button onClick={() => { setShowDiagnostics(true); runDiagnostics(); }} className="w-full mt-8 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Ver Diagnóstico Detalhado</button>
                </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="bg-rose-500 p-10 rounded-[3rem] text-white shadow-xl shadow-rose-500/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldAlert className="w-32 h-32" /></div>
                <ShieldAlert className="w-14 h-14 mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="text-2xl font-black mb-2 tracking-tight">Área de Perigo</h3>
                <p className="text-sm font-medium opacity-80 mb-8 leading-relaxed">Isso apagará permanentemente todos os seus dados locais e configurações. A conta na nuvem não será afetada.</p>
                <button onClick={onResetApp} className="w-full py-5 bg-white text-rose-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-transform">Confirmar Reset Total</button>
            </div>
          )}
        </div>
      )}

      {/* Cloud Diagnostics Modal - REFINED */}
      <SwipeableModal isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)}>
        <div className="p-8 pb-24">
            <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-1">Diagnóstico</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Logs de Integração</p>
                </div>
                <button onClick={runDiagnostics} disabled={diagState.step === 'running'} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-90 transition-all">
                  <RefreshCw className={`w-5 h-5 ${diagState.step === 'running' ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="bg-zinc-900 rounded-3xl p-6 min-h-[250px] max-h-[350px] overflow-y-auto border border-zinc-800 shadow-inner font-mono text-[11px] leading-relaxed">
                    {diagState.logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-600 uppercase tracking-widest font-black">Aguardando...</div>
                    ) : (
                        diagState.logs.map(log => (
                            <div key={log.id} className={`mb-2 flex gap-3 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : 'text-zinc-400'}`}>
                                <span className="opacity-40">[{new Date(log.id).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                <span className="font-bold">{log.text}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Latência</p>
                        <p className={`text-2xl font-black tracking-tight ${diagState.latency && diagState.latency < 500 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{diagState.latency ? `${diagState.latency}ms` : '---'}</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Sincronia</p>
                        <p className={`text-2xl font-black tracking-tight ${diagState.integrity === false ? 'text-rose-600' : 'text-zinc-900 dark:text-white'}`}>{diagState.cloudCount !== null ? `${transactions.length}/${diagState.cloudCount}` : '---'}</p>
                    </div>
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* Terms Modal - REFINED */}
      <SwipeableModal isOpen={showTerms} onClose={() => setShowTerms(false)}>
        <div className="p-10 pb-24">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-8 tracking-tight">Termos de Uso</h2>
            <div className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl">
                  <p className="text-amber-800 dark:text-amber-300 font-black uppercase text-[10px] tracking-widest mb-1">Aviso Importante</p>
                  Este aplicativo é uma ferramenta de gestão e não constitui recomendação de compra ou venda de ativos.
                </div>
                <p>As cotações e proventos são obtidos via APIs de terceiros e podem apresentar atrasos ou inconsistências. Não nos responsabilizamos por decisões financeiras tomadas com base nestes dados.</p>
                <p>O uso do serviço de Inteligência Artificial processa dados anônimos de mercado para gerar insights. Seus dados privados nunca são compartilhados publicamente.</p>
                <p className="pt-6 font-black text-zinc-900 dark:text-white uppercase text-[10px] tracking-[0.2em] border-t border-zinc-100 dark:border-zinc-800">Atualizado em Janeiro 2025</p>
            </div>
        </div>
      </SwipeableModal>

      {/* Privacy Modal - REFINED */}
      <SwipeableModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
        <div className="p-10 pb-24">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-8 tracking-tight">Privacidade</h2>
            <div className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                <p>Sua privacidade é inegociável. Coletamos apenas o seu e-mail para autenticação via Supabase e as transações que você mesmo cadastra.</p>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-black text-zinc-900 dark:text-white uppercase text-[10px] tracking-widest mb-2">Armazenamento</h4>
                    Seus dados são criptografados em repouso no banco de dados e acessíveis apenas por você através do seu login.
                  </div>
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-black text-zinc-900 dark:text-white uppercase text-[10px] tracking-widest mb-2">Cookies</h4>
                    Não utilizamos rastreadores de terceiros para fins publicitários. Apenas tokens de sessão necessários para o funcionamento.
                  </div>
                </div>
                <p>Você pode solicitar a exclusão de todos os seus dados a qualquer momento via menu de sistema.</p>
            </div>
        </div>
      </SwipeableModal>

      <ConfirmationModal isOpen={showForceUpdateConfirm} title="Reinstalar App" message="Isso limpará o cache do navegador e recarregará a versão mais recente do servidor. Útil se o app estiver travado. Deseja continuar?" onConfirm={() => { onForceUpdate(); setShowForceUpdateConfirm(false); }} onCancel={() => setShowForceUpdateConfirm(false)} />
      <ConfirmationModal isOpen={!!fileToRestore} title="Restaurar Backup" message="Atenção: Restaurar um backup substituirá TODOS os seus dados atuais. Esta ação não pode ser desfeita. Deseja continuar?" onConfirm={() => { if (fileToRestore) { /* handle restoration */ } setFileToRestore(null); }} onCancel={() => setFileToRestore(null)} />
      <ConfirmationModal isOpen={showLogoutConfirm} title="Sair da Conta" message="Deseja realmente desconectar? Seus dados locais serão mantidos, mas a sincronia cloud será interrompida." onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
};
