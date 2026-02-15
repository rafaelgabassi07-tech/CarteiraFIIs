import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Bell, RefreshCw, Upload, Trash2, ChevronRight, Check, Loader2, Search, Calculator, Palette, ChevronDown, ChevronUp, Download, History, Activity, Sparkles, Smartphone, FileSpreadsheet, Database, CloudCog, Zap, LayoutGrid, Power, Globe, KeyRound, Scale, TrendingUp } from 'lucide-react';
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

// --- UTILS UI ---

const SettingGroup = ({ title, children }: { title?: string, children?: React.ReactNode }) => (
    <div className="mb-6">
        {title && <h4 className="px-4 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{title}</h4>}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {children}
        </div>
    </div>
);

const SettingRow = ({ icon: Icon, iconColor, label, value, onClick, isDestructive, rightElement }: any) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`w-full flex items-center justify-between p-3.5 pl-4 transition-colors ${onClick ? 'active:bg-zinc-50 dark:active:bg-zinc-800 cursor-pointer' : 'cursor-default'}`}
    >
        <div className="flex items-center gap-3.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm ${iconColor || 'bg-zinc-500'}`}>
                <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className={`text-sm font-medium ${isDestructive ? 'text-rose-600 dark:text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                {label}
            </span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-sm text-zinc-400">{value}</span>}
            {rightElement}
            {onClick && !rightElement && <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />}
        </div>
    </button>
);

const QuickActionTile = ({ icon: Icon, label, active, onClick, colorClass }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
            active 
            ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm' 
            : 'bg-zinc-50 dark:bg-zinc-900 border-transparent opacity-60 hover:opacity-100'
        }`}
    >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? colorClass : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
            <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{label}</span>
    </button>
);

// --- FERRAMENTAS ---

const CalculatorBazin = () => {
    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('6');
    const result = (parseFloat(dividend) / (parseFloat(yieldTarget)/100)) || 0;

    return (
        <div className="p-4 bg-zinc-50 dark:bg-black/20">
            <p className="text-[10px] text-zinc-400 mb-3 uppercase tracking-wider font-bold">Preço Teto = Div. Anual / Yield</p>
            <div className="flex gap-3 mb-3">
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-zinc-400 block mb-1">Div. Anual (R$)</label>
                    <input type="number" className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-amber-500 transition-colors" value={dividend} onChange={e => setDividend(e.target.value)} placeholder="0.00" />
                </div>
                <div className="w-24">
                    <label className="text-[9px] font-bold text-zinc-400 block mb-1">Yield (%)</label>
                    <input type="number" className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-amber-500 transition-colors" value={yieldTarget} onChange={e => setYieldTarget(e.target.value)} placeholder="6" />
                </div>
            </div>
            {result > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold uppercase">Preço Teto</span>
                    <span className="text-lg font-black">{formatCurrency(result)}</span>
                </div>
            )}
        </div>
    );
};

const CalculatorGraham = () => {
    const [lpa, setLpa] = useState('');
    const [vpa, setVpa] = useState('');
    const result = (lpa && vpa) ? Math.sqrt(22.5 * parseFloat(lpa) * parseFloat(vpa)) : 0;

    return (
        <div className="p-4 bg-zinc-50 dark:bg-black/20">
            <p className="text-[10px] text-zinc-400 mb-3 uppercase tracking-wider font-bold">Justo = √(22.5 × LPA × VPA)</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="number" placeholder="LPA" className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-indigo-500" value={lpa} onChange={e => setLpa(e.target.value)} />
                <input type="number" placeholder="VPA" className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-indigo-500" value={vpa} onChange={e => setVpa(e.target.value)} />
            </div>
            {result > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold uppercase">Preço Justo</span>
                    <span className="text-lg font-black">{formatCurrency(result)}</span>
                </div>
            )}
        </div>
    );
};

const CalculatorCompound = () => {
    const [monthly, setMonthly] = useState('500');
    const [rate, setRate] = useState('0.8');
    const [years, setYears] = useState('10');
    
    const calculate = () => {
        const m = parseFloat(monthly) || 0;
        const r = (parseFloat(rate) || 0) / 100;
        const t = (parseFloat(years) || 0) * 12;
        let total = 0;
        for(let i=0; i<t; i++) total = (total + m) * (1 + r);
        return total;
    };

    return (
        <div className="p-4 bg-zinc-50 dark:bg-black/20">
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div><label className="text-[8px] font-bold text-zinc-400 uppercase">Mensal</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold" value={monthly} onChange={e => setMonthly(e.target.value)} /></div>
                <div><label className="text-[8px] font-bold text-zinc-400 uppercase">Taxa %</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold" value={rate} onChange={e => setRate(e.target.value)} /></div>
                <div><label className="text-[8px] font-bold text-zinc-400 uppercase">Anos</label><input type="number" className="w-full p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold" value={years} onChange={e => setYears(e.target.value)} /></div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold uppercase">Futuro</span>
                <span className="text-lg font-black">{formatCurrency(calculate())}</span>
            </div>
        </div>
    );
};

const ToolsHub = () => {
    const [tool, setTool] = useState<'bazin' | 'graham' | 'compound' | null>(null);
    
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 mb-6">
            <div className="flex divide-x divide-zinc-100 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
                <button onClick={() => setTool(tool === 'bazin' ? null : 'bazin')} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${tool === 'bazin' ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <Activity className={`w-5 h-5 ${tool === 'bazin' ? 'text-amber-500' : 'text-zinc-400'}`} />
                    <span className={`text-[9px] font-bold uppercase ${tool === 'bazin' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`}>Bazin</span>
                </button>
                <button onClick={() => setTool(tool === 'graham' ? null : 'graham')} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${tool === 'graham' ? 'bg-indigo-50 dark:bg-indigo-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <Scale className={`w-5 h-5 ${tool === 'graham' ? 'text-indigo-500' : 'text-zinc-400'}`} />
                    <span className={`text-[9px] font-bold uppercase ${tool === 'graham' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>Graham</span>
                </button>
                <button onClick={() => setTool(tool === 'compound' ? null : 'compound')} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${tool === 'compound' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <TrendingUp className={`w-5 h-5 ${tool === 'compound' ? 'text-emerald-500' : 'text-zinc-400'}`} />
                    <span className={`text-[9px] font-bold uppercase ${tool === 'compound' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>Juros</span>
                </button>
            </div>
            {tool === 'bazin' && <CalculatorBazin />}
            {tool === 'graham' && <CalculatorGraham />}
            {tool === 'compound' && <CalculatorCompound />}
        </div>
    );
};

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
  appVersion: string;
  updateAvailable: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  onSyncAll: (force?: boolean) => Promise<void>;
  onForceUpdate: () => void;
  currentVersionDate: string | null;
  services: ServiceMetric[];
  onCheckConnection: () => void;
  isCheckingConnection: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ 
    onLogout, user, transactions, onImportTransactions, dividends, onImportDividends, onResetApp,
    theme, onSetTheme, accentColor, onSetAccentColor, appVersion,
    updateAvailable, onCheckUpdates, onShowChangelog, pushEnabled, onRequestPushPermission, onSyncAll,
    onForceUpdate, currentVersionDate, services, onCheckConnection, isCheckingConnection
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [syncState, setSyncState] = useState<'idle' | 'syncing'>('idle');

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { transactions: txs, dividends: divs } = await parseB3Excel(file);
            if (txs.length > 0) onImportTransactions(txs);
            if (divs.length > 0) onImportDividends(divs);
            alert(`Importado: ${txs.length} ordens, ${divs.length} proventos.`);
        } catch (err) {
            alert('Erro no arquivo.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleManualSync = async () => {
        setSyncState('syncing');
        await onSyncAll(true);
        setTimeout(() => setSyncState('idle'), 1000);
    };

    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    const themeLabel = theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Auto';

    return (
        <div className="pb-32 px-4 pt-4 anim-fade-in max-w-lg mx-auto">
            
            {/* HEADLINE */}
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-6 px-1">Ajustes</h1>

            {/* PROFILE CARD */}
            <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] p-5 flex items-center gap-4 shadow-sm border border-zinc-200 dark:border-zinc-800 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 border-4 border-white dark:border-zinc-900 shadow-sm shrink-0">
                    <User className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wide">Pro</span>
                        <span className="text-[10px] font-bold text-zinc-400">v{appVersion}</span>
                    </div>
                </div>
                <button onClick={onLogout} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center justify-center transition-all relative z-10">
                    <LogOut className="w-5 h-5 ml-0.5" />
                </button>
            </div>

            {/* QUICK ACTIONS GRID */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <QuickActionTile 
                    icon={theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor}
                    label={themeLabel}
                    active={theme !== 'system'}
                    colorClass="bg-indigo-500 text-white"
                    onClick={() => onSetTheme(nextTheme as ThemeType)}
                />
                <QuickActionTile 
                    icon={Bell}
                    label={pushEnabled ? "Ativo" : "Mudo"}
                    active={pushEnabled}
                    colorClass="bg-rose-500 text-white"
                    onClick={onRequestPushPermission}
                />
                <QuickActionTile 
                    icon={syncState === 'syncing' ? Loader2 : CloudCog}
                    label={syncState === 'syncing' ? "..." : "Sync"}
                    active={syncState === 'syncing'}
                    colorClass="bg-sky-500 text-white animate-spin"
                    onClick={handleManualSync}
                />
            </div>

            {/* TOOLS HUB */}
            <h4 className="px-4 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Ferramentas</h4>
            <ToolsHub />

            {/* CONFIGURAÇÕES GERAIS */}
            <SettingGroup title="Preferências">
                <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center text-white shadow-sm">
                            <Palette className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">Cor Principal</span>
                    </div>
                    <div className="flex gap-1.5">
                        {ACCENT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => onSetAccentColor(c.hex)}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                </div>
            </SettingGroup>

            <SettingGroup title="Dados & Sistema">
                <SettingRow 
                    icon={FileSpreadsheet} 
                    iconColor="bg-emerald-500" 
                    label="Importar Excel B3" 
                    onClick={() => fileInputRef.current?.click()} 
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />

                <SettingRow 
                    icon={Activity} 
                    iconColor={services.some(s => s.status === 'error') ? 'bg-rose-500' : 'bg-sky-500'}
                    label="Status da Rede"
                    value={services.every(s => s.status === 'operational') ? 'Online' : 'Atenção'}
                    onClick={onCheckConnection}
                    rightElement={isCheckingConnection && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                />

                <SettingRow 
                    icon={Download} 
                    iconColor="bg-zinc-900 dark:bg-white !text-white dark:!text-zinc-900" 
                    label="Atualização"
                    value={updateAvailable ? 'Nova Versão' : `v${appVersion}`}
                    onClick={updateAvailable ? onForceUpdate : onCheckUpdates}
                    rightElement={updateAvailable && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}
                />

                <SettingRow 
                    icon={History} 
                    iconColor="bg-amber-500" 
                    label="O que há de novo" 
                    onClick={onShowChangelog} 
                />
            </SettingGroup>

            <SettingGroup>
                <SettingRow 
                    icon={Trash2} 
                    iconColor="bg-rose-500" 
                    label="Resetar Aplicativo" 
                    isDestructive 
                    onClick={() => setConfirmReset(true)} 
                />
            </SettingGroup>

            <div className="text-center py-8">
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mb-1">InvestFIIs Cloud</p>
                <p className="text-[9px] text-zinc-400">{currentVersionDate || 'Stable Build'}</p>
            </div>

            <ConfirmationModal 
                isOpen={confirmReset} 
                title="Resetar App?" 
                message="Isso limpará o cache local e fará logout. Seus dados na nuvem permanecem seguros." 
                onConfirm={() => { setConfirmReset(false); onResetApp(); }} 
                onCancel={() => setConfirmReset(false)} 
            />
        </div>
    );
};