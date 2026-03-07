
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, PortfolioInsight, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, ArrowUpRight, ArrowDownLeft, Wallet, ArrowRight, Sparkles, Trophy, Anchor, Coins, Crown, Info, X, Zap, ShieldCheck, AlertTriangle, Play, Pause, TrendingUp, TrendingDown, Target, Snowflake, Layers, Medal, Rocket, Gem, Lock, Building2, Briefcase, ShoppingCart, Coffee, Plane, Star, Award, Umbrella, ZapOff, CheckCircle2, ListFilter, History, Activity, Calendar, Percent, BarChart3, Share2, ChevronDown, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area, XAxis, YAxis, ComposedChart, Bar, Line, ReferenceLine, Label, BarChart, Legend, Sector } from 'recharts';
import { formatBRL, formatDateShort, getMonthName, getDaysUntil } from '../utils/formatters';

import { MarketTicker } from '../components/MarketTicker';
import { useIncomeData } from '../hooks/useIncomeData';

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

// --- EVOLUTION MODAL COMPONENT (Local) ---
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
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-zinc-900/95 border border-zinc-800 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[120px]">
                                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
                                                                    <div className="space-y-2">
                                                                        {payload.map((entry: any) => (
                                                                            <div key={entry.name} className="flex flex-col">
                                                                                <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                                                                    {entry.name === 'marketValue' ? 'Patrimônio' : 'Investido'}
                                                                                </span>
                                                                                <span className={`text-xs font-black ${entry.name === 'marketValue' ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                                                                    {formatBRL(entry.value)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
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
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-zinc-900/95 border border-zinc-800 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[120px]">
                                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
                                                                    <div className="space-y-2">
                                                                        {payload.map((entry: any) => (
                                                                            <div key={entry.name} className="flex flex-col">
                                                                                <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                                                                    {entry.name === 'contribution' ? 'Aporte Líquido' : 'Dividendos'}
                                                                                </span>
                                                                                <span className={`text-xs font-black ${entry.name === 'dividend' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                                                                    {formatBRL(entry.value)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
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
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            const value = payload[0].value as number;
                                                            return (
                                                                <div className="bg-zinc-900/95 border border-zinc-800 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[120px]">
                                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
                                                                    <div className="space-y-2">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Rentabilidade</span>
                                                                            <span className={`text-xs font-black ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                {value.toFixed(2)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
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

    const handlePointerUp = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        setIsPaused(false);
    };

    const handleClick = (e: React.MouseEvent, action: 'prev' | 'next') => {
        e.stopPropagation();
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
                            onPointerUp={handlePointerUp}
                            onClick={(e) => handleClick(e, 'prev')}
                        ></div>
                        <div 
                            className="w-[70%] h-full active:bg-white/5 transition-colors"
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onClick={(e) => handleClick(e, 'next')}
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
        <div className="mb-3 last:mb-0">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className="text-[10px] font-black text-zinc-900 dark:text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-0.5 text-[9px] text-zinc-400 font-medium">
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
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  const [goalTab, setGoalTab] = useState<'WEALTH' | 'INCOME' | 'STRATEGY'>('WEALTH');
  
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [viewerStories, setViewerStories] = useState<PortfolioInsight[]>([]);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  const sortedInsights = useMemo(() => {
      return [...insights].sort((a, b) => {
          const aViewed = viewedStories.has(a.id);
          const bViewed = viewedStories.has(b.id);
          if (aViewed === bViewed) return 0;
          return aViewed ? 1 : -1;
      });
  }, [insights, viewedStories]);

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

  const projectedDividends12m = useMemo(() => {
      return portfolio.reduce((acc, asset) => {
          if (!asset.currentPrice || !asset.quantity) return acc;
          const assetValue = asset.quantity * asset.currentPrice;
          const dy = asset.dy_12m || 0;
          return acc + (assetValue * (dy / 100));
      }, 0);
  }, [portfolio]);

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
              isSimulated: true,
              status: d.status || 'CONFIRMED'
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

  const incomeData = useIncomeData(dividendReceipts);

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
  const [evolutionRange, setEvolutionRange] = useState<'3M' | '6M' | '12M' | 'ALL'>('ALL');

  const filteredChartData = useMemo(() => {
      const data = incomeData.chartData;
      if (evolutionRange === '3M') return data.slice(-3);
      if (evolutionRange === '6M') return data.slice(-6);
      if (evolutionRange === '12M') return data.slice(-12);
      return data;
  }, [incomeData.chartData, evolutionRange]);

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
              { id: 'start', cat: 'WEALTH', label: 'Primeiro Passo', sub: 'Patrimônio > R$ 0', icon: Wallet, unlocked: safeBalance > 0, color: 'from-emerald-400 to-emerald-600', description: 'O início de uma grande jornada! Você deu o primeiro passo para construir seu patrimônio.' },
              { id: '100r', cat: 'WEALTH', label: 'Cem Reais', sub: 'Patrimônio > R$ 100', icon: Coins, unlocked: safeBalance >= 100, color: 'from-emerald-300 to-teal-500', description: 'A primeira barreira psicológica foi quebrada. R$ 100 investidos!' },
              { id: '500r', cat: 'WEALTH', label: 'Quinhentos', sub: 'Patrimônio > R$ 500', icon: Coins, unlocked: safeBalance >= 500, color: 'from-teal-400 to-emerald-600', description: 'Meio caminho andado para o primeiro milhar. Continue assim!' },
              { id: '1k', cat: 'WEALTH', label: 'Semente', sub: 'Patrimônio > 1k', icon: Star, unlocked: safeBalance >= 1000, color: 'from-lime-400 to-emerald-500', description: 'Parabéns! Você plantou sua primeira semente de R$ 1.000.' },
              { id: '5k', cat: 'WEALTH', label: 'Jardineiro', sub: 'Patrimônio > 5k', icon: Star, unlocked: safeBalance >= 5000, color: 'from-green-400 to-emerald-600', description: 'Seu jardim financeiro está crescendo. R$ 5.000 acumulados!' },
              { id: '10k', cat: 'WEALTH', label: 'Clube 10k', sub: 'Patrimônio > 10k', icon: Coins, unlocked: safeBalance >= 10000, color: 'from-amber-400 to-orange-500', description: 'Bem-vindo ao clube dos 5 dígitos! R$ 10.000 é um marco importante.' },
              { id: '25k', cat: 'WEALTH', label: 'Construtor', sub: 'Patrimônio > 25k', icon: Building2, unlocked: safeBalance >= 25000, color: 'from-cyan-400 to-blue-500', description: 'Você está construindo bases sólidas. R$ 25.000 em patrimônio.' },
              { id: '50k', cat: 'WEALTH', label: 'Barão', sub: 'Patrimônio > 50k', icon: Gem, unlocked: safeBalance >= 50000, color: 'from-violet-400 to-purple-600', description: 'Meio caminho para os 100k! Seu patrimônio já impõe respeito.' },
              { id: '100k', cat: 'WEALTH', label: 'Elite 100k', sub: 'Patrimônio > 100k', icon: Trophy, unlocked: safeBalance >= 100000, color: 'from-yellow-300 to-amber-500', description: 'Um marco lendário! R$ 100.000 acumulados. O efeito bola de neve começa a acelerar.' },
              { id: '500k', cat: 'WEALTH', label: 'Meio Milhão', sub: 'Patrimônio > 500k', icon: Crown, unlocked: safeBalance >= 500000, color: 'from-rose-400 to-red-600', description: 'Você está na metade do caminho para o milhão! Uma conquista extraordinária.' },
              { id: '1m', cat: 'WEALTH', label: 'Milionário', sub: 'Patrimônio > 1M', icon: Rocket, unlocked: safeBalance >= 1000000, color: 'from-fuchsia-500 to-pink-600', description: 'O topo da montanha! Você alcançou a liberdade financeira com R$ 1 Milhão.' },

              // RENDA (Income)
              { id: 'income_start', cat: 'INCOME', label: 'Renda Viva', sub: 'Recebeu proventos', icon: CircleDollarSign, unlocked: safeIncome > 0, color: 'from-emerald-400 to-green-600', description: 'A mágica aconteceu! Você recebeu seu primeiro provento.' },
              { id: 'cafe', cat: 'INCOME', label: 'Cafezinho', sub: 'Renda > R$ 5', icon: Coffee, unlocked: safeIncome >= 5, color: 'from-amber-300 to-orange-500', description: 'Seus investimentos já pagam um cafezinho todo mês.' },
              { id: 'passagem', cat: 'INCOME', label: 'Passagem', sub: 'Renda > R$ 10', icon: Plane, unlocked: safeIncome >= 10, color: 'from-orange-400 to-red-500', description: 'Uma passagem de ônibus ou metrô garantida pelos seus ativos.' },
              { id: 'lunch', cat: 'INCOME', label: 'Almoço Grátis', sub: 'Renda > R$ 20', icon: Coffee, unlocked: safeIncome >= 20, color: 'from-orange-400 to-amber-600', description: 'Não existe almoço grátis? Para você existe! Seus dividendos pagam.' },
              { id: 'streaming', cat: 'INCOME', label: 'Streaming', sub: 'Renda > R$ 50', icon: Play, unlocked: safeIncome >= 50, color: 'from-indigo-400 to-blue-600', description: 'Netflix, Spotify ou Prime? Seus investimentos bancam sua diversão.' },
              { id: 'dinner', cat: 'INCOME', label: 'Jantar Fora', sub: 'Renda > R$ 100', icon: Award, unlocked: safeIncome >= 100, color: 'from-pink-400 to-rose-500', description: 'Um jantar especial por conta da sua carteira de investimentos.' },
              { id: 'market', cat: 'INCOME', label: 'Mercado Pago', sub: 'Renda > R$ 500', icon: ShoppingCart, unlocked: safeIncome >= 500, color: 'from-blue-400 to-indigo-600', description: 'Uma compra de mercado garantida mensalmente pelos seus rendimentos.' },
              { id: 'half_wage', cat: 'INCOME', label: 'Meio Salário', sub: 'Renda > R$ 700', icon: Anchor, unlocked: safeIncome >= (MIN_WAGE/2), color: 'from-sky-400 to-cyan-600', description: 'Metade de um salário mínimo caindo na conta sem trabalhar.' },
              { id: 'wage', cat: 'INCOME', label: 'Aluguel Free', sub: 'Renda > 1 Salário', icon: Umbrella, unlocked: safeIncome >= MIN_WAGE, color: 'from-violet-400 to-purple-600', description: 'Liberdade geográfica! Seus rendimentos cobrem um aluguel básico.' },
              { id: 'freedom', cat: 'INCOME', label: 'Liberdade', sub: 'Renda > R$ 3k', icon: Plane, unlocked: safeIncome >= 3000, color: 'from-teal-400 to-emerald-600', description: 'R$ 3.000 mensais! Você atingiu um nível invejável de renda passiva.' },
              { id: 'retire', cat: 'INCOME', label: 'Aposentado', sub: 'Renda > R$ 5k', icon: CheckCircle2, unlocked: safeIncome >= 5000, color: 'from-indigo-500 to-violet-700', description: 'Independência Financeira! R$ 5.000 mensais cobrem o custo de vida de muitos brasileiros.' },

              // ESTRATÉGIA (Strategy)
              { id: 'first_asset', cat: 'STRATEGY', label: 'Pé na Porta', sub: '1+ Ativo', icon: Target, unlocked: safePortfolio.length >= 1, color: 'from-emerald-400 to-teal-500', description: 'Você comprou seu primeiro ativo. O jogo começou!' },
              { id: 'duo', cat: 'STRATEGY', label: 'Dupla Dinâmica', sub: '2+ Ativos', icon: Layers, unlocked: safePortfolio.length >= 2, color: 'from-teal-400 to-cyan-500', description: 'Dois ativos na carteira. A diversificação começou.' },
              { id: 'trio', cat: 'STRATEGY', label: 'Trio Parada Dura', sub: '3+ Ativos', icon: Layers, unlocked: safePortfolio.length >= 3, color: 'from-cyan-400 to-blue-500', description: 'Três ativos trabalhando para você.' },
              { id: 'diversified', cat: 'STRATEGY', label: 'Iniciante', sub: '5+ Ativos', icon: Layers, unlocked: safePortfolio.length >= 5, color: 'from-blue-400 to-indigo-500', description: 'Cinco ativos! Sua carteira está ganhando forma.' },
              { id: 'manager', cat: 'STRATEGY', label: 'Gestor', sub: '15+ Ativos', icon: Briefcase, unlocked: safePortfolio.length >= 15, color: 'from-slate-500 to-zinc-700', description: 'Uma carteira robusta com 15+ ativos. Você gerencia seu próprio fundo!' },
              { id: 'sector_2', cat: 'STRATEGY', label: 'Setorista', sub: '2+ Setores', icon: PieIcon, unlocked: sectors.size >= 2, color: 'from-orange-400 to-amber-500', description: 'Explorando novos horizontes com ativos em 2 setores diferentes.' },
              { id: 'sectors', cat: 'STRATEGY', label: 'Rei dos Setores', sub: '5+ Setores', icon: PieIcon, unlocked: sectors.size >= 5, color: 'from-pink-400 to-rose-500', description: 'Diversificação setorial avançada! 5 setores diferentes na carteira.' },
              { id: 'snowball', cat: 'STRATEGY', label: 'Bola de Neve', sub: '1 Ativo Infinito', icon: Snowflake, unlocked: safeMagicCount >= 1, color: 'from-cyan-400 to-blue-500', description: 'O efeito mágico! Um ativo já compra suas próprias cotas com dividendos.' },
              { id: 'avalanche', cat: 'STRATEGY', label: 'Avalanche', sub: '5 Ativos Infinitos', icon: Zap, unlocked: safeMagicCount >= 5, color: 'from-yellow-400 to-orange-500', description: 'Cinco ativos autossustentáveis! Sua bola de neve virou uma avalanche.' },
              { id: 'lover', cat: 'STRATEGY', label: 'FII Lover', sub: 'Mais FIIs', icon: Building2, unlocked: safeAlloc.totals.fiis > safeAlloc.totals.stocks, color: 'from-indigo-400 to-purple-500', description: 'Você ama tijolos e papel! Sua carteira tem mais FIIs que Ações.' },
              { id: 'stock_fan', cat: 'STRATEGY', label: 'Ações Fan', sub: 'Mais Ações', icon: TrendingUp, unlocked: safeAlloc.totals.stocks > safeAlloc.totals.fiis, color: 'from-sky-400 to-blue-600', description: 'Sócio de grandes empresas! Você prefere o potencial das Ações.' },
              { id: 'fii_fan', cat: 'STRATEGY', label: 'Imobiliário', sub: 'Possui FIIs', icon: Building2, unlocked: safeAlloc.totals.fiis > 0, color: 'from-emerald-400 to-teal-600', description: 'O dono da rua! Você tem investimentos no setor imobiliário.' },
              { id: 'balanced', cat: 'STRATEGY', label: 'Híbrido', sub: 'FIIs + Ações', icon: Target, unlocked: safeAlloc.totals.fiis > 0 && safeAlloc.totals.stocks > 0, color: 'from-amber-400 to-orange-500', description: 'O equilíbrio perfeito entre FIIs e Ações.' }
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
        className="space-y-2 pb-8"
    >
        <MarketTicker />
        
        <div className="-mt-3">
            <StoriesBar 
                insights={sortedInsights} 
                onSelectStory={(s) => {
                    setViewerStories(sortedInsights);
                    setSelectedStoryId(s.id);
                }} 
                viewedIds={viewedStories}
            />
        </div>

        <motion.div 
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className="relative w-full min-h-[220px] rounded-[2.5rem] bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl shadow-black/40 group anim-fade-in cursor-pointer transition-all duration-300"
            onClick={() => {
                setShowEvolution(true);
            }}
        >
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20 mix-blend-screen animate-pulse-slow group-hover:bg-indigo-600/30 transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none -ml-20 -mb-20 mix-blend-screen"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>

            <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                <div className="relative overflow-hidden h-[110px]">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md shadow-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Patrimônio Total</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center backdrop-blur-md transition-colors border border-white/5">
                                <TrendingUp className="w-4 h-4 text-zinc-300" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-5xl font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-lg select-none">
                                {formatBRL(balance, privacyMode)}
                            </h1>
                            <div className="flex items-center gap-2 mt-3 ml-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Custo Total</span>
                                <span className="text-xs font-bold text-zinc-300 tabular-nums">{formatBRL(invested, privacyMode)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 mt-5 border-t border-white/10">
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
                    <div className="relative pt-4 border-t border-white/10">
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Retorno</span>
                        <div className={`flex items-center gap-1.5 ${totalReturn >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                            <span className="text-sm font-black tabular-nums tracking-tight">
                                {totalReturnPercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                    <div className="relative pt-4 pl-4 border-t border-l border-white/10">
                        <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Projeção 12M</span>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="text-sm font-black tabular-nums tracking-tight">
                                {formatBRL(projectedDividends12m, privacyMode)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 anim-slide-up mt-2">
            <BentoCard 
                title="Agenda" 
                value={agendaData.nextPayment ? formatDateShort(agendaData.nextPayment.paymentDate || agendaData.nextPayment.dateCom) : '--'} 
                subtext={agendaData.nextPayment ? `Próx: ${agendaData.nextPayment.ticker}` : 'Sem previsões'}
                icon={CalendarClock} 
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                onClick={() => setShowAgenda(true)}
                info="Previsão de pagamentos futuros baseada nas datas 'Com' confirmadas pela B3."
            />
            
            <BentoCard 
                title="Renda" 
                value={formatBRL(incomeData.currentMonth, privacyMode)} 
                subtext="Neste Mês"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
                info="Total de proventos (Dividendos, JCP) recebidos acumulados no mês atual."
            />

            <BentoCard 
                title="Nº Mágico" 
                value={magicReachedCount.toString()} 
                subtext="Ativos Atingidos"
                icon={Sparkles} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                onClick={() => setShowMagicNumber(true)}
                info="Quantidade de cotas necessária para que os dividendos mensais comprem uma nova cota do mesmo ativo (Bola de Neve)."
            />

            <BentoCard 
                title="Objetivo" 
                value={`Nv. ${goalsData.currentLevel.level}`} 
                subtext={goalsData.currentLevel.name}
                icon={Trophy} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                onClick={() => setShowGoals(true)}
                info="Seu nível na jornada de investidor, baseado no patrimônio acumulado e metas atingidas."
            />

            {/* Redesigned Allocation Card */}
            <motion.div 
                className="col-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden cursor-pointer group"
                onClick={() => setShowAllocation(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                <PieIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white leading-none">Alocação</h3>
                                <p className="text-[10px] font-medium text-zinc-500 mt-1">
                                    {allocationData.bySector.length} Setores &bull; {portfolio.length} Ativos
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Mini Donut Chart */}
                    <div className="h-16 w-16 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocationData.byClass}
                                    innerRadius={20}
                                    outerRadius={32}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {allocationData.byClass.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Class Distribution Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {allocationData.byClass.map(item => (
                        <div key={item.name} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.name}</span>
                            </div>
                            <span className="text-xs font-black text-zinc-900 dark:text-white">{item.percent.toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>

        <StoryViewer 
            isOpen={!!selectedStoryId}
            stories={viewerStories}
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
                                                                {item.status === 'PREDICTED' && (
                                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-tighter">
                                                                        PREVISTO
                                                                    </span>
                                                                )}
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
                {/* Header */}
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Proventos</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                            Últimos 12 Meses
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/50 dark:border-emerald-800/30">
                        <CircleDollarSign className="w-6 h-6" strokeWidth={2} />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Recebido (12M)</p>
                        <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                            {formatBRL(incomeData.last12mTotal, privacyMode)}
                        </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Média Mensal</p>
                        <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                            {formatBRL(incomeData.average, privacyMode)}
                        </p>
                    </div>
                </div>

                {/* Chart Controls */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl mb-4 shrink-0">
                    {(['3M', '6M', '12M', 'ALL'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setEvolutionRange(range)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${evolutionRange === range ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {range === 'ALL' ? 'Tudo' : range}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-6">
                    {/* Charts Section - Horizontal Scroll */}
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 no-scrollbar shrink-0">
                        {/* Monthly Bar Chart */}
                        <div className="min-w-[85%] sm:min-w-[320px] h-64 bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden snap-center">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Evolução Mensal</h3>
                            {filteredChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorIncomeBar" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                                            </linearGradient>
                                            <linearGradient id="colorIncomeBarFuture" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                        <XAxis 
                                            dataKey="label" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} 
                                            dy={10} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#71717a', fontWeight: 500 }} 
                                            tickFormatter={(val) => `R$${val}`} 
                                        />
                                        <RechartsTooltip 
                                            cursor={{fill: 'rgba(16, 185, 129, 0.05)'}}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-zinc-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[120px]">
                                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">{data.date}</p>
                                                            <p className="text-lg font-black text-white tabular-nums leading-none mb-1">
                                                                {formatBRL(data.value, privacyMode)}
                                                            </p>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${data.isFuture ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                                {data.isFuture ? 'PROJETADO' : 'RECEBIDO'}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar 
                                            dataKey="value" 
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={40}
                                            animationDuration={1500}
                                        >
                                            {filteredChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.isFuture ? "url(#colorIncomeBarFuture)" : "url(#colorIncomeBar)"} />
                                            ))}
                                        </Bar>
                                        {incomeData.average > 0 && (
                                            <ReferenceLine y={incomeData.average} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6}>
                                                <Label value="Média" position="insideRight" fill="#f59e0b" fontSize={9} fontWeight="bold" dy={-10} />
                                            </ReferenceLine>
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                                    <CircleDollarSign className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs font-medium">Nenhum provento registrado</p>
                                </div>
                            )}
                        </div>

                        {/* Pie Chart - Dividends by Asset */}
                        <div className="min-w-[85%] sm:min-w-[320px] h-64 bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden snap-center flex flex-col">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Por Ativo</h3>
                            {dividendsByAsset.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dividendsByAsset}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            animationDuration={1500}
                                        >
                                            {dividendsByAsset.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-zinc-900/95 border border-white/10 p-2 rounded-lg shadow-xl backdrop-blur-md">
                                                            <p className="text-[10px] font-black text-white uppercase">{data.name}</p>
                                                            <p className="text-xs font-bold text-emerald-400">{formatBRL(data.value, privacyMode)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                                    <PieIcon className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs font-medium">Sem dados</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Histórico</h3>
                            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-0.5 rounded-lg">
                                <button 
                                    onClick={() => setIncomeHistoryTab('PROVENTOS')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${incomeHistoryTab === 'PROVENTOS' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    Lista
                                </button>
                                <button 
                                    onClick={() => setIncomeHistoryTab('MONTHLY')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${incomeHistoryTab === 'MONTHLY' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    Mensal
                                </button>
                                <button 
                                    onClick={() => setIncomeHistoryTab('ANNUAL')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${incomeHistoryTab === 'ANNUAL' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    Anual
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                            {incomeHistoryTab === 'PROVENTOS' && (
                                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                    {Object.keys(incomeData.groupedHistory).length > 0 ? (
                                        Object.keys(incomeData.groupedHistory).sort((a,b) => b.localeCompare(a)).map(monthKey => (
                                            <div key={monthKey}>
                                                <div className="sticky top-0 bg-zinc-50/95 dark:bg-zinc-800/95 backdrop-blur-sm z-10 py-1.5 px-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                        {getMonthName(monthKey + '-01')}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-zinc-400">
                                                        {formatBRL(incomeData.groupedHistory[monthKey].reduce((acc, item) => acc + item.amount, 0), privacyMode)}
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                                    {incomeData.groupedHistory[monthKey].map((item, idx) => (
                                                        <div key={`${item.ticker}-${idx}`} className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black border ${item.status === 'provisioned' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 border-blue-100 dark:border-blue-800/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}>
                                                                    {item.ticker.substring(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{item.ticker}</span>
                                                                        <span className={`text-[7px] font-bold px-1 py-0.5 rounded uppercase ${item.type === 'JCP' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                                            {item.type}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[9px] text-zinc-400">
                                                                        {formatDateShort(item.paymentDate)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs font-bold tabular-nums ${item.status === 'provisioned' ? 'text-blue-500' : 'text-zinc-900 dark:text-white'}`}>
                                                                +{formatBRL(item.amount, privacyMode)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-zinc-400 text-xs font-medium">
                                            Nenhum histórico disponível
                                        </div>
                                    )}
                                </div>
                            )}

                            {incomeHistoryTab === 'MONTHLY' && (
                                <div className="p-4 space-y-6">
                                    {(() => {
                                        const years = Object.keys(incomeData.groupedHistory).reduce((acc, key) => {
                                            const y = key.substring(0, 4);
                                            if (!acc.includes(y)) acc.push(y);
                                            return acc;
                                        }, [] as string[]).sort().reverse();

                                        const maxVal = Math.max(...Object.values(incomeData.groupedHistory).map(l => l.reduce((s, i) => s + i.amount, 0)));

                                        if (years.length === 0) {
                                            return (
                                                <div className="text-center text-zinc-400 text-xs font-medium">
                                                    Nenhum dado mensal disponível
                                                </div>
                                            );
                                        }

                                        return years.map(year => (
                                            <div key={year} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-zinc-300 dark:text-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{year}</span>
                                                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
                                                </div>
                                                {Object.keys(incomeData.groupedHistory)
                                                    .filter(k => k.startsWith(year))
                                                    .sort().reverse()
                                                    .map(monthKey => {
                                                        const total = incomeData.groupedHistory[monthKey].reduce((s, i) => s + i.amount, 0);
                                                        const percent = (total / (maxVal || 1)) * 100;
                                                        return (
                                                            <div key={monthKey} className="flex items-center gap-3">
                                                                <span className="text-[10px] font-bold text-zinc-400 w-8 uppercase">{getMonthName(monthKey + '-01').substring(0, 3)}</span>
                                                                <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                                                </div>
                                                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 w-20 text-right">{formatBRL(total, privacyMode)}</span>
                                                            </div>
                                                        )
                                                    })
                                                }
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}

                            {incomeHistoryTab === 'ANNUAL' && (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    <div className="grid grid-cols-3 gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                                        <span>Ano</span>
                                        <span className="text-right">Média</span>
                                        <span className="text-right">Total</span>
                                    </div>
                                    {annualIncomeData.length > 0 ? (
                                        annualIncomeData.map(yearData => (
                                            <div key={yearData.year} className="grid grid-cols-3 gap-4 p-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                <span className="text-xs font-black text-zinc-900 dark:text-white">{yearData.year}</span>
                                                <span className="text-xs font-medium text-zinc-500 text-right">{formatBRL(yearData.average, privacyMode)}</span>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">{formatBRL(yearData.total, privacyMode)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-zinc-400 text-xs font-medium">
                                            Nenhum dado anual disponível
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
                                onClick={() => achievement.unlocked && setSelectedAchievement(achievement)}
                                className={`relative p-2.5 rounded-2xl flex flex-col items-center text-center transition-all duration-500 border overflow-hidden group aspect-square justify-center cursor-pointer ${
                                    achievement.unlocked 
                                        ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm hover:scale-105 active:scale-95' 
                                        : 'bg-zinc-100 dark:bg-zinc-900/50 border-transparent opacity-50 grayscale cursor-not-allowed'
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
                {/* Header */}
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Alocação</h2>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
                            {formatBRL(balance, privacyMode)} &bull; {portfolio.length} Ativos
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm border border-sky-200/50 dark:border-sky-800/30">
                        <PieIcon className="w-6 h-6" strokeWidth={2} />
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl mb-6 shrink-0">
                    {(['CLASS', 'SECTOR', 'ASSET'] as const).map((view) => (
                        <button 
                            key={view}
                            onClick={() => setAllocationView(view)} 
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${allocationView === view ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {view === 'CLASS' ? 'Classe' : view === 'SECTOR' ? 'Setor' : 'Ativo'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-6">
                    {/* Main Chart */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                        <div className="h-64 w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset}
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        cornerRadius={6}
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
                                                    <div className="bg-zinc-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[140px]">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></div>
                                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider line-clamp-1">{data.name}</span>
                                                        </div>
                                                        <p className="text-lg font-black text-white tabular-nums leading-none mb-1">{formatBRL(data.value, privacyMode)}</p>
                                                        <p className="text-xs font-bold text-zinc-400">{(data.percent || 0).toFixed(1)}% da Carteira</p>
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

                    {/* Highlights / Stats */}
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Maior Posição</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
                                {allocationData.byAsset[0]?.name || '--'}
                            </p>
                            <p className="text-xs font-bold text-emerald-500 mt-0.5">
                                {allocationData.byAsset[0]?.percent.toFixed(1)}%
                            </p>
                         </div>
                         <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Setor Dominante</p>
                            <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
                                {allocationData.bySector[0]?.name || '--'}
                            </p>
                            <p className="text-xs font-bold text-sky-500 mt-0.5">
                                {allocationData.bySector[0]?.percent.toFixed(1)}%
                            </p>
                         </div>
                    </div>

                    {/* Detailed List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                Detalhamento por {allocationView === 'CLASS' ? 'Classe' : allocationView === 'SECTOR' ? 'Setor' : 'Ativo'}
                            </h3>
                            <span className="text-[10px] font-bold text-zinc-400">{formatBRL(balance, privacyMode)}</span>
                        </div>
                        
                        {(allocationView === 'CLASS' ? allocationData.byClass : allocationView === 'SECTOR' ? allocationData.bySector : allocationData.byAsset).map((item, idx) => (
                            <div key={idx} className="relative bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                {/* Progress Bar Background */}
                                <div 
                                    className="absolute bottom-0 left-0 h-1 bg-current opacity-20" 
                                    style={{ width: `${item.percent}%`, color: item.color }}
                                ></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0" style={{ backgroundColor: item.color }}>
                                            {item.percent.toFixed(0)}%
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-zinc-900 dark:text-white leading-none mb-1">{item.name}</p>
                                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                                                {allocationView === 'ASSET' ? (item as any).sector : (allocationView === 'SECTOR' ? `${item.percent.toFixed(1)}% do Total` : 'Classe de Ativo')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{formatBRL(item.value, privacyMode)}</p>
                                    </div>
                                </div>
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

        <AnimatePresence>
            {selectedAchievement && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    onClick={() => setSelectedAchievement(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 relative shadow-2xl border border-white/10 overflow-hidden"
                    >
                        {/* Background Effects */}
                        <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${selectedAchievement.color} opacity-20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none`}></div>
                        <div className={`absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr ${selectedAchievement.color} opacity-20 blur-3xl rounded-full -ml-10 -mb-10 pointer-events-none`}></div>

                        <button 
                            onClick={() => setSelectedAchievement(null)}
                            className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors z-20"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <motion.div 
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 12 }}
                                className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg bg-gradient-to-br ${selectedAchievement.color} text-white`}
                            >
                                <selectedAchievement.icon className="w-10 h-10" strokeWidth={2} />
                            </motion.div>

                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
                                {selectedAchievement.label}
                            </h3>
                            
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-6">
                                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                    {selectedAchievement.sub}
                                </span>
                            </div>

                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                {selectedAchievement.description}
                            </p>

                            <div className="mt-8 w-full">
                                <button
                                    onClick={() => setSelectedAchievement(null)}
                                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 bg-gradient-to-r ${selectedAchievement.color} hover:opacity-90 transition-opacity`}
                                >
                                    Incrível!
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

    </motion.div>
  );
};

export const Home = React.memo(HomeComponent);
