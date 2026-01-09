
import React, { useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { TrendingUp, TrendingDown, Globe, Layers, BarChart3, Wallet, Tag, ArrowUpRight, ArrowDownRight, PieChart } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts?: DividendReceipt[];
  balance?: number;
}

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number) => `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

const AssetCard: React.FC<{ asset: AssetPosition, totalValue: number }> = ({ asset, totalValue }) => {
  const [expanded, setExpanded] = useState(false);
  
  const currentVal = (asset.currentPrice || asset.averagePrice) * asset.quantity;
  const costVal = asset.averagePrice * asset.quantity;
  const delta = currentVal - costVal;
  const deltaPercent = costVal > 0 ? (delta / costVal) * 100 : 0;
  const isPos = delta >= 0;
  const allocation = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;

  // Determine profit bar width (capped at 100% for visual sanity)
  const profitBarPercent = Math.min(Math.abs(deltaPercent), 100);

  return (
    <div className={`bg-white dark:bg-[#0F1623] rounded-[1.5rem] border transition-all duration-300 overflow-hidden ${expanded ? 'border-slate-300 dark:border-slate-700 shadow-xl scale-[1.02] z-10' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}>
        
        {/* HEADER (Always Visible) */}
        <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between group active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-4">
                {/* Logo/Icon Box */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner border border-white/5 ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-8 h-8 object-contain rounded-md mix-blend-multiply dark:mix-blend-normal" />
                    ) : (
                        <span>{asset.ticker.substring(0,2)}</span>
                    )}
                </div>
                
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-none tracking-tight">{asset.ticker}</h3>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${asset.assetType === AssetType.FII ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'}`}>
                            {asset.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        {asset.quantity} cotas • {formatPercent(allocation)} da carteira
                    </p>
                </div>
            </div>

            <div className="text-right">
                <p className="text-base font-black text-slate-900 dark:text-white leading-none mb-1.5">{formatBRL(currentVal)}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPos ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {deltaPercent > 0 ? '+' : ''}{formatPercent(deltaPercent)}
                </div>
            </div>
        </button>
        
        {/* EXPANDED CONTENT */}
        {expanded && (
            <div className="px-5 pb-6 pt-1 anim-fade-in border-t border-slate-100 dark:border-slate-800/50">
                
                {/* Visual Profitability Bar */}
                <div className="mb-6 mt-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        <span className="text-slate-500">Custo Total</span>
                        <span className={isPos ? 'text-emerald-500' : 'text-rose-500'}>
                            {isPos ? 'Lucro' : 'Prejuízo'} ({formatBRL(delta)})
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative">
                        {/* Base (Cost) */}
                        <div className="h-full bg-slate-300 dark:bg-slate-600 w-full opacity-30"></div>
                        
                        {/* Overlay (Profit/Loss) */}
                        <div 
                            style={{ width: `${profitBarPercent}%` }} 
                            className={`absolute h-full rounded-full ${isPos ? 'bg-emerald-500 left-0' : 'bg-rose-500 right-0'}`}
                        ></div>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Prices */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preço Médio</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatBRL(asset.averagePrice)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 mb-1">
                            <BarChart3 className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cotação Atual</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatBRL(asset.currentPrice || 0)}</span>
                    </div>

                    {/* Fundamentals (If available) */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Layers className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">P/VP</span>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{asset.p_vp ? asset.p_vp.toFixed(2) : '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 mb-1">
                            <PieChart className="w-3 h-3 text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DY (12M)</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{asset.dy_12m ? formatPercent(asset.dy_12m) : '-'}</span>
                    </div>
                </div>
                
                {/* Footer Info */}
                <div className="flex items-center justify-between pt-2">
                    {asset.segment && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Layers className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate max-w-[150px]">
                                {asset.segment}
                            </span>
                        </div>
                    )}
                    
                    {asset.sources && asset.sources.length > 0 && (
                        <a href={asset.sources[0].uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Globe className="w-3 h-3 text-sky-500" />
                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">RI / Info</span>
                        </a>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, balance = 0 }) => {
  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto min-h-screen">
       {/* Page Header */}
       <div className="mb-8 px-1 flex items-end justify-between">
           <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Custódia</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Meus Ativos ({portfolio.length})</p>
           </div>
           <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Patrimônio</span>
                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{formatBRL(balance)}</span>
           </div>
       </div>

       {/* Asset List */}
       <div className="space-y-4">
           {portfolio.length > 0 ? (
               portfolio.map(p => <AssetCard key={p.ticker} asset={p} totalValue={balance} />)
           ) : (
               <div className="text-center py-20 opacity-50">
                   <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" strokeWidth={1} />
                   <p className="text-sm font-bold text-slate-500">Sua carteira está vazia.</p>
                   <p className="text-xs text-slate-400 mt-1">Adicione ordens para começar.</p>
               </div>
           )}
       </div>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
