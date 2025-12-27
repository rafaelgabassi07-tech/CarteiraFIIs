
import React, { useState, useRef, useEffect } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, HardDrive, Cpu, Smartphone, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, Check, Calendar, Sparkles, Lock, History } from 'lucide-react';
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

const ACCENT_COLORS = [
  { name: 'Azul Céu', hex: '#0ea5e9', class: 'bg-sky-500', ring: 'ring-sky-500' },
  { name: 'Esmeralda', hex: '#10b981', class: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { name: 'Roxo Real', hex: '#8b5cf6', class: 'bg-violet-500', ring: 'ring-violet-500' },
  { name: 'Laranja Solar', hex: '#f97316', class: 'bg-orange-500', ring: 'ring-orange-500' },
  { name: 'Rosa Choque', hex: '#ec4899', class: 'bg-pink-500', ring: 'ring-pink-500' },
  { name: 'Cinza Neutro', hex: '#64748b', class: 'bg-slate-500', ring: 'ring-slate-500' },
];

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, onSaveToken, transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, updateAvailable, onCheckUpdates, onShowChangelog
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates'>('menu');
  const [token, setToken] = useState(brapiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEnvToken = process.env.BRAPI_TOKEN === brapiToken && !!process.env.BRAPI_TOKEN;
  
  const [notifyPrefs, setNotifyPrefs] = useState(() => {
    const saved = localStorage.getItem('investfiis_prefs_notifications');
    return saved ? JSON.parse(saved) : { payments: true, datacom: true };
  });

  useEffect(() => {
    localStorage.setItem('investfiis_prefs_notifications', JSON.stringify(notifyPrefs));
  }, [notifyPrefs]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveToken = () => { onSaveToken(token); showMessage('success', 'Token salvo!'); };

  const handleExport = () => {
    const backup = {
      transactions, geminiDividends, brapiToken: !isEnvToken ? brapiToken : undefined,
      version: '4.8.0', exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showMessage('success', 'Backup exportado!');
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.transactions) {
           onImportTransactions(json.transactions);
           if(json.geminiDividends) onImportDividends(json.geminiDividends);
           if(json.brapiToken) onSaveToken(json.brapiToken);
           showMessage('success', 'Dados restaurados.');
        } else {
           throw new Error("Inválido");
        }
      } catch { showMessage('error', 'Arquivo inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const SettingsItem = ({ icon: Icon, label, description, onClick, colorClass, delay = 0 }: any) => (
    <button 
      onClick={onClick} 
      className="w-full bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-slate-200 dark:hover:border-white/10 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-10 dark:bg-opacity-20 transition-transform group-hover:scale-110`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} strokeWidth={2} />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-black text-slate-900 dark:text-white mb-0.5">{label}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" strokeWidth={2} />
    </button>
  );

  const Toggle = ({ label, checked, onChange, icon: Icon }: any) => (
    <div onClick={onChange} className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer active:scale-[0.99] transition-all ${checked ? 'bg-white dark:bg-[#0f172a] border-accent/30 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-transparent'}`}>
        <div className="flex items-center gap-3">
          {Icon && <div className={`p-2 rounded-xl ${checked ? 'bg-accent/10 text-accent' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}><Icon className="w-5 h-5" strokeWidth={2} /></div>}
          <span className={`text-sm font-bold ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</span>
        </div>
        <div className={`transition-colors duration-300 ${checked ? 'text-accent' : 'text-slate-300 dark:text-slate-600'}`}>
            {checked ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
        </div>
    </div>
  );

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto">
      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl z-[60] text-sm font-bold text-white transition-all transform animate-fade-in-up ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {activeSection === 'menu' ? (
        <div className="space-y-8 animate-fade-in">
           <div className="flex items-center gap-4 px-2 mb-4">
              <div className="w-16 h-16 rounded-[1.2rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-white/5">
                 <Smartphone className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <div>
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ajustes</h2>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Versão {appVersion}</p>
              </div>
           </div>
           
           <div className="space-y-3">
             <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Geral</p>
             <SettingsItem icon={Palette} label="Aparência" description="Tema & Cores" colorClass="bg-pink-500" onClick={() => setActiveSection('appearance')} delay={0} />
             <SettingsItem icon={Globe} label="Conexões" description="Chaves de API" colorClass="bg-blue-500" onClick={() => setActiveSection('integrations')} delay={50} />
             <SettingsItem icon={Bell} label="Notificações" description="Alertas Inteligentes" colorClass="bg-amber-500" onClick={() => setActiveSection('notifications')} delay={100} />
           </div>

           <div className="space-y-3">
             <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema</p>
             <SettingsItem icon={RefreshCcw} label="Atualizações" description="Verificar Versão" colorClass="bg-indigo-500" onClick={() => setActiveSection('updates')} delay={150} />
             <SettingsItem icon={HardDrive} label="Backup" description="Importar / Exportar" colorClass="bg-emerald-500" onClick={() => setActiveSection('data')} delay={200} />
             <SettingsItem icon={Cpu} label="Zona de Perigo" description="Resetar App" colorClass="bg-rose-500" onClick={() => setActiveSection('system')} delay={250} />
           </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <button onClick={() => setActiveSection('menu')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-accent transition-colors mb-8 font-bold text-sm px-1 py-2 active:scale-95 group">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-accent group-hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            </div>
            <span>Voltar</span>
          </button>

          {activeSection === 'appearance' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-4">
                <h3 className="font-black text-lg text-slate-900 dark:text-white px-1">Tema</h3>
                <div className="flex gap-3">
                   {['light','dark','system'].map(m => (
                       <button key={m} onClick={() => onSetTheme(m as ThemeType)} className={`flex-1 py-6 rounded-[1.5rem] border flex flex-col items-center gap-3 transition-all active:scale-95 ${theme === m ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xl' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}>
                          {m === 'light' ? <Sun className="w-6 h-6" strokeWidth={2} /> : m === 'dark' ? <Moon className="w-6 h-6" strokeWidth={2} /> : <Monitor className="w-6 h-6" strokeWidth={2} />}
                          <span className="text-[10px] font-black uppercase tracking-widest">{m === 'system' ? 'Auto' : m === 'light' ? 'Claro' : 'Escuro'}</span>
                       </button>
                   ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-black text-lg text-slate-900 dark:text-white px-1">Destaque</h3>
                <div className="flex flex-wrap gap-4 px-1">
                    {ACCENT_COLORS.map(c => (
                        <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-12 h-12 rounded-full ${c.class} flex items-center justify-center transition-all active:scale-90 border-4 ${accentColor === c.hex ? 'border-white dark:border-[#0f172a] shadow-xl scale-110 ring-2 ' + c.ring : 'border-transparent opacity-40 hover:opacity-100'}`}>
                            {accentColor === c.hex && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                 <h3 className="font-black text-lg text-slate-900 dark:text-white px-1">Privacidade</h3>
                 <Toggle label="Modo Discreto" icon={privacyMode ? EyeOff : Eye} checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6 animate-fade-in-up">
               <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Key className="w-6 h-6" strokeWidth={2} /></div>
                  <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">API Brapi</h2>
                      <p className="text-xs font-bold text-slate-500 uppercase">Cotações Reais</p>
                  </div>
               </div>
               
               <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 relative overflow-hidden">
                  <div className="relative group z-10">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
                      <input type="password" value={isEnvToken ? '****************' : token} onChange={(e) => setToken(e.target.value)} disabled={isEnvToken} placeholder="Token Brapi" className="w-full bg-slate-50 dark:bg-black/20 rounded-2xl py-4 pl-12 pr-4 text-sm font-mono outline-none border border-transparent focus:border-accent transition-colors" />
                  </div>
                  {!isEnvToken && (
                      <button onClick={handleSaveToken} className="w-full mt-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" /> Salvar Chave
                      </button>
                  )}
               </div>
            </div>
          )}

          {activeSection === 'notifications' && (
             <div className="space-y-4 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Bell className="w-6 h-6" strokeWidth={2} /></div>
                  <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Notificações</h2>
                      <p className="text-xs font-bold text-slate-500 uppercase">Alertas</p>
                  </div>
               </div>
               <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200 dark:border-white/5 p-2 space-y-2">
                  <Toggle label="Novos Pagamentos" icon={Sparkles} checked={notifyPrefs.payments} onChange={() => setNotifyPrefs(p => ({ ...p, payments: !p.payments }))} />
                  <Toggle label="Data Com" icon={Calendar} checked={notifyPrefs.datacom} onChange={() => setNotifyPrefs(p => ({ ...p, datacom: !p.datacom }))} />
               </div>
             </div>
          )}

          {activeSection === 'updates' && (
              <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-indigo-500/5 p-8 rounded-[2.5rem] text-center border border-indigo-500/10">
                      <div className="w-16 h-16 bg-white dark:bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg text-indigo-500">
                          <Rocket className="w-8 h-8" strokeWidth={2} />
                      </div>
                      <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-100 mb-1">{updateAvailable ? 'Nova Versão Disponível' : 'Tudo Atualizado'}</h3>
                      <p className="text-xs font-medium text-indigo-400 mb-6">Versão Atual: v{appVersion}</p>
                      
                      <button onClick={updateAvailable ? onShowChangelog : onCheckUpdates} className="w-full bg-indigo-500 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                          {updateAvailable ? 'Instalar Agora' : 'Verificar Novamente'}
                      </button>
                  </div>
                  
                  <button onClick={onShowChangelog} className="w-full bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500"><History className="w-5 h-5" /></div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Ver Histórico de Mudanças</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                   </button>
              </div>
          )}

          {activeSection === 'data' && (
             <div className="space-y-4 animate-fade-in-up">
                 <button onClick={handleExport} className="w-full bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center gap-5 text-left active:scale-[0.98] transition-all hover:border-blue-500/30 group relative overflow-hidden">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><Download className="w-6 h-6" strokeWidth={2} /></div>
                     <div className="relative z-10">
                         <h3 className="text-sm font-black text-slate-900 dark:text-white">Exportar Backup</h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Salvar arquivo .json</p>
                     </div>
                 </button>

                 <button onClick={handleImportClick} className="w-full bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center gap-5 text-left active:scale-[0.98] transition-all hover:border-emerald-500/30 group relative overflow-hidden">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><Upload className="w-6 h-6" strokeWidth={2} /></div>
                     <div className="relative z-10">
                         <h3 className="text-sm font-black text-slate-900 dark:text-white">Restaurar Backup</h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Carregar dados salvos</p>
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                 </button>
             </div>
          )}

          {activeSection === 'system' && (
              <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-rose-500/5 p-8 rounded-[2.5rem] text-center border border-rose-500/10">
                      <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                          <Trash2 className="w-8 h-8" strokeWidth={2} />
                      </div>
                      <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mb-2">Resetar Aplicativo</h3>
                      <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-xs mx-auto">Esta ação removerá permanentemente todas as suas transações e configurações deste dispositivo.</p>
                      <button onClick={onResetApp} className="w-full bg-rose-500 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Confirmar Apagar Tudo</button>
                  </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
};
