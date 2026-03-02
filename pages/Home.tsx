
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, PortfolioInsight, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, ArrowUpRight, ArrowDownLeft, Wallet, ArrowRight, Sparkles, Trophy, Anchor, Coins, Crown, Info, X, Zap, ShieldCheck, AlertTriangle, Play, Pause, TrendingUp, TrendingDown, Target, Snowflake, Layers, Medal, Rocket, Gem, Lock, Building2, Briefcase, ShoppingCart, Coffee, Plane, Star, Award, Umbrella, ZapOff, CheckCircle2, ListFilter, History, Activity, Calendar, Percent, BarChart3, Share2, ChevronDown, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area, XAxis, YAxis, ComposedChart, Bar, Line, ReferenceLine, Label, BarChart, Legend, Sector } from 'recharts';
import { formatBRL, formatDateShort, getMonthName, getDaysUntil } from '../utils/formatters';

import { MarketTicker } from '../components/MarketTicker';

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

const EvolutionModal = ({ isOpen, onClose, transactions, dividends, currentBalance, nextLevel, progress }: { 
    isOpen: boolean, 
    onClose: () => void, 
    transactions: Transaction[], 
    dividends: DividendReceipt[], 
    currentBalance: number,
    nextLevel?: { name: string, target: number },
    progress?: number
}) => {
    const [timeRange, setTimeRange] = useState<'6M' | '1Y' | '2Y' | '5Y' | 'MAX'>('MAX');
    const [chartType, setChartType] = useState<'WEALTH' | 'CASHFLOW' | 'RETURN'>('WEALTH');
    const [showTimeFilter, setShowTimeFilter] = useState(false);

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

        // --- PROJEÇÃO DE DIVIDENDOS (MÉDIA 12M) ---
        // Calcula o Yield on Cost médio dos últimos 12 meses
        // Total de dividendos recebidos nos últimos 12 meses / Valor investido médio no período
        const last12Months = fullHistory.slice(-12);
        const totalDivs12m = last12Months.reduce((acc, d) => acc + d.dividend, 0);
        const avgInvested12m = last12Months.reduce((acc, d) => acc + d.invested, 0) / (last12Months.length || 1);
        
        // Yield Anualizado Histórico
        const historicalYield = avgInvested12m > 0 ? totalDivs12m / avgInvested12m : 0;
        
        // Projeção Anual: Investido Atual * Yield Histórico
        const projectedAnnualDividends = totalInvested * historicalYield;
        const projectedMonthlyDividends = projectedAnnualDividends / 12;

        // CAGR Calculation (Approximate)
        const years = filteredData.length / 12;
        const cagr = years >= 1 && first.marketValue > 0 ? (Math.pow(totalValue / first.marketValue, 1 / years) - 1) * 100 : roi;

        // Best/Worst Month & Win Rate
        let bestMonth = { ...filteredData[0], change: 0 };
        let worstMonth = { ...filteredData[0], change: 0 };
        let positiveMonths = 0;
        let negativeMonths = 0;
        const monthlyReturns: number[] = [];

        for (let i = 1; i < filteredData.length; i++) {
            const prev = filteredData[i-1];
            const curr = filteredData[i];
            // Organic change % (excluding contribution)
            const organicGrowth = (curr.marketValue - prev.marketValue) - curr.contribution;
            const pct = prev.marketValue > 0 ? (organicGrowth / prev.marketValue) * 100 : 0;
            
            monthlyReturns.push(pct);
            
            if (pct > bestMonth.change) bestMonth = { ...curr, change: pct };
            if (pct < worstMonth.change) worstMonth = { ...curr, change: pct };
            
            if (pct > 0) positiveMonths++;
            else if (pct < 0) negativeMonths++;
        }

        // Volatility (Standard Deviation)
        const avgMonthlyReturn = monthlyReturns.length > 0 ? monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length : 0;
        const variance = monthlyReturns.length > 0 ? monthlyReturns.reduce((a, b) => a + Math.pow(b - avgMonthlyReturn, 2), 0) / monthlyReturns.length : 0;
        const volatility = Math.sqrt(variance);

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
            avgMonthlyReturn,
            volatility,
            winRate: (positiveMonths + negativeMonths) > 0 ? (positiveMonths / (positiveMonths + negativeMonths)) * 100 : 0,
            projectedMonthlyDividends,
            projectedAnnualDividends,
            historicalYield
        };
    }, [filteredData, fullHistory]);

    if (!stats) return null;

    return (
        <SwipeableModal isOpen={isOpen} onClose={onClose}>
            <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
                {/* Clean Header - Compact */}
                <div className="px-5 pt-6 pb-2 shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Patrimônio Total</p>
                            <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                                {formatBRL(stats.marketValue)}
                            </h3>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black shadow-sm ${stats.roi >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {stats.roi >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
                        </div>
                        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Retorno Total</span>
                            <span className={`text-[10px] font-black ${stats.totalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {stats.totalReturn >= 0 ? '+' : ''}{formatBRL(stats.totalReturn)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-5 pb-8">
                    
                    {/* Chart Section - Compact */}
                    <div className="mb-6 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-900 p-1.5 shadow-sm">
                        <div className="flex justify-between items-center p-1.5 mb-2">
                            <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 rounded-lg p-0.5 backdrop-blur-sm">
                                <button onClick={() => setChartType('WEALTH')} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${chartType === 'WEALTH' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Patrimônio</button>
                                <button onClick={() => setChartType('CASHFLOW')} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${chartType === 'CASHFLOW' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Fluxo</button>
                                <button onClick={() => setChartType('RETURN')} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${chartType === 'RETURN' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Retorno</button>
                            </div>

                            <div className="relative">
                                <button 
                                    onClick={() => setShowTimeFilter(!showTimeFilter)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 text-[8px] font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                                >
                                    <Calendar className="w-2.5 h-2.5 text-indigo-500" />
                                    {timeRange === 'MAX' ? 'Tudo' : timeRange}
                                    <ChevronDown className={`w-2 h-2 transition-transform duration-300 ${showTimeFilter ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showTimeFilter && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                            className="absolute right-0 mt-1 w-24 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-1 z-50 backdrop-blur-xl"
                                        >
                                            {(['6M', '1Y', '2Y', '5Y', 'MAX'] as const).map((range) => (
                                                <button
                                                    key={range}
                                                    onClick={() => {
                                                        setTimeRange(range);
                                                        setShowTimeFilter(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 rounded-md text-[8px] font-black uppercase transition-all ${timeRange === range ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                                                >
                                                    {range === 'MAX' ? 'Tudo' : range}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="h-48 w-full relative px-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={chartType}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="w-full h-full"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'WEALTH' ? (
                                            <ComposedChart data={filteredData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorWealthBar" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorWealthArea" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.05} />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a', fontWeight: 700 }} dy={5} minTickGap={20} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a' }} tickFormatter={(val) => `R$${val/1000}k`} />
                                                <RechartsTooltip 
                                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px', backdropFilter: 'blur(16px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                                    formatter={(value: number, name: string) => [formatBRL(value), name === 'marketValue' ? 'Patrimônio' : 'Investido']}
                                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                                />
                                                <Area type="monotone" dataKey="marketValue" stroke="none" fill="url(#colorWealthArea)" tooltipType="none" />
                                                <Bar dataKey="marketValue" fill="url(#colorWealthBar)" radius={[4, 4, 0, 0]} maxBarSize={16} animationDuration={1000} tooltipType="none" />
                                                <Line type="monotone" dataKey="marketValue" stroke="#6366f1" strokeWidth={2} dot={{ r: 2, fill: '#6366f1', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 4, strokeWidth: 0, fill: '#6366f1' }} animationDuration={1500} />
                                                <Line type="monotone" dataKey="invested" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} opacity={0.6} />
                                            </ComposedChart>
                                        ) : chartType === 'CASHFLOW' ? (
                                            <ComposedChart data={filteredData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorCashBar" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.05} />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a', fontWeight: 700 }} dy={5} minTickGap={20} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a' }} tickFormatter={(val) => `R$${val/1000}k`} />
                                                <RechartsTooltip 
                                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px', backdropFilter: 'blur(16px)' }}
                                                    formatter={(value: number, name: string) => [formatBRL(value), name === 'contribution' ? 'Aporte Líquido' : 'Dividendos']}
                                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                                />
                                                <Bar dataKey="contribution" fill="url(#colorCashBar)" radius={[4, 4, 0, 0]} maxBarSize={16} animationDuration={1000} />
                                                <Line type="monotone" dataKey="contribution" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="3 3" dot={false} opacity={0.4} tooltipType="none" />
                                                <Line type="monotone" dataKey="dividend" stroke="#10b981" strokeWidth={2} dot={{r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#fff"}} activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }} animationDuration={1500} />
                                            </ComposedChart>
                                        ) : (
                                            <ComposedChart data={filteredData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorReturnBar" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorReturnArea" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.05} />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a', fontWeight: 700 }} dy={5} minTickGap={20} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a' }} tickFormatter={(val) => `${val}%`} />
                                                <RechartsTooltip 
                                                    cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px', backdropFilter: 'blur(16px)' }}
                                                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Rentabilidade Acumulada']}
                                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                                />
                                                <Area type="monotone" dataKey="returnPercent" stroke="none" fill="url(#colorReturnArea)" tooltipType="none" />
                                                <Bar dataKey="returnPercent" fill="url(#colorReturnBar)" radius={[4, 4, 0, 0]} maxBarSize={16} animationDuration={1000} tooltipType="none" />
                                                <Line type="monotone" dataKey="returnPercent" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0, fill: '#f59e0b' }} animationDuration={1500} />
                                                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                                            </ComposedChart>
                                        )}
                                    </ResponsiveContainer>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Unified Metrics Grid - Compact */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Investido</p>
                            <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 tracking-tight truncate">{formatBRL(stats.invested)}</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">CAGR</p>
                            <p className="text-xs font-black text-indigo-500 tracking-tight">{stats.cagr.toFixed(2)}%</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Volatilidade</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-white tracking-tight">{stats.volatility.toFixed(2)}%</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Win Rate</p>
                            <p className="text-xs font-black text-emerald-500 tracking-tight">{stats.winRate.toFixed(0)}%</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Ret. Médio</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-white tracking-tight">{stats.avgMonthlyReturn.toFixed(2)}%</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Proventos</p>
                            <p className="text-xs font-black text-indigo-500 tracking-tight truncate">{formatBRL(stats.totalDividends)}</p>
                        </div>
                    </div>
                    
                    {/* Projeção de Dividendos - Horizontal Compact */}
                    <div className="mb-4 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-3 relative overflow-hidden flex items-center justify-between">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8"></div>
                        
                        <div className="flex items-center gap-3 z-10">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Coins className="w-4 h-4" />
                            </div>
                            <div>
                                <h5 className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Renda Projetada (Mês)</h5>
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">{formatBRL(stats.projectedMonthlyDividends)}</p>
                            </div>
                        </div>
                        
                        <div className="text-right z-10">
                            <p className="text-[8px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">Yield Histórico</p>
                            <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 tracking-tight">{(stats.historicalYield * 100).toFixed(2)}%</p>
                        </div>
                    </div>

                    {/* Goal Progress - Compact Banner */}
                    {nextLevel && (
                        <div className="p-4 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs shrink-0">
                                {(progress || 0).toFixed(0)}%
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-100">Próxima Meta: {nextLevel.name}</p>
                                    <span className="text-[9px] font-bold text-white">{formatBRL(Math.max(0, nextLevel.target - currentBalance))} restantes</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress || 0}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-white rounded-full"
                                    ></motion.div>
                                </div>
                            </div>
                        </div>
                    )}

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
    const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const isLongPressRef = React.useRef(false);

    // Initialize index based on ID
    useEffect(() => {
        if (isOpen && initialStoryId) {
            const idx = stories.findIndex(s => s.id === initialStoryId);
            if (idx >= 0) {
                setCurrentIndex(idx);
                setProgress(0);
                onMarkAsViewed(stories[idx].id);
            }
        } else if (isOpen) {
            setCurrentIndex(0);
            setProgress(0);
        }
    }, [isOpen, initialStoryId]);

    // Timer Logic
    useEffect(() => {
        if (!isOpen || isPaused) return;

        const DURATION = 5000; // 5 seconds per story
        const INTERVAL = 50;
        const STEP = (INTERVAL / DURATION) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                const next = prev + STEP;
                if (next >= 100) {
                    handleNext();
                    return 0;
                }
                return next;
            });
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

    const handlePointerDown = () => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setIsPaused(true);
        }, 200); // 200ms threshold for long press
    };

    const handlePointerUp = (e: React.PointerEvent, action: 'prev' | 'next') => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        
        setIsPaused(false);

        if (!isLongPressRef.current) {
            if (action === 'prev') handlePrev();
            else handleNext();
        }
    };

    // Preload next image
    useEffect(() => {
        if (currentIndex < stories.length - 1) {
            const nextStory = stories[currentIndex + 1];
            if (nextStory.imageUrl) {
                const img = new Image();
                img.src = nextStory.imageUrl;
            }
        }
    }, [currentIndex, stories]);

    if (!isOpen) return null;
    const story = stories[currentIndex];
    if (!story) return null;

    const gradient = getStoryGradient(story.type);

    return createPortal(
        <AnimatePresence mode='wait'>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] bg-black flex flex-col touch-none select-none"
                >
                    {/* Background Image/Gradient Layer */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <AnimatePresence mode='popLayout'>
                            <motion.div 
                                key={story.id}
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 w-full h-full"
                            >
                                {story.imageUrl ? (
                                    <>
                                        <img 
                                            src={story.imageUrl} 
                                            className="w-full h-full object-cover opacity-60" 
                                            alt=""
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
                                    </>
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-20`}></div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                        
                        {/* Dynamic Overlay Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} mix-blend-overlay opacity-40 transition-colors duration-700`}></div>
                        <div className="absolute inset-0 backdrop-blur-3xl opacity-30"></div>
                    </div>
                    
                    {/* Tap Areas for Navigation */}
                    <div className="absolute inset-0 z-10 flex">
                        <div 
                            className="w-[30%] h-full active:bg-white/5 transition-colors"
                            onPointerDown={handlePointerDown}
                            onPointerUp={(e) => handlePointerUp(e, 'prev')}
                        ></div>
                        <div 
                            className="w-[70%] h-full active:bg-white/5 transition-colors"
                            onPointerDown={handlePointerDown}
                            onPointerUp={(e) => handlePointerUp(e, 'next')}
                        ></div>
                    </div>

                    {/* Content Layer */}
                    <div className="relative z-20 flex flex-col h-full pointer-events-none">
                        {/* Progress Bars */}
                        <div className="flex gap-1.5 px-3 pt-safe top-2 mt-4">
                            {stories.map((s, idx) => (
                                <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div 
                                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                        initial={{ width: idx < currentIndex ? '100%' : '0%' }}
                                        animate={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }}
                                        transition={{ ease: "linear", duration: 0 }} // Direct control via state
                                    ></motion.div>
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="px-4 py-6 flex justify-between items-center mt-2 pointer-events-auto">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg ring-2 ring-white/20 backdrop-blur-md`}>
                                    {getStoryIcon(story.type)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white drop-shadow-md">{story.relatedTicker || 'Insight'}</p>
                                        {story.id.includes('ai-insight') && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-widest border border-white/20">IA</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-white/80 font-medium">InvestFIIs AI • {currentIndex + 1} de {stories.length}</p>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 active:scale-95 transition-transform hover:bg-white/10"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Story Content */}
                        <div className="flex-1 flex flex-col justify-center px-6 pb-20">
                            <AnimatePresence mode='wait'>
                                <motion.div
                                    key={story.id}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="flex flex-col"
                                >
                                    <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-8 drop-shadow-xl tracking-tight">
                                        {story.title}
                                    </h1>
                                    
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl mb-8 relative overflow-hidden group">
                                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${gradient}`}></div>
                                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700"></div>
                                        <p className="text-lg md:text-xl font-medium text-white/95 leading-relaxed relative z-10">
                                            {story.message}
                                        </p>
                                    </div>

                                    <div className="flex gap-3 items-center opacity-90 bg-black/40 self-start px-4 py-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                                        <Info className="w-4 h-4 text-white" />
                                        <p className="text-xs text-white font-bold tracking-wide">
                                            {story.type === 'opportunity' ? "Analistas indicam revisão." : 
                                             story.type === 'warning' ? "Atenção aos fundamentos." :
                                             "Mantenha foco no longo prazo."}
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        
                        {/* CTA Button (if applicable) */}
                        {story.relatedTicker ? (
                             <div className="px-6 pb-10 pointer-events-auto">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onClose(); onViewAsset(story.relatedTicker!); }}
                                    className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-zinc-100"
                                >
                                    Ver Detalhes do Ativo <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="px-6 pb-10 pointer-events-auto">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                                    className="w-full py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-bold text-sm uppercase tracking-widest backdrop-blur-md active:scale-95 transition-transform hover:bg-white/20 shadow-lg"
                                >
                                    Fechar Story
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const BentoCard = ({ title, value, subtext, icon: Icon, colorClass, onClick, className, info }: any) => (
    <motion.button 
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick} 
        className={`relative overflow-hidden bg-white dark:bg-zinc-900 p-4 rounded-[1.5rem] flex flex-col justify-between items-start text-left shadow-lg shadow-zinc-200/50 dark:shadow-black/20 border border-zinc-100 dark:border-zinc-800 press-effect h-full min-h-[120px] group transition-all duration-300 hover:border-zinc-200 dark:hover:border-zinc-700 ${className}`}
    >
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
    </motion.button>
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
  marketDividends: DividendReceipt[]; // Added prop
  salesGain: number;
  totalDividendsReceived: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
  insights?: PortfolioInsight[];
}

const HomeComponent: React.FC<HomeProps> = ({ portfolio, transactions, dividendReceipts, marketDividends = [], salesGain, totalDividendsReceived, invested, balance, totalAppreciation, privacyMode = false, onViewAsset, insights = [] }) => {
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

  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    return (
      <g>
        <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} className="text-xs font-black uppercase tracking-widest">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={10} textAnchor="middle" fill={fill} className="text-[10px] font-bold opacity-80">
          {formatBRL(value)}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 4}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={innerRadius - 4}
          outerRadius={innerRadius}
          fill={fill}
        />
      </g>
    );
  };

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
      
      // 1. Filtra dividendos de mercado apenas para ativos na carteira ATUAL
      const myTickers = new Set(portfolio.map(p => p.ticker));
      const relevantDividends = marketDividends.filter(d => myTickers.has(d.ticker));

      // 2. Filtra eventos futuros (Pagamento >= Hoje OU (Sem Pagamento e DataCom >= Hoje))
      const future = relevantDividends.filter(d => {
          const payDate = d.paymentDate;
          const dateCom = d.dateCom;
          
          if (payDate && payDate !== 'A Definir' && payDate >= todayStr) return true;
          if ((!payDate || payDate === 'A Definir') && dateCom && dateCom >= todayStr) return true;
          return false;
      });

      // 3. Calcula projeção baseada na quantidade ATUAL (Agenda = Previsão)
      const list = future.map(d => {
          const asset = portfolio.find(p => p.ticker === d.ticker);
          const qty = asset ? asset.quantity : 0;
          return {
              ...d,
              quantityOwned: qty,
              totalReceived: qty * d.rate, // Valor projetado com a carteira de hoje
              isSimulated: true
          };
      }).filter(d => d.quantityOwned > 0) // Mostra apenas se tiver quantidade
      .sort((a, b) => {
          const dateA = (a.paymentDate && a.paymentDate !== 'A Definir') ? a.paymentDate : a.dateCom;
          const dateB = (b.paymentDate && b.paymentDate !== 'A Definir') ? b.paymentDate : b.dateCom;
          return dateA.localeCompare(dateB);
      });

      const totalFuture = list.reduce((acc, curr) => acc + curr.totalReceived, 0);
      const nextPayment = list[0] || null;
      
      const grouped: Record<string, typeof list> = {};
      list.forEach(item => {
          const dateRef = (item.paymentDate && item.paymentDate !== 'A Definir') ? item.paymentDate : item.dateCom;
          const monthKey = dateRef.substring(0, 7);
          if (!grouped[monthKey]) grouped[monthKey] = [];
          grouped[monthKey].push(item);
      });

      return { list, grouped, totalFuture, nextPayment };
  }, [marketDividends, portfolio]);

  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const historyList: { date: string, ticker: string, type: string, amount: number, paymentDate: string, status: 'paid' | 'provisioned' }[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Inicializa últimos 12 meses + meses futuros encontrados
      const allDates = dividendReceipts.map(d => d.paymentDate).filter(d => d && d !== 'A Definir').sort();
      const minDate = new Date(); 
      minDate.setMonth(minDate.getMonth() - 11);
      
      // Garante chaves para o gráfico
      for (let i = 0; i < 12; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          groups[d.toISOString().substring(0, 7)] = 0;
      }

      let last12mTotal = 0;
      let provisionedTotal = 0;
      const oneYearAgoStr = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

      const sortedReceipts = [...dividendReceipts].sort((a, b) => {
          const dateA = a.paymentDate || a.dateCom;
          const dateB = b.paymentDate || b.dateCom;
          return dateB.localeCompare(dateA);
      });

      sortedReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate === 'A Definir') return;
          
          const isFuture = d.paymentDate > todayStr;
          const status = isFuture ? 'provisioned' : 'paid';

          if (isFuture) {
              provisionedTotal += d.totalReceived;
          } else {
              if (d.paymentDate >= oneYearAgoStr) last12mTotal += d.totalReceived;
          }

          const monthKey = d.paymentDate.substring(0, 7);
          // Adiciona ao grupo (cria se não existir, pois pode ser futuro)
          if (groups[monthKey] === undefined) groups[monthKey] = 0;
          groups[monthKey] += d.totalReceived;

          historyList.push({
              date: d.paymentDate,
              ticker: d.ticker,
              type: d.type,
              amount: d.totalReceived,
              paymentDate: d.paymentDate,
              status
          });
      });
      
      const chartData = Object.entries(groups)
          .map(([date, value]) => ({ 
              date, 
              value, 
              label: getMonthName(date + '-01').substring(0,3).toUpperCase(),
              isFuture: date > todayStr.substring(0, 7)
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

      const groupedHistory: Record<string, typeof historyList> = {};
      historyList.forEach(h => {
          const mKey = h.date.substring(0, 7);
          if (!groupedHistory[mKey]) groupedHistory[mKey] = [];
          groupedHistory[mKey].push(h);
      });

      // Calcula média apenas dos meses passados/fechados para não distorcer
      const pastMonths = chartData.filter(d => !d.isFuture);
      const average = pastMonths.length > 0 ? pastMonths.reduce((acc, cur) => acc + cur.value, 0) / pastMonths.length : 0;
      const max = Math.max(...chartData.map(d => d.value));
      
      // Current Month Total (Paid + Provisioned)
      const currentMonthKey = todayStr.substring(0, 7);
      const currentMonth = groups[currentMonthKey] || 0;

      return { chartData, average, max, last12mTotal, provisionedTotal, currentMonth, groupedHistory };
  }, [dividendReceipts]);

  const dividendsByAsset = useMemo(() => {
      return portfolio
          .map((asset, index) => ({
              name: asset.ticker,
              value: asset.totalDividends || 0,
              color: CHART_COLORS[index % CHART_COLORS.length]
          }))
          .filter(d => d.value > 0)
          .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const [incomeHistoryTab, setIncomeHistoryTab] = useState<'MONTHLY' | 'ANNUAL' | 'PROVENTOS'>('PROVENTOS');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (monthKey: string) => {
      setExpandedMonths(prev => {
          const next = new Set(prev);
          if (next.has(monthKey)) next.delete(monthKey);
          else next.add(monthKey);
          return next;
      });
  };

  const annualIncomeData = useMemo(() => {
      const years: Record<string, { total: number, months: Set<string> }> = {};
      
      if (incomeData?.groupedHistory) {
          Object.entries(incomeData.groupedHistory).forEach(([monthKey, items]) => {
              const year = monthKey.substring(0, 4);
              const monthTotal = items.reduce((acc, item) => acc + item.amount, 0); // item has 'amount', not 'value'
              
              if (!years[year]) years[year] = { total: 0, months: new Set() };
              years[year].total += monthTotal;
              years[year].months.add(monthKey);
          });
      }
      
      return Object.entries(years).map(([year, data]) => ({
          year,
          total: data.total,
          average: data.total / (data.months.size || 1)
      })).sort((a, b) => b.year.localeCompare(a.year));
  }, [incomeData]);

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
      try {
          const safeBalance = balance || 0;
          const safeIncome = (incomeData && incomeData.currentMonth) || 0;
          const safePortfolio = portfolio || [];
          const sectors = new Set(safePortfolio.map(p => p.segment || 'Geral'));
          
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
          const safeMagicCount = magicReachedCount || 0;
          const safeAlloc = allocationData || { totals: { fiis: 0, stocks: 0 } };
          
          // Conquistas organizadas por categoria (Total 25+)
          const achievements = [
              // PATRIMÔNIO (Wealth)
              { id: 'start', cat: 'WEALTH', label: 'Primeiro Passo', sub: 'Patrimônio > R$ 0', icon: Wallet, unlocked: safeBalance > 0, color: 'from-emerald-400 to-emerald-600' },
              { id: '100r', cat: 'WEALTH', label: 'Cem Reais', sub: 'Patrimônio > R$ 100', icon: Coins, unlocked: safeBalance >= 100, color: 'from-emerald-300 to-teal-500' },
              { id: '500r', cat: 'WEALTH', label: 'Quinhentos', sub: 'Patrimônio > R$ 500', icon: Coins, unlocked: safeBalance >= 500, color: 'from-teal-400 to-emerald-600' },
              { id: '1k', cat: 'WEALTH', label: 'Semente', sub: 'Patrimônio > 1k', icon: Star, unlocked: safeBalance >= 1000, color: 'from-lime-400 to-emerald-500' },
              { id: '5k', cat: 'WEALTH', label: 'Jardineiro', sub: 'Patrimônio > 5k', icon: Star, unlocked: safeBalance >= 5000, color: 'from-green-400 to-emerald-600' },
              { id: '10k', cat: 'WEALTH', label: 'Clube 10k', sub: 'Patrimônio > 10k', icon: Coins, unlocked: safeBalance >= 10000, color: 'from-amber-400 to-orange-500' },
              { id: '25k', cat: 'WEALTH', label: 'Construtor', sub: 'Patrimônio > 25k', icon: Building2, unlocked: safeBalance >= 25000, color: 'from-cyan-400 to-blue-500' },
              { id: '50k', cat: 'WEALTH', label: 'Barão', sub: 'Patrimônio > 50k', icon: Gem, unlocked: safeBalance >= 50000, color: 'from-violet-400 to-purple-600' },
              { id: '100k', cat: 'WEALTH', label: 'Elite 100k', sub: 'Patrimônio > 100k', icon: Trophy, unlocked: safeBalance >= 100000, color: 'from-yellow-300 to-amber-500' },
              { id: '500k', cat: 'WEALTH', label: 'Meio Milhão', sub: 'Patrimônio > 500k', icon: Crown, unlocked: safeBalance >= 500000, color: 'from-rose-400 to-red-600' },
              { id: '1m', cat: 'WEALTH', label: 'Milionário', sub: 'Patrimônio > 1M', icon: Rocket, unlocked: safeBalance >= 1000000, color: 'from-fuchsia-500 to-pink-600' },

              // RENDA (Income)
              { id: 'income_start', cat: 'INCOME', label: 'Renda Viva', sub: 'Recebeu proventos', icon: CircleDollarSign, unlocked: safeIncome > 0, color: 'from-emerald-400 to-green-600' },
              { id: 'cafe', cat: 'INCOME', label: 'Cafezinho', sub: 'Renda > R$ 5', icon: Coffee, unlocked: safeIncome >= 5, color: 'from-amber-300 to-orange-500' },
              { id: 'passagem', cat: 'INCOME', label: 'Passagem', sub: 'Renda > R$ 10', icon: Plane, unlocked: safeIncome >= 10, color: 'from-orange-400 to-red-500' },
              { id: 'lunch', cat: 'INCOME', label: 'Almoço Grátis', sub: 'Renda > R$ 20', icon: Coffee, unlocked: safeIncome >= 20, color: 'from-orange-400 to-amber-600' },
              { id: 'streaming', cat: 'INCOME', label: 'Streaming', sub: 'Renda > R$ 50', icon: Play, unlocked: safeIncome >= 50, color: 'from-indigo-400 to-blue-600' },
              { id: 'dinner', cat: 'INCOME', label: 'Jantar Fora', sub: 'Renda > R$ 100', icon: Award, unlocked: safeIncome >= 100, color: 'from-pink-400 to-rose-500' },
              { id: 'market', cat: 'INCOME', label: 'Mercado Pago', sub: 'Renda > R$ 500', icon: ShoppingCart, unlocked: safeIncome >= 500, color: 'from-blue-400 to-indigo-600' },
              { id: 'half_wage', cat: 'INCOME', label: 'Meio Salário', sub: 'Renda > R$ 700', icon: Anchor, unlocked: safeIncome >= (MIN_WAGE/2), color: 'from-sky-400 to-cyan-600' },
              { id: 'wage', cat: 'INCOME', label: 'Aluguel Free', sub: 'Renda > 1 Salário', icon: Umbrella, unlocked: safeIncome >= MIN_WAGE, color: 'from-violet-400 to-purple-600' },
              { id: 'freedom', cat: 'INCOME', label: 'Liberdade', sub: 'Renda > R$ 3k', icon: Plane, unlocked: safeIncome >= 3000, color: 'from-teal-400 to-emerald-600' },
              { id: 'retire', cat: 'INCOME', label: 'Aposentado', sub: 'Renda > R$ 5k', icon: CheckCircle2, unlocked: safeIncome >= 5000, color: 'from-indigo-500 to-violet-700' },

              // ESTRATÉGIA (Strategy)
              { id: 'first_asset', cat: 'STRATEGY', label: 'Pé na Porta', sub: '1+ Ativo', icon: Target, unlocked: safePortfolio.length >= 1, color: 'from-emerald-400 to-teal-500' },
              { id: 'duo', cat: 'STRATEGY', label: 'Dupla Dinâmica', sub: '2+ Ativos', icon: Layers, unlocked: safePortfolio.length >= 2, color: 'from-teal-400 to-cyan-500' },
              { id: 'trio', cat: 'STRATEGY', label: 'Trio Parada Dura', sub: '3+ Ativos', icon: Layers, unlocked: safePortfolio.length >= 3, color: 'from-cyan-400 to-blue-500' },
              { id: 'diversified', cat: 'STRATEGY', label: 'Iniciante', sub: '5+ Ativos', icon: Layers, unlocked: safePortfolio.length >= 5, color: 'from-blue-400 to-indigo-500' },
              { id: 'manager', cat: 'STRATEGY', label: 'Gestor', sub: '15+ Ativos', icon: Briefcase, unlocked: safePortfolio.length >= 15, color: 'from-slate-500 to-zinc-700' },
              { id: 'sector_2', cat: 'STRATEGY', label: 'Setorista', sub: '2+ Setores', icon: PieIcon, unlocked: sectors.size >= 2, color: 'from-orange-400 to-amber-500' },
              { id: 'sectors', cat: 'STRATEGY', label: 'Rei dos Setores', sub: '5+ Setores', icon: PieIcon, unlocked: sectors.size >= 5, color: 'from-pink-400 to-rose-500' },
              { id: 'snowball', cat: 'STRATEGY', label: 'Bola de Neve', sub: '1 Ativo Infinito', icon: Snowflake, unlocked: safeMagicCount >= 1, color: 'from-cyan-400 to-blue-500' },
              { id: 'avalanche', cat: 'STRATEGY', label: 'Avalanche', sub: '5 Ativos Infinitos', icon: Zap, unlocked: safeMagicCount >= 5, color: 'from-yellow-400 to-orange-500' },
              { id: 'lover', cat: 'STRATEGY', label: 'FII Lover', sub: 'Mais FIIs', icon: Building2, unlocked: safeAlloc.totals.fiis > safeAlloc.totals.stocks, color: 'from-indigo-400 to-purple-500' },
              { id: 'stock_fan', cat: 'STRATEGY', label: 'Ações Fan', sub: 'Mais Ações', icon: TrendingUp, unlocked: safeAlloc.totals.stocks > safeAlloc.totals.fiis, color: 'from-sky-400 to-blue-600' },
              { id: 'fii_fan', cat: 'STRATEGY', label: 'Imobiliário', sub: 'Possui FIIs', icon: Building2, unlocked: safeAlloc.totals.fiis > 0, color: 'from-emerald-400 to-teal-600' },
              { id: 'balanced', cat: 'STRATEGY', label: 'Híbrido', sub: 'FIIs + Ações', icon: Target, unlocked: safeAlloc.totals.fiis > 0 && safeAlloc.totals.stocks > 0, color: 'from-amber-400 to-orange-500' }
          ];

          return { 
              currentLevel, nextLevel, progress, achievements,
              unlockedCount: achievements.filter(a => a.unlocked).length,
              totalAchievements: achievements.length,
              income: { current: safeIncome, target: safeIncome * 1.5 || 100 },
              freedom: { current: safeIncome, target: MIN_WAGE }
          };
      } catch (err) {
          console.error("Error calculating goals data:", err);
          return {
              currentLevel: { level: 1, name: 'Erro', target: 0 },
              nextLevel: { level: 2, name: 'Erro', target: 0 },
              progress: 0,
              achievements: [],
              unlockedCount: 0,
              totalAchievements: 0,
              income: { current: 0, target: 100 },
              freedom: { current: 0, target: 1412 }
          };
      }
  }, [balance, incomeData, magicReachedCount, portfolio, allocationData]);

  const filteredAchievements = useMemo(() => {
      return goalsData.achievements.filter(a => a.cat === goalTab);
  }, [goalsData, goalTab]);

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 pb-8"
    >
        <MarketTicker />
        
        <StoriesBar 
            insights={insights} 
            onSelectStory={(s) => setSelectedStoryId(s.id)} 
            viewedIds={viewedStories}
        />

        <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowEvolution(true)}
            className="relative w-full min-h-[200px] rounded-[2rem] bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl shadow-black/40 group anim-fade-in cursor-pointer transition-all duration-300"
        >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20 mix-blend-screen animate-pulse-slow group-hover:bg-indigo-600/30 transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none -ml-20 -mb-20 mix-blend-screen"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>

            <div className="relative z-10 p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md shadow-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Patrimônio Total</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center backdrop-blur-md transition-colors border border-white/5">
                            <TrendingUp className="w-4 h-4 text-zinc-300" />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h1 className="text-[2.5rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-lg select-none">
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
        </motion.div>

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
                title="Alocação" 
                value="Carteira" 
                subtext="Ver Distribuição"
                icon={PieIcon} 
                colorClass="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                onClick={() => setShowAllocation(true)}
                info="Visualize a distribuição do seu patrimônio por classe de ativos, setores e ativos individuais."
                className="col-span-2"
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
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">Previsão (Carteira Atual): {formatBRL(agendaData.totalFuture, privacyMode)}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {Object.keys(agendaData.grouped).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(agendaData.grouped).map(([monthKey, items]) => (
                                <div key={monthKey}>
                                    <div className="sticky top-0 bg-white dark:bg-zinc-900 py-2 z-10 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-violet-500" />
                                            {getMonthName(monthKey + '-01')}
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {(items as any[]).map((item, idx) => (
                                            <div key={idx} className="relative overflow-hidden p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex flex-col items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-700">
                                                            <span className="text-[8px] font-bold text-zinc-400 uppercase">{item.paymentDate ? 'PAG' : 'COM'}</span>
                                                            <span className="text-sm font-black text-zinc-900 dark:text-white">
                                                                {new Date(item.paymentDate || item.dateCom).getDate()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 uppercase">
                                                                    {item.type}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                                                {item.quantityOwned} cotas x {formatBRL(item.rate, false)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-base text-violet-600 dark:text-violet-400 tabular-nums">
                                                            {formatBRL(item.totalReceived, privacyMode)}
                                                        </p>
                                                        <p className="text-[9px] text-zinc-400 font-medium">Previsão</p>
                                                    </div>
                                                </div>
                                                {item.dateCom && item.paymentDate && (
                                                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/50 flex items-center justify-between text-[9px] text-zinc-400">
                                                        <span>Data Com: {formatDateShort(item.dateCom)}</span>
                                                        <span>Pagamento: {formatDateShort(item.paymentDate)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                            <CalendarClock className="w-12 h-12 text-zinc-300 mb-3" />
                            <p className="text-sm font-bold text-zinc-500">Nenhum pagamento futuro previsto.</p>
                            <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">Os pagamentos aparecerão aqui assim que forem anunciados pelas empresas.</p>
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
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-500 font-medium">12 Meses: {formatBRL(incomeData.last12mTotal, privacyMode)}</span>
                            {incomeData.provisionedTotal > 0 && (
                                <span className="text-xs font-bold text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-1.5 rounded">
                                    +{formatBRL(incomeData.provisionedTotal, privacyMode)} Futuro
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="mb-6 shrink-0 relative group">
                        <div className="flex overflow-x-auto snap-x snap-mandatory pb-6 gap-4 no-scrollbar" id="income-charts-scroll">
                            {/* Slide 1: Evolution */}
                            <div className="min-w-full snap-center">
                                <div className="h-64 w-full rounded-2xl border border-zinc-100 dark:border-zinc-800 p-2 relative overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                                    <h3 className="absolute top-3 left-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest z-10">Evolução Mensal</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={incomeData.chartData} margin={{ top: 25, right: 5, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncomeBar" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                                                </linearGradient>
                                                <linearGradient id="colorIncomeBarFuture" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(val) => `R$${val}`} />
                                            <RechartsTooltip 
                                                cursor={{fill: 'rgba(16, 185, 129, 0.05)'}}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '10px', padding: '8px 12px', backdropFilter: 'blur(8px)' }}
                                                formatter={(value: number, name: string, props: any) => [
                                                    formatBRL(value), 
                                                    props.payload.isFuture ? 'Projetado' : 'Recebido'
                                                ]}
                                            />
                                            <Bar 
                                                dataKey="value" 
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={32}
                                                animationDuration={1500}
                                            >
                                                {incomeData.chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.isFuture ? "url(#colorIncomeBarFuture)" : "url(#colorIncomeBar)"} />
                                                ))}
                                            </Bar>
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
                            </div>

                            {/* Slide 2: Breakdown */}
                            <div className="min-w-full snap-center">
                                <div className="h-64 w-full rounded-2xl border border-zinc-100 dark:border-zinc-800 p-2 relative overflow-hidden bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
                                    <h3 className="absolute top-3 left-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest z-10">Por Ativo</h3>
                                    {dividendsByAsset.length > 0 ? (
                                        <div className="flex items-center h-full pt-4">
                                            <div className="w-[60%] h-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            activeIndex={activeIndex}
                                                            activeShape={renderActiveShape}
                                                            data={dividendsByAsset}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={55}
                                                            outerRadius={75}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            onMouseEnter={onPieEnter}
                                                            onClick={onPieEnter}
                                                        >
                                                            {dividendsByAsset.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="w-[40%] h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col justify-center gap-2">
                                                {dividendsByAsset.map((entry, index) => {
                                                    const totalVal = dividendsByAsset.reduce((acc, curr) => acc + curr.value, 0);
                                                    const percent = ((entry.value / (totalVal || 1)) * 100).toFixed(0);
                                                    
                                                    return (
                                                        <div 
                                                            key={entry.name} 
                                                            className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer ${index === activeIndex ? 'bg-zinc-50 dark:bg-zinc-800 scale-105 shadow-sm' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                                                            onMouseEnter={() => setActiveIndex(index)}
                                                            onClick={() => setActiveIndex(index)}
                                                            onTouchStart={() => setActiveIndex(index)}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                                                                <span className={`text-[9px] font-black ${index === activeIndex ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>{entry.name}</span>
                                                            </div>
                                                            <span className="text-[9px] font-bold text-zinc-400">
                                                                {percent}%
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-bold">
                                            Sem dados de proventos por ativo
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Scroll Indicators */}
                        <div className="flex flex-col items-center gap-2 mt-2">
                            <div className="flex justify-center gap-1.5 pointer-events-none">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                            </div>
                            <p className="text-[9px] text-zinc-400 text-center font-medium flex items-center justify-center gap-1">
                                <ArrowRightLeft className="w-3 h-3" /> Deslize para ver mais
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 mb-4">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                HISTÓRICO DE PROVENTOS
                            </h3>
                            <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex gap-1 w-full">
                                <button 
                                    onClick={() => setIncomeHistoryTab('PROVENTOS')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${incomeHistoryTab === 'PROVENTOS' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    Proventos
                                </button>
                                <button 
                                    onClick={() => setIncomeHistoryTab('MONTHLY')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${incomeHistoryTab === 'MONTHLY' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    Mensal
                                </button>
                                <button 
                                    onClick={() => setIncomeHistoryTab('ANNUAL')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${incomeHistoryTab === 'ANNUAL' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    Anual
                                </button>
                            </div>
                        </div>

                        {incomeHistoryTab === 'ANNUAL' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">Total de Proventos:</span>
                                    <span className="text-sm font-black text-emerald-500">{formatBRL(totalDividendsReceived, privacyMode)}</span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    <span>Ano</span>
                                    <span className="text-right">Média mensal</span>
                                    <span className="text-right">Total</span>
                                </div>
                                
                                {annualIncomeData.map(yearData => (
                                    <div key={yearData.year} className="grid grid-cols-3 gap-4 py-3 border-b border-zinc-50 dark:border-zinc-800/50 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{yearData.year}</span>
                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 text-right">{formatBRL(yearData.average, privacyMode)}</span>
                                        <span className="text-xs font-bold text-zinc-900 dark:text-white text-right">{formatBRL(yearData.total, privacyMode)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {incomeHistoryTab === 'MONTHLY' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                {(() => {
                                    const monthsByYear = Object.keys(incomeData.groupedHistory).reduce((acc, monthKey) => {
                                        const year = monthKey.substring(0, 4);
                                        if (!acc[year]) acc[year] = [];
                                        acc[year].push(monthKey);
                                        return acc;
                                    }, {} as Record<string, string[]>);
                                    
                                    const maxMonthValue = Math.max(...Object.values(incomeData.groupedHistory).map(items => items.reduce((acc, i) => acc + i.amount, 0)));

                                    return Object.keys(monthsByYear).sort((a, b) => b.localeCompare(a)).map(year => (
                                        <div key={year}>
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                <span className="text-xs font-black text-zinc-300 dark:text-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md">
                                                    {year}
                                                </span>
                                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
                                            </div>
                                            <div className="space-y-2">
                                                {monthsByYear[year].sort((a, b) => b.localeCompare(a)).map(monthKey => {
                                                    const monthItems = incomeData.groupedHistory[monthKey];
                                                    const monthTotal = monthItems.reduce((acc, item) => acc + item.amount, 0);
                                                    const isFuture = monthKey > new Date().toISOString().substring(0, 7);
                                                    const percentage = (monthTotal / (maxMonthValue || 1)) * 100;
                                                    
                                                    // Get month name without year
                                                    const date = new Date(monthKey + '-02T12:00:00'); // Safe day to avoid timezone issues
                                                    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
                                                    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

                                                    return (
                                                        <div key={monthKey} className="relative py-2 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-lg transition-colors group">
                                                            <div className="flex items-center justify-between relative z-10 mb-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 w-20">
                                                                        {capitalizedMonth}
                                                                    </span>
                                                                    {isFuture && <span className="text-[8px] font-black text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Futuro</span>}
                                                                </div>
                                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{formatBRL(monthTotal, privacyMode)}</span>
                                                            </div>
                                                            
                                                            {/* Background Bar */}
                                                            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-emerald-500 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500" 
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}

                        {incomeHistoryTab === 'PROVENTOS' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                {Object.keys(incomeData.groupedHistory).sort((a,b) => b.localeCompare(a)).map(monthKey => {
                                    const monthItems = incomeData.groupedHistory[monthKey];
                                    const isFuture = monthKey > new Date().toISOString().substring(0, 7);
                                    
                                    return (
                                        <div key={monthKey}>
                                            <div className="sticky top-0 bg-white dark:bg-zinc-900 z-10 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1 flex justify-between items-center">
                                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                                                    {getMonthName(monthKey + '-01')}
                                                </h4>
                                                {isFuture && (
                                                    <span className="text-[9px] font-bold text-sky-500 bg-sky-50 dark:bg-sky-900/20 px-1.5 py-0.5 rounded uppercase">Futuro</span>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                {monthItems.map((item, idx) => (
                                                    <div key={`${item.ticker}-${idx}`} className={`flex items-center justify-between py-2 px-2 rounded-xl transition-colors ${item.status === 'provisioned' ? 'bg-sky-50/50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border ${item.status === 'provisioned' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 border-sky-200 dark:border-sky-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}>
                                                                {item.ticker.substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{item.ticker}</span>
                                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${item.type === 'JCP' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                                        {item.type}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-zinc-400">
                                                                    {item.status === 'provisioned' ? 'Agendado: ' : 'Pago: '}
                                                                    {formatDateShort(item.paymentDate)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-bold tabular-nums ${item.status === 'provisioned' ? 'text-sky-500 opacity-80' : 'text-zinc-900 dark:text-white'}`}>
                                                            +{formatBRL(item.amount, privacyMode)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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

                <div className="flex-1 overflow-y-auto min-h-0 pb-20 no-scrollbar">
                    <div className="grid grid-cols-3 gap-1.5">
                        {filteredAchievements.map((achievement: any) => (
                            <motion.div 
                                key={achievement.id} 
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`relative p-2.5 rounded-2xl flex flex-col items-center text-center transition-all duration-500 border overflow-hidden group aspect-square justify-center ${
                                    achievement.unlocked 
                                        ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm' 
                                        : 'bg-zinc-100 dark:bg-zinc-900/50 border-transparent opacity-50 grayscale'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 shadow-sm relative z-10 transition-transform duration-300 group-hover:scale-110 ${
                                    achievement.unlocked 
                                        ? `bg-gradient-to-br ${achievement.color} text-white shadow-md` 
                                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                                }`}>
                                    {achievement.unlocked ? <achievement.icon className="w-4.5 h-4.5" strokeWidth={2} /> : <Lock className="w-3.5 h-3.5" />}
                                </div>
                                
                                <h4 className={`text-[9px] font-black leading-tight mb-0.5 ${achievement.unlocked ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>{achievement.label}</h4>
                                <p className="text-[7.5px] font-medium text-zinc-400 leading-tight line-clamp-2">{achievement.sub}</p>
                                
                                {achievement.unlocked && (
                                    <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${achievement.color} opacity-50`}></div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
            <div className="p-4 h-full flex flex-col anim-slide-up">
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Alocação</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Diversificação & Risco</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <PieIcon className="w-6 h-6" strokeWidth={2} />
                    </div>
                </div>

                <div className="flex bg-zinc-200/50 dark:bg-zinc-900 p-1.5 rounded-2xl mb-8 shrink-0">
                    {(['CLASS', 'SECTOR', 'ASSET'] as const).map((view) => (
                        <button 
                            key={view}
                            onClick={() => setAllocationView(view)} 
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationView === view ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-lg shadow-zinc-200/50 dark:shadow-none' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {view === 'CLASS' ? 'Classe' : view === 'SECTOR' ? 'Setor' : 'Ativo'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-6">
                    {/* Chart Section */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none relative overflow-hidden">
                        <div className="h-64 w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        cornerRadius={8}
                                        stroke="none"
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
                                                    <div className="bg-zinc-900/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
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
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total</span>
                                <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(balance, privacyMode)}</span>
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Detalhamento</h3>
                        {(allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset).map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: item.color }}>
                                        {item.percent.toFixed(0)}%
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-zinc-900 dark:text-white leading-none mb-1">{item.name}</p>
                                        <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">{formatBRL(item.value, privacyMode)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Concentration Risk Warning */}
                    {allocationView === 'ASSET' && allocationData.byAsset.some(a => a.percent > 20) && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <h4 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-wide mb-1">Risco de Concentração</h4>
                                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-relaxed">
                                    Alguns ativos representam mais de 20% da sua carteira. Considere diversificar para reduzir riscos.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </SwipeableModal>

        <EvolutionModal 
            isOpen={showEvolution} 
            onClose={() => setShowEvolution(false)} 
            transactions={transactions} 
            dividends={dividendReceipts}
            currentBalance={balance}
            nextLevel={goalsData.nextLevel}
            progress={goalsData.progress}
        />

    </motion.div>
  );
};

export const Home = React.memo(HomeComponent);
