
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, ArrowUpRight, ArrowDownRight, Wallet, ExternalLink, X } from 'lucide-react';
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
  
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    return portfolio
      .filter(p => {
        const matchesSearch = p.ticker.includes(searchTerm.toUpperCase()) || (p.segment || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || p.assetType === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => (b.currentPrice || 0) * b.quantity - (a.currentPrice || 0) * a.quantity); 
  }, [portfolio, searchTerm, filterType]);

  const activeAsset = useMemo(() => {
      return portfolio.find(p => p.ticker === selectedTicker) || null;
  }, [portfolio, selectedTicker]);

  return (
    <div className="pb-32 min-h-screen">
      {/* Search Bar */}
      <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-3">
            <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Buscar ativo..." 
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
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">{filteredAssets.length} Ativos</div>
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
                    <button key={asset.ticker} onClick={() => setSelectedTicker(asset.ticker)} className="w-full bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item" style={{ animationDelay: `${index * 40}ms` }}>
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
      </div>

      <SwipeableModal isOpen={!!activeAsset} onClose={() => setSelectedTicker(null)}>
        {activeAsset && (() => {
            const currentPrice = activeAsset.currentPrice || 0;
            const avgPrice = activeAsset.averagePrice || 0;
            const totalCurrent = currentPrice * activeAsset.quantity;
            const totalCost = avgPrice * activeAsset.quantity;
            const totalGainValue = totalCurrent - totalCost;
            const totalGainPercent = totalCost > 0 ? (totalGainValue / totalCost) * 100 : 0;
            const isPositive = totalGainValue >= 0;
            const isFII = activeAsset.assetType === AssetType.FII;

            return (
            <div className="p-6 pb-20 bg-zinc-50 dark:bg-black/95 min-h-full">
                
                {/* Main Header */}
                <div className="flex justify-between items-start mb-8 anim-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shadow-lg shadow-zinc-200/50 dark:shadow-none">
                            {activeAsset.logoUrl ? <img src={activeAsset.logoUrl} className="w-full h-full object-contain p-2" /> : <span className="text-lg font-black text-zinc-400">{activeAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{activeAsset.ticker}</h1>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-200 dark:border-sky-800'}`}>
                                    {isFII ? 'Fundo Imobiliário' : 'Ação'}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{activeAsset.segment || 'Segmento Geral'}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedTicker(null)} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Section: Minha Posição */}
                <div className="mb-8 anim-slide-up" style={{ animationDelay: '50ms' }}>
                     <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Wallet className="w-3 h-3" /> Minha Posição
                     </h3>
                     <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex justify-between items-end mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                             <div>
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Valor Atual</p>
                                 <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalCurrent, privacyMode)}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Rentabilidade</p>
                                 <div className={`flex flex-col items-end font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                     <span className="text-lg leading-none mb-1">{isPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}</span>
                                     <span className="text-[10px] bg-current/10 px-1.5 py-0.5 rounded-md inline-block">
                                         {formatPercent(totalGainPercent, privacyMode).replace('+', '')}
                                     </span>
                                 </div>
                             </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Médio</span>
                                <span className="block text-sm font-black text-zinc-700 dark:text-zinc-300">{formatBRL(avgPrice, privacyMode)}</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cotação</span>
                                <span className="block text-sm font-black text-zinc-900 dark:text-white">{formatBRL(currentPrice, privacyMode)}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Quantidade</span>
                                <span className="block text-sm font-black text-zinc-900 dark:text-white">{activeAsset.quantity}</span>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Fonte e Links */}
                <div className="mt-6 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <a 
                        href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${activeAsset.ticker.toLowerCase()}/`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-[0.15em] shadow-lg press-effect"
                    >
                        Ver no Investidor10 <ExternalLink className="w-3 h-3" />
                    </a>
                    {activeAsset.updated_at && (
                        <p className="text-[9px] text-zinc-400 text-center mt-4">
                            Atualizado em: {new Date(activeAsset.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
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
