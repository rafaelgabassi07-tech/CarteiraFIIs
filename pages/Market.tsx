import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Sparkles, Building2, BarChart3, TrendingUp, Percent, ArrowUpRight } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { MarketOverview } from '../types';

const MarketBadge = ({ type }: { type: 'FII' | 'STOCK' }) => (
    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${type === 'FII' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'}`}>
        {type === 'FII' ? 'FII' : 'Ação'}
    </span>
);

interface AssetCardProps {
    item: any;
    type: 'FII' | 'STOCK';
    index: number;
}

const AssetCard: React.FC<AssetCardProps> = ({ item, type, index }) => {
    const isFII = type === 'FII';
    return (
        <a 
            href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${item.ticker.toLowerCase()}/`} 
            target="_blank" 
            rel="noreferrer"
            className="flex-shrink-0 w-36 p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect flex flex-col justify-between anim-stagger-item snap-center"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="flex justify-between items-start mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black border ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30'}`}>
                    {item.ticker.substring(0,2)}
                </div>
                {item.dy_12m > 0 && (
                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded-md">
                        {item.dy_12m.toFixed(1)}% DY
                    </span>
                )}
            </div>
            
            <div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-0.5">{item.ticker}</h4>
                <p className="text-[9px] font-medium text-zinc-400 truncate w-full">{item.name}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-50 dark:border-zinc-800 flex justify-between items-end">
                <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Preço</p>
                    <p className="text-xs font-black text-zinc-900 dark:text-white">R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">{isFII ? 'P/VP' : 'P/L'}</p>
                    <p className={`text-xs font-black ${item.p_vp <= 1 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                        {isFII ? item.p_vp?.toFixed(2) : item.p_l?.toFixed(1)}
                    </p>
                </div>
            </div>
        </a>
    );
};

export const Market: React.FC = () => {
    const [data, setData] = useState<MarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await fetchMarketOverview();
            // @ts-ignore
            if (result.error) throw new Error(result.message);
            setData(result);
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sticky Sólido */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            Mercado <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                        </h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Oportunidades & Destaques</p>
                    </div>
                    <button 
                        onClick={loadData} 
                        disabled={loading}
                        className={`w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="space-y-8 animate-pulse">
                    {[1, 2].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded ml-1"></div>
                            <div className="flex gap-3 overflow-hidden">
                                {[1, 2, 3].map(j => (
                                    <div key={j} className="w-36 h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex-shrink-0"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <AlertTriangle className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                    <p className="text-xs font-bold text-zinc-500 mb-4">Falha ao carregar dados do mercado.</p>
                    <button onClick={loadData} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 press-effect">
                        Tentar Novamente
                    </button>
                </div>
            ) : data ? (
                <div className="space-y-8">
                    
                    {/* Seção 1: FIIs High Yield & Descontados */}
                    {data.highlights.discounted_fiis.length > 0 && (
                        <div className="anim-slide-up">
                            <div className="flex items-center gap-2 px-1 mb-3">
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-zinc-900 dark:text-white">FIIs: Renda & Desconto</h3>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory px-1">
                                {data.highlights.discounted_fiis.map((item, idx) => (
                                    <AssetCard key={idx} item={item} type="FII" index={idx} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção 2: Ações Baratas (P/L Baixo) */}
                    {data.highlights.discounted_stocks.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <div className="flex items-center gap-2 px-1 mb-3">
                                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Ações Descontadas</h3>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory px-1">
                                {data.highlights.discounted_stocks.map((item, idx) => (
                                    <AssetCard key={idx} item={item} type="STOCK" index={idx} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="px-4 py-6 text-center opacity-60">
                        <p className="text-[10px] text-zinc-400 mb-1">Dados fornecidos pelo Scraper (Investidor10)</p>
                        <p className="text-[9px] text-zinc-500">Atualizado em: {new Date(data.last_update).toLocaleString()}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
};