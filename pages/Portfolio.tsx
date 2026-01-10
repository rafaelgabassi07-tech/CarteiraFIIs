
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { TrendingUp, TrendingDown, Globe, Layers, BarChart3, Wallet, Tag, ArrowUpRight, ArrowDownRight, PieChart, Info, ChevronRight, X, Calendar, DollarSign, Building2 } from 'lucide-react';
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

  // Determine profit bar width (capped at 100% for visual sanity)
  const profitBarPercent = Math.min(Math.abs(deltaPercent), 100);

  return (
    <div className={`bg-surface-light dark:bg-surface-dark rounded-[1.5rem] border transition-all duration-300 overflow-hidden ${expanded ? 'border-slate-300 dark:border-slate-700 shadow-xl scale-[1.02] z-10' : 'border-slate-200 dark:border-slate-800 shadow-card dark:shadow-card-dark'}`}>
        
        {/* HEADER (Always Visible) */}
        <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between group active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
                {/* Logo/Icon Box */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner border border-white/5 ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-6 h-6 object-contain rounded-md mix-blend-multiply dark:mix-blend-normal" />
                    ) : (
                        <span>{asset.ticker.substring(0,2)}</span>
                    )}
                </div>
                
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight">{asset.ticker}</h3>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-800'}`}>
                            {asset.assetType === AssetType.FII ? 'FII' : 'Ação'}
                        </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        {asset.quantity} cotas • {formatPercent(allocation)}
                    </p>
                </div>
            </div>

            <div className="text-right">
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{formatBRL(currentVal)}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {deltaPercent > 0 ? '+' : ''}{formatPercent(deltaPercent)}
                </div>
            </div>
        </button>
        
        {/* EXPANDED CONTENT (Optimized) */}
        {expanded && (
            <div className="pb-4 pt-0 anim-fade-in">
                
                {/* 1. Slim Profit Bar */}
                <div className="px-4 mb-5">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative mb-2">
                        {/* Base (Cost) */}
                        <div className="h-full bg-slate-300 dark:bg-slate-600 w-full opacity-30"></div>
                        {/* Overlay (Profit/Loss) */}
                        <div 
                            style={{ width: `${profitBarPercent}%` }} 
                            className={`absolute h-full rounded-full ${isPos ? 'bg-emerald-500 left-0' : 'bg-rose-500 right-0'}`}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-medium text-slate-400">
                        <span>Custo: <strong className="text-slate-600 dark:text-slate-300">{formatBRL(costVal)}</strong></span>
                        <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                             {isPos ? 'Lucro' : 'Prejuízo'}: <strong>{formatBRL(delta)}</strong>
                        </span>
                    </div>
                </div>

                {/* 2. Clean Stats Grid (No boxes) */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800 py-3 mb-3">
                    <div className="px-2 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Preço Médio</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatBRL(asset.averagePrice)}</span>
                    </div>
                    <div className="px-2 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">P/VP</span>
                        <span className={`text-xs font-bold ${!asset.p_vp ? 'text-slate-300' : asset.p_vp < 1 ? 'text-emerald-600 dark:text-emerald-400' : asset.p_vp > 1.2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {asset.p_vp ? asset.p_vp.toFixed(2) : '-'}
                        </span>
                    </div>
                    <div className="px-2 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">DY (12M)</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {asset.dy_12m ? formatPercent(asset.dy_12m) : '-'}
                        </span>
                    </div>
                </div>
                
                {/* 3. Action Footer */}
                <div className="px-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 opacity-70">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                            {asset.segment || 'Geral'}
                        </span>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onViewDetails(asset); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Ver Detalhes <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, balance = 0, dividendReceipts = [] }) => {
  const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);

  // Filter dividends for the selected asset
  const assetHistory = useMemo(() => {
      if (!selectedAsset) return [];
      return dividendReceipts
        .filter(d => d.ticker === selectedAsset.ticker)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [selectedAsset, dividendReceipts]);

  const totalAssetDividends = useMemo(() => {
     return assetHistory.reduce((acc, curr) => acc + curr.totalReceived, 0);
  }, [assetHistory]);

  return (
    <div className="pt-24 pb-32 px-5 max-w-lg mx-auto min-h-screen">
       {/* Page Header - Simplified without Duplicate Title */}
       <div className="mb-6 px-1 flex items-end justify-between">
           <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {portfolio.length} {portfolio.length === 1 ? 'Ativo' : 'Ativos'} na Carteira
                </p>
           </div>
           <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Patrimônio</span>
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{formatBRL(balance)}</span>
           </div>
       </div>

       {/* Asset List */}
       <div className="space-y-3">
           {portfolio.length > 0 ? (
               portfolio.map(p => (
                   <AssetCard 
                        key={p.ticker} 
                        asset={p} 
                        totalValue={balance} 
                        onViewDetails={setSelectedAsset}
                   />
                ))
           ) : (
               <div className="text-center py-20 opacity-50">
                   <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" strokeWidth={1} />
                   <p className="text-sm font-bold text-slate-500">Sua carteira está vazia.</p>
                   <p className="text-xs text-slate-400 mt-1">Adicione ordens para começar.</p>
               </div>
           )}
       </div>

       {/* Asset Details Modal */}
       <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
            {selectedAsset && (
                <div className="p-6 pb-20">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ${selectedAsset.assetType === AssetType.FII ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'}`}>
                                {selectedAsset.logoUrl ? (
                                    <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-8 h-8 object-contain rounded-md" />
                                ) : (
                                    <span>{selectedAsset.ticker.substring(0,2)}</span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedAsset.ticker}</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedAsset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-xl font-black text-slate-900 dark:text-white">{formatBRL(selectedAsset.currentPrice || selectedAsset.averagePrice)}</p>
                             <p className="text-[10px] text-slate-400 font-medium">Cotação Atual</p>
                        </div>
                    </div>

                    {/* Fundamentals Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Preço Médio</span>
                             <span className="text-lg font-black text-slate-700 dark:text-slate-200">{formatBRL(selectedAsset.averagePrice)}</span>
                        </div>
                         <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Dividend Yield</span>
                             <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{selectedAsset.dy_12m ? formatPercent(selectedAsset.dy_12m) : '-'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">P/VP</span>
                             <span className={`text-lg font-black ${!selectedAsset.p_vp ? 'text-slate-400' : selectedAsset.p_vp < 1 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                 {selectedAsset.p_vp?.toFixed(2) || '-'}
                             </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Segmento</span>
                             <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block" title={selectedAsset.segment}>
                                 {selectedAsset.segment || 'Geral'}
                             </span>
                        </div>
                    </div>

                    {/* Dividend History */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4 px-2">
                             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-emerald-500" /> Histórico de Proventos
                             </h3>
                             <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                 Total: {formatBRL(totalAssetDividends)}
                             </span>
                        </div>

                        {assetHistory.length > 0 ? (
                            <div className="space-y-3">
                                {assetHistory.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                                                    {new Date(h.paymentDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                                </p>
                                                <p className="text-[9px] text-slate-400">Data Com: {new Date(h.dateCom).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white">{formatBRL(h.totalReceived)}</p>
                                            <p className="text-[9px] text-slate-400">{formatBRL(h.rate)} / cota</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p className="text-xs text-slate-400 font-medium">Nenhum provento registrado para este ativo ainda.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* External Link */}
                    {selectedAsset.sources && selectedAsset.sources.length > 0 && (
                        <a 
                            href={selectedAsset.sources[0].uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-8 w-full py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Ver Fonte Oficial <ArrowUpRight className="w-3 h-3" />
                        </a>
                    )}
                </div>
            )}
       </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
