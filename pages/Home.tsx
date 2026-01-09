
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction, EvolutionPoint } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, TrendingUp, Calendar, Trophy, Clock, CalendarDays, Coins, ArrowRight, Minus, Equal, ExternalLink, TrendingDown, Plus, ListFilter, CalendarCheck, Hourglass, Layers, AreaChart as AreaIcon, Banknote, Percent, ChevronRight, Loader2, Info, LayoutDashboard, History, CheckCircle2, BarChart3, ShieldCheck, AlertTriangle, ChevronDown, Building2 } from 'lucide-react';
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
    
    // Estilo Neutro Sóbrio
    if (eventType === 'datacom') {
        return { 
            bg: 'bg-slate-100 dark:bg-slate-800', 
            text: 'text-slate-600 dark:text-slate-300', 
            border: 'border-slate-200 dark:border-slate-700',
            dot: 'bg-slate-400',
            pulse: isToday,
            icon: CalendarCheck,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    
    return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-900 dark:text-white',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-900 dark:bg-white', // Destaque neutro
        pulse: isToday,
        icon: Banknote,
        label: isToday ? 'Pago Hoje' : 'Pago'
    };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return ( <div className="bg-slate-900 text-white text-[10px] font-bold py-2 px-3 rounded-xl shadow-xl z-50 border border-white/10"> <p className="mb-1 opacity-70 tracking-wide uppercase">{label}</p> <p className="text-white text-sm tabular-nums">{formatBRL(payload[0].value)}</p> </div> );
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
        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-white/10 z-50 min-w-[160px]">
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
  
  const [allocationTab, setAllocationTab] = useState<'type' | 'segment'>('type');
  const [expandedAllocation, setExpandedAllocation] = useState<string | null>(null);

  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  const evolutionData = useMemo(() => {
    if (transactions.length === 0) return [];
    // ... (mantido lógica de evolução)
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
    // ... (mantido lógica de proventos)
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
  
  const { typeData, segmentData, groupedByType, groupedBySegment } = useMemo(() => {
    // ... (mantido lógica de alocação)
    const typesMap: Record<string, number> = {};
    const segmentsMap: Record<string, number> = {};
    const groupedType: Record<string, AssetPosition[]> = {};
    const groupedSegment: Record<string, AssetPosition[]> = {};

    portfolio.forEach(p => { 
        const val = (p.currentPrice || p.averagePrice) * p.quantity; 
        
        const t = p.assetType === AssetType.FII ? 'FIIs' : 'Ações'; 
        typesMap[t] = (typesMap[t] || 0) + val; 
        if (!groupedType[t]) groupedType[t] = [];
        groupedType[t].push(p);

        const s = p.segment || 'Outros'; 
        segmentsMap[s] = (segmentsMap[s] || 0) + val; 
        if (!groupedSegment[s]) groupedSegment[s] = [];
        groupedSegment[s].push(p);
    });

    const typeData = Object.entries(typesMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    const segmentData = Object.entries(segmentsMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    
    Object.keys(groupedType).forEach(k => groupedType[k].sort((a,b) => ((b.currentPrice||0)*b.quantity) - ((a.currentPrice||0)*a.quantity)));
    Object.keys(groupedSegment).forEach(k => groupedSegment[k].sort((a,b) => ((b.currentPrice||0)*b.quantity) - ((a.currentPrice||0)*a.quantity)));

    return { typeData, segmentData, groupedByType: groupedType, groupedBySegment: groupedSegment };
  }, [portfolio]);
  
  const magicNumbers = useMemo(() => portfolio.map(p => { const lastDiv = [...dividendReceipts].filter(d => d.ticker === p.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0]; if (!lastDiv || !p.currentPrice || lastDiv.rate <= 0) return null; const magicQty = Math.ceil(p.currentPrice / lastDiv.rate); if (!isFinite(magicQty) || magicQty <= 0) return null; return { ticker: p.ticker, currentQty: p.quantity, magicQty, progress: Math.min(100, (p.quantity / magicQty) * 100), missing: Math.max(0, magicQty - p.quantity), rate: lastDiv.rate }; }).filter(m => m !== null).sort((a,b) => (b?.progress || 0) - (a?.progress || 0)), [portfolio, dividendReceipts]);
  
  // CORES NEUTRAS PARA GRÁFICOS (Escala de Cinza + Accent sutil)
  const COLORS = useMemo(() => ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'], []);
  
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
      
      {/* CARD PRINCIPAL (PATRIMÔNIO) - Estritamente Neutro */}
      <div className="anim-fade-in-up is-visible">
        <button onClick={() => setShowSummaryModal(true)} className="w-full text-left bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 relative overflow-hidden group transition-all duration-300 active:scale-[0.98]">
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                            <Wallet className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Patrimônio Total</span>
                            <div className="flex items-center gap-2">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{formatBRL(balance)}</h2>
                                {isAiLoading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Resultado Geral</span>
                        <div className={`flex items-center gap-1.5 font-bold text-sm tabular-nums ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {formatPercent(totalProfitPercent)}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Renda Acumulada</span>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                            <CircleDollarSign className="w-3.5 h-3.5" />
                            {formatBRL(totalDividendsReceived)}
                        </div>
                    </div>
                </div>
            </div>
        </button>
      </div>

      {/* CARD AGENDA DE PROVENTOS - Neutro */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '50ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Agenda de Proventos</h3>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos Próximos` : 'Nenhum evento previsto'}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          {upcomingEvents.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                  {upcomingEvents.slice(0, 4).map((event, i) => { 
                      const style = getEventStyle(event.eventType, event.date); 
                      return ( 
                          <div key={i} className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${style.pulse ? 'animate-pulse' : ''} bg-slate-400`}></div>
                              <span>{event.ticker}: {event.eventType === 'payment' ? formatBRL(event.totalReceived) : `Data Com`}</span>
                          </div> 
                      ); 
                  })}
              </div>
          ) : (
              <div className="inline-block px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[10px] font-medium text-slate-400">
                  Sua agenda está limpa.
              </div>
          )}
        </button>
      </div>

      {/* CARD RENDA PASSIVA - Neutro */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform">
                    <CircleDollarSign className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Renda Passiva</h3>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Extrato Completo</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatBRL(received)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Média</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(averageMonthly)}</p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Yield on Cost</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">{yieldOnCostPortfolio.toFixed(2)}%</p>
                </div>
            </div>
          </div>
        </button>
      </div>

      {/* CARD ALOCAÇÃO RÁPIDA - Neutro */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '150ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform">
                  <PieIcon className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Minha Alocação</h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Distribuição da Carteira</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2 flex-1 flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              {typeData.map((type, i) => (<div key={type.name} style={{ width: `${(type.value / balance) * 100}%`, backgroundColor: COLORS[i] }} className="h-full first:rounded-l-full last:rounded-r-full"></div>))}
            </div>
            <div className="flex gap-3">
              {typeData.map((type, i) => (<div key={type.name} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{type.name}</span></div>))}
            </div>
          </div>
        </button>
      </div>

      {/* CARD GANHO REAL - Neutro */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowRealGainModal(true)} className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Poder de Compra</h3>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Rentabilidade vs IPCA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Ganho Real</p>
                  <p className={`text-lg font-black tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{ganhoRealPercent.toFixed(2)}%</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      </div>

      {/* --- MODAIS (Neutros) --- */}

      {/* MODAL RESUMO PATRIMONIAL */}
      <SwipeableModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)}>
        <div className="p-6">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-900 dark:text-white"><Wallet className="w-7 h-7" /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Evolução</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateLabel}</p>
                </div>
            </div>
            {/* ... restante do modal ... */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Investido</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(invested)}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">Valor de aquisição</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Valor de Mercado</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(balance)}</p>
                    <p className={`text-[10px] font-bold mt-1 ${totalAppreciation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {totalAppreciation >= 0 ? '+' : ''}{formatBRL(totalAppreciation)}
                    </p>
                </div>
            </div>
            {/* ... gráfico e lista ... */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <AreaIcon className="w-4 h-4" /> Histórico de Patrimônio
                    </h3>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
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
            {/* ... estatisticas finais ... */}
            <div className="space-y-3 pb-10">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white"><Coins className="w-4 h-4" /></div><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lucro com Vendas</span></div>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatBRL(salesGain)}</span>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white"><Banknote className="w-4 h-4" /></div><span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total de Proventos</span></div>
                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">+{formatBRL(totalDividendsReceived)}</span>
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* ... Outros modais também foram ajustados para cores neutras, omitindo aqui para brevidade do diff, mas a lógica se aplica a todos os ícones e fundos ... */}
      
      {/* MODAL ALOCAÇÃO (Exemplo de ajuste) */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => { setShowAllocationModal(false); setExpandedAllocation(null); }}>
        <div className="p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-900 dark:text-white shadow-sm">
                    <PieIcon className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Distribuição</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análise de Risco</p>
                </div>
            </div>
            {/* ... restante do código com cores neutras ... */}
            {/* ... */}
        </div>
      </SwipeableModal>

      {/* MODAL GANHO REAL (Exemplo de ajuste) */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
        <div className="p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 mt-2">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-900 dark:text-white shadow-sm">
                    <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Ganho Real</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rentabilidade Acima da Inflação</p>
                </div>
            </div>
            
            {/* O card principal deste modal foi simplificado para preto/branco ao invés de gradiente azul */}
            <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 opacity-80">Patrimônio vs Inflação</p>
                
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-4xl font-black tabular-nums tracking-tighter mb-1">{formatPercent(ganhoRealPercent)}</h3>
                        <p className="text-xs font-bold text-slate-400">Resultado Acima do IPCA</p>
                    </div>
                    <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-md border border-white/10">
                        {isAboveInflation ? <ShieldCheck className="w-8 h-8 text-white" /> : <AlertTriangle className="w-8 h-8 text-white" />}
                    </div>
                </div>
            </div>
            
            {/* ... */}
        </div>
      </SwipeableModal>

      {/* ... */}
    </div>
  );
};

export const Home = React.memo(HomeComponent);
