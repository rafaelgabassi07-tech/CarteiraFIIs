
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Eye, EyeOff, Palette, Rocket, Database, ShieldAlert, Info, 
  User, LogOut, Download, Upload, Loader2, Signal, Check, 
  AlertTriangle, ShieldCheck, Zap, Globe, Github
} from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote } from '../types';
import { ThemeType } from '../App';
import { supabase } from '../services/supabase';
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

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, geminiDividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission, lastSyncTime, 
  onSyncAll, currentVersionDate, lastAiStatus 
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'privacy' | 'notifications' | 'services' | 'data' | 'updates' | 'about' | 'reset'>('menu');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const data = { transactions, dividends: geminiDividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_investfiis_${new Date().toISOString().split('T')[0]}.json`;
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
          showToast('success', 'Dados importados com sucesso!');
          setActiveSection('menu');
        }
      } catch (err) {
        showToast('error', 'Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  // Componente de Item de Menu Moderno
  const SettingItem = ({ icon: Icon, label, value, color, onClick, isLast = false, badge }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
        {badge && <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>}
        <ChevronRight className="w-4 h-4 text-zinc-300" />
      </div>
    </button>
  );

  const Group = ({ title, children }: any) => (
    <div className="mb-6">
      <h3 className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</h3>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
        {children}
      </div>
    </div>
  );

  if (activeSection !== 'menu') {
    return (
      <div className="pt-24 pb-32 px-5 max-w-lg mx-auto anim-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setActiveSection('menu')}
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            {activeSection === 'appearance' && 'Aparência'}
            {activeSection === 'privacy' && 'Privacidade'}
            {activeSection === 'notifications' && 'Notificações'}
            {activeSection === 'services' && 'Serviços'}
            {activeSection === 'data' && 'Backup'}
            {activeSection === 'updates' && 'Sistema'}
            {activeSection === 'about' && 'Sobre'}
            {activeSection === 'reset' && 'Resetar'}
          </h2>
        </div>

        {/* Sub-pages Content */}
        {activeSection === 'appearance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: Sun, label: 'Claro' },
                { id: 'dark', icon: Moon, label: 'Escuro' },
                { id: 'system', icon: Monitor, label: 'Auto' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => onSetTheme(m.id as ThemeType)}
                  className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${theme === m.id ? 'bg-sky-500 border-sky-500 text-white shadow-lg' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
                >
                  <m.icon className="w-6 h-6 mb-2" />
                  <span className="text-[10px] font-bold uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'services' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Conexões Ativas</span>
              <button onClick={() => onSyncAll(true)} disabled={isSyncing} className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {[
              { label: 'Supabase Cloud', status: 'operational', icon: Globe, color: 'text-emerald-500' },
              { label: 'Brapi Quotes API', status: 'operational', icon: Signal, color: 'text-blue-500' },
              { label: 'Gemini AI Analysis', status: lastAiStatus, icon: Zap, color: 'text-amber-500' }
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <span className="text-sm font-semibold">{s.label}</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'operational' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {s.status === 'operational' ? 'Online' : 'Erro'}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'data' && (
          <div className="space-y-3">
            <button onClick={handleExport} className="w-full p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Exportar Backup</p>
                  <p className="text-[10px] text-zinc-400 font-medium">Salvar dados em JSON</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Importar Backup</p>
                  <p className="text-[10px] text-zinc-400 font-medium">Restaurar de arquivo</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center">
            <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${privacyMode ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
              {privacyMode ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
            </div>
            <h3 className="text-lg font-bold mb-2">Ocultar Patrimônio</h3>
            <p className="text-xs text-zinc-500 mb-8 px-4">Quando ativado, os valores financeiros na tela inicial serão substituídos por asteriscos.</p>
            <button 
              /* Fix: Use correct function name 'onSetPrivacyMode' instead of 'onSetSetPrivacyMode' */
              onClick={() => onSetPrivacyMode(!privacyMode)}
              className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest ${privacyMode ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              {privacyMode ? 'Desativar' : 'Ativar Proteção'}
            </button>
          </div>
        )}

        {activeSection === 'reset' && (
          <div className="bg-rose-50 dark:bg-rose-950/20 p-8 rounded-3xl border border-rose-100 dark:border-rose-900/30 text-center">
            <div className="w-16 h-16 bg-rose-500 text-white mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2">Limpeza de Cache</h3>
            <p className="text-xs text-rose-600/60 dark:text-rose-400/60 mb-8 px-4">Isso removerá apenas os dados locais (tema, login e cache). Seus dados na nuvem estão protegidos.</p>
            <button 
              onClick={onResetApp}
              className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20"
            >
              Confirmar Reset
            </button>
          </div>
        )}

        {activeSection === 'about' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center">
              <img src="./logo.svg" alt="InvestFIIs" className="w-20 h-20 mx-auto mb-6" />
              <h2 className="text-2xl font-black mb-1">InvestFIIs Pro</h2>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-6">Versão Estável</p>
              <p className="text-sm text-zinc-500 leading-relaxed">Desenvolvido para investidores que buscam simplicidade e performance na gestão de dividendos.</p>
            </div>
            <div className="flex justify-center gap-6">
              <button className="text-zinc-400 hover:text-sky-500 transition-colors"><Github className="w-5 h-5" /></button>
              <button className="text-zinc-400 hover:text-sky-500 transition-colors"><Globe className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto anim-fade-in">
      
      {/* Profile Card Slim */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/20 text-sky-600 rounded-2xl flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none mb-1">
              {user?.email?.split('@')[0]}
            </h3>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Sessão Ativa</p>
          </div>
        </div>
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-rose-500 flex items-center justify-center"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <Group title="Preferências">
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
          value={privacyMode ? 'Protegido' : 'Padrão'}
          color="bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400"
          onClick={() => setActiveSection('privacy')} 
        />
        <SettingItem 
          icon={Bell} 
          label="Notificações" 
          value={pushEnabled ? 'Ligado' : 'Desligado'}
          color="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
          onClick={() => setActiveSection('notifications')} 
          isLast
        />
      </Group>

      <Group title="Dados & Serviços">
        <SettingItem 
          icon={Signal} 
          label="Status dos Serviços" 
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

      <Group title="Aplicativo">
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
          label="Sobre o Projeto" 
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
      {message && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] anim-fade-in-up is-visible">
          <div className={`px-6 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showLogoutConfirm} 
        title="Encerrar Sessão" 
        message="Seus dados estão seguros na nuvem. Deseja realmente sair?" 
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }} 
        onCancel={() => setShowLogoutConfirm(false)} 
      />
    </div>
  );
};
