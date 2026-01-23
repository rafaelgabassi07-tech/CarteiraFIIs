
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Sparkles, Building2, TrendingUp, TrendingDown, DollarSign, Percent, ArrowRight, X, ExternalLink, Activity, BarChart3 } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { SwipeableModal } from '../components/Layout';

// Interfaces locais para o novo formato de dados
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

// Componente do Modal de Detalhes
const MarketAssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const typeLabel = isFii ? 'Fundo Imobiliário' : 'Ação';
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    return (
        <div className="p-6 pb-12 bg-white dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border shadow-sm ${isFii ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{asset.ticker}</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{typeLabel}</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Price Main */}
            <div className="mb-8 text-center p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Cotação Atual</p>
                    <h3 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                        R$ {asset.price.toFixed(2)}
                    </h3>
                    {asset.variation_percent !== undefined && (
                        <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-black ${asset.variation_percent >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {asset.variation_percent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {asset.variation_percent > 0 ? '+' : ''}{asset.variation_percent.toFixed(2)}%
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {asset.dy_12m !== undefined && asset.dy_12m > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-amber-500">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dividend Yield</span>
                        </div>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">{asset.dy_12m.toFixed(2)}%</p>
                        <p className="text-[9px] text-zinc-400 font-medium">Últimos 12 meses</p>
                    </div>
                )}
                
                {asset.p_vp !== undefined && asset.p_vp > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-indigo-500">
                            <Activity className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">P/VP</span>
                        </div>
                        <p className={`text-2xl font-black ${asset.p_vp < 1 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>{asset.p_vp.toFixed(2)}</p>
                        <p className="text-[9px] text-zinc-400 font-medium">Preço / Valor Patrimonial</p>
                    </div>
                )}

                {asset.p_l !== undefined && asset.p_l > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-sky-500">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">P/L</span>
                        </div>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">{asset.p_l.toFixed(2)}</p>
                        <p className="text-[9px] text-zinc-400 font-medium">Preço / Lucro</p>
                    </div>
                )}
            </div>

            <div className="mt-auto space-y-3">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-center">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {asset.name}
                    </p>
                </div>
                <a href={url} target="_blank" rel="noreferrer" className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 press-effect hover:shadow-2xl transition-all">
                    Ver Detalhes Completos <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
};

interface AssetCardProps {
    item: MarketAsset;
    type: 'up' | 'down' | 'neutral' | 'dividend' | 'discount';
    metricLabel?: string;
    metricValue?: string;
    onClick: (item: MarketAsset) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, type, metricLabel, metricValue, onClick }) => {
    let accentColor = 'text-zinc-500';
    let bgBadge = 'bg-zinc-100 dark:bg-zinc-800';
    let borderClass = 'border-zinc-100 dark:border-zinc-800';
    
    if (type === 'up') { accentColor = 'text-emerald-500'; bgBadge = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'; borderClass = 'border-emerald-100 dark:border-emerald-900/30'; }
    if (type === 'down') { accentColor = 'text-rose-500'; bgBadge = 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'; borderClass = 'border-rose-100 dark:border-rose-900/30'; }
    if (type === 'dividend') { accentColor = 'text-amber-500'; bgBadge = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'; borderClass = 'border-amber-100 dark:border-amber-900/30'; }
    if (type === 'discount') { accentColor = 'text-indigo-500'; bgBadge = 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'; borderClass = 'border-indigo-100 dark:border-indigo-900/30'; }

    return (
        <button onClick={() => onClick(item)} className={`w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border ${borderClass} rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all press-effect group shadow-sm text-left`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border border-transparent ${bgBadge}`}>
                    {item.ticker.substring(0,2)}
                </div>
                <div>
                    <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight">{item.ticker}</span>
                    <span className="text-[9px] text-zinc-400 font-medium block truncate max-w-[90px]">{item.name}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">R$ {item.price.toFixed(2)}</span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {metricLabel && <span className="text-[8px] text-zinc-400 uppercase font-bold tracking-wider">{metricLabel}</span>}
                    <span className={`text-[10px] font-black ${accentColor}`}>
                        {metricValue || (item.variation_percent ? `${item.variation_percent > 0 ? '+' : ''}${item.variation_percent.toFixed(2)}%` : '-')}
                    </span>
                </div>
            </div>
        </button>
    );
};

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
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Panorama Diário</p>
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
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                    </div>
                    <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-60">
                    <AlertTriangle className="w-10 h-10 mb-2 text-zinc-300" />
                    <p className="text-xs font-bold text-zinc-500">Erro ao carregar dados.</p>
                </div>
            ) : currentData ? (
                <div className="space-y-8 anim-fade-in px-1">
                    
                    {/* Seção 1: Altas e Baixas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-500" /> Maiores Altas
                            </h3>
                            {currentData.gainers.length > 0 ? currentData.gainers.map((item, i) => (
                                <AssetCard key={i} item={item} type="up" onClick={setSelectedAsset} />
                            )) : <p className="text-[9px] text-zinc-400 px-2 py-4 text-center bg-zinc-50 dark:bg-zinc-900 rounded-xl">Sem dados</p>}
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                <TrendingDown className="w-3 h-3 text-rose-500" /> Maiores Baixas
                            </h3>
                            {currentData.losers.length > 0 ? currentData.losers.map((item, i) => (
                                <AssetCard key={i} item={item} type="down" onClick={setSelectedAsset} />
                            )) : <p className="text-[9px] text-zinc-400 px-2 py-4 text-center bg-zinc-50 dark:bg-zinc-900 rounded-xl">Sem dados</p>}
                        </div>
                    </div>

                    {/* Seção 2: Oportunidades / Valor */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Percent className="w-3 h-3 text-indigo-500" /> 
                                {activeTab === 'fiis' ? 'Descontados (P/VP)' : 'Descontados (P/L)'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {currentData.discounted.map((item, i) => (
                                <AssetCard 
                                    key={i} 
                                    item={item} 
                                    type="discount" 
                                    metricLabel={activeTab === 'fiis' ? 'P/VP' : 'P/L'}
                                    metricValue={activeTab === 'fiis' ? item.p_vp?.toFixed(2) : item.p_l?.toFixed(1)}
                                    onClick={setSelectedAsset}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Seção 3: Maiores Dividendos */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <DollarSign className="w-3 h-3 text-amber-500" /> Top Dividendos (12m)
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {currentData.high_yield.map((item, i) => (
                                <AssetCard 
                                    key={i} 
                                    item={item} 
                                    type="dividend" 
                                    metricLabel="DY"
                                    metricValue={`${item.dy_12m?.toFixed(1)}%`}
                                    onClick={setSelectedAsset}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="text-center py-6">
                        <p className="text-[9px] text-zinc-400 font-medium">
                            Fonte: Investidor10 • Atualizado: {new Date(data.last_update).toLocaleTimeString()}
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
