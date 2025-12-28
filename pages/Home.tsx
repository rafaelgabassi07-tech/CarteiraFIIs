
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, ArrowUpRight, ArrowDownRight, LayoutGrid, ShieldCheck, AlertTriangle, Banknote, Award, Percent, TrendingUp, Calendar, Trophy, Clock, CalendarDays, Coins, ArrowRight, Minus, Equal, ExternalLink, TrendingDown, Plus, ChevronsRight, ListFilter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, BarChart, Bar, XAxis, Tooltip, CartesianGrid, YAxis, Legend } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain?: number;
  totalDividendsReceived?: number;
  isAiLoading?: boolean;
  inflationRate?: number;
  portfolioStartDate?: string;
  accentColor?: string;
}

const formatBRL = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

// Safe date formatter that doesn't use Date object to avoid timezone shifts
const formatDate = (dateStr: string) => {
    if (!dateStr) return '??/??/??';
    // Expecting YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`; // DD/MM/YY
    }
    return dateStr;
};

const getMonthName = (dateStr: string) => {
    // Manually parse YYYY-MM to avoid TZ issues
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${months[monthIndex]} ${parts[0]}`;
};

const ModalTabs = ({ tabs, active, onChange }: { tabs: { id: string, label: string }[], active: string, onChange: (id: any) => void }) => (
  <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-6 mx-4">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${active === tab.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-xl z-50">
        <p className="mb-1 opacity-70">{label}</p>
        <p className="text-emerald-400 text-sm">{formatBRL(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export const Home: React.FC<HomeProps> = ({ 
  portfolio, 
  dividendReceipts, 
  salesGain = 0,
  totalDividendsReceived = 0,
  isAiLoading = false,
  inflationRate = 0, 
  portfolioStartDate,
  accentColor = '#0ea5e9'
}) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealGainModal, setShowRealGainModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [allocationTab, setAllocationTab] = useState<'assets' | 'types' | 'segments'>('assets');
  const [incomeTab, setIncomeTab] = useState<'summary' | 'history' | 'magic'>('summary');
  const [gainTab, setGainTab] = useState<'benchmark' | 'power'>('benchmark');
  const [agendaTab, setAgendaTab] = useState<'payments' | 'datacom'>('payments');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { setActiveIndex(0); }, [allocationTab]);
  const onPieEnter = useCallback((_: any, index: number) => { setActiveIndex(index); }, []);

  const { invested, balance, totalAppreciation, appreciationPercent } = useMemo(() => {
    const res = portfolio.reduce((acc, curr) => ({
      invested: acc.invested + (curr.averagePrice * curr.quantity),
      balance: acc.balance + ((curr.currentPrice || curr.averagePrice) * curr.quantity)
    }), { invested: 0, balance: 0 });
    
    const totalAppreciation = res.balance - res.invested;
    const appreciationPercent = res.invested > 0 ? (totalAppreciation / res.invested) * 100 : 0;
    
    return { ...res, totalAppreciation, appreciationPercent };
  }, [portfolio]);

  const totalProfit = useMemo(() => {
    return totalAppreciation + salesGain + totalDividendsReceived;
  }, [totalAppreciation, salesGain, totalDividendsReceived]);
  const isProfitPositive = totalProfit >= 0;

  const { received, upcoming, averageMonthly, bestPayer, chartData, nextPayments, nextDataComs, historyGrouped } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    const tickerTotalMap: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};
    const groupedHistory: Record<string, { total: number, items: DividendReceipt[] }> = {};
    
    const upcomingPayments: DividendReceipt[] = [];
    const upcomingDataComs: DividendReceipt[] = [];

    const totals = dividendReceipts.reduce((acc, curr) => {
      // Normalize dates to YYYY-MM-DD
      let payDate = curr.paymentDate;
      if (payDate.includes('/')) payDate = payDate.split('/').reverse().join('-');
      
      let dataCom = curr.dateCom;
      if (dataCom.includes('/')) dataCom = dataCom.split('/').reverse().join('-');
      
      const monthKey = payDate.substring(0, 7); // YYYY-MM
      
      if (curr.totalReceived > 0 && payDate <= todayStr) {
          if (!groupedHistory[monthKey]) {
              groupedHistory[monthKey] = { total: 0, items: [] };
          }
          groupedHistory[monthKey].items.push(curr);
          groupedHistory[monthKey].total += curr.totalReceived;
      }

      tickerTotalMap[curr.ticker] = (tickerTotalMap[curr.ticker] || 0) + curr.totalReceived;

      if (payDate <= todayStr) {
          acc.received += curr.totalReceived;
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + curr.totalReceived;
      } else {
          acc.upcoming += curr.totalReceived;
          upcomingPayments.push(curr);
      }
      
      if (dataCom >= todayStr) {
          upcomingDataComs.push(curr);
      }

      return acc;
    }, { received: 0, upcoming: 0 });

    const uniqueMonths = new Set(Object.keys(monthlyTotals)).size || 1;
    const averageMonthly = totals.received / (uniqueMonths || 1);

    let maxVal = 0;
    let maxTicker = '-';
    Object.entries(tickerTotalMap).forEach(([t, val]) => {
        if(val > maxVal) { maxVal = val; maxTicker = t; }
    });

    const last12MonthsData = Object.entries(monthlyTotals)
        .sort((a,b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([key, value]) => ({
            name: key.split('-')[1] + '/' + key.split('-')[0].substring(2),
            value: value
        }));
    
    upcomingPayments.sort((a,b) => a.paymentDate.localeCompare(b.paymentDate));
    upcomingDataComs.sort((a,b) => a.dateCom.localeCompare(b.dateCom));

    return { 
        ...totals, 
        averageMonthly, 
        bestPayer: { ticker: maxTicker, value: maxVal },
        chartData: last12MonthsData,
        nextPayments: upcomingPayments,
        nextDataComs: upcomingDataComs,
        historyGrouped: groupedHistory
    };
  }, [dividendReceipts]);

  const sortedHistoryKeys = useMemo(() => Object.keys(historyGrouped).sort((a,b) => b.localeCompare(a)), [historyGrouped]);

  const yieldOnCostPortfolio = useMemo(() => {
      if (invested <= 0) return 0;
      return (received / invested) * 100;
  }, [received, invested]);

  const { assetData, typeData, segmentData } = useMemo(() => {
    const assetData = portfolio.map(p => ({ 
      name: p.ticker, 
      value: (p.currentPrice || p.averagePrice) * p.quantity 
    })).sort((a,b) => b.value - a.value);

    const typesMap: Record<string, number> = {};
    const segmentsMap: Record<string, number> = {};

    portfolio.forEach(p => {
      const val = (p.currentPrice || p.averagePrice) * p.quantity;
      const t = p.assetType === AssetType.FII ? 'FIIs' : 'Ações';
      typesMap[t] = (typesMap[t] || 0) + val;
      const s = p.segment || 'Outros';
      segmentsMap[s] = (segmentsMap[s] || 0) + val;
    });

    const typeData = Object.entries(typesMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    const segmentData = Object.entries(segmentsMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);

    return { assetData, typeData, segmentData };
  }, [portfolio]);

  const topSegments = useMemo(() => segmentData.slice(0, 3), [segmentData]);

  const magicNumbers = useMemo(() => {
    return portfolio.map(p => {
        const lastDiv = [...dividendReceipts]
            .filter(d => d.ticker === p.ticker)
            .sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0];
        
        if (!lastDiv || !p.currentPrice) return null;
        const rate = lastDiv.rate;
        if (rate <= 0) return null;

        const magicQty = Math.ceil(p.currentPrice / rate);
        // Safety check for infinity or NaN
        if (!isFinite(magicQty) || magicQty <= 0) return null;
        
        const progress = Math.min(100, (p.quantity / magicQty) * 100);
        
        return {
            ticker: p.ticker,
            currentQty: p.quantity,
            magicQty,
            progress,
            missing: Math.max(0, magicQty - p.quantity),
            rate
        };
    }).filter(m => m !== null).sort((a,b) => (b?.progress || 0) - (a?.progress || 0));
  }, [portfolio, dividendReceipts]);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    return (
      <g>
        <text x={cx} y={cy - 10} dy={0} textAnchor="middle" className="text-sm font-bold dark:fill-white fill-slate-900" style={{ fontSize: '16px' }}>
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} dy={8} textAnchor="middle" className="text-xs font-medium fill-slate-500">
          {formatBRL(value)}
        </text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={6} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 12} outerRadius={outerRadius + 14} fill={fill} opacity={0.2} cornerRadius={10} />
      </g>
    );
  };

  const COLORS = useMemo(() => [
    accentColor, '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f97316', '#64748b', '#d946ef', '#22c55e',
  ], [accentColor]);
  
  const finalIPCA = inflationRate > 0 ? inflationRate : 0;
  const nominalYield = invested > 0 ? (totalProfit / invested) * 100 : 0;
  const ganhoRealPercent = nominalYield - finalIPCA;
  
  const lucroNominalAbsoluto = totalProfit;
  const custoCorrosaoInflacao = invested * (finalIPCA / 100);
  const ganhoRealValor = lucroNominalAbsoluto - custoCorrosaoInflacao;
  
  const isAboveInflation = ganhoRealPercent > 0;

  const comparisonData = useMemo(() => [
      { name: 'IPCA', value: finalIPCA, fill: '#64748b' },
      { name: 'Carteira', value: nominalYield, fill: nominalYield >= finalIPCA ? '#10b981' : '#f43f5e' }
  ], [nominalYield, finalIPCA]);

  return (
    <div className="pt-24 pb-28 px-5 space-y-4 max-w-lg mx-auto">
      
      {/* 1. HERO CARD */}
      <div className="anim-fade-in-up is-visible">
        <button 
          onClick={() => setShowSummaryModal(true)}
          className="w-full text-left bg-white dark:bg-[#0f172a] p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white/60 dark:border-white/5 relative overflow-hidden group transition-transform duration-300 active:scale-[0.98] hover:scale-[1.02]"
        >
            <div 
              className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] -mr-24 -mt-24 pointer-events-none group-hover:opacity-100 transition-opacity duration-500"
              style={{ 
                  backgroundColor: isProfitPositive ? '#10b981' : '#f43f5e',
                  opacity: 0.1
              }}
            ></div>
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 w-fit">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patrimônio</span>
                   </div>
                   {isAiLoading && <Zap className="w-4 h-4 text-accent animate-pulse" />}
                </div>

                <div className="text-[2.75rem] font-bold tracking-tighter text-slate-900 dark:text-white tabular-nums mb-1 leading-none">
                    {formatBRL(balance)}
                </div>

                <div className="flex items-center gap-2 mb-8">
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isProfitPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>Lucro Total: {formatBRL(totalProfit)}</span>
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                   <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-3xl text-center">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Custo Total</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-3xl text-center">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Valorização</p>
                      <p className={`text-sm font-bold tabular-nums ${totalAppreciation >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>{totalAppreciation >= 0 ? '+' : ''}{formatBRL(totalAppreciation)}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-3xl text-center">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Realizado</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(salesGain + totalDividendsReceived)}</p>
                   </div>
                </div>
            </div>
        </button>
      </div>

      {/* 2. CARD AGENDA */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '50ms' }}>
         <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/[0.05] dark:to-purple-500/[0.05] p-6 rounded-[2.5rem] border border-indigo-500/10 active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-indigo-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
            
            <div className="flex items-center justify-between relative z-10 mb-5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-[#0f172a] rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110 transition-transform">
                        <CalendarDays className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Agenda de Proventos</h3>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                           {nextPayments.length + nextDataComs.length > 0 
                             ? `${nextPayments.length + nextDataComs.length} Eventos Próximos` 
                             : 'Nenhum evento previsto'}
                        </p>
                    </div>
                </div>
            </div>
            
            {(nextPayments.length > 0 || nextDataComs.length > 0) ? (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-linear-fade relative z-10">
                    {nextPayments.slice(0, 3).map((p, i) => (
                        <div key={`p-${i}`} className="flex items-center gap-2 bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap shadow-sm min-w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span>{p.ticker}: {formatBRL(p.totalReceived)}</span>
                        </div>
                    ))}
                    {nextDataComs.slice(0, 2).map((d, i) => (
                        <div key={`d-${i}`} className="flex items-center gap-2 bg-white dark:bg-[#0f172a] border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap shadow-sm min-w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                            <span>Data Com: {d.ticker}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="inline-block px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[10px] font-medium text-slate-400">
                    Sua agenda está limpa.
                </div>
            )}
         </button>
      </div>

      {/* 3. CARD RENDA PASSIVA COMPACTO */}
      <div className="anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
        <button 
          onClick={() => setShowProventosModal(true)} 
          className="w-full text-left bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/[0.05] dark:to-teal-500/[0.05] p-5 rounded-[2.5rem] border border-emerald-500/10 active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 pointer-events-auto"
        >
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
            
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-110 transition-transform">
                           <CircleDollarSign className="w-5 h-5" strokeWidth={2} />
                       </div>
                       <div>
                           <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Renda Passiva</h3>
                           <p className="text-[10px] font-semibold text-slate-400">Extrato Completo</p>
                       </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{formatBRL(received)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                   <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Média</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(averageMonthly)}</p>
                   </div>
                   <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#0f172a] border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex flex-col items-center justify-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Yield on Cost</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatPercent(yieldOnCostPortfolio)}</p>
                   </div>
                </div>
            </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
          {/* 4. CARD ALOCAÇÃO */}
          <button 
            onClick={() => setShowAllocationModal(true)} 
            className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.96] transition-all text-left flex flex-col h-full group hover:shadow-lg relative overflow-hidden"
            style={{ animationDelay: '200ms' }}
          >
             <div className="flex justify-between items-start mb-4 w-full">
                 <div>
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2 group-hover:scale-110 transition-transform"><PieIcon className="w-5 h-5" strokeWidth={2} /></div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alocação</h3>
                 </div>
             </div>

             <div className="w-full mt-auto space-y-2">
                 {topSegments.length > 0 ? topSegments.map((seg, i) => {
                     const totalVal = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
                     const percent = totalVal > 0 ? (seg.value / totalVal) * 100 : 0;
                     return (
                        <div key={i} className="flex justify-between items-center text-[10px]">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {seg.name}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{percent.toFixed(0)}%</span>
                        </div>
                     );
                 }) : (
                     <p className="text-[9px] text-slate-400">Sem dados</p>
                 )}
             </div>
          </button>

          {/* 5. CARD GANHO REAL */}
          <button 
            onClick={() => setShowRealGainModal(true)} 
            className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.96] transition-all text-left flex flex-col justify-between h-full group hover:shadow-lg relative overflow-hidden"
            style={{ animationDelay: '250ms' }}
          >
             <div className="mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 transition-transform"><Scale className="w-5 h-5" strokeWidth={2} /></div>
                 <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ganho Real</h3>
             </div>
             <div>
                <p className={`text-xl font-black tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{isAboveInflation ? '+' : ''}{formatPercent(ganhoRealPercent)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acima da Inflação</p>
             </div>
          </button>
      </div>
      
      {/* --- MODALS --- */}

      <SwipeableModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)}>
        <div className="px-6 py-2">
            <div className="flex items-center gap-3 mb-8 px-2 mt-2">
                <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500"><Wallet className="w-6 h-6" strokeWidth={2} /></div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Resumo Financeiro</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A Jornada do seu Dinheiro</p>
                </div>
            </div>
            <div className="space-y-3 pb-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Custo de Aquisição</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 justify-center"><Plus className="w-4 h-4 text-slate-300" /></div>
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-transparent">
                        <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-300/60 uppercase tracking-widest mb-1">Ganhos com Vendas</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatBRL(salesGain)}</p>
                    </div>
                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-transparent">
                        <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-300/60 uppercase tracking-widest mb-1">Proventos</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatBRL(totalDividendsReceived)}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3 justify-center"><Plus className="w-4 h-4 text-slate-300" /></div>
                 <div className="flex items-center gap-4">
                    <div className={`flex-1 p-4 rounded-2xl border ${totalAppreciation >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-transparent' : 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-transparent'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${totalAppreciation >= 0 ? 'text-emerald-600/60 dark:text-emerald-300/60' : 'text-rose-600/60 dark:text-rose-300/60'}`}>Valorização Atual</p>
                        <p className={`text-lg font-bold tabular-nums ${totalAppreciation >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{formatBRL(totalAppreciation)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 justify-center"><Equal className="w-4 h-4 text-slate-300" /></div>
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white dark:bg-slate-800 p-5 rounded-3xl border-2 border-slate-900 dark:border-white shadow-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Patrimônio Total</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{formatBRL(balance)}</p>
                    </div>
                </div>
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="pb-8">
            <div className="px-6 pt-2">
                <div className="flex items-center gap-3 mb-4 px-2 mt-2">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500"><CircleDollarSign className="w-6 h-6" strokeWidth={2} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Renda Passiva</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seus Proventos</p>
                    </div>
                </div>
            </div>
            <ModalTabs tabs={[{id: 'summary', label: 'Resumo'}, {id: 'history', label: 'Histórico'}, {id: 'magic', label: 'Magic Number'}]} active={incomeTab} onChange={setIncomeTab} />

            <div className="px-5">
                {incomeTab === 'summary' && (
                    <div className="space-y-6 anim-fade-in-up is-visible">
                        
                        <div className="text-center py-4 relative">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Acumulado</span>
                            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mt-1 tabular-nums">
                                {formatBRL(received)}
                            </div>
                        </div>

                        <div className="h-40 w-full relative">
                            <p className="absolute top-0 left-0 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase">Últimos 6 meses</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.slice(-6)}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                    <Tooltip cursor={{ fill: 'rgba(16, 185, 129, 0.1)', radius: 8 }} content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill={accentColor} radius={[4, 4, 4, 4]} barSize={32} animationDuration={1000} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Média Mensal</span>
                                </div>
                                <p className="text-lg font-bold text-slate-700 dark:text-white tabular-nums">{formatBRL(averageMonthly)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Percent className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Yield on Cost</span>
                                </div>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatPercent(yieldOnCostPortfolio)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-transparent flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Trophy className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Maior Pagador</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{bestPayer.ticker}</p>
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(bestPayer.value)}</p>
                                </div>
                            </div>
                            <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-2 text-accent">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Provisão</span>
                                </div>
                                <p className="text-lg font-bold text-accent tabular-nums">{formatBRL(upcoming)}</p>
                            </div>
                        </div>

                    </div>
                )}
                
                {incomeTab === 'history' && (
                    <div className="space-y-6 pb-4 anim-fade-in-up is-visible">
                        {sortedHistoryKeys.length === 0 ? (
                             <div className="text-center py-10 opacity-50">
                                <ListFilter className="w-10 h-10 mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
                                <p className="text-xs text-slate-400 font-medium">Nenhum histórico encontrado.</p>
                             </div>
                        ) : (
                            sortedHistoryKeys.map(monthKey => (
                                <div key={monthKey} className="relative">
                                    <div className="flex items-center justify-between mb-3 px-2 sticky top-0 bg-white dark:bg-[#0b1121] py-2 z-10">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{getMonthName(monthKey + '-01')}</h4>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg tabular-nums">
                                            {formatBRL(historyGrouped[monthKey].total)}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {historyGrouped[monthKey].items.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).map((item, i) => (
                                            <div key={item.id + i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex flex-col items-center justify-center shadow-sm">
                                                        <span className="text-[9px] font-black uppercase text-slate-400">{item.paymentDate.split('-')[1]}</span>
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{item.paymentDate.split('-')[2]}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{item.ticker}</p>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase">{item.type.replace('DIVIDENDO', 'DIV').replace('JRS CAP PROPRIO', 'JCP')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(item.totalReceived)}</p>
                                                    <p className="text-[9px] font-medium text-slate-400 tabular-nums">{item.quantityOwned} un.</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {incomeTab === 'magic' && (
                    <div className="space-y-3 anim-fade-in-up is-visible">
                        {magicNumbers?.length > 0 ? magicNumbers.map((m, i) => m && (
                          <div key={i} className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.ticker}</h4>
                                  <span className="text-xs font-bold text-accent tabular-nums">{m.progress.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full mb-2 overflow-hidden">
                                  <div className="h-full bg-accent" style={{ width: `${m.progress}%` }}></div>
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold flex justify-between">
                                  <span>{m.currentQty} / {m.magicQty} Cotas</span>
                                  <span>Faltam {m.missing}</span>
                              </div>
                          </div>
                        )) : (
                            <div className="text-center py-10 opacity-50">
                                <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
                                <p className="text-xs text-slate-400 font-medium">Sem dados de proventos suficientes.</p>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="pb-8">
            <div className="px-6 pt-2">
                <div className="flex items-center gap-3 mb-4 px-2 mt-2">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent"><PieIcon className="w-6 h-6" strokeWidth={2} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Alocação</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Composição da Carteira</p>
                    </div>
                </div>
            </div>
            <ModalTabs tabs={[{id: 'assets', label: 'Ativos'}, {id: 'types', label: 'Tipos'}, {id: 'segments', label: 'Segmentos'}]} active={allocationTab} onChange={setAllocationTab} />
            
            <div className="px-5">
              {[
                { id: 'assets', data: assetData },
                { id: 'types', data: typeData },
                { id: 'segments', data: segmentData }
              ].map(tab => {
                if(tab.id !== allocationTab) return null;
                const currentData = tab.data;
                const total = currentData.reduce((acc, item) => acc + item.value, 0);

                return (
                  <div key={tab.id} className="anim-fade-in-up is-visible">
                      <div className="h-48 w-full -my-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={currentData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60} 
                              outerRadius={80} 
                              fill="#8884d8" 
                              paddingAngle={5} 
                              dataKey="value" 
                              activeIndex={activeIndex} 
                              activeShape={renderActiveShape} 
                              onMouseEnter={onPieEnter}
                              cornerRadius={8}
                            >
                              {currentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" fillOpacity={activeIndex === index ? 1 : 0.3} style={{ transition: 'opacity 0.3s ease' }} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 mt-4">
                        {currentData.map((item, index) => (
                          <div key={index} onMouseEnter={() => onPieEnter(null, index)} className={`flex items-center justify-between p-3 rounded-xl transition-all ${activeIndex === index ? 'bg-slate-100 dark:bg-white/5' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-900 dark:text-white tabular-nums">{formatBRL(item.value)}</p>
                                <p className="text-xs text-slate-400 font-medium tabular-nums">{formatPercent((item.value / total) * 100)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                )
              })}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
        <div className="px-6 py-2 pb-8">
            <div className="flex items-center gap-3 mb-4 px-2 mt-2">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500"><Scale className="w-6 h-6" strokeWidth={2} /></div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Poder de Compra</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rentabilidade vs. Inflação</p>
                </div>
            </div>
            
            <ModalTabs tabs={[{id: 'benchmark', label: 'Benchmark'}, {id: 'power', label: 'Poder de Compra'}]} active={gainTab} onChange={setGainTab} />
            
            {gainTab === 'benchmark' && (
                <div className="space-y-4 px-4 anim-fade-in-up is-visible">
                    <div className="bg-slate-50 dark:bg-[#0f172a] p-6 rounded-3xl grid grid-cols-3 items-center text-center">
                        <div className="space-y-1">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carteira</p>
                           <p className={`text-2xl font-black tabular-nums ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{formatPercent(nominalYield)}</p>
                        </div>
                        <p className="font-bold text-slate-300 dark:text-slate-600">VS</p>
                        <div className="space-y-1">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">IPCA</p>
                           <p className="text-2xl font-black text-slate-500 tabular-nums">{formatPercent(finalIPCA)}</p>
                        </div>
                    </div>

                    <div className={`p-6 rounded-3xl text-center relative overflow-hidden ${isAboveInflation ? 'bg-gradient-to-br from-emerald-500/10 to-transparent' : 'bg-gradient-to-br from-rose-500/10 to-transparent'}`}>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retorno Real Acumulado</p>
                       <p className={`text-5xl font-black tabular-nums tracking-tighter my-2 ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>{isAboveInflation ? '+' : ''}{formatPercent(ganhoRealPercent)}</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto">Sua carteira está {isAboveInflation ? 'preservando e multiplicando' : 'perdendo valor para'} seu capital acima da inflação.</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#0f172a] p-6 rounded-3xl space-y-4">
                       {(comparisonData.sort((a,b) => b.value - a.value)).map(item => {
                         const maxValue = Math.max(nominalYield, finalIPCA, 1);
                         const barWidth = (item.value / maxValue) * 100;
                         return (
                            <div key={item.name}>
                               <div className="flex items-center text-xs font-bold">
                                   <span className="w-16 text-slate-400">{item.name}</span>
                                   <div className="flex-1 h-3 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                       <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: item.fill, transition: 'width 0.5s ease-out' }}></div>
                                   </div>
                                   <span className="w-12 text-right text-slate-500 tabular-nums">{item.value.toFixed(2)}%</span>
                               </div>
                            </div>
                         );
                       })}
                    </div>
                </div>
            )}

            {gainTab === 'power' && (
              <div className="space-y-3 px-4 anim-fade-in-up is-visible">
                  <div className="flex items-center gap-4">
                      <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-transparent">
                          <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-300/60 uppercase tracking-widest mb-1">Lucro Total</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatBRL(lucroNominalAbsoluto)}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center"><Minus className="w-4 h-4 text-slate-300" /></div>
                  <div className="flex items-center gap-4">
                      <div className="flex-1 bg-rose-50 dark:bg-rose-500/5 p-4 rounded-2xl border border-rose-100 dark:border-transparent">
                          <p className="text-[10px] font-bold text-rose-600/60 dark:text-rose-300/60 uppercase tracking-widest mb-1">Custo da Inflação (IPCA)</p>
                          <p className="text-lg font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatBRL(custoCorrosaoInflacao)}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center"><Equal className="w-4 h-4 text-slate-300" /></div>
                  <div className={`flex-1 p-5 rounded-3xl border-2 ${isAboveInflation ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isAboveInflation ? 'text-emerald-600/60 dark:text-emerald-300/60' : 'text-rose-600/60 dark:text-rose-300/60'}`}>Ganho Real de Poder de Compra</p>
                      <p className={`text-2xl font-black tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{isAboveInflation ? '+' : ''}{formatBRL(ganhoRealValor)}</p>
                  </div>
              </div>
            )}
        </div>
      </SwipeableModal>
      
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="pb-8">
            <div className="px-6 pt-2">
                <div className="flex items-center gap-3 mb-4 px-2 mt-2">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><CalendarDays className="w-6 h-6" strokeWidth={2} /></div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Agenda</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próximos Eventos</p>
                    </div>
                </div>
            </div>
            <ModalTabs tabs={[{id: 'payments', label: 'Pagamentos'}, {id: 'datacom', label: 'Data Com'}]} active={agendaTab} onChange={setAgendaTab} />
            <div className="px-5 space-y-3">
                {agendaTab === 'payments' && (nextPayments.length > 0 ? nextPayments.map((p, i) => (
                    <div key={i} className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <div>
                           <p className="font-bold text-slate-900 dark:text-white">{p.ticker}</p>
                           <p className="text-[10px] font-semibold text-slate-400">{formatDate(p.paymentDate)}</p>
                        </div>
                        <p className="text-sm font-bold text-emerald-500 tabular-nums">{formatBRL(p.totalReceived)}</p>
                    </div>
                )) : <p className="text-center text-xs text-slate-400 py-10">Nenhum pagamento agendado.</p>)}

                {agendaTab === 'datacom' && (nextDataComs.length > 0 ? nextDataComs.map((p, i) => (
                    <div key={i} className="anim-fade-in-up is-visible bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <div>
                           <p className="font-bold text-slate-900 dark:text-white">{p.ticker}</p>
                           <p className="text-[10px] font-semibold text-slate-400">Data Limite: {formatDate(p.dateCom)}</p>
                        </div>
                        <p className="text-sm font-bold text-amber-500 tabular-nums">{formatBRL(p.rate)}/cota</p>
                    </div>
                )) : <p className="text-center text-xs text-slate-400 py-10">Nenhuma Data Com prevista.</p>)}
            </div>
        </div>
      </SwipeableModal>

    </div>
  );
};
