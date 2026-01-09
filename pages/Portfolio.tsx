import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, TrendingDown, BarChart3, Globe, ExternalLink, ChevronDown } from 'lucide-react';

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
    <div className={`bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden transition-all duration-300 ${expanded ? 'shadow-lg ring-1 ring-slate-200 dark:ring-white/10' : 'shadow-sm active:scale-[0.99]'}`}>
        <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white font-bold text-xs border border-slate-100 dark:border-white/5">
                    {asset.ticker.substring(0,4)}
                </div>
                <div className="text-left">
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-none mb-1">{asset.ticker}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{asset.quantity} cotas</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-black text-slate-900 dark:text-white leading-none mb-1">{formatBRL(currentVal)}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {deltaPercent.toFixed(2)}%
                </div>
            </div>
        </button>
        
        {expanded && (
            <div className="px-5 pb-5 pt-0 anim-fade-in">
                <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-4"></div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Preço Médio</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(asset.averagePrice)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cotação</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(asset.currentPrice || 0)}</span>
                    </div>
                </div>
                {asset.sources && asset.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {asset.sources.map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <Globe className="w-2.5 h-2.5" /> Fonte {i+1}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, balance = 0 }) => {
  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto min-h-screen">
       <div className="mb-6 px-1">
           <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Meus Ativos</h2>
           <p className="text-xs text-slate-500 font-medium mt-1">Total acumulado: {formatBRL(balance)}</p>
       </div>
       <div className="space-y-3">
           {portfolio.map(p => <AssetCard key={p.ticker} asset={p} totalValue={balance} />)}
       </div>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);