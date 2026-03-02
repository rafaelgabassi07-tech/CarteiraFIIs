import React, { useMemo } from 'react';
import { Transaction, DividendReceipt } from '../types';
import { formatBRL, formatDateShort } from '../utils/formatters';
import { SwipeableModal } from './Layout';
import { X, TrendingUp, TrendingDown, History, CalendarDays } from 'lucide-react';

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
    const [activeTab, setActiveTab] = React.useState<'daily' | 'stats'>('daily');

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
            return date.toLocaleDateString('pt-BR', { weekday: 'long' });
        } catch {
            return '';
        }
    };

    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

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
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lucro/Prejuízo</span>
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

                {/* Tabs */}
                <div className="flex px-6 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                    <button 
                        onClick={() => setActiveTab('daily')}
                        className={`py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'daily' ? 'text-indigo-500' : 'text-zinc-400'}`}
                    >
                        Diário
                        {activeTab === 'daily' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('stats')}
                        className={`py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'stats' ? 'text-indigo-500' : 'text-zinc-400'}`}
                    >
                        Estatísticas
                        {activeTab === 'stats' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="px-6 py-8">
                        {activeTab === 'daily' ? (
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                                            <History className="w-10 h-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                                        </div>
                                        <p className="text-base font-black text-zinc-900 dark:text-white tracking-tight">Sem histórico</p>
                                        <p className="text-xs text-zinc-400 mt-2 text-center max-w-[220px]">
                                            Sua variação diária será registrada automaticamente aqui.
                                        </p>
                                    </div>
                                ) : (
                                    history.map((record, idx) => {
                                        const isPositive = record.variationValue >= 0;
                                        return (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {isPositive ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-base font-black text-zinc-900 dark:text-white tracking-tighter">
                                                                {formatDateShort(record.date)}
                                                            </p>
                                                            {isToday(record.date) && (
                                                                <span className="px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest">
                                                                    Hoje
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                                {getWeekday(record.date)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-xl font-black tracking-tighter mb-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {isPositive ? '+' : ''}{formatBRL(record.variationValue)}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-[10px] font-bold text-zinc-400">
                                                            {formatBRL(record.totalValue)}
                                                        </span>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                            {isPositive ? '+' : ''}{record.variationPercent.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Dias Positivos</p>
                                        <p className="text-3xl font-black text-emerald-500 tracking-tighter">{stats.positiveDays}</p>
                                        <p className="text-[10px] font-bold text-zinc-400 mt-1">de {stats.totalDays} dias</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Dias Negativos</p>
                                        <p className="text-3xl font-black text-rose-500 tracking-tighter">{stats.negativeDays}</p>
                                        <p className="text-[10px] font-bold text-zinc-400 mt-1">de {stats.totalDays} dias</p>
                                    </div>
                                </div>

                                {stats.bestDay && (
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Melhor Dia</h4>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-2">
                                                    +{formatBRL(stats.bestDay.variationValue)}
                                                </p>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                    {formatDateShort(stats.bestDay.date)} ({getWeekday(stats.bestDay.date)})
                                                </p>
                                            </div>
                                            <div className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-black">
                                                +{stats.bestDay.variationPercent.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stats.worstDay && (
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                        <div className="flex items-center gap-2 mb-6">
                                            <TrendingDown className="w-4 h-4 text-rose-500" />
                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pior Dia</h4>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-2">
                                                    {formatBRL(stats.worstDay.variationValue)}
                                                </p>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                    {formatDateShort(stats.worstDay.date)} ({getWeekday(stats.worstDay.date)})
                                                </p>
                                            </div>
                                            <div className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-black">
                                                {stats.worstDay.variationPercent.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SwipeableModal>
    );
};
