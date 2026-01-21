import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe, RefreshCw, AlertTriangle, Search, Share2, X, PlusCircle, ArrowUpRight } from 'lucide-react';
import { NewsItem, Transaction, AssetType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsProps {
    transactions?: Transaction[];
}

const SkeletonNews = () => (
    <div className="space-y-3 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 animate-pulse items-center">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    <div className="h-2 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);

export const News: React.FC<NewsProps> = ({ transactions = [] }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    
    // Filtros e Abas
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'FIIs' | 'Ações'>('FIIs');

    // Separação de Tickers da Carteira
    const { fiiTickers, stockTickers } = useMemo(() => {
        const uniqueFIIs = new Set<string>();
        const uniqueStocks = new Set<string>();

        transactions.forEach(t => {
            if (t.assetType === AssetType.FII) uniqueFIIs.add(t.ticker.toUpperCase());
            else uniqueStocks.add(t.ticker.toUpperCase());
        });

        return {
            fiiTickers: Array.from(uniqueFIIs),
            stockTickers: Array.from(uniqueStocks)
        };
    }, [transactions]);

    const fetchNews = useCallback(async (query: string) => {
        if (!query) {
            setNews([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(false);
        try {
            const url = `/api/news?q=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();
            
            if (Array.isArray(data)) {
                const formatted: NewsItem[] = data.map((item: any, index: number) => ({
                    id: String(index),
                    title: item.title,
                    summary: item.summary,
                    source: item.sourceName || 'Fonte Desconhecida',
                    url: item.link,
                    imageUrl: item.imageUrl,
                    date: item.publicationDate ? formatDistanceToNow(new Date(item.publicationDate), { addSuffix: true, locale: ptBR }) : 'Recentemente',
                    category: (item.category as any) || 'Geral'
                }));
                setNews(formatted);
            } else {
                setNews([]);
            }
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (searchTerm) return;

        const currentTickers = activeTab === 'FIIs' ? fiiTickers : stockTickers;

        if (currentTickers.length > 0) {
            const query = currentTickers.slice(0, 15).join(' OR ');
            fetchNews(query);
        } else {
            setNews([]);
            setLoading(false);
        }
    }, [activeTab, fiiTickers, stockTickers, fetchNews, searchTerm]);

    const handleSearchSubmit = () => {
        if (!searchTerm.trim()) return;
        fetchNews(searchTerm);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearchSubmit();
    };

    const filteredNews = useMemo(() => {
        return news; 
    }, [news]);

    const currentTickers = activeTab === 'FIIs' ? fiiTickers : stockTickers;
    const hasAssetsInTab = currentTickers.length > 0;

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sólido */}
            <div className="sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-xl mx-auto space-y-4">
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Notícias</h1>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Feed Personalizado</p>
                        </div>
                        <button 
                            onClick={() => fetchNews(searchTerm || currentTickers.join(' OR '))} 
                            disabled={loading || (!searchTerm && !hasAssetsInTab)}
                            className={`w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm active:scale-95 transition-all ${loading ? 'opacity-50' : ''}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="block w-full pl-10 pr-10 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder-zinc-400 shadow-sm focus:border-zinc-400 dark:focus:border-zinc-600 transition-all outline-none"
                            placeholder="Buscar no Google News..."
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); if (hasAssetsInTab) fetchNews(currentTickers.join(' OR ')); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl relative border border-zinc-200 dark:border-zinc-800">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-lg shadow-sm transition-all duration-300 ease-out-mola ${activeTab === 'FIIs' ? 'left-1' : 'translate-x-[100%] left-1'}`}
                        ></div>
                        <button 
                            onClick={() => { setActiveTab('FIIs'); setSearchTerm(''); }} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'FIIs' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <Building2 className="w-3.5 h-3.5" /> FIIs ({fiiTickers.length})
                        </button>
                        <button 
                            onClick={() => { setActiveTab('Ações'); setSearchTerm(''); }} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'Ações' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> Ações ({stockTickers.length})
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto pt-4">
                {loading ? (
                    <SkeletonNews />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center opacity-60">
                        <AlertTriangle className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                        <p className="text-xs font-bold text-zinc-500 mb-4">Falha ao carregar notícias.</p>
                        <button onClick={() => fetchNews(searchTerm || currentTickers.join(' OR '))} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 press-effect">
                            Tentar Novamente
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 px-4">
                        
                        {!searchTerm && !hasAssetsInTab && (
                            <div className="flex flex-col items-center justify-center py-20 text-center anim-fade-in opacity-50">
                                <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-400">
                                    {activeTab === 'FIIs' ? <Building2 className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
                                </div>
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Carteira Vazia</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] leading-relaxed mb-4">
                                    Adicione {activeTab} para ver notícias.
                                </p>
                            </div>
                        )}

                        {filteredNews.length > 0 ? (
                            filteredNews.map((item, index) => (
                                <a 
                                    key={index}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect group anim-slide-up"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.source} className="w-6 h-6 object-contain" />
                                        ) : (
                                            <Globe className="w-5 h-5 text-zinc-300" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider truncate max-w-[150px]">
                                                {item.source}
                                            </span>
                                            <span className="text-[9px] font-bold text-zinc-400 whitespace-nowrap ml-2">
                                                {item.date}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.title}
                                        </h3>
                                    </div>
                                    
                                    <div className="shrink-0 text-zinc-300 group-hover:text-indigo-500 transition-colors">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </div>
                                </a>
                            ))
                        ) : (
                            (searchTerm || hasAssetsInTab) && !loading && (
                                <div className="text-center py-20 opacity-40 anim-fade-in">
                                    <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Sem resultados</p>
                                </div>
                            )
                        )}
                        
                        {filteredNews.length > 0 && (
                            <div className="pt-6 pb-8 text-center">
                                <p className="text-[9px] text-zinc-300 dark:text-zinc-700 font-bold uppercase tracking-widest">
                                    Fonte: Google News RSS
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};