
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw, X, Calculator, Scale, Activity, BarChart3, PieChart, Coins, Target, AlertCircle, ChevronDown, ChevronUp, ExternalLink, ArrowRight } from 'lucide-react';
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

// Componente auxiliar para exibir métricas no modal
const MetricCard = ({ label, value, highlight = false, colorClass = "text-zinc-900 dark:text-white" }: any) => (
    <div className={`p-3 rounded-xl border flex flex-col justify-center ${highlight ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'}`}>
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 truncate">{label}</span>
        <span className={`text-sm font-black truncate ${colorClass}`}>{value}</span>
    </div>
);

// Componente auxiliar para Cards de Valuation
const ValuationCard = ({ title, price, currentPrice, method, subtext, icon: Icon }: any) => {
    const isValid = price > 0;
    const margin = isValid && currentPrice > 0 ? ((price - currentPrice) / currentPrice) * 100 : 0;
    const isSafe = margin > 0;
    
    return (
        <div className={`relative overflow-hidden p-4 rounded-2xl border flex flex-col justify-between min-h-[110px] ${!isValid ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700' : isSafe ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'}`}>
            <div>
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</span>
                    {Icon && <Icon className={`w-3.5 h-3.5 ${!isValid ? 'text-zinc-300' : isSafe ? 'text-emerald-500' : 'text-amber-500'}`} />}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black tracking-tight ${!isValid ? 'text-zinc-300 dark:text-zinc-600' : isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {isValid ? formatBRL(price) : 'N/A'}
                    </span>
                </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 flex justify-between items-center">
                <span className="text-[9px] font-medium text-zinc-400 truncate max-w-[80px]">{method}</span>
                {isValid && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSafe ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                        {margin > 0 ? `+${margin.toFixed(0)}% Potencial` : `${margin.toFixed(0)}% Margem`}
                    </span>
                )}
            </div>
        </div>
    );
};

// --- NOVO COMPONENTE: ASSET LIST ITEM (EXPANSÍVEL) ---
interface AssetListItemProps {
  asset: AssetPosition;
  onOpenDetails: () => void;
  privacyMode: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const AssetListItem: React.FC<AssetListItemProps> = ({ asset, onOpenDetails, privacyMode, isExpanded, onToggle }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalVal = asset.quantity * (asset.currentPrice || 0);
    const profitPercent = asset.averagePrice > 0 ? ((asset.currentPrice || 0) / asset.averagePrice - 1) * 100 : 0;
    const isProfit = profitPercent >= 0;

    // Mini Calculo de Valuation para o Quick View
    const valuationStatus = useMemo(() => {
        const current = asset.currentPrice || 0;
        if (current <= 0) return null;
        
        let target = 0;
        let method = '';
        
        // Simples verificação rápida (VP para FIIs, Graham para Ações)
        if (asset.assetType === AssetType.FII) {
             target = asset.vpa || 0;
             method = 'VP';
        } else {
             if (asset.lpa > 0 && asset.vpa > 0) target = Math.sqrt(22.5 * asset.lpa * asset.vpa);
             method = 'Graham';
        }

        if (target <= 0) return null;
        const upside = ((target - current) / current) * 100;
        return { upside, method };
    }, [asset]);

    return (
        <div className="mb-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-none overflow-hidden transition-all duration-300">
            {/* Header Clicável */}
            <button 
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-transparent press-effect"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black tracking-wider shadow-sm transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.ticker}</h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">{asset.quantity} Cotas</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col items-end">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">{formatBRL(totalVal, privacyMode)}</p>
                        
                        {asset.dailyChange !== undefined && (
                            <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {Math.abs(asset.dailyChange).toFixed(2)}%
                            </div>
                        )}
                    </div>
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4 text-zinc-300" />
                    </div>
                </div>
            </button>

            {/* Área Expandida (Quick View) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800">
                    
                    {/* Linha 1: Comparativo Preço */}
                    <div className="flex items-center justify-between mb-3 mt-3">
                        <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Preço Médio</span>
                             <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{formatBRL(asset.averagePrice, privacyMode)}</span>
                        </div>
                        
                        {/* Barra de Progresso Lucro/Prejuízo */}
                        <div className="flex-1 mx-4 flex flex-col items-center">
                             <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden relative">
                                <div 
                                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(100, Math.abs(profitPercent))}%`, left: isProfit ? '0' : 'auto', right: isProfit ? 'auto' : '0' }} // Simplificação visual
                                ></div>
                             </div>
                             <span className={`text-[9px] font-bold mt-1 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {isProfit ? '+' : ''}{profitPercent.toFixed(2)}%
                             </span>
                        </div>

                        <div className="flex flex-col items-end">
                             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Atual</span>
                             <span className="text-xs font-bold text-zinc-900 dark:text-white">{formatBRL(asset.currentPrice, privacyMode)}</span>
                        </div>
                    </div>

                    {/* Linha 2: Indicadores Rápidos e Ação */}
                    <div className="flex items-center gap-3">
                        {valuationStatus && (
                            <div className={`flex-1 p-2 rounded-xl border flex items-center justify-between ${valuationStatus.upside > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'}`}>
                                <div className="flex items-center gap-2">
                                    <Scale className={`w-3.5 h-3.5 ${valuationStatus.upside > 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{valuationStatus.method}</span>
                                </div>
                                <span className={`text-xs font-black ${valuationStatus.upside > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {valuationStatus.upside > 0 ? `+${valuationStatus.upside.toFixed(0)}%` : `${valuationStatus.upside.toFixed(0)}%`}
                                </span>
                            </div>
                        )}
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenDetails(); }}
                            className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 press-effect shadow-sm"
                        >
                            Ver Detalhes <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                </div>
            </div>
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

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false }) => {
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null); // Para o Modal
    const [expandedAssetTicker, setExpandedAssetTicker] = useState<string | null>(null); // Para o Accordion

    const filtered = useMemo(() => {
        if (!search) return portfolio;
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    const fiis = filtered.filter(p => p.assetType === AssetType.FII);
    const stocks = filtered.filter(p => p.assetType === AssetType.STOCK);

    const handleToggle = (ticker: string) => {
        setExpandedAssetTicker(prev => prev === ticker ? null : ticker);
    };

    // --- LÓGICA DE VALUATION APRIMORADA ---
    const valuationData = useMemo(() => {
        if (!selectedAsset) return null;

        const currentPrice = selectedAsset.currentPrice || 0;
        let fairPrice = 0;
        let fairMethod = '';
        
        let ceilingPrice = 0; // Bazin
        
        // 1. CÁLCULO PREÇO TETO (BAZIN - YIELD 6%)
        let annualDividend = 0;
        
        if (selectedAsset.dy_12m && selectedAsset.dy_12m > 0 && currentPrice > 0) {
            annualDividend = currentPrice * (selectedAsset.dy_12m / 100);
        } else if (selectedAsset.assetType === AssetType.FII && selectedAsset.last_dividend) {
            annualDividend = selectedAsset.last_dividend * 12;
        }

        if (annualDividend > 0) {
            ceilingPrice = annualDividend / 0.06; 
        }

        // 2. CÁLCULO PREÇO JUSTO
        if (selectedAsset.assetType === AssetType.STOCK) {
            const lpa = selectedAsset.lpa;
            const vpa = selectedAsset.vpa;

            if (lpa && vpa && lpa > 0 && vpa > 0) {
                fairPrice = Math.sqrt(22.5 * lpa * vpa);
                fairMethod = 'Graham';
            } else {
                 fairMethod = 'Inaplicável (LPA/VPA < 0)';
            }
        } else {
            if (selectedAsset.vpa && selectedAsset.vpa > 0) {
                fairPrice = selectedAsset.vpa;
                fairMethod = 'V. Patrimonial';
            } else if (selectedAsset.p_vp && selectedAsset.p_vp > 0 && currentPrice > 0) {
                fairPrice = currentPrice / selectedAsset.p_vp; 
                fairMethod = 'V. Patrimonial (Est.)';
            }
        }

        return {
            fairPrice,
            fairMethod,
            ceilingPrice,
            currentPrice
        };
    }, [selectedAsset]);

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
                        onChange={e => setSearch.bind(null, e.target.value)()}
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
                        <AssetListItem 
                            key={p.ticker} 
                            asset={p} 
                            privacyMode={privacyMode} 
                            isExpanded={expandedAssetTicker === p.ticker}
                            onToggle={() => handleToggle(p.ticker)}
                            onOpenDetails={() => setSelectedAsset(p)} 
                        />
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
                        <AssetListItem 
                            key={p.ticker} 
                            asset={p} 
                            privacyMode={privacyMode} 
                            isExpanded={expandedAssetTicker === p.ticker}
                            onToggle={() => handleToggle(p.ticker)}
                            onOpenDetails={() => setSelectedAsset(p)}
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

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                <div className="p-6 h-full flex flex-col">
                    {selectedAsset && (
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                            <div className="text-center">
                                {/* Header do Ativo */}
                                <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6 text-2xl font-black text-zinc-400 shadow-inner">
                                    {selectedAsset.ticker.substring(0,2)}
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1 tracking-tight">{selectedAsset.ticker}</h2>
                                <p className="text-sm font-medium text-zinc-500">{selectedAsset.segment}</p>
                                
                                {/* 1. VALUATION CONTAINER (GRAHAM vs BAZIN vs VP) */}
                                {valuationData && (
                                    <div className="mt-6 mb-6">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <Scale className="w-4 h-4 text-indigo-500" />
                                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Análise de Valor</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 text-left">
                                            {/* Card Preço Justo (Graham ou VP) */}
                                            <ValuationCard 
                                                title={selectedAsset.assetType === AssetType.FII ? "Valor Patrimonial" : "Preço Justo"}
                                                price={valuationData.fairPrice}
                                                currentPrice={valuationData.currentPrice}
                                                method={valuationData.fairMethod}
                                                icon={Scale}
                                            />

                                            {/* Card Preço Teto (Bazin) */}
                                            <ValuationCard 
                                                title="Preço Teto"
                                                price={valuationData.ceilingPrice}
                                                currentPrice={valuationData.currentPrice}
                                                method="Bazin (6% Yield)"
                                                icon={Target}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 2. PREÇOS (Cards Grandes) */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 text-left">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Médio</p>
                                        <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatBRL(selectedAsset.averagePrice, privacyMode)}</p>
                                    </div>
                                    <div className="p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 text-left">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Atual</p>
                                        <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatBRL(selectedAsset.currentPrice, privacyMode)}</p>
                                    </div>
                                </div>

                                {/* 3. FUNDAMENTOS (Grids Específicos) */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-left flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Indicadores Fundamentalistas
                                    </h3>

                                    {selectedAsset.assetType === AssetType.STOCK ? (
                                        <div className="grid grid-cols-3 gap-2 text-left">
                                            <MetricCard label="P/L" value={formatNumber(selectedAsset.p_l)} highlight />
                                            <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} />
                                            <MetricCard label="ROE" value={formatPercent(selectedAsset.roe)} highlight />
                                            <MetricCard label="Div.Líq/EBITDA" value={formatNumber(selectedAsset.net_debt_ebitda)} />
                                            <MetricCard label="Margem Líq." value={formatPercent(selectedAsset.net_margin)} />
                                            <MetricCard label="CAGR Lucros" value={formatPercent(selectedAsset.cagr_profits)} />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 text-left">
                                            <MetricCard label="DY (12m)" value={formatPercent(selectedAsset.dy_12m)} highlight colorClass="text-emerald-600 dark:text-emerald-400" />
                                            <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} highlight />
                                            <MetricCard label="Últ. Rendimento" value={formatBRL(selectedAsset.last_dividend)} />
                                            <MetricCard label="Vacância" value={formatPercent(selectedAsset.vacancy)} colorClass={selectedAsset.vacancy && selectedAsset.vacancy > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'} />
                                            <MetricCard label="Val. Patrimonial" value={selectedAsset.assets_value || '-'} />
                                            <MetricCard label="Nº Cotistas" value={formatNumber(selectedAsset.properties_count, 0)} />
                                        </div>
                                    )}

                                    {/* Infos Gerais */}
                                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-left">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Liquidez Diária</span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{selectedAsset.liquidity || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Valor de Mercado</span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{selectedAsset.market_cap || '-'}</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[9px] text-zinc-400 text-center pt-4 opacity-60">
                                        Dados fornecidos por Investidor10. Podem haver atrasos.
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

export const Portfolio = React.memo(PortfolioComponent);
