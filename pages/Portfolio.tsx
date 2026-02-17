
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw, X, Calculator, Scale, Activity, BarChart3, PieChart, Coins, Target, AlertCircle, ChevronDown, ChevronUp, ExternalLink, ArrowRight, DollarSign, Percent, Briefcase, Building2, Users, FileText, MapPin } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';

// --- FORMATTERS ---

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatNumber = (val: number | undefined, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// --- SUB-COMPONENTS ---

// Card Pequeno para Grid
const DetailBox = ({ label, value, subValue, valueColor, icon: Icon }: any) => (
    <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700/50 flex flex-col justify-between h-full shadow-sm">
        <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
            {Icon && <Icon className="w-3 h-3 text-zinc-300" />}
        </div>
        <div>
            <div className={`text-sm font-black ${valueColor || 'text-zinc-900 dark:text-white'} leading-none tracking-tight`}>
                {value}
            </div>
            {subValue && <div className="text-[10px] font-medium text-zinc-500 mt-1">{subValue}</div>}
        </div>
    </div>
);

// Componente auxiliar para exibir métricas no modal
const MetricCard = ({ label, value, highlight = false, colorClass = "text-zinc-900 dark:text-white", subtext }: any) => (
    <div className={`p-3 rounded-xl border flex flex-col justify-center min-h-[64px] ${highlight ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'}`}>
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 truncate">{label}</span>
        <span className={`text-xs sm:text-sm font-black truncate ${colorClass}`}>{value}</span>
        {subtext && <span className="text-[9px] text-zinc-400 mt-0.5">{subtext}</span>}
    </div>
);

// Componente auxiliar para Cards de Valuation
const ValuationCard = ({ title, price, currentPrice, method, subtext, icon: Icon }: any) => {
    const isValid = price > 0 && price !== Infinity;
    const margin = isValid && currentPrice > 0 ? ((price - currentPrice) / currentPrice) * 100 : 0;
    const isSafe = margin > 0;
    
    return (
        <div className={`relative overflow-hidden p-4 rounded-2xl border flex flex-col justify-between min-h-[100px] ${!isValid ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700' : isSafe ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'}`}>
            <div>
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</span>
                    {Icon && <Icon className={`w-3.5 h-3.5 ${!isValid ? 'text-zinc-300' : isSafe ? 'text-emerald-500' : 'text-amber-500'}`} />}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-black tracking-tight ${!isValid ? 'text-zinc-300 dark:text-zinc-600' : isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {isValid ? formatBRL(price) : 'N/A'}
                    </span>
                </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 flex justify-between items-center">
                <span className="text-[9px] font-medium text-zinc-400 truncate max-w-[80px]">{method}</span>
                {isValid && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSafe ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}>
                        {margin > 0 ? `+${margin.toFixed(0)}% Upside` : `${margin.toFixed(0)}% Margem`}
                    </span>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE: LIST ITEM (REFORMULADO) ---
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
    const profitValue = (asset.currentPrice && asset.averagePrice) ? (asset.currentPrice - asset.averagePrice) * asset.quantity : 0;
    const profitPercent = asset.averagePrice > 0 ? ((asset.currentPrice || 0) / asset.averagePrice - 1) * 100 : 0;
    const isProfit = profitPercent >= 0;

    return (
        <div className={`mb-3 rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900/50 shadow-md ring-1 ring-indigo-500/10' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}`}>
            {/* Header Clicável */}
            <button 
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-transparent press-effect outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black tracking-wider shadow-sm transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.ticker}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{asset.quantity} Cotas</span>
                            {asset.dy_12m !== undefined && asset.dy_12m > 0 && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                    DY {asset.dy_12m.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col items-end">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">{formatBRL(totalVal, privacyMode)}</p>
                        
                        {asset.dailyChange !== undefined && (
                            <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {Math.abs(asset.dailyChange).toFixed(2)}%
                            </div>
                        )}
                    </div>
                    <div className={`w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-zinc-400'}`}>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                </div>
            </button>

            {/* Área Expandida - Layout Limpo e Tabular */}
            <div className={`transition-all duration-500 ease-out-mola overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0">
                    
                    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 overflow-hidden mb-3">
                        {/* Linha 1: Preços */}
                        <div className="flex border-b border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex-1 p-3 border-r border-zinc-100 dark:border-zinc-700/50">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Preço Médio</span>
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 block">{formatBRL(asset.averagePrice, privacyMode)}</span>
                            </div>
                            <div className="flex-1 p-3">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Preço Atual</span>
                                <span className="text-sm font-black text-zinc-900 dark:text-white block">{formatBRL(asset.currentPrice, privacyMode)}</span>
                            </div>
                        </div>
                        
                        {/* Linha 2: Retornos */}
                        <div className="flex">
                            <div className="flex-1 p-3 border-r border-zinc-100 dark:border-zinc-700/50">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Resultado (R$)</span>
                                <span className={`text-sm font-black block ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {profitValue > 0 ? '+' : ''}{formatBRL(profitValue, privacyMode)}
                                </span>
                            </div>
                            <div className="flex-1 p-3">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Variação (%)</span>
                                <span className={`text-sm font-black block ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Botão de Detalhes Completo */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenDetails(); }}
                        className="w-full h-10 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 press-effect border border-indigo-100 dark:border-indigo-900/30"
                    >
                        Ver Detalhes e Valuation <ArrowRight className="w-3.5 h-3.5" />
                    </button>

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
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [expandedAssetTicker, setExpandedAssetTicker] = useState<string | null>(null);

    const filtered = useMemo(() => {
        if (!search) return portfolio;
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    // Calcular totais para "% na Carteira"
    const totalPortfolioValue = useMemo(() => portfolio.reduce((acc, p) => acc + (p.quantity * (p.currentPrice || 0)), 0), [portfolio]);

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
        let ceilingMethod = 'Bazin (6%)';
        
        // 1. CÁLCULO PREÇO TETO (BAZIN - YIELD 6%)
        // Lógica conservadora: Para Ações, usa estritamente DY 12m. Para FIIs, aceita projeção mensal se DY faltar.
        let annualDividend = 0;
        
        if (selectedAsset.dy_12m && selectedAsset.dy_12m > 0 && currentPrice > 0) {
            // Cenário Ideal: Temos o Yield anual exato
            annualDividend = currentPrice * (selectedAsset.dy_12m / 100);
        } else if (selectedAsset.assetType === AssetType.FII && selectedAsset.last_dividend && selectedAsset.last_dividend > 0) {
            // Fallback seguro APENAS para FIIs (pagamento mensal recorrente)
            annualDividend = selectedAsset.last_dividend * 12;
            ceilingMethod = 'Bazin (Proj. Mensal)';
        } else {
             // Ações sem DY: Não projeta.
             annualDividend = 0; 
        }

        if (annualDividend > 0) {
            ceilingPrice = annualDividend / 0.06; 
        }

        // 2. CÁLCULO PREÇO JUSTO
        if (selectedAsset.assetType === AssetType.STOCK) {
            const lpa = selectedAsset.lpa || 0;
            const vpa = selectedAsset.vpa || 0;

            // Graham clássico: sqrt(22.5 * LPA * VPA)
            // Requer LPA e VPA positivos para fazer sentido matemático e fundamentalista
            if (lpa > 0 && vpa > 0) {
                fairPrice = Math.sqrt(22.5 * lpa * vpa);
                fairMethod = 'Graham (Clássico)';
            } else {
                 fairMethod = 'Graham (Inaplicável)';
            }
        } else {
            // FIIs: Valor Justo = Valor Patrimonial (VPA)
            const vpa = selectedAsset.vpa;
            const pvp = selectedAsset.p_vp;

            if (vpa && vpa > 0) {
                fairPrice = vpa;
                fairMethod = 'Valor Patrimonial';
            } else if (pvp && pvp > 0 && currentPrice > 0) {
                // Se VPA não veio direto, deriva do P/VP: VPA = Preço / (P/VP)
                fairPrice = currentPrice / pvp; 
                fairMethod = 'VP (Implícito)';
            } else {
                fairMethod = 'Valor Patrimonial';
            }
        }

        return {
            fairPrice,
            fairMethod,
            ceilingPrice,
            ceilingMethod,
            currentPrice
        };
    }, [selectedAsset]);

    // Dados Pessoais do Ativo Selecionado
    const personalData = useMemo(() => {
        if (!selectedAsset) return null;
        const totalInvested = selectedAsset.quantity * selectedAsset.averagePrice;
        const totalValue = selectedAsset.quantity * (selectedAsset.currentPrice || 0);
        const totalReturn = (totalValue - totalInvested) + (selectedAsset.totalDividends || 0);
        const yieldOnCost = totalInvested > 0 ? ((selectedAsset.totalDividends || 0) / totalInvested) * 100 : 0;
        const walletShare = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

        return { totalInvested, totalValue, totalReturn, yieldOnCost, walletShare };
    }, [selectedAsset, totalPortfolioValue]);

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
                    {selectedAsset && personalData && (
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                            
                            {/* 1. HEADER DO ATIVO */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center mx-auto mb-4 text-xl font-black text-zinc-500 dark:text-zinc-400 shadow-inner border border-zinc-200 dark:border-zinc-700">
                                    {selectedAsset.ticker.substring(0,2)}
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1 tracking-tight">{selectedAsset.ticker}</h2>
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{selectedAsset.segment}</p>
                            </div>

                            {/* 2. SUA POSIÇÃO (NOVO) */}
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Briefcase className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Sua Posição</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <DetailBox label="Total Investido" value={formatBRL(personalData.totalInvested, privacyMode)} icon={Wallet} />
                                    <DetailBox label="Valor de Mercado" value={formatBRL(personalData.totalValue, privacyMode)} icon={TrendingUp} valueColor="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <MetricCard label="Proventos" value={formatBRL(selectedAsset.totalDividends, privacyMode)} />
                                    <MetricCard label="Retorno Total" value={formatBRL(personalData.totalReturn, privacyMode)} colorClass={personalData.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                                    <MetricCard label="YoC" value={formatPercent(personalData.yieldOnCost)} highlight />
                                </div>
                                <div className="mt-3 flex justify-between items-center px-2">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Peso na Carteira</span>
                                    <span className="text-xs font-black text-zinc-900 dark:text-white">{personalData.walletShare.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div className="bg-zinc-900 dark:bg-white h-full rounded-full" style={{ width: `${Math.min(100, personalData.walletShare)}%` }}></div>
                                </div>
                            </div>
                            
                            {/* 3. VALUATION */}
                            {valuationData && (
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Scale className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Análise de Valor</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-left">
                                        <ValuationCard 
                                            title={selectedAsset.assetType === AssetType.FII ? "Valor Justo (VP)" : "Preço Justo (Graham)"}
                                            price={valuationData.fairPrice}
                                            currentPrice={valuationData.currentPrice}
                                            method={valuationData.fairMethod}
                                            icon={Scale}
                                        />
                                        <ValuationCard 
                                            title="Preço Teto"
                                            price={valuationData.ceilingPrice}
                                            currentPrice={valuationData.currentPrice}
                                            method={valuationData.ceilingMethod}
                                            icon={Target}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 4. FUNDAMENTOS (Dados Expandidos) */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest text-left flex items-center gap-2 mb-3 px-1">
                                    <Activity className="w-4 h-4 text-amber-500" /> Indicadores de Mercado
                                </h3>

                                {selectedAsset.assetType === AssetType.STOCK ? (
                                    <div className="grid grid-cols-3 gap-2 text-left">
                                        <MetricCard label="P/L" value={formatNumber(selectedAsset.p_l)} highlight />
                                        <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} />
                                        <MetricCard label="ROE" value={formatPercent(selectedAsset.roe)} highlight />
                                        <MetricCard label="Div.Líq/EBITDA" value={formatNumber(selectedAsset.net_debt_ebitda)} />
                                        <MetricCard label="Margem Líq." value={formatPercent(selectedAsset.net_margin)} />
                                        <MetricCard label="Payout" value={formatPercent(selectedAsset.payout)} />
                                        <MetricCard label="LPA" value={formatNumber(selectedAsset.lpa)} />
                                        <MetricCard label="VPA" value={formatNumber(selectedAsset.vpa)} />
                                        <MetricCard label="CAGR Rec. (5a)" value={formatPercent(selectedAsset.cagr_revenue)} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 text-left">
                                        <MetricCard label="DY (12m)" value={formatPercent(selectedAsset.dy_12m)} highlight colorClass="text-emerald-600 dark:text-emerald-400" />
                                        <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} highlight />
                                        <MetricCard label="Últ. Rendim." value={formatBRL(selectedAsset.last_dividend)} />
                                        <MetricCard label="Vacância" value={formatPercent(selectedAsset.vacancy)} colorClass={selectedAsset.vacancy && selectedAsset.vacancy > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'} />
                                        <MetricCard label="VP por Cota" value={formatNumber(selectedAsset.vpa)} />
                                        <MetricCard label="Nº Cotistas" value={formatNumber(selectedAsset.properties_count, 0)} />
                                    </div>
                                )}

                                {/* LISTA DE IMÓVEIS (FIIs de Tijolo) */}
                                {selectedAsset.properties && selectedAsset.properties.length > 0 && (
                                    <div className="mt-6">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <Building2 className="w-4 h-4 text-sky-500" />
                                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                                                Portfólio Imobiliário ({selectedAsset.properties.length})
                                            </h3>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {selectedAsset.properties.map((prop, idx) => (
                                                <div key={idx} className="p-3 flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 border border-zinc-100 dark:border-zinc-700">
                                                        <MapPin className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">{prop.name}</p>
                                                        <p className="text-[10px] text-zinc-500 mt-0.5">{prop.location}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Infos Gerais */}
                                <div className="space-y-2 mt-4">
                                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-left">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700/50">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Liquidez Diária</span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{selectedAsset.liquidity || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Valor de Mercado</span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{selectedAsset.market_cap || '-'}</span>
                                        </div>
                                    </div>
                                    
                                    {selectedAsset.assetType === AssetType.FII && selectedAsset.management_fee && (
                                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-left">
                                            <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Taxa de Administração</span>
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-tight">{selectedAsset.management_fee}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-[9px] text-zinc-400 text-center pt-6 opacity-60">
                                    Dados fornecidos por Investidor10. Podem conter atrasos.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
