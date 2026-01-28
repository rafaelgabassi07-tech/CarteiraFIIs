
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, ExternalLink, TrendingUp, TrendingDown, Scale, Percent, Banknote, Calendar, Briefcase, Zap, Layers, Tag, Gem, Building2, RefreshCw, PieChart } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
  privacyMode?: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
  headerVisible?: boolean;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: any, privacy = false) => {
  if (privacy) return '•••%';
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `${num > 0 ? '+' : ''}${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatNumber = (val: any, suffix = '') => {
    if (val === undefined || val === null || val === '' || isNaN(Number(val))) return '-';
    return Number(val).toLocaleString('pt-BR') + suffix;
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
            {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
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
    const [isUpdating, setIsUpdating] = useState(false); // Inicia como falso para mostrar dados em cache imediatamente
    const [displayAsset, setDisplayAsset] = useState<AssetPosition>(asset);
    
    // Sincroniza props
    useEffect(() => {
        if (asset) setDisplayAsset(asset);
    }, [asset]);

    // Auto-update ao montar (SILENCIOSO/BACKGROUND)
    useEffect(() => {
        let mounted = true;
        if (onRefresh && asset?.ticker) {
            setIsUpdating(true); // Apenas ativa o indicador visual, não bloqueia a UI
            // Delay artificial removido para UX instantânea
            onRefresh(asset.ticker)
                .catch(e => console.error("Asset refresh failed:", e))
                .finally(() => {
                    if (mounted) setIsUpdating(false);
                });
        }
        return () => { mounted = false; };
    }, []); // Executa apenas na montagem

    // Só exibe Skeleton se NÃO houver nenhum dado para mostrar (ex: erro de carregamento inicial raro)
    if (!displayAsset) {
        return <AssetDetailSkeleton />;
    }

    const isFII = displayAsset.assetType === AssetType.FII;

    // Cálculos Gerais Seguros
    const currentTotal = (displayAsset.currentPrice || 0) * displayAsset.quantity;
    const costTotal = displayAsset.averagePrice * displayAsset.quantity;
    const gainValue = currentTotal - costTotal;
    const totalDividends = displayAsset.totalDividends || 0;
    const finalReturn = gainValue + totalDividends;
    const finalReturnPercent = costTotal > 0 ? (finalReturn / costTotal) * 100 : 0;
    
    // Yield on Cost (YoC) - Cálculo Robusto
    const yieldOnCost = useMemo(() => {
        if (displayAsset.averagePrice <= 0) return 0;
        if (displayAsset.dy_12m !== undefined && displayAsset.dy_12m !== null && displayAsset.currentPrice) {
            return (displayAsset.currentPrice / displayAsset.averagePrice) * displayAsset.dy_12m;
        }
        if (displayAsset.totalDividends && costTotal > 0) {
             return (displayAsset.totalDividends / costTotal) * 100;
        }
        return 0;
    }, [displayAsset, costTotal]);

    // --- CÁLCULOS DE PROVENTOS SEGUROS ---
    const assetDividends = useMemo(() => {
        if (!dividends || !Array.isArray(dividends)) return [];
        const root = displayAsset.ticker ? displayAsset.ticker.substring(0, 4) : '';
        return dividends
            .filter(d => d.ticker && d.ticker.startsWith(root) && d.paymentDate)
            .sort((a,b) => (a.paymentDate || '').localeCompare(b.paymentDate || ''));
    }, [displayAsset, dividends]);

    const last12MonthsData = useMemo(() => {
        const today = new Date();
        const data: { month: string, value: number, year: number }[] = [];
        let total12m = 0;

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7); 
            const monthSum = assetDividends
                .filter(div => div.paymentDate && div.paymentDate.substring(0, 7) === key)
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

    // Cálculos para Barra Stacked (Apenas para visualização proporcional)
    const barTotal = Math.max(costTotal, costTotal + gainValue + totalDividends, currentTotal + totalDividends);
    const barCostPct = barTotal > 0 ? (costTotal / barTotal) * 100 : 0;
    const barGainPct = barTotal > 0 && gainValue > 0 ? (gainValue / barTotal) * 100 : 0;
    const barDivsPct = barTotal > 0 ? (totalDividends / barTotal) * 100 : 0;

    return (
        <div className="bg-white dark:bg-zinc-950 min-h-full flex flex-col relative">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 pt-safe px-6 pb-4">
                <div className="flex items-center justify-between mb-5 pt-4">
                    <div className="flex items-center gap-4 w-full">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border shadow-sm transition-all ${isFII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                            {displayAsset.ticker.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">{displayAsset.ticker}</h1>
                                {isUpdating && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
                                        <span className="text-[9px] font-bold text-zinc-400">Atualizando...</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs font-medium text-zinc-400 truncate max-w-[200px]">{displayAsset.segment || (isFII ? 'Fundo Imobiliário' : 'Ação')}</p>
                        </div>
                    </div>
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
                        
                        {/* 1. Card Patrimônio Premium */}
                        <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 text-center group">
                             <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 opacity-50"></div>
                             <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">Patrimônio Atual</p>
                                <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums mb-4 leading-none">
                                    {formatBRL(currentTotal, privacyMode)}
                                </h2>
                                {/* Daily Variation Badge */}
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${displayAsset.dailyChange && displayAsset.dailyChange >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'}`}>
                                    {displayAsset.dailyChange && displayAsset.dailyChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    <span>{displayAsset.dailyChange ? Math.abs(displayAsset.dailyChange).toFixed(2) : '0.00'}% (24h)</span>
                                </div>
                             </div>
                        </div>

                        {/* 2. Breakdown Financeiro Completo */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] p-6 border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                <PieChart className="w-4 h-4" /> Composição do Retorno
                            </h3>

                            {/* Stacked Bar Visual */}
                            <div className="flex h-4 w-full rounded-full overflow-hidden mb-6 shadow-inner bg-zinc-200 dark:bg-zinc-800">
                                {/* Cost Segment */}
                                <div 
                                    className="h-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-1000 border-r border-white/20" 
                                    style={{ width: `${barCostPct}%` }} 
                                />
                                {/* Capital Gain Segment (Only if positive for stacking logic) */}
                                {barGainPct > 0 && (
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 border-r border-white/20" 
                                        style={{ width: `${barGainPct}%` }} 
                                    />
                                )}
                                {/* Dividends Segment */}
                                {barDivsPct > 0 && (
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-1000" 
                                        style={{ width: `${barDivsPct}%` }} 
                                    />
                                )}
                            </div>

                            {/* Tabela de Detalhes */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></span>
                                        <span className="text-zinc-500 font-medium">Custo de Aquisição</span>
                                    </div>
                                    <span className="font-bold text-zinc-900 dark:text-white">{formatBRL(costTotal, privacyMode)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${gainValue >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                        <span className="text-zinc-500 font-medium">Ganho de Capital</span>
                                    </div>
                                    <span className={`font-bold ${gainValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                        {gainValue > 0 ? '+' : ''}{formatBRL(gainValue, privacyMode)}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                        <span className="text-zinc-500 font-medium">Proventos Totais</span>
                                    </div>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">+{formatBRL(totalDividends, privacyMode)}</span>
                                </div>
                                
                                <div className="my-4 border-t border-dashed border-zinc-300 dark:border-zinc-700"></div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Retorno Final</span>
                                    <div className="text-right">
                                        <span className={`block text-lg font-black ${finalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                            {finalReturn > 0 ? '+' : ''}{formatBRL(finalReturn, privacyMode)}
                                        </span>
                                        <span className={`text-[10px] font-bold ${finalReturn >= 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-rose-500/70'}`}>
                                            ROI Total: {finalReturnPercent > 0 ? '+' : ''}{finalReturnPercent.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Grid de Estatísticas Refinado */}
                        <div className="grid grid-cols-3 gap-3">
                            <StatCard 
                                label="Preço Médio" 
                                value={formatBRL(displayAsset.averagePrice, privacyMode)} 
                                icon={Tag}
                            />
                            <StatCard 
                                label="Cotação" 
                                value={formatBRL(displayAsset.currentPrice || 0, privacyMode)} 
                                icon={TrendingUp}
                            />
                            <StatCard 
                                label="Yield on Cost" 
                                value={`${yieldOnCost.toFixed(2)}%`} 
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
                                    {isFII ? (displayAsset.p_vp?.toFixed(2) || '-') : (displayAsset.p_l?.toFixed(2) || '-')}
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
                                    <InfoRow label="Valor Patrimonial por Cota" value={displayAsset.vpa !== undefined && displayAsset.vpa !== null ? `R$ ${displayAsset.vpa.toFixed(2)}` : '-'} />
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
                                    
                                    {/* Exibição direta para campos de texto (sem formatNumber) */}
                                    <InfoRow label="Tipo de Gestão" value={displayAsset.manager_type || '-'} />
                                    <InfoRow label="Taxa de Admin." value={displayAsset.management_fee || '-'} />
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
                                    <InfoRow label="Dív. Líq. / EBITDA" value={displayAsset.net_debt_ebitda !== undefined && displayAsset.net_debt_ebitda !== null ? `${displayAsset.net_debt_ebitda.toFixed(2)}x` : '-'} />
                                </div>
                            </>
                        )}

                        <div className="pt-4 pb-2">
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
                                            <p className="text-xs font-black text-zinc-900 dark:text-white uppercase">{d.paymentDate ? new Date(d.paymentDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Data Pendente'}</p>
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

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false, onAssetRefresh, headerVisible = true }) => {
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedAsset = useMemo(() => {
        if (!selectedTicker) return null;
        return portfolio.find(p => p.ticker === selectedTicker) || null;
    }, [portfolio, selectedTicker]);

    const filteredPortfolio = useMemo(() => {
        if (!searchTerm) return portfolio;
        const lower = searchTerm.toLowerCase();
        return portfolio.filter(p => p.ticker.toLowerCase().includes(lower) || (p.segment || '').toLowerCase().includes(lower));
    }, [portfolio, searchTerm]);

    const grouped = useMemo(() => {
        const fiis = filteredPortfolio.filter(p => p.assetType === AssetType.FII);
        const stocks = filteredPortfolio.filter(p => p.assetType === AssetType.STOCK);
        return { fiis, stocks };
    }, [filteredPortfolio]);

    return (
        <div className="pb-32 min-h-screen">
            <div className={`sticky top-20 z-20 bg-primary-light dark:bg-primary-dark transition-all duration-300 -mx-4 px-4 py-2 mb-2 ${headerVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        <Search className="w-4 h-4" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar na carteira..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="space-y-6">
                {grouped.fiis.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-2">
                            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Fundos Imobiliários</h3>
                            <span className="ml-auto text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">{grouped.fiis.length}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {grouped.fiis.map((asset) => (
                                <AssetCard key={asset.ticker} asset={asset} privacyMode={privacyMode} onClick={() => setSelectedTicker(asset.ticker)} />
                            ))}
                        </div>
                    </div>
                )}

                {grouped.stocks.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-2 mt-2">
                            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Ações</h3>
                            <span className="ml-auto text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">{grouped.stocks.length}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {grouped.stocks.map((asset) => (
                                <AssetCard key={asset.ticker} asset={asset} privacyMode={privacyMode} onClick={() => setSelectedTicker(asset.ticker)} />
                            ))}
                        </div>
                    </div>
                )}

                {filteredPortfolio.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Gem className="w-16 h-16 text-zinc-300 mb-4" strokeWidth={1} />
                        <p className="text-sm font-bold text-zinc-500">Nenhum ativo encontrado.</p>
                    </div>
                )}
            </div>

            <SwipeableModal isOpen={!!selectedTicker} onClose={() => setSelectedTicker(null)}>
                {selectedAsset && (
                    <AssetDetailView 
                        asset={selectedAsset} 
                        dividends={dividends || []} 
                        privacyMode={privacyMode || false} 
                        onClose={() => setSelectedTicker(null)}
                        onRefresh={onAssetRefresh}
                    />
                )}
            </SwipeableModal>
        </div>
    );
};

const AssetCard: React.FC<{ asset: AssetPosition, privacyMode?: boolean, onClick: () => void }> = ({ asset, privacyMode, onClick }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalValue = (asset.currentPrice || 0) * asset.quantity;
    
    return (
        <button onClick={onClick} className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group active:scale-[0.98] transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm anim-fade-in-up">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black border shadow-sm transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                    {asset.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                        {asset.ticker}
                        {asset.dailyChange !== undefined && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                {isPositive ? '+' : ''}{asset.dailyChange.toFixed(2)}%
                            </span>
                        )}
                    </h4>
                    <p className="text-[10px] font-medium text-zinc-400 mt-0.5 truncate max-w-[140px]">{asset.segment}</p>
                    <p className="text-[10px] font-bold text-zinc-500 mt-1">{asset.quantity} cotas</p>
                </div>
            </div>
            
            <div className="text-right">
                <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{formatBRL(asset.currentPrice || 0, privacyMode)}</p>
                {asset.dy_12m !== undefined && (
                    <p className="text-[9px] font-bold text-emerald-500 mt-1">DY {asset.dy_12m.toFixed(1)}%</p>
                )}
            </div>
        </button>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
