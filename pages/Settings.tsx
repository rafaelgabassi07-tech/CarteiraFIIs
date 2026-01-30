
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Rocket, Database, ShieldAlert, Info, 
  User, LogOut, Check, AlertTriangle, Globe, Github, Smartphone, Copy, CheckCircle2,
  Wifi, Activity, XCircle, Terminal, Trash2, Filter, FileSpreadsheet, FileJson, Server, X
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
  { hex: '#0ea5e9', name: 'Sky Blue' },
  { hex: '#3b82f6', name: 'Royal Blue' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#10b981', name: 'Emerald' },
];

const UserProfileCard: React.FC<{ email: string }> = ({ email }) => {
    const initials = email.substring(0, 2).toUpperCase();
    return (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 mb-6 shadow-sm anim-scale-in">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Conta Conectada</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{email}</p>
            </div>
        </div>
    );
};

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, dividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, accentColor, onSetAccentColor,
  services, onCheckConnection, isCheckingConnection, onForceUpdate
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'privacy' | 'notifications' | 'services' | 'data' | 'about' | 'reset'>('menu');
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // States para o Logger
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [notificationPrefs, setNotificationPrefs] = useState({
    dividends: true,
    prices: false,
    weekly: true,
    updates: true
  });

  useEffect(() => {
      const unsubscribe = logger.subscribe((l: LogEntry[]) => setLogs([...l])); 
      return unsubscribe;
  }, []);
  
  // Auto-scroll logs
  useEffect(() => {
      if (showLogs && logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [logs, showLogs]);
  
  // Auto-trigger para Health Check ao entrar na seção
  useEffect(() => {
    if (activeSection === 'services') {
        onCheckConnection();
    }
  }, [activeSection, onCheckConnection]);

  useEffect(() => {
    const saved = localStorage.getItem('investfiis_notif_prefs_v1');
    if (saved) {
      try { setNotificationPrefs(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveNotifPrefs = (newPrefs: any) => {
    setNotificationPrefs(newPrefs);
    localStorage.setItem('investfiis_notif_prefs_v1', JSON.stringify(newPrefs));
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    const data = { transactions, dividends: dividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup.json`;
    a.click();
    showToast('success', 'Backup exportado!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions) {
          onImportTransactions(json.transactions);
          if (json.dividends) onImportDividends(json.dividends);
          showToast('success', 'Backup restaurado!');
          setActiveSection('menu');
        }
      } catch (err) {
        showToast('error', 'Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
          const { transactions: newTxs, dividends: newDivs } = await parseB3Excel(file);
          
          if (newTxs.length === 0 && newDivs.length === 0) {
              showToast('error', 'Nenhum dado válido identificado na planilha.');
          } else {
              const existingSig = new Set(transactions.map(t => 
                  `${t.ticker.trim().toUpperCase()}-${t.date.split('T')[0]}-${Math.round(t.quantity)}-${Math.round(t.price * 100)}-${t.type}`
              ));
              
              const txsToAdd = newTxs.filter(t => {
                  const sig = `${t.ticker.trim().toUpperCase()}-${t.date.split('T')[0]}-${Math.round(t.quantity)}-${Math.round(t.price * 100)}-${t.type}`;
                  return !existingSig.has(sig);
              });
              
              if (txsToAdd.length > 0 && user?.id) {
                  const dbPayload = txsToAdd.map(t => ({
                      ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, asset_type: t.assetType, user_id: user.id
                  }));
                  await supabase.from('transactions').insert(dbPayload);
                  onImportTransactions([...transactions, ...txsToAdd]);
              }

              const combinedDivs = [...dividends];
              let divsAddedCount = 0;
              const divsToSync: DividendReceipt[] = [];
              
              newDivs.forEach(d => {
                  const paymentMonth = d.paymentDate.substring(0, 7);
                  const exists = combinedDivs.some(existing => {
                      const existingMonth = existing.paymentDate.substring(0, 7);
                      return existing.ticker.trim().toUpperCase() && existing.type === d.type && existingMonth === paymentMonth;
                  });
                  if (!exists) {
                      combinedDivs.push(d);
                      divsToSync.push(d);
                      divsAddedCount++;
                  }
              });

              if (divsToSync.length > 0) {
                  const divPayload = divsToSync.map(d => ({ ticker: d.ticker, type: d.type, date_com: d.dateCom, payment_date: d.paymentDate, rate: d.rate }));
                  await supabase.from('market_dividends').upsert(divPayload, { onConflict: 'ticker, type, date_com, payment_date, rate', ignoreDuplicates: true });
                  onImportDividends(combinedDivs);
              }

              showToast('success', `Importado: ${txsToAdd.length} ordens, ${divsAddedCount} proventos.`);
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

  const handleCopyDebug = () => {
    const info = `App: InvestFIIs v${appVersion}\nDate: ${new Date().toISOString()}\nUser: ${user?.id}\nTheme: ${theme}`;
    navigator.clipboard.writeText(info);
    showToast('success', 'Info copiada!');
  };

  const SettingItem = ({ icon: Icon, label, value, color, onClick, isLast = false, badge }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors press-effect ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
        {badge && <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></div>}
        <ChevronRight className="w-4 h-4 text-zinc-300" />
      </div>
    </button>
  );

  const ToggleItem = ({ label, description, isOn, onToggle }: any) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
        <div><h4 className="text-sm font-bold text-zinc-900 dark:text-white">{label}</h4>{description && <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{description}</p>}</div>
        <button onClick={onToggle} className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 flex items-center press-effect ${isOn ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isOn ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </button>
    </div>
  );

  const Group = ({ title, children, delay = 0 }: any) => (
    <div className="mb-4 anim-stagger-item" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{title}</h3>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">{children}</div>
    </div>
  );

  const ModalHeader = ({ title, subtitle, icon: Icon, color }: any) => (
      <div className="flex items-center gap-4 mb-5 px-2 anim-slide-up">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 ${color}`}>
              <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none">{title}</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{subtitle}</p>
          </div>
      </div>
  );

  return (
    <div className="space-y-4">
        {activeSection !== 'menu' && (
            <div className="flex items-center gap-3 mb-2 anim-slide-in-right sticky top-0 bg-primary-light dark:bg-primary-dark z-20 py-2">
              <button onClick={() => setActiveSection('menu')} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm press-effect transition-transform">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">
                  {activeSection === 'appearance' && 'Aparência'}
                  {activeSection === 'privacy' && 'Privacidade'}
                  {activeSection === 'notifications' && 'Notificações'}
                  {activeSection === 'services' && 'Status de Rede'}
                  {activeSection === 'data' && 'Backup & Dados'}
                  {activeSection === 'about' && 'Sobre'}
                  {activeSection === 'reset' && 'Atenção'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ajustes</p>
              </div>
            </div>
        )}

        {/* 
            Container seguro sem overflow-y auto forçado na div filha para evitar conflito com o scroll da página principal.
            Removido 'anim-fade-in' do container raiz durante interações pesadas para evitar flickering.
        */}
        <div className="pb-10">
            {activeSection === 'menu' && (
                <div className="space-y-4 anim-fade-in">
                    
                    {user && <UserProfileCard email={user.email} />}

                    <Group title="Geral" delay={0}>
                        <SettingItem icon={Palette} label="Aparência" value={theme === 'system' ? 'Auto' : theme === 'dark' ? 'Escuro' : 'Claro'} color="bg-purple-100 dark:bg-purple-900/20 text-purple-600" onClick={() => setActiveSection('appearance')} />
                        <SettingItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" value={privacyMode ? 'Ativo' : 'Inativo'} color="bg-teal-100 dark:bg-teal-900/20 text-teal-600" onClick={() => setActiveSection('privacy')} />
                        <SettingItem icon={Bell} label="Notificações" value={pushEnabled ? 'On' : 'Off'} color="bg-sky-100 dark:bg-sky-900/20 text-sky-600" onClick={() => setActiveSection('notifications')} isLast />
                    </Group>

                    <Group title="Sistema" delay={100}>
                        <SettingItem icon={Activity} label="Status de Rede" color="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" onClick={() => setActiveSection('services')} />
                        <SettingItem icon={Database} label="Backup & Dados" color="bg-blue-100 dark:bg-blue-900/20 text-blue-600" onClick={() => setActiveSection('data')} isLast />
                    </Group>

                    <Group title="Outros" delay={200}>
                        <SettingItem icon={Info} label="Sobre" color="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" onClick={() => setActiveSection('about')} />
                        <SettingItem icon={ShieldAlert} label="Resetar App" color="bg-rose-100 dark:bg-rose-900/20 text-rose-600" onClick={() => setActiveSection('reset')} isLast />
                    </Group>

                    <div className="pt-4 pb-8 anim-slide-up" style={{ animationDelay: '300ms' }}>
                        <button 
                            onClick={onLogout} 
                            className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900 text-rose-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-rose-100 dark:border-zinc-800 press-effect hover:bg-rose-50 dark:hover:bg-rose-900/10"
                        >
                            <LogOut className="w-4 h-4" /> Desconectar Conta
                        </button>
                        <p className="text-[9px] text-zinc-400 text-center mt-3">ID: {user?.id}</p>
                    </div>
                </div>
            )}

            {/* --- CONTEÚDO DAS SEÇÕES (Renderização Condicional Limpa) --- */}

            {activeSection === 'appearance' && (
            <div className="space-y-6">
                <ModalHeader title="Aparência" subtitle="Personalização" icon={Palette} color="bg-purple-100 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-900/30" />
                
                <div className="space-y-2 anim-slide-up">
                    <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tema do App</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map(m => (
                        <button key={m.id} onClick={() => onSetTheme(m.id as ThemeType)} className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 press-effect ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl ring-2 ring-offset-2 ring-zinc-900 dark:ring-white ring-offset-zinc-50 dark:ring-offset-zinc-950' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                            <m.icon className="w-6 h-6 mb-2" strokeWidth={1.5} />
                            <span className="text-[9px] font-black uppercase tracking-wider">{m.label}</span>
                        </button>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-2 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cor de Destaque</h3>
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center shadow-sm">
                        {ACCENT_COLORS.map((c) => (
                            <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === c.hex ? 'scale-125 shadow-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : 'hover:scale-110 opacity-70'}`} style={{ backgroundColor: c.hex, ['--tw-ring-color' as any]: c.hex }}>
                                {accentColor === c.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            )}

            {activeSection === 'notifications' && (
                <div className="space-y-4">
                    <ModalHeader title="Notificações" subtitle="Alertas & Push" icon={Bell} color="bg-sky-100 dark:bg-sky-900/20 text-sky-600 border-sky-200 dark:border-sky-900/30" />
                    
                    <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/30 flex items-center gap-4 shadow-sm anim-slide-up">
                        <div className="w-10 h-10 bg-white dark:bg-sky-900/50 rounded-xl flex items-center justify-center text-sky-500 shadow-md shrink-0"><Bell className="w-5 h-5" /></div>
                        <div className="flex-1"><h3 className="font-black text-sky-900 dark:text-sky-100 text-base tracking-tight">Ativar Push</h3><p className="text-[10px] font-medium text-sky-700 dark:text-sky-300 mt-0.5 leading-tight">Receba alertas sobre proventos.</p></div>
                        <button onClick={onRequestPushPermission} className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 flex items-center press-effect ${pushEnabled ? 'bg-sky-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${pushEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    
                    {pushEnabled && (
                        <div className="space-y-2 anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <h3 className="px-2 mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Categorias</h3>
                            <ToggleItem label="Novos Proventos" description="Quando um FII ou Ação anunciar pagamento" isOn={notificationPrefs.dividends} onToggle={() => saveNotifPrefs({...notificationPrefs, dividends: !notificationPrefs.dividends})} />
                            <ToggleItem label="Variações Bruscas" description="Alertas de alta/baixa superior a 5%" isOn={notificationPrefs.prices} onToggle={() => saveNotifPrefs({...notificationPrefs, prices: !notificationPrefs.prices})} />
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'services' && (
            <div className="space-y-4">
                <ModalHeader title="Rede" subtitle="Status dos Serviços" icon={Activity} color="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/30" />
                
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm anim-slide-up">
                <div className="flex justify-between items-center mb-1">
                    <div><h3 className="text-xs font-bold text-zinc-900 dark:text-white">Conectividade</h3><p className="text-[10px] text-zinc-500 mt-0.5">Diagnóstico em tempo real</p></div>
                    <button onClick={onCheckConnection} disabled={isCheckingConnection} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 press-effect ${isCheckingConnection ? 'opacity-70' : ''}`}>
                    <RefreshCw className={`w-3 h-3 ${isCheckingConnection ? 'animate-spin' : ''}`} /> {isCheckingConnection ? 'Testando...' : 'Re-testar'}
                    </button>
                </div>
                <div className="space-y-2">
                    {services.map((s) => (
                        <button key={s.id} onClick={() => setSelectedServiceId(s.id)} className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group press-effect">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${s.status === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : s.status === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : s.status === 'error' ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                                    {s.icon && <s.icon className="w-4 h-4" />}
                                </div>
                                <div className="text-left"><p className="text-xs font-bold text-zinc-900 dark:text-white">{s.label}</p><p className="text-[9px] text-zinc-500 font-mono">{s.url ? new URL(s.url).hostname : 'Localhost'}</p></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    {s.latency !== null ? <span className={`block text-[9px] font-black ${s.latency < 200 ? 'text-emerald-500' : s.latency < 800 ? 'text-amber-500' : 'text-rose-500'}`}>{s.latency}ms</span> : <span className="block text-[9px] text-zinc-400">-</span>}
                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-emerald-500 animate-pulse' : s.status === 'degraded' ? 'bg-amber-500' : s.status === 'error' ? 'bg-rose-500' : 'bg-zinc-300'}`}></div>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400">{s.status === 'operational' ? 'Online' : s.status === 'checking' ? 'Testando' : s.status}</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                </div>
                
                <button onClick={() => setShowLogs(true)} className="w-full p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl flex items-center justify-between group press-effect anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 dark:bg-zinc-900/10 flex items-center justify-center text-white dark:text-zinc-900"><Terminal className="w-4 h-4" /></div>
                        <div className="text-left"><h4 className="text-xs font-black mb-0.5">Logs do Sistema</h4><p className="text-[9px] opacity-70 font-mono">{logs.length} registro(s)</p></div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
            )}

            {activeSection === 'data' && (
            <div className="space-y-4">
                <ModalHeader title="Dados" subtitle="Backup & Importação" icon={Database} color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-900/30" />
                
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center shadow-sm anim-slide-up">
                <div className="space-y-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30"><FileSpreadsheet className="w-5 h-5" /></div>
                            <div><h4 className="text-xs font-black text-zinc-900 dark:text-white">Importar da B3</h4><p className="text-[10px] text-zinc-500 mt-0.5">Arquivos Excel (.xlsx)</p></div>
                        </div>
                        <button onClick={() => excelInputRef.current?.click()} disabled={isImporting} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg press-effect flex items-center justify-center gap-2 relative z-10">
                            {isImporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />} {isImporting ? 'Lendo...' : 'Selecionar Planilha'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleExport} className="py-3 bg-blue-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 press-effect flex flex-col items-center justify-center gap-1.5 h-20">
                            <Database className="w-5 h-5" /> Exportar Backup
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-black text-[9px] uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 press-effect flex flex-col items-center justify-center gap-1.5 h-20 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                            <FileJson className="w-5 h-5" /> Importar JSON
                        </button>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
                <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />
                </div>
            </div>
            )}

            {activeSection === 'privacy' && (
            <div className="space-y-4">
                <ModalHeader title="Privacidade" subtitle="Segurança Visual" icon={privacyMode ? EyeOff : Eye} color="bg-teal-100 dark:bg-teal-900/20 text-teal-600 border-teal-200 dark:border-teal-900/30" />
                
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center shadow-sm anim-slide-up">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-500 ${privacyMode ? 'bg-teal-500 text-white shadow-xl shadow-teal-500/30 rotate-0' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 rotate-12'}`}>
                    {privacyMode ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-1">Modo Discreto {privacyMode ? 'Ativado' : 'Desativado'}</h3>
                    <p className="text-[10px] text-zinc-500 mb-6 leading-relaxed max-w-xs mx-auto">Oculta todos os valores monetários na tela inicial e listagens.</p>
                    <button onClick={() => onSetPrivacyMode(!privacyMode)} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg press-effect transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-teal-500 text-white shadow-teal-500/20'}`}>
                    {privacyMode ? 'Desativar Proteção' : 'Ativar Proteção'}
                    </button>
                </div>
            </div>
            )}

            {activeSection === 'reset' && (
            <div className="space-y-4">
                <ModalHeader title="Zona de Perigo" subtitle="Ações Destrutivas" icon={ShieldAlert} color="bg-rose-100 dark:bg-rose-900/20 text-rose-600 border-rose-200 dark:border-rose-900/30" />
                
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center shadow-sm anim-slide-up">
                    <div className="w-14 h-14 bg-rose-500 text-white mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-500/30"><Trash2 className="w-8 h-8" /></div>
                    <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mb-1">Resetar Aplicação</h3>
                    <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mb-6 leading-relaxed max-w-xs mx-auto">
                        Apaga cache local e preferências. Seus dados na nuvem <strong>não</strong> serão afetados.
                    </p>
                    <button onClick={onResetApp} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 press-effect hover:bg-rose-700 transition-colors">
                        Confirmar Limpeza
                    </button>
                </div>
            </div>
            )}

            {activeSection === 'about' && (
            <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 text-center overflow-hidden relative shadow-sm mt-4 anim-slide-up">
                    <div className="flex items-center justify-center gap-1 mb-4 relative select-none">
                        <div className="w-[50px] h-[60px] flex items-center justify-center relative z-10 anim-float">
                        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[0_8px_16px_rgba(14,165,233,0.3)]">
                                <defs>
                                    <linearGradient id="logo_grad_about" x1="128" y1="40" x2="384" y2="472" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#10b981"/>
                                        <stop offset="50%" stopColor="#0ea5e9"/>
                                        <stop offset="100%" stopColor="#4f46e5"/>
                                    </linearGradient>
                                </defs>
                                <path d="M256 64L464 272H384L256 144L128 272H48L256 64Z" fill="url(#logo_grad_about)"/>
                                <path d="M176 296L256 248L336 296V312H176V296Z" fill="url(#logo_grad_about)"/>
                                <rect x="184" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_about)"/><rect x="240" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_about)"/><rect x="296" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_about)"/>
                                <path d="M160 448H352C356.418 448 360 451.582 360 456V472H152V456C152 451.582 155.582 448 160 448Z" fill="url(#logo_grad_about)"/>
                        </svg>
                        </div>
                        <span className="font-display text-[40px] font-extrabold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400 mt-1 -ml-1 drop-shadow-sm">NVEST</span>
                    </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4 border border-zinc-200 dark:border-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">v{appVersion}</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6 max-w-xs mx-auto">Gestão inteligente e simplificada para carteiras de dividendos na B3. Focado em performance e design.</p>
                <div className="flex justify-center gap-3">
                    <button className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-100 dark:border-zinc-700 press-effect"><Github className="w-5 h-5" /></button>
                    <button className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-100 dark:border-zinc-700 press-effect"><Globe className="w-5 h-5" /></button>
                </div>
                </div>
                
                <div className="bg-zinc-900 dark:bg-black p-5 rounded-2xl text-left relative overflow-hidden group border border-zinc-800 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="relative z-10">
                        <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Smartphone className="w-3 h-3 text-zinc-400" /> Info Técnica</h4>
                        <div className="text-[9px] font-mono text-zinc-500 space-y-1 border-l-2 border-zinc-800 pl-2">
                            <p>User ID: {user?.id?.substring(0,8)}...</p>
                            <p>Build: {currentVersionDate || 'Dev Branch'}</p>
                            <p>Theme: {theme} | Accent: {accentColor}</p>
                        </div>
                    </div>
                    <button onClick={handleCopyDebug} className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors press-effect"><Copy className="w-3 h-3" /></button>
                </div>
            </div>
            )}
        </div>

        {/* --- MODAL DE LOGS --- */}
        <SwipeableModal isOpen={showLogs} onClose={() => setShowLogs(false)}>
            {/* Conteúdo do log mantido */}
            <div className="p-0 h-full flex flex-col bg-[#0d1117] text-[#c9d1d9]">
                <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-[#161b22]">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-sm font-bold text-white tracking-wide font-mono">Console</h2>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => { logger.clear(); setLogs([]); }} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors" title="Clear Console">
                            <Trash2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => setShowLogs(false)} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors" title="Close">
                            <XCircle className="w-4 h-4" />
                         </button>
                    </div>
                </div>
                <div className="flex-1 p-2 font-mono text-[11px] overflow-y-auto overflow-x-hidden">
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#8b949e]">
                            <Terminal className="w-8 h-8 mb-3 opacity-50 anim-float" />
                            <p>Console empty</p>
                        </div>
                    ) : (
                        logs.slice().reverse().map((log) => (
                            <div key={log.id} className={`mb-1 p-1.5 rounded flex items-start gap-2 break-all ${log.level === 'error' ? 'bg-[#3c1618] text-[#ff7b72] border-l-2 border-[#ff7b72]' : log.level === 'warn' ? 'bg-[#342a15] text-[#d29922] border-l-2 border-[#d29922]' : 'text-[#c9d1d9] border-l-2 border-transparent'}`}>
                                <span className="text-[#8b949e] shrink-0 select-none w-14 text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                <div className="flex-1">
                                    {log.data && log.data.map((arg, idx) => (
                                        <pre key={idx} className="whitespace-pre-wrap font-mono leading-relaxed" style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}>
                                            {String(arg)}
                                        </pre>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};
