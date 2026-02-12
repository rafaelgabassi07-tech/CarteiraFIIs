
import React, { useMemo, useState, useEffect } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Layers, Filter, Calendar, Wand2, Target, Sparkles, CheckCircle2, ChevronRight, Calculator } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis } from 'recharts';
import { fetchFutureAnnouncements } from '../services/dataService';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  inflationRate?: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  transactions?: Transaction[];
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
}

interface RadarEvent {
    id: string;
    ticker: string;
    type: string;
    eventType: 'PAYMENT' | 'DATACOM';
    date: string;
    amount: number;
    rate?: number;
}

interface HistoryItem {
    fullDate: string;
    name: string;
    value: number;
    year: number;
    monthIndex: number;
}

// Interface para o cálculo do Mágico
interface MagicData {
    ticker: string;
    currentPrice: number;
    magicNumber: number;
    owned: number;
    progress: number;
    monthlyYieldEst: number;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const CustomBarTooltip = ({ active, payload, label, privacyMode }: any) => { 
    if (active && payload && payload.length) { 
        const data = payload[0]; 
        return (
            <div className="bg-zinc-900/90 dark:bg-zinc-800/90 backdrop-blur-md p-2 rounded-xl shadow-xl border border-white/10 text-center min-w-[60px]">
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{label} {data.payload.year}</p>
                <p className="text-[10px] font-black text-white">{formatBRL(data.value, privacyMode)}</p>
            </div>
        ); 
    } 
    return null; 
};

// Item da Agenda - Compacto
const AgendaItem: React.FC<{ event: RadarEvent, privacyMode: boolean }> = ({ event, privacyMode }) => {
    const isDatacom = event.eventType === 'DATACOM';
    
    // Tratamento de data seguro
    let day = '--';
    let weekDay = '---';
    try {
        const dateObj = new Date(event.date + 'T12:00:00');
        if (!isNaN(dateObj.getTime())) {
            day = String(dateObj.getDate());
            weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        }
    } catch (e) {
        // Fallback silencioso
    }

    return (
        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-1.5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl ${isDatacom ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase leading-none">{weekDay}</span>
                    <span className={`text-sm font-black leading-tight ${isDatacom ? 'text-zinc-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{day}</span>
                </div>
                <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{event.ticker}</h4>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        {isDatacom ? 'Data Com' : `Pagamento ${event.type}`}
                    </p>
                </div>
            </div>
            {!isDatacom && (
                <div className="text-right">
                    <span className="block text-emerald-600 dark:text-emerald-400 font-black text-xs">
                        {formatBRL(event.amount, privacyMode)}
                    </span>
                </div>
            )}
        </div>
    );
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, invested, balance, totalAppreciation, transactions, privacyMode = false, onViewAsset }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  
  // Novos Estados
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  // Inicialização segura do objetivo mensal
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
      try {
          const saved = localStorage.getItem('investfiis_monthly_goal');
          const parsed = saved ? parseFloat(saved) : 1000;
          return isNaN(parsed) || parsed <= 0 ? 1000 : parsed;
      } catch { return 1000; }
  });
  
  // Filtros de Proventos
  const [proventosYear, setProventosYear] = useState<string>('ALL');
  const [proventosType, setProventosType] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');

  // Filtros de Agenda
  const [agendaFilter, setAgendaFilter] = useState<'ALL' | 'PAYMENT' | 'DATACOM'>('ALL');

  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);

  // Salvar Meta
  const handleSaveGoal = (val: string) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) {
          setMonthlyGoal(num);
          localStorage.setItem('investfiis_monthly_goal', String(num));
      }
  };

  // --- DADOS DO NÚMERO MÁGICO ---
  const magicData = useMemo(() => {
      const data: MagicData[] = [];
      portfolio.forEach(p => {
          if (p.dy_12m && p.dy_12m > 0 && p.currentPrice && p.currentPrice > 0) {
              // Estima dividendo mensal médio baseado no DY anual
              const annualYieldVal = p.currentPrice * (p.dy_12m / 100);
              const monthlyYieldEst = annualYieldVal / 12;
              
              if (monthlyYieldEst > 0) {
                  const magicNumber = Math.ceil(p.currentPrice / monthlyYieldEst);
                  data.push({
                      ticker: p.ticker,
                      currentPrice: p.currentPrice,
                      magicNumber,
                      owned: p.quantity,
                      progress: Math.min((p.quantity / magicNumber) * 100, 100),
                      monthlyYieldEst
                  });
              }
          }
      });
      // Ordena: Primeiro os atingidos (100%), depois os mais próximos
      return data.sort((a,b) => b.progress - a.progress);
  }, [portfolio]);

  const magicReachedCount = magicData.filter(m => m.progress >= 100).length;

  // --- DADOS DO RADAR (AGENDA) ---
  const [radarData, setRadarData] = useState<{
      events: RadarEvent[];
      loading: boolean;
  }>({ events: [], loading: true });

  useEffect(() => {
      let isActive = true;
      const runRadar = async () => {
          try {
              const predictions = await fetchFutureAnnouncements(portfolio);
              if (!isActive) return;

              const todayStr = new Date().toISOString().split('T')[0];
              const atomEvents: RadarEvent[] = [];
              const seenKeys = new Set<string>();

              const addEvent = (ticker: string, date: string, amount: number, rate: number, type: string, evtType: 'PAYMENT' | 'DATACOM') => {
                  const key = `${ticker}-${evtType}-${date}-${rate.toFixed(4)}`;
                  if (!seenKeys.has(key) && date >= todayStr) {
                      atomEvents.push({ id: key, ticker, type, eventType: evtType, date, amount, rate: rate }); 
                      seenKeys.add(key);
                  }
              };

              // Validador de data estrito (YYYY-MM-DD)
              const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

              dividendReceipts.forEach(r => {
                  if (r.paymentDate && isValidDate(r.paymentDate)) addEvent(r.ticker, r.paymentDate, r.totalReceived, r.rate, r.type, 'PAYMENT');
                  if (r.dateCom && isValidDate(r.dateCom)) addEvent(r.ticker, r.dateCom, 0, r.rate, r.type, 'DATACOM');
              });

              predictions.forEach(p => {
                  // Filtra datas "A Definir" ou inválidas vindas da API/Serviço
                  if (p.paymentDate && isValidDate(p.paymentDate)) {
                      addEvent(p.ticker, p.paymentDate, p.projectedTotal, p.rate, p.type, 'PAYMENT');
                  }
                  if (p.dateCom && isValidDate(p.dateCom)) {
                      addEvent(p.ticker, p.dateCom, 0, p.rate, p.type, 'DATACOM');
                  }
              });

              atomEvents.sort((a, b) => a.date.localeCompare(b.date));
              setRadarData({ events: atomEvents, loading: false });
          } catch (e) {
              console.error(e);
              if (isActive) setRadarData(prev => ({ ...prev, loading: false }));
          }
      };
      runRadar();
      return () => { isActive = false; };
  }, [portfolio, dividendReceipts]);

  // --- DADOS FILTRADOS DA AGENDA ---
  const filteredAgenda = useMemo(() => {
      let events = radarData.events;
      if (agendaFilter !== 'ALL') {
          events = events.filter(e => e.eventType === agendaFilter);
      }
      
      const totalConfirmed = events.reduce((acc, e) => e.eventType === 'PAYMENT' ? acc + e.amount : acc, 0);
      
      const grouped: Record<string, RadarEvent[]> = {};
      events.forEach(ev => {
          try {
              const d = new Date(ev.date + 'T12:00:00');
              const monthKey = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              const keyCap = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
              if (!grouped[keyCap]) grouped[keyCap] = [];
              grouped[keyCap].push(ev);
          } catch {
              // Ignora datas que falham na formatação
          }
      });

      return { grouped, totalConfirmed, count: events.length };
  }, [radarData.events, agendaFilter]);

  // --- DADOS DE ALOCAÇÃO ---
  const { typeData, classChartData, sectorChartData } = useMemo(() => {
      let fiisTotal = 0; let stocksTotal = 0;
      const enriched = (portfolio || []).map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val; else stocksTotal += val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      
      const classChartData = [
          { name: 'FIIs', value: fiisTotal, color: '#6366f1', percent: (fiisTotal / total) * 100 }, 
          { name: 'Ações', value: stocksTotal, color: '#0ea5e9', percent: (stocksTotal / total) * 100 }
      ].filter(d => d.value > 0);
      
      const sectorMap: Record<string, number> = {};
      enriched.forEach(p => { const s = p.segment || 'Outros'; sectorMap[s] = (sectorMap[s] || 0) + p.totalValue; });
      const sectorChartData = Object.entries(sectorMap)
          .map(([name, value], i) => ({ name, value, percent: (value / total) * 100, color: CHART_COLORS[i % CHART_COLORS.length] }))
          .sort((a,b) => b.value - a.value);
      
      return { typeData: { total }, classChartData, sectorChartData };
  }, [portfolio]);

  // --- DADOS DE PROVENTOS (FILTRADOS) ---
  const { chartData, groupedProventos, proventosTotal, proventosAverage, availableYears } = useMemo(() => {
      const filteredReceipts = dividendReceipts.filter(r => {
          return proventosType === 'ALL' || 
              (proventosType === 'FII' && r.assetType === AssetType.FII) ||
              (proventosType === 'STOCK' && r.assetType === AssetType.STOCK);
      });

      const yearsSet = new Set(filteredReceipts.map(r => r.paymentDate.substring(0, 4)));
      const years = Array.from(yearsSet).sort().reverse();

      const displayReceipts = filteredReceipts.filter(r => {
          return proventosYear === 'ALL' || r.paymentDate.startsWith(proventosYear);
      });

      const total = displayReceipts.reduce((acc, r) => acc + r.totalReceived, 0);
      
      let average = 0;
      if (displayReceipts.length > 0) {
          const months = new Set(displayReceipts.map(r => r.paymentDate.substring(0, 7))).size;
          average = total / (months || 1);
      }

      const grouped: Record<string, { items: DividendReceipt[], total: number }> = {};
      displayReceipts.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).forEach(r => {
          const d = new Date(r.paymentDate + 'T12:00:00');
          const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          const keyCap = key.charAt(0).toUpperCase() + key.slice(1);
          if (!grouped[keyCap]) grouped[keyCap] = { items: [], total: 0 };
          grouped[keyCap].items.push(r);
          grouped[keyCap].total += r.totalReceived;
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const monthlySum: Record<string, number> = {};
      filteredReceipts.forEach(r => {
          if (r.paymentDate && r.paymentDate <= todayStr) {
              const key = r.paymentDate.substring(0, 7); 
              monthlySum[key] = (monthlySum[key] || 0) + r.totalReceived;
          }
      });

      const fullHistory: HistoryItem[] = Object.keys(monthlySum).sort().map(date => {
          const d = new Date(date + '-02'); 
          return {
              fullDate: date,
              name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
              value: monthlySum[date],
              year: d.getFullYear(),
              monthIndex: d.getMonth()
          };
      });

      return { 
          chartData: fullHistory.slice(-12),
          groupedProventos: grouped,
          proventosTotal: total,
          proventosAverage: average,
          availableYears: years
      };
  }, [dividendReceipts, proventosType, proventosYear]);

  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
  
  // Proteção contra NaN no progresso da meta
  const safeAverage = proventosAverage || 0;
  const safeGoal = monthlyGoal || 1; 
  const goalProgress = Math.min((safeAverage / safeGoal) * 100, 100);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Card Principal (Patrimônio Detalhado) */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 anim-scale-in group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>

          <div className="relative z-10 flex flex-col items-center text-center mb-6">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3 h-3" /> Patrimônio Líquido
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                  {formatBRL(balance, privacyMode)}
              </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" /> Investido
                  </p>
                  <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(invested, privacyMode)}</p>
              </div>
              
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" /> Retorno Total
                  </p>
                  <div className={`flex items-baseline gap-1 ${totalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <span className="text-sm font-black">{totalReturnPercent > 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%</span>
                  </div>
              </div>

              <div className="col-span-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center px-5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                   <div className="text-left">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Valorização</p>
                        <p className={`text-xs font-black ${totalAppreciation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {totalAppreciation > 0 ? '+' : ''}{formatBRL(totalAppreciation, privacyMode)}
                        </p>
                   </div>
                   <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2"></div>
                   <div className="text-right">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Proventos</p>
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            {formatBRL(totalDividendsReceived, privacyMode)}
                        </p>
                   </div>
              </div>
          </div>
      </div>

      {/* 2. Grid de Ações Rápidas (Agora com Nº Mágico e Objetivo) */}
      <div className="grid grid-cols-2 gap-4 anim-slide-up">
          
          {/* Agenda Card - Vertical */}
          <button onClick={() => setShowAgendaModal(true)} className="bg-indigo-600 dark:bg-indigo-600 text-white rounded-[2rem] p-6 shadow-lg shadow-indigo-600/20 relative overflow-hidden group press-effect h-44 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><CalendarClock className="w-24 h-24" /></div>
              
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm z-10"><CalendarClock className="w-5 h-5" /></div>
              
              <div className="relative z-10 text-left">
                  <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black tracking-tighter">{radarData.events.length}</span>
                      <span className="text-xs font-bold opacity-60 uppercase">Eventos</span>
                  </div>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">Próximos pagamentos e datas com previstos.</p>
              </div>
          </button>

          <div className="flex flex-col gap-4 h-44">
              {/* Proventos - Horizontal Small */}
              <button onClick={() => setShowProventosModal(true)} className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden group flex flex-col justify-center">
                  <div className="absolute right-3 top-3 opacity-5 dark:opacity-10"><CircleDollarSign className="w-12 h-12 text-emerald-500" /></div>
                  <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><CircleDollarSign className="w-5 h-5" /></div>
                      <div className="text-left">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Proventos</span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white truncate block">{formatBRL(totalDividendsReceived, privacyMode)}</span>
                      </div>
                  </div>
              </button>

              {/* Alocação - Horizontal Small */}
              <button onClick={() => setShowAllocationModal(true)} className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden group flex flex-col justify-center">
                  <div className="absolute right-3 top-3 opacity-5 dark:opacity-10"><PieIcon className="w-12 h-12 text-blue-500" /></div>
                  <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><PieIcon className="w-5 h-5" /></div>
                      <div className="text-left">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Carteira</span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white truncate block">{classChartData.length} Classes</span>
                      </div>
                  </div>
              </button>
          </div>

          {/* NOVOS CARDS: Nº Mágico & Objetivo */}
          
          {/* Nº Mágico */}
          <button onClick={() => setShowMagicModal(true)} className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden group h-32 flex flex-col justify-between">
              <div className="absolute top-2 right-2 opacity-5 dark:opacity-10 text-purple-500"><Wand2 className="w-16 h-16" /></div>
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
              <div className="text-left relative z-10">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Nº Mágico</span>
                  <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">{magicReachedCount}</span>
                      <span className="text-[9px] font-bold text-zinc-500">atingidos</span>
                  </div>
              </div>
          </button>

          {/* Objetivo */}
          <button onClick={() => setShowGoalModal(true)} className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden group h-32 flex flex-col justify-between">
              <div className="absolute top-2 right-2 opacity-5 dark:opacity-10 text-amber-500"><Target className="w-16 h-16" /></div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><Target className="w-5 h-5" /></div>
              <div className="text-left relative z-10 w-full">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Meta Mensal</span>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${goalProgress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white float-right">{goalProgress.toFixed(0)}%</span>
              </div>
          </button>
      </div>

      {/* 3. Modal da Agenda */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-4 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
            <div className="pt-2 mb-4">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Próximos Eventos</p>
                    </div>
                    {radarData.loading && <div className="text-[9px] font-bold text-zinc-400 animate-pulse uppercase tracking-widest">Atualizando...</div>}
                </div>

                {/* Filtros de Aba Compactos */}
                <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                    {[{id:'ALL', label:'Todos'}, {id:'PAYMENT', label:'Pagamentos'}, {id:'DATACOM', label:'Data Com'}].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setAgendaFilter(tab.id as any)}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${agendaFilter === tab.id ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Totalizador Filtrado Compacto */}
            {filteredAgenda.totalConfirmed > 0 && agendaFilter !== 'DATACOM' && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 text-white mb-6 shadow-lg shadow-emerald-500/20 flex justify-between items-center">
                    <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">Confirmado</p>
                    <p className="text-2xl font-black tracking-tighter">{formatBRL(filteredAgenda.totalConfirmed, privacyMode)}</p>
                </div>
            )}

            <div className="space-y-4">
                {Object.keys(filteredAgenda.grouped).length === 0 && !radarData.loading ? (
                    <div className="text-center py-20 opacity-40">
                        <CalendarClock className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                        <p className="text-xs font-bold text-zinc-500">Nenhum evento encontrado</p>
                    </div>
                ) : (
                    Object.keys(filteredAgenda.grouped).map(monthKey => (
                        <div key={monthKey}>
                            <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 sticky top-0 bg-[#F2F2F2] dark:bg-black py-2 z-10">{monthKey}</h3>
                            {filteredAgenda.grouped[monthKey].map(event => (
                                <AgendaItem key={event.id} event={event} privacyMode={privacyMode} />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
      </SwipeableModal>

      {/* 4. Modal de Proventos */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="px-4 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             
             {/* Header com Totais Compacto */}
             <div className="flex flex-col pt-2 pb-2">
                 <div className="flex justify-between items-end mb-3 px-1">
                     <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Total Recebido</p>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                            {formatBRL(proventosTotal, privacyMode)}
                        </h2>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Média Mensal</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {formatBRL(proventosAverage, privacyMode)}
                        </p>
                     </div>
                 </div>

                 {/* Filtros Compactos */}
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                     <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-0.5 rounded-lg shrink-0">
                        {['ALL', 'FII', 'STOCK'].map(t => (
                            <button key={t} onClick={() => setProventosType(t as any)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${proventosType === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>
                                {t === 'ALL' ? 'Todos' : t === 'FII' ? 'FIIs' : 'Ações'}
                            </button>
                        ))}
                     </div>
                     
                     <div className="relative shrink-0">
                        <select 
                            value={proventosYear} 
                            onChange={(e) => setProventosYear(e.target.value)}
                            className="appearance-none bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white pl-3 pr-6 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none border-none h-full"
                        >
                            <option value="ALL">Total</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Calendar className="w-2.5 h-2.5 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                     </div>
                 </div>
             </div>

             {/* Gráfico Compacto (Altura reduzida) */}
             {chartData.length > 0 && (
                 <div className="h-32 w-full mt-2 mb-4 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#a1a1aa', fontWeight: 700 }} dy={5} interval={0} />
                             <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomBarTooltip privacyMode={privacyMode} />} />
                             <Bar dataKey="value" radius={[3, 3, 3, 3]}>
                                 {chartData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={'#10b981'} />
                                 ))}
                             </Bar>
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
             )}
             
             {/* Lista Agrupada Compacta */}
             <div className="space-y-4">
                 {Object.keys(groupedProventos).length === 0 ? (
                     <div className="text-center py-10 opacity-40">
                         <p className="text-xs font-bold text-zinc-500">Sem proventos neste período</p>
                     </div>
                 ) : (
                     Object.keys(groupedProventos).map(monthKey => (
                         <div key={monthKey}>
                             <div className="flex justify-between items-center mb-2 ml-1 sticky top-0 bg-[#F2F2F2] dark:bg-black py-2 z-10">
                                 <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{monthKey}</h3>
                                 <span className="text-[9px] font-black text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                     {formatBRL(groupedProventos[monthKey].total, privacyMode)}
                                 </span>
                             </div>
                             
                             <div className="space-y-1.5">
                                 {groupedProventos[monthKey].items.map((r, idx) => (
                                     <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                         <div className="flex items-center gap-3">
                                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black ${r.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                                 {r.ticker.substring(0, 2)}
                                             </div>
                                             <div>
                                                 <span className="block font-bold text-zinc-900 dark:text-white text-xs">{r.ticker}</span>
                                                 <span className="text-[8px] text-zinc-400 font-bold uppercase">{r.type} • {new Date(r.paymentDate).getDate()}</span>
                                             </div>
                                         </div>
                                         <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                             {formatBRL(r.totalReceived, privacyMode)}
                                         </span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     ))
                 )}
             </div>
         </div>
      </SwipeableModal>

      {/* 5. Modal de Alocação */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-4 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             <div className="flex items-center gap-3 mb-4 px-1 pt-2">
                 <div className="w-10 h-10 bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <PieIcon className="w-5 h-5" />
                 </div>
                 <div>
                     <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Raio-X de Diversificação</p>
                 </div>
             </div>

             <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-xl flex gap-1 mb-4">
                 {['CLASS', 'SECTOR'].map(t => (
                     <button key={t} onClick={() => { setAllocationTab(t as any); setActiveIndexClass(undefined); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                        {t === 'CLASS' ? 'Por Classe' : 'Por Setor'}
                     </button>
                 ))}
             </div>

             <div className="space-y-4">
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={allocationTab === 'CLASS' ? classChartData : sectorChartData} 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={4} 
                                cornerRadius={6} 
                                dataKey="value" 
                                stroke="none" 
                                onClick={(_, index) => setActiveIndexClass(prev => prev === index ? undefined : index)}
                            >
                                {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.color} 
                                        stroke={activeIndexClass === index ? 'rgba(255,255,255,0.5)' : 'none'} 
                                        strokeWidth={activeIndexClass === index ? 3 : 0} 
                                        className="transition-all duration-300 cursor-pointer"
                                        style={{ filter: activeIndexClass !== undefined && activeIndexClass !== index ? 'opacity(0.3)' : 'opacity(1)' }}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 max-w-[120px] text-center truncate px-2">
                            {activeIndexClass !== undefined ? (allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].name : 'Total'}
                        </span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            {activeIndexClass !== undefined 
                                ? `${(allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].percent.toFixed(1)}%` 
                                : formatBRL(typeData.total, privacyMode)}
                        </span>
                    </div>
                 </div>

                 <div className="space-y-2">
                     {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((item, index) => (
                         <div 
                            key={index} 
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${activeIndexClass === index ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 scale-[1.02] shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm opacity-90'}`}
                            onClick={() => setActiveIndexClass(prev => prev === index ? undefined : index)}
                         >
                             <div className="flex items-center gap-3">
                                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                 <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{item.name}</span>
                             </div>
                             <div className="text-right">
                                 <span className="block text-xs font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                 <span className="text-[9px] font-bold text-zinc-400">{item.percent.toFixed(1)}%</span>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      </SwipeableModal>

      {/* 6. Modal do Nº Mágico */}
      <SwipeableModal isOpen={showMagicModal} onClose={() => setShowMagicModal(false)}>
         <div className="px-4 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             <div className="flex items-center gap-3 mb-4 px-1 pt-2">
                 <div className="w-10 h-10 bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <Wand2 className="w-5 h-5" />
                 </div>
                 <div>
                     <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Número Mágico</h2>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Bola de Neve</p>
                 </div>
             </div>

             <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 mb-6">
                 <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                     O <span className="font-bold text-purple-600 dark:text-purple-400">Número Mágico</span> é a quantidade de cotas necessárias para que os dividendos mensais comprem 1 nova cota automaticamente.
                 </p>
             </div>

             <div className="space-y-3">
                 {magicData.map((asset) => {
                     const isReached = asset.progress >= 100;
                     return (
                         <div key={asset.ticker} className={`p-4 rounded-2xl border shadow-sm transition-all relative overflow-hidden ${isReached ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-transparent text-white' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
                             {isReached && <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>}
                             
                             <div className="flex justify-between items-start mb-2 relative z-10">
                                 <div className="flex items-center gap-2">
                                     <span className={`text-sm font-black ${isReached ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>{asset.ticker}</span>
                                     {isReached && <CheckCircle2 className="w-4 h-4 text-white/80" />}
                                 </div>
                                 <span className={`text-[10px] font-bold uppercase ${isReached ? 'text-white/80' : 'text-zinc-400'}`}>
                                     Faltam {Math.max(0, asset.magicNumber - asset.owned)} cotas
                                 </span>
                             </div>

                             <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden mb-2 relative z-10">
                                 <div 
                                     className={`h-full rounded-full transition-all duration-500 ${isReached ? 'bg-white' : 'bg-purple-500'}`} 
                                     style={{ width: `${Math.min(asset.progress, 100)}%` }}
                                 ></div>
                             </div>

                             <div className="flex justify-between items-center text-[10px] font-medium relative z-10">
                                 <span className={isReached ? 'text-white/80' : 'text-zinc-500'}>
                                     Atual: {asset.owned} cotas
                                 </span>
                                 <span className={isReached ? 'text-white' : 'text-zinc-900 dark:text-white font-bold'}>
                                     Meta: {asset.magicNumber}
                                 </span>
                             </div>
                         </div>
                     );
                 })}
             </div>
         </div>
      </SwipeableModal>

      {/* 7. Modal de Objetivo */}
      <SwipeableModal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)}>
         <div className="px-4 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             <div className="flex items-center gap-3 mb-6 px-1 pt-2">
                 <div className="w-10 h-10 bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <Target className="w-5 h-5" />
                 </div>
                 <div>
                     <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Objetivo de Renda</h2>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Liberdade Financeira</p>
                 </div>
             </div>

             <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 text-center mb-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800">
                     <div className="h-full bg-gradient-to-r from-amber-400 to-orange-600 transition-all duration-1000 ease-out" style={{ width: `${goalProgress}%` }}></div>
                 </div>
                 
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2 mb-1">Média Mensal Atual</p>
                 <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">{formatBRL(proventosAverage, privacyMode)}</h3>
                 
                 <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase">Progresso</span>
                     <span className="text-sm font-black text-amber-600 dark:text-amber-400">{goalProgress.toFixed(1)}%</span>
                 </div>
             </div>

             <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                 <div className="flex items-center gap-3 mb-3">
                     <Calculator className="w-4 h-4 text-zinc-400" />
                     <label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Definir Meta Mensal</label>
                 </div>
                 <div className="flex items-center gap-2 border-b-2 border-zinc-100 dark:border-zinc-800 pb-2 focus-within:border-amber-500 transition-colors">
                     <span className="text-lg font-bold text-zinc-400">R$</span>
                     <input 
                        type="number" 
                        value={monthlyGoal} 
                        onChange={(e) => handleSaveGoal(e.target.value)}
                        className="w-full bg-transparent text-2xl font-black text-zinc-900 dark:text-white outline-none placeholder:text-zinc-300"
                        placeholder="0,00"
                     />
                 </div>
                 <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                     Defina quanto você deseja receber mensalmente em dividendos. O progresso será calculado com base na média dos últimos 12 meses.
                 </p>
             </div>
         </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
