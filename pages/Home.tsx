
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, MarketIndicators } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, Wallet, ArrowRight, Zap, Target, Layers, LayoutGrid, Coins, Sparkles, CheckCircle2, Lock, Calendar, Trophy, Medal, Star, ListFilter, TrendingUp as GrowthIcon, Anchor, Calculator, Repeat, ChevronRight, Hourglass, Landmark, Crown, LockKeyhole, Info, Percent } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ReferenceLine } from 'recharts';

// --- UTILS & HELPERS ---

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number) => {
    return `${val.toFixed(2)}%`;
};

const formatDateShort = (dateStr?: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return '--/--';
    try {
        const parts = dateStr.split('-'); // YYYY-MM-DD
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return '--/--';
    } catch {
        return '--/--';
    }
};

const getMonthName = (dateStr: string) => {
    try {
        const date = new Date(dateStr + 'T12:00:00'); // Safe timezone
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr + 'T12:00:00');
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#84cc16'];

// --- SUB-COMPONENTS ---

const BentoCard = ({ title, value, subtext, icon: Icon, colorClass, onClick, className }: any) => (
    <button onClick={onClick} className={`relative overflow-hidden bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] flex flex-col justify-between items-start text-left shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect h-full min-h-[140px] ${className}`}>
        <div className="flex justify-between w-full mb-3 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass}`}>
                <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                <ArrowRight className="w-4 h-4 -rotate-45" />
            </div>
        </div>
        <div className="relative z-10">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{title}</h3>
            <p className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none">{typeof value === 'object' ? '' : value}</p>
            {subtext && <p className="text-[10px] text-zinc-400 font-medium mt-1.5">{subtext}</p>}
        </div>
    </button>
);

const ProgressBar = ({ current, target, label, colorClass, privacyMode }: any) => {
    const progress = Math.min(100, Math.max(0, (current / (target || 1)) * 100));
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className="text-[10px] font-black text-zinc-900 dark:text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-zinc-400 font-medium">
                <span>{formatBRL(current, privacyMode)}</span>
                <span>Meta: {formatBRL(target, privacyMode)}</span>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  marketIndicators: MarketIndicators; // Props nova
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
}

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain, totalDividendsReceived, invested, balance, totalAppreciation, marketIndicators, privacyMode = false }) => {
  const [showAgenda, setShowAgenda] = useState(false);
  const [showProventos, setShowProventos] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [showInflation, setShowInflation] = useState(false);
  const [allocationView, setAllocationView] = useState<'CLASS' | 'ASSET'>('CLASS');
  const [showMagicNumber, setShowMagicNumber] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // --- CALCS ---
  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  
  // Yield on Cost (Baseado no total investido)
  const yieldOnCost = invested > 0 ? (totalDividendsReceived / invested) * 100 : 0;

  // Calculo de Ganho Real (Fisher Equation Simplificada para o contexto)
  // Real = ((1 + Nominal) / (1 + Inflacao)) - 1
  const inflationRate = marketIndicators.ipca_cumulative || 0;
  // Assumindo YoC como o rendimento da carteira no período (aproximação para o card)
  const realYield = (((1 + (yieldOnCost / 100)) / (1 + (inflationRate / 100))) - 1) * 100;

  // 1. Alocação (Classes e Ativos)
  const allocationData = useMemo(() => {
      let fiis = 0, stocks = 0;
      const assetList: { name: string, value: number, color: string, percent: number, pm: number, current: number }[] = [];
      const totalBalance = balance || 1;

      portfolio.forEach((p, idx) => {
          const v = p.quantity * (p.currentPrice || 0);
          if(p.assetType === AssetType.FII) fiis += v; else stocks += v;
          if (v > 0) {
              assetList.push({ 
                  name: p.ticker, 
                  value: v, 
                  color: CHART_COLORS[idx % CHART_COLORS.length],
                  percent: (v / totalBalance) * 100,
                  pm: p.averagePrice,
                  current: p.currentPrice || 0
              });
          }
      });

      const byClass = [
          { name: 'FIIs', value: fiis, color: '#6366f1' }, 
          { name: 'Ações', value: stocks, color: '#0ea5e9' }
      ].filter(d => d.value > 0);

      // Sort by Value DESC and take top 15 to show in list
      const byAsset = assetList.sort((a,b) => b.value - a.value).slice(0, 15);

      return { byClass, byAsset };
  }, [portfolio, balance]);

  // 2. Agenda (Proventos Futuros) - AGRUPADA & COMPACTA
  const agendaData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const validReceipts = dividendReceipts.filter(d => d && (d.paymentDate || d.dateCom));
      
      // Filtra futuros ou hoje
      const future = validReceipts.filter(d => (d.paymentDate && d.paymentDate >= todayStr) || (!d.paymentDate && d.dateCom >= todayStr))
          .sort((a, b) => (a.paymentDate || a.dateCom || '').localeCompare(b.paymentDate || b.dateCom || ''));
      
      const totalFuture = future.reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
      const nextPayment = future[0];
      
      let daysToNext = 0;
      if (nextPayment) {
          daysToNext = getDaysUntil(nextPayment.paymentDate || nextPayment.dateCom);
      }

      // Agrupamento por Mês
      const grouped: Record<string, DividendReceipt[]> = {};
      future.forEach(item => {
          const dateRef = item.paymentDate || item.dateCom;
          if (!dateRef) return;
          const monthKey = dateRef.substring(0, 7); // YYYY-MM
          if (!grouped[monthKey]) grouped[monthKey] = [];
          grouped[monthKey].push(item);
      });

      return { list: future, grouped, totalFuture, nextPayment, daysToNext };
  }, [dividendReceipts]);

  // 3. Renda (Histórico)
  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      
      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toISOString().substring(0, 7);
          groups[key] = 0;
      }

      const receivedList: DividendReceipt[] = [];

      dividendReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate > todayStr) return; 
          
          const monthKey = d.paymentDate.substring(0, 7);
          if (groups[monthKey] !== undefined) {
              groups[monthKey] += d.totalReceived;
          }
          
          receivedList.push(d);
      });
      
      const chartData = Object.entries(groups)
          .map(([date, value]) => {
              const [year, month] = date.split('-');
              const monthShort = new Date(parseInt(year), parseInt(month)-1, 1).toLocaleDateString('pt-BR', { month: 'short' });
              return { 
                  date, 
                  value, 
                  label: monthShort.replace('.','').toUpperCase(),
                  fullLabel: getMonthName(date)
              };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

      const average = chartData.reduce((acc, cur) => acc + cur.value, 0) / (chartData.length || 1);
      const max = Math.max(...chartData.map(d => d.value));

      const history = receivedList.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 50);

      const groupedHistory: Record<string, DividendReceipt[]> = {};
      history.forEach(d => {
          const k = d.paymentDate.substring(0, 7);
          if(!groupedHistory[k]) groupedHistory[k] = [];
          groupedHistory[k].push(d);
      });

      return { chartData, average, max, history, groupedHistory };
  }, [dividendReceipts]);

  const currentMonthIncome = incomeData.chartData[incomeData.chartData.length - 1]?.value || 0;

  // 4. Número Mágico
  const magicNumberData = useMemo(() => {
      const magicList: any[] = [];
      portfolio.forEach(asset => {
          if (asset.quantity > 0 && asset.currentPrice && asset.currentPrice > 0) {
              let estimatedDiv = 0;
              let hasData = false;
              
              if (asset.dy_12m && asset.dy_12m > 0) {
                  estimatedDiv = (asset.currentPrice * (asset.dy_12m / 100)) / 12;
                  hasData = true;
              } else if (asset.last_dividend && asset.last_dividend > 0) {
                  estimatedDiv = asset.last_dividend;
                  hasData = true;
              }

              if (hasData && estimatedDiv > 0) {
                  const magicNumber = Math.ceil(asset.currentPrice / estimatedDiv);
                  if (magicNumber > 0 && magicNumber < 100000) {
                      const missing = Math.max(0, magicNumber - asset.quantity);
                      const progress = Math.min(100, (asset.quantity / magicNumber) * 100);
                      const costToReach = missing * asset.currentPrice;
                      const currentIncome = asset.quantity * estimatedDiv;
                      const repurchasePower = currentIncome / asset.currentPrice;

                      magicList.push({
                          ticker: asset.ticker,
                          current: asset.quantity,
                          target: magicNumber,
                          missing,
                          progress,
                          estimatedDiv: estimatedDiv,
                          price: asset.currentPrice,
                          type: asset.assetType,
                          costToReach,
                          repurchasePower
                      });
                  }
              }
          }
      });
      return magicList.sort((a, b) => {
          if (a.missing === 0 && b.missing !== 0) return -1;
          if (b.missing === 0 && a.missing !== 0) return 1;
          return b.progress - a.progress;
      }); 
  }, [portfolio]);

  const magicReachedCount = magicNumberData.filter(m => m.missing === 0).length;

  // 5. Objetivos
  const goalsData = useMemo(() => {
      const safeBalance = balance || 0;
      const safeIncome = currentMonthIncome || 0;
      
      const levels = [
          { level: 1, name: 'Iniciante', target: 1000 },
          { level: 2, name: 'Aprendiz', target: 5000 },
          { level: 3, name: 'Poupador', target: 10000 },
          { level: 4, name: 'Investidor', target: 25000 },
          { level: 5, name: 'Acumulador', target: 50000 },
          { level: 6, name: 'Multiplicador', target: 100000 },
          { level: 7, name: 'Barão', target: 500000 },
          { level: 8, name: 'Independente', target: 1000000 },
          { level: 9, name: 'Magnata', target: 5000000 },
      ];

      let currentLevel = levels[0];
      let nextLevel = levels[1];

      for (let i = 0; i < levels.length; i++) {
          if (safeBalance >= levels[i].target) {
              currentLevel = levels[i];
              nextLevel = levels[i+1] || { ...levels[i], target: levels[i].target * 2 };
          } else {
              break;
          }
      }

      const progress = Math.min(100, ((safeBalance - (levels[currentLevel.level-2]?.target || 0)) / (nextLevel.target - (levels[currentLevel.level-2]?.target || 0))) * 100);
      const incomeMilestones = [50, 100, 500, 1000, 2500, 5000, 10000, 20000];
      const nextIncome = incomeMilestones.find(m => m > safeIncome) || (safeIncome * 1.5);
      const MIN_WAGE = 1412;
      const freedomPct = (safeIncome / MIN_WAGE) * 100;
      const dailyPassiveIncome = safeIncome / 30;

      const achievements = [
          { id: 'first_step', label: 'Primeiro Aporte', sub: 'Patrimônio > 0', icon: Wallet, unlocked: safeBalance > 0, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20' },
          { id: 'income_start', label: 'Primeira Renda', sub: 'Recebeu proventos', icon: CircleDollarSign, unlocked: safeIncome > 0, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/20' },
          { id: '10k_club', label: 'Clube dos 10k', sub: 'Patrimônio 10k', icon: Coins, unlocked: safeBalance >= 10000, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/20' },
          { id: 'half_wage', label: 'Meio Salário', sub: 'Renda > R$700', icon: Anchor, unlocked: safeIncome >= 706, color: 'text-sky-500 bg-sky-100 dark:bg-sky-900/20' },
          { id: '100k_club', label: 'Clube dos 100k', sub: 'Patrimônio Sólido', icon: Trophy, unlocked: safeBalance >= 100000, color: 'text-rose-500 bg-rose-100 dark:bg-rose-900/20' },
          { id: 'full_wage', label: 'Salário Mínimo', sub: 'Liberdade Nv.1', icon: Crown, unlocked: safeIncome >= 1412, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20' },
      ];

      const unlockedCount = achievements.filter(a => a.unlocked).length;

      return { 
          currentLevel, 
          nextLevel, 
          progress,
          patrimony: { current: safeBalance, target: nextLevel.target },
          income: { current: safeIncome, target: nextIncome },
          freedom: { current: safeIncome, target: MIN_WAGE, pct: freedomPct },
          dailyIncome: dailyPassiveIncome,
          achievements,
          unlockedCount
      };
  }, [balance, currentMonthIncome]);

  return (
    <div className="space-y-5 pb-8">
        
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 border border-zinc-800 p-6 shadow-xl anim-fade-in">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Patrimônio Total</p>
                    <h1 className="text-4xl font-bold text-white tracking-tight tabular-nums">
                        {formatBRL(balance, privacyMode)}
                    </h1>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                    <Wallet className="w-5 h-5 text-zinc-300" strokeWidth={1.5} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-4 bg-zinc-950/30 border border-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Retorno</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-lg font-bold tabular-nums ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalReturn >= 0 ? '+' : ''}{formatBRL(totalReturn, privacyMode)}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl p-4 bg-zinc-950/30 border border-zinc-800/50">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Proventos</p>
                    <p className="text-lg font-bold text-zinc-200 tabular-nums">
                        +{formatBRL(totalDividendsReceived, privacyMode)}
                    </p>
                </div>
            </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-2 gap-3 anim-slide-up">
            
            <BentoCard 
                title="Agenda" 
                value={agendaData.nextPayment ? formatDateShort(agendaData.nextPayment.paymentDate || agendaData.nextPayment.dateCom) : '--'} 
                subtext={agendaData.nextPayment ? `Próx: ${agendaData.nextPayment.ticker}` : 'Sem previsões'}
                icon={CalendarClock} 
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                onClick={() => setShowAgenda(true)}
            />
            
            <BentoCard 
                title="Ganho Real" 
                value={formatPercent(realYield)} 
                subtext="Acima da Inflação"
                icon={TrendingUp} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowInflation(true)}
            />

            <BentoCard 
                title="Nº Mágico" 
                value={magicReachedCount.toString()} 
                subtext="Ativos Atingidos"
                icon={Sparkles} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                onClick={() => setShowMagicNumber(true)}
            />

            <BentoCard 
                title="Objetivo" 
                value={`Nv. ${goalsData.currentLevel.level}`} 
                subtext={goalsData.currentLevel.name}
                icon={Trophy} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                onClick={() => setShowGoals(true)}
            />

            <div className="col-span-2">
                <button onClick={() => setShowAllocation(true)} className="w-full bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <PieIcon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Alocação</h3>
                            <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> FIIs {allocationData.byClass.find(c=>c.name==='FIIs')?.value ? ((allocationData.byClass.find(c=>c.name==='FIIs')?.value || 0)/(balance || 1)*100).toFixed(0) : 0}%</span>
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Ações {allocationData.byClass.find(c=>c.name==='Ações')?.value ? ((allocationData.byClass.find(c=>c.name==='Ações')?.value || 0)/(balance || 1)*100).toFixed(0) : 0}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </button>
            </div>
        </div>

        {/* --- MODALS --- */}

        {/* 1. AGENDA */}
        <SwipeableModal isOpen={showAgenda} onClose={() => setShowAgenda(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Agenda</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Previsão: {formatBRL(agendaData.totalFuture, privacyMode)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-5 shrink-0">
                    <div className="bg-violet-50 dark:bg-violet-900/10 p-2.5 rounded-xl border border-violet-100 dark:border-violet-900/20 flex flex-col justify-center min-h-[60px]">
                        <p className="text-[9px] text-violet-600 dark:text-violet-400 uppercase font-bold mb-0.5">Próximo Pagamento</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-violet-700 dark:text-violet-400 leading-none">
                                {agendaData.daysToNext === 0 ? 'Hoje' : agendaData.daysToNext}
                            </span>
                            <span className="text-[9px] font-bold text-violet-500">
                                {agendaData.daysToNext === 0 ? '' : 'dias'}
                            </span>
                        </div>
                        {agendaData.nextPayment && (
                            <p className="text-[9px] text-zinc-500 mt-1 truncate font-medium border-t border-violet-200/50 dark:border-violet-800/50 pt-1">
                                {agendaData.nextPayment.ticker} • {formatBRL(agendaData.nextPayment.totalReceived, privacyMode)}
                            </p>
                        )}
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50 flex flex-col justify-center min-h-[60px]">
                        <p className="text-[9px] text-zinc-500 uppercase font-bold mb-0.5">Status</p>
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white leading-none">Confirmado</span>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-tight">Baseado na B3</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {Object.keys(agendaData.grouped).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(agendaData.grouped).map(([monthKey, items]) => (
                                <div key={monthKey}>
                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 sticky top-0 bg-white dark:bg-zinc-900 py-2 z-10 border-b border-zinc-100 dark:border-zinc-800">
                                        {getMonthName(monthKey + '-01')}
                                    </h3>
                                    <div className="space-y-0">
                                        {(items as DividendReceipt[]).map((item, idx) => {
                                            const isToday = item.paymentDate === new Date().toISOString().split('T')[0];
                                            return (
                                                <div key={idx} className={`flex items-center justify-between py-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 ${isToday ? 'bg-violet-50/50 dark:bg-violet-900/10 px-2 rounded-lg -mx-2' : ''}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isToday ? 'bg-violet-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                            {item.ticker.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                                <span className="text-[9px] text-zinc-400 uppercase">{item.type}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-medium">
                                                                <span className={item.paymentDate ? '' : 'text-zinc-300'}>Pag: {formatDateShort(item.paymentDate)}</span>
                                                                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                                                <span>Com: {formatDateShort(item.dateCom)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold text-sm ${isToday ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatBRL(item.totalReceived, privacyMode)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                            <p className="text-sm font-bold text-zinc-500">Sem proventos futuros confirmados.</p>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        {/* 2. INFLAÇÃO / GANHO REAL */}
        <SwipeableModal isOpen={showInflation} onClose={() => setShowInflation(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Ganho Real</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Rentabilidade acima da inflação</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {/* Card Principal */}
                    <div className="bg-zinc-900 dark:bg-black rounded-3xl p-6 text-white mb-6 border border-zinc-800 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Rentabilidade Real (12m)</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-black tracking-tighter">{realYield > 0 ? '+' : ''}{realYield.toFixed(2)}%</h3>
                                    <span className="text-[10px] text-zinc-500">a.a.</span>
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${realYield > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {realYield > 0 ? <GrowthIcon className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            </div>
                        </div>

                        {/* Gráfico de Barras Comparativo */}
                        <div className="h-32 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={[
                                    { name: 'IPCA', value: inflationRate, fill: '#ef4444' },
                                    { name: 'Carteira', value: yieldOnCost, fill: '#10b981' },
                                ]} barSize={20}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" tick={{fill: '#a1a1aa', fontSize: 10}} axisLine={false} tickLine={false} width={50} />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: '#27272a', color: '#fff'}} formatter={(val: number) => [`${val.toFixed(2)}%`, '']} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {
                                            [
                                                { name: 'IPCA', value: inflationRate, fill: '#ef4444' },
                                                { name: 'Carteira', value: yieldOnCost, fill: '#10b981' },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Explicação */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-6">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Entenda o Cálculo</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    O ganho real é calculado descontando a inflação (IPCA) do retorno total da sua carteira (Yield on Cost) nos últimos 12 meses.
                                </p>
                                <div className="mt-3 flex gap-4 text-[10px] font-mono text-zinc-400">
                                    <div>Yield: <span className="text-emerald-500 font-bold">{yieldOnCost.toFixed(2)}%</span></div>
                                    <div>IPCA: <span className="text-rose-500 font-bold">{inflationRate.toFixed(2)}%</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* 3. NÚMERO MÁGICO */}
        <SwipeableModal isOpen={showMagicNumber} onClose={() => setShowMagicNumber(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Magic Number</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Onde a renda compra novas cotas</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {magicNumberData.length > 0 ? (
                        <div className="space-y-2.5">
                            {magicNumberData.map((item) => {
                                const isReached = item.missing === 0;
                                return (
                                    <div key={item.ticker} className={`p-3 rounded-2xl border transition-all ${isReached ? 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-zinc-900 border-amber-200 dark:border-amber-900/30' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm'}`}>
                                        
                                        {/* Header Compacto */}
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isReached ? 'bg-amber-500 text-white shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                    {item.ticker.substring(0,2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">{item.ticker}</h4>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${item.type === AssetType.FII ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                                                            {item.type === AssetType.FII ? 'FII' : 'Ação'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-zinc-400 font-medium">Preço: {formatBRL(item.price)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {isReached ? (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                                                        <Sparkles className="w-2.5 h-2.5" /> Atingido
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-black text-zinc-900 dark:text-white">{item.progress.toFixed(0)}%</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Barra Compacta */}
                                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${isReached ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} 
                                                style={{ width: `${item.progress}%` }}
                                            ></div>
                                        </div>

                                        {/* Grid de Informações Densas */}
                                        <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                            {!isReached ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-zinc-400 uppercase font-bold tracking-wider">Custo p/ Meta</span>
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                                                        {formatBRL(item.costToReach, privacyMode)}
                                                        <span className="text-[9px] text-zinc-400 font-normal ml-1">({item.missing} cotas)</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-zinc-400 uppercase font-bold tracking-wider">Status</span>
                                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 leading-tight">Bola de Neve Ativa</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col text-right border-l border-zinc-200 dark:border-zinc-800 pl-2">
                                                <span className="text-[8px] text-zinc-400 uppercase font-bold tracking-wider">{isReached ? 'Potencial' : 'Recompra Atual'}</span>
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                                                        {item.repurchasePower.toFixed(2)} <span className="text-[9px] text-zinc-400 font-normal">cotas/mês</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <Sparkles className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                            <p className="text-sm font-bold text-zinc-500">Dados insuficientes.</p>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        {/* 4. OBJETIVOS (REDESIGN: COM EXPLICAÇÕES) */}
        <SwipeableModal isOpen={showGoals} onClose={() => setShowGoals(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-4 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Minha Jornada</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Conquiste sua liberdade</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-6">
                    
                    {/* Guia Explicativo (Topo) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Trophy className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[10px] font-bold uppercase text-zinc-900 dark:text-white">Nível</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-tight">
                                Seu status de investidor baseado no patrimônio acumulado total.
                            </p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Anchor className="w-3.5 h-3.5 text-sky-500" />
                                <span className="text-[10px] font-bold uppercase text-zinc-900 dark:text-white">Liberdade</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-tight">
                                Porcentagem do teto do INSS (R$ 7.786) coberta pela sua renda passiva.
                            </p>
                        </div>
                    </div>

                    {/* Card de Nível */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-xl shadow-indigo-900/20">
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex flex-col items-center justify-center border border-white/20 shrink-0">
                                <span className="text-3xl font-black leading-none">{goalsData.currentLevel.level}</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">Atual</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold mb-1 truncate">{goalsData.currentLevel.name}</h3>
                                <div className="flex items-center justify-between text-[10px] font-medium opacity-80 mb-1.5">
                                    <span>XP para próximo nível</span>
                                    <span>{goalsData.progress.toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000"
                                        style={{ width: `${goalsData.progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-[9px] mt-1.5 opacity-70">Próxima meta: {formatBRL(goalsData.nextLevel.target, privacyMode)}</p>
                            </div>
                        </div>
                        {/* Decorative BG */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>
                    </div>

                    {/* Métricas de Vida Real */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Anchor className="w-3.5 h-3.5 text-sky-500" />
                                    <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Liberdade</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{goalsData.freedom.pct.toFixed(1)}%</p>
                                </div>
                            </div>
                            <p className="text-[9px] text-zinc-400 mt-2">do Salário Mínimo</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Passiva/Dia</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL(goalsData.dailyIncome, privacyMode)}</p>
                                </div>
                            </div>
                            <p className="text-[9px] text-zinc-400 mt-2">pingando todo dia</p>
                        </div>
                    </div>

                    {/* Galeria de Conquistas */}
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Medalhas Desbloqueadas</h3>
                            <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                                {goalsData.unlockedCount}/{goalsData.achievements.length}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            {goalsData.achievements.map((item) => (
                                <div key={item.id} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${item.unlocked ? `bg-opacity-50 ${item.color.replace('text-', 'border-').split(' ')[0]} border-opacity-20` : 'bg-zinc-50 dark:bg-zinc-800/50 border-transparent opacity-50 grayscale'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${item.unlocked ? item.color : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'}`}>
                                        {item.unlocked ? <item.icon className="w-5 h-5" strokeWidth={2} /> : <LockKeyhole className="w-4 h-4" />}
                                    </div>
                                    <p className="text-[10px] font-bold text-center text-zinc-900 dark:text-white leading-tight mb-0.5">{item.label}</p>
                                    <p className="text-[8px] text-center text-zinc-400">{item.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* 5. ALOCAÇÃO */}
        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
             <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <PieIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white">Diversificação</h2>
                </div>

                {/* Tabs */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-4 shrink-0">
                    <button 
                        onClick={() => setAllocationView('CLASS')}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${allocationView === 'CLASS' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}
                    >
                        Por Classe
                    </button>
                    <button 
                        onClick={() => setAllocationView('ASSET')}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${allocationView === 'ASSET' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}
                    >
                        Por Ativo
                    </button>
                </div>
                
                {/* Gráfico fixo com altura controlada */}
                <div className="flex-1 w-full min-h-[220px] max-h-[35%] relative mb-4 anim-scale-in shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset} 
                                innerRadius="60%" 
                                outerRadius="80%" 
                                paddingAngle={4} 
                                dataKey="value" 
                                cornerRadius={6}
                                cy="50%"
                            >
                                {(allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Total</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white mt-1">100%</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-24 shrink-0 no-scrollbar">
                    {allocationView === 'CLASS' ? (
                        <div className="grid grid-cols-2 gap-3">
                            {allocationData.byClass.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{entry.name}</p>
                                        <p className="text-[10px] text-zinc-500">{((entry.value / (balance || 1)) * 100).toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 pr-2">
                            {allocationData.byAsset.map((entry, idx) => (
                                <div key={entry.name} className="flex items-center justify-between anim-slide-up" style={{ animationDelay: `${idx * 30}ms`, opacity: 0 }}>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{entry.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-zinc-900 dark:text-white">{entry.percent.toFixed(1)}%</span>
                                        </div>
                                        
                                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                                            <div className="h-full rounded-full" style={{ width: `${entry.percent}%`, backgroundColor: entry.color }}></div>
                                        </div>
                                        
                                        <div className="flex justify-between text-[9px] text-zinc-400 font-medium">
                                            <span>{formatBRL(entry.value, privacyMode)}</span>
                                            <span>PM: {formatBRL(entry.pm)} • Atual: {formatBRL(entry.current)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
