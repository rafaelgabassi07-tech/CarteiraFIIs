
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Palette, Database, ShieldAlert, Info, 
  LogOut, Check, Activity, Terminal, Trash2, FileSpreadsheet, FileJson, 
  Smartphone, Github, Globe, CreditCard, LayoutGrid, Zap, Download, Upload, Server, Wifi, Cloud,
  Calculator, TrendingUp, DollarSign, Calendar, Target, RotateCcw, ArrowDown, Search, Loader2, User, Crown
} from 'lucide-react';
import { Transaction, DividendReceipt, ServiceMetric, LogEntry, ThemeType } from '../types';
import { logger } from '../services/logger';
import { parseB3Excel } from '../services/excelService';
import { supabase } from '../services/supabase';
import { triggerScraperUpdate } from '../services/dataService';
import { SwipeableModal } from '../components/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface SettingsProps {
  user: any;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  dividends: DividendReceipt[];
  onImportDividends: (data: DividendReceipt[]) => void;
  onLogout: () => void;
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
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  onSyncAll: (force: boolean) => Promise<void>;
  currentVersionDate: string | null;
  onForceUpdate: () => void; 
  services: ServiceMetric[];
  onCheckConnection: () => Promise<void>;
  isCheckingConnection: boolean;
}

const ACCENT_COLORS = [
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#10b981', name: 'Emerald' },
];

const UserProfileCard: React.FC<{ email: string, txCount: number }> = ({ email, txCount }) => {
    const initials = email.substring(0, 2).toUpperCase();
    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 border border-zinc-800 shadow-xl p-6 mb-6 group transition-all">
            {/* Background Gradient & Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/10 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white font-black text-lg shadow-lg">
                        {initials}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md uppercase tracking-widest border border-emerald-400/20">Pro Member</p>
                        </div>
                        <p className="text-base font-bold text-white truncate max-w-[200px]">{email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <Crown className="w-6 h-6 text-amber-400 drop-shadow-md ml-auto mb-1" strokeWidth={1.5} fill="currentColor" fillOpacity={0.3} />
                </div>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sincronização Ativa</span>
                </div>
                <p className="text-[10px] font-medium text-zinc-500">{txCount} ordens registradas</p>
            </div>
        </div>
    );
};

const QuickAction = ({ icon: Icon, label, onClick, colorClass, delay, isActive }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border transition-all shadow-sm press-effect anim-scale-in h-28 w-full ${isActive ? 'border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500' : 'border-zinc-100 dark:border-zinc-800'}`}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass} ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 ring-offset-white dark:ring-offset-zinc-900' : ''}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{label}</span>
    </button>
);

const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-6">{title}</h3>
);

const SettingsRow = ({ icon: Icon, label, value, onClick, isDestructive = false, isLast = false, isLoading = false, subContent }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 press-effect hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDestructive ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
                <span className={`text-sm font-bold block ${isDestructive ? 'text-rose-600' : 'text-zinc-700 dark:text-zinc-200'}`}>{label}</span>
                {subContent}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {isLoading ? <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" /> : value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
            <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
    </button>
);

// --- CALCULADORAS INTERNAS ---

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CompoundInterestCalc = () => {
    const [initial, setInitial] = useState('');
    const [monthly, setMonthly] = useState('');
    const [rate, setRate] = useState('');
    const [years, setYears] = useState('');
    const [result, setResult] = useState<{ total: number, invested: number, interest: number, chartData: any[] } | null>(null);

    const calculate = () => {
        const p = parseFloat(initial) || 0;
        const pm = parseFloat(monthly) || 0;
        const annualRate = parseFloat(rate) || 0;
        const timeYears = parseFloat(years) || 0;
        
        if (timeYears <= 0) return;

        const r = annualRate / 100 / 12; // Taxa mensal
        const nTotal = timeYears * 12;

        const dataPoints = [];
        let currentTotal = p;
        let currentInvested = p;

        // Gera pontos para o gráfico (anual)
        for (let y = 0; y <= timeYears; y++) {
            if (y === 0) {
                dataPoints.push({ year: y, total: p, invested: p });
                continue;
            }
            
            // Calcula o final do ano Y
            // Simplificação: Iterar mês a mês para precisão do gráfico
            for (let m = 1; m <= 12; m++) {
                currentTotal = currentTotal * (1 + r) + pm;
                currentInvested += pm;
            }
            dataPoints.push({ 
                year: y, 
                total: Math.round(currentTotal), 
                invested: Math.round(currentInvested) 
            });
        }

        setResult({
            total: currentTotal,
            invested: currentInvested,
            interest: currentTotal - currentInvested,
            chartData: dataPoints
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Inicial (R$)</label>
                    <input type="number" value={initial} onChange={e => setInitial(e.target.value)} className="input-field" placeholder="0,00" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Aporte Mensal (R$)</label>
                    <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className="input-field" placeholder="0,00" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Taxa Anual (%)</label>
                    <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input-field" placeholder="10" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Anos</label>
                    <input type="number" value={years} onChange={e => setYears(e.target.value)} className="input-field" placeholder="10" />
                </div>
            </div>
            
            <button onClick={calculate} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest press-effect shadow-lg">
                Calcular Evolução
            </button>

            {result && (
                <div className="mt-6 anim-scale-in">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-700 mb-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Patrimônio Final</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(result.total)}</span>
                        </div>
                        <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-1 text-zinc-500">
                                <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                                Investido: {formatCurrency(result.invested)}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-500">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                Juros: {formatCurrency(result.interest)}
                            </div>
                        </div>
                    </div>

                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={result.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(val) => `R$${val/1000}k`} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                    labelFormatter={(label) => `Ano ${label}`}
                                />
                                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total" />
                                <Area type="monotone" dataKey="invested" stroke="#71717a" strokeWidth={2} fillOpacity={0.1} fill="#71717a" name="Investido" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

const CeilingPriceCalc = () => {
    const [ticker, setTicker] = useState('');
    const [isLoadingTicker, setIsLoadingTicker] = useState(false);
    const [assetData, setAssetData] = useState<{ price: number, dy: number } | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('6');
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        // Handle BR format (1.200,50) correctly
        const cleanDiv = dividend.replace(/\./g, '').replace(',', '.'); 
        const cleanYield = yieldTarget.replace(',', '.');
        
        const d = parseFloat(cleanDiv) || 0;
        const y = parseFloat(cleanYield) || 0;
        
        if (y > 0) setResult((d / y) * 100);
        else setResult(null);
    };

    // Auto-recalculate when inputs change
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

                // Estratégia Híbrida:
                // 1. Se tem DY anual, usa ele.
                if (dyPercent > 0 && price > 0) {
                    calculatedDiv = price * (dyPercent / 100);
                }
                // 2. Se não tem DY mas tem rawFundamentals (fallback scraper)
                else if (data.rawFundamentals) {
                    const lastDiv = typeof data.rawFundamentals.ultimo_rendimento === 'number' 
                        ? data.rawFundamentals.ultimo_rendimento 
                        : parseFloat(data.rawFundamentals.ultimo_rendimento);
                        
                    if (!isNaN(lastDiv) && lastDiv > 0) {
                        // Estima anualizado x12 (Simplificado para FIIs)
                        calculatedDiv = lastDiv * 12;
                        if (price > 0) dyPercent = (calculatedDiv / price) * 100;
                    }
                }

                if (price > 0) {
                    setAssetData({ price, dy: dyPercent });
                    
                    if (calculatedDiv > 0) {
                        setDividend(calculatedDiv.toFixed(2).replace('.', ','));
                    } else {
                        // Tem preço mas não achou dividendos
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
                
                {/* Feedback Area */}
                {searchError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-2 ml-1">{searchError}</p>
                )}

                {assetData && (
                    <div className="mt-3 flex gap-3 px-1 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                        <span className="text-[10px] text-zinc-500 font-medium">Preço: <strong className="text-zinc-900 dark:text-white">{formatCurrency(assetData.price)}</strong></span>
                        <span className="text-[10px] text-zinc-500 font-medium">DY (Est.): <strong className="text-zinc-900 dark:text-white">{assetData.dy.toFixed(2)}%</strong></span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Div. Projetado (Anual)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                        <input 
                            type="text" // Text to allow formatting
                            inputMode="decimal"
                            value={dividend} 
                            onChange={e => {
                                // Allow only numbers and comma/dot
                                const val = e.target.value.replace(/[^0-9,.]/g, '');
                                setDividend(val);
                            }} 
                            className="input-field pl-8" 
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
                            className="input-field" 
                            placeholder="6" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                    </div>
                </div>
            </div>
            
            {result !== null && result > 0 && (
                <div className="mt-4 anim-scale-in space-y-3">
                    <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl text-white text-center shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                        {/* Background pattern */}
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

                    {/* Matriz de Sensibilidade */}
                    <div className="grid grid-cols-3 gap-2">
                        {[6, 8, 10].map(y => {
                            // Helper para calcular rapidamente
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

const FireCalc = () => {
    const [mode, setMode] = useState<'income' | 'patrimony'>('income'); // income = Quero renda X, qual patrimonio? patrimony = Tenho patrimonio X, qual renda?
    const [inputValue, setInputValue] = useState('');
    const [yieldRate, setYieldRate] = useState('8'); 
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        const val = parseFloat(inputValue) || 0;
        const rate = parseFloat(yieldRate) || 0;
        
        if (rate <= 0) return;

        if (mode === 'income') {
            // Quero renda mensal X -> Preciso de (X * 12) / rate
            const annualIncome = val * 12;
            setResult(annualIncome / (rate / 100));
        } else {
            // Tenho patrimonio X -> Renda mensal = (X * rate) / 12
            const annualIncome = val * (rate / 100);
            setResult(annualIncome / 12);
        }
    };

    // Reset result on mode switch
    useEffect(() => { setResult(null); setInputValue(''); }, [mode]);

    return (
        <div className="space-y-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-2">
                <button 
                    onClick={() => setMode('income')}
                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'income' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}
                >
                    Meta de Renda
                </button>
                <button 
                    onClick={() => setMode('patrimony')}
                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'patrimony' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}
                >
                    Renda Possível
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                        {mode === 'income' ? 'Renda Desejada (Mensal)' : 'Patrimônio Atual'}
                    </label>
                    <input type="number" value={inputValue} onChange={e => setInputValue(e.target.value)} className="input-field" placeholder="0,00" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Yield Anual Médio (%)</label>
                    <input type="number" value={yieldRate} onChange={e => setYieldRate(e.target.value)} className="input-field" placeholder="8" />
                </div>
            </div>
            
            <button onClick={calculate} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest press-effect shadow-lg">
                Calcular
            </button>

            {result !== null && (
                <div className="mt-4 p-5 bg-sky-50 dark:bg-sky-900/10 rounded-2xl border border-sky-100 dark:border-sky-900/30 anim-scale-in text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-bold tracking-widest mb-1">
                            {mode === 'income' ? 'Patrimônio Necessário' : 'Renda Mensal Estimada'}
                        </p>
                        <p className="text-3xl font-black text-sky-700 dark:text-sky-400 break-all leading-tight">
                            {formatCurrency(result)}
                        </p>
                        {mode === 'income' && result > 0 && (
                            <p className="text-[9px] text-sky-500 mt-2 font-medium">
                                Equivalente a ~{Math.ceil(result / 10)} cotas de um FII base 10 (aprox).
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, dividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, accentColor, onSetAccentColor,
  services, onCheckConnection, isCheckingConnection
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'data' | 'about' | 'calculators'>('menu');
  const [activeCalculator, setActiveCalculator] = useState<'compound' | 'ceiling' | 'fire' | null>(null);
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const unsubscribe = logger.subscribe((l: LogEntry[]) => setLogs([...l])); 
      return unsubscribe;
  }, []);
  
  useEffect(() => {
      if (showLogs && logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [logs, showLogs]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
          const { transactions: newTxs, dividends: newDivs } = await parseB3Excel(file);
          
          if (newTxs.length === 0 && newDivs.length === 0) {
              showToast('error', 'Nenhum dado válido identificado.');
          } else {
              const existingSig = new Set(transactions.map(t => `${t.ticker}-${t.date}-${t.type}`));
              const txsToAdd = newTxs.filter(t => !existingSig.has(`${t.ticker}-${t.date}-${t.type}`));
              
              if (txsToAdd.length > 0 && user?.id) {
                  const dbPayload = txsToAdd.map(t => ({
                      ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, asset_type: t.assetType, user_id: user.id
                  }));
                  await supabase.from('transactions').insert(dbPayload);
                  onImportTransactions([...transactions, ...txsToAdd]);
              }

              if (newDivs.length > 0) {
                  onImportDividends([...dividends, ...newDivs]);
              }

              showToast('success', `Importado: ${txsToAdd.length} ordens.`);
              setActiveSection('menu');
          }
      } catch (error) {
          console.error(error);
          showToast('error', 'Erro ao ler arquivo.');
      } finally {
          setIsImporting(false);
          if (excelInputRef.current) excelInputRef.current.value = '';
      }
  };

  const handleExport = () => {
    const data = { transactions, dividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup.json`;
    a.click();
    showToast('success', 'Backup exportado!');
  };

  return (
    <div className="space-y-4">
        {activeSection !== 'menu' && (
            <div className="flex items-center gap-3 mb-2 anim-slide-in-right sticky top-0 bg-primary-light dark:bg-primary-dark z-20 py-2">
              <button onClick={() => {
                  if (activeCalculator) setActiveCalculator(null);
                  else setActiveSection('menu');
              }} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm press-effect transition-transform">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">
                  {activeSection === 'appearance' && 'Personalização'}
                  {activeSection === 'data' && 'Gerenciar Dados'}
                  {activeSection === 'about' && 'Sobre o App'}
                  {activeSection === 'calculators' && (activeCalculator ? (
                      activeCalculator === 'compound' ? 'Juros Compostos' : 
                      activeCalculator === 'ceiling' ? 'Preço Teto' : 'Indep. Financeira'
                  ) : 'Simuladores')}
                </h2>
              </div>
            </div>
        )}

        <div className="pb-10">
            {activeSection === 'menu' && (
                <div className="anim-fade-in">
                    {user && <UserProfileCard email={user.email} txCount={transactions.length} />}

                    {/* Quick Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <QuickAction 
                            icon={Palette} 
                            label="Aparência" 
                            colorClass="bg-purple-100 dark:bg-purple-900/20 text-purple-600" 
                            onClick={() => setActiveSection('appearance')}
                            delay={0}
                        />
                        <QuickAction 
                            icon={Database} 
                            label="Dados & B3" 
                            colorClass="bg-blue-100 dark:bg-blue-900/20 text-blue-600" 
                            onClick={() => setActiveSection('data')}
                            delay={50}
                        />
                        {/* Botão de Calculadoras substitui Privacidade */}
                        <QuickAction 
                            icon={Calculator} 
                            label="Calculadoras"
                            colorClass="bg-amber-100 dark:bg-amber-900/20 text-amber-600"
                            onClick={() => setActiveSection('calculators')}
                            delay={100}
                        />
                        <QuickAction 
                            icon={Bell} 
                            label={pushEnabled ? "Notificações" : "Silencioso"}
                            colorClass={pushEnabled ? "bg-sky-100 dark:bg-sky-900/20 text-sky-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}
                            onClick={onRequestPushPermission}
                            isActive={pushEnabled}
                            delay={150}
                        />
                    </div>

                    <SectionHeader title="Sistema" />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6">
                        <SettingsRow 
                            icon={Wifi} 
                            label="Conexão com Servidor" 
                            onClick={onCheckConnection} 
                            isLoading={isCheckingConnection}
                            value={isCheckingConnection ? 'Testando...' : 'Verificar'}
                            subContent={
                                <div className="flex gap-1.5 mt-1">
                                    {services.map((s, i) => (
                                        <div key={s.id} className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'error' ? 'bg-rose-500' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} title={s.label}></div>
                                    ))}
                                    <span className="text-[9px] text-zinc-400 ml-1">
                                        {services.filter(s => s.status === 'operational').length}/{services.length} Online
                                    </span>
                                </div>
                            }
                        />
                        <SettingsRow icon={Terminal} label="Logs de Diagnóstico" onClick={() => setShowLogs(true)} />
                        <SettingsRow icon={Info} label="Sobre & Versão" onClick={() => setActiveSection('about')} value={`v${appVersion}`} isLast />
                    </div>

                    <SectionHeader title="Zona de Perigo" />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <SettingsRow icon={LogOut} label="Desconectar Conta" onClick={onLogout} isDestructive />
                        <SettingsRow icon={Trash2} label="Resetar Aplicativo" onClick={onResetApp} isDestructive isLast />
                    </div>
                    
                    <p className="text-center text-[10px] text-zinc-400 font-mono mt-8">Build: {currentVersionDate || 'Dev'}</p>
                </div>
            )}

            {/* SEÇÃO DE CALCULADORAS */}
            {activeSection === 'calculators' && (
                <div className="space-y-4 anim-slide-up">
                    {!activeCalculator ? (
                        <div className="grid gap-3">
                            <button onClick={() => setActiveCalculator('compound')} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect text-left flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white">Juros Compostos</h3>
                                    <p className="text-xs text-zinc-500">Simule o crescimento do seu patrimônio com aportes mensais.</p>
                                </div>
                            </button>

                            <button onClick={() => setActiveCalculator('ceiling')} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect text-left flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white">Preço Teto</h3>
                                    <p className="text-xs text-zinc-500">Calcule o preço máximo baseado no Yield esperado (Bazin).</p>
                                </div>
                            </button>

                            <button onClick={() => setActiveCalculator('fire')} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect text-left flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white">Independência Financeira</h3>
                                    <p className="text-xs text-zinc-500">Planeje quanto você precisa acumular para viver de renda.</p>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-xl anim-fade-in">
                            {activeCalculator === 'compound' && <CompoundInterestCalc />}
                            {activeCalculator === 'ceiling' && <CeilingPriceCalc />}
                            {activeCalculator === 'fire' && <FireCalc />}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'appearance' && (
                <div className="space-y-6 anim-slide-up">
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Tema</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map(m => (
                                <button key={m.id} onClick={() => onSetTheme(m.id as ThemeType)} className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 press-effect ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl' : 'bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-400'}`}>
                                    <m.icon className="w-6 h-6 mb-2" strokeWidth={2} />
                                    <span className="text-[10px] font-bold uppercase">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Cor de Destaque</h3>
                        <div className="flex justify-between items-center px-2">
                            {ACCENT_COLORS.map((c) => (
                                <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 shadow-lg' : 'hover:scale-110 opacity-60'}`} style={{ backgroundColor: c.hex, ['--tw-ring-color' as any]: c.hex }}>
                                    {accentColor === c.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'data' && (
                <div className="space-y-4 anim-slide-up">
                    <div className="bg-gradient-to-br from-zinc-800 to-black p-6 rounded-[2rem] text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Importar B3</h3>
                            <p className="text-sm text-zinc-400 mb-6">Traga suas ordens e proventos via planilha Excel oficial.</p>
                            
                            <button onClick={() => excelInputRef.current?.click()} disabled={isImporting} className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg press-effect flex items-center justify-center gap-2">
                                {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isImporting ? 'Processando...' : 'Selecionar Arquivo'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExport} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect flex flex-col items-center justify-center gap-2">
                            <Download className="w-6 h-6 text-blue-500" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Backup JSON</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect flex flex-col items-center justify-center gap-2">
                            <FileJson className="w-6 h-6 text-amber-500" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Restaurar JSON</span>
                        </button>
                    </div>

                    <div className="p-1">
                        <button onClick={onResetApp} className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 press-effect group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Limpar Cache Local</p>
                                    <p className="text-[10px] text-rose-500/70">Força recarregamento total.</p>
                                </div>
                            </div>
                            <Trash2 className="w-5 h-5 text-rose-400" />
                        </button>
                    </div>

                    <input type="file" ref={fileInputRef} onChange={() => {}} accept=".json" className="hidden" onClick={(e) => (e.target as any).value = null} />
                    <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" onClick={(e) => (e.target as any).value = null} />
                </div>
            )}

            {activeSection === 'about' && (
                <div className="space-y-6 anim-slide-up text-center pt-8">
                    <div className="w-24 h-24 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center shadow-inner mb-4">
                        <Smartphone className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">InvestFIIs</h2>
                        <p className="text-sm text-zinc-500 font-medium">Gestão Inteligente de Ativos</p>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">v{appVersion}</span>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 press-effect">
                            <Github className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 press-effect">
                            <Globe className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Modal Logs */}
        <SwipeableModal isOpen={showLogs} onClose={() => setShowLogs(false)}>
            <div className="p-0 h-full flex flex-col bg-[#0d1117] text-[#c9d1d9]">
                <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-[#161b22]">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-sm font-bold text-white tracking-wide font-mono">Console</h2>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => { logger.clear(); setLogs([]); }} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => setShowLogs(false)} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors">
                            <Check className="w-4 h-4" />
                         </button>
                    </div>
                </div>
                <div className="flex-1 p-2 font-mono text-[11px] overflow-y-auto overflow-x-hidden">
                    {logs.slice().reverse().map((log) => (
                        <div key={log.id} className={`mb-1 p-1.5 rounded border-l-2 ${log.level === 'error' ? 'border-red-500 bg-red-900/20' : 'border-zinc-700'}`}>
                            <span className="text-zinc-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <pre className="whitespace-pre-wrap mt-1">{log.message}</pre>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};
