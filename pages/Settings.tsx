
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Shield, Smartphone, Bell, RefreshCw, Database, Download, Upload, FileJson, Trash2, Info, ChevronRight, Check, X, Loader2, Search, Server, Activity, Globe, Wifi, WifiOff, Calculator } from 'lucide-react';
import { triggerScraperUpdate } from '../services/dataService';
import { ConfirmationModal, InfoTooltip } from '../components/Layout';
import { ThemeType, ServiceMetric, Transaction, DividendReceipt } from '../types';
import { parseB3Excel } from '../services/excelService';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CeilingPriceCalc = () => {
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

    useEffect(() => {
        calculate();
    }, [dividend, yieldTarget]);

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
                    calculationMethod = 'Soma 12m (Scraper)';
                    if (price > 0 && dyPercent === 0) dyPercent = (sum12m / price) * 100;
                }
                else if (dyPercent > 0 && price > 0) {
                    calculatedDiv = price * (dyPercent / 100);
                    calculationMethod = 'DY Anual (Indicador)';
                }
                else if (data.rawFundamentals) {
                    const lastDiv = typeof data.rawFundamentals.ultimo_rendimento === 'number' 
                        ? data.rawFundamentals.ultimo_rendimento 
                        : parseFloat(data.rawFundamentals.ultimo_rendimento);
                        
                    if (!isNaN(lastDiv) && lastDiv > 0) {
                        calculatedDiv = lastDiv * 12;
                        if (price > 0) dyPercent = (calculatedDiv / price) * 100;
                        calculationMethod = 'Último x12 (Estimado)';
                    }
                }

                if (price > 0) {
                    setAssetData({ price, dy: dyPercent, method: calculationMethod });
                    
                    if (calculatedDiv > 0) {
                        setDividend(calculatedDiv.toFixed(2).replace('.', ','));
                    } else {
                        setSearchError('Preço encontrado, mas sem histórico de dividendos.');
                    }
                } else {
                    setSearchError('Ativo não encontrado ou sem liquidez.');
                }
            } else {
                setSearchError('Falha ao buscar dados do ativo.');
            }
        } catch (e) {
            console.error('Error fetching ticker for calc', e);
            setSearchError('Erro de conexão.');
        } finally {
            setIsLoadingTicker(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className={`p-3 rounded-2xl border transition-colors ${searchError ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'}`}>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block ml-1">Buscar Automático</label>
                <div className="relative flex gap-2">
                    <input 
                        type="text" 
                        value={ticker} 
                        onChange={e => setTicker(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && handleFetchTicker()}
                        placeholder="Ex: MXRF11" 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all uppercase placeholder:normal-case" 
                    />
                    <button 
                        onClick={handleFetchTicker}
                        disabled={isLoadingTicker || ticker.length < 3}
                        className="bg-indigo-500 text-white rounded-xl px-3 flex items-center justify-center press-effect disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingTicker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                </div>
                
                {searchError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-2 ml-1">{searchError}</p>
                )}

                {assetData && (
                    <div className="mt-3 flex flex-wrap gap-3 px-1 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                        <span className="text-[10px] text-zinc-500 font-medium">Preço: <strong className="text-zinc-900 dark:text-white">{formatCurrency(assetData.price)}</strong></span>
                        <span className="text-[10px] text-zinc-500 font-medium">DY: <strong className="text-zinc-900 dark:text-white">{assetData.dy.toFixed(2)}%</strong></span>
                        {assetData.method && <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-1.5 rounded">{assetData.method}</span>}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Div. Projetado (Anual)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                        <input 
                            type="text"
                            inputMode="decimal"
                            value={dividend} 
                            onChange={e => {
                                const val = e.target.value.replace(/[^0-9,.]/g, '');
                                setDividend(val);
                            }} 
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all" 
                            placeholder="0,00" 
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Yield Alvo (%)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={yieldTarget} 
                            onChange={e => setYieldTarget(e.target.value)} 
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500 transition-all" 
                            placeholder="6" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                    </div>
                </div>
            </div>
            
            {result !== null && result > 0 && (
                <div className="mt-4 anim-scale-in space-y-3">
                    <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl text-white text-center shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 relative z-10">Preço Teto ({yieldTarget}%)</p>
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10">
                            <p className="text-3xl font-black tracking-tight">{formatCurrency(result)}</p>
                            
                            {assetData && (
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/20 ${assetData.price <= result ? 'bg-emerald-400/20 text-emerald-50' : 'bg-rose-400/20 text-rose-50'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {assetData.price <= result ? 'Abaixo do Teto' : 'Acima do Teto'}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {assetData && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[10px] opacity-90 relative z-10">
                                <span>Margem: {((1 - (assetData.price / result)) * 100).toFixed(1)}%</span>
                                <span>Cotação: {formatCurrency(assetData.price)}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[6, 8, 10].map(y => {
                            const cleanDiv = dividend.replace(/\./g, '').replace(',', '.');
                            const val = ((parseFloat(cleanDiv) || 0) / y) * 100;
                            const isSelected = parseFloat(yieldTarget.replace(',', '.')) === y;
                            return (
                                <button 
                                    key={y} 
                                    onClick={() => setYieldTarget(String(y))} 
                                    className={`p-2 rounded-xl border text-center transition-all active:scale-95 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                >
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase">{y}% Yield</p>
                                    <p className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        {val > 0 ? formatCurrency(val) : '-'}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
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
        <div className="pb-32 anim-fade-in space-y-6">
            
            {/* Header Profile */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
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
                    <button onClick={onLogout} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tools Section (Calculadora) */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">Calculadora Preço Teto</h3>
                        <p className="text-xs text-zinc-500">Estime o preço máximo a pagar (Bazin)</p>
                    </div>
                </div>
                <CeilingPriceCalc />
            </div>

            {/* Preferences */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 ml-1">Preferências</h3>
                
                <div className="space-y-6">
                    {/* Theme */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                            </div>
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Tema</span>
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

                    {/* Privacy */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <Shield className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Modo Privacidade</span>
                        </div>
                        <button 
                            onClick={() => onSetPrivacyMode(!privacyMode)}
                            className={`w-12 h-7 rounded-full transition-colors relative ${privacyMode ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${privacyMode ? 'left-[calc(100%-1.25rem-2px)]' : 'left-[2px]'}`}></div>
                        </button>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <Bell className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Notificações</span>
                        </div>
                        <button 
                            onClick={onRequestPushPermission}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${pushEnabled ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-700'}`}
                        >
                            {pushEnabled ? 'Ativado' : 'Ativar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 ml-1">Dados</h3>
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors">
                        <Upload className="w-5 h-5 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Importar Excel (B3)</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />

                    <button onClick={() => onSyncAll(true)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors">
                        <RefreshCw className="w-5 h-5 text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Sincronizar Nuvem</span>
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button onClick={() => setConfirmReset(true)} className="w-full flex items-center justify-center gap-2 p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider">
                        <Trash2 className="w-4 h-4" /> Resetar Aplicativo
                    </button>
                </div>
            </div>

            {/* System Status */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Status do Sistema</h3>
                    <button onClick={onCheckConnection} disabled={isCheckingConnection} className="text-zinc-400 hover:text-indigo-500 transition-colors">
                        <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                <div className="space-y-3">
                    {services.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.status === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500' : s.status === 'checking' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-500'}`}>
                                    <s.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{s.label}</p>
                                    <p className="text-[10px] text-zinc-400">{s.message || (s.status === 'operational' ? 'Operacional' : 'Falha')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {s.latency !== null && <p className="text-[10px] font-mono text-zinc-400">{s.latency}ms</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* About */}
            <div className="text-center py-6">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">InvestFIIs Cloud v{appVersion}</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                    <button onClick={onShowChangelog} className="text-[10px] font-medium text-indigo-500 hover:underline">O que há de novo?</button>
                    <span className="text-zinc-300">•</span>
                    <button onClick={onForceUpdate} className="text-[10px] font-medium text-indigo-500 hover:underline">Buscar Atualização</button>
                </div>
                {updateAvailable && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-500/30 anim-bounce-in">
                        <Download className="w-4 h-4" /> Nova versão disponível
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
