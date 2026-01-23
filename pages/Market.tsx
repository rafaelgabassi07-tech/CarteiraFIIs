
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2, TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Target, Search, ArrowRight, Filter, ArrowLeft, Scale, Coins, Award, ArrowUpRight, ArrowDownRight, BarChart2, PieChart, Rocket, Users, Activity } from 'lucide-react';
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
    roe?: number;
    net_margin?: number;
    cagr_revenue?: number;
    liquidity?: number;
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
            raw?: MarketAsset[];
        };
        stocks: {
            gainers: MarketAsset[];
            losers: MarketAsset[];
            high_yield: MarketAsset[];
            discounted: MarketAsset[];
            raw?: MarketAsset[];
        };
    };
    error?: boolean;
}

// --- CONFIGURAÇÃO DAS CATEGORIAS DE RANKING ---
type RankingType = 'VALUATION' | 'DY' | 'HIGH' | 'LOW' | 'ROE' | 'MARGIN' | 'GROWTH' | 'LIQUIDITY';

interface RankingConfig {
    id: RankingType;
    label: string;
    subLabel?: string;
    icon: any;
    color: string;
    filterFn: (asset: MarketAsset) => boolean;
    sortFn: (a: MarketAsset, b: MarketAsset) => number;
    valueFormatter: (asset: MarketAsset) => React.ReactNode;
    secondaryValue?: (asset: MarketAsset) => string;
}

const getRankings = (): RankingConfig[] => {
    // Helper para verificar tipo
    const isFii = (t: string) => t.endsWith('11') || t.endsWith('11B');

    return [
        {
            id: 'DY',
            label: 'Dividend Yield',
            subLabel: 'Maiores Pagadores',
            icon: DollarSign,
            color: 'emerald',
            filterFn: (a) => (a.dy_12m || 0) > 0,
            sortFn: (a, b) => (b.dy_12m || 0) - (a.dy_12m || 0),
            valueFormatter: (a) => `${a.dy_12m?.toFixed(2)}%`,
            secondaryValue: (a) => 'Retorno 12m'
        },
        {
            id: 'VALUATION',
            label: 'Mais Baratas',
            subLabel: 'P/L e P/VP',
            icon: Scale,
            color: 'indigo',
            // Filtra: P/VP positivo para FIIs, P/L positivo para Ações
            filterFn: (a) => isFii(a.ticker) ? (a.p_vp || 0) > 0 : (a.p_l || 0) > 0,
            // Ordena: P/VP para FIIs, P/L para Ações
            sortFn: (a, b) => {
                const valA = isFii(a.ticker) ? (a.p_vp || 0) : (a.p_l || 0);
                const valB = isFii(b.ticker) ? (b.p_vp || 0) : (b.p_l || 0);
                return valA - valB;
            },
            valueFormatter: (a) => isFii(a.ticker) ? `${a.p_vp?.toFixed(2)}x` : `${a.p_l?.toFixed(1)}x`,
            secondaryValue: (a) => isFii(a.ticker) ? 'P/VP' : 'P/L'
        },
        {
            id: 'ROE',
            label: 'Rentabilidade',
            subLabel: 'Maiores ROEs',
            icon: Activity,
            color: 'violet',
            filterFn: (a) => (a.roe || 0) > 0,
            sortFn: (a, b) => (b.roe || 0) - (a.roe || 0),
            valueFormatter: (a) => `${a.roe?.toFixed(1)}%`,
            secondaryValue: (a) => 'ROE'
        },
        {
            id: 'MARGIN',
            label: 'Eficiência',
            subLabel: 'Margem Líquida',
            icon: PieChart,
            color: 'pink',
            filterFn: (a) => (a.net_margin || 0) > 0,
            sortFn: (a, b) => (b.net_margin || 0) - (a.net_margin || 0),
            valueFormatter: (a) => `${a.net_margin?.toFixed(1)}%`,
            secondaryValue: (a) => 'Mg. Líquida'
        },
        {
            id: 'GROWTH',
            label: 'Crescimento',
            subLabel: 'Cresc. 5 Anos',
            icon: Rocket,
            color: 'orange',
            filterFn: (a) => (a.cagr_revenue || 0) > 0,
            sortFn: (a, b) => (b.cagr_revenue || 0) - (a.cagr_revenue || 0),
            valueFormatter: (a) => `${a.cagr_revenue?.toFixed(1)}%`,
            secondaryValue: (a) => 'CAGR'
        },
        {
            id: 'LIQUIDITY',
            label: 'Mais Negociadas',
            subLabel: 'Alta Liquidez',
            icon: Users,
            color: 'cyan',
            filterFn: (a) => (a.liquidity || 0) > 0,
            sortFn: (a, b) => (b.liquidity || 0) - (a.liquidity || 0),
            valueFormatter: (a) => `${((a.liquidity || 0)/1000000).toFixed(1)}M`,
            secondaryValue: (a) => 'Vol. Diário'
        },
        {
            id: 'HIGH',
            label: 'Maiores Altas',
            subLabel: 'Últimas 24h',
            icon: TrendingUp,
            color: 'sky',
            filterFn: (a) => (a.variation_percent || 0) > 0,
            sortFn: (a, b) => (b.variation_percent || 0) - (a.variation_percent || 0),
            valueFormatter: (a) => (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> {a.variation_percent?.toFixed(2)}%
                </span>
            ),
            secondaryValue: (a) => `R$ ${a.price.toFixed(2)}`
        },
        {
            id: 'LOW',
            label: 'Maiores Baixas',
            subLabel: 'Últimas 24h',
            icon: TrendingDown,
            color: 'rose',
            filterFn: (a) => (a.variation_percent || 0) < 0,
            sortFn: (a, b) => (a.variation_percent || 0) - (b.variation_percent || 0),
            valueFormatter: (a) => (
                <span className="text-rose-500 font-bold flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> {Math.abs(a.variation_percent || 0).toFixed(2)}%
                </span>
            ),
            secondaryValue: (a) => `R$ ${a.price.toFixed(2)}`
        }
    ];
};

// --- UTILS ---
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- COMPONENTS ---

const RankingGridCard = ({ config, onClick }: { config: RankingConfig, onClick: () => void }) => {
    const Icon = config.icon;
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
        pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
    };
    
    const themeClass = colors[config.color] || colors.emerald;

    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect h-32 w-full relative group overflow-hidden"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${themeClass}`}>
                <Icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-zinc-900 dark:text-white text-center leading-tight max-w-[90%]">
                {config.label}
            </span>
            {config.subLabel && (
                <span className="mt-1 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-wider text-zinc-400 rounded-md">
                    {config.subLabel}
                </span>
            )}
        </button>
    );
};

const RankingListView = ({ assets, config, onSelect, activeFilter }: { assets: MarketAsset[], config: RankingConfig, onSelect: (a: MarketAsset) => void, activeFilter: string }) => {
    // Contagem para feedback visual
    const fiiCount = assets.filter(a => a.ticker.endsWith('11') || a.ticker.endsWith('11B')).length;
    const stockCount = assets.length - fiiCount;

    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 min-h-full">
            <div className="flex flex-col px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex justify-between items-end mb-2">
                    <div className="flex gap-4">
                        <div className="w-8 text-[10px] font-black text-zinc-400 uppercase">#</div>
                        <div className="text-[10px] font-black text-zinc-400 uppercase">Ativo</div>
                    </div>
                    <div className="w-20 text-right text-[10px] font-black text-zinc-400 uppercase">{config.label.split(' ')[0]}</div>
                </div>
                
                {/* Micro-Resumo da Lista */}
                <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                    <span>{assets.length} Itens</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                    <span>
                        {activeFilter === 'ALL' ? `${stockCount} Ações • ${fiiCount} FIIs` : 
                         activeFilter === 'fiis' ? 'Apenas FIIs' : 'Apenas Ações'}
                    </span>
                </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {assets.map((asset, index) => {
                    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
                    return (
                        <button 
                            key={asset.ticker}
                            onClick={() => onSelect(asset)}
                            className="w-full flex items-center px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                            <div className="w-8 text-xs font-black text-zinc-400">{index + 1}</div>
                            <div className="flex-1 flex flex-col items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                                    <span className={`text-[8px] font-bold px-1.5 rounded ${isFii ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                                        {isFii ? 'FII' : 'AÇÃO'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">{asset.name}</span>
                            </div>
                            <div className="w-28 flex flex-col items-end">
                                <span className="text-sm font-black text-zinc-900 dark:text-white">
                                    {config.valueFormatter(asset)}
                                </span>
                                {config.secondaryValue && (
                                    <span className="text-[9px] font-medium text-zinc-400">
                                        {config.secondaryValue(asset)}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            
            {assets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Filter className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                    <p className="text-xs font-bold text-zinc-500">Nenhum ativo encontrado</p>
                </div>
            )}
        </div>
    );
};

const AssetDetailModal = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
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
                <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{isFii ? 'P/VP' : 'P/L'}</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-white">{isFii ? asset.p_vp?.toFixed(2) : asset.p_l?.toFixed(2)}x</span>
                </div>
                {asset.roe !== undefined && (
                    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center shadow-sm">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">ROE</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{asset.roe.toFixed(2)}%</span>
                    </div>
                )}
                {asset.liquidity !== undefined && (
                    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center shadow-sm">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Liquidez</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(asset.liquidity)}</span>
                    </div>
                )}
            </div>

            <a href={url} target="_blank" rel="noreferrer" className="mt-auto w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl press-effect flex items-center justify-center gap-2">
                Análise Completa <ExternalLink className="w-4 h-4" />
            </a>
        </div>
    );
};

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTypeFilter, setActiveTypeFilter] = useState<'ALL' | 'fiis' | 'stocks'>('ALL');
    
    // Estado de Navegação Interna
    const [selectedRanking, setSelectedRanking] = useState<RankingConfig | null>(null);
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

    const assetPool = useMemo(() => {
        if (!data) return [];
        const f = data.highlights.fiis;
        const s = data.highlights.stocks;
        
        // Combina todas as listas em um único array, incluindo dados RAW que agora contêm métricas avançadas
        const allAssets = [
            ...f.gainers, ...f.losers, ...f.high_yield, ...f.discounted, ...(f.raw || []),
            ...s.gainers, ...s.losers, ...s.high_yield, ...s.discounted, ...(s.raw || [])
        ];
        
        // Remove duplicatas
        const unique = new Map();
        allAssets.forEach(item => unique.set(item.ticker, item));
        return Array.from(unique.values());
    }, [data]);

    const currentList = useMemo(() => {
        if (!selectedRanking) return [];
        
        let list = assetPool.filter(a => {
            const isFii = a.ticker.endsWith('11') || a.ticker.endsWith('11B');
            if (activeTypeFilter === 'fiis') return isFii;
            if (activeTypeFilter === 'stocks') return !isFii;
            return true;
        });

        list = list.filter(selectedRanking.filterFn);
        
        if (searchTerm) {
            const term = searchTerm.toUpperCase();
            list = list.filter(a => a.ticker.includes(term) || a.name.toUpperCase().includes(term));
        }

        return list.sort(selectedRanking.sortFn);
    }, [assetPool, selectedRanking, searchTerm, activeTypeFilter]);

    const rankings = getRankings();

    return (
        <div className="pb-32 min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header Sticky SEM TÍTULO DUPLICADO */}
            <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-2 mb-6">
                
                {selectedRanking ? (
                    // HEADER INTERNO (Dentro de uma categoria)
                    <div className="flex flex-col gap-4 anim-slide-in-right pt-2 pb-1">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSelectedRanking(null); setSearchTerm(''); setActiveTypeFilter('ALL'); }} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center press-effect">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedRanking.label}</h2>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Top Rankings</p>
                            </div>
                        </div>

                        {/* Filtros de Segmento + Busca Inline */}
                        <div className="space-y-3">
                            <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl relative">
                                <div className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`} 
                                     style={{ left: '4px', transform: `translateX(${activeTypeFilter === 'ALL' ? '0%' : activeTypeFilter === 'fiis' ? '100%' : '200%'})` }}>
                                </div>
                                <button onClick={() => setActiveTypeFilter('ALL')} className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${activeTypeFilter === 'ALL' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Todos</button>
                                <button onClick={() => setActiveTypeFilter('fiis')} className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${activeTypeFilter === 'fiis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>FIIs</button>
                                <button onClick={() => setActiveTypeFilter('stocks')} className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${activeTypeFilter === 'stocks' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>Ações</button>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder={`Buscar em ${selectedRanking.label}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500/50 pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none shadow-sm transition-all"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // HEADER PRINCIPAL (Grid) - Apenas Status
                    <div className="anim-fade-in flex justify-between items-center py-1">
                        <div className="flex items-center gap-2 px-1">
                            <span className={`w-2 h-2 rounded-full ${data && !data.error ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                {data ? (data.error ? 'Modo Offline' : 'Mercado Aberto') : 'Sincronizando...'}
                            </p>
                        </div>
                        <button onClick={loadData} disabled={loading} className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-95'}`}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                )}
            </div>

            {/* Conteúdo */}
            <div className="px-1 min-h-[50vh]">
                {loading && !data ? (
                    <div className="grid grid-cols-2 gap-3 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-3xl"></div>
                        ))}
                    </div>
                ) : selectedRanking ? (
                    <div className="anim-slide-up">
                        <RankingListView 
                            assets={currentList} 
                            config={selectedRanking} 
                            onSelect={setSelectedAsset} 
                            activeFilter={activeTypeFilter}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 anim-stagger-list pb-20">
                        {rankings.map((ranking, index) => (
                            <div key={ranking.id} className="anim-stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                                <RankingGridCard 
                                    config={ranking} 
                                    onClick={() => setSelectedRanking(ranking)} 
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            </SwipeableModal>
        </div>
    );
};
