
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2, Wallet, Calendar, Clock, ArrowUpRight, ArrowDownRight, LayoutGrid, Gem, CalendarClock, ChevronDown, X, Receipt, Scale, Info, Coins, BarChart3, ChevronUp, Layers, CheckCircle2, HelpCircle } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Sector } from 'recharts';

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

// Paleta de cores profissional para gráficos
const CHART_COLORS = [
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#6366f1', // Indigo 500
    '#f43f5e', // Rose 500
    '#84cc16', // Lime 500
    '#14b8a6', // Teal 500
    '#a855f7', // Purple 500
    '#ef4444'  // Red 500
];

const getEventStyle = (eventType: 'payment' | 'datacom', dateStr: string, isJCP = false) => {
    const isToday = new Date(dateStr + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    
    if (eventType === 'datacom') {
        return { 
            containerClass: 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-l-amber-400',
            iconClass: 'text-amber-500',
            textClass: 'text-amber-700 dark:text-amber-300',
            valueClass: 'text-amber-800 dark:text-amber-200 font-medium',
            icon: CalendarDays,
            label: isToday ? 'Data Com Hoje' : 'Data Com'
        };
    }
    
    // Pagamento
    if (isJCP) {
        return {
            containerClass: 'bg-orange-50 dark:bg-orange-950/20 border-l-2 border-l-orange-500',
            iconClass: 'text-orange-500',
            textClass: 'text-orange-700 dark:text-orange-300',
            valueClass: 'text-orange-800 dark:text-orange-200 font-bold',
            icon: Coins,
            label: isToday ? 'Cai Hoje' : 'JCP'
        };
    }

    return {
        containerClass: 'bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500',
        iconClass: 'text-emerald-500',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        valueClass: 'text-emerald-800 dark:text-emerald-200 font-bold',
        icon: Banknote,
        label: isToday ? 'Cai Hoje' : 'Div.'
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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-md filter"
        cornerRadius={4}
      />
    </g>
  );
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealYieldModal, setShowRealYieldModal] = useState(false);
  const [showPatrimonyHelp, setShowPatrimonyHelp] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  // Estado para controlar a aba ativa no modal de alocação
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET'>('CLASS');
  
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  const [activeIndexAsset, setActiveIndexAsset] = useState<number | undefined>(undefined);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  
  const safeInflation = Number(inflationRate) || 4.62;

  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  const { upcomingEvents, received, groupedEvents } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allEvents: any[] = [];
    let receivedTotal = 0;
    
    // Filtro inicial e cálculo de recebidos
    dividendReceipts.forEach(r => {
        if (r.paymentDate <= todayStr) receivedTotal += r.totalReceived;
        
        // Pagamento Futuro ou Hoje
        if (r.paymentDate >= todayStr) {
            allEvents.push({ ...r, eventType: 'payment', date: r.paymentDate });
        }
        // Data Com Futura ou Hoje
        if (r.dateCom >= todayStr) {
            allEvents.push({ ...r, eventType: 'datacom', date: r.dateCom });
        }
    });
    
    // Deduplicação e Ordenação
    const uniqueEvents = allEvents.sort((a, b) => a.date.localeCompare(b.date)).reduce((acc: any[], current) => {
        if (!acc.find((i: any) => i.date === current.date && i.ticker === current.ticker && i.eventType === current.eventType)) acc.push(current);
        return acc;
    }, []);

    // Agrupamento para o Modal Agenda (Nova Lógica)
    const grouped: Record<string, any[]> = {
        'Hoje': [],
        'Amanhã': [],
        'Esta Semana': [],
        'Futuro': []
    };

    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const nextWeekDate = new Date(todayDate);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);

    uniqueEvents.forEach((ev: any) => {
        const evDate = new Date(ev.date + 'T00:00:00');
        if (evDate.getTime() === todayDate.getTime()) {
            grouped['Hoje'].push(ev);
        } else if (evDate.getTime() === tomorrowDate.getTime()) {
            grouped['Amanhã'].push(ev);
        } else if (evDate <= nextWeekDate) {
            grouped['Esta Semana'].push(ev);
        } else {
            grouped['Futuro'].push(ev);
        }
    });

    return { upcomingEvents: uniqueEvents, received: receivedTotal, groupedEvents: grouped };
  }, [dividendReceipts]);

  const { history, average, maxVal, receiptsByMonth, realYieldMetrics, last12MonthsData, provisionedMap, provisionedTotal, sortedProvisionedMonths, dividendsChartData } = useMemo(() => {
    const map: Record<string, number> = {};
    const receiptsByMonthMap: Record<string, DividendReceipt[]> = {};
    const provMap: Record<string, DividendReceipt[]> = {};
    let provTotal = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    
    dividendReceipts.forEach(r => {
        if (!r.paymentDate || r.paymentDate.length < 7) return;
        const key = r.paymentDate.substring(0, 7);

        if (r.paymentDate <= todayStr) {
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsByMonthMap[key]) receiptsByMonthMap[key] = [];
            receiptsByMonthMap[key].push(r);
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

    // Lógica para inflação e retorno real (Manteve-se similar, mas otimizada)
    const investedByMonth: Record<string, number> = {};
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    if (sortedTxs.length > 0) {
        const startYear = parseInt(sortedTxs[0].date.substring(0,4));
        const startMonth = parseInt(sortedTxs[0].date.substring(5,7)) - 1;
        const endDate = new Date();
        
        let currentInvested = 0;
        let txIndex = 0;
        
        const cursorDate = new Date(startYear, startMonth, 1);
        
        while (cursorDate <= endDate) {
            const cursorKey = cursorDate.toISOString().substring(0, 7);
            const endOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0).toISOString().split('T')[0];
            
            while(txIndex < sortedTxs.length && sortedTxs[txIndex].date <= endOfMonth) {
                const t = sortedTxs[txIndex];
                if (t.type === 'BUY') currentInvested += (t.price * t.quantity);
                else currentInvested -= (t.price * t.quantity);
                txIndex++;
            }
            
            investedByMonth[cursorKey] = Math.max(0, currentInvested);
            cursorDate.setMonth(cursorDate.getMonth() + 1);
        }
    }

    const last12MonthsData: MonthlyInflationData[] = [];
    const monthlyInflationRate = Math.pow(1 + (safeInflation) / 100, 1 / 12) - 1;
    
    let accumulatedInflationCost = 0;
    let sum12mDividends = 0;

    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toISOString().substring(0, 7);
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        
        const dividends = receiptsByMonthMap[key]?.reduce((acc, r) => acc + r.totalReceived, 0) || 0;
        const investedAtThatTime = investedByMonth[key] || 0;
        const monthInflationCost = investedAtThatTime > 0 ? investedAtThatTime * monthlyInflationRate : 0;
        
        last12MonthsData.push({
            month: monthLabel,
            fullDate: key,
            dividends: dividends,
            inflation: monthInflationCost,
            net: dividends - monthInflationCost
        });

        accumulatedInflationCost += monthInflationCost;
        sum12mDividends += dividends;
    }

    const baseValue = invested > 0 ? invested : balance;
    const userDy = baseValue > 0 ? (sum12mDividends / baseValue) * 100 : 0;
    const effectiveInflationImpact = baseValue > 0 ? (accumulatedInflationCost / baseValue) * 100 : 0;
    const realReturn = userDy - effectiveInflationImpact;
    
    return { 
        history: sortedHistory, 
        average, 
        maxVal, 
        receiptsByMonth: receiptsByMonthMap,
        realYieldMetrics: { 
            userDy, 
            realReturn, 
            sum12m: sum12mDividends, 
            inflationCost: accumulatedInflationCost, 
            baseValue 
        },
        last12MonthsData,
        provisionedMap: provMap, 
        provisionedTotal: provTotal,
        sortedProvisionedMonths,
        dividendsChartData
    };
  }, [dividendReceipts, received, invested, balance, safeInflation, transactions]);

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
      // Pega todos os ativos para o gráfico, agrupando apenas se for muito pequeno (< 1%) para limpar visual
      // Mas para a lista vamos mostrar todos.
      
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

  const toggleMonthExpand = (monthKey: string) => setExpandedMonth(expandedMonth === monthKey ? null : monthKey);

  // Custom Tooltips
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

  const NetBarTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const val = payload[0].value;
          const isPos = val >= 0;
          return (
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 z-50">
                  <p className="text-xs font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-wider">{label}</p>
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Saldo Real:</span>
                      <span className={`text-xs font-black ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatBRL(val, privacyMode)}
                      </span>
                  </div>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Patrimonio Total - Redesenhado */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full p-6 rounded-[2rem] relative overflow-hidden shadow-lg shadow-zinc-200/50 dark:shadow-black/50 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-black border border-white/5">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Wallet className="w-3 h-3 text-zinc-500" />
                    Patrimônio Total
                </span>
                <button onClick={(e) => { e.stopPropagation(); setShowPatrimonyHelp(true); }} className="text-zinc-500 hover:text-white transition-colors">
                    <Info className="w-4 h-4" />
                </button>
            </div>
            
            <div className="mb-6 relative z-10">
                <h2 className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                    {formatBRL(balance, privacyMode)}
                </h2>
            </div>
            
            {/* Grid de Stats Clean */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Resultado
                    </p>
                    <div className="flex flex-col">
                        <span className={`text-sm font-black ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfitPositive ? '+' : ''}{formatBRL(totalProfitValue, privacyMode)}
                        </span>
                        <span className={`text-[10px] font-bold ${isProfitPositive ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                            {formatPercent(totalProfitPercent, privacyMode)}
                        </span>
                    </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Coins className="w-3 h-3" /> Proventos
                    </p>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-white">
                            {formatBRL(totalDividendsReceived, privacyMode)}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500">
                             Acumulado
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. Agenda Simplificada */}
      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 press-effect group hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-700">
                        <CalendarDays className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Agenda</h3>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                            {upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos` : 'Sem eventos'}
                        </p>
                    </div>
                </div>
                {upcomingEvents.length > 0 && (
                    <div className="flex -space-x-2">
                         {upcomingEvents.slice(0,3).map((ev: any, i: number) => (
                             <div key={i} className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-black text-zinc-600 dark:text-zinc-400">
                                 {ev.ticker.substring(0,1)}
                             </div>
                         ))}
                         {upcomingEvents.length > 3 && (
                             <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-black text-zinc-500">
                                 +{upcomingEvents.length - 3}
                             </div>
                         )}
                    </div>
                )}
            </div>
        </button>
      </div>
      
      {/* 3. Grid Buttons */}
      <div className="grid grid-cols-2 gap-3 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left press-effect hover:border-zinc-200 dark:hover:border-zinc-700 flex flex-col justify-between h-full shadow-sm">
            <div className="mb-4">
                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-3">
                    <CircleDollarSign className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Renda Passiva</span>
                <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-tight">{formatBRL(received, privacyMode)}</p>
            </div>
            {provisionedTotal > 0 && (
                <div className="py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 self-start">
                    <p className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide">
                        + {formatBRL(provisionedTotal, privacyMode)} Futuro
                    </p>
                </div>
            )}
        </button>

        <button onClick={() => setShowAllocationModal(true)} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left press-effect hover:border-zinc-200 dark:hover:border-zinc-700 flex flex-col justify-between h-full shadow-sm">
            <div>
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-3">
                    <PieIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Alocação</span>
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mt-2 mb-2">
                    <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-500 transition-all duration-1000"></div>
                    <div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 transition-all duration-1000"></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span>
                    <span className="text-sky-600 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span>
                </div>
            </div>
        </button>
      </div>

      {/* 4. Raio-X Inflação */}
      <div className="anim-stagger-item" style={{ animationDelay: '300ms' }}>
         <button onClick={() => setShowRealYieldModal(true)} className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm relative overflow-hidden text-left press-effect group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50"></div>
             
             <div className="flex items-center justify-between mb-4 relative z-10">
                 <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-100 dark:border-zinc-700">
                          <Scale className="w-4 h-4" />
                     </div>
                     <div>
                         <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-none">Ganho Real</h3>
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Rentabilidade vs IPCA</p>
                     </div>
                 </div>
             </div>
             
             {realYieldMetrics.baseValue > 0 ? (
                 <>
                     <div className="flex items-end gap-2 mb-4 relative z-10">
                          <span className={`text-3xl font-black tracking-tight ${realYieldMetrics.realReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                             {realYieldMetrics.realReturn > 0 ? '+' : ''}{formatPercent(realYieldMetrics.realReturn, privacyMode)}
                          </span>
                          <span className="text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Acima da inflação</span>
                     </div>
                 </>
             ) : (
                 <div className="flex flex-col items-center justify-center py-2 opacity-60 text-center">
                     <p className="text-xs font-bold text-zinc-500">Adicione ativos para análise.</p>
                 </div>
             )}
         </button>
      </div>

      {/* --- MODAIS --- */}

      <SwipeableModal isOpen={showPatrimonyHelp} onClose={() => setShowPatrimonyHelp(false)}>
          <div className="p-6 pb-20">
              <h2 className="text-2xl font-black mb-4">Sobre os Valores</h2>
              <p className="text-sm text-zinc-500 mb-2">O patrimônio total é a soma do valor de mercado de todos os seus ativos.</p>
              <p className="text-sm text-zinc-500">O resultado geral considera proventos, valorização da cota e lucro realizado em vendas.</p>
          </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 px-2">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                    <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                    <p className="text-xs text-zinc-500 font-medium">Próximos Eventos e Pagamentos</p>
                </div>
            </div>

            {Object.keys(groupedEvents).map((groupKey) => {
                const events = groupedEvents[groupKey];
                if (events.length === 0) return null;

                return (
                    <div key={groupKey} className="mb-6 anim-slide-up">
                        <h3 className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm py-2 z-10">
                            {groupKey}
                        </h3>
                        <div className="space-y-2">
                            {events.map((e: any, i: number) => {
                                const style = getEventStyle(e.eventType, e.date, e.type === 'JCP');
                                return (
                                    <div key={i} className={`p-4 rounded-xl flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 ${style.containerClass}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-800 shadow-sm ${style.iconClass}`}>
                                                <style.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase">{e.ticker}</h4>
                                                    {e.type === 'JCP' && <span className="text-[8px] font-bold px-1 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">JCP</span>}
                                                </div>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${style.textClass}`}>{style.label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {e.eventType === 'payment' ? (
                                                <>
                                                    <span className={`block text-xs font-black ${style.valueClass}`}>{formatBRL(e.totalReceived, privacyMode)}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">{formatDateShort(e.date)}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="block text-xs font-black text-zinc-900 dark:text-white">{formatDateShort(e.date)}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 block mt-0.5">Data de Corte</span>
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
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => { setShowProventosModal(false); setSelectedProventosMonth(null); }}>
         <div className="p-6 pb-20">
             <div className="flex items-center justify-between mb-8 anim-slide-up">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <Wallet className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2>
                        <p className="text-xs text-zinc-500 font-medium">Histórico e Previsão</p>
                    </div>
                 </div>
                 {selectedProventosMonth && (
                     <button onClick={() => setSelectedProventosMonth(null)} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-2 anim-scale-in hover:bg-zinc-200 transition-colors">
                         <X className="w-3 h-3" /> Limpar
                     </button>
                 )}
             </div>

             {/* Gráfico Interativo - Estilo Clean */}
             {dividendsChartData.length > 0 && (
                 <div className="mb-8 anim-graph-grow">
                     <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={dividendsChartData} 
                                margin={{ top: 10, right: 0, left: -24, bottom: 0 }}
                                onClick={(data) => {
                                    if (data && data.activePayload && data.activePayload.length > 0) {
                                        const clickedMonth = data.activePayload[0].payload.fullDate;
                                        setSelectedProventosMonth(clickedMonth === selectedProventosMonth ? null : clickedMonth);
                                    }
                                }}
                            >
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} 
                                    dy={10} 
                                    interval={0}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 9, fill: '#a1a1aa' }} 
                                    tickFormatter={(val) => `${val/1000}k`} 
                                />
                                <RechartsTooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 z-50">
                                                    <p className="text-xs font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-wider">{label}</p>
                                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(payload[0].value, privacyMode)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} 
                                    cursor={{ fill: '#71717a10', radius: 8 }} 
                                />
                                <Bar 
                                    dataKey="value" 
                                    radius={[4, 4, 4, 4]} 
                                    isAnimationActive={true}
                                    animationDuration={1500}
                                    animationBegin={200}
                                    animationEasing="ease-out"
                                >
                                    {dividendsChartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.fullDate === selectedProventosMonth ? '#10b981' : '#e4e4e7'} 
                                            className="cursor-pointer transition-all duration-300 hover:opacity-80"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                 </div>
             )}

             {/* Lista Detalhada - Estilo Clean (Sem bordas pesadas) */}
             {selectedProventosMonth ? (
                 <div className="anim-slide-up">
                     <div className="flex items-center justify-between mb-4 px-1">
                         <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                             <Calendar className="w-4 h-4" /> {new Date(selectedProventosMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                         </h3>
                         <span className="text-sm font-black text-zinc-900 dark:text-white">
                             {formatBRL(history.find(([key]) => key === selectedProventosMonth)?.[1], privacyMode)}
                         </span>
                     </div>
                     
                     <div className="space-y-1">
                        {(receiptsByMonth[selectedProventosMonth] || [])
                            .sort((a, b) => b.totalReceived - a.totalReceived)
                            .map((detail, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors anim-stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 dark:text-zinc-400">
                                        {detail.ticker.substring(0,2)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                            {detail.ticker}
                                            <span className={`text-[8px] px-1 rounded font-bold uppercase ${detail.type === 'JCP' ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                                                {detail.type || 'DIV'}
                                            </span>
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-medium">
                                            {formatDateShort(detail.paymentDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-black text-emerald-600 dark:text-emerald-400">{formatBRL(detail.totalReceived, privacyMode)}</span>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             ) : (
                 // Histórico Completo - Estilo Acordeão Clean
                 <div className="space-y-4">
                     {sortedProvisionedMonths.length > 0 && (
                         <div className="mb-6 anim-slide-up">
                             <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 mb-2 flex items-center gap-2">
                                 <CalendarClock className="w-3 h-3" /> Provisionados
                             </h3>
                             <div className="space-y-2">
                                {sortedProvisionedMonths.map((month: string) => {
                                    const [year, m] = month.split('-');
                                    const monthName = new Date(parseInt(year), parseInt(m)-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                    const monthTotal = provisionedMap[month].reduce((acc: number, r: DividendReceipt) => acc + r.totalReceived, 0);

                                    return (
                                        <div key={month} className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl overflow-hidden">
                                             <div className="p-3 flex justify-between items-center">
                                                 <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">{monthName}</span>
                                                 <span className="text-xs font-black text-amber-700 dark:text-amber-400">{formatBRL(monthTotal, privacyMode)}</span>
                                             </div>
                                        </div>
                                    )
                                })}
                             </div>
                         </div>
                     )}

                     <div className="space-y-1">
                         <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 mb-2 anim-slide-up" style={{ animationDelay: '300ms' }}>Histórico</h3>
                         {history.length > 0 ? (
                             <div className="space-y-1">
                                {history.map(([month, val]: [string, number], i: number) => {
                                    const [year, m] = month.split('-');
                                    const dateObj = new Date(parseInt(year), parseInt(m)-1, 1);
                                    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                    const isExpanded = expandedMonth === month;
                                    const monthlyDetails = receiptsByMonth[month] || [];

                                    return (
                                        <div key={month} className={`rounded-2xl transition-all duration-300 overflow-hidden anim-slide-up ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-800 my-2' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`} style={{ animationDelay: `${400 + (i * 30)}ms` }}>
                                            <button onClick={() => toggleMonthExpand(month)} className="w-full p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                                        <Receipt className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-bold capitalize text-zinc-700 dark:text-zinc-200">{monthName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-sm font-black ${isExpanded ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(val, privacyMode)}</span>
                                                    <ChevronDown className={`w-4 h-4 text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            
                                            {isExpanded && (
                                                <div className="px-3 pb-3 anim-fade-in">
                                                    <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700 mb-3 opacity-50"></div>
                                                    <div className="space-y-1">
                                                        {monthlyDetails.sort((a: DividendReceipt, b: DividendReceipt) => b.totalReceived - a.totalReceived).map((detail: DividendReceipt, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-700/50 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-zinc-900 dark:text-white w-12">{detail.ticker}</span>
                                                                    <span className="text-[10px] text-zinc-400">{formatDateShort(detail.paymentDate)}</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(detail.totalReceived, privacyMode)}</span>
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
             )}
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-6 anim-slide-up shrink-0">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                    <PieIcon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Diversificação da Carteira</p>
                </div>
             </div>

             {/* Seletor de Tipo Moderno */}
             <div className="bg-white dark:bg-zinc-900 p-1 rounded-xl flex gap-1 mb-6 shadow-sm border border-zinc-100 dark:border-zinc-800 anim-slide-up shrink-0" style={{ animationDelay: '50ms' }}>
                 <button 
                    onClick={() => setAllocationTab('CLASS')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${allocationTab === 'CLASS' ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                 >
                    Por Classe
                 </button>
                 <button 
                    onClick={() => setAllocationTab('ASSET')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${allocationTab === 'ASSET' ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                 >
                    Por Ativo
                 </button>
             </div>

             <div className="anim-slide-up px-1" style={{ animationDelay: '100ms' }}>
                 {/* Conteúdo Dinâmico Baseado na Aba */}
                 {allocationTab === 'CLASS' ? (
                     <div className="space-y-6">
                         {/* Gráfico de Classes */}
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm relative overflow-visible border border-zinc-100 dark:border-zinc-800">
                            <div className="h-56 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={classChartData} 
                                            innerRadius={55} 
                                            outerRadius={80} 
                                            paddingAngle={4}
                                            cornerRadius={6}
                                            dataKey="value" 
                                            stroke="none"
                                            isAnimationActive={true}
                                            animationDuration={1400}
                                            animationEasing="ease-out"
                                            activeIndex={activeIndexClass}
                                            activeShape={renderActiveShape}
                                            onMouseEnter={(_, index) => setActiveIndexClass(index)}
                                            onTouchStart={(_, index) => setActiveIndexClass(index)}
                                            onMouseLeave={() => setActiveIndexClass(undefined)}
                                        >
                                            {classChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Texto Central Dinâmico */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none anim-fade-in">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                        {activeIndexClass !== undefined ? classChartData[activeIndexClass].name : 'Total'}
                                    </span>
                                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                        {activeIndexClass !== undefined 
                                            ? formatPercent(classChartData[activeIndexClass].percent, privacyMode)
                                            : formatBRL(typeData.total, privacyMode)
                                        }
                                    </span>
                                </div>
                            </div>
                         </div>

                         {/* Lista Detalhada de Classes - Visual Barras */}
                         <div className="space-y-3">
                             {classChartData.map((item, index) => (
                                 <button 
                                    key={index} 
                                    onClick={() => setActiveIndexClass(index === activeIndexClass ? undefined : index)}
                                    className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 group hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
                                 >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: item.color }}>
                                        {Math.round(item.percent)}%
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</span>
                                            <span className="text-xs font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                        </div>
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                                        </div>
                                    </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 ) : (
                     <div className="space-y-6">
                         {/* Lista Detalhada de Ativos - Visual Clean */}
                         {assetsChartData.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 pb-6">
                                {assetsChartData.map((asset, index) => (
                                    <button 
                                        key={index}
                                        onClick={() => setActiveIndexAsset(index === activeIndexAsset ? undefined : index)}
                                        className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 anim-stagger-item hover:scale-[1.01] transition-transform"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border border-zinc-100 dark:border-zinc-800" style={{ color: asset.color, backgroundColor: `${asset.color}15` }}>
                                            {asset.name.substring(0,2)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{asset.name}</span>
                                                <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(asset.percent, privacyMode)}</span>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                                                <div className="h-full rounded-full opacity-80" style={{ width: `${asset.percent}%`, backgroundColor: asset.color }}></div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Gem className="w-12 h-12 text-zinc-300 mb-4" strokeWidth={1} />
                                <p className="text-xs font-bold text-zinc-500">Nenhum ativo na carteira</p>
                            </div>
                         )}
                     </div>
                 )}
             </div>
         </div>
      </SwipeableModal>
      
      {/* Raio-X Modal */}
      <SwipeableModal isOpen={showRealYieldModal} onClose={() => setShowRealYieldModal(false)}>
          <div className="p-6 pb-20">
              <div className="flex items-center gap-4 mb-8 anim-slide-up">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                      <Scale className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Raio-X</h2>
                      <p className="text-xs text-zinc-500 font-medium">Rentabilidade Real</p>
                  </div>
              </div>

              {realYieldMetrics.baseValue > 0 ? (
                  <div className="space-y-8">
                      {/* Hero Percentage */}
                      <div className="text-center anim-scale-in">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Ganho Real (12 Meses)</p>
                          <div className={`text-6xl font-black tracking-tighter ${realYieldMetrics.realReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {realYieldMetrics.realReturn > 0 ? '+' : ''}{formatPercent(realYieldMetrics.realReturn, privacyMode)}
                          </div>
                          <p className="text-xs font-medium text-zinc-500 mt-2">
                              {realYieldMetrics.realReturn >= 0 
                                  ? 'Seu patrimônio cresceu acima da inflação.' 
                                  : 'A inflação superou seus rendimentos.'}
                          </p>
                      </div>

                      {/* Comparison Bars */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{animationDelay: '100ms'}}>
                          <div className="space-y-4">
                              <div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1.5">
                                      <span className="text-zinc-500">Rendimento Nominal</span>
                                      <span className="text-zinc-900 dark:text-white">{formatPercent(realYieldMetrics.userDy, privacyMode)}</span>
                                  </div>
                                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{width: '100%'}}></div>
                                  </div>
                              </div>
                              
                              <div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1.5">
                                      <span className="text-zinc-500">Inflação (IPCA)</span>
                                      <span className="text-rose-500">{formatPercent(Number(inflationRate || 4.62), privacyMode)}</span>
                                  </div>
                                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                      <div 
                                          className="h-full bg-rose-500 rounded-full" 
                                          style={{width: `${Math.min((Number(inflationRate || 4.62) / (realYieldMetrics.userDy || 1)) * 100, 100)}%`}}
                                      ></div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Monetary Cards */}
                      <div className="grid grid-cols-2 gap-3 anim-slide-up" style={{animationDelay: '200ms'}}>
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                              <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">Recebido (Bruto)</p>
                              <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(realYieldMetrics.sum12m, privacyMode)}</p>
                          </div>
                          <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                              <p className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 mb-1">Perda Inflacionária</p>
                              <p className="text-lg font-black text-zinc-900 dark:text-white">-{formatBRL(realYieldMetrics.inflationCost, privacyMode)}</p>
                          </div>
                          <div className="col-span-2 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex justify-between items-center">
                              <div>
                                  <p className="text-[9px] font-black uppercase text-zinc-400">Ganho Real Líquido</p>
                                  <p className="text-[10px] text-zinc-500">O que sobrou no bolso</p>
                              </div>
                              <p className={`text-2xl font-black ${realYieldMetrics.sum12m - realYieldMetrics.inflationCost >= 0 ? 'text-indigo-500' : 'text-amber-500'}`}>
                                  {formatBRL(realYieldMetrics.sum12m - realYieldMetrics.inflationCost, privacyMode)}
                              </p>
                          </div>
                      </div>

                      {/* Monthly Chart (Net) */}
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{animationDelay: '300ms'}}>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 text-center">Evolução Mensal (Líquida)</h3>
                          <div className="h-32 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={last12MonthsData.slice().reverse()}>
                                      <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                                      <RechartsTooltip content={<NetBarTooltip />} cursor={{fill: 'transparent'}} />
                                      <Bar dataKey="net" radius={[2, 2, 2, 2]}>
                                          {last12MonthsData.slice().reverse().map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#f43f5e'} />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                      <Scale className="w-12 h-12 mb-4 text-zinc-300" strokeWidth={1} />
                      <p className="text-xs font-bold text-zinc-500">Adicione ativos para calcular.</p>
                  </div>
              )}
          </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
