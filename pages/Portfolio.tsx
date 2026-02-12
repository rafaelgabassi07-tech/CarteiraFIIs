
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, TrendingUp, TrendingDown, ChevronRight, PieChart, Wallet } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
  privacyMode?: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
  headerVisible?: boolean;
  targetAsset?: string | null;
  onClearTarget?: () => void;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Componente de Item de Lista (Clean List Style)
const AssetListItem: React.FC<{ asset: AssetPosition, privacyMode?: boolean, onClick: () => void }> = ({ asset, privacyMode, onClick }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalValue = (asset.currentPrice || 0) * asset.quantity;
    
    return (
        <button onClick={onClick} className="w-full flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 group active:bg-zinc-50 dark:active:bg-zinc-900/50 transition-colors px-2">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-black transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'}`}>
                    {asset.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h4>
                    <p className="text-xs text-zinc-400 font-medium">{asset.quantity} cotas</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalValue, privacyMode)}</p>
                    <div className={`flex items-center justify-end gap-1 text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? '+' : ''}{asset.dailyChange?.toFixed(2)}%
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
            </div>
        </button>
    );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false, onAssetRefresh, headerVisible = true, targetAsset, onClearTarget }) => {
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (targetAsset) {
            const exists = portfolio.some(p => p.ticker === targetAsset);
            if (exists) { setSelectedTicker(targetAsset); if (onClearTarget) onClearTarget(); }
        }
    }, [targetAsset, portfolio, onClearTarget]);

    const filteredPortfolio = useMemo(() => {
        if (!searchTerm) return portfolio;
        return portfolio.filter(p => p.ticker.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [portfolio, searchTerm]);

    const grouped = useMemo(() => ({
        fiis: filteredPortfolio.filter(p => p.assetType === AssetType.FII),
        stocks: filteredPortfolio.filter(p => p.assetType === AssetType.STOCK)
    }), [filteredPortfolio]);

    const selectedAsset = useMemo(() => portfolio.find(p => p.ticker === selectedTicker), [portfolio, selectedTicker]);

    return (
        <div className="min-h-screen pb-32">
            {/* Search Bar Clean */}
            <div className={`sticky top-24 z-20 bg-[#F2F2F2] dark:bg-black py-2 transition-all duration-300 ${headerVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className="relative group bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar ativo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                    />
                </div>
            </div>

            <div className="space-y-8 mt-2">
                {grouped.fiis.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-2">Fundos Imobiliários</h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 px-4">
                            {grouped.fiis.map(asset => (
                                <AssetListItem key={asset.ticker} asset={asset} privacyMode={privacyMode} onClick={() => setSelectedTicker(asset.ticker)} />
                            ))}
                        </div>
                    </div>
                )}

                {grouped.stocks.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-2">Ações</h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 px-4">
                            {grouped.stocks.map(asset => (
                                <AssetListItem key={asset.ticker} asset={asset} privacyMode={privacyMode} onClick={() => setSelectedTicker(asset.ticker)} />
                            ))}
                        </div>
                    </div>
                )}

                {filteredPortfolio.length === 0 && (
                    <div className="text-center py-20 opacity-40">
                        <Wallet className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                        <p className="text-sm font-bold text-zinc-500">Carteira vazia</p>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes (Simplificado para consistência) */}
            <SwipeableModal isOpen={!!selectedTicker} onClose={() => setSelectedTicker(null)}>
                {selectedAsset && (
                    <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
                        <div className="flex items-center justify-between pt-6 mb-8">
                            <div>
                                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{selectedAsset.ticker}</h2>
                                <p className="text-sm text-zinc-500 font-bold">{selectedAsset.segment}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL((selectedAsset.currentPrice || 0) * selectedAsset.quantity, privacyMode)}</p>
                                <p className={`text-sm font-bold ${(selectedAsset.dailyChange || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {(selectedAsset.dailyChange || 0) >= 0 ? '+' : ''}{selectedAsset.dailyChange?.toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Preço Médio</p>
                                <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.averagePrice, privacyMode)}</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Cotação</p>
                                <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.currentPrice || 0, privacyMode)}</p>
                            </div>
                        </div>

                        {selectedAsset.dy_12m && (
                            <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-lg shadow-emerald-500/20 mb-8">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Dividend Yield (12m)</p>
                                        <p className="text-4xl font-black tracking-tighter">{selectedAsset.dy_12m.toFixed(2)}%</p>
                                    </div>
                                    <TrendingUp className="w-10 h-10 opacity-50" />
                                </div>
                            </div>
                        )}
                        
                        {/* More details could be added here similar to previous version but cleaner */}
                    </div>
                )}
            </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
