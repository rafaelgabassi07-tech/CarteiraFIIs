import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw, X, Calculator, Scale, Activity, BarChart3, PieChart, Coins, Target, AlertCircle, ChevronDown, ChevronUp, ExternalLink, ArrowRight, DollarSign, Percent, Briefcase, Building2, Users, FileText, MapPin, Zap, Info, Clock, CheckCircle } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

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

// Componente para Informações Gerais (Lista)
const InfoRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="flex items-center gap-3">
            {Icon && <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"><Icon className="w-4 h-4" /></div>}
            <span className="text-xs font-medium text-zinc-500">{label}</span>
        </div>
        <span className="text-xs font-bold text-zinc-900 dark:text-white text-right max-w-[180px] break-words">{value || '-'}</span>
    </div>
);

const DetailedInfoBlock = ({ asset }: { asset: AssetPosition }) => {
    if (asset.assetType !== AssetType.FII) return null;
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-6">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-3 h-3" /> Informações sobre {asset.ticker}
            </h4>
            <InfoRow label="Razão Social" value={asset.company_name} icon={Building2} />
            <InfoRow label="CNPJ" value={asset.cnpj} icon={FileText} />
            <InfoRow label="Público-Alvo" value={asset.target_audience} icon={Users} />
            <InfoRow label="Mandato" value={asset.mandate} icon={Target} />
            <InfoRow label="Segmento" value={asset.segment_secondary || asset.segment} icon={PieChart} />
            <InfoRow label="Tipo de Fundo" value={asset.fund_type} icon={Briefcase} />
            <InfoRow label="Prazo de Duração" value={asset.duration} icon={Clock} />
            <InfoRow label="Tipo de Gestão" value={asset.manager_type} icon={Activity} />
            <InfoRow label="Taxa de Administração" value={asset.management_fee} icon={Percent} />
            <InfoRow label="Vacância" value={asset.vacancy ? `${asset.vacancy}%` : '-'} icon={AlertCircle} />
            <InfoRow label="Num. Cotistas" value={asset.properties_count ? formatNumber(asset.properties_count, 0) : '-'} icon={Users} />
            <InfoRow label="Cotas Emitidas" value={asset.num_quotas} icon={Coins} />
            <InfoRow label="Val. Patrimonial / Cota" value={asset.vpa ? formatNumber(asset.vpa) : '-'} icon={DollarSign} />
            <InfoRow label="Valor Patrimonial" value={asset.assets_value} icon={Wallet} />
            <InfoRow label="Último Rendimento" value={formatBRL(asset.last_dividend)} icon={DollarSign} />
        </div>
    );
};

// Componente Tabela de Rentabilidade
const ProfitabilityTable = ({ asset }: { asset: AssetPosition }) => {
    const rows = [
        { period: '1 Mês', nominal: asset.profitability_month, real: asset.profitability_real_month },
        { period: '3 Meses', nominal: asset.profitability_3m, real: asset.profitability_real_3m },
        { period: '1 Ano', nominal: asset.profitability_12m, real: asset.profitability_real_12m },
        { period: '2 Anos', nominal: asset.profitability_2y, real: asset.profitability_real_2y },
    ];

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-6">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rentabilidade Histórica</h4>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800">
                            <th className="text-left p-3 font-bold text-zinc-400">Período</th>
                            <th className="text-right p-3 font-bold text-zinc-400">Nominal</th>
                            <th className="text-right p-3 font-bold text-zinc-400">Real</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                <td className="p-3 font-medium text-zinc-500">{row.period}</td>
                                <td className={`p-3 text-right font-bold ${row.nominal && row.nominal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatPercent(row.nominal)}
                                </td>
                                <td className={`p-3 text-right font-bold ${row.real && row.real >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatPercent(row.real)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Componente de Barra de Comparação (Benchmark)
const BenchmarkBar = ({ label, value, color }: { label: string, value: number, color: string }) => {
    const width = Math.min(100, Math.max(5, (Math.abs(value) / 20) * 100));
    return (
        <div className="mb-2 last:mb-0">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase">{label}</span>
                <span className={`text-xs font-black ${value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {value > 0 ? '+' : ''}{value.toFixed(2)}%
                </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex items-center">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }}></div>
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
            <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-transparent press-effect outline-none">
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
            <div className={`transition-all duration-500 ease-out-mola overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0">
                    <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50 overflow-hidden mb-3">
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
                    <button onClick={(e) => { e.stopPropagation(); onOpenDetails(); }} className="w-full h-10 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 press-effect border border-indigo-100 dark:border-indigo-900/30">
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

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false, onAssetRefresh }) => {
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [expandedAssetTicker, setExpandedAssetTicker] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'RESUMO' | 'DADOS' | 'RENTABILIDADE' | 'PROVENTOS' | 'IMOVEIS'>('RESUMO');

    const filtered = useMemo(() => {
        if (!search) return portfolio;
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    const fiis = filtered.filter(p => p.assetType === AssetType.FII);
    const stocks = filtered.filter(p => p.assetType === AssetType.STOCK);

    const handleToggle = (ticker: string) => {
        setExpandedAssetTicker(prev => prev === ticker ? null : ticker);
    };

    const assetDividendChartData = useMemo(() => {
        if (!selectedAsset) return [];
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 11, 1); 
        
        const history = dividends
            .filter(d => d.ticker === selectedAsset.ticker && new Date(d.paymentDate || d.dateCom) >= start)
            .sort((a, b) => (a.paymentDate || a.dateCom).localeCompare(b.paymentDate || b.dateCom));

        const grouped: Record<string, number> = {};
        history.forEach(d => {
            const key = (d.paymentDate || d.dateCom).substring(0, 7); 
            grouped[key] = (grouped[key] || 0) + d.rate;
        });

        const result = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const key = d.toISOString().substring(0, 7);
            const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
            result.push({ month: monthLabel, fullDate: key, value: grouped[key] || 0 });
        }
        return result;
    }, [selectedAsset, dividends]);

    return (
        <div className="pb-32">
            {/* Sticky Search Header */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text" placeholder="Buscar ativo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>}
                </div>
            </div>

            {/* FIIs Section */}
            {fiis.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fundos Imobiliários</h3>
                        <InfoTooltip title="FIIs" text="Cotações com delay de ~15 minutos." />
                    </div>
                    {fiis.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} isExpanded={expandedAssetTicker === p.ticker} onToggle={() => handleToggle(p.ticker)} onOpenDetails={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}

            {/* Stocks Section */}
            {stocks.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ações</h3>
                        <InfoTooltip title="Ações" text="Cotações com delay de ~15 minutos." />
                    </div>
                    {stocks.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} isExpanded={expandedAssetTicker === p.ticker} onToggle={() => handleToggle(p.ticker)} onOpenDetails={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}
            
            {filtered.length === 0 && (
                <div className="text-center py-20 opacity-40 anim-fade-in">
                    <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum ativo encontrado</p>
                </div>
            )}

            {/* DETAILED MODAL */}
            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && (
                    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black">
                        {/* Header Fixo */}
                        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6 pb-4 shrink-0 rounded-t-[2.5rem]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-500 shadow-inner border border-zinc-200 dark:border-zinc-700">
                                        {selectedAsset.ticker.substring(0,2)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{selectedAsset.ticker}</h2>
                                        <p className="text-xs font-bold text-zinc-400 uppercase mt-1">{selectedAsset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.currentPrice, privacyMode)}</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${ (selectedAsset.dailyChange || 0) >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' }`}>
                                        {(selectedAsset.dailyChange || 0) > 0 ? '+' : ''}{(selectedAsset.dailyChange || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
                                {['RESUMO', 'DADOS', 'RENTABILIDADE', 'PROVENTOS', 'IMOVEIS'].map(tab => {
                                    if (tab === 'IMOVEIS' && (!selectedAsset.properties || selectedAsset.properties.length === 0)) return null;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                        >
                                            {tab}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 pb-24">
                            {activeTab === 'RESUMO' && (
                                <div className="space-y-6 anim-fade-in">
                                    {/* Indicadores Principais */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <MetricCard label="DY (12m)" value={formatPercent(selectedAsset.dy_12m)} highlight colorClass="text-emerald-600 dark:text-emerald-400" />
                                        <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} />
                                        <MetricCard label="Liquidez" value={selectedAsset.liquidity} />
                                    </div>

                                    {/* Check de Vacância */}
                                    {selectedAsset.vacancy !== undefined && (
                                        <div className={`p-4 rounded-xl border flex items-center justify-between ${selectedAsset.vacancy > 10 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedAsset.vacancy > 10 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {selectedAsset.vacancy > 10 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold ${selectedAsset.vacancy > 10 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>Vacância Física</p>
                                                    <p className="text-[10px] opacity-70">Média 12 meses</p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-black">{selectedAsset.vacancy}%</span>
                                        </div>
                                    )}

                                    {/* Infos Rápidas */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
                                        <InfoRow label="Segmento" value={selectedAsset.segment_secondary || selectedAsset.segment} icon={PieChart} />
                                        <InfoRow label="Último Rendimento" value={formatBRL(selectedAsset.last_dividend)} icon={DollarSign} />
                                        <InfoRow label="Valor Patrimonial" value={selectedAsset.assets_value} icon={Wallet} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'DADOS' && (
                                <div className="anim-fade-in">
                                    <DetailedInfoBlock asset={selectedAsset} />
                                    {/* Valuation para Ações */}
                                    {selectedAsset.assetType === AssetType.STOCK && (
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <MetricCard label="P/L" value={formatNumber(selectedAsset.p_l)} highlight />
                                            <MetricCard label="ROE" value={formatPercent(selectedAsset.roe)} highlight />
                                            <MetricCard label="Margem Líq." value={formatPercent(selectedAsset.net_margin)} />
                                            <MetricCard label="Dív.Líq/EBITDA" value={formatNumber(selectedAsset.net_debt_ebitda)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'RENTABILIDADE' && (
                                <div className="anim-fade-in space-y-6">
                                    <ProfitabilityTable asset={selectedAsset} />
                                    
                                    {/* Comparativo Benchmarks */}
                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Comparação 12 Meses</h4>
                                        <BenchmarkBar label={selectedAsset.ticker} value={selectedAsset.profitability_12m || 0} color="bg-indigo-500" />
                                        {selectedAsset.benchmark_cdi_12m && <BenchmarkBar label="CDI" value={selectedAsset.benchmark_cdi_12m} color="bg-zinc-300 dark:bg-zinc-600" />}
                                        {(selectedAsset.benchmark_ifix_12m || selectedAsset.benchmark_ibov_12m) && (
                                            <BenchmarkBar 
                                                label={selectedAsset.assetType === AssetType.FII ? 'IFIX' : 'IBOV'} 
                                                value={(selectedAsset.assetType === AssetType.FII ? selectedAsset.benchmark_ifix_12m : selectedAsset.benchmark_ibov_12m) || 0} 
                                                color="bg-zinc-400 dark:bg-zinc-500" 
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'PROVENTOS' && (
                                <div className="anim-fade-in">
                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase">Histórico (12 Meses)</h4>
                                        </div>
                                        <div className="h-40 w-full">
                                            {assetDividendChartData.some(d => d.value > 0) ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={assetDividendChartData}>
                                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} interval={0} />
                                                        <Tooltip 
                                                            cursor={{fill: 'transparent'}}
                                                            contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#18181b', color: '#fff', fontSize: '10px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                            formatter={(value: number) => [formatBRL(value), 'Valor']}
                                                            labelStyle={{ display: 'none' }}
                                                        />
                                                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                                    Sem histórico recente
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'IMOVEIS' && selectedAsset.properties && (
                                <div className="anim-fade-in space-y-3">
                                    {selectedAsset.properties.map((prop, idx) => (
                                        <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3 shadow-sm">
                                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{prop.name}</h4>
                                                <p className="text-xs text-zinc-500 mt-1">{prop.location}</p>
                                            </div>
                                        </div>
                                    ))}
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