
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2, Building2, CandlestickChart, Wallet, Calendar, Trophy, Clock, Target, ArrowUpRight, ArrowDownRight, Layers, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  isAiLoading?: boolean;
  inflationRate?: number;
  portfolioStartDate?: string;
  accentColor?: string;
  invested: number;
  balance: number;
  totalAppreciation: number;
  transactions?: Transaction[];
}

const formatBRL = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string) => {
    const isToday = new Date(dateStr + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    
    if (eventType === 'datacom') {
        return { 
            containerClass: 'bg-amber-50 dark:bg-amber-950/20 border-l-[4px] border-l-amber-500 border border-zinc-200 dark:border-zinc-800',
            iconClass: 'text-amber-500',
            textClass: 'text-amber-700 dark:text-amber-400',
            valueClass: 'text-zinc-900 dark:text-white font-black',
            icon: CalendarDays,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    return {
        containerClass: 'bg-emerald-50 dark:bg-emerald-950/20 border-l-[4px] border-l-emerald-500 border border-zinc-200 dark:border-zinc-800',
        iconClass: 'text-emerald-500',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        valueClass: 'text-emerald-600 dark:text-emerald-400 font-black',
        icon: Banknote,
        label: isToday ? 'Cai Hoje' : 'Pagamento'
    };
};

const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T00:00:00');
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    return `Em ${diffDays} dias`;
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, invested, balance, totalAppreciation, transactions = [] }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  const { upcomingEvents, received } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allEvents: any[] = [];
    let receivedTotal = 0;
    dividendReceipts.forEach(r => {
        if (r.paymentDate <= todayStr) receivedTotal += r.totalReceived;
        if (r.paymentDate >= todayStr) allEvents.push({ ...r, eventType: 'payment', date: r.paymentDate });
        if (r.dateCom >= todayStr) allEvents.push({ ...r, eventType: 'datacom', date: r.dateCom });
    });
    const uniqueEvents = allEvents.sort((a, b) => a.date.localeCompare(b.date)).reduce((acc: any[], current) => {
        if (!acc.find(i => i.date === current.date && i.ticker === current.ticker && i.eventType === current.eventType)) acc.push(current);
        return acc;
    }, []);
    return { upcomingEvents: uniqueEvents, received: receivedTotal };
  }, [dividendReceipts]);

  const { history, average, maxVal, bestPayer, receiptsByMonth } = useMemo(() => {
    const map: Record<string, number> = {};
    const payerMap: Record<string, number> = {};
    const receiptsByMonthMap: Record<string, DividendReceipt[]> = {};
    dividendReceipts.forEach(r => {
        if (r.paymentDate <= new Date().toISOString().split('T')[0]) {
            const key = r.paymentDate.substring(0, 7);
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsByMonthMap[key]) receiptsByMonthMap[key] = [];
            receiptsByMonthMap[key].push(r);
            payerMap[r.ticker] = (payerMap[r.ticker] || 0) + r.totalReceived;
        }
    });
    const sorted = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    const totalMonths = sorted.length || 1;
    const average = received / totalMonths;
    const maxVal = Math.max(...Object.values(map), 0);
    const sortedPayers = Object.entries(payerMap).sort((a, b) => b[1] - a[1]);
    const bestPayer = sortedPayers.length > 0 ? { ticker: sortedPayers[0][0], value: sortedPayers[0][1] } : null;
    return { history: sorted, average, maxVal, bestPayer, receiptsByMonth: receiptsByMonthMap };
  }, [dividendReceipts, received]);

  const { typeData, topAssets, segmentsData } = useMemo(() => {
      let fiisTotal = 0; let stocksTotal = 0; const segmentsMap: Record<string, number> = {};
      const enriched = portfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val; else stocksTotal += val;
          const segName = p.segment || 'Outros';
          segmentsMap[segName] = (segmentsMap[segName] || 0) + val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      const segmentsData = Object.entries(segmentsMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const sortedAssets = [...enriched].sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);
      return { typeData: { fiis: { value: fiisTotal, percent: (fiisTotal / total) * 100 }, stocks: { value: stocksTotal, percent: (stocksTotal / total) * 100 }, total }, topAssets: sortedAssets, segmentsData };
  }, [portfolio]);

  return (
    <div className="pt-24 pb-32 px-5 space-y-6 max-w-lg mx-auto">
      
      {/* 1. HERO CARD - Fintech Gradient */}
      <div className="anim-fade-in-up is-visible">
        <div className="w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 p-7 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-xl shadow-zinc-200/50 dark:shadow-none">
            <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block">Patrimônio Total</span>
                {isAiLoading && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
            </div>
            <div className="mb-10">
                <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none mb-1">{formatBRL(balance)}</h2>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5"><Wallet className="w-3 h-3" /> Aplicado</span>
                    <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">{formatBRL(invested)}</p>
                </div>
                <div className="text-right">
                     <span className="flex items-center justify-end gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Rentabilidade</span>
                     <div className="flex flex-col items-end">
                        <span className={`text-base font-black ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? '+' : ''}{formatPercent(totalProfitPercent)}
                        </span>
                     </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. AGENDA - Colored Category Cards */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '50ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 active:scale-[0.98] transition-all group shadow-card hover:border-zinc-300 dark:hover:border-zinc-700">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                        <CalendarDays className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-zinc-900 dark:text-white">Agenda</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Próximos Pagamentos</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
            {upcomingEvents.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {upcomingEvents.slice(0, 4).map((event, i) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`flex-shrink-0 p-4 rounded-2xl ${style.containerClass} min-w-[145px]`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-black uppercase text-zinc-900 dark:text-white">{event.ticker}</span>
                                    <style.icon className={`w-4 h-4 ${style.iconClass}`} />
                                </div>
                                <span className={`text-sm block ${style.valueClass}`}>{event.eventType === 'payment' ? formatBRL(event.totalReceived) : event.date.split('-').reverse().slice(0,2).join('/')}</span>
                                <span className={`text-[10px] font-bold block mt-1 uppercase tracking-tight ${style.textClass}`}>{getDaysUntil(event.date)}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-center border border-dashed border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Nenhum evento previsto</p>
                </div>
            )}
        </button>
      </div>

      {/* 3. GRID - INDIGO (FIIs) e SKY (Ações) */}
      <div className="grid grid-cols-2 gap-4 anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="bg-emerald-500 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all text-left group">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CircleDollarSign className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-1">Renda Passiva</span>
            <p className="text-2xl font-black mb-1">{formatBRL(received)}</p>
            <p className="text-[10px] font-bold opacity-70">Média: {formatBRL(average)}/mês</p>
        </button>

        <button onClick={() => setShowAllocationModal(true)} className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-card active:scale-[0.98] transition-all text-left">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-900/30">
                <PieIcon className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3">Composição</span>
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3">
                <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-1000"></div>
                <div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 dark:bg-sky-400 transition-all duration-1000"></div>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span>
                <span className="text-sky-500 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span>
            </div>
        </button>
      </div>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
