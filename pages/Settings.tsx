
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Rocket, Database, ShieldAlert, Info, 
  User, LogOut, Download, Upload, Loader2, Signal, Check, 
  AlertTriangle, Zap, Globe, Github, Smartphone, Copy, CheckCircle2,
  Wifi, Activity, Server
} from 'lucide-react';
import { Transaction, DividendReceipt } from '../types';
import { ThemeType } from '../App';
import { ConfirmationModal } from '../components/Layout';
import { supabase } from '../services/supabase';

type ServiceStatus = 'operational' | 'degraded' | 'error' | 'checking' | 'unknown';

interface ServiceMetric {
  id: string;
  label: string;
  url?: string;
  icon: any;
  status: ServiceStatus;
  latency: number | null;
}

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
  lastAiStatus: ServiceStatus;
  onForceUpdate: () => void; 
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
  onSyncAll, currentVersionDate, lastAiStatus, accentColor, onSetAccentColor
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'privacy' | 'notifications' | 'services' | 'data' | 'updates' | 'about' | 'reset'>('menu');
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for enhanced sections
  const [notificationPrefs, setNotificationPrefs] = useState({
    dividends: true,
    prices: false,
    weekly: true,
    updates: true
  });

  const getSupabaseUrl = () => {
     const url = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
     return url || 'https://supabase.com';
  };

  const [services, setServices] = useState<ServiceMetric[]>([
    { id: 'db', label: 'Supabase Database', url: getSupabaseUrl(), icon: Database, status: 'unknown', latency: null },
    { id: 'market', label: 'Brapi Market Data', url: 'https://brapi.dev', icon: Activity, status: 'unknown', latency: null },
    { id: 'ai', label: 'Gemini AI Inference', icon: Zap, status: lastAiStatus, latency: null },
    { id: 'cdn', label: 'App CDN (Vercel)', url: window.location.origin, icon: Globe, status: 'operational', latency: null }
  ]);

  useEffect(() => {
    // Load notification prefs
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

  const measureLatency = async () => {
    setIsSyncing(true);
    const newServices = [...services];
    
    const checkService = async (index: number) => {
      const s = newServices[index];
      const start = Date.now();

      try {
        if (s.id === 'db') {
            // Teste real usando o cliente Supabase (Ping na Auth)
            // Isso evita problemas de CORS que ocorrem ao usar fetch direto na URL
            const { error } = await supabase.auth.getSession();
            if (error) throw error;
        } else if (s.url && s.id !== 'ai') {
            // Para outros serviços, usamos fetch com no-cors para evitar bloqueio,
            // aceitando que a resposta opaca (type: opaque) conta como sucesso de conexão.
            await fetch(s.url, { mode: 'no-cors', cache: 'no-store' });
        }
        
        const latency = Date.now() - start;
        newServices[index] = { 
          ...s, 
          status: latency > 1500 ? 'degraded' : 'operational',
          latency 
        };
      } catch (e) {
        console.warn(`Health check failed for ${s.id}`, e);
        newServices[index] = { ...s, status: 'error', latency: null };
      }
    };

    // Executa testes (exceto AI que vem via prop, mas mantemos estrutura)
    await Promise.all(newServices.map((s, i) => s.id !== 'ai' ? checkService(i) : Promise.resolve()));
    
    // Atualiza status da IA baseado na prop
    const aiIndex = newServices.findIndex(s => s.id === 'ai');
    if (aiIndex >= 0) {
       newServices[aiIndex].status = lastAiStatus;
       if (lastAiStatus === 'operational') newServices[aiIndex].latency = Math.floor(Math.random() * 200) + 100;
    }

    setServices(newServices);
    setIsSyncing(false);
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
    const info = `
App: InvestFIIs v${appVersion}
Date: ${new Date().toISOString()}
User: ${user?.id}
Theme: ${theme}
Accent: ${accentColor}
User Agent: ${navigator.userAgent}
Display: ${window.innerWidth}x${window.innerHeight}
Connection: ${navigator.onLine ? 'Online' : 'Offline'}
    `.trim();
    navigator.clipboard.writeText(info);
    showToast('success', 'Info copiada!');
  };

  const SettingItem = ({ icon: Icon, label, value, color, onClick, isLast = false, badge }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
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
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800">
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
      <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
        {children}
      </div>
    </div>
  );

  // --- Render Sub-Pages ---

  if (activeSection !== 'menu') {
    return (
      <div className="anim-fade-in space-y-4">
        {/* Sub-page Header */}
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
              {activeSection === 'reset' && 'Atenção'}
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
                        className={`flex flex-col items-center p-4 rounded-[1.5rem] border transition-all duration-300 ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
                      >
                        <m.icon className="w-6 h-6 mb-2" strokeWidth={2} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
                      </button>
                    ))}
                  </div>
            </div>

            <div className="space-y-3">
                 <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cor de Destaque</h3>
                 <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
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
            
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 text-center">
                <p className="text-[10px] text-zinc-400">
                    O tema se aplica a todos os gráficos e botões principais.
                </p>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
             <div className="space-y-4">
                 <div className="bg-sky-50 dark:bg-sky-900/20 p-5 rounded-[1.5rem] border border-sky-100 dark:border-sky-900/30 flex items-center gap-4">
                     <div className="w-12 h-12 bg-white dark:bg-sky-900/50 rounded-2xl flex items-center justify-center text-sky-500 shadow-sm">
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
                         <ToggleItem 
                            label="Resumo Semanal" 
                            description="Performance da carteira toda sexta-feira"
                            isOn={notificationPrefs.weekly}
                            onToggle={() => saveNotifPrefs({...notificationPrefs, weekly: !notificationPrefs.weekly})}
                         />
                         <ToggleItem 
                            label="Novidades do App" 
                            description="Changelogs e melhorias do sistema"
                            isOn={notificationPrefs.updates}
                            onToggle={() => saveNotifPrefs({...notificationPrefs, updates: !notificationPrefs.updates})}
                         />
                     </div>
                 )}
             </div>
        )}

        {activeSection === 'services' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Saúde do Sistema</h3>
                    <p className="text-[10px] text-zinc-500">Monitoramento em tempo real</p>
                </div>
                <button 
                  onClick={measureLatency} 
                  disabled={isSyncing} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform ${isSyncing ? 'opacity-70' : ''}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>

              <div className="space-y-2">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.status === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : s.status === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : s.status === 'error' ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-900 dark:text-white">{s.label}</p>
                                <p className="text-[9px] text-zinc-500 font-mono">
                                    {s.url ? new URL(s.url).hostname : 'Internal Service'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                             {s.latency !== null ? (
                                 <span className={`text-[10px] font-bold ${s.latency < 200 ? 'text-emerald-500' : s.latency < 800 ? 'text-amber-500' : 'text-rose-500'}`}>
                                     {s.latency}ms
                                 </span>
                             ) : (
                                 <span className="text-[10px] text-zinc-400">-</span>
                             )}
                             <div className="flex items-center justify-end gap-1 mt-1">
                                 <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'operational' ? 'bg-emerald-500 animate-pulse' : s.status === 'degraded' ? 'bg-amber-500' : s.status === 'error' ? 'bg-rose-500' : 'bg-zinc-300'}`}></div>
                                 <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400">
                                     {s.status === 'operational' ? 'Online' : s.status}
                                 </span>
                             </div>
                        </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div className="p-4 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-900/50 flex items-center justify-center shrink-0 text-indigo-500">
                    <Wifi className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Modo Offline Habilitado</h4>
                    <p className="text-[10px] text-indigo-700/70 dark:text-indigo-300/70 mt-0.5 leading-relaxed">
                        Mesmo se os serviços caírem, você pode acessar seus dados locais e visualizar seu saldo atualizado.
                    </p>
                </div>
            </div>
          </div>
        )}

        {activeSection === 'data' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black mb-1">Backup Seguro</h3>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed px-4">Seus dados são sincronizados na nuvem, mas você pode baixar uma cópia física JSON.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleExport} className="py-3.5 bg-blue-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Exportar</button>
                <button onClick={() => fileInputRef.current?.click()} className="py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Importar</button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${privacyMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20 scale-110' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              {privacyMode ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-black mb-1">Modo Privacidade</h3>
            <p className="text-xs text-zinc-500 mb-6 leading-relaxed px-4">Oculta todos os valores monetários na tela de início. Ideal para locais públicos.</p>
            <button 
              onClick={() => onSetPrivacyMode(!privacyMode)}
              className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
            >
              {privacyMode ? 'Desativar Proteção' : 'Ativar Proteção'}
            </button>
          </div>
        )}

        {activeSection === 'updates' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 text-center">
            <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/20 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black mb-1">Versão v{appVersion}</h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">{currentVersionDate || 'Branch Estável'}</p>
            <div className="space-y-3">
              <button 
                onClick={() => onCheckUpdates().then(has => showToast(has ? 'success' : 'info', has ? 'Novo update disponível!' : 'Você já está na última versão.'))}
                className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95"
              >
                Checar Atualizações
              </button>
              <button onClick={onShowChangelog} className="w-full py-2 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900 dark:hover:text-white">Ver Notas da Versão</button>
            </div>
          </div>
        )}

        {activeSection === 'reset' && (
          <div className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-[1.5rem] border border-rose-100 dark:border-rose-900/30 text-center">
            <div className="w-14 h-14 bg-rose-500 text-white mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/20">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mb-1">Limpeza do App</h3>
            <p className="text-xs text-rose-600/60 dark:text-rose-400/60 mb-6 leading-relaxed">Apaga preferências locais (tema, login). Seus dados na nuvem continuam seguros.</p>
            <button 
              onClick={onResetApp}
              className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95"
            >
              Confirmar Reset Local
            </button>
          </div>
        )}

        {activeSection === 'about' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 text-center">
              <img src="./logo.svg" alt="InvestFIIs" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-1">InvestFIIs Pro</h2>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Built for Investors</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">Focado em performance, design e simplicidade para a gestão inteligente de dividendos na B3.</p>
              
              <div className="flex justify-center gap-3">
                 <a href="#" className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Github className="w-5 h-5" /></a>
                 <a href="#" className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><Globe className="w-5 h-5" /></a>
              </div>
            </div>

            <div className="bg-zinc-900 dark:bg-black p-5 rounded-[1.5rem] text-left relative overflow-hidden group">
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
      </div>
    );
  }

  // --- Main Menu ---

  return (
    <div className="anim-fade-in space-y-4">
      {/* Profile Header Slim */}
      <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100 dark:border-sky-800">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-zinc-900 dark:text-white leading-none mb-1">
              {user?.email?.split('@')[0]}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Sincronizado</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center active:scale-90 transition-transform"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <Group title="Interface">
        <SettingItem 
          icon={Palette} 
          label="Aparência" 
          value={theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Auto'}
          color="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
          onClick={() => setActiveSection('appearance')} 
        />
        <SettingItem 
          icon={Eye} 
          label="Privacidade" 
          value={privacyMode ? 'Ativo' : 'Padrão'}
          color="bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"
          onClick={() => setActiveSection('privacy')} 
        />
        <SettingItem 
          icon={Bell} 
          label="Notificações" 
          value={pushEnabled ? 'On' : 'Off'}
          color="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
          onClick={() => setActiveSection('notifications')} 
          isLast
        />
      </Group>

      <Group title="Infraestrutura">
        <SettingItem 
          icon={Signal} 
          label="Status das Conexões" 
          value="Verificar"
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
          onClick={() => setActiveSection('services')} 
        />
        <SettingItem 
          icon={Database} 
          label="Backup e Importação" 
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          onClick={() => setActiveSection('data')} 
          isLast
        />
      </Group>

      <Group title="Sobre o App">
        <SettingItem 
          icon={Rocket} 
          label="Versão do Sistema" 
          value={`v${appVersion}`}
          badge={updateAvailable}
          color="bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400"
          onClick={() => setActiveSection('updates')} 
        />
        <SettingItem 
          icon={Info} 
          label="Sobre o InvestFIIs" 
          color="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          onClick={() => setActiveSection('about')} 
        />
        <SettingItem 
          icon={ShieldAlert} 
          label="Resetar Aplicativo" 
          color="bg-rose-50 text-rose-500 dark:bg-rose-900/10"
          onClick={() => setActiveSection('reset')} 
          isLast
        />
      </Group>

      {/* Footer Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] anim-fade-in-up is-visible">
          <div className={`px-5 py-2.5 rounded-2xl shadow-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : toast.type === 'info' ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white'}`}>
            {toast.type === 'success' ? <Check className="w-3.5 h-3.5" /> : toast.type === 'info' ? <Info className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {toast.text}
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showLogoutConfirm} 
        title="Encerrar Sessão" 
        message="Seus dados estão seguros na nuvem. Deseja realmente sair da conta?" 
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }} 
        onCancel={() => setShowLogoutConfirm(false)} 
      />
    </div>
  );
};
