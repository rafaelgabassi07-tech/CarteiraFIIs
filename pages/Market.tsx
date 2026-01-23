
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2, TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Target, Search, ArrowRight, Filter, ArrowLeft, Percent, BarChart3, Scale, Coins, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    roe?: number; // Adicionado para compatibilidade futura
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

// --- CONFIGURAÇÃO DAS CATEGORIAS DE RANKING ---
type RankingType = 'VALUATION_GRAHAM' | 'VALUATION_BAZIN' | 'DY' | 'HIGH' | 'LOW' | 'P_VP' | 'P_L';

interface RankingConfig {
    id: RankingType;
    label: string;
    subLabel?: string; // Tagzinha estilo "Graham"
    icon: any;
    color: string; // Tailwind color class base (ex: 'emerald')
    filterFn: (asset: MarketAsset) => boolean;
    sortFn: (a: MarketAsset, b: MarketAsset) => number;
    valueFormatter: (asset: MarketAsset) => React.ReactNode;
    secondaryValue?: (asset: MarketAsset) => string;
}

const getRankings = (assetType: 'fiis' | 'stocks'): RankingConfig[] => [
    {
        id: 'DY',
        label: 'Dividend Yield',
        icon: DollarSign,
        color: 'emerald',
        filterFn: (a) => (a.dy_12m || 0) > 0,
        sortFn: (a, b) => (b.dy_12m || 0) - (a.dy_12m || 0),
        valueFormatter: (a) => `${a.dy_12m?.toFixed(2)}%`,
        secondaryValue: (a) => 'Retorno 12m'
    },
    {
        id: assetType === 'fiis' ? 'P_VP' : 'VALUATION_GRAHAM',
        label: assetType === 'fiis' ? 'Mais Baratas (P/VP)' : 'Mais Baratas',
        subLabel: assetType === 'stocks' ? 'Graham' : undefined,
        icon: Scale,
        color: 'indigo',
        filterFn: (a) => assetType === 'fiis' ? (a.p_vp || 0) > 0 : (a.p_l || 0) > 0 && (a.p_vp || 0) > 0,
        sortFn: (a, b) => assetType === 'fiis' ? (a.p_vp || 0) - (b.p_vp || 0) : ((a.p_l || 0) * (a.p_vp || 0)) - ((b.p_l || 0) * (b.p_vp || 0)), // Graham simplificado (menor VI)
        valueFormatter: (a) => assetType === 'fiis' ? `${a.p_vp?.toFixed(2)}x` : `P/L ${a.p_l?.toFixed(1)}`,
        secondaryValue: (a) => assetType === 'fiis' ? 'Val. Patrimonial' : `P/VP ${a.p_vp?.toFixed(2)}`
    },
    {
        id: assetType === 'fiis' ? 'VALUATION_BAZIN' : 'P_L',
        label: assetType === 'fiis' ? 'Melhores Oportunidades' : 'Menores PLs',
        subLabel: assetType === 'fiis' ? 'Bazin' : undefined, // Visual apenas
        icon: Coins,
        color: 'amber',
        filterFn: (a) => assetType === 'fiis' ? (a.dy_12m || 0) > 6 : (a.p_l || 0) > 0,
        sortFn: (a, b) => assetType === 'fiis' ? (b.dy_12m || 0) - (a.dy_12m || 0) : (a.p_l || 0) - (b.p_l || 0),
        valueFormatter: (a) => assetType === 'fiis' ? `${a.dy_12m?.toFixed(2)}%` : `${a.p_l?.toFixed(2)}x`,
        secondaryValue: (a) => assetType === 'fiis' ? 'Yield Seguro' : 'Anos retorno'
    },
    {
        id: 'HIGH',
        label: 'Maiores Altas',
        subLabel: 'Últ. 24h',
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
        subLabel: 'Últ. 24h',
        icon: TrendingDown,
        color: 'rose',
        filterFn: (a) => (a.variation_percent || 0) < 0,
        sortFn: (a, b) => (a.variation_percent || 0) - (b.variation_percent || 0), // Menor (mais negativo) primeiro
        valueFormatter: (a) => (
            <span className="text-rose-500 font-bold flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" /> {Math.abs(a.variation_percent || 0).toFixed(2)}%
            </span>
        ),
        secondaryValue: (a) => `R$ ${a.price.toFixed(2)}`
    },
    {
        id: 'VALUATION_BAZIN', // Placeholder para "Mais Queridas" ou outro
        label: 'Mais Populares',
        icon: Award,
        color: 'purple',
        filterFn: (a) => true, // Mock: mostraria liquidez se tivesse
        sortFn: (a, b) => (a.price || 0) - (b.price || 0), // Mock: ordena por preço
        valueFormatter: (a) => `R$ ${a.price.toFixed(2)}`,
        secondaryValue: () => 'Alta Liquidez'
    }
];

// --- UTILS ---
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- COMPONENTS ---

// 1. Grid Card (O botão quadrado da home)
const RankingGridCard = ({ config, onClick }: { config: RankingConfig, onClick: () => void }) => {
    const Icon = config.icon;
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    };
    
    const themeClass = colors[config.color] || colors.emerald;

    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect h-36 relative group overflow-hidden"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${themeClass}`}>
                <Icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-white text-center leading-tight max-w-[90%]">
                {config.label}
            </span>
            {config.subLabel && (
                <span className="mt-1.5 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-wider text-zinc-500 rounded-md">
                    {config.subLabel}
                </span>
            )}
        </button>
    );
};

// 2. Lista de Detalhes (A tabela que abre)
const RankingListView = ({ assets, config, onSelect }: { assets: MarketAsset[], config: RankingConfig, onSelect: (a: MarketAsset) => void }) => {
    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 min-h-full">
            {/* Table Header */}
            <div className="flex items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                <div className="w-10 text-[10px] font-black text-zinc-400 uppercase">#</div>
                <div className="flex-1 text-[10px] font-black text-zinc-400 uppercase">Ativo</div>
                <div className="w-24 text-right text-[10px] font-black text-zinc-400 uppercase">{config.label.split(' ')[0]}</div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {assets.map((asset, index) => (
                    <button 
                        key={asset.ticker}
                        onClick={() => onSelect(asset)}
                        className="w-full flex items-center px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="w-10 text-xs font-black text-zinc-400">{index + 1}</div>
                        <div className="flex-1 flex flex-col items-start">
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">{asset.name.split(' ')[0]}</span>
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
                ))}
            </div>
            
            {assets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Filter className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                    <p className="text-xs font-bold text-zinc-500">Nenhum ativo neste ranking</p>
                </div>
            )}
        </div>
    );
};

// --- MODAL DETALHADO DO ATIVO ---
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
                <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Liquidez</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">Média Diária</span>
                </div>
            </div>

            <a href={url} target="_blank" rel="noreferrer" className="mt-auto w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl press-effect flex items-center justify-center gap-2">
                Análise Completa <ExternalLink className="w-4 h-4" />
            </a>
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fiis' | 'stocks'>('fiis');
    
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

    // Agrega todos os ativos disponíveis para permitir reordenação flexível
    // (A API retorna listas parciais, então juntamos tudo num pool único por tipo)
    const assetPool = useMemo(() => {
        if (!data) return [];
        const raw = data.highlights[activeTab];
        // Junta todas as listas e remove duplicatas por ticker
        const all = [...raw.gainers, ...raw.losers, ...raw.high_yield, ...raw.discounted];
        const unique = new Map();
        all.forEach(item => unique.set(item.ticker, item));
        return Array.from(unique.values());
    }, [data, activeTab]);

    // Aplica filtro e ordenação do ranking selecionado
    const currentList = useMemo(() => {
        if (!selectedRanking) return [];
        let list = assetPool.filter(selectedRanking.filterFn);
        
        if (searchTerm) {
            const term = searchTerm.toUpperCase();
            list = list.filter(a => a.ticker.includes(term) || a.name.toUpperCase().includes(term));
        }

        return list.sort(selectedRanking.sortFn);
    }, [assetPool, selectedRanking, searchTerm]);

    const rankings = getRankings(activeTab);

    return (
        <div className="pb-32 min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header Sticky */}
            <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-6">
                
                {selectedRanking ? (
                    // Header de Drill-down (Quando dentro de um ranking)
                    <div className="flex items-center gap-3 py-1 anim-slide-in-right">
                        <button onClick={() => { setSelectedRanking(null); setSearchTerm(''); }} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center press-effect">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedRanking.label}</h2>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{activeTab === 'fiis' ? 'FIIs' : 'Ações'} • {currentList.length} Ativos</p>
                        </div>
                    </div>
                ) : (
                    // Header Principal
                    <div className="anim-fade-in">
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

                        {/* Filtro FIIs vs Ações */}
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
                )}
                
                {/* Search Bar (Visível apenas dentro da lista) */}
                {selectedRanking && (
                    <div className="relative group mt-3 anim-slide-up">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder={`Filtrar lista de ${selectedRanking.label}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500/50 pl-10 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none shadow-sm transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Conteúdo */}
            <div className="px-1 min-h-[50vh]">
                {loading && !data ? (
                    <div className="grid grid-cols-2 gap-3 animate-pulse">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-36 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                        ))}
                    </div>
                ) : selectedRanking ? (
                    <div className="anim-slide-up">
                        <RankingListView 
                            assets={currentList} 
                            config={selectedRanking} 
                            onSelect={setSelectedAsset} 
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 anim-stagger-list">
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
