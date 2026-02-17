import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType, PortfolioInsight } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, ArrowUpRight, Wallet, ArrowRight, Sparkles, Trophy, Anchor, Coins, Crown, Info, X } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { formatBRL, formatDateShort, getMonthName, getDaysUntil } from '../utils/formatters';

// --- CONSTANTS ---
const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#84cc16'];

// --- STORIES COMPONENT ---
const StoriesBar = ({ insights, onViewAsset }: { insights: PortfolioInsight[], onViewAsset?: (t: string) => void }) => {
    if (!insights || insights.length === 0) return null;

    return (
        <div className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar flex gap-3 pb-2 snap-x">
            {insights.map((story) => (
                <button 
                    key={story.id} 
                    onClick={() => story.relatedTicker && onViewAsset && onViewAsset(story.relatedTicker)}
                    className="snap-start shrink-0 w-[240px] p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between items-start text-left group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect"
                >
                    <div className="flex justify-between w-full mb-2">
                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${story.type === 'success' || story.type === 'opportunity' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : story.type === 'warning' || story.type === 'volatility_down' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'}`}>
                            {story.relatedTicker || 'Insight'}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1">{story.title}</h4>
                        <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">{story.message}</p>
                    </div>
                </button>
            ))}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const BentoCard = ({ title, value, subtext, icon: Icon, colorClass, onClick, className, info }: any) => (
    <button onClick={onClick} className={`relative overflow-hidden bg-white dark:bg-zinc-900 p-5 rounded-[1.8rem] flex flex-col justify-between items-start text-left shadow-[0_2px_10px_rgb(0,0,0,0.03)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect h-full min-h-[150px] ${className}`}>
        <div className="flex justify-between w-full mb-4 relative z-10">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colorClass}`}>
                <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                <ArrowRight className="w-4 h-4 -rotate-45" />
            </div>
        </div>
        <div className="relative z-10 w-full">
            <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{title}</h3>
                {info && <InfoTooltip title={title} text={info} />}
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none">{typeof value === 'object' ? '' : value}</p>
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
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
  insights?: PortfolioInsight[];
}

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain, totalDividendsReceived, invested, balance, totalAppreciation, privacyMode = false, onViewAsset, insights = [] }) => {
  const [showAgenda, setShowAgenda] = useState(false);
  const [showProventos, setShowProventos] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [allocationView, setAllocationView] = useState<'CLASS' | 'ASSET'>('CLASS');
  const [showMagicNumber, setShowMagicNumber] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // --- CALCULATIONS ---
  
  // Total Return Breakdown
  const capitalGain = totalAppreciation + salesGain;
  const totalReturn = capitalGain + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
  
  // 1. Alocação Otimizada
  const allocationData = useMemo(() => {
      let fiis = 0, stocks = 0;
      const assetList = portfolio
          .map((p, idx) => {
              const v = p.quantity * (p.currentPrice || 0);
              if (p.assetType === AssetType.FII) fiis += v; else stocks += v;
              return { 
                  name: p.ticker, 
                  value: v, 
                  color: CHART_COLORS[idx % CHART_COLORS.length],
                  percent: (v / (balance || 1)) * 100,
              };
          })
          .filter(d => d.value > 0)
          .sort((a,b) => b.value - a.value)
          .slice(0, 15);

      const byClass = [
          { name: 'FIIs', value: fiis, color: '#6366f1' }, 
          { name: 'Ações', value: stocks, color: '#0ea5e9' }
      ].filter(d => d.value > 0);

      return { byClass, byAsset: assetList };
  }, [portfolio, balance]);

  // 2. Agenda Otimizada
  const agendaData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const validReceipts = dividendReceipts.filter(d => d && (d.paymentDate || d.dateCom));
      
      const future = validReceipts
          .filter(d => (d.paymentDate && d.paymentDate >= todayStr) || (!d.paymentDate && d.dateCom >= todayStr))
          .sort((a, b) => (a.paymentDate || a.dateCom || '').localeCompare(b.paymentDate || b.dateCom || ''));
      
      const totalFuture = future.reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
      const nextPayment = future[0];
      const daysToNext = nextPayment ? getDaysUntil(nextPayment.paymentDate || nextPayment.dateCom) : 0;

      // Group by Month
      const grouped: Record<string, DividendReceipt[]> = {};
      future.forEach(item => {
          const dateRef = item.paymentDate || item.dateCom;
          if (!dateRef) return;
          const monthKey = dateRef.substring(0, 7);
          if (!grouped[monthKey]) grouped[monthKey] = [];
          grouped[monthKey].push(item);
      });

      return { list: future, grouped, totalFuture, nextPayment, daysToNext };
  }, [dividendReceipts]);

  // 3. Renda (Gráfico 12 meses + Stats) - CORRIGIDO PARA 12 MESES
  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Inicializa últimos 12 meses com 0 (Garantes histórico visível no modal)
      for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          groups[d.toISOString().substring(0, 7)] = 0;
      }

      let last12mTotal = 0;
      const oneYearAgoStr = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

      dividendReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate > todayStr) return;
          
          if (d.paymentDate >= oneYearAgoStr) last12mTotal += d.totalReceived;

          const monthKey = d.paymentDate.substring(0, 7);
          // Apenas soma se o mês estiver no range dos últimos 12 meses gerados
          if (groups[monthKey] !== undefined) groups[monthKey] += d.totalReceived;
      });
      
      const chartData = Object.entries(groups)
          .map(([date, value]) => ({ 
              date, 
              value, 
              label: getMonthName(date + '-01').substring(0,3).toUpperCase()
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

      const average = chartData.reduce((acc, cur) => acc + cur.value, 0) / 12;
      const max = Math.max(...chartData.map(d => d.value));

      return { chartData, average, max, last12mTotal, currentMonth: chartData[chartData.length - 1]?.value || 0 };
  }, [dividendReceipts]);

  // 4. Magic Number
  const magicNumberData = useMemo(() => {
      const all = portfolio
          .map(asset => {
              if (asset.quantity <= 0 || !asset.currentPrice) return null;
              
              let estimatedDiv = asset.last_dividend;
              if (asset.dy_12m && asset.dy_12m > 0) {
                  estimatedDiv = (asset.currentPrice * (asset.dy_12m / 100)) / 12;
              }

              if (!estimatedDiv || estimatedDiv <= 0) return null;

              const magicNumber = Math.ceil(asset.currentPrice / estimatedDiv);
              const missing = Math.max(0, magicNumber - asset.quantity);
              
              return {
                  ticker: asset.ticker,
                  current: asset.quantity,
                  target: magicNumber,
                  missing,
                  progress: Math.min(100, (asset.quantity / magicNumber) * 100),
                  estimatedDiv,
                  price: asset.currentPrice,
                  repurchasePower: (asset.quantity * estimatedDiv) / asset.currentPrice
              };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.progress - a.progress);
      
      return {
          achieved: all.filter((a: any) => a.missing === 0),
          inProgress: all.filter((a: any) => a.missing > 0)
      };
  }, [portfolio]);

  const magicReachedCount = magicNumberData.achieved.length;

  // 5. Goals & Levels
  const goalsData = useMemo(() => {
      const safeBalance = balance || 0;
      const safeIncome = incomeData.currentMonth || 0;
      
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

      const currentLevelIdx = levels.findIndex(l => safeBalance < l.target);
      const currentLevel = levels[currentLevelIdx === -1 ? levels.length - 1 : Math.max(0, currentLevelIdx - 1)];
      const nextLevel = levels[currentLevel.level] || { ...currentLevel, target: currentLevel.target * 2 };
      
      const prevTarget = currentLevel.level > 1 ? levels[currentLevel.level - 2].target : 0;
      const progress = Math.min(100, ((safeBalance - prevTarget) / (nextLevel.target - prevTarget)) * 100);

      const MIN_WAGE = 1412;
      const achievements = [
          { id: 'start', label: 'Primeiro Aporte', sub: '> 0', icon: Wallet, unlocked: safeBalance > 0, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20' },
          { id: 'income', label: 'Renda Viva', sub: 'Recebeu Div.', icon: CircleDollarSign, unlocked: safeIncome > 0, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/20' },
          { id: '10k', label: 'Clube 10k', sub: 'Patrimônio', icon: Coins, unlocked: safeBalance >= 10000, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/20' },
          { id: 'half', label: 'Meio Salário', sub: 'Renda Mensal', icon: Anchor, unlocked: safeIncome >= (MIN_WAGE/2), color: 'text-sky-500 bg-sky-100 dark:bg-sky-900/20' },
          { id: '100k', label: 'Clube 100k', sub: 'Patrimônio', icon: Trophy, unlocked: safeBalance >= 100000, color: 'text-rose-500 bg-rose-100 dark:bg-rose-900/20' },
          { id: 'wage', label: 'Liberdade I', sub: '1 Salário', icon: Crown, unlocked: safeIncome >= MIN_WAGE, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20' },
      ];

      return { 
          currentLevel, nextLevel, progress, achievements,
          unlockedCount: achievements.filter(a => a.unlocked).length,
          income: { current: safeIncome, target: safeIncome * 1.5 || 100 },
          freedom: { current: safeIncome, target: MIN_WAGE }
      };
  }, [balance, incomeData.currentMonth]);

  return (
    <div className="space-y-5 pb-8">
        
        {/* STORIES / INSIGHTS */}
        <StoriesBar insights={insights} onViewAsset={onViewAsset} />

        {/* HERO CARD (Redesenhado) */}
        <div className="relative w-full min-h-[240px] rounded-[2.2rem] bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl group anim-fade-in">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-zinc-600/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 p-7 flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                            <Wallet className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2.5} />
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Patrimônio Total</span>
                        </div>
                    </div>

                    <h1 className="text-[3rem] sm:text-[3.5rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-sm select-none mb-1">
                        {formatBRL(balance, privacyMode)}
                    </h1>
                    <p className="text-xs text-zinc-500 font-bold ml-1">Custo: {formatBRL(invested, privacyMode)}</p>
                </div>

                {/* Breakdown de Rentabilidade */}
                <div className="grid grid-cols-3 gap-2 pt-6 border-t border-white/5 mt-4">
                    <div>
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Valorização</span>
                        <span className={`text-sm font-bold tabular-nums tracking-tight block ${capitalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {capitalGain >= 0 ? '+' : ''}{formatBRL(capitalGain, privacyMode)}
                        </span>
                    </div>
                    <div className="border-l border-white/5 pl-4">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Proventos</span>
                        <span className="text-sm font-bold text-sky-400 tabular-nums tracking-tight block">
                            +{formatBRL(totalDividendsReceived, privacyMode)}
                        </span>
                    </div>
                    <div className="border-l border-white/5 pl-4">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Total</span>
                        <span className={`text-sm font-bold tabular-nums tracking-tight block ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalReturn >= 0 ? '+' : ''}{formatBRL(totalReturn, privacyMode)}
                        </span>
                        <span className={`text-[9px] font-black ${totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {totalReturnPercent.toFixed(2)}%
                        </span>
                    </div>
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
                info="Previsão de pagamentos futuros baseada nas datas 'Com' confirmadas pela B3."
            />
            
            <BentoCard 
                title="Renda" 
                value={formatBRL(incomeData.currentMonth, privacyMode)} 
                subtext="Neste Mês"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
                info="Total de proventos (Dividendos, JCP) recebidos acumulados no mês atual."
            />

            <BentoCard 
                title="Nº Mágico" 
                value={magicReachedCount.toString()} 
                subtext="Ativos Atingidos"
                icon={Sparkles} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                onClick={() => setShowMagicNumber(true)}
                info="Quantidade de cotas necessária para que os dividendos mensais comprem uma nova cota do mesmo ativo (Bola de Neve)."
            />

            <BentoCard 
                title="Objetivo" 
                value={`Nv. ${goalsData.currentLevel.level}`} 
                subtext={goalsData.currentLevel.name}
                icon={Trophy} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                onClick={() => setShowGoals(true)}
                info="Seu nível na jornada de investidor, baseado no patrimônio acumulado e metas atingidas."
            />

            <div className="col-span-2">
                <button onClick={() => setShowAllocation(true)} className="w-full bg-white dark:bg-zinc-900 p-5 rounded-[1.8rem] shadow-[0_2px_10px_rgb(0,0,0,0.03)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <PieIcon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Alocação</h3>
                                <InfoTooltip title="Alocação" text="Distribuição atual do seu patrimônio por classe de ativo." />
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                                {allocationData.byClass.map(c => (
                                    <span key={c.name} className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: c.color}}></div> 
                                        {c.name} {((c.value/(balance || 1))*100).toFixed(0)}%
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </button>
            </div>
        </div>

        {/* MODALS */}
        
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

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {Object.keys(agendaData.grouped).length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(agendaData.grouped).map(([monthKey, items]) => (
                                <div key={monthKey}>
                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 sticky top-0 bg-white dark:bg-zinc-900 py-2 z-10 border-b border-zinc-100 dark:border-zinc-800">
                                        {getMonthName(monthKey + '-01')}
                                    </h3>
                                    <div className="space-y-0">
                                        {(items as DividendReceipt[]).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                                        {item.ticker.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                        <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-medium">
                                                            <span>Pag: {formatDateShort(item.paymentDate)}</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                                            <span>Com: {formatDateShort(item.dateCom)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatBRL(item.totalReceived, privacyMode)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <p className="text-sm font-bold text-zinc-500">Sem proventos futuros.</p>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        {/* 2. RENDA (Evolução com Gráfico de 12 Meses) */}
        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-4 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CircleDollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Evolução</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Últimos 12 meses: {formatBRL(incomeData.last12mTotal, privacyMode)}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="h-48 w-full mb-6 shrink-0 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-2 relative overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={incomeData.chartData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }} dy={5} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(val) => `R$${val}`} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#18181b', color: '#fff', fontSize: '10px', padding: '8px' }}
                                    formatter={(value: number) => [formatBRL(value), '']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* 3. MAGIC NUMBER (Aprimorado) */}
        <SwipeableModal isOpen={showMagicNumber} onClose={() => setShowMagicNumber(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Bola de Neve</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">{magicReachedCount} ativos se pagam sozinhos.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-6">
                    {/* Seção Atingidos */}
                    {magicNumberData.achieved.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Crown className="w-3 h-3" /> Conquistados
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {magicNumberData.achieved.map((item: any) => (
                                    <div key={item.ticker} className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black text-zinc-900 dark:text-white">{item.ticker}</span>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{item.repurchasePower.toFixed(1)}x</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-emerald-200 dark:bg-emerald-900/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-full"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seção Em Progresso */}
                    {magicNumberData.inProgress.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Em Progresso</h3>
                            <div className="space-y-3">
                                {magicNumberData.inProgress.map((item: any) => (
                                    <div key={item.ticker} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center text-xs font-black shadow-sm">
                                                    {item.ticker.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                    <p className="text-[10px] text-zinc-500 font-medium">Faltam {item.missing} cotas</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                                {item.progress.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
                                            <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${item.progress}%` }}></div>
                                        </div>
                                        <p className="text-[9px] text-zinc-400 text-right">
                                            Meta: {item.target} cotas
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        {/* 4. GOALS */}
        <SwipeableModal isOpen={showGoals} onClose={() => setShowGoals(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Objetivos</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Nível Atual: {goalsData.currentLevel.name}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="mb-8 text-center">
                        <p className="text-sm font-medium text-zinc-500 px-8">
                            Faltam <span className="text-rose-500 font-bold">{formatBRL(goalsData.nextLevel.target - (balance || 0), privacyMode)}</span> para atingir o nível <span className="text-zinc-900 dark:text-white font-bold">{goalsData.nextLevel.name}</span>.
                        </p>
                    </div>

                    <div className="space-y-6 mb-8">
                        <ProgressBar current={goalsData.income.current} target={goalsData.income.target} label="Meta de Renda Mensal" colorClass="bg-emerald-500" privacyMode={privacyMode} />
                        <ProgressBar current={balance} target={goalsData.nextLevel.target} label="Meta de Patrimônio" colorClass="bg-indigo-500" privacyMode={privacyMode} />
                        <ProgressBar current={goalsData.income.current} target={goalsData.freedom.target} label="Liberdade Financeira" colorClass="bg-amber-500" privacyMode={privacyMode} />
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Conquistas ({goalsData.unlockedCount}/{goalsData.achievements.length})</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {goalsData.achievements.map((achievement: any) => (
                                <div key={achievement.id} className={`p-3 rounded-2xl border ${achievement.unlocked ? 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-50'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${achievement.unlocked ? achievement.color : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                                        <achievement.icon className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{achievement.label}</h4>
                                    <p className="text-[10px] text-zinc-500">{achievement.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* 5. ALLOCATION */}
        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <PieIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Alocação</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Diversificação da Carteira</p>
                    </div>
                </div>

                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6 shrink-0">
                    <button onClick={() => setAllocationView('CLASS')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${allocationView === 'CLASS' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Por Classe</button>
                    <button onClick={() => setAllocationView('ASSET')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${allocationView === 'ASSET' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Por Ativo</button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    <div className="h-64 w-full relative mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value: number) => formatBRL(value, privacyMode)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                        {(allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</p>
                                    <p className="text-[10px] font-medium text-zinc-500">{(item as any).percent?.toFixed(1) || 0}%</p>
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