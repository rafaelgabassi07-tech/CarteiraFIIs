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
                {/* Massive Header */}
                <div className="px-8 pt-12 pb-10 shrink-0 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Variação Diária</p>
                            <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-4">
                                {formatBRL(stats.marketValue)}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-4">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg ${stats.totalReturn >= 0 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
                                    {stats.totalReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" strokeWidth={3} /> : <TrendingDown className="w-3.5 h-3.5" strokeWidth={3} />}
                                    {stats.totalReturn >= 0 ? '+' : ''}{formatBRL(stats.totalReturn)}
                                </div>
                                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Rentabilidade Total</span>
                                    <span className={`text-lg font-black tracking-tight ${stats.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90 shadow-sm">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="px-8 py-12 space-y-12">
                        
                        {/* Summary Chart - Massive */}
                        {chartData.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <BarChart3 className="w-5 h-5 text-indigo-500" /> Desempenho Recente
                                    </h4>
                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alta</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Baixa</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[300px] w-full bg-white dark:bg-zinc-900 rounded-[3.5rem] p-8 border border-zinc-100 dark:border-zinc-800 shadow-2xl shadow-zinc-200/40 dark:shadow-black/40 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <XAxis 
                                                dataKey="dayLabel" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                                dy={10}
                                            />
                                            <Tooltip 
                                                cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 16 }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-zinc-900 dark:bg-white p-5 rounded-[2rem] shadow-2xl border border-white/10 dark:border-black/10 backdrop-blur-xl">
                                                                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{data.formattedDate}</p>
                                                                <p className={`text-xl font-black tracking-tighter ${data.variationValue >= 0 ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>
                                                                    {data.variationValue >= 0 ? '+' : ''}{formatBRL(data.variationValue)}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-1">
                                                                    {data.variationPercent.toFixed(2)}% de variação
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar 
                                                dataKey="variationValue" 
                                                radius={[12, 12, 12, 12]}
                                                barSize={32}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={entry.variationValue >= 0 ? '#10b981' : '#f43f5e'} 
                                                        fillOpacity={0.8}
                                                    />
                                                ))}
                                            </Bar>
                                            <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Quick Stats - Massive Cards */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/30 dark:shadow-black/30 group hover:-translate-y-1 transition-all duration-500">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                        <TrendingUp className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-0.5">Dias de Alta</p>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{stats.positiveDays}</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000" 
                                        style={{ width: `${(stats.positiveDays / stats.totalDays) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/30 dark:shadow-black/30 group hover:-translate-y-1 transition-all duration-500">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                        <TrendingDown className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-0.5">Dias de Baixa</p>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{stats.negativeDays}</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-rose-500 transition-all duration-1000" 
                                        style={{ width: `${(stats.negativeDays / stats.totalDays) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* History List - Massive Items */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <History className="w-5 h-5 text-indigo-500" /> Histórico Diário
                                </h4>
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{stats.totalDays} registros</span>
                            </div>
                            
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50 bg-white dark:bg-zinc-900 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                                        <History className="w-12 h-12 text-zinc-300 mb-4" strokeWidth={1.5} />
                                        <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Sem registros ainda</p>
                                    </div>
                                ) : (
                                    history.map((record, idx) => {
                                        const isPositive = record.variationValue >= 0;
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`p-8 rounded-[2.5rem] border transition-all duration-500 hover:-translate-x-1 group ${
                                                    isToday(record.date) 
                                                        ? 'bg-zinc-900 dark:bg-white border-zinc-800 dark:border-zinc-100 shadow-2xl shadow-zinc-900/20 dark:shadow-white/10' 
                                                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-lg shadow-zinc-200/40 dark:shadow-black/40'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                                                            isToday(record.date) 
                                                                ? 'bg-white/10 dark:bg-zinc-100 text-white dark:text-zinc-900' 
                                                                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                                                        }`}>
                                                            <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1">{getWeekday(record.date)}</span>
                                                            <span className="text-xl font-black leading-none">{record.date.split('-')[2]}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <p className={`text-lg font-black tracking-tight ${isToday(record.date) ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>
                                                                    {formatDateShort(record.date)}
                                                                </p>
                                                                {isToday(record.date) && (
                                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">
                                                                        Hoje
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-xs font-medium ${isToday(record.date) ? 'text-white/50 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                                                Fechamento: {formatBRL(record.totalValue)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-2xl font-black tracking-tighter mb-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {isPositive ? '+' : ''}{formatBRL(record.variationValue)}
                                                        </p>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                                {isPositive ? '+' : ''}{record.variationPercent.toFixed(2)}%
                                                            </span>
                                                        </div>
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
