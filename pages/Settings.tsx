
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Shield, Bell, RefreshCw, Upload, Trash2, ChevronRight, Check, Loader2, Search, Calculator, Palette, ChevronDown, ChevronUp, Download, History, Activity, Sparkles, Smartphone, FileSpreadsheet, Database, CloudCog, Zap, LayoutGrid, Power } from 'lucide-react';
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

// --- COMPONENTES UI MODERNOS ---

const ControlCard = ({ icon: Icon, label, value, active, onClick, colorClass, loading }: any) => (
    <button 
        onClick={onClick}
        disabled={loading}
        className={`relative overflow-hidden p-4 rounded-[1.5rem] border transition-all duration-300 flex flex-col items-start justify-between min-h-[110px] w-full group active:scale-[0.98] ${
            active 
            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xl shadow-zinc-900/10 dark:shadow-white/5' 
            : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
    >
        <div className="flex justify-between w-full items-start">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-white/20 dark:bg-zinc-900/10' : 'bg-zinc-50 dark:bg-zinc-800 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700'}`}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className={`w-4 h-4 ${active ? 'text-white dark:text-zinc-900' : colorClass || 'text-zinc-400'}`} />}
            </div>
            {active && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>}
        </div>
        
        <div className="text-left w-full mt-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-0.5 ${active ? 'opacity-80' : 'text-zinc-400'}`}>{label}</span>
            <span className="text-sm font-black leading-tight tracking-tight">{value}</span>
        </div>
    </button>
);

const SettingsRow = ({ icon: Icon, label, description, onClick, rightElement, isDanger, className }: any) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between p-4 transition-colors ${onClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : ''} ${className}`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isDanger ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
                <span className={`text-sm font-bold block ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
                {description && <span className="text-[11px] text-zinc-400 font-medium leading-tight">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {rightElement}
            {onClick && !rightElement && <ChevronRight className="w-4 h-4 text-zinc-300" />}
        </div>
    </div>
);

// --- WIDGET CALCULADORA (REDESENHADA) ---
const CalculatorWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [ticker, setTicker] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<number | null>(null);
    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('6');
    const [searchError, setSearchError] = useState('');
    const [assetPrice, setAssetPrice] = useState(0);

    const handleSearch = async () => {
        if (ticker.length < 4) return;
        setIsLoading(true);
        setSearchError('');
        setResult(null);
        try {
            const res = await triggerScraperUpdate([ticker], true);
            const data = res[0];
            if (data && data.status === 'success') {
                const price = data.details?.price || 0;
                setAssetPrice(price);
                let divTotal = 0;
                if (data.dividendsFound && data.dividendsFound.length > 0) {
                    const now = new Date();
                    const yearAgo = new Date();
                    yearAgo.setFullYear(now.getFullYear() - 1);
                    data.dividendsFound.forEach((d: any) => {
                        const date = new Date(d.paymentDate || d.dateCom);
                        if (date >= yearAgo) divTotal += Number(d.rate);
                    });
                }
                if (divTotal === 0 && data.details?.dy && price) {
                    divTotal = (data.details.dy / 100) * price;
                }
                if (divTotal > 0) setDividend(divTotal.toFixed(2).replace('.', ','));
                else setSearchError('Sem histórico.');
            } else setSearchError('Não encontrado.');
        } catch (e) { setSearchError('Erro rede.'); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        const divVal = parseFloat(dividend.replace(',', '.')) || 0;
        const yieldVal = parseFloat(yieldTarget) || 0;
        if (divVal > 0 && yieldVal > 0) setResult((divVal / yieldVal) * 100);
        else setResult(null);
    }, [dividend, yieldTarget]);

    return (
        <div className={`bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-500 ease-out-mola ${isOpen ? 'ring-2 ring-indigo-500/20' : ''}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-5 flex items-center justify-between bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${isOpen ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                        <Calculator className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Preço Teto</h3>
                        <p className="text-xs text-zinc-500 font-medium">Método Bazin</p>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                </div>
            </button>

            {isOpen && (
                <div className="p-5 pt-0 anim-slide-up">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-2xl flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-bold uppercase outline-none focus:border-amber-500 transition-all text-center"
                            placeholder="TICKER"
                            value={ticker}
                            onChange={e => setTicker(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} disabled={isLoading} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-12 rounded-xl flex items-center justify-center disabled:opacity-50 press-effect">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex gap-3 mb-4">
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Dividendos (R$)</label>
                            <input type="text" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-amber-500 text-center" value={dividend} onChange={e => setDividend(e.target.value)} placeholder="0,00" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase ml-1 mb-1 block">Yield (%)</label>
                            <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-amber-500 text-center" value={yieldTarget} onChange={e => setYieldTarget(e.target.value)} placeholder="6" />
                        </div>
                    </div>

                    {result !== null && (
                        <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-lg shadow-amber-500/30 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 relative z-10">Preço Teto Sugerido</p>
                            <p className="text-2xl font-black relative z-10">{formatCurrency(result)}</p>
                            {assetPrice > 0 && (
                                <div className="mt-2 inline-flex bg-black/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide relative z-10">
                                    Atual: {formatCurrency(assetPrice)} • {assetPrice <= result ? '✅ Compra' : '❌ Aguarde'}
                                </div>
                            )}
                        </div>
                    )}
                    {searchError && <p className="text-center text-xs font-bold text-rose-500">{searchError}</p>}
                </div>
            )}
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
  privacyMode: boolean;
  onSetPrivacyMode: (v: boolean) => void;
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
    theme, onSetTheme, accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode, appVersion,
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
            alert(`Importado: ${txs.length} transações, ${divs.length} proventos.`);
        } catch (err) {
            alert('Erro ao processar arquivo.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleManualSync = async () => {
        setSyncState('syncing');
        await onSyncAll(true);
        setTimeout(() => setSyncState('idle'), 1000);
    };

    // Derived theme label
    const themeLabel = theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Auto';
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';

    return (
        <div className="pb-32 px-4 pt-2 anim-fade-in max-w-xl mx-auto">
            
            {/* 1. HEADER HERO (Imersivo) */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 text-white shadow-2xl mb-8 p-8 border border-zinc-800">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex items-center justify-center shadow-lg">
                            <User className="w-7 h-7 text-zinc-400" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                            <p className="text-xs font-medium text-zinc-400">{user?.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wide backdrop-blur-md">
                                    Pro Member
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                        <LogOut className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* 2. CONTROL CENTER (Grid de Ações Rápidas) */}
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest px-4 mb-4">Central de Controle</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
                {/* Theme Toggle */}
                <ControlCard 
                    icon={theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor}
                    label="Tema"
                    value={themeLabel}
                    active={theme === 'dark'}
                    colorClass="text-indigo-500"
                    onClick={() => onSetTheme(nextTheme as ThemeType)}
                />
                
                {/* Privacy Toggle */}
                <ControlCard 
                    icon={privacyMode ? Shield : Check}
                    label="Privacidade"
                    value={privacyMode ? 'Oculto' : 'Visível'}
                    active={privacyMode}
                    colorClass="text-emerald-500"
                    onClick={() => onSetPrivacyMode(!privacyMode)}
                />

                {/* Notifications Toggle */}
                <ControlCard 
                    icon={Bell}
                    label="Notificações"
                    value={pushEnabled ? 'Ativas' : 'Off'}
                    active={pushEnabled}
                    colorClass="text-rose-500"
                    onClick={onRequestPushPermission}
                />

                {/* Sync Button */}
                <ControlCard 
                    icon={CloudCog}
                    label="Sincronização"
                    value={syncState === 'syncing' ? '...' : 'Nuvem'}
                    active={syncState === 'syncing'}
                    loading={syncState === 'syncing'}
                    colorClass="text-sky-500"
                    onClick={handleManualSync}
                />
            </div>

            {/* 3. WIDGETS & FERRAMENTAS */}
            <div className="mb-8">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest px-4 mb-4">Ferramentas</h3>
                <div className="space-y-4">
                    <CalculatorWidget />
                    
                    {/* Color Picker Horizontal */}
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-3 shrink-0 mr-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Palette className="w-5 h-5 text-zinc-500" />
                            </div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Cor Destaque</span>
                        </div>
                        <div className="flex gap-2">
                            {ACCENT_COLORS.map(c => (
                                <button
                                    key={c.hex}
                                    onClick={() => onSetAccentColor(c.hex)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all shrink-0 ${accentColor === c.hex ? 'border-zinc-900 dark:border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. DADOS E SISTEMA (Lista Clean) */}
            <div className="mb-8">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest px-4 mb-4">Sistema</h3>
                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
                    <SettingsRow 
                        icon={FileSpreadsheet} 
                        label="Importar Planilha B3" 
                        description="Carregar dados do portal do investidor"
                        onClick={() => fileInputRef.current?.click()}
                    />
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />

                    <SettingsRow 
                        icon={Activity} 
                        label="Status dos Serviços" 
                        description="Supabase, Brapi, CDN"
                        rightElement={
                            <div className="flex gap-1">
                                {services.map(s => (
                                    <div key={s.id} className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                ))}
                            </div>
                        }
                        onClick={onCheckConnection}
                    />

                    <SettingsRow 
                        icon={Download} 
                        label="Atualizações" 
                        description={`Versão ${appVersion}`}
                        onClick={onForceUpdate}
                        rightElement={updateAvailable && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>}
                    />

                    <SettingsRow 
                        icon={Sparkles} 
                        label="Novidades" 
                        description="Changelog e notas de versão"
                        onClick={onShowChangelog}
                    />
                </div>
            </div>

            {/* 5. ZONA DE PERIGO (Botão Isolado) */}
            <div className="flex flex-col gap-4 items-center mb-10">
                <button 
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors w-full justify-center"
                >
                    <Trash2 className="w-4 h-4" /> Resetar Dados Locais
                </button>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest opacity-50">
                    InvestFIIs Cloud • Build {currentVersionDate || 'Latest'}
                </p>
            </div>

            <ConfirmationModal 
                isOpen={confirmReset} 
                title="Resetar App?" 
                message="Isso limpará o cache local e fará logout. Dados na nuvem estão seguros." 
                onConfirm={() => { setConfirmReset(false); onResetApp(); }} 
                onCancel={() => setConfirmReset(false)} 
            />
        </div>
    );
};
