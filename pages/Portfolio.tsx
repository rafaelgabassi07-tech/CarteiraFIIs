
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
// Fixed missing import: Added 'Info' to lucide-react imports
import { Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Building2, CandlestickChart, Wallet, Target, Activity, Leaf, ExternalLink, BarChart3, Droplets, PieChart as PieIcon, Home as HomeIcon, Info } from 'lucide-react';
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

const getPvpStatus = (val?: number) => {
    if (!val || val === 0) return null;
    if (val < 0.95) return { text: 'Desconto', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (val > 1.05) return { text: 'Ágio', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { text: 'Preço Justo', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' };
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
    <div className="pb-32 min-h-screen">
      {/* Search Bar Blindada - Fundo Sólido (Removido opacity) */}
      <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-3">
            <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Ativo ou setor..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-accent/10 transition-all shadow-inner"
                />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Tudo</button>
                    <button onClick={() => setFilterType(AssetType.FII)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.FII ? 'bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm' : 'text-zinc-400'}`}>FIIs</button>
                    <button onClick={() => setFilterType(AssetType.STOCK)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.STOCK ? 'bg-white dark:bg-zinc-800 text-sky-500 shadow-sm' : 'text-zinc-400'}`}>Ações</button>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">{filteredAssets.length} Itens</div>
            </div>
        </div>
      </div>

      <div className="space-y-2 px-1 pt-4">
        {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => {
                const currentPrice = asset.currentPrice || 0;
                const totalValue = currentPrice * asset.quantity;
                const totalGainValue = (currentPrice - asset.averagePrice) * asset.quantity;
                const isPositive = totalGainValue >= 0;

                return (
                    <button key={asset.ticker} onClick={() => setSelectedAsset(asset)} className="w-full bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item" style={{ animationDelay: `${index * 40}ms` }}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {asset.logoUrl ? (
                                    <div className="w-12 h-12 rounded-2xl bg-white p-1.5 border border-zinc-50 shadow-sm flex items-center justify-center overflow-hidden"><img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" /></div>
                                ) : (
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>{asset.ticker.substring(0, 2)}</div>
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">{asset.ticker} <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded tracking-tighter">{asset.quantity} un</span></h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">{asset.segment || 'Geral'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                            <div className={`flex items-center justify-end gap-1 text-[10px] font-black mt-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {formatBRL(Math.abs(totalGainValue), privacyMode)}
                            </div>
                        </div>
                    </button>
                );
            })
        ) : (
            <div className="text-center py-20 opacity-30 anim-fade-in">
                <Search className="w-16 h-16 mx-auto mb-4 text-zinc-400" strokeWidth={1} />
                <p className="text-sm font-black uppercase tracking-widest">Nenhum ativo encontrado</p>
            </div>
        )}
        {/* Spacer extra para rolagem fluida */}
        <div className="h-24"></div>
      </div>

      <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
        {selectedAsset && (() => {
            const currentPrice = selectedAsset.currentPrice || 0;
            const avgPrice = selectedAsset.averagePrice || 0;
            const quantity = selectedAsset.quantity;
            const totalInvested = avgPrice * quantity;
            const totalCurrent = currentPrice * quantity;
            const totalGainValue = (currentPrice - avgPrice) * quantity;
            const totalGainPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            const isTotalPositive = totalGainValue >= 0;
            const isFII = selectedAsset.assetType === AssetType.FII;

            return (
            <div className="p-6 pb-20">
                <div className="flex justify-between items-start mb-8 anim-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 p-2 shadow-xl border border-zinc-100 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                            {selectedAsset.logoUrl ? <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-contain" /> : <span className="text-2xl font-black text-zinc-200 dark:text-zinc-700">{selectedAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedAsset.ticker}</h2>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">{selectedAsset.assetType} • {selectedAsset.segment || 'Setor Geral'}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="col-span-2 p-6 bg-zinc-900 dark:bg-white rounded-[2rem] text-white dark:text-zinc-900 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><BarChart3 className="w-20 h-20" /></div>
                        <div className="relative z-10 grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Rentabilidade</span>
                                <p className={`text-2xl font-black tracking-tight mt-1 ${isTotalPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>{isTotalPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 dark:border-black/10 mt-2 inline-block ${isTotalPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{formatPercent(totalGainPercent, privacyMode)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Valor Total</span>
                                <p className="text-2xl font-black tracking-tight mt-1 tabular-nums">{formatBRL(totalCurrent, privacyMode)}</p>
                                <span className="text-[10px] font-bold opacity-60 mt-2 block">Custo: {formatBRL(totalInvested, privacyMode)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/40 dark:border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Posição</span>
                            <span className="text-xl font-black text-zinc-900 dark:text-white mt-1">{quantity} Unidades</span>
                         </div>
                         <div className="text-right flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Preço Médio</span>
                            <span className="text-xl font-black text-zinc-900 dark:text-white mt-1">{formatBRL(avgPrice, privacyMode)}</span>
                         </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/40 dark:border-zinc-800 rounded-3xl p-5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">P/VP</span>
                        <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{selectedAsset.p_vp || '-'}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/40 dark:border-zinc-800 rounded-3xl p-5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Yield (12m)</span>
                        <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{selectedAsset.dy_12m ? `${selectedAsset.dy_12m}%` : '-'}</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <div className="flex items-center gap-2 mb-4"><Info className="w-4 h-4 text-zinc-400" /><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Análise do Ativo</span></div>
                     <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium mb-6">{selectedAsset.sentiment_reason || 'Análise de fundamentos atualizada automaticamente via Scraper.'}</p>
                     <div className="flex flex-wrap gap-2">
                        <a href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${selectedAsset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-500 transition-colors bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 rounded-2xl">
                            <ExternalLink className="w-3 h-3" /> Ver no Investidor10
                        </a>
                     </div>
                </div>
            </div>
            );
        })()}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
