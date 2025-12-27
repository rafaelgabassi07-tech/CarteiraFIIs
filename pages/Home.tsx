

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, ArrowUpRight, ArrowDownRight, LayoutGrid, ShieldCheck, AlertTriangle, Banknote, Award, Percent, TrendingUp, Calendar, Trophy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, BarChart, Bar, XAxis, Tooltip, CartesianGrid, YAxis } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  sources?: { web: { uri: string; title: string } }[];
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
  return `${num.toFixed(2)}%`;
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

export const Home: React.FC<HomeProps> = ({ 
  portfolio, 
  dividendReceipts, 
  realizedGain = 0, 
  sources = [],
  isAiLoading = false,
  inflationRate = 0, 
  portfolioStartDate,
  accentColor = '#0ea5e9'
}) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealGainModal, setShowRealGainModal] = useState(false);

  const [allocationTab, setAllocationTab] = useState<'assets' | 'types' | 'segments'>('assets');
  const [incomeTab, setIncomeTab] = useState<'summary' | 'magic' | 'calendar'>('summary');
  const [gainTab, setGainTab] = useState<'benchmark' | 'power'>('benchmark');
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

  const { received, upcoming, averageMonthly, bestPayer, chartData } = useMemo(() => {
    // Datas seguras
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    // Mapa para achar o maior pagador
    const tickerTotalMap: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};

    const totals = dividendReceipts.reduce((acc, curr) => {
      let payDate = curr.paymentDate;
      if (payDate.includes('/')) payDate = payDate.split('/').reverse().join('-');
      
      const monthKey = payDate.substring(0, 7); // YYYY-MM
      
      // Agrega por Ticker
      tickerTotalMap[curr.ticker] = (tickerTotalMap[curr.ticker] || 0) + curr.totalReceived;

      if (payDate <= todayStr) {
          acc.received += curr.totalReceived;
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + curr.totalReceived;
      } else {
          acc.upcoming += curr.totalReceived;
      }
      return acc;
    }, { received: 0, upcoming: 0 });

    const uniqueMonths = new Set(Object.keys(monthlyTotals)).size || 1;
    const averageMonthly = totals.received / (uniqueMonths || 1);

    // Encontra maior pagador
    let maxVal = 0;
    let maxTicker = '-';
    Object.entries(tickerTotalMap).forEach(([t, val]) => {
        if(val > maxVal) { maxVal = val; maxTicker = t; }
    });

    // Dados para o gráfico (últimos 12 meses)
    const last12MonthsData = Object.entries(monthlyTotals)
        .sort((a,b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([key, value]) => ({
            name: key.split('-')[1] + '/' + key.split('-')[0].substring(2),
            value: value
        }));

    return { 
        ...totals, 
        averageMonthly, 
        bestPayer: { ticker: maxTicker, value: maxVal },
        chartData: last12MonthsData
    };
  }, [dividendReceipts]);

  // Yield On Cost da Carteira
  const yieldOnCostPortfolio = useMemo(() => {
      if (invested <= 0) return 0;
      return (received / invested) * 100;
  }, [received, invested]);

  const { assetData, typeData, segmentData, allocationSummary } = useMemo(() => {
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

    const totalVal = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
    const fiiPercent = totalVal > 0 ? ((typesMap['FIIs'] || 0) / totalVal) * 100 : 0;
    const stockPercent = totalVal > 0 ? ((typesMap['Ações'] || 0) / totalVal) * 100 : 0;

    return { assetData, typeData, segmentData, allocationSummary: { fiiPercent, stockPercent } };
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

  const COLORS = [accentColor, '#8b5cf6', '#10b981', '#f97316', '#f43f5e', '#64748b', '#3b82f6', '#ec4899'];
  
  // =========================================================================================
  // LÓGICA DE GANHO REAL (VS INFLAÇÃO)
  // =========================================================================================
  
  const estimatedIPCA = useMemo(() => {
     if (inflationRate > 0) return inflationRate;
     if (!portfolioStartDate) return 0;
     
     const start = new Date(portfolioStartDate);
     const now = new Date();
     const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
     return Math.max(0, months * 0.45); // Estimativa conservadora de 0.45% a.m.
  }, [inflationRate, portfolioStartDate]);

  const finalIPCA = inflationRate > 0 ? inflationRate : estimatedIPCA;

  const totalNominalReturn = totalAppreciation + realizedGain + received;
  const nominalYield = invested > 0 ? (totalNominalReturn / invested) * 100 : 0;
  const ganhoRealPercent = nominalYield - finalIPCA;
  const valorCorrigidoPeloIPCA = invested * (1 + (finalIPCA / 100));
  const perdaInflacionaria = valorCorrigidoPeloIPCA - invested;
  const patrimonioRealDiff = (balance + received + realizedGain) - valorCorrigidoPeloIPCA;
  
  const isAboveInflation = ganhoRealPercent > 0;
  const isPositiveBalance = totalAppreciation >= 0;

  // Comparativo Visual (Barra Dupla)
  const comparisonData = useMemo(() => [
      { name: 'IPCA', value: finalIPCA, fill: '#64748b' },
      { name: 'Carteira', value: nominalYield, fill: nominalYield >= finalIPCA ? '#10b981' : '#f43f5e' }
  ], [nominalYield, finalIPCA]);

  // =========================================================================================

  return (
    <div className="pt-24 pb-28 px-5 space-y-6 max-w-lg mx-auto">
      
      {/* 1. HERO CARD */}
      <div className="animate-fade-in-up">
        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white/60 dark:border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none group-hover:bg-accent/10 transition-colors duration-500"></div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 w-fit">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Patrimônio</span>
                   </div>
                   {isAiLoading && <Zap className="w-4 h-4 text-accent animate-pulse" />}
                </div>

                <div className="mb-8">
                    <div className="text-[2.75rem] font-bold tracking-tighter text-slate-900 dark:text-white tabular-nums mb-1 leading-none">
                        {formatBRL(balance)}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${isPositiveBalance ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isPositiveBalance ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {formatBRL(totalAppreciation)} ({formatPercent(appreciationPercent)})
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 dark:bg-white/[0.03] px-5 py-4 rounded-3xl">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Custo</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/[0.03] px-5 py-4 rounded-3xl">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Realizado</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(realizedGain)}</p>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. CARD RENDA PASSIVA */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-lg pointer-events-auto">
            <div className="flex items-start justify-between relative z-10">
                <div>
                   <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:rotate-12 transition-transform"><CircleDollarSign className="w-5 h-5" strokeWidth={2} /></div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Renda Passiva</h3>
                   </div>
                   <div>
                       <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                       <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{formatBRL(received)}</p>
                   </div>
                </div>
                
                <div className="text-right flex flex-col items-end justify-between h-full">
                    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-2xl mb-3 min-w-[100px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Média Mensal</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(averageMonthly)}</span>
                    </div>
                    {upcoming > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wide shadow-lg shadow-accent/20">
                            <Sparkles className="w-3 h-3" />
                            <span>Futuro: {formatBRL(upcoming)}</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
          {/* 3. CARD ALOCAÇÃO */}
          <button 
            onClick={() => setShowAllocationModal(true)} 
            className="animate-fade-in-up bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.96] transition-all text-left flex flex-col h-full group hover:shadow-lg relative overflow-hidden"
            style={{ animationDelay: '200ms' }}
          >
             <div className="flex justify-between items-start mb-2 w-full">
                 <div>
                    <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2 group-hover:scale-110 transition-transform"><PieIcon className="w-5 h-5" strokeWidth={2} /></div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alocação</h3>
                 </div>
             </div>

             <div className="w-full mt-auto space-y-1.5">
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

          {/* 4. CARD GANHO REAL */}
          <button 
            onClick={() => setShowRealGainModal(true)} 
            className="animate-fade-in-up bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 active:scale-[0.96] transition-all text-left flex flex-col justify-between h-full group hover:shadow-lg relative overflow-hidden"
            style={{ animationDelay: '250ms' }}
          >
             <div className="mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3 group-hover:scale-110 transition-transform"><Scale className="w-5 h-5" strokeWidth={2} /></div>
                 <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Vs Inflação</h3>
             </div>
             <div>
                <div className="flex items-end gap-1 mb-2">
                    <span className={`text-2xl font-bold tabular-nums tracking-tight ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isAboveInflation ? '+' : ''}{ganhoRealPercent.toFixed(1)}%
                    </span>
                </div>
                <div className="flex gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                    <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: '40%' }}></div>
                    <div className={`h-full ${isAboveInflation ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: '60%' }}></div>
                </div>
                {/* Data de início para contexto */}
                <p className="text-[9px] text-slate-400 mt-2 font-medium truncate">
                   {portfolioStartDate ? `IPCA desde ${portfolioStartDate.split('-')[1]}/${portfolioStartDate.split('-')[0]}` : 'IPCA Estimado'}
                </p>
             </div>
          </button>
      </div>

      {sources.length > 0 && (
        <div className="flex items-center justify-center gap-3 flex-wrap opacity-60 hover:opacity-100 transition-opacity py-4">
           <div className="flex items-center gap-1.5 text-amber-500">
             <Zap className="w-3 h-3" />
             <span className="text-[9px] font-black uppercase tracking-widest">Fontes</span>
           </div>
           {sources.slice(0, 3).map((source, i) => (
             <a key={i} href={source.web.uri} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors truncate max-w-[120px]">
               {source.web.title}
             </a>
           ))}
        </div>
      )}

      {/* MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="px-4 py-2">
            <div className="flex items-center gap-3 px-2 mb-6 mt-2">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent"><LayoutGrid className="w-5 h-5" strokeWidth={2} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Detalhamento</h3>
            </div>
            <ModalTabs 
                active={allocationTab} 
                onChange={setAllocationTab} 
                tabs={[{ id: 'assets', label: 'Por Ativo' }, { id: 'types', label: 'Por Classe' }, { id: 'segments', label: 'Por Segmento' }]} 
            />
            <div className="h-72 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData} 
                            innerRadius={75} 
                            outerRadius={100} 
                            paddingAngle={4} 
                            dataKey="value" 
                            stroke="none" 
                            cornerRadius={8}
                            animationDuration={1500}
                            animationEasing="ease-out"
                            onClick={onPieEnter}
                        >
                            {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length] }} />)}
                        </Pie>
                    </PieChart>
                    </ResponsiveContainer>
            </div>
            <div className="space-y-3 pb-8">
                {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((item, i) => {
                    const percent = ((item.value / (balance || 1)) * 100);
                    const isActive = i === activeIndex;
                    return (
                    <button 
                        key={item.name} 
                        onClick={() => setActiveIndex(i)}
                        className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all duration-300 animate-fade-in-up border border-slate-100 dark:border-white/5 ${isActive ? 'bg-accent/5 shadow-sm scale-[1.01]' : 'bg-white dark:bg-[#0f172a]'}`}
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ${isActive ? 'ring-accent/40' : 'ring-white dark:ring-[#0f172a]'}`} style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <div className="text-left">
                                <h4 className={`font-bold text-xs uppercase tracking-wide ${isActive ? 'text-accent' : 'text-slate-900 dark:text-white'}`}>{item.name}</h4>
                                <p className="text-[10px] font-medium text-slate-400">{formatBRL(item.value)}</p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${isActive ? 'text-accent' : 'text-slate-900 dark:text-white'}`}>{percent.toFixed(1)}%</span>
                    </button>
                    );
                })}
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL GANHO REAL (REFORMULADO) */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
         <div className="px-4 py-2">
            <div className="flex items-center gap-3 px-2 mb-6 mt-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Scale className="w-5 h-5" strokeWidth={2} /></div>
                <div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Renda vs Inflação</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Proteção do Poder de Compra</p>
                </div>
            </div>
            
            <ModalTabs active={gainTab} onChange={setGainTab} tabs={[
                { id: 'benchmark', label: 'Benchmark' }, 
                { id: 'power', label: 'Poder de Compra' }, 
            ]} />
            
            {gainTab === 'benchmark' && (
                <div className="animate-fade-in space-y-6 mt-4 pb-8">
                    {/* Scorecard Visual */}
                    <div className="flex items-center justify-between bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carteira</span>
                            <span className={`text-2xl font-black ${nominalYield >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{nominalYield.toFixed(2)}%</span>
                        </div>
                        <div className="flex flex-col items-center px-4">
                            <span className="text-xs font-black text-slate-300 dark:text-slate-600">VS</span>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">IPCA</span>
                            <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{finalIPCA.toFixed(2)}%</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[3rem] text-center border border-slate-200/50 dark:border-white/5 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10 ${isAboveInflation ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Retorno Real Acumulado</p>
                        <div className={`text-6xl font-black tabular-nums tracking-tighter mb-4 relative z-10 ${isAboveInflation ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isAboveInflation ? '+' : ''}{ganhoRealPercent.toFixed(2)}%
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 relative z-10 max-w-[200px] mx-auto leading-relaxed">
                            {isAboveInflation 
                                ? 'Sua carteira está preservando e multiplicando seu capital acima da inflação.' 
                                : 'No momento, a inflação está corroendo parte do seu poder de compra.'}
                        </p>
                    </div>

                    {/* Gráfico de Barras Comparativo */}
                    <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] h-56 border border-slate-100 dark:border-white/5">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }} barCategoryGap={10}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} width={60} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24} background={{ fill: 'rgba(0,0,0,0.02)', radius: [0, 10, 10, 0] }} label={{ position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 700, formatter: (val: any) => `${val.toFixed(1)}%` }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {gainTab === 'power' && (
                <div className="space-y-6 mt-4 pb-8 animate-fade-in flex flex-col">
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] mb-2 border border-slate-200/50 dark:border-white/5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <ShieldCheck className="w-3.5 h-3.5" />
                             Cálculo de Proteção
                        </h4>
                        
                        <div className="space-y-6">
                             <div className="flex items-center justify-between relative z-10">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 font-bold text-xs">1</div>
                                     <div>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase">Capital Investido</p>
                                         <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatBRL(invested)}</p>
                                     </div>
                                 </div>
                             </div>

                             <div className="pl-4 -my-2 border-l-2 border-dashed border-slate-200 dark:border-white/10 h-6 ml-4"></div>

                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500 font-bold text-xs">2</div>
                                     <div>
                                         <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase">Correção IPCA</p>
                                         <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatBRL(perdaInflacionaria)}</p>
                                     </div>
                                 </div>
                             </div>

                             <div className="pl-4 -my-2 border-l-2 border-dashed border-slate-200 dark:border-white/10 h-6 ml-4"></div>

                             <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white ${patrimonioRealDiff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>3</div>
                                     <div>
                                         <p className="text-[10px] font-bold text-slate-400 uppercase">Patrimônio Atual</p>
                                         <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatBRL(balance + received + realizedGain)}</p>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className={`p-8 rounded-[2.5rem] text-center shadow-lg relative overflow-hidden ${patrimonioRealDiff >= 0 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2 relative z-10">Resultado Real (Poder de Compra)</p>
                        <p className="text-3xl font-black tabular-nums tracking-tighter mb-2 relative z-10">
                            {patrimonioRealDiff >= 0 ? '+' : ''}{formatBRL(patrimonioRealDiff)}
                        </p>
                        {patrimonioRealDiff >= 0 && <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-widest relative z-10">Ganho Real</span>}
                    </div>
                </div>
            )}
         </div>
      </SwipeableModal>

      {/* MODAL PROVENTOS (REFORMULADO - NOVO RESUMO COM GRÁFICO) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-4 py-2">
           <div className="flex items-center gap-3 px-2 mb-6 mt-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CircleDollarSign className="w-5 h-5" strokeWidth={2} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Proventos</h3>
           </div>
           <ModalTabs active={incomeTab} onChange={setIncomeTab} tabs={[{ id: 'summary', label: 'Resumo' }, { id: 'magic', label: 'Metas' }, { id: 'calendar', label: 'Extrato' }]} />

           <div className="mt-4 pb-8">
                {incomeTab === 'summary' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Hero Section - Split Layout */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-500 p-6 rounded-[2.2rem] text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between h-36 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
                                <Banknote className="w-6 h-6 opacity-80" />
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Recebido</p>
                                    <p className="text-2xl font-black tabular-nums tracking-tighter">{formatBRL(received)}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.2rem] flex flex-col justify-between h-36 border border-slate-100 dark:border-white/5 relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full blur-xl"></div>
                                <Calendar className="w-6 h-6 text-slate-400" />
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Média Mensal</p>
                                    <p className="text-2xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">{formatBRL(averageMonthly)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico de Evolução */}
                        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-accent" />
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Evolução (12 Meses)</h4>
                                </div>
                            </div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                            dy={10}
                                            interval={2}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                            tickFormatter={(val) => `R$${val}`}
                                        />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '8px 12px' }}
                                            formatter={(value: number) => [<span className="text-emerald-600 font-bold">{formatBRL(value)}</span>, '']}
                                            labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}
                                        />
                                        <Bar 
                                            dataKey="value" 
                                            radius={[6, 6, 6, 6]} 
                                            fill={accentColor}
                                            barSize={16}
                                            animationDuration={1500}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Cards Inferiores */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Percent className="w-3 h-3" /> Yield on Cost</p>
                                <p className="text-lg font-black text-indigo-500 tabular-nums">{yieldOnCostPortfolio.toFixed(2)}%</p>
                            </div>

                            <div className="bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Trophy className="w-3 h-3 text-amber-500" /> Top Pagador</p>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{bestPayer.ticker}</span>
                                    <span className="text-[10px] font-bold text-amber-500 tabular-nums">{formatBRL(bestPayer.value)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {incomeTab === 'magic' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-accent/5 p-6 rounded-[2rem] mb-4 border border-accent/10">
                             <div className="flex gap-2 items-center text-accent mb-2">
                                <Target className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wide">Magic Number</span>
                             </div>
                             <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Quantidade de cotas necessária para comprar uma nova cota apenas com os rendimentos mensais.</p>
                        </div>
                        {magicNumbers.map((m, i) => (
                            <div key={m.ticker} className="p-6 bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-sm animate-fade-in-up border border-slate-100 dark:border-white/5" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="flex justify-between items-center mb-5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-base text-slate-900 dark:text-white">{m.ticker}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg uppercase">Faltam {m.missing}</span>
                                    </div>
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${m.progress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {m.progress.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${m.progress >= 100 ? 'bg-emerald-500' : 'bg-accent'}`} style={{ width: `${m.progress}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {incomeTab === 'calendar' && (
                    <div className="space-y-0 relative pl-4 animate-fade-in pb-8">
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-white/5"></div>
                      {dividendReceipts.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 20).map((r, idx) => {
                        const todayDate = new Date();
                        const year = todayDate.getFullYear();
                        const month = String(todayDate.getMonth() + 1).padStart(2, '0');
                        const day = String(todayDate.getDate()).padStart(2, '0');
                        const todayStr = `${year}-${month}-${day}`;
                        
                        const isUpcoming = r.paymentDate > todayStr;
                        return (
                            <div key={`${r.id}-${idx}`} className="relative pl-8 py-3 group animate-fade-in-up" style={{ animationDelay: `${idx * 30}ms` }}>
                                <div className={`absolute left-[11px] top-7 w-4 h-4 rounded-full border-[3px] border-slate-50 dark:border-[#0b1121] z-10 ${isUpcoming ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                <div className={`p-5 rounded-[2rem] transition-all flex justify-between items-center border border-slate-100 dark:border-white/5 ${isUpcoming ? 'bg-white dark:bg-[#0f172a] shadow-lg shadow-accent/5' : 'bg-white dark:bg-[#0f172a]'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">{r.ticker}</span>
                                            {isUpcoming && <span className="text-[9px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded uppercase tracking-wide">Futuro</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                                            <span>{r.type.substring(0,3)}</span> • <span>{r.paymentDate.split('-').reverse().slice(0,2).join('/')}</span>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm tabular-nums ${isUpcoming ? 'text-accent' : 'text-slate-900 dark:text-white'}`}>{formatBRL(r.totalReceived)}</span>
                                </div>
                            </div>
                        );
                      })}
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>
    </div>
  );
};
