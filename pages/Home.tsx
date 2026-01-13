
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2, Building2, CandlestickChart, Wallet, Calendar, Clock, Target, ArrowUpRight, ArrowDownRight, Layers, ChevronDown, ChevronUp, DollarSign, Scale, Percent, ShieldCheck, AlertOctagon, Info, Coins, Shield, BarChart3, LayoutGrid } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

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
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

// Cores vibrantes para os gráficos
const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
    '#f43f5e', // Rose
    '#84cc16', // Lime
    '#14b8a6'  // Teal
];

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

// Lógica de Avaliação do Ganho Real
const getInflationVerdict = (realReturn: number) => {
    if (realReturn >= 4) return { title: "Gerador de Riqueza", desc: "Excelente! Sua carteira está multiplicando seu poder de compra agressivamente.", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (realReturn >= 0) return { title: "Proteção Patrimonial", desc: "Bom. Você está blindado contra a inflação e ganhando poder de compra.", color: "text-sky-500", bg: "bg-sky-500" };
    if (realReturn >= -2) return { title: "Erosão Leve", desc: "Atenção. Seus dividendos quase cobrem a inflação, mas ainda há perda real.", color: "text-amber-500", bg: "bg-amber-500" };
    return { title: "Destruição de Valor", desc: "Crítico. A inflação está consumindo seu patrimônio mais rápido do que ele rende.", color: "text-rose-500", bg: "bg-rose-500" };
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate = 0, invested, balance, totalAppreciation, transactions = [], privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealYieldModal, setShowRealYieldModal] = useState(false);
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
        if (!acc.find(i => i.date === current.date && i.ticker === current.ticker && i.eventType === current.eventType)) acc.push(current);
        return acc;
    }, []);

    return { upcomingEvents: uniqueEvents, received: receivedTotal };
  }, [dividendReceipts]);

  const { history, average, maxVal, receiptsByMonth, realYieldMetrics } = useMemo(() => {
    const map: Record<string, number> = {};
    const receiptsByMonthMap: Record<string, DividendReceipt[]> = {};
    const today = new Date();
    let sum12m = 0;

    dividendReceipts.forEach(r => {
        const pDate = new Date(r.paymentDate + 'T00:00:00');
        
        // Dados para gráfico mensal (apenas pagos até hoje)
        if (r.paymentDate <= today.toISOString().split('T')[0]) {
            const key = r.paymentDate.substring(0, 7);
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsByMonthMap[key]) receiptsByMonthMap[key] = [];
            receiptsByMonthMap[key].push(r);
        }

        // Cálculo Renda 12 Meses (Trailing 12m)
        const diffMonths = (today.getFullYear() - pDate.getFullYear()) * 12 + (today.getMonth() - pDate.getMonth());
        if (diffMonths >= 0 && diffMonths <= 11) {
            sum12m += r.totalReceived;
        }
    });

    const sorted = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    const totalMonths = sorted.length || 1;
    const average = received / (totalMonths > 0 ? totalMonths : 1);
    const maxVal = Math.max(...Object.values(map), 0);

    // Métricas Renda vs IPCA
    const userDy = invested > 0 ? (sum12m / invested) * 100 : 0;
    const realReturn = userDy - (inflationRate || 0);

    // Cálculos Financeiros para o Modal Detalhado
    const inflationCost = invested * (inflationRate / 100);
    const dividendCoverage = inflationCost > 0 ? (sum12m / inflationCost) * 100 : 100;

    return { 
        history: sorted, 
        average, 
        maxVal, 
        receiptsByMonth: receiptsByMonthMap,
        realYieldMetrics: { 
            userDy, 
            realReturn, 
            sum12m, 
            inflationCost,
            dividendCoverage
        }
    };
  }, [dividendReceipts, received, invested, inflationRate]);

  const { typeData, topAssets, segmentsData, classChartData } = useMemo(() => {
      let fiisTotal = 0;
      let stocksTotal = 0;
      const segmentsMap: Record<string, number> = {};
      
      const enriched = portfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val;
          else stocksTotal += val;
          const segName = p.segment || 'Outros';
          segmentsMap[segName] = (segmentsMap[segName] || 0) + val;
          return { ...p, totalValue: val };
      });
      
      const total = fiisTotal + stocksTotal || 1;
      const segmentsData = Object.entries(segmentsMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      const sortedAssets = [...enriched].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);
      
      const classChartData = [
          { name: 'FIIs', value: fiisTotal, color: '#6366f1' }, // Indigo
          { name: 'Ações', value: stocksTotal, color: '#0ea5e9' } // Sky
      ].filter(d => d.value > 0);

      return {
          typeData: {
            fiis: { value: fiisTotal, percent: (fiisTotal / total) * 100 },
            stocks: { value: stocksTotal, percent: (stocksTotal / total) * 100 },
            total
          },
          topAssets: sortedAssets,
          segmentsData,
          classChartData
      };
  }, [portfolio]);

  const toggleMonthExpand = (monthKey: string) => {
      setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  const verdict = getInflationVerdict(realYieldMetrics.realReturn);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700">
          <p className="text-xs font-black text-zinc-900 dark:text-white mb-0.5">{payload[0].name}</p>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {formatBRL(payload[0].value, privacyMode)} ({formatPercent((payload[0].value / typeData.total) * 100)})
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 pb-8">
      {/* 1. Patrimonio Total */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-card dark:shadow-card-dark">
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Patrimônio Total</span>
                {isAiLoading && <Loader2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400 animate-spin" />}
            </div>
            
            <div className="mb-6">
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none mb-1">{formatBRL(balance, privacyMode)}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                <div>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                        <Wallet className="w-3 h-3" /> Valor Aplicado
                    </span>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(invested, privacyMode)}</p>
                </div>

                <div className="text-right">
                     <span className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                        Rentabilidade
                    </span>
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
        </div>
      </div>

      {/* 2. Agenda */}
      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-surface-light dark:bg-surface-dark p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 shadow-card dark:shadow-card-dark">
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
                    {upcomingEvents.slice(0, 4).map((event, i) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`flex-shrink-0 p-2.5 pr-3.5 rounded-xl ${style.containerClass} min-w-[120px] anim-scale-in`} style={{ animationDelay: `${200 + (i * 50)}ms` }}>
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className={`text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white`}>{event.ticker}</span>
                                    <style.icon className={`w-3 h-3 ${style.iconClass}`} />
                                </div>
                                <span className={`text-xs block ${style.valueClass}`}>
                                    {event.eventType === 'payment' ? formatBRL(event.totalReceived, privacyMode) : event.date.split('-').reverse().slice(0,2).join('/')}
                                </span>
                                <span className={`text-[9px] font-medium block mt-0.5 ${style.textClass}`}>
                                     {getDaysUntil(event.date)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Nenhum evento previsto para os próximos dias.</p>
                </div>
            )}
        </button>
      </div>
      
      {/* 3. Grid Buttons */}
      <div className="grid grid-cols-2 gap-3 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="bg-surface-light dark:bg-surface-dark p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 text-left press-effect hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full relative overflow-hidden shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-3 border border-emerald-100 dark:border-emerald-900/30">
                    <CircleDollarSign className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-0.5">Renda Passiva</span>
                <p className="text-base font-black text-zinc-900 dark:text-white tracking-tight leading-tight mb-0.5">{formatBRL(received, privacyMode)}</p>
                <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">Média: {formatBRL(average, privacyMode)}/mês</p>
            </div>
        </button>

        <button onClick={() => setShowAllocationModal(true)} className="bg-surface-light dark:bg-surface-dark p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 text-left press-effect hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full shadow-card dark:shadow-card-dark">
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

            {topAssets.length > 0 && (
                 <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
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

      {/* 4. Renda vs IPCA (Ganho Real) */}
      <div className="anim-stagger-item" style={{ animationDelay: '300ms' }}>
         <button 
            onClick={() => setShowRealYieldModal(true)}
            className="w-full bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-5 shadow-card dark:shadow-card-dark relative overflow-hidden text-left press-effect group"
         >
             {/* Background Mesh Gradient for premium feel */}
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
                 
                  {/* Tag de Status com Ícone */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${realYieldMetrics.realReturn >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30'}`}>
                     {realYieldMetrics.realReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                     {realYieldMetrics.realReturn >= 0 ? 'Positivo' : 'Negativo'}
                  </div>
             </div>

             {/* Main Values */}
             <div className="flex items-end gap-2 mb-4 relative z-10">
                  <span className={`text-3xl font-black tracking-tight ${realYieldMetrics.realReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                     {realYieldMetrics.realReturn > 0 ? '+' : ''}{formatPercent(realYieldMetrics.realReturn, privacyMode)}
                  </span>
                  <span className="text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wide">Acima da inflação</span>
             </div>

             {/* Bars Comparison */}
             <div className="space-y-3 relative z-10">
                 {/* User Bar */}
                 <div>
                     <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                         <span>Sua Carteira (DY)</span>
                         <span className="text-zinc-900 dark:text-white">{formatPercent(realYieldMetrics.userDy, privacyMode)}</span>
                     </div>
                     <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((realYieldMetrics.userDy / 15) * 100, 100)}%` }}></div>
                     </div>
                 </div>

                 {/* IPCA Bar */}
                  <div>
                     <div className="flex justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                         <span>IPCA (Inflação)</span>
                         <span className="text-zinc-900 dark:text-white">{formatPercent(inflationRate, privacyMode)}</span>
                     </div>
                     <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <div className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min((inflationRate / 15) * 100, 100)}%` }}></div>
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

      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6 px-2">Agenda Completa</h2>
            <div className="space-y-3">
                {upcomingEvents.map((e, i) => {
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
                                <p className="text-sm font-black text-zinc-900 dark:text-white">{e.date.split('-').reverse().join('/')}</p>
                                {e.eventType === 'payment' && <p className={`text-xs ${style.valueClass}`}>{formatBRL(e.totalReceived, privacyMode)}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL DETALHADO DE INFLAÇÃO VS RENDA (SEM IA, APENAS LÓGICA FINANCEIRA) */}
      <SwipeableModal isOpen={showRealYieldModal} onClose={() => setShowRealYieldModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-6 anim-slide-up">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                    <Scale className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Raio-X da Inflação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Análise de Poder de Compra</p>
                </div>
             </div>

             {/* VEREDITO */}
             <div className={`p-6 rounded-[2rem] mb-6 anim-slide-up bg-surface-light dark:bg-zinc-800/40 border-2 ${realYieldMetrics.realReturn >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`} style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center gap-2 mb-2">
                     <div className={`w-2 h-2 rounded-full ${verdict.bg} animate-pulse`}></div>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${verdict.color}`}>Veredito Financeiro</span>
                 </div>
                 <h3 className={`text-xl font-black mb-1.5 ${verdict.color}`}>{verdict.title}</h3>
                 <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                     {verdict.desc}
                 </p>
             </div>

             <div className="space-y-4">
                 
                 {/* CARTÃO: O CUSTO INVISÍVEL */}
                 <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <div className="flex items-start gap-3">
                         <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center shrink-0">
                             <TrendingDown className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                             <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-1">O Custo Invisível</h4>
                             <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                                 Para manter o mesmo poder de compra de um ano atrás, seu patrimônio precisaria ter crescido este valor apenas para "empatar" com o IPCA.
                             </p>
                             <div className="p-3 bg-white dark:bg-black rounded-xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Perda Nominal</span>
                                 <span className="text-sm font-black text-rose-500">-{formatBRL(realYieldMetrics.inflationCost, privacyMode)}</span>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* CARTÃO: ESCUDO DE DIVIDENDOS */}
                 <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[1.5rem] p-5 border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '300ms' }}>
                     <div className="flex items-start gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center shrink-0">
                             <ShieldCheck className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                             <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-1">Escudo de Dividendos</h4>
                             <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                                 Quanto da inflação foi "paga" apenas com a renda passiva recebida, sem precisar vender ativos.
                             </p>
                             
                             <div className="mb-2 flex justify-between items-end">
                                 <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cobertura</span>
                                 <span className={`text-lg font-black ${realYieldMetrics.dividendCoverage >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                     {Math.min(realYieldMetrics.dividendCoverage, 999).toFixed(0)}%
                                 </span>
                             </div>
                             
                             {/* Progress Bar Visual */}
                             <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                                 <div 
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${realYieldMetrics.dividendCoverage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${Math.min(realYieldMetrics.dividendCoverage, 100)}%` }}
                                 ></div>
                                 {/* Marcador de 100% */}
                                 <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 z-10"></div>
                             </div>
                             <p className="text-[9px] text-zinc-400 mt-2 text-right">
                                 {realYieldMetrics.dividendCoverage >= 100 ? 'Sua renda superou a inflação.' : `Faltaram ${formatBRL(realYieldMetrics.inflationCost - realYieldMetrics.sum12m, privacyMode)} para cobrir a inflação.`}
                             </p>
                         </div>
                     </div>
                 </div>

                 {/* CARTÃO: DY REAL */}
                 <div className="bg-zinc-900 dark:bg-black rounded-[1.5rem] p-5 border border-zinc-800 anim-slide-up text-white" style={{ animationDelay: '400ms' }}>
                     <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                                 <Coins className="w-5 h-5 text-zinc-400" />
                             </div>
                             <div>
                                 <h4 className="text-sm font-black text-white">Yield Real</h4>
                                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Descontando IPCA</p>
                             </div>
                         </div>
                         <div className={`px-2 py-1 rounded-lg text-xs font-black ${realYieldMetrics.realReturn >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                             {realYieldMetrics.realReturn > 0 ? '+' : ''}{formatPercent(realYieldMetrics.realReturn)}
                         </div>
                     </div>
                     <div className="grid grid-cols-3 gap-2 text-center divide-x divide-zinc-800">
                         <div>
                             <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Nominal</p>
                             <p className="text-xs font-bold text-zinc-300">{formatPercent(realYieldMetrics.userDy)}</p>
                         </div>
                         <div>
                             <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">IPCA 12m</p>
                             <p className="text-xs font-bold text-rose-400">-{formatPercent(inflationRate)}</p>
                         </div>
                         <div>
                             <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Real</p>
                             <p className={`text-xs font-black ${realYieldMetrics.realReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {formatPercent(realYieldMetrics.realReturn)}
                             </p>
                         </div>
                     </div>
                 </div>

             </div>

             <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-3 anim-fade-in">
                 <Info className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                     <strong>Nota Técnica:</strong> O cálculo considera o IPCA acumulado de 12 meses ({inflationRate}%) sobre o valor total investido ({formatBRL(invested, privacyMode)}), comparando com o total de proventos recebidos no mesmo período ({formatBRL(realYieldMetrics.sum12m, privacyMode)}).
                 </p>
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
                 <div className="bg-emerald-500 p-5 rounded-[1.5rem] text-white shadow-lg shadow-emerald-500/20">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Recebido</p>
                     <p className="text-2xl font-black">{formatBRL(received, privacyMode)}</p>
                 </div>
                 <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-700">
                     <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Média Mensal</p>
                     <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(average, privacyMode)}</p>
                 </div>
             </div>

             <div className="space-y-4">
                 <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-2 anim-slide-up" style={{ animationDelay: '300ms' }}>Evolução Mensal</h3>
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
                                    className={`group rounded-[1.5rem] transition-all duration-300 border overflow-hidden anim-slide-up ${isExpanded ? 'bg-white dark:bg-zinc-900 border-emerald-500 shadow-lg scale-[1.02] z-10' : 'bg-surface-light dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                    style={{ animationDelay: `${400 + (i * 50)}ms` }}
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
                                                <span className={`text-base font-black block ${isExpanded ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{formatBRL(val, privacyMode)}</span>
                                            </div>
                                        </div>
                                        
                                        {!isExpanded && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800">
                                                <div style={{ width: `${percentage}%` }} className="h-full bg-emerald-500 opacity-60 rounded-r-full"></div>
                                            </div>
                                        )}
                                    </button>
                                    
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
                                                            {formatBRL(detail.totalReceived, privacyMode)}
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

      {/* NOVO MODAL DE ALOCAÇÃO REFORMULADO (Donut Charts & Clean Lists) */}
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

             {/* GRÁFICO 1: CLASSES DE ATIVOS (DONUT) */}
             <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center gap-2 mb-2 px-2">
                     <LayoutGrid className="w-3 h-3 text-zinc-400" />
                     <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Por Classe
                     </h3>
                 </div>
                 
                 <div className="h-48 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={classChartData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                            >
                                {classChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text (Total) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Total</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(typeData.total, privacyMode)}</span>
                    </div>
                 </div>

                 {/* Legend / List for Classes */}
                 <div className="grid grid-cols-2 gap-3 mt-2">
                     <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                             <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">FIIs</span>
                         </div>
                         <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(typeData.fiis.percent, privacyMode)}</span>
                     </div>
                     <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
                             <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Ações</span>
                         </div>
                         <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(typeData.stocks.percent, privacyMode)}</span>
                     </div>
                 </div>
             </div>

             {/* GRÁFICO 2: SETORES (PIE CHART) */}
             {segmentsData.length > 0 && (
                <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <Layers className="w-3 h-3 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                            Por Segmento
                        </h3>
                    </div>
                    
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={segmentsData}
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {segmentsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Detailed List for Segments */}
                    <div className="space-y-2 mt-2">
                        {segmentsData.map((entry, index) => (
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

             {/* TOP ASSETS LIST */}
             <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] p-5 border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-rose-400" />
                    <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Maiores Posições</h4>
                </div>

                <div className="space-y-3">
                    {topAssets.map((asset, idx) => (
                         <div key={asset.ticker} className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <span className="w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                                     {idx + 1}
                                 </span>
                                 <div className="flex flex-col">
                                     <span className="text-xs font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                                     <span className="text-[9px] text-zinc-400">{asset.segment}</span>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-xs font-bold text-zinc-900 dark:text-white">{formatPercent((asset.totalValue / typeData.total) * 100, privacyMode)}</p>
                                 <p className="text-[9px] text-zinc-400">{formatBRL(asset.totalValue, privacyMode)}</p>
                             </div>
                         </div>
                    ))}
                </div>
            </div>
         </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
