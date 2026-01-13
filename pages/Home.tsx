
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2, Wallet, Calendar, Clock, ArrowUpRight, ArrowDownRight, Layers, ChevronUp, Scale, Percent, Info, Coins, BarChart3, LayoutGrid, Gem, CalendarClock, ChevronDown } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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

interface MonthlyInflationData {
    month: string;
    fullDate: string;
    dividends: number;
    inflation: number;
    net: number;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: any, privacy = false) => {
  if (privacy) return '•••%';
  const num = typeof val === 'number' ? val : 0;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

const formatDateShort = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e', '#84cc16', '#14b8a6'];

const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string) => {
    const isToday = new Date(dateStr + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    if (eventType === 'datacom') {
        return { 
            containerClass: 'bg-amber-50 dark:bg-amber-950/20 border-l-[3px] border-l-amber-400 border-y border-r border-amber-100 dark:border-amber-900',
            iconClass: 'text-amber-500',
            textClass: 'text-amber-700 dark:text-amber-300',
            valueClass: 'text-amber-800 dark:text-amber-200 font-medium',
            icon: CalendarDays,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    return {
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

const getInflationVerdict = (realReturn: number) => {
    if (realReturn >= 4) return { title: "Gerador de Riqueza", desc: "Excelente! Sua carteira está multiplicando seu poder de compra agressivamente.", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (realReturn >= 0) return { title: "Proteção Patrimonial", desc: "Bom. Você está blindado contra a inflação e ganhando poder de compra.", color: "text-sky-500", bg: "bg-sky-500" };
    if (realReturn >= -2) return { title: "Erosão Leve", desc: "Atenção. Seus dividendos quase cobrem a inflação, mas ainda há perda real.", color: "text-amber-500", bg: "bg-amber-500" };
    return { title: "Destruição de Valor", desc: "Crítico. A inflação está consumindo seu patrimônio mais rápido do que ele rende.", color: "text-rose-500", bg: "bg-rose-500" };
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate = 4.62, invested, balance, totalAppreciation, transactions = [], privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealYieldModal, setShowRealYieldModal] = useState(false);
  const [showPatrimonyHelp, setShowPatrimonyHelp] = useState(false);
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
        if (!acc.find((i: any) => i.date === current.date && i.ticker === current.ticker && i.eventType === current.eventType)) acc.push(current);
        return acc;
    }, []);

    return { upcomingEvents: uniqueEvents, received: receivedTotal };
  }, [dividendReceipts]);

  const { history, average, maxVal, receiptsByMonth, realYieldMetrics, last12MonthsData, provisionedMap, provisionedTotal, sortedProvisionedMonths } = useMemo(() => {
    const map: Record<string, number> = {};
    const receiptsByMonthMap: Record<string, DividendReceipt[]> = {};
    const provMap: Record<string, DividendReceipt[]> = {};
    let provTotal = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    let sum12m = 0;

    dividendReceipts.forEach(r => {
        // Se paymentDate estiver vazia ou inválida, não processa
        if (!r.paymentDate || r.paymentDate.length < 7) return;

        const pDate = new Date(r.paymentDate + 'T00:00:00');
        const key = r.paymentDate.substring(0, 7);

        if (r.paymentDate <= todayStr) {
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsByMonthMap[key]) receiptsByMonthMap[key] = [];
            receiptsByMonthMap[key].push(r);

            const diffMonths = (today.getFullYear() - pDate.getFullYear()) * 12 + (today.getMonth() - pDate.getMonth());
            if (diffMonths >= 0 && diffMonths <= 11) {
                sum12m += r.totalReceived;
            }
        } else {
            if (!provMap[key]) provMap[key] = [];
            provMap[key].push(r);
            provTotal += r.totalReceived;
        }
    });

    const sortedHistory = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    const sortedProvisionedMonths = Object.keys(provMap).sort((a, b) => a.localeCompare(b));
    const totalMonths = sortedHistory.length || 1;
    const average = received / (totalMonths > 0 ? totalMonths : 1);
    const maxVal = Math.max(...Object.values(map), 0);

    // Fallback seguro para IPCA
    const safeInflation = (typeof inflationRate === 'number' && !isNaN(inflationRate)) ? inflationRate : 4.62;
    const userDy = invested > 0 ? (sum12m / invested) * 100 : 0;
    const realReturn = userDy - safeInflation;
    const inflationCost = invested * (safeInflation / 100);
    const dividendCoverage = inflationCost > 0 ? (sum12m / inflationCost) * 100 : 100;

    const last12MonthsData: MonthlyInflationData[] = [];
    const monthlyInflationRate = Math.pow(1 + (safeInflation) / 100, 1 / 12) - 1;
    
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toISOString().substring(0, 7);
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const dividends = receiptsByMonthMap[key]?.reduce((acc, r) => acc + r.totalReceived, 0) || 0;
        const monthInflationCost = invested * monthlyInflationRate;
        
        last12MonthsData.push({
            month: monthLabel,
            fullDate: key,
            dividends: dividends,
            inflation: monthInflationCost,
            net: dividends - monthInflationCost
        });
    }

    return { 
        history: sortedHistory, 
        average, 
        maxVal, 
        receiptsByMonth: receiptsByMonthMap,
        realYieldMetrics: { userDy, realReturn, sum12m, inflationCost, dividendCoverage },
        last12MonthsData,
        provisionedMap: provMap, 
        provisionedTotal: provTotal,
        sortedProvisionedMonths
    };
  }, [dividendReceipts, received, invested, inflationRate]);

  const { typeData, segmentsData, classChartData, assetsChartData } = useMemo(() => {
      let fiisTotal = 0;
      let stocksTotal = 0;
      
      const segmentsMap: Record<string, { value: number; tickers: string[] }> = {};
      
      const enriched = portfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val;
          else stocksTotal += val;
          
          const segName = p.segment || 'Outros';
          if (!segmentsMap[segName]) {
              segmentsMap[segName] = { value: 0, tickers: [] };
          }
          segmentsMap[segName].value += val;
          if (!segmentsMap[segName].tickers.includes(p.ticker)) {
              segmentsMap[segName].tickers.push(p.ticker);
          }
          
          return { ...p, totalValue: val };
      });
      
      const total = fiisTotal + stocksTotal || 1;
      const segmentsData = Object.entries(segmentsMap)
        .map(([name, data]) => ({ name, value: data.value, tickers: data.tickers }))
        .sort((a, b) => b.value - a.value);
      
      const sortedByValue = [...enriched].sort((a, b) => b.totalValue - a.totalValue);
      const topLimit = 5;
      const topAssetsChart = sortedByValue.slice(0, topLimit).map(a => ({
          name: a.ticker,
          value: a.totalValue
      }));
      const othersValue = sortedByValue.slice(topLimit).reduce((acc, curr) => acc + curr.totalValue, 0);
      const assetsChartData = [...topAssetsChart];
      if (othersValue > 0) {
          assetsChartData.push({ name: 'Outros', value: othersValue });
      }
      
      const classChartData = [
          { name: 'FIIs', value: fiisTotal, color: '#6366f1' },
          { name: 'Ações', value: stocksTotal, color: '#0ea5e9' }
      ].filter(d => d.value > 0);

      return {
          typeData: {
            fiis: { value: fiisTotal, percent: (fiisTotal / total) * 100 },
            stocks: { value: stocksTotal, percent: (stocksTotal / total) * 100 },
            total
          },
          topAssets: sortedByValue,
          segmentsData,
          classChartData,
          assetsChartData
      };
  }, [portfolio]);

  const toggleMonthExpand = (monthKey: string) => setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  const verdict = getInflationVerdict(realYieldMetrics.realReturn);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700">
          <p className="text-xs font-black text-zinc-900 dark:text-white mb-0.5">{payload[0].name}</p>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {formatBRL(payload[0].value, privacyMode)} ({formatPercent((payload[0].value / typeData.total) * 100)})
          </p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 z-50">
                  <p className="text-xs font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">{label}</p>
                  <div className="space-y-1">
                      {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-bold" style={{ color: entry.color }}>
                                  {entry.name === 'dividends' ? 'Proventos' : 'Inflação'}
                              </span>
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                  {formatBRL(entry.value, privacyMode)}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-3 pb-8">
      {/* 1. Patrimonio Total - Hero Card */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-card dark:shadow-card-dark bg-surface-light dark:bg-surface-dark">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Patrimônio Total</span>
                <div className="flex items-center gap-2">
                    {isAiLoading && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                    <button onClick={(e) => { e.stopPropagation(); setShowPatrimonyHelp(true); }} className="text-zinc-400 hover:text-accent transition-colors">
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="mb-6 relative z-10">
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none mb-1">{formatBRL(balance, privacyMode)}</h2>
            </div>
            <div className="flex justify-between items-end border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4 relative z-10">
                <div>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                        <Wallet className="w-3 h-3" /> Custo de Aquisição
                    </span>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(invested, privacyMode)}</p>
                </div>
                <div className="text-right">
                     <span className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Resultado Geral</span>
                    <div className={`flex flex-col items-end`}>
                        <span className={`text-sm font-black flex items-center gap-1 ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? '+' : ''}{formatBRL(totalProfitValue, privacyMode)}
                        </span>
                        <span className={`text-[10px] font-bold ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isProfitPositive ? <ArrowUpRight className="w-3 h-3 inline mr-0.5" /> : <ArrowDownRight className="w-3 h-3 inline mr-0.5" />}
                            {formatPercent(totalProfitPercent, privacyMode)}
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 relative z-10">
                 <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
                    <div className="flex justify-center mb-1"><TrendingUp className="w-3.5 h-3.5 text-zinc-400" /></div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Valorização Atual</p>
                    <p className={`text-[10px] font-black ${totalAppreciation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatBRL(totalAppreciation, privacyMode)}
                    </p>
                 </div>
                 <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
                    <div className="flex justify-center mb-1"><Coins className="w-3.5 h-3.5 text-emerald-500" /></div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Total Recebido</p>
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        {formatBRL(totalDividendsReceived, privacyMode)}
                    </p>
                 </div>
                 <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center">
                    <div className="flex justify-center mb-1"><ArrowUpRight className="w-3.5 h-3.5 text-sky-500" /></div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Lucro Realizado</p>
                    <p className={`text-[10px] font-black ${salesGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatBRL(salesGain, privacyMode)}
                    </p>
                 </div>
            </div>
        </div>
      </div>

      {/* 2. Agenda */}
      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 shadow-card dark:shadow-card-dark">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                        <CalendarDays className="w-4.5 h-4.5" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Agenda</h3>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                            {upcomingEvents.length > 0 ? `Próximo: ${upcomingEvents[0].ticker}` : 'Sem eventos'}
                        </p>
                    </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                </div>
            </div>
            {upcomingEvents.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {upcomingEvents.slice(0, 4).map((event: any, i: number) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`flex-shrink-0 p-2.5 pr-3.5 rounded-xl ${style.containerClass} min-w-[120px] anim-scale-in`} style={{ animationDelay: `${200 + (i * 50)}ms` }}>
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className={`text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white`}>{event.ticker}</span>
                                    <style.icon className={`w-3 h-3 ${style.iconClass}`} />
                                </div>
                                <span className={`text-xs block ${style.valueClass}`}>
                                    {event.eventType === 'payment' ? formatBRL(event.totalReceived, privacyMode) : formatDateShort(event.date)}
                                </span>
                                <span className={`text-[9px] font-medium block mt-0.5 ${style.textClass}`}>{getDaysUntil(event.date)}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Nenhum evento previsto.</p>
                </div>
            )}
        </button>
      </div>
      
      {/* 3. Grid Buttons */}
      <div className="grid grid-cols-2 gap-3 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-left press-effect hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full relative overflow-hidden shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-3 border border-emerald-100 dark:border-emerald-900/30">
                    <CircleDollarSign className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-0.5">Renda Passiva</span>
                <p className="text-base font-black text-zinc-900 dark:text-white tracking-tight leading-tight mb-0.5">{formatBRL(received, privacyMode)}</p>
                <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">Média: {formatBRL(average, privacyMode)}/mês</p>
            </div>
            {provisionedTotal > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                    <p className="text-[9px] font-bold text-zinc-400">Provisionado</p>
                    <p className="text-xs font-black text-amber-500">{formatBRL(provisionedTotal, privacyMode)}</p>
                </div>
            )}
        </button>

        <button onClick={() => setShowAllocationModal(true)} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-left press-effect hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-900/30">
                    <PieIcon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-0.5">Diversificação</span>
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mt-2 mb-2">
                    <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-1000"></div>
                    <div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 dark:bg-sky-400 transition-all duration-1000"></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span>
                    <span className="text-sky-600 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span>
                </div>
            </div>
        </button>
      </div>

      {/* 4. Renda vs IPCA (Ganho Real) */}
      <div className="anim-stagger-item" style={{ animationDelay: '300ms' }}>
         <button onClick={() => setShowRealYieldModal(true)} className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-card dark:shadow-card-dark relative overflow-hidden text-left press-effect group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500"></div>
             <div className="flex items-center justify-between mb-4 relative z-10">
                 <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                          <Scale className="w-4 h-4" />
                     </div>
                     <div>
                         <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-none">Ganho Real</h3>
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Rentabilidade vs IPCA 12m</p>
                     </div>
                 </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${realYieldMetrics.realReturn >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'}`}>
                     {realYieldMetrics.realReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                     {realYieldMetrics.realReturn >= 0 ? 'Positivo' : 'Negativo'}
                  </div>
             </div>
             <div className="flex items-end gap-2 mb-4 relative z-10">
                  <span className={`text-3xl font-black tracking-tight ${realYieldMetrics.realReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                     {realYieldMetrics.realReturn > 0 ? '+' : ''}{formatPercent(realYieldMetrics.realReturn, privacyMode)}
                  </span>
                  <span className="text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Acima da inflação</span>
             </div>
             <div className="space-y-3 relative z-10">
                 <div>
                     <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                         <span>Sua Carteira (DY)</span>
                         <span className="text-zinc-900 dark:text-white">{formatPercent(realYieldMetrics.userDy, privacyMode)}</span>
                     </div>
                     <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((realYieldMetrics.userDy / 15) * 100, 100)}%` }}></div>
                     </div>
                 </div>
                  <div>
                     <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                         <span>IPCA (Inflação)</span>
                         <span className="text-zinc-900 dark:text-white">{formatPercent(Number(inflationRate || 4.62), privacyMode)}</span>
                     </div>
                     <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(((Number(inflationRate || 4.62)) / 15) * 100, 100)}%` }}></div>
                     </div>
                 </div>
             </div>
             {isAiLoading && <div className="absolute top-4 right-4"><Loader2 className="w-3 h-3 text-zinc-300 animate-spin"/></div>}
             <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center text-zinc-400">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                </div>
             </div>
         </button>
      </div>

      <SwipeableModal isOpen={showPatrimonyHelp} onClose={() => setShowPatrimonyHelp(false)}>
          <div className="p-6 pb-20">
              <h2 className="text-2xl font-black mb-4">Sobre os Valores</h2>
              <p className="text-sm text-zinc-500 mb-2">O patrimônio total é a soma do valor de mercado de todos os seus ativos.</p>
              <p className="text-sm text-zinc-500">O resultado geral considera proventos, valorização da cota e lucro realizado em vendas.</p>
          </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 px-2">Agenda Completa</h2>
            <div className="space-y-3">
                {upcomingEvents.map((e: any, i: number) => {
                    const style = getEventStyle(e.eventType, e.date);
                    return (
                        <div key={i} className={`p-4 rounded-2xl flex items-center justify-between anim-slide-up ${style.containerClass}`} style={{ animationDelay: `${i * 50}ms` }}>
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
                                <p className="text-sm font-black text-zinc-900 dark:text-white">{formatDateShort(e.date)}</p>
                                {e.eventType === 'payment' && (
                                    <div className="mt-1 flex flex-col items-end">
                                        <p className={`text-xs ${style.valueClass}`}>{formatBRL(e.totalReceived, privacyMode)}</p>
                                        <div className="flex items-center justify-end gap-1.5 mt-1">
                                            <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5">
                                                {e.quantityOwned} un
                                            </span>
                                            <span className="text-[9px] text-zinc-400">x</span>
                                            <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5">
                                                {formatBRL(e.rate, privacyMode)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-8 anim-slide-up">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2>
                    <p className="text-xs text-zinc-500 font-medium">Histórico de Pagamentos</p>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3 mb-6 anim-slide-up" style={{ animationDelay: '100ms' }}>
                 <div className="bg-emerald-500 p-5 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Recebido</p>
                     <p className="text-2xl font-black">{formatBRL(received, privacyMode)}</p>
                 </div>
                 <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                     <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Média Mensal</p>
                     <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(average, privacyMode)}</p>
                 </div>
             </div>

             {sortedProvisionedMonths.length > 0 && (
                 <div className="mb-6 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 mb-2 flex items-center gap-2">
                         <CalendarClock className="w-3 h-3" /> Provisionados (Futuros)
                     </h3>
                     <div className="space-y-2">
                        {sortedProvisionedMonths.map((month: string) => {
                            const [year, m] = month.split('-');
                            const monthName = new Date(parseInt(year), parseInt(m)-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            const monthTotal = provisionedMap[month].reduce((acc: number, r: DividendReceipt) => acc + r.totalReceived, 0);

                            return (
                                <div key={month} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl overflow-hidden">
                                     <div className="p-4 flex justify-between items-center bg-amber-100/50 dark:bg-amber-900/30">
                                         <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-200">{monthName}</span>
                                         <span className="text-sm font-black text-amber-700 dark:text-amber-300">{formatBRL(monthTotal, privacyMode)}</span>
                                     </div>
                                     <div className="p-2 space-y-1">
                                         {provisionedMap[month].map((detail: DividendReceipt, idx: number) => (
                                             <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white/50 dark:bg-zinc-900/50">
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{detail.ticker}</span>
                                                      <span className="text-[8px] bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-1 rounded uppercase font-bold">{detail.type}</span>
                                                  </div>
                                                  <div className="text-right">
                                                      <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(detail.totalReceived, privacyMode)}</span>
                                                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[8px] text-zinc-400">
                                                          <span className="font-bold">{detail.quantityOwned} un</span>
                                                          <span>x</span>
                                                          <span className="font-bold">{formatBRL(detail.rate, privacyMode)}</span>
                                                      </div>
                                                      <span className="text-[8px] text-zinc-400 mt-0.5 block">Pag: {formatDateShort(detail.paymentDate)}</span>
                                                  </div>
                                             </div>
                                         ))}
                                     </div>
                                </div>
                            )
                        })}
                     </div>
                 </div>
             )}

             <div className="space-y-4">
                 <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-2 anim-slide-up" style={{ animationDelay: '300ms' }}>Histórico Realizado</h3>
                 {history.length > 0 ? (
                     <div className="space-y-4">
                        {history.map(([month, val]: [string, number], i: number) => {
                            const [year, m] = month.split('-');
                            const dateObj = new Date(parseInt(year), parseInt(m)-1, 1);
                            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            const percentage = (val / (maxVal || 1)) * 100;
                            const isExpanded = expandedMonth === month;
                            const monthlyDetails = receiptsByMonth[month] || [];

                            return (
                                <div key={month} className={`group rounded-2xl transition-all duration-300 border overflow-hidden anim-slide-up ${isExpanded ? 'bg-white dark:bg-zinc-900 border-emerald-500 shadow-lg scale-[1.02] z-10' : 'bg-surface-light dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`} style={{ animationDelay: `${400 + (i * 50)}ms` }}>
                                    <button onClick={() => toggleMonthExpand(month)} className="w-full p-5 flex flex-col gap-2 relative">
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
                                                        <span className="text-[10px] text-zinc-400 font-medium mt-0.5">{monthlyDetails.length} {monthlyDetails.length === 1 ? 'pagamento' : 'pagamentos'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-base font-black block ${isExpanded ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(val, privacyMode)}</span>
                                            </div>
                                        </div>
                                        {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800"><div style={{ width: `${percentage}%` }} className="h-full bg-emerald-500 opacity-60 rounded-r-full"></div></div>}
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="px-5 pb-5 anim-fade-in">
                                            <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 mb-4"></div>
                                            <div className="space-y-2">
                                                {monthlyDetails.sort((a: DividendReceipt, b: DividendReceipt) => b.totalReceived - a.totalReceived).map((detail: DividendReceipt, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-700 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-600">{detail.ticker.substring(0,2)}</div>
                                                            <div>
                                                                <p className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                                                    {detail.ticker}
                                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider ${detail.type === 'JCP' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-300'}`}>{detail.type || 'DIV'}</span>
                                                                </p>
                                                                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Com: <span className="text-zinc-500 dark:text-zinc-300 font-bold">{formatDateShort(detail.dateCom)}</span> • Pag: <span className="text-zinc-500 dark:text-zinc-300 font-bold">{formatDateShort(detail.paymentDate)}</span></p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-lg">{formatBRL(detail.totalReceived, privacyMode)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                     </div>
                 ) : <div className="text-center py-10 opacity-50"><p className="text-xs">Nenhum provento registrado ainda.</p></div>}
             </div>
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-6 anim-slide-up">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <PieIcon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Distribuição Visual</p>
                </div>
             </div>

             <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center gap-2 mb-2 px-2">
                     <LayoutGrid className="w-3 h-3 text-zinc-400" />
                     <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Por Classe</h3>
                 </div>
                 <div className="h-48 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={classChartData} innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                                {classChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Total</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(typeData.total, privacyMode)}</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 mt-2">
                     <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
                         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div><span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">FIIs</span></div>
                         <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(typeData.fiis.percent, privacyMode)}</span>
                     </div>
                     <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
                         <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div><span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Ações</span></div>
                         <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(typeData.stocks.percent, privacyMode)}</span>
                     </div>
                 </div>
             </div>

             {segmentsData.length > 0 && (
                <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <Layers className="w-3 h-3 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Por Segmento</h3>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={segmentsData} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                    {segmentsData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                        {segmentsData.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">{entry.name}</span>
                                        <span className="text-[9px] text-zinc-400 truncate max-w-[150px]">{entry.tickers.join(', ')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-zinc-400 font-medium">{formatBRL(entry.value, privacyMode)}</span>
                                    <span className="text-xs font-black text-zinc-900 dark:text-white min-w-[40px] text-right">{formatPercent((entry.value / typeData.total) * 100, privacyMode)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {assetsChartData.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 anim-slide-up shadow-sm" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <Gem className="w-3 h-3 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Por Ativo</h3>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={assetsChartData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                                    {assetsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                        {assetsChartData.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-zinc-400 font-medium">{formatBRL(entry.value, privacyMode)}</span>
                                    <span className="text-xs font-black text-zinc-900 dark:text-white min-w-[40px] text-right">{formatPercent((entry.value / typeData.total) * 100, privacyMode)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             )}
         </div>
      </SwipeableModal>
      
      <SwipeableModal isOpen={showRealYieldModal} onClose={() => setShowRealYieldModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-6 anim-slide-up">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                    <Scale className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Raio-X da Inflação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Histórico 12 Meses</p>
                </div>
             </div>
             <div className={`p-6 rounded-2xl mb-6 anim-slide-up bg-surface-light dark:bg-zinc-800/40 border-2 ${realYieldMetrics.realReturn >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`} style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center gap-2 mb-2">
                     <div className={`w-2 h-2 rounded-full ${verdict.bg} animate-pulse`}></div>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${verdict.color}`}>Veredito Financeiro</span>
                 </div>
                 <h3 className={`text-xl font-black mb-1.5 ${verdict.color}`}>{verdict.title}</h3>
                 <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">{verdict.desc}</p>
             </div>
             <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '200ms' }}>
                 <div className="flex items-center justify-between mb-4 px-2">
                     <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-3 h-3" /> Proventos vs IPCA</h3>
                     <div className="flex gap-3">
                         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold text-zinc-400 uppercase">Recebido</span></div>
                         <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"></div><span className="text-[9px] font-bold text-zinc-400 uppercase">Inflação</span></div>
                     </div>
                 </div>
                 <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last12MonthsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b40" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} tickFormatter={(val) => `R$${val/1000}k`} />
                            <RechartsTooltip content={<BarTooltip />} cursor={{ fill: '#71717a10', radius: 4 }} />
                            <Bar dataKey="dividends" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                            <Bar dataKey="inflation" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={8} />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
             </div>
             <div className="space-y-4 anim-slide-up" style={{ animationDelay: '300ms' }}>
                 <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Detalhamento Mensal</h3>
                 <div className="space-y-2">
                     {last12MonthsData.slice().reverse().map((item: MonthlyInflationData, i: number) => {
                         const isPositive = item.net >= 0;
                         return (
                             <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800`}><span className="text-[10px] font-black uppercase text-zinc-400">{item.month}</span></div>
                                     <div>
                                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Resultado Real</p>
                                         <p className={`text-sm font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{isPositive ? '+' : ''}{formatBRL(item.net, privacyMode)}</p>
                                     </div>
                                 </div>
                                 <div className="text-right space-y-1">
                                     <div className="flex items-center justify-end gap-2 text-[10px]"><span className="font-medium text-zinc-400">Proventos</span><span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">{formatBRL(item.dividends, privacyMode)}</span></div>
                                     <div className="flex items-center justify-end gap-2 text-[10px]"><span className="font-medium text-zinc-400">Corrosão</span><span className="font-bold text-rose-500 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">-{formatBRL(item.inflation, privacyMode)}</span></div>
                                 </div>
                             </div>
                         )
                     })}
                 </div>
             </div>
             <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-3 anim-fade-in">
                 <Info className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed"><strong>Nota Técnica:</strong> O cálculo considera a inflação mensal composta derivada do acumulado de 12 meses ({Number(inflationRate || 4.62).toFixed(2)}%) aplicada sobre o valor investido atual ({formatBRL(invested, privacyMode)}).</p>
             </div>
         </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
