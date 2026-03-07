import React, { useMemo, useState } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { formatBRL, formatDateShort } from '../utils/formatters';
import { SwipeableModal } from './Layout';
import { X, TrendingUp, TrendingDown, History, CalendarDays, BarChart3, PieChart } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';

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
                {/* Header */}
                <div className="px-6 pt-8 pb-6 shrink-0 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Patrimônio Total</p>
                            <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                                {formatBRL(stats.marketValue)}
                            </h3>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${stats.totalReturn >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lucro Total</span>
                            <span className={`text-lg font-black tracking-tight ${stats.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {stats.totalReturn >= 0 ? '+' : ''}{formatBRL(stats.totalReturn)}
                            </span>
                        </div>
                        <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${stats.roi >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Rentabilidade</span>
                            <span className={`text-lg font-black tracking-tight ${stats.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="px-6 py-8 space-y-8">
                        
                        {/* Summary Chart */}
                        {chartData.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <BarChart3 className="w-3.5 h-3.5" /> Desempenho Recente
                                    </h4>
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <span className="text-[8px] font-bold text-zinc-400 uppercase">Alta</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                            <span className="text-[8px] font-bold text-zinc-400 uppercase">Baixa</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[180px] w-full bg-white dark:bg-zinc-900 rounded-[2rem] p-4 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                            <XAxis 
                                                dataKey="dayLabel" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} 
                                                dy={10}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} 
                                                tickFormatter={(val) => `R$${Math.abs(val) >= 1000 ? (val/1000).toFixed(0)+'k' : val}`}
                                            />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-zinc-900 text-white p-2.5 rounded-xl shadow-xl border border-zinc-800 text-[10px]">
                                                                <p className="font-bold mb-0.5 text-zinc-400">{data.formattedDate}</p>
                                                                <p className={`font-black ${data.variationValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {data.variationValue >= 0 ? '+' : ''}{formatBRL(data.variationValue)}
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <ReferenceLine y={0} stroke="#e4e4e7" strokeDasharray="3 3" />
                                            <Bar dataKey="variationValue" radius={[4, 4, 4, 4]} barSize={12}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Quick Stats Chips */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Dias Positivos</p>
                                    <p className="text-lg font-black text-zinc-900 dark:text-white leading-none mt-0.5">{stats.positiveDays}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <TrendingDown className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Dias Negativos</p>
                                    <p className="text-lg font-black text-zinc-900 dark:text-white leading-none mt-0.5">{stats.negativeDays}</p>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Histórico Diário
                            </h4>
                            <div className="space-y-3">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 opacity-50 bg-white dark:bg-zinc-900 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                                        <History className="w-8 h-8 text-zinc-300 mb-3" strokeWidth={1.5} />
                                        <p className="text-xs font-bold text-zinc-400">Sem registros ainda</p>
                                    </div>
                                ) : (
                                    history.map((record, idx) => {
                                        const isPositive = record.variationValue >= 0;
                                        return (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-sm font-black text-zinc-900 dark:text-white tracking-tighter">
                                                                {formatDateShort(record.date)}
                                                            </p>
                                                            {isToday(record.date) && (
                                                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-[7px] font-black uppercase tracking-widest">
                                                                    Hoje
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                                            {getWeekday(record.date)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-base font-black tracking-tighter mb-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {isPositive ? '+' : ''}{formatBRL(record.variationValue)}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
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
