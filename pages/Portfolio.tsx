
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, TrendingUp, TrendingDown, X, Scale, Target, Activity, ChevronDown, ChevronUp, DollarSign, Building2, Briefcase } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number | undefined) => {
    if (val === undefined || val === null) return '-';
    return `${val.toFixed(2)}%`;
};

const formatNumber = (val: number | undefined, decimals = 2) => {
    if (val === undefined || val === null) return '-';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Componente para exibir Valuation dentro do Card Expandido
const ValuationBadge = ({ label, value, referenceValue, type }: { label: string, value: number, referenceValue: number, type: 'fair' | 'ceiling' }) => {
    if (!value || value <= 0) return null;
    
    const margin = ((value - referenceValue) / referenceValue) * 100;
    const isSafe = margin > 0;
    
    return (
        <div className={`flex flex-col p-3 rounded-xl border ${isSafe ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700'}`}>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className={`text-lg font-black tracking-tight ${isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {formatBRL(value)}
                </span>
            </div>
            <div className="mt-1">
                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSafe ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                    {margin > 0 ? `+${margin.toFixed(0)}% Upside` : `${margin.toFixed(0)}% Margem`}
                </span>
            </div>
        </div>
    );
};

interface AssetCardProps {
  asset: AssetPosition;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
  privacyMode: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, isExpanded, onToggle, onOpenDetails, privacyMode }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalVal = asset.quantity * (asset.currentPrice || 0);
    const profit = totalVal - (asset.quantity * asset.averagePrice);
    const profitPercent = asset.averagePrice > 0 ? (profit / (asset.quantity * asset.averagePrice)) * 100 : 0;

    // --- CÁLCULOS DE VALUATION ---
    const valuation = useMemo(() => {
        const current = asset.currentPrice || 0;
        let fairPrice = 0;
        let ceilingPrice = 0; // Bazin
        
        // Bazin (Preço Teto - Yield 6%)
        if (asset.dy_12m && asset.dy_12m > 0 && current > 0) {
            const annualDividend = current * (asset.dy_12m / 100);
            ceilingPrice = annualDividend / 0.06; 
        }

        // Preço Justo Específico
        if (asset.assetType === AssetType.STOCK) {
            // Graham
            if (asset.lpa && asset.vpa && asset.lpa > 0 && asset.vpa > 0) {
                fairPrice = Math.sqrt(22.5 * asset.lpa * asset.vpa);
            }
        } else {
            // FII - VP como Justo
            if (asset.p_vp && asset.p_vp > 0 && current > 0) {
                fairPrice = current / asset.p_vp;
            }
        }

        return { fairPrice, ceilingPrice, current };
    }, [asset]);

    return (
        <div className={`mb-3 rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-200 dark:border-indigo-900/50 shadow-lg shadow-indigo-500/5' : 'border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}`}>
            {/* Header do Card (Sempre Visível) */}
            <button onClick={onToggle} className="w-full flex items-center justify-between p-4 press-effect outline-none">
                <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black tracking-wider shadow-sm transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-none">{asset.ticker}</h4>
                            {isExpanded && <span className="text-[9px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">{asset.assetType}</span>}
                        </div>
                        <p className="text-[11px] font-medium text-zinc-400 mt-1">
                            {asset.quantity} cotas <span className="mx-1">·</span> PM {formatBRL(asset.averagePrice, privacyMode)}
                        </p>
                    </div>
                </div>
                
                <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">{formatBRL(totalVal, privacyMode)}</p>
                    <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(asset.dailyChange || 0).toFixed(2)}%
                    </div>
                </div>
            </button>

            {/* Conteúdo Expandido */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/50 anim-slide-up">
                    
                    {/* Linha de Resultado */}
                    <div className="flex justify-between items-center py-3">
                        <span className="text-xs font-bold text-zinc-500">Rentabilidade Total</span>
                        <div className={`text-xs font-black px-2 py-1 rounded-lg ${profit >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                            {profit >= 0 ? '+' : ''}{formatBRL(profit, privacyMode)} ({profitPercent.toFixed(2)}%)
                        </div>
                    </div>

                    {/* Grid de Valuation */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <ValuationBadge 
                            label={asset.assetType === AssetType.FII ? "Valor Patrimonial (Justo)" : "Preço Justo (Graham)"}
                            value={valuation.fairPrice}
                            referenceValue={valuation.current}
                            type="fair"
                        />
                        <ValuationBadge 
                            label="Preço Teto (Bazin 6%)"
                            value={valuation.ceilingPrice}
                            referenceValue={valuation.current}
                            type="ceiling"
                        />
                    </div>

                    {/* Indicadores Rápidos */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 grid grid-cols-3 gap-y-3 gap-x-2 text-center mb-4">
                        <div>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase">DY (12m)</p>
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatPercent(asset.dy_12m)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase">P/VP</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-white">{formatNumber(asset.p_vp)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase">{asset.assetType === AssetType.FII ? 'Vacância' : 'P/L'}</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-white">
                                {asset.assetType === AssetType.FII ? formatPercent(asset.vacancy) : formatNumber(asset.p_l)}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onOpenDetails}
                        className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-widest press-effect shadow-md"
                    >
                        Ver Detalhes Completos
                    </button>
                </div>
            )}
        </div>
    );
};

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
  privacyMode?: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
  headerVisible?: boolean;
  targetAsset?: string | null;
  onClearTarget?: () => void;
}

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false, targetAsset, onClearTarget }) => {
    const [search, setSearch] = useState('');
    const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
    const [detailsAsset, setDetailsAsset] = useState<AssetPosition | null>(null);

    // Auto-expand target asset from navigation
    React.useEffect(() => {
        if (targetAsset) {
            setSearch(targetAsset); // Optional: filter by it
            setExpandedAsset(targetAsset);
            // Scroll to it logic could be added here
            onClearTarget?.();
        }
    }, [targetAsset, onClearTarget]);

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
                        placeholder="Buscar ativo na carteira..." 
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
                <div className="mb-8 anim-fade-in">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Fundos Imobiliários</h3>
                    </div>
                    {fiis.map(p => (
                        <AssetCard 
                            key={p.ticker} 
                            asset={p} 
                            isExpanded={expandedAsset === p.ticker}
                            onToggle={() => setExpandedAsset(prev => prev === p.ticker ? null : p.ticker)}
                            onOpenDetails={() => setDetailsAsset(p)}
                            privacyMode={privacyMode} 
                        />
                    ))}
                </div>
            )}

            {/* Stocks Section */}
            {stocks.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Briefcase className="w-4 h-4 text-sky-500" />
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Ações</h3>
                    </div>
                    {stocks.map(p => (
                        <AssetCard 
                            key={p.ticker} 
                            asset={p} 
                            isExpanded={expandedAsset === p.ticker}
                            onToggle={() => setExpandedAsset(prev => prev === p.ticker ? null : p.ticker)}
                            onOpenDetails={() => setDetailsAsset(p)}
                            privacyMode={privacyMode} 
                        />
                    ))}
                </div>
            )}
            
            {filtered.length === 0 && (
                <div className="text-center py-20 opacity-40 anim-fade-in">
                    <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum ativo encontrado</p>
                </div>
            )}

            {/* Modal de Detalhes (Ainda acessível, mas secundário) */}
            <SwipeableModal isOpen={!!detailsAsset} onClose={() => setDetailsAsset(null)}>
                <div className="p-6 h-full flex flex-col">
                    {detailsAsset && (
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                            <div className="text-center">
                                {/* Cabeçalho do Modal Simplificado */}
                                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-400 shadow-inner mx-auto mb-4">
                                    {detailsAsset.ticker.substring(0,2)}
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-none mb-1">{detailsAsset.ticker}</h2>
                                <p className="text-sm font-medium text-zinc-500 mb-6">{detailsAsset.segment}</p>
                                
                                {/* 3. FUNDAMENTOS COMPLETOS */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-3 text-left">
                                         <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Médio</p>
                                            <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatBRL(detailsAsset.averagePrice, privacyMode)}</p>
                                        </div>
                                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Investido</p>
                                            <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatBRL(detailsAsset.averagePrice * detailsAsset.quantity, privacyMode)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-left flex items-center gap-2 mb-3">
                                            <Activity className="w-3 h-3" /> Indicadores Fundamentalistas
                                        </h3>

                                        <div className="grid grid-cols-3 gap-2 text-left">
                                            {detailsAsset.assetType === AssetType.STOCK ? (
                                                <>
                                                    <MetricCard label="P/L" value={formatNumber(detailsAsset.p_l)} highlight />
                                                    <MetricCard label="P/VP" value={formatNumber(detailsAsset.p_vp)} />
                                                    <MetricCard label="ROE" value={formatPercent(detailsAsset.roe)} highlight />
                                                    <MetricCard label="Div.Líq/EBITDA" value={formatNumber(detailsAsset.net_debt_ebitda)} />
                                                    <MetricCard label="Margem Líq." value={formatPercent(detailsAsset.net_margin)} />
                                                    <MetricCard label="CAGR Lucros" value={formatPercent(detailsAsset.cagr_profits)} />
                                                </>
                                            ) : (
                                                <>
                                                    <MetricCard label="DY (12m)" value={formatPercent(detailsAsset.dy_12m)} highlight colorClass="text-emerald-600 dark:text-emerald-400" />
                                                    <MetricCard label="P/VP" value={formatNumber(detailsAsset.p_vp)} highlight />
                                                    <MetricCard label="Últ. Rendimento" value={formatBRL(detailsAsset.last_dividend)} />
                                                    <MetricCard label="Vacância" value={formatPercent(detailsAsset.vacancy)} colorClass={detailsAsset.vacancy && detailsAsset.vacancy > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'} />
                                                    <MetricCard label="Val. Patrimonial" value={detailsAsset.assets_value || '-'} />
                                                    <MetricCard label="Nº Cotistas" value={formatNumber(detailsAsset.properties_count, 0)} />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Infos Gerais */}
                                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-left">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Liquidez Diária</span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{detailsAsset.liquidity || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Valor de Mercado</span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{detailsAsset.market_cap || '-'}</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[9px] text-zinc-400 text-center pt-4 opacity-60">
                                        *Preço Justo de Ações baseado em Graham. FIIs baseado em VP.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </SwipeableModal>
        </div>
    );
};

// Componente auxiliar para exibir métricas no modal
const MetricCard = ({ label, value, highlight = false, colorClass = "text-zinc-900 dark:text-white" }: any) => (
    <div className={`p-3 rounded-xl border flex flex-col justify-center ${highlight ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'}`}>
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 truncate">{label}</span>
        <span className={`text-sm font-black truncate ${colorClass}`}>{value}</span>
    </div>
);

export const Portfolio = React.memo(PortfolioComponent);
