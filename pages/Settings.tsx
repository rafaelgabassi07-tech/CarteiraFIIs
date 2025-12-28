
import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Lock, History, Box, Layers, Gauge, Info, Wallet, FileJson, HardDrive, RotateCcw, XCircle, Smartphone, Wifi, Activity, Cloud, Server, Cpu, Radio, Zap, Loader2, Calendar, Target, TrendingUp, LayoutGrid, Sliders, ChevronDown, List, Search, WifiOff, MessageSquare, ExternalLink } from 'lucide-react';
import { Transaction, DividendReceipt, ReleaseNote } from '../types';
import { ThemeType } from '../App';

// Ícone auxiliar
const BadgeDollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"/><path d="M12 8v8"/><path d="M9.5 10.5c5.5-2.5 5.5 5.5 0 3"/></svg>
);

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
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
  releaseNotes?: ReleaseNote[];
  lastChecked?: number; 
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  lastSyncTime?: Date | null;
}

const ACCENT_COLORS = [
  { name: 'Sky', hex: '#0ea5e9', class: 'bg-sky-500' },
  { name: 'Emerald', hex: '#10b981', class: 'bg-emerald-500' },
  { name: 'Violet', hex: '#8b5cf6', class: 'bg-violet-500' },
  { name: 'Amber', hex: '#f59e0b', class: 'bg-amber-500' },
  { name: 'Crimson', hex: '#e11d48', class: 'bg-rose-500' },
  { name: 'Gold', hex: '#d4af37', class: 'bg-[#d4af37]' },
  { name: 'Slate', hex: '#475569', class: 'bg-slate-500' },
  { name: 'Midnight', hex: '#020617', class: 'bg-slate-900' },
];

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, onSaveToken, transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, updateAvailable, onCheckUpdates, onShowChangelog, releaseNotes, lastChecked,
  pushEnabled, onRequestPushPermission, lastSyncTime
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates'>('menu');
  const [token, setToken] = useState(brapiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEnvToken = process.env.BRAPI_TOKEN === brapiToken && !!process.env.BRAPI_TOKEN;
  
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'offline'>('idle');
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem('investfiis_glass_mode') !== 'false');
  
  const [storageData, setStorageData] = useState({ 
    totalBytes: 0,
    breakdown: { tx: 0, quotes: 0, divs: 0 } 
  });

  const [notifyDivs, setNotifyDivs] = useState(() => localStorage.getItem('investfiis_notify_divs') !== 'false');
  const [notifyDataCom, setNotifyDataCom] = useState(() => localStorage.getItem('investfiis_notify_datacom') !== 'false');
  const [notifyGoals, setNotifyGoals] = useState(() => localStorage.getItem('investfiis_notify_goals') !== 'false');
  const [notifyMarket, setNotifyMarket] = useState(() => localStorage.getItem('investfiis_notify_market') === 'true');
  const [notifyUpdates, setNotifyUpdates] = useState(() => localStorage.getItem('investfiis_notify_updates') !== 'false');
  
  const [brapiStatus, setBrapiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');

  useEffect(() => {
    localStorage.setItem('investfiis_glass_mode', String(glassMode));
    document.documentElement.classList.toggle('glass-effect', glassMode);
  }, [glassMode]);

  useEffect(() => { localStorage.setItem('investfiis_notify_divs', String(notifyDivs)); }, [notifyDivs]);
  useEffect(() => { localStorage.setItem('investfiis_notify_datacom', String(notifyDataCom)); }, [notifyDataCom]);
  useEffect(() => { localStorage.setItem('investfiis_notify_goals', String(notifyGoals)); }, [notifyGoals]);
  useEffect(() => { localStorage.setItem('investfiis_notify_market', String(notifyMarket)); }, [notifyMarket]);
  useEffect(() => { localStorage.setItem('investfiis_notify_updates', String(notifyUpdates)); }, [notifyUpdates]);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const calculateStorage = () => {
    const getKeySize = (key: string) => {
        const item = localStorage.getItem(key);
        return item ? new Blob([item]).size : 0;
    };
    const txSize = getKeySize('investfiis_v4_transactions');
    const quoteSize = getKeySize('investfiis_v3_quote_cache');
    const divSize = getKeySize('investfiis_v4_div_cache');
    const total = txSize + quoteSize + divSize;

    setStorageData({
        totalBytes: total,
        breakdown: { tx: txSize, quotes: quoteSize, divs: divSize }
    });
  };

  useEffect(() => { calculateStorage(); }, [transactions, geminiDividends, activeSection, message]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveToken = () => { onSaveToken(token); showMessage('success', 'Token salvo!'); };
  
  const handleTestBrapi = async () => {
    if (!token && !isEnvToken) {
        showMessage('error', 'Token não inserido.');
        setBrapiStatus('error');
        setTimeout(() => setBrapiStatus('idle'), 2000);
        return;
    }
    setBrapiStatus('checking');
    try {
        const testTicker = 'PETR4';
        const t = isEnvToken ? process.env.BRAPI_TOKEN : token;
        const res = await fetch(`https://brapi.dev/api/quote/${testTicker}?token=${t}&range=1d&interval=1d`);
        if (res.ok) {
            setBrapiStatus('ok');
            showMessage('success', 'Conexão Brapi.dev estabelecida!');
        } else {
            setBrapiStatus('error');
            showMessage('error', 'Token inválido ou expirado.');
        }
    } catch (e) {
        setBrapiStatus('error');
        showMessage('error', 'Falha de rede.');
    }
    setTimeout(() => setBrapiStatus('idle'), 3000);
  };

  const handleClearQuoteCache = () => { localStorage.removeItem('investfiis_v3_quote_cache'); calculateStorage(); showMessage('success', 'Cache limpo.'); };
  const handleClearDivCache = () => { localStorage.removeItem('investfiis_v4_div_cache'); onImportDividends([]); calculateStorage(); showMessage('success', 'Dados de IA limpos.'); };

  const handleExport = () => {
    const backup = { transactions, geminiDividends, brapiToken: !isEnvToken ? brapiToken : undefined, version: appVersion, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup_invest_${new Date().toISOString().split('T')[0]}.json`;
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
           showMessage('success', 'Restaurado com sucesso.');
        }
      } catch { showMessage('error', 'Arquivo inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCheckUpdate = async () => {
    if (updateAvailable) { onShowChangelog(); return; }
    
    if (!navigator.onLine) {
        setCheckStatus('offline');
        setTimeout(() => setCheckStatus('idle'), 3000);
        return;
    }

    setCheckStatus('checking');
    
    const minDelay = new Promise(resolve => setTimeout(resolve, 3000));
    const checkPromise = onCheckUpdates();
    
    const [_, hasUpdate] = await Promise.all([minDelay, checkPromise]);
    
    if (hasUpdate) {
        setCheckStatus('available');
    } else {
        setCheckStatus('latest');
        setTimeout(() => setCheckStatus('idle'), 3000);
    }
  };

  // --- Componentes de UI Auxiliares ---

  const MenuItem = ({ icon: Icon, label, value, onClick, isDestructive, hasUpdate }: any) => (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center justify-between p-4 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] transition-all border-b last:border-0 border-slate-100 dark:border-white/5 group`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 group-hover:bg-accent group-hover:text-white'}`}>
                <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className={`text-sm font-semibold ${isDestructive ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                {label}
            </span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs font-medium text-slate-400">{value}</span>}
            {hasUpdate && <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>}
            <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
    </button>
  );

  const Section = ({ title, children }: any) => (
    <div className="mb-6 anim-fade-in-up is-visible">
        {title && <h3 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>}
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-white/5">
            {children}
        </div>
    </div>
  );

  const Toggle = ({ label, checked, onChange, icon: Icon, description }: any) => (
    <div onClick={onChange} className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer active:scale-[0.99] transition-all border border-slate-100 dark:border-white/5 ${checked ? 'bg-white dark:bg-[#0f172a] shadow-sm' : 'bg-slate-50 dark:bg-white/5'}`}>
        <div className="flex items-center gap-3">
          {Icon && <div className={`p-2 rounded-lg ${checked ? 'bg-accent/10 text-accent' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}><Icon className="w-4 h-4" strokeWidth={2.2} /></div>}
          <div>
            <span className={`text-sm font-semibold block ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</span>
            {description && <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{description}</p>}
          </div>
        </div>
        <div className={`transition-all duration-300 ${checked ? 'text-accent' : 'text-slate-300 dark:text-slate-600'}`}>
            {checked ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
        </div>
    </div>
  );

  const safeTotal = storageData.totalBytes > 0 ? storageData.totalBytes : 1;
  const txPercent = (storageData.breakdown.tx / safeTotal) * 100;
  const quotePercent = (storageData.breakdown.quotes / safeTotal) * 100;
  const divPercent = (storageData.breakdown.divs / safeTotal) * 100;

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto">
      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[60] text-[10px] font-black uppercase tracking-widest text-white transition-all transform anim-fade-in-up is-visible ${message.type === 'success' ? 'bg-emerald-500' : message.type === 'info' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : message.type === 'info' ? <Info className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {activeSection === 'menu' ? (
        <>
            <Section title="Preferências">
                <MenuItem icon={Palette} label="Aparência e Cores" onClick={() => setActiveSection('appearance')} />
                <MenuItem icon={Bell} label="Notificações" onClick={() => setActiveSection('notifications')} value={pushEnabled ? 'Push Ativado' : ''} />
                <MenuItem icon={privacyMode ? EyeOff : Eye} label="Modo Privacidade" onClick={() => onSetPrivacyMode(!privacyMode)} value={privacyMode ? 'Ativado' : 'Desativado'} />
            </Section>

            <Section title="Dados & Sincronização">
                <MenuItem icon={Globe} label="Conexões & Serviços" onClick={() => setActiveSection('integrations')} value={brapiToken ? 'Configurado' : 'Pendente'} />
                <MenuItem icon={Database} label="Armazenamento e Backup" onClick={() => setActiveSection('data')} value={formatBytes(storageData.totalBytes)} />
            </Section>

            <Section title="Sistema">
                <MenuItem icon={RefreshCcw} label="Atualizações" onClick={() => setActiveSection('updates')} hasUpdate={updateAvailable} value={`v${appVersion}`} />
                <MenuItem icon={ShieldAlert} label="Resetar Aplicativo" onClick={() => setActiveSection('system')} isDestructive />
            </Section>

            <div className="text-center mt-8 opacity-40">
                <p className="text-[10px] font-bold uppercase tracking-widest">InvestFIIs Ultra</p>
                <p className="text-[9px]">Versão {appVersion}</p>
            </div>
        </>
      ) : (
        <div className="anim-fade-in is-visible pt-2">
          <button onClick={() => setActiveSection('menu')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-accent transition-colors mb-6 font-bold text-xs uppercase tracking-wider group px-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            </div>
            <span>Voltar</span>
          </button>

          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#0b1121] p-8 shadow-sm transition-colors duration-500 border border-slate-200/50 dark:border-white/5">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-[50px] transition-colors duration-500" style={{ backgroundColor: accentColor }}></div>
                  <div className="relative z-10">
                      <div className="mb-6 flex items-center justify-between">
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 w-fit">
                              <Wallet className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patrimônio</span>
                           </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ 15.420,00</div>
                  </div>
              </div>
              
              <Section title="Cor de Destaque">
                  <div className="p-4 bg-white dark:bg-[#0f172a] grid grid-cols-4 gap-3">
                      {ACCENT_COLORS.map((c) => (
                           <button 
                             key={c.hex} 
                             onClick={() => onSetAccentColor(c.hex)}
                             className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${accentColor === c.hex ? 'bg-slate-100 dark:bg-white/10' : ''}`}
                           >
                              <div className={`w-10 h-10 rounded-full ${c.class} shadow-sm relative flex items-center justify-center transition-transform group-hover:scale-110`}>
                                 {accentColor === c.hex && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-wider mt-2 text-slate-500">{c.name}</span>
                           </button>
                      ))}
                  </div>
              </Section>

              <Section title="Tema">
                  <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#0f172a]">
                      {[
                        { id: 'light', icon: Sun, label: 'Claro' },
                        { id: 'dark', icon: Moon, label: 'Escuro' },
                        { id: 'system', icon: Monitor, label: 'Auto' }
                      ].map((mode) => (
                          <button key={mode.id} onClick={() => onSetTheme(mode.id as ThemeType)} className={`flex flex-col items-center justify-center py-4 gap-2 transition-all ${theme === mode.id ? 'text-accent bg-accent/5' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                              <mode.icon className="w-5 h-5" strokeWidth={2.5} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">{mode.label}</span>
                          </button>
                      ))}
                  </div>
              </Section>

              <div className="space-y-3">
                 <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface</h3>
                 <Toggle label="Efeito Glassmorphism" icon={Layers} checked={glassMode} onChange={() => setGlassMode(!glassMode)} />
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
               <Section title="Permissões">
                  <div className="p-2">
                     <Toggle 
                        label="Notificações Push" 
                        description="Receba avisos mesmo com o app fechado" 
                        icon={MessageSquare} 
                        checked={pushEnabled} 
                        onChange={onRequestPushPermission} 
                     />
                  </div>
               </Section>

               <Section title="Tipos de Alerta">
                  <div className="space-y-3 p-2">
                    <Toggle label="Novos Proventos" description="Quando cair dinheiro na conta" icon={BadgeDollarSignIcon} checked={notifyDivs} onChange={() => setNotifyDivs(!notifyDivs)} />
                    <Toggle label="Data Com" description="Lembrete no último dia" icon={Calendar} checked={notifyDataCom} onChange={() => setNotifyDataCom(!notifyDataCom)} />
                    <Toggle label="Metas Atingidas" description="Magic Number e marcos" icon={Target} checked={notifyGoals} onChange={() => setNotifyGoals(!notifyGoals)} />
                  </div>
               </Section>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
                {/* CARD BRAPI */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center"><Cloud className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Brapi.dev</h3>
                                <p className="text-xs text-slate-500">Cotações de Ativos</p>
                            </div>
                        </div>
                        <a href="https://brapi.dev/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-accent transition-colors"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Fornecedor de cotações em tempo real para o mercado de ações e fundos imobiliários brasileiros.
                    </p>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-xs">
                        <span className="font-bold text-slate-400">Última Sinc.</span>
                        {lastSyncTime ? (
                            <div className="flex items-center gap-2 text-emerald-500 font-bold">
                                <span>{lastSyncTime.toLocaleString('pt-BR')}</span>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        ) : (
                            <span className="font-bold text-slate-400">Pendente</span>
                        )}
                    </div>
                    <div>
                        <div className="relative mb-2">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="password" value={isEnvToken ? '****************' : token} onChange={(e) => setToken(e.target.value)} disabled={isEnvToken} placeholder="Seu Token" className="w-full bg-slate-50 dark:bg-black/20 rounded-xl py-3 pl-11 pr-4 text-xs font-mono outline-none focus:ring-2 focus:ring-accent/50 transition-all" />
                        </div>
                        <div className="flex gap-2">
                            {!isEnvToken && ( <button onClick={handleSaveToken} className="flex-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Salvar</button> )}
                            <button onClick={handleTestBrapi} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                                {brapiStatus === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Testar Conexão'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* CARD GEMINI */}
                <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Sparkles className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Google Gemini</h3>
                                <p className="text-xs text-slate-500">Análise e Inteligência</p>
                            </div>
                        </div>
                        <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-accent transition-colors"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Inteligência artificial para análise de fundamentos, proventos, sentimento de mercado e indicadores macroeconômicos.
                    </p>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-xs">
                        <span className="font-bold text-slate-400">Modelo em Uso</span>
                        {/* FIX: Use correct model name based on guidelines */}
                        <span className="font-bold text-purple-500">gemini-3-flash-preview</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Novidades do Modelo</h4>
                        <div className="flex items-start gap-2">
                            <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                Gemini 2.5 Flash agora com busca em tempo real via Google Search para dados fundamentalistas e de proventos mais precisos e atualizados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeSection === 'data' && (
             <div className="space-y-6">
                 <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Armazenamento</h3>
                        <span className="text-xs font-mono text-slate-400">{formatBytes(storageData.totalBytes)}</span>
                    </div>
                    
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex mb-4">
                        <div style={{ width: `${txPercent}%` }} className="h-full bg-indigo-500" />
                        <div style={{ width: `${quotePercent}%` }} className="h-full bg-sky-500" />
                        <div style={{ width: `${divPercent}%` }} className="h-full bg-purple-500" />
                    </div>

                    <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Pessoal</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Cache</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> IA</span>
                    </div>
                 </div>

                 <Section title="Cache Local">
                    <button onClick={handleClearQuoteCache} className="w-full flex justify-between items-center p-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f172a] active:bg-slate-50 dark:active:bg-white/5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Limpar Cotações</span>
                        <span className="text-xs text-slate-400">{formatBytes(storageData.breakdown.quotes)}</span>
                    </button>
                    <button onClick={handleClearDivCache} className="w-full flex justify-between items-center p-4 bg-white dark:bg-[#0f172a] active:bg-slate-50 dark:active:bg-white/5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Limpar Dados IA</span>
                        <span className="text-xs text-slate-400">{formatBytes(storageData.breakdown.divs)}</span>
                    </button>
                 </Section>

                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExport} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-xs font-bold uppercase tracking-wider">
                        <Download className="w-4 h-4" /> Backup
                    </button>
                    <button onClick={handleImportClick} className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white py-4 rounded-2xl flex items-center justify-center gap-2 border border-slate-200/50 dark:border-white/5 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider">
                        <Upload className="w-4 h-4" /> Restaurar
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                 </div>
             </div>
          )}

          {activeSection === 'system' && (
              <div className="space-y-6">
                  <Section title="Perigo">
                      <div className="p-6 bg-rose-50 dark:bg-rose-500/5 flex flex-col items-center text-center">
                          <ShieldAlert className="w-10 h-10 text-rose-500 mb-3" />
                          <h3 className="font-bold text-rose-600 dark:text-rose-400 mb-1">Apagar Tudo</h3>
                          <p className="text-xs text-rose-400 mb-4 max-w-[200px]">Esta ação removerá todas as transações e configurações permanentemente.</p>
                          <button onClick={onResetApp} className="px-6 py-3 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 shadow-lg shadow-rose-500/20">Confirmar Reset</button>
                      </div>
                  </Section>
              </div>
          )}
          
          {activeSection === 'updates' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-6">
                   <div className="relative">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 ${checkStatus === 'checking' ? 'bg-accent/10 scale-110' : checkStatus === 'offline' ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                            {checkStatus === 'checking' ? (
                                <>
                                    <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-[spin_3s_linear_infinite]"></div>
                                    <div className="absolute inset-2 rounded-full border-4 border-accent/40 animate-[spin_2s_linear_infinite_reverse]"></div>
                                    <Search className="w-12 h-12 text-accent animate-pulse" />
                                </>
                            ) : checkStatus === 'latest' ? (
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 anim-scale-in is-visible" />
                            ) : updateAvailable || checkStatus === 'available' ? (
                                <Rocket className="w-12 h-12 text-amber-500 animate-bounce" />
                            ) : checkStatus === 'offline' ? (
                                <WifiOff className="w-12 h-12 text-rose-500" />
                            ) : (
                                <RefreshCcw className="w-12 h-12 text-slate-400" />
                            )}
                        </div>
                   </div>
                   
                   <div className="text-center">
                       <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">v{appVersion}</h2>
                       <div className="space-y-1">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest h-4">
                               {checkStatus === 'checking' ? 'Buscando atualizações...' : 
                                checkStatus === 'latest' ? 'Sistema Atualizado' :
                                checkStatus === 'offline' ? 'Sem Conexão' :
                                updateAvailable || checkStatus === 'available' ? 'Atualização Encontrada' : 
                                'Versão Instalada'}
                           </p>
                           {lastChecked && checkStatus !== 'checking' && (
                               <p className="text-[9px] font-medium text-slate-300 dark:text-slate-600">
                                   Última checagem: {new Date(lastChecked).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                               </p>
                           )}
                       </div>
                   </div>

                   {/* Botão de Atualização Aprimorado (Scanner Animation) */}
                   <button 
                     onClick={handleCheckUpdate}
                     disabled={checkStatus === 'checking' || checkStatus === 'latest'}
                     className={`relative overflow-hidden w-full max-w-xs py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3 group ${
                       checkStatus === 'latest' ? 'bg-emerald-500 text-white cursor-default' :
                       updateAvailable || checkStatus === 'available' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                       checkStatus === 'offline' ? 'bg-rose-500 text-white cursor-not-allowed' :
                       'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                     }`}
                   >
                       {/* Scanner Effect */}
                       {checkStatus === 'checking' && (
                           <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] animate-[shimmer_1.5s_infinite]"></div>
                       )}
                       
                       <span className="relative z-10 flex items-center gap-2">
                           {checkStatus === 'checking' ? (
                               <>SCANNING...</>
                           ) : checkStatus === 'latest' ? (
                               <><Check className="w-4 h-4" /> TUDO OK</>
                           ) : updateAvailable || checkStatus === 'available' ? (
                               <><Download className="w-4 h-4" /> BAIXAR AGORA</>
                           ) : checkStatus === 'offline' ? (
                               <><WifiOff className="w-4 h-4" /> OFFLINE</>
                           ) : (
                               <><RefreshCcw className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" /> VERIFICAR</>
                           )}
                       </span>
                   </button>

                   <div className="w-full max-w-xs mt-8 border-t border-slate-200 dark:border-white/10 pt-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Notas da Versão</h4>
                       <div className="space-y-4">
                          {releaseNotes && releaseNotes.length > 0 ? releaseNotes.map((note, i) => (
                              <div key={i} className="flex gap-3">
                                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${note.type === 'feat' ? 'bg-amber-500' : 'bg-accent'}`}></div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{note.title}</p>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{note.desc}</p>
                                  </div>
                              </div>
                          )) : <p className="text-center text-xs text-slate-400 italic">Sem notas.</p>}
                       </div>
                   </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
};
