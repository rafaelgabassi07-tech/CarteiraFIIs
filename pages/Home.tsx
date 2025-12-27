
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, CircleDollarSign, PieChart as PieIcon, Sparkles, Target, Zap, Scale, ArrowUpRight, ArrowDownRight, Layers, LayoutGrid, TrendingUp, Calculator, PiggyBank, CalendarClock, GripHorizontal, BarChart3, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, BarChart, Bar, XAxis, Tooltip, AreaChart, Area, CartesianGrid, YAxis, ReferenceLine } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  sources?: { web: { uri: string; title: string } }[];
  isAiLoading?: boolean;
  inflationRate?: number; // IPCA Dinâmico
  portfolioStartDate?: string;
  accentColor?: string; // Cor recebida para gráficos
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
  inflationRate = 4.5, // Default apenas se não vier da IA
  portfolioStartDate,
  accentColor = '#0ea5e9'
}) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealGainModal, setShowRealGainModal] = useState(false);

  const [allocationTab, setAllocationTab] = useState<'assets' | 'types' | 'segments'>('assets');
  const [incomeTab, setIncomeTab] = useState<'summary' | 'magic' | 'calendar'>('summary');
  const [gainTab, setGainTab] = useState<'benchmark' | 'coverage' | 'projection'>('benchmark');

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [allocationTab]);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const { invested, balance, totalAppreciation, appreciationPercent } = useMemo(() => {
    const res = portfolio.reduce((acc, curr) => ({
      invested: acc.invested + (curr.averagePrice * curr.quantity),
      balance: acc.balance + ((curr.currentPrice || curr.averagePrice) * curr.quantity)
    }), { invested: 0, balance: 0 });
    
    const totalAppreciation = res.balance - res.invested;
    const appreciationPercent = res.invested > 0 ? (totalAppreciation / res.invested) * 100 : 0;
    
    return { ...res, totalAppreciation, appreciationPercent };
  }, [portfolio]);

  const { received, upcoming, averageMonthly } = useMemo(() => {
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const totals = dividendReceipts.reduce((acc, curr) => {
      if (curr.paymentDate <= todayStr) acc.received += curr.totalReceived;
      else acc.upcoming += curr.totalReceived;
      return acc;
    }, { received: 0, upcoming: 0 });

    const uniqueMonths = new Set(dividendReceipts.map(d => d.paymentDate.substring(0, 7))).size || 1;
    const averageMonthly = totals.received / uniqueMonths;

    return { ...totals, averageMonthly };
  }, [dividendReceipts]);

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
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={6}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 14}
          fill={fill}
          opacity={0.2}
          cornerRadius={10}
        />
      </g>
    );
  };

  const COLORS = [accentColor, '#8b5cf6', '#10b981', '#f97316', '#f43f5e', '#64748b', '#3b82f6', '#ec4899'];
  const inflacaoPeriodo = inflationRate; 
  
  // ==========================================
  // LÓGICA DE GANHO REAL (RENDA VS INFLAÇÃO)
  // ==========================================
  
  // 1. Yield on Cost: Quanto de DIVIDENDOS o dinheiro investido gerou (sem contar valorização)
  const dividendYieldOnCost = invested > 0 ? (received / invested) * 100 : 0;
  
  // 2. Ganho Real de Renda: Yield dos Dividendos - Inflação
  const realIncomeYield = dividendYieldOnCost - inflacaoPeriodo;
  
  // 3. Custo Monetário da Inflação: Quanto o dinheiro investido perdeu de valor
  const inflationCostValue = invested * (inflacaoPeriodo / 100);
  
  // 4. Cobertura: Quanto os dividendos cobriram desse custo?
  // Se recebi 1000 de div e inflação custou 800, cobri 125% (Sobrou renda real)
  const inflationCoveragePercent = inflationCostValue > 0 ? (received / inflationCostValue) * 100 : (received > 0 ? 100 : 0);
  
  const isIncomeAboveInflation = realIncomeYield >= 0;

  // Dados para Benchmark (DY vs IPCA)
  const benchmarkData = useMemo(() => {
      return [
          { name: 'Yield (DY)', value: dividendYieldOnCost, fill: accentColor },
          { name: 'IPCA', value: inflacaoPeriodo, fill: '#64748b' }
      ];
  }, [dividendYieldOnCost, inflacaoPeriodo, accentColor]);

  // Dados para Gráfico de Cobertura (Donut)
  const coverageData = useMemo(() => {
    const covered = Math.min(received, inflationCostValue);
    const missing = Math.max(0, inflationCostValue - received);
    const surplus = Math.max(0, received - inflationCostValue);

    const data = [];
    if (surplus > 0) {
        // Cenário Otimista: Cobriu tudo e sobrou
        data.push({ name: 'Inflação Coberta', value: inflationCostValue, color: '#94a3b8' }); // Slate (Neutro/Pago)
        data.push({ name: 'Ganho Real', value: surplus, color: '#10b981' }); // Emerald (Lucro Limpo)
    } else {
        // Cenário Pessimista: Não cobriu tudo
        data.push({ name: 'Inflação Coberta', value: covered, color: '#f59e0b' }); // Amber (Parcial)
        data.push({ name: 'Perda Poder Compra', value: missing, color: '#f43f5e' }); // Rose (Prejuízo)
    }
    return data;
  }, [received, inflationCostValue]);

  // Projeção focada em RENDA
  const projectionData = useMemo(() => {
    if (averageMonthly <= 0) return [];
    // Projeção linear simples de crescimento de renda (ex: +5% ao ano via reinvestimento + crescimento DPA)
    const growthRate = 0.05; 
    
    return [
        { label: 'Hoje', value: averageMonthly * 12, year: 'Anual Atual' },
        { label: '+1 Ano', value: (averageMonthly * 12) * (1 + growthRate), year: 'Estimado' },
        { label: '+3 Anos', value: (averageMonthly * 12) * Math.pow(1 + growthRate, 3), year: 'Estimado' },
        { label: '+5 Anos', value: (averageMonthly * 12) * Math.pow(1 + growthRate, 5), year: 'Estimado' },
    ];
  }, [averageMonthly]);

  const isPositiveBalance = totalAppreciation >= 0;

  return (
    <div className="pt-24 pb-28 px-5 space-y-6 max-w-lg mx-auto">
      
      {/* 1. HERO CARD */}
      <div className="animate-fade-in-up">
        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
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
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Custo</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-white/[0.03] px-5 py-4 rounded-3xl">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Realizado</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(realizedGain)}</p>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. CARD RENDA PASSIVA */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] shadow-sm active:scale-[0.98] transition-all group relative overflow-hidden hover:shadow-lg">
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
                </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/5">
                <div className="h-full bg-emerald-500 w-full opacity-0 group-hover:opacity-30 transition-all duration-700"></div>
            </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
          {/* 3. CARD ALOCAÇÃO */}
          <button 
            onClick={() => setShowAllocationModal(true)} 
            className="animate-fade-in-up bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm active:scale-[0.96] transition-all text-left flex flex-col h-full group hover:shadow-lg relative overflow-hidden"
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

          {/* 4. CARD GANHO REAL (RENDA VS INFLAÇÃO) - REVISADO */}
          <button 
            onClick={() => setShowRealGainModal(true)} 
            className="animate-fade-in-up bg-white dark:bg-[#0f172a] p-5 rounded-[2.5rem] shadow-sm active:scale-[0.96] transition-all text-left flex flex-col justify-between h-full group hover:shadow-lg"
            style={{ animationDelay: '250ms' }}
          >
             <div className="mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform"><Scale className="w-5 h-5" strokeWidth={2} /></div>
                 <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Renda vs IPCA</h3>
             </div>
             <div>
                <div className="flex items-end gap-1 mb-2">
                    {/* Exibe o ganho (ou perda) real de Yield */}
                    <span className={`text-2xl font-bold tabular-nums tracking-tight ${isIncomeAboveInflation ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isIncomeAboveInflation ? '+' : ''}{realIncomeYield.toFixed(1)}%
                    </span>
                </div>
                
                {/* Barra de Progresso: Cobertura da Inflação */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                    <div 
                        className={`h-full ${isIncomeAboveInflation ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${Math.min(100, inflationCoveragePercent)}%` }}
                    ></div>
                </div>
                
                <p className="text-[9px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                   {isIncomeAboveInflation ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                   {isIncomeAboveInflation ? 'Poder de compra protegido' : 'Inflação vencendo'}
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

      {/* MODALS */}
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
                            {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                        className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all duration-300 animate-fade-in-up ${isActive ? 'bg-accent/5 shadow-sm scale-[1.01]' : 'bg-white dark:bg-[#0f172a]'}`}
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

      {/* MODAL GANHO REAL (RENDA VS INFLAÇÃO) - REVISADO */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
         <div className="px-4 py-2">
            <div className="flex items-center gap-3 px-2 mb-6 mt-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Scale className="w-5 h-5" strokeWidth={2} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Poder de Compra</h3>
            </div>
            
            <ModalTabs active={gainTab} onChange={setGainTab} tabs={[
                { id: 'benchmark', label: 'Benchmark' }, 
                { id: 'coverage', label: 'Cobertura' }, 
                { id: 'projection', label: 'Projeção' }
            ]} />
            
            {/* TAB 1: BENCHMARK (DY vs IPCA) */}
            {gainTab === 'benchmark' && (
                <div className="animate-fade-in space-y-6 mt-4">
                    <div className="bg-white dark:bg-[#0f172a] p-8 rounded-[3rem] text-center shadow-sm relative overflow-hidden">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Ganho Real (Yield)</p>
                        <div className={`text-6xl font-black tabular-nums tracking-tighter mb-4 ${isIncomeAboveInflation ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {isIncomeAboveInflation ? '+' : ''}{realIncomeYield.toFixed(2)}%
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide max-w-[200px] mx-auto">
                            Diferença entre seu retorno em dividendos e a inflação oficial.
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] h-64">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Dividendos vs IPCA</h4>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={benchmarkData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Taxa']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Bar 
                                    dataKey="value" 
                                    radius={[10, 10, 10, 10]} 
                                    barSize={40}
                                    animationDuration={1500}
                                >
                                  {
                                    benchmarkData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))
                                  }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TAB 2: COBERTURA (Tanque de Inflação) */}
            {gainTab === 'coverage' && (
                <div className="space-y-6 mt-4 animate-fade-in flex flex-col items-center">
                    <div className="h-64 w-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={coverageData}
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={6}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={8}
                                >
                                    {coverageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => formatBRL(value)}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Centro do Donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura</span>
                            <span className={`text-xl font-black tracking-tight ${inflationCoveragePercent >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {inflationCoveragePercent.toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    <div className="w-full space-y-4 px-2">
                        <div className="text-center">
                             <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide mb-2">O que isso significa?</h4>
                             <p className="text-[11px] text-slate-500 leading-relaxed">
                                {inflationCoveragePercent >= 100 
                                    ? `Excelente! Seus dividendos pagaram todo o custo da inflação (R$ ${formatBRL(inflationCostValue)}) e ainda sobrou R$ ${formatBRL(received - inflationCostValue)} para reinvestir com ganho real.`
                                    : `Atenção. A inflação corroeu R$ ${formatBRL(inflationCostValue)} do seu capital. Seus dividendos cobriram apenas uma parte. Reinvista tudo para recuperar o poder de compra.`
                                }
                             </p>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Custo Inflação</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatBRL(inflationCostValue)}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Dividendos</span>
                            <span className="text-sm font-bold text-emerald-500 tabular-nums">{formatBRL(received)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: PROJEÇÃO DE RENDA */}
            {gainTab === 'projection' && (
                <div className="space-y-6 mt-4 animate-fade-in">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[3rem] text-center text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                         <div className="relative z-10">
                             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                 <BarChart3 className="w-6 h-6 text-white" />
                             </div>
                             <h3 className="text-lg font-bold mb-2">Crescimento de Renda</h3>
                             <p className="text-[10px] text-indigo-100 font-medium leading-relaxed max-w-xs mx-auto">
                                 Estimativa de renda anual futura considerando reinvestimento e crescimento de 5% a.a.
                             </p>
                         </div>
                    </div>

                    <div className="h-64 w-full bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-4 shadow-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => formatBRL(value)}
                                    labelStyle={{ color: '#64748b', fontWeight: 700, fontSize: '12px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={accentColor} 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValue)" 
                                />
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                                    dy={10}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {projectionData.slice(1).map((proj, i) => (
                            <div key={proj.label} className="p-4 bg-slate-50 dark:bg-white/5 rounded-3xl">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{proj.label}</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                    {formatBRL(proj.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-4 py-2">
           <div className="flex items-center gap-3 px-2 mb-6 mt-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CircleDollarSign className="w-5 h-5" strokeWidth={2} /></div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Proventos</h3>
           </div>
           <ModalTabs active={incomeTab} onChange={setIncomeTab} tabs={[{ id: 'summary', label: 'Resumo' }, { id: 'magic', label: 'Metas' }, { id: 'calendar', label: 'Extrato' }]} />

           <div className="mt-6 pb-6">
                {incomeTab === 'summary' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-[2.5rem] text-center shadow-sm">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Média Mensal Estimada</p>
                            <p className="text-5xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{formatBRL(averageMonthly)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] text-center shadow-sm">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Total Recebido</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(received)}</p>
                            </div>
                            <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] text-center shadow-sm">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Futuro</p>
                                <p className="text-xl font-bold text-accent tabular-nums">{formatBRL(upcoming)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {incomeTab === 'magic' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-accent/5 p-6 rounded-[2rem] mb-4">
                             <div className="flex gap-2 items-center text-accent mb-2">
                                <Target className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wide">Magic Number</span>
                             </div>
                             <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Quantidade de cotas necessária para comprar uma nova cota apenas com os rendimentos mensais.</p>
                        </div>
                        {magicNumbers.map((m, i) => (
                            <div key={m.ticker} className="p-6 bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-sm animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
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
                                <div className={`p-5 rounded-[2rem] transition-all flex justify-between items-center ${isUpcoming ? 'bg-white dark:bg-[#0f172a] shadow-lg shadow-accent/5' : 'bg-white dark:bg-[#0f172a]'}`}>
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
