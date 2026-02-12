
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, TrendingUp, ChevronRight, Wallet, Info, DollarSign, Activity, Percent, BarChart3, Building2, Coins, Scale } from 'lucide-react';
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

const formatPercent = (val: any) => {
    const num = typeof val === 'number' ? val : 0;
    return `${num.toFixed(2)}%`;
};

// Helper para verificar se existe valor numérico válido (incluindo 0)
const hasValue = (val: any) => val !== undefined && val !== null && !isNaN(val);

// FIX: Renamed 'icon' to 'Icon' to satisfy JSX/TypeScript requirements for components
const renderFundamentalItem = (label: string, value: any, Icon: React.ElementType, format: 'percent' | 'currency' | 'number' | 'text' = 'number', privacyMode = false, highlightCondition?: 'good' | 'bad' | 'neutral') => {
    if (!hasValue(value) && format !== 'text') return null;
    if (format === 'text' && !value) return null;

    let displayValue = value;
    if (format === 'percent') displayValue = `${Number(value).toFixed(2)}%`;
    else if (format === 'currency') displayValue = formatBRL(value, privacyMode);
    else if (format === 'number') displayValue = Number(value).toFixed(2);

    // Lógica de cores básica
    let colorClass = 'text-zinc-900 dark:text-white';
    if (highlightCondition === 'good') colorClass = 'text-emerald-500';
    if (highlightCondition === 'bad') colorClass = 'text-rose-500';

    return (
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="w-5 h-5 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors">
                    <Icon className="w-3 h-3" />
                </div>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide truncate">{label}</p>
            </div>
            <p className={`text-lg font-black tracking-tight ${colorClass} relative z-10`}>
                {displayValue}
            </p>
            {/* Background decoration */}
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-full blur-lg opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
        </div>
    );
};

// Componente de Item de Lista (Clean List Style)
const AssetListItem: React.FC<{ asset: AssetPosition, privacyMode?: boolean, onClick: () => void }> = ({ asset, privacyMode, onClick }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalValue = (asset.currentPrice || 0) * asset.quantity;
    
    return (
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

    // Render Helpers for Fundamentals
    const FundamentalCard = ({ label, value, icon: Icon, colorClass = "text-zinc-900 dark:text-white" }: any) => (
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between relative overflow-hidden group min-h-[90px]">
            <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide truncate">{label}</p>
            </div>
            <p className={`text-base font-black tracking-tight ${colorClass} relative z-10 break-words`}>
                {value}
            </p>
        </div>
    );

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
                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 px-4">
                            {grouped.fiis.map(asset => (
                                <AssetListItem key={asset.ticker} asset={asset} privacyMode={privacyMode} onClick={() => setSelectedTicker(asset.ticker)} />
                            ))}
                        </div>
                    </div>
                )}

                {grouped.stocks.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-2">Ações</h3>
                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 px-4">
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

            {/* Modal de Detalhes (Restaurado com Fundamentos Ricos) */}
            <SwipeableModal isOpen={!!selectedTicker} onClose={() => setSelectedTicker(null)}>
                {selectedAsset && (
                    <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
                        <div className="flex items-center justify-between pt-6 mb-8">
                            <div>
                                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{selectedAsset.ticker}</h2>
                                <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">{selectedAsset.segment}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL((selectedAsset.currentPrice || 0) * selectedAsset.quantity, privacyMode)}</p>
                                <p className={`text-sm font-bold ${(selectedAsset.dailyChange || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {(selectedAsset.dailyChange || 0) >= 0 ? '+' : ''}{selectedAsset.dailyChange?.toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Card de Preço & Custo */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Preço Médio</p>
                                <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.averagePrice, privacyMode)}</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Cotação</p>
                                <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.currentPrice || 0, privacyMode)}</p>
                            </div>
                        </div>

                        {/* Card de DY - Destaque */}
                        {hasValue(selectedAsset.dy_12m) && (
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-[2rem] shadow-xl shadow-emerald-500/20 mb-6 flex justify-between items-center relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Dividend Yield (12m)</p>
                                    <p className="text-4xl font-black tracking-tighter">{(selectedAsset.dy_12m || 0).toFixed(2)}%</p>
                                </div>
                                <TrendingUp className="w-12 h-12 opacity-30 relative z-10" />
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                            </div>
                        )}

                        {/* ================= FUNDAMENTOS ================= */}
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
                                <Info className="w-3 h-3" /> Fundamentos
                            </h3>

                            {/* Seção 1: Valuation */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {hasValue(selectedAsset.p_vp) && (
                                    <FundamentalCard 
                                        label="P/VP" 
                                        value={selectedAsset.p_vp?.toFixed(2)} 
                                        icon={Activity} 
                                        colorClass={(selectedAsset.p_vp || 0) < 1 ? 'text-emerald-500' : (selectedAsset.p_vp || 0) > 1.15 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}
                                    />
                                )}
                                {hasValue(selectedAsset.p_l) && (
                                    <FundamentalCard label="P/L" value={selectedAsset.p_l?.toFixed(1)} icon={DollarSign} />
                                )}
                                {hasValue(selectedAsset.ev_ebitda) && (
                                    <FundamentalCard label="EV/EBITDA" value={selectedAsset.ev_ebitda?.toFixed(1)} icon={Scale} />
                                )}
                                {hasValue(selectedAsset.vpa) && (
                                    <FundamentalCard label="VPA" value={formatBRL(selectedAsset.vpa, privacyMode)} icon={Building2} />
                                )}
                            </div>

                            {/* Seção 2: FII Específicos */}
                            {selectedAsset.assetType === AssetType.FII && (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {hasValue(selectedAsset.last_dividend) && (
                                        <FundamentalCard label="Último Rend." value={formatBRL(selectedAsset.last_dividend)} icon={Coins} />
                                    )}
                                    {hasValue(selectedAsset.vacancy) && (
                                        <FundamentalCard 
                                            label="Vacância Física" 
                                            value={`${selectedAsset.vacancy?.toFixed(1)}%`} 
                                            icon={Percent} 
                                            colorClass={(selectedAsset.vacancy || 0) > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}
                                        />
                                    )}
                                    {selectedAsset.assets_value && (
                                        <div className="col-span-2">
                                            <FundamentalCard label="Patrimônio Líquido" value={selectedAsset.assets_value} icon={Wallet} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Seção 3: Ações (Eficiência e Crescimento) */}
                            {selectedAsset.assetType === AssetType.STOCK && (
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {hasValue(selectedAsset.roe) && (
                                        <FundamentalCard label="ROE" value={`${selectedAsset.roe?.toFixed(1)}%`} icon={TrendingUp} colorClass="text-emerald-500" />
                                    )}
                                    {hasValue(selectedAsset.net_margin) && (
                                        <FundamentalCard label="Margem Líq." value={`${selectedAsset.net_margin?.toFixed(1)}%`} icon={BarChart3} />
                                    )}
                                    {hasValue(selectedAsset.cagr_revenue) && (
                                        <FundamentalCard label="CAGR Rec. (5a)" value={`${selectedAsset.cagr_revenue?.toFixed(1)}%`} icon={TrendingUp} />
                                    )}
                                    {hasValue(selectedAsset.net_debt_ebitda) && (
                                        <FundamentalCard label="Dív. Líq/EBITDA" value={selectedAsset.net_debt_ebitda?.toFixed(1)} icon={Scale} />
                                    )}
                                </div>
                            )}

                            {/* Liquidez (Geral) */}
                            {selectedAsset.liquidity && (
                                <div className="mt-3">
                                    <FundamentalCard 
                                        label="Liquidez Média Diária" 
                                        value={typeof selectedAsset.liquidity === 'number' ? `R$ ${(selectedAsset.liquidity / 1000).toFixed(0)}k` : selectedAsset.liquidity} 
                                        icon={Activity} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
