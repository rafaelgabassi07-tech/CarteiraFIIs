
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction, EvolutionPoint } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, TrendingUp, Calendar, Trophy, Clock, CalendarDays, Coins, ArrowRight, Minus, Equal, ExternalLink, TrendingDown, Plus, ListFilter, CalendarCheck, Hourglass, Layers, AreaChart as AreaIcon, Banknote, Percent, ChevronRight, Loader2, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, BarChart, Bar, XAxis, Tooltip, AreaChart, Area, CartesianGrid, ComposedChart, Line, YAxis } from 'recharts';
import { SwipeableModal } from '../components/Layout';
// Fix: Use named import for VariableSizeList to resolve type error
import { VariableSizeList as List } from 'react-window';

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
    return ( <div className="bg-slate-900 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-xl z-50"> <p className="mb-1 opacity-70">{label}</p> <p className="text-emerald-400 text-sm">{formatBRL(payload[0].value)}</p> </div> );
  }
  return null;
};

const EvolutionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const invested = data.invested || 0;
      const total = data.value || 0;
      const appreciation = total - invested;
      const isPositive = appreciation >= 0;

      return ( 
        <div className="bg-slate-900/95 backdrop-blur-xl text-white p-3 rounded-2xl shadow-2xl border border-white/10 z-50 min-w-[160px]">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1">{label}</p>
           
           <div className="space-y-1.5">
               <div className="flex justify-between items-center gap-4 text-[10px]">
                   <span className="font-semibold text-slate-400">Aportes</span>
                   <span className="font-bold text-slate-200 tabular-nums">{formatBRL(invested)}</span>
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
  const [allocationTab, setAllocationTab] = useState<'assets' | 'types' | 'segments'>('assets');
  const [incomeTab, setIncomeTab] = useState<'summary' | 'history' | 'magic'>('summary');
  const [gainTab, setGainTab] = useState<'benchmark' | 'power' | 'history'>('benchmark');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { setActiveIndex(0); }, [allocationTab]);
  const onPieEnter = useCallback((_: any, index: number) => { setActiveIndex(index); }, []);

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
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
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
  const getItemSize = (index: number) => flatHistory[index].type === 'header' ? 48 : 96;

  const yieldOnCostPortfolio = useMemo(() => (invested <= 0) ? 0 : (received / invested) * 100, [received, invested]);
  const { assetData, typeData, segmentData } = useMemo(() => {
    const assetData = portfolio.map(p => ({ name: p.ticker, value: (p.currentPrice || p.averagePrice) * p.quantity })).sort((a,b) => b.value - a.value);
    const typesMap: Record<string, number> = {}, segmentsMap: Record<string, number> = {};
    portfolio.forEach(p => { const val = (p.currentPrice || p.averagePrice) * p.quantity; const t = p.assetType === AssetType.FII ? 'FIIs' : 'Ações'; typesMap[t] = (typesMap[t] || 0) + val; const s = p.segment || 'Outros'; segmentsMap[s] = (segmentsMap[s] || 0) + val; });
    const typeData = Object.entries(typesMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    const segmentData = Object.entries(segmentsMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    return { assetData, typeData, segmentData };
  }, [portfolio]);
  const topSegments = useMemo(() => segmentData.slice(0, 3), [segmentData]);
  const magicNumbers = useMemo(() => portfolio.map(p => { const lastDiv = [...dividendReceipts].filter(d => d.ticker === p.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0]; if (!lastDiv || !p.currentPrice || lastDiv.rate <= 0) return null; const magicQty = Math.ceil(p.currentPrice / lastDiv.rate); if (!isFinite(magicQty) || magicQty <= 0) return null; return { ticker: p.ticker, currentQty: p.quantity, magicQty, progress: Math.min(100, (p.quantity / magicQty) * 100), missing: Math.max(0, magicQty - p.quantity), rate: lastDiv.rate }; }).filter(m => m !== null).sort((a,b) => (b?.progress || 0) - (a?.progress || 0)), [portfolio, dividendReceipts]);
  const renderActiveShape = (props: any) => { const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props; return ( <g> <text x={cx} y={cy - 10} dy={0} textAnchor="middle" className="text-sm font-bold dark:fill-white fill-slate-900" style={{ fontSize: '16px' }}> {payload.name} </text> <text x={cx} y={cy + 10} dy={8} textAnchor="middle" className="text-xs font-medium fill-slate-500"> {formatBRL(value)} </text> <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={6} /> <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 12} outerRadius={outerRadius + 14} fill={fill} opacity={0.2} cornerRadius={10} /> </g> ); };
  const COLORS = useMemo(() => [accentColor, '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f97316', '#64748b', '#d946ef', '#22c55e'], [accentColor]);
  const finalIPCA = inflationRate > 0 ? inflationRate : 0;
  const nominalYield = invested > 0 ? (totalProfitValue / invested) * 100 : 0;
  const ganhoRealPercent = nominalYield - finalIPCA;
  const lucroNominalAbsoluto = totalProfitValue;
  const custoCorrosaoInflacao = invested * (finalIPCA / 100);
  const ganhoRealValor = lucroNominalAbsoluto - custoCorrosaoInflacao;
  const isAboveInflation = ganhoRealPercent > 0;

  const comparisonData = useMemo(() => [
    { name: 'Carteira', value: nominalYield, fill: isAboveInflation ? '#10b981' : '#ef4444' },
    { name: 'IPCA', value: finalIPCA, fill: '#94a3b8' }
  ].sort((a, b) => b.value - a.value), [nominalYield, finalIPCA, isAboveInflation]);

  const dateLabel = getShortDateLabel(portfolioStartDate);
  const getInflationHistoryItemSize = () => 72;

  return (
    <div className="pt-24 pb-28 px-5 space-y-4 max-w-lg mx-auto">
      
      {/* CARD PRINCIPAL (PATRIMÔNIO) */}
      <div className="anim-fade-in-up is-visible">
        <button onClick={() => setShowSummaryModal(true)} className="w-full text-left bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-white/5 relative overflow-hidden group transition-all duration-300 active:scale-[0.98]">
            
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
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">{formatBRL(balance)}</h2>
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
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/[0.05] dark:to-purple-500/[0.05] p-6 rounded-[2.5rem] border border-indigo-500/10 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-indigo-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-center justify-between relative z-10 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-[#0f172a] rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110 transition-transform"><CalendarDays className="w-6 h-6" strokeWidth={2} /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Agenda de Proventos</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos Próximos` : 'Nenhum evento previsto'}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          {upcomingEvents.length > 0 ? (<div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade relative z-10">{upcomingEvents.slice(0, 4).map((event, i) => { const style = getEventStyle(event.eventType, event.date); return ( <div key={i} className={`flex items-center gap-2 bg-white dark:bg-[#0f172a] px-3 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap shadow-sm min-w-max border ${style.border} ${style.text}`}><div className={`w-1.5 h-1.5 rounded-full ${style.pulse ? 'animate-pulse' : ''} ${style.dot}`}></div><span>{event.ticker}: {event.eventType === 'payment' ? formatBRL(event.totalReceived) : `Data Com`}</span></div> ); })}</div>) : (<div className="inline-block px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[10px] font-medium text-slate-400">Sua agenda está limpa.</div>)}
        </button>
      </div>

      {/* CARD RENDA PASSIVA */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/[0.05] dark:to-teal-500/[0.05] p-5 rounded-[2.5rem] border border-emerald-500/10 active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 pointer-events-auto">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-110 transition-transform"><CircleDollarSign className="w-5 h-5" strokeWidth={2} /></div>
                <div><h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Renda Passiva</h3><p className="text-[10px] font-semibold text-slate-400">Extrato Completo</p></div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-right"><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Total</p><p className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{formatBRL(received)}</p></div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1"><div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Média</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(averageMonthly)}</p></div><div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Yield on Cost</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatPercent(yieldOnCostPortfolio)}</p></div></div>
          </div>
        </button>
      </div>

      {/* GRID DE CARDS SECUNDÁRIOS */}
      <div className="grid grid-cols-2 gap-4">
        {/* CARD ALOCAÇÃO */}
        <button onClick={() => setShowAllocationModal(true)} className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.96] transition-all text-left flex flex-col h-full group hover:shadow-lg relative overflow-hidden" style={{ animationDelay: '200ms' }}>
          <div className="flex justify-between items-start mb-4 w-full">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2 group-hover:scale-110 transition-transform"><PieIcon className="w-5 h-5" strokeWidth={2} /></div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alocação</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="w-full mt-auto space-y-2">{topSegments.length > 0 ? topSegments.map((seg, i) => { const totalVal = portfolio.reduce((acc, item) => acc + ((item.currentPrice || item.averagePrice) * item.quantity), 0); const percent = totalVal > 0 ? (seg.value / totalVal) * 100 : 0; return ( <div key={i} className="flex justify-between items-center text-[10px]"><span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[80px]"><div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{seg.name}</span><span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{percent.toFixed(0)}%</span></div> ); }) : (<p className="text-[9px] text-slate-400">Sem dados</p>)}</div>
        </button>

        {/* CARD GANHO REAL */}
        <button onClick={() => setShowRealGainModal(true)} className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.96] transition-all text-left flex flex-col justify-between h-full group hover:shadow-lg relative overflow-hidden" style={{ animationDelay: '250ms' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 transition-transform"><Scale className="w-5 h-5" strokeWidth={2} /></div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ganho Real</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <div><p className={`text-xl font-black tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{isAboveInflation ? '+' : ''}{formatPercent(ganhoRealPercent)}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acima da Inflação</p></div>
        </button>
      </div>
      
      {/* MODAL DE RESUMO FINANCEIRO (ANALISE DE PATRIMÔNIO) */}
      <SwipeableModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)}>
          <div className="px-6 py-2 pb-12">
            <div className="flex items-center gap-3 mb-8 px-2 mt-2">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent"><Wallet className="w-6 h-6" strokeWidth={2} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Análise de Patrimônio</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evolução e Performance</p>
                </div>
            </div>
            
            {/* Gráfico de Evolução */}
            {evolutionData.length > 1 && (
                <div className="mb-8 anim-fade-in-up is-visible">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Saldo</span>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent"></div><span className="text-[9px] font-bold text-slate-500 uppercase">Aportes</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold text-slate-500 uppercase">Total</span></div>
                            </div>
                        </div>
                        <div className="h-56 w-full -ml-4">
                            <ResponsiveContainer width="110%" height="100%">
                                <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="modalColorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="modalColorInvested" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={accentColor} stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Tooltip content={<EvolutionTooltip />} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#modalColorValue)" animationDuration={1500} />
                                    <Area type="monotone" dataKey="invested" stroke={accentColor} strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#modalColorInvested)" animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 relative overflow-hidden">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patrimônio Líquido</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter mb-4">{formatBRL(balance)}</p>
                        
                        <div className="space-y-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Custo Total (Aportes)</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Valorização de Mercado</span>
                                <span className={`text-sm font-bold tabular-nums ${totalAppreciation >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {totalAppreciation >= 0 ? '+' : ''}{formatBRL(totalAppreciation)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dividendos Recebidos</span>
                                <span className="text-sm font-bold text-emerald-600 tabular-nums">+{formatBRL(totalDividendsReceived)}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-5 rounded-[2rem] border ${isProfitPositive ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {isProfitPositive ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isProfitPositive ? 'text-emerald-600' : 'text-rose-600'}`}>Lucro Total do Portfólio</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className={`text-2xl font-black tabular-nums tracking-tight ${isProfitPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                {isProfitPositive ? '+' : ''}{formatBRL(totalProfitValue)}
                            </p>
                            <p className={`text-sm font-black tabular-nums ${isProfitPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isProfitPositive ? '+' : ''}{formatPercent(totalProfitPercent)}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-500/5 p-5 rounded-[2rem] border border-amber-100 dark:border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600"><Info className="w-5 h-5" /></div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 leading-tight">
                            O lucro total considera a <strong>valorização atual</strong> somada aos <strong>dividendos recebidos</strong> e ganhos de <strong>vendas passadas</strong>.
                        </p>
                    </div>
                </div>
            </div>
          </div>
      </SwipeableModal>

      {/* MODAL PROVENTOS (RENDA PASSIVA) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}><div className="pb-8"><div className="px-6 pt-2"><div className="flex items-center gap-3 mb-4 px-2 mt-2"><div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><CircleDollarSign className="w-6 h-6" strokeWidth={2} /></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Renda Passiva</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seus Proventos</p></div></div></div><div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-6 mx-4"><button onClick={() => setIncomeTab('summary')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${incomeTab === 'summary' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Resumo</button><button onClick={() => setIncomeTab('history')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${incomeTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Histórico</button><button onClick={() => setIncomeTab('magic')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${incomeTab === 'magic' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Magic Number</button></div><div className="px-5">{incomeTab === 'summary' && (<div className="space-y-6 anim-fade-in-up is-visible"><div className="text-center py-4 relative"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Acumulado</span><div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mt-1 tabular-nums">{formatBRL(received)}</div></div><div className="h-40 w-full relative"><p className="absolute top-0 left-0 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase">Últimos 6 meses</p><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.slice(-6)}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} /><Tooltip cursor={{ fill: 'rgba(16, 185, 129, 0.1)', radius: 8 }} content={<CustomTooltip />} /><Bar dataKey="value" fill={accentColor} radius={[4, 4, 4, 4]} barSize={32} animationDuration={1000} /></BarChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-3"><div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent flex flex-col justify-between"><div className="flex items-center gap-2 mb-2 text-slate-400"><Calendar className="w-3.5 h-3.5" /><span className="text-[9px] font-bold uppercase tracking-widest">Média Mensal</span></div><p className="text-lg font-bold text-slate-700 dark:text-white tabular-nums">{formatBRL(averageMonthly)}</p></div><div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent flex flex-col justify-between"><div className="flex items-center gap-2 mb-2 text-slate-400"><Percent className="w-3.5 h-3.5" /><span className="text-[9px] font-bold uppercase tracking-widest">Yield on Cost</span></div><p className="text-lg font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatPercent(yieldOnCostPortfolio)}</p></div><div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent flex flex-col justify-between"><div className="flex items-center gap-2 mb-2 text-slate-400"><Trophy className="w-3.5 h-3.5" /><span className="text-[9px] font-bold uppercase tracking-widest">Maior Pagador</span></div><div><p className="text-sm font-bold text-slate-900 dark:text-white">{bestPayer.ticker}</p><p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(bestPayer.value)}</p></div></div><div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 flex flex-col justify-between"><div className="flex items-center gap-2 mb-2 text-indigo-500"><Sparkles className="w-3.5 h-3.5" /><span className="text-[9px] font-bold uppercase tracking-widest">Provisão Futura</span></div><p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{formatBRL(upcoming)}</p></div></div></div>)}{incomeTab === 'history' && (<div className="pb-4 anim-fade-in-up is-visible h-[60vh]">{flatHistory.length === 0 ? (<div className="text-center py-10 opacity-50 h-full flex flex-col items-center justify-center"><ListFilter className="w-10 h-10 mx-auto mb-2 text-slate-300" strokeWidth={1.5} /><p className="text-xs text-slate-400 font-medium">Nenhum histórico encontrado.</p></div>) : (<List height={window.innerHeight * 0.6} itemCount={flatHistory.length} itemSize={getItemSize} width="100%">{({ index, style }) => { const item = flatHistory[index]; return ( <div style={style}> {item.type === 'header' ? ( <div className="flex items-center justify-between my-3 px-2 sticky top-0 bg-white dark:bg-[#0b1121] py-2 z-10"><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{getMonthName(item.month + '-01')}</h4><span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg tabular-nums">{formatBRL(item.total)}</span></div> ) : ( <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 mb-2"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex flex-col items-center justify-center shadow-sm"><span className="text-[9px] font-black uppercase text-slate-400">{item.data.paymentDate.split('-')[1]}</span><span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{item.data.paymentDate.split('-')[2]}</span></div><div><p className="font-bold text-slate-900 dark:text-white">{item.data.ticker}</p><p className="text-[10px] font-medium text-slate-400 uppercase">{item.data.type.replace('DIVIDENDO', 'DIV').replace('JRS CAP PROPRIO', 'JCP')}</p></div></div><div className="text-right"><p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(item.data.totalReceived)}</p><p className="text-[9px] font-medium text-slate-400 tabular-nums">{item.data.quantityOwned} un.</p></div></div> )} </div> ); }}</List>)}</div>)}{incomeTab === 'magic' && (<div className="space-y-3 anim-fade-in-up is-visible">{magicNumbers?.length > 0 ? magicNumbers.map((m, i) => m && ( <div key={i} className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm"><div className="flex justify-between items-center mb-2"><h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.ticker}</h4><span className="text-xs font-bold text-accent tabular-nums">{m.progress.toFixed(0)}%</span></div><div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full mb-2 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${m.progress}%` }}></div></div><div className="text-[10px] text-slate-400 font-semibold flex justify-between"><span>{m.currentQty} / {m.magicQty} Cotas</span><span>Faltam {m.missing}</span></div></div> )) : ( <div className="text-center py-10 opacity-50"><Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" strokeWidth={1.5} /><p className="text-xs text-slate-400 font-medium">Sem dados de proventos suficientes.</p></div> )}</div>)}</div></div></SwipeableModal>

      {/* MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}><div className="pb-8"><div className="px-6 pt-2"><div className="flex items-center gap-3 mb-4 px-2 mt-2"><div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent"><PieIcon className="w-6 h-6" strokeWidth={2} /></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Alocação</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Composição da Carteira</p></div></div></div><div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-6 mx-4"><button onClick={() => setAllocationTab('assets')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${allocationTab === 'assets' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Ativos</button><button onClick={() => setAllocationTab('types')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${allocationTab === 'types' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Tipos</button><button onClick={() => setAllocationTab('segments')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${allocationTab === 'segments' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Segmentos</button></div><div className="px-5">{[{ id: 'assets', data: assetData }, { id: 'types', data: typeData }, { id: 'segments', data: segmentData }].map(tab => { if(tab.id !== allocationTab) return null; const currentData = tab.data; const total = currentData.reduce((acc, item) => acc + item.value, 0); return ( <div key={tab.id} className="anim-fade-in-up is-visible"><div className="h-48 w-full -my-4"><ResponsiveContainer width="100%" height="100%"><PieChart>
      {/* @ts-ignore */}
      <Pie data={currentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" activeIndex={activeIndex as any} activeShape={renderActiveShape} onMouseEnter={onPieEnter} cornerRadius={8}>{currentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" fillOpacity={activeIndex === index ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }} />)}</Pie></PieChart></ResponsiveContainer></div><div className="space-y-2 mt-4">{currentData.map((item, index) => ( <div key={index} onMouseEnter={() => onPieEnter(null, index)} className={`flex items-center justify-between p-3 rounded-xl transition-all ${activeIndex === index ? 'bg-slate-100 dark:bg-white/5' : ''}`}><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.name}</span></div><div className="text-right"><p className="font-bold text-slate-900 dark:text-white tabular-nums">{formatBRL(item.value)}</p><p className="text-xs text-slate-400 font-medium tabular-nums">{formatPercent((item.value / total) * 100)}</p></div></div> ))}</div></div> ) })}</div></div></SwipeableModal>

      {/* MODAL GANHO REAL */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}><div className="px-6 py-2 pb-8"><div className="flex items-center gap-3 mb-4 px-2 mt-2"><div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500"><Scale className="w-6 h-6" strokeWidth={2} /></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Poder de Compra</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rentabilidade vs. Inflação</p></div></div><div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-6"><button onClick={() => setGainTab('benchmark')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${gainTab === 'benchmark' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Benchmark</button><button onClick={() => setGainTab('power')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${gainTab === 'power' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Poder de Compra</button><button onClick={() => setGainTab('history')} className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${gainTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Histórico</button></div>{gainTab === 'benchmark' && (<div className="space-y-4 px-4 anim-fade-in-up is-visible"><div className="bg-slate-50 dark:bg-[#0f172a] p-6 rounded-3xl grid grid-cols-3 items-center text-center"><div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carteira</p><p className={`text-2xl font-black tabular-nums ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{formatPercent(nominalYield)}</p></div><p className="font-bold text-slate-300 dark:text-slate-600">VS</p><div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">IPCA {dateLabel}</p><p className="text-2xl font-black text-slate-500 tabular-nums">{formatPercent(finalIPCA)}</p></div></div><div className={`p-6 rounded-3xl text-center relative overflow-hidden ${isAboveInflation ? 'bg-gradient-to-br from-emerald-500/10 to-transparent' : 'bg-gradient-to-br from-rose-500/10 to-transparent'}`}><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retorno Real Acumulado</p><p className={`text-5xl font-black tabular-nums tracking-tighter my-2 ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{isAboveInflation ? '+' : ''}{formatPercent(ganhoRealPercent)}</p><p className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto">Sua carteira está {isAboveInflation ? 'preservando e multiplicando' : 'perdendo valor para'} seu capital acima da inflação.</p></div><div className="bg-slate-50 dark:bg-[#0f172a] p-6 rounded-3xl space-y-4">{comparisonData.map(item => { const maxValue = Math.max(nominalYield, finalIPCA, 1); const barWidth = (item.value / maxValue) * 100; return ( <div key={item.name}><div className="flex items-center text-xs font-bold"><span className="w-24 text-slate-400 truncate pr-1">{item.name}</span><div className="flex-1 h-3 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: item.fill, transition: 'width 0.5s ease-out' }}></div></div><span className="w-12 text-right text-slate-500 tabular-nums">{item.value.toFixed(2)}%</span></div></div> ); })}</div></div>)}{gainTab === 'power' && (<div className="space-y-3 px-4 anim-fade-in-up is-visible"><div className="flex items-center gap-4"><div className="flex-1 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-transparent"><p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-300/60 uppercase tracking-widest mb-1">Lucro Total</p><p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatBRL(lucroNominalAbsoluto)}</p></div></div><div className="flex items-center gap-3 justify-center"><Minus className="w-4 h-4 text-slate-300" /></div><div className="flex items-center gap-4"><div className="flex-1 bg-rose-50 dark:bg-rose-500/5 p-4 rounded-2xl border border-rose-100 dark:border-transparent"><p className="text-[10px] font-bold text-rose-600/60 dark:text-rose-300/60 uppercase tracking-widest mb-1">Custo da Inflação (IPCA)</p><p className="text-lg font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatBRL(custoCorrosaoInflacao)}</p></div></div><div className="flex items-center gap-3 justify-center"><Equal className="w-4 h-4 text-slate-300" /></div><div className={`flex-1 p-5 rounded-3xl border-2 ${isAboveInflation ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}><p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isAboveInflation ? 'text-emerald-600/60 dark:text-emerald-300/60' : 'text-rose-600/60 dark:text-rose-300/60'}`}>Ganho Real de Poder de Compra</p><p className={`text-2xl font-black tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{isAboveInflation ? '+' : ''}{formatBRL(ganhoRealValor)}</p></div></div>)}{gainTab === 'history' && (<div className="h-[65vh] anim-fade-in-up is-visible px-4">
          <div className="flex items-center gap-2 mb-4 px-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolução Mês a Mês</h4>
          </div>
          <div className="h-[calc(65vh-40px)]">
            <List height={window.innerHeight * 0.6} itemCount={evolutionData.length} itemSize={getInflationHistoryItemSize} width="100%">{({ index, style }) => { 
                const item = [...evolutionData].reverse()[index]; 
                const isGain = item.value >= item.adjusted; 
                return ( 
                    <div style={style} className="py-1">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase ${isGain ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {item.date.split(' ')[0].substring(0,3)}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.date}</p>
                                    <p className={`text-xs font-bold ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {isGain ? 'Ganho Real' : 'Perda Real'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                                    {isGain ? '+' : '-'}{formatBRL(Math.abs(item.value - item.adjusted))}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">vs IPCA</p>
                            </div>
                        </div>
                    </div> 
                ); 
            }}</List>
          </div>
      </div>)}</div></SwipeableModal>

      {/* MODAL AGENDA */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}><div className="pb-8"><div className="px-6 pt-2"><div className="flex items-center gap-3 mb-6 px-2 mt-2"><div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><CalendarDays className="w-6 h-6" strokeWidth={2} /></div><div><h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Agenda de Eventos</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linha do Tempo</p></div></div></div><div className="px-5 space-y-3">{upcomingEvents.length > 0 ? upcomingEvents.map((event, i) => { const style = getEventStyle(event.eventType, event.date); return ( <div key={i} className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4"> <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-sm border ${style.border} ${style.bg} ${style.text}`}>{style.pulse ? <span className="text-[9px] font-black uppercase tracking-wider">HOJE</span> : <><span className="text-xs font-bold opacity-70">{event.date.split('-')[1]}</span><span className="text-sm font-bold">{event.date.split('-')[2]}</span></>}</div> <div className="flex-1"> <p className="font-bold text-slate-900 dark:text-white">{event.ticker}</p> {event.eventType === 'payment' ? ( <p className={`text-[10px] font-semibold uppercase flex items-center gap-1.5 ${style.text}`}><style.icon className="w-3 h-3"/> {style.label}: {formatBRL(event.totalReceived)}</p> ) : ( <p className={`text-[10px] font-semibold uppercase flex items-center gap-1.5 ${style.text}`}><style.icon className="w-3 h-3"/> Último dia para ter direito</p> )} </div> {event.eventType === 'datacom' && ( <p className="text-xs font-bold text-slate-400 tabular-nums">{formatBRL(event.rate)}/cota</p> )}</div> ); }) : <div className="text-center py-20 opacity-60"> <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" strokeWidth={1.5}/> <p className="text-sm font-bold text-slate-500">Nenhum evento futuro</p> <p className="text-xs text-slate-400 mt-1">Sua agenda está limpa por enquanto.</p> </div>}</div></div></SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
