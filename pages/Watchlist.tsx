import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft, RefreshCcw, AlertCircle, X, Filter, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

    return (
        <div className="pb-24 px-4 max-w-md mx-auto min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header Actions - Compact and Modern */}
            <div className="flex items-center justify-end gap-2 mb-6 pt-6">
                <button 
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className={`w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm ${loading ? 'animate-spin text-indigo-500' : ''}`}
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/20 active:scale-95 transition-all"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Filters - Minimalist Pills */}
            {watchlist.length > 0 && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                    {(['ALL', 'STOCK', 'FII'] as const).map((f) => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/20 dark:shadow-white/10' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 shadow-sm'}`}
                        >
                            {f === 'ALL' ? 'Todos' : f === 'STOCK' ? 'Ações' : 'FIIs'}
                        </button>
                    ))}
                </div>
            )}

            {/* Add Asset Sheet/Modal - Enhanced UI */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
                    <div 
                        className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500 ease-out border-t sm:border border-zinc-100 dark:border-zinc-900 ring-1 ring-black/5"
                    >
                        {/* Handle for mobile */}
                        <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-8 sm:hidden"></div>

                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Novo Favorito</h2>
                                <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-wider">Acompanhe ativos em tempo real</p>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-90">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative mb-10">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-zinc-300" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="EX: PETR4, MXRF11..."
                                className="block w-full pl-14 pr-14 py-5 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-zinc-900 rounded-[1.5rem] text-xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-800 focus:ring-0 transition-all uppercase shadow-inner"
                                autoFocus
                            />
                            <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                                {isSearching ? (
                                    <RefreshCcw className="h-5 w-5 text-indigo-500 animate-spin" />
                                ) : searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="bg-zinc-200 dark:bg-zinc-800 rounded-full p-1 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                                        <X className="h-3 w-3 text-zinc-500" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="min-h-[200px]">
                            {searchResult ? (
                                <div 
                                    onClick={() => handleAddTicker(searchResult.ticker)}
                                    className="bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] rounded-[2rem] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20 group"
                                >
                                    <div className="bg-white dark:bg-zinc-950 rounded-[1.95rem] p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden shadow-inner border border-zinc-100 dark:border-zinc-800">
                                                {searchResult.logo ? (
                                                    <img src={searchResult.logo} alt={searchResult.ticker} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="font-black text-lg text-zinc-300">{searchResult.ticker.substring(0, 2)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-2xl text-zinc-900 dark:text-white tracking-tighter leading-none">{searchResult.ticker}</h3>
                                                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wide truncate max-w-[140px]">{searchResult.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-xl text-zinc-900 dark:text-white tracking-tight">{formatBRL(searchResult.price || 0)}</p>
                                            <div className="flex items-center justify-end gap-1.5 text-indigo-600 dark:text-indigo-400 mt-1">
                                                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Adicionar</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : searchTerm.length > 0 && !isSearching && searchError ? (
                                <div className="text-center py-12 bg-rose-50/50 dark:bg-rose-900/10 rounded-[2rem] border border-dashed border-rose-200 dark:border-rose-900/30">
                                    <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                                        <AlertCircle className="w-7 h-7" />
                                    </div>
                                    <p className="text-sm font-black text-zinc-900 dark:text-white">Ativo não encontrado</p>
                                    <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Verifique o código e tente novamente</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 mb-5">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Ativos Populares</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {POPULAR_ASSETS.slice(0, 6).map(asset => (
                                            <button
                                                key={asset.ticker}
                                                onClick={() => handleAddTicker(asset.ticker)}
                                                className="flex items-center justify-between px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-500/30 rounded-2xl transition-all group active:scale-95 shadow-sm"
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{asset.ticker}</span>
                                                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter truncate max-w-[80px]">{asset.name}</span>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${asset.type === 'FII' ? 'bg-emerald-400' : 'bg-sky-400'} shadow-sm`}></div>
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
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-2xl flex items-center gap-3 text-sm text-rose-600 dark:text-rose-400 font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Star className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Sua lista está vazia</h3>
                    <p className="text-zinc-500 font-medium max-w-[200px] mb-6">Comece adicionando ativos que você quer acompanhar de perto.</p>
                    <button 
                        onClick={() => setIsAdding(true)} 
                        className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm shadow-lg shadow-zinc-900/20 dark:shadow-white/10 transition-all active:scale-95 hover:bg-zinc-800 dark:hover:bg-zinc-100"
                    >
                        Adicionar Primeiro Ativo
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredWatchlist.length === 0 ? (
                        <div className="text-center py-12">
                            <Filter className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-400 font-medium text-sm">Nenhum ativo encontrado neste filtro.</p>
                        </div>
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
                                    className={`group bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] relative overflow-hidden ${isUpdating ? 'opacity-80' : ''}`}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-700/50 shadow-sm relative">
                                                {quote?.logo ? (
                                                    <img src={quote.logo} alt={ticker} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black text-zinc-300 dark:text-zinc-600">{ticker.substring(0, 2)}</span>
                                                )}
                                                {isUpdating && (
                                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
                                                        <RefreshCcw className="w-3 h-3 text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-zinc-900 dark:text-white text-base tracking-tight leading-none mb-0.5">{ticker}</h3>
                                                <p className="text-[10px] font-medium text-zinc-500 truncate max-w-[120px]">
                                                    {quote?.name || (isLoadingInitial ? 'Atualizando...' : 'Ativo')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-0.5">
                                            <p className="font-black text-zinc-900 dark:text-white tabular-nums text-base tracking-tight">
                                                {hasData ? formatBRL(price) : (isLoadingInitial ? <span className="animate-pulse text-zinc-300">---</span> : <span className="text-zinc-300 text-xs font-bold">Indisp.</span>)}
                                            </p>
                                            
                                            {hasData && (
                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    {Math.abs(change).toFixed(2)}%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Delete Action (Visible on Hover/Swipe - simplified here as a button) */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeTicker(ticker); }}
                                        className="absolute top-3 right-3 p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
