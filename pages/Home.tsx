
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction, EvolutionPoint } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, TrendingUp, Calendar, Trophy, Clock, CalendarDays, Coins, ArrowRight, Minus, Equal, ExternalLink, TrendingDown, Plus, ListFilter, CalendarCheck, Hourglass, Layers, AreaChart as AreaIcon, Banknote, Percent, ChevronRight, Loader2, Info, LayoutDashboard, History, CheckCircle2, BarChart3, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, BarChart, Bar, XAxis, Tooltip, AreaChart, Area, ComposedChart, Line, YAxis, ReferenceLine } from 'recharts';
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

const getMonthName = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${months[monthIndex]} ${parts[0]}`;
};

const getShortDateLabel = (dateStr?: string) => {
    if (!dateStr) return '(12M)';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
       const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
       const monthIndex = parseInt(parts[1], 10) - 1;
       return `(Desde ${months[monthIndex]}/${parts[0]})`;
    }
    return '(12M)';
};

const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);

    const isToday = eventDate.getTime() === today.getTime();
    const isFuture = eventDate > today;
    
    if (eventType === 'datacom') {
        return { 
            bg: 'bg-amber-50 dark:bg-amber-500/10', 
            text: 'text-amber-700 dark:text-amber-400', 
            border: 'border-amber-200 dark:border-amber-500/30',
            dot: 'bg-amber-500',
            pulse: isToday,
            icon: CalendarCheck,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    
    if (isFuture) {
         return {
            bg: 'bg-indigo-50 dark:bg-indigo-500/10',
            text: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-200 dark:border-indigo-500/30 border-dashed',
            dot: 'bg-indigo-500',
            pulse: false,
            icon: Hourglass,
            label: 'Agendado'
         };
    }
    
    return {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-500/30',
        dot: 'bg-emerald-500',
        pulse: isToday,
        icon: Banknote,
        label: isToday ? 'Pago Hoje' : 'Pago'
    };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return ( <div className="bg-slate-900/90 backdrop-blur-xl text-white text-[10px] font-bold py-2 px-3 rounded-xl shadow-xl z-50 border border-white/10"> <p className="mb-1 opacity-70 tracking-wide uppercase">{label}</p> <p className="text-emerald-400 text-sm tabular-nums">{formatBRL(payload[0].value)}</p> </div> );
  }
  return null;
};

const EvolutionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const investedValue = data.invested || 0;
      const total = data.value || 0;
      const appreciation = total - investedValue;
      const isPositive = appreciation >= 0;

      return ( 
        <div className="bg-slate-900/90 backdrop-blur-xl text-white p-3 rounded-2xl shadow-2xl border border-white/10 z-50 min-w-[160px]">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">{label}</p>
           
           <div className="space-y-1.5">
               <div className="flex justify-between items-center gap-4 text-[10px]">
                   <span className="font-semibold text-slate-400">Aportes</span>
                   <span className="font-bold text-slate-200 tabular-nums">{formatBRL(investedValue)}</span>
               </div>
               
               <div className="flex justify-between items-center gap-4 text-[10px]">
                   <span className="font-semibold text-slate-400">Valorização</span>
                   <span className={`font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {isPositive ? '+' : ''}{formatBRL(appreciation)}
                   </span>
               </div>

               <div className="pt-1.5 mt-1.5 border-t border-white/10 flex justify-between items-center gap-4">
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Total</span>
                   <span className="text-xs font-black text-white tabular-nums">{formatBRL(total)}</span>
               </div>
           </div>
        </div> 
      );
    }
    return null;
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate = 0, portfolioStartDate, accentColor = '#0ea5e9', invested, balance, totalAppreciation, transactions = [] }) => {
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealGainModal, setShowRealGainModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [incomeTab, setIncomeTab] = useState<'summary' | 'history' | 'magic'>('summary');
  const [evolutionRange, setEvolutionRange] = useState<'6M' | '1Y' | 'ALL'>('ALL');

  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  const evolutionData = useMemo(() => {
    if (transactions.length === 0) return [];
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const startDateStr = sortedTxs[0].date;
    const startYear = parseInt(startDateStr.split('-')[0]);
    const startMonth = parseInt(startDateStr.split('-')[1]);
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    let cumulativeInvested = 0;
    let cumulativeAdjusted = 0;
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    const safeMonths = Math.max(1, totalMonths);
    const monthlyInflationRate = Math.pow(1 + (inflationRate / 100), 1 / safeMonths) - 1;
    let currentIterYear = startYear;
    let currentIterMonth = startMonth;
    let txIndex = 0;
    const data: EvolutionPoint[] = [];
    const totalCurrentProfitPercent = invested > 0 ? (balance - invested) / invested : 0;

    while (currentIterYear < endYear || (currentIterYear === endYear && currentIterMonth <= endMonth)) {
        const monthKey = `${currentIterYear}-${String(currentIterMonth).padStart(2, '0')}`;
        let monthFlow = 0;
        while (txIndex < sortedTxs.length && sortedTxs[txIndex].date.startsWith(monthKey)) {
            const tx = sortedTxs[txIndex];
            const amount = tx.quantity * tx.price;
            if (tx.type === 'BUY') monthFlow += amount;
            else monthFlow -= amount;
            txIndex++;
        }
        cumulativeInvested += monthFlow;
        if (data.length === 0) { cumulativeAdjusted = monthFlow; } 
        else { cumulativeAdjusted = (cumulativeAdjusted * (1 + monthlyInflationRate)) + monthFlow; }
        const timeProgress = data.length / safeMonths;
        const currentEstimatedYield = totalCurrentProfitPercent * Math.pow(timeProgress, 0.5);
        const simulatedValue = cumulativeInvested * (1 + currentEstimatedYield);
        const [year, month] = monthKey.split('-');
        const monthNames = ['Jan', 'Fev', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        data.push({
            rawDate: monthKey,
            date: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
            invested: Math.max(0, cumulativeInvested),
            adjusted: Math.max(0, cumulativeAdjusted),
            value: (currentIterYear === endYear && currentIterMonth === endMonth) ? balance : Math.max(0, simulatedValue),
            monthlyInflationCost: Math.max(0, cumulativeAdjusted - cumulativeInvested)
        });
        currentIterMonth++;
        if (currentIterMonth > 12) { currentIterMonth = 1; currentIterYear++; }
    }
    return data;
  }, [transactions, balance, invested, inflationRate]);

  const filteredEvolutionData = useMemo(() => {
    if (evolutionRange === 'ALL') return evolutionData;
    const slice = evolutionRange === '6M' ? 6 : 12;
    return evolutionData.slice(-slice);
  }, [evolutionData, evolutionRange]);

  const { received, upcoming, averageMonthly, bestPayer, chartData, upcomingEvents, historyGrouped } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tickerTotalMap: Record<string, number> = {}, monthlyTotals: Record<string, number> = {}, historyGrouped: Record<string, { total: number, items: DividendReceipt[] }> = {};
    let totalReceivedValue = 0;
    dividendReceipts.forEach(receipt => {
      const payDate = receipt.paymentDate;
      if (payDate <= todayStr) {
        totalReceivedValue += receipt.totalReceived;
        const monthKey = payDate.substring(0, 7);
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + receipt.totalReceived;
        if (!historyGrouped[monthKey]) historyGrouped[monthKey] = { total: 0, items: [] };
        historyGrouped[monthKey].items.push(receipt);
        historyGrouped[monthKey].total += receipt.totalReceived;
        tickerTotalMap[receipt.ticker] = (tickerTotalMap[receipt.ticker] || 0) + receipt.totalReceived;
      }
    });
    const allUpcomingEvents: any[] = [];
    dividendReceipts.forEach(receipt => {
      if (receipt.paymentDate >= todayStr) allUpcomingEvents.push({ ...receipt, eventType: 'payment', date: receipt.paymentDate });
      if (receipt.dateCom >= todayStr) allUpcomingEvents.push({ ...receipt, eventType: 'datacom', date: receipt.dateCom });
    });
    allUpcomingEvents.sort((a, b) => a.date.localeCompare(b.date));
    const uniqueUpcomingEvents = allUpcomingEvents.reduce((acc: any[], current) => {
      if (!acc.find(item => item.date === current.date && item.ticker === current.ticker && item.eventType === current.eventType)) acc.push(current);
      return acc;
    }, []);
    const upcomingValue = uniqueUpcomingEvents.filter(e => e.eventType === 'payment' && e.date > todayStr).reduce((acc, curr) => acc + curr.totalReceived, 0);
    const uniqueMonths = new Set(Object.keys(monthlyTotals)).size || 1;
    let maxVal = 0, maxTicker = '-';
    Object.entries(tickerTotalMap).forEach(([t, val]) => { if(val > maxVal) { maxVal = val; maxTicker = t; } });
    const last12MonthsData = Object.entries(monthlyTotals).sort((a,b) => a[0].localeCompare(b[0])).slice(-12).map(([key, value]) => ({ name: key.split('-')[1] + '/' + key.split('-')[0].substring(2), value: value }));
    return { received: totalReceivedValue, upcoming: upcomingValue, averageMonthly: totalReceivedValue / (uniqueMonths || 1), bestPayer: { ticker: maxTicker, value: maxVal }, chartData: last12MonthsData, upcomingEvents: uniqueUpcomingEvents, historyGrouped };
  }, [dividendReceipts]);

  const sortedHistoryKeys = useMemo(() => Object.keys(historyGrouped).sort((a,b) => b.localeCompare(a)), [historyGrouped]);
  const flatHistory = useMemo(() => sortedHistoryKeys.flatMap(monthKey => [{ type: 'header' as const, month: monthKey, total: historyGrouped[monthKey].total }, ...historyGrouped[monthKey].items.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).map(item => ({ type: 'item' as const, data: item }))]), [sortedHistoryKeys, historyGrouped]);

  const yieldOnCostPortfolio = useMemo(() => (invested <= 0) ? 0 : (received / invested) * 100, [received, invested]);
  const { typeData, segmentData } = useMemo(() => {
    const typesMap: Record<string, number> = {}, segmentsMap: Record<string, number> = {};
    portfolio.forEach(p => { const val = (p.currentPrice || p.averagePrice) * p.quantity; const t = p.assetType === AssetType.FII ? 'FIIs' : 'Ações'; typesMap[t] = (typesMap[t] || 0) + val; const s = p.segment || 'Outros'; segmentsMap[s] = (segmentsMap[s] || 0) + val; });
    const typeData = Object.entries(typesMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    const segmentData = Object.entries(segmentsMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    return { typeData, segmentData };
  }, [portfolio]);
  
  const magicNumbers = useMemo(() => portfolio.map(p => { const lastDiv = [...dividendReceipts].filter(d => d.ticker === p.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0]; if (!lastDiv || !p.currentPrice || lastDiv.rate <= 0) return null; const magicQty = Math.ceil(p.currentPrice / lastDiv.rate); if (!isFinite(magicQty) || magicQty <= 0) return null; return { ticker: p.ticker, currentQty: p.quantity, magicQty, progress: Math.min(100, (p.quantity / magicQty) * 100), missing: Math.max(0, magicQty - p.quantity), rate: lastDiv.rate }; }).filter(m => m !== null).sort((a,b) => (b?.progress || 0) - (a?.progress || 0)), [portfolio, dividendReceipts]);
  
  const COLORS = useMemo(() => [accentColor, '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f97316', '#64748b', '#d946ef', '#22c55e'], [accentColor]);
  
  const finalIPCA = inflationRate > 0 ? inflationRate : 0;
  
  const lastEvolutionPoint = useMemo(() => evolutionData.length > 0 ? evolutionData[evolutionData.length - 1] : null, [evolutionData]);

  const custoCorrosaoInflacao = lastEvolutionPoint 
      ? lastEvolutionPoint.monthlyInflationCost 
      : invested * (finalIPCA / 100);

  const lucroNominalAbsoluto = totalProfitValue;
  const ganhoRealValor = lucroNominalAbsoluto - custoCorrosaoInflacao;
  
  const nominalYield = invested > 0 ? (totalProfitValue / invested) * 100 : 0;
  const nominalFactor = 1 + (nominalYield / 100);
  const inflationFactor = 1 + (finalIPCA / 100);
  const ganhoRealPercent = inflationFactor !== 0 ? ((nominalFactor / inflationFactor) - 1) * 100 : nominalYield;
  
  const isAboveInflation = ganhoRealValor >= 0;
  const dateLabel = getShortDateLabel(portfolioStartDate);

  return (
    <div className="pt-24 pb-28 px-5 space-y-4 max-w-lg mx-auto">
      
      {/* CARD PRINCIPAL (PATRIMÔNIO) */}
      <div className="anim-fade-in-up is-visible">
        <button onClick={() => setShowSummaryModal(true)} className="w-full text-left bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/60 dark:border-white/5 relative overflow-hidden group transition-all duration-300 active:scale-[0.98]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                            <Wallet className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patrimônio Total</span>
                            <div className="flex items-center gap-2">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{formatBRL(balance)}</h2>
                                {isAiLoading && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />}
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-[1.5rem] border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Resultado Geral</span>
                        <div className={`flex items-center gap-1.5 font-bold text-sm tabular-nums ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {formatPercent(totalProfitPercent)}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-[1.5rem] border border-slate-100 dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Renda Acumulada</span>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                            <CircleDollarSign className="w-3.5 h-3.5" />
                            {formatBRL(totalDividendsReceived)}
                        </div>
                    </div>
                </div>
            </div>
        </button>
      </div>

      {/* CARD AGENDA DE PROVENTOS */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '50ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/[0.05] dark:to-purple-500/[0.05] p-6 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/10 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-indigo-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-center justify-between relative z-10 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-[#0f172a] rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110 transition-transform"><CalendarDays className="w-6 h-6" strokeWidth={2} /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Agenda de Proventos</h3>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos Próximos` : 'Nenhum evento previsto'}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          {upcomingEvents.length > 0 ? (<div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade relative z-10">{upcomingEvents.slice(0, 4).map((event, i) => { const style = getEventStyle(event.eventType, event.date); return ( <div key={i} className={`flex items-center gap-2 bg-white dark:bg-[#0f172a] px-3 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap shadow-sm min-w-max border ${style.border} ${style.text}`}><div className={`w-1.5 h-1.5 rounded-full ${style.pulse ? 'animate-pulse' : ''} ${style.dot}`}></div><span>{event.ticker}: {event.eventType === 'payment' ? formatBRL(event.totalReceived) : `Data Com`}</span></div> ); })}</div>) : (<div className="inline-block px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[10px] font-medium text-slate-400">Sua agenda está limpa.</div>)}
        </button>
      </div>

      {/* CARD RENDA PASSIVA */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/[0.05] dark:to-teal-500/[0.05] p-5 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-500/10 active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 pointer-events-auto">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-110 transition-transform"><CircleDollarSign className="w-5 h-5" strokeWidth={2} /></div>
                <div><h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Renda Passiva</h3><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Extrato Completo</p></div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-right"><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Total</p><p className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatBRL(received)}</p></div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1"><div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Média</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(averageMonthly)}</p></div><div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Yield on Cost</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{yieldOnCostPortfolio.toFixed(2)}%</p></div></div>
          </div>
        </button>
      </div>

      {/* CARD ALOCAÇÃO RÁPIDA */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '150ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className="w-full text-left bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 dark:border-amber-500/20 group-hover:scale-110 transition-transform"><PieIcon className="w-5 h-5" strokeWidth={2} /></div>
              <div><h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Minha Alocação</h3><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Distribuição da Carteira</p></div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2 flex-1 flex rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
              {typeData.map((type, i) => (<div key={type.name} style={{ width: `${(type.value / balance) * 100}%`, backgroundColor: COLORS[i] }} className="h-full first:rounded-l-full last:rounded-r-full"></div>))}
            </div>
            <div className="flex gap-3">
              {typeData.map((type, i) => (<div key={type.name} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{type.name}</span></div>))}
            </div>
          </div>
        </button>
      </div>

      {/* CARD GANHO REAL */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowRealGainModal(true)} className="w-full text-left bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/[0.05] dark:to-purple-500/[0.05] p-5 rounded-[2.5rem] border border-blue-100 dark:border-blue-500/10 active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-xl hover:shadow-blue-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5" strokeWidth={2} /></div>
              <div><h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Poder de Compra</h3><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Rentabilidade vs IPCA</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Ganho Real</p><p className={`text-lg font-black tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{ganhoRealPercent.toFixed(2)}%</p></div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      </div>

      {/* --- MODAIS --- */}

      {/* MODAL RESUMO PATRIMONIAL */}
      <SwipeableModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)}>
        <div className="p-6">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-accent/10 rounded-3xl flex items-center justify-center text-accent"><Wallet className="w-7 h-7" /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Evolução</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateLabel}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Investido</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(invested)}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">Valor de aquisição</p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Valor de Mercado</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(balance)}</p>
                    <p className={`text-[10px] font-bold mt-1 ${totalAppreciation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {totalAppreciation >= 0 ? '+' : ''}{formatBRL(totalAppreciation)}
                    </p>
                </div>
            </div>
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-200/50 dark:border-white/5 shadow-xl mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <AreaIcon className="w-4 h-4 text-accent" /> Histórico de Patrimônio
                    </h3>
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        {(['6M', '1Y', 'ALL'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setEvolutionRange(range)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${evolutionRange === range ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                            >
                                {range === 'ALL' ? 'Tudo' : range}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-48 w-full mt-4 -mx-4 px-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredEvolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} minTickGap={30} />
                            <Tooltip content={<EvolutionTooltip />} />
                            <Area type="monotone" dataKey="value" stroke={accentColor} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" animationDuration={1000}/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="space-y-3 pb-10">
                <div className="flex justify-between items-center bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Coins className="w-4 h-4" /></div><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lucro com Vendas</span></div>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatBRL(salesGain)}</span>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Banknote className="w-4 h-4" /></div><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total de Proventos</span></div>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">+{formatBRL(totalDividendsReceived)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900 dark:bg-white p-5 rounded-[2rem] shadow-xl mt-4">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-900/10 flex items-center justify-center text-white dark:text-slate-900"><Trophy className="w-5 h-5" /></div><span className="text-sm font-black text-white dark:text-slate-900">Retorno Total Bruto</span></div>
                    <div className="text-right"><p className="text-lg font-black text-white dark:text-slate-900 tabular-nums leading-none mb-1">{formatBRL(totalProfitValue)}</p><p className="text-[10px] font-black text-white/60 dark:text-slate-900/60 uppercase tracking-widest">{formatPercent(totalProfitPercent)}</p></div>
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL ALOCAÇÃO DETALHADA */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 shadow-sm">
                    <PieIcon className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Distribuição</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise de Risco e Setores</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-200/50 dark:border-white/5 shadow-xl mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Divisão por Classe</h3>
                <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" animationDuration={1000}>
                                {typeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatBRL(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    {typeData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.name}</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">{formatPercent((item.value / balance) * 100)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-200/50 dark:border-white/5 shadow-xl">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Divisão por Segmento</h3>
                <div className="space-y-4">
                    {segmentData.slice(0, 8).map((seg, i) => {
                        const percent = (seg.value / balance) * 100;
                        return (
                            <div key={seg.name}>
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate mr-4">{seg.name}</span>
                                    <span className="text-[10px] font-black text-slate-400 tabular-nums">{percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length], opacity: 0.8 }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL PODER DE COMPRA / GANHO REAL */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
        <div className="p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-sm">
                    <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Ganho Real</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rentabilidade Acima da Inflação</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 opacity-80">Patrimônio vs Inflação</p>
                
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-4xl font-black tabular-nums tracking-tighter mb-1">{formatPercent(ganhoRealPercent)}</h3>
                        <p className="text-xs font-bold text-blue-100">Resultado Acima do IPCA</p>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-md border border-white/10">
                        {isAboveInflation ? <ShieldCheck className="w-8 h-8 text-emerald-400" /> : <AlertTriangle className="w-8 h-8 text-amber-400" />}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><TrendingUp className="w-5 h-5" /></div>
                        <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Lucro Nominal</span>
                            <p className="text-[10px] text-slate-400 font-medium">Valorização + Proventos</p>
                        </div>
                    </div>
                    <span className="text-base font-black text-indigo-500 tabular-nums">+{formatBRL(lucroNominalAbsoluto)}</span>
                </div>

                <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500"><TrendingDown className="w-5 h-5" /></div>
                        <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Custo da Inflação</span>
                            <p className="text-[10px] text-slate-400 font-medium">Perda de Poder de Compra ({finalIPCA.toFixed(1)}%)</p>
                        </div>
                    </div>
                    <span className="text-base font-black text-rose-500 tabular-nums">-{formatBRL(custoCorrosaoInflacao)}</span>
                </div>

                <div className="pt-4 px-4 text-center">
                    <div className="h-[1px] w-full bg-slate-100 dark:bg-white/5 mb-6"></div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto italic">
                        "Seu ganho real é o quanto você realmente enriqueceu após descontar o aumento generalizado de preços na economia."
                    </p>
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL AGENDA */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 py-2">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500"><CalendarDays className="w-7 h-7" /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Próximos Passos</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cronograma de ganhos</p></div>
            </div>
            {upcomingEvents.length === 0 ? (
                <div className="text-center py-20 opacity-50"><Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" /><p className="text-sm font-bold text-slate-400">Nenhum evento futuro encontrado.</p></div>
            ) : (
                <div className="space-y-4 pb-12">
                    {upcomingEvents.map((event, i) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`p-5 rounded-[2rem] border-2 shadow-sm transition-all hover:scale-[1.02] flex items-center justify-between ${style.bg} ${style.border}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${style.text} bg-white dark:bg-[#0f172a] shadow-sm`}><style.icon className="w-6 h-6" /></div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5"><h4 className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">{event.ticker}</h4><span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${style.bg} ${style.text}`}>{style.label}</span></div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{event.date.split('-').reverse().join('/')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {event.eventType === 'payment' ? (
                                        <><p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Previsão</p><p className={`text-base font-black tabular-nums ${style.text}`}>{formatBRL(event.totalReceived)}</p></>
                                    ) : (
                                        <div className="flex items-center gap-2 text-amber-500"><Sparkles className="w-4 h-4 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest">Garantir!</span></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </SwipeableModal>

      {/* MODAL RENDA PASSIVA REFINADO (Corrigido Scroll/Fechamento) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="bg-primary-light dark:bg-[#0b1121] min-h-full pb-safe">
            <div className="sticky top-0 z-20 bg-primary-light/95 dark:bg-[#0b1121]/95 backdrop-blur-md px-6 pt-4 pb-6 border-b border-transparent transition-all">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                            <CircleDollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Minha Renda</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Estatísticas e Histórico</p>
                        </div>
                    </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-[1.75rem] border border-slate-200/50 dark:border-white/5">
                    {[
                        { id: 'summary', label: 'Resumo', icon: LayoutDashboard },
                        { id: 'history', label: 'Extrato', icon: History },
                        { id: 'magic', label: 'Magic', icon: Sparkles }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setIncomeTab(tab.id as any)} 
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                incomeTab === tab.id 
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md scale-[1.02]' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="px-6 pb-24">
                {incomeTab === 'summary' && (
                    <div className="space-y-6 anim-fade-in-up is-visible">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3 opacity-90">Total Recebido</p>
                            <div className="flex items-baseline gap-2 mb-8">
                                <span className="text-lg font-bold opacity-70">R$</span>
                                <h3 className="text-4xl font-black tabular-nums tracking-tighter">{received.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="pt-6 border-t border-white/20 grid grid-cols-2 gap-6">
                                <div><p className="text-[9px] font-black uppercase opacity-70 mb-1 tracking-widest">Média Mensal</p><p className="text-lg font-black tabular-nums">{formatBRL(averageMonthly)}</p></div>
                                <div><p className="text-[9px] font-black uppercase opacity-70 mb-1 tracking-widest">Yield on Cost</p><p className="text-lg font-black tabular-nums">{yieldOnCostPortfolio.toFixed(2)}%</p></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
                            <div className="flex items-center justify-between mb-8"><h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Últimos 12 Meses</h4></div>
                            <div className="h-44 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" hide />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                        <Bar dataKey="value" fill={accentColor} radius={[6, 6, 0, 0]} animationDuration={1500}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm transition-transform active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Hourglass className="w-6 h-6" /></div>
                                    <div><span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Proventos Provisionados</span></div>
                                </div>
                                <span className="text-base font-black text-amber-500 tabular-nums">{formatBRL(upcoming)}</span>
                            </div>
                            <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm transition-transform active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Trophy className="w-6 h-6" /></div>
                                    <div><span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Melhor Pagador</span></div>
                                </div>
                                <span className="text-base font-black text-indigo-500 tabular-nums">{bestPayer.ticker}</span>
                            </div>
                        </div>
                    </div>
                )}
                {incomeTab === 'history' && (
                    <div className="space-y-0 anim-fade-in-up is-visible">
                        {flatHistory.map((item, index) => {
                            if (item.type === 'header') return (
                                <div key={`h-${index}`} className="flex items-center justify-between px-3 pt-6 pb-2">
                                    <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />{getMonthName(item.month)}</h4>
                                    <div className="h-[1px] flex-1 mx-4 bg-slate-200 dark:bg-white/5"></div>
                                    <span className="text-xs font-black text-emerald-500 tabular-nums">{formatBRL(item.total)}</span>
                                </div>
                            );
                            const h = item.data;
                            return (
                                <div key={`i-${index}`} className="py-1.5">
                                    <div className="bg-white dark:bg-[#0f172a] p-4 rounded-[1.75rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm transition-all hover:border-emerald-500/30 active:scale-[0.98]">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-black/20 flex flex-col items-center justify-center font-black text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-white/5">
                                                <span className="text-xs leading-none">{h.paymentDate.split('-')[2]}</span>
                                                <span className="text-[9px] uppercase mt-0.5 opacity-60">{h.paymentDate.split('-')[1]}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1 truncate">{h.ticker}</h5>
                                                <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{h.type.replace('JRS CAP PROPRIO', 'JCP')}</span><span className="text-[9px] text-slate-300">•</span><span className="text-[9px] font-bold text-slate-400">{h.quantityOwned} cotas</span></div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">{formatBRL(h.totalReceived)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {incomeTab === 'magic' && (
                    <div className="space-y-4 anim-fade-in-up is-visible">
                        {magicNumbers.map(m => (
                            <div key={m.ticker} className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${m.missing === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/5'}`}>{m.ticker.substring(0,4)}</div>
                                        <div><h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">{m.ticker}</h4><p className="text-[10px] text-slate-400">Progresso: {m.progress.toFixed(1)}%</p></div>
                                    </div>
                                    <div className="text-right">{m.missing > 0 ? <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{m.missing} cotas</p> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}</div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div style={{ width: `${m.progress}%` }} className={`h-full rounded-full transition-all duration-1000 ${m.missing === 0 ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
