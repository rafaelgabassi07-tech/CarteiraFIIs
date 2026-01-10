
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { TrendingUp, TrendingDown, Globe, Layers, BarChart3, Wallet, Tag, ArrowUpRight, ArrowDownRight, PieChart, Info, ChevronRight, X, Calendar, DollarSign, Building2, Search } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts?: DividendReceipt[];
  balance?: number;
}

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number) => `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;

const AssetCard: React.FC<{ asset: AssetPosition, totalValue: number, onViewDetails: (asset: AssetPosition) => void }> = ({ asset, totalValue, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);
  const currentVal = (asset.currentPrice || asset.averagePrice) * asset.quantity;
  const costVal = asset.averagePrice * asset.quantity;
  const delta = currentVal - costVal;
  const deltaPercent = costVal > 0 ? (delta / costVal) * 100 : 0;
  const isPos = delta >= 0;
  const allocation = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-[2rem] border transition-all duration-500 overflow-hidden ${expanded ? 'border-zinc-300 dark:border-zinc-600 shadow-2xl scale-[1.02] z-10' : 'border-zinc-200 dark:border-zinc-800 shadow-card'}`}>
        <button onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between group active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black border ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-7 h-7 object-contain rounded-md" />
                    ) : (
                        <span>{asset.ticker.substring(0,2)}</span>
                    )}
                </div>
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h3>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${asset.assetType === AssetType.FII ? 'bg-indigo-600 text-white' : 'bg-sky-500 text-white'}`}>
                            {asset.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {asset.quantity} Cotas • {formatPercent(allocation)}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-base font-black text-zinc-900 dark:text-white mb-1">{formatBRL(currentVal)}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-black ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPos ? '+' : ''}{formatPercent(deltaPercent)}
                </div>
            </div>
        </button>
        {expanded && (
            <div className="px-5 pb-6 anim-fade-in">
                <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 mb-6"></div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                        <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.15em] mb-1">Preço Médio</p>
                        <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">{formatBRL(asset.averagePrice)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                        <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.15em] mb-1">Cotação</p>
                        <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">{formatBRL(asset.currentPrice || 0)}</p>
                    </div>
                </div>
                <div className={`p-4 rounded-2xl flex items-center justify-between border ${isPos ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Resultado Total</span>
                    <span className={`text-base font-black ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{isPos ? '+' : ''}{formatBRL(delta)}</span>
                </div>
            </div>
        )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, balance = 0 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | AssetType>('ALL');
    const filtered = useMemo(() => {
        return portfolio.filter(p => {
            const matchesSearch = p.ticker.includes(searchTerm.toUpperCase());
            const matchesType = filterType === 'ALL' || p.assetType === filterType;
            return matchesSearch && matchesType;
        }).sort((a,b) => ((b.currentPrice||0)*b.quantity) - ((a.currentPrice||0)*a.quantity));
    }, [portfolio, searchTerm, filterType]);

    return (
        <div className="pt-24 pb-32 px-5 max-w-lg mx-auto min-h-screen">
             <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md -mx-5 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
                 <div className="relative group mb-4">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400 group-focus-within:text-sky-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar ticker..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none shadow-sm transition-all uppercase"
                    />
                 </div>
                 <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
                     {(['ALL', AssetType.FII, AssetType.STOCK] as const).map(type => (
                         <button key={type} onClick={() => setFilterType(type)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}>
                             {type === 'ALL' ? 'Todos' : type === AssetType.FII ? 'FIIs' : 'Ações'}
                         </button>
                     ))}
                 </div>
             </div>
            <div className="space-y-4">
                {filtered.map(asset => <AssetCard key={asset.ticker} asset={asset} totalValue={balance} onViewDetails={() => {}} />)}
            </div>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
