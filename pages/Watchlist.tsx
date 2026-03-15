import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft, RefreshCcw, AlertCircle, X, Filter, BarChart3, ArrowUpRight, ArrowDownRight, Bell, BellOff, ChevronRight } from 'lucide-react';
import { getQuotes, searchAssets } from '../services/brapiService';
import { fetchUnifiedMarketData } from '../services/dataService';
import { formatBRL } from '../utils/formatters';
import AssetModal from '../components/AssetModal';
import { AssetPosition, AssetType, DividendReceipt } from '../types';

interface WatchlistItem {
    ticker: string;
    price?: number;
    change?: number;
    dayHigh?: number;
    dayLow?: number;
    name?: string;
    logo?: string;
    fundamentals?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    segment?: string;
    type?: AssetType;
    updatedAt?: number;
}

const POPULAR_ASSETS = [
    { ticker: 'PETR4', name: 'Petrobras', type: 'STOCK' },
    { ticker: 'VALE3', name: 'Vale', type: 'STOCK' },
    { ticker: 'ITUB4', name: 'Itaú Unibanco', type: 'STOCK' },
    { ticker: 'BBAS3', name: 'Banco do Brasil', type: 'STOCK' },
    { ticker: 'WEGE3', name: 'WEG', type: 'STOCK' },
    { ticker: 'MXRF11', name: 'Maxi Renda', type: 'FII' },
    { ticker: 'HGLG11', name: 'CSHG Logística', type: 'FII' },
    { ticker: 'KNIP11', name: 'Kinea Índices', type: 'FII' },
    { ticker: 'XPML11', name: 'XP Malls', type: 'FII' },
    { ticker: 'VISC11', name: 'Vinci Shopping', type: 'FII' },
];

interface WatchlistProps {
    showToast?: (type: 'success' | 'error' | 'info', text: string) => void;
}

export default function Watchlist({ showToast }: WatchlistProps) {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [alerts, setAlerts] = useState<Record<string, { target: number; type: 'ABOVE' | 'BELOW' }>>({});
    const [quotes, setQuotes] = useState<Record<string, WatchlistItem>>({});
    const [loading, setLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [marketDividends, setMarketDividends] = useState<DividendReceipt[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'STOCK' | 'FII' | 'ALERTS'>('ALL');
    const [sortBy, setSortBy] = useState<'TICKER' | 'PRICE' | 'CHANGE'>('TICKER');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

    // Alert Modal State
    const [alertingTicker, setAlertingTicker] = useState<string | null>(null);
    const [alertPrice, setAlertPrice] = useState<string>('');
    const [alertType, setAlertType] = useState<'ABOVE' | 'BELOW'>('ABOVE');

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<WatchlistItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Load from LocalStorage on mount
    useEffect(() => {
        const savedWatchlist = localStorage.getItem('user_watchlist');
        const savedAlerts = localStorage.getItem('user_watchlist_alerts');
        
        if (savedWatchlist) {
            try {
                setWatchlist(JSON.parse(savedWatchlist));
            } catch (e) {
                console.error("Failed to parse watchlist", e);
            }
        }

        if (savedAlerts) {
            try {
                setAlerts(JSON.parse(savedAlerts));
            } catch (e) {
                console.error("Failed to parse alerts", e);
            }
        }
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        localStorage.setItem('user_watchlist_alerts', JSON.stringify(alerts));
    }, [alerts]);

    const handleSetAlert = () => {
        if (!alertingTicker || !alertPrice) return;
        
        const price = parseFloat(alertPrice.replace(',', '.'));
        if (isNaN(price)) return;

        setAlerts(prev => ({
            ...prev,
            [alertingTicker]: { target: price, type: alertType }
        }));
        
        setAlertingTicker(null);
        setAlertPrice('');
    };

    const removeAlert = (ticker: string) => {
        setAlerts(prev => {
            const next = { ...prev };
            delete next[ticker];
            return next;
        });
    };

    const fetchData = useCallback(async (forceRefresh = false, specificTickers?: string[]) => {
        const tickersToFetch = specificTickers || watchlist;
        
        if (tickersToFetch.length === 0) {
            if (!specificTickers) setQuotes({});
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            
            // 1. Fetch Real-time Quotes from Brapi
            const quotesPromise = getQuotes(tickersToFetch).catch(err => {
                console.error("[Watchlist] Brapi Error:", err);
                if (showToast) showToast('error', `Brapi: ${err}`);
                return { quotes: [], error: err };
            });
            
            // 2. Fetch Fundamentals & Metadata from Scraper/DB
            const unifiedDataPromise = fetchUnifiedMarketData(tickersToFetch, undefined, forceRefresh).catch(err => {
                console.error("[Watchlist] Unified Data Error:", err);
                return { dividends: [], metadata: {}, error: err };
            });

            const [brapiResult, unifiedData] = await Promise.all([quotesPromise, unifiedDataPromise]);
            const brapiData = brapiResult?.quotes || [];
            
            if (unifiedData?.dividends) {
                setMarketDividends(prev => {
                    if (specificTickers) {
                        const filtered = prev.filter(d => !specificTickers.includes(d.ticker));
                        return [...filtered, ...unifiedData.dividends];
                    }
                    return unifiedData.dividends;
                });
            }

            setQuotes(prev => {
                const newQuotes = { ...prev };
                
                brapiData.forEach((q: any) => {
                    const ticker = q.symbol;
                    newQuotes[ticker] = {
                        ...newQuotes[ticker],
                        ticker: ticker,
                        price: q.regularMarketPrice,
                        change: q.regularMarketChangePercent,
                        dayHigh: q.regularMarketDayHigh,
                        dayLow: q.regularMarketDayLow,
                        name: q.longName || q.shortName || newQuotes[ticker]?.name,
                        logo: q.logourl || newQuotes[ticker]?.logo,
                        updatedAt: Date.now()
                    };
                });

                if (unifiedData?.metadata) {
                    Object.entries(unifiedData.metadata).forEach(([ticker, meta]: [string, any]) => {
                        newQuotes[ticker] = {
                            ...newQuotes[ticker],
                            ticker: ticker,
                            name: newQuotes[ticker]?.name || meta.company_name || meta.fundamentals?.company_name || ticker,
                            fundamentals: meta.fundamentals,
                            metadata: meta, // Store full metadata
                            segment: meta.segment,
                            type: meta.type,
                            price: newQuotes[ticker]?.price || meta.fundamentals?.price || 0,
                            updatedAt: Date.now()
                        };
                    });
                }
                
                return newQuotes;
            });

        } catch (e) {
            console.error("Error fetching watchlist data", e);
            setError("Falha ao atualizar dados. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    }, [watchlist]);

    useEffect(() => {
        const missingData = watchlist.some(t => !quotes[t]);
        if (missingData || watchlist.length > 0 && Object.keys(quotes).length === 0) {
            fetchData(false);
        }
        const interval = setInterval(() => fetchData(false), 60000);
        return () => clearInterval(interval);
    }, [watchlist, fetchData]);

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setIsSearching(true);
                setSearchError(null);
                setSearchResults([]);
                try {
                    const query = searchTerm.toUpperCase().trim();
                    const { results, error } = await searchAssets(query);
                    
                    if (error) {
                        setSearchError(error);
                    } else if (results && results.length > 0) {
                        const formattedResults = results.map((q: any) => ({
                            ticker: q.stock,
                            name: q.name,
                            logo: q.logo,
                            price: q.close,
                            change: q.change,
                            type: (q.stock.endsWith('11') || q.stock.endsWith('11B')) ? AssetType.FII : AssetType.STOCK
                        }));
                        setSearchResults(formattedResults);
                    } else {
                        setSearchError("Nenhum ativo encontrado.");
                    }
                } catch (err) {
                    setSearchError("Erro ao buscar ativo.");
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setSearchError(null);
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleAddTicker = async (tickerToAdd: string) => {
        if (watchlist.includes(tickerToAdd)) {
            setSearchTerm('');
            setSearchResults([]);
            return;
        }

        const newWatchlist = [...watchlist, tickerToAdd];
        setWatchlist(newWatchlist);
        setSearchTerm('');
        setSearchResults([]);

        await fetchData(true, [tickerToAdd]);
    };

    const removeTicker = (ticker: string) => {
        setWatchlist(prev => prev.filter(t => t !== ticker));
        setQuotes(prev => {
            const next = { ...prev };
            delete next[ticker];
            return next;
        });
    };

    const handleAssetClick = (ticker: string) => {
        const quote = quotes[ticker];
        const fundamentals: any = quote?.fundamentals || {};
        const metadata: any = quote?.metadata || {};
        
        let assetType = quote?.type || metadata.type;
        if (!assetType) {
            assetType = (ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK;
        }

        const asset: any = {
            ...metadata,
            ...fundamentals,
            ticker: ticker,
            quantity: 0,
            averagePrice: 0,
            currentPrice: quote?.price || 0,
            totalDividends: 0,
            assetType: assetType,
            segment: quote?.segment || metadata.segment || fundamentals.segment || 'Geral',
            logoUrl: quote?.logo,
            dividends: [],
            company_name: quote?.name || metadata.company_name || fundamentals.company_name,
            change: quote?.change || 0,
            dailyChange: quote?.change || 0,
        };
        
        setSelectedAsset(asset);
    };

    const sortedAndFilteredWatchlist = useMemo(() => {
        let list = [...watchlist];
        
        // Filter
        if (filter !== 'ALL') {
            list = list.filter(ticker => {
                if (filter === 'ALERTS') {
                    return !!alerts[ticker];
                }
                const quote = quotes[ticker];
                const type = quote?.type || ((ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK);
                return type === (filter === 'STOCK' ? AssetType.STOCK : AssetType.FII);
            });
        }

        // Sort
        list.sort((a, b) => {
            const quoteA = quotes[a];
            const quoteB = quotes[b];
            
            let valA: string | number = a as unknown as string | number;
            let valB: string | number = b as unknown as string | number;

            if (sortBy === 'PRICE') {
                valA = quoteA?.price || 0;
                valB = quoteB?.price || 0;
            } else if (sortBy === 'CHANGE') {
                valA = quoteA?.change || 0;
                valB = quoteB?.change || 0;
            }

            if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
            if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
            return 0;
        });

        return list;
    }, [watchlist, quotes, filter, sortBy, sortOrder]);

    // Derived Stats
    const stats = useMemo(() => {
        let up = 0, down = 0, neutral = 0;
        watchlist.forEach(t => {
            const c = quotes[t]?.change || 0;
            if (c > 0) up++;
            else if (c < 0) down++;
            else neutral++;
        });
        return { up, down, neutral };
    }, [watchlist, quotes]);

    const toggleSort = (newSort: typeof sortBy) => {
        if (sortBy === newSort) {
            setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(newSort);
            setSortOrder('DESC'); // Default to DESC for price/change
        }
    };

    return (
        <div className="pb-32 px-4 max-w-md mx-auto min-h-screen bg-zinc-50 dark:bg-zinc-950 selection:bg-indigo-500/30">
            {/* Header Actions & Filters - Sticky & Glass */}
            <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 mb-4 transition-all">
                <div className="flex flex-col gap-3">
                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Adicionar ativo (ex: PETR4)"
                            className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500/50 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                            {isSearching ? (
                                <RefreshCcw className="h-4 w-4 text-indigo-500 animate-spin" />
                            ) : searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                    <X className="h-3 w-3 text-zinc-500" />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchTerm && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[300px] overflow-y-auto no-scrollbar">
                                {searchResults.length > 0 ? (
                                    <div className="flex flex-col">
                                        {searchResults.map((result) => (
                                            <div 
                                                key={result.ticker}
                                                onClick={() => { handleAddTicker(result.ticker); }}
                                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-700 shadow-sm">
                                                        {result.logo ? (
                                                            <img src={result.logo} alt={result.ticker} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-black text-xs text-zinc-400">{result.ticker.substring(0, 2)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-black text-base text-zinc-900 dark:text-white leading-none group-hover:text-indigo-600 transition-colors">{result.ticker}</h3>
                                                            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${result.type === AssetType.FII ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                                                {result.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1 truncate max-w-[120px]">{result.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(result.price || 0)}</span>
                                                        {result.change !== undefined && (
                                                            <span className={`text-[9px] font-bold ${result.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {result.change >= 0 ? '+' : ''}{result.change.toFixed(2)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0">
                                                        <Plus className="w-4 h-4" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : isSearching ? (
                                    <div className="p-6 text-center">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <RefreshCcw className="w-5 h-5 text-indigo-500 animate-spin" />
                                        </div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Buscando ativo...</p>
                                    </div>
                                ) : searchError ? (
                                    <div className="p-6 text-center">
                                        <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <AlertCircle className="w-5 h-5 text-rose-500" />
                                        </div>
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{searchError}</p>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-linear-fade">
                        {(['ALL', 'STOCK', 'FII', 'ALERTS'] as const).map((f) => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${filter === f ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900 shadow-md transform scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'STOCK' ? 'Ações' : f === 'FII' ? 'FIIs' : 'Alertas'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sorting */}
            {watchlist.length > 0 && (
                <div className="flex items-center justify-between px-1 mb-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {sortedAndFilteredWatchlist.length} {sortedAndFilteredWatchlist.length === 1 ? 'Ativo' : 'Ativos'}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => toggleSort('TICKER')}
                            className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 transition-colors ${sortBy === 'TICKER' ? 'text-indigo-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            Ticker {sortBy === 'TICKER' && (sortOrder === 'ASC' ? '↑' : '↓')}
                        </button>
                        <button 
                            onClick={() => toggleSort('PRICE')}
                            className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 transition-colors ${sortBy === 'PRICE' ? 'text-indigo-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            Preço {sortBy === 'PRICE' && (sortOrder === 'ASC' ? '↑' : '↓')}
                        </button>
                        <button 
                            onClick={() => toggleSort('CHANGE')}
                            className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 transition-colors ${sortBy === 'CHANGE' ? 'text-indigo-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            Var. {sortBy === 'CHANGE' && (sortOrder === 'ASC' ? '↑' : '↓')}
                        </button>
                    </div>
                </div>
            )}


            {error && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-12 h-12 bg-gradient-to-br from-white to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-zinc-200/50 dark:shadow-black/50 border border-white/50 dark:border-zinc-800 relative group">
                        <Star className="w-6 h-6 text-zinc-300 dark:text-zinc-700 group-hover:text-indigo-500 transition-colors duration-500" fill="currentColor" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md animate-bounce delay-700 border-2 border-zinc-50 dark:border-zinc-950">
                            <Plus className="w-2 h-2" />
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">Sua Lista</h3>
                    <p className="text-zinc-400 font-medium text-[9px] max-w-[180px] mb-4 leading-relaxed">Adicione ativos para acompanhar cotações e indicadores em tempo real.</p>
                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg font-bold text-[9px] uppercase tracking-wider">
                        Use a barra acima para adicionar
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {sortedAndFilteredWatchlist.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                            <Filter className="w-6 h-6 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
                            <p className="text-zinc-400 font-bold text-[9px] uppercase tracking-wider">Nenhum ativo encontrado</p>
                        </div>
                    ) : (
                        sortedAndFilteredWatchlist.map(ticker => {
                            const quote = quotes[ticker];
                            const price = quote?.price;
                            const change = quote?.change || 0;
                            const isPositive = change >= 0;
                            const hasData = !!quote && price !== undefined && price !== 0;
                            const isUpdating = loading && !!quote;
                            const isLoadingInitial = loading && !quote;
                            const fundamentals: any = quote?.fundamentals || {};
                            const alert = alerts[ticker];
                            const isAlertTriggered = alert && (
                                (alert.type === 'ABOVE' && price && price >= alert.target) ||
                                (alert.type === 'BELOW' && price && price <= alert.target)
                            );

                            return (
                                <div 
                                    key={ticker} 
                                    onClick={() => handleAssetClick(ticker)}
                                    className={`group bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] relative overflow-hidden ${isUpdating ? 'opacity-90' : ''}`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-700 shadow-sm relative shrink-0">
                                                {quote?.logo && (
                                                    <img 
                                                        src={quote.logo} 
                                                        alt={ticker} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement?.classList.add('fallback-initials');
                                                        }} 
                                                    />
                                                )}
                                                <span className={`text-[10px] font-black text-zinc-300 dark:text-zinc-600 absolute inset-0 flex items-center justify-center ${quote?.logo ? 'hidden fallback-initials:flex' : 'flex'}`}>
                                                    {ticker.substring(0, 2)}
                                                </span>
                                                {isUpdating && (
                                                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                                                        <RefreshCcw className="w-3 h-3 text-indigo-500 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-zinc-900 dark:text-white text-sm tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{ticker}</h3>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${quote?.type === 'FII' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                                        {quote?.type || (ticker.endsWith('11') ? 'FII' : 'Ação')}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider truncate">
                                                    {quote?.name || (isLoadingInitial ? 'Atualizando...' : 'Ativo')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 pl-2 shrink-0">
                                            <p className="font-black text-zinc-900 dark:text-white tabular-nums text-sm tracking-tight">
                                                {hasData ? formatBRL(price) : (isLoadingInitial ? <span className="animate-pulse text-zinc-200">---</span> : <span className="text-zinc-300 text-[10px] font-bold">Indisp.</span>)}
                                            </p>
                                            
                                            {hasData && (
                                                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                                    {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                                    {Math.abs(change).toFixed(2)}%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Additional Info Grid - Compact */}
                                    {hasData && (
                                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 relative z-10">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">DY (12M)</span>
                                                <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-200">{fundamentals.dy_12m ? `${Number(fundamentals.dy_12m).toFixed(2)}%` : '--'}</span>
                                            </div>
                                            <div className="flex flex-col text-center">
                                                <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">P/VP</span>
                                                <span className={`text-[10px] font-black ${Number(fundamentals.p_vp) > 1.1 ? 'text-rose-500' : Number(fundamentals.p_vp) < 0.9 ? 'text-emerald-500' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                                    {fundamentals.p_vp ? Number(fundamentals.p_vp).toFixed(2) : '--'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">Segmento</span>
                                                <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-200 truncate max-w-[80px]">{quote?.segment || 'Geral'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Alert Status */}
                                    {alert && (
                                        <div className={`mt-4 flex items-center justify-between px-3 py-2 rounded-xl border ${isAlertTriggered ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-700/50'} relative z-10`}>
                                            <div className="flex items-center gap-2">
                                                <Bell className={`w-3 h-3 ${isAlertTriggered ? 'text-amber-500 animate-bounce' : 'text-zinc-400'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isAlertTriggered ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`}>
                                                    {alert.type === 'ABOVE' ? '>' : '<'} {formatBRL(alert.target)}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeAlert(ticker); }}
                                                className="text-[9px] font-black text-zinc-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    )}

                                    {/* Actions Overlay */}
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-x-4 group-hover:translate-x-0">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setAlertingTicker(ticker); setAlertPrice(price?.toString() || ''); }}
                                            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-indigo-500 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 transition-all"
                                        >
                                            <Bell className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeTicker(ticker); }}
                                            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-rose-500 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Price Alert Modal */}
            {alertingTicker && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-full duration-500 ease-out border-t sm:border border-white/20 dark:border-zinc-800/50">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter">Alerta de Preço</h2>
                                <p className="text-[9px] text-zinc-400 font-black mt-1 uppercase tracking-[0.2em]">{alertingTicker}</p>
                            </div>
                            <button onClick={() => setAlertingTicker(null)} className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Tipo de Alerta</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setAlertType('ABOVE')}
                                        className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${alertType === 'ABOVE' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg shadow-zinc-900/10' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50'}`}
                                    >
                                        Preço Acima de
                                    </button>
                                    <button 
                                        onClick={() => setAlertType('BELOW')}
                                        className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${alertType === 'BELOW' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg shadow-zinc-900/10' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50'}`}
                                    >
                                        Preço Abaixo de
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Preço Alvo (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">R$</span>
                                    <input 
                                        type="text"
                                        value={alertPrice}
                                        onChange={(e) => setAlertPrice(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500/20 rounded-xl text-lg font-black text-zinc-900 dark:text-white transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleSetAlert}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1"
                            >
                                Salvar Alerta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedAsset && (
                <AssetModal 
                    asset={selectedAsset} 
                    onClose={() => setSelectedAsset(null)} 
                    onAssetRefresh={() => fetchData(true, [selectedAsset.ticker])} 
                    marketDividends={marketDividends} 
                    incomeChartData={{ data: [], average: 0, activeTypes: [] }} 
                    privacyMode={false} 
                />
            )}
        </div>
    );
}
