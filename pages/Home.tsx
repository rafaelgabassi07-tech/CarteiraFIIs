
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, Wallet, ArrowRight, Zap, Target, Layers, LayoutGrid, Coins, Sparkles, CheckCircle2, Lock, Calendar, Trophy, Medal, Star, ListFilter } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
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
        <div className="mb-5 last:mb-0">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className="text-xs font-black text-zinc-900 dark:text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-zinc-400 font-medium">
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

  // 1. Alocação (Classes e Ativos)
  const allocationData = useMemo(() => {
      let fiis = 0, stocks = 0;
      const assetList: { name: string, value: number, color: string, percent: number }[] = [];
      const totalBalance = balance || 1;

      portfolio.forEach((p, idx) => {
          const v = p.quantity * (p.currentPrice || 0);
          if(p.assetType === AssetType.FII) fiis += v; else stocks += v;
          if (v > 0) {
              assetList.push({ 
                  name: p.ticker, 
                  value: v, 
                  color: CHART_COLORS[idx % CHART_COLORS.length],
                  percent: (v / totalBalance) * 100
              });
          }
      });

      const byClass = [
          { name: 'FIIs', value: fiis, color: '#6366f1' }, 
          { name: 'Ações', value: stocks, color: '#0ea5e9' }
      ].filter(d => d.value > 0);

      // Sort by Value DESC and take top 12 to show in list
      const byAsset = assetList.sort((a,b) => b.value - a.value).slice(0, 12);

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

      // Agrupamento por Mês
      const grouped: Record<string, DividendReceipt[]> = {};
      future.forEach(item => {
          const dateRef = item.paymentDate || item.dateCom;
          if (!dateRef) return;
          const monthKey = dateRef.substring(0, 7); // YYYY-MM
          if (!grouped[monthKey]) grouped[monthKey] = [];
          grouped[monthKey].push(item);
      });

      return { list: future, grouped, totalFuture, nextPayment };
  }, [dividendReceipts]);

  // 3. Renda (Histórico) - COM LISTA DE ÚLTIMOS PAGAMENTOS
  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Pega ultimos 12 meses
      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toISOString().substring(0, 7);
          groups[key] = 0;
      }

      const receivedList: DividendReceipt[] = [];

      dividendReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate > todayStr) return; // Apenas pagos
          
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

      // Últimos 20 pagamentos recebidos (History List)
      const history = receivedList
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
          .slice(0, 20);

      return { chartData, average, max, history };
  }, [dividendReceipts]);

  const currentMonthIncome = incomeData.chartData[incomeData.chartData.length - 1]?.value || 0;

  // 4. Número Mágico - ROBUSTO (Correção de Fallback)
  const magicNumberData = useMemo(() => {
      const magicList: any[] = [];
      portfolio.forEach(asset => {
          if (asset.quantity > 0 && asset.currentPrice && asset.currentPrice > 0) {
              
              let estimatedDiv = 0;
              
              // Prioridade 1: DY anualizado (mais estável)
              if (asset.dy_12m && asset.dy_12m > 0) {
                  estimatedDiv = (asset.currentPrice * (asset.dy_12m / 100)) / 12;
              } 
              // Prioridade 2: Último dividendo declarado (Fallback se DY falhar/estiver zerado)
              else if (asset.last_dividend && asset.last_dividend > 0) {
                  estimatedDiv = asset.last_dividend;
              }

              if (estimatedDiv > 0) {
                  const magicNumber = Math.ceil(asset.currentPrice / estimatedDiv);
                  
                  if (magicNumber > 0) {
                      const missing = Math.max(0, magicNumber - asset.quantity);
                      const progress = Math.min(100, (asset.quantity / magicNumber) * 100);
                      
                      magicList.push({
                          ticker: asset.ticker,
                          current: asset.quantity,
                          target: magicNumber,
                          missing,
                          progress,
                          estimatedDiv: estimatedDiv,
                          price: asset.currentPrice,
                          type: asset.assetType
                      });
                  }
              }
          }
      });
      return magicList.sort((a, b) => b.progress - a.progress); 
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

      return { 
          currentLevel, 
          nextLevel, 
          progress,
          patrimony: { current: safeBalance, target: nextLevel.target },
          income: { current: safeIncome, target: nextIncome }
      };
  }, [balance, currentMonthIncome]);

  return (
    <div className="space-y-5 pb-8">
        
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 text-white p-7 shadow-2xl shadow-zinc-900/20 anim-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -ml-16 -mb-16 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Patrimônio Total</p>
                        <h1 className="text-4xl font-bold tracking-tight tabular-nums">
                            {formatBRL(balance, privacyMode)}
                        </h1>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${totalReturn >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                            <span className="text-xs text-zinc-300 font-medium">Retorno Total</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-lg font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalReturn >= 0 ? '+' : ''}{formatBRL(totalReturn, privacyMode)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            <span className="text-xs text-zinc-300 font-medium">Proventos</span>
                        </div>
                        <p className="text-lg font-bold text-indigo-400">
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
            />
            
            <BentoCard 
                title="Renda" 
                value={formatBRL(currentMonthIncome, privacyMode)} 
                subtext="Neste Mês"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
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

        {/* 1. AGENDA (Compact Mode) */}
        <SwipeableModal isOpen={showAgenda} onClose={() => setShowAgenda(false)}>
            <div className="p-6 pb-20 min-h-[60vh] anim-slide-up">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Agenda</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Previsão: {formatBRL(agendaData.totalFuture, privacyMode)}</p>
                    </div>
                </div>

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
                                                        <p className="text-[10px] text-zinc-500 font-medium">
                                                            {item.paymentDate ? `Pag: ${formatDateShort(item.paymentDate)}` : `Com: ${formatDateShort(item.dateCom)}`}
                                                        </p>
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
        </SwipeableModal>

        {/* 2. RENDA (Com Histórico) */}
        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6 pb-20 anim-slide-up">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CircleDollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Evolução</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Histórico de 6 Meses</p>
                    </div>
                </div>

                <div className="h-56 w-full mt-4 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={incomeData.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(val) => `R$${val}`} />
                            <RechartsTooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}
                                formatter={(value: number) => [formatBRL(value), 'Renda']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Média Mensal</p>
                        <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(incomeData.average, privacyMode)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Recorde</p>
                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatBRL(incomeData.max, privacyMode)}</p>
                    </div>
                </div>

                {/* Histórico Recente (Lista) */}
                <div>
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Últimos Pagamentos</h3>
                    <div className="space-y-3">
                        {incomeData.history.length > 0 ? (
                            incomeData.history.map((div, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-black text-zinc-500">
                                            {div.ticker.substring(0,2)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-white">{div.ticker}</p>
                                            <p className="text-[10px] text-zinc-400">{formatDateShort(div.paymentDate)} • {div.type}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{formatBRL(div.totalReceived, privacyMode)}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-zinc-400 py-4">Nenhum pagamento registrado.</p>
                        )}
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* 3. NÚMERO MÁGICO (CARD PREMIUM + FALLBACK) */}
        <SwipeableModal isOpen={showMagicNumber} onClose={() => setShowMagicNumber(false)}>
            <div className="p-6 pb-20 min-h-[60vh] anim-slide-up">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Magic Number</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Onde a renda compra novas cotas</p>
                    </div>
                </div>

                {magicNumberData.length > 0 ? (
                    <div className="space-y-4">
                        {magicNumberData.map((item) => {
                            const isReached = item.missing === 0;
                            return (
                                <div key={item.ticker} className={`p-5 rounded-2xl border transition-all ${isReached ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isReached ? 'bg-white text-emerald-600 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                {item.ticker.substring(0,2)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-base text-zinc-900 dark:text-white">{item.ticker}</h4>
                                                <p className="text-[10px] text-zinc-500 font-medium">Preço: {formatBRL(item.price)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${isReached ? 'bg-emerald-200 text-emerald-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                                {item.progress.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${isReached ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                            style={{ width: `${item.progress}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] text-zinc-400 uppercase font-bold">Faltam</p>
                                            <p className={`text-sm font-black ${isReached ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'}`}>
                                                {isReached ? 'Atingido!' : `${item.missing} Cotas`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-zinc-400 uppercase font-bold">Rend. por Cota</p>
                                            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">~{formatBRL(item.estimatedDiv)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-50">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                        <p className="text-sm font-bold text-zinc-500">Dados insuficientes para cálculo.</p>
                        <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px] mx-auto">Adicione ativos com histórico de dividendos ou aguarde a atualização de mercado.</p>
                    </div>
                )}
            </div>
        </SwipeableModal>

        {/* 4. OBJETIVOS (LEVEL SYSTEM + METAS CLARAS) */}
        <SwipeableModal isOpen={showGoals} onClose={() => setShowGoals(false)}>
            <div className="p-6 pb-20 anim-slide-up">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Minha Jornada</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Conquiste sua liberdade</p>
                    </div>
                </div>

                {/* Level Card */}
                <div className="text-center mb-10 relative">
                    <div className="inline-block p-1 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 shadow-xl shadow-indigo-500/20 mb-4">
                        <div className="w-24 h-24 rounded-full bg-white dark:bg-zinc-900 flex flex-col items-center justify-center border-4 border-transparent">
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">{goalsData.currentLevel.level}</span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Nível</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{goalsData.currentLevel.name}</h3>
                    <div className="mt-4 px-8">
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 transition-all duration-1000 ease-out" 
                                style={{ width: `${goalsData.progress}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-widest">
                            {goalsData.progress.toFixed(0)}% para {goalsData.nextLevel.name}
                        </p>
                    </div>
                </div>

                {/* Concrete Goals */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Próximos Marcos</h3>
                    
                    <ProgressBar 
                        label="Meta de Patrimônio" 
                        current={goalsData.patrimony.current} 
                        target={goalsData.patrimony.target} 
                        colorClass="bg-gradient-to-r from-blue-500 to-indigo-600"
                        privacyMode={privacyMode}
                    />
                    
                    <ProgressBar 
                        label="Meta de Renda Mensal" 
                        current={goalsData.income.current} 
                        target={goalsData.income.target} 
                        colorClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
                        privacyMode={privacyMode}
                    />
                </div>
            </div>
        </SwipeableModal>

        {/* 5. ALOCAÇÃO (COM LISTA DE ATIVOS APRIMORADA) */}
        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
             <div className="p-6 h-[80vh] flex flex-col anim-slide-up">
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
                
                <div className="flex-1 min-h-0 w-full relative mb-4 anim-scale-in">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset} 
                                innerRadius={80} 
                                outerRadius={110} 
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

                <div className="overflow-y-auto pb-4 max-h-[40vh] shrink-0 no-scrollbar">
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
                        <div className="space-y-2">
                            {allocationData.byAsset.map((entry, idx) => (
                                <div key={entry.name} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-transparent dark:border-zinc-700/50 anim-slide-up" style={{ animationDelay: `${idx * 50}ms`, opacity: 0 }}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{entry.name}</p>
                                                <span className="text-[10px] font-bold text-zinc-500">{entry.percent.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-1">
                                                <div className="h-full rounded-full" style={{ width: `${entry.percent}%`, backgroundColor: entry.color }}></div>
                                            </div>
                                            <p className="text-[10px] font-medium text-zinc-400">{formatBRL(entry.value, privacyMode)}</p>
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
