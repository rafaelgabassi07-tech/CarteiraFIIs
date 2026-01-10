
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { TrendingUp, TrendingDown, Globe, Layers, BarChart3, Wallet, Tag, ArrowUpRight, ArrowDownRight, PieChart, Info, ChevronRight, X, Calendar, DollarSign, Building2, Search } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts?: DividendReceipt[];
  balance?: number;
  invested?: number;
  totalDividendsReceived?: number;
  salesGain?: number;
  privacyMode?: boolean;
}

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number, privacy = false) => {
  if (privacy) return '•••%';
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
};

const AssetCard: React.FC<{ asset: AssetPosition, totalValue: number, index: number, privacyMode?: boolean }> = ({ asset, totalValue, index, privacyMode = false }) => {
  const [expanded, setExpanded] = useState(false);
  
  const currentVal = (asset.currentPrice || asset.averagePrice) * asset.quantity;
  const costVal = asset.averagePrice * asset.quantity;
  const delta = currentVal - costVal;
  const deltaPercent = costVal > 0 ? (delta / costVal) * 100 : 0;
  const isPos = delta >= 0;
  const allocation = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;

  return (
    <div 
        className={`bg-surface-light dark:bg-surface-dark rounded-[1.5rem] border transition-all duration-300 overflow-hidden anim-stagger-item ${expanded ? 'border-zinc-300 dark:border-zinc-700 shadow-xl scale-[1.02] z-10' : 'border-zinc-200 dark:border-zinc-800 shadow-card dark:shadow-card-dark'}`}
        style={{ animationDelay: `${index * 50}ms` }}
    >
        
        {/* HEADER (Always Visible) */}
        <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between group press-effect">
            <div className="flex items-center gap-3">
                {/* Logo/Icon Box */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner border border-zinc-100 dark:border-zinc-800 ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-6 h-6 object-contain rounded-md mix-blend-multiply dark:mix-blend-normal" />
                    ) : (
                        <span>{asset.ticker.substring(0,2)}</span>
                    )}
                </div>
                
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-none tracking-tight">{asset.ticker}</h3>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900' : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-900'}`}>
                            {asset.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                    </div>
                    <p className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                        {asset.quantity} cotas • {formatPercent(allocation)}
                    </p>
                </div>
            </div>

            <div className="text-right">
                <p className="text-sm font-black text-zinc-900 dark:text-white leading-none mb-1">{formatBRL(currentVal, privacyMode)}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {formatPercent(deltaPercent, privacyMode)}
                </div>
            </div>
        </button>

        {/* EXPANDED CONTENT */}
        {expanded && (
            <div className="px-4 pb-4 pt-0 anim-fade-in">
                <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 mb-4"></div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Preço Médio</p>
                        <p className="text-xs font-black text-zinc-700 dark:text-zinc-200">{formatBRL(asset.averagePrice, privacyMode)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Preço Atual</p>
                        <p className="text-xs font-black text-zinc-700 dark:text-zinc-200">{formatBRL(asset.currentPrice || 0, privacyMode)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 mb-4">
                     <div className="flex items-center gap-2">
                         <Layers className="w-4 h-4 text-zinc-400" />
                         <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Segmento</span>
                     </div>
                     <span className="text-xs font-bold text-zinc-900 dark:text-white">{asset.segment || 'N/A'}</span>
                </div>

                {/* Profit/Loss Badge */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${isPos ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        Resultado Total
                    </span>
                    <span className={`text-sm font-black ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPos ? '+' : ''}{formatBRL(delta, privacyMode)}
                    </span>
                </div>
            </div>
        )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, balance = 0, privacyMode = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | AssetType>('ALL');

    const filtered = useMemo(() => {
        return portfolio.filter(p => {
            const matchesSearch = p.ticker.includes(searchTerm.toUpperCase());
            const matchesType = filterType === 'ALL' || p.assetType === filterType;
            return matchesSearch && matchesType;
        }).sort((a,b) => ((b.currentPrice||0)*b.quantity) - ((a.currentPrice||0)*a.quantity)); // Sort by Value Desc
    }, [portfolio, searchTerm, filterType]);

    return (
        <div className="pt-24 pb-32 px-5 max-w-lg mx-auto min-h-screen overflow-x-hidden">
             {/* Header Controls */}
             <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-none border-b border-zinc-200 dark:border-zinc-800 py-2 -mx-5 px-5 mb-4 shadow-sm anim-fade-in">
                 <div className="flex gap-2 mb-3">
                     <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400 group-focus-within:text-sky-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar ativo..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-light dark:bg-surface-dark pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500 outline-none shadow-sm transition-all"
                        />
                     </div>
                 </div>

                 <div className="flex p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
                     {(['ALL', AssetType.FII, AssetType.STOCK] as const).map(type => (
                         <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filterType === type ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                         >
                             {type === 'ALL' ? 'Todos' : type === AssetType.FII ? 'FIIs' : 'Ações'}
                         </button>
                     ))}
                 </div>
             </div>
            
            {/* List */}
            <div className="space-y-3">
                {filtered.length > 0 ? (
                    filtered.map((asset, index) => (
                        <AssetCard key={asset.ticker} asset={asset} index={index} totalValue={balance} privacyMode={privacyMode} />
                    ))
                ) : (
                    <div className="text-center py-20 opacity-50 anim-fade-in">
                        <PieChart className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-700" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhum ativo encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
