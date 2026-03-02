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
    // Calculate Current Stats (Simplified)
    const stats = useMemo(() => {
        if (!transactions) return null;

        const totalInvested = transactions.reduce((acc, tx) => {
            const val = tx.quantity * tx.price;
            return tx.type === 'BUY' ? acc + val : acc - val;
        }, 0);

        const totalReturn = currentBalance - totalInvested;
        const roi = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

        return {
            invested: totalInvested,
            marketValue: currentBalance,
            totalReturn,
            roi
        };
    }, [transactions, currentBalance]);

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
                <div className="px-5 pt-6 pb-6 shrink-0 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Histórico de Variação</p>
                            <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                                {formatBRL(stats.marketValue)}
                            </h3>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm ${stats.roi >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {stats.roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
                        </div>
                        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Retorno Total</span>
                            <span className={`text-xs font-black ${stats.totalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {stats.totalReturn >= 0 ? '+' : ''}{formatBRL(stats.totalReturn)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="px-5 py-6 space-y-3">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                    <History className="w-8 h-8 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                                </div>
                                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Nenhum histórico registrado</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 text-center max-w-[200px]">
                                    A variação diária será registrada automaticamente aqui.
                                </p>
                            </div>
                        ) : (
                            history.map((record, idx) => {
                                const isPositive = record.variationValue >= 0;
                                return (
                                    <div key={idx} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isPositive ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20'}`}>
                                                {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                                        {formatDateShort(record.date)}
                                                    </p>
                                                    {isToday(record.date) && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider">
                                                            Hoje
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarDays className="w-3 h-3 text-zinc-400" />
                                                    <p className="text-[10px] font-bold text-zinc-400 capitalize">
                                                        {getWeekday(record.date)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-base font-black tracking-tight ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {isPositive ? '+' : ''}{formatBRL(record.variationValue)}
                                            </p>
                                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                <span className="text-[10px] font-medium text-zinc-400">
                                                    {formatBRL(record.totalValue)}
                                                </span>
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
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
        </SwipeableModal>
    );
};
