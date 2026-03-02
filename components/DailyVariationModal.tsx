import React, { useMemo, useState } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { formatBRL, getMonthName } from '../utils/formatters';
import { SwipeableModal } from './Layout';
import { X, TrendingUp, TrendingDown, Calendar, ChevronDown, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';

interface DailyVariationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    dividends: DividendReceipt[];
    currentBalance: number;
}

export const DailyVariationModal: React.FC<DailyVariationModalProps> = ({ 
    isOpen, 
    onClose, 
    transactions, 
    dividends, 
    currentBalance 
}) => {
    const [timeRange, setTimeRange] = useState<'6M' | '1Y' | '2Y' | '5Y' | 'MAX'>('MAX');
    const [chartType, setChartType] = useState<'WEALTH' | 'RETURN'>('RETURN');
    const [showTimeFilter, setShowTimeFilter] = useState(false);

    // 1. Process Full History (Monthly Granularity for Performance)
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
        
        const totalInvested = last.invested;
        const totalValue = last.marketValue;
        const totalReturn = totalValue - totalInvested;
        const roi = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
        
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
            bestMonth,
            worstMonth,
            positiveMonths,
            negativeMonths,
            avgMonthlyReturn,
            volatility,
            winRate: (positiveMonths + negativeMonths) > 0 ? (positiveMonths / (positiveMonths + negativeMonths)) * 100 : 0,
        };
    }, [filteredData]);

    if (!stats) return null;

    return (
        <SwipeableModal isOpen={isOpen} onClose={onClose}>
            <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
                {/* Header */}
                <div className="px-5 pt-6 pb-2 shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Histórico de Variação</p>
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
                    
                    {/* Chart Section */}
                    <div className="mb-6 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-900 p-1.5 shadow-sm">
                        <div className="flex justify-between items-center p-1.5 mb-2">
                            <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 rounded-lg p-0.5 backdrop-blur-sm">
                                <button onClick={() => setChartType('WEALTH')} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${chartType === 'WEALTH' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Patrimônio</button>
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

                    {/* Unified Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Investido</p>
                            <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 tracking-tight truncate">{formatBRL(stats.invested)}</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Volatilidade</p>
                            <p className="text-xs font-black text-zinc-900 dark:text-white tracking-tight">{stats.volatility.toFixed(2)}%</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Win Rate</p>
                            <p className="text-xs font-black text-emerald-500 tracking-tight">{stats.winRate.toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>
    );
};
