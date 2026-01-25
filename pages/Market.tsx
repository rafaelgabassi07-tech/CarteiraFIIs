
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2, TrendingUp, TrendingDown, DollarSign, X, ExternalLink, Target, Search, ArrowRight, Filter, ArrowLeft, Scale, Coins, Award, ArrowUpRight, ArrowDownRight, BarChart2, PieChart, Rocket, Users, Activity, Loader2, Calendar, Briefcase, Zap, Wallet, Banknote } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { SwipeableModal, UpdateReportModal } from '../components/Layout';
import { ScrapeResult, UpdateReportData } from '../types';

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
    type?: 'fii' | 'stock';
    segment?: string;
    vacancy?: number;
    assets_value?: string;
    manager_type?: string;
    management_fee?: string;
    last_dividend?: number;
    properties_count?: number;
    vpa?: number;
    lpa?: number;
    gross_margin?: number;
    cagr_profits?: number;
    net_debt_ebitda?: number;
    ev_ebitda?: number;
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

interface MarketProps {
    refreshSignal: number;
    onLoadingChange?: (isLoading: boolean) => void;
    onStatusUpdate?: (statusNode: React.ReactNode) => void;
}

// --- UTILS ---
const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%`;

// --- COMPONENTS AUXILIARES DO MODAL ---
const BigStat = ({ label, value, colorClass, icon: Icon, subtext }: any) => (
    <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center relative overflow-hidden group flex flex-col justify-center h-28">
        {Icon && <Icon className="absolute top-3 right-3 w-4 h-4 text-zinc-200 dark:text-zinc-800" />}
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className={`text-2xl font-black tracking-tight ${colorClass || 'text-zinc-900 dark:text-white'}`}>{value}</p>
        {subtext && <p className="text-[9px] font-bold text-zinc-300 dark:text-zinc-600 mt-1">{subtext}</p>}
    </div>
);

// --- MODAL DE DETALHES SIMPLIFICADO ---
const AssetDetailModal = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const isFII = asset.type === 'fii' || asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const isPositive = (asset.variation_percent || 0) >= 0;

    return (
        <div className="bg-white dark:bg-zinc-950 min-h-full flex flex-col mt-16 rounded-t-[2.5rem] overflow-hidden shadow-2xl relative">
            {/* Header Sticky Minimalista */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-6 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black border shadow-sm ${isFII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                            {asset.ticker.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight truncate leading-none">{asset.ticker}</h1>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1 truncate max-w-[200px]">{asset.name || (isFII ? 'Fundo Imobiliário' : 'Ação')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-20">
                {/* Hero Section: Preço e Variação */}
                <div className="flex flex-col items-center justify-center py-8 anim-fade-in">
                    <h2 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">{formatCurrency(asset.price || 0)}</h2>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatPercent(asset.variation_percent || 0)} (24h)
                    </div>
                </div>

                {/* Grid de Métricas Chave (Focado em Destaques) */}
                <div className="grid grid-cols-2 gap-3 mb-8 anim-slide-up">
                    <BigStat 
                        label="Dividend Yield" 
                        value={asset.dy_12m ? `${asset.dy_12m.toFixed(2)}%` : '-'} 
                        colorClass="text-emerald-500" 
                        icon={Coins} 
                        subtext="Últimos 12 meses"
                    />
                    
                    {isFII ? (
                        <BigStat 
                            label="P/VP" 
                            value={asset.p_vp?.toFixed(2) || '-'} 
                            icon={Scale} 
                            colorClass={asset.p_vp && asset.p_vp < 1 ? 'text-indigo-500' : undefined}
                            subtext="Preço Justo: 1.00"
                        />
                    ) : (
                        <BigStat 
                            label="P/L" 
                            value={asset.p_l?.toFixed(1) || '-'} 
                            icon={Scale} 
                            subtext="Anos p/ retorno"
                        />
                    )}

                    {isFII ? (
                        <BigStat 
                            label="Último Pagamento" 
                            value={asset.last_dividend ? `R$ ${asset.last_dividend.toFixed(2)}` : '-'} 
                            icon={Banknote} 
                            subtext="Por cota"
                        />
                    ) : (
                        <BigStat 
                            label="ROE" 
                            value={asset.roe ? `${asset.roe.toFixed(1)}%` : '-'} 
                            icon={Activity} 
                            colorClass="text-violet-500"
                            subtext="Rentabilidade"
                        />
                    )}

                    <BigStat 
                        label="Liquidez Diária" 
                        value={asset.liquidity ? `R$ ${(asset.liquidity/1000000).toFixed(1)}M` : '-'} 
                        icon={Users} 
                        subtext="Volume negociado"
                    />
                </div>

                {/* Call to Action - Análise Profunda Externa */}
                <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <a href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest press-effect shadow-xl group">
                        Ver Análise Completa <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <p className="text-[10px] text-center text-zinc-400 mt-4 px-8">
                        Para ver a evolução patrimonial e preço médio, adicione este ativo à sua carteira.
                    </p>
                </div>
            </div>
        </div>
    );
};

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
    const isFii = (a: MarketAsset) => a.type === 'fii';

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
            filterFn: (a) => isFii(a) ? (a.p_vp || 0) > 0 : (a.p_l || 0) > 0,
            sortFn: (a, b) => {
                const valA = isFii(a) ? (a.p_vp || 0) : (a.p_l || 0);
                const valB = isFii(b) ? (b.p_vp || 0) : (b.p_l || 0);
                return valA - valB;
            },
            valueFormatter: (a) => isFii(a) ? `${a.p_vp?.toFixed(2)}x` : `${a.p_l?.toFixed(1)}x`,
            secondaryValue: (a) => isFii(a) ? 'P/VP' : 'P/L'
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

const RankingGridCard = ({ config, onClick }: { config: RankingConfig, onClick: () => void }) => {
    const Icon = config.icon;
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200 dark:border-violet-900/30',
        pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400 border-pink-200 dark:border-pink-900/30',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-900/30',
        cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/30',
        sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border-sky-200 dark:border-sky-900/30',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30',
    };
    const colorClass = colorMap[config.color] || colorMap['indigo'];

    return (
        <button onClick={onClick} className="w-full text-left p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect group relative overflow-hidden h-full flex flex-col justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{config.label}</h3>
                <p className="text-[10px] font-medium text-zinc-400 mt-1">{config.subLabel}</p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            </div>
        </button>
    );
};

const RankingListView = ({ assets, config, onSelect, activeFilter, isSearching }: { assets: MarketAsset[], config: RankingConfig, onSelect: (asset: MarketAsset) => void, activeFilter: string, isSearching: boolean }) => {
    if (assets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center">
                <Filter className="w-12 h-12 text-zinc-300 mb-4" strokeWidth={1} />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {isSearching ? 'Nenhum resultado encontrado' : 'Nenhum ativo neste filtro'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-6">
            {assets.map((asset, index) => {
                const isFii = asset.type === 'fii' || asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
                const secondaryLabel = config.secondaryValue ? config.secondaryValue(asset) : 'Valor';
                
                return (
                    <button 
                        key={asset.ticker} 
                        onClick={() => onSelect(asset)}
                        className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect anim-stagger-item"
                        style={{ animationDelay: `${index * 30}ms` }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-8">
                                <span className={`text-[10px] font-black ${index < 3 ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-600'}`}>
                                    #{index + 1}
                                </span>
                                {index < 3 && <Award className="w-3 h-3 text-amber-500 -mt-0.5" strokeWidth={2.5} />}
                            </div>
                            
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border shadow-sm ${isFii ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                                {asset.ticker.substring(0, 2)}
                            </div>
                            
                            <div className="text-left">
                                <h4 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                    {asset.ticker}
                                </h4>
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-medium text-zinc-400 truncate max-w-[120px]">
                                        {asset.name || (isFii ? 'Fundo Imobiliário' : 'Ação')}
                                    </p>
                                    {asset.segment && (
                                        <p className="text-[8px] font-bold text-zinc-300 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[120px]">
                                            {asset.segment}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-sm font-black text-zinc-900 dark:text-white">
                                {config.valueFormatter(asset)}
                            </div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                                {secondaryLabel}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export const Market: React.FC<MarketProps> = ({ refreshSignal, onLoadingChange, onStatusUpdate }) => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTypeFilter, setActiveTypeFilter] = useState<'fiis' | 'stocks'>('fiis');
    const [selectedSegment, setSelectedSegment] = useState<string>('TODOS');
    const [selectedRanking, setSelectedRanking] = useState<RankingConfig | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- REPORT STATE ---
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [lastReport, setLastReport] = useState<UpdateReportData | null>(null);

    const loadData = async (isManual = false) => {
        setLoading(true);
        if (onLoadingChange) onLoadingChange(true);
        try {
            const result = await fetchMarketOverview();
            // @ts-ignore
            setData(result);
            
            if (isManual && result && !result.error) {
                 const uniqueMap = new Map<string, MarketAsset>();
                 
                 const add = (arr: MarketAsset[]) => arr.forEach(a => uniqueMap.set(a.ticker, a));
                 
                 if (result.highlights) {
                     add(result.highlights.fiis?.gainers || []);
                     add(result.highlights.fiis?.losers || []);
                     add(result.highlights.fiis?.high_yield || []);
                     add(result.highlights.fiis?.discounted || []);
                     add(result.highlights.stocks?.gainers || []);
                     add(result.highlights.stocks?.losers || []);
                     add(result.highlights.stocks?.high_yield || []);
                     add(result.highlights.stocks?.discounted || []);
                 }
                 
                 const results: ScrapeResult[] = Array.from(uniqueMap.values()).map(asset => ({
                     ticker: asset.ticker,
                     status: 'success',
                     sourceMap: { price: 'Investidor10', fundamentals: 'Investidor10' },
                     details: {
                         price: asset.price,
                         dy: asset.dy_12m,
                         pvp: asset.p_vp
                     }
                 }));
                 
                 setLastReport({
                     results,
                     inflationRate: 0,
                     totalDividendsFound: 0
                 });
                 setShowUpdateModal(true);
            }
        } catch (e) { console.error(e); } finally { 
            setLoading(false); 
            if (onLoadingChange) onLoadingChange(false);
        }
    };

    useEffect(() => {
        if (onStatusUpdate) {
            const isOnline = data && !data.error;
            const statusText = data?.error ? 'Modo Offline' : data?.market_status || 'Mercado';
            
            const statusNode = (
                <div className="flex items-center gap-2 px-1 py-0.5">
                    {loading ? (
                        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Atualizando</span>
                        </div>
                    ) : (
                        <>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline && statusText.includes('Aberto') ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                {statusText}
                            </span>
                            {data?.last_update && (
                                <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest ml-1 opacity-70">
                                    • {new Date(data.last_update).toLocaleTimeString().slice(0,5)}
                                </span>
                            )}
                        </>
                    )}
                </div>
            );
            
            onStatusUpdate(statusNode);
        }
    }, [data, loading, onStatusUpdate]);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (refreshSignal && refreshSignal > 0) {
            loadData(true);
        }
    }, [refreshSignal]);

    useEffect(() => {
        setSelectedSegment('TODOS');
    }, [activeTypeFilter]);

    const assetPool = useMemo(() => {
        if (!data || !data.highlights) return [];
        const f = data.highlights.fiis || { gainers: [], losers: [], high_yield: [], discounted: [], raw: [] };
        const s = data.highlights.stocks || { gainers: [], losers: [], high_yield: [], discounted: [], raw: [] };
        
        const mapType = (list: MarketAsset[], type: 'fii' | 'stock') => (list || []).map(a => ({...a, type}));

        const allAssets = [
            ...mapType(f.gainers, 'fii'), ...mapType(f.losers, 'fii'), ...mapType(f.high_yield, 'fii'), ...mapType(f.discounted, 'fii'), ...mapType(f.raw || [], 'fii'),
            ...mapType(s.gainers, 'stock'), ...mapType(s.losers, 'stock'), ...mapType(s.high_yield, 'stock'), ...mapType(s.discounted, 'stock'), ...mapType(s.raw || [], 'stock')
        ];
        
        const unique = new Map();
        allAssets.forEach(item => unique.set(item.ticker, item));
        return Array.from(unique.values());
    }, [data]);

    const availableSegments = useMemo(() => {
        if (!selectedRanking) return [];
        const baseList = assetPool.filter(a => activeTypeFilter === 'fiis' ? a.type === 'fii' : a.type === 'stock');
        // Filtra pelo ranking primeiro para mostrar apenas segmentos relevantes
        const rankedList = baseList.filter(selectedRanking.filterFn);
        // Garante que se 'segment' for undefined, ele vire 'Outros' para a UI
        const segments = new Set(rankedList.map(a => a.segment || 'Outros').filter(Boolean));
        return Array.from(segments).sort();
    }, [assetPool, activeTypeFilter, selectedRanking]);

    const currentList = useMemo(() => {
        if (!selectedRanking) return [];
        
        let list = assetPool.filter(a => {
            if (activeTypeFilter === 'fiis') return a.type === 'fii';
            if (activeTypeFilter === 'stocks') return a.type === 'stock';
            return true;
        });

        if (searchTerm.trim()) {
            const term = searchTerm.toUpperCase();
            return list.filter(a => a.ticker.includes(term) || a.name.toUpperCase().includes(term))
                       .sort((a, b) => a.ticker.localeCompare(b.ticker));
        }

        list = list.filter(selectedRanking.filterFn);

        if (selectedSegment !== 'TODOS') {
            list = list.filter(a => (a.segment || 'Outros') === selectedSegment);
        }
        
        return list.sort(selectedRanking.sortFn);
    }, [assetPool, selectedRanking, searchTerm, activeTypeFilter, selectedSegment]);

    const rankings = getRankings();

    return (
        <div className="pb-32 min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {selectedRanking && (
                <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-2 mb-6">
                    <div className="flex flex-col gap-4 anim-slide-in-right pt-2 pb-1">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSelectedRanking(null); setSearchTerm(''); setActiveTypeFilter('fiis'); setSelectedSegment('TODOS'); }} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center press-effect">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedRanking.label}</h2>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Top Rankings</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl relative">
                                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`} 
                                     style={{ left: '4px', transform: `translateX(${activeTypeFilter === 'fiis' ? '0%' : '100%'})` }}>
                                </div>
                                <button onClick={() => setActiveTypeFilter('fiis')} className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${activeTypeFilter === 'fiis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>FIIs</button>
                                <button onClick={() => setActiveTypeFilter('stocks')} className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${activeTypeFilter === 'stocks' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>Ações</button>
                            </div>

                            {/* Barra de Segmentos (Scroll Horizontal) */}
                            {!searchTerm && availableSegments.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
                                    <button 
                                        onClick={() => setSelectedSegment('TODOS')}
                                        className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${selectedSegment === 'TODOS' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                                    >
                                        Todos
                                    </button>
                                    {availableSegments.map(seg => (
                                        <button 
                                            key={seg}
                                            onClick={() => setSelectedSegment(seg)}
                                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${selectedSegment === seg ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-700'}`}
                                        >
                                            {seg}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder={`Buscar em ${selectedRanking.label}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500/50 pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none shadow-sm transition-all"
                                    autoCorrect="off"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-1 min-h-[50vh]">
                {loading && !data ? (
                    <div className="grid grid-cols-2 gap-3 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-3xl border border-zinc-300/20 dark:border-zinc-700/20"></div>
                        ))}
                    </div>
                ) : selectedRanking ? (
                    <div className="anim-slide-up">
                        <RankingListView 
                            assets={currentList} 
                            config={selectedRanking} 
                            onSelect={setSelectedAsset} 
                            activeFilter={activeTypeFilter}
                            isSearching={searchTerm.length > 0}
                        />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 anim-stagger-list pb-6">
                            {rankings.map((ranking, index) => (
                                <div key={ranking.id} className="anim-stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                                    <RankingGridCard 
                                        config={ranking} 
                                        onClick={() => setSelectedRanking(ranking)} 
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            </SwipeableModal>

            {lastReport && (
                <UpdateReportModal 
                    isOpen={showUpdateModal} 
                    onClose={() => setShowUpdateModal(false)} 
                    results={lastReport} 
                />
            )}
        </div>
    );
};
