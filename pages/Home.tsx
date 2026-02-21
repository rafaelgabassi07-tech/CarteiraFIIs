
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, PortfolioInsight, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, ArrowUpRight, ArrowDownLeft, Wallet, ArrowRight, Sparkles, Trophy, Anchor, Coins, Crown, Info, X, Zap, ShieldCheck, AlertTriangle, Play, Pause, TrendingUp, TrendingDown, Target, Snowflake, Layers, Medal, Rocket, Gem, Lock, Building2, Briefcase, ShoppingCart, Coffee, Plane, Star, Award, Umbrella, ZapOff, CheckCircle2, ListFilter, History, Activity, Calendar, Percent, BarChart3, Share2 } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area, XAxis, YAxis, ComposedChart, Bar, Line, ReferenceLine, Label, BarChart } from 'recharts';
import { formatBRL, formatDateShort, getMonthName, getDaysUntil } from '../utils/formatters';

// --- CONSTANTS ---
const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#84cc16'];

const getStoryGradient = (type: PortfolioInsight['type']) => {
    switch (type) {
        case 'success':
        case 'opportunity':
        case 'diversification-good':
            return 'from-emerald-400 via-teal-500 to-emerald-600';
        case 'warning':
        case 'volatility_down':
        case 'risk-concentration':
            return 'from-orange-500 via-rose-500 to-pink-600';
        case 'inflation-shield':
        case 'magic-number':
            return 'from-amber-300 via-yellow-500 to-orange-500';
        case 'news':
        case 'spotlight-fii':
        case 'spotlight-stock':
        default:
            return 'from-indigo-400 via-purple-500 to-pink-500';
    }
};

const getStoryIcon = (type: PortfolioInsight['type']) => {
    switch (type) {
        case 'success': return <ArrowUpRight className="w-5 h-5 text-white" />;
        case 'warning': return <AlertTriangle className="w-5 h-5 text-white" />;
        case 'inflation-shield': return <ShieldCheck className="w-5 h-5 text-white" />;
        case 'news': return <Info className="w-5 h-5 text-white" />;
        case 'opportunity': return <Sparkles className="w-5 h-5 text-white" />;
        default: return <Zap className="w-5 h-5 text-white" />;
    }
};

const EvolutionModal = ({ isOpen, onClose, transactions, dividends, currentBalance }: { isOpen: boolean, onClose: () => void, transactions: Transaction[], dividends: DividendReceipt[], currentBalance: number }) => {
    const [timeRange, setTimeRange] = useState<'6M' | '1Y' | '2Y' | '5Y' | 'MAX'>('MAX');
    const [chartType, setChartType] = useState<'WEALTH' | 'CASHFLOW' | 'RETURN'>('WEALTH');

    // 1. Process Full History
    const fullHistory = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        // Collect all relevant dates
        const dates = transactions.map(t => new Date(t.date));
        if (dividends.length > 0) {
            const divDates = dividends.filter(d => d.paymentDate).map(d => new Date(d.paymentDate!));
            dates.push(...divDates);
        }
        
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date();
        
        // Initialize Timeline
        const timeline: Record<string, { 
            monthlyContribution: number, 
            monthlyDividend: number,
            accumulatedInvested: number,
            accumulatedDividends: number 
        }> = {};

        let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const allMonths: string[] = [];
        while (current <= maxDate) {
            const key = current.toISOString().slice(0, 7);
            timeline[key] = { monthlyContribution: 0, monthlyDividend: 0, accumulatedInvested: 0, accumulatedDividends: 0 };
            allMonths.push(key);
            current.setMonth(current.getMonth() + 1);
        }

        // Process Transactions
        const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
        let runningInvested = 0;

        allMonths.forEach(month => {
            const monthTxs = sortedTxs.filter(t => t.date.startsWith(month));
            const monthlyNet = monthTxs.reduce((acc, tx) => {
                const val = tx.quantity * tx.price;
                return tx.type === 'BUY' ? acc + val : acc - val;
            }, 0);

            timeline[month].monthlyContribution = monthlyNet;
            runningInvested += monthlyNet;
            timeline[month].accumulatedInvested = runningInvested;
        });

        // Process Dividends
        const sortedDivs = [...dividends].filter(d => d.paymentDate).sort((a, b) => a.paymentDate!.localeCompare(b.paymentDate!));
        let runningDivs = 0;

        allMonths.forEach(month => {
            const monthDivs = sortedDivs.filter(d => d.paymentDate?.startsWith(month));
            const monthlyDivTotal = monthDivs.reduce((acc, d) => acc + d.totalReceived, 0);

            timeline[month].monthlyDividend = monthlyDivTotal;
            runningDivs += monthlyDivTotal;
            timeline[month].accumulatedDividends = runningDivs;
        });

        // Calculate Market Value Approximation
        const finalInvested = runningInvested;
        const totalAppreciation = Math.max(0, currentBalance - finalInvested);
        const n = allMonths.length;
        
        return allMonths.map((m, i) => {
            const data = timeline[m];
            
            // Heuristic for Market Value Curve
            const timeFactor = (i + 1) / n;
            const investedFactor = finalInvested > 0 ? data.accumulatedInvested / finalInvested : 0;
            // Non-linear appreciation curve to simulate compounding/market effect
            const estimatedAppreciation = totalAppreciation * investedFactor * Math.pow(timeFactor, 0.7);
            
            const marketValue = data.accumulatedInvested + estimatedAppreciation;
            const totalReturn = marketValue - data.accumulatedInvested;
            const returnPercent = data.accumulatedInvested > 0 ? (totalReturn / data.accumulatedInvested) * 100 : 0;

            return {
                month: m,
                label: getMonthName(m).substring(0, 3).toUpperCase(),
                fullLabel: getMonthName(m),
                contribution: data.monthlyContribution,
                dividend: data.monthlyDividend,
                invested: data.accumulatedInvested,
                dividends: data.accumulatedDividends,
                marketValue: marketValue,
                appreciation: estimatedAppreciation,
                returnPercent: returnPercent
            };
        });
    }, [transactions, dividends, currentBalance]);

    // 2. Filter Data based on Time Range
    const filteredData = useMemo(() => {
        if (timeRange === 'MAX') return fullHistory;
        const monthsMap = { '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60 };
        const months = monthsMap[timeRange] || 12;
        return fullHistory.slice(-months);
    }, [fullHistory, timeRange]);

    // 3. Calculate Stats
    const stats = useMemo(() => {
        if (filteredData.length === 0) return null;
        const last = filteredData[filteredData.length - 1];
        const first = filteredData[0];
        
        const totalInvested = last.invested;
        const totalValue = last.marketValue;
        const totalReturn = totalValue - totalInvested;
        const roi = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
        
        const contributions = filteredData.map(d => d.contribution).filter(c => c > 0);
        const avgContribution = contributions.length > 0 ? contributions.reduce((a, b) => a + b, 0) / contributions.length : 0;
        
        const divs = filteredData.map(d => d.dividend).filter(d => d > 0);
        const avgDividend = divs.length > 0 ? divs.reduce((a, b) => a + b, 0) / divs.length : 0;

        // CAGR Calculation (Approximate)
        const years = filteredData.length / 12;
        const cagr = years >= 1 && first.marketValue > 0 ? (Math.pow(totalValue / first.marketValue, 1 / years) - 1) * 100 : roi;

        // Best/Worst Month & Win Rate
        let bestMonth = { ...filteredData[0], change: 0 };
        let worstMonth = { ...filteredData[0], change: 0 };
        let positiveMonths = 0;
        let negativeMonths = 0;

        for (let i = 1; i < filteredData.length; i++) {
            const prev = filteredData[i-1];
            const curr = filteredData[i];
            // Organic change % (excluding contribution)
            const organicGrowth = (curr.marketValue - prev.marketValue) - curr.contribution;
            const pct = prev.marketValue > 0 ? (organicGrowth / prev.marketValue) * 100 : 0;
            
            if (pct > bestMonth.change) bestMonth = { ...curr, change: pct };
            if (pct < worstMonth.change) worstMonth = { ...curr, change: pct };
            
            if (pct > 0) positiveMonths++;
            else if (pct < 0) negativeMonths++;
        }

        return {
            invested: totalInvested,
            marketValue: totalValue,
            totalReturn,
            roi,
            cagr,
            avgContribution,
            avgDividend,
            bestMonth,
            worstMonth,
            totalDividends: last.dividends,
            positiveMonths,
            negativeMonths,
            winRate: (positiveMonths + negativeMonths) > 0 ? (positiveMonths / (positiveMonths + negativeMonths)) * 100 : 0
        };
    }, [filteredData]);

    if (!stats) return null;

    return (
        <SwipeableModal isOpen={isOpen} onClose={onClose}>
            <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
                {/* Clean Header */}
                <div className="px-6 pt-6 pb-2 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Evolução Patrimonial</h2>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Análise Detalhada</p>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-10">
                    
                    {/* Main Value Section - Very Clean */}
                    <div className="mt-4 mb-8">
                        <p className="text-sm font-bold text-zinc-400 mb-1">Patrimônio Total</p>
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                {formatBRL(stats.marketValue)}
                            </h3>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${stats.roi >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                {stats.roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="text-xs font-black">{stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs">
                            <div>
                                <span className="text-zinc-400 font-medium">Lucro: </span>
                                <span className={`font-bold ${stats.totalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {stats.totalReturn >= 0 ? '+' : ''}{formatBRL(stats.totalReturn)}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800"></div>
                            <div>
                                <span className="text-zinc-400 font-medium">Investido: </span>
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(stats.invested)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Controls - Segmented */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-between items-center">
                             {/* Type Selector */}
                            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                                <button onClick={() => setChartType('WEALTH')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${chartType === 'WEALTH' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Patrimônio</button>
                                <button onClick={() => setChartType('CASHFLOW')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${chartType === 'CASHFLOW' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Fluxo</button>
                                <button onClick={() => setChartType('RETURN')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${chartType === 'RETURN' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Retorno</button>
                            </div>
                            
                            {/* Time Range */}
                            <div className="flex gap-1">
                                {(['6M', '1Y', '2Y', '5Y', 'MAX'] as const).map(range => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-2 py-1 rounded-md text-[9px] font-bold transition-colors ${timeRange === range ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chart Container - Minimalist */}
                        <div className="h-64 w-full -mx-2">
                            <ResponsiveContainer width="100%" height="100%">
                                {chartType === 'WEALTH' ? (
                                    <AreaChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={10} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(val) => `R$${val/1000}k`} />
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px', padding: '12px', backdropFilter: 'blur(12px)' }}
                                            formatter={(value: number, name: string) => [formatBRL(value), name === 'marketValue' ? 'Patrimônio' : 'Investido']}
                                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontWeight: 700 }}
                                        />
                                        <Area type="monotone" dataKey="marketValue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorWealth)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                                        <Line type="monotone" dataKey="invested" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} />
                                    </AreaChart>
                                ) : chartType === 'CASHFLOW' ? (
                                    <ComposedChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={10} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(val) => `R$${val/1000}k`} />
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px', padding: '12px', backdropFilter: 'blur(12px)' }}
                                            formatter={(value: number, name: string) => [formatBRL(value), name === 'contribution' ? 'Aporte Líquido' : 'Dividendos']}
                                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontWeight: 700 }}
                                        />
                                        <Bar dataKey="contribution" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                        <Line type="monotone" dataKey="dividend" stroke="#10b981" strokeWidth={2} dot={{r: 3, fill: "#10b981", strokeWidth: 0}} />
                                    </ComposedChart>
                                ) : (
                                    <AreaChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={10} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(val) => `${val}%`} />
                                        <RechartsTooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px', padding: '12px', backdropFilter: 'blur(12px)' }}
                                            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Rentabilidade Acumulada']}
                                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontWeight: 700 }}
                                        />
                                        <Area type="monotone" dataKey="returnPercent" stroke="#f59e0b" strokeWidth={2} fill="url(#colorReturn)" activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }} />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Metrics Grid - Clean & Flat */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-zinc-100 dark:border-zinc-900 pt-6">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">CAGR (Anual)</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">{stats.cagr.toFixed(2)}%</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Win Rate</p>
                            <p className="text-lg font-black text-emerald-500">{stats.winRate.toFixed(0)}% <span className="text-xs text-zinc-400 font-medium">positivos</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Aporte Médio</p>
                            <p className="text-base font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(stats.avgContribution)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Proventos Totais</p>
                            <p className="text-base font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(stats.totalDividends)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Melhor Mês</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{stats.bestMonth.label}</span>
                                <span className="text-xs font-bold text-emerald-500">+{stats.bestMonth.change.toFixed(2)}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Pior Mês</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{stats.worstMonth.label}</span>
                                <span className="text-xs font-bold text-rose-500">{stats.worstMonth.change.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </SwipeableModal>
    );
};

const StoriesBar = ({ insights, onSelectStory, viewedIds }: { insights: PortfolioInsight[], onSelectStory: (story: PortfolioInsight) => void, viewedIds: Set<string> }) => {
    if (!insights || insights.length === 0) return null;

    return (
        <div className="mb-3 -mt-2 -mx-4 overflow-x-auto no-scrollbar pb-1">
            <div className="flex gap-3 px-4 pt-1">
                {insights.map((story) => {
                    const isViewed = viewedIds.has(story.id);
                    const gradient = isViewed ? 'from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-600' : getStoryGradient(story.type);
                    
                    return (
                        <button 
                            key={story.id} 
                            onClick={() => onSelectStory(story)}
                            className="flex flex-col items-center gap-1 group shrink-0 w-[64px] press-effect"
                        >
                            <div className={`w-[60px] h-[60px] p-[2px] rounded-full bg-gradient-to-tr ${gradient} relative transition-all duration-300`}>
                                <div className="w-full h-full rounded-full border-[3px] border-primary-light dark:border-primary-dark bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`}></div>
                                    {story.relatedTicker ? (
                                        <span className="text-[10px] font-black uppercase z-10 text-zinc-700 dark:text-zinc-200 tracking-tighter">
                                            {story.relatedTicker.substring(0, 4)}
                                        </span>
                                    ) : (
                                        <div className="z-10 bg-black/10 dark:bg-white/10 p-2 rounded-full">
                                            {getStoryIcon(story.type)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <span className={`text-[8px] font-medium truncate w-full text-center leading-tight ${isViewed ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                {story.relatedTicker || 'Insight'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const StoryViewer = ({ 
    isOpen, 
    stories, 
    initialStoryId, 
    onClose, 
    onViewAsset,
    onMarkAsViewed
}: { 
    isOpen: boolean, 
    stories: PortfolioInsight[], 
    initialStoryId: string | null, 
    onClose: () => void, 
    onViewAsset: (ticker: string) => void,
    onMarkAsViewed: (id: string) => void
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextStory = stories[currentIndex + 1];

    // Preload next image
    useEffect(() => {
        if (nextStory && nextStory.imageUrl) {
            const img = new Image();
            img.src = nextStory.imageUrl;
        }
    }, [nextStory]);

    useEffect(() => {
        if (isOpen && initialStoryId) {
            const idx = stories.findIndex(s => s.id === initialStoryId);
            if (idx >= 0) {
                setCurrentIndex(idx);
                setProgress(0);
                onMarkAsViewed(stories[idx].id);
            }
        }
    }, [isOpen, initialStoryId]);

    useEffect(() => {
        if (!isOpen) return;

        const STORY_DURATION = 6000;
        const INTERVAL = 50; 
        const increment = (INTERVAL / STORY_DURATION) * 100;

        const timer = setInterval(() => {
            if (!isPaused) {
                setProgress(prev => {
                    const next = prev + increment;
                    if (next >= 100) {
                        handleNext();
                        return 0;
                    }
                    return next;
                });
            }
        }, INTERVAL);

        return () => clearInterval(timer);
    }, [isOpen, isPaused, currentIndex, stories.length]); 

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setProgress(0);
            onMarkAsViewed(stories[nextIdx].id);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            const prevIdx = currentIndex - 1;
            setCurrentIndex(prevIdx);
            setProgress(0);
            onMarkAsViewed(stories[prevIdx].id);
        } else {
            setProgress(0);
        }
    };

    const handleTap = (e: React.MouseEvent) => {
        const width = window.innerWidth;
        const x = e.clientX;
        if (x < width * 0.35) handlePrev();
        else handleNext();
    };

    if (!isOpen) return null;
    const story = stories[currentIndex];
    if (!story) return null;

    const gradient = getStoryGradient(story.type);

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col animate-in fade-in duration-300 touch-none">
            {story.imageUrl && (
                <div key={story.id} className="absolute inset-0 z-0 overflow-hidden">
                    <img 
                        src={story.imageUrl} 
                        className="w-full h-full object-cover opacity-50 animate-in fade-in zoom-in-105 duration-1000 fill-mode-forwards" 
                        alt=""
                    />
                    <div className="absolute inset-0 bg-black/40"></div>
                </div>
            )}
            
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} ${story.imageUrl ? 'opacity-60 mix-blend-overlay' : 'opacity-20'} transition-colors duration-700`}></div>
            {!story.imageUrl && <div className="absolute inset-0 backdrop-blur-3xl"></div>}
            
            <div 
                className="absolute inset-0 z-10"
                onClick={handleTap}
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            ></div>

            <div className="relative z-20 flex flex-col h-full pointer-events-none">
                <div className="flex gap-1.5 px-3 pt-safe top-2 mt-2">
                    {stories.map((s, idx) => (
                        <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-100 ease-linear" 
                                style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }}
                            ></div>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-6 flex justify-between items-center mt-2 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg ring-2 ring-black/20`}>
                            {getStoryIcon(story.type)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white drop-shadow-md">{story.relatedTicker || 'Insight'}</p>
                            <p className="text-[10px] text-white/70 font-medium">InvestFIIs AI • {currentIndex + 1}/{stories.length}</p>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 active:scale-95 transition-transform"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col justify-center px-8 pb-20">
                    <h1 className="text-3xl font-black text-white leading-tight mb-6 drop-shadow-lg tracking-tight anim-slide-up">
                        {story.title}
                    </h1>
                    
                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl mb-8 relative overflow-hidden anim-scale-in">
                        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${gradient}`}></div>
                        <p className="text-lg font-medium text-white/95 leading-relaxed">
                            {story.message}
                        </p>
                    </div>

                    <div className="flex gap-3 items-center opacity-80 bg-black/20 self-start px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5 anim-fade-in">
                        <Info className="w-4 h-4 text-white" />
                        <p className="text-xs text-white font-medium">
                            {story.type === 'opportunity' ? "Analistas indicam revisão." : 
                             story.type === 'warning' ? "Atenção aos fundamentos." :
                             "Mantenha foco no longo prazo."}
                        </p>
                    </div>
                </div>

                <div className="p-6 pb-12 pointer-events-auto">
                    {story.relatedTicker ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose(); onViewAsset(story.relatedTicker!); }}
                            className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-zinc-100"
                        >
                            Ver {story.relatedTicker} <ArrowUpRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="w-full py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-bold text-sm uppercase tracking-widest backdrop-blur-md active:scale-95 transition-transform hover:bg-white/20"
                        >
                            Fechar Story
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const BentoCard = ({ title, value, subtext, icon: Icon, colorClass, onClick, className, info }: any) => (
    <button onClick={onClick} className={`relative overflow-hidden bg-white dark:bg-zinc-900 p-4 rounded-[1.5rem] flex flex-col justify-between items-start text-left shadow-lg shadow-zinc-200/50 dark:shadow-black/20 border border-zinc-100 dark:border-zinc-800 press-effect h-full min-h-[120px] group transition-all duration-300 hover:border-zinc-200 dark:hover:border-zinc-700 ${className}`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/0 to-zinc-100/50 dark:to-zinc-800/50 rounded-bl-[3rem] -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500"></div>
        
        <div className="flex justify-between w-full mb-3 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass} shadow-sm ring-4 ring-white dark:ring-zinc-900`}>
                <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-zinc-500 dark:group-hover:text-zinc-200 transition-colors">
                <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
        </div>
        <div className="relative z-10 w-full">
            <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{title}</h3>
                {info && <InfoTooltip title={title} text={info} />}
            </div>
            <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{typeof value === 'object' ? '' : value}</p>
            {subtext && <p className="text-[10px] text-zinc-500 font-bold mt-1">{subtext}</p>}
        </div>
    </button>
);

const ProgressBar = ({ current, target, label, colorClass, privacyMode }: any) => {
    const progress = Math.min(100, Math.max(0, (current / (target || 1)) * 100));
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className="text-[10px] font-black text-zinc-900 dark:text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-zinc-400 font-medium">
                <span>{formatBRL(current, privacyMode)}</span>
                <span>Meta: {formatBRL(target, privacyMode)}</span>
            </div>
        </div>
    );
};

interface HomeProps {
  portfolio: AssetPosition[];
  transactions: Transaction[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
  insights?: PortfolioInsight[];
}

const HomeComponent: React.FC<HomeProps> = ({ portfolio, transactions, dividendReceipts, salesGain, totalDividendsReceived, invested, balance, totalAppreciation, privacyMode = false, onViewAsset, insights = [] }) => {
  const [showAgenda, setShowAgenda] = useState(false);
  const [showProventos, setShowProventos] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [allocationView, setAllocationView] = useState<'CLASS' | 'ASSET' | 'SECTOR'>('CLASS');
  const [showMagicNumber, setShowMagicNumber] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [goalTab, setGoalTab] = useState<'WEALTH' | 'INCOME' | 'STRATEGY'>('WEALTH');
  
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
      try {
          const saved = localStorage.getItem('investfiis_viewed_stories');
          if (saved) {
              setViewedStories(new Set(JSON.parse(saved)));
          }
      } catch (e) { console.warn('Failed to load stories'); }
  }, []);

  const handleMarkAsViewed = (id: string) => {
      setViewedStories(prev => {
          const next = new Set(prev);
          next.add(id);
          localStorage.setItem('investfiis_viewed_stories', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const capitalGain = totalAppreciation + salesGain;
  const totalReturn = capitalGain + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
  
  const allocationData = useMemo(() => {
      let fiis = 0, stocks = 0;
      const sectorMap: Record<string, number> = {};

      const assetList = portfolio
          .map((p, idx) => {
              const v = p.quantity * (p.currentPrice || 0);
              if (p.assetType === AssetType.FII) fiis += v; else stocks += v;
              
              const sector = p.segment || 'Outros';
              sectorMap[sector] = (sectorMap[sector] || 0) + v;

              return { 
                  name: p.ticker, 
                  value: v, 
                  color: CHART_COLORS[idx % CHART_COLORS.length],
                  percent: (v / (balance || 1)) * 100,
                  sector
              };
          })
          .filter(d => d.value > 0)
          .sort((a,b) => b.value - a.value)
          .slice(0, 15);

      const byClass = [
          { name: 'FIIs', value: fiis, color: '#6366f1', percent: (fiis / (balance || 1)) * 100 }, 
          { name: 'Ações', value: stocks, color: '#0ea5e9', percent: (stocks / (balance || 1)) * 100 }
      ].filter(d => d.value > 0);

      const bySector = Object.entries(sectorMap)
          .map(([name, value], idx) => ({
              name,
              value,
              color: CHART_COLORS[(idx + 2) % CHART_COLORS.length], // Offset colors slightly
              percent: (value / (balance || 1)) * 100
          }))
          .sort((a, b) => b.value - a.value);

      return { byClass, byAsset: assetList, bySector, totals: { fiis, stocks } };
  }, [portfolio, balance]);

  const agendaData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const validReceipts = dividendReceipts.filter(d => d && (d.paymentDate || d.dateCom));
      
      const future = validReceipts
          .filter(d => (d.paymentDate && d.paymentDate >= todayStr) || (!d.paymentDate && d.dateCom >= todayStr))
          .sort((a, b) => (a.paymentDate || a.dateCom || '').localeCompare(b.paymentDate || b.dateCom || ''));
      
      const totalFuture = future.reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
      const nextPayment = future[0];
      const daysToNext = nextPayment ? getDaysUntil(nextPayment.paymentDate || nextPayment.dateCom) : 0;

      const grouped: Record<string, DividendReceipt[]> = {};
      future.forEach(item => {
          const dateRef = item.paymentDate || item.dateCom;
          if (!dateRef) return;
          const monthKey = dateRef.substring(0, 7);
          if (!grouped[monthKey]) grouped[monthKey] = [];
          grouped[monthKey].push(item);
      });

      return { list: future, grouped, totalFuture, nextPayment, daysToNext };
  }, [dividendReceipts]);

  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const historyList: { date: string, ticker: string, type: string, amount: number, paymentDate: string }[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      
      for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          groups[d.toISOString().substring(0, 7)] = 0;
      }

      let last12mTotal = 0;
      const oneYearAgoStr = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

      const sortedReceipts = [...dividendReceipts].sort((a, b) => {
          const dateA = a.paymentDate || a.dateCom;
          const dateB = b.paymentDate || b.dateCom;
          return dateB.localeCompare(dateA);
      });

      sortedReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate > todayStr) return;
          
          if (d.paymentDate >= oneYearAgoStr) last12mTotal += d.totalReceived;

          const monthKey = d.paymentDate.substring(0, 7);
          if (groups[monthKey] !== undefined) groups[monthKey] += d.totalReceived;

          historyList.push({
              date: d.paymentDate,
              ticker: d.ticker,
              type: d.type,
              amount: d.totalReceived,
              paymentDate: d.paymentDate
          });
      });
      
      const chartData = Object.entries(groups)
          .map(([date, value]) => ({ 
              date, 
              value, 
              label: getMonthName(date + '-01').substring(0,3).toUpperCase()
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

      const groupedHistory: Record<string, typeof historyList> = {};
      historyList.forEach(h => {
          const mKey = h.date.substring(0, 7);
          if (!groupedHistory[mKey]) groupedHistory[mKey] = [];
          groupedHistory[mKey].push(h);
      });

      const average = chartData.reduce((acc, cur) => acc + cur.value, 0) / 12;
      const max = Math.max(...chartData.map(d => d.value));

      return { chartData, average, max, last12mTotal, currentMonth: chartData[chartData.length - 1]?.value || 0, groupedHistory };
  }, [dividendReceipts]);

  const magicNumberData = useMemo(() => {
      const all = portfolio
          .map(asset => {
              if (asset.quantity <= 0 || !asset.currentPrice) return null;
              
              let estimatedDiv = asset.last_dividend;
              if ((!estimatedDiv || estimatedDiv <= 0) && asset.dy_12m && asset.dy_12m > 0) {
                  estimatedDiv = (asset.currentPrice * (asset.dy_12m / 100)) / 12;
              }

              if (!estimatedDiv || estimatedDiv <= 0) return null;

              const currentIncome = asset.quantity * estimatedDiv;
              const magicNumber = Math.ceil(asset.currentPrice / estimatedDiv);
              const missing = Math.max(0, magicNumber - asset.quantity);
              const buyingPower = currentIncome / asset.currentPrice;

              return {
                  ticker: asset.ticker,
                  current: asset.quantity,
                  target: magicNumber,
                  missing,
                  progress: Math.min(100, (asset.quantity / magicNumber) * 100),
                  estimatedDiv,
                  price: asset.currentPrice,
                  currentIncome,
                  buyingPower, 
                  assetType: asset.assetType
              };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.progress - a.progress);
      
      return {
          achieved: all.filter((a: any) => a.buyingPower >= 1),
          inProgress: all.filter((a: any) => a.buyingPower < 1)
      };
  }, [portfolio]);

  const magicReachedCount = magicNumberData.achieved.length;

  const goalsData = useMemo(() => {
      const safeBalance = balance || 0;
      const safeIncome = incomeData.currentMonth || 0;
      const sectors = new Set(portfolio.map(p => p.segment));
      
      const levels = [
          { level: 1, name: 'Iniciante', target: 1000 },
          { level: 2, name: 'Aprendiz', target: 5000 },
          { level: 3, name: 'Poupador', target: 10000 },
          { level: 4, name: 'Investidor', target: 25000 },
          { level: 5, name: 'Acumulador', target: 50000 },
          { level: 6, name: 'Multiplicador', target: 100000 },
          { level: 7, name: 'Barão', target: 500000 },
          { level: 8, name: 'Independente', target: 1000000 },
          { level: 9, name: 'Magnata', target: 5000000 },
      ];

      const currentLevelIdx = levels.findIndex(l => safeBalance < l.target);
      const currentLevel = levels[currentLevelIdx === -1 ? levels.length - 1 : Math.max(0, currentLevelIdx - 1)];
      const nextLevel = levels[currentLevel.level] || { ...currentLevel, target: currentLevel.target * 2 };
      const prevTarget = currentLevel.level > 1 ? levels[currentLevel.level - 2].target : 0;
      const progress = Math.min(100, ((safeBalance - prevTarget) / (nextLevel.target - prevTarget)) * 100);

      const MIN_WAGE = 1412;
      
      // Conquistas organizadas por categoria (Total 25+)
      const achievements = [
          // PATRIMÔNIO (Wealth)
          { id: 'start', cat: 'WEALTH', label: 'Primeiro Passo', sub: 'Patrimônio > R$ 0', icon: Wallet, unlocked: safeBalance > 0, color: 'from-emerald-400 to-emerald-600' },
          { id: '1k', cat: 'WEALTH', label: 'Semente', sub: 'Patrimônio > 1k', icon: Star, unlocked: safeBalance >= 1000, color: 'from-lime-400 to-emerald-500' },
          { id: '10k', cat: 'WEALTH', label: 'Clube 10k', sub: 'Patrimônio > 10k', icon: Coins, unlocked: safeBalance >= 10000, color: 'from-amber-400 to-orange-500' },
          { id: '25k', cat: 'WEALTH', label: 'Construtor', sub: 'Patrimônio > 25k', icon: Building2, unlocked: safeBalance >= 25000, color: 'from-cyan-400 to-blue-500' },
          { id: '50k', cat: 'WEALTH', label: 'Barão', sub: 'Patrimônio > 50k', icon: Gem, unlocked: safeBalance >= 50000, color: 'from-violet-400 to-purple-600' },
          { id: '100k', cat: 'WEALTH', label: 'Elite 100k', sub: 'Patrimônio > 100k', icon: Trophy, unlocked: safeBalance >= 100000, color: 'from-yellow-300 to-amber-500' },
          { id: '500k', cat: 'WEALTH', label: 'Meio Milhão', sub: 'Patrimônio > 500k', icon: Crown, unlocked: safeBalance >= 500000, color: 'from-rose-400 to-red-600' },
          { id: '1m', cat: 'WEALTH', label: 'Milionário', sub: 'Patrimônio > 1M', icon: Rocket, unlocked: safeBalance >= 1000000, color: 'from-fuchsia-500 to-pink-600' },

          // RENDA (Income)
          { id: 'income_start', cat: 'INCOME', label: 'Renda Viva', sub: 'Recebeu proventos', icon: CircleDollarSign, unlocked: safeIncome > 0, color: 'from-emerald-400 to-green-600' },
          { id: 'lunch', cat: 'INCOME', label: 'Almoço Grátis', sub: 'Renda > R$ 20', icon: Coffee, unlocked: safeIncome >= 20, color: 'from-orange-400 to-amber-600' },
          { id: 'dinner', cat: 'INCOME', label: 'Jantar Fora', sub: 'Renda > R$ 100', icon: Award, unlocked: safeIncome >= 100, color: 'from-pink-400 to-rose-500' },
          { id: 'market', cat: 'INCOME', label: 'Mercado Pago', sub: 'Renda > R$ 500', icon: ShoppingCart, unlocked: safeIncome >= 500, color: 'from-blue-400 to-indigo-600' },
          { id: 'half_wage', cat: 'INCOME', label: 'Meio Salário', sub: 'Renda > R$ 700', icon: Anchor, unlocked: safeIncome >= (MIN_WAGE/2), color: 'from-sky-400 to-cyan-600' },
          { id: 'wage', cat: 'INCOME', label: 'Aluguel Free', sub: 'Renda > 1 Salário', icon: Umbrella, unlocked: safeIncome >= MIN_WAGE, color: 'from-violet-400 to-purple-600' },
          { id: 'freedom', cat: 'INCOME', label: 'Liberdade', sub: 'Renda > R$ 3k', icon: Plane, unlocked: safeIncome >= 3000, color: 'from-teal-400 to-emerald-600' },
          { id: 'retire', cat: 'INCOME', label: 'Aposentado', sub: 'Renda > R$ 5k', icon: CheckCircle2, unlocked: safeIncome >= 5000, color: 'from-indigo-500 to-violet-700' },

          // ESTRATÉGIA (Strategy)
          { id: 'diversified', cat: 'STRATEGY', label: 'Iniciante', sub: '5+ Ativos', icon: Layers, unlocked: portfolio.length >= 5, color: 'from-blue-400 to-indigo-500' },
          { id: 'manager', cat: 'STRATEGY', label: 'Gestor', sub: '15+ Ativos', icon: Briefcase, unlocked: portfolio.length >= 15, color: 'from-slate-500 to-zinc-700' },
          { id: 'snowball', cat: 'STRATEGY', label: 'Bola de Neve', sub: '1 Ativo Infinito', icon: Snowflake, unlocked: magicReachedCount >= 1, color: 'from-cyan-400 to-blue-500' },
          { id: 'avalanche', cat: 'STRATEGY', label: 'Avalanche', sub: '5 Ativos Infinitos', icon: Zap, unlocked: magicReachedCount >= 5, color: 'from-yellow-400 to-orange-500' },
          { id: 'sectors', cat: 'STRATEGY', label: 'Rei dos Setores', sub: '5+ Setores', icon: PieIcon, unlocked: sectors.size >= 5, color: 'from-pink-400 to-rose-500' },
          { id: 'lover', cat: 'STRATEGY', label: 'FII Lover', sub: 'Mais FIIs', icon: Building2, unlocked: allocationData.totals.fiis > allocationData.totals.stocks, color: 'from-indigo-400 to-purple-500' },
          { id: 'stock_fan', cat: 'STRATEGY', label: 'Ações Fan', sub: 'Mais Ações', icon: TrendingUp, unlocked: allocationData.totals.stocks > allocationData.totals.fiis, color: 'from-sky-400 to-blue-600' },
          { id: 'fii_fan', cat: 'STRATEGY', label: 'Imobiliário', sub: 'Possui FIIs', icon: Building2, unlocked: allocationData.totals.fiis > 0, color: 'from-emerald-400 to-teal-600' },
          { id: 'balanced', cat: 'STRATEGY', label: 'Híbrido', sub: 'FIIs + Ações', icon: Target, unlocked: allocationData.totals.fiis > 0 && allocationData.totals.stocks > 0, color: 'from-amber-400 to-orange-500' }
      ];

      return { 
          currentLevel, nextLevel, progress, achievements,
          unlockedCount: achievements.filter(a => a.unlocked).length,
          totalAchievements: achievements.length,
          income: { current: safeIncome, target: safeIncome * 1.5 || 100 },
          freedom: { current: safeIncome, target: MIN_WAGE }
      };
  }, [balance, incomeData.currentMonth, magicReachedCount, portfolio.length, allocationData]);

  const filteredAchievements = useMemo(() => {
      return goalsData.achievements.filter(a => a.cat === goalTab);
  }, [goalsData, goalTab]);

  return (
    <div className="space-y-4 pb-8">
        <StoriesBar 
            insights={insights} 
            onSelectStory={(s) => setSelectedStoryId(s.id)} 
            viewedIds={viewedStories}
        />

        <div className="relative w-full min-h-[200px] rounded-[2rem] bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl shadow-black/40 group anim-fade-in">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20 mix-blend-screen animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none -ml-20 -mb-20 mix-blend-screen"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>

            <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md shadow-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Patrimônio Total</span>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center backdrop-blur-md transition-colors border border-white/5">
                            <Wallet className="w-4 h-4 text-zinc-300" />
                        </button>
                    </div>

                    <div className="flex flex-col">
                        <h1 className="text-[2.75rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-lg select-none">
                            {formatBRL(balance, privacyMode)}
                        </h1>
                        <div className="flex items-center gap-2 mt-2 ml-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Custo Total</span>
                            <span className="text-xs font-bold text-zinc-300 tabular-nums">{formatBRL(invested, privacyMode)}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-6 mt-2">
                    <div className="relative">
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Valorização</span>
                        <div className={`flex items-center gap-1.5 ${capitalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {capitalGain >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span className="text-sm font-black tabular-nums tracking-tight">
                                {capitalGain >= 0 ? '+' : ''}{formatBRL(capitalGain, privacyMode)}
                            </span>
                        </div>
                    </div>
                    <div className="relative pl-4 border-l border-white/10">
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Proventos</span>
                        <div className="flex items-center gap-1.5 text-sky-400">
                            <Coins className="w-3.5 h-3.5" />
                            <span className="text-sm font-black tabular-nums tracking-tight">
                                +{formatBRL(totalDividendsReceived, privacyMode)}
                            </span>
                        </div>
                    </div>
                    <div className="relative pl-4 border-l border-white/10">
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Retorno</span>
                        <div className={`flex items-center gap-1.5 ${totalReturn >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                            <span className="text-sm font-black tabular-nums tracking-tight">
                                {totalReturnPercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 anim-slide-up">
            <BentoCard 
                title="Agenda" 
                value={agendaData.nextPayment ? formatDateShort(agendaData.nextPayment.paymentDate || agendaData.nextPayment.dateCom) : '--'} 
                subtext={agendaData.nextPayment ? `Próx: ${agendaData.nextPayment.ticker}` : 'Sem previsões'}
                icon={CalendarClock} 
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                onClick={() => setShowAgenda(true)}
                info="Previsão de pagamentos futuros baseada nas datas 'Com' confirmadas pela B3."
            />
            
            <BentoCard 
                title="Renda" 
                value={formatBRL(incomeData.currentMonth, privacyMode)} 
                subtext="Neste Mês"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
                info="Total de proventos (Dividendos, JCP) recebidos acumulados no mês atual."
            />

            <BentoCard 
                title="Nº Mágico" 
                value={magicReachedCount.toString()} 
                subtext="Ativos Atingidos"
                icon={Sparkles} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                onClick={() => setShowMagicNumber(true)}
                info="Quantidade de cotas necessária para que os dividendos mensais comprem uma nova cota do mesmo ativo (Bola de Neve)."
            />

            <BentoCard 
                title="Objetivo" 
                value={`Nv. ${goalsData.currentLevel.level}`} 
                subtext={goalsData.currentLevel.name}
                icon={Trophy} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                onClick={() => setShowGoals(true)}
                info="Seu nível na jornada de investidor, baseado no patrimônio acumulado e metas atingidas."
            />

            <BentoCard 
                title="Evolução" 
                value="Histórico" 
                subtext="Ver Crescimento"
                icon={TrendingUp} 
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                onClick={() => setShowEvolution(true)}
                info="Acompanhe a evolução do seu patrimônio e proventos acumulados ao longo do tempo."
            />
            
            <BentoCard 
                title="Alocação" 
                value="Carteira" 
                subtext="Ver Distribuição"
                icon={PieIcon} 
                colorClass="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                onClick={() => setShowAllocation(true)}
                info="Visualize a distribuição do seu patrimônio por classe de ativos, setores e ativos individuais."
            />
        </div>

        <StoryViewer 
            isOpen={!!selectedStoryId}
            stories={insights}
            initialStoryId={selectedStoryId} 
            onClose={() => setSelectedStoryId(null)} 
            onViewAsset={(t) => { setSelectedStoryId(null); if(onViewAsset) onViewAsset(t); }} 
            onMarkAsViewed={handleMarkAsViewed}
        />
        
        <SwipeableModal isOpen={showAgenda} onClose={() => setShowAgenda(false)}>
            <div className="p-4 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-none">Agenda</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">Previsão: {formatBRL(agendaData.totalFuture, privacyMode)}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {Object.keys(agendaData.grouped).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(agendaData.grouped).map(([monthKey, items]) => (
                                <div key={monthKey}>
                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 sticky top-0 bg-white dark:bg-zinc-900 py-2 z-10 border-b border-zinc-100 dark:border-zinc-800">
                                        {getMonthName(monthKey + '-01')}
                                    </h3>
                                    <div className="space-y-0">
                                        {(items as DividendReceipt[]).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                                        {item.ticker.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                        <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-medium">
                                                            <span>Pag: {formatDateShort(item.paymentDate)}</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                                            <span>Com: {formatDateShort(item.dateCom)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatBRL(item.totalReceived, privacyMode)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <p className="text-sm font-bold text-zinc-500">Sem proventos futuros.</p>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-4 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-none">Renda</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">Últimos 12 meses: {formatBRL(incomeData.last12mTotal, privacyMode)}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="h-56 w-full mb-6 shrink-0 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-2 relative overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={incomeData.chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncomeBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(val) => `R$${val}`} />
                                <RechartsTooltip 
                                    cursor={{fill: 'rgba(16, 185, 129, 0.05)'}}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '10px', padding: '8px 12px', backdropFilter: 'blur(8px)' }}
                                    formatter={(value: number) => [formatBRL(value), 'Proventos']}
                                />
                                <Bar 
                                    dataKey="value" 
                                    fill="url(#colorIncomeBar)" 
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={32}
                                    animationDuration={1500}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#059669" 
                                    strokeWidth={2} 
                                    dot={{r: 3, fill: "#059669", strokeWidth: 2, stroke: "#fff"}} 
                                    activeDot={{ r: 5, strokeWidth: 0, fill: '#059669' }}
                                    animationDuration={2000}
                                />
                                {incomeData.average > 0 && (
                                    <ReferenceLine y={incomeData.average} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.8}>
                                        <Label value="Média" position="insideBottomRight" fill="#f59e0b" fontSize={9} fontWeight="bold" />
                                    </ReferenceLine>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <CalendarClock className="w-3 h-3" /> Histórico de Recebimentos
                        </h3>
                        {Object.keys(incomeData.groupedHistory).sort((a,b) => b.localeCompare(a)).map(monthKey => (
                            <div key={monthKey}>
                                <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                                        {getMonthName(monthKey + '-01')}
                                    </h4>
                                </div>
                                <div className="space-y-1">
                                    {incomeData.groupedHistory[monthKey].map((item, idx) => (
                                        <div key={`${item.ticker}-${idx}`} className="flex items-center justify-between py-2 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                                                    {item.ticker.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{item.ticker}</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${item.type === 'JCP' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-400">{formatDateShort(item.paymentDate)}</span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                                                +{formatBRL(item.amount, privacyMode)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* ... (outros modais sem alterações complexas de lógica, apenas de render) ... */}
        
        <SwipeableModal isOpen={showMagicNumber} onClose={() => setShowMagicNumber(false)}>
            {/* Mantido o conteúdo original, o usuário não pediu alterações de lógica aqui, apenas gráficos. */}
            <div className="p-4 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-none">Bola de Neve</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-zinc-500 font-medium">{magicReachedCount} ativos autossustentáveis.</p>
                            <InfoTooltip title="Número Mágico" text="O ponto onde a renda gerada pelo ativo paga uma nova cota dele mesmo, criando juros compostos automáticos." />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-6">
                    {magicNumberData.achieved.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Crown className="w-3 h-3" /> Conquistados (Efeito Bola de Neve Ativo)
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {magicNumberData.achieved.map((item: any) => (
                                    <div key={item.ticker} className="relative overflow-hidden p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-zinc-900 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm font-black text-zinc-900 dark:text-white">{item.ticker}</span>
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                                                {item.buyingPower.toFixed(1)}x
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-zinc-500">Renda:</span>
                                                <span className="font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(item.currentIncome, privacyMode)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-zinc-500">Cota:</span>
                                                <span className="font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(item.price, privacyMode)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-1.5 border-t border-emerald-100 dark:border-emerald-800/30">
                                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5" /> Compra +{Math.floor(item.buyingPower)} cotas/mês
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {magicNumberData.inProgress.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Target className="w-3 h-3" /> Em Progresso
                            </h3>
                            <div className="space-y-2">
                                {magicNumberData.inProgress.map((item: any) => (
                                    <div key={item.ticker} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500">
                                                    {item.ticker.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                    <p className="text-[10px] text-zinc-500 font-medium">Faltam <span className="text-zinc-900 dark:text-white font-bold">{item.missing}</span> cotas</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                                {item.progress.toFixed(0)}%
                                            </span>
                                        </div>
                                        
                                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                                            <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${item.progress}%` }}></div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-400 uppercase text-[8px] font-bold">Renda Atual</span>
                                                <span className="font-bold text-zinc-900 dark:text-white">{formatBRL(item.currentIncome, privacyMode)}</span>
                                            </div>
                                            <ArrowRight className="w-3 h-3 text-zinc-300" />
                                            <div className="flex flex-col items-end">
                                                <span className="text-zinc-400 uppercase text-[8px] font-bold">Meta (1 Cota)</span>
                                                <span className="font-bold text-zinc-900 dark:text-white">{formatBRL(item.price, privacyMode)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showGoals} onClose={() => setShowGoals(false)}>
            <div className="p-4 h-full flex flex-col anim-slide-up">
                <div className="flex flex-col gap-4 mb-6 shrink-0 bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-indigo-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                    
                    <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50 dark:ring-indigo-900/20">
                                <Trophy className="w-6 h-6" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">Nível {goalsData.currentLevel.level}</h2>
                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{goalsData.currentLevel.name}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Próximo</span>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{goalsData.nextLevel.name}</span>
                        </div>
                    </div>
                    
                    <div className="relative z-10 mt-2">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1.5">
                            <span>{formatBRL(balance, privacyMode)}</span>
                            <span className="text-indigo-500 dark:text-indigo-400">{goalsData.progress.toFixed(0)}%</span>
                            <span>{formatBRL(goalsData.nextLevel.target, privacyMode)}</span>
                        </div>
                        <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 relative" 
                                style={{ width: `${goalsData.progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-2xl mb-4 shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <button onClick={() => setGoalTab('WEALTH')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${goalTab === 'WEALTH' ? 'bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                        <Wallet className="w-3.5 h-3.5" /> Patrimônio
                    </button>
                    <button onClick={() => setGoalTab('INCOME')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${goalTab === 'INCOME' ? 'bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                        <CircleDollarSign className="w-3.5 h-3.5" /> Renda
                    </button>
                    <button onClick={() => setGoalTab('STRATEGY')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${goalTab === 'STRATEGY' ? 'bg-zinc-100 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                        <Target className="w-3.5 h-3.5" /> Estratégia
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="grid grid-cols-3 gap-2">
                        {filteredAchievements.map((achievement: any) => (
                            <div 
                                key={achievement.id} 
                                className={`relative p-3 rounded-2xl flex flex-col items-center text-center transition-all duration-500 border overflow-hidden group aspect-square justify-center ${
                                    achievement.unlocked 
                                        ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm' 
                                        : 'bg-zinc-100 dark:bg-zinc-900/50 border-transparent opacity-50 grayscale'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm relative z-10 transition-transform duration-300 group-hover:scale-110 ${
                                    achievement.unlocked 
                                        ? `bg-gradient-to-br ${achievement.color} text-white shadow-md` 
                                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                                }`}>
                                    {achievement.unlocked ? <achievement.icon className="w-5 h-5" strokeWidth={2} /> : <Lock className="w-4 h-4" />}
                                </div>
                                
                                <h4 className={`text-[10px] font-black leading-tight mb-0.5 ${achievement.unlocked ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>{achievement.label}</h4>
                                <p className="text-[8px] font-medium text-zinc-400 leading-tight line-clamp-2">{achievement.sub}</p>
                                
                                {achievement.unlocked && (
                                    <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${achievement.color} opacity-50`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
            <div className="p-4 h-full flex flex-col anim-slide-up">
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 ring-4 ring-sky-50 dark:ring-sky-900/20">
                            <PieIcon className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">Alocação</h2>
                            <p className="text-sm font-bold text-sky-600 dark:text-sky-400 mt-0.5">Diversificação da Carteira</p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 mb-6 shrink-0">
                    <button 
                        onClick={() => setAllocationView('CLASS')} 
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${allocationView === 'CLASS' ? 'bg-zinc-100 dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Classe
                    </button>
                    <button 
                        onClick={() => setAllocationView('SECTOR')} 
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${allocationView === 'SECTOR' ? 'bg-zinc-100 dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Setor
                    </button>
                    <button 
                        onClick={() => setAllocationView('ASSET')} 
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${allocationView === 'ASSET' ? 'bg-zinc-100 dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                        Ativo
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 mb-6 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-sky-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                        
                        <div className="h-64 w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset}
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="value"
                                        cornerRadius={6}
                                        stroke="none"
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {(allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset).map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color} 
                                                strokeWidth={0}
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        cursor={{fill: 'transparent'}}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-zinc-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></div>
                                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{data.name}</span>
                                                        </div>
                                                        <p className="text-lg font-black text-white tabular-nums">{formatBRL(data.value, privacyMode)}</p>
                                                        <p className="text-xs font-bold text-zinc-400">{(data.percent || 0).toFixed(1)}%</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            
                            {/* Central Info */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Investido</span>
                                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(balance, privacyMode)}</span>
                                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                    <TrendingUp className="w-3 h-3" />
                                    <span className="text-[10px] font-bold">100%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <ListFilter className="w-3 h-3" /> Detalhamento
                        </h3>
                        {(allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset).map((item, idx) => (
                            <div 
                                key={idx} 
                                className="group relative bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] duration-200 overflow-hidden"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: item.color }}></div>
                                <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-zinc-50 to-transparent dark:from-zinc-800/20 rounded-bl-full -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: item.color }}>
                                            {item.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">{item.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="h-1.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${(item as any).percent}%`, backgroundColor: item.color }}></div>
                                                </div>
                                                <span className="text-[10px] font-medium text-zinc-400">{((item as any).percent || 0).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-zinc-900 dark:text-white tabular-nums">{formatBRL(item.value, privacyMode)}</p>
                                        {allocationView === 'CLASS' && (
                                            <p className="text-[10px] font-medium text-zinc-400">
                                                {portfolio.filter(p => p.assetType === (item.name === 'Ações' ? 'STOCK' : 'FII')).length} ativos
                                            </p>
                                        )}
                                        {allocationView === 'SECTOR' && (
                                            <p className="text-[10px] font-medium text-zinc-400">
                                                {portfolio.filter(p => (p.segment || 'Outros') === item.name).length} ativos
                                            </p>
                                        )}
                                        {allocationView === 'ASSET' && (
                                            <p className="text-[10px] font-medium text-zinc-400">
                                                {formatBRL(portfolio.find(p => p.ticker === item.name)?.currentPrice || 0, privacyMode)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SwipeableModal>

        <EvolutionModal 
            isOpen={showEvolution} 
            onClose={() => setShowEvolution(false)} 
            transactions={transactions} 
            dividends={dividendReceipts}
            currentBalance={balance}
        />

    </div>
  );
};

export const Home = React.memo(HomeComponent);
