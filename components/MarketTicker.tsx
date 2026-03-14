import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Globe, DollarSign, Percent } from 'lucide-react';
import { getQuotes } from '../services/brapiService';
import axios from 'axios';

import { motion } from 'framer-motion';

interface MarketIndex {
    ticker: string;
    name: string;
    price: number;
    change: number;
    type: 'INDEX' | 'CURRENCY' | 'CRYPTO';
}

export const MarketTicker: React.FC = () => {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                // 1. Fetch B3 Indices & Global from Brapi
                const brapiTickers = ['^BVSP', 'IFIX.SA', '^GSPC', '^IXIC'];
                const { quotes } = await getQuotes(brapiTickers);

                // 2. Fetch Currencies & Crypto from AwesomeAPI
                const coins = 'USD-BRL,EUR-BRL,BTC-BRL';
                const { data: coinData } = await axios.get(`https://economia.awesomeapi.com.br/last/${coins}`);

                const marketData: MarketIndex[] = [];

                // Process Brapi Data
                const tickerMap: Record<string, string> = {
                    '^BVSP': 'IBOVESPA',
                    'IFIX.SA': 'IFIX',
                    '^GSPC': 'S&P 500',
                    '^IXIC': 'NASDAQ'
                };

                if (quotes && quotes.length > 0) {
                    quotes.forEach(q => {
                        marketData.push({
                            ticker: q.symbol,
                            name: tickerMap[q.symbol] || q.symbol,
                            price: q.regularMarketPrice,
                            change: q.regularMarketChangePercent || 0,
                            type: 'INDEX'
                        });
                    });
                }

                // Process Coin Data
                if (coinData) {
                    if (coinData.USDBRL) {
                        marketData.push({
                            ticker: 'DÓLAR',
                            name: 'USD/BRL',
                            price: parseFloat(coinData.USDBRL.bid),
                            change: parseFloat(coinData.USDBRL.pctChange),
                            type: 'CURRENCY'
                        });
                    }
                    if (coinData.EURBRL) {
                        marketData.push({
                            ticker: 'EURO',
                            name: 'EUR/BRL',
                            price: parseFloat(coinData.EURBRL.bid),
                            change: parseFloat(coinData.EURBRL.pctChange),
                            type: 'CURRENCY'
                        });
                    }
                    if (coinData.BTCBRL) {
                        marketData.push({
                            ticker: 'BITCOIN',
                            name: 'BTC/BRL',
                            price: parseFloat(coinData.BTCBRL.bid),
                            change: parseFloat(coinData.BTCBRL.pctChange),
                            type: 'CRYPTO'
                        });
                    }
                }

                setIndices(marketData);
            } catch (error) {
                console.error("Error fetching market indices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchIndices();
        const interval = setInterval(fetchIndices, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || indices.length === 0) return null;

    // Duplicate list for seamless loop
    const displayIndices = [...indices, ...indices];

    return (
        <div 
            className="w-full overflow-hidden bg-transparent py-2 relative group z-40 mb-2"
        >
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-50 dark:from-zinc-950 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-50 dark:from-zinc-950 to-transparent z-10 pointer-events-none"></div>

            <motion.div 
                className="flex items-center gap-6 w-max"
                animate={{
                    x: [0, -100 * indices.length],
                }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: 30,
                        ease: "linear",
                    },
                }}
                whileHover={{ animationPlayState: 'paused' }}
            >
                {displayIndices.map((index, i) => (
                    <div key={`${index.ticker}-${i}`} className="flex items-center gap-3 shrink-0 select-none group/item transition-opacity hover:opacity-80 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                        <div className={`w-1.5 h-1.5 rounded-full ${index.change >= 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}></div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{index.name}</span>
                            <span className="text-xs font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">
                                {index.type === 'INDEX' 
                                    ? index.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) 
                                    : index.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className={`flex items-center text-[10px] font-bold ${index.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {index.change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : index.change < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                                {Math.abs(index.change).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};
