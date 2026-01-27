
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, ExternalLink, X, TrendingUp, TrendingDown, Building2, BarChart3, Activity, Scale, Percent, AlertCircle, Banknote, Landmark, LineChart, DollarSign, PieChart, Users, ArrowUpRight, BarChart as BarChartIcon, Gem, Calendar, Briefcase, Zap, Layers, AlertTriangle, Loader2, Tag, RefreshCw } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
  privacyMode?: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
}

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number, privacy = false) => {
  if (privacy) return '•••%';
  const signal = val > 0 ? '+' : '';
  return `${signal}${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatNumber = (val: number | string | undefined, suffix = '') => {
    if (val === undefined || val === null || val === '' || val === 0) return '-';
    if (typeof val === 'string') return val;
    return val.toLocaleString('pt-BR') + suffix;
};

// Componente de Estatística com Ícone
const StatCard = ({ label, value, subtext, icon: Icon, colorClass, bgClass }: any) => (
    <div className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${bgClass || 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
        <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
            {Icon && <Icon className={`w-4 h-4 ${colorClass || 'text-zinc-300'}`} strokeWidth={2} />}
        </div>
        <div>
            <span className={`text-lg font-black tracking-tight ${colorClass || 'text-zinc-900 dark:text-white'}`}>{value}</span>
            {subtext && <p className="text-[9px] font-medium text-zinc-400 mt-0.5">{subtext}</p>}
        </div>
    </div>
);

const InfoRow = ({ label, value, highlight, subtext, color }: any) => (
    <div className={`flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${highlight ? 'bg-zinc-50/80 dark:bg-zinc-800/30 -mx-4 px-4' : ''}`}>
        <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            {subtext && <span className="text-[9px] text-zinc-300 dark:text-zinc-600 font-medium">{subtext}</span>}
        </div>
        <span className={`text-sm font-bold ${color || (highlight ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300')}`}>{value}</span>
    </div>
);

const SectionHeader = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 mb-3 mt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400">
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</h3>
    </div>
);

// Skeleton Shimmer Profissional
const AssetDetailSkeleton = () => {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 animate-pulse">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 pt-safe px-6 pb-4">
                <div className="flex items-center justify-between mb-5 pt-4">
                    <div className="flex items-center gap-4 w-full">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
                    <div className="flex-1 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
                    <div className="flex-1 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800"></div>
                    <div className="h-24 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800"></div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                    </div>
                    <div className="h-48 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4 p-4">
                        <div className="flex justify-between"><div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded"></div><div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div></div>
                        <div className="flex justify-between"><div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div><div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded"></div></div>
                        <div className="flex justify-between"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div><div className="h-3 w-14 bg-zinc-200 dark:bg-zinc-800 rounded"></div></div>
                    </div>
                </div>

                <div className="h-32 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800"></div>
            </div>
        </div>
    );
};

const AssetDetailView = ({ asset, dividends, privacyMode, onClose, onRefresh }: { asset: AssetPosition, dividends: DividendReceipt[], privacyMode: boolean, onClose: () => void, onRefresh?: (ticker: string) => Promise<void> }) => {
    const [tab, setTab] = useState<'POSICAO' | 'FUNDAMENTOS' | 'PROVENTOS'>('POSICAO');
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Estado local sincronizado
    const [displayAsset, setDisplayAsset] = useState<AssetPosition>(asset);
    
    // Sincroniza props -> state
    useEffect(() => {
        if (asset) {
            setDisplayAsset(prev => {
                // Atualiza apenas se tiver dados novos relevantes, evitando flash
                const hasNewData = asset.dy_12m || asset.p_vp || asset.p_l;
                const hadData = prev.dy_12m || prev.p_vp || prev.p_l;
                
                // Se já tinha dados e não veio nada novo (ou veio igual), mantem
                // Se veio dado novo, atualiza
                if (!hasNewData && hadData) return prev; 
                return asset;
            });
        }
    }, [asset]);

    // Trigger de Atualização ao Montar
    useEffect(() => {
        if (onRefresh) {
            setIsUpdating(true);
            onRefresh(asset.ticker)
                .catch(err => console.error("Refresh failed", err))
                .finally(() => {
                    setTimeout(() => setIsUpdating(false), 800); 
                });
        }
    }, []); 

    const isFII = displayAsset.assetType === AssetType.FII;

    // Cálculos Gerais
    const currentTotal = (displayAsset.currentPrice || 0) * displayAsset.quantity;
    const costTotal = displayAsset.averagePrice * displayAsset.quantity;
    const gainValue = currentTotal - costTotal;
    const gainPercent = costTotal > 0 ? (gainValue / costTotal) * 100 : 0;
    const isPositive = gainValue >= 0;
    const yieldOnCost = costTotal > 0 ? (displayAsset.totalDividends || 0) / costTotal * 100 : 0;

    // --- CÁLCULOS DE PROVENTOS ---
    const assetDividends = useMemo(() => {
        if (!dividends) return [];
        const root = displayAsset.ticker.substring(0, 4);
        return dividends
            .filter(d => d.ticker.startsWith(root))
            .sort((a,b) => a.paymentDate.localeCompare(b.paymentDate));
    }, [displayAsset, dividends]);

    const last12MonthsData = useMemo(() => {
        const today = new Date();
        const data: { month: string, value: number, year: number }[] = [];
        let total12m = 0;

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7); 
            const monthSum = assetDividends
                .filter(div => div.paymentDate.substring(0, 7) === key)
                .reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
            
            total12m += monthSum;
            data.push({
                month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                value: monthSum,
                year: d.getFullYear()
            });
        }
        return { chartData: data, total12m, monthlyAvg: total12m / 12 };
    }, [assetDividends]);

    if (isUpdating && !displayAsset.dy_12m && !displayAsset.p_vp) {
        // Se estiver atualizando e não tivermos dados cacheados (primeira carga), mostra o Skeleton
        return <AssetDetailSkeleton />;
    }

    return (
        <div className="bg-white dark:bg-zinc-950 min-h-full flex flex-col relative">
            {/* OVERLAY DE CARREGAMENTO (Discreto) */}
            {isUpdating && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800 overflow-hidden z-50">
                    <div className="h-full bg-indigo-500 animate-[loading_1.5s_infinite_ease-in-out]"></div>
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 pt-safe px-6 pb-4">
                <div className="flex items-center justify-between mb-5 pt-4">
                    <div className="flex items-center gap-4 w-full">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border shadow-sm transition-all ${isFII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                            {displayAsset.ticker.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">{displayAsset.ticker}</h1>
                            </div>
                            <p className="text-xs font-medium text-zinc-400 truncate max-w-[200px]">{displayAsset.segment || (isFII ? 'Fundo Imobiliário' : 'Ação')}</p>
                        </div>
                    </div>
                    {/* Botão X removido conforme solicitado */}
                </div>

                <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-900/80 rounded-xl">
                    {['POSICAO', 'FUNDAMENTOS', 'PROVENTOS'].map(t => (
                        <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${tab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                            {t === 'POSICAO' ? 'Posição' : t === 'PROVENTOS' ? 'Proventos' : 'Fundamentos'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">
                {tab === 'POSICAO' && (
                    <div className="space-y-6 anim-fade-in">
                        
                        {/* Card Patrimônio Premium */}
                        <div className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 group">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-800 dark:via-zinc-900 dark:to-black"></div>
                            <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                                <Wallet className="w-32 h-32 text-white" />
                            </div>
                            
                            <div className="relative z-10 text-center">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">Patrimônio Total</p>
                                <h2 className="text-4xl font-black text-white tracking-tighter mb-4 tabular-nums">{formatBRL(currentTotal, privacyMode)}</h2>
                                
                                <div className="inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950'}`}>
                                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} /> : <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                    </div>
                                    <div className="text-left leading-none">
                                        <span className={`text-[10px] font-black block ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isPositive ? '+' : ''}{formatBRL(gainValue, privacyMode)}
                                        </span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                                            {formatPercent(gainPercent, privacyMode)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Barra de Progresso Financeiro */}
                            <div className="relative z-10 mt-8">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                                    <span>Custo ({formatBRL(costTotal, privacyMode)})</span>
                                    <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>Resultado</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-zinc-500" style={{ width: `${Math.min((costTotal / currentTotal) * 100, 100)}%` }}></div>
                                    {isPositive && <div className="h-full bg-emerald-500 flex-1"></div>}
                                </div>
                            </div>
                        </div>

                        {/* Grid de Estatísticas */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard 
                                label="Preço Médio" 
                                value={formatBRL(displayAsset.averagePrice, privacyMode)} 
                                icon={Tag}
                            />
                            <StatCard 
                                label="Cotação Atual" 
                                value={formatBRL(displayAsset.currentPrice || 0, privacyMode)} 
                                subtext={`${displayAsset.dailyChange && displayAsset.dailyChange > 0 ? '+' : ''}${displayAsset.dailyChange?.toFixed(2)}% (24h)`}
                                icon={TrendingUp}
                                colorClass={displayAsset.dailyChange && displayAsset.dailyChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : displayAsset.dailyChange && displayAsset.dailyChange < 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
                            />
                            <StatCard 
                                label="Quantidade" 
                                value={displayAsset.quantity} 
                                icon={Layers}
                            />
                            <StatCard 
                                label="Yield on Cost" 
                                value={`${yieldOnCost.toFixed(2)}%`} 
                                subtext="Baseado no PM"
                                icon={Percent}
                                bgClass="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30"
                                colorClass="text-indigo-600 dark:text-indigo-400"
                            />
                        </div>
                    </div>
                )}

                {tab === 'FUNDAMENTOS' && (
                    <div className="space-y-4 anim-fade-in">
                        
                        {/* CARD DE DESTAQUES PRINCIPAIS */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{isFII ? "P/VP" : "P/L"}</p>
                                <p className={`text-2xl font-black tracking-tight ${isFII && displayAsset.p_vp && displayAsset.p_vp < 1 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>
                                    {isFII ? displayAsset.p_vp?.toFixed(2) || '-' : displayAsset.p_l?.toFixed(2) || '-'}
                                </p>
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Dividend Yield</p>
                                <p className="text-2xl font-black tracking-tight text-emerald-500">
                                    {displayAsset.dy_12m !== undefined && displayAsset.dy_12m !== null ? `${displayAsset.dy_12m.toFixed(2)}%` : '-'}
                                </p>
                            </div>
                        </div>

                        {/* --- BLOCOS FIIs --- */}
                        {isFII && (
                            <>
                                <SectionHeader title="Valuation & Cotas" icon={Scale} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="Preço / VP" value={displayAsset.p_vp?.toFixed(2) || '-'} highlight />
                                    <InfoRow label="Valor Patrimonial" value={displayAsset.vpa !== undefined && displayAsset.vpa !== null ? `R$ ${displayAsset.vpa.toFixed(2)}` : '-'} subtext="Por Cota" />
                                    <InfoRow label="Último Rendimento" value={displayAsset.last_dividend ? `R$ ${displayAsset.last_dividend.toFixed(2)}` : '-'} color="text-emerald-600 dark:text-emerald-400" />
                                    <InfoRow label="Patrimônio Líquido" value={formatNumber(displayAsset.assets_value)} />
                                </div>

                                <SectionHeader title="Qualidade & Gestão" icon={Briefcase} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    {displayAsset.vacancy !== undefined && (
                                        <InfoRow 
                                            label="Vacância Física" 
                                            value={`${displayAsset.vacancy}%`} 
                                            highlight={displayAsset.vacancy > 10} 
                                            subtext={displayAsset.vacancy > 10 ? 'Atenção: Alta' : 'Controlada'}
                                            color={displayAsset.vacancy > 10 ? 'text-rose-500' : undefined}
                                        />
                                    )}
                                    <InfoRow label="Liquidez Diária" value={formatNumber(displayAsset.liquidity)} />
                                    <InfoRow label="Número de Cotistas" value={formatNumber(displayAsset.properties_count)} />
                                    <InfoRow label="Tipo de Gestão" value={formatNumber(displayAsset.manager_type)} />
                                    <InfoRow label="Taxa de Admin." value={formatNumber(displayAsset.management_fee)} />
                                </div>
                            </>
                        )}

                        {/* --- BLOCOS AÇÕES --- */}
                        {!isFII && (
                            <>
                                <SectionHeader title="Valuation" icon={Scale} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="P/L (Preço/Lucro)" value={displayAsset.p_l?.toFixed(2) || '-'} highlight />
                                    <InfoRow label="P/VP" value={displayAsset.p_vp?.toFixed(2) || '-'} />
                                    <InfoRow label="EV / EBITDA" value={displayAsset.ev_ebitda?.toFixed(2) || '-'} />
                                    <InfoRow label="VPA" value={displayAsset.vpa !== undefined && displayAsset.vpa !== null ? `R$ ${displayAsset.vpa.toFixed(2)}` : '-'} />
                                    <InfoRow label="LPA" value={displayAsset.lpa !== undefined && displayAsset.lpa !== null ? `R$ ${displayAsset.lpa.toFixed(2)}` : '-'} />
                                </div>

                                <SectionHeader title="Eficiência & Rentabilidade" icon={Zap} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="ROE" value={displayAsset.roe ? `${displayAsset.roe.toFixed(1)}%` : '-'} highlight color={displayAsset.roe && displayAsset.roe > 15 ? 'text-emerald-500' : undefined} />
                                    <InfoRow label="Margem Líquida" value={displayAsset.net_margin ? `${displayAsset.net_margin.toFixed(1)}%` : '-'} />
                                    <InfoRow label="Margem Bruta" value={displayAsset.gross_margin ? `${displayAsset.gross_margin.toFixed(1)}%` : '-'} />
                                </div>

                                <SectionHeader title="Crescimento & Dívida" icon={TrendingUp} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="CAGR Receita (5a)" value={displayAsset.cagr_revenue ? `${displayAsset.cagr_revenue.toFixed(1)}%` : '-'} />
                                    <InfoRow label="CAGR Lucros (5a)" value={displayAsset.cagr_profits ? `${displayAsset.cagr_profits.toFixed(1)}%` : '-'} />
                                    <InfoRow label="Dív. Líq. / EBITDA" value={displayAsset.net_debt_ebitda ? `${displayAsset.net_debt_ebitda.toFixed(2)}x` : '-'} />
                                </div>
                            </>
                        )}

                        <div className="pt-4">
                            <a href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${displayAsset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest press-effect shadow-xl group">
                                Análise Completa Investidor10 <ExternalLink className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                )}

                {tab === 'PROVENTOS' && (
                    <div className="space-y-8 anim-fade-in">
                        {/* Cartão de Destaque */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800 p-6 rounded-3xl text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Total Recebido</p>
                                    <h3 className="text-3xl font-black tracking-tight">{formatBRL(displayAsset.totalDividends || 0, privacyMode)}</h3>
                                </div>
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-sm">
                                    <Banknote className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="flex gap-4 border-t border-white/20 pt-4 relative z-10">
                                <div>
                                    <p className="text-[9px] font-bold opacity-70 uppercase tracking-wide">Yield on Cost</p>
                                    <p className="text-sm font-black">{yieldOnCost.toFixed(2)}%</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold opacity-70 uppercase tracking-wide">Média Mensal</p>
                                    <p className="text-sm font-black">{formatBRL(last12MonthsData.monthlyAvg, privacyMode)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico 12 Meses */}
                        <div className="h-48 w-full">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Histórico 12 Meses</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={last12MonthsData.chartData}>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={10} />
                                    <RechartsTooltip 
                                        cursor={{fill: 'transparent'}}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                                        {formatBRL(payload[0].value as number, privacyMode)}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                        {last12MonthsData.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#e4e4e7'} className="dark:fill-emerald-600 dark:bg-zinc-800" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Últimos Pagamentos (Lista) */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Últimos Pagamentos</h3>
                            {assetDividends.length > 0 ? assetDividends.slice().reverse().slice(0, 5).map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-zinc-900 dark:text-white uppercase">{new Date(d.paymentDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">{d.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(d.totalReceived, privacyMode)}</p>
                                        <p className="text-[9px] text-zinc-400 font-medium">Unitário: {d.rate !== undefined && d.rate !== null ? d.rate.toFixed(4) : '-'}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-6 text-center opacity-50">
                                    <p className="text-xs text-zinc-500">Sem histórico recente.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false, onAssetRefresh }) => {
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | AssetType>('ALL');

    const filteredAssets = useMemo(() => {
        return portfolio
          .filter(p => {
            const matchesSearch = p.ticker.includes(searchTerm.toUpperCase()) || (p.segment || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'ALL' || p.assetType === filterType;
            return matchesSearch && matchesType;
          })
          .sort((a, b) => (b.currentPrice || 0) * b.quantity - (a.currentPrice || 0) * a.quantity); 
    }, [portfolio, searchTerm, filterType]);

    return (
        <div className="pb-32 min-h-screen">
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-2">
                <div className="flex flex-col gap-3 pb-2">
                    <div className="relative flex items-center group">
                        <Search className="w-4 h-4 absolute left-4 text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Filtrar por nome ou ticker..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex items-center justify-between px-1">
                        <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl relative">
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`}
                                style={{ 
                                    left: '4px',
                                    transform: `translateX(${filterType === 'ALL' ? '0%' : filterType === AssetType.FII ? '100%' : '200%'})`
                                }}
                            ></div>
                            <button onClick={() => setFilterType('ALL')} className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${filterType === 'ALL' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Tudo</button>
                            <button onClick={() => setFilterType(AssetType.FII)} className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${filterType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>FIIs</button>
                            <button onClick={() => setFilterType(AssetType.STOCK)} className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${filterType === AssetType.STOCK ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Ações</button>
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{filteredAssets.length} Ativos</div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 px-1 pt-6">
                {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset, index) => {
                        const currentPrice = asset.currentPrice || 0;
                        const totalValue = currentPrice * asset.quantity;
                        const dailyVar = asset.dailyChange || 0;
                        const isPositiveDaily = dailyVar >= 0;
                        const isFII = asset.assetType === AssetType.FII;
                        const showLogo = asset.logoUrl && !isFII;

                        return (
                            <button key={asset.ticker} onClick={() => setSelectedAsset(asset)} className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item transition-all" style={{ animationDelay: `${index * 40}ms` }}>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        {showLogo ? (
                                            <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden p-1">
                                                <img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/10 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>{asset.ticker.substring(0, 2)}</div>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">{asset.ticker}</h3>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">{asset.segment || 'Geral'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                                    <div className="flex flex-col items-end mt-0.5">
                                        <span className="text-[10px] font-medium text-zinc-400">{formatBRL(currentPrice, privacyMode)}</span>
                                        <span className={`text-[9px] font-bold ${isPositiveDaily ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isPositiveDaily ? '+' : ''}{dailyVar.toFixed(2)}% (24h)
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="text-center py-20 opacity-40 anim-fade-in flex flex-col items-center">
                        <Gem className="w-12 h-12 mb-4 text-zinc-300 anim-float" strokeWidth={1.5} />
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nenhum ativo encontrado</p>
                    </div>
                )}
            </div>

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && (
                    <AssetDetailView 
                        asset={selectedAsset} 
                        dividends={dividends} 
                        privacyMode={!!privacyMode} 
                        onClose={() => setSelectedAsset(null)}
                        onRefresh={onAssetRefresh}
                    />
                )}
            </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
