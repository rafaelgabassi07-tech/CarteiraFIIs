
import React, { useState, useRef, useEffect } from 'react';
import { Save, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, Bell, ToggleLeft, ToggleRight, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Rocket, Check, Sparkles, Lock, History, Box, Layers, Gauge, Info, Wallet, FileJson, HardDrive, RotateCcw, XCircle, Smartphone, Wifi, Activity, Cloud, Server, Cpu, Radio } from 'lucide-react';
import { Transaction, DividendReceipt } from '../types';
import { ThemeType } from '../App';

// Ícone auxiliar movido para o topo para evitar erros de inicialização
const BadgeDollarSignIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"/><path d="M12 8v8"/><path d="M9.5 10.5c5.5-2.5 5.5 5.5 0 3"/></svg>
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
  onCheckUpdates: () => void;
  onShowChangelog: () => void;
}

const ACCENT_COLORS = [
  { name: 'Sky', hex: '#0ea5e9', class: 'bg-sky-500', ring: 'ring-sky-500' },
  { name: 'Emerald', hex: '#10b981', class: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { name: 'Violet', hex: '#8b5cf6', class: 'bg-violet-500', ring: 'ring-violet-500' },
  { name: 'Amber', hex: '#f59e0b', class: 'bg-amber-500', ring: 'ring-amber-500' },
  { name: 'Crimson', hex: '#e11d48', class: 'bg-rose-500', ring: 'ring-rose-500' },
  { name: 'Gold', hex: '#d4af37', class: 'bg-[#d4af37]', ring: 'ring-[#d4af37]' },
  { name: 'Slate', hex: '#475569', class: 'bg-slate-500', ring: 'ring-slate-500' },
  { name: 'Midnight', hex: '#020617', class: 'bg-slate-900', ring: 'ring-slate-900' },
];

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, onSaveToken, transactions, onImportTransactions,
  geminiDividends, onImportDividends, onResetApp, theme, onSetTheme,
  accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode,
  appVersion, updateAvailable, onCheckUpdates, onShowChangelog
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'integrations' | 'data' | 'system' | 'notifications' | 'appearance' | 'updates'>('menu');
  const [token, setToken] = useState(brapiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEnvToken = process.env.BRAPI_TOKEN === brapiToken && !!process.env.BRAPI_TOKEN;
  
  // Estado para funcionalidades locais
  const [glassMode, setGlassMode] = useState(() => localStorage.getItem('investfiis_glass_mode') !== 'false');
  const [animations, setAnimations] = useState(() => localStorage.getItem('investfiis_animations') !== 'false');
  
  // Estado de Armazenamento Real
  const [storageData, setStorageData] = useState({ 
    formattedUsed: '0 B',
    formattedQuota: '0 B',
    percentUsed: 0,
    breakdown: { tx: 0, quotes: 0, divs: 0 } 
  });

  const [notifyDivs, setNotifyDivs] = useState(() => localStorage.getItem('investfiis_notify_divs') !== 'false');
  const [notifyUpdates, setNotifyUpdates] = useState(() => localStorage.getItem('investfiis_notify_updates') !== 'false');
  
  // Estados para Conexões
  const [brapiStatus, setBrapiStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');

  useEffect(() => {
    localStorage.setItem('investfiis_glass_mode', String(glassMode));
    document.documentElement.classList.toggle('glass-effect', glassMode);
  }, [glassMode]);

  useEffect(() => {
    localStorage.setItem('investfiis_animations', String(animations));
    if (!animations) document.body.classList.add('disable-animations');
    else document.body.classList.remove('disable-animations');
  }, [animations]);

  useEffect(() => { localStorage.setItem('investfiis_notify_divs', String(notifyDivs)); }, [notifyDivs]);
  useEffect(() => { localStorage.setItem('investfiis_notify_updates', String(notifyUpdates)); }, [notifyUpdates]);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const calculateStorage = async () => {
    // 1. Calcular Breakdown Interno (O que o app consome de localStorage)
    const getSize = (key: string) => new Blob([localStorage.getItem(key) || '']).size;
    const txSize = getSize('investfiis_v4_transactions');
    const quoteSize = getSize('investfiis_v3_quote_cache');
    const divSize = getSize('investfiis_v4_div_cache');
    const totalAppUsage = txSize + quoteSize + divSize; // Tamanho aproximado dos dados do app
    
    // Breakdown percentual relativo ao uso DO APP (para a barra colorida)
    const safeTotal = totalAppUsage > 0 ? totalAppUsage : 1;

    // 2. Calcular Quota Real do Dispositivo/Navegador
    let usedBytes = totalAppUsage;
    let quotaBytes = 0;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            if (estimate.usage) usedBytes = estimate.usage; // Uso real reportado pelo browser (inclui cache de imagens, SW, etc)
            if (estimate.quota) quotaBytes = estimate.quota;
        } catch (e) {
            console.warn("Storage API error", e);
        }
    }

    // Se a quota não for reportada, usamos um fallback visual apenas para não quebrar (ex: 1GB)
    const displayQuota = quotaBytes > 0 ? quotaBytes : 1024 * 1024 * 1024; 

    setStorageData({
        formattedUsed: formatBytes(usedBytes),
        formattedQuota: quotaBytes > 0 ? formatBytes(quotaBytes) : 'Desconhecido',
        percentUsed: (usedBytes / displayQuota) * 100, // Percentual real do disco
        breakdown: {
            tx: (txSize / safeTotal) * 100,
            quotes: (quoteSize / safeTotal) * 100,
            divs: (divSize / safeTotal) * 100
        }
    });
  };

  useEffect(() => {
    calculateStorage();
  }, [transactions, geminiDividends, activeSection, message]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveToken = () => { onSaveToken(token); showMessage('success', 'Token salvo!'); };
  
  const handleTestBrapi = async () => {
    if (!token && !isEnvToken) return;
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
            showMessage('error', 'Token inválido ou erro de conexão.');
        }
    } catch (e) {
        setBrapiStatus('error');
        showMessage('error', 'Sem conexão com a internet.');
    }
  };

  const handleClearQuoteCache = () => {
    localStorage.removeItem('investfiis_v3_quote_cache');
    calculateStorage();
    showMessage('success', 'Cache de cotações limpo.');
  };

  const handleClearDivCache = () => {
    localStorage.removeItem('investfiis_v4_div_cache');
    onImportDividends([]); // Limpa o estado no App
    calculateStorage();
    showMessage('success', 'Cache de IA limpo.');
  };

  const handleExport = () => {
    const backup = {
      transactions, geminiDividends, brapiToken: !isEnvToken ? brapiToken : undefined,
      version: appVersion, exportDate: new Date().toISOString()
    };
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
           showMessage('success', 'Dados restaurados com sucesso.');
        }
      } catch { showMessage('error', 'Arquivo inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const SettingsItem = ({ icon: Icon, label, description, onClick, colorClass, delay = 0, badge }: any) => (
    <button 
      onClick={onClick} 
      className="w-full bg-white dark:bg-[#0f172a] p-4 rounded-[1.8rem] flex items-center justify-between group active:scale-[0.98] transition-all animate-fade-in-up shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-10 dark:bg-opacity-20 transition-transform group-hover:scale-105 shadow-inner`}>
          <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} strokeWidth={2.2} />
        </div>
        <div className="text-left">
          <h3 className="text-[13px] font-black text-slate-900 dark:text-white mb-0.5 tracking-tight">{label}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {badge && <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-400">{badge}</span>}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent transition-colors" strokeWidth={3} />
      </div>
    </button>
  );

  const Toggle = ({ label, checked, onChange, icon: Icon, description }: any) => (
    <div onClick={onChange} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer active:scale-[0.99] transition-all ${checked ? 'bg-white dark:bg-[#0f172a] shadow-sm' : 'bg-slate-50 dark:bg-white/5'}`}>
        <div className="flex items-center gap-3">
          {Icon && <div className={`p-2.5 rounded-xl ${checked ? 'bg-accent/10 text-accent' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}><Icon className="w-4 h-4" strokeWidth={2.2} /></div>}
          <div>
            <span className={`text-[11px] font-black uppercase tracking-wider block ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</span>
            {description && <p className="text-[9px] text-slate-400 font-medium">{description}</p>}
          </div>
        </div>
        <div className={`transition-all duration-300 ${checked ? 'text-accent' : 'text-slate-300 dark:text-slate-600'}`}>
            {checked ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
        </div>
    </div>
  );

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto space-y-6">
      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-[60] text-[10px] font-black uppercase tracking-widest text-white transition-all transform animate-fade-in-up ${message.type === 'success' ? 'bg-emerald-500' : message.type === 'info' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : message.type === 'info' ? <Info className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {activeSection === 'menu' ? (
        <div className="space-y-7 animate-fade-in pt-2">
           
           <div className="space-y-4">
             <div className="flex items-center gap-3 px-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Personalização</p>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10"></div>
             </div>
             <div className="space-y-3">
                <SettingsItem icon={Palette} label="Aparência" description="Cores & Interface" colorClass="bg-pink-500" onClick={() => setActiveSection('appearance')} delay={50} />
                <SettingsItem icon={Globe} label="Conexões" description="Chaves de API & Status" colorClass="bg-blue-500" onClick={() => setActiveSection('integrations')} delay={100} badge={brapiToken ? 'Ativo' : 'Vazio'} />
                <SettingsItem icon={Bell} label="Notificações" description="Alertas Ativos" colorClass="bg-amber-500" onClick={() => setActiveSection('notifications')} delay={150} />
             </div>
           </div>

           <div className="space-y-4 pt-2">
             <div className="flex items-center gap-3 px-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestão Técnica</p>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10"></div>
             </div>
             <div className="space-y-3">
                <SettingsItem icon={RefreshCcw} label="Atualizações" description="Build & Changelog" colorClass="bg-indigo-500" onClick={() => setActiveSection('updates')} delay={200} badge={updateAvailable ? 'Novo' : 'v' + appVersion} />
                <SettingsItem icon={Database} label="Armazenamento" description="Backup & Cache" colorClass="bg-emerald-500" onClick={() => setActiveSection('data')} delay={250} badge={storageData.formattedUsed} />
                <SettingsItem icon={ShieldAlert} label="Zona Crítica" description="Privacidade & Reset" colorClass="bg-rose-500" onClick={() => setActiveSection('system')} delay={300} />
             </div>
           </div>
           
           <div className="pt-6 text-center">
              <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">Made for the B3 Market</p>
           </div>
        </div>
      ) : (
        <div className="animate-fade-in pt-2">
          <button onClick={() => setActiveSection('menu')} className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-accent transition-colors mb-8 font-black text-[10px] uppercase tracking-widest px-2 py-2 group">
            <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            </div>
            <span>Voltar ao Menu</span>
          </button>

          {activeSection === 'appearance' && (
            <div className="space-y-8 animate-fade-in-up">
              
              {/* Live Preview Dinâmico */}
              <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#0b1121] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-500">
                  {/* Background Glow */}
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-[50px] transition-colors duration-500" style={{ backgroundColor: accentColor }}></div>
                  
                  {/* Conteúdo Simulado Home */}
                  <div className="relative z-10">
                      <div className="mb-6 flex items-center justify-between">
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 w-fit">
                              <Wallet className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patrimônio</span>
                           </div>
                           <div className="h-2 w-2 rounded-full animate-pulse transition-colors duration-500" style={{ backgroundColor: accentColor }}></div>
                      </div>
                      <div className="space-y-2">
                          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ 15.420,00</div>
                          <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg text-emerald-500 bg-emerald-500/10">
                                  <ArrowLeft className="w-3 h-3 rotate-45" /> +12.5%
                              </span>
                          </div>
                      </div>
                      <div className="mt-8 grid grid-cols-2 gap-3">
                         <div className="h-12 w-full rounded-2xl bg-slate-50 dark:bg-white/5"></div>
                         <div className="h-12 w-full rounded-2xl bg-slate-50 dark:bg-white/5"></div>
                      </div>
                  </div>
              </div>
              
              {/* Seletor de Cores */}
              <div className="space-y-4 pt-2">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      Personalidade
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                      {ACCENT_COLORS.map((c) => {
                        const isActive = accentColor === c.hex;
                        return (
                           <button 
                             key={c.hex} 
                             onClick={() => onSetAccentColor(c.hex)}
                             className={`group relative flex flex-col items-center gap-3 p-3 rounded-3xl transition-all duration-300 ${
                               isActive ? 'bg-white dark:bg-[#0b1121] shadow-lg scale-105 z-10' : 'hover:bg-white/50 dark:hover:bg-white/5'
                             }`}
                           >
                              <div className={`w-12 h-12 rounded-2xl ${c.class} shadow-lg relative flex items-center justify-center transition-transform group-hover:scale-110`}>
                                 {isActive && <Check className="w-6 h-6 text-white animate-scale-in drop-shadow-md" strokeWidth={3} />}
                                 {/* Glow effect for active */}
                                 {isActive && (
                                    <div className={`absolute inset-0 rounded-2xl ${c.class} blur-lg opacity-40 -z-10`}></div>
                                 )}
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                 isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'
                              }`}>
                                {c.name}
                              </span>
                           </button>
                        );
                      })}
                  </div>
              </div>

              {/* Seletor de Tema */}
              <div className="space-y-4">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                     Aparência
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'light', icon: Sun, label: 'Claro' },
                        { id: 'dark', icon: Moon, label: 'Escuro' },
                        { id: 'system', icon: Monitor, label: 'Auto' }
                      ].map((mode) => {
                        const isActive = theme === mode.id;
                        const Icon = mode.icon;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => onSetTheme(mode.id as ThemeType)}
                            className={`group relative flex flex-col items-center justify-center gap-3 py-6 rounded-3xl transition-all duration-300 ${
                              isActive 
                                ? 'bg-accent/5 scale-[1.02] shadow-xl shadow-accent/10' 
                                : 'bg-white dark:bg-[#0b1121] hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                          >
                            {isActive && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-white shadow-sm animate-scale-in">
                                 <Check className="w-3 h-3" strokeWidth={4} />
                              </div>
                            )}
                            
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                              isActive ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                            }`}>
                               <Icon className="w-6 h-6" strokeWidth={2} />
                            </div>
                            
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              isActive ? 'text-accent' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                            }`}>
                              {mode.label}
                            </span>
                          </button>
                        )
                      })}
                  </div>
              </div>

              <div className="space-y-4 pt-2">
                 <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2">Interface & Efeitos</h3>
                 <div className="bg-white dark:bg-[#0f172a] p-2 rounded-[2rem] shadow-sm space-y-1">
                    <Toggle label="Efeito Glassmorphism" description="Desfoque translúcido no cabeçalho" icon={Layers} checked={glassMode} onChange={() => setGlassMode(!glassMode)} />
                    <div className="h-[1px] bg-slate-100 dark:bg-white/5 mx-4"></div>
                    <Toggle label="Animações Fluídas" description="Transições suaves entre telas" icon={Gauge} checked={animations} onChange={() => setAnimations(!animations)} />
                 </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-fade-in-up">
               {/* Preview de Notificação */}
               <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 rounded-[2.5rem] relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                   <div className="relative z-10 mb-6 text-center">
                        <div className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm text-amber-500">
                             <Bell className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-black text-amber-600 dark:text-amber-400 tracking-tight">Central de Alertas</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Veja como os alertas aparecem para você.</p>
                   </div>
                   
                   {/* Card Mock */}
                   <div className="bg-white dark:bg-[#0b1121] p-4 rounded-2xl flex gap-3 shadow-lg transform rotate-1 scale-95 opacity-90 hover:rotate-0 hover:scale-100 transition-all duration-500 cursor-default">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                           <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                           <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">Novos Dividendos</h4>
                           <p className="text-[10px] text-slate-500 leading-tight">Você recebeu R$ 150,00 em proventos de MXRF11.</p>
                        </div>
                   </div>
                   
                   <p className="text-center text-[9px] font-black text-amber-500/50 uppercase tracking-widest mt-4">Simulação</p>
               </div>

               <div className="space-y-3">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 mb-1">Preferências</h3>
                  <Toggle 
                    label="Novos Proventos" 
                    description="Alertar quando a IA detectar pagamentos" 
                    icon={BadgeDollarSignIcon} 
                    checked={notifyDivs} 
                    onChange={() => setNotifyDivs(!notifyDivs)} 
                  />
                  <Toggle 
                    label="Atualizações do App" 
                    description="Novidades, melhorias e correções" 
                    icon={Rocket} 
                    checked={notifyUpdates} 
                    onChange={() => setNotifyUpdates(!notifyUpdates)} 
                  />
               </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-8 animate-fade-in-up">
               <div className="flex items-center gap-4 mb-4 px-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Radio className="w-6 h-6" strokeWidth={2.5} /></div>
                  <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">Conexões</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status dos serviços</p>
                  </div>
               </div>
               
               {/* Seção Brapi */}
               <div className="space-y-4">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      Provedor de Dados
                  </h3>
                  <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] relative overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Brapi.dev</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            {brapiStatus === 'checking' && <RefreshCcw className="w-3 h-3 text-slate-400 animate-spin" />}
                            {brapiStatus === 'ok' && <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Online</span>}
                            {brapiStatus === 'error' && <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded">Offline</span>}
                         </div>
                      </div>
                      
                      <div className="relative group z-10">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
                          <input type="password" value={isEnvToken ? '****************' : token} onChange={(e) => setToken(e.target.value)} disabled={isEnvToken} placeholder="Token Brapi.dev" className="w-full bg-slate-50 dark:bg-black/20 rounded-2xl py-5 pl-14 pr-6 text-sm font-mono outline-none focus:ring-4 focus:ring-accent/10 transition-all text-center tracking-widest" />
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                         {!isEnvToken && (
                             <button onClick={handleSaveToken} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                                 <Save className="w-3 h-3" /> Salvar
                             </button>
                         )}
                         <button onClick={handleTestBrapi} className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center gap-2">
                             <Activity className="w-3 h-3" /> Testar
                         </button>
                      </div>
                  </div>
               </div>

               {/* Seção IA */}
               <div className="space-y-4">
                  <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                      Inteligência Artificial
                  </h3>
                  <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-6 rounded-[2.5rem] relative overflow-hidden flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-6 h-6" />
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Google Gemini</h4>
                            <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Conectado via Ambiente
                            </p>
                         </div>
                      </div>
                      <div className="bg-white dark:bg-white/5 p-3 rounded-2xl">
                          <Cpu className="w-5 h-5 text-indigo-500" />
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeSection === 'data' && (
             <div className="space-y-6 animate-fade-in-up">
                 {/* Card de Uso Visual */}
                 <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10 mb-6">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg"><HardDrive className="w-6 h-6" strokeWidth={2} /></div>
                            <div>
                               <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Armazenamento</h3>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{storageData.formattedUsed} / {storageData.formattedQuota}</p>
                            </div>
                         </div>
                    </div>
                    
                    {/* Barra de Progresso Segmentada */}
                    <div className="relative w-full h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex mb-4">
                        <div style={{ width: `${storageData.breakdown.tx}%` }} className="h-full bg-indigo-500 transition-all duration-1000" />
                        <div style={{ width: `${storageData.breakdown.quotes}%` }} className="h-full bg-sky-500 transition-all duration-1000" />
                        <div style={{ width: `${storageData.breakdown.divs}%` }} className="h-full bg-purple-500 transition-all duration-1000" />
                    </div>

                    {/* Legenda */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-indigo-500" />
                             <span className="text-[9px] font-black uppercase text-slate-400">Usuário</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-sky-500" />
                             <span className="text-[9px] font-black uppercase text-slate-400">Cache</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-purple-500" />
                             <span className="text-[9px] font-black uppercase text-slate-400">IA</span>
                        </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] px-2 mb-2">Gerenciamento</h3>
                    
                    {/* Item de Cotações */}
                    <div className="w-full bg-white dark:bg-[#0f172a] p-5 rounded-[1.8rem] flex items-center justify-between group active:scale-[0.99] transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center"><Cloud className="w-5 h-5" strokeWidth={2} /></div>
                           <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-0.5">Cotações (Cache)</h4>
                              <p className="text-[9px] font-medium text-slate-400 leading-tight max-w-[150px]">Preços salvos para acesso offline.</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">{formatBytes(storageData.breakdown.quotes * storageData.percentUsed * 1024, 0)}</span>
                            <button onClick={handleClearQuoteCache} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 shadow-sm" title="Limpar">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Item de Dividendos IA */}
                    <div className="w-full bg-white dark:bg-[#0f172a] p-5 rounded-[1.8rem] flex items-center justify-between group active:scale-[0.99] transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Sparkles className="w-5 h-5" strokeWidth={2} /></div>
                           <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-0.5">Dividendos (IA)</h4>
                              <p className="text-[9px] font-medium text-slate-400 leading-tight max-w-[150px]">Histórico gerado pela IA.</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">{formatBytes(storageData.breakdown.divs * storageData.percentUsed * 1024, 0)}</span>
                            <button onClick={handleClearDivCache} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 shadow-sm" title="Limpar">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Item de Transações (ReadOnly) */}
                    <div className="w-full bg-white dark:bg-[#0f172a] p-5 rounded-[1.8rem] flex items-center justify-between opacity-80 grayscale-[0.5]">
                        <div className="flex items-center gap-4">
                           <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><FileJson className="w-5 h-5" strokeWidth={2} /></div>
                           <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-0.5">Transações</h4>
                              <p className="text-[9px] font-medium text-slate-400 leading-tight max-w-[150px]">Seus dados pessoais.</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">{formatBytes(storageData.breakdown.tx * storageData.percentUsed * 1024, 0)}</span>
                           <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-300">
                               <Lock className="w-4 h-4" />
                           </div>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <button onClick={handleExport} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-xl">
                        <Download className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Backup</span>
                    </button>
                    <button onClick={handleImportClick} className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white py-5 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-white/5">
                        <Upload className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Restaurar</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                 </div>
             </div>
          )}

          {activeSection === 'system' && (
              <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] space-y-4">
                     <h3 className="font-black text-base text-slate-900 dark:text-white px-1 tracking-tight">Privacidade</h3>
                     <Toggle label="Modo Invisível" description="Borra valores na tela principal" icon={EyeOff} checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />
                  </div>

                  <div className="bg-rose-500/10 p-8 rounded-[3rem] text-center relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500 to-transparent"></div>
                      <div className="relative z-10">
                        <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white shadow-2xl shadow-rose-500/30">
                            <ShieldAlert className="w-10 h-10" strokeWidth={2} />
                        </div>
                        <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mb-2 tracking-tighter">ZONA DE PERIGO</h3>
                        <p className="text-[11px] text-rose-800/70 dark:text-rose-200/70 mb-8 leading-relaxed max-w-[240px] mx-auto font-bold uppercase tracking-wide">
                           Esta ação apagará permanentemente todas as suas transações e configurações. Não há como desfazer.
                        </p>
                        <button onClick={onResetApp} className="w-full bg-rose-600 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-600/30 active:scale-95 transition-all hover:bg-rose-700 flex items-center justify-center gap-2">
                           <Trash2 className="w-4 h-4" />
                           Apagar Todos os Dados
                        </button>
                      </div>
                  </div>
              </div>
          )}
          
          {activeSection === 'updates' && (
              <div className="space-y-6 animate-fade-in-up">
                  <div className="bg-indigo-600 p-8 rounded-[3rem] text-center shadow-xl shadow-indigo-500/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      
                      <div className="relative z-10">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-white">
                                <Rocket className="w-10 h-10" strokeWidth={1.5} />
                            </div>
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-1 tracking-tighter">InvestFIIs Ultra</h3>
                        <p className="text-xs font-bold text-indigo-200 mb-8 uppercase tracking-widest">Versão Atual {appVersion}</p>
                        
                        <div className="bg-black/20 rounded-2xl p-1.5 flex items-center gap-1.5 mb-6 w-fit mx-auto">
                             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-2"></div>
                             <span className="text-[9px] font-black text-white uppercase tracking-widest pr-2">Sistema Operacional</span>
                        </div>

                        <button onClick={updateAvailable ? onShowChangelog : onCheckUpdates} className="w-full bg-white text-indigo-600 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-50">
                            {updateAvailable ? <Box className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                            {updateAvailable ? 'Instalar Nova Versão' : 'Verificar Atualização'}
                        </button>
                      </div>
                  </div>
                  
                  <button onClick={onShowChangelog} className="w-full bg-white dark:bg-[#0f172a] p-5 rounded-[2.2rem] border border-transparent flex items-center justify-between active:scale-[0.98] transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-all"><History className="w-6 h-6" strokeWidth={2} /></div>
                            <div className="text-left">
                                <span className="block text-sm font-black text-slate-900 dark:text-white tracking-tight">O que há de novo?</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notas de Versão</span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                   </button>
              </div>
          )}
        </div>
      )}
    </div>
  );
};
