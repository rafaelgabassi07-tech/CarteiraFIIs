
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

// Cores refinadas e harmoniosas (Professional Palette)
const COLORS = [
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#06b6d4'  // Cyan 500
];

// Logic for solid styling of event badges (Harmonized with Zinc)
const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string) => {
    const isToday = new Date(dateStr + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    
    if (eventType === 'datacom') {
        return { 
            // Base neutra com acento Amber
            containerClass: 'bg-amber-50 dark:bg-amber-950/20 border-l-[3px] border-l-amber-400 border-y border-r border-amber-100 dark:border-amber-900',
            iconClass: 'text-amber-500',
            textClass: 'text-amber-700 dark:text-amber-300',
            valueClass: 'text-amber-800 dark:text-amber-200 font-medium',
            icon: CalendarDays,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    return {
        // Base neutra com acento Emerald
        containerClass: 'bg-emerald-50 dark:bg-emerald-950/20 border-l-[3px] border-l-emerald-500 border-y border-r border-emerald-100 dark:border-emerald-900',
        iconClass: 'text-emerald-500',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        valueClass: 'text-emerald-800 dark:text-emerald-200 font-bold',
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
  
  // Estado para expandir o mês no histórico de proventos
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

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

  // Income History & Best Payer Logic
  const { history, average, maxVal, bestPayer, receiptsByMonth } = useMemo(() => {
    const map: Record<string, number> = {};
    const payerMap: Record<string, number> = {};
    const receiptsByMonthMap: Record<string, DividendReceipt[]> = {};

    dividendReceipts.forEach(r => {
        // Build History
        if (r.paymentDate <= new Date().toISOString().split('T')[0]) {
            const key = r.paymentDate.substring(0, 7); // YYYY-MM
            map[key] = (map[key] || 0) + r.totalReceived;
            
            // Build Receipts by Month for Detail View
            if (!receiptsByMonthMap[key]) receiptsByMonthMap[key] = [];
            receiptsByMonthMap[key].push(r);

            // Build Best Payer
            payerMap[r.ticker] = (payerMap[r.ticker] || 0) + r.totalReceived;
        }
    });
    const sorted = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])); // Descending date
    const totalMonths = sorted.length || 1;
    const average = received / (totalMonths > 0 ? totalMonths : 1);
    const maxVal = Math.max(...Object.values(map), 0);

    // Find Best Payer
    const sortedPayers = Object.entries(payerMap).sort((a, b) => b[1] - a[1]);
    const bestPayer = sortedPayers.length > 0 ? { ticker: sortedPayers[0][0], value: sortedPayers[0][1] } : null;

    return { history: sorted, average, maxVal, bestPayer, receiptsByMonth: receiptsByMonthMap };
  }, [dividendReceipts, received]);

  // Allocation & Top Assets Data
  const { typeData, topAssets, segmentsData } = useMemo(() => {
      let fiisTotal = 0;
      let stocksTotal = 0;
      const segmentsMap: Record<string, number> = {};
      
      const enriched = portfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val;
          else stocksTotal += val;
          
          // Segment logic
          const segName = p.segment || 'Outros';
          segmentsMap[segName] = (segmentsMap[segName] || 0) + val;

          return { ...p, totalValue: val };
      });
      
      const total = fiisTotal + stocksTotal || 1;
      
      // Prepare Segments Data for Recharts
      const segmentsData = Object.entries(segmentsMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Top 3 Assets by Value
      const sortedAssets = [...enriched].sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);

      return {
          typeData: {
            fiis: { value: fiisTotal, percent: (fiisTotal / total) * 100 },
            stocks: { value: stocksTotal, percent: (stocksTotal / total) * 100 },
            total
          },
          topAssets: sortedAssets,
          segmentsData
      };
  }, [portfolio]);

  const toggleMonthExpand = (monthKey: string) => {
      setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  return (
    <div className="pt-24 pb-32 px-5 space-y-5 max-w-lg mx-auto">
      
      {/* 1. HERO CARD - Gradient for Hierarchy */}
      <div className="anim-fade-in-up is-visible">
        <div className="w-full bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-card dark:shadow-card-dark">
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Patrimônio Total</span>
                {isAiLoading && <Loader2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400 animate-spin" />}
            </div>
            
            <div className="mb-8">
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none mb-1">{formatBRL(balance)}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-5 border-t border-zinc-200 dark:border-zinc-800/50">
                {/* Investment Cost */}
                <div>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                        <Wallet className="w-3 h-3" /> Valor Aplicado
                    </span>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(invested)}</p>
                </div>

                {/* Profit/Loss */}
                <div className="text-right">
                     <span className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                        Rentabilidade
                    </span>
                    <div className={`flex flex-col items-end`}>
                        <span className={`text-sm font-black flex items-center gap-1 ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? '+' : ''}{formatBRL(totalProfitValue)}
                        </span>
                        <span className={`text-[10px] font-bold ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? <ArrowUpRight className="w-3 h-3 inline mr-0.5" /> : <ArrowDownRight className="w-3 h-3 inline mr-0.5" />}
                            {formatPercent(totalProfitPercent)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. AGENDA CARD - Clean Look with colored badges */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '50ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-surface-light dark:bg-surface-dark p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 active:scale-[0.98] transition-transform group hover:border-zinc-300 dark:hover:border-zinc-700 shadow-card dark:shadow-card-dark">
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                        <CalendarDays className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Agenda</h3>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                            {upcomingEvents.length > 0 ? `Próximo: ${upcomingEvents[0].ticker}` : 'Sem eventos'}
                        </p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>

            {upcomingEvents.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {upcomingEvents.slice(0, 4).map((event, i) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`flex-shrink-0 p-3 pr-4 rounded-xl ${style.containerClass} min-w-[130px]`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white`}>{event.ticker}</span>
                                    <style.icon className={`w-3.5 h-3.5 ${style.iconClass}`} />
                                </div>
                                <span className={`text-xs block ${style.valueClass}`}>
                                    {event.eventType === 'payment' ? formatBRL(event.totalReceived) : event.date.split('-').reverse().slice(0,2).join('/')}
                                </span>
                                <span className={`text-[9px] font-medium block mt-0.5 ${style.textClass}`}>
                                     {getDaysUntil(event.date)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Nenhum evento previsto para os próximos dias.</p>
                </div>
            )}
        </button>
      </div>

      {/* 3. RENDA PASSIVA & ALOCAÇÃO - Colored Icons */}
      <div className="grid grid-cols-2 gap-4 anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        {/* Renda */}
        <button onClick={() => setShowProventosModal(true)} className="bg-surface-light dark:bg-surface-dark p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 text-left active:scale-[0.98] transition-transform hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full relative overflow-hidden shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900/30">
                    <CircleDollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">Renda Passiva</span>
                <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-tight mb-1">{formatBRL(received)}</p>
                <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">Média: {formatBRL(average)}/mês</p>
            </div>
            
            {bestPayer && (
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" /> Maior Pagador
                    </p>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{bestPayer.ticker}</span>
                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(bestPayer.value)}</span>
                    </div>
                </div>
            )}
        </button>

        {/* Alocação */}
        <button onClick={() => setShowAllocationModal(true)} className="bg-surface-light dark:bg-surface-dark p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 text-left active:scale-[0.98] transition-transform hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30">
                    <PieIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">Diversificação</span>
                
                {/* Visual Bar - Uses Indigo for FIIs, Sky for Stocks */}
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mt-2 mb-2">
                    <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-1000"></div>
                    <div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 dark:bg-sky-400 transition-all duration-1000"></div>
                </div>
                
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span>
                    <span className="text-sky-600 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span>
                </div>
            </div>

            {topAssets.length > 0 && (
                 <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <Target className="w-3 h-3 text-sky-500" /> Maior Posição
                    </p>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{topAssets[0].ticker}</span>
                        <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500">{formatPercent((topAssets[0].totalValue / typeData.total) * 100)}</span>
                    </div>
                </div>
            )}
        </button>
      </div>

      {/* Agenda Modal */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 px-2">Agenda Completa</h2>
            <div className="space-y-3">
                {upcomingEvents.map((e, i) => {
                    const style = getEventStyle(e.eventType, e.date);
                    return (
                        <div key={i} className={`p-4 rounded-2xl flex items-center justify-between ${style.containerClass}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm ${style.iconClass}`}>
                                    <style.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase">{e.ticker}</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${style.textClass}`}>{style.label}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1 mb-0.5 text-[10px] font-bold text-zinc-400">
                                    <Clock className="w-3 h-3" />
                                    <span>{getDaysUntil(e.date)}</span>
                                </div>
                                <p className="text-sm font-black text-zinc-900 dark:text-white">{e.date.split('-').reverse().join('/')}</p>
                                {e.eventType === 'payment' && <p className={`text-xs ${style.valueClass}`}>{formatBRL(e.totalReceived)}</p>}
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
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2>
                    <p className="text-xs text-zinc-500 font-medium">Histórico de Pagamentos</p>
                </div>
             </div>
             
             {/* Big Stats */}
             <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-emerald-500 p-5 rounded-[1.5rem] text-white shadow-lg shadow-emerald-500/20">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Recebido</p>
                     <p className="text-2xl font-black">{formatBRL(received)}</p>
                 </div>
                 <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700">
                     <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Média Mensal</p>
                     <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(average)}</p>
                 </div>
             </div>

            {/* Best Payer Card */}
            {bestPayer && (
                <div className="mb-8 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Trophy className="w-5 h-5" />
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Maior Pagador</p>
                             <p className="text-sm font-black text-zinc-900 dark:text-white">{bestPayer.ticker}</p>
                         </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(bestPayer.value)}</span>
                </div>
            )}

             {/* Monthly History List (Drill-down Improved) */}
             <div className="space-y-4">
                 <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-2">Evolução Mensal</h3>
                 {history.length > 0 ? (
                     <div className="space-y-4">
                        {history.map(([month, val], i) => {
                            const [year, m] = month.split('-');
                            const dateObj = new Date(parseInt(year), parseInt(m)-1, 1);
                            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            const percentage = (val / (maxVal || 1)) * 100;
                            const isExpanded = expandedMonth === month;
                            const monthlyDetails = receiptsByMonth[month] || [];

                            return (
                                <div 
                                    key={month} 
                                    className={`group rounded-[1.5rem] transition-all duration-300 border overflow-hidden ${isExpanded ? 'bg-white dark:bg-zinc-900 border-emerald-500 shadow-lg scale-[1.02] z-10' : 'bg-surface-light dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                >
                                    <button 
                                        onClick={() => toggleMonthExpand(month)}
                                        className="w-full p-5 flex flex-col gap-2 relative"
                                    >
                                        <div className="w-full flex justify-between items-center relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border border-zinc-100 dark:border-zinc-800 ${isExpanded ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                                                    <Calendar className="w-5 h-5" strokeWidth={2} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={`text-sm font-black capitalize block leading-tight ${isExpanded ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>{monthName}</span>
                                                    {isExpanded ? (
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <ChevronUp className="w-3 h-3" /> Detalhes
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                                            {monthlyDetails.length} {monthlyDetails.length === 1 ? 'pagamento' : 'pagamentos'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-base font-black block ${isExpanded ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(val)}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Progress Bar Background */}
                                        {!isExpanded && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800">
                                                <div style={{ width: `${percentage}%` }} className="h-full bg-emerald-500 opacity-60 rounded-r-full"></div>
                                            </div>
                                        )}
                                    </button>
                                    
                                    {/* Expanded Detail View */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 anim-fade-in">
                                            <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 mb-4"></div>
                                            <div className="space-y-2">
                                                {monthlyDetails
                                                    .reduce((acc: any[], r) => {
                                                        const exist = acc.find(i => i.ticker === r.ticker);
                                                        if(exist) exist.totalReceived += r.totalReceived;
                                                        else acc.push({...r});
                                                        return acc;
                                                    }, [])
                                                    .sort((a,b) => b.totalReceived - a.totalReceived)
                                                    .map((detail: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-700 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-600">
                                                                {detail.ticker.substring(0,2)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                                                    {detail.ticker}
                                                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-300 font-medium uppercase tracking-wider">{detail.type || 'DIV'}</span>
                                                                </p>
                                                                <p className="text-[10px] text-zinc-400 font-medium">Dia {new Date(detail.paymentDate).getUTCDate()}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg">
                                                            {formatBRL(detail.totalReceived)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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

      {/* Alocação Modal (Advanced with Charts) */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <PieIcon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Diversificação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Composição da Carteira</p>
                </div>
             </div>

             {/* DNA Bar Visual (Simple) */}
             <div className="mb-8">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2 px-1">
                     <span className="text-indigo-600 dark:text-indigo-400">FIIs ({formatPercent(typeData.fiis.percent)})</span>
                     <span className="text-sky-600 dark:text-sky-400">Ações ({formatPercent(typeData.stocks.percent)})</span>
                 </div>
                 <div className="h-4 w-full rounded-full flex overflow-hidden">
                     <div style={{ width: `${typeData.fiis.percent}%` }} className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-1000"></div>
                     <div style={{ width: `${typeData.stocks.percent}%` }} className="bg-sky-500 dark:bg-sky-400 h-full transition-all duration-1000"></div>
                 </div>
             </div>

             {/* Segments Chart (Recharts) */}
             {segmentsData.length > 0 && (
                <div className="mb-8 p-4 bg-surface-light dark:bg-surface-dark rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Distribuição por Segmento
                    </h3>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={segmentsData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {segmentsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => formatBRL(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Segmentos</span>
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {segmentsData.slice(0, 6).map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[100px]">{entry.name}</span>
                                <span className="text-[9px] text-zinc-400 ml-auto">{formatPercent((entry.value / typeData.total) * 100)}</span>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {/* Detail Cards */}
             <div className="space-y-3 mb-8">
                <div className="p-5 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                            <Building2 className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-indigo-900 dark:text-indigo-100 text-lg">FIIs</h3>
                            <p className="text-[10px] font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-widest">Fundos Imobiliários</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-indigo-900 dark:text-indigo-100">{formatBRL(typeData.fiis.value)}</p>
                        <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{formatPercent(typeData.fiis.percent)}</p>
                    </div>
                </div>

                <div className="p-5 rounded-[1.5rem] bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-sky-900/50 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                            <CandlestickChart className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-sky-900 dark:text-sky-100 text-lg">Ações</h3>
                            <p className="text-[10px] font-bold text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest">Mercado de Capitais</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-sky-900 dark:text-sky-100">{formatBRL(typeData.stocks.value)}</p>
                        <p className="text-xs font-bold text-sky-500 dark:text-sky-400">{formatPercent(typeData.stocks.percent)}</p>
                    </div>
                </div>
             </div>

             {/* Top Assets List */}
             {topAssets.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4 text-zinc-400" />
                        <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Top 3 Maiores Posições</h4>
                    </div>
                    <div className="space-y-3">
                        {topAssets.map((asset, idx) => (
                            <div key={asset.ticker} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{asset.ticker}</span>
                                </div>
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{formatBRL((asset.currentPrice || asset.averagePrice) * asset.quantity)}</span>
                            </div>
                        ))}
                    </div>
                </div>
             )}
             
             {/* Note */}
             <p className="text-center mt-8 text-[10px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
                 Uma carteira diversificada reduz riscos e potencializa ganhos no longo prazo.
             </p>
         </div>
      </SwipeableModal>

    </div>
  );
};

export const Home = React.memo(HomeComponent);
