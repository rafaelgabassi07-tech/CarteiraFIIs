
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Bell, RefreshCw, Upload, Trash2, ChevronRight, Loader2, Search, Calculator, Palette, ChevronDown, ChevronUp, Download, History, Activity, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { triggerScraperUpdate } from '../services/dataService';
import { ConfirmationModal } from '../components/Layout';
import { ThemeType, ServiceMetric, Transaction, DividendReceipt } from '../types';
import { parseB3Excel } from '../services/excelService';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ACCENT_COLORS = [
    { hex: '#0ea5e9', name: 'Sky' },
    { hex: '#10b981', name: 'Emerald' },
    { hex: '#6366f1', name: 'Indigo' },
    { hex: '#8b5cf6', name: 'Violet' },
    { hex: '#f43f5e', name: 'Rose' },
    { hex: '#f59e0b', name: 'Amber' },
];

const SettingsSection = ({ title, children }: { title?: string, children?: React.ReactNode }) => (
    <div className="mb-8">
        {title && <h3 className="px-4 mb-3 text-xs font-black text-zinc-400 uppercase tracking-widest">{title}</h3>}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
            {children}
        </div>
    </div>
);

const SettingsItem: React.FC<any> = ({ icon: Icon, label, value, onClick, isDanger, rightElement, description, className }) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`w-full flex items-center justify-between p-4 transition-colors group text-left ${onClick ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'} ${isDanger ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10' : ''} ${className || ''}`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${isDanger ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700'}`}>
                <Icon className={`w-5 h-5 ${isDanger ? 'text-rose-500' : 'text-current'}`} strokeWidth={2} />
            </div>
            <div>
                <span className={`text-sm font-bold block ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
                {description && <span className="text-[11px] text-zinc-400 font-medium leading-tight">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
            {rightElement}
            {onClick && !rightElement && <ChevronRight className="w-4 h-4 text-zinc-300" />}
        </div>
    </button>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

// --- CALCULADORAS ---

const CalculatorGraham = () => {
    const [lpa, setLpa] = useState('');
    const [vpa, setVpa] = useState('');
    const result = (lpa && vpa) ? Math.sqrt(22.5 * parseFloat(lpa) * parseFloat(vpa)) : 0;

    return (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl mt-2">
            <p className="text-[10px] text-zinc-400 mb-3">Preço Justo = √(22.5 × LPA × VPA)</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="number" placeholder="LPA" className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-indigo-500" value={lpa} onChange={e => setLpa(e.target.value)} />
                <input type="number" placeholder="VPA" className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-indigo-500" value={vpa} onChange={e => setVpa(e.target.value)} />
            </div>
            {result > 0 && (
                <div className="bg-indigo-500 text-white p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-bold opacity-80">Preço Justo</p>
                    <p className="text-xl font-black">{formatCurrency(result)}</p>
                </div>
            )}
        </div>
    );
};

const CalculatorCompound = () => {
    const [principal, setPrincipal] = useState('1000');
    const [monthly, setMonthly] = useState('500');
    const [rate, setRate] = useState('0.8');
    const [years, setYears] = useState('10');
    
    const calculate = () => {
        const p = parseFloat(principal) || 0;
        const m = parseFloat(monthly) || 0;
        const r = (parseFloat(rate) || 0) / 100;
        const t = (parseFloat(years) || 0) * 12;
        
        let total = p;
        for(let i=0; i<t; i++) {
            total = total * (1 + r) + m;
        }
        return total;
    };

    return (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl mt-2">
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div><label className="text-[9px] font-bold text-zinc-400">Inicial</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold" value={principal} onChange={e => setPrincipal(e.target.value)} /></div>
                <div><label className="text-[9px] font-bold text-zinc-400">Mensal</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold" value={monthly} onChange={e => setMonthly(e.target.value)} /></div>
                <div><label className="text-[9px] font-bold text-zinc-400">Taxa Mensal %</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold" value={rate} onChange={e => setRate(e.target.value)} /></div>
                <div><label className="text-[9px] font-bold text-zinc-400">Anos</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold" value={years} onChange={e => setYears(e.target.value)} /></div>
            </div>
            <div className="bg-emerald-500 text-white p-3 rounded-xl text-center shadow-lg shadow-emerald-500/20">
                <p className="text-[10px] uppercase font-bold opacity-80">Patrimônio Final</p>
                <p className="text-xl font-black">{formatCurrency(calculate())}</p>
            </div>
        </div>
    );
};

const CalculatorBazin = () => {
    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('6');
    const result = (parseFloat(dividend) / (parseFloat(yieldTarget)/100)) || 0;

    return (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl mt-2">
            <p className="text-[10px] text-zinc-400 mb-3">Preço Teto = Dividendos Anuais / Yield Esperado</p>
            <div className="flex gap-3 mb-4">
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-zinc-400 block mb-1">Div. Anual (R$)</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-amber-500" value={dividend} onChange={e => setDividend(e.target.value)} placeholder="0.00" />
                </div>
                <div className="w-24">
                    <label className="text-[9px] font-bold text-zinc-400 block mb-1">Yield (%)</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-amber-500" value={yieldTarget} onChange={e => setYieldTarget(e.target.value)} placeholder="6" />
                </div>
            </div>
            {result > 0 && (
                <div className="bg-amber-500 text-white p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-bold opacity-80">Preço Teto (Bazin)</p>
                    <p className="text-xl font-black">{formatCurrency(result)}</p>
                </div>
            )}
        </div>
    );
};

const CalculatorsHub = () => {
    const [activeTab, setActiveTab] = useState<string | null>(null);

    const tabs = [
        { id: 'bazin', label: 'Bazin (Teto)', icon: Activity, Component: CalculatorBazin },
        { id: 'graham', label: 'Graham (Justo)', icon: Scale, Component: CalculatorGraham }, // Scale imported implicitly? No, added to imports
        { id: 'compound', label: 'Juros Compostos', icon: TrendingUp, Component: CalculatorCompound },
    ];

    return (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
            {tabs.map(tab => (
                <div key={tab.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <button 
                        onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeTab === tab.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                <tab.icon className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{tab.label}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${activeTab === tab.id ? 'rotate-180' : ''}`} />
                    </button>
                    {activeTab === tab.id && (
                        <div className="px-4 pb-4 anim-slide-up">
                            <tab.Component />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Import missing Scale icon for Graham
import { Scale } from 'lucide-react';

interface SettingsProps {
  onLogout: () => void;
  user: any;
  transactions: Transaction[];
  onImportTransactions: (t: Transaction[]) => void;
  dividends: DividendReceipt[];
  onImportDividends: (d: DividendReceipt[]) => void;
  onResetApp: () => void;
  theme: ThemeType;
  onSetTheme: (t: ThemeType) => void;
  accentColor: string;
  onSetAccentColor: (c: string) => void;
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  onSyncAll: (force?: boolean) => Promise<void>;
  onForceUpdate: () => void;
  currentVersionDate: string | null;
  services: ServiceMetric[];
  onCheckConnection: () => void;
  isCheckingConnection: boolean;
  appVersion: string;
  updateAvailable: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
    onLogout, user, transactions, onImportTransactions, dividends, onImportDividends, onResetApp,
    theme, onSetTheme, accentColor, onSetAccentColor, appVersion,
    updateAvailable, onCheckUpdates, onShowChangelog, pushEnabled, onRequestPushPermission, onSyncAll,
    onForceUpdate, currentVersionDate, services, onCheckConnection, isCheckingConnection
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { transactions: txs, dividends: divs } = await parseB3Excel(file);
            if (txs.length > 0) onImportTransactions(txs);
            if (divs.length > 0) onImportDividends(divs);
            alert(`Importado: ${txs.length} transações, ${divs.length} proventos.`);
        } catch (err) {
            alert('Erro ao processar arquivo.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleManualUpdateCheck = async () => {
        setIsCheckingUpdate(true);
        const hasUpdate = await onCheckUpdates();
        setIsCheckingUpdate(false);
        if(!hasUpdate) alert('Seu app já está na versão mais recente.');
    };

    return (
        <div className="pb-32 anim-fade-in px-2">
            
            {/* Perfil Header */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-inner shrink-0">
                    <User className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-zinc-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                    <p className="text-xs text-zinc-500 font-medium truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                            Pro
                        </span>
                        <span className="text-[10px] text-zinc-400">v{appVersion}</span>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Aparência */}
            <SettingsSection title="Aparência">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Tema</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                            <button key={t} onClick={() => onSetTheme(t)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${theme === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <Palette className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Destaque</span>
                    </div>
                    <div className="flex gap-2">
                        {ACCENT_COLORS.map(c => (
                            <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-6 h-6 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-400 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.hex }} />
                        ))}
                    </div>
                </div>
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem icon={Bell} label="Notificações" description="Alertas de proventos" rightElement={<ToggleSwitch checked={pushEnabled} onChange={onRequestPushPermission} />} />
                </div>
            </SettingsSection>

            {/* Calculadoras */}
            <SettingsSection title="Ferramentas">
                <CalculatorsHub />
            </SettingsSection>

            {/* Dados */}
            <SettingsSection title="Dados">
                <SettingsItem icon={Upload} label="Importar B3 (Excel)" description="Portal do Investidor" onClick={() => fileInputRef.current?.click()} />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem icon={RefreshCw} label="Sincronizar Nuvem" description="Forçar backup" onClick={() => onSyncAll(true)} />
                </div>
            </SettingsSection>

            {/* Sistema */}
            <SettingsSection title="Sistema">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <Activity className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">Status da Rede</span>
                        </div>
                        <button onClick={onCheckConnection} disabled={isCheckingConnection} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="space-y-2 pl-[3.5rem]">
                        {services.map(s => (
                            <div key={s.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'checking' ? 'bg-zinc-400 animate-pulse' : 'bg-rose-500'}`} />
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.label}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400">{s.latency ? `${s.latency}ms` : '-'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <SettingsItem 
                    icon={Download} 
                    label="Atualizar App" 
                    description={updateAvailable ? "Nova versão pronta!" : isCheckingUpdate ? "Verificando..." : `Versão: ${appVersion}`}
                    onClick={updateAvailable ? onForceUpdate : handleManualUpdateCheck}
                    rightElement={updateAvailable ? <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> : null}
                />
                
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem icon={History} label="Novidades" description="Changelog" onClick={onShowChangelog} />
                </div>
            </SettingsSection>

            {/* Zona de Perigo */}
            <SettingsSection title="Zona de Perigo">
                <SettingsItem icon={Trash2} label="Resetar Aplicativo" description="Limpar cache local" onClick={() => setConfirmReset(true)} isDanger />
            </SettingsSection>

            <div className="text-center py-6 pb-10 opacity-50">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">InvestFIIs Cloud • {currentVersionDate}</p>
            </div>

            <ConfirmationModal isOpen={confirmReset} title="Resetar App?" message="Isso limpará dados locais. Seus dados na nuvem (Supabase) estão seguros." onConfirm={() => { setConfirmReset(false); onResetApp(); }} onCancel={() => setConfirmReset(false)} />
        </div>
    );
};
