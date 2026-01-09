import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction, EvolutionPoint } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, Coins, TrendingDown, CalendarCheck, AreaChart as AreaIcon, Banknote, ChevronRight, Loader2, CheckCircle2, ShieldCheck, AlertTriangle, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, AreaChart, Area } from 'recharts';
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
    if (!dateStr) return '12 Meses';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
       const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
       const monthIndex = parseInt(parts[1], 10) - 1;
       return `Desde ${months[monthIndex]}/${parts[0]}`;
    }
    return '12 Meses';
};

const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const isToday = eventDate.getTime() === today.getTime();
    
    // Minimalist: Colors only for specific meaning
    if (eventType === 'datacom') {
        return { 
            borderColor: 'border-amber-500/30',
            textColor: 'text-amber-500',
            icon: CalendarCheck,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    
    return {
        borderColor: 'border-emerald-500/30',
        textColor: 'text-emerald-500',
        icon: Banknote,
        label: isToday ? 'Pago Hoje' : 'Pagamento'
    };
};

const EvolutionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.value || 0;
      return ( 
        <div className="bg-black border border-white/10 p-3 rounded-lg">
           <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
           <span className="text-sm font-medium text-white tabular-nums">{formatBRL(total)}</span>
        </div> 
      );
    }
    return null;
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return ( <div className="bg-black border border-white/10 p-2 rounded-lg text-xs font-medium text-white tabular-nums">{formatBRL(payload[0].value)}</div> );
    }
    return null;
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate = 0, portfolioStartDate, invested, balance, totalAppreciation, transactions = [] }) => {
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
    // Simplificado para exibição - lógica de dados mantida, apenas visualização alterada
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const startDateStr = sortedTxs[0].date;
    const startYear = parseInt(startDateStr.split('-')[0]);
    const startMonth = parseInt(startDateStr.split('-')[1]);
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    let cumulativeInvested = 0;
    
    let currentIterYear = startYear;
    let currentIterMonth = startMonth;
    let txIndex = 0;
    const data: EvolutionPoint[] = [];

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
        const [year, month] = monthKey.split('-');
        const monthNames = ['Jan', 'Fev', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        data.push({
            rawDate: monthKey,
            date: `${monthNames[parseInt(month) - 1]}`,
            invested: Math.max(0, cumulativeInvested),
            adjusted: 0, 
            value: (currentIterYear === endYear && currentIterMonth === endMonth) ? balance : Math.max(0, cumulativeInvested), // Simplificação visual
            monthlyInflationCost: 0
        });
        currentIterMonth++;
        if (currentIterMonth > 12) { currentIterMonth = 1; currentIterYear++; }
    }
    // Ajuste final para conectar com valor atual real
    if (data.length > 0) {
        data[data.length - 1].value = balance;
    }
    return data;
  }, [transactions, balance, invested]);

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
    let maxVal = 0, maxTicker = '-';
    Object.entries(tickerTotalMap).forEach(([t, val]) => { if(val > maxVal) { maxVal = val; maxTicker = t; } });
    const last12MonthsData = Object.entries(monthlyTotals).sort((a,b) => a[0].localeCompare(b[0])).slice(-12).map(([key, value]) => ({ name: key.split('-')[1] + '/' + key.split('-')[0].substring(2), value: value }));
    return { received: totalReceivedValue, upcoming: upcomingValue, averageMonthly: totalReceivedValue / 12, bestPayer: { ticker: maxTicker, value: maxVal }, chartData: last12MonthsData, upcomingEvents: uniqueUpcomingEvents, historyGrouped };
  }, [dividendReceipts]);

  const sortedHistoryKeys = useMemo(() => Object.keys(historyGrouped).sort((a,b) => b.localeCompare(a)), [historyGrouped]);
  const flatHistory = useMemo(() => sortedHistoryKeys.flatMap(monthKey => [{ type: 'header' as const, month: monthKey, total: historyGrouped[monthKey].total }, ...historyGrouped[monthKey].items.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).map(item => ({ type: 'item' as const, data: item }))]), [sortedHistoryKeys, historyGrouped]);

  const yieldOnCostPortfolio = useMemo(() => (invested <= 0) ? 0 : (received / invested) * 100, [received, invested]);
  
  const { typeData, segmentData, groupedByType, groupedBySegment } = useMemo(() => {
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
    return { typeData, segmentData, groupedByType: groupedType, groupedBySegment: groupedSegment };
  }, [portfolio]);
  
  const magicNumbers = useMemo(() => portfolio.map(p => { const lastDiv = [...dividendReceipts].filter(d => d.ticker === p.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0]; if (!lastDiv || !p.currentPrice || lastDiv.rate <= 0) return null; const magicQty = Math.ceil(p.currentPrice / lastDiv.rate); if (!isFinite(magicQty) || magicQty <= 0) return null; return { ticker: p.ticker, currentQty: p.quantity, magicQty, progress: Math.min(100, (p.quantity / magicQty) * 100), missing: Math.max(0, magicQty - p.quantity), rate: lastDiv.rate }; }).filter(m => m !== null).sort((a,b) => (b?.progress || 0) - (a?.progress || 0)), [portfolio, dividendReceipts]);
  
  // Minimalist Grayscale Palette
  const COLORS = useMemo(() => ['#e4e4e7', '#a1a1aa', '#52525b', '#27272a', '#18181b'], []);
  
  const finalIPCA = inflationRate > 0 ? inflationRate : 0;
  const lastEvolutionPoint = useMemo(() => evolutionData.length > 0 ? evolutionData[evolutionData.length - 1] : null, [evolutionData]);
  const custoCorrosaoInflacao = lastEvolutionPoint ? lastEvolutionPoint.monthlyInflationCost : invested * (finalIPCA / 100);
  const lucroNominalAbsoluto = totalProfitValue;
  const ganhoRealValor = lucroNominalAbsoluto - custoCorrosaoInflacao;
  const nominalYield = invested > 0 ? (totalProfitValue / invested) * 100 : 0;
  const nominalFactor = 1 + (nominalYield / 100);
  const inflationFactor = 1 + (finalIPCA / 100);
  const ganhoRealPercent = inflationFactor !== 0 ? ((nominalFactor / inflationFactor) - 1) * 100 : nominalYield;
  const isAboveInflation = ganhoRealValor >= 0;
  const dateLabel = getShortDateLabel(portfolioStartDate);

  return (
    <div className="pt-20 pb-28 px-4 space-y-3 max-w-lg mx-auto font-sans">
      
      {/* 1. PATRIMÔNIO (Minimalist) */}
      <button onClick={() => setShowSummaryModal(true)} className="w-full text-left bg-black border border-white/5 p-6 rounded-3xl active:scale-[0.99] transition-transform">
        <div className="flex justify-between items-start mb-6">
            <div>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-1">Patrimônio</p>
                <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-light text-white tracking-tight tabular-nums">{formatBRL(balance)}</h2>
                    {isAiLoading && <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />}
                </div>
            </div>
            <div className="bg-zinc-900/50 p-2 rounded-full"><ChevronRight className="w-4 h-4 text-zinc-500" /></div>
        </div>
        
        <div className="flex gap-6">
            <div>
                <span className="text-[9px] text-zinc-600 block uppercase tracking-wider mb-0.5">Rentabilidade</span>
                <span className={`text-xs font-medium tabular-nums ${isProfitPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isProfitPositive ? '+' : ''}{formatPercent(totalProfitPercent)}
                </span>
            </div>
            <div>
                <span className="text-[9px] text-zinc-600 block uppercase tracking-wider mb-0.5">Renda</span>
                <span className="text-xs font-medium text-zinc-300 tabular-nums">{formatBRL(totalDividendsReceived)}</span>
            </div>
        </div>
      </button>

      {/* 2. AGENDA DE PROVENTOS (Minimalist Timeline) */}
      <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-black border border-white/5 p-5 rounded-3xl active:scale-[0.99] transition-transform">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-zinc-500 stroke-1" />
                <span className="text-sm font-medium text-white">Agenda</span>
            </div>
            {upcomingEvents.length > 0 && <span className="text-[10px] text-zinc-500 font-mono">{upcomingEvents.length} eventos</span>}
        </div>
        
        {upcomingEvents.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {upcomingEvents.slice(0, 4).map((event, i) => { 
                    const style = getEventStyle(event.eventType, event.date); 
                    return ( 
                        <div key={i} className={`flex flex-col gap-1 min-w-[80px] p-3 rounded-xl border border-white/5 bg-zinc-950/50`}>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{event.ticker}</span>
                                <div className={`w-1.5 h-1.5 rounded-full ${style.textColor === 'text-emerald-500' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            </div>
                            <span className="text-[10px] text-zinc-500 tabular-nums">{event.date.split('-').reverse().slice(0,2).join('/')}</span>
                            {event.eventType === 'payment' && <span className={`text-[10px] font-medium ${style.textColor}`}>{formatBRL(event.totalReceived)}</span>}
                        </div> 
                    ); 
                })}
            </div>
        ) : (
            <p className="text-xs text-zinc-600">Nada previsto para os próximos dias.</p>
        )}
      </button>

      {/* 3. GRID SECUNDÁRIO (Renda, Alocação, Ganho Real) */}
      <div className="grid grid-cols-2 gap-3">
          {/* Renda Passiva */}
          <button onClick={() => setShowProventosModal(true)} className="bg-black border border-white/5 p-5 rounded-3xl text-left active:scale-[0.98] transition-transform col-span-2">
             <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <CircleDollarSign className="w-4 h-4 text-zinc-500 stroke-1" />
                    <span className="text-xs font-medium text-white uppercase tracking-wider">Proventos</span>
                </div>
                <span className="text-lg font-light text-emerald-500 tabular-nums">{formatBRL(received)}</span>
             </div>
             <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-900/50 w-full"></div>
             </div>
          </button>

          {/* Alocação */}
          <button onClick={() => setShowAllocationModal(true)} className="bg-black border border-white/5 p-5 rounded-3xl text-left active:scale-[0.98] transition-transform">
             <PieIcon className="w-6 h-6 text-zinc-500 stroke-1 mb-3" />
             <span className="text-xs font-medium text-zinc-400 block mb-1">Alocação</span>
             <span className="text-sm font-medium text-white">{typeData.length > 0 ? typeData[0].name : '-'}</span>
          </button>

          {/* Ganho Real */}
          <button onClick={() => setShowRealGainModal(true)} className="bg-black border border-white/5 p-5 rounded-3xl text-left active:scale-[0.98] transition-transform">
             <TrendingUp className="w-6 h-6 text-zinc-500 stroke-1 mb-3" />
             <span className="text-xs font-medium text-zinc-400 block mb-1">Ganho Real</span>
             <span className={`text-sm font-medium tabular-nums ${isAboveInflation ? 'text-emerald-500' : 'text-zinc-200'}`}>{ganhoRealPercent.toFixed(2)}%</span>
          </button>
      </div>

      {/* --- MODAIS --- */}

      {/* MODAL RESUMO (Clean) */}
      <SwipeableModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)}>
        <div className="p-6">
            <div className="mb-8">
                <h2 className="text-lg font-medium text-white mb-1">Patrimônio</h2>
                <p className="text-xs text-zinc-500">Evolução ({dateLabel})</p>
            </div>
            
            <div className="h-64 w-full mb-8 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredEvolutionData}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fff" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip content={<EvolutionTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="value" stroke="#52525b" strokeWidth={1} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-xs text-zinc-400">Total Investido</span>
                    <span className="text-sm text-white tabular-nums">{formatBRL(invested)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-xs text-zinc-400">Lucro Vendas</span>
                    <span className="text-sm text-emerald-500 tabular-nums">+{formatBRL(salesGain)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-xs text-zinc-400">Proventos Totais</span>
                    <span className="text-sm text-white tabular-nums">{formatBRL(totalDividendsReceived)}</span>
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL AGENDA (Clean List) */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6">
            <h2 className="text-lg font-medium text-white mb-6">Próximos Eventos</h2>
            <div className="space-y-3">
                {upcomingEvents.map((event, i) => {
                    const style = getEventStyle(event.eventType, event.date);
                    return (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border bg-zinc-950/30 ${style.borderColor}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${style.textColor === 'text-emerald-500' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                <div>
                                    <span className="text-sm font-bold text-white block">{event.ticker}</span>
                                    <span className={`text-[10px] uppercase tracking-wider ${style.textColor}`}>{style.label}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-zinc-400 block">{event.date.split('-').reverse().join('/')}</span>
                                {event.eventType === 'payment' && <span className="text-sm font-medium text-white tabular-nums">{formatBRL(event.totalReceived)}</span>}
                            </div>
                        </div>
                    );
                })}
                {upcomingEvents.length === 0 && <p className="text-zinc-500 text-center text-sm py-10">Sem eventos futuros.</p>}
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL PROVENTOS (Charts Clean) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="p-6">
            <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar">
                {['Resumo', 'Histórico', 'Magic Number'].map((t) => (
                    <button 
                        key={t} 
                        onClick={() => setIncomeTab(t === 'Magic Number' ? 'magic' : t === 'Histórico' ? 'history' : 'summary')}
                        className={`text-xs font-medium px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                            (t === 'Resumo' && incomeTab === 'summary') || (t === 'Histórico' && incomeTab === 'history') || (t === 'Magic Number' && incomeTab === 'magic')
                            ? 'bg-white text-black' 
                            : 'bg-zinc-900 text-zinc-500'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {incomeTab === 'summary' && (
                <div className="space-y-8">
                    <div className="text-center">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Total Recebido</span>
                        <h2 className="text-4xl font-light text-white mt-2 tabular-nums">{formatBRL(received)}</h2>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="text-center">
                                <span className="text-[10px] text-zinc-600 block">Média Mensal</span>
                                <span className="text-sm text-zinc-300 tabular-nums">{formatBRL(averageMonthly)}</span>
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] text-zinc-600 block">Yield on Cost</span>
                                <span className="text-sm text-zinc-300 tabular-nums">{yieldOnCostPortfolio.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <Tooltip content={<CustomTooltip />} cursor={{fill: '#18181b'}} />
                                <Bar dataKey="value" fill="#27272a" radius={[2, 2, 0, 0]} activeBar={{fill: '#fff'}} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {incomeTab === 'history' && (
                <div className="space-y-6">
                    {flatHistory.map((item, idx) => {
                        if (item.type === 'header') return <div key={idx} className="text-xs font-medium text-zinc-500 pt-4 uppercase tracking-widest border-b border-zinc-800 pb-2 flex justify-between"><span>{getMonthName(item.month)}</span><span>{formatBRL(item.total)}</span></div>;
                        const h = item.data;
                        return (
                            <div key={idx} className="flex justify-between items-center py-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-400 font-bold">{h.paymentDate.split('-')[2]}</div>
                                    <div>
                                        <span className="text-sm font-medium text-white block">{h.ticker}</span>
                                        <span className="text-[10px] text-zinc-600">{h.type === 'JRS CAP PROPRIO' ? 'JCP' : 'Dividendo'}</span>
                                    </div>
                                </div>
                                <span className="text-sm text-emerald-500 tabular-nums">+{formatBRL(h.totalReceived)}</span>
                            </div>
                        )
                    })}
                </div>
            )}

            {incomeTab === 'magic' && (
                <div className="space-y-4">
                    {magicNumbers.map(m => (
                        <div key={m.ticker} className="bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-white">{m.ticker}</span>
                                {m.missing === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-zinc-500 tabular-nums">Faltam {m.missing}</span>}
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-500" style={{ width: `${m.progress}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </SwipeableModal>

      {/* OUTROS MODAIS SEGUEM O MESMO PADRÃO... (Omitidos para brevidade, mas seguem lógica flat/monocromática) */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
         <div className="p-6">
            <h2 className="text-lg font-medium text-white mb-6">Poder de Compra</h2>
            <div className="bg-zinc-900 p-6 rounded-2xl text-center mb-6 border border-zinc-800">
                <span className="text-zinc-500 text-xs uppercase tracking-widest">Ganho Real</span>
                <div className={`text-4xl font-light mt-2 mb-1 ${isAboveInflation ? 'text-emerald-500' : 'text-zinc-400'}`}>{ganhoRealPercent.toFixed(2)}%</div>
                <span className="text-[10px] text-zinc-600">Acima da Inflação (IPCA)</span>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between p-4 border border-zinc-800 rounded-xl">
                    <span className="text-xs text-zinc-400">Lucro Nominal</span>
                    <span className="text-sm text-white">+{formatBRL(lucroNominalAbsoluto)}</span>
                </div>
                <div className="flex justify-between p-4 border border-zinc-800 rounded-xl">
                    <span className="text-xs text-zinc-400">Corrosão Inflação</span>
                    <span className="text-sm text-rose-500">-{formatBRL(custoCorrosaoInflacao)}</span>
                </div>
            </div>
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6">
            <h2 className="text-lg font-medium text-white mb-6">Distribuição</h2>
            <div className="h-64 mb-6">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={typeData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                            {typeData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-3">
                {typeData.map((item, i) => (
                    <div key={item.name} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-sm text-zinc-300">{item.name}</span>
                        </div>
                        <span className="text-sm text-white font-medium">{formatPercent((item.value / balance) * 100)}</span>
                    </div>
                ))}
            </div>
         </div>
      </SwipeableModal>

    </div>
  );
};

export const Home = React.memo(HomeComponent);