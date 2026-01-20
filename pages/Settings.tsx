
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Rocket, Database, ShieldAlert, Info, 
  User, LogOut, Check, AlertTriangle, Globe, Github, Smartphone, Copy, CheckCircle2,
  Wifi, Activity, XCircle, Terminal, Trash2, Filter, FileSpreadsheet, FileJson
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

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, dividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, accentColor, onSetAccentColor,
  services, onCheckConnection, isCheckingConnection, onForceUpdate
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'privacy' | 'notifications' | 'services' | 'data' | 'updates' | 'about' | 'reset'>('menu');
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
      const unsubscribe = logger.subscribe((l: LogEntry[]) => setLogs([...l])); // Clone array to force re-render
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
                      return existing.ticker.trim().toUpperCase() === d.ticker.trim().toUpperCase() && existing.type === d.type && existingMonth === paymentMonth;
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
    <button onClick={onClick} className={`w-full flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
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
        <button onClick={onToggle} className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${isOn ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${isOn ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </button>
    </div>
  );

  const Group = ({ title, children }: any) => (
    <div className="mb-4">
      <h3 className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{title}</h3>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">{children}</div>
    </div>
  );

  return (
    <div className="anim-fade-in space-y-4">
        {activeSection !== 'menu' && (
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setActiveSection('menu')} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">
                  {activeSection === 'appearance' && 'Aparência'}
                  {activeSection === 'privacy' && 'Privacidade'}
                  {activeSection === 'notifications' && 'Notificações'}
                  {activeSection === 'services' && 'Status de Rede'}
                  {activeSection === 'data' && 'Backup & Dados'}
                  {activeSection === 'updates' && 'Sistema'}
                  {activeSection === 'about' && 'Sobre'}
                  {activeSection === 'reset' && 'Atenção'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ajustes</p>
              </div>
            </div>
        )}

        {activeSection === 'menu' && (
            <div className="space-y-4 anim-slide-up">
                <Group title="Geral">
                    <SettingItem icon={Palette} label="Aparência" value={theme === 'system' ? 'Auto' : theme === 'dark' ? 'Escuro' : 'Claro'} color="bg-purple-100 dark:bg-purple-900/20 text-purple-600" onClick={() => setActiveSection('appearance')} />
                    <SettingItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" value={privacyMode ? 'Ativo' : 'Inativo'} color="bg-teal-100 dark:bg-teal-900/20 text-teal-600" onClick={() => setActiveSection('privacy')} />
                    <SettingItem icon={Bell} label="Notificações" value={pushEnabled ? 'On' : 'Off'} color="bg-sky-100 dark:bg-sky-900/20 text-sky-600" onClick={() => setActiveSection('notifications')} isLast />
                </Group>

                <Group title="Sistema">
                    <SettingItem icon={Activity} label="Status de Rede" color="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" onClick={() => setActiveSection('services')} />
                    <SettingItem icon={Database} label="Backup & Dados" color="bg-blue-100 dark:bg-blue-900/20 text-blue-600" onClick={() => setActiveSection('data')} />
                    <SettingItem icon={Rocket} label="Atualizações" value={`v${appVersion}`} badge={updateAvailable} color="bg-amber-100 dark:bg-amber-900/20 text-amber-600" onClick={() => setActiveSection('updates')} isLast />
                </Group>

                <Group title="Outros">
                    <SettingItem icon={Info} label="Sobre" color="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" onClick={() => setActiveSection('about')} />
                    <SettingItem icon={ShieldAlert} label="Resetar App" color="bg-rose-100 dark:bg-rose-900/20 text-rose-600" onClick={() => setActiveSection('reset')} isLast />
                </Group>

                <button onClick={onLogout} className="w-full py-4 rounded-2xl bg-white dark:bg-zinc-900 border border-rose-100 dark:border-rose-900/30 text-rose-600 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-6 active:scale-95 transition-all shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/10">
                    <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
            </div>
        )}

        {/* ... (appearance, privacy, notifications sections remain same) ... */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <div className="space-y-3">
                 <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tema do App</h3>
                 <div className="grid grid-cols-3 gap-3">
                    {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map(m => (
                      <button key={m.id} onClick={() => onSetTheme(m.id as ThemeType)} className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                        <m.icon className="w-6 h-6 mb-2" strokeWidth={2} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                      </button>
                    ))}
                  </div>
            </div>
            <div className="space-y-3">
                 <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cor de Destaque</h3>
                 <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    {ACCENT_COLORS.map((c) => (
                        <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === c.hex ? 'scale-125 shadow-lg ring-2' : 'hover:scale-110 opacity-70'}`} style={{ backgroundColor: c.hex, ['--tw-ring-color' as any]: c.hex }}>
                            {accentColor === c.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                        </button>
                    ))}
                 </div>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
             <div className="space-y-4">
                 <div className="bg-sky-50 dark:bg-sky-900/20 p-5 rounded-2xl border border-sky-100 dark:border-sky-900/30 flex items-center gap-4">
                     <div className="w-12 h-12 bg-white dark:bg-sky-900/50 rounded-2xl flex items-center justify-center text-sky-500 shadow-sm"><Bell className="w-6 h-6" /></div>
                     <div className="flex-1"><h3 className="font-black text-sky-900 dark:text-sky-100 text-sm">Notificações Push</h3><p className="text-[10px] font-medium text-sky-700 dark:text-sky-300 mt-0.5">Alertas importantes sobre sua carteira</p></div>
                     <button onClick={onRequestPushPermission} className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${pushEnabled ? 'bg-sky-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                 </div>
                 {pushEnabled && (
                     <div className="space-y-2 anim-slide-up">
                         <h3 className="px-2 mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Categorias</h3>
                         <ToggleItem label="Novos Proventos" description="Quando um FII ou Ação anunciar pagamento" isOn={notificationPrefs.dividends} onToggle={() => saveNotifPrefs({...notificationPrefs, dividends: !notificationPrefs.dividends})} />
                         <ToggleItem label="Variações Bruscas" description="Alertas de alta/baixa superior a 5%" isOn={notificationPrefs.prices} onToggle={() => saveNotifPrefs({...notificationPrefs, prices: !notificationPrefs.prices})} />
                     </div>
                 )}
             </div>
        )}

        {activeSection === 'services' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div><h3 className="text-sm font-bold text-zinc-900 dark:text-white">Saúde do Sistema</h3><p className="text-[10px] text-zinc-500">Toque em um card para ver logs</p></div>
                <button onClick={onCheckConnection} disabled={isCheckingConnection} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform ${isCheckingConnection ? 'opacity-70' : ''}`}>
                  <RefreshCw className={`w-3 h-3 ${isCheckingConnection ? 'animate-spin' : ''}`} /> {isCheckingConnection ? 'Verificando...' : 'Re-testar'}
                </button>
              </div>
              <div className="space-y-2">
                  {services.map((s) => (
                    <button key={s.id} onClick={() => setSelectedServiceId(s.id)} className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${s.status === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : s.status === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : s.status === 'error' ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                                {s.icon && <s.icon className="w-4 h-4" />}
                            </div>
                            <div className="text-left"><p className="text-xs font-bold text-zinc-900 dark:text-white">{s.label}</p><p className="text-[9px] text-zinc-500 font-mono">{s.url ? new URL(s.url).hostname : 'Internal Service'}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="text-right">
                                  {s.latency !== null ? <span className={`block text-[10px] font-bold ${s.latency < 200 ? 'text-emerald-500' : s.latency < 800 ? 'text-amber-500' : 'text-rose-500'}`}>{s.latency}ms</span> : <span className="block text-[10px] text-zinc-400">-</span>}
                                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-emerald-500 animate-pulse' : s.status === 'degraded' ? 'bg-amber-500' : s.status === 'error' ? 'bg-rose-500' : 'bg-zinc-300'}`}></div>
                                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{s.status === 'operational' ? 'Online' : s.status === 'checking' ? 'Testando' : s.status}</span>
                                  </div>
                             </div>
                             <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                        </div>
                    </button>
                  ))}
              </div>
            </div>
            
            <button onClick={() => setShowLogs(true)} className="w-full p-4 rounded-2xl bg-zinc-950 dark:bg-black border border-zinc-800 flex items-center justify-between group press-effect">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-800"><Terminal className="w-5 h-5" /></div>
                    <div className="text-left"><h4 className="text-xs font-bold text-white mb-0.5">Console do Desenvolvedor</h4><p className="text-[10px] text-zinc-500 font-mono">{logs.length} registro(s)</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        {activeSection === 'data' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Database className="w-7 h-7" /></div>
              <h3 className="text-lg font-black mb-1">Gerenciar Dados</h3>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed px-4">Importe seus dados da B3 ou faça backup da sua carteira.</p>
              
              <div className="space-y-3">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left">
                      <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></div>
                          <div><h4 className="text-xs font-bold text-zinc-900 dark:text-white">Importar da B3</h4><p className="text-[10px] text-zinc-500">Arquivos Excel (.xlsx)</p></div>
                      </div>
                      <button onClick={() => excelInputRef.current?.click()} disabled={isImporting} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                         {isImporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />} {isImporting ? 'Lendo Arquivo...' : 'Selecionar Planilha'}
                      </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExport} className="py-3.5 bg-blue-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Database className="w-3 h-3" /> Exportar Backup</button>
                    <button onClick={() => fileInputRef.current?.click()} className="py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"><FileJson className="w-3 h-3" /> Importar JSON</button>
                  </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
              <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />
            </div>
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${privacyMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 scale-110' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              {privacyMode ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-black mb-1">Modo Privacidade</h3>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed px-4">Oculta todos os valores monetários na tela de início. Ideal para locais públicos.</p>
            <button onClick={() => onSetPrivacyMode(!privacyMode)} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
              {privacyMode ? 'Desativar Proteção' : 'Ativar Proteção'}
            </button>
          </div>
        )}

        {activeSection === 'updates' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
            <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Rocket className="w-7 h-7" /></div>
            <h3 className="text-lg font-black mb-1">Versão v{appVersion}</h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">{currentVersionDate || 'Branch Estável'}</p>
            <div className="space-y-3">
              <button onClick={() => onCheckUpdates().then(has => showToast(has ? 'success' : 'info', has ? 'Novo update disponível!' : 'Você já está na última versão.'))} className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95">Checar Atualizações</button>
              <button onClick={onShowChangelog} className="w-full py-2 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Ver Notas da Versão</button>
            </div>
          </div>
        )}

        {activeSection === 'reset' && (
          <div className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center">
            <div className="w-14 h-14 bg-rose-500 text-white mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/20"><ShieldAlert className="w-7 h-7" /></div>
            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mb-1">Limpeza do App</h3>
            <p className="text-xs text-rose-600/60 dark:text-rose-400/60 mb-6 leading-relaxed">Apaga cache, preferências e dados temporários. Sua conta permanece conectada e os dados na nuvem seguros.</p>
            <button onClick={onResetApp} className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95">Confirmar Reset Local</button>
          </div>
        )}

        {activeSection === 'about' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center overflow-hidden">
                {/* 3D BRAND COMPOSITION */}
                <div className="flex items-center justify-center gap-2 mb-8 relative select-none">
                    <div className="w-[72px] h-[72px] flex items-center justify-center relative z-10 drop-shadow-[0_12px_24px_rgba(59,130,246,0.3)]">
                       <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkX21haW4iIHgxPSIyNTYiIHkxPSI1MCIgeDI9PSIyNTYiIHkyPSI0NjIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzRkMzk5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGVhNWU5Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRfc2hhZG93IiB4MT0iMjU2IiB5MT0iMjAwIiB4Mj0iMjU2IiB5Mj0iNDcyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzBlYTVlOSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzRmNDZlNSIvPjwvbGluZWFyR3JhZGllbnQ+PGZpbHRlciBpZD0iZHJvcFNoYWRvdyIgeD0iLTUwJSIgeT0iLTUwJSIgd2lkdGg9IjIwMCUiIGhlaWdodD0iMjAwJSI+PGZlR2F1c3NpYW5CbHVyIGluPSJTb3VyY2VBbHBoYSIgc3RkRGV2aWF0aW9uPSIxNiIvPjxmZU9mZnNldCBkeD0iMCIgZHk9IjI0IiByZXN1bHQ9Im9mZnNldGJsdXIiLz48ZmVGbG9vZCBmbG9vZC1jb2xvcj0iIzBlYTVlOSIgZmxvb2Qtb3BhY2l0eT0iMC4yNSIvPjxmZUNvbXBvc2l0ZSBpbjI9Im9mZnNldGJsdXIiIG9wZXJhdG9yPSJpbiIvPjxmZU1lcmdlPjxmZU1lcmdlTm9kZS8+PGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIi8+PC9mZU1lcmdlPjwvZmlsdGVyPjwvZGVmcz48ZyBmaWx0ZXI9InVybCgjZHJvcFNoYWRvdykiPjxwYXRoIGQ9Ik0yNTYgNjQgTDQwMCAyMDggSDMyOCBMMjU2IDEzNiBMMTg0IDIwOCBIMTEyIEwyNTYgNjQgWiIgZmlsbD0idXJsKCNncmFkX21haW4pIi8+PHJlY3QgeD0iMTQ0IiB5PSIyMjQiIHdpZHRoPSIyMjQiIGhlaWdodD0iMzIiIHJ4PSI0IiBmaWxsPSJ1cmwoI2dyYWRfc2hhZG93KSIgZmlsbC1vcGFjaXR5PSIwLjkiLz48cmVjdCB4PSIxNjAiIHk9IjI3MiIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjExMiIgcng9IjQiIGZpbGw9InVybCgjZ3JhZF9tYWluKSIvPjxyZWN0IHg9IjIzMiIgeT0iMjcyIiB3aWR0aD0iNDgiIGhlaWdodD0iMTEyIiByeD0iNCIgZmlsbD0idXJsKCNncmFkX21haW4KSIvPjxyZWN0IHg9IjMwNCIgeT0iMjcyIiB3aWR0aD0iNDgiIGhlaWdodD0iMTEyIiByeD0iNCIgZmlsbD0idXJsKCNncmFkX21haW4KSIvPjxwYXRoIGQ9Ik0xMjggNDAwIEgzODQgQzM5Mi44IDQwMCA0MDAgNDA3LjIgNDAwIDQxNiBWNDMyIEgxMTIgVjQxNiBDMTEyIDQwNy4yIDExOS4yIDQwMCAxMjggNDAwIFoiIGZpbGw9InVybCgjZ3JhZF9zaGFkb3cpIi8+PHBhdGggZD0iTTI1NiA2NCBMMjAwIDEyMCBMMjU2IDE3NiBMMzEyIDEyMCBMMjU2IDY0IFoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMTUiLz48L2c+PC9zdmc+" alt="InvestFIIs Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-display text-[48px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-zinc-700 via-zinc-500 to-zinc-800 dark:from-white dark:via-zinc-200 dark:to-zinc-400 mt-2 -ml-1">
                        NVEST
                    </span>
                </div>
                
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Built for Investors</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">Focado em performance, design e simplicidade para a gestão inteligente de dividendos na B3.</p>
              <div className="flex justify-center gap-3">
                 <a href="#" className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Github className="w-5 h-5" /></a>
                 <a href="#" className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Globe className="w-5 h-5" /></a>
              </div>
            </div>
            <div className="bg-zinc-900 dark:bg-black p-5 rounded-2xl text-left relative overflow-hidden group">
                <div className="relative z-10"><h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Smartphone className="w-3 h-3" /> Info de Debug</h4><div className="text-[9px] font-mono text-zinc-500 space-y-1"><p>User ID: {user?.id?.substring(0,8)}...</p><p>Build: {appVersion} ({currentVersionDate})</p><p>Theme: {theme} | Accent: {accentColor}</p></div></div>
                <button onClick={handleCopyDebug} className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"><Copy className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        {/* --- MODAL DE LOGS MELHORADO --- */}
        <SwipeableModal isOpen={showLogs} onClose={() => setShowLogs(false)}>
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
                            <Terminal className="w-8 h-8 mb-3 opacity-50" />
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
