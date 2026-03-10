import React, { useMemo, useState } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { formatBRL, formatDateShort } from '../utils/formatters';
import { SwipeableModal } from './Layout';
import { X, TrendingUp, TrendingDown, History, CalendarDays, BarChart3, PieChart } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, CartesianGrid } from 'recharts';

interface DailyVariationRecord {
    date: string;
    variationValue: number;
    variationPercent: number;
    totalValue: number;
}

interface DailyVariationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    dividends: DividendReceipt[];
    currentBalance: number;
    history?: DailyVariationRecord[];
}

export const DailyVariationModal: React.FC<DailyVariationModalProps> = ({ 
    isOpen, 
    onClose, 
    transactions, 
    currentBalance,
    history = []
}) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'chart' | 'stats'>('daily');

    // Calculate Current Stats
    const stats = useMemo(() => {
        if (!transactions || transactions.length === 0) return null;

        const totalInvested = transactions.reduce((acc, tx) => {
            const val = tx.quantity * tx.price;
            return tx.type === 'BUY' ? acc + val : acc - val;
        }, 0);

        const totalReturn = currentBalance - totalInvested;
        const roi = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

        // Calculate best and worst days
        const bestDay = history.length > 0 ? [...history].sort((a, b) => b.variationValue - a.variationValue)[0] : null;
        const worstDay = history.length > 0 ? [...history].sort((a, b) => a.variationValue - b.variationValue)[0] : null;
        
        const positiveDays = history.filter(h => h.variationValue > 0).length;
        const negativeDays = history.filter(h => h.variationValue < 0).length;

        return {
            invested: totalInvested,
            marketValue: currentBalance,
            totalReturn,
            roi,
            bestDay,
            worstDay,
            positiveDays,
            negativeDays,
            totalDays: history.length
        };
    }, [transactions, currentBalance, history]);

    const getWeekday = (dateStr: string) => {
        try {
            const date = new Date(dateStr + 'T12:00:00');
            return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        } catch {
            return '';
        }
    };

    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    // Prepare chart data (last 7 days reversed for chronological order)
    const chartData = useMemo(() => {
        return [...history].slice(0, 14).reverse().map(h => ({
            ...h,
            dayLabel: getWeekday(h.date),
            formattedDate: formatDateShort(h.date),
            color: h.variationValue >= 0 ? '#10b981' : '#f43f5e'
        }));
    }, [history]);

    if (!stats) return null;

    return (
        <SwipeableModal isOpen={isOpen} onClose={onClose}>
            <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
                {/* Refined Header - More Compact */}
                <div className="px-5 pt-6 pb-5 shrink-0 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Variação Diária</p>
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                                {formatBRL(stats.marketValue)}
                            </h3>
                            
                            <div className="flex items-center gap-2 pt-2">
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${stats.totalReturn >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                    {stats.totalReturn >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                    {stats.totalReturn >= 0 ? '+' : ''}{formatBRL(stats.totalReturn)}
                                </div>
                                <div className="text-[10px] font-black px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}% ROI
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 border border-zinc-200/50 dark:border-zinc-800/50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Section - Reduced Spacing */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-zinc-50/30 dark:bg-zinc-950">
                    <div className="px-5 py-6 space-y-6">
                        
                        {/* Bento Grid Stats - More Compact */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Best Day Card */}
                            <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <TrendingUp className="w-8 h-8" />
                                </div>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">Melhor Dia</p>
                                {stats.bestDay ? (
                                    <>
                                        <p className="text-base font-black text-emerald-500 tracking-tight leading-none mb-0.5">
                                            +{formatBRL(stats.bestDay.variationValue)}
                                        </p>
                                        <p className="text-[9px] font-bold text-zinc-400">{formatDateShort(stats.bestDay.date)}</p>
                                    </>
                                ) : <p className="text-base font-black text-zinc-300">--</p>}
                            </div>

                            {/* Worst Day Card */}
                            <div className="col-span-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <TrendingDown className="w-8 h-8" />
                                </div>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">Pior Dia</p>
                                {stats.worstDay ? (
                                    <>
                                        <p className="text-base font-black text-rose-500 tracking-tight leading-none mb-0.5">
                                            {formatBRL(stats.worstDay.variationValue)}
                                        </p>
                                        <p className="text-[9px] font-bold text-zinc-400">{formatDateShort(stats.worstDay.date)}</p>
                                    </>
                                ) : <p className="text-base font-black text-zinc-300">--</p>}
                            </div>

                            {/* Ratio Card - Compact */}
                            <div className="col-span-2 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Proporção de Resultado</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-lg font-black text-zinc-900 dark:text-white">{stats.positiveDays}</span>
                                            <span className="text-[10px] font-bold text-zinc-400">vs</span>
                                            <span className="text-lg font-black text-zinc-900 dark:text-white">{stats.negativeDays}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                            {((stats.positiveDays / (stats.totalDays || 1)) * 100).toFixed(0)}% Positivo
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000" 
                                        style={{ width: `${(stats.positiveDays / (stats.totalDays || 1)) * 100}%` }}
                                    ></div>
                                    <div 
                                        className="h-full bg-rose-500 transition-all duration-1000" 
                                        style={{ width: `${(stats.negativeDays / (stats.totalDays || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Summary Chart - Reduced Height */}
                        {chartData.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> Tendência 14 Dias
                                    </h4>
                                </div>
                                <div className="h-[180px] w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.05} />
                                            <XAxis 
                                                dataKey="dayLabel" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 800 }}
                                                dy={5}
                                            />
                                            <YAxis hide />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 4 }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-zinc-900 dark:bg-white p-3 rounded-xl shadow-xl border border-white/10 dark:border-black/10 backdrop-blur-md">
                                                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{data.formattedDate}</p>
                                                                <p className={`text-sm font-black tracking-tight ${data.variationValue >= 0 ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>
                                                                    {data.variationValue >= 0 ? '+' : ''}{formatBRL(data.variationValue)}
                                                                </p>
                                                                <p className="text-[8px] font-bold text-zinc-500 mt-0.5">
                                                                    {data.variationPercent.toFixed(2)}% no dia
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar 
                                                dataKey="variationValue" 
                                                radius={[4, 4, 4, 4]}
                                                barSize={14}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={entry.variationValue >= 0 ? '#10b981' : '#f43f5e'} 
                                                        fillOpacity={0.7}
                                                    />
                                                ))}
                                            </Bar>
                                            <ReferenceLine y={0} stroke="#e2e8f0" strokeOpacity={0.2} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* History List - Clean & Compact */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-indigo-500" /> Histórico Detalhado
                                </h4>
                                <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">{stats.totalDays} dias</span>
                            </div>
                            
                            <div className="space-y-2">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 opacity-50 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                        <History className="w-8 h-8 text-zinc-300 mb-2" strokeWidth={1.5} />
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nenhum registro</p>
                                    </div>
                                ) : (
                                    history.map((record, idx) => {
                                        const isPositive = record.variationValue >= 0;
                                        const today = isToday(record.date);
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`p-3.5 rounded-xl border transition-all duration-300 group ${
                                                    today 
                                                        ? 'bg-zinc-900 dark:bg-white border-zinc-800 dark:border-zinc-200 shadow-md' 
                                                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-zinc-200 dark:hover:border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-colors ${
                                                            today 
                                                                ? 'bg-white/10 dark:bg-zinc-100 text-white dark:text-zinc-900' 
                                                                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                                                        }`}>
                                                            <span className="text-[7px] font-black uppercase tracking-tighter leading-none mb-0.5">{getWeekday(record.date)}</span>
                                                            <span className="text-sm font-black leading-none">{record.date.split('-')[2]}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <p className={`text-xs font-black tracking-tight ${today ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>
                                                                    {formatDateShort(record.date)}
                                                                </p>
                                                                {today && (
                                                                    <span className="px-1 py-0.5 rounded bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest">
                                                                        Hoje
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[9px] font-bold ${today ? 'text-white/40 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                                                Total: {formatBRL(record.totalValue)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black tracking-tight mb-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {isPositive ? '+' : ''}{formatBRL(record.variationValue)}
                                                        </p>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                            {isPositive ? '+' : ''}{record.variationPercent.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>
    );
};
