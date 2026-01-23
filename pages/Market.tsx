
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle, Building2, TrendingUp, TrendingDown, DollarSign, Percent, X, ExternalLink, Activity, BarChart3, Clock, ArrowRight, Zap, Target, BookOpen, Scale, Info, Search, Calculator, Check } from 'lucide-react';
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

interface MarketCategoryData {
    gainers: MarketAsset[];
    losers: MarketAsset[];
    high_yield: MarketAsset[];
    discounted: MarketAsset[];
}

interface NewMarketOverview {
    market_status: string;
    last_update: string;
    highlights: {
        fiis: MarketCategoryData;
        stocks: MarketCategoryData;
    };
    error?: boolean;
}

// --- SUB-COMPONENTS ---

const DividendSimulator = ({ dy, price }: { dy: number, price: number }) => {
    // Estimativa simplificada: (Valor * (DY/100)) / 12
    const monthlyReturnRate = (dy / 100) / 12;
    
    const simulations = [1000, 5000, 10000];

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Calculator className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">Simulador de Renda</h4>
                    <p className="text-[9px] text-emerald-700 dark:text-emerald-400/70">Estimativa mensal baseada no DY atual</p>
                </div>
            </div>
            
            <div className="space-y-2">
                {simulations.map(val => {
                    const monthly = val * monthlyReturnRate;
                    const cotas = Math.floor(val / price);
                    return (
                        <div key={val} className="flex justify-between items-center p-3 bg-white/60 dark:bg-black/20 rounded-xl border border-emerald-100/50 dark:border-emerald-900/10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Investindo R$ {val.toLocaleString('pt-BR')}</span>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Aprox. {cotas} cotas</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+ R$ {monthly.toFixed(2)}</span>
                                <span className="text-[9px] text-zinc-400 block">/mês</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-[8px] text-emerald-800/50 dark:text-emerald-200/30 mt-3 text-center px-4 leading-tight">
                *Cálculo estimativo baseado no Dividend Yield dos últimos 12 meses. Retornos passados não garantem futuro.
            </p>
        </div>
    );
};

const ValuationBar = ({ value, type }: { value: number, type: 'pvp' | 'pl' }) => {
    let percentage = 50;
    let statusText = 'Justo';
    let barColor = 'bg-zinc-300 dark:bg-zinc-600';
    let textColor = 'text-zinc-500';

    if (type === 'pvp') {
        // 0.8 (0%) ... 1.0 (50%) ... 1.2 (100%)
        if (value <= 0.8) percentage = 0;
        else if (value >= 1.2) percentage = 100;
        else percentage = ((value - 0.8) / 0.4) * 100;

        if (value < 0.95) { statusText = 'Descontado'; barColor = 'bg-emerald-500'; textColor = 'text-emerald-600 dark:text-emerald-400'; }
        else if (value > 1.05) { statusText = 'Ágio'; barColor = 'bg-rose-500'; textColor = 'text-rose-600 dark:text-rose-400'; }
        else { statusText = 'Preço Justo'; barColor = 'bg-amber-500'; textColor = 'text-amber-600 dark:text-amber-400'; }
    } else {
        // P/L: 0 ... 20
        percentage = Math.min((value / 25) * 100, 100);
        statusText = 'Múltiplo';
        barColor = 'bg-indigo-500';
        textColor = 'text-indigo-600 dark:text-indigo-400';
    }

    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5">{type === 'pvp' ? 'P/VP' : 'P/L'}</span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{value.toFixed(2)}x</span>
                </div>
                <div className={`px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700`}>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${textColor}`}>{statusText}</span>
                </div>
            </div>
            
            <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
                {/* Marker for PVP 1.0 */}
                {type === 'pvp' && <div className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-zinc-900 left-1/2 z-10"></div>}
            </div>
            
            <div className="flex justify-between text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest mt-2 px-0.5">
                <span>Barato</span>
                <span>Caro</span>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, subtext }: any) => (
    <div className="flex flex-col p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
        <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">{label}</span>
            <Icon className="w-3.5 h-3.5 text-zinc-300 group-hover:text-indigo-500 transition-colors" />
        </div>
        <span className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{value}</span>
        {subtext && <span className="text-[9px] font-medium text-zinc-400 mt-0.5">{subtext}</span>}
    </div>
);

// --- MODAL DETALHADO ---

const MarketAssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const [tab, setTab] = useState<'VISAO' | 'INDICADORES'>('VISAO');
    
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const typeLabel = isFii ? 'Fundo Imobiliário' : 'Ação';
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header Sticky Minimalista */}
            <div className="sticky top-0 z-20 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{asset.ticker}</h2>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{asset.name.split(' ')[0]}</span>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors backdrop-blur-md">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navegação iOS Segmented */}
            <div className="px-6 pt-4 pb-2">
                <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-xl backdrop-blur-sm">
                    <button onClick={() => setTab('VISAO')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'VISAO' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        Panorama
                    </button>
                    <button onClick={() => setTab('INDICADORES')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'INDICADORES' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        Detalhes
                    </button>
                </div>
            </div>

            <div className="p-6 pb-24 space-y-6 overflow-y-auto">
                {tab === 'VISAO' && (
                    <div className="space-y-6 anim-fade-in">
                        {/* Big Price Card */}
                        <div className="text-center py-2 relative">
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

                        {/* Valuation & Yield Grid */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* Simulator - Only if DY exists */}
                            {asset.dy_12m && asset.dy_12m > 0 && (
                                <DividendSimulator dy={asset.dy_12m} price={asset.price} />
                            )}

                            {isFii && asset.p_vp && <ValuationBar value={asset.p_vp} type="pvp" />}
                            {!isFii && asset.p_l && <ValuationBar value={asset.p_l} type="pl" />}
                        </div>
                    </div>
                )}

                {tab === 'INDICADORES' && (
                    <div className="space-y-6 anim-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard icon={DollarSign} label="Dividend Yield" value={`${asset.dy_12m?.toFixed(2)}%`} subtext="Últimos 12m" />
                            <StatCard icon={Target} label="Variação" value={`${asset.variation_percent?.toFixed(2)}%`} subtext="Dia" />
                            {asset.p_vp !== undefined && <StatCard icon={Activity} label="P/VP" value={asset.p_vp.toFixed(2)} subtext="Patrimonial" />}
                            {asset.p_l !== undefined && <StatCard icon={Scale} label="P/L" value={asset.p_l.toFixed(2)} subtext="Lucro" />}
                            <StatCard icon={BookOpen} label="Liquidez" value="Média" subtext="Vol. Diário" />
                            <StatCard icon={Zap} label="Tipo" value={isFii ? 'FII' : 'Ação'} subtext="Classe" />
                        </div>

                        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-4 px-8 leading-relaxed">
                                Acesse dados históricos completos e análise fundamentalista detalhada.
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

// --- LISTA DE ATIVOS ---

const AssetCard = ({ item, type, onClick }: any) => {
    const isUp = type === 'up';
    const isDown = type === 'down';
    
    return (
        <button 
            onClick={() => onClick(item)} 
            className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
            <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border transition-colors ${isUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30' : isDown ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30' : 'bg-zinc-50 text-zinc-500 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                    {item.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.ticker}</span>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block truncate max-w-[100px]">{item.name.split(' ')[0]}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-sm font-black text-zinc-900 dark:text-white block">R$ {item.price.toFixed(2)}</span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                    {item.variation_percent !== undefined && (
                        <span className={`text-[9px] font-black flex items-center gap-0.5 ${item.variation_percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.variation_percent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {Math.abs(item.variation_percent).toFixed(2)}%
                        </span>
                    )}
                </div>
            </div>
        </button>
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

    // Lógica de Filtro Local
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
            {/* Header Sticky com Busca */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4">
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
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl relative">
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
                                    <AssetCard key={i} item={item} type="up" onClick={setSelectedAsset} />
                                ))}
                            </div>
                            <div className="flex flex-col gap-3">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                    <TrendingDown className="w-3 h-3 text-rose-500" /> Baixas
                                </h3>
                                {currentData.losers.slice(0, 3).map((item, i) => (
                                    <AssetCard key={i} item={item} type="down" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção 2: Oportunidades */}
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
                                    <AssetCard key={i} item={item} type="neutral" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção 3: Dividendos */}
                    {currentData.high_yield.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3 text-amber-500" /> Top Dividendos
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {currentData.high_yield.map((item, i) => (
                                    <AssetCard key={i} item={item} type="neutral" onClick={setSelectedAsset} />
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
