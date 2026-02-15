
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Shield, Bell, RefreshCw, Upload, Trash2, ChevronRight, Check, Loader2, Search, Calculator, Palette, ChevronDown, ChevronUp, Download, History, Activity, Sparkles, Smartphone, FileSpreadsheet, Database, CloudCog } from 'lucide-react';
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

// --- COMPONENTES VISUAIS ---

const SettingsSection = ({ title, children }: { title?: string, children?: React.ReactNode }) => (
    <div className="mb-6">
        {title && <h3 className="px-4 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{title}</h3>}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
            {children}
        </div>
    </div>
);

interface SettingsItemProps {
    icon: React.ElementType;
    label: string;
    iconColor?: string; // Tailwind color class e.g. "bg-blue-500"
    value?: string | React.ReactNode;
    onClick?: () => void;
    isDanger?: boolean;
    rightElement?: React.ReactNode;
    description?: string;
    className?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon: Icon, label, iconColor = "bg-zinc-500", value, onClick, isDanger, rightElement, description, className }) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`w-full flex items-center justify-between p-4 transition-colors group text-left ${onClick ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'} ${className || ''}`}
    >
        <div className="flex items-center gap-3.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-white shrink-0 ${isDanger ? 'bg-rose-500' : iconColor}`}>
                <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
                <span className={`text-sm font-semibold block ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
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
        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

// --- CALCULADORA ---
const CeilingPriceTool = () => {
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
                else setSearchError('Sem histórico de proventos.');
            } else setSearchError('Ativo não encontrado.');
        } catch (e) { setSearchError('Erro de conexão.'); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        const divVal = parseFloat(dividend.replace(',', '.')) || 0;
        const yieldVal = parseFloat(yieldTarget) || 0;
        if (divVal > 0 && yieldVal > 0) setResult((divVal / yieldVal) * 100);
        else setResult(null);
    }, [dividend, yieldTarget]);

    return (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
            <SettingsItem 
                icon={Calculator} 
                label="Calculadora Preço Teto" 
                iconColor="bg-amber-500"
                onClick={() => setIsOpen(!isOpen)}
                rightElement={isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            />
            {isOpen && (
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up">
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-bold uppercase outline-none focus:border-amber-500 transition-all"
                            placeholder="TICKER (EX: BBAS3)"
                            value={ticker}
                            onChange={e => setTicker(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} disabled={isLoading} className="bg-amber-500 text-white rounded-xl px-4 flex items-center justify-center disabled:opacity-50">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>
                    {searchError && <p className="text-xs text-rose-500 font-bold mb-3">{searchError}</p>}
                    {result !== null && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase">Preço Teto</p>
                                <p className="text-xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(result)}</p>
                            </div>
                            {assetPrice > 0 && (
                                <div className="text-right">
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${assetPrice <= result ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                                        {assetPrice <= result ? 'Compra' : 'Aguardar'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- TELA PRINCIPAL ---

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

    return (
        <div className="pb-32 anim-fade-in px-2">
            
            {/* 1. PERFIL (Card Destacado) */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white border-4 border-white dark:border-zinc-800 shadow-md shrink-0">
                    <User className="w-7 h-7" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-zinc-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                    <p className="text-xs text-zinc-500 font-medium truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-wide border border-zinc-200 dark:border-zinc-700">
                            Conta Free
                        </span>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* 2. VISUAL */}
            <SettingsSection title="Aparência">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">Tema</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                            <button 
                                key={t}
                                onClick={() => onSetTheme(t)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${theme === t ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Palette className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">Destaque</span>
                    </div>
                    <div className="flex gap-2">
                        {ACCENT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => onSetAccentColor(c.hex)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-400 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                </div>
            </SettingsSection>

            {/* 3. PREFERÊNCIAS */}
            <SettingsSection title="Geral">
                <SettingsItem 
                    icon={Shield} 
                    label="Modo Privacidade" 
                    iconColor="bg-sky-500"
                    rightElement={<ToggleSwitch checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />}
                />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={Bell} 
                        label="Notificações" 
                        iconColor="bg-rose-500"
                        rightElement={<ToggleSwitch checked={pushEnabled} onChange={onRequestPushPermission} />}
                    />
                </div>
            </SettingsSection>

            {/* 4. FERRAMENTAS */}
            <SettingsSection title="Ferramentas">
                <CeilingPriceTool />
            </SettingsSection>

            {/* 5. DADOS */}
            <SettingsSection title="Dados">
                <SettingsItem 
                    icon={FileSpreadsheet} 
                    label="Importar B3 (Excel)" 
                    iconColor="bg-emerald-500"
                    onClick={() => fileInputRef.current?.click()} 
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={CloudCog} 
                        label="Sincronizar Nuvem" 
                        iconColor="bg-blue-500"
                        onClick={() => onSyncAll(true)} 
                    />
                </div>
            </SettingsSection>

            {/* 6. SISTEMA */}
            <SettingsSection title="Sistema">
                <SettingsItem 
                    icon={Download} 
                    label="Atualizações" 
                    iconColor="bg-indigo-500"
                    description={`Versão ${appVersion}`}
                    onClick={onForceUpdate}
                    rightElement={updateAvailable && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>}
                />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={Sparkles} 
                        label="Novidades (Changelog)" 
                        iconColor="bg-amber-500"
                        onClick={onShowChangelog}
                    />
                </div>
                
                {/* Diagnóstico Inline */}
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Status dos Serviços</span>
                        <button onClick={onCheckConnection} disabled={isCheckingConnection}>
                            <RefreshCw className={`w-3 h-3 text-zinc-400 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="space-y-2">
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
            </SettingsSection>

            {/* 7. ZONA DE PERIGO */}
            <SettingsSection>
                <SettingsItem 
                    icon={Trash2} 
                    label="Resetar Aplicativo" 
                    description="Apagar dados locais e sair"
                    onClick={() => setConfirmReset(true)}
                    isDanger
                />
            </SettingsSection>

            <div className="text-center py-6 pb-10 opacity-40">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                    InvestFIIs Cloud • {currentVersionDate || 'Latest Build'}
                </p>
            </div>

            <ConfirmationModal 
                isOpen={confirmReset} 
                title="Atenção" 
                message="Isso removerá os dados locais do dispositivo para corrigir problemas. Seus dados na nuvem (Supabase) permanecerão seguros." 
                onConfirm={() => { setConfirmReset(false); onResetApp(); }} 
                onCancel={() => setConfirmReset(false)} 
            />
        </div>
    );
};
