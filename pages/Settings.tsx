
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
  
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'offline'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);

  const [healthStatus, setHealthStatus] = useState<{ supabase: ServiceStatus; brapi: ServiceStatus }>({
    supabase: 'checking',
    brapi: 'checking',
  });
  const [isServicesChecking, setIsServicesChecking] = useState(false);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagState, setDiagState] = useState<{
    step: 'idle' | 'running' | 'done' | 'error';
    logs: { id: number, text: string, type: 'info' | 'success' | 'error' | 'warn' }[];
    latency: number | null;
    cloudCount: number | null;
    integrity: boolean | null;
  }>({
    step: 'idle',
    logs: [],
    latency: null,
    cloudCount: null,
    integrity: null
  });

  const runServiceCheck = useCallback(async () => {
    setIsServicesChecking(true);
    setHealthStatus({ supabase: 'checking', brapi: 'checking' });

    const checkSupabase = async (): Promise<ServiceStatus> => {
        if (!user?.id) return 'error';
        const { error } = await supabase.from('transactions').select('id', { count: 'exact', head: true });
        return error ? 'error' : 'operational';
    };
    const checkBrapi = async (): Promise<ServiceStatus> => {
        try {
            const res = await fetch(`https://brapi.dev/api/quote/PETR4?token=${process.env.BRAPI_TOKEN}`);
            return res.ok ? 'operational' : 'degraded';
        } catch { return 'error'; }
    };
    const [supabaseResult, brapiResult] = await Promise.all([checkSupabase(), checkBrapi()]);
    setHealthStatus({ supabase: supabaseResult, brapi: brapiResult });
    setIsServicesChecking(false);
  }, [user]);

  useEffect(() => { if (activeSection === 'integrations') runServiceCheck(); }, [activeSection, runServiceCheck]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncAll(true);
      showMessage('success', 'Sincronização concluída!');
    } catch (e) {
      showMessage('error', 'Erro ao sincronizar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckStatus('checking');
    const hasUpdate = await onCheckUpdates();
    if (hasUpdate) setCheckStatus('available');
    else { 
      setCheckStatus('latest'); 
      setTimeout(() => setCheckStatus('idle'), 3000); 
    }
  };

  // Fix: Implemented handleExport to generate a downloadable JSON backup of the user's data.
  const handleExport = () => {
    const data = {
      transactions,
      dividends: geminiDividends,
      exportedAt: new Date().toISOString(),
      version: appVersion
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('success', 'Backup gerado com sucesso!');
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
                             <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-medium">{user ? user.email : 'Conectando...'}</p>
                         </div>
                     </div>
                     <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-[0.15em] rounded-2xl flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30 active:scale-95 transition-all shadow-sm"><LogOut className="w-4 h-4" /> Encerrar Sessão</button>
                 </div>
               </div>
            </div>

            <Section title="Interface">
                <MenuItem icon={Palette} label="Aparência e Tema" onClick={() => setActiveSection('appearance')} index={1} colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 border-violet-100 dark:border-violet-900/30" />
                <MenuItem icon={Bell} label="Notificações" onClick={() => setActiveSection('notifications')} value={pushEnabled ? 'Ativo' : 'Off'} index={2} colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" />
                <MenuItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" onClick={() => setActiveSection('privacy')} value={privacyMode ? 'Ativo' : ''} index={3} colorClass="bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 border-teal-100 dark:border-teal-900/30" />
            </Section>

            <Section title="Dados & Serviços">
                <MenuItem icon={Signal} label="Status da Rede" onClick={() => setActiveSection('integrations')} value="OK" index={4} colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" />
                <MenuItem icon={Database} label="Backup e Cache" onClick={() => setActiveSection('data')} index={5} colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" />
            </Section>

            <Section title="Suporte">
                <MenuItem icon={RefreshCcw} label="Sistema & Updates" onClick={() => setActiveSection('updates')} hasUpdate={updateAvailable} value={`v${appVersion}`} index={6} colorClass="bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border-sky-100 dark:border-sky-900/30" />
                <MenuItem icon={Info} label="Sobre o App" onClick={() => setActiveSection('about')} index={7} colorClass="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" />
                <MenuItem icon={ShieldAlert} label="Resetar App" onClick={() => setActiveSection('system')} isDestructive index={8} />
            </Section>
        </>
      ) : (
        <div className="anim-fade-in is-visible">
          <div className="flex items-center gap-4 mb-10 px-1">
              <button onClick={() => setActiveSection('menu')} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white hover:bg-zinc-200 transition-all active:scale-90"><ArrowLeft className="w-6 h-6" strokeWidth={3} /></button>
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-1">{getSectionTitle(activeSection)}</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ajustes</p>
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
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Ocultar Valores</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">Esconda os saldos na tela inicial para maior privacidade em locais públicos.</p>
              <button onClick={() => onSetPrivacyMode(!privacyMode)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                {privacyMode ? 'Desativar Proteção' : 'Ativar Proteção'}
              </button>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
                  <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-100 dark:border-amber-900/30">
                    <Bell className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Alertas Push</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">Receba avisos sobre pagamentos de dividendos e novidades do sistema.</p>
                  <button onClick={onRequestPushPermission} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${pushEnabled ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-amber-500 text-white'}`}>
                    {pushEnabled ? 'Desativar Notificações' : 'Ativar Agora'}
                  </button>
                </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">{isOnline ? 'Conectado' : 'Offline'}</span>
                    </div>
                    <button onClick={runServiceCheck} disabled={isServicesChecking} className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-90 transition-all ${isServicesChecking ? 'animate-spin' : ''}`}>
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { id: 'supa', icon: Database, label: 'Nuvem (DB)', status: healthStatus.supabase, color: 'emerald' },
                      { id: 'brapi', icon: BarChart3, label: 'Cotações (API)', status: healthStatus.brapi, color: 'blue' },
                      { id: 'gemini', icon: Sparkles, label: 'Análise (AI)', status: lastAiStatus === 'operational' ? 'operational' : 'degraded', color: 'indigo' }
                    ].map(s => (
                      <div key={s.id} className="flex items-center justify-between p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${s.color}-50 dark:bg-${s.color}-900/20 text-${s.color}-600 dark:text-${s.color}-400 border border-${s.color}-100 dark:border-${s.color}-900/30`}>
                            <s.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight">{s.label}</span>
                            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{s.status === 'operational' ? 'OK' : 'Falha'}</span>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.status === 'operational' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {s.status === 'operational' ? 'Online' : 'Erro'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 space-y-3">
                    <button onClick={handleManualSync} disabled={isSyncing} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                      Sincronizar com a Nuvem
                    </button>
                    <p className="text-center text-[9px] text-zinc-400 font-bold uppercase">Última sincronia: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : '---'}</p>
                  </div>
                </div>
            </div>
          )}

          {activeSection === 'updates' && (
            <div className="space-y-6">
               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
                  <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-sky-100 dark:border-sky-900/30">
                    <Rocket className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-1">Versão v{appVersion}</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8">{currentVersionDate || 'Versão Atual'}</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={handleCheckUpdate} 
                      disabled={checkStatus === 'checking'}
                      className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                        checkStatus === 'available' ? 'bg-emerald-500 text-white' : 
                        checkStatus === 'latest' ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600' :
                        'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      }`}
                    >
                      {checkStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                      {checkStatus === 'available' ? 'Baixar Nova Versão' : checkStatus === 'latest' ? 'Versão mais recente!' : 'Verificar Atualizações'}
                    </button>
                    
                    <button onClick={onShowChangelog} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Ver Notas de Lançamento</button>
                  </div>
               </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
                <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-xl shadow-blue-500/20 text-center relative overflow-hidden">
                    <Database className="w-14 h-14 mx-auto mb-6" strokeWidth={1.5} />
                    <h3 className="text-2xl font-black mb-2 tracking-tight">Exportação JSON</h3>
                    <p className="text-sm font-medium opacity-80 mb-8 leading-relaxed">Baixe uma cópia física dos seus dados.</p>
                    <button onClick={handleExport} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg">Gerar Arquivo de Backup</button>
                </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
              <div className="w-24 h-24 bg-white dark:bg-zinc-950 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-zinc-100 dark:border-zinc-800">
                <img src="./logo.svg" alt="InvestFIIs" className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">InvestFIIs Pro</h2>
              <div className="inline-block px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100 dark:border-emerald-900/30">Versão Estável</div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed max-w-xs mx-auto mb-8">O app mais rápido e funcional para acompanhar sua carteira de dividendos na B3.</p>
              <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex justify-center gap-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Termos</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Privacidade</span>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="bg-rose-500 p-10 rounded-[3rem] text-white shadow-xl shadow-rose-500/20 text-center relative overflow-hidden">
                <ShieldAlert className="w-14 h-14 mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="text-2xl font-black mb-2 tracking-tight">Área de Perigo</h3>
                <p className="text-sm font-medium opacity-80 mb-8 leading-relaxed">Apagar o cache local removerá configurações de tema e sessões abertas. Seus dados na nuvem continuam salvos.</p>
                <button onClick={onResetApp} className="w-full py-5 bg-white text-rose-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-transform">Confirmar Reset Local</button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] anim-fade-in-up is-visible">
          <div className={`px-6 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      <ConfirmationModal isOpen={showLogoutConfirm} title="Encerrar Sessão" message="Deseja realmente sair? Seus dados estão seguros na nuvem." onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
};
