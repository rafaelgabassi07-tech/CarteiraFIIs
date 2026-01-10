
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Download, Upload, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, RefreshCw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Box, Layers, Gauge, Info, Wallet, RotateCcw, Activity, Cloud, Loader2, Calendar, Target, TrendingUp, Search, ExternalLink, LogIn, LogOut, User, Mail, FileText, ScrollText, Aperture, CreditCard, Star, ArrowRightLeft, Clock, BarChart3, Signal, Zap, Lock, Smartphone, ActivitySquare, ShieldCheck } from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote, AssetType } from '../types';
import { ThemeType } from '../App';
import { supabase } from '../services/supabase';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';

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
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  lastSyncTime?: Date | null;
  onSyncAll: (force: boolean) => Promise<void>;
  currentVersionDate: string | null;
  lastAiStatus: ServiceStatus;
}

const getSectionTitle = (section: string) => {
  switch (section) {
    case 'appearance': return 'Aparência';
    case 'notifications': return 'Notificações';
    case 'privacy': return 'Privacidade';
    case 'integrations': return 'Serviços';
    case 'data': return 'Backup';
    case 'updates': return 'Sistema';
    case 'about': return 'Sobre';
    case 'system': return 'Reset';
    default: return 'Ajustes';
  }
};

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  privacyMode, onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, onShowChangelog,
  pushEnabled, onRequestPushPermission, lastSyncTime, onSyncAll, currentVersionDate, lastAiStatus
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates' | 'about' | 'privacy'>('menu');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'latest' | 'available'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [healthStatus, setHealthStatus] = useState<{ supabase: ServiceStatus; brapi: ServiceStatus }>({
    supabase: 'checking',
    brapi: 'checking',
  });
  const [isServicesChecking, setIsServicesChecking] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const runServiceCheck = useCallback(async () => {
    setIsServicesChecking(true);
    setHealthStatus({ supabase: 'checking', brapi: 'checking' });
    try {
        const { error: sError } = await supabase.from('transactions').select('id', { count: 'exact', head: true });
        const brapiRes = await fetch(`https://brapi.dev/api/quote/PETR4?token=${process.env.BRAPI_TOKEN}`).catch(() => ({ ok: false }));
        setHealthStatus({ 
            supabase: sError ? 'error' : 'operational', 
            brapi: (brapiRes as any).ok ? 'operational' : 'degraded' 
        });
    } catch { 
        setHealthStatus({ supabase: 'error', brapi: 'error' });
    } finally {
        setIsServicesChecking(false);
    }
  }, []);

  useEffect(() => { if (activeSection === 'integrations') runServiceCheck(); }, [activeSection, runServiceCheck]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncAll(true);
      showMessage('success', 'Nuvem atualizada!');
    } catch (e) {
      showMessage('error', 'Falha na sincronia.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    const data = { transactions, dividends: geminiDividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showMessage('success', 'Backup gerado!');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (json.transactions && Array.isArray(json.transactions)) {
                onImportTransactions(json.transactions);
                if (json.dividends) onImportDividends(json.dividends);
                showMessage('success', 'Dados importados!');
                setActiveSection('menu');
            } else {
                throw new Error('Formato inválido');
            }
        } catch (err) {
            showMessage('error', 'Arquivo inválido.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const QuickAction = ({ icon: Icon, label, onClick, colorClass, index = 0 }: any) => (
    <button 
        onClick={onClick} 
        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-95 transition-all anim-fade-in-up"
        style={{ animationDelay: `${index * 40}ms` }}
    >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${colorClass}`}>
            <Icon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">{label}</span>
    </button>
  );

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
      {activeSection === 'menu' ? (
        <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between anim-fade-in">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center border border-sky-100 dark:border-sky-900/30">
                        <User className="w-7 h-7" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-lg text-zinc-900 dark:text-white tracking-tight leading-none mb-1 truncate">{user?.email?.split('@')[0]}</h3>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Sessão Ativa</p>
                    </div>
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center border border-rose-100 dark:border-rose-900/30 active:scale-90 transition-all">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Grid of Actions */}
            <div className="grid grid-cols-2 gap-4">
                <QuickAction icon={Palette} label="Aparência" onClick={() => setActiveSection('appearance')} colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/20" index={1} />
                <QuickAction icon={Signal} label="Serviços" onClick={() => setActiveSection('integrations')} colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" index={2} />
                <QuickAction icon={Database} label="Backup" onClick={() => setActiveSection('data')} colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20" index={3} />
                <QuickAction icon={Rocket} label="Sistema" onClick={() => setActiveSection('updates')} colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20" index={4} />
            </div>

            {/* Bottom Menu Items */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <button onClick={() => setActiveSection('privacy')} className="w-full p-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center"><Eye className="w-5 h-5" /></div>
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">Privacidade</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{privacyMode ? 'ON' : 'OFF'}</span>
                </button>
                <button onClick={() => setActiveSection('notifications')} className="w-full p-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center"><Bell className="w-5 h-5" /></div>
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">Notificações</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{pushEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <button onClick={() => setActiveSection('about')} className="w-full p-5 flex items-center justify-between active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center"><Info className="w-5 h-5" /></div>
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">Sobre o Projeto</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                </button>
            </div>

            <button onClick={() => setActiveSection('system')} className="w-full py-5 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity">Área de Perigo</button>
        </div>
      ) : (
        <div className="anim-fade-in">
          <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setActiveSection('menu')} className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white active:scale-90 transition-all shadow-sm">
                <ArrowLeft className="w-6 h-6" strokeWidth={3} />
              </button>
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-1">{getSectionTitle(activeSection)}</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ajustes do App</p>
              </div>
          </div>
          
          {activeSection === 'appearance' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8 text-center">Modo de Exibição</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map((mode) => (
                        <button key={mode.id} onClick={() => onSetTheme(mode.id as ThemeType)} className={`flex flex-col items-center justify-center p-5 rounded-3xl border transition-all ${theme === mode.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg scale-105' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-800'}`}>
                            <mode.icon className="w-6 h-6 mb-2" strokeWidth={2.5} />
                            <span className="text-[10px] font-black uppercase tracking-wider">{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card">
                    <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Painel de Status</span>
                        <button onClick={runServiceCheck} disabled={isServicesChecking} className={`w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 ${isServicesChecking ? 'animate-spin' : ''}`}>
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {[
                          { id: 'supa', icon: Database, label: 'Cloud DB', status: healthStatus.supabase },
                          { id: 'brapi', icon: BarChart3, label: 'Brapi API', status: healthStatus.brapi },
                          { id: 'gemini', icon: Sparkles, label: 'Gemini AI', status: lastAiStatus }
                        ].map(s => (
                          <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.status === 'operational' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}><s.icon className="w-4 h-4" /></div>
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{s.label}</span>
                             </div>
                             <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${s.status === 'operational' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{s.status === 'operational' ? 'Online' : 'Erro'}</div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-8">
                        <button onClick={handleManualSync} disabled={isSyncing} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                            Forçar Sincronia Cloud
                        </button>
                        <p className="text-center text-[9px] text-zinc-400 font-bold uppercase mt-4">Última conexão: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Pendente'}</p>
                    </div>
                </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-blue-100 dark:border-blue-900/30">
                        <Download className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Backup Físico</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">Baixe seus dados em formato JSON para importar em outro dispositivo futuramente.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExport} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Exportar</button>
                        <button onClick={handleImportClick} disabled={isImporting} className="py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Importar
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                </div>
            </div>
          )}

          {activeSection === 'updates' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
                <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-sky-100 dark:border-sky-900/30">
                    <Rocket className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-1">Versão v{appVersion}</h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-8">{currentVersionDate || 'Compilação Estável'}</p>
                
                <div className="space-y-3">
                    <button 
                        onClick={async () => {
                            setCheckStatus('checking');
                            const update = await onCheckUpdates();
                            setCheckStatus(update ? 'available' : 'latest');
                            if (!update) setTimeout(() => setCheckStatus('idle'), 3000);
                        }} 
                        disabled={checkStatus === 'checking'}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${checkStatus === 'available' ? 'bg-emerald-500 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}
                    >
                        {checkStatus === 'checking' ? 'Verificando...' : checkStatus === 'available' ? 'Atualização Disponível!' : checkStatus === 'latest' ? 'App Atualizado' : 'Verificar Atualizações'}
                    </button>
                    <button onClick={onShowChangelog} className="w-full py-4 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Ver Notas da Versão</button>
                </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border ${privacyMode ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
                    {privacyMode ? <EyeOff className="w-10 h-10" /> : <Eye className="w-10 h-10" />}
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">Ocultar Patrimônio</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">Oculta valores financeiros na tela principal para uso em locais públicos.</p>
                <button onClick={() => onSetPrivacyMode(!privacyMode)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                    {privacyMode ? 'Desativar' : 'Ativar Proteção'}
                </button>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="bg-rose-600 p-10 rounded-[3rem] text-white shadow-xl shadow-rose-500/20 text-center relative overflow-hidden">
                <ShieldAlert className="w-14 h-14 mx-auto mb-6" strokeWidth={1.5} />
                <h3 className="text-2xl font-black mb-2 tracking-tight">Limpeza Total</h3>
                <p className="text-sm font-medium opacity-80 mb-8 leading-relaxed">Apaga o cache local, configurações de tema e desconecta sua conta. Seus dados na nuvem permanecem seguros.</p>
                <button onClick={onResetApp} className="w-full py-5 bg-white text-rose-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-transform">Confirmar Reset Local</button>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card text-center">
                <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-zinc-100 dark:border-zinc-800">
                    <img src="./logo.svg" alt="InvestFIIs" className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">InvestFIIs Pro</h2>
                <div className="inline-block px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-emerald-100 dark:border-emerald-900/30">Official Stable</div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed max-w-xs mx-auto mb-8">Gestão de ativos B3 com inteligência artificial e sincronização em tempo real.</p>
                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex justify-center gap-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Termos</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Privacidade</span>
                </div>
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

      <ConfirmationModal isOpen={showLogoutConfirm} title="Sair da Conta" message="Seus dados estão seguros na nuvem. Deseja realmente encerrar a sessão?" onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
};
