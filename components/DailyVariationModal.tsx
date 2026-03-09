import React, { useMemo, useState } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { formatBRL, formatDateShort } from '../utils/formatters';
import { SwipeableModal } from './Layout';
import { X, TrendingUp, TrendingDown, History, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, ReferenceLine } from 'recharts';

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

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
            </div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        </div>
        <p className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{value}</p>
    </div>
);

export const DailyVariationModal: React.FC<DailyVariationModalProps> = ({ 
    isOpen, 
    onClose, 
    transactions, 
    currentBalance,
    history = []
}) => {
    const stats = useMemo(() => {
        if (!transactions || transactions.length === 0) return null;

        const totalInvested = transactions.reduce((acc, tx) => {
            const val = tx.quantity * tx.price;
            return tx.type === 'BUY' ? acc + val : acc - val;
        }, 0);

        const totalReturn = currentBalance - totalInvested;
        const roi = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

        const positiveDays = history.filter(h => h.variationValue > 0).length;
        const negativeDays = history.filter(h => h.variationValue < 0).length;

        return {
            marketValue: currentBalance,
            totalReturn,
            roi,
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

    const chartData = useMemo(() => {
        return [...history].slice(0, 14).reverse().map(h => ({
            ...h,
            dayLabel: getWeekday(h.date),
            formattedDate: formatDateShort(h.date),
        }));
    }, [history]);

    if (!stats) return null;

    return (
        <SwipeableModal isOpen={isOpen} onClose={onClose}>
            <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
                <div className="px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Variação Diária</p>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                            {formatBRL(stats.marketValue)}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard icon={TrendingUp} label="Dias de Alta" value={stats.positiveDays} color="bg-emerald-500" />
                        <StatCard icon={TrendingDown} label="Dias de Baixa" value={stats.negativeDays} color="bg-rose-500" />
                    </div>

                    {chartData.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-indigo-500" /> Desempenho
                            </h4>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 4 }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                        <Bar dataKey="variationValue" radius={[4, 4, 4, 4]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={index} fill={entry.variationValue >= 0 ? '#10b981' : '#f43f5e'} />
                                            ))}
                                        </Bar>
                                        <ReferenceLine y={0} stroke="#e2e8f0" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-500" /> Histórico
                        </h4>
                        {history.map((record, idx) => (
                            <div key={idx} className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatDateShort(record.date)}</p>
                                    <p className="text-xs text-zinc-500">{formatBRL(record.totalValue)}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${record.variationValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {record.variationValue >= 0 ? '+' : ''}{formatBRL(record.variationValue)}
                                    </p>
                                    <p className="text-xs text-zinc-500">{record.variationPercent.toFixed(2)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SwipeableModal>
    );
};
