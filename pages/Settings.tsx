
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Rocket, Database, ShieldAlert, Info, 
  User, LogOut, Check, AlertTriangle, Globe, Github, Smartphone, Copy, CheckCircle2,
  Wifi, Activity, XCircle, Terminal, Trash2, Filter, Eraser
} from 'lucide-react';
import { Transaction, DividendReceipt, ServiceMetric, LogEntry } from '../types';
import { ThemeType } from '../App';
import { ConfirmationModal, SwipeableModal, Toast } from '../components/Layout';
import { logger } from '../services/logger';

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
  updateAvailable: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  onSyncAll: (force: boolean) => Promise<void>;
  currentVersionDate: string | null;
  onForceUpdate: () => void; 
  // Novos props
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
  user, onLogout, transactions, onImportTransactions, geminiDividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, accentColor, onSetAccentColor,
  services, onCheckConnection, isCheckingConnection
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'privacy' | 'notifications' | 'services' | 'data' | 'updates' | 'about' | 'reset'>('menu');
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  
  // States para o Logger
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error'>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notificationPrefs, setNotificationPrefs] = useState({
    dividends: true,
    prices: false,
    weekly: true,
    updates: true
  });

  // Encontra o serviço selecionado no array recebido via props
  const selectedService = services.find(s => s.id === selectedServiceId) || null;

  // Subscribe to logger
  useEffect(() => {
      const unsubscribe = logger.subscribe(setLogs);
      return unsubscribe;
  }, []);

  const filteredLogs = useMemo(() => {
      if (logFilter === 'all') return logs;
      return logs.filter(l => l.level === 'error');
  }, [logs, logFilter]);

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
    const data = { transactions, dividends: geminiDividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup.json`;
    a.click();
    showToast('success', 'Backup exportado!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        showToast('error', 'Arquivo inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopyDebug = () => {
    const info = `App: InvestFIIs v${appVersion}\nDate: ${new Date().toISOString()}\nUser: ${user?.id}\nTheme: ${theme}\nOnline: ${navigator.onLine}`;
    navigator.clipboard.writeText(info);
    showToast('success', 'Info copiada!');
  };

  const handleCopyLogs = () => {
      const logText = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
      navigator.clipboard.writeText(logText);
      showToast('success', 'Logs copiados para transferência');
  };

  const SettingItem = ({ icon: Icon, label, value, color, onClick, isLast = false, badge }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
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
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{label}</h4>
            {description && <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{description}</p>}
        </div>
        <button 
            onClick={onToggle}
            className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${isOn ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
        >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${isOn ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </button>
    </div>
  );

  const Group = ({ title, children }: any) => (
    <div className="mb-4">
      <h3 className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{title}</h3>
      <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
        {children}
      </div>
    </div>
  );

  const renderSubPage = () => (
    <div className="anim-fade-in space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button 
            onClick={() => setActiveSection('menu')}
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm active:scale-95 transition-transform"
          >
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
              {activeSection === 'reset' && 'Manutenção'}
            </h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ajustes</p>
          </div>
        </div>

        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <div className="space-y-3">
                 <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tema do App</h3>
                 <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', icon: Sun, label: 'Claro' },
                      { id: 'dark', icon: Moon, label: 'Escuro' },
                      { id: 'system', icon: Monitor, label: 'Auto' }
                    ].map(m => (
                      <button 
                        key={m.id}
                        onClick={() => onSetTheme(m.id as ThemeType)}
                        className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-300 ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
                      >
                        <m.icon className="w-6 h-6 mb-2" strokeWidth={2} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                      </button>
                    ))}
                  </div>
            </div>

            <div className="space-y-3">
                 <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cor de Destaque</h3>
                 <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    {ACCENT_COLORS.map((c) => (
                        <button
                            key={c.hex}
                            onClick={() => onSetAccentColor(c.hex)}
                            className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === c.hex ? 'scale-125 shadow-lg ring-2 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                            style={{ 
                                backgroundColor: c.hex, 
                                boxShadow: accentColor === c.hex ? `0 4px 12px ${c.hex}66` : 'none',
                                ['--tw-ring-color' as any]: c.hex 
                            }}
                        >
                            {accentColor === c.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                        </button>
                    ))}
                 </div>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
             <div className="space-y-4">
                 <div className="bg-sky-50 dark:bg-sky-900/20 p-5 rounded-xl border border-sky-100 dark:border-sky-900/30 flex items-center gap-4">
                     <div className="w-12 h-12 bg-white dark:bg-sky-900/50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm">
                         <Bell className="w-6 h-6" />
                     </div>
                     <div className="flex-1">
                         <h3 className="font-black text-sky-900 dark:text-sky-100 text-sm">Notificações Push</h3>
                         <p className="text-[10px] font-medium text-sky-700 dark:text-sky-300 mt-0.5">Alertas importantes sobre sua carteira</p>
                     </div>
                     <button 
                        onClick={onRequestPushPermission}
                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${pushEnabled ? 'bg-sky-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                 </div>

                 {pushEnabled && (
                     <div className="space-y-2 anim-slide-up">
                         <h3 className="px-2 mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Categorias</h3>
                         <ToggleItem 
                            label="Novos Proventos" 
                            description="Quando um FII ou Ação anunciar pagamento"
                            isOn={notificationPrefs.dividends}
                            onToggle={() => saveNotifPrefs({...notificationPrefs, dividends: !notificationPrefs.dividends})}
                         />
                         <ToggleItem 
                            label="Variações Bruscas" 
                            description="Alertas de alta/baixa superior a 5%"
                            isOn={notificationPrefs.prices}
                            onToggle={() => saveNotifPrefs({...notificationPrefs, prices: !notificationPrefs.prices})}
                         />
                     </div>
                 )}
             </div>
        )}

        {activeSection === 'services' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Saúde do Sistema</h3>
                    <p className="text-[10px] text-zinc-500">Toque em um card para ver logs</p>
                </div>
                <button 
                  onClick={onCheckConnection} 
                  disabled={isCheckingConnection} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform ${isCheckingConnection ? 'opacity-70' : ''}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                  {isCheckingConnection ? 'Verificando...' : 'Re-testar'}
                </button>
              </div>

              <div className="space-y-2">
                  {services.map((s) => (
                    <button 
                        key={s.id} 
                        onClick={() => setSelectedServiceId(s.id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${s.status === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : s.status === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : s.status === 'error' ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold text-zinc-900 dark:text-white">{s.label}</p>
                                <p className="text-[9px] text-zinc-500 font-mono">
                                    {s.url ? new URL(s.url).hostname : 'Internal Service'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="text-right">
                                  {s.latency !== null ? (
                                      <span className={`block text-[10px] font-bold ${s.latency < 200 ? 'text-emerald-500' : s.latency < 800 ? 'text-amber-500' : 'text-rose-500'}`}>
                                          {s.latency}ms
                                      </span>
                                  ) : (
                                      <span className="block text-[10px] text-zinc-400">-</span>
                                  )}
                                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-emerald-500 animate-pulse' : s.status === 'degraded' ? 'bg-amber-500' : s.status === 'error' ? 'bg-rose-500' : 'bg-zinc-300'}`}></div>
                                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                                          {s.status === 'operational' ? 'Online' : s.status === 'checking' ? 'Testando' : s.status}
                                      </span>
                                  </div>
                             </div>
                             <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                        </div>
                    </button>
                  ))}
              </div>
            </div>
            
            <button 
                onClick={() => setShowLogs(true)}
                className="w-full p-4 rounded-xl bg-zinc-950 dark:bg-black border border-zinc-800 flex items-center justify-between group press-effect"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-800">
                        <Terminal className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-xs font-bold text-white mb-0.5">Console de Logs</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                            {logs.length} registro(s) • {logs.filter(l => l.level === 'error').length} erro(s)
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </button>
            
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-900/50 flex items-center justify-center shrink-0 text-indigo-500">
                    <Wifi className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Modo Offline Habilitado</h4>
                    <p className="text-[10px] text-indigo-700/70 dark:text-indigo-300/70 mt-0.5 leading-relaxed">
                        Mesmo se os serviços caírem, você pode acessar seus dados locais.
                    </p>
                </div>
            </div>
          </div>
        )}

        {activeSection === 'data' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black mb-1">Backup Seguro</h3>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed px-4">Seus dados são sincronizados na nuvem, mas você pode baixar uma cópia física JSON.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="py-3.5 bg-blue-500 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Exportar</button>
                <button onClick={() => fileInputRef.current?.click()} className="py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Importar</button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${privacyMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 scale-110' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              {privacyMode ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-black mb-1">Modo Privacidade</h3>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed px-4">Oculta todos os valores monetários na tela de início. Ideal para locais públicos.</p>
            <button 
              onClick={() => onSetPrivacyMode(!privacyMode)}
              className={`w-full py-4 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
            >
              {privacyMode ? 'Desativar Proteção' : 'Ativar Proteção'}
            </button>
          </div>
        )}

        {activeSection === 'updates' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
            <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black mb-1">Versão v{appVersion}</h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">{currentVersionDate || 'Branch Estável'}</p>
            <div className="space-y-3">
              <button 
                onClick={() => onCheckUpdates().then(has => showToast(has ? 'success' : 'info', has ? 'Novo update disponível!' : 'Você já está na última versão.'))}
                className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95"
              >
                Checar Atualizações
              </button>
              <button onClick={onShowChangelog} className="w-full py-2 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Ver Notas da Versão</button>
            </div>
          </div>
        )}

        {activeSection === 'reset' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 p-6 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center">
            <div className="w-14 h-14 bg-amber-500 text-white mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20">
              <Eraser className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 mb-1">Limpar Cachê</h3>
            <p className="text-xs text-amber-600/60 dark:text-amber-400/60 mb-6 leading-relaxed">
                Corrige problemas de interface apagando dados temporários. Suas ordens na nuvem não serão afetadas e sua sessão permanecerá ativa.
            </p>
            <button 
              onClick={onResetApp}
              className="w-full py-3.5 bg-amber-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95"
            >
              Apagar Dados Locais
            </button>
          </div>
        )}

        {activeSection === 'about' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
              <img src="./logo.svg" alt="InvestFIIs" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-1">InvestFIIs Pro</h2>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Built for Investors</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">Focado em performance, design e simplicidade para a gestão inteligente de dividendos na B3.</p>
              
              <div className="flex justify-center gap-3">
                 <a href="#" className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Github className="w-5 h-5" /></a>
                 <a href="#" className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Globe className="w-5 h-5" /></a>
              </div>
            </div>

            <div className="bg-zinc-900 dark:bg-black p-5 rounded-xl text-left relative overflow-hidden group">
                <div className="relative z-10">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                        <Smartphone className="w-3 h-3" /> Info de Debug
                    </h4>
                    <div className="text-[9px] font-mono text-zinc-500 space-y-1">
                        <p>User ID: {user?.id?.substring(0,8)}...</p>
                        <p>Build: {appVersion} ({currentVersionDate})</p>
                        <p>Theme: {theme} | Accent: {accentColor}</p>
                    </div>
                </div>
                <button 
                    onClick={handleCopyDebug}
                    className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                    <Copy className="w-3 h-3" />
                </button>
            </div>
          </div>
        )}

      <SwipeableModal isOpen={!!selectedService} onClose={() => setSelectedServiceId(null)}>
        {selectedService && (
            <div className="p-8 pb-24">
                <div className="text-center mb-8">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl ${selectedService.status === 'operational' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900' : selectedService.status === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                        {selectedService.status === 'operational' ? <CheckCircle2 className="w-10 h-10" /> : selectedService.status === 'error' ? <XCircle className="w-10 h-10" /> : <Activity className="w-10 h-10" />}
                    </div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">{selectedService.label}</h2>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                         <div className={`w-2 h-2 rounded-full ${selectedService.status === 'operational' ? 'bg-emerald-500 animate-pulse' : selectedService.status === 'error' ? 'bg-rose-500' : 'bg-zinc-400'}`}></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                             {selectedService.status.toUpperCase()}
                         </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
                         <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Endpoint</h4>
                         <p className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 break-all">{selectedService.url || 'Internal Service'}</p>
                    </div>

                    <div className="p-5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner overflow-hidden">
                         <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-800">
                             <Terminal className="w-4 h-4 text-zinc-500" />
                             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Logs de Conexão</span>
                         </div>
                         <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-all leading-relaxed">
                             {selectedService.message || 'Nenhum log disponível. Execute o teste de conexão.'}
                         </pre>
                    </div>
                </div>

                <button 
                  onClick={() => setSelectedServiceId(null)}
                  className="w-full mt-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  Fechar Detalhes
                </button>
            </div>
        )}
      </SwipeableModal>

      {/* MODAL DE CONSOLE DE LOGS */}
      <SwipeableModal isOpen={showLogs} onClose={() => setShowLogs(false)}>
         <div className="flex flex-col h-full bg-zinc-950">
             {/* Header do Terminal */}
             <div className="flex-none p-4 flex items-center justify-between border-b border-zinc-800">
                 <div className="flex items-center gap-2">
                     <Terminal className="w-5 h-5 text-emerald-500" />
                     <span className="text-sm font-bold text-white font-mono">system.log</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setLogFilter(logFilter === 'all' ? 'error' : 'all')}
                        className={`p-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${logFilter === 'error' ? 'bg-rose-500/20 text-rose-500' : 'text-zinc-500 hover:text-white'}`}
                     >
                         <Filter className="w-4 h-4" />
                     </button>
                     <button onClick={handleCopyLogs} className="p-2 text-zinc-500 hover:text-white transition-colors">
                         <Copy className="w-4 h-4" />
                     </button>
                     <button onClick={() => logger.clear()} className="p-2 text-zinc-500 hover:text-rose-500 transition-colors">
                         <Trash2 className="w-4 h-4" />
                     </button>
                 </div>
             </div>

             {/* Corpo do Log */}
             <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[10px]">
                 {filteredLogs.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                         <Info className="w-8 h-8 mb-2 opacity-50" />
                         <p>Nenhum registro encontrado.</p>
                     </div>
                 ) : (
                     filteredLogs.map(l => (
                         <div key={l.id} className="flex gap-2 break-all border-b border-zinc-900/50 pb-1.5">
                             <span className="text-zinc-600 shrink-0">
                                 {new Date(l.timestamp).toLocaleTimeString('pt-BR', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 3 } as any)}
                             </span>
                             <span className={`uppercase font-bold shrink-0 w-10 text-center ${l.level === 'error' ? 'text-rose-500 bg-rose-500/10' : l.level === 'warn' ? 'text-amber-500 bg-amber-500/10' : l.level === 'debug' ? 'text-sky-500' : 'text-emerald-500'}`}>
                                 {l.level.substring(0,4)}
                             </span>
                             <span className={`flex-1 ${l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-300' : 'text-zinc-300'}`}>
                                 {l.message}
                             </span>
                         </div>
                     ))
                 )}
             </div>
         </div>
      </SwipeableModal>

      <ConfirmationModal 
        isOpen={showLogoutConfirm} 
        title="Encerrar Sessão" 
        message="Seus dados estão seguros na nuvem. Deseja realmente sair da conta?" 
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }} 
        onCancel={() => setShowLogoutConfirm(false)} 
      />
      
      {/* GLOBAL TOP TOAST NOTIFICATION FOR SETTINGS (REUSED STYLE) */}
      {toast && <Toast type={toast.type} text={toast.text} />}
    </div>
  );
};
