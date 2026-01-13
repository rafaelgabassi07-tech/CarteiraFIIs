
import React, { useMemo, useState, useEffect } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction, EvolutionPoint } from '../types';
import { CircleDollarSign, PieChart as PieIcon, TrendingUp, CalendarDays, TrendingDown, Banknote, ArrowRight, Loader2, Building2, CandlestickChart, Wallet, Calendar, Clock, Target, ArrowUpRight, ArrowDownRight, Layers, ChevronDown, ChevronUp, DollarSign, Scale, Percent, ShieldCheck, AlertOctagon, Info, Coins, Shield, BarChart3, LayoutGrid, Snowflake, Zap, History, LineChart, ChevronRight, Trophy, Repeat } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, ComposedChart, Line, Area, AreaChart } from 'recharts';
import { getHistoricalBatch } from '../services/brapiService';

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
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
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

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate = 0, invested, balance, totalAppreciation, transactions = [], privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealYieldModal, setShowRealYieldModal] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  // States para Evolução Patrimonial
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);
  const [isEvolutionLoading, setIsEvolutionLoading] = useState(false);

  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const totalProfitPercent = useMemo(() => invested > 0 ? (totalProfitValue / invested) * 100 : 0, [totalProfitValue, invested]);
  const isProfitPositive = totalProfitValue >= 0;

  // Calculos Avançados para o Modal de Patrimônio
  const advancedMetrics = useMemo(() => {
      // 1. Melhor Ativo (Maior Valorização Nominal)
      let bestAsset = { ticker: '-', gain: 0, percent: 0 };
      let portfolioAveragePrice = 0;
      let totalQty = 0;

      portfolio.forEach(p => {
          const gain = ((p.currentPrice || 0) - p.averagePrice) * p.quantity;
          const gainPercent = p.averagePrice > 0 ? (((p.currentPrice || 0) - p.averagePrice) / p.averagePrice) * 100 : 0;
          
          if (gain > bestAsset.gain) {
              bestAsset = { ticker: p.ticker, gain, percent: gainPercent };
          }
          portfolioAveragePrice += (p.currentPrice || 0) * p.quantity;
          totalQty += p.quantity;
      });
      
      // 3. Yield On Cost (Global)
      const yieldOnCost = invested > 0 ? (totalDividendsReceived / invested) * 100 : 0;

      // 4. Projeção 12 Meses (Baseado na média atual)
      const monthlyAvg = totalDividendsReceived / (new Date().getMonth() + 1 || 1);
      const projectedIncome = monthlyAvg * 12;

      return {
          bestAsset,
          yieldOnCost,
          projectedIncome
      };
  }, [portfolio, totalDividendsReceived, invested]);

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

  // Função para construir o gráfico de evolução
  const fetchEvolutionData = async () => {
      if (evolutionData.length > 0) return; // Já carregado
      if (transactions.length === 0) return;

      setIsEvolutionLoading(true);
      try {
          const tickers = Array.from(new Set(transactions.map(t => t.ticker)));
          // Busca histórico de 2 anos (ou 5 se precisar)
          const historyMap = await getHistoricalBatch(tickers, '2y', '1mo');
          
          // Constrói linha do tempo mensal
          const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
          const firstDate = new Date(sortedTxs[0].date);
          const now = new Date();
          const timeline: EvolutionPoint[] = [];
          
          let currentPointer = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
          
          while (currentPointer <= now) {
              const monthEnd = new Date(currentPointer.getFullYear(), currentPointer.getMonth() + 1, 0);
              const dateStr = monthEnd.toISOString().split('T')[0];
              const displayDate = `${monthEnd.getMonth() + 1}/${monthEnd.getFullYear().toString().slice(2)}`;
              
              // Filtra transações até o final deste mês
              const txsUntilNow = sortedTxs.filter(t => t.date <= dateStr);
              
              // Calcula Posição (Qty) e Preço Médio (Investido)
              const positionMap: Record<string, { qty: number, avg: number }> = {};
              
              txsUntilNow.forEach(t => {
                  if (!positionMap[t.ticker]) positionMap[t.ticker] = { qty: 0, avg: 0 };
                  const p = positionMap[t.ticker];
                  
                  if (t.type === 'BUY') {
                      p.avg = ((p.qty * p.avg) + (t.quantity * t.price)) / (p.qty + t.quantity);
                      p.qty += t.quantity;
                  } else {
                      p.qty -= t.quantity;
                  }
              });

              let totalInvested = 0;
              let totalPatrimony = 0;

              Object.entries(positionMap).forEach(([ticker, pos]) => {
                  if (pos.qty > 0.0001) {
                      totalInvested += pos.qty * pos.avg;
                      
                      // Busca preço histórico
                      const hist = historyMap[ticker]?.historicalDataPrice;
                      if (hist) {
                          // Encontra o preço mais próximo da data do loop
                          const targetTime = monthEnd.getTime() / 1000;
                          const closest = hist.reduce((prev, curr) => 
                              Math.abs(curr.date - targetTime) < Math.abs(prev.date - targetTime) ? curr : prev
                          );
                          totalPatrimony += pos.qty * closest.close;
                      } else {
                          // Fallback se não tiver histórico: usa preço médio (assume sem variação)
                          totalPatrimony += pos.qty * pos.avg;
                      }
                  }
              });

              if (totalInvested > 0) {
                  timeline.push({
                      rawDate: dateStr,
                      date: displayDate,
                      invested: totalInvested,
                      patrimony: totalPatrimony,
                      adjusted: 0, value: 0, monthlyInflationCost: 0 // Legacy fields ignored
                  });
              }

              currentPointer.setMonth(currentPointer.getMonth() + 1);
          }
          setEvolutionData(timeline);

      } catch (e) {
          console.error("Evolution Error", e);
      } finally {
          setIsEvolutionLoading(false);
      }
  };

  useEffect(() => {
      if (showEvolutionModal) {
          fetchEvolutionData();
      }
  }, [showEvolutionModal]);

  // Lógica Avançada de Histórico e Inflação (Desde o Início)
  const { history, average, maxVal, receiptsByMonth, realYieldMetrics } = useMemo(() => {
    const map: Record<string, number> = {};
    const receiptsByMonthMap: Record<string, DividendReceipt[]> = {};
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let sum12m = 0;

    // 1. Mapa de Dividendos Recebidos (Agregado por Mês)
    dividendReceipts.forEach(r => {
        const pDate = new Date(r.paymentDate + 'T00:00:00');
        if (r.paymentDate <= todayStr) {
            const key = r.paymentDate.substring(0, 7);
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsByMonthMap[key]) receiptsByMonthMap[key] = [];
            receiptsByMonthMap[key].push(r);
        }
        
        // Cálculo Renda 12m
        const diffMonths = (today.getFullYear() - pDate.getFullYear()) * 12 + (today.getMonth() - pDate.getMonth());
        if (diffMonths >= 0 && diffMonths <= 11) {
            sum12m += r.totalReceived;
        }
    });

    const sortedHistory = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    const totalMonthsWithReceipts = sortedHistory.length || 1;
    const average = received / (totalMonthsWithReceipts > 0 ? totalMonthsWithReceipts : 1);
    const maxVal = Math.max(...Object.values(map), 0);

    // 2. Timeline Completa (Desde a primeira transação)
    let timelineStart = new Date();
    timelineStart.setMonth(timelineStart.getMonth() - 11); // Fallback padrão
    
    if (transactions.length > 0) {
        // Encontra a data mais antiga
        const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
        if (sortedTxs[0]) {
            timelineStart = new Date(sortedTxs[0].date + 'T00:00:00');
        }
    }

    // Taxa de inflação mensal aproximada
    const monthlyInflationRate = Math.pow(1 + (inflationRate || 0)/100, 1/12) - 1;
    const fullHistoryData: any[] = [];
    
    let pointer = new Date(timelineStart);
    pointer.setDate(1); // Normaliza para o dia 1 do mês inicial
    
    const endPointer = new Date();
    endPointer.setDate(2); // Garante que o loop inclua o mês atual

    while (pointer <= endPointer) {
        const y = pointer.getFullYear();
        const m = String(pointer.getMonth() + 1).padStart(2, '0');
        const monthKey = `${y}-${m}`;
        
        // Calcular patrimônio investido ATÉ o final deste mês específico na iteração
        const lastDayOfMonth = new Date(y, pointer.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const investedAtMonth = transactions
            .filter(t => t.date <= lastDayOfMonth)
            .reduce((acc, t) => t.type === 'BUY' ? acc + (t.price * t.quantity) : acc - (t.price * t.quantity), 0);

        const monthlyDividends = map[monthKey] || 0;
        
        // Cálculos de Erosão
        const patrimonyErosion = investedAtMonth * monthlyInflationRate;
        const dividendErosion = monthlyDividends * monthlyInflationRate;
        
        const nominalYield = investedAtMonth > 0 ? (monthlyDividends / investedAtMonth) * 100 : 0;
        const inflationYield = monthlyInflationRate * 100;
        
        // --- Lógica para Gráfico Empilhado (Mesma Barra) ---
        
        const erosionPartPercent = Math.min(nominalYield, inflationYield);
        const realPartPercent = Math.max(0, nominalYield - inflationYield);

        if (investedAtMonth > 0 || monthlyDividends > 0) {
            fullHistoryData.push({
                monthKey,
                label: `${m}/${y.toString().substring(2)}`,
                fullLabel: `${m}/${y}`,
                invested: investedAtMonth,
                dividend: monthlyDividends,
                
                patrimonyErosion, // Valor monetário perdido do principal
                dividendErosion,  // Valor monetário perdido do dividendo
                realGainValue: monthlyDividends - patrimonyErosion, // Resultado Líquido Real (Dividendo - Perda Inflacionária do Principal)
                
                // Dados para o Gráfico
                nominalYield,
                inflationYield,
                erosionPartPercent,
                realPartPercent,
            });
        }

        pointer.setMonth(pointer.getMonth() + 1);
    }

    // Métricas Agregadas Atuais
    const currentDy = invested > 0 ? (sum12m / invested) * 100 : 0;
    const realReturn = currentDy - (inflationRate || 0);

    return { 
        history: sortedHistory, 
        average, 
        maxVal, 
        receiptsByMonth: receiptsByMonthMap,
        realYieldMetrics: { 
            userDy: currentDy, 
            realReturn, 
            timeline: fullHistoryData
        }
    };
  }, [dividendReceipts, received, invested, inflationRate, portfolio, transactions]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Reconstitui o Yield Nominal somando as partes para mostrar no tooltip
      const real = payload.find((p:any) => p.name === 'realPartPercent')?.value || 0;
      const erosion = payload.find((p:any) => p.name === 'erosionPartPercent')?.value || 0;
      const nominal = real + erosion;

      return (
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 min-w-[150px]">
           <p className="text-xs font-black text-zinc-900 dark:text-white mb-2">{label}</p>
           
           <div className="flex justify-between items-center gap-3 text-[10px] mb-1">
              <span className="font-bold text-zinc-500">Yield Nominal:</span>
              <span className="font-mono text-zinc-900 dark:text-white font-bold">{nominal.toFixed(2)}%</span>
           </div>
           
           <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1.5"></div>

           <div className="flex justify-between items-center gap-3 text-[10px] mb-1">
              <span className="font-bold text-rose-500">Inflação (IPCA):</span>
              <span className="font-mono text-rose-500">-{erosion.toFixed(2)}%</span>
           </div>
           <div className="flex justify-between items-center gap-3 text-[10px]">
              <span className="font-bold text-emerald-500">Ganho Real:</span>
              <span className="font-mono text-emerald-500">+{real.toFixed(2)}%</span>
           </div>
        </div>
      );
    }
    return null;
  };

  const EvolutionTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const invested = payload.find((p:any) => p.dataKey === 'invested')?.value || 0;
          const patrimony = payload.find((p:any) => p.dataKey === 'patrimony')?.value || 0;
          const diff = patrimony - invested;
          const diffPerc = invested > 0 ? (diff/invested)*100 : 0;

          return (
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 min-w-[160px]">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
               
               <div className="space-y-1 mb-2">
                   <div className="flex justify-between gap-3 text-xs">
                       <span className="font-bold text-emerald-600 dark:text-emerald-400">Patrimônio</span>
                       <span className="font-mono font-bold text-zinc-900 dark:text-white">{formatBRL(patrimony, privacyMode)}</span>
                   </div>
                   <div className="flex justify-between gap-3 text-xs">
                       <span className="font-bold text-zinc-500">Aportado</span>
                       <span className="font-mono font-medium text-zinc-500">{formatBRL(invested, privacyMode)}</span>
                   </div>
               </div>
               
               <div className={`pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                   <span className="text-[10px] font-bold uppercase">Resultado</span>
                   <div className="text-right">
                       <span className="block text-xs font-black">{formatBRL(diff, privacyMode)}</span>
                       <span className="block text-[9px] font-bold">{diffPerc > 0 ? '+' : ''}{diffPerc.toFixed(2)}%</span>
                   </div>
               </div>
            </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-3 pb-8">
      {/* 1. Patrimonio Total */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <button 
            onClick={() => setShowEvolutionModal(true)}
            className="w-full text-left bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-card dark:shadow-card-dark group press-effect"
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block flex items-center gap-2">
                    Patrimônio Total 
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
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
        </button>
      </div>

      {/* 2. Agenda */}
      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className="w-full text-left bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 shadow-card dark:shadow-card-dark">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
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
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mask-linear-fade">
                    {upcomingEvents.slice(0, 4).map((event, i) => {
                        const style = getEventStyle(event.eventType, event.date);
                        return (
                            <div key={i} className={`flex-shrink-0 p-2.5 pr-3.5 rounded-lg ${style.containerClass} min-w-[120px] anim-scale-in`} style={{ animationDelay: `${200 + (i * 50)}ms` }}>
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
                <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-center border border-zinc-200 dark:border-zinc-800 border-dashed">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Nenhum evento previsto para os próximos dias.</p>
                </div>
            )}
        </button>
      </div>
      
      {/* 3. Grid Buttons */}
      <div className="grid grid-cols-2 gap-3 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left press-effect hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full relative overflow-hidden shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mb-3 border border-emerald-100 dark:border-emerald-900/30">
                    <CircleDollarSign className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-0.5">Renda Passiva</span>
                <p className="text-base font-black text-zinc-900 dark:text-white tracking-tight leading-tight mb-0.5">{formatBRL(received, privacyMode)}</p>
                <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">Média: {formatBRL(average, privacyMode)}/mês</p>
            </div>
        </button>

        <button onClick={() => setShowAllocationModal(true)} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left press-effect hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between h-full shadow-card dark:shadow-card-dark">
            <div>
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-900/30">
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
            className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-card dark:shadow-card-dark relative overflow-hidden text-left press-effect group focus:outline-none"
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

             {/* Progress Bar Visual for Yield vs IPCA */}
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
                        <div key={i} className={`p-4 rounded-xl flex items-center justify-between anim-slide-up ${style.containerClass}`} style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm ${style.iconClass}`}>
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

      {/* MODAL DETALHADO DE INFLAÇÃO VS RENDA (REFORMULADO) */}
      <SwipeableModal isOpen={showRealYieldModal} onClose={() => setShowRealYieldModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-6 anim-slide-up">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/30">
                    <Scale className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Raio-X da Inflação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Histórico de Corrosão Financeira</p>
                </div>
             </div>

             {/* SEÇÃO 1: GRÁFICO EMPILHADO (UMA BARRA, DIVIDIDA) */}
             <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center justify-between mb-4 px-2">
                     <div className="flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                            Yield Nominal: Inflação (Vermelho) vs Real (Verde)
                        </h3>
                     </div>
                 </div>
                 
                 <div className="h-56 w-full overflow-x-auto no-scrollbar">
                    {/* Container com largura mínima para garantir que muitas barras não fiquem espremidas se o histórico for longo */}
                    <div style={{ minWidth: `${Math.max(100, realYieldMetrics.timeline.length * 50)}px`, height: '100%', outline: 'none' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={realYieldMetrics.timeline} 
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                barGap={2}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b33" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600, fill: '#71717a' }} tickLine={false} axisLine={false} interval={0} />
                                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#71717a' }} tickLine={false} axisLine={false} />
                                <RechartsTooltip cursor={{ fill: '#f4f4f5', opacity: 0.1 }} content={<CustomTooltip />} />
                                
                                {/* Stacked Bars: Same StackId makes them share the same bar */}
                                <Bar name="erosionPartPercent" dataKey="erosionPartPercent" stackId="a" fill="#f43f5e" radius={[0, 0, 3, 3]} barSize={28} />
                                <Bar name="realPartPercent" dataKey="realPartPercent" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="mt-2 flex items-center gap-4 justify-center">
                     <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div><span className="text-[9px] text-zinc-500 font-bold uppercase">Corrosão (IPCA)</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div><span className="text-[9px] text-zinc-500 font-bold uppercase">Ganho Real</span></div>
                 </div>
             </div>

             {/* SEÇÃO 2: HISTÓRICO DETALHADO (Tabela Técnica) */}
             <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 anim-slide-up mb-6 shadow-sm" style={{ animationDelay: '200ms' }}>
                 <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-zinc-400" />
                        <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Diário da Corrosão</h4>
                     </div>
                     <div className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">
                         IPCA Acumulado
                     </div>
                 </div>

                 {/* Sticky Header Table Layout */}
                 <div className="max-h-[400px] overflow-y-auto no-scrollbar relative">
                     <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-zinc-50/90 dark:bg-zinc-900/90 text-[9px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-widest sticky top-0 z-10 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
                         <span className="col-span-3">Período</span>
                         <span className="col-span-5 text-right">Inflação (R$)</span>
                         <span className="col-span-4 text-right">Real (R$)</span>
                     </div>
                     
                     <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {realYieldMetrics.timeline.slice().reverse().map((item: any, idx: number) => {
                             const totalLoss = item.patrimonyErosion + item.dividendErosion;
                             const isPositive = item.realGainValue >= 0;
                             
                             return (
                                 <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                     <div className="col-span-3 flex flex-col">
                                         <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 font-mono">{item.fullLabel}</span>
                                     </div>
                                     
                                     <div className="col-span-5 text-right flex flex-col justify-center">
                                         <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-transparent rounded px-1 -mr-1">
                                            -{formatBRL(totalLoss, privacyMode).replace('R$', '')}
                                         </span>
                                     </div>
                                     
                                     <div className="col-span-4 text-right flex justify-end items-center gap-1.5">
                                         <span className={`text-[11px] font-black font-mono ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                             {formatBRL(item.realGainValue, privacyMode).replace('R$', '')}
                                         </span>
                                         {isPositive ? 
                                            <ArrowUpRight className="w-3 h-3 text-emerald-500 opacity-50 group-hover:opacity-100" /> : 
                                            <ArrowDownRight className="w-3 h-3 text-rose-500 opacity-50 group-hover:opacity-100" />
                                         }
                                     </div>
                                 </div>
                             );
                        })}
                     </div>
                 </div>
             </div>

             <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-3 anim-fade-in">
                 <Info className="w-5 h-5 text-blue-500 shrink-0" />
                 <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                     <strong>Matemática da Corrosão:</strong> O gráfico exibe seu Yield Nominal mensal dividido. A parte vermelha representa a % que foi consumida pela inflação do período. A parte verde é o ganho real. A tabela acima detalha o valor monetário exato que a inflação retirou do seu patrimônio principal e dos seus dividendos mês a mês.
                 </p>
             </div>
         </div>
      </SwipeableModal>

      {/* MODAL DE EVOLUÇÃO PATRIMONIAL (Agora chamado de Patrimônio Total) */}
      <SwipeableModal isOpen={showEvolutionModal} onClose={() => setShowEvolutionModal(false)}>
          <div className="p-6 pb-20">
              <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      <LineChart className="w-6 h-6" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Patrimônio Total</h2>
                      <p className="text-xs text-zinc-500 font-medium">Evolução do Valor de Mercado</p>
                  </div>
              </div>

              {isEvolutionLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                      <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
                      <p className="text-xs font-bold text-zinc-500">Reconstruindo histórico...</p>
                  </div>
              ) : evolutionData.length > 0 ? (
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 anim-slide-up">
                      <div className="h-64 w-full" style={{ outline: 'none' }}>
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorPatrimony" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b33" />
                                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} minTickGap={30} />
                                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                                  <RechartsTooltip content={<EvolutionTooltip />} cursor={{ stroke: '#71717a', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                  
                                  {/* Linha de Aportes (Tracejada) */}
                                  <Area 
                                      type="monotone" 
                                      dataKey="invested" 
                                      stroke="#71717a" 
                                      strokeWidth={2} 
                                      strokeDasharray="4 4"
                                      fill="transparent" 
                                      activeDot={false}
                                  />
                                  
                                  {/* Montanha de Patrimônio */}
                                  <Area 
                                      type="monotone" 
                                      dataKey="patrimony" 
                                      stroke="#10b981" 
                                      strokeWidth={3} 
                                      fillOpacity={1} 
                                      fill="url(#colorPatrimony)" 
                                  />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                      
                      <div className="mt-4 flex justify-center gap-6">
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                              <span className="text-[10px] font-bold uppercase text-zinc-500">Patrimônio</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-1 bg-zinc-400 rounded-full"></div>
                              <span className="text-[10px] font-bold uppercase text-zinc-500">Total Aportado</span>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-20 text-zinc-400">
                      <p className="text-xs">Dados insuficientes para gerar histórico.</p>
                  </div>
              )}

              {/* DETALHAMENTO DE RESULTADO (YoC & Projection) */}
              <div className="mt-6 space-y-4 anim-slide-up" style={{ animationDelay: '100ms' }}>
                  
                  {/* GRID DE MÉTRICAS AVANÇADAS */}
                  <div className="grid grid-cols-2 gap-3">
                      {/* YoC */}
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden">
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block mb-1">Yield on Cost (YoC)</span>
                          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                              {formatPercent(advancedMetrics.yieldOnCost, privacyMode)}
                          </div>
                          <p className="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 font-medium mt-1">Retorno sobre custo real</p>
                      </div>

                      {/* Projeção Anual */}
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 relative overflow-hidden">
                          <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase block mb-1">Projeção 12m</span>
                          <div className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                              {formatBRL(advancedMetrics.projectedIncome, privacyMode)}
                          </div>
                          <p className="text-[9px] text-zinc-400 font-medium mt-1">Renda Passiva Estimada</p>
                      </div>
                  </div>
                  
                  {/* Top Asset Compact (Optional Context) */}
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                        <div>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase block mb-1">Carregador do Piano</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-black text-amber-700 dark:text-amber-300">{advancedMetrics.bestAsset.ticker}</span>
                                <span className="text-xs font-bold text-amber-600/70 dark:text-amber-400/70">+{formatPercent(advancedMetrics.bestAsset.percent)}</span>
                            </div>
                        </div>
                        <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
              </div>
          </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="p-6 pb-20">
             <div className="flex items-center gap-4 mb-8 anim-slide-up">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2>
                    <p className="text-xs text-zinc-500 font-medium">Histórico de Pagamentos</p>
                </div>
             </div>
             
             {/* HEADER GRID: TOTAL + AVERAGE */}
             <div className="grid grid-cols-2 gap-3 mb-6 anim-slide-up" style={{ animationDelay: '100ms' }}>
                 <div className="bg-emerald-500 p-5 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Recebido</p>
                     <p className="text-2xl font-black">{formatBRL(received, privacyMode)}</p>
                 </div>
                 <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700">
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
                                    className={`group rounded-xl transition-all duration-300 border overflow-hidden anim-slide-up ${isExpanded ? 'bg-white dark:bg-zinc-900 border-emerald-500 shadow-lg scale-[1.02] z-10' : 'bg-surface-light dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                    style={{ animationDelay: `${400 + (i * 50)}ms` }}
                                >
                                    <button 
                                        onClick={() => toggleMonthExpand(month)}
                                        className="w-full p-5 flex flex-col gap-2 relative"
                                    >
                                        <div className="w-full flex justify-between items-center relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors border border-zinc-100 dark:border-zinc-800 ${isExpanded ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
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
                                                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-700 transition-colors">
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
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <PieIcon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                    <p className="text-xs text-zinc-500 font-medium">Distribuição Visual</p>
                </div>
             </div>

             {/* GRÁFICO 1: CLASSES DE ATIVOS (DONUT) */}
             <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center gap-2 mb-2 px-2">
                     <LayoutGrid className="w-3 h-3 text-zinc-400" />
                     <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Por Classe
                     </h3>
                 </div>
                 
                 <div className="h-48 w-full relative" style={{ outline: 'none' }}>
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
                     <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                             <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">FIIs</span>
                         </div>
                         <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(typeData.fiis.percent, privacyMode)}</span>
                     </div>
                     <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
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
                <div className="mb-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 anim-slide-up shadow-sm" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <Layers className="w-3 h-3 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                            Por Segmento
                        </h3>
                    </div>
                    
                    <div className="h-56 w-full" style={{ outline: 'none' }}>
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
             <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '300ms' }}>
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
