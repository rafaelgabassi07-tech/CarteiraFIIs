import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe, RefreshCw, AlertTriangle, Search, Share2, X, PlusCircle, ArrowUpRight, Filter } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'Todas' | 'FIIs' | 'Ações'>('Todas');

    // Separação de Tickers da Carteira (para uso futuro ou destaque)
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

    const fetchNews = useCallback(async (query?: string) => {
        setLoading(true);
        setError(false);
        try {
            // Se houver query explícita (busca), usa. Se não, busca o feed geral (sem query params)
            const url = query ? `/api/news?q=${encodeURIComponent(query)}` : '/api/news';
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

    // Effect inicial: carrega feed geral se não tiver busca
    useEffect(() => {
        if (!searchTerm) {
            fetchNews();
        }
    }, [fetchNews]);

    // Handle Busca
    const handleSearchSubmit = () => {
        if (!searchTerm.trim()) {
            fetchNews(); // Reseta para feed geral
            return;
        }
        fetchNews(searchTerm);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearchSubmit();
    };

    // Handle Share
    const handleShare = async (e: React.MouseEvent, item: NewsItem) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `Confira esta notícia: ${item.title}`,
                    url: item.url
                });
            } catch (err) {
                // Share dismissed
            }
        } else {
            navigator.clipboard.writeText(`${item.title}\n${item.url}`);
            // Fallback visual opcional
        }
    };

    // Filtragem Local
    const filteredNews = useMemo(() => {
        if (activeTab === 'Todas') return news;
        return news.filter(n => n.category === activeTab);
    }, [news, activeTab]);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sólido */}
            <div className="sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-xl mx-auto space-y-4">
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Notícias</h1>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Feed de Mercado</p>
                        </div>
                        <button 
                            onClick={() => fetchNews(searchTerm)} 
                            disabled={loading}
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
                            placeholder="Buscar notícias..."
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); fetchNews(); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Abas Tipo Pílula */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {(['Todas', 'FIIs', 'Ações'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${activeTab === tab ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm' : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border-zinc-200 dark:border-zinc-800'}`}
                            >
                                {tab}
                            </button>
                        ))}
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
                        <button onClick={() => fetchNews(searchTerm)} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 press-effect">
                            Tentar Novamente
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 px-4">
                        
                        {filteredNews.length > 0 ? (
                            filteredNews.map((item, index) => (
                                <a 
                                    key={index}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-start gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect group anim-slide-up relative"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden mt-1">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.source} className="w-6 h-6 object-contain" />
                                        ) : (
                                            <Globe className="w-5 h-5 text-zinc-300" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-2 max-w-[70%]">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider truncate">
                                                    {item.source}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-bold text-zinc-400 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                {item.date}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug line-clamp-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                                            {item.title}
                                        </h3>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-3 relative z-10">
                                            <button 
                                                onClick={(e) => handleShare(e, item)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                title="Compartilhar"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <div className="text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))
                        ) : (
                            !loading && (
                                <div className="text-center py-20 opacity-40 anim-fade-in">
                                    <Newspaper className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhuma notícia encontrada</p>
                                    <p className="text-[10px] text-zinc-400 mt-1">Tente buscar outro termo ou mude o filtro.</p>
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