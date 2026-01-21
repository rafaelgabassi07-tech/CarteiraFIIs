import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, CalendarDays, Banknote, Wallet, Calendar, CalendarClock, Coins, ChevronDown, ChevronUp, Target, Gem, TrendingUp, ArrowUpRight, BarChart3, Activity } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, Sector } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  isAiLoading?: boolean;
  inflationRate?: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  transactions?: Transaction[];
  privacyMode?: boolean;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: any, privacy = false) => {
  if (privacy) return '•••%';
  const num = typeof val === 'number' ? val : 0;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatDateShort = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string, typeRaw: string) => {
    const isToday = new Date(dateStr + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    const type = typeRaw ? typeRaw.toUpperCase() : 'DIV';
    
    if (eventType === 'datacom') {
        return { 
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-l-4 border-amber-400',
            text: 'text-amber-700 dark:text-amber-400',
            icon: CalendarClock,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    
    // Pagamentos
    let colorTheme = { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-4 border-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' };
    
    if (type === 'JCP') colorTheme = { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-4 border-orange-500', text: 'text-orange-700 dark:text-orange-400' };
    if (type === 'AMORT') colorTheme = { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-l-4 border-violet-500', text: 'text-violet-700 dark:text-violet-400' };

    return {
        ...colorTheme,
        icon: isToday ? Coins : Banknote,
        label: isToday ? 'Cai Hoje' : type
    };
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRaioXModal, setShowRaioXModal] = useState(false);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  
  const safeInflation = Number(inflationRate) || 4.62;

  // Cálculos de Rentabilidade
  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  // Cálculo de Ganho Real (Fisher Equation simplificada)
  const realReturnPercent = useMemo(() => {
      const nominalFactor = 1 + (totalProfitPercent / 100);
      const inflationFactor = 1 + (safeInflation / 100);
      return ((nominalFactor / inflationFactor) - 1) * 100;
  }, [totalProfitPercent, safeInflation]);

  // --- LOGICA DE EVENTOS DA AGENDA ---
  const { upcomingEvents, received, groupedEvents } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allEvents: any[] = [];
    let receivedTotal = 0;
    
    dividendReceipts.forEach(r => {
        if (r.paymentDate <= todayStr) receivedTotal += r.totalReceived;
        if (r.paymentDate >= todayStr) allEvents.push({ ...r, eventType: 'payment', date: r.paymentDate });
        if (r.dateCom >= todayStr) allEvents.push({ ...r, eventType: 'datacom', date: r.dateCom });
    });
    
    const sortedEvents = allEvents.sort((a, b) => a.date.localeCompare(b.date));

    const grouped: Record<string, any[]> = { 'Hoje': [], 'Amanhã': [], 'Próximos 7 Dias': [], 'Este Mês': [], 'Futuro': [] };
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const nextWeekDate = new Date(todayDate); nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);

    sortedEvents.forEach((ev: any) => {
        const evDate = new Date(ev.date + 'T00:00:00');
        if (evDate.getTime() === todayDate.getTime()) grouped['Hoje'].push(ev);
        else if (evDate.getTime() === tomorrowDate.getTime()) grouped['Amanhã'].push(ev);
        else if (evDate <= nextWeekDate) grouped['Próximos 7 Dias'].push(ev);
        else if (evDate <= endOfMonth) grouped['Este Mês'].push(ev);
        else grouped['Futuro'].push(ev);
    });

    return { upcomingEvents: sortedEvents, received: receivedTotal, groupedEvents: grouped };
  }, [dividendReceipts]);

  // --- LOGICA DE HISTORICO E GRAFICOS ---
  const { history, dividendsChartData, provisionedTotal, receiptsByMonth, divStats } = useMemo(() => {
    const map: Record<string, number> = {};
    const provMap: Record<string, number> = {};
    const receiptsMap: Record<string, DividendReceipt[]> = {};
    let provTotal = 0;
    let total12m = 0;
    let maxMonthly = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    dividendReceipts.forEach(r => {
        if (!r.paymentDate || r.paymentDate.length < 7) return;
        const key = r.paymentDate.substring(0, 7);

        if (r.paymentDate <= todayStr) {
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsMap[key]) receiptsMap[key] = [];
            receiptsMap[key].push(r);
            
            if (r.paymentDate >= oneYearAgoStr) total12m += r.totalReceived;
        } else {
            provMap[key] = (provMap[key] || 0) + r.totalReceived;
            provTotal += r.totalReceived;
        }
    });

    Object.keys(receiptsMap).forEach(k => {
        receiptsMap[k].sort((a, b) => b.totalReceived - a.totalReceived);
        if (map[k] > maxMonthly) maxMonthly = map[k];
    });

    const sortedHistory = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    
    const dividendsChartData = sortedHistory.map(([date, val]) => {
        const [y, m] = date.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return {
            fullDate: date,
            name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
            value: val,
            year: y
        };
    }).reverse();

    const monthlyAvg = dividendsChartData.length > 0 ? (totalDividendsReceived / dividendsChartData.length) : 0;

    return { 
        history: sortedHistory, 
        dividendsChartData,
        provisionedTotal: provTotal,
        receiptsByMonth: receiptsMap,
        divStats: { total12m, maxMonthly, monthlyAvg }
    };
  }, [dividendReceipts, totalDividendsReceived]);

  const { typeData, classChartData, assetsChartData } = useMemo(() => {
      let fiisTotal = 0;
      let stocksTotal = 0;
      const enriched = portfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val;
          else stocksTotal += val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      const sortedByValue = [...enriched].sort((a, b) => b.totalValue - a.totalValue);
      const assetsChartData = sortedByValue.map((a, idx) => ({
          name: a.ticker,
          value: a.totalValue,
          type: a.assetType,
          percent: (a.totalValue / total) * 100,
          color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
      const classChartData = [
          { name: 'FIIs', value: fiisTotal, color: '#6366f1', percent: (fiisTotal / total) * 100 },
          { name: 'Ações', value: stocksTotal, color: '#0ea5e9', percent: (stocksTotal / total) * 100 }
      ].filter(d => d.value > 0);

      return {
          typeData: {
            fiis: { value: fiisTotal, percent: (fiisTotal / total) * 100 },
            stocks: { value: stocksTotal, percent: (stocksTotal / total) * 100 },
            total
          },
          classChartData,
          assetsChartData
      };
  }, [portfolio]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 z-50">
          <p className="text-xs font-black text-zinc-900 dark:text-white mb-0.5">{payload[0].name}</p>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {formatBRL(payload[0].value, privacyMode)} ({formatPercent(payload[0].payload.percent)})
          </p>
        </div>
      );
    }
    return null;
  };

  const toggleMonthExpand = (monthKey: string) => {
      setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  // Classes Padronizadas para Reutilização
  const cardBaseClass = "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all press-effect relative overflow-hidden group";
  const hoverBorderClass = "hover:border-zinc-300 dark:hover:border-zinc-700";
  const modalHeaderIconClass = "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm";

  return (
    <div className="space-y-4 pb-8">
      
      {/* 1. CARTÃO DE PATRIMÔNIO TOTAL */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="p-6 text-center border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-1.5">
                    <Wallet className="w-3 h-3" /> Patrimônio Total
                </p>
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none">
                    {formatBRL(balance, privacyMode)}
                </h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
                <div className="p-5 flex flex-col items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Total Aplicado</p>
                    <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                        {formatBRL(invested, privacyMode)}
                    </span>
                </div>
                <div className="p-5 flex flex-col items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors relative overflow-hidden">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Resultado</p>
                    <div className="flex flex-col items-center relative z-10">
                        <span className={`text-sm font-black flex items-center gap-1 ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? '+' : ''}{formatBRL(totalProfitValue, privacyMode)}
                        </span>
                        <span className={`text-[9px] font-bold ${isProfitPositive ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-rose-600/70 dark:text-rose-400/70'}`}>
                            {isProfitPositive ? '+' : ''}{formatPercent(totalProfitPercent, privacyMode)}
                        </span>
                    </div>
                    <div className={`absolute inset-0 opacity-5 dark:opacity-10 ${isProfitPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. BOTÃO AGENDA (PADRONIZADO) */}
      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className={`w-full text-left p-5 flex justify-between items-center ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    <CalendarDays className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white">Agenda</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                        {upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos Próximos` : 'Tudo tranquilo'}
                    </p>
                </div>
            </div>
            {upcomingEvents.length > 0 && (
                <div className="flex -space-x-2 relative z-10">
                     {upcomingEvents.slice(0,3).map((ev: any, i: number) => <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-600 dark:text-zinc-400 shadow-sm">{ev.ticker.substring(0,2)}</div>)}
                     {upcomingEvents.length > 3 && <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-500 shadow-sm">+{upcomingEvents.length - 3}</div>}
                </div>
            )}
        </button>
      </div>
      
      {/* 3. GRID PROVENTOS & RAIO-X (ALINHADOS E PADRONIZADOS) */}
      <div className="grid grid-cols-2 gap-4 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        
        {/* Card Proventos */}
        <button onClick={() => setShowProventosModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30"><CircleDollarSign className="w-5 h-5" /></div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Renda Passiva</span>
                    <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">{formatBRL(received, privacyMode)}</p>
                </div>
                {provisionedTotal > 0 ? (
                    <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit">
                        <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                            + {formatBRL(provisionedTotal, privacyMode)} <span className="opacity-50">Futuro</span>
                        </p>
                    </div>
                ) : (
                    <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Média {formatBRL(divStats.monthlyAvg, true).split('R$')[1]}</p>
                    </div>
                )}
            </div>
            {/* Efeito de brilho ao hover */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all opacity-50 group-hover:opacity-100"></div>
        </button>

        {/* Card RAIO-X */}
        <button onClick={() => setShowRaioXModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30">
                            <Activity className="w-5 h-5" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-rose-500 transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Ganho Real</span>
                    <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{realReturnPercent > 0 ? '+' : ''}{realReturnPercent.toFixed(2)}%</p>
                </div>
                
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit">
                    <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        IPCA (12m) {safeInflation}%
                    </p>
                </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
                <BarChart3 className="w-24 h-24 text-rose-500 -mb-4 -mr-4" />
            </div>
        </button>
      </div>

      {/* 4. CARD ALOCAÇÃO */}
      <div className="anim-stagger-item" style={{ animationDelay: '250ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className={`w-full text-left p-5 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex justify-between items-end mb-5 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-900/30"><PieIcon className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white">Alocação</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Diversificação da Carteira</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs font-black text-zinc-900 dark:text-white block">{typeData.total > 0 ? 'Balanceado' : 'Vazio'}</span>
                </div>
            </div>
            
            <div className="relative z-10">
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3 shadow-inner">
                    <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-500 transition-all duration-1000 ease-out"></div>
                    <div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 transition-all duration-1000 ease-out"></div>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sky-600 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span>
                        <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                    </div>
                </div>
            </div>
        </button>
      </div>

      {/* MODAIS */}

      {/* 4. MODAL AGENDA */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
            <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700`}><CalendarDays className="w-6 h-6" /></div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Próximos Eventos</p>
                </div>
            </div>
            
            {Object.keys(groupedEvents).map((groupKey) => {
                const events = groupedEvents[groupKey];
                if (events.length === 0) return null;
                return (
                    <div key={groupKey} className="mb-8 anim-slide-up relative">
                        {/* Linha do tempo visual */}
                        <div className="absolute left-[19px] top-8 bottom-0 w-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                        
                        <h3 className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 sticky top-0 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm py-2 z-10 w-fit rounded-r-lg">
                            {groupKey}
                        </h3>
                        
                        <div className="space-y-4">
                            {events.map((e: any, i: number) => {
                                const style = getEventStyle(e.eventType, e.date, e.type);
                                return (
                                    <div key={i} className={`ml-10 relative p-4 rounded-xl flex items-center justify-between border shadow-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${style.border}`}>
                                        <div className="absolute -left-[26px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 border-[3px] border-zinc-300 dark:border-zinc-700 z-10"></div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.bg} ${style.text}`}>
                                                <style.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase">{e.ticker}</h4>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500`}>{e.type || 'DIV'}</span>
                                                </div>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${style.text}`}>{style.label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {e.eventType === 'payment' ? (
                                                <>
                                                    <span className={`block text-sm font-black text-zinc-900 dark:text-white`}>{formatBRL(e.totalReceived, privacyMode)}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{formatDateShort(e.date)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="block text-sm font-black text-zinc-900 dark:text-white">{formatDateShort(e.date)}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">Corte</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            
            {upcomingEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Calendar className="w-16 h-16 text-zinc-300 mb-4" strokeWidth={1} />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Agenda Vazia</p>
                </div>
            )}
        </div>
      </SwipeableModal>

      {/* 5. MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-700`}><PieIcon className="w-6 h-6" strokeWidth={1.5} /></div>
                <div><h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2><p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Diversificação</p></div>
             </div>
             
             <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-xl flex gap-1 mb-6 shadow-sm border border-zinc-200 dark:border-zinc-800 anim-slide-up shrink-0" style={{ animationDelay: '50ms' }}>
                 <button onClick={() => setAllocationTab('CLASS')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === 'CLASS' ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Por Classe</button>
                 <button onClick={() => setAllocationTab('ASSET')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === 'ASSET' ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Por Ativo</button>
             </div>
             
             <div className="anim-slide-up px-1 pb-10" style={{ animationDelay: '100ms' }}>
                 {allocationTab === 'CLASS' ? (
                     <div className="space-y-6">
                         {/* Donut Chart */}
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800">
                            <div className="h-64 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={classChartData} 
                                            innerRadius={65} 
                                            outerRadius={90} 
                                            paddingAngle={5} 
                                            cornerRadius={8} 
                                            dataKey="value" 
                                            stroke="none" 
                                            isAnimationActive={true} 
                                            animationDuration={1000} 
                                            activeIndex={activeIndexClass} 
                                            activeShape={(props: any) => {
                                                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                                                return (
                                                    <g>
                                                        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} className="drop-shadow-lg filter" cornerRadius={6} />
                                                        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={innerRadius - 6} outerRadius={innerRadius - 2} fill={fill} />
                                                    </g>
                                                );
                                            }}
                                            onMouseEnter={(_, index) => setActiveIndexClass(index)} 
                                            onTouchStart={(_, index) => setActiveIndexClass(index)}
                                            onMouseLeave={() => setActiveIndexClass(undefined)}
                                        >
                                            {classChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                
                                {/* Center Label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none anim-fade-in select-none">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                        {activeIndexClass !== undefined ? classChartData[activeIndexClass].name : 'Total'}
                                    </span>
                                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                        {activeIndexClass !== undefined ? formatPercent(classChartData[activeIndexClass].percent, privacyMode) : formatBRL(typeData.total, privacyMode)}
                                    </span>
                                </div>
                            </div>
                         </div>

                         {/* List */}
                         <div className="space-y-3">
                             {classChartData.map((item, index) => (
                                 <button key={index} onClick={() => setActiveIndexClass(index === activeIndexClass ? undefined : index)} className={`w-full p-4 rounded-2xl border flex items-center gap-4 group transition-all duration-300 ${index === activeIndexClass ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm" style={{ backgroundColor: item.color }}>
                                        {Math.round(item.percent)}%
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</span>
                                            <span className="text-xs font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                        </div>
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-2 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                                        </div>
                                    </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 ) : (
                     <div className="space-y-4">
                         {assetsChartData.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {assetsChartData.map((asset, index) => (
                                    <div key={index} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 anim-stagger-item" style={{ animationDelay: `${index * 30}ms` }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border border-zinc-100 dark:border-zinc-800" style={{ color: asset.color, backgroundColor: `${asset.color}15` }}>
                                            {asset.name.substring(0,2)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{asset.name}</span>
                                                <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(asset.percent, privacyMode)}</span>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full rounded-full opacity-90" style={{ width: `${asset.percent}%`, backgroundColor: asset.color }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         ) : <div className="flex flex-col items-center justify-center py-20 opacity-50"><Gem className="w-12 h-12 text-zinc-300 mb-4" strokeWidth={1} /><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum ativo</p></div>}
                     </div>
                 )}
             </div>
         </div>
      </SwipeableModal>

      {/* 6. MODAL PROVENTOS APRIMORADO */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => { setShowProventosModal(false); setSelectedProventosMonth(null); setExpandedMonth(null); }}>
         <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-zinc-200 dark:border-zinc-700`}><Wallet className="w-6 h-6" strokeWidth={1.5} /></div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Histórico de Recebimentos</p>
                </div>
             </div>
             
             {/* Estatísticas Rápidas */}
             <div className="grid grid-cols-3 gap-3 mb-6 anim-slide-up">
                 {[
                     { label: 'Média Mensal', val: divStats.monthlyAvg, color: 'text-zinc-900 dark:text-white' },
                     { label: 'Recorde', val: divStats.maxMonthly, color: 'text-emerald-600 dark:text-emerald-400' },
                     { label: 'Total 12m', val: divStats.total12m, color: 'text-zinc-900 dark:text-white' }
                 ].map((s, i) => (
                     <div key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center shadow-sm">
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                         <p className={`text-xs font-black ${s.color}`}>{formatBRL(s.val, privacyMode)}</p>
                     </div>
                 ))}
             </div>

             {dividendsChartData.length > 0 && (
                 <div className="mb-8 h-48 w-full bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm anim-slide-up">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dividendsChartData} onClick={(data) => { if (data && data.activePayload && data.activePayload[0]) { const date = data.activePayload[0].payload.fullDate; setSelectedProventosMonth(date); toggleMonthExpand(date); } }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomPieTooltip />} />
                            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                {dividendsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fullDate === selectedProventosMonth ? '#10b981' : '#e4e4e7'} className="transition-colors duration-300 hover:opacity-80 dark:fill-zinc-700 dark:hover:fill-emerald-600" />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
             )}
             
             <div className="space-y-3">
                {history.map(([month, val], i) => (
                    <div key={month} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden anim-stagger-item" style={{ animationDelay: `${i * 30}ms` }}>
                        <button 
                            onClick={() => toggleMonthExpand(month)}
                            className="w-full flex justify-between items-center p-4 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${expandedMonth === month ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                    {expandedMonth === month ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    {new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(val, privacyMode)}</span>
                        </button>
                        
                        {/* Detalhes Expansíveis */}
                        {expandedMonth === month && receiptsByMonth[month] && (
                            <div className="bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 space-y-2">
                                {receiptsByMonth[month].map((r, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                            <div>
                                                <span className="text-xs font-black text-zinc-900 dark:text-white block">{r.ticker}</span>
                                                <span className="text-[9px] text-zinc-400 font-bold uppercase">{new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">{formatBRL(r.totalReceived, privacyMode)}</span>
                                            <span className="text-[9px] text-zinc-400 font-medium">
                                                {r.quantityOwned} un x {r.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
             </div>
         </div>
      </SwipeableModal>

      {/* 7. MODAL RAIO-X (NOVO) */}
      <SwipeableModal isOpen={showRaioXModal} onClose={() => setShowRaioXModal(false)}>
          <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
              <div className="flex items-center gap-4 mb-8 px-2">
                  <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-rose-500 border-zinc-200 dark:border-zinc-700`}><Target className="w-6 h-6" /></div>
                  <div>
                      <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Raio-X</h2>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Rentabilidade Real</p>
                  </div>
              </div>

              {/* Card Principal: Ganho Real */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6 text-center relative overflow-hidden anim-slide-up">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Rentabilidade Real (Aprox.)</p>
                  <h3 className={`text-4xl font-black tracking-tighter ${realReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {realReturnPercent > 0 ? '+' : ''}{realReturnPercent.toFixed(2)}%
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium mt-2 max-w-[200px] mx-auto">
                      Retorno total descontado da inflação (IPCA {safeInflation}%)
                  </p>
              </div>

              {/* Decomposição do Lucro */}
              <div className="space-y-4 anim-slide-up" style={{ animationDelay: '100ms' }}>
                  <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Composição do Resultado</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                          <div className="mb-2 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase">Valorização</p>
                          <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalAppreciation + salesGain, privacyMode)}</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                          <div className="mb-2 w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center"><CircleDollarSign className="w-4 h-4" /></div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase">Proventos</p>
                          <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalDividendsReceived, privacyMode)}</p>
                      </div>
                  </div>
              </div>
          </div>
      </SwipeableModal>

    </div>
  );
};

export const Home = React.memo(HomeComponent);
