import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, TrendingUp, TrendingDown, Plus, Star, ArrowLeft, RefreshCcw, AlertCircle } from 'lucide-react';
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

export default function Watchlist() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<Record<string, WatchlistItem>>({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [marketDividends, setMarketDividends] = useState<DividendReceipt[]>([]);
    const [error, setError] = useState<string | null>(null);

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
            // Se for forceRefresh, garantimos que o scraper rode para atualizar dados
            const unifiedDataPromise = fetchUnifiedMarketData(tickersToFetch, undefined, forceRefresh).catch(err => {
                console.error("[Watchlist] Unified Data Error:", err);
                return { dividends: [], metadata: {}, error: err };
            });

            const [brapiResult, unifiedData] = await Promise.all([quotesPromise, unifiedDataPromise]);
            const brapiData = brapiResult?.quotes || [];
            
            // Atualiza o estado de dividendos de mercado (acumulando com os existentes se for fetch parcial, ou substituindo se for total)
            if (unifiedData?.dividends) {
                setMarketDividends(prev => {
                    if (specificTickers) {
                        // Remove dividendos antigos dos tickers atualizados e adiciona os novos
                        const filtered = prev.filter(d => !specificTickers.includes(d.ticker));
                        return [...filtered, ...unifiedData.dividends];
                    }
                    return unifiedData.dividends;
                });
            }

            setQuotes(prev => {
                const newQuotes = { ...prev };
                
                // Process Brapi Data
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

                // Merge with Unified Data (Scraper)
                if (unifiedData?.metadata) {
                    Object.entries(unifiedData.metadata).forEach(([ticker, meta]: [string, any]) => {
                        newQuotes[ticker] = {
                            ...newQuotes[ticker],
                            ticker: ticker,
                            // Prioriza nome da Brapi, mas usa do scraper se faltar
                            name: newQuotes[ticker]?.name || meta.fundamentals?.company_name || ticker,
                            fundamentals: meta.fundamentals,
                            segment: meta.segment,
                            type: meta.type,
                            // Se Brapi falhou, tenta usar preço do scraper se disponível (raro, mas possível)
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

    // Fetch quotes when watchlist changes (initial load)
    useEffect(() => {
        // Apenas busca se tiver itens e ainda não tivermos dados para todos
        const missingData = watchlist.some(t => !quotes[t]);
        if (missingData || watchlist.length > 0 && Object.keys(quotes).length === 0) {
            fetchData(false);
        }
        
        const interval = setInterval(() => fetchData(false), 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [watchlist, fetchData]); // quotes removed from dependency to avoid loop, logic handled inside

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        
        const ticker = searchTerm.toUpperCase().trim();
        
        if (watchlist.includes(ticker)) {
            setSearchTerm('');
            setIsAdding(false);
            return;
        }

        // Adiciona à lista visualmente primeiro
        const newWatchlist = [...watchlist, ticker];
        setWatchlist(newWatchlist);
        setSearchTerm('');
        setIsAdding(false);

        // Busca dados IMEDIATAMENTE e FORÇADA para o novo ativo
        // Isso garante que o scraper seja acionado se o ativo for novo no sistema
        await fetchData(true, [ticker]);
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
        
        // Determina o tipo de ativo com fallback inteligente
        let assetType = quote?.type;
        if (!assetType) {
            assetType = (ticker.endsWith('11') || ticker.endsWith('11B')) ? AssetType.FII : AssetType.STOCK;
        }

        // Constrói objeto AssetPosition completo para o modal
        // Mimetiza a estrutura que vem do Portfolio.tsx
        const asset: AssetPosition = {
            ticker: ticker,
            quantity: 0, // Watchlist items have 0 quantity
            averagePrice: 0,
            currentPrice: quote?.price || 0,
            totalDividends: 0,
            assetType: assetType,
            segment: quote?.segment || fundamentals.segment || 'Geral',
            logoUrl: quote?.logo,
            dividends: [], // Modal usará marketDividends
            
            // Dados Fundamentais
            company_name: quote?.name || fundamentals.company_name,
            sector: fundamentals.sector,
            sub_sector: fundamentals.sub_sector,
            
            // Métricas de Valuation e Indicadores
            p_vp: fundamentals.p_vp || 0,
            p_l: fundamentals.p_l || 0,
            dy_12m: fundamentals.dy_12m || fundamentals.dy || 0,
            vacancy: fundamentals.vacancy || 0,
            assets_value: fundamentals.assets_value || 0,
            market_cap: fundamentals.market_cap || 0,
            last_dividend: fundamentals.last_dividend || 0,
            next_dividend: fundamentals.next_dividend,
            
            // Propriedades (FIIs de Tijolo)
            properties: fundamentals.properties || [],
            properties_count: fundamentals.properties_count || 0,
            
            // Spread do restante para garantir compatibilidade futura
            ...fundamentals
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
                        disabled={loading}
                        className={`w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center active:scale-95 transition-all ${loading ? 'animate-spin text-indigo-500' : ''}`}
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${isAdding ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300' : 'bg-indigo-600 text-white shadow-indigo-500/30'}`}
                    >
                        <Plus className={`w-5 h-5 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
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
                    <p className="text-[10px] text-zinc-400 mt-2 px-1">
                        Pressione Enter para adicionar. Os dados serão buscados automaticamente.
                    </p>
                </form>
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
                    <p className="text-xs text-zinc-400 mt-1">Adicione ativos para acompanhar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {watchlist.map(ticker => {
                        const quote = quotes[ticker];
                        const price = quote?.price || 0;
                        const change = quote?.change || 0;
                        const isPositive = change >= 0;
                        const isLoadingItem = loading && !quote;

                        return (
                            <div 
                                key={ticker} 
                                onClick={() => handleAssetClick(ticker)}
                                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-indigo-200 dark:hover:border-zinc-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                        {quote?.logo ? (
                                            <img src={quote.logo} alt={ticker} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-zinc-400">{ticker.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{ticker}</h3>
                                        <p className="text-xs text-zinc-500 truncate max-w-[120px]">
                                            {quote?.name || (isLoadingItem ? 'Buscando dados...' : 'Ativo')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-bold text-zinc-900 dark:text-white tabular-nums">
                                            {isLoadingItem ? (
                                                <span className="animate-pulse text-zinc-300">---</span>
                                            ) : (
                                                formatBRL(price)
                                            )}
                                        </p>
                                        {!isLoadingItem && (
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
                    })}
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
