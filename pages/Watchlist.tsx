import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft, RefreshCcw, AlertCircle, X, Filter } from 'lucide-react';
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

export default function Watchlist() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<Record<string, WatchlistItem>>({});
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [marketDividends, setMarketDividends] = useState<DividendReceipt[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'STOCK' | 'FII'>('ALL');

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<WatchlistItem | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

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

    const filteredWatchlist = useMemo(() => {
        if (filter === 'ALL') return watchlist;
        return watchlist.filter(ticker => {
            const quote = quotes[ticker];
            const type = quote?.type || ((ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK);
            return type === (filter === 'STOCK' ? AssetType.STOCK : AssetType.FII);
        });
    }, [watchlist, quotes, filter]);

    return (
        <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Favoritos</h1>
                    <p className="text-sm text-zinc-500 font-medium">Acompanhe seus ativos de interesse</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        className={`w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center active:scale-95 transition-all ${loading ? 'animate-spin text-indigo-500' : ''}`}
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            {watchlist.length > 0 && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'ALL' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilter('STOCK')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'STOCK' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}
                    >
                        Ações
                    </button>
                    <button 
                        onClick={() => setFilter('FII')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'FII' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}
                    >
                        FIIs
                    </button>
                </div>
            )}

            {/* Add Asset Sheet/Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Adicionar Favorito</h2>
                            <button onClick={() => setIsAdding(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Digite o ticker (ex: PETR4)"
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white placeholder-zinc-400 font-bold text-lg uppercase"
                                autoFocus
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <RefreshCcw className="w-4 h-4 text-indigo-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        {searchResult ? (
                            <div 
                                onClick={() => handleAddTicker(searchResult.ticker)}
                                className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border-2 border-indigo-500/20 hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center overflow-hidden shadow-sm">
                                        {searchResult.logo ? (
                                            <img src={searchResult.logo} alt={searchResult.ticker} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-zinc-400">{searchResult.ticker.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{searchResult.ticker}</h3>
                                        <p className="text-xs text-zinc-500">{searchResult.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-zinc-900 dark:text-white">{formatBRL(searchResult.price || 0)}</p>
                                    <span className="text-xs font-bold text-indigo-500 group-hover:underline">Adicionar</span>
                                </div>
                            </div>
                        ) : searchTerm.length > 0 && !isSearching && searchError ? (
                            <div className="text-center py-8 text-zinc-400">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>{searchError}</p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Populares</h3>
                                <div className="flex flex-wrap gap-2">
                                    {POPULAR_ASSETS.map(asset => (
                                        <button
                                            key={asset.ticker}
                                            onClick={() => handleAddTicker(asset.ticker)}
                                            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-2"
                                        >
                                            <span>{asset.ticker}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${asset.type === 'STOCK' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <Star className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="text-zinc-500 font-medium">Sua lista está vazia</p>
                    <button onClick={() => setIsAdding(true)} className="text-xs text-indigo-500 font-bold mt-2 hover:underline">
                        Adicionar agora
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredWatchlist.length === 0 ? (
                        <p className="text-center text-zinc-400 text-sm py-8">Nenhum ativo encontrado neste filtro.</p>
                    ) : (
                        filteredWatchlist.map(ticker => {
                            const quote = quotes[ticker];
                            const price = quote?.price;
                            const change = quote?.change || 0;
                            const isPositive = change >= 0;
                            const hasData = !!quote && price !== undefined && price !== 0;
                            const isUpdating = loading && !!quote;
                            const isLoadingInitial = loading && !quote;

                            return (
                                <div 
                                    key={ticker} 
                                    onClick={() => handleAssetClick(ticker)}
                                    className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-indigo-200 dark:hover:border-zinc-700 ${isUpdating ? 'opacity-70' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                                            {quote?.logo ? (
                                                <img src={quote.logo} alt={ticker} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-zinc-400">{ticker.substring(0, 2)}</span>
                                            )}
                                            {isUpdating && (
                                                <div className="absolute inset-0 bg-black/10 dark:bg-black/30 flex items-center justify-center">
                                                    <RefreshCcw className="w-3 h-3 text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-zinc-900 dark:text-white">{ticker}</h3>
                                            <p className="text-xs text-zinc-500 truncate max-w-[120px]">
                                                {quote?.name || (isLoadingInitial ? 'Buscando dados...' : 'Ativo')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-zinc-900 dark:text-white tabular-nums">
                                                {hasData ? formatBRL(price) : (isLoadingInitial ? <span className="animate-pulse text-zinc-300">---</span> : <span className="text-zinc-300 text-xs">Indisp.</span>)}
                                            </p>
                                            {hasData && (
                                                <div className={`flex items-center justify-end gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {change.toFixed(2)}%
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeTicker(ticker); }}
                                            className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
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
