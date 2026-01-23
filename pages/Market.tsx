
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Building2, TrendingUp, TrendingDown, DollarSign, Percent, X, ExternalLink, Activity, BarChart3, Clock, ArrowRight, Zap, Target } from 'lucide-react';
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

// --- SUB-COMPONENTS FOR MODAL ---

const ValuationBar = ({ value, label, type }: { value: number, label: string, type: 'pvp' | 'pl' }) => {
    // Lógica visual para P/VP: < 1 (Barato/Verde), 1 (Justo/Cinza), > 1 (Caro/Laranja)
    // Para P/L, é relativo, então usamos uma escala simples.
    
    let percentage = 50;
    let colorClass = 'bg-zinc-300 dark:bg-zinc-700';
    let statusText = 'Neutro';

    if (type === 'pvp') {
        // Escala: 0.5 (0%) a 1.5 (100%). 1.0 é 50%.
        percentage = Math.min(Math.max(((value - 0.5) / 1) * 100, 0), 100);
        
        if (value < 0.95) { colorClass = 'bg-emerald-500'; statusText = 'Descontado'; }
        else if (value > 1.05) { colorClass = 'bg-rose-500'; statusText = 'Prêmio'; }
        else { colorClass = 'bg-amber-500'; statusText = 'Preço Justo'; }
    } else {
        // P/L (Lógica simplificada visual)
        percentage = Math.min(Math.max((value / 20) * 100, 10), 100);
        statusText = 'Multiplo';
        colorClass = 'bg-sky-500';
    }

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <div className="text-right">
                    <span className="text-xs font-black text-zinc-900 dark:text-white block">{value.toFixed(2)}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wide ${type === 'pvp' && value < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>{statusText}</span>
                </div>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            {type === 'pvp' && (
                <div className="flex justify-between text-[8px] text-zinc-300 font-medium px-0.5">
                    <span>Barato</span>
                    <span>Caro</span>
                </div>
            )}
        </div>
    );
};

const StatBox = ({ icon: Icon, label, value, subtext, highlight = false }: any) => (
    <div className={`p-4 rounded-2xl border flex flex-col justify-between h-24 ${highlight ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
        <div className="flex justify-between items-start">
            <span className={`text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>{label}</span>
            <Icon className={`w-4 h-4 ${highlight ? 'text-indigo-500' : 'text-zinc-300'}`} />
        </div>
        <div>
            <span className={`text-xl font-black tracking-tight ${highlight ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-900 dark:text-white'}`}>{value}</span>
            {subtext && <p className={`text-[9px] font-medium mt-0.5 ${highlight ? 'text-indigo-600/70 dark:text-indigo-300/70' : 'text-zinc-400'}`}>{subtext}</p>}
        </div>
    </div>
);

// --- MODAL COMPONENT ---

const MarketAssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const typeLabel = isFii ? 'Fundo Imobiliário' : 'Ação';
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    // Tags de Análise Automática
    const tags = [];
    if (asset.dy_12m && asset.dy_12m > 10) tags.push({ label: 'High Yield', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' });
    if (isFii && asset.p_vp && asset.p_vp < 0.90) tags.push({ label: 'Descontado', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' });
    if (asset.variation_percent && Math.abs(asset.variation_percent) > 2) tags.push({ label: 'Alta Volatilidade', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' });

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Navbar Modal */}
            <div className="sticky top-0 z-20 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-md px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h2>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{typeLabel}</span>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 pb-12 space-y-6">
                
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center py-4 anim-scale-in">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border shadow-xl mb-4 ${isFii ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">
                        R$ {asset.price.toFixed(2)}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        {asset.variation_percent !== undefined && (
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${asset.variation_percent >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                {asset.variation_percent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(asset.variation_percent).toFixed(2)}%
                            </div>
                        )}
                        <span className="text-[10px] font-medium text-zinc-400">hoje</span>
                    </div>

                    {/* Tags Dinâmicas */}
                    {tags.length > 0 && (
                        <div className="flex gap-2 mt-4 flex-wrap justify-center">
                            {tags.map((tag, i) => (
                                <span key={i} className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${tag.color}`}>
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Valuation Analysis */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm anim-slide-up">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-500" /> Análise de Valor
                    </h4>
                    <div className="space-y-5">
                        {asset.p_vp !== undefined && asset.p_vp > 0 && (
                            <ValuationBar value={asset.p_vp} label="Preço / VP" type="pvp" />
                        )}
                        {!isFii && asset.p_l !== undefined && asset.p_l > 0 && (
                            <ValuationBar value={asset.p_l} label="Preço / Lucro (P/L)" type="pl" />
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    {asset.dy_12m !== undefined && (
                        <StatBox 
                            icon={DollarSign} 
                            label="Dividend Yield" 
                            value={`${asset.dy_12m.toFixed(2)}%`} 
                            subtext="Últimos 12 meses"
                            highlight
                        />
                    )}
                    <StatBox 
                        icon={Building2} 
                        label="Nome" 
                        value={asset.name.split(' ')[0]} 
                        subtext={asset.name.length > 15 ? asset.name.substring(0, 15) + '...' : asset.name}
                    />
                </div>

                {/* Footer Action */}
                <div className="mt-auto pt-4">
                    <a href={url} target="_blank" rel="noreferrer" className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 press-effect hover:shadow-2xl transition-all group">
                        Mais Detalhes <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <p className="text-center text-[9px] text-zinc-400 mt-3 font-medium">
                        Dados fornecidos por Investidor10
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- LIST ITEM COMPONENT ---

interface AssetListItemProps {
    item: MarketAsset;
    type: 'up' | 'down' | 'neutral' | 'dividend' | 'discount';
    metricLabel?: string;
    metricValue?: string;
    onClick: (item: MarketAsset) => void;
    index: number;
}

const AssetListItem: React.FC<AssetListItemProps> = ({ item, type, metricLabel, metricValue, onClick, index }) => {
    let accentColor = 'text-zinc-500';
    let iconBg = 'bg-zinc-100 dark:bg-zinc-800';
    let Icon = Activity;
    
    if (type === 'up') { accentColor = 'text-emerald-500'; iconBg = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'; Icon = TrendingUp; }
    if (type === 'down') { accentColor = 'text-rose-500'; iconBg = 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'; Icon = TrendingDown; }
    if (type === 'dividend') { accentColor = 'text-amber-500'; iconBg = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'; Icon = DollarSign; }
    if (type === 'discount') { accentColor = 'text-indigo-500'; iconBg = 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'; Icon = Percent; }

    return (
        <button 
            onClick={() => onClick(item)} 
            className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl mb-2 press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm anim-stagger-item"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border border-transparent ${iconBg}`}>
                    {item.ticker.substring(0,2)}
                </div>
                <div className="text-left">
                    <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.ticker}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block truncate max-w-[100px]">
                        {item.name.split(' ')[0]}
                    </span>
                </div>
            </div>
            
            <div className="text-right">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">R$ {item.price.toFixed(2)}</span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                    {metricLabel && <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mr-1">{metricLabel}</span>}
                    <span className={`text-[10px] font-black flex items-center gap-0.5 ${accentColor}`}>
                        {type === 'up' || type === 'down' ? <Icon className="w-2.5 h-2.5" /> : null}
                        {metricValue || (item.variation_percent ? `${Math.abs(item.variation_percent).toFixed(2)}%` : '-')}
                    </span>
                </div>
            </div>
        </button>
    );
};

// --- MAIN PAGE ---

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState<'fiis' | 'stocks'>('fiis');
    const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await fetchMarketOverview();
            // @ts-ignore
            if (result.error) throw new Error(result.message);
            // @ts-ignore
            setData(result);
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const currentData = data?.highlights?.[activeTab];

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sticky com Seletor de Abas */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">
                            Mercado
                        </h2>
                        {data && !loading && (
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${data.market_status === 'Aberto' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
                                {data.market_status} • {new Date(data.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        )}
                    </div>
                    <button onClick={loadData} disabled={loading} className={`w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-95'}`}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
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
                        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                    </div>
                    <div className="space-y-2">
                        {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>)}
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-60">
                    <AlertTriangle className="w-10 h-10 mb-2 text-zinc-300" />
                    <p className="text-xs font-bold text-zinc-500">Erro ao carregar dados.</p>
                </div>
            ) : currentData ? (
                <div className="space-y-8 px-1">
                    
                    {/* Seção 1: Destaques (Grid) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-500" /> Altas
                            </h3>
                            <div className="space-y-0">
                                {currentData.gainers.slice(0, 3).map((item, i) => (
                                    <AssetListItem key={i} index={i} item={item} type="up" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                <TrendingDown className="w-3 h-3 text-rose-500" /> Baixas
                            </h3>
                            <div className="space-y-0">
                                {currentData.losers.slice(0, 3).map((item, i) => (
                                    <AssetListItem key={i} index={i} item={item} type="down" onClick={setSelectedAsset} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Oportunidades (List) */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-indigo-500" /> 
                                {activeTab === 'fiis' ? 'Oportunidades (P/VP)' : 'Oportunidades (P/L)'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-0">
                            {currentData.discounted.map((item, i) => (
                                <AssetListItem 
                                    key={i} 
                                    index={i + 3}
                                    item={item} 
                                    type="discount" 
                                    metricLabel={activeTab === 'fiis' ? 'P/VP' : 'P/L'}
                                    metricValue={activeTab === 'fiis' ? item.p_vp?.toFixed(2) : item.p_l?.toFixed(1)}
                                    onClick={setSelectedAsset}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Seção 3: Dividendos (List) */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <DollarSign className="w-3 h-3 text-amber-500" /> Top Dividendos (12m)
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-0">
                            {currentData.high_yield.map((item, i) => (
                                <AssetListItem 
                                    key={i} 
                                    index={i + 6}
                                    item={item} 
                                    type="dividend" 
                                    metricLabel="DY"
                                    metricValue={`${item.dy_12m?.toFixed(1)}%`}
                                    onClick={setSelectedAsset}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="text-center py-4">
                        <p className="text-[9px] text-zinc-300 dark:text-zinc-600 font-medium">
                            Fonte: Investidor10 • Variação de 15 min
                        </p>
                    </div>
                </div>
            ) : null}

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && <MarketAssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            </SwipeableModal>
        </div>
    );
};
