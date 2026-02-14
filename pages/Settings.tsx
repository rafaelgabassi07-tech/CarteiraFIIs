
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Database, ShieldAlert, Info, 
  LogOut, Check, Activity, Terminal, Trash2, FileSpreadsheet, FileJson, 
  Smartphone, Github, Globe, CreditCard, LayoutGrid, Zap, Download, Upload
} from 'lucide-react';
import { Transaction, DividendReceipt, ServiceMetric, LogEntry, ThemeType } from '../types';
import { logger } from '../services/logger';
import { parseB3Excel } from '../services/excelService';
import { supabase } from '../services/supabase';
import { SwipeableModal } from '../components/Layout';

interface SettingsProps {
  user: any;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  dividends: DividendReceipt[];
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
  updateAvailable: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  onSyncAll: (force: boolean) => Promise<void>;
  currentVersionDate: string | null;
  onForceUpdate: () => void; 
  services: ServiceMetric[];
  onCheckConnection: () => Promise<void>;
  isCheckingConnection: boolean;
}

const ACCENT_COLORS = [
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#10b981', name: 'Emerald' },
];

const UserProfileCard: React.FC<{ email: string }> = ({ email }) => {
    const initials = email.substring(0, 2).toUpperCase();
    return (
        <div className="bg-zinc-900 text-white p-5 rounded-[2rem] border border-zinc-800 flex items-center gap-4 mb-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/10 transition-colors"></div>
            
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10">
                {initials}
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Conta Conectada</p>
                <p className="text-base font-bold text-white truncate">{email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-medium text-zinc-400">Sincronização Ativa</span>
                </div>
            </div>
        </div>
    );
};

const QuickAction = ({ icon: Icon, label, onClick, colorClass, delay }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect anim-scale-in h-28 w-full`}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
    </button>
);

const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-6">{title}</h3>
);

const SettingsRow = ({ icon: Icon, label, value, onClick, isDestructive = false, isLast = false }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 press-effect hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDestructive ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-bold ${isDestructive ? 'text-rose-600' : 'text-zinc-700 dark:text-zinc-200'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
            <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
    </button>
);

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, dividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, accentColor, onSetAccentColor,
  services, onCheckConnection, isCheckingConnection
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'data' | 'about'>('menu');
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const unsubscribe = logger.subscribe((l: LogEntry[]) => setLogs([...l])); 
      return unsubscribe;
  }, []);
  
  useEffect(() => {
      if (showLogs && logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [logs, showLogs]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
          const { transactions: newTxs, dividends: newDivs } = await parseB3Excel(file);
          
          if (newTxs.length === 0 && newDivs.length === 0) {
              showToast('error', 'Nenhum dado válido identificado.');
          } else {
              const existingSig = new Set(transactions.map(t => `${t.ticker}-${t.date}-${t.type}`));
              const txsToAdd = newTxs.filter(t => !existingSig.has(`${t.ticker}-${t.date}-${t.type}`));
              
              if (txsToAdd.length > 0 && user?.id) {
                  const dbPayload = txsToAdd.map(t => ({
                      ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, asset_type: t.assetType, user_id: user.id
                  }));
                  await supabase.from('transactions').insert(dbPayload);
                  onImportTransactions([...transactions, ...txsToAdd]);
              }

              // Dividends Logic (Simplified)
              if (newDivs.length > 0) {
                  onImportDividends([...dividends, ...newDivs]);
              }

              showToast('success', `Importado: ${txsToAdd.length} ordens.`);
              setActiveSection('menu');
          }
      } catch (error) {
          console.error(error);
          showToast('error', 'Erro ao ler arquivo.');
      } finally {
          setIsImporting(false);
          if (excelInputRef.current) excelInputRef.current.value = '';
      }
  };

  const handleExport = () => {
    const data = { transactions, dividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup.json`;
    a.click();
    showToast('success', 'Backup exportado!');
  };

  return (
    <div className="space-y-4">
        {activeSection !== 'menu' && (
            <div className="flex items-center gap-3 mb-2 anim-slide-in-right sticky top-0 bg-primary-light dark:bg-primary-dark z-20 py-2">
              <button onClick={() => setActiveSection('menu')} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm press-effect transition-transform">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">
                  {activeSection === 'appearance' && 'Personalização'}
                  {activeSection === 'data' && 'Gerenciar Dados'}
                  {activeSection === 'about' && 'Sobre o App'}
                </h2>
              </div>
            </div>
        )}

        <div className="pb-10">
            {activeSection === 'menu' && (
                <div className="anim-fade-in">
                    {user && <UserProfileCard email={user.email} />}

                    {/* Quick Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <QuickAction 
                            icon={Palette} 
                            label="Aparência" 
                            colorClass="bg-purple-100 dark:bg-purple-900/20 text-purple-600" 
                            onClick={() => setActiveSection('appearance')}
                            delay={0}
                        />
                        <QuickAction 
                            icon={Database} 
                            label="Dados & B3" 
                            colorClass="bg-blue-100 dark:bg-blue-900/20 text-blue-600" 
                            onClick={() => setActiveSection('data')}
                            delay={50}
                        />
                        <QuickAction 
                            icon={privacyMode ? EyeOff : Eye} 
                            label={`Privacidade: ${privacyMode ? 'On' : 'Off'}`}
                            colorClass={privacyMode ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"} 
                            onClick={() => onSetPrivacyMode(!privacyMode)}
                            delay={100}
                        />
                        <QuickAction 
                            icon={Bell} 
                            label="Notificações" 
                            colorClass={pushEnabled ? "bg-sky-100 dark:bg-sky-900/20 text-sky-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}
                            onClick={onRequestPushPermission}
                            delay={150}
                        />
                    </div>

                    <SectionHeader title="Sistema" />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <SettingsRow icon={Activity} label="Status de Rede" onClick={onCheckConnection} value={isCheckingConnection ? 'Testando...' : 'Online'} />
                        <SettingsRow icon={Terminal} label="Logs do Sistema" onClick={() => setShowLogs(true)} />
                        <SettingsRow icon={Info} label="Sobre & Versão" onClick={() => setActiveSection('about')} value={`v${appVersion}`} isLast />
                    </div>

                    <div className="mt-8 mb-4">
                        <button 
                            onClick={onLogout} 
                            className="w-full py-4 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 press-effect"
                        >
                            <LogOut className="w-4 h-4" /> Desconectar
                        </button>
                    </div>
                    
                    <p className="text-center text-[10px] text-zinc-400 font-mono">Build: {currentVersionDate || 'Dev'}</p>
                </div>
            )}

            {activeSection === 'appearance' && (
                <div className="space-y-6 anim-slide-up">
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Tema</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map(m => (
                                <button key={m.id} onClick={() => onSetTheme(m.id as ThemeType)} className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 press-effect ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl' : 'bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-400'}`}>
                                    <m.icon className="w-6 h-6 mb-2" strokeWidth={2} />
                                    <span className="text-[10px] font-bold uppercase">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Cor de Destaque</h3>
                        <div className="flex justify-between items-center px-2">
                            {ACCENT_COLORS.map((c) => (
                                <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 shadow-lg' : 'hover:scale-110 opacity-60'}`} style={{ backgroundColor: c.hex, ['--tw-ring-color' as any]: c.hex }}>
                                    {accentColor === c.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'data' && (
                <div className="space-y-4 anim-slide-up">
                    <div className="bg-gradient-to-br from-zinc-800 to-black p-6 rounded-[2rem] text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Importar B3</h3>
                            <p className="text-sm text-zinc-400 mb-6">Traga suas ordens e proventos via planilha Excel oficial.</p>
                            
                            <button onClick={() => excelInputRef.current?.click()} disabled={isImporting} className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg press-effect flex items-center justify-center gap-2">
                                {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isImporting ? 'Processando...' : 'Selecionar Arquivo'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExport} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect flex flex-col items-center justify-center gap-2">
                            <Download className="w-6 h-6 text-blue-500" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Backup JSON</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect flex flex-col items-center justify-center gap-2">
                            <FileJson className="w-6 h-6 text-amber-500" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Restaurar JSON</span>
                        </button>
                    </div>

                    <div className="p-1">
                        <button onClick={onResetApp} className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 press-effect group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Resetar Dados</p>
                                    <p className="text-[10px] text-rose-500/70">Limpa cache local. Nuvem segura.</p>
                                </div>
                            </div>
                            <Trash2 className="w-5 h-5 text-rose-400" />
                        </button>
                    </div>

                    <input type="file" ref={fileInputRef} onChange={() => {}} accept=".json" className="hidden" />
                    <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />
                </div>
            )}

            {activeSection === 'about' && (
                <div className="space-y-6 anim-slide-up text-center pt-8">
                    <div className="w-24 h-24 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center shadow-inner mb-4">
                        <Smartphone className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">InvestFIIs</h2>
                        <p className="text-sm text-zinc-500 font-medium">Gestão Inteligente de Ativos</p>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">v{appVersion}</span>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 press-effect">
                            <Github className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 press-effect">
                            <Globe className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Modal Logs */}
        <SwipeableModal isOpen={showLogs} onClose={() => setShowLogs(false)}>
            <div className="p-0 h-full flex flex-col bg-[#0d1117] text-[#c9d1d9]">
                <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-[#161b22]">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-sm font-bold text-white tracking-wide font-mono">Console</h2>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => { logger.clear(); setLogs([]); }} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => setShowLogs(false)} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors">
                            <Check className="w-4 h-4" />
                         </button>
                    </div>
                </div>
                <div className="flex-1 p-2 font-mono text-[11px] overflow-y-auto overflow-x-hidden">
                    {logs.slice().reverse().map((log) => (
                        <div key={log.id} className={`mb-1 p-1.5 rounded border-l-2 ${log.level === 'error' ? 'border-red-500 bg-red-900/20' : 'border-zinc-700'}`}>
                            <span className="text-zinc-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <pre className="whitespace-pre-wrap mt-1">{log.message}</pre>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};
