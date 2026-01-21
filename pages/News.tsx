import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe, RefreshCw, AlertTriangle, Search, Share2, X, PlusCircle, ArrowUpRight, Filter, MoreHorizontal } from 'lucide-react';
import { NewsItem, Transaction, AssetType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsProps {
    transactions?: Transaction[];
}

const SkeletonNews = () => (
    <div className="space-y-3 px-2">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-[1.5rem] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 animate-pulse">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800"></div>
                        <div className="h-2 w-20 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    </div>
                    <div className="h-5 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full"></div>
                </div>
                <div className="space-y-2 mb-4">
                    <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <div className="h-2 w-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>
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

    const fetchNews = useCallback(async (query?: string) => {
        setLoading(true);
        setError(false);
        try {
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

    useEffect(() => {
        if (!searchTerm) {
            fetchNews();
        }
    }, [fetchNews]);

    const handleSearchSubmit = () => {
        if (!searchTerm.trim()) {
            fetchNews(); 
            return;
        }
        setActiveTab('Todas');
        fetchNews(searchTerm);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearchSubmit();
    };

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
            } catch (err) { }
        } else {
            navigator.clipboard.writeText(`${item.title}\n${item.url}`);
        }
    };

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
                            <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-2">
                                Notícias <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            </h1>
                        </div>
                        <button 
                            onClick={handleSearchSubmit} 
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
                    <div className="space-y-3 px-2"> 
                    {/* Padding reduzido para px-2 para melhor aproveitamento lateral em mobile */}
                        
                        {filteredNews.length > 0 ? (
                            filteredNews.map((item, index) => {
                                const isFII = item.category === 'FIIs' || item.title.includes('FII') || item.title.includes('IFIX');
                                
                                return (
                                    <a 
                                        key={index}
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect group anim-slide-up relative overflow-hidden"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        {/* Header do Card */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.source} className="w-4 h-4 object-contain" />
                                                    ) : (
                                                        <Globe className="w-3 h-3 text-zinc-400" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">
                                                    {item.source}
                                                </span>
                                            </div>
                                            
                                            <div className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30'}`}>
                                                {isFII ? 'FIIs' : 'Ações'}
                                            </div>
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="mb-5">
                                            <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight mb-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors line-clamp-3">
                                                {item.title}
                                            </h3>
                                            {item.summary && (
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 font-medium">
                                                    {item.summary.replace(/<[^>]*>/g, '')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Footer / Ações */}
                                        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/50 mt-2">
                                            <div className="flex items-center gap-1.5 text-zinc-400">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">{item.date}</span>
                                            </div>

                                            <button 
                                                onClick={(e) => handleShare(e, item)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                                Compartilhar
                                            </button>
                                        </div>
                                    </a>
                                );
                            })
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