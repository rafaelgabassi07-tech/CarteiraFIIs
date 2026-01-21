import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe, RefreshCw, AlertTriangle } from 'lucide-react';
import { NewsItem } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SkeletonNews = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
                <div className="h-5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded mb-3"></div>
                <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
            </div>
        ))}
    </div>
);

const getCategoryStyle = (category: string) => {
    switch (category) {
        case 'FIIs': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
        case 'Ações': return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30';
        case 'Macro': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
        default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'FIIs': return Building2;
        case 'Ações': return TrendingUp;
        case 'Macro': return Globe;
        default: return Newspaper;
    }
};

export const News: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchNews = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('/api/news');
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();
            
            if (Array.isArray(data)) {
                const formatted: NewsItem[] = data.map((item: any, index: number) => ({
                    id: String(index),
                    title: item.title,
                    summary: item.summary,
                    source: item.sourceName || 'Fonte Desconhecida',
                    url: item.link,
                    // Formata data relativa (ex: "há 2 horas")
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
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Falso */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2 opacity-60">
                        <Newspaper className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Últimas do Mercado</span>
                    </div>
                    {!loading && (
                        <button onClick={fetchNews} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {loading ? (
                    <SkeletonNews />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <AlertTriangle className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                        <p className="text-xs font-bold text-zinc-500 mb-4">Não foi possível carregar as notícias.</p>
                        <button onClick={fetchNews} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Tentar Novamente</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {news.length > 0 ? (
                            news.map((item, index) => {
                                const CategoryIcon = getCategoryIcon(item.category);
                                return (
                                    <a 
                                        key={item.id}
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect group anim-slide-up"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getCategoryStyle(item.category)}`}>
                                                <CategoryIcon className="w-3 h-3" />
                                                {item.category}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                                                <Clock className="w-3 h-3" />
                                                {item.date}
                                            </div>
                                        </div>
                                        
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        
                                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-3">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[150px]">{item.source}</span>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                                                Ler notícia <ExternalLink className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </a>
                                );
                            })
                        ) : (
                            <div className="text-center py-20 opacity-40">
                                <p className="text-xs font-bold text-zinc-500">Nenhuma notícia encontrada no momento.</p>
                            </div>
                        )}
                        
                        {news.length > 0 && (
                            <div className="pt-4 text-center">
                                <p className="text-[10px] text-zinc-400 font-medium">
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
