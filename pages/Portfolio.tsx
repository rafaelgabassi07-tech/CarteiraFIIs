
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw, X, Calculator, Scale, Activity, BarChart3, PieChart, Coins } from 'lucide-react';
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

    // --- LÓGICA DE VALUATION (GRAHAM) ---
    const valuationData = useMemo(() => {
        if (!selectedAsset) return null;

        const currentPrice = selectedAsset.currentPrice || 0;

        // AÇÕES: Fórmula de Graham (Raiz de 22.5 * LPA * VPA)
        if (selectedAsset.assetType === AssetType.STOCK) {
            const lpa = selectedAsset.lpa;
            const vpa = selectedAsset.vpa;

            if (lpa && vpa && lpa > 0 && vpa > 0) {
                const grahamPrice = Math.sqrt(22.5 * lpa * vpa);
                const upside = ((grahamPrice - currentPrice) / currentPrice) * 100;
                
                return {
                    method: 'Graham',
                    fairPrice: grahamPrice,
                    upside: upside,
                    details: { LPA: lpa, VPA: vpa, Constant: 22.5 }
                };
            }
        }
        
        // FIIs: Valor Patrimonial (P/VP) como referência
        if (selectedAsset.assetType === AssetType.FII) {
            const pvp = selectedAsset.p_vp;
            // Se temos P/VP e Preço, podemos deduzir o VP (Valor Justo Teórico para FIIs de Papel/Indefinidos)
            if (pvp && pvp > 0 && currentPrice > 0) {
                const fairPriceVP = currentPrice / pvp; // VP = P / (P/VP)
                const upside = ((fairPriceVP - currentPrice) / currentPrice) * 100;

                return {
                    method: 'Valor Patrimonial',
                    fairPrice: fairPriceVP,
                    upside: upside,
                    details: { 'P/VP': pvp, 'VP/Cota': fairPriceVP }
                };
            }
        }

        return null;
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
                                {/* Header do Ativo */}
                                <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6 text-2xl font-black text-zinc-400 shadow-inner">
                                    {selectedAsset.ticker.substring(0,2)}
                                </div>
                                <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-1 tracking-tight">{selectedAsset.ticker}</h2>
                                <p className="text-sm font-medium text-zinc-500">{selectedAsset.segment}</p>
                                
                                {/* 1. VALUATION CARD (GRAHAM / VP) */}
                                {valuationData && (
                                    <div className="mt-6 mb-4 p-5 rounded-[2rem] bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden text-left">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Scale className="w-16 h-16" />
                                        </div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Preço Justo ({valuationData.method})</p>
                                                    <p className="text-3xl font-black tracking-tight">{formatBRL(valuationData.fairPrice)}</p>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 flex flex-col items-center ${valuationData.upside > 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                                                    <span className="text-[9px] font-bold uppercase">Potencial</span>
                                                    <span className="text-sm font-black">{valuationData.upside > 0 ? '+' : ''}{valuationData.upside.toFixed(1)}%</span>
                                                </div>
                                            </div>

                                            {/* Dados de Entrada */}
                                            <div className="flex gap-4 pt-4 border-t border-white/10">
                                                {Object.entries(valuationData.details).map(([key, val]) => (
                                                    typeof val === 'number' && key !== 'Constant' && (
                                                        <div key={key}>
                                                            <p className="text-[9px] font-bold opacity-70 uppercase">{key}</p>
                                                            <p className="text-sm font-bold">{key.includes('P/VP') ? val.toFixed(2) : formatBRL(val)}</p>
                                                        </div>
                                                    )
                                                ))}
                                                {selectedAsset.assetType === AssetType.STOCK && (
                                                    <div className="ml-auto flex items-end">
                                                        <p className="text-[8px] opacity-60 max-w-[120px] text-right leading-tight">
                                                            Fórmula de Benjamin Graham: <br/> √(22.5 x LPA x VPA)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
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
