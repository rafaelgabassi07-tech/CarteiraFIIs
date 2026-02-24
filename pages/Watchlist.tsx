import React, { useState, useEffect } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft, RefreshCcw } from 'lucide-react';
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
}

export default function Watchlist() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<Record<string, WatchlistItem>>({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [marketDividends, setMarketDividends] = useState<DividendReceipt[]>([]);

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

    const fetchData = async (forceRefresh = false) => {
        if (watchlist.length === 0) {
            setQuotes({});
            return;
        }
        
        setLoading(true);
        try {
            console.log("[Watchlist] Fetching data for:", watchlist);
            
            // 1. Fetch Real-time Quotes from Brapi
            const quotesPromise = getQuotes(watchlist).catch(err => {
                console.error("[Watchlist] Brapi Error:", err);
                return { quotes: [], error: err };
            });
            
            // 2. Fetch Fundamentals & Metadata from Scraper/DB
            const unifiedDataPromise = fetchUnifiedMarketData(watchlist, undefined, forceRefresh).catch(err => {
                console.error("[Watchlist] Unified Data Error:", err);
                return { dividends: [], metadata: {}, error: err };
            });

            const [brapiResult, unifiedData] = await Promise.all([quotesPromise, unifiedDataPromise]);
            const brapiData = brapiResult?.quotes || [];
            
            console.log("[Watchlist] Brapi Data:", brapiData);
            console.log("[Watchlist] Unified Data:", unifiedData);

            const newQuotes: Record<string, WatchlistItem> = {};
            
            // Process Brapi Data
            if (brapiData) {
                brapiData.forEach((q: any) => {
                    newQuotes[q.symbol] = {
                        ticker: q.symbol,
                        price: q.regularMarketPrice,
                        change: q.regularMarketChangePercent,
                        name: q.longName || q.shortName,
                        logo: q.logourl
                    };
                });
            }

            // Merge with Unified Data (Scraper)
            if (unifiedData && unifiedData.metadata) {
                Object.entries(unifiedData.metadata).forEach(([ticker, meta]: [string, any]) => {
                    if (newQuotes[ticker]) {
                        newQuotes[ticker].fundamentals = meta.fundamentals;
                        newQuotes[ticker].segment = meta.segment;
                        newQuotes[ticker].type = meta.type;
                    } else {
                        // Fallback if Brapi failed for this ticker but we have metadata
                        newQuotes[ticker] = {
                            ticker: ticker,
                            name: meta.fundamentals?.company_name || ticker,
                            fundamentals: meta.fundamentals,
                            segment: meta.segment,
                            type: meta.type
                        };
                    }
                });
                
                if (unifiedData.dividends) {
                    setMarketDividends(unifiedData.dividends);
                }
            }

            setQuotes(newQuotes);
        } catch (e) {
            console.error("Error fetching watchlist data", e);
        } finally {
            setLoading(false);
        }
    };

    // Fetch quotes when watchlist changes
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(false), 60000); // Refresh every minute

        return () => clearInterval(interval);
    }, [watchlist]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        
        const ticker = searchTerm.toUpperCase().trim();
        if (!watchlist.includes(ticker)) {
            const newWatchlist = [...watchlist, ticker];
            setWatchlist(newWatchlist);
            // Trigger fetch immediately for the new list
            // Note: useEffect will trigger, but we might want immediate feedback or force refresh for the new item
        }
        setSearchTerm('');
        setIsAdding(false);
    };

    const removeTicker = (ticker: string) => {
        setWatchlist(prev => prev.filter(t => t !== ticker));
    };

    const handleAssetClick = (ticker: string) => {
        const quote = quotes[ticker];
        const fundamentals = quote?.fundamentals || {};
        
        // Create a full AssetPosition object for the modal
        const asset: AssetPosition = {
            ticker: ticker,
            quantity: 0, // Watchlist items have 0 quantity
            averagePrice: 0,
            currentPrice: quote?.price || 0,
            totalDividends: 0,
            assetType: quote?.type || (ticker.endsWith('11') ? AssetType.FII : AssetType.STOCK),
            segment: quote?.segment || 'Geral',
            logoUrl: quote?.logo,
            dividends: [], // Will be populated by AssetModal using marketDividends
            properties: fundamentals.properties || [],
            properties_count: fundamentals.properties_count || 0,
            assets_value: fundamentals.assets_value || '0',
            vacancy: fundamentals.vacancy || 0,
            p_vp: fundamentals.p_vp || 0,
            p_l: fundamentals.p_l || 0,
            dy_12m: fundamentals.dy_12m || 0,
            ...fundamentals // Spread other fundamentals
        };
        setSelectedAsset(asset);
    };

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
                        className={`w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center active:scale-95 transition-all ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
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
                            <div 
                                key={ticker} 
                                onClick={() => handleAssetClick(ticker)}
                                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                            >
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
                                        onClick={(e) => { e.stopPropagation(); removeTicker(ticker); }}
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

            {selectedAsset && (
                <AssetModal 
                    asset={selectedAsset} 
                    onClose={() => setSelectedAsset(null)} 
                    onAssetRefresh={() => {}} 
                    marketDividends={marketDividends} 
                    incomeChartData={{ data: [] }} 
                    privacyMode={false} 
                />
            )}
        </div>
    );
}
