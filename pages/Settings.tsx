
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Shield, Smartphone, Bell, RefreshCw, Database, Download, Upload, FileJson, Trash2, Info, ChevronRight, Check, X, Loader2, Search, Server, Activity, Globe, Wifi, WifiOff, Calculator, Palette, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { triggerScraperUpdate } from '../services/dataService';
import { ConfirmationModal, InfoTooltip } from '../components/Layout';
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

const CeilingPriceCalc = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [ticker, setTicker] = useState('');
    const [isLoadingTicker, setIsLoadingTicker] = useState(false);
    const [assetData, setAssetData] = useState<{ price: number, dy: number, method?: string } | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('6');
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        const cleanDiv = dividend.replace(/\./g, '').replace(',', '.'); 
        const cleanYield = yieldTarget.replace(',', '.');
        
        const d = parseFloat(cleanDiv) || 0;
        const y = parseFloat(cleanYield) || 0;
        
        if (y > 0) setResult((d / y) * 100);
        else setResult(null);
    };

    useEffect(() => { calculate(); }, [dividend, yieldTarget]);

    const handleFetchTicker = async () => {
        const cleanTicker = ticker.trim().toUpperCase();
        if (!cleanTicker || cleanTicker.length < 3) return;
        
        setIsLoadingTicker(true);
        setSearchError(null);
        setAssetData(null);
        
        try {
            const results = await triggerScraperUpdate([cleanTicker], true);
            const data = results[0];
            
            if (data && data.status === 'success') {
                const price = data.details?.price || 0;
                let dyPercent = data.details?.dy || 0;
                let calculatedDiv = 0;
                let calculationMethod = 'Manual';

                let sum12m = 0;
                if (data.dividendsFound && data.dividendsFound.length > 0) {
                    const now = new Date();
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(now.getFullYear() - 1);
                    
                    data.dividendsFound.forEach((d: any) => {
                        const dateStr = d.paymentDate || d.payment_date || d.dateCom || d.date_com;
                        if (!dateStr) return;
                        const dDate = new Date(dateStr);
                        if (dDate >= oneYearAgo && dDate <= now) {
                            const val = typeof d.rate === 'number' ? d.rate : parseFloat(d.rate);
                            if (!isNaN(val)) sum12m += val;
                        }
                    });
                }

                if (sum12m > 0) {
                    calculatedDiv = sum12m;
                    calculationMethod = 'Soma 12m';
                    if (price > 0 && dyPercent === 0) dyPercent = (sum12m / price) * 100;
                }
                else if (dyPercent > 0 && price > 0) {
                    calculatedDiv = price * (dyPercent / 100);
                    calculationMethod = 'DY Anual';
                }
                else if (data.rawFundamentals) {
                    const lastDiv = typeof data.rawFundamentals.ultimo_rendimento === 'number' 
                        ? data.rawFundamentals.ultimo_rendimento 
                        : parseFloat(data.rawFundamentals.ultimo_rendimento);
                    if (!isNaN(lastDiv) && lastDiv > 0) {
                        calculatedDiv = lastDiv * 12;
                        if (price > 0) dyPercent = (calculatedDiv / price) * 100;
                        calculationMethod = 'Run Rate (x12)';
                    }
                }

                if (price > 0) {
                    setAssetData({ price, dy: dyPercent, method: calculationMethod });
                    if (calculatedDiv > 0) setDividend(calculatedDiv.toFixed(2).replace('.', ','));
                    else setSearchError('Sem histórico de proventos.');
                } else {
                    setSearchError('Ativo não encontrado.');
                }
            } else {
                setSearchError('Falha ao buscar.');
            }
        } catch (e) {
            console.error(e);
            setSearchError('Erro de conexão.');
        } finally {
            setIsLoadingTicker(false);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Calculator className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Calculadora Preço Teto</h3>
                        <p className="text-[10px] text-zinc-500">Método Bazin</p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up">
                    {/* Search Bar */}
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                value={ticker} 
                                onChange={e => setTicker(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && handleFetchTicker()}
                                placeholder="Buscar Ativo (ex: MXRF11)" 
                                className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-3 pr-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all uppercase" 
                            />
                        </div>
                        <button 
                            onClick={handleFetchTicker}
                            disabled={isLoadingTicker || ticker.length < 3}
                            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl px-3 flex items-center justify-center disabled:opacity-50"
                        >
                            {isLoadingTicker ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        </button>
                    </div>

                    {searchError && <p className="text-[10px] text-rose-500 font-bold mb-3 text-center">{searchError}</p>}

                    {assetData && (
                        <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg mb-4 text-[10px] border border-zinc-100 dark:border-zinc-700">
                            <span>Preço: <strong>{formatCurrency(assetData.price)}</strong></span>
                            <span>DY: <strong>{assetData.dy.toFixed(2)}%</strong></span>
                            <span className="text-indigo-500">{assetData.method}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Div. Anual (R$)</label>
                            <input 
                                type="text"
                                inputMode="decimal"
                                value={dividend} 
                                onChange={e => setDividend(e.target.value.replace(/[^0-9,.]/g, ''))} 
                                className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500" 
                                placeholder="0,00" 
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Yield Alvo (%)</label>
                            <input 
                                type="number" 
                                value={yieldTarget} 
                                onChange={e => setYieldTarget(e.target.value)} 
                                className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500" 
                                placeholder="6" 
                            />
                        </div>
                    </div>

                    {result !== null && result > 0 && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-900/30">
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Preço Teto</p>
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-300">{formatCurrency(result)}</p>
                            {assetData && (
                                <p className={`text-[9px] font-bold mt-1 ${assetData.price <= result ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {assetData.price <= result ? 'Abaixo do Teto (Compra)' : 'Acima do Teto (Aguardar)'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Componente de Item de Configuração Genérico
const SettingItem = ({ icon: Icon, label, value, onClick, color = "text-zinc-500", rightElement, danger = false }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 transition-colors ${danger ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                <Icon className={`w-4 h-4 ${danger ? 'text-rose-500' : color}`} />
            </div>
            <span className={`text-sm font-medium ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs text-zinc-400 font-medium">{value}</span>}
            {rightElement}
            {!rightElement && <ChevronRight className="w-4 h-4 text-zinc-300" />}
        </div>
    </button>
);

const SettingGroup = ({ title, children }: any) => (
    <div className="mb-6">
        {title && <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-4">{title}</h3>}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {children}
        </div>
    </div>
);

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
            alert(`Importado com sucesso: ${txs.length} transações e ${divs.length} proventos.`);
        } catch (err) {
            alert('Erro ao importar arquivo. Verifique o formato.');
            console.error(err);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="pb-32 anim-fade-in">
            
            {/* Header Profile */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            <User className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{user?.email?.split('@')[0] || 'Usuário'}</h2>
                            <p className="text-xs text-zinc-500 font-medium">{user?.email || 'Sem e-mail'}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
                                    <Check className="w-3 h-3" /> Pro
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/30">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Aparência */}
            <SettingGroup title="Personalização">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">Tema</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                            <button 
                                key={t}
                                onClick={() => onSetTheme(t)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${theme === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}
                            >
                                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Seletor de Cor de Destaque Restaurado */}
                <div className="p-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <Palette className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">Destaque</span>
                    </div>
                    <div className="flex gap-2">
                        {ACCENT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => onSetAccentColor(c.hex)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-400 scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                                aria-label={c.name}
                            />
                        ))}
                    </div>
                </div>
            </SettingGroup>

            {/* Preferências */}
            <SettingGroup title="Geral">
                <SettingItem 
                    icon={Shield} 
                    label="Modo Privacidade" 
                    rightElement={
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSetPrivacyMode(!privacyMode); }}
                            className={`w-10 h-6 rounded-full transition-colors relative ${privacyMode ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${privacyMode ? 'left-[calc(100%-1.25rem)]' : 'left-[4px]'}`}></div>
                        </button>
                    }
                />
                <SettingItem 
                    icon={Bell} 
                    label="Notificações"
                    value={pushEnabled ? 'Ativado' : 'Desativado'}
                    onClick={onRequestPushPermission}
                />
            </SettingGroup>

            {/* Ferramentas */}
            <div className="mb-6">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-4">Ferramentas</h3>
                <CeilingPriceCalc />
            </div>

            {/* Dados */}
            <SettingGroup title="Dados">
                <SettingItem 
                    icon={Upload} 
                    label="Importar Excel (B3)" 
                    onClick={() => fileInputRef.current?.click()} 
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                
                <SettingItem 
                    icon={RefreshCw} 
                    label="Sincronizar Nuvem" 
                    onClick={() => onSyncAll(true)} 
                />
                
                <SettingItem 
                    icon={Trash2} 
                    label="Resetar Aplicativo" 
                    danger
                    onClick={() => setConfirmReset(true)}
                />
            </SettingGroup>

            {/* Status do Sistema */}
            <SettingGroup title="Sistema">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500">Status dos Serviços</span>
                        <button onClick={onCheckConnection} disabled={isCheckingConnection} className="text-zinc-400 hover:text-indigo-500 transition-colors">
                            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {services.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'checking' ? 'bg-zinc-300 animate-pulse' : 'bg-rose-500'}`}></div>
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{s.label}</span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">{s.latency ? `${s.latency}ms` : s.status === 'checking' ? '...' : '-'}</span>
                        </div>
                    ))}
                </div>
            </SettingGroup>

            {/* About Footer */}
            <div className="text-center py-6">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">InvestFIIs Cloud v{appVersion}</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                    <button onClick={onShowChangelog} className="text-[10px] font-medium text-indigo-500 hover:underline">O que há de novo?</button>
                    <span className="text-zinc-300">•</span>
                    <button onClick={onForceUpdate} className="text-[10px] font-medium text-indigo-500 hover:underline">Buscar Atualização</button>
                </div>
                {updateAvailable && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-500/30 anim-bounce-in cursor-pointer" onClick={onForceUpdate}>
                        <Download className="w-3 h-3" /> Nova versão disponível
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={confirmReset} 
                title="Resetar tudo?" 
                message="Isso apagará todos os dados locais e fará logout. Dados na nuvem não serão perdidos." 
                onConfirm={() => { setConfirmReset(false); onResetApp(); }} 
                onCancel={() => setConfirmReset(false)} 
            />
        </div>
    );
};
