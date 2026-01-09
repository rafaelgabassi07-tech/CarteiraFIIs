import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Globe, ExternalLink } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts?: DividendReceipt[];
  totalDividendsReceived?: number;
  invested?: number;
  balance?: number;
  salesGain?: number;
}

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number) => `${val.toFixed(2)}%`;

const AssetCardInternal: React.FC<{ asset: AssetPosition, totalPortfolioValue: number, history: DividendReceipt[] }> = ({ asset, totalPortfolioValue, history }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  const gainValue = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (gainValue / totalCost) * 100 : 0;
  const isPositive = gainValue >= 0;
  
  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-4 flex items-center justify-between active:bg-white/5 transition-colors px-2 rounded-lg"
      >
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-white/5 text-zinc-400">
               {asset.assetType === AssetType.FII ? <Building2 className="w-5 h-5 stroke-1" /> : <BarChart3 className="w-5 h-5 stroke-1" />}
            </div>
            <div className="text-left">
               <h3 className="text-sm font-bold text-white">{asset.ticker}</h3>
               <p className="text-[10px] text-zinc-500">{asset.quantity} cotas</p>
            </div>
        </div>
        <div className="text-right">
             <p className="text-sm font-medium text-white tabular-nums">{formatBRL(totalValue)}</p>
             <p className={`text-[10px] tabular-nums ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '+' : ''}{formatPercent(gainPercent)}
             </p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-6 pt-2 space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                 <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Preço Médio</p>
                 <p className="text-xs font-medium text-white">{formatBRL(asset.averagePrice)}</p>
              </div>
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                 <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Atual</p>
                 <p className="text-xs font-medium text-white">{formatBRL(currentPrice)}</p>
              </div>
           </div>

           {/* Indicators */}
           {(asset.p_vp || asset.dy_12m) && (
             <div className="flex gap-4 text-xs text-zinc-400 justify-center py-2">
                {asset.p_vp && <span>P/VP <span className="text-white">{asset.p_vp.toFixed(2)}</span></span>}
                <span className="text-zinc-700">|</span>
                {asset.dy_12m && <span>DY <span className="text-white">{asset.dy_12m.toFixed(2)}%</span></span>}
             </div>
           )}
           
           {/* Recent Dividends - Minimal */}
           {history.length > 0 && (
             <div className="border-t border-white/5 pt-3">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Últimos Proventos</p>
                {history.slice(0, 3).map((h, i) => (
                   <div key={i} className="flex justify-between text-xs py-1">
                      <span className="text-zinc-500">{h.paymentDate.split('-').reverse().join('/')}</span>
                      <span className="text-emerald-500">+{formatBRL(h.rate)}</span>
                   </div>
                ))}
             </div>
           )}

           <div className="flex justify-end pt-2">
              <a 
                href={`https://statusinvest.com.br/${asset.assetType === AssetType.FII ? 'fundos-imobiliarios' : 'acoes'}/${asset.ticker.toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-zinc-600 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest"
              >
                Status Invest <ExternalLink className="w-3 h-3" />
              </a>
           </div>
        </div>
      )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividendReceipts = [], invested = 0, balance = 0 }) => {
  const [filter, setFilter] = useState('');
  
  const filteredPortfolio = useMemo(() => {
     if (!filter) return portfolio;
     return portfolio.filter(p => p.ticker.includes(filter.toUpperCase()));
  }, [portfolio, filter]);

  return (
    <div className="pt-20 pb-28 px-4 max-w-lg mx-auto min-h-screen">
      <div className="sticky top-20 z-30 pt-2 pb-4 bg-black">
          <input 
            type="text" 
            placeholder="Filtrar..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-white/5 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder:text-zinc-600 focus:border-white/20 transition-colors"
          />
      </div>

      <div className="bg-black border border-white/5 rounded-2xl px-2">
         {filteredPortfolio.length === 0 ? (
           <div className="py-20 text-center opacity-40">
              <p className="text-sm font-medium text-zinc-500">Vazio.</p>
           </div>
         ) : (
           filteredPortfolio.map((asset) => (
             <AssetCardInternal 
               key={asset.ticker} 
               asset={asset} 
               totalPortfolioValue={balance}
               history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))}
             />
           ))
         )}
      </div>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);