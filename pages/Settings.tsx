
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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Calculadora Preço Teto</h3>
                        <p className="text-[10px] text-zinc-500 font-medium">Método Bazin</p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 anim-slide-up">
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                value={ticker} 
                                onChange={e => setTicker(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && handleFetchTicker()}
                                placeholder="Buscar Ativo (ex: MXRF11)" 
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-3 pr-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 transition-all uppercase placeholder:text-zinc-400" 
                            />
                        </div>
                        <button 
                            onClick={handleFetchTicker}
                            disabled={isLoadingTicker || ticker.length < 3}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoadingTicker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                    </div>

                    {searchError && <p className="text-[10px] text-rose-500 font-bold mb-3 px-1">{searchError}</p>}

                    {assetData && (
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-2.5 rounded-xl mb-4 text-[10px] border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <span className="text-zinc-600 dark:text-zinc-400">Preço: <strong className="text-zinc-900 dark:text-white">{formatCurrency(assetData.price)}</strong></span>
                            <span className="text-zinc-600 dark:text-zinc-400">DY: <strong className="text-zinc-900 dark:text-white">{assetData.dy.toFixed(2)}%</strong></span>
                            <span className="text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{assetData.method}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 ml-1">Div. Anual (R$)</label>
                            <input 
                                type="text"
                                inputMode="decimal"
                                value={dividend} 
                                onChange={e => setDividend(e.target.value.replace(/[^0-9,.]/g, ''))} 
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all" 
                                placeholder="0,00" 
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 ml-1">Yield Alvo (%)</label>
                            <input 
                                type="number" 
                                value={yieldTarget} 
                                onChange={e => setYieldTarget(e.target.value)} 
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all" 
                                placeholder="6" 
                            />
                        </div>
                    </div>

                    {result !== null && result > 0 && (
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-center text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mr-10 -mt-10"></div>
                            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-0.5 relative z-10">Preço Teto</p>
                            <p className="text-2xl font-black relative z-10">{formatCurrency(result)}</p>
                            {assetData && (
                                <div className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider relative z-10 ${assetData.price <= result ? 'bg-emerald-400/20 text-emerald-50' : 'bg-rose-400/20 text-rose-50'}`}>
                                    {assetData.price <= result ? 'Compra (Abaixo)' : 'Aguardar (Acima)'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Componente: Grupo de Configurações
const SettingGroup = ({ title, children }: any) => (
    <div className="mb-6 anim-fade-in">
        {title && <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-4">{title}</h3>}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
            {children}
        </div>
    </div>
);

// Componente: Item de Configuração
const SettingItem = ({ icon: Icon, label, value, onClick, color = "text-zinc-500", rightElement, danger = false, description }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 transition-colors group ${danger ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
    >
        <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${danger ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-white dark:group-hover:bg-zinc-700 border border-zinc-100 dark:border-zinc-700/50'}`}>
                <Icon className={`w-5 h-5 ${danger ? 'text-rose-500' : color}`} />
            </div>
            <div className="text-left">
                <span className={`text-sm font-bold block ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
                {description && <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {value && <span className="text-xs text-zinc-400 font-medium">{value}</span>}
            {rightElement}
            {!rightElement && <ChevronRight className="w-4 h-4 text-zinc-300" />}
        </div>
    </button>
);

// Componente: Switch (Toggle)
const Switch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'left-[calc(100%-1.25rem)]' : 'left-[4px]'}`}></div>
    </button>
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
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-inner">
                            <User className="w-7 h-7" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{user?.email?.split('@')[0] || 'Usuário'}</h2>
                            <p className="text-xs text-zinc-500 font-medium">{user?.email || 'Sem e-mail'}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
                                    <Check className="w-3 h-3" /> Pro
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Aparência */}
            <SettingGroup title="Aparência">
                {/* Theme Selector */}
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-100 dark:border-zinc-700/50">
                            {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Tema</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                            <button 
                                key={t}
                                onClick={() => onSetTheme(t)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${theme === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Accent Color */}
                <div className="p-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-100 dark:border-zinc-700/50">
                            <Palette className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Destaque</span>
                    </div>
                    <div className="flex gap-2">
                        {ACCENT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => onSetAccentColor(c.hex)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-400 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                                aria-label={c.name}
                            />
                        ))}
                    </div>
                </div>
            </SettingGroup>

            {/* Preferências */}
            <SettingGroup title="Preferências">
                <SettingItem 
                    icon={Shield} 
                    label="Modo Privacidade" 
                    description="Oculta valores monetários na interface"
                    rightElement={<Switch checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />}
                />
                <SettingItem 
                    icon={Bell} 
                    label="Notificações"
                    description="Alertas de proventos e datas com"
                    rightElement={<Switch checked={pushEnabled} onChange={onRequestPushPermission} />}
                />
            </SettingGroup>

            {/* Ferramentas */}
            <div className="mb-6">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-4">Ferramentas</h3>
                <CeilingPriceCalc />
            </div>

            {/* Dados */}
            <SettingGroup title="Gerenciamento de Dados">
                <SettingItem 
                    icon={Upload} 
                    label="Importar Excel (B3)" 
                    description="Carregar movimentações via planilha"
                    onClick={() => fileInputRef.current?.click()} 
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                
                <SettingItem 
                    icon={RefreshCw} 
                    label="Sincronizar Nuvem" 
                    description="Forçar atualização dos dados"
                    onClick={() => onSyncAll(true)} 
                />
                
                <SettingItem 
                    icon={Trash2} 
                    label="Resetar Aplicativo" 
                    description="Limpar cache local e sair"
                    danger
                    onClick={() => setConfirmReset(true)}
                />
            </SettingGroup>

            {/* Status do Sistema */}
            <SettingGroup title="Diagnóstico">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Serviços Conectados</span>
                        <button onClick={onCheckConnection} disabled={isCheckingConnection} className="text-zinc-400 hover:text-indigo-500 transition-colors p-1">
                            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {services.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : s.status === 'checking' ? 'bg-zinc-300 animate-pulse' : 'bg-rose-500'}`}></div>
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{s.label}</span>
                            </div>
                            <span className={`text-[10px] font-mono font-medium ${s.latency && s.latency < 200 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                {s.latency ? `${s.latency}ms` : s.status === 'checking' ? '...' : '-'}
                            </span>
                        </div>
                    ))}
                </div>
            </SettingGroup>

            {/* Footer */}
            <div className="text-center py-8">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">InvestFIIs Cloud v{appVersion}</p>
                
                <div className="flex justify-center gap-3">
                    <button onClick={onShowChangelog} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        O que há de novo?
                    </button>
                    <button onClick={onForceUpdate} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Buscar Atualização
                    </button>
                </div>

                {updateAvailable && (
                    <div 
                        onClick={onForceUpdate}
                        className="mt-6 mx-auto inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-500/30 anim-bounce-in cursor-pointer hover:bg-indigo-600 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> 
                        Nova versão disponível
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
