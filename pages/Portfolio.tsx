
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Building2, CandlestickChart, Wallet, Target, Activity, Leaf, ExternalLink, BarChart3, Droplets, PieChart as PieIcon, Home as HomeIcon } from 'lucide-react';
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
    <div className="pb-24">
      <div className="sticky top-20 z-30 px-4 py-2 -mx-4 mb-2">
        <div className="glass-effect rounded-2xl p-2 shadow-lg border border-white/20 dark:border-zinc-800/50 flex flex-col gap-2">
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
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                    <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Tudo</button>
                    <button onClick={() => setFilterType(AssetType.FII)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.FII ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>FIIs</button>
                    <button onClick={() => setFilterType(AssetType.STOCK)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.STOCK ? 'bg-white dark:bg-zinc-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Ações</button>
                </div>
                <div className="text-[10px] font-bold text-zinc-400 px-2">{filteredAssets.length} Ativos</div>
            </div>
        </div>
      </div>

      <div className="space-y-3 px-1">
        {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => {
                const currentPrice = asset.currentPrice || 0;
                const totalValue = currentPrice * asset.quantity;
                const totalGainValue = (currentPrice - asset.averagePrice) * asset.quantity;
                const isPositive = totalGainValue >= 0;

                return (
                    <button key={asset.ticker} onClick={() => setSelectedAsset(asset)} className="w-full bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-card dark:shadow-card-dark press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                {asset.logoUrl ? (
                                    <div className="w-11 h-11 rounded-xl bg-white p-1 border border-zinc-100 shadow-sm flex items-center justify-center overflow-hidden"><img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" /></div>
                                ) : (
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>{asset.ticker.substring(0, 2)}</div>
                                )}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${asset.assetType === AssetType.FII ? 'bg-indigo-500' : 'bg-sky-500'}`}>{asset.assetType === AssetType.FII ? <Building2 className="w-2 h-2 text-white" /> : <CandlestickChart className="w-2 h-2 text-white" />}</div>
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">{asset.ticker} {asset.quantity > 0 && <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{asset.quantity} un</span>}</h3>
                                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[100px] sm:max-w-xs">{asset.segment}</p>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{formatBRL(totalGainValue, privacyMode)}</div>
                            </div>
                        </div>
                    </button>
                );
            })
        ) : <div className="text-center py-20 opacity-50 anim-fade-in"><div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-zinc-400" /></div><p className="text-sm font-bold text-zinc-500">Nenhum ativo encontrado</p></div>}
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

            const dailyChangePercent = selectedAsset.dailyChange || 0;
            const previousClosePrice = currentPrice / (1 + (dailyChangePercent / 100));
            const dailyGainValue = (currentPrice - previousClosePrice) * quantity;
            const isDailyPositive = dailyGainValue >= 0;

            const pvpStatus = getPvpStatus(selectedAsset.p_vp);
            const isFII = selectedAsset.assetType === AssetType.FII;

            return (
            <div className="p-6 pb-20">
                <div className="flex justify-between items-start mb-6 anim-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 p-1.5 shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center">
                            {selectedAsset.logoUrl ? <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-contain" /> : <span className="text-xl font-black text-zinc-300 dark:text-zinc-600">{selectedAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedAsset.ticker}</h2>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{selectedAsset.assetType} • {selectedAsset.segment}</p>
                        </div>
                    </div>
                    <div className="text-right">
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Cotação Atual (Brapi)</p>
                         <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">{formatBRL(currentPrice, privacyMode)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="col-span-2 p-4 bg-zinc-900 dark:bg-white rounded-2xl text-white dark:text-zinc-900 shadow-lg relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1 opacity-70"><Target className="w-3 h-3" /><span className="text-[9px] font-bold uppercase tracking-widest">Valorização (Cota)</span></div>
                                <p className={`text-lg font-black tracking-tight ${isTotalPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>{isTotalPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}</p>
                                <p className={`text-[10px] font-bold ${isTotalPositive ? 'text-emerald-400/80 dark:text-emerald-600/80' : 'text-rose-400/80 dark:text-rose-600/80'}`}>{formatPercent(totalGainPercent, privacyMode)}</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-4 top-1 bottom-1 w-px bg-white/10 dark:bg-black/10"></div>
                                <div className="flex items-center gap-1.5 mb-1 opacity-70"><Activity className="w-3 h-3" /><span className="text-[9px] font-bold uppercase tracking-widest">Resultado Hoje</span></div>
                                <p className={`text-lg font-black tracking-tight ${isDailyPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>{isDailyPositive ? '+' : ''}{formatBRL(dailyGainValue, privacyMode)}</p>
                                <p className={`text-[10px] font-bold ${isDailyPositive ? 'text-emerald-400/80 dark:text-emerald-600/80' : 'text-rose-400/80 dark:text-rose-600/80'}`}>{formatPercent(dailyChangePercent, privacyMode)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="bg-zinc-100/50 dark:bg-zinc-800/50 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-zinc-400" /><h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Minha Posição</h3></div>
                        <div className="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800">
                            <div className="p-3 text-center border-b border-zinc-200 dark:border-zinc-800"><span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Quantidade</span><span className="text-lg font-black text-zinc-900 dark:text-white">{quantity}</span></div>
                            <div className="p-3 text-center border-b border-zinc-200 dark:border-zinc-800"><span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Preço Médio</span><span className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(avgPrice, privacyMode)}</span></div>
                            <div className="p-3 text-center"><span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Custo Total</span><span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{formatBRL(totalInvested, privacyMode)}</span></div>
                            <div className="p-3 text-center bg-white dark:bg-zinc-800"><span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Saldo Atual</span><span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{formatBRL(totalCurrent, privacyMode)}</span></div>
                        </div>
                    </div>

                    <div className="col-span-2 mt-2 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-zinc-400" /><h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Indicadores Chave</h3></div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start"><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">P/VP</span>{pvpStatus && <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${pvpStatus.color}`}>{pvpStatus.text}</span>}</div>
                        <span className={`text-lg font-black ${selectedAsset.p_vp && selectedAsset.p_vp < 1 && selectedAsset.p_vp > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{selectedAsset.p_vp && selectedAsset.p_vp > 0 ? selectedAsset.p_vp.toFixed(2) : '-'}</span>
                        <p className="text-[8px] text-zinc-400 font-medium mt-1 leading-tight">Preço / Valor Patrimonial</p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-zinc-400" /><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">DY (12m)</span></div>
                        <span className="text-lg font-black text-zinc-900 dark:text-white">{selectedAsset.dy_12m && selectedAsset.dy_12m > 0 ? `${selectedAsset.dy_12m}%` : '-'}</span>
                        <p className="text-[8px] text-zinc-400 font-medium mt-1 leading-tight">Retorno em dividendos</p>
                    </div>

                    {isFII ? (
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5"><HomeIcon className="w-3 h-3 text-zinc-400" /><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Vacância Física</span></div>
                            <span className={`text-lg font-black ${selectedAsset.vacancy && selectedAsset.vacancy > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                                {selectedAsset.vacancy !== undefined ? `${selectedAsset.vacancy}%` : '-'}
                            </span>
                            <p className="text-[8px] text-zinc-400 font-medium mt-1 leading-tight">Imóveis desocupados</p>
                        </div>
                    ) : (
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5"><PieIcon className="w-3 h-3 text-zinc-400" /><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">P/L</span></div>
                            <span className="text-lg font-black text-zinc-900 dark:text-white">
                                {selectedAsset.p_l && selectedAsset.p_l > 0 ? selectedAsset.p_l.toFixed(2) : '-'}
                            </span>
                            <p className="text-[8px] text-zinc-400 font-medium mt-1 leading-tight">Preço / Lucro</p>
                        </div>
                    )}

                    {!isFII && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-zinc-400" /><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ROE</span></div>
                            <span className={`text-lg font-black ${selectedAsset.roe && selectedAsset.roe > 15 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                                {selectedAsset.roe !== undefined ? `${selectedAsset.roe}%` : '-'}
                            </span>
                            <p className="text-[8px] text-zinc-400 font-medium mt-1 leading-tight">Retorno s/ Patrimônio</p>
                        </div>
                    )}

                    <div className="col-span-2 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5"><Droplets className="w-3 h-3 text-zinc-400" /><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Liquidez Diária</span></div>
                            <span className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                                {selectedAsset.liquidity || '-'}
                            </span>
                        </div>
                        {selectedAsset.market_cap && (
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Valor de Mercado</span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white mt-0.5">{selectedAsset.market_cap}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <div className="flex items-center gap-2 mb-2"><Leaf className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</span></div>
                     <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium mb-3">{selectedAsset.sentiment_reason || 'Dados atualizados automaticamente.'}</p>
                     <div className="flex flex-wrap gap-2"><a href={`https://investidor10.com.br/${selectedAsset.assetType === AssetType.FII ? 'fiis' : 'acoes'}/${selectedAsset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 hover:text-indigo-500 transition-colors bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-700"><ExternalLink className="w-2.5 h-2.5" /> Investidor10</a></div>
                </div>
            </div>
            );
        })()}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
