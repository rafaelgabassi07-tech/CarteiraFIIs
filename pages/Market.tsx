
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2, TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Activity, Target, Search, Calculator, ArrowRight, Wallet, Zap, Filter } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { SwipeableModal } from '../components/Layout';

// --- TYPES ---
export interface MarketAsset {
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

// --- UTILS ---
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number) => `${val.toFixed(2)}%`;

// --- COMPONENTS ---

interface TrendingCardProps {
    asset: MarketAsset;
    type: 'winner' | 'loser';
    onClick: (a: MarketAsset) => void;
}

// 1. Carrossel de Destaques (Trending)
const TrendingCard: React.FC<TrendingCardProps> = ({ asset, type, onClick }) => {
    const isWinner = type === 'winner';
    const colorClass = isWinner ? 'text-emerald-500' : 'text-rose-500';
    const bgClass = isWinner ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-rose-50 dark:bg-rose-900/10';
    const icon = isWinner ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;

    return (
        <button 
            onClick={() => onClick(asset)}
            className={`min-w-[140px] p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between items-start snap-center press-effect bg-white dark:bg-zinc-900 shadow-sm`}
        >
            <div className="flex justify-between items-start w-full mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass} ${colorClass}`}>
                    {icon}
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${bgClass} ${colorClass}`}>
                    {isWinner ? '+' : ''}{asset.variation_percent?.toFixed(2)}%
                </span>
            </div>
            <div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h4>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">R$ {asset.price.toFixed(2)}</p>
            </div>
        </button>
    );
};

interface OpportunityCardProps {
    asset: MarketAsset;
    type: 'FII' | 'ACAO';
    onClick: (a: MarketAsset) => void;
}

// 2. Card de Oportunidade (Foco em Desconto/Valuation)
const OpportunityCard: React.FC<OpportunityCardProps> = ({ asset, type, onClick }) => {
    // Cálculo do "Desconto" visual para FIIs
    let discountTag = null;
    let mainMetric = null;
    let metricLabel = '';

    if (type === 'FII' && asset.p_vp) {
        metricLabel = 'P/VP';
        mainMetric = asset.p_vp.toFixed(2);
        if (asset.p_vp < 1) {
            const discount = Math.round((1 - asset.p_vp) * 100);
            discountTag = (
                <span className="text-[9px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded-full shadow-sm shadow-indigo-500/30">
                    {discount}% OFF
                </span>
            );
        }
    } else if (type === 'ACAO' && asset.p_l) {
        metricLabel = 'P/L';
        mainMetric = asset.p_l.toFixed(2);
        if (asset.p_l < 5 && asset.p_l > 0) {
             discountTag = (
                <span className="text-[9px] font-black text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-full">
                    BARATO
                </span>
            );
        }
    }

    return (
        <button onClick={() => onClick(asset)} className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group relative overflow-hidden">
            {/* Indicador lateral de status */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${asset.p_vp && asset.p_vp < 1 ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
            
            <div className="flex items-center gap-4 pl-2">
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h4>
                        {discountTag}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{asset.name.split(' ')[0]}</p>
                </div>
            </div>

            <div className="text-right">
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{metricLabel}</span>
                    <span className={`text-lg font-black tracking-tight ${asset.p_vp && asset.p_vp < 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-white'}`}>
                        {mainMetric}x
                    </span>
                </div>
            </div>
        </button>
    );
};

interface DividendCardProps {
    asset: MarketAsset;
    onClick: (a: MarketAsset) => void;
}

// 3. Card de Proventos (Foco em Yield)
const DividendCard: React.FC<DividendCardProps> = ({ asset, onClick }) => {
    return (
        <button onClick={() => onClick(asset)} className="w-full bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 shadow-sm press-effect">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/10 flex flex-col items-center justify-center border border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-500">
                <span className="text-xs font-black">{asset.dy_12m?.toFixed(1)}%</span>
                <span className="text-[7px] font-bold uppercase">12 Meses</span>
            </div>
            <div className="flex-1 text-left">
                <h4 className="text-sm font-black text-zinc-900 dark:text-white">{asset.ticker}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Cotação: {formatCurrency(asset.price)}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <ArrowRight className="w-4 h-4" />
            </div>
        </button>
    );
};

interface MarketAssetDetailProps {
    asset: MarketAsset;
    onClose: () => void;
}

// --- MODAL DETALHADO (SIMULADOR) ---
const MarketAssetDetail: React.FC<MarketAssetDetailProps> = ({ asset, onClose }) => {
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const [simAmount, setSimAmount] = useState(1000);
    
    // Cálculo Simulado
    const monthlyRate = (asset.dy_12m || 0) / 100 / 12;
    const monthlyIncome = simAmount * monthlyRate;
    const cotas = Math.floor(simAmount / asset.price);

    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header com Imagem/Gradiente */}
            <div className="relative pt-8 pb-6 px-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors z-10">
                    <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-4 mb-2">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm border ${isFii ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{asset.ticker}</h2>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{asset.name.split(' ')[0]} • {isFii ? 'FII' : 'AÇÃO'}</span>
                    </div>
                </div>

                <div className="flex items-end gap-3 mt-4">
                    <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatCurrency(asset.price)}</span>
                    {asset.variation_percent !== undefined && (
                        <div className={`mb-1.5 px-2 py-1 rounded-lg text-xs font-black ${asset.variation_percent >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {asset.variation_percent >= 0 ? '+' : ''}{asset.variation_percent.toFixed(2)}%
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
                
                {/* 1. Métricas Principais (Grid) */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-1 text-zinc-400">
                            <Activity className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isFii ? 'P/VP' : 'P/L'}</span>
                        </div>
                        <p className={`text-xl font-black ${asset.p_vp && asset.p_vp < 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-white'}`}>
                            {isFii ? asset.p_vp?.toFixed(2) : asset.p_l?.toFixed(2)}x
                        </p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-1 text-zinc-400">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Dividend Yield</span>
                        </div>
                        <p className="text-xl font-black text-amber-500">
                            {asset.dy_12m?.toFixed(2)}%
                        </p>
                    </div>
                </div>

                {/* 2. Simulador Interativo */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-6 rounded-[2rem] text-white shadow-xl">
                    <div className="flex items-center gap-2 mb-6 opacity-80">
                        <Calculator className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Simulador de Renda</span>
                    </div>

                    <div className="mb-6">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-60">Se você investir</p>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {[1000, 5000, 10000, 50000].map(val => (
                                <button 
                                    key={val} 
                                    onClick={() => setSimAmount(val)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${simAmount === val ? 'bg-white text-zinc-900 border-white' : 'bg-transparent text-zinc-300 border-zinc-600 hover:border-zinc-400'}`}
                                >
                                    R$ {val >= 1000 ? `${val/1000}k` : val}
                                </button>
                            ))}
                        </div>
                        <div className="text-3xl font-black mt-2 tracking-tight">R$ {simAmount.toLocaleString('pt-BR')}</div>
                    </div>

                    <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Renda Mensal Est.</p>
                            <p className="text-2xl font-black text-emerald-400 mt-0.5">R$ {monthlyIncome.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Cotas</p>
                            <p className="text-xl font-bold">{cotas}</p>
                        </div>
                    </div>
                    <p className="text-[8px] text-center mt-3 opacity-40">Baseado no DY dos últimos 12 meses. Não é garantia de retorno futuro.</p>
                </div>

                {/* 3. Link Externo */}
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between w-full p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors press-effect"
                >
                    <span>Ver análise completa no Investidor10</span>
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---

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
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const rawData = data?.highlights?.[activeTab];

    const currentData = useMemo(() => {
        if (!rawData) return null;
        const term = searchTerm.toUpperCase();
        if (!term) return rawData;

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
            {/* --- HEADER --- */}
            <div className="sticky top-20 z-30 bg-primary-light/90 dark:bg-primary-dark/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-6">
                
                {/* Título + Refresh */}
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Mercado</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${data && !data.error ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                {data ? (data.error ? 'Offline' : 'Atualizado agora') : 'Carregando...'}
                            </p>
                        </div>
                    </div>
                    <button onClick={loadData} disabled={loading} className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-95'}`}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Busca + Tabs em Linha */}
                <div className="space-y-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar ativo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500/50 pl-10 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none shadow-sm transition-all"
                        />
                    </div>

                    <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl">
                        <button onClick={() => setActiveTab('fiis')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'fiis' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500'}`}>FIIs</button>
                        <button onClick={() => setActiveTab('stocks')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stocks' ? 'bg-white dark:bg-zinc-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-zinc-500'}`}>Ações</button>
                    </div>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {loading && !currentData ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
            ) : currentData ? (
                <div className="space-y-8 anim-fade-in px-1">
                    
                    {/* 1. DESTAQUES (Carrossel Horizontal) */}
                    {(currentData.gainers.length > 0 || currentData.losers.length > 0) && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">Em Alta & Baixa</h3>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x">
                                {currentData.gainers.slice(0, 5).map((item, i) => (
                                    <TrendingCard key={`win-${i}`} asset={item} type="winner" onClick={setSelectedAsset} />
                                ))}
                                {currentData.losers.slice(0, 5).map((item, i) => (
                                    <TrendingCard key={`lose-${i}`} asset={item} type="loser" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. OPORTUNIDADES (Grid Vertical) */}
                    {currentData.discounted.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">Oportunidades</h3>
                                </div>
                                <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                    {activeTab === 'fiis' ? 'P/VP Baixo' : 'P/L Atrativo'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {currentData.discounted.map((item, i) => (
                                    <OpportunityCard key={i} asset={item} type={activeTab === 'fiis' ? 'FII' : 'ACAO'} onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. PROVENTOS (Lista) */}
                    {currentData.high_yield.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">Top Dividendos</h3>
                            </div>
                            <div className="space-y-2">
                                {currentData.high_yield.map((item, i) => (
                                    <DividendCard key={i} asset={item} onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {currentData.gainers.length === 0 && currentData.high_yield.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <Building2 className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1} />
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
