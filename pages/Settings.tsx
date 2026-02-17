
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Shield, Bell, RefreshCw, Upload, Trash2, ChevronRight, Check, Loader2, Search, Calculator, Palette, ChevronDown, ChevronUp, Download, History, Activity, Sparkles, Smartphone, FileSpreadsheet, Database, CloudCog, Zap, LayoutGrid, Power, Fingerprint, Globe, KeyRound } from 'lucide-react';
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

const ActionTile = ({ icon: Icon, label, value, isActive, onClick, colorClass, loading }: any) => (
    <button 
        onClick={onClick}
        disabled={loading}
        className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-[90px] w-full group active:scale-[0.96] shadow-sm ${
            isActive 
            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 ring-1 ring-offset-2 ring-offset-white dark:ring-offset-black ring-zinc-200 dark:ring-zinc-800' 
            : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
    >
        <div className="flex justify-between w-full items-start">
            <Icon className={`w-5 h-5 ${isActive ? 'text-white dark:text-zinc-900' : colorClass || 'text-zinc-400'}`} strokeWidth={2} />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin opacity-70" />}
            {isActive && !loading && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]"></div>}
        </div>
        
        <div className="text-left w-full">
            <span className={`text-[9px] font-bold uppercase tracking-widest block mb-0.5 opacity-70`}>{label}</span>
            <span className="text-xs font-black tracking-tight truncate w-full block">{value}</span>
        </div>
    </button>
);

const SettingsRow = ({ icon: Icon, label, description, onClick, rightElement, isDanger, className, compact = false }: any) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between px-5 py-4 transition-colors ${onClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : ''} ${className}`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDanger ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
                <span className={`text-sm font-bold block ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
                {!compact && description && <span className="text-[10px] text-zinc-400 font-medium leading-tight block mt-0.5">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {rightElement}
            {onClick && !rightElement && <ChevronRight className="w-4 h-4 text-zinc-300" />}
        </div>
    </div>
);

// --- WIDGET CALCULADORA REFINADO ---
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
                else setSearchError('Sem histórico recente.');
            } else setSearchError('Não encontrado.');
        } catch (e) { setSearchError('Erro de rede.'); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        const divVal = parseFloat(dividend.replace(',', '.')) || 0;
        const yieldVal = parseFloat(yieldTarget) || 0;
        if (divVal > 0 && yieldVal > 0) setResult((divVal / yieldVal) * 100);
        else setResult(null);
    }, [dividend, yieldTarget]);

    return (
        <div className={`bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300 ${isOpen ? 'ring-2 ring-indigo-500/10' : ''}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isOpen ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
                        <Calculator className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Preço Teto (Bazin)</h3>
                        <p className="text-[10px] text-zinc-400 font-medium">Calculadora de Valuation</p>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="p-5 pt-0 anim-slide-up">
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:border-indigo-500 transition-all text-center placeholder:font-medium"
                            placeholder="TICKER"
                            value={ticker}
                            onChange={e => setTicker(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} disabled={isLoading} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-12 rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>

                    {searchError && <p className="text-center text-[10px] font-bold text-rose-500 mb-3">{searchError}</p>}

                    <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-2 text-[9px] font-bold text-zinc-400 uppercase">Div. (12m)</span>
                            <input type="text" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 pt-6 pb-2 text-sm font-bold outline-none focus:border-indigo-500 text-center" value={dividend} onChange={e => setDividend(e.target.value)} placeholder="0,00" />
                        </div>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-2 text-[9px] font-bold text-zinc-400 uppercase">Yield (%)</span>
                            <input type="number" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 pt-6 pb-2 text-sm font-bold outline-none focus:border-indigo-500 text-center" value={yieldTarget} onChange={e => setYieldTarget(e.target.value)} placeholder="6" />
                        </div>
                    </div>

                    {result !== null && (
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl p-4 shadow-lg shadow-indigo-500/20 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Preço Teto</p>
                                <p className="text-2xl font-black tracking-tight">{formatCurrency(result)}</p>
                            </div>
                            {assetPrice > 0 && (
                                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border ${assetPrice <= result ? 'bg-emerald-400/20 border-emerald-400/30 text-white' : 'bg-rose-400/20 border-rose-400/30 text-white'}`}>
                                    {assetPrice <= result ? 'Oportunidade' : 'Aguardar'}
                                </div>
                            )}
                        </div>
                    )}
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
            alert(`Importado: ${txs.length} ordens, ${divs.length} proventos.`);
        } catch (err) {
            alert('Erro no arquivo. Verifique o formato.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleManualSync = async () => {
        setSyncState('syncing');
        await onSyncAll(true);
        setTimeout(() => setSyncState('idle'), 1000);
    };

    // Derived values
    const themeLabel = theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Auto';
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';

    return (
        <div className="pb-32 px-3 pt-2 anim-fade-in max-w-lg mx-auto">
            
            {/* 1. PROFILE HEADER (Premium Glass) */}
            <div className="bg-zinc-900 dark:bg-zinc-950 rounded-[2rem] p-5 flex items-center justify-between shadow-xl shadow-zinc-900/10 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-zinc-600 flex items-center justify-center text-white shadow-lg">
                        <User className="w-6 h-6 opacity-90" strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight leading-none mb-1">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wide border border-emerald-500/20">
                                Pro
                            </span>
                            <span className="text-[10px] text-zinc-500">{user?.email}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onLogout} className="relative z-10 w-10 h-10 rounded-full bg-zinc-800 hover:bg-rose-900/30 flex items-center justify-center text-zinc-400 hover:text-rose-400 transition-all border border-zinc-700/50">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            {/* 2. GRID AÇÕES RÁPIDAS */}
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-4 mb-3">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
                <ActionTile 
                    icon={theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor}
                    label="Aparência"
                    value={themeLabel}
                    isActive={theme === 'dark'}
                    colorClass="text-indigo-500"
                    onClick={() => onSetTheme(nextTheme as ThemeType)}
                />
                <ActionTile 
                    icon={privacyMode ? Shield : Fingerprint}
                    label="Privacidade"
                    value={privacyMode ? 'Oculto' : 'Visível'}
                    isActive={privacyMode}
                    colorClass="text-emerald-500"
                    onClick={() => onSetPrivacyMode(!privacyMode)}
                />
                <ActionTile 
                    icon={Bell}
                    label="Notificações"
                    value={pushEnabled ? 'Ativas' : 'Pausadas'}
                    isActive={pushEnabled}
                    colorClass="text-rose-500"
                    onClick={onRequestPushPermission}
                />
                <ActionTile 
                    icon={CloudCog}
                    label="Nuvem"
                    value={syncState === 'syncing' ? '...' : 'Sincronizar'}
                    isActive={syncState === 'syncing'}
                    loading={syncState === 'syncing'}
                    colorClass="text-sky-500"
                    onClick={handleManualSync}
                />
            </div>

            {/* 3. FERRAMENTAS & CUSTOMIZAÇÃO */}
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-4 mb-3">Ferramentas</h3>
            <div className="space-y-4 mb-8">
                <CalculatorWidget />
                
                {/* Color Picker */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Palette className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Cor Principal</span>
                    </div>
                    <div className="flex gap-2">
                        {ACCENT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => onSetAccentColor(c.hex)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-900 dark:border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. SISTEMA & DADOS */}
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-4 mb-3">Sistema</h3>
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm mb-8">
                <SettingsRow 
                    icon={FileSpreadsheet} 
                    label="Importar Planilha B3" 
                    description="XLSX do portal do investidor"
                    onClick={() => fileInputRef.current?.click()}
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />

                <SettingsRow 
                    icon={Activity} 
                    label="Status da Rede" 
                    description="Monitoramento de API"
                    rightElement={
                        <div className="flex gap-1.5">
                            {services.map(s => (
                                <div key={s.id} className={`w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'}`} />
                            ))}
                        </div>
                    }
                    onClick={onCheckConnection}
                />

                <SettingsRow 
                    icon={Download} 
                    label="Versão do App" 
                    description={`Instalada: v${appVersion}`}
                    onClick={onForceUpdate}
                    rightElement={updateAvailable && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span></span>}
                />

                <SettingsRow 
                    icon={Sparkles} 
                    label="Novidades" 
                    description="O que há de novo?"
                    compact
                    onClick={onShowChangelog}
                />
            </div>

            {/* 5. FOOTER */}
            <div className="flex flex-col items-center gap-6">
                <button 
                    onClick={() => setConfirmReset(true)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors py-3 px-6 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center gap-2"
                >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar dados locais
                </button>
                <p className="text-[10px] text-zinc-300 font-medium uppercase tracking-widest pb-6 opacity-60">
                    InvestFIIs Cloud • {currentVersionDate || 'Stable Build'}
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
