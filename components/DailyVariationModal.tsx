import React, { useMemo } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { formatBRL, formatDateShort } from '../utils/formatters';
import { SwipeableModal } from './Layout';
import { X, TrendingUp, TrendingDown, History, BarChart3, Wallet, Percent } from 'lucide-react';
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

const StatCard = ({ icon: Icon, label, value, iconColor, valueColor = "text-zinc-900 dark:text-white" }: { icon: any, label: string, value: string | number, iconColor: string, valueColor?: string }) => (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl ${iconColor} bg-opacity-10`}>
                <Icon className={`w-4 h-4 ${iconColor.replace('bg-', 'text-')}`} />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
        </div>
        <p className={`text-lg font-black tracking-tight ${valueColor}`}>{value}</p>
    </div>
);

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isPositive = data.variationValue >= 0;
        return (
            <div className="bg-zinc-900 dark:bg-white p-3 rounded-xl shadow-xl border border-zinc-800 dark:border-zinc-200">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">{data.formattedDate}</p>
                <p className={`text-sm font-black tracking-tight ${isPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>
                    {isPositive ? '+' : ''}{formatBRL(data.variationValue)}
                </p>
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {data.variationPercent.toFixed(2)}%
                </p>
            </div>
        );
    }
    return null;
};

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
                <div className="px-6 pt-8 pb-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Patrimônio Atual</p>
                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            {formatBRL(stats.marketValue)}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard 
                            icon={Wallet} 
                            label="Rentabilidade" 
                            value={`${stats.totalReturn >= 0 ? '+' : ''}${formatBRL(stats.totalReturn)}`} 
                            iconColor="bg-indigo-500"
                            valueColor={stats.totalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                        />
                        <StatCard 
                            icon={Percent} 
                            label="ROI" 
                            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(2)}%`} 
                            iconColor="bg-blue-500"
                            valueColor={stats.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                        />
                        <StatCard 
                            icon={TrendingUp} 
                            label="Dias de Alta" 
                            value={stats.positiveDays} 
                            iconColor="bg-emerald-500" 
                        />
                        <StatCard 
                            icon={TrendingDown} 
                            label="Dias de Baixa" 
                            value={stats.negativeDays} 
                            iconColor="bg-rose-500" 
                        />
                    </div>

                    {chartData.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-indigo-500" /> Desempenho (14 dias)
                            </h4>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={10} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 4 }} />
                                        <Bar dataKey="variationValue" radius={[4, 4, 4, 4]} barSize={24}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={index} fill={entry.variationValue >= 0 ? '#10b981' : '#f43f5e'} />
                                            ))}
                                        </Bar>
                                        <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <History className="w-4 h-4 text-indigo-500" /> Histórico Detalhado
                        </h4>
                        <div className="space-y-3">
                            {history.map((record, idx) => {
                                const isPositive = record.variationValue >= 0;
                                return (
                                    <div key={idx} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                                    {formatDateShort(record.date)}
                                                    {isToday(record.date) && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase tracking-widest">Hoje</span>}
                                                </p>
                                                <p className="text-xs font-medium text-zinc-500 mt-0.5">{formatBRL(record.totalValue)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black tracking-tight ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {isPositive ? '+' : ''}{formatBRL(record.variationValue)}
                                            </p>
                                            <p className={`text-[10px] font-bold mt-0.5 ${isPositive ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-rose-600/70 dark:text-rose-400/70'}`}>
                                                {isPositive ? '+' : ''}{record.variationPercent.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>
    );
};

