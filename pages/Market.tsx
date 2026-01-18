
import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, ExternalLink, RefreshCw, AlertTriangle, Globe, Zap, Percent, BarChart3, Clock, Lock, Coins } from 'lucide-react';
import { fetchMarketOverview } from '../services/geminiService';
import { MarketOverview, MarketHighlightFII, MarketHighlightStock, MarketVariation, MarketHighDividend } from '../types';

interface ExtendedMarketOverview extends MarketOverview {
    error?: boolean;
    message?: string;
}

// --- Componentes de Card Específicos ---

const DiscountedFIICard: React.FC<{ asset: MarketHighlightFII }> = ({ asset }) => (
    <div className="flex-shrink-0 w-48 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-zinc-900 shadow-sm snap-start flex flex-col justify-between group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <span className="text-base font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800">FII</span>
            </div>
            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-3">{asset.name}</p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-indigo-50 dark:border-zinc-800">
             <div>
                <p className="text-[9px] text-zinc-400 font-bold uppercase">P/VP</p>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{typeof asset.p_vp === 'number' ? asset.p_vp.toFixed(2) : '-'}</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] text-zinc-400 font-bold uppercase">DY 12M</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{typeof asset.dy_12m === 'number' ? asset.dy_12m.toFixed(1) : '-'}%</p>
             </div>
        </div>
        <div className="mt-2 text-center">
            <span className="text-xs font-black text-zinc-900 dark:text-white">
                {typeof asset.price === 'number' ? asset.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
            </span>
        </div>
    </div>
);

const DiscountedStockCard: React.FC<{ asset: MarketHighlightStock }> = ({ asset }) => (
    <div className="flex-shrink-0 w-48 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/30 bg-white dark:bg-zinc-900 shadow-sm snap-start flex flex-col justify-between group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-sky-50 dark:bg-sky-900/10 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <span className="text-base font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-800">Ação</span>
            </div>
            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-3">{asset.name}</p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-sky-50 dark:border-zinc-800">
             <div>
                <p className="text-[9px] text-zinc-400 font-bold uppercase">P/L</p>
                <p className="text-sm font-black text-sky-600 dark:text-sky-400">{typeof asset.p_l === 'number' ? asset.p_l.toFixed(1) : '-'}</p>
             </div>
             <div className="text-right">
                <p className="text-[9px] text-zinc-400 font-bold uppercase">P/VP</p>
                <p className="text-sm font-black text-sky-600 dark:text-sky-400">{typeof asset.p_vp === 'number' ? asset.p_vp.toFixed(2) : '-'}</p>
             </div>
        </div>
        <div className="mt-2 text-center">
            <span className="text-xs font-black text-zinc-900 dark:text-white">
                {typeof asset.price === 'number' ? asset.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
            </span>
        </div>
    </div>
);

const VariationCard: React.FC<{ asset: MarketVariation; type: 'gain' | 'loss' }> = ({ asset, type }) => {
    const isGain = type === 'gain';
    const colorClass = isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const bgClass = isGain ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30';

    return (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${bgClass}`}>
            <div>
                <span className="text-sm font-black text-zinc-900 dark:text-white block">{asset.ticker}</span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    {typeof asset.price === 'number' ? asset.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
                </span>
            </div>
            <div className={`flex items-center gap-1 text-sm font-black ${colorClass}`}>
                {isGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {asset.variation_percent > 0 ? '+' : ''}{asset.variation_percent}%
            </div>
        </div>
    );
};

const HighDividendCard: React.FC<{ asset: MarketHighDividend }> = ({ asset }) => (
    <div className="flex-shrink-0 w-40 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-white dark:bg-zinc-900 shadow-sm snap-start flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                <span className="text-[8px] font-bold px-1 py-0.5 rounded border uppercase bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700">{asset.type}</span>
            </div>
            <div className="flex items-end gap-1 mb-1">
                <span className="text-xl font-black text-amber-500">{asset.dy_12m}%</span>
                <span className="text-[9px] font-bold text-zinc-400 mb-1">DY 12M</span>
            </div>
        </div>
        <div className="pt-2 border-t border-amber-50 dark:border-zinc-800">
            <p className="text-[9px] text-zinc-400 font-bold uppercase">Último Pag.</p>
            <p className="text-xs font-black text-zinc-900 dark:text-white">
                {typeof asset.last_dividend === 'number' ? asset.last_dividend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
            </p>
        </div>
    </div>
);

const SectionHeader = ({ title, icon: Icon, colorClass }: any) => (
    <div className="flex items-center gap-2 mb-3 px-1 mt-8 first:mt-4">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">{title}</h3>
    </div>
);

export const Market: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState<ExtendedMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const loadMarketData = async (force = false) => {
        setLoading(true);
        setHasError(false);
        setErrorMsg('');
        try {
            if (!force) {
                const cached = localStorage.getItem('investfiis_market_grounding_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Cache de 30 minutos
                    const lastTime = new Date(parsed.timestamp).getTime();
                    if (Date.now() - lastTime < 1000 * 60 * 30) {
                        setData(parsed.data);
                        setLoading(false);
                        return;
                    }
                }
            }

            const newData = await fetchMarketOverview() as ExtendedMarketOverview;
            
            if (newData.error || (!newData.highlights?.discounted_fiis?.length && !newData.highlights?.top_gainers?.length)) {
                setHasError(true);
                setErrorMsg(typeof newData.message === 'string' ? newData.message : 'Dados inválidos recebidos da IA.');
                setData(null);
            } else {
                setData(newData);
                localStorage.setItem('investfiis_market_grounding_cache', JSON.stringify({
                    data: newData,
                    timestamp: Date.now()
                }));
            }
        } catch (e: any) {
            setHasError(true);
            setErrorMsg(typeof e.message === 'string' ? e.message : 'Falha na conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMarketData();
    }, []);

    const hasData = data && data.highlights;

    return (
        <div className="pb-32 min-h-screen">
            {/* Search Header */}
            <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
                 <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar ativos, notícias..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-accent/10 transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => window.open(`https://www.google.com/search?q=ação+${searchTerm}+fundamentos`, '_blank')}
                            className="absolute right-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                            Google
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-zinc-400 anim-fade-in">
                    <div className="relative mb-6">
                         <div className="w-12 h-12 rounded-full border-4 border-zinc-100 dark:border-zinc-800 border-t-accent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                             <Globe className="w-4 h-4 text-zinc-300" />
                         </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Analisando Mercado...</p>
                    <p className="text-[10px] mt-2 opacity-50 max-w-[200px] text-center">Gemini 3 + Google Search em tempo real</p>
                </div>
            ) : hasError || !hasData ? (
                <div className="flex flex-col items-center justify-center py-20 text-center anim-fade-in px-6 mt-10">
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500 mb-6 border border-rose-100 dark:border-rose-900/30">
                        <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Mercado Indisponível</h3>
                    <p className="text-sm text-zinc-500 mb-2 max-w-xs leading-relaxed">
                        Não conseguimos processar os dados agora.
                    </p>
                    <p className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg mb-8 font-mono max-w-xs truncate">
                        {errorMsg}
                    </p>
                    <button 
                        onClick={() => loadMarketData(true)}
                        className="px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 press-effect shadow-xl"
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar Novamente
                    </button>
                </div>
            ) : (
                <div className="pt-6 anim-fade-in space-y-2">
                    
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-1 mb-6">
                        <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full animate-pulse ${data.market_status?.toLowerCase().includes('open') || data.market_status?.toLowerCase().includes('aberto') ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{data.market_status || 'Status N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
                             <Clock className="w-3 h-3" />
                             <span>Atualizado: {data.last_update}</span>
                        </div>
                    </div>

                    {/* FIIs Descontados */}
                    {data.highlights.discounted_fiis.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '0ms' }}>
                            <SectionHeader title="FIIs Descontados" icon={Percent} colorClass="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.highlights.discounted_fiis.map((asset, i) => <DiscountedFIICard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Ações Descontadas */}
                    {data.highlights.discounted_stocks.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <SectionHeader title="Ações Oportunidades" icon={BarChart3} colorClass="bg-sky-100 dark:bg-sky-900/20 text-sky-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.highlights.discounted_stocks.map((asset, i) => <DiscountedStockCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Variações do Dia */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 anim-slide-up" style={{ animationDelay: '200ms' }}>
                        {data.highlights.top_gainers.length > 0 && (
                            <div>
                                <SectionHeader title="Maiores Altas" icon={TrendingUp} colorClass="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" />
                                <div className="space-y-2">
                                    {data.highlights.top_gainers.map((asset, i) => <VariationCard key={i} asset={asset} type="gain" />)}
                                </div>
                            </div>
                        )}
                        {data.highlights.top_losers.length > 0 && (
                            <div>
                                <SectionHeader title="Maiores Baixas" icon={TrendingDown} colorClass="bg-rose-100 dark:bg-rose-900/20 text-rose-600" />
                                <div className="space-y-2">
                                    {data.highlights.top_losers.map((asset, i) => <VariationCard key={i} asset={asset} type="loss" />)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dividendos Altos */}
                    {data.highlights.high_dividend_yield.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '300ms' }}>
                            <SectionHeader title="Altos Dividendos" icon={Coins} colorClass="bg-amber-100 dark:bg-amber-900/20 text-amber-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.highlights.high_dividend_yield.map((asset, i) => <HighDividendCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Grounding Sources (Fontes) */}
                    {data?.sources && data.sources.length > 0 && (
                        <div className="mt-8 px-5 py-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-left anim-fade-in">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Fontes de Dados
                            </h3>
                            <div className="space-y-2">
                                {data.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="block text-[10px] font-medium text-zinc-500 hover:text-accent truncate transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                                        {source.title}
                                    </a>
                                ))}
                            </div>
                            <p className="text-[9px] text-zinc-400 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 leading-relaxed">
                                Gerado por IA (Gemini 3) via Google Search. Verifique sempre os dados em sua corretora antes de investir.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
