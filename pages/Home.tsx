
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2 } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

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
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

// Logic for solid styling of event badges
const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string) => {
    const isToday = new Date(dateStr + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    
    if (eventType === 'datacom') {
        return { 
            bg: 'bg-amber-100 dark:bg-amber-900/30', 
            text: 'text-amber-700 dark:text-amber-400', 
            border: 'border-amber-200 dark:border-amber-800',
            icon: CalendarDays,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: Banknote,
        label: isToday ? 'Cai Hoje' : 'Pagamento'
    };
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, invested, balance, totalAppreciation, transactions = [] }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  
  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  // Agenda Logic
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

  // Allocation Data
  const typeData = useMemo(() => {
      const map: Record<string, number> = {};
      portfolio.forEach(p => { 
          const t = p.assetType === AssetType.FII ? 'FIIs' : 'Ações'; 
          map[t] = (map[t] || 0) + (p.currentPrice || p.averagePrice) * p.quantity; 
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [portfolio]);

  const COLORS = ['#1e293b', '#64748b', '#94a3b8'];

  return (
    <div className="pt-24 pb-32 px-5 space-y-5 max-w-lg mx-auto">
      
      {/* 1. HERO CARD (Solid Dark Mode optimized) */}
      <div className="anim-fade-in-up is-visible">
        <div className="w-full bg-white dark:bg-[#0F1623] p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Patrimônio Total</span>
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{formatBRL(balance)}</h2>
                {isAiLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>
            
            <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold ${isProfitPositive ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {isProfitPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatPercent(totalProfitPercent)}
                </div>
                <span className="text-xs font-medium text-slate-400">Rentabilidade Global</span>
            </div>
        </div>
      </div>

      {/* 2. AGENDA CARD */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '50ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-white dark:bg-[#0F1623] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform group hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
                        <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Agenda</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Próximos Eventos</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>

            {upcomingEvents.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {upcomingEvents.slice(0, 3).map((event, i) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`flex-shrink-0 pl-3 pr-4 py-3 rounded-2xl border ${style.bg} ${style.border} flex items-center gap-3 min-w-[140px]`}>
                                <div className={`w-8 h-8 rounded-xl bg-white dark:bg-[#02040A] flex items-center justify-center ${style.text}`}>
                                    <style.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider block mb-0.5 ${style.text}`}>{event.ticker}</span>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 block">
                                        {event.eventType === 'payment' ? formatBRL(event.totalReceived) : event.date.split('-').reverse().slice(0,2).join('/')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-4 bg-slate-50 dark:bg-[#02040A] rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 font-medium">Nenhum evento previsto.</p>
                </div>
            )}
        </button>
      </div>

      {/* 3. RENDA PASSIVA & ALOCAÇÃO */}
      <div className="grid grid-cols-2 gap-4 anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        {/* Renda */}
        <button onClick={() => setShowProventosModal(true)} className="bg-white dark:bg-[#0F1623] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-left active:scale-[0.98] transition-transform hover:border-slate-300 dark:hover:border-slate-700">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <CircleDollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Renda Passiva</span>
            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{formatBRL(received)}</p>
        </button>

        {/* Alocação */}
        <button onClick={() => setShowAllocationModal(true)} className="bg-white dark:bg-[#0F1623] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-left active:scale-[0.98] transition-transform hover:border-slate-300 dark:hover:border-slate-700">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-900 dark:text-white mb-4">
                <PieIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alocação</span>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mt-2">
                {typeData.map((t, i) => (
                    <div key={i} style={{ width: `${(t.value / balance) * 100}%`, background: COLORS[i] }} />
                ))}
            </div>
        </button>
      </div>

      {/* Agenda Modal */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 px-2">Agenda Completa</h2>
            <div className="space-y-3">
                {upcomingEvents.map((e, i) => {
                    const style = getEventStyle(e.eventType, e.date);
                    return (
                        <div key={i} className={`p-4 rounded-2xl bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800 flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} ${style.text}`}>
                                    <style.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{e.ticker}</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>{style.label}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900 dark:text-white">{e.date.split('-').reverse().join('/')}</p>
                                {e.eventType === 'payment' && <p className="text-xs font-medium text-slate-500">{formatBRL(e.totalReceived)}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </SwipeableModal>

      {/* Renda Modal */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="p-6 pb-20">
             <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 px-2">Histórico de Renda</h2>
             <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 text-center mb-6">
                 <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Total Recebido</p>
                 <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{formatBRL(received)}</p>
             </div>
         </div>
      </SwipeableModal>

      {/* Alocação Modal */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20">
             <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 px-2">Distribuição da Carteira</h2>
             <div className="space-y-4">
                {typeData.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }}></div>
                            <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-white">{formatPercent((t.value / balance) * 100)}</p>
                            <p className="text-xs text-slate-400">{formatBRL(t.value)}</p>
                        </div>
                    </div>
                ))}
             </div>
         </div>
      </SwipeableModal>

    </div>
  );
};

export const Home = React.memo(HomeComponent);
