
import React, { useState } from 'react';
import { AssetPosition, DividendReceipt } from '../types';
import { TrendingUp, TrendingDown, Globe } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts?: DividendReceipt[];
  balance?: number;
}

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const AssetCard: React.FC<{ asset: AssetPosition, totalValue: number }> = ({ asset, totalValue }) => {
  const [expanded, setExpanded] = useState(false);
  const currentVal = (asset.currentPrice || asset.averagePrice) * asset.quantity;
  const costVal = asset.averagePrice * asset.quantity;
  const delta = currentVal - costVal;
  const deltaPercent = costVal > 0 ? (delta / costVal) * 100 : 0;
  const isPos = delta >= 0;

  return (
    <div className={`bg-white dark:bg-[#0f172a] rounded-[2rem] border overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${expanded ? 'shadow-xl ring-1 ring-slate-200 dark:ring-white/10 border-slate-200 dark:border-slate-700 z-10' : 'shadow-sm border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}>
        <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white font-bold text-xs border border-slate-100 dark:border-white/5 shadow-sm">
                    {asset.ticker.substring(0,4)}
                </div>
                <div className="text-left">
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-none mb-1.5">{asset.ticker}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{asset.quantity} cotas</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-black text-slate-900 dark:text-white leading-none mb-1.5 tabular-nums">{formatBRL(currentVal)}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-lg w-fit ml-auto ${isPos ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500'}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {deltaPercent.toFixed(2)}%
                </div>
            </div>
        </button>
        
        {/* Animated Accordion Content */}
        <div className={`expand-content ${expanded ? 'open' : ''}`}>
            <div className="expand-inner">
                <div className="px-5 pb-5 pt-0">
                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-5 mt-1"></div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Preço Médio</span>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{formatBRL(asset.averagePrice)}</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cotação</span>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">{formatBRL(asset.currentPrice || 0)}</span>
                        </div>
                    </div>
                    {asset.sources && asset.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {asset.sources.slice(0, 3).map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                    <Globe className="w-3 h-3" /> Fonte {i+1}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, balance = 0 }) => {
  return (
    <div className="pt-28 pb-32 px-5 max-w-lg mx-auto min-h-screen">
       <div className="mb-8 px-1 anim-fade-in-up is-visible">
           <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Meus Ativos</h2>
           <p className="text-sm text-slate-500 font-medium">Total acumulado: <span className="text-slate-900 dark:text-white font-bold tabular-nums">{formatBRL(balance)}</span></p>
       </div>
       <div className="space-y-4">
           {portfolio.map((p, i) => (
             <div key={p.ticker} className="anim-fade-in-up is-visible" style={{ animationDelay: `${i * 50}ms` }}>
                <AssetCard asset={p} totalValue={balance} />
             </div>
           ))}
           {portfolio.length === 0 && (
               <div className="text-center py-20 opacity-50">
                   <p className="text-sm text-slate-400">Nenhum ativo encontrado.</p>
               </div>
           )}
       </div>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
