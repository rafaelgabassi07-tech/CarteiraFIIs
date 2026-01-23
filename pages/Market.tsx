
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2, TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Target, Search, Calculator, ArrowRight, Zap, Filter, ArrowUpRight, ArrowDownRight, Percent, BarChart3, AlertCircle } from 'lucide-react';
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

// --- COMPONENTS ---

// Botão de Categoria (Estilo Dashboard)
const CategoryButton = ({ 
    label, 
    subLabel,
    icon: Icon, 
    isActive, 
    onClick, 
    colorClass,
    bgClass 
}: { 
    label: string;
    subLabel: string;
    icon: any; 
    isActive: boolean; 
    onClick: () => void; 
    colorClass: string;
    bgClass: string;
}) => (
    <button 
        onClick={onClick}
        className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 press-effect text-left flex flex-col justify-between h-28 ${isActive ? 'ring-2 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950 ' + colorClass.replace('text-', 'ring-') + ' bg-white dark:bg-zinc-900 border-transparent shadow-lg' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass} ${colorClass} mb-2`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest block ${isActive ? colorClass : 'text-zinc-400'}`}>
                {subLabel}
            </span>
            <span className="text-sm font-black text-zinc-900 dark:text-white leading-tight">
                {label}
            </span>
        </div>
        {isActive && <div className={`absolute top-0 right-0 p-2 ${colorClass}`}><div className="w-1.5 h-1.5 rounded-full bg-current"></div></div>}
    </button>
);

// Lista de Ativos (Ranking)
const AssetRankingList = ({ assets, type, metricType, onClick }: { assets: MarketAsset[], type: 'fiis' | 'stocks', metricType: 'change' | 'dy' | 'valuation', onClick: (a: MarketAsset) => void }) => {
    if (assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Filter className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum dado disponível</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {assets.map((asset, i) => {
                let badge = null;
                let valueDisplay = null;

                if (metricType === 'change') {
                    const change = asset.variation_percent || 0;
                    const isPos = change >= 0;
                    valueDisplay = (
                        <div className={`flex items-center gap-1 font-black text-sm ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPos ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {Math.abs(change).toFixed(2)}%
                        </div>
                    );
                } else if (metricType === 'dy') {
                    valueDisplay = (
                        <div className="flex items-center gap-1 font-black text-sm text-amber-500">
                            <DollarSign className="w-4 h-4" />
                            {asset.dy_12m?.toFixed(2)}%
                        </div>
                    );
                } else {
                    const val = type === 'fiis' ? asset.p_vp : asset.p_l;
                    const label = type === 'fiis' ? 'P/VP' : 'P/L';
                    const isCheap = type === 'fiis' ? (val && val < 1) : (val && val < 10);
                    valueDisplay = (
                        <div className={`flex flex-col items-end`}>
                            <span className={`font-black text-sm ${isCheap ? 'text-indigo-500' : 'text-zinc-900 dark:text-white'}`}>{val?.toFixed(2)}x</span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">{label}</span>
                        </div>
                    );
                }

                return (
                    <button 
                        key={asset.ticker} 
                        onClick={() => onClick(asset)}
                        className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                                {i + 1}º
                            </div>
                            <div className="text-left">
                                <h4 className="text-sm font-black text-zinc-900 dark:text-white">{asset.ticker}</h4>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase">R$ {asset.price.toFixed(2)}</p>
                            </div>
                        </div>
                        {valueDisplay}
                    </button>
                );
            })}
        </div>
    );
};

// --- MODAL DETALHADO ---
// Reutiliza a lógica do anterior mas com visual limpo
const AssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col p-6">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{asset.ticker}</h2>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isFii ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'}`}>
                            {isFii ? 'FII' : 'Ação'}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{asset.name}</p>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Cotação</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatCurrency(asset.price)}</p>
                    {asset.variation_percent !== undefined && (
                        <span className={`text-xs font-bold ${asset.variation_percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {asset.variation_percent > 0 ? '+' : ''}{asset.variation_percent.toFixed(2)}%
                        </span>
                    )}
                </div>
                <div className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">DY (12m)</p>
                    <p className="text-2xl font-black text-amber-500">{asset.dy_12m ? asset.dy_12m.toFixed(2) : '-'}%</p>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{isFii ? 'P/VP' : 'P/L'}</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-white">{isFii ? asset.p_vp?.toFixed(2) : asset.p_l?.toFixed(2)}x</span>
                </div>
                {isFii && (
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Segmento</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white text-right">Ver no site</span>
                    </div>
                )}
            </div>

            <a href={url} target="_blank" rel="noreferrer" className="mt-auto w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl press-effect flex items-center justify-center gap-2">
                Análise Completa <ExternalLink className="w-4 h-4" />
            </a>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---

type RankingCategory = 'HIGHS' | 'LOWS' | 'DY' | 'VALUATION';

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fiis' | 'stocks'>('fiis');
    const [activeCategory, setActiveCategory] = useState<RankingCategory>('HIGHS');
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

    const displayedAssets = useMemo(() => {
        if (!rawData) return [];
        let list: MarketAsset[] = [];

        switch (activeCategory) {
            case 'HIGHS': list = rawData.gainers; break;
            case 'LOWS': list = rawData.losers; break;
            case 'DY': list = rawData.high_yield; break;
            case 'VALUATION': list = rawData.discounted; break;
        }

        if (searchTerm) {
            const term = searchTerm.toUpperCase();
            list = list.filter(a => a.ticker.includes(term) || a.name.toUpperCase().includes(term));
        }

        return list;
    }, [rawData, activeCategory, searchTerm]);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sticky */}
            <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Rankings</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${data && !data.error ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                {data ? (data.error ? 'Offline' : 'Mercado Aberto') : 'Sincronizando...'}
                            </p>
                        </div>
                    </div>
                    <button onClick={loadData} disabled={loading} className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-95'}`}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filtro Principal (FIIs vs Ações) */}
                <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl relative mb-4">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`} style={{ left: '4px', transform: `translateX(${activeTab === 'fiis' ? '0%' : '100%'})` }}></div>
                    <button onClick={() => setActiveTab('fiis')} className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'fiis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                        <Building2 className="w-3.5 h-3.5" /> FIIs
                    </button>
                    <button onClick={() => setActiveTab('stocks')} className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'stocks' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>
                        <TrendingUp className="w-3.5 h-3.5" /> Ações
                    </button>
                </div>

                {/* Busca */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder={`Buscar em ${activeCategory === 'HIGHS' ? 'Altas' : activeCategory === 'LOWS' ? 'Baixas' : 'Rankings'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500/50 pl-10 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none shadow-sm transition-all"
                    />
                </div>
            </div>

            {/* Grid de Categorias (Dashboard Style) */}
            <div className="grid grid-cols-2 gap-3 mb-6 px-1">
                <CategoryButton 
                    label="Maiores Altas" 
                    subLabel="Top Gainers"
                    icon={TrendingUp} 
                    isActive={activeCategory === 'HIGHS'} 
                    onClick={() => setActiveCategory('HIGHS')}
                    colorClass="text-emerald-500"
                    bgClass="bg-emerald-50 dark:bg-emerald-900/20"
                />
                <CategoryButton 
                    label="Maiores Baixas" 
                    subLabel="Top Losers"
                    icon={TrendingDown} 
                    isActive={activeCategory === 'LOWS'} 
                    onClick={() => setActiveCategory('LOWS')}
                    colorClass="text-rose-500"
                    bgClass="bg-rose-50 dark:bg-rose-900/20"
                />
                <CategoryButton 
                    label="Dividend Yield" 
                    subLabel="Renda Passiva"
                    icon={DollarSign} 
                    isActive={activeCategory === 'DY'} 
                    onClick={() => setActiveCategory('DY')}
                    colorClass="text-amber-500"
                    bgClass="bg-amber-50 dark:bg-amber-900/20"
                />
                <CategoryButton 
                    label={activeTab === 'fiis' ? 'Descontados' : 'Baratos'} 
                    subLabel={activeTab === 'fiis' ? 'P/VP < 1' : 'P/L Baixo'}
                    icon={Target} 
                    isActive={activeCategory === 'VALUATION'} 
                    onClick={() => setActiveCategory('VALUATION')}
                    colorClass="text-indigo-500"
                    bgClass="bg-indigo-50 dark:bg-indigo-900/20"
                />
            </div>

            {/* Lista de Ativos */}
            <div className="px-1 anim-slide-up">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                        {activeCategory === 'HIGHS' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                        {activeCategory === 'LOWS' && <TrendingDown className="w-4 h-4 text-rose-500" />}
                        {activeCategory === 'DY' && <DollarSign className="w-4 h-4 text-amber-500" />}
                        {activeCategory === 'VALUATION' && <Target className="w-4 h-4 text-indigo-500" />}
                        Resultados
                    </h3>
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                        {displayedAssets.length} Ativos
                    </span>
                </div>

                {loading && !data ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                        ))}
                    </div>
                ) : (
                    <AssetRankingList 
                        assets={displayedAssets} 
                        type={activeTab} 
                        metricType={activeCategory === 'HIGHS' || activeCategory === 'LOWS' ? 'change' : activeCategory === 'DY' ? 'dy' : 'valuation'} 
                        onClick={setSelectedAsset} 
                    />
                )}
            </div>

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && <AssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            </SwipeableModal>
        </div>
    );
};
