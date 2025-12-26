
import React, { useState, useRef, useEffect } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, HardDrive, Cpu, Smartphone, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw } from 'lucide-react';
import { Transaction, DividendReceipt } from '../types';
import { ThemeType } from '../App';

interface SettingsProps {
  brapiToken: string;
  onSaveToken: (token: string) => void;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  geminiDividends: DividendReceipt[];
  onImportDividends: (data: DividendReceipt[]) => void;
  onResetApp: () => void;
  theme: ThemeType;
  onSetTheme: (theme: ThemeType) => void;
}

interface PortfolioBackup {
  transactions: Transaction[];
  geminiDividends: DividendReceipt[];
  brapiToken?: string;
  version: string;
  exportDate: string;
}

type SettingsSection = 'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance';

interface NotificationPrefs {
  payments: boolean;
  datacom: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, 
  onSaveToken, 
  transactions, 
  onImportTransactions,
  geminiDividends,
  onImportDividends,
  onResetApp,
  theme,
  onSetTheme
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');
  const [token, setToken] = useState(brapiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEnvToken = process.env.BRAPI_TOKEN === brapiToken && !!process.env.BRAPI_TOKEN;

  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>(() => {
    const saved = localStorage.getItem('investfiis_prefs_notifications');
    return saved ? JSON.parse(saved) : { payments: true, datacom: true };
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    localStorage.setItem('investfiis_prefs_notifications', JSON.stringify(notifyPrefs));
  }, [notifyPrefs]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showMessage('error', 'Navegador não suporta notificações.');
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') showMessage('success', 'Permissão concedida!');
    else if (permission === 'denied') showMessage('error', 'Permissão negada.');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveToken = () => {
    onSaveToken(token);
    showMessage('success', 'Token salvo com sucesso!');
  };

  const handleExport = () => {
    const backup: PortfolioBackup = {
      transactions,
      geminiDividends,
      brapiToken: !isEnvToken ? brapiToken : undefined,
      version: '2.6.8',
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `investfiis_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'Backup completo exportado!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Verifica se é o formato novo (objeto) ou antigo (array)
        if (Array.isArray(json)) {
          // Formato legado: Apenas transações
          onImportTransactions(json);
          showMessage('success', `${json.length} transações importadas (Formato Legado).`);
        } else if (json.transactions && Array.isArray(json.transactions)) {
          // Formato novo: Full Backup
          onImportTransactions(json.transactions);
          if (json.geminiDividends) onImportDividends(json.geminiDividends);
          if (json.brapiToken) onSaveToken(json.brapiToken);
          
          showMessage('success', `Backup restaurado! ${json.transactions.length} ativos e ${json.geminiDividends?.length || 0} registros de proventos.`);
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) { showMessage('error', 'Arquivo inválido.'); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleForceUpdate = async () => {
    if (window.confirm("Isso irá desregistrar o Service Worker, limpar o cache de arquivos e recarregar o app. Suas transações NÃO serão afetadas. Continuar?")) {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let reg of registrations) await reg.unregister();
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                for (let key of keys) await caches.delete(key);
            }
            localStorage.removeItem('investfiis_app_version');
            window.location.reload(); 
        } catch (e) {
            showMessage('error', 'Erro ao forçar atualização.');
        }
    }
  };

  const handleClearCache = async () => {
    if (window.confirm("Limpar todo o cache? Isso inclui cotações, dados da IA e suas preferências de notificação. Suas transações NÃO serão apagadas.")) {
        try {
            localStorage.removeItem('investfiis_quotes_simple_cache');
            localStorage.removeItem('investfiis_gemini_dividends_cache');
            localStorage.removeItem('investfiis_last_gemini_sync');
            localStorage.removeItem('investfiis_last_synced_tickers');
            localStorage.removeItem('investfiis_prefs_notifications');
            localStorage.removeItem('investfiis_notif_processed_keys'); 
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            showMessage('success', 'Cache e preferências limpos!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (e) { showMessage('error', 'Erro ao limpar cache.'); }
    }
  };

  const MenuButton = ({ icon: Icon, label, description, onClick, colorClass = "text-slate-400" }: any) => (
    <button 
      onClick={onClick}
      className="w-full bg-white dark:bg-secondary-dark/40 backdrop-blur-md rounded-3xl p-5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-secondary-dark/60 transition-all flex items-center justify-between group active:scale-[0.98] shadow-sm dark:shadow-none"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{label}</h3>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-accent transition-colors" />
    </button>
  );

  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <div onClick={onChange} className="flex items-center justify-between p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer active:scale-[0.99] transition-transform shadow-sm dark:shadow-none">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
        <div className={`transition-colors duration-300 ${checked ? 'text-accent' : 'text-slate-400'}`}>
            {checked ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
        </div>
    </div>
  );

  const AppearanceCard = ({ id, label, icon: Icon }: { id: ThemeType, label: string, icon: any }) => (
    <button 
      onClick={() => onSetTheme(id)}
      className={`flex-1 p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 active:scale-95 ${theme === id ? 'bg-accent text-white border-accent shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}
    >
      <Icon className="w-8 h-8" />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="pb-28 pt-2 px-4 max-w-2xl mx-auto space-y-6 animate-fade-in min-h-[60vh]">
      
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[70] transition-all duration-300 transform backdrop-blur-md border ${message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'} ${message?.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
        {message?.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
        <span className="text-sm font-bold">{message?.text}</span>
      </div>

      {activeSection === 'menu' && (
        <div className="space-y-4 animate-slide-up">
           <div className="px-2 mb-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Ajustes</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Configurações Gerais</p>
           </div>
           
           <MenuButton icon={Sun} label="Aparência" description="Alterar entre modo claro e escuro" colorClass="text-amber-500" onClick={() => setActiveSection('appearance')} />
           <MenuButton icon={Globe} label="Conexões e APIs" description="Gerencie chaves da Brapi e Google" colorClass="text-accent" onClick={() => setActiveSection('integrations')} />
           <MenuButton icon={Bell} label="Notificações" description="Alertas de proventos e datas" colorClass="text-yellow-500" onClick={() => setActiveSection('notifications')} />
           <MenuButton icon={HardDrive} label="Dados e Backup" description="Backup completo da carteira" colorClass="text-purple-500" onClick={() => setActiveSection('data')} />
           <MenuButton icon={Cpu} label="Sistema" description="Limpeza de cache e reset" colorClass="text-rose-500" onClick={() => setActiveSection('system')} />

           <div className="pt-8 text-center opacity-40">
              <Smartphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <span className="text-[10px] font-mono text-slate-500">InvestFIIs v2.6.8</span>
           </div>
        </div>
      )}

      {activeSection !== 'menu' && (
        <div className="animate-fade-in">
          <button onClick={() => setActiveSection('menu')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-accent transition-colors mb-6 font-bold text-sm px-1 py-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          {activeSection === 'appearance' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500"><Sun className="w-6 h-6" /></div>
                <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Aparência</h2><p className="text-xs text-slate-500">Escolha o seu visual preferido</p></div>
              </div>
              <div className="flex gap-4">
                  <AppearanceCard id="light" label="Claro" icon={Sun} />
                  <AppearanceCard id="dark" label="Escuro" icon={Moon} />
                  <AppearanceCard id="system" label="Sistema" icon={Monitor} />
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent"><Key className="w-6 h-6" /></div>
                <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Integrações</h2><p className="text-xs text-slate-500">Configure suas chaves de API</p></div>
              </div>
              <div className="bg-white dark:bg-secondary-dark/40 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-none">
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-start">
                  <div><h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">API Brapi</h3><p className="text-xs text-slate-500 leading-relaxed">Fonte de cotações em tempo real.</p></div>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-950/30 space-y-4">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Token de Acesso</label>
                      <input type="password" value={isEnvToken ? '********************' : token} onChange={(e) => setToken(e.target.value)} disabled={isEnvToken} placeholder="Cole seu token aqui" className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl py-4 px-4 border border-slate-200 dark:border-white/10 focus:border-accent outline-none transition-all font-mono text-xs shadow-inner" />
                  </div>
                  {!isEnvToken && (
                    <button onClick={handleSaveToken} className="w-full bg-accent text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-accent/20">Salvar Token</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500"><Bell className="w-6 h-6" /></div>
                    <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Notificações</h2><p className="text-xs text-slate-500">Status: {permissionStatus === 'granted' ? 'Ativo' : 'Pendente'}</p></div>
                </div>
                {permissionStatus !== 'granted' && (
                  <button onClick={requestNotificationPermission} className="w-full bg-accent text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg active:scale-95 transition-all mb-4">Autorizar Navegador</button>
                )}
                <Toggle label="Pagamentos de Proventos" checked={notifyPrefs.payments} onChange={() => setNotifyPrefs(p => ({ ...p, payments: !p.payments }))} />
                <Toggle label="Alertas de Data Com" checked={notifyPrefs.datacom} onChange={() => setNotifyPrefs(p => ({ ...p, datacom: !p.datacom }))} />
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-4 animate-fade-in-up">
                <button onClick={handleExport} className="w-full bg-white dark:bg-secondary-dark/40 p-5 rounded-3xl border border-slate-200 dark:border-white/10 text-left flex items-center gap-4 active:scale-[0.98] shadow-sm">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Download className="w-6 h-6" /></div>
                    <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">Exportar Backup Total</h3><p className="text-[10px] text-slate-500">Ativos + Histórico de Dividendos</p></div>
                </button>
                <button onClick={handleImportClick} className="w-full bg-white dark:bg-secondary-dark/40 p-5 rounded-3xl border border-slate-200 dark:border-white/10 text-left flex items-center gap-4 active:scale-[0.98] shadow-sm">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Upload className="w-6 h-6" /></div>
                    <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">Importar Backup</h3><p className="text-[10px] text-slate-500">Restaurar toda a sua carteira</p></div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </button>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="space-y-6">
                <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Recuperar e Atualizar</h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">Força o aplicativo a baixar as últimas modificações do servidor agora.</p>
                    <button onClick={handleForceUpdate} className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-[0.98] shadow-lg shadow-sky-500/20"><RefreshCcw className="w-4 h-4" /> Forçar Atualização</button>
                </div>
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-rose-500 mb-2">Resetar Aplicativo</h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">CUIDADO: Apaga permanentemente todas as suas transações e chaves.</p>
                    <button onClick={onResetApp} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-[0.98] shadow-lg shadow-rose-500/20"><Trash2 className="w-4 h-4" /> Apagar Tudo</button>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
