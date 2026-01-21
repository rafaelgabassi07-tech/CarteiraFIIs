import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Clock, TrendingUp, Newspaper, Building2, Globe, RefreshCw, AlertTriangle, Search, Share2, X, Wallet } from 'lucide-react';
import { NewsItem, Transaction } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsProps {
    transactions?: Transaction[];
}

const SkeletonNews = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    </div>
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
                <div className="h-5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded mb-3"></div>
                <div className="h-12 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-xl"></div>
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

export const News: React.FC<NewsProps> = ({ transactions = [] }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    // Filtros e Abas
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Carteira' | 'FIIs' | 'Ações'>('Carteira');

    // Tickers únicos da carteira
    const portfolioTickers = useMemo(() => {
        const unique = new Set(transactions.map(t => t.ticker.toUpperCase()));
        return Array.from(unique);
    }, [transactions]);

    const fetchNews = useCallback(async (customQuery?: string) => {
        setLoading(true);
        setError(false);
        try {
            // Constrói a URL: Se tiver query, usa ela. Se não, usa o endpoint padrão.
            const url = customQuery 
                ? `/api/news?q=${encodeURIComponent(customQuery)}`
                : '/api/news';

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
    }, []);

    // Efeito para carregar notícias quando a aba muda
    useEffect(() => {
        if (activeTab === 'Carteira') {
            if (portfolioTickers.length > 0) {
                // Monta query OR limitada para não estourar URL (max ~15 tickers)
                const query = portfolioTickers.slice(0, 15).join(' OR ');
                fetchNews(query);
            } else {
                // Se não tiver ativos, carrega padrão mas filtra visualmente (ou mostra aviso)
                fetchNews(); 
            }
        } else {
            // Abas FIIs/Ações carregam o feed geral e filtram no frontend (ou backend poderia suportar isso melhor)
            fetchNews();
        }
    }, [activeTab, portfolioTickers, fetchNews]);

    const handleSearchSubmit = () => {
        if (!searchTerm.trim()) return;
        // Ao buscar, ignoramos a aba ativa temporariamente (ou poderíamos ter uma aba 'Busca')
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
        // Se a busca estiver ativa (retornou resultados via API), mostramos tudo
        // Se não, aplicamos o filtro da aba ATUAL (Client-side filtering para abas padrão)
        
        // Se a API retornou coisas baseadas em busca específica (Carteira ou Search), 
        // a categoria pode vir 'Geral' ou misturada. Nesse caso, não filtramos rigidamente por categoria da aba
        // a menos que seja FIIs/Ações do feed geral.
        
        const isPortfolioMode = activeTab === 'Carteira' && portfolioTickers.length > 0;
        const isSearchMode = searchTerm.length > 0 && !loading; // Se buscou, mostra tudo que veio

        return news.filter(item => {
            if (isSearchMode) return true; // Na busca, mostra tudo que a API retornou
            if (isPortfolioMode) return true; // Na carteira, mostra tudo que a API retornou (já filtrado lá)
            
            // Logica padrão para abas FIIs/Ações (Feed Geral)
            const matchesCategory = item.category === activeTab;
            return matchesCategory;
        });
    }, [news, activeTab, portfolioTickers, searchTerm, loading]);

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sticky */}
            <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all -mx-4 px-6 py-3 mb-4">
                <div className="flex flex-col gap-3">
                    
                    {/* Linha 1: Busca e Refresh */}
                    <div className="flex gap-2">
                        <div className="relative group flex-1">
                            <button onClick={handleSearchSubmit} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </button>
                            <input 
                                type="text" 
                                placeholder="Buscar notícias (Enter)..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => { setSearchTerm(''); fetchNews(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => fetchNews(searchTerm || (activeTab === 'Carteira' ? portfolioTickers.join(' OR ') : undefined))} 
                            disabled={loading}
                            className={`w-10 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Linha 2: Abas (Carteira | FIIs | Ações) */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl relative">
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`}
                            style={{ 
                                left: '4px',
                                transform: `translateX(${activeTab === 'Carteira' ? '0%' : activeTab === 'FIIs' ? '100%' : '200%'})`
                            }}
                        ></div>
                        
                        <button 
                            onClick={() => setActiveTab('Carteira')} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'Carteira' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <Wallet className="w-3.5 h-3.5" /> Carteira
                        </button>
                        <button 
                            onClick={() => setActiveTab('FIIs')} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'FIIs' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <Building2 className="w-3.5 h-3.5" /> FIIs
                        </button>
                        <button 
                            onClick={() => setActiveTab('Ações')} 
                            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'Ações' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> Ações
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4">
                {loading ? (
                    <SkeletonNews />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <AlertTriangle className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                        <p className="text-xs font-bold text-zinc-500 mb-4">Não foi possível carregar as notícias.</p>
                        <button onClick={() => fetchNews()} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 press-effect">
                            Tentar Novamente
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeTab === 'Carteira' && portfolioTickers.length === 0 && !searchTerm && (
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-center mb-4">
                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Sua carteira está vazia.</p>
                                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1">Adicione ativos para ver notícias personalizadas aqui.</p>
                            </div>
                        )}

                        {filteredNews.length > 0 ? (
                            filteredNews.map((item, index) => {
                                const CategoryIcon = getCategoryIcon(item.category);
                                return (
                                    <a 
                                        key={index}
                                        href={item.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect group anim-slide-up relative overflow-hidden"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-3 relative z-10">
                                            <div className="flex items-center gap-2">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.source} className="w-5 h-5 rounded-full object-contain bg-white p-0.5 border border-zinc-100 dark:border-zinc-800" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                        <Globe className="w-3 h-3" />
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate max-w-[120px]">
                                                    {item.source}
                                                </span>
                                            </div>
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${getCategoryStyle(item.category)}`}>
                                                <CategoryIcon className="w-2.5 h-2.5" />
                                                {item.category}
                                            </div>
                                        </div>
                                        
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10">
                                            {item.title}
                                        </h3>
                                        
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-4 line-clamp-2 relative z-10">
                                            {item.summary}
                                        </p>

                                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 relative z-10">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                                <Clock className="w-3 h-3" />
                                                {item.date}
                                            </div>
                                            
                                            <button 
                                                onClick={(e) => handleShare(item, e)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                            >
                                                <Share2 className="w-3 h-3" /> Compartilhar
                                            </button>
                                        </div>
                                    </a>
                                );
                            })
                        ) : (
                            <div className="text-center py-20 opacity-40 anim-fade-in">
                                <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhuma notícia encontrada</p>
                                {searchTerm && <p className="text-[10px] text-zinc-400 mt-1">Tente buscar por outros termos</p>}
                            </div>
                        )}
                        
                        {filteredNews.length > 0 && (
                            <div className="pt-4 pb-8 text-center">
                                <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest opacity-60">
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