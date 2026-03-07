import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Search, X, Wallet, TrendingUp, TrendingDown, Building2, Globe, Check, Newspaper, Share2 } from 'lucide-react';
import { NewsItem, Transaction, NewsSentiment, NewsImpact } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsProps {
    transactions?: Transaction[];
}

const SkeletonNews = () => (
    <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
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

const analyzeNewsContent = (title: string, summary: string): { sentiment: NewsSentiment, impact: NewsImpact } => {
    const text = (title + ' ' + summary).toLowerCase();
    
    const positiveWords = ['lucro', 'dispara', 'sobe', 'alta', 'positivo', 'recorde', 'supera', 'cresce', 'anuncia dividendos', 'bonificação', 'recompra', 'otimista', 'avança', 'pagará', 'jcp', 'proventos', 'dividendos', 'valorização', 'expansion'];
    const negativeWords = ['prejuízo', 'cai', 'queda', 'baixa', 'negativo', 'pessimista', 'recua', 'desaba', 'perda', 'abaixo', 'piora', 'desvaloriza', 'rombo', 'crise'];
    const riskWords = ['falência', 'recuperação judicial', 'fraude', 'investigação', 'calote', 'dívida', 'crise', 'alerta', 'risco', 'incerteza', 'suspensão', 'irregularidade', 'rombo', 'polêmica', 'inadimplência'];
    const highImpactWords = ['dispara', 'desaba', 'recorde', 'urgente', 'atenção', 'impacto', 'surpreende', 'fusão', 'aquisição', 'oferta pública', 'selic', 'copom', 'ipca', 'pib', 'fed', 'juros'];

    let score = 0;
    positiveWords.forEach(w => { if (text.includes(w)) score++; });
    negativeWords.forEach(w => { if (text.includes(w)) score--; });

    let sentiment: NewsSentiment = 'neutral';
    if (score > 0) sentiment = 'positive';
    else if (score < 0) sentiment = 'negative';

    let impact: NewsImpact = 'normal';
    if (riskWords.some(w => text.includes(w))) impact = 'risk';
    else if (highImpactWords.some(w => text.includes(w)) || Math.abs(score) >= 2) impact = 'high';

    return { sentiment, impact };
};

const isSimilar = (s1: string, s2: string) => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 3);
    const words1 = normalize(s1);
    const words2 = normalize(s2);
    if (words1.length === 0 || words2.length === 0) return false;
    const intersection = words1.filter(w => words2.includes(w));
    const similarity = intersection.length / Math.max(words1.length, words2.length);
    return similarity > 0.7; 
};

const HeroNews = ({ item, onShare }: { item: NewsItem, onShare: (item: NewsItem, e: React.MouseEvent) => void }) => (
    <a 
        href={item.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block relative w-full aspect-[4/5] sm:aspect-[2/1] rounded-[2.5rem] overflow-hidden mb-8 group active:scale-[0.98] transition-all shadow-2xl shadow-black/20"
    >
        {item.imageUrl ? (
            <img 
                src={item.imageUrl} 
                alt={item.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                onError={(e) => (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/news/800/600'}
            />
        ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <Newspaper className="w-20 h-20 text-white/10" />
            </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col justify-end h-full">
            <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                    Destaque
                </span>
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-white/50"></span>
                    {item.source}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-auto">
                    {item.date}
                </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-[0.95] tracking-tighter mb-4 line-clamp-3">
                {item.title}
            </h2>
            
            <p className="text-sm text-zinc-300 line-clamp-2 font-medium leading-relaxed mb-6 max-w-2xl">
                {item.summary.replace(/<[^>]*>?/gm, '')}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <div className="flex gap-2">
                    {item.sentiment === 'positive' && (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <TrendingUp className="w-4 h-4" /> Otimista
                        </span>
                    )}
                    {item.sentiment === 'negative' && (
                        <span className="flex items-center gap-1.5 text-rose-400 text-[10px] font-black uppercase tracking-widest">
                            <TrendingDown className="w-4 h-4" /> Pessimista
                        </span>
                    )}
                </div>
                
                <button 
                    onClick={(e) => onShare(item, e)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10 active:scale-90"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    </a>
);

export const News: React.FC<NewsProps> = ({ transactions = [] }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Carteira' | 'FIIs' | 'Ações'>('Carteira');

    const filteredNews = useMemo(() => {
        const uniqueNews: NewsItem[] = [];
        news.forEach(item => {
            const isDuplicate = uniqueNews.some(existing => isSimilar(item.title, existing.title));
            if (!isDuplicate) {
                uniqueNews.push(item);
            }
        });
        return uniqueNews;
    }, [news]);

    const portfolioTickers = useMemo(() => {
        const unique = new Set(transactions.map(t => t.ticker.toUpperCase()));
        return Array.from(unique);
    }, [transactions]);

    const analyzeWithAI = useCallback(async (items: NewsItem[]) => {
        // Analyze top 15 items to save resources and improve latency
        const toAnalyze = items.slice(0, 15).map(i => ({ id: i.id, title: i.title, summary: i.summary }));
        
        if (toAnalyze.length === 0) return;

        try {
            const res = await fetch('/api/analyze-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: toAnalyze })
            });

            if (!res.ok) return;

            const analysisResults = await res.json();
            
            if (Array.isArray(analysisResults)) {
                setNews(prev => prev.map(item => {
                    const result = analysisResults.find((r: any) => r.id === item.id);
                    if (result) {
                        return { ...item, sentiment: result.sentiment, impact: result.impact };
                    }
                    return item;
                }));
            }

        } catch (e) {
            console.warn('AI Analysis failed (using fallback)', e);
        }
    }, []);

    const fetchNews = useCallback(async (customQuery?: string) => {
        setLoading(true);
        setError(false);
        try {
            const url = customQuery 
                ? `/api/news?q=${encodeURIComponent(customQuery)}`
                : '/api/news';

            const res = await fetch(url);
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();
            
            if (Array.isArray(data)) {
                const formatted: NewsItem[] = data.map((item: any, index: number) => {
                    const { sentiment, impact } = analyzeNewsContent(item.title, item.summary);
                    return {
                        id: String(index),
                        title: item.title,
                        summary: item.summary,
                        source: item.sourceName || 'Fonte Desconhecida',
                        url: item.link,
                        imageUrl: item.imageUrl,
                        date: item.publicationDate ? formatDistanceToNow(new Date(item.publicationDate), { addSuffix: true, locale: ptBR } as any) : 'Recentemente',
                        category: (item.category as any) || 'Geral',
                        sentiment,
                        impact
                    };
                });
                setNews(formatted);
                
                // Trigger AI analysis in background
                analyzeWithAI(formatted);
            } else {
                setNews([]);
            }
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [analyzeWithAI]);

    useEffect(() => {
        const interval = setInterval(() => {
            const query = activeTab === 'Carteira' && portfolioTickers.length > 0 ? portfolioTickers.slice(0, 15).join(' OR ') : searchTerm;
            fetchNews(query);
        }, 300000); 
        return () => clearInterval(interval);
    }, [activeTab, portfolioTickers, searchTerm, fetchNews]);

    useEffect(() => {
        if (activeTab === 'Carteira') {
            if (portfolioTickers.length > 0) {
                const query = portfolioTickers.slice(0, 15).join(' OR ');
                fetchNews(query);
            } else {
                fetchNews(); 
            }
        } else {
            fetchNews();
        }
    }, [activeTab, portfolioTickers, fetchNews]);

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
            setCopyFeedback(item.id);
            setTimeout(() => setCopyFeedback(null), 2000);
        }
    };

    return (
        <div className="pb-32 min-h-screen relative">
            
            {copyFeedback && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 anim-scale-in backdrop-blur-md">
                    <Check className="w-3 h-3 text-emerald-400" /> Link copiado!
                </div>
            )}

            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-2 mb-3">
                <div className="flex flex-col gap-2">
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
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-10 py-2 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                            className={`w-9 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

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
                            className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'Carteira' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <Wallet className="w-3.5 h-3.5" /> Carteira
                        </button>
                        <button 
                            onClick={() => setActiveTab('FIIs')} 
                            className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'FIIs' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <Building2 className="w-3.5 h-3.5" /> FIIs
                        </button>
                        <button 
                            onClick={() => setActiveTab('Ações')} 
                            className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-2 ${activeTab === 'Ações' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> Ações
                        </button>
                    </div>
                </div>
            </div>

            <div className="-mx-2 px-2">
                {loading ? (
                    <SkeletonNews />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <AlertTriangle className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Erro ao carregar notícias.</p>
                        <button onClick={() => fetchNews()} className="mt-4 text-xs font-bold text-indigo-500 hover:underline">Tentar novamente</button>
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <Newspaper className="w-12 h-12 mb-3 text-zinc-300" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhuma notícia encontrada.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNews.length > 0 && (
                            <HeroNews item={filteredNews[0]} onShare={handleShare} />
                        )}
                        {filteredNews.slice(1).map((item) => (
                            <a 
                                key={item.id} 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm active:scale-[0.98] transition-all relative group overflow-hidden hover:border-indigo-200 dark:hover:border-zinc-700"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2.5">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.source} className="w-6 h-6 rounded-full object-cover bg-zinc-100 border border-zinc-200 dark:border-zinc-700" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase border border-zinc-200 dark:border-zinc-700">
                                                {item.source.substring(0, 1)}
                                            </div>
                                        )}
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.source}</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 font-bold">{item.date}</span>
                                </div>

                                <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight mb-2 line-clamp-2 tracking-tight">
                                    {item.title}
                                </h3>

                                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4 font-medium">
                                    {item.summary.replace(/<[^>]*>?/gm, '')}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800/60">
                                    <div className="flex gap-2">
                                        {item.impact === 'high' && (
                                            <span className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-100 dark:border-rose-800/30">
                                                <AlertTriangle className="w-3 h-3" /> Impacto
                                            </span>
                                        )}
                                        {item.impact === 'risk' && (
                                            <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-100 dark:border-amber-800/30">
                                                <AlertTriangle className="w-3 h-3" /> Risco
                                            </span>
                                        )}
                                        {item.sentiment === 'positive' && (
                                            <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-100 dark:border-emerald-800/30">
                                                <TrendingUp className="w-3 h-3" /> Otimista
                                            </span>
                                        )}
                                        {item.sentiment === 'negative' && (
                                            <span className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-100 dark:border-rose-800/30">
                                                <TrendingDown className="w-3 h-3" /> Pessimista
                                            </span>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => handleShare(item, e)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-90"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};