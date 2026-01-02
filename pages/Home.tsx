
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction, EvolutionPoint } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, TrendingUp, Calendar, Trophy, Clock, CalendarDays, Coins, ArrowRight, Minus, Equal, ExternalLink, TrendingDown, Plus, ListFilter, CalendarCheck, Hourglass, Layers, AreaChart as AreaIcon, Banknote, Percent, ChevronRight, Loader2, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, BarChart, Bar, XAxis, Tooltip, AreaChart, Area, CartesianGrid, ComposedChart, Line, YAxis } from 'recharts';
import { SwipeableModal } from '../components/Layout';
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
            <div className="grid grid-cols-2 gap-2 mt-1"><div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Média</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(averageMonthly)}</p></div><div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Yield on Cost</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{yieldOnCostPortfolio.toFixed(2)}%</p></div></div>
          </div>
        </button>
      </div>

      {/* CARD ALOCAÇÃO RÁPIDA */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '150ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className="w-full text-left bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] border border-slate-100 dark:border-white/5 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 dark:border-amber-500/20 group-hover:scale-110 transition-transform"><PieIcon className="w-5 h-5" strokeWidth={2} /></div>
              <div><h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Minha Alocação</h3><p className="text-[10px] font-semibold text-slate-400">Distribuição da Carteira</p></div>
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
        <button onClick={() => setShowRealGainModal(true)} className="w-full text-left bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/[0.05] dark:to-indigo-500/[0.05] p-5 rounded-[2.5rem] border border-blue-500/10 active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-xl hover:shadow-blue-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5" strokeWidth={2} /></div>
              <div><h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Poder de Compra</h3><p className="text-[10px] font-semibold text-slate-400">Rentabilidade vs IPCA</p></div>
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

            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl mb-8">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <AreaIcon className="w-4 h-4 text-accent" /> Histórico de Patrimônio
                </h3>
                <div className="h-48 w-full mt-4 -mx-4 px-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                                dy={10}
                                minTickGap={30}
                            />
                            <Tooltip content={<EvolutionTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={accentColor} 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                                animationDuration={1500}
                            />
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

      {/* MODAL RENDA PASSIVA */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="flex flex-col h-full">
            <div className="px-6 pt-2 pb-6 flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><CircleDollarSign className="w-6 h-6" /></div>
                    <div><h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Meus Ganhos</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rendimento Acumulado</p></div>
                </div>
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    {['summary', 'history', 'magic'].map(tab => (<button key={tab} onClick={() => setIncomeTab(tab as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${incomeTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>{tab === 'summary' ? 'Resumo' : tab === 'history' ? 'Extrato' : 'Magic'}</button>))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20">
                {incomeTab === 'summary' && (
                    <div className="space-y-6 anim-fade-in-up is-visible">
                        <div className="bg-emerald-500 text-white p-8 rounded-[2.5rem] shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Rendimento Total</p>
                            <h3 className="text-4xl font-black tabular-nums tracking-tighter mb-4">{formatBRL(received)}</h3>
                            <div className="pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] font-bold uppercase opacity-60 mb-1">Média Mensal</p><p className="text-lg font-black tabular-nums">{formatBRL(averageMonthly)}</p></div>
                                <div><p className="text-[10px] font-bold uppercase opacity-60 mb-1">Melhor Pagador</p><p className="text-lg font-black truncate">{bestPayer.ticker}</p></div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-transparent">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Últimos 12 Meses</h4>
                            <div className="h-40 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}><XAxis dataKey="name" hide /><Tooltip content={<CustomTooltip />} /><Bar dataKey="value" fill={accentColor} radius={[4, 4, 0, 0]} /></BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-transparent flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Zap className="w-5 h-5" /></div><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pendente p/ Receber</span></div><span className="text-sm font-black text-amber-500 tabular-nums">{formatBRL(upcoming)}</span></div>
                            <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-transparent flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500"><Coins className="w-5 h-5" /></div><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dividendos Pagos</span></div><span className="text-sm font-black text-emerald-500 tabular-nums">{formatBRL(totalDividendsReceived)}</span></div>
                        </div>
                    </div>
                )}

                {incomeTab === 'history' && (
                    <div className="h-[500px] anim-fade-in-up is-visible">
                         <List height={500} itemCount={flatHistory.length} itemSize={getItemSize} width="100%">
                            {({ index, style }) => {
                                const item = flatHistory[index];
                                if (item.type === 'header') return (<div style={style} className="flex items-center justify-between px-2 pt-4 pb-2"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getMonthName(item.month)}</h4><span className="text-[10px] font-black text-emerald-500 tabular-nums">{formatBRL(item.total)}</span></div>);
                                const h = item.data;
                                return (
                                    <div style={style} className="py-1">
                                        <div className="bg-white dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center font-bold text-xs text-slate-400 flex-col leading-none"><span>{h.paymentDate.split('-')[2]}</span><span className="text-[8px] opacity-60 uppercase">{h.paymentDate.split('-')[1]}</span></div>
                                                <div><h5 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{h.ticker}</h5><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h.type.replace('JRS CAP PROPRIO', 'JCP')}</p></div>
                                            </div>
                                            <div className="text-right"><p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(h.totalReceived)}</p><p className="text-[9px] text-slate-400 font-medium leading-none mt-1">{h.quantityOwned} cotas</p></div>
                                        </div>
                                    </div>
                                );
                            }}
                        </List>
                    </div>
                )}

                {incomeTab === 'magic' && (
                    <div className="space-y-4 anim-fade-in-up is-visible">
                        <div className="bg-slate-900 dark:bg-white p-6 rounded-[2.5rem] text-center mb-6">
                            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                            <h3 className="text-lg font-black text-white dark:text-slate-900">Número Mágico</h3>
                            <p className="text-xs text-white/60 dark:text-slate-900/60 max-w-[200px] mx-auto mt-2 leading-relaxed">Quantas cotas você precisa para que o ativo se pague sozinho todo mês.</p>
                        </div>
                        {magicNumbers.map(m => (
                            <div key={m.ticker} className="bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-transparent">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2"><h4 className="text-base font-black text-slate-900 dark:text-white">{m.ticker}</h4><span className="text-[10px] font-bold text-slate-400">R$ {m.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / cota</span></div>
                                    <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">{m.progress.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-3"><div style={{ width: `${m.progress}%` }} className="h-full bg-emerald-500 rounded-full"></div></div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400"><span>Possui: {m.currentQty}</span><span>Objetivo: {m.magicQty}</span></div>
                                {m.missing > 0 && <p className="text-[10px] text-slate-500 mt-2 font-medium">Faltam <span className="text-slate-900 dark:text-white font-black">{m.missing} cotas</span> para o efeito bola de neve.</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="px-6 py-2">
            <div className="flex items-center justify-between mb-8 mt-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500"><PieIcon className="w-7 h-7" /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Estratégia</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equilíbrio da Carteira</p></div>
                </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl mb-8">
                {['assets', 'types', 'segments'].map(tab => (<button key={tab} onClick={() => setAllocationTab(tab as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm scale-[1.02]' : 'text-slate-400'}`}>{tab === 'assets' ? 'Ativos' : tab === 'types' ? 'Classes' : 'Setores'}</button>))}
            </div>

            <div className="h-64 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            activeIndex={activeIndex} 
                            activeShape={renderActiveShape} 
                            data={allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData} 
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none" 
                            onMouseEnter={onPieEnter} 
                        >
                            {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-2 pb-12">
                {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-transparent">
                        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div><span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.name}</span></div>
                        <div className="text-right"><p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{((item.value / balance) * 100).toFixed(1)}%</p><p className="text-[10px] text-slate-400 font-medium tabular-nums">{formatBRL(item.value)}</p></div>
                    </div>
                ))}
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL GANHO REAL */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
         <div className="px-6 py-2">
            <div className="flex items-center justify-between mb-8 mt-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500"><Target className="w-7 h-7" /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Ganho Real</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rentabilidade Acima da Inflação</p></div>
                </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl mb-8">
                {['benchmark', 'history'].map(tab => (<button key={tab} onClick={() => setGainTab(tab as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${gainTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm scale-[1.02]' : 'text-slate-400'}`}>{tab === 'benchmark' ? 'Comparação' : 'Histórico Inflação'}</button>))}
            </div>

            {gainTab === 'benchmark' ? (
                <div className="space-y-6 anim-fade-in-up is-visible">
                    <div className={`p-8 rounded-[2.5rem] text-center shadow-xl shadow-blue-500/10 border ${isAboveInflation ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'} text-white`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Seu Alpha Estimado</p>
                        <h3 className="text-4xl font-black tabular-nums tracking-tighter mb-4">{isAboveInflation ? '+' : ''}{ganhoRealPercent.toFixed(2)}%</h3>
                        <p className="text-xs font-medium opacity-90 max-w-[200px] mx-auto leading-relaxed">{isAboveInflation ? 'Parabéns! Sua carteira está protegendo e aumentando seu poder de compra.' : 'Atenção: A inflação está corroendo o retorno nominal da sua carteira.'}</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-transparent">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Comparativo % {dateLabel}</h4>
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} layout="vertical" margin={{ left: -20, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                    <Tooltip 
                                      cursor={{ fill: 'transparent' }} 
                                      content={({ active, payload }) => { 
                                        if (active && payload && payload.length && payload[0].value !== undefined) {
                                          const val = payload[0].value;
                                          const displayVal = typeof val === 'number' ? val.toFixed(2) : val;
                                          return (
                                            <div className="bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg">
                                              {displayVal}%
                                            </div>
                                          );
                                        }
                                        return null;
                                      }} 
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-12">
                         <div className="bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-transparent"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lucro Nominal</p><p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(lucroNominalAbsoluto)}</p></div>
                         <div className="bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-transparent"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Corrosão IPCA</p><p className="text-lg font-black text-rose-500 tabular-nums">-{formatBRL(custoCorrosaoInflacao)}</p></div>
                         <div className="bg-slate-900 dark:bg-white col-span-2 p-6 rounded-[2rem] flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-900/10 flex items-center justify-center text-white dark:text-slate-900"><Scale className="w-5 h-5" /></div><span className="text-sm font-black text-white dark:text-slate-900">Lucro Real (em R$)</span></div><span className="text-xl font-black text-white dark:text-slate-900 tabular-nums">{formatBRL(ganhoRealValor)}</span></div>
                    </div>
                </div>
            ) : (
                <div className="h-[500px] anim-fade-in-up is-visible">
                    <List height={500} itemCount={evolutionData.length} itemSize={getInflationHistoryItemSize} width="100%">
                        {({ index, style }) => {
                            const point = evolutionData[evolutionData.length - 1 - index];
                            return (
                                <div style={style} className="py-1">
                                    <div className="bg-white dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400"><Calendar className="w-5 h-5" /></div>
                                            <div><h5 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{point.date}</h5><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Inflação Acumulada</p></div>
                                        </div>
                                        <div className="text-right"><p className="text-sm font-black text-rose-500 tabular-nums">-{formatBRL(point.monthlyInflationCost)}</p><p className="text-[9px] text-slate-400 font-medium leading-none mt-1">Impacto no patrimônio</p></div>
                                    </div>
                                </div>
                            );
                        }}
                    </List>
                </div>
            )}
         </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
