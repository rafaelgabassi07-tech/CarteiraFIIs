
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
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
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 mb-2 bg-white dark:bg-zinc-900 rounded-2xl press-effect border border-transparent dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black tracking-wider ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                    {asset.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.ticker}</h4>
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{asset.quantity} Cotas</p>
                </div>
            </div>
            
            <div className="text-right">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatBRL(totalVal, privacyMode)}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                    {asset.dailyChange !== undefined && (
                        <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? '+' : ''}{asset.dailyChange.toFixed(2)}%
                        </span>
                    )}
                </div>
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
            <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md py-2 -mx-4 px-4 mb-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:border-indigo-500/20"
                    />
                </div>
            </div>

            {/* FIIs Section */}
            {fiis.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-2 mb-3 px-1">
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
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ações</h3>
                        <InfoTooltip title="Ações" text="Cotações com delay de ~15 minutos. Valores baseados no último preço de mercado disponível." />
                    </div>
                    {stocks.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} onClick={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                <div className="p-6 h-full flex flex-col">
                    {selectedAsset && (
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-xl font-black">
                                    {selectedAsset.ticker.substring(0,2)}
                                </div>
                                <h2 className="text-3xl font-bold dark:text-white mb-1">{selectedAsset.ticker}</h2>
                                <p className="text-zinc-500">{selectedAsset.segment}</p>
                                
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                                        <p className="text-xs text-zinc-500 uppercase">Preço Médio</p>
                                        <p className="text-lg font-bold dark:text-white">{formatBRL(selectedAsset.averagePrice, privacyMode)}</p>
                                    </div>
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                                        <p className="text-xs text-zinc-500 uppercase">Preço Atual</p>
                                        <p className="text-lg font-bold dark:text-white">{formatBRL(selectedAsset.currentPrice, privacyMode)}</p>
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
