
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, MoreHorizontal, PieChart, Wallet, Building2, CandlestickChart, Info, ExternalLink, Leaf } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

interface PortfolioProps {
  portfolio: AssetPosition[];
  privacyMode?: boolean;
}

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number, privacy = false) => {
  if (privacy) return '•••%';
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | AssetType>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);

  const filteredAssets = useMemo(() => {
    return portfolio
      .filter(p => {
        const matchesSearch = p.ticker.includes(searchTerm.toUpperCase()) || (p.segment || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || p.assetType === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => (b.currentPrice || 0) * b.quantity - (a.currentPrice || 0) * a.quantity); // Ordena por valor total decrescente
  }, [portfolio, searchTerm, filterType]);

  const totalFilteredValue = filteredAssets.reduce((acc, p) => acc + ((p.currentPrice || p.averagePrice) * p.quantity), 0);

  return (
    <div className="pb-24">
      {/* Sticky Header / Search Bar */}
      <div className="sticky top-20 z-30 px-4 py-2 -mx-4 mb-2">
        <div className="glass-effect rounded-2xl p-2 shadow-lg border border-white/20 dark:border-zinc-800/50 flex flex-col gap-2">
            {/* Search Input */}
            <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Buscar ativo ou setor..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800/50 pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                    <button 
                        onClick={() => setFilterType('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Tudo
                    </button>
                    <button 
                        onClick={() => setFilterType(AssetType.FII)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.FII ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        FIIs
                    </button>
                    <button 
                        onClick={() => setFilterType(AssetType.STOCK)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.STOCK ? 'bg-white dark:bg-zinc-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Ações
                    </button>
                </div>
                <div className="text-[10px] font-bold text-zinc-400 px-2">
                    {filteredAssets.length} Ativos
                </div>
            </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="space-y-3 px-1">
        {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => {
                const totalValue = (asset.currentPrice || asset.averagePrice) * asset.quantity;
                const gain = (asset.currentPrice || 0) - asset.averagePrice;
                const gainPercent = asset.averagePrice > 0 ? (gain / asset.averagePrice) * 100 : 0;
                const isPositive = gain >= 0;

                const dailyChange = asset.dailyChange || 0;
                const isDailyPositive = dailyChange >= 0;

                return (
                    <button 
                        key={asset.ticker}
                        onClick={() => setSelectedAsset(asset)}
                        className="w-full bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-card dark:shadow-card-dark press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex items-center gap-3.5">
                            {/* Icon Box */}
                            <div className="relative">
                                {asset.logoUrl ? (
                                    <div className="w-11 h-11 rounded-xl bg-white p-1 border border-zinc-100 shadow-sm flex items-center justify-center overflow-hidden">
                                        <img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>
                                        {asset.ticker.substring(0, 2)}
                                    </div>
                                )}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${asset.assetType === AssetType.FII ? 'bg-indigo-500' : 'bg-sky-500'}`}>
                                    {asset.assetType === AssetType.FII ? <Building2 className="w-2 h-2 text-white" /> : <CandlestickChart className="w-2 h-2 text-white" />}
                                </div>
                            </div>

                            <div className="text-left">
                                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                                    {asset.ticker}
                                    {asset.quantity > 0 && <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{asset.quantity} un</span>}
                                </h3>
                                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[100px] sm:max-w-xs">
                                    {asset.segment}
                                </p>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                            
                            <div className="flex items-center gap-2 mt-0.5">
                                {/* Variação Diária */}
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Dia</span>
                                    <span className={`text-[10px] font-bold ${isDailyPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {isDailyPositive ? '+' : ''}{formatPercent(dailyChange, privacyMode)}
                                    </span>
                                </div>
                                
                                <div className="w-px h-2 bg-zinc-200 dark:bg-zinc-700"></div>

                                {/* Variação Total */}
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded`}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {formatPercent(gainPercent, privacyMode)}
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })
        ) : (
            <div className="text-center py-20 opacity-50 anim-fade-in">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-sm font-bold text-zinc-500">Nenhum ativo encontrado</p>
            </div>
        )}
      </div>

      {/* Details Modal - Minimalist Redesign */}
      <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
        {selectedAsset && (() => {
            // Helper calculations for modal
            const gain = (selectedAsset.currentPrice || 0) - selectedAsset.averagePrice;
            const gainPercent = selectedAsset.averagePrice > 0 ? (gain / selectedAsset.averagePrice) * 100 : 0;
            const dailyChange = selectedAsset.dailyChange || 0;
            const isDailyPositive = dailyChange >= 0;
            const isPositive = gain >= 0;

            return (
            <div className="p-8 pb-20">
                {/* Header: Clean & Typographic */}
                <div className="flex flex-col items-center mb-8 anim-slide-up">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 p-2 mb-4 shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center">
                        {selectedAsset.logoUrl ? (
                            <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-2xl font-black text-zinc-300 dark:text-zinc-600">{selectedAsset.ticker.substring(0,2)}</span>
                        )}
                    </div>
                    
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-1">{selectedAsset.ticker}</h2>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{selectedAsset.segment} • {selectedAsset.assetType}</p>
                    
                    <div className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tighter">
                        {formatBRL(selectedAsset.currentPrice || 0, privacyMode)}
                    </div>
                </div>

                {/* Performance Row (Minimal) */}
                <div className="flex justify-center gap-8 mb-10 pb-10 border-b border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Dia</span>
                        <span className={`text-lg font-black ${isDailyPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isDailyPositive ? '+' : ''}{formatPercent(dailyChange, privacyMode)}
                        </span>
                    </div>
                    <div className="w-px bg-zinc-100 dark:bg-zinc-800"></div>
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total</span>
                        <span className={`text-lg font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? '+' : ''}{formatPercent(gainPercent, privacyMode)}
                        </span>
                    </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-3 gap-y-8 gap-x-4 mb-10 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Preço Médio</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatBRL(selectedAsset.averagePrice, privacyMode)}</span>
                     </div>
                     <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Quantidade</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{selectedAsset.quantity}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatBRL((selectedAsset.currentPrice || 0) * selectedAsset.quantity, privacyMode)}</span>
                     </div>

                     <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">P/VP</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{selectedAsset.p_vp?.toFixed(2) || '-'}</span>
                     </div>
                     <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">DY (12m)</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{selectedAsset.dy_12m ? `${selectedAsset.dy_12m}%` : '-'}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Liquidez</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[80px] ml-auto">{selectedAsset.liquidity || '-'}</span>
                     </div>
                </div>

                {/* AI & Sources - Clean Text */}
                <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '300ms' }}>
                     <div className="flex items-center gap-2 mb-3">
                        <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Inteligência Artificial</span>
                     </div>
                     
                     <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium mb-4">
                        {selectedAsset.sentiment_reason || 'Análise indisponível no momento.'}
                     </p>

                     {selectedAsset.sources && selectedAsset.sources.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                             {selectedAsset.sources.slice(0, 2).map((s, i) => (
                                 <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-indigo-500 transition-colors">
                                     <ExternalLink className="w-2.5 h-2.5" /> {new URL(s.uri).hostname.replace('www.','')}
                                 </a>
                             ))}
                        </div>
                     )}
                </div>
            </div>
            );
        })()}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
