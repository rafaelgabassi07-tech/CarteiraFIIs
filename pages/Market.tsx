
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Globe, Sparkles, Building2, BarChart3, Database } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { MarketOverview } from '../types';

interface ExtendedMarketOverview extends MarketOverview {
    error?: boolean;
    message?: string;
    cachedAt?: number;
}

const CACHE_KEY = 'investfiis_market_data_v4';
const CACHE_DURATION = 1000 * 60 * 30; // 30 Minutos

// --- Componentes UI ---

const MarketBadge = ({ type }: { type: 'FII' | 'STOCK' }) => (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${type === 'FII' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800'}`}>
        {type === 'FII' ? 'Fundo Imobiliário' : 'Ação'}
    </span>
);

const OpportunityCard: React.FC<{ type: 'FII' | 'STOCK'; data: any; index: number }> = ({ type, data, index }) => {
    const isFII = type === 'FII';
    
    return (
        <div 
            className="flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all anim-slide-up relative overflow-hidden group"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border shadow-sm ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30'}`}>
                    {data.ticker.substring(0,2)}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white">{data.ticker}</h3>
                        <MarketBadge type={type} />
                    </div>
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">{data.name}</p>
                </div>
            </div>

            <div className="text-right relative z-10">
                <div className="flex flex-col items-end">
                    {isFII ? (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                            DY {data.dy_12m}%
                        </span>
                    ) : (
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-1.5 py-0.5 rounded">
                            P/L {data.p_l}
                        </span>
                    )}
                    <span className="text-[10px] font-bold text-zinc-400 mt-1">
                        P/VP {data.p_vp}
                    </span>
                </div>
            </div>
            
            {/* Click Area */}
            <a 
                href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${data.ticker.toLowerCase()}/`} 
                target="_blank" 
                rel="noreferrer"
                className="absolute inset-0 z-20 rounded-2xl ring-2 ring-transparent group-hover:ring-zinc-900/5 dark:group-hover:ring-white/5 transition-all"
            />
        </div>
    );
};

const SkeletonList = () => (
    <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full"></div>
        ))}
    </div>
);

export const Market: React.FC = () => {
    const [data, setData] = useState<ExtendedMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [errorMode, setErrorMode] = useState(false);
    
    useEffect(() => {
        const loadCache = () => {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    const age = Date.now() - (parsed.cachedAt || 0);
                    
                    if (age < CACHE_DURATION) {
                        setData(parsed);
                        setLoading(false);
                        return true;
                    } else {
                        setData(parsed);
                        return false;
                    }
                } catch { return false; }
            }
            return false;
        };

        const isValid = loadCache();
        fetchData(!isValid);
    }, []);

    const fetchData = async (forceLoadingState = false) => {
        if (forceLoadingState) setLoading(true);
        else setIsRefetching(true);
        setErrorMode(false);

        try {
            const result = await fetchMarketOverview();
            
            // @ts-ignore
            if (result.error) {
                if (!data) setErrorMode(true);
            } else {
                const newData = { ...result, cachedAt: Date.now() };
                setData(newData);
                localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                setErrorMode(false);
            }
        } catch (e) {
            if (!data) setErrorMode(true);
        } finally {
            setLoading(false);
            setIsRefetching(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="pb-32 px-4 pt-6">
                <div className="h-8 w-40 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-6 animate-pulse"></div>
                <SkeletonList />
            </div>
        );
    }

    if (errorMode && !data) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center anim-fade-in">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-3xl flex items-center justify-center text-rose-500 mb-6 border border-rose-100 dark:border-rose-900/30">
                    <AlertTriangle className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Dados Indisponíveis</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-xs leading-relaxed">
                    Não foi possível conectar ao banco de dados de mercado. Tente novamente.
                </p>
                <button 
                    onClick={() => fetchData(true)}
                    className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Simples */}
            <div className="sticky top-20 z-40 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all">
                 <div className="px-4 py-3 flex items-center justify-between max-w-xl mx-auto">
                    <div>
                        <h1 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            Radar de Oportunidades
                        </h1>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            {isRefetching ? (
                                <><RefreshCw className="w-3 h-3 animate-spin" /> Atualizando...</>
                            ) : (
                                <><Database className="w-3 h-3 text-emerald-500" /> Dados B3</>
                            )}
                        </p>
                    </div>
                    {data?.sentiment_summary && (
                        <div className="px-3 py-1.5 rounded-xl border flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            <span className="text-[9px] font-black uppercase tracking-wider max-w-[100px] truncate text-right">
                                {data.sentiment_summary}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 pt-6 space-y-8 max-w-xl mx-auto">
                
                {/* 1. Top FIIs */}
                {data?.highlights.discounted_fiis && data.highlights.discounted_fiis.length > 0 && (
                    <div className="anim-fade-in">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">FIIs (Maiores DY, P/VP &lt; 1.1)</h3>
                        </div>
                        <div className="space-y-3">
                            {data.highlights.discounted_fiis.map((asset, i) => (
                                <OpportunityCard key={`fii-${i}`} type="FII" data={asset} index={i} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Top Stocks */}
                {data?.highlights.discounted_stocks && data.highlights.discounted_stocks.length > 0 && (
                    <div className="anim-fade-in" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <BarChart3 className="w-4 h-4 text-sky-500" />
                            <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Ações (Menores P/L, P/VP &lt; 2)</h3>
                        </div>
                        <div className="space-y-3">
                            {data.highlights.discounted_stocks.map((asset, i) => (
                                <OpportunityCard key={`stock-${i}`} type="STOCK" data={asset} index={i + 3} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Sources */}
                {data?.sources && (
                    <div className="pt-8 pb-4 text-center opacity-60">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500">
                            <Globe className="w-3 h-3" />
                            Dados agregados via Scrapers (Investidor10/StatusInvest)
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
