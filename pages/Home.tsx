
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, Wallet, ArrowRight, Zap, Target, Layers, LayoutGrid, Coins, Sparkles, CheckCircle2, Lock, Calendar, Trophy, Medal, Star, ListFilter, TrendingUp as GrowthIcon, Anchor, Calculator, Repeat, ChevronRight, Hourglass, Landmark, Crown, LockKeyhole, Info, Footprints, BarChart3, LineChart, History } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';

// --- UTILS & HELPERS ---

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
}

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain, totalDividendsReceived, invested, balance, totalAppreciation, privacyMode = false }) => {
  const [showAgenda, setShowAgenda] = useState(false);
  const [showProventos, setShowProventos] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [allocationView, setAllocationView] = useState<'CLASS' | 'ASSET'>('CLASS');
  const [showMagicNumber, setShowMagicNumber] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // --- CALCS ---
  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
  
  // Yield on Cost (Baseado no total investido)
  const yieldOnCost = invested > 0 ? (totalDividendsReceived / invested) * 100 : 0;

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

  // 3. Renda (Histórico) - COM LISTA DE ÚLTIMOS PAGAMENTOS E AGRUPAMENTO
  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Data para cálculo de 12 meses
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      oneYearAgo.setDate(now.getDate() - 1); // Margem de segurança

      // Pega ultimos 12 meses para o GRÁFICO (Visualização de 6 meses é padrão, mas calculamos tudo)
      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toISOString().substring(0, 7);
          groups[key] = 0;
      }

      const receivedList: DividendReceipt[] = [];
      let last12mTotal = 0;

      dividendReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate > todayStr) return; // Apenas pagos
          
          // Cálculo 12 Meses (TTM)
          const pDate = new Date(d.paymentDate + 'T12:00:00');
          if (pDate >= oneYearAgo && pDate <= now) {
              last12mTotal += d.totalReceived;
          }

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

      // Últimos 50 pagamentos recebidos
      const history = receivedList
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
          .slice(0, 50);

      // Agrupamento para lista
      const groupedHistory: Record<string, DividendReceipt[]> = {};
      history.forEach(d => {
          const k = d.paymentDate.substring(0, 7);
          if(!groupedHistory[k]) groupedHistory[k] = [];
          groupedHistory[k].push(d);
      });

      return { chartData, average, max, last12mTotal, history, groupedHistory };
  }, [dividendReceipts]);

  const currentMonthIncome = incomeData.chartData[incomeData.chartData.length - 1]?.value || 0;

  // 4. Número Mágico - ROBUSTO (Suporte a Ações)
  const magicNumberData = useMemo(() => {
      const magicList: any[] = [];
      portfolio.forEach(asset => {
          if (asset.quantity > 0 && asset.currentPrice && asset.currentPrice > 0) {
              
              let estimatedDiv = 0;
              let hasData = false;
              
              // 1. Tenta usar DY Anualizado (Melhor para ações e FIIs)
              if (asset.dy_12m && asset.dy_12m > 0) {
                  // Converte Yield anual em valor monetário mensal médio aproximado
                  estimatedDiv = (asset.currentPrice * (asset.dy_12m / 100)) / 12;
                  hasData = true;
              } 
              // 2. Fallback: Último dividendo declarado (FIIs)
              else if (asset.last_dividend && asset.last_dividend > 0) {
                  estimatedDiv = asset.last_dividend;
                  hasData = true;
              }

              if (hasData && estimatedDiv > 0) {
                  const magicNumber = Math.ceil(asset.currentPrice / estimatedDiv);
                  
                  if (magicNumber > 0 && magicNumber < 100000) { // Sanity check
                      const missing = Math.max(0, magicNumber - asset.quantity);
                      const progress = Math.min(100, (asset.quantity / magicNumber) * 100);
                      const costToReach = missing * asset.currentPrice;
                      
                      // Nova métrica: Poder de Recompra (Quantas cotas a renda compra por mês)
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
                          repurchasePower // Nova métrica
                      });
                  }
              }
          }
      });
      // Sort by reached first, then by closest progress
      return magicList.sort((a, b) => {
          if (a.missing === 0 && b.missing !== 0) return -1;
          if (b.missing === 0 && a.missing !== 0) return 1;
          return b.progress - a.progress;
      }); 
  }, [portfolio]);

  const magicReachedCount = magicNumberData.filter(m => m.missing === 0).length;

  // 5. Objetivos (Gamification + Metas Reais)
  const goalsData = useMemo(() => {
      const safeBalance = balance || 0;
      const safeIncome = currentMonthIncome || 0;
      
      // Níveis
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
      
      // Metas Reais (Patrimônio e Renda)
      const incomeMilestones = [50, 100, 500, 1000, 2500, 5000, 10000, 20000];
      const nextIncome = incomeMilestones.find(m => m > safeIncome) || (safeIncome * 1.5);

      // Calculo de Liberdade (Salário Mínimo 2024 Base)
      const MIN_WAGE = 1412;
      const freedomPct = (safeIncome / MIN_WAGE) * 100;
      
      // Calculo Renda Passiva Diária
      const dailyPassiveIncome = safeIncome / 30;

      // --- CONQUISTAS (Achievements) ---
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
        
        {/* HERO CARD - Visual mais limpo e imponente */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl anim-fade-in group">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-[80px] pointer-events-none -mt-20 -mr-20"></div>
            
            <div className="p-8 relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-1.5 mb-3">
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">Patrimônio Total</p>
                            <InfoTooltip title="Patrimônio Total" text="Soma do valor atual de mercado de todos os seus ativos (Cotação Atual × Quantidade). Atualizado com delay de ~15min." />
                        </div>
                        <h1 className="text-[2.75rem] font-bold text-white tracking-tighter tabular-nums leading-none">
                            {formatBRL(balance, privacyMode)}
                        </h1>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md">
                        <Wallet className="w-6 h-6 text-zinc-300" strokeWidth={1.5} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl p-4 bg-zinc-950/50 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Retorno</p>
                            <InfoTooltip title="Retorno" text="Lucro total estimado: (Valorização das Cotas + Proventos Recebidos) - (Valor Total Investido)." />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-lg font-bold tabular-nums ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalReturn >= 0 ? '+' : ''}{formatBRL(totalReturn, privacyMode)}
                            </span>
                        </div>
                    </div>

                    <div className="rounded-2xl p-4 bg-zinc-950/50 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Proventos</p>
                             <InfoTooltip title="Total Proventos" text="Soma histórica de todos os dividendos e JCP já recebidos na carteira desde o início." />
                        </div>
                        <p className="text-lg font-bold text-zinc-200 tabular-nums">
                            +{formatBRL(totalDividendsReceived, privacyMode)}
                        </p>
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
                value={formatBRL(currentMonthIncome, privacyMode)} 
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
                                <InfoTooltip title="Alocação" text="Distribuição atual do seu patrimônio por classe de ativo (FIIs vs Ações)." />
                            </div>
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

        {/* 1. AGENDA (Informações Adicionais) */}
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

                {/* Cards de Resumo Compactos */}
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

                {/* Container de Scroll Dedicado */}
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

        {/* 2. RENDA (Reformulada - COMPACTA) */}
        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6 h-full flex flex-col anim-slide-up">
                <div className="flex items-center gap-4 mb-4 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CircleDollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Evolução</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Histórico de Proventos</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    
                    {/* DASHBOARD COMPACTO */}
                    <div className="mb-6 space-y-3">
                        {/* Header Total e YoC */}
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-500/10 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Total Recebido</p>
                                <p className="text-2xl font-black tracking-tight leading-none">{formatBRL(totalDividendsReceived, privacyMode)}</p>
                            </div>
                            <div className="text-right bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                                <p className="text-[9px] font-bold opacity-80 uppercase">Yield on Cost</p>
                                <p className="text-sm font-black">{yieldOnCost.toFixed(2)}%</p>
                            </div>
                        </div>

                        {/* Grid de Métricas (3 Colunas) */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50 flex flex-col justify-center min-h-[60px]">
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide truncate mb-0.5">Últimos 12m</p>
                                <p className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{formatBRL(incomeData.last12mTotal, privacyMode)}</p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50 flex flex-col justify-center min-h-[60px]">
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide truncate mb-0.5">Média Mensal</p>
                                <p className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{formatBRL(incomeData.average, privacyMode)}</p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50 flex flex-col justify-center min-h-[60px]">
                                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wide truncate mb-0.5 flex items-center gap-1"><Trophy className="w-2.5 h-2.5" /> Recorde</p>
                                <p className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{formatBRL(incomeData.max, privacyMode)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico Reduzido (Mais sutil) */}
                    <div className="h-32 w-full mb-6 shrink-0 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-2 relative overflow-hidden">
                        <p className="absolute top-3 left-3 text-[9px] font-bold text-zinc-400 uppercase tracking-widest z-10">Tendência (6 Meses)</p>
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
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Histórico Recente (Lista Agrupada com Total no Header) */}
                    <div>
                        {Object.keys(incomeData.groupedHistory).length > 0 ? (
                            Object.entries(incomeData.groupedHistory)
                                .sort((a,b) => b[0].localeCompare(a[0])) // Sort keys DESC (Newest month first)
                                .map(([monthKey, items]) => {
                                    // Calcula total do mês
                                    const monthTotal = (items as DividendReceipt[]).reduce((acc, curr) => acc + curr.totalReceived, 0);
                                    
                                    return (
                                        <div key={monthKey} className="mb-6">
                                            {/* Header do Mês com Total */}
                                            <div className="sticky top-0 bg-white dark:bg-zinc-900 py-3 z-10 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center mb-2">
                                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    {getMonthName(monthKey + '-01')}
                                                </h3>
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                                    +{formatBRL(monthTotal, privacyMode)}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {(items as DividendReceipt[]).map((div, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                                                <span className="text-[10px] font-bold text-zinc-400 uppercase">{new Date(div.paymentDate).toLocaleDateString('pt-BR', {month:'short'}).replace('.','')}</span>
                                                                <span className="text-sm font-black text-zinc-900 dark:text-white leading-none">{new Date(div.paymentDate).getDate()}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-zinc-900 dark:text-white">{div.ticker}</p>
                                                                <p className="text-[10px] text-zinc-400 uppercase font-medium">{div.type}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{formatBRL(div.totalReceived, privacyMode)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                        ) : (
                            <p className="text-center text-xs text-zinc-400 py-4">Nenhum pagamento registrado.</p>
                        )}
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
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Bola de Neve</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">{magicReachedCount} ativos atingiram o Nº Mágico</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar space-y-4">
                    {magicNumberData.map((item: any) => (
                        <div key={item.ticker} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center text-xs font-black shadow-sm">
                                        {item.ticker.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.ticker}</h4>
                                        <p className="text-[10px] text-zinc-500 font-medium">Cota: {formatBRL(item.price, privacyMode)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {item.missing === 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase">
                                            <Sparkles className="w-3 h-3" /> Atingido
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Faltam {item.missing}</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-2">
                                <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1">
                                    <span>Progresso</span>
                                    <span>{item.progress.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${item.progress}%` }}></div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700/50">
                                <div>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Renda Gerada</p>
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{formatBRL(item.current * item.estimatedDiv, privacyMode)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Poder de Recompra</p>
                                    <p className="text-xs font-bold text-emerald-500">{item.repurchasePower.toFixed(2)} cotas/mês</p>
                                </div>
                            </div>
                        </div>
                    ))}
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
                    {/* Level Progress */}
                    <div className="mb-8 text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e4e4e7" strokeWidth="3" className="dark:stroke-zinc-800" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f43f5e" strokeWidth="3" strokeDasharray={`${goalsData.progress}, 100`} className="transition-all duration-1000 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-zinc-900 dark:text-white">{goalsData.currentLevel.level}</span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">Nível</span>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-zinc-500 px-8">
                            Faltam <span className="text-rose-500 font-bold">{formatBRL(goalsData.nextLevel.target - (balance || 0), privacyMode)}</span> para atingir o nível <span className="text-zinc-900 dark:text-white font-bold">{goalsData.nextLevel.name}</span>.
                        </p>
                    </div>

                    {/* Metas Financeiras */}
                    <div className="space-y-6 mb-8">
                        <ProgressBar current={goalsData.income.current} target={goalsData.income.target} label="Meta de Renda Mensal" colorClass="bg-emerald-500" privacyMode={privacyMode} />
                        <ProgressBar current={goalsData.patrimony.current} target={goalsData.patrimony.target} label="Meta de Patrimônio" colorClass="bg-indigo-500" privacyMode={privacyMode} />
                        <ProgressBar current={goalsData.freedom.current} target={goalsData.freedom.target} label="Liberdade Financeira (Salário Mínimo)" colorClass="bg-amber-500" privacyMode={privacyMode} />
                    </div>

                    {/* Conquistas */}
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

                {/* Toggle View */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6 shrink-0">
                    <button onClick={() => setAllocationView('CLASS')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${allocationView === 'CLASS' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Por Classe</button>
                    <button onClick={() => setAllocationView('ASSET')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${allocationView === 'ASSET' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Por Ativo</button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-24 no-scrollbar">
                    {/* Chart */}
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
                                <RechartsTooltip 
                                    formatter={(value: number) => formatBRL(value, privacyMode)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Info */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Total</span>
                            <span className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(balance, privacyMode)}</span>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {(allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</p>
                                    <p className="text-[10px] font-medium text-zinc-500">
                                        {(item as any).percent?.toFixed(1) || 0}%
                                    </p>
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
