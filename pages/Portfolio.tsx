
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface AssetListItemProps {
  asset: AssetPosition;
  onClick: () => void;
  privacyMode: boolean;
}

const AssetListItem: React.FC<AssetListItemProps> = ({ asset, onClick, privacyMode }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalVal = asset.quantity * (asset.currentPrice || 0);

    return (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 mb-2 bg-white dark:bg-zinc-900 rounded-2xl press-effect border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black tracking-wider shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'}`}>
                    {asset.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.ticker}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">{asset.quantity} Cotas</p>
                </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
                <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">{formatBRL(totalVal, privacyMode)}</p>
                
                {asset.dailyChange !== undefined && (
                    <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {Math.abs(asset.dailyChange).toFixed(2)}%
                    </div>
                )}
            </div>
        </button>
    );
}

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
  privacyMode?: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
  headerVisible?: boolean;
  targetAsset?: string | null;
  onClearTarget?: () => void;
}

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false }) => {
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);

    const filtered = useMemo(() => {
        if (!search) return portfolio;
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    const fiis = filtered.filter(p => p.assetType === AssetType.FII);
    const stocks = filtered.filter(p => p.assetType === AssetType.STOCK);

    return (
        <div className="pb-32">
            {/* Sticky Search Header */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* FIIs Section */}
            {fiis.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fundos Imobiliários</h3>
                        <InfoTooltip title="FIIs" text="Cotações com delay de ~15 minutos. Valores baseados no último preço de mercado disponível." />
                    </div>
                    {fiis.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} onClick={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}

            {/* Stocks Section */}
            {stocks.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ações</h3>
                        <InfoTooltip title="Ações" text="Cotações com delay de ~15 minutos. Valores baseados no último preço de mercado disponível." />
                    </div>
                    {stocks.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} onClick={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}
            
            {filtered.length === 0 && (
                <div className="text-center py-20 opacity-40 anim-fade-in">
                    <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum ativo encontrado</p>
                </div>
            )}

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                <div className="p-6 h-full flex flex-col">
                    {selectedAsset && (
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6 text-2xl font-black text-zinc-400 shadow-inner">
                                    {selectedAsset.ticker.substring(0,2)}
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1 tracking-tight">{selectedAsset.ticker}</h2>
                                <p className="text-sm font-medium text-zinc-500">{selectedAsset.segment}</p>
                                
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Médio</p>
                                        <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatBRL(selectedAsset.averagePrice, privacyMode)}</p>
                                    </div>
                                    <div className="p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Atual</p>
                                        <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatBRL(selectedAsset.currentPrice, privacyMode)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
