
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, RefreshCw, X, Calculator, Scale, Activity, BarChart3, PieChart, Coins, Target, AlertCircle, ChevronDown, ChevronUp, ExternalLink, ArrowRight, DollarSign, Percent, Briefcase, Building2, Users, FileText, MapPin, Zap, Info, Clock, CheckCircle, BarChart4, Trophy, Hourglass, Goal, CalendarCheck, Filter } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, ComposedChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

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

const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return `${day}/${month}/${year.slice(2)}`;
    } catch { return dateStr; }
};

// --- SUB-COMPONENTS ---

const MetricCard = ({ label, value, highlight = false, colorClass = "text-zinc-900 dark:text-white", subtext }: any) => (
    <div className={`p-3 rounded-xl border flex flex-col justify-center min-h-[68px] ${highlight ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'}`}>
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 truncate">{label}</span>
        <span className={`text-sm font-black truncate ${colorClass}`}>{value}</span>
        {subtext && <span className="text-[9px] text-zinc-400 mt-0.5">{subtext}</span>}
    </div>
);

// Componente de Valuation (Design Refinado para Resumo)
const ValuationCard = ({ asset }: { asset: AssetPosition }) => {
    let fairPrice = 0;
    let label = '';
    let method = '';

    // Lógica de Preço Justo
    if (asset.assetType === AssetType.FII) {
        if (asset.vpa && asset.vpa > 0) {
            fairPrice = asset.vpa;
            label = 'Preço Justo (VPA)';
            method = 'Baseado no Valor Patrimonial';
        }
    } else {
        if (asset.lpa && asset.lpa > 0 && asset.vpa && asset.vpa > 0) {
            fairPrice = Math.sqrt(22.5 * asset.lpa * asset.vpa);
            label = 'Preço Justo (Graham)';
            method = 'Fórmula de Benjamin Graham';
        }
    }

    if (!fairPrice || fairPrice <= 0) return null;

    const upside = asset.currentPrice ? ((fairPrice - asset.currentPrice) / asset.currentPrice) * 100 : 0;
    const isUndervalued = upside > 0;

    return (
        <div className="mb-6">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Calculator className="w-3 h-3" /> Valuation
            </h4>
            <div className={`p-4 rounded-2xl border flex justify-between items-center relative overflow-hidden ${isUndervalued ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'}`}>
                <div className="relative z-10">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isUndervalued ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL(fairPrice)}</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium opacity-80">{method}</span>
                </div>
                <div className="text-right relative z-10">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Potencial</p>
                    <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black ${isUndervalued ? 'bg-white/60 dark:bg-black/20 text-emerald-600 dark:text-emerald-400' : 'bg-white/60 dark:bg-black/20 text-amber-600 dark:text-amber-400'}`}>
                        {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

const InfoRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="flex items-center gap-3">
            {Icon && <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"><Icon className="w-4 h-4" /></div>}
            <span className="text-xs font-medium text-zinc-500">{label}</span>
        </div>
        <span className="text-xs font-bold text-zinc-900 dark:text-white text-right max-w-[180px] break-words leading-tight">{value || '-'}</span>
    </div>
);

const DetailedInfoBlock = ({ asset }: { asset: AssetPosition }) => {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-6">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-3 h-3" /> Informações Detalhadas
            </h4>
            
            {/* Informações Comuns */}
            <InfoRow label="Razão Social" value={asset.company_name} icon={Building2} />
            <InfoRow label="CNPJ" value={asset.cnpj} icon={FileText} />
            <InfoRow label="Segmento" value={asset.segment_secondary || asset.segment} icon={PieChart} />
            
            {/* Específico FIIs */}
            {asset.assetType === AssetType.FII && (
                <>
                    <InfoRow label="Público-Alvo" value={asset.target_audience} icon={Users} />
                    <InfoRow label="Mandato" value={asset.mandate} icon={Target} />
                    <InfoRow label="Tipo de Fundo" value={asset.fund_type} icon={Briefcase} />
                    <InfoRow label="Prazo" value={asset.duration} icon={Clock} />
                    <InfoRow label="Gestão" value={asset.manager_type} icon={Activity} />
                    <InfoRow label="Taxa Adm." value={asset.management_fee} icon={Percent} />
                    <InfoRow label="Vacância Física" value={asset.vacancy !== undefined ? `${asset.vacancy}%` : '-'} icon={AlertCircle} />
                    <InfoRow label="Num. Cotistas" value={asset.properties_count ? formatNumber(asset.properties_count, 0) : '-'} icon={Users} />
                    <InfoRow label="Num. Cotas" value={asset.num_quotas} icon={Coins} />
                    <InfoRow label="Patrimônio Líq." value={asset.assets_value} icon={Wallet} />
                </>
            )}

            {/* Específico Ações */}
            {asset.assetType === AssetType.STOCK && (
                <>
                    <InfoRow label="Valor de Mercado" value={asset.market_cap} icon={Wallet} />
                    <InfoRow label="Liquidez Diária" value={asset.liquidity} icon={Activity} />
                </>
            )}
        </div>
    );
};

// Nova Seção de Performance Focada em Renda (Substitui Market Comparison)
const IncomeAnalysisSection = ({ asset, history }: { asset: AssetPosition, history: DividendReceipt[] }) => {
    // State para filtros de gráfico
    const [timeRange, setTimeRange] = useState<'6M' | '1Y' | '2Y' | '5Y'>('1Y');

    // Cálculo do Yield on Cost
    const totalInvested = asset.quantity * asset.averagePrice;
    const yoc = totalInvested > 0 ? (asset.totalDividends || 0) / totalInvested * 100 : 0;
    
    // Estimativas
    const currentPrice = asset.currentPrice || 0;
    const lastDiv = asset.last_dividend || (asset.dy_12m ? (currentPrice * (asset.dy_12m/100))/12 : 0);
    const monthlyReturn = lastDiv > 0 ? lastDiv : 0;
    
    // Número Mágico
    const magicNumber = monthlyReturn > 0 ? Math.ceil(currentPrice / monthlyReturn) : 0;
    const magicProgress = magicNumber > 0 ? Math.min(100, (asset.quantity / magicNumber) * 100) : 0;
    const missingForMagic = Math.max(0, magicNumber - asset.quantity);

    // Payback em Anos (Simples)
    const paybackYears = monthlyReturn > 0 ? (currentPrice / (monthlyReturn * 12)) : 0;

    // --- CÁLCULO DINÂMICO DO GRÁFICO ---
    const chartData = useMemo(() => {
        if (!history || history.length === 0) return { data: [], average: 0 };

        const now = new Date();
        let months = 12;
        
        switch(timeRange) {
            case '6M': months = 6; break;
            case '1Y': months = 12; break;
            case '2Y': months = 24; break;
            case '5Y': months = 60; break;
        }

        const buckets: Record<string, number> = {};
        
        // Inicializa buckets para o período selecionado
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7); // YYYY-MM
            buckets[key] = 0;
        }

        let totalInRange = 0;
        
        history.forEach(d => {
            const dateStr = d.paymentDate || d.dateCom;
            if (!dateStr) return;
            const key = dateStr.substring(0, 7);
            if (buckets[key] !== undefined) {
                buckets[key] += d.totalReceived;
                totalInRange += d.totalReceived;
            }
        });

        const data = Object.entries(buckets).map(([key, value]) => {
            const [y, m] = key.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
            return {
                date: key,
                label: dateObj.toLocaleDateString('pt-BR', { month: 'short', year: months > 12 ? '2-digit' : undefined }).replace('.','').toUpperCase(),
                value
            };
        }).sort((a,b) => a.date.localeCompare(b.date));

        return { 
            data, 
            average: totalInRange / months 
        };
    }, [history, timeRange]);

    return (
        <div className="space-y-6">
            
            {/* 1. SEU RESULTADO (Destaque Principal) */}
            <div className="p-5 rounded-2xl border bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-indigo-100 dark:border-zinc-800 relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-600 dark:text-indigo-400 opacity-80">Retorno com Proventos</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-zinc-900 dark:text-white">
                                {formatBRL(asset.totalDividends || 0)}
                            </span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-black/20 border border-indigo-100 dark:border-white/5">
                            <span className="text-[9px] font-bold text-zinc-500">Yield on Cost:</span>
                            <span className="text-[9px] font-black text-emerald-500">+{yoc.toFixed(2)}%</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* 2. Gráfico Aprimorado + Histórico */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                            <BarChart3 className="w-3 h-3" /> Evolução
                        </h4>
                        
                        {/* Filtros de Período */}
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                            {(['6M', '1Y', '2Y', '5Y'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${timeRange === range ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold">Média no período:</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-white">{formatBRL(chartData.average)}</span>
                    </div>
                </div>
                
                <div className="h-48 w-full p-2 pt-4">
                    {chartData.data.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.data}>
                                <defs>
                                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} interval={0} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#fff', fontSize: '10px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                    formatter={(value: number) => [formatBRL(value), 'Recebido']}
                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                />
                                <Bar dataKey="value" fill="url(#colorBar)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                {chartData.average > 0 && (
                                    <ReferenceLine y={chartData.average} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                            Sem dados no período
                        </div>
                    )}
                </div>

                {/* Lista de Últimos Pagamentos (Integrada) */}
                <div className="bg-zinc-50 dark:bg-zinc-800/30 max-h-[300px] overflow-y-auto">
                    <h5 className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-t border-zinc-100 dark:border-zinc-800 sticky top-0 bg-zinc-50 dark:bg-zinc-900/90 backdrop-blur-sm z-10">
                        Histórico Completo
                    </h5>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {history.slice(0, 20).map((h, i) => (
                            <div key={h.id || i} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-700 text-zinc-400">
                                        <CalendarCheck className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                            {formatDateShort(h.paymentDate || h.dateCom)}
                                        </p>
                                        <p className="text-[9px] text-zinc-400 uppercase font-medium flex items-center gap-1">
                                            {h.type} <span className="w-0.5 h-0.5 bg-zinc-400 rounded-full"></span> {h.paymentDate ? 'Pago' : 'Data Com'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(h.totalReceived)}</p>
                                    <p className="text-[9px] text-zinc-400">{formatBRL(h.rate)}/cota</p>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <p className="px-4 py-6 text-center text-xs text-zinc-400 italic">Nenhum registro de provento encontrado.</p>
                        )}
                        {history.length > 20 && (
                            <p className="px-4 py-3 text-center text-[9px] text-zinc-400 font-medium border-t border-zinc-100 dark:border-zinc-800">
                                Exibindo últimos 20 de {history.length}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. RAIO-X DE RENDA */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Raio-X de Renda</h4>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Bola de Neve */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-amber-500" /> Número Mágico
                            </span>
                            <span className="text-[10px] font-black text-zinc-400 uppercase">
                                {missingForMagic === 0 ? 'Atingido!' : `Faltam ${missingForMagic} cotas`}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${magicProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                            Você precisa de <strong>{magicNumber}</strong> cotas para comprar uma nova cota todo mês apenas com os dividendos.
                        </p>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Metas de Renda Passiva</h5>
                        <div className="space-y-3">
                            {[50, 100, 1000].map(target => {
                                const needed = monthlyReturn > 0 ? Math.ceil(target / monthlyReturn) : 0;
                                const has = asset.quantity >= needed;
                                return (
                                    <div key={target} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {has ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Goal className="w-3.5 h-3.5 text-zinc-300" />}
                                            R$ {target}/mês
                                        </span>
                                        <span className={`font-mono font-medium ${has ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                            {needed} cotas
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Payback Estimado</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">{paybackYears > 0 ? paybackYears.toFixed(1) : '-'} <span className="text-xs font-medium text-zinc-500">anos</span></p>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Renda/Cota</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(monthlyReturn)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE: LIST ITEM ---
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
    
    // Tabs Unificadas (Mudado PERFORMANCE para RENDA)
    const [activeTab, setActiveTab] = useState<'RESUMO' | 'RENDA' | 'DADOS' | 'IMOVEIS'>('RESUMO');

    const filtered = useMemo(() => {
        if (!search) return portfolio;
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    const fiis = filtered.filter(p => p.assetType === AssetType.FII);
    const stocks = filtered.filter(p => p.assetType === AssetType.STOCK);

    const handleToggle = (ticker: string) => {
        setExpandedAssetTicker(prev => prev === ticker ? null : ticker);
    };

    // Recalcula histórico total para o ativo selecionado (passado direto para o componente filho)
    const assetHistory = useMemo(() => {
        if (!selectedAsset) return [];
        return dividends
            .filter(d => d.ticker === selectedAsset.ticker)
            .sort((a, b) => (b.paymentDate || b.dateCom).localeCompare(a.paymentDate || a.dateCom));
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

                            {/* Tabs Navigation (Merged) */}
                            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
                                {['RESUMO', 'RENDA', 'DADOS', 'IMOVEIS'].map(tab => {
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
                                    
                                    {/* Valuation movido para cá (Destaque) */}
                                    <ValuationCard asset={selectedAsset} />

                                    {/* Indicadores Principais */}
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Indicadores
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <MetricCard label="DY (12m)" value={formatPercent(selectedAsset.dy_12m)} highlight colorClass="text-emerald-600 dark:text-emerald-400" />
                                        <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} />
                                        {/* P/L visível apenas para ações, caso contrário mostra VP/Cota para FIIs */}
                                        {selectedAsset.assetType !== AssetType.FII ? (
                                            <MetricCard label="P/L" value={formatNumber(selectedAsset.p_l)} />
                                        ) : (
                                            <MetricCard label="VP/Cota" value={selectedAsset.vpa ? formatBRL(selectedAsset.vpa) : '-'} />
                                        )}
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
                                        <InfoRow label="Patrimônio Líq." value={selectedAsset.assets_value} icon={Wallet} />
                                    </div>
                                </div>
                            )}

                            {/* Substituído PERFORMANCE por RENDA com Análise */}
                            {activeTab === 'RENDA' && (
                                <div className="anim-fade-in">
                                    <IncomeAnalysisSection asset={selectedAsset} history={assetHistory} />
                                </div>
                            )}

                            {activeTab === 'DADOS' && (
                                <div className="anim-fade-in">
                                    <DetailedInfoBlock asset={selectedAsset} />
                                    {/* Valuation para Ações */}
                                    {selectedAsset.assetType === AssetType.STOCK && (
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <MetricCard label="ROE" value={formatPercent(selectedAsset.roe)} highlight />
                                            <MetricCard label="Margem Líq." value={formatPercent(selectedAsset.net_margin)} />
                                            <MetricCard label="Dív.Líq/EBITDA" value={formatNumber(selectedAsset.net_debt_ebitda)} />
                                            <MetricCard label="LPA" value={formatBRL(selectedAsset.lpa)} />
                                        </div>
                                    )}
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
