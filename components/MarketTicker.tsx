import React, { useEffect, useState } from 'react';
import { getQuotes } from '../services/brapiService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketIndex {
    ticker: string;
    name: string;
    value: number;
    change: number;
}

export const MarketTicker: React.FC = () => {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                // Tickers de mercado: Ibovespa, IFIX, Dólar, Bitcoin, CDI (CDI geralmente não tem ticker de bolsa fácil, vamos focar nos negociáveis)
                const tickers = ['^BVSP', 'IFIX.SA', 'USDBRL', 'BTC-BRL'];
                const { quotes } = await getQuotes(tickers);
                
                if (quotes && quotes.length > 0) {
                    const formatted = quotes.map(q => {
                        let name = q.symbol;
                        let val = q.regularMarketPrice;
                        
                        if (q.symbol === '^BVSP') name = 'IBOVESPA';
                        if (q.symbol === 'IFIX.SA') name = 'IFIX';
                        if (q.symbol === 'USDBRL') name = 'DÓLAR';
                        if (q.symbol === 'BTC-BRL') name = 'BITCOIN';

                        return {
                            ticker: q.symbol,
                            name,
                            value: val,
                            change: q.regularMarketChangePercent || 0
                        };
                    });
                    setIndices(formatted);
                }
            } catch (e) {
                console.error("Failed to fetch market indices", e);
            } finally {
                setLoading(false);
            }
        };

        fetchIndices();
        const interval = setInterval(fetchIndices, 60 * 1000); // Atualiza a cada 1 minuto
        return () => clearInterval(interval);
    }, []);

    if (loading || indices.length === 0) return null;

    // Duplica a lista para criar um loop infinito suave
    // Triplicamos para garantir que cubra telas largas
    const displayList = [...indices, ...indices, ...indices, ...indices];

    return (
        <div className="w-full overflow-hidden bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 py-2.5 relative z-0">
            <div className="flex whitespace-nowrap animate-marquee w-fit">
                {displayList.map((item, idx) => (
                    <div key={`${item.ticker}-${idx}`} className="flex items-center gap-2 mx-6 shrink-0">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.name}</span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">
                            {item.name === 'DÓLAR' 
                                ? `R$ ${item.value.toFixed(2)}` 
                                : item.name === 'BITCOIN' 
                                    ? `R$ ${item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                                    : item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                            }
                        </span>
                        <div className={`flex items-center text-[10px] font-bold ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : item.change < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                            {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Fade edges */}
            <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white dark:from-zinc-900 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white dark:from-zinc-900 to-transparent pointer-events-none"></div>
        </div>
    );
};
