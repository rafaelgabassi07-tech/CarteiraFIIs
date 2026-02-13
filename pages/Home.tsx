import React, { useMemo, useState, useEffect } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Layers, Filter, Calendar, Wand2, Target, Sparkles, CheckCircle2, ChevronRight, Calculator, PiggyBank, Coins, Banknote, AlertCircle } from 'lucide-react';
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

interface MagicData {
    ticker: string;
    currentPrice: number;
    magicNumber: number;
    owned: number;
    progress: number;
    monthlyYieldEst: number;
    costToReach: number;
    dy12m: number;
    isFII: boolean;
}

const formatBRL = (val: any, privacy: boolean = false): string => {
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
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{String(label)} {data.payload.year}</p>
                <p className="text-[10px] font-black text-white">{formatBRL(data.value, privacyMode)}</p>
            </div>
        ); 
    } 
    return null; 
};

interface ProventosChartProps {
    data: HistoryItem[];
    hideValues: boolean;
}

function ProventosChart({ data, hideValues }: ProventosChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fill: '#a1a1aa', fontWeight: 700 }} 
                    dy={5} 
                    interval={0} 
                />
                <RechartsTooltip 
                    cursor={{fill: 'transparent'}} 
                    content={<CustomBarTooltip privacyMode={hideValues} />} 
                />
                <Bar dataKey="value" radius={[3, 3, 3, 3]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={'#10b981'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

interface AgendaItemProps {
    event: RadarEvent;
    hideValues: boolean;
}

const AgendaItem: React.FC<AgendaItemProps> = ({ event, hideValues }) => {
    const isDatacom = event.eventType === 'DATACOM';
    
    let day = '--';
    let weekDay = '---';
    try {
        const dateObj = new Date(event.date + 'T12:00:00');
        if (!isNaN(dateObj.getTime())) {
            day = String(dateObj.getDate());
            weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        }
    } catch (e) {
        // Fallback
    }

    const isPendingDate = event.date.startsWith('19') || event.date === '9999-99-99' || event.date === 'A Definir';

    return (
        <div className={`flex items-center justify-between p-3 rounded-2xl border mb-1.5 shadow-sm transition-all ${isDatacom ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
            <div className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl ${isDatacom ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500' : isPendingDate ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                    <span className="text-[8px] font-bold uppercase leading-none opacity-80">{isPendingDate ? '??' : weekDay}</span>
                    <span className="text-sm font-black leading-tight">{isPendingDate ? '--' : day}</span>
                </div>
                <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{event.ticker}</h4>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isDatacom ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                            {isDatacom ? 'Data Com' : event.type}
                        </span>
                        {isPendingDate && !isDatacom && <span className="text-[8px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-1 rounded">A Definir</span>}
                    </div>
                </div>
            </div>
            {!isDatacom && (
                <div className="text-right">
                    <span className="block text-emerald-600 dark:text-emerald-400 font-black text-xs">
                        {formatBRL(event.amount, hideValues)}
                    </span>
                    <span className="text-[9px] text-zinc-400">Total Previsto</span>
                </div>
            )}
        </div>
    );
};

const HomeComponent = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, invested, balance, totalAppreciation, transactions, privacyMode = false, onViewAsset }: HomeProps) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  
  // Garantia absoluta de booleano
  const isPrivacyActive = !!privacyMode;
  
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTab, setGoalTab] = useState<'INCOME' | 'WEALTH'>('INCOME');
  
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
      try {
          const saved = localStorage.getItem('investfiis_monthly_goal');
          const parsed = saved ? parseFloat(saved) : 1000;
          return isNaN(parsed) || parsed <= 0 ? 1000 : parsed;
      } catch { return 1000; }
  });

  const [patrimonyGoal, setPatrimonyGoal] = useState<number>(() => {
      try {
          const saved = localStorage.getItem('investfiis_patrimony_goal');
          const parsed = saved ? parseFloat(saved) : 100000; 
          return isNaN(parsed) || parsed <= 0 ? 100000 : parsed;
      } catch { return 100000; }
  });
  
  const [proventosYear, setProventosYear] = useState<string>('ALL');
  const [proventosType, setProventosType] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');
  const [agendaFilter, setAgendaFilter] = useState<'ALL' | 'PAYMENT' | 'DATACOM'>('ALL');
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, ''); 
      const numericValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
      
      if (goalTab === 'INCOME') {
          setMonthlyGoal(numericValue);
          localStorage.setItem('investfiis_monthly_goal', String(numericValue));
      } else {
          setPatrimonyGoal(numericValue);
          localStorage.setItem('investfiis_patrimony_goal', String(numericValue));
      }
  };

  const formattedGoalValue = useMemo(() => {
      const val = goalTab === 'INCOME' ? monthlyGoal : patrimonyGoal;
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }, [goalTab, monthlyGoal, patrimonyGoal]);

  const magicData = useMemo(() => {
      const data: MagicData[] = [];
      portfolio.forEach(p => {
          if (p.currentPrice && p.currentPrice > 0 && p.dy_12m && p.dy_12m > 0) {
              const annualYieldVal = p.currentPrice * (p.dy_12m / 100);
              const monthlyYieldEst = annualYieldVal / 12;
              
              if (monthlyYieldEst > 0) {
                  const magicNumber = Math.ceil(p.currentPrice / monthlyYieldEst);
                  if (magicNumber < 200000) {
                      const missing = Math.max(0, magicNumber - p.quantity);
                      data.push({
                          ticker: p.ticker,
                          currentPrice: p.currentPrice,
                          magicNumber,
                          owned: p.quantity,
                          progress: Math.min((p.quantity / magicNumber) * 100, 100),
                          monthlyYieldEst,
                          costToReach: missing * p.currentPrice,
                          dy12m: p.dy_12m,
                          isFII: p.assetType === AssetType.FII
                      });
                  }
              }
          }
      });
      return data.sort((a,b) => b.progress - a.progress);
  }, [portfolio]);

  const magicReachedCount = magicData.filter(m => m.progress >= 100).length;
  const totalCostToReachAll = magicData.reduce((acc, curr) => acc + curr.costToReach, 0);

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
                  if (!seenKeys.has(key)) {
                      const isFuture = date >= todayStr || date.startsWith('9999') || date === 'A Definir';
                      if (isFuture) {
                          atomEvents.push({ id: key, ticker, type, eventType: evtType, date, amount, rate: rate }); 
                          seenKeys.add(key);
                      }
                  }
              };

              const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

              dividendReceipts.forEach(r => {
                  if (r.paymentDate && isValidDate(r.paymentDate) && r.paymentDate >= todayStr) {
                      addEvent(r.ticker, r.paymentDate, r.totalReceived, r.rate, r.type, 'PAYMENT');
                  }
                  if (r.dateCom && isValidDate(r.dateCom) && r.dateCom >= todayStr) {
                      addEvent(r.ticker, r.dateCom, 0, r.rate, r.type, 'DATACOM');
                  }
              });

              predictions.forEach(p => {
                  const payDate = (p.paymentDate && p.paymentDate !== 'A Definir') ? p.paymentDate : '9999-99-99';
                  addEvent(p.ticker, payDate, p.projectedTotal, p.rate, p.type, 'PAYMENT');
                  
                  if (p.dateCom && p.dateCom !== 'Já ocorreu') {
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

  const filteredAgenda = useMemo(() => {
      let events = radarData.events;
      if (agendaFilter !== 'ALL') {
          events = events.filter(e => e.eventType === agendaFilter);
      }
      
      const totalConfirmed = events.reduce((acc, e) => e.eventType === 'PAYMENT' ? acc + e.amount : acc, 0);
      
      const grouped: Record<string, RadarEvent[]> = {};
      events.forEach(ev => {
          try {
              let keyCap = 'A Definir';
              if (ev.date !== '9999-99-99' && ev.date !== 'A Definir' && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
                  const d = new Date(ev.date + 'T12:00:00');
                  if (!isNaN(d.getTime())) {
                      const monthKey = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      keyCap = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
                  }
              }
              if (!grouped[keyCap]) grouped[keyCap] = [];
              grouped[keyCap].push(ev);
          } catch {}
      });

      return { grouped, totalConfirmed, count: events.length };
  }, [radarData.events, agendaFilter]);

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

  const { chartData, groupedProventos, proventosTotal, proventosAverage, availableYears } = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const filteredReceipts = dividendReceipts.filter(r => {
          if (!r.paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(r.paymentDate)) return false;
          if (r.paymentDate > todayStr) return false;
          
          let isTypeMatch = true;
          if (proventosType === 'FII') {
              isTypeMatch = r.assetType === AssetType.FII || (r.ticker && (r.ticker.endsWith('11') || r.ticker.endsWith('11B')));
          } else if (proventosType === 'STOCK') {
              isTypeMatch = r.assetType === AssetType.STOCK || (r.ticker && !r.ticker.endsWith('11') && !r.ticker.endsWith('11B'));
          }
          return isTypeMatch;
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
          try {
              const d = new Date(r.paymentDate + 'T12:00:00');
              if (isNaN(d.getTime())) return;
              const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              const keyCap = key.charAt(0).toUpperCase() + key.slice(1);
              if (!grouped[keyCap]) grouped[keyCap] = { items: [], total: 0 };
              grouped[keyCap].items.push(r);
              grouped[keyCap].total += r.totalReceived;
          } catch {}
      });

      const monthlySum: Record<string, number> = {};
      filteredReceipts.forEach(r => {
          const key = r.paymentDate.substring(0, 7); 
          monthlySum[key] = (monthlySum[key] || 0) + r.totalReceived;
      });

      const fullHistory: HistoryItem[] = Object.keys(monthlySum).sort().map(date => {
          const [year, month] = date.split('-').map(Number);
          const d = new Date(year, month - 1, 2, 12, 0, 0);
          let monthName = '---';
          try {
              if (!isNaN(d.getTime())) monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
          } catch {}
          return { fullDate: date, name: monthName, value: monthlySum[date], year: year, monthIndex: month - 1 };
      });

      return { chartData: fullHistory.slice(-12), groupedProventos: grouped, proventosTotal: total, proventosAverage: average, availableYears: years };
  }, [dividendReceipts, proventosType, proventosYear]);

  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
  
  const safeAverage = proventosAverage || 0;
  const safeIncomeGoal = monthlyGoal || 1; 
  const incomeProgress = Math.min((safeAverage / safeIncomeGoal) * 100, 100);

  const safePatrimonyGoal = patrimonyGoal || 1;
  const patrimonyProgress = Math.min((balance / safePatrimonyGoal) * 100, 100);

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 anim-scale-in group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>

          <div className="relative z-10 flex flex-col items-center text-center mb-6">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3 h-3" /> Patrimônio Líquido
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                  {formatBRL(balance, isPrivacyActive)}
              </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" /> Investido
                  </p>
                  <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(invested, isPrivacyActive)}</p>
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
                            {totalAppreciation > 0 ? '+' : ''}{formatBRL(totalAppreciation, isPrivacyActive)}
                        </p>
                   </div>
                   <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2"></div>
                   <div className="text-right">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Proventos</p>
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            {formatBRL(totalDividendsReceived, isPrivacyActive)}
                        </p>
                   </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4 anim-slide-up">
          <button onClick={() => setShowAgendaModal(true)} className="bg-indigo-600 dark:bg-indigo-600 text-white rounded-[2rem] p-6 shadow-lg shadow-indigo-600/20 relative overflow-hidden group press-effect h-44 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><CalendarClock className="w-24 h-24" /></div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm z-10"><CalendarClock className="w-5 h-5" /></div>
              <div className="relative z-10 text-left">
                  <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black tracking-tighter">{radarData.events.length}</span>
                      <span className="text-xs font-bold opacity-60 uppercase">Agenda</span>
                  </div>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">Datacoms e pagamentos futuros.</p>
              </div>
          </button>

          <div className="flex flex-col gap-4 h-44">
              <button onClick={() => setShowProventosModal(true)} className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden group flex flex-col justify-center">
                  <div className="absolute right-3 top-3 opacity-5 dark:opacity-10"><CircleDollarSign className="w-12 h-12 text-emerald-500" /></div>
                  <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><CircleDollarSign className="w-5 h-5" /></div>
                      <div className="text-left">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Recebidos</span>
                          <span className="text-sm font-black text-zinc-900 dark:text-white truncate block">{formatBRL(totalDividendsReceived, isPrivacyActive)}</span>
                      </div>
                  </div>
              </button>

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

          <button onClick={() => setShowGoalModal(true)} className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden group h-32 flex flex-col justify-between">
              <div className="absolute top-2 right-2 opacity-5 dark:opacity-10 text-amber-500"><Target className="w-16 h-16" /></div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><Target className="w-5 h-5" /></div>
              <div className="text-left relative z-10 w-full">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Meta Principal</span>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${goalTab === 'INCOME' ? incomeProgress : patrimonyProgress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white float-right">{(goalTab === 'INCOME' ? incomeProgress : patrimonyProgress).toFixed(0)}%</span>
              </div>
          </button>
      </div>

      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="flex flex-col h-full bg-[#F2F2F2] dark:bg-black">
            <div className="px-6 pt-4 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Próximos Eventos</p>
                    </div>
                    {radarData.loading && <div className="text-[9px] font-bold text-zinc-400 animate-pulse uppercase tracking-widest">Atualizando...</div>}
                </div>
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
                {filteredAgenda.totalConfirmed > 0 && agendaFilter !== 'DATACOM' && (
                    <div className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">Confirmado</p>
                            <p className="text-[9px] font-medium opacity-70">A receber no futuro</p>
                        </div>
                        <p className="text-2xl font-black tracking-tighter">{formatBRL(filteredAgenda.totalConfirmed, isPrivacyActive)}</p>
                    </div>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-4 pt-2">
                {Object.keys(filteredAgenda.grouped).length === 0 && !radarData.loading ? (
                    <div className="text-center py-20 opacity-40">
                        <CalendarClock className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                        <p className="text-xs font-bold text-zinc-500">Nenhum evento futuro encontrado</p>
                    </div>
                ) : (
                    Object.keys(filteredAgenda.grouped).map(monthKey => (
                        <div key={monthKey}>
                            <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 sticky top-0 bg-[#F2F2F2] dark:bg-black py-2 z-10">{monthKey}</h3>
                            {filteredAgenda.grouped[monthKey].map(event => (
                                <AgendaItem key={event.id} event={event} hideValues={isPrivacyActive} />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="flex flex-col h-full bg-[#F2F2F2] dark:bg-black">
             <div className="px-6 pt-4 pb-2 shrink-0">
                 <div className="flex justify-between items-end mb-3">
                     <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Já Recebido</p>
                        </div>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                            {formatBRL(proventosTotal, isPrivacyActive)}
                        </h2>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Média Mensal</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {formatBRL(proventosAverage, isPrivacyActive)}
                        </p>
                     </div>
                 </div>
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

             <div className="flex-1 overflow-y-auto px-6 pb-20 pt-2">
                 {chartData.length > 0 && (
                     <div className="h-32 w-full mb-4 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm shrink-0">
                         <ProventosChart data={chartData} hideValues={isPrivacyActive} />
                     </div>
                 )}
                 
                 <div className="space-y-4">
                     {Object.keys(groupedProventos).length === 0 ? (
                         <div className="text-center py-10 opacity-40">
                             <p className="text-xs font-bold text-zinc-500">Sem proventos confirmados</p>
                         </div>
                     ) : (
                         Object.keys(groupedProventos).map(monthKey => (
                             <div key={monthKey}>
                                 <div className="flex justify-between items-center mb-2 ml-1 sticky top-0 bg-[#F2F2F2] dark:bg-black py-2 z-10">
                                     <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{monthKey}</h3>
                                     <span className="text-[9px] font-black text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                         {formatBRL(groupedProventos[monthKey].total, isPrivacyActive)}
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
                                                 {formatBRL(r.totalReceived, isPrivacyActive)}
                                             </span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             </div>
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         {/* ... (Allocation Content remains the same) ... */}
         <div className="flex flex-col h-full bg-[#F2F2F2] dark:bg-black">
             <div className="px-6 pt-4 pb-2 shrink-0">
                 <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                         <PieIcon className="w-5 h-5" />
                     </div>
                     <div>
                         <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                         <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Raio-X de Diversificação</p>
                     </div>
                 </div>
                 <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-xl flex gap-1 mb-2">
                     {['CLASS', 'SECTOR'].map(t => (
                         <button key={t} onClick={() => { setAllocationTab(t as any); setActiveIndexClass(undefined); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                            {t === 'CLASS' ? 'Por Classe' : 'Por Setor'}
                         </button>
                     ))}
                 </div>
             </div>
             <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-4">
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-[2rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800 h-64 shrink-0">
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
                                : formatBRL(typeData.total, isPrivacyActive)}
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
                                 <span className="block text-xs font-black text-zinc-900 dark:text-white">{formatBRL(item.value, isPrivacyActive)}</span>
                                 <span className="text-[9px] font-bold text-zinc-400">{item.percent.toFixed(1)}%</span>
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