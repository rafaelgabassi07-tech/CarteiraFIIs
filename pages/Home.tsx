
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2, Building2, CandlestickChart, Wallet, Calendar } from 'lucide-react';
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
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
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

  // Income History Logic
  const incomeHistory = useMemo(() => {
    const map: Record<string, number> = {};
    dividendReceipts.forEach(r => {
        if (r.paymentDate <= new Date().toISOString().split('T')[0]) {
            const key = r.paymentDate.substring(0, 7); // YYYY-MM
            map[key] = (map[key] || 0) + r.totalReceived;
        }
    });
    const sorted = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])); // Descending date
    const totalMonths = sorted.length || 1;
    const average = received / (totalMonths > 0 ? totalMonths : 1);
    
    // Find max value for bar chart scaling
    const maxVal = Math.max(...Object.values(map), 0);

    return { history: sorted, average, maxVal };
  }, [dividendReceipts, received]);

  // Allocation Data
  const typeData = useMemo(() => {
      let fiisTotal = 0;
      let stocksTotal = 0;
      
      portfolio.forEach(p => { 
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val;
          else stocksTotal += val;
      });
      
      const total = fiisTotal + stocksTotal || 1;

      return {
          fiis: { value: fiisTotal, percent: (fiisTotal / total) * 100 },
          stocks: { value: stocksTotal, percent: (stocksTotal / total) * 100 },
          total
      };
  }, [portfolio]);

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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">FIIs vs Ações</span>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mt-2">
                <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-slate-800 dark:bg-white transition-all duration-1000"></div>
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

      {/* Renda Modal (Advanced) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Proventos</h2>
                    <p className="text-xs text-slate-500 font-medium">Histórico de Pagamentos</p>
                </div>
             </div>
             
             {/* Big Stats */}
             <div className="grid grid-cols-2 gap-3 mb-8">
                 <div className="bg-emerald-500 p-5 rounded-[1.5rem] text-white shadow-lg shadow-emerald-500/20">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Recebido</p>
                     <p className="text-2xl font-black">{formatBRL(received)}</p>
                 </div>
                 <div className="bg-slate-100 dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700">
                     <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Média Mensal</p>
                     <p className="text-xl font-black text-slate-900 dark:text-white">{formatBRL(incomeHistory.average)}</p>
                 </div>
             </div>

             {/* Monthly History List */}
             <div className="space-y-4">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Evolução Mensal</h3>
                 {incomeHistory.history.length > 0 ? (
                     <div className="space-y-3">
                        {incomeHistory.history.map(([month, val], i) => {
                            const [year, m] = month.split('-');
                            const dateObj = new Date(parseInt(year), parseInt(m)-1, 1);
                            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            const percentage = (val / (incomeHistory.maxVal || 1)) * 100;

                            return (
                                <div key={month} className="bg-white dark:bg-[#0F1623] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{monthName}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{formatBRL(val)}</span>
                                    </div>
                                    {/* Visual Bar */}
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div style={{ width: `${percentage}%` }} className="h-full bg-emerald-500 rounded-full"></div>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 ) : (
                     <div className="text-center py-10 opacity-50">
                         <p className="text-xs">Nenhum provento registrado ainda.</p>
                     </div>
                 )}
             </div>
         </div>
      </SwipeableModal>

      {/* Alocação Modal (Advanced) */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
                    <PieIcon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Diversificação</h2>
                    <p className="text-xs text-slate-500 font-medium">Composição da Carteira</p>
                </div>
             </div>

             {/* DNA Bar Visual */}
             <div className="mb-8">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2 px-1">
                     <span className="text-slate-900 dark:text-white">FIIs ({formatPercent(typeData.fiis.percent)})</span>
                     <span className="text-slate-500 dark:text-slate-400">Ações ({formatPercent(typeData.stocks.percent)})</span>
                 </div>
                 <div className="h-4 w-full rounded-full flex overflow-hidden">
                     <div style={{ width: `${typeData.fiis.percent}%` }} className="bg-slate-900 dark:bg-white h-full transition-all duration-1000"></div>
                     <div style={{ width: `${typeData.stocks.percent}%` }} className="bg-slate-200 dark:bg-slate-700 h-full transition-all duration-1000"></div>
                 </div>
             </div>

             {/* Detail Cards */}
             <div className="space-y-3">
                <div className="p-5 rounded-[1.5rem] bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 shadow-lg">
                            <Building2 className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-lg">FIIs</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fundos Imobiliários</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-white">{formatBRL(typeData.fiis.value)}</p>
                        <p className="text-xs font-bold text-slate-500">{formatPercent(typeData.fiis.percent)}</p>
                    </div>
                </div>

                <div className="p-5 rounded-[1.5rem] bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <CandlestickChart className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-lg">Ações</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mercado de Capitais</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-white">{formatBRL(typeData.stocks.value)}</p>
                        <p className="text-xs font-bold text-slate-500">{formatPercent(typeData.stocks.percent)}</p>
                    </div>
                </div>
             </div>
             
             {/* Note */}
             <p className="text-center mt-8 text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                 Uma carteira diversificada reduz riscos e potencializa ganhos no longo prazo.
             </p>
         </div>
      </SwipeableModal>

    </div>
  );
};

export const Home = React.memo(HomeComponent);
