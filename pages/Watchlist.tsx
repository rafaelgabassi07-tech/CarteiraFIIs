import React, { useState, useEffect } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft } from 'lucide-react';
import { getQuotes } from '../services/brapiService';
import { formatBRL } from '../utils/formatters';

interface WatchlistItem {
    ticker: string;
    price?: number;
    change?: number;
    name?: string;
    logo?: string;
}

export default function Watchlist() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<Record<string, WatchlistItem>>({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('user_watchlist');
        if (saved) {
            try {
                setWatchlist(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse watchlist", e);
            }
        }
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    // Fetch quotes when watchlist changes
    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            if (watchlist.length === 0) {
                setQuotes({});
                return;
            }
            
            setLoading(true);
            try {
                // Fetch from Brapi (or backend proxy if needed)
                const { quotes: data, error } = await getQuotes(watchlist);
                
                if (mounted && data) {
                    const newQuotes: Record<string, WatchlistItem> = {};
                    data.forEach((q: any) => {
                        newQuotes[q.symbol] = {
                            ticker: q.symbol,
                            price: q.regularMarketPrice,
                            change: q.regularMarketChangePercent,
                            name: q.longName || q.shortName,
                            logo: q.logourl
                        };
                    });
                    setQuotes(newQuotes);
                }
            } catch (e) {
                console.error("Error fetching watchlist quotes", e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [watchlist]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        
        const ticker = searchTerm.toUpperCase().trim();
        if (!watchlist.includes(ticker)) {
            setWatchlist(prev => [...prev, ticker]);
        }
        setSearchTerm('');
        setIsAdding(false);
    };

    const removeTicker = (ticker: string) => {
        setWatchlist(prev => prev.filter(t => t !== ticker));
    };

    return (
        <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Favoritos</h1>
                    <p className="text-sm text-zinc-500 font-medium">Acompanhe seus ativos de interesse</p>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Digite o ticker (ex: PETR4)"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white placeholder-zinc-400 font-medium uppercase"
                            autoFocus
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    </div>
                </form>
            )}

            {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <Star className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="text-zinc-500 font-medium">Sua lista está vazia</p>
                    <p className="text-xs text-zinc-400 mt-1">Adicione ativos para acompanhar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {watchlist.map(ticker => {
                        const quote = quotes[ticker];
                        const price = quote?.price || 0;
                        const change = quote?.change || 0;
                        const isPositive = change >= 0;

                        return (
                            <div key={ticker} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                        {quote?.logo ? (
                                            <img src={quote.logo} alt={ticker} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-zinc-400">{ticker.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{ticker}</h3>
                                        <p className="text-xs text-zinc-500 truncate max-w-[120px]">{quote?.name || 'Carregando...'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-bold text-zinc-900 dark:text-white tabular-nums">
                                            {loading && !quote ? '...' : formatBRL(price)}
                                        </p>
                                        <div className={`flex items-center justify-end gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {change.toFixed(2)}%
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeTicker(ticker)}
                                        className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
