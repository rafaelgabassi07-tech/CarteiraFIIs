
import React, { useState, useRef, useEffect } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, HardDrive, Cpu, Smartphone, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, GitBranch, History, Sparkles } from 'lucide-react';
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
  accentColor: string;
  onSetAccentColor: (color: string) => void;
  privacyMode: boolean;
  onSetPrivacyMode: (enabled: boolean) => void;
  appVersion: string;
  updateAvailable: boolean;
  onCheckUpdates: () => void;
  onShowChangelog: () => void;
}

interface PortfolioBackup {
  transactions: Transaction[];
  geminiDividends: DividendReceipt[];
  brapiToken?: string;
  version: string;
  exportDate: string;
}

type SettingsSection = 'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates';

interface NotificationPrefs {
  payments: boolean;
  datacom: boolean;
}

const ACCENT_COLORS = [
  { name: 'Azul Céu', hex: '#0ea5e9', class: 'bg-sky-500' },
  { name: 'Esmeralda', hex: '#10b981', class: 'bg-emerald-500' },
  { name: 'Roxo Real', hex: '#8b5cf6', class: 'bg-violet-500' },
  { name: 'Laranja Solar', hex: '#f97316', class: 'bg-orange-500' },
  { name: 'Rosa Choque', hex: '#ec4899', class: 'bg-pink-500' },
];

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, 
  onSaveToken, 
  transactions, 
  onImportTransactions,
  geminiDividends,
  onImportDividends,
  onResetApp,
  theme,
  onSetTheme,
  accentColor,
  onSetAccentColor,
  privacyMode,
  onSetPrivacyMode,
  appVersion,
  updateAvailable,
  onCheckUpdates,
  onShowChangelog
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
      version: '3.4.0',
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
        if (Array.isArray(json)) {
          onImportTransactions(json);
          showMessage('success', `${json.length} transações importadas (Formato Legado).`);
        } else if (json.transactions && Array.isArray(json.transactions)) {
          onImportTransactions(json.transactions);
          if (json.geminiDividends) onImportDividends(json.geminiDividends);
          if (json.brapiToken) onSaveToken(json.brapiToken);
          showMessage('success', `Backup restaurado com sucesso!`);
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) { showMessage('error', 'Arquivo inválido.'); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const MenuButton = ({ icon: Icon, label, description, onClick, colorClass = "text-slate-400" }: any) => (
    <button 
      onClick={onClick}
      className="w-full bg-white dark:bg-secondary-dark/40 backdrop-blur-md rounded-[2rem] p-5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-secondary-dark/60 transition-all flex items-center justify-between group active:scale-[0.98] shadow-sm dark:shadow-none hover:shadow-card"
    >
      <div className="flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{label}</h3>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
      </div>
      <div className="p-2 rounded-full bg-slate-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 transition-colors">
        <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-accent transition-colors" />
      </div>
    </button>
  );

  const Toggle = ({ label, checked, onChange, icon: Icon }: { label: string, checked: boolean, onChange: () => void, icon?: any }) => (
    <div onClick={onChange} className="flex items-center justify-between p-5 bg-white dark:bg-white/[0.03] rounded-3xl border border-slate-200 dark:border-white/10 cursor-pointer active:scale-[0.99] transition-transform shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/5">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-slate-400" strokeWidth={2} />}
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <div className={`transition-colors duration-300 ${checked ? 'text-accent' : 'text-slate-400'}`}>
            {checked ? <ToggleRight className="w-10 h-10" strokeWidth={1.5} /> : <ToggleLeft className="w-10 h-10" strokeWidth={1.5} />}
        </div>
    </div>
  );

  const AppearanceCard = ({ id, label, icon: Icon }: { id: ThemeType, label: string, icon: any }) => (
    <button 
      onClick={() => onSetTheme(id)}
      className={`flex-1 p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 active:scale-95 ${theme === id ? 'bg-accent text-white border-accent shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50'}`}
    >
      <Icon className="w-8 h-8" strokeWidth={1.5} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="pb-32 pt-2 px-5 max-w-2xl mx-auto space-y-6 animate-fade-in min-h-[60vh]">
      
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
           
           <MenuButton icon={Palette} label="Aparência" description="Cores, temas e privacidade" colorClass="text-accent" onClick={() => setActiveSection('appearance')} />
           <MenuButton icon={Globe} label="Conexões e APIs" description="Gerencie chaves da Brapi e Google" colorClass="text-emerald-500" onClick={() => setActiveSection('integrations')} />
           <MenuButton icon={Bell} label="Notificações" description="Alertas de proventos e datas" colorClass="text-yellow-500" onClick={() => setActiveSection('notifications')} />
           <MenuButton icon={RefreshCcw} label="Versão e Atualizações" description={`v${appVersion}`} colorClass="text-indigo-500" onClick={() => setActiveSection('updates')} />
           <MenuButton icon={HardDrive} label="Dados e Backup" description="Backup completo da carteira" colorClass="text-purple-500" onClick={() => setActiveSection('data')} />
           <MenuButton icon={Cpu} label="Sistema" description="Zonas de perigo e resets" colorClass="text-rose-500" onClick={() => setActiveSection('system')} />

           <div className="pt-8 text-center opacity-40">
              <Smartphone className="w-8 h-8 text-slate-400 mx-auto mb-2" strokeWidth={1} />
              <span className="text-[10px] font-mono text-slate-500">InvestFIIs v{appVersion}</span>
           </div>
        </div>
      )}

      {activeSection !== 'menu' && (
        <div className="animate-fade-in">
          <button onClick={() => setActiveSection('menu')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-accent transition-colors mb-6 font-bold text-sm px-1 py-2 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar
          </button>

          {activeSection === 'appearance' && (
            <div className="space-y-8 animate-fade-in-up">
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl"><Sun className="w-5 h-5" strokeWidth={2} /></div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Modo de Cor</h3>
                </div>
                <div className="flex gap-3">
                    <AppearanceCard id="light" label="Claro" icon={Sun} />
                    <AppearanceCard id="dark" label="Escuro" icon={Moon} />
                    <AppearanceCard id="system" label="Sistema" icon={Monitor} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl"><Palette className="w-5 h-5" strokeWidth={2} /></div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Cor de Destaque</h3>
                </div>
                <div className="grid grid-cols-5 gap-3">
                    {ACCENT_COLORS.map(c => (
                        <button 
                            key={c.hex}
                            onClick={() => onSetAccentColor(c.hex)}
                            className={`aspect-square rounded-2xl ${c.class} flex items-center justify-center transition-transform active:scale-90 border-2 ${accentColor === c.hex ? 'border-white dark:border-slate-900 shadow-xl scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            title={c.name}
                        >
                            {accentColor === c.hex && <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />}
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl"><EyeOff className="w-5 h-5" strokeWidth={2} /></div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Privacidade</h3>
                </div>
                 <Toggle 
                    label="Borrar valores sensíveis" 
                    icon={privacyMode ? EyeOff : Eye}
                    checked={privacyMode} 
                    onChange={() => onSetPrivacyMode(!privacyMode)} 
                 />
                 <p className="text-xs text-slate-500 px-2">Valores monetários serão ocultados até que você interaja com eles.</p>
              </div>

            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent"><Key className="w-6 h-6" strokeWidth={1.5} /></div>
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
            <div className="space-y-4 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500"><Bell className="w-6 h-6" strokeWidth={1.5} /></div>
                    <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Notificações</h2><p className="text-xs text-slate-500">Status: {permissionStatus === 'granted' ? 'Ativo' : 'Pendente'}</p></div>
                </div>
                {permissionStatus !== 'granted' && (
                  <button onClick={requestNotificationPermission} className="w-full bg-accent text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg active:scale-95 transition-all mb-4">Autorizar Navegador</button>
                )}
                <Toggle label="Novos Pagamentos Detectados" checked={notifyPrefs.payments} onChange={() => setNotifyPrefs(p => ({ ...p, payments: !p.payments }))} />
                <Toggle label="Alertas de Data Com" checked={notifyPrefs.datacom} onChange={() => setNotifyPrefs(p => ({ ...p, datacom: !p.datacom }))} />
                
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl mt-4 border border-slate-100 dark:border-white/5">
                  <p className="text-xs text-slate-500 leading-relaxed">O app irá te notificar quando a Inteligência Artificial detectar novos proventos que não estavam na sua base de dados anterior.</p>
                </div>
            </div>
          )}

          {activeSection === 'updates' && (
              <div className="space-y-6 animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500"><RefreshCcw className="w-6 h-6" strokeWidth={1.5} /></div>
                      <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Atualizações</h2><p className="text-xs text-slate-500">Versão e Melhorias</p></div>
                  </div>

                  <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden transition-all duration-500 ${updateAvailable ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                      {updateAvailable && <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse"></div>}
                      
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg ${updateAvailable ? 'bg-white text-indigo-600' : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-300'}`}>
                          {updateAvailable ? <Rocket className="w-8 h-8 animate-bounce" strokeWidth={1.5} /> : <GitBranch className="w-8 h-8" strokeWidth={1.5} />}
                      </div>

                      <div>
                         <h3 className={`text-2xl font-black mb-1 ${updateAvailable ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {updateAvailable ? 'Atualização Disponível' : 'Você está atualizado'}
                         </h3>
                         <p className={`text-sm font-medium ${updateAvailable ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Versão Instalada: v{appVersion}
                         </p>
                      </div>

                      {updateAvailable && (
                        <button onClick={onShowChangelog} className="mt-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                           <Download className="w-4 h-4" /> Instalar Agora
                        </button>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={onCheckUpdates} className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                          <RefreshCcw className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Verificar</span>
                      </button>
                      <button onClick={onShowChangelog} className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                          <History className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Histórico</span>
                      </button>
                  </div>

                  {!updateAvailable && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 items-start">
                          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
                              Seu aplicativo está rodando a versão mais recente com todos os recursos de segurança e performance ativos.
                          </p>
                      </div>
                  )}
              </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-4 animate-fade-in-up">
                <button onClick={handleExport} className="w-full bg-white dark:bg-secondary-dark/40 p-5 rounded-3xl border border-slate-200 dark:border-white/10 text-left flex items-center gap-4 active:scale-[0.98] shadow-sm hover:bg-slate-50">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Download className="w-6 h-6" strokeWidth={1.5} /></div>
                    <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">Exportar Backup Total</h3><p className="text-[10px] text-slate-500">Ativos + Histórico de Dividendos</p></div>
                </button>
                <button onClick={handleImportClick} className="w-full bg-white dark:bg-secondary-dark/40 p-5 rounded-3xl border border-slate-200 dark:border-white/10 text-left flex items-center gap-4 active:scale-[0.98] shadow-sm hover:bg-slate-50">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Upload className="w-6 h-6" strokeWidth={1.5} /></div>
                    <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">Importar Backup</h3><p className="text-[10px] text-slate-500">Restaurar toda a sua carteira</p></div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </button>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="space-y-6 animate-fade-in-up">
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
