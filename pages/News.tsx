import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe, RefreshCw, AlertTriangle, Search, Share2, X, PlusCircle, ArrowUpRight } from 'lucide-react';
import { NewsItem, Transaction, AssetType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsProps {
    transactions?: Transaction[];
}

const SkeletonNews = () => (
    <div className="space-y-4 px-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                    <div className="h-2 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                </div>
                <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg opacity-60"></div>
                <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg opacity-60"></div>
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

    // Lógica principal de carregamento ao mudar de aba
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

    const handleShare = async (item: NewsItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: item.summary,
                    url: item.url
                });
            } catch (err) {
                console.error('Share dismissed', err);
            }
        } else {
            navigator.clipboard.writeText(`${item.title}\n${item.url}`);
        }
    };

    const filteredNews = useMemo(() => {
        return news; 
    }, [news]);

    const currentTickers = activeTab === 'FIIs' ? fiiTickers : stockTickers;
    const hasAssetsInTab = currentTickers.length > 0;

    return (
        <div className="pb-32 min-h-screen bg-zinc-50 dark:bg-black">
            {/* Header Moderno com Blur */}
            <div className="sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 px-4 bg-zinc-50/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="max-w-xl mx-auto space-y-4">
                    
                    {/* Título e Ações */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Notícias</h1>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Feed Inteligente</p>
                        </div>
                        <button 
                            onClick={() => fetchNews(searchTerm || currentTickers.join(' OR '))} 
                            disabled={loading || (!searchTerm && !hasAssetsInTab)}
                            className={`w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm active:scale-95 transition-all ${loading ? 'opacity-50' : ''}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Barra de Busca */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="block w-full pl-10 pr-10 py-3.5 bg-white dark:bg-zinc-900 border-none rounded-2xl text-sm font-medium text-zinc-900 dark:text-white placeholder-zinc-400 shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            placeholder="Buscar notícias, tickers..."
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(''); if (hasAssetsInTab) fetchNews(currentTickers.join(' OR ')); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Abas Estilizadas */}
                    <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900 rounded-2xl relative">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-800 rounded-xl shadow-sm transition-all duration-300 ease-out-mola ${activeTab === 'FIIs' ? 'left-1' : 'translate-x-[100%] left-1'}`}
                        ></div>
                        <button 
                            onClick={() => { setActiveTab('FIIs'); setSearchTerm(''); }} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'FIIs' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <Building2 className="w-3.5 h-3.5" /> FIIs <span className="opacity-50 ml-0.5">({fiiTickers.length})</span>
                        </button>
                        <button 
                            onClick={() => { setActiveTab('Ações'); setSearchTerm(''); }} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'Ações' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> Ações <span className="opacity-50 ml-0.5">({stockTickers.length})</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto pt-6">
                {loading ? (
                    <SkeletonNews />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center opacity-70">
                        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center text-rose-500 mb-4">
                            <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Falha na conexão</p>
                        <p className="text-xs text-zinc-500 mb-6">Não conseguimos carregar as últimas notícias.</p>
                        <button onClick={() => fetchNews(searchTerm || currentTickers.join(' OR '))} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest press-effect">
                            Tentar Novamente
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 px-4">
                        
                        {!searchTerm && !hasAssetsInTab && (
                            <div className="flex flex-col items-center justify-center py-20 text-center anim-fade-in">
                                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 text-zinc-300 dark:text-zinc-700 border border-zinc-200 dark:border-zinc-800 dashed">
                                    {activeTab === 'FIIs' ? <Building2 className="w-8 h-8" /> : <TrendingUp className="w-8 h-8" />}
                                </div>
                                <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Carteira Vazia</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[240px] leading-relaxed mb-8">
                                    Adicione {activeTab} para ver notícias personalizadas sobre seus ativos.
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-white dark:bg-zinc-900 py-2.5 px-5 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    <PlusCircle className="w-3.5 h-3.5" /> Adicione na aba Ordens
                                </div>
                            </div>
                        )}

                        {filteredNews.length > 0 ? (
                            filteredNews.map((item, index) => (
                                <a 
                                    key={index}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300 press-effect group anim-slide-up relative overflow-hidden"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="flex items-center gap-2">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.source} className="w-6 h-6 rounded-full object-contain bg-white p-0.5 border border-zinc-100 dark:border-zinc-800" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                    <Globe className="w-3 h-3" />
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider block leading-none">
                                                    {item.source}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                                            <Clock className="w-3 h-3" />
                                            {item.date}
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white mb-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10 line-clamp-3">
                                        {item.title}
                                    </h3>
                                    
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-4 line-clamp-2 relative z-10">
                                        {item.summary}
                                    </p>

                                    <div className="flex items-center justify-end pt-2 relative z-10">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                                            Ler notícia completa <ArrowUpRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </a>
                            ))
                        ) : (
                            (searchTerm || hasAssetsInTab) && !loading && (
                                <div className="text-center py-20 opacity-40 anim-fade-in">
                                    <Newspaper className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhuma notícia encontrada</p>
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