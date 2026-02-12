import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, TrendingUp, ChevronRight, Wallet, Info, DollarSign, Activity, Percent, BarChart3, Building2, Coins, Scale, AlertCircle } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

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

const displayVal = (val: any, suffix = '', precision = 2) => {
    if (val === undefined || val === null || val === '') return '---';
    const num = Number(val);
    if (isNaN(num)) return '---';
    return `${num.toFixed(precision)}${suffix}`;
};

const HighlightCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: React.ElementType, color: string }) => (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center h-28 relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-full h-1 ${color}`}></div>
        <div className={`mb-2 p-2 rounded-xl ${color.replace('bg-', 'bg-').replace('500', '100')} dark:bg-opacity-20`}>
            <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xl font-black text-zinc-900 dark:text-white">{value}</p>
    </div>
);

const DetailRow = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
        <span className="text-xs font-bold text-zinc-500">{label}</span>
        <span className="text-sm font-black text-zinc-900 dark:text-white">{value}</span>
    </div>
);

const AssetListItem = ({ asset, onClick, privacyMode }: { asset: AssetPosition, onClick: () => void, privacyMode: boolean }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 group active:bg-zinc-50 dark:active:bg-zinc-900/50 transition-colors px-2">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black transition-colors shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'}`}>
                {asset.ticker.substring(0, 2)}
            </div>
            <div className="text-left">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h4>
                <p className="text-xs text-zinc-400 font-medium">{asset.quantity} cotas</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">{formatBRL((asset.currentPrice || 0) * asset.quantity, privacyMode)}</p>
            <div className={`text-xs font-bold ${(asset.dailyChange || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {(asset.dailyChange || 0) >= 0 ? '+' : ''}{(asset.dailyChange || 0).toFixed(2)}%
            </div>
        </div>
    </button>
);

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false, onAssetRefresh, headerVisible = true, targetAsset, onClearTarget }) => {
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

    const grouped = useMemo(() => {
        const fiis = filteredPortfolio.filter(p => p.assetType === AssetType.FII);
        const stocks = filteredPortfolio.filter(p => p.assetType === AssetType.STOCK);
        
        const sumTotal = (arr: AssetPosition[]) => arr.reduce((acc, p) => acc + (p.currentPrice || 0) * p.quantity, 0);
        
        return {
            fiis,
            stocks,
            fiiTotal: sumTotal(fiis),
            stockTotal: sumTotal(stocks)
        };
    }, [filteredPortfolio]);

    const selectedAsset = useMemo(() => portfolio.find(p => p.ticker === selectedTicker), [portfolio, selectedTicker]);

    const handleRefresh = async () => {
        if (selectedTicker && onAssetRefresh) {
            await onAssetRefresh(selectedTicker);
        }
    };

    return (
        <div className="min-h-screen pb-32">
            <div className={`sticky top-24 z-20 bg-[#F2F2F2] dark:bg-black py-2 transition-all duration-300 ${headerVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className="relative group bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
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
                        <div className="flex justify-between items-end mb-2 ml-2 mr-2">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fundos Imobiliários</h3>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg">
                                {formatBRL(grouped.fiiTotal, privacyMode)}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 px-4">
                            {grouped.fiis.map(asset => <AssetListItem key={asset.ticker} asset={asset} onClick={() => setSelectedTicker(asset.ticker)} privacyMode={privacyMode} />)}
                        </div>
                    </div>
                )}

                {grouped.stocks.length > 0 && (
                    <div>
                        <div className="flex justify-between items-end mb-2 ml-2 mr-2">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ações</h3>
                            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2 py-0.5 rounded-lg">
                                {formatBRL(grouped.stockTotal, privacyMode)}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 px-4">
                            {grouped.stocks.map(asset => <AssetListItem key={asset.ticker} asset={asset} onClick={() => setSelectedTicker(asset.ticker)} privacyMode={privacyMode} />)}
                        </div>
                    </div>
                )}
            </div>

            <SwipeableModal isOpen={!!selectedTicker} onClose={() => setSelectedTicker(null)}>
                {selectedAsset && (
                    <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
                        <div className="flex items-center justify-between pt-6 mb-6">
                            <div>
                                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{selectedAsset.ticker}</h2>
                                <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">{selectedAsset.segment}</p>
                            </div>
                            <button onClick={handleRefresh} className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <Activity className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <HighlightCard 
                                label="DY (12m)" 
                                value={displayVal(selectedAsset.dy_12m, '%')} 
                                icon={TrendingUp} 
                                color="bg-emerald-500" 
                            />
                            <HighlightCard 
                                label={selectedAsset.assetType === AssetType.FII ? "P/VP" : "P/L"} 
                                value={displayVal(selectedAsset.assetType === AssetType.FII ? selectedAsset.p_vp : selectedAsset.p_l)} 
                                icon={Activity} 
                                color="bg-blue-500" 
                            />
                            <HighlightCard 
                                label={selectedAsset.assetType === AssetType.FII ? "Vacância" : "ROE"} 
                                value={displayVal(selectedAsset.assetType === AssetType.FII ? selectedAsset.vacancy : selectedAsset.roe, '%')} 
                                icon={selectedAsset.assetType === AssetType.FII ? AlertCircle : BarChart3} 
                                color={selectedAsset.assetType === AssetType.FII ? "bg-amber-500" : "bg-purple-500"} 
                            />
                        </div>

                        <div className="bg-zinc-900 dark:bg-zinc-800 text-white p-5 rounded-[2rem] shadow-xl mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Sua Posição</span>
                                <Wallet className="w-5 h-5 opacity-50" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Total Investido</p>
                                    <p className="text-xl font-black">{formatBRL(selectedAsset.averagePrice * selectedAsset.quantity, privacyMode)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold opacity-60 uppercase mb-1">Valor Atual</p>
                                    <p className="text-xl font-black">{formatBRL((selectedAsset.currentPrice || 0) * selectedAsset.quantity, privacyMode)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Info className="w-3 h-3" /> Dados Fundamentalistas
                            </h3>
                            
                            <div className="space-y-1">
                                {selectedAsset.assetType === AssetType.FII ? (
                                    <>
                                        <DetailRow label="Último Rendimento" value={formatBRL(selectedAsset.last_dividend)} />
                                        <DetailRow label="Patrimônio Líquido" value={selectedAsset.assets_value || '---'} />
                                        <DetailRow label="Vacância Física" value={displayVal(selectedAsset.vacancy, '%')} />
                                        <DetailRow label="P/VP" value={displayVal(selectedAsset.p_vp)} />
                                        <DetailRow label="Nº Cotistas" value={selectedAsset.properties_count ? selectedAsset.properties_count.toLocaleString() : '---'} />
                                        <DetailRow label="Liquidez Diária" value={selectedAsset.liquidity ? `R$ ${parseInt(String(selectedAsset.liquidity)).toLocaleString()}` : '---'} />
                                    </>
                                ) : (
                                    <>
                                        <DetailRow label="P/L" value={displayVal(selectedAsset.p_l)} />
                                        <DetailRow label="P/VP" value={displayVal(selectedAsset.p_vp)} />
                                        <DetailRow label="ROE" value={displayVal(selectedAsset.roe, '%')} />
                                        <DetailRow label="Margem Líquida" value={displayVal(selectedAsset.net_margin, '%')} />
                                        <DetailRow label="Dív. Líq / EBITDA" value={displayVal(selectedAsset.net_debt_ebitda)} />
                                        <DetailRow label="CAGR Receitas (5a)" value={displayVal(selectedAsset.cagr_revenue, '%')} />
                                    </>
                                )}
                            </div>
                        </div>

                        <p className="text-[10px] text-center text-zinc-400">
                            Dados atualizados em: {selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleDateString() : '---'}
                        </p>
                    </div>
                )}
            </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
