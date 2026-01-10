
import React, { useState, useRef } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Rocket, Database, ShieldAlert, Info, 
  User, LogOut, Download, Upload, Loader2, Signal, Check, 
  AlertTriangle, Zap, Globe, Github, Smartphone
} from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote } from '../types';
import { ThemeType } from '../App';
import { ConfirmationModal } from '../components/Layout';

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

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, geminiDividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, lastAiStatus 
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'privacy' | 'notifications' | 'services' | 'data' | 'updates' | 'about' | 'reset'>('menu');
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const Group = ({ title, children }: any) => (
    <div className="mb-4">
      <h3 className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">{title}</h3>
      <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
        {children}
      </div>
    </div>
  );

  if (activeSection !== 'menu') {
    return (
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
              {activeSection === 'services' && 'Conexões'}
              {activeSection === 'data' && 'Backup'}
              {activeSection === 'updates' && 'Sistema'}
              {activeSection === 'about' && 'Sobre'}
              {activeSection === 'reset' && 'Atenção'}
            </h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ajustes</p>
          </div>
        </div>

        {activeSection === 'appearance' && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', icon: Sun, label: 'Claro' },
              { id: 'dark', icon: Moon, label: 'Escuro' },
              { id: 'system', icon: Monitor, label: 'Auto' }
            ].map(m => (
              <button 
                key={m.id}
                onClick={() => onSetTheme(m.id as ThemeType)}
                className={`flex flex-col items-center p-4 rounded-[1.5rem] border transition-all ${theme === m.id ? 'bg-sky-500 border-sky-500 text-white shadow-lg scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}
              >
                <m.icon className="w-6 h-6 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-wider">{m.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeSection === 'services' && (
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Serviços Cloud</span>
              <button 
                onClick={() => { setIsSyncing(true); onSyncAll(true).finally(() => setIsSyncing(false)); }} 
                disabled={isSyncing} 
                className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 ${isSyncing ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {[
              { label: 'Supabase Database', status: 'operational', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950' },
              { label: 'Brapi Market API', status: 'operational', icon: Signal, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
              { label: 'Gemini AI Analysis', status: lastAiStatus, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950' }
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg} ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{s.label}</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${s.status === 'operational' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {s.status === 'operational' ? 'OK' : 'Falha'}
                </div>
              </div>
            ))}
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
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${privacyMode ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">Focado em performance e simplicidade para gestão de dividendos na B3.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"><Github className="w-5 h-5" /></button>
              <button className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"><Globe className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
          value="Online"
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
