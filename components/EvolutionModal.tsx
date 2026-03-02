import React, { useState, useMemo } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { SwipeableModal } from './Layout';
import { formatBRL, getMonthName } from '../utils/formatters';
import { X, TrendingUp, TrendingDown, Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, 
    Tooltip as RechartsTooltip, Area, Bar, Line, ReferenceLine 
} from 'recharts';

export const EvolutionModal = ({ isOpen, onClose, transactions, dividends, currentBalance, nextLevel, progress }: { 
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

// Add Coins icon import if missing
import { Coins } from 'lucide-react';
