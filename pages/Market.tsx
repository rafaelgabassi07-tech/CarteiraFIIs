
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Sparkles, Building2, TrendingUp, TrendingDown, DollarSign, Percent, ArrowRight } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';

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

interface AssetCardProps {
    item: MarketAsset;
    type: 'up' | 'down' | 'neutral' | 'dividend' | 'discount';
    metricLabel?: string;
    metricValue?: string;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, type, metricLabel, metricValue }) => {
    let accentColor = 'text-zinc-500';
    let bgBadge = 'bg-zinc-100 dark:bg-zinc-800';
    let borderClass = 'border-zinc-100 dark:border-zinc-800';
    
    if (type === 'up') { accentColor = 'text-emerald-500'; bgBadge = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'; borderClass = 'border-emerald-100 dark:border-emerald-900/30'; }
    if (type === 'down') { accentColor = 'text-rose-500'; bgBadge = 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'; borderClass = 'border-rose-100 dark:border-rose-900/30'; }
    if (type === 'dividend') { accentColor = 'text-amber-500'; bgBadge = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'; borderClass = 'border-amber-100 dark:border-amber-900/30'; }
    if (type === 'discount') { accentColor = 'text-indigo-500'; bgBadge = 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'; borderClass = 'border-indigo-100 dark:border-indigo-900/30'; }

    return (
        <a href={`https://investidor10.com.br/${item.ticker.endsWith('11') || item.ticker.endsWith('11B') ? 'fiis' : 'acoes'}/${item.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className={`flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border ${borderClass} rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all press-effect group shadow-sm`}>
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
        </a>
    );
};

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState<'fiis' | 'stocks'>('fiis');

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
                                <AssetCard key={i} item={item} type="up" />
                            )) : <p className="text-[9px] text-zinc-400 px-2 py-4 text-center bg-zinc-50 dark:bg-zinc-900 rounded-xl">Sem dados</p>}
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                <TrendingDown className="w-3 h-3 text-rose-500" /> Maiores Baixas
                            </h3>
                            {currentData.losers.length > 0 ? currentData.losers.map((item, i) => (
                                <AssetCard key={i} item={item} type="down" />
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
        </div>
    );
};
