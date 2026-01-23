import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2, TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Activity, Target, BookOpen, Scale, Search, Calculator, ArrowRight, Filter, Zap, AlertCircle } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { SwipeableModal } from '../components/Layout';

// --- TYPES ---
interface MarketAsset {
    ticker: string;
    name: string;
    price: number;
    variation_percent?: number;
    dy_12m?: number;
    p_vp?: number;
    p_l?: number;
}

interface NewMarketOverview {
    market_status: string;
    last_update: string;
    highlights: {
        fiis: {
            gainers: MarketAsset[];
            losers: MarketAsset[];
            high_yield: MarketAsset[];
            discounted: MarketAsset[];
        };
        stocks: {
            gainers: MarketAsset[];
            losers: MarketAsset[];
            high_yield: MarketAsset[];
            discounted: MarketAsset[];
        };
    };
    error?: boolean;
}

// --- SUB-COMPONENTS DE UI ---

// Simulador de Dividendos (Calculadora Mágica)
const DividendSimulator = ({ dy, price }: { dy: number, price: number }) => {
    const monthlyReturnRate = (dy / 100) / 12;
    const [amount, setAmount] = useState(1000);

    const monthlyIncome = amount * monthlyReturnRate;
    const quotas = Math.floor(amount / price);

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <Calculator className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">Simulador de Renda</h4>
                    <p className="text-[9px] text-emerald-700 dark:text-emerald-400/70 font-medium">Quanto você quer investir?</p>
                </div>
            </div>
            
            {/* Input Slider Simulado (Botões Rápidos) */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                {[1000, 5000, 10000, 50000].map(val => (
                    <button 
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${amount === val ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-emerald-100 dark:border-zinc-700'}`}
                    >
                        {val >= 1000 ? `${val/1000}k` : val}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between bg-white/80 dark:bg-zinc-900/60 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 backdrop-blur-sm">
                <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Renda Mensal Est.</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">R$ {monthlyIncome.toFixed(2)}</span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Cotas Aprox.</span>
                    <span className="text-lg font-black text-zinc-700 dark:text-zinc-300">{quotas}</span>
                </div>
            </div>
            <p className="text-[8px] text-emerald-800/40 dark:text-emerald-200/30 mt-2.5 text-center leading-tight">
                *Estimativa baseada no DY dos últimos 12 meses.
            </p>
        </div>
    );
};

// Barra de Indicador Visual (Para P/VP, P/L, etc)
const IndicatorBar = ({ label, value, type }: { label: string, value: number, type: 'pvp' | 'pl' | 'dy' }) => {
    let status = 'Neutro';
    let color = 'bg-zinc-400';
    let percentage = 50;

    if (type === 'pvp') {
        // 0.5 (0%) -> 1.0 (50%) -> 1.5 (100%)
        percentage = Math.min(Math.max(((value - 0.5) / 1.0) * 100, 0), 100);
        if (value < 0.95) { status = 'Desconto'; color = 'bg-indigo-500'; }
        else if (value > 1.05) { status = 'Ágio'; color = 'bg-amber-500'; }
        else { status = 'Justo'; color = 'bg-emerald-500'; }
    } else if (type === 'pl') {
        percentage = Math.min((value / 20) * 100, 100); // 0 a 20
        status = 'Múltiplo';
        color = 'bg-sky-500';
    }

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
                <div className="flex items-center gap-2">
                    {status !== 'Neutro' && status !== 'Múltiplo' && (
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${type === 'pvp' && value < 1 ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {status}
                        </span>
                    )}
                    <span className="text-sm font-black text-zinc-900 dark:text-white">{value.toFixed(2)}</span>
                </div>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

// --- CARD CONTEXTUAL INTELIGENTE ---
interface SmartAssetCardProps {
    item: MarketAsset;
    variant: 'change' | 'yield' | 'valuation';
    onClick: (a: MarketAsset) => void;
}

const SmartAssetCard = ({ item, variant, onClick }: SmartAssetCardProps) => {
    // Configuração baseada na variante
    let highlightContent = null;
    let highlightLabel = "";

    if (variant === 'yield' && item.dy_12m) {
        highlightLabel = "Dividend Yield";
        highlightContent = (
            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{item.dy_12m.toFixed(2)}%</span>
            </div>
        );
    } else if (variant === 'valuation') {
        const isFii = item.ticker.endsWith('11') || item.ticker.endsWith('11B');
        const val = isFii ? item.p_vp : item.p_l;
        const label = isFii ? 'P/VP' : 'P/L';
        const isDiscount = isFii && val && val < 1;
        
        highlightLabel = label;
        highlightContent = (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${isDiscount ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'}`}>
                {isDiscount ? <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : <Scale className="w-3 h-3 text-zinc-400" />}
                <span className={`text-xs font-black ${isDiscount ? 'text-indigo-700 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                    {val ? val.toFixed(2) : '-'}x
                </span>
            </div>
        );
    } else { // variant === 'change'
        const change = item.variation_percent || 0;
        const isPos = change >= 0;
        highlightLabel = "Variação Dia";
        highlightContent = (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${isPos ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                {isPos ? <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                <span className={`text-xs font-black ${isPos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {Math.abs(change).toFixed(2)}%
                </span>
            </div>
        );
    }

    return (
        <button 
            onClick={() => onClick(item)} 
            className="w-full bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black border border-zinc-100 dark:border-zinc-700 text-zinc-500">
                    {item.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <span className="text-sm font-black text-zinc-900 dark:text-white block tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.ticker}</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">R$ {item.price.toFixed(2)}</span>
                </div>
            </div>
            
            <div className="flex flex-col items-end">
                {highlightContent}
                <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 mt-1 uppercase tracking-wider">{highlightLabel}</span>
            </div>
        </button>
    );
};

// --- MODAL DETALHES ---

const MarketAssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const [tab, setTab] = useState<'VISAO' | 'INDICADORES'>('VISAO');
    
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{asset.ticker}</h2>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{asset.name.split(' ')[0]}</span>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors backdrop-blur-md">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navegação */}
            <div className="px-6 pt-4 pb-2">
                <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-xl backdrop-blur-sm">
                    {['VISAO', 'INDICADORES'].map(t => (
                        <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                            {t === 'VISAO' ? 'Panorama' : 'Indicadores'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 pb-24 space-y-6 overflow-y-auto">
                {tab === 'VISAO' && (
                    <div className="space-y-6 anim-fade-in">
                        <div className="text-center py-4 relative">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cotação Atual</span>
                            <h3 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter mt-1 mb-2">
                                <span className="text-2xl align-top opacity-30 mr-1 font-bold">R$</span>
                                {asset.price.toFixed(2)}
                            </h3>
                            {asset.variation_percent !== undefined && (
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${asset.variation_percent >= 0 ? 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100/50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                    {asset.variation_percent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    {asset.variation_percent > 0 ? '+' : ''}{asset.variation_percent.toFixed(2)}%
                                </div>
                            )}
                        </div>

                        {/* Seção Principal: Simulador e Valuation */}
                        <div className="grid grid-cols-1 gap-4">
                            {asset.dy_12m && asset.dy_12m > 0 && (
                                <DividendSimulator dy={asset.dy_12m} price={asset.price} />
                            )}
                            
                            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wide mb-4">Métricas Chave</h4>
                                {isFii && asset.p_vp && <IndicatorBar label="P/VP (Patrimonial)" value={asset.p_vp} type="pvp" />}
                                {!isFii && asset.p_l && <IndicatorBar label="P/L (Lucro)" value={asset.p_l} type="pl" />}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'INDICADORES' && (
                    <div className="space-y-6 anim-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Cards de Métricas Detalhados */}
                            <div className="col-span-2 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dividend Yield</p>
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{asset.dy_12m?.toFixed(2)}%</p>
                                </div>
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{isFii ? 'P/VP' : 'P/L'}</p>
                                <p className="text-lg font-black text-zinc-900 dark:text-white">{isFii ? asset.p_vp?.toFixed(2) : asset.p_l?.toFixed(2)}x</p>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Liquidez</p>
                                <p className="text-lg font-black text-zinc-900 dark:text-white">Média</p>
                            </div>
                        </div>

                        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-4 px-8 leading-relaxed">
                                Para histórico completo e análise fundamentalista:
                            </p>
                            <a href={url} target="_blank" rel="noreferrer" className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 press-effect hover:shadow-xl transition-all">
                                Ver no Investidor10 <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fiis' | 'stocks'>('fiis');
    const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchMarketOverview();
            // @ts-ignore
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const rawData = data?.highlights?.[activeTab];

    const currentData = useMemo(() => {
        if (!rawData) return null;
        if (!searchTerm) return rawData;

        const term = searchTerm.toUpperCase();
        const filterFn = (a: MarketAsset) => a.ticker.includes(term) || a.name.toUpperCase().includes(term);

        return {
            gainers: rawData.gainers.filter(filterFn),
            losers: rawData.losers.filter(filterFn),
            high_yield: rawData.high_yield.filter(filterFn),
            discounted: rawData.discounted.filter(filterFn),
        };
    }, [rawData, searchTerm]);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sticky */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">
                            Mercado
                        </h2>
                        {data && (
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {data.market_status} • {new Date(data.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        )}
                    </div>
                    <button onClick={loadData} disabled={loading} className={`w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-95'}`}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl relative">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`} style={{ left: '4px', transform: `translateX(${activeTab === 'fiis' ? '0%' : '100%'})` }}></div>
                    <button onClick={() => setActiveTab('fiis')} className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'fiis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                        <Building2 className="w-3.5 h-3.5" /> FIIs
                    </button>
                    <button onClick={() => setActiveTab('stocks')} className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'stocks' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>
                        <TrendingUp className="w-3.5 h-3.5" /> Ações
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="space-y-4 animate-pulse px-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                    </div>
                    <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                </div>
            ) : currentData ? (
                <div className="space-y-8 px-1">
                    
                    {/* Seção 1: Destaques (Grid Compacto) */}
                    {(currentData.gainers.length > 0 || currentData.losers.length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Altas
                                </h3>
                                {currentData.gainers.slice(0, 3).map((item, i) => (
                                    // VARIANT: CHANGE (Mostra Variação)
                                    <SmartAssetCard key={i} item={item} variant="change" onClick={setSelectedAsset} />
                                ))}
                            </div>
                            <div className="flex flex-col gap-3">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                    <TrendingDown className="w-3 h-3 text-rose-500" /> Baixas
                                </h3>
                                {currentData.losers.slice(0, 3).map((item, i) => (
                                    // VARIANT: CHANGE (Mostra Variação)
                                    <SmartAssetCard key={i} item={item} variant="change" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção 2: Oportunidades (Mostra P/VP ou P/L) */}
                    {currentData.discounted.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Target className="w-3 h-3 text-indigo-500" /> 
                                    {activeTab === 'fiis' ? 'Descontados (P/VP)' : 'Descontados (P/L)'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {currentData.discounted.map((item, i) => (
                                    // VARIANT: VALUATION (Mostra Multiplo)
                                    <SmartAssetCard key={i} item={item} variant="valuation" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção 3: Dividendos (Mostra DY) */}
                    {currentData.high_yield.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3 text-amber-500" /> Top Dividendos
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {currentData.high_yield.map((item, i) => (
                                    // VARIANT: YIELD (Mostra DY)
                                    <SmartAssetCard key={i} item={item} variant="yield" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {currentData.gainers.length === 0 && currentData.high_yield.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <p className="text-xs font-bold text-zinc-500">Nenhum ativo encontrado.</p>
                        </div>
                    )}

                </div>
            ) : null}

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && <MarketAssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            </SwipeableModal>
        </div>
    );
};
