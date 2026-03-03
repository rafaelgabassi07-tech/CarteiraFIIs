import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft, RefreshCcw, AlertCircle, X, Filter, BarChart3, ArrowUpRight, ArrowDownRight, Bell, BellOff, ChevronRight } from 'lucide-react';
import { getQuotes } from '../services/brapiService';
import { fetchUnifiedMarketData } from '../services/dataService';
import { formatBRL } from '../utils/formatters';
import AssetModal from '../components/AssetModal';
import { AssetPosition, AssetType, DividendReceipt } from '../types';

interface WatchlistItem {
    ticker: string;
    price?: number;
    change?: number;
    name?: string;
    logo?: string;
    fundamentals?: any;
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
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [marketDividends, setMarketDividends] = useState<DividendReceipt[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'STOCK' | 'FII'>('ALL');
    const [sortBy, setSortBy] = useState<'TICKER' | 'PRICE' | 'CHANGE'>('TICKER');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

    // Alert Modal State
    const [alertingTicker, setAlertingTicker] = useState<string | null>(null);
    const [alertPrice, setAlertPrice] = useState<string>('');
    const [alertType, setAlertType] = useState<'ABOVE' | 'BELOW'>('ABOVE');

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<WatchlistItem | null>(null);
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
            console.log(`[Watchlist] Fetching data for: ${tickersToFetch.join(', ')} (Force: ${forceRefresh})`);
            
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
                            name: newQuotes[ticker]?.name || meta.fundamentals?.company_name || ticker,
                            fundamentals: meta.fundamentals,
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
            if (searchTerm.length >= 3) {
                setIsSearching(true);
                setSearchError(null);
                setSearchResult(null);
                try {
                    const ticker = searchTerm.toUpperCase().trim();
                    const { quotes } = await getQuotes([ticker]);
                    if (quotes && quotes.length > 0) {
                        const q = quotes[0];
                        setSearchResult({
                            ticker: q.symbol,
                            price: q.regularMarketPrice,
                            change: q.regularMarketChangePercent,
                            name: q.longName || q.shortName,
                            logo: q.logourl,
                            type: (ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK
                        });
                    } else {
                        setSearchError("Ativo não encontrado.");
                    }
                } catch (err) {
                    setSearchError("Erro ao buscar ativo.");
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResult(null);
                setSearchError(null);
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleAddTicker = async (tickerToAdd: string) => {
        if (watchlist.includes(tickerToAdd)) {
            setSearchTerm('');
            setIsAdding(false);
            return;
        }

        const newWatchlist = [...watchlist, tickerToAdd];
        setWatchlist(newWatchlist);
        setSearchTerm('');
        setIsAdding(false);
        setSearchResult(null);

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
        const fundamentals = quote?.fundamentals || {};
        
        let assetType = quote?.type;
        if (!assetType) {
            assetType = (ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK;
        }

        const asset: AssetPosition = {
            ticker: ticker,
            quantity: 0,
            averagePrice: 0,
            currentPrice: quote?.price || 0,
            totalDividends: 0,
            assetType: assetType,
            segment: quote?.segment || fundamentals.segment || 'Geral',
            logoUrl: quote?.logo,
            dividends: [],
            company_name: quote?.name || fundamentals.company_name,
            sector: fundamentals.sector,
            sub_sector: fundamentals.sub_sector,
            p_vp: fundamentals.p_vp || 0,
            p_l: fundamentals.p_l || 0,
            dy_12m: fundamentals.dy_12m || fundamentals.dy || 0,
            vacancy: fundamentals.vacancy || 0,
            assets_value: fundamentals.assets_value || 0,
            market_cap: fundamentals.market_cap || 0,
            last_dividend: fundamentals.last_dividend || 0,
            next_dividend: fundamentals.next_dividend,
            properties: fundamentals.properties || [],
            properties_count: fundamentals.properties_count || 0,
            ...fundamentals
        };
        
        setSelectedAsset(asset);
    };

    const sortedAndFilteredWatchlist = useMemo(() => {
        let list = [...watchlist];
        
        // Filter
        if (filter !== 'ALL') {
            list = list.filter(ticker => {
                const quote = quotes[ticker];
                const type = quote?.type || ((ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK);
                return type === (filter === 'STOCK' ? AssetType.STOCK : AssetType.FII);
            });
        }

        // Sort
        list.sort((a, b) => {
            const quoteA = quotes[a];
            const quoteB = quotes[b];
            
            let valA: any = a;
            let valB: any = b;

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
            <div className="sticky top-0 z-40 -mx-4 px-4 py-4 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 mb-6 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-1 mask-linear-fade">
                        {(['ALL', 'STOCK', 'FII'] as const).map((f) => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${filter === f ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/20 dark:shadow-white/10 scale-105' : 'bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'STOCK' ? 'Ações' : 'FIIs'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={() => fetchData(true)}
                            disabled={loading}
                            className={`w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm ${loading ? 'animate-spin text-indigo-500' : ''}`}
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/20 dark:shadow-white/10 active:scale-95 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:-translate-y-0.5 hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sorting */}
            {watchlist.length > 0 && (
                <div className="flex items-center justify-between px-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                    <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">
                        {sortedAndFilteredWatchlist.length} {sortedAndFilteredWatchlist.length === 1 ? 'Ativo' : 'Ativos'}
                    </span>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => toggleSort('TICKER')}
                            className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${sortBy === 'TICKER' ? 'text-indigo-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Ticker {sortBy === 'TICKER' && (sortOrder === 'ASC' ? '↑' : '↓')}
                        </button>
                        <button 
                            onClick={() => toggleSort('PRICE')}
                            className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${sortBy === 'PRICE' ? 'text-indigo-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Preço {sortBy === 'PRICE' && (sortOrder === 'ASC' ? '↑' : '↓')}
                        </button>
                        <button 
                            onClick={() => toggleSort('CHANGE')}
                            className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${sortBy === 'CHANGE' ? 'text-indigo-500' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Var. {sortBy === 'CHANGE' && (sortOrder === 'ASC' ? '↑' : '↓')}
                        </button>
                    </div>
                </div>
            )}

            {/* Add Asset Sheet/Modal - Enhanced UI */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-zinc-900/60 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in duration-300">
                    <div 
                        className="bg-zinc-50 dark:bg-zinc-950 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 sm:p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-500 ease-out border-t border-white/50 dark:border-zinc-800 ring-1 ring-black/5"
                    >
                        {/* Handle for mobile */}
                        <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-8 sm:hidden"></div>

                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Novo Favorito</h2>
                                <p className="text-[10px] text-zinc-400 font-black mt-2 uppercase tracking-[0.2em]">Acompanhe em tempo real</p>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-90 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative mb-8 group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="BUSCAR ATIVO (EX: PETR4)"
                                className="block w-full pl-14 pr-14 py-6 bg-white dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500/20 rounded-3xl text-xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase shadow-lg shadow-zinc-200/50 dark:shadow-none"
                                autoFocus
                            />
                            <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                                {isSearching ? (
                                    <RefreshCcw className="h-5 w-5 text-indigo-500 animate-spin" />
                                ) : searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="bg-zinc-100 dark:bg-zinc-800 rounded-full p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                        <X className="h-3 w-3 text-zinc-500" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="min-h-[240px]">
                            {searchResult ? (
                                <div 
                                    onClick={() => handleAddTicker(searchResult.ticker)}
                                    className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 group"
                                >
                                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-[2rem] p-6 flex items-center justify-between border border-zinc-100 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                                                {searchResult.logo ? (
                                                    <img src={searchResult.logo} alt={searchResult.ticker} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="font-black text-xl text-zinc-300">{searchResult.ticker.substring(0, 2)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-3xl text-zinc-900 dark:text-white tracking-tighter leading-none">{searchResult.ticker}</h3>
                                                <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-wide truncate max-w-[140px]">{searchResult.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-2xl text-zinc-900 dark:text-white tracking-tight">{formatBRL(searchResult.price || 0)}</p>
                                            <div className="flex items-center justify-end gap-1.5 text-indigo-600 dark:text-indigo-400 mt-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Adicionar</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : searchTerm.length > 0 && !isSearching && searchError ? (
                                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                                        <AlertCircle className="w-8 h-8" />
                                    </div>
                                    <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Ativo não encontrado</p>
                                    <p className="text-[10px] text-zinc-400 font-bold mt-2 uppercase tracking-widest">Verifique o código digitado</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 mb-5 px-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em]">Sugestões Populares</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {POPULAR_ASSETS.slice(0, 6).map(asset => (
                                            <button
                                                key={asset.ticker}
                                                onClick={() => handleAddTicker(asset.ticker)}
                                                className="flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl transition-all group active:scale-95 shadow-sm hover:shadow-md"
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{asset.ticker}</span>
                                                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter truncate max-w-[80px]">{asset.name}</span>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${asset.type === 'FII' ? 'bg-emerald-400' : 'bg-sky-400'} shadow-sm group-hover:scale-125 transition-transform`}></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-2xl flex items-center gap-3 text-sm text-rose-600 dark:text-rose-400 font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-28 h-28 bg-gradient-to-br from-white to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border border-white/50 dark:border-zinc-800 relative group">
                        <Star className="w-12 h-12 text-zinc-300 dark:text-zinc-700 group-hover:text-indigo-500 transition-colors duration-500" fill="currentColor" />
                        <div className="absolute -top-2 -right-2 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce delay-700 border-4 border-zinc-50 dark:border-zinc-950">
                            <Plus className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-3 tracking-tighter">Sua Lista</h3>
                    <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest max-w-[240px] mb-10 leading-relaxed">Adicione ativos para acompanhar cotações e indicadores em tempo real.</p>
                    <button 
                        onClick={() => setIsAdding(true)} 
                        className="px-10 py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/20 dark:shadow-white/10 transition-all active:scale-95 hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:shadow-2xl hover:-translate-y-1 group relative overflow-hidden"
                    >
                        <span className="relative z-10">Adicionar Ativo</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedAndFilteredWatchlist.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                            <Filter className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Nenhum ativo encontrado</p>
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
                            const fundamentals = quote?.fundamentals || {};
                            const alert = alerts[ticker];
                            const isAlertTriggered = alert && (
                                (alert.type === 'ABOVE' && price && price >= alert.target) ||
                                (alert.type === 'BELOW' && price && price <= alert.target)
                            );

                            return (
                                <div 
                                    key={ticker} 
                                    onClick={() => handleAssetClick(ticker)}
                                    className={`group bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800/60 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50 dark:hover:shadow-black/50 transition-all duration-500 cursor-pointer active:scale-[0.98] relative overflow-hidden hover:border-indigo-500/20 dark:hover:border-indigo-500/20 ${isUpdating ? 'opacity-90' : ''}`}
                                >
                                    {/* Subtle background gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-50/50 to-zinc-100/50 dark:from-zinc-900 dark:via-zinc-900/50 dark:to-zinc-950 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                    <div className="flex items-center justify-between relative z-10 mb-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-700/30 shadow-sm relative group-hover:scale-105 transition-transform duration-500">
                                                {quote?.logo ? (
                                                    <img 
                                                        src={quote.logo} 
                                                        alt={ticker} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement?.classList.add('fallback-initials');
                                                        }} 
                                                    />
                                                ) : null}
                                                <span className={`text-sm font-black text-zinc-300 dark:text-zinc-600 absolute inset-0 flex items-center justify-center ${quote?.logo ? 'hidden fallback-initials:flex' : 'flex'}`}>
                                                    {ticker.substring(0, 2)}
                                                </span>
                                                {isUpdating && (
                                                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                                                        <RefreshCcw className="w-5 h-5 text-indigo-500 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-zinc-900 dark:text-white text-2xl tracking-tighter leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{ticker}</h3>
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${quote?.type === 'FII' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                                        {quote?.type || (ticker.endsWith('11') ? 'FII' : 'Ação')}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest truncate max-w-[160px] group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                                                    {quote?.name || (isLoadingInitial ? 'Atualizando...' : 'Ativo')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                            <p className="font-black text-zinc-900 dark:text-white tabular-nums text-3xl tracking-tighter">
                                                {hasData ? formatBRL(price) : (isLoadingInitial ? <span className="animate-pulse text-zinc-200">---</span> : <span className="text-zinc-300 text-[10px] font-bold">Indisp.</span>)}
                                            </p>
                                            
                                            {hasData && (
                                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    {Math.abs(change).toFixed(2)}%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Additional Info Grid - More Spacious */}
                                    {hasData && (
                                        <div className="grid grid-cols-3 gap-4 pt-5 border-t border-dashed border-zinc-100 dark:border-zinc-800/60 relative z-10">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest mb-1.5">DY (12M)</span>
                                                <span className="text-sm font-black text-zinc-700 dark:text-zinc-200">{fundamentals.dy_12m ? `${fundamentals.dy_12m.toFixed(2)}%` : '--'}</span>
                                            </div>
                                            <div className="flex flex-col text-center border-l border-zinc-50 dark:border-zinc-800/50">
                                                <span className="text-[8px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest mb-1.5">P/VP</span>
                                                <span className={`text-sm font-black ${fundamentals.p_vp > 1.1 ? 'text-rose-500' : fundamentals.p_vp < 0.9 ? 'text-emerald-500' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                                    {fundamentals.p_vp ? fundamentals.p_vp.toFixed(2) : '--'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end border-l border-zinc-50 dark:border-zinc-800/50">
                                                <span className="text-[8px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest mb-1.5">Segmento</span>
                                                <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 truncate max-w-[100px]">{quote?.segment || 'Geral'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Alert Status */}
                                    {alert && (
                                        <div className={`mt-5 flex items-center justify-between px-4 py-3 rounded-2xl border ${isAlertTriggered ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800/30 dark:border-zinc-700/50'} relative z-10 animate-in slide-in-from-top-2`}>
                                            <div className="flex items-center gap-2">
                                                <Bell className={`w-3.5 h-3.5 ${isAlertTriggered ? 'text-amber-500 animate-bounce' : 'text-zinc-400'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isAlertTriggered ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`}>
                                                    Alerta: {alert.type === 'ABOVE' ? 'Acima de' : 'Abaixo de'} {formatBRL(alert.target)}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeAlert(ticker); }}
                                                className="text-[8px] font-black text-zinc-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    )}

                                    {/* Actions Overlay - Improved visibility */}
                                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-x-4 group-hover:translate-x-0">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setAlertingTicker(ticker); setAlertPrice(price?.toString() || ''); }}
                                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-indigo-500 bg-white/90 dark:bg-zinc-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 transition-all backdrop-blur-sm"
                                            title="Definir Alerta"
                                        >
                                            <Bell className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeTicker(ticker); }}
                                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-rose-500 bg-white/90 dark:bg-zinc-800/90 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 transition-all backdrop-blur-sm"
                                            title="Remover"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    {/* Chevron indicator */}
                                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 delay-100">
                                        <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
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
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500 ease-out border-t sm:border border-white/20 dark:border-zinc-800/50">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Alerta de Preço</h2>
                                <p className="text-[10px] text-zinc-400 font-black mt-1.5 uppercase tracking-[0.2em]">{alertingTicker}</p>
                            </div>
                            <button onClick={() => setAlertingTicker(null)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-3 block">Tipo de Alerta</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setAlertType('ABOVE')}
                                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${alertType === 'ABOVE' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg shadow-zinc-900/10' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50'}`}
                                    >
                                        Preço Acima de
                                    </button>
                                    <button 
                                        onClick={() => setAlertType('BELOW')}
                                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${alertType === 'BELOW' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-lg shadow-zinc-900/10' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50'}`}
                                    >
                                        Preço Abaixo de
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-3 block">Preço Alvo (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">R$</span>
                                    <input 
                                        type="text"
                                        value={alertPrice}
                                        onChange={(e) => setAlertPrice(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full pl-14 pr-6 py-5 bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl text-2xl font-black text-zinc-900 dark:text-white transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleSetAlert}
                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1"
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
