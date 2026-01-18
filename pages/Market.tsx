
import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, AlertTriangle, Globe, Sparkles, TrendingUp, TrendingDown, DollarSign, Building2, BarChart3, Clock, ArrowRight } from 'lucide-react';
import { fetchMarketOverview } from '../services/geminiService';
import { MarketOverview, MarketHighlightFII, MarketHighlightStock } from '../types';

interface ExtendedMarketOverview extends MarketOverview {
    error?: boolean;
    message?: string;
}

// --- Componentes UI Novos ---

const SentimentBanner: React.FC<{ status: string; summary: string; lastUpdate: string }> = ({ status, summary, lastUpdate }) => {
    const isBullish = summary.toLowerCase().includes('alta') || summary.toLowerCase().includes('otimism') || summary.toLowerCase().includes('positivo');
    const isBearish = summary.toLowerCase().includes('baixa') || summary.toLowerCase().includes('cautela') || summary.toLowerCase().includes('queda');
    
    // Gradiente baseado no sentimento da frase
    const bgClass = isBullish 
        ? 'bg-gradient-to-br from-emerald-600 to-teal-700' 
        : isBearish 
            ? 'bg-gradient-to-br from-rose-600 to-orange-700' 
            : 'bg-gradient-to-br from-indigo-600 to-violet-700';

    return (
        <div className={`w-full p-6 rounded-3xl ${bgClass} text-white shadow-xl relative overflow-hidden mb-8`}>
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 bg-black/20 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${status.includes('Aberto') ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{status}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/60">
                        <Clock className="w-3 h-3" /> {lastUpdate}
                    </div>
                </div>
                
                <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight mb-2">
                    "{summary}"
                </h2>
                <div className="flex items-center gap-2 mt-2 opacity-80">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Análise Gemini AI</span>
                </div>
            </div>
        </div>
    );
};

const OpportunityCard: React.FC<{ type: 'FII' | 'STOCK'; data: any; delay: number }> = ({ type, data, delay }) => {
    const isFII = type === 'FII';
    const mainMetricLabel = isFII ? 'Dividend Yield' : 'P/VP';
    const mainMetricValue = isFII ? `${data.dy_12m}%` : data.p_vp;
    const secondaryMetricLabel = isFII ? 'P/VP' : 'P/L';
    const secondaryMetricValue = isFII ? data.p_vp : data.p_l;

    return (
        <div 
            className="group relative bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-500 anim-slide-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border shadow-sm transition-transform group-hover:scale-110 ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>
                        {data.ticker.substring(0,2)}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-none mb-1">{data.ticker}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[120px]">{data.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-zinc-900 dark:text-white">
                        {typeof data.price === 'number' ? data.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{mainMetricLabel}</p>
                    <p className={`text-sm font-black ${isFII ? 'text-emerald-500' : 'text-zinc-700 dark:text-zinc-200'}`}>{mainMetricValue}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{secondaryMetricLabel}</p>
                    <p className="text-sm font-black text-zinc-700 dark:text-zinc-200">{secondaryMetricValue}</p>
                </div>
            </div>
            
            <a 
                href={`https://www.google.com/search?q=${data.ticker}+investidor10`} 
                target="_blank" 
                rel="noreferrer"
                className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-zinc-900/5 dark:group-hover:ring-white/5 transition-all"
            />
        </div>
    );
};

const SkeletonCard = () => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex gap-3 mb-4">
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
            <div className="flex-1 space-y-2 py-1">
                <div className="w-20 h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="w-32 h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-50 dark:border-zinc-800">
            <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
            <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
        </div>
    </div>
);

export const Market: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState<ExtendedMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Controle de execução única
    const hasFetched = useRef(false);

    const loadMarketData = async (force = false) => {
        if (!force && hasFetched.current) return;
        
        hasFetched.current = true;
        setLoading(true);
        setHasError(false);
        setErrorMsg('');
        
        try {
            if (!force) {
                const cached = localStorage.getItem('investfiis_market_radar_cache_v2');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const lastTime = new Date(parsed.timestamp).getTime();
                    // Cache de 30 minutos
                    if (Date.now() - lastTime < 1000 * 60 * 30) {
                        setData(parsed.data);
                        setLoading(false);
                        return;
                    }
                }
            }

            const newData = await fetchMarketOverview() as ExtendedMarketOverview;
            
            if (newData.error || (!newData.highlights?.discounted_fiis?.length && !newData.highlights?.discounted_stocks?.length)) {
                setHasError(true);
                setErrorMsg(typeof newData.message === 'string' ? newData.message : 'Dados indisponíveis.');
                // Tenta usar cache antigo em caso de erro se existir
                const cached = localStorage.getItem('investfiis_market_radar_cache_v2');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setData(parsed.data);
                    setHasError(false); // Recuperação silenciosa
                } else {
                    setData(null);
                }
            } else {
                setData(newData);
                localStorage.setItem('investfiis_market_radar_cache_v2', JSON.stringify({
                    data: newData,
                    timestamp: Date.now()
                }));
            }
        } catch (e: any) {
            setHasError(true);
            setErrorMsg('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMarketData();
        return () => { hasFetched.current = false; };
    }, []);

    const hasData = data && data.highlights;

    return (
        <div className="pb-32 min-h-screen">
            {/* Sticky Header minimalista */}
            <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all">
                 <div className="flex items-center justify-between">
                    <h1 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                        Radar <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                    </h1>
                    <button 
                        onClick={() => window.open(`https://www.google.com/search?q=notícias+mercado+financeiro+hoje`, '_blank')}
                        className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Google News
                    </button>
                </div>
            </div>

            <div className="pt-6 px-1">
                {loading ? (
                    <div className="space-y-6 animate-pulse">
                        <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-3xl w-full"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                        </div>
                    </div>
                ) : hasError || !hasData ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center anim-fade-in">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500 mb-6 border border-rose-100 dark:border-rose-900/30">
                            <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Radar Offline</h3>
                        <p className="text-sm text-zinc-500 mb-6 max-w-xs">{errorMsg}</p>
                        <button onClick={() => loadMarketData(true)} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" /> Recarregar
                        </button>
                    </div>
                ) : (
                    <div className="anim-fade-in">
                        {/* 1. Market Sentiment Banner */}
                        <SentimentBanner 
                            status={data.market_status || 'Aberto'} 
                            summary={data.sentiment_summary || 'Mercado operando com volatilidade.'}
                            lastUpdate={data.last_update}
                        />

                        {/* 2. Top FIIs Section */}
                        {data.highlights.discounted_fiis.length > 0 && (
                            <div className="mb-10">
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">Top FIIs (Renda)</h3>
                                        <p className="text-[10px] text-zinc-500 font-medium">Oportunidades com DY alto e P/VP descontado</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {data.highlights.discounted_fiis.map((asset, i) => (
                                        <OpportunityCard key={i} type="FII" data={asset} delay={i * 100} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Top Stocks Section */}
                        {data.highlights.discounted_stocks.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg flex items-center justify-center">
                                        <BarChart3 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">Top Ações (Valor)</h3>
                                        <p className="text-[10px] text-zinc-500 font-medium">Empresas sólidas com múltiplos atrativos</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {data.highlights.discounted_stocks.map((asset, i) => (
                                        <OpportunityCard key={i} type="STOCK" data={asset} delay={300 + (i * 100)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Sources Footer */}
                        {data.sources && data.sources.length > 0 && (
                            <div className="mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                                    <Globe className="w-3 h-3" /> Fontes Analisadas
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {data.sources.map((source, i) => (
                                        <a 
                                            key={i} 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors truncate max-w-[150px]"
                                        >
                                            {source.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
