
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, MoreHorizontal, PieChart, Wallet, Building2, CandlestickChart, Info, ExternalLink, Leaf, DollarSign, Target, Activity } from 'lucide-react';
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
  const signal = val > 0 ? '+' : '';
  return `${signal}${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
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
      .sort((a, b) => (b.currentPrice || 0) * b.quantity - (a.currentPrice || 0) * a.quantity); 
  }, [portfolio, searchTerm, filterType]);

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
                const currentPrice = asset.currentPrice || 0;
                const totalValue = currentPrice * asset.quantity;
                const totalGainValue = (currentPrice - asset.averagePrice) * asset.quantity;
                const totalGainPercent = asset.averagePrice > 0 ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 : 0;
                const isPositive = totalGainValue >= 0;

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
                                {/* Total Gain Compact */}
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {formatBRL(totalGainValue, privacyMode)}
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

      {/* Details Modal - Optimized Space Layout */}
      <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
        {selectedAsset && (() => {
            // Calculations
            const currentPrice = selectedAsset.currentPrice || 0;
            const avgPrice = selectedAsset.averagePrice || 0;
            const quantity = selectedAsset.quantity;
            const totalInvested = avgPrice * quantity;
            const totalCurrent = currentPrice * quantity;
            
            // 1. Total Gain
            const totalGainValue = (currentPrice - avgPrice) * quantity;
            const totalGainPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            const isTotalPositive = totalGainValue >= 0;

            // 2. Daily Gain Calculation
            // Formula: PreviousPrice = Current / (1 + change%); DailyGain = (Current - Previous) * Qty
            const dailyChangePercent = selectedAsset.dailyChange || 0;
            const previousClosePrice = currentPrice / (1 + (dailyChangePercent / 100));
            const dailyGainValue = (currentPrice - previousClosePrice) * quantity;
            const isDailyPositive = dailyGainValue >= 0;

            return (
            <div className="p-6 pb-20">
                {/* Compact Header */}
                <div className="flex justify-between items-start mb-6 anim-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 p-1.5 shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center">
                            {selectedAsset.logoUrl ? (
                                <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-xl font-black text-zinc-300 dark:text-zinc-600">{selectedAsset.ticker.substring(0,2)}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedAsset.ticker}</h2>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{selectedAsset.assetType} • {selectedAsset.segment}</p>
                        </div>
                    </div>
                    <div className="text-right">
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Cotação Atual</p>
                         <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">{formatBRL(currentPrice, privacyMode)}</p>
                    </div>
                </div>

                {/* Dashboard Grid - Optimized for Space */}
                <div className="grid grid-cols-2 gap-3 mb-4 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    
                    {/* Card 1: Performance (The requested highlights) */}
                    <div className="col-span-2 p-4 bg-zinc-900 dark:bg-white rounded-2xl text-white dark:text-zinc-900 shadow-lg relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                    <Target className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Resultado Total</span>
                                </div>
                                <p className={`text-lg font-black tracking-tight ${isTotalPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>
                                    {isTotalPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}
                                </p>
                                <p className={`text-[10px] font-bold ${isTotalPositive ? 'text-emerald-400/80 dark:text-emerald-600/80' : 'text-rose-400/80 dark:text-rose-600/80'}`}>
                                    {formatPercent(totalGainPercent, privacyMode)}
                                </p>
                            </div>

                            <div className="relative">
                                {/* Divider Line */}
                                <div className="absolute -left-4 top-1 bottom-1 w-px bg-white/10 dark:bg-black/10"></div>
                                
                                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                    <Activity className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Resultado Hoje</span>
                                </div>
                                <p className={`text-lg font-black tracking-tight ${isDailyPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>
                                    {isDailyPositive ? '+' : ''}{formatBRL(dailyGainValue, privacyMode)}
                                </p>
                                <p className={`text-[10px] font-bold ${isDailyPositive ? 'text-emerald-400/80 dark:text-emerald-600/80' : 'text-rose-400/80 dark:text-rose-600/80'}`}>
                                    {formatPercent(dailyChangePercent, privacyMode)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Minha Posição (Dense & Explícito) */}
                    <div className="col-span-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Minha Posição</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="col-span-1 text-left">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase">Qtd</span>
                                <span className="text-sm font-black text-zinc-900 dark:text-white">{quantity}</span>
                            </div>
                            <div className="col-span-1 text-left">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase">Preço Médio</span>
                                <span className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(avgPrice, privacyMode)}</span>
                            </div>
                            <div className="col-span-2 text-right flex justify-end gap-6">
                                <div>
                                    <span className="block text-[9px] font-bold text-zinc-400 uppercase">Custo Total</span>
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(totalInvested, privacyMode)}</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] font-bold text-zinc-400 uppercase">Saldo Atual</span>
                                    <span className="text-base font-black text-zinc-900 dark:text-white">{formatBRL(totalCurrent, privacyMode)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Fundamentos (Row) */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">P/VP</span>
                        <span className={`text-lg font-black ${selectedAsset.p_vp && selectedAsset.p_vp < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                            {selectedAsset.p_vp?.toFixed(2) || '-'}
                        </span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">DY (12m)</span>
                        <span className="text-lg font-black text-zinc-900 dark:text-white">
                            {selectedAsset.dy_12m ? `${selectedAsset.dy_12m}%` : '-'}
                        </span>
                    </div>
                </div>

                {/* AI & Sources - Clean Text */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Análise Inteligente</span>
                     </div>
                     
                     <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium mb-3">
                        {selectedAsset.sentiment_reason || 'Análise indisponível no momento.'}
                     </p>

                     {selectedAsset.sources && selectedAsset.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                             {selectedAsset.sources.slice(0, 2).map((s, i) => (
                                 <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 hover:text-indigo-500 transition-colors bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-700">
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
