
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, Wallet, ArrowRight, Zap, Target, Layers, LayoutGrid, Coins, Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- UTILS & HELPERS ---

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateShort = (dateStr?: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return '--/--';
    try {
        return dateStr.split('-').reverse().slice(0, 2).join('/');
    } catch {
        return '--/--';
    }
};

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

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

const ProgressBar = ({ current, target, label, colorClass }: any) => {
    const progress = Math.min(100, Math.max(0, (current / target) * 100));
    return (
        <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className="text-xs font-black text-zinc-900 dark:text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-zinc-400 font-medium">
                <span>{formatBRL(current)}</span>
                <span>{formatBRL(target)}</span>
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
  const [showMagicNumber, setShowMagicNumber] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // --- CALCS ---
  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  // 1. Alocação
  const { chartData } = useMemo(() => {
      let fiis = 0, stocks = 0;
      portfolio.forEach(p => {
          const v = p.quantity * (p.currentPrice || 0);
          if(p.assetType === AssetType.FII) fiis += v; else stocks += v;
      });
      return { 
          chartData: [
              { name: 'FIIs', value: fiis, color: '#6366f1' }, 
              { name: 'Ações', value: stocks, color: '#0ea5e9' }
          ].filter(d => d.value > 0)
      };
  }, [portfolio]);

  // 2. Agenda (Proventos Futuros)
  const agendaData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      // Filtra proventos com data de pagamento futura ou hoje
      // Proteção: Garante que paymentDate existe
      const future = dividendReceipts.filter(d => d.paymentDate && d.paymentDate >= todayStr)
          .sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || ''));
      
      const totalFuture = future.reduce((acc, curr) => acc + curr.totalReceived, 0);
      const nextPayment = future[0];

      return { list: future, totalFuture, nextPayment };
  }, [dividendReceipts]);

  // 3. Renda (Histórico)
  const incomeHistory = useMemo(() => {
      const groups: Record<string, number> = {};
      dividendReceipts.forEach(d => {
          if (!d.paymentDate) return;
          const monthKey = d.paymentDate.substring(0, 7); // YYYY-MM
          groups[monthKey] = (groups[monthKey] || 0) + d.totalReceived;
      });
      
      return Object.entries(groups)
          .map(([date, value]) => ({ date, value, label: date.split('-')[1] })) // Label = Mês
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-6); // Últimos 6 meses
  }, [dividendReceipts]);

  const currentMonthIncome = incomeHistory[incomeHistory.length - 1]?.value || 0;

  // 4. Número Mágico
  const magicNumberData = useMemo(() => {
      const magicList: any[] = [];
      portfolio.forEach(asset => {
          if (asset.quantity > 0 && asset.currentPrice && asset.currentPrice > 0) {
              const dyAnnual = asset.dy_12m || 0;
              const monthlyYield = dyAnnual > 0 ? (dyAnnual / 100) / 12 : 0;
              
              if (monthlyYield > 0) {
                  const estimatedDivPerShare = asset.currentPrice * monthlyYield;
                  const magicNumber = estimatedDivPerShare > 0 ? Math.ceil(asset.currentPrice / estimatedDivPerShare) : 0;
                  
                  if (magicNumber > 0) {
                      const missing = Math.max(0, magicNumber - asset.quantity);
                      const progress = Math.min(100, (asset.quantity / magicNumber) * 100);
                      
                      magicList.push({
                          ticker: asset.ticker,
                          current: asset.quantity,
                          target: magicNumber,
                          missing,
                          progress,
                          type: asset.assetType
                      });
                  }
              }
          }
      });
      return magicList.sort((a, b) => b.progress - a.progress);
  }, [portfolio]);

  const magicReachedCount = magicNumberData.filter(m => m.missing === 0).length;

  // 5. Objetivos (Gamification)
  const goalsData = useMemo(() => {
      const safeBalance = balance || 0;
      const safeIncome = currentMonthIncome || 0;

      const patrimonyMilestones = [1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000];
      const nextPatrimony = patrimonyMilestones.find(m => m > safeBalance) || 10000000;
      
      const incomeMilestones = [50, 100, 500, 1000, 2500, 5000, 10000];
      const nextIncome = incomeMilestones.find(m => m > safeIncome) || 50000;

      return {
          patrimony: { current: safeBalance, target: nextPatrimony },
          income: { current: safeIncome, target: nextIncome }
      };
  }, [balance, currentMonthIncome]);

  return (
    <div className="space-y-5 pb-8">
        
        {/* HERO CARD */}
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 text-white p-7 shadow-2xl shadow-zinc-900/20 anim-fade-in">
            {/* Mesh Gradients */}
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
                        <span className="text-[10px] text-zinc-500 font-medium bg-black/20 px-1.5 py-0.5 rounded">
                            {totalReturnPercent.toFixed(2)}%
                        </span>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            <span className="text-xs text-zinc-300 font-medium">Proventos</span>
                        </div>
                        <p className="text-lg font-bold text-indigo-400">
                            +{formatBRL(totalDividendsReceived, privacyMode)}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-medium">Acumulado</span>
                    </div>
                </div>
            </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-2 gap-3 anim-slide-up">
            
            {/* Agenda */}
            <BentoCard 
                title="Agenda" 
                value={agendaData.nextPayment ? formatDateShort(agendaData.nextPayment.paymentDate || agendaData.nextPayment.dateCom) : '--'} 
                subtext={agendaData.nextPayment ? `Próx: ${agendaData.nextPayment.ticker}` : 'Sem previsões'}
                icon={CalendarClock} 
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                onClick={() => setShowAgenda(true)}
            />
            
            {/* Renda */}
            <BentoCard 
                title="Renda" 
                value={formatBRL(currentMonthIncome, privacyMode)} 
                subtext="Neste Mês"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
            />

            {/* Número Mágico */}
            <BentoCard 
                title="Nº Mágico" 
                value={magicReachedCount.toString()} 
                subtext="Ativos Atingidos"
                icon={Sparkles} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                onClick={() => setShowMagicNumber(true)}
            />

            {/* Objetivos */}
            <BentoCard 
                title="Meta" 
                value={`${((balance / (goalsData.patrimony.target || 1)) * 100).toFixed(0)}%`} 
                subtext="Do próximo nível"
                icon={Target} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                onClick={() => setShowGoals(true)}
            />

            {/* Alocação (Wide) */}
            <div className="col-span-2">
                <button onClick={() => setShowAllocation(true)} className="w-full bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <PieIcon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Alocação</h3>
                            <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> FIIs {chartData.find(c=>c.name==='FIIs')?.value ? ((chartData.find(c=>c.name==='FIIs')?.value || 0)/(balance || 1)*100).toFixed(0) : 0}%</span>
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Ações {chartData.find(c=>c.name==='Ações')?.value ? ((chartData.find(c=>c.name==='Ações')?.value || 0)/(balance || 1)*100).toFixed(0) : 0}%</span>
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
            <div className="p-6 pb-20 min-h-[50vh]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                        <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Agenda</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Previsão de Recebimentos</p>
                    </div>
                </div>

                {agendaData.list.length > 0 ? (
                    <div className="space-y-3">
                        {agendaData.list.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 flex items-center justify-center text-xs font-black">
                                        {item.ticker.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{item.ticker}</h4>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold">{formatDateShort(item.paymentDate)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(item.totalReceived, privacyMode)}</p>
                                    <p className="text-[9px] text-zinc-400 uppercase">A Receber</p>
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

        {/* 2. RENDA (GRÁFICO) */}
        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6 pb-20">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CircleDollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Evolução</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Histórico de Renda (6 Meses)</p>
                    </div>
                </div>

                <div className="h-64 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(val) => `R$${val}`} />
                            <RechartsTooltip 
                                cursor={{ fill: '#f4f4f5', opacity: 0.1 }}
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-6 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-500">Média (6M)</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-white">
                        {formatBRL(incomeHistory.length > 0 ? incomeHistory.reduce((a,b) => a+b.value, 0) / incomeHistory.length : 0, privacyMode)}
                    </span>
                </div>
            </div>
        </SwipeableModal>

        {/* 3. NÚMERO MÁGICO */}
        <SwipeableModal isOpen={showMagicNumber} onClose={() => setShowMagicNumber(false)}>
            <div className="p-6 pb-20 min-h-[60vh]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Magic Number</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Cotas infinitas via dividendos</p>
                    </div>
                </div>

                {magicNumberData.length > 0 ? (
                    <div className="space-y-4">
                        {magicNumberData.map((item) => (
                            <div key={item.ticker} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        {item.missing === 0 ? (
                                            <div className="text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black">{item.ticker.substring(0,2)}</div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-sm dark:text-white">{item.ticker}</h4>
                                            <p className="text-[10px] text-zinc-500">
                                                {item.missing === 0 ? 'Atingido!' : `Faltam ${item.missing} cotas`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                        {item.progress.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${item.missing === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-50">
                        <p>Adicione ativos para calcular o número mágico.</p>
                    </div>
                )}
            </div>
        </SwipeableModal>

        {/* 4. OBJETIVOS */}
        <SwipeableModal isOpen={showGoals} onClose={() => setShowGoals(false)}>
            <div className="p-6 pb-20">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">Próximo Nível</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Suas metas automáticas</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <ProgressBar 
                        label="Meta de Patrimônio" 
                        current={goalsData.patrimony.current} 
                        target={goalsData.patrimony.target} 
                        colorClass="bg-gradient-to-r from-blue-500 to-indigo-600"
                    />
                    
                    <ProgressBar 
                        label="Meta de Renda Mensal" 
                        current={goalsData.income.current} 
                        target={goalsData.income.target} 
                        colorClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
                    />

                    <div className="bg-zinc-50 dark:bg-zinc-800 p-5 rounded-3xl mt-8 text-center border border-zinc-100 dark:border-zinc-700/50">
                        <Lock className="w-6 h-6 mx-auto text-zinc-300 mb-2" />
                        <h3 className="text-sm font-bold text-zinc-400">Liberdade Financeira</h3>
                        <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto">Continue investindo para desbloquear novas conquistas.</p>
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* 5. ALOCAÇÃO */}
        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
             <div className="p-6 h-[70vh] flex flex-col">
                <div className="flex items-center gap-4 mb-2 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <PieIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white">Diversificação</h2>
                </div>
                
                <div className="flex-1 min-h-0 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={chartData} 
                                innerRadius={80} 
                                outerRadius={110} 
                                paddingAngle={5} 
                                dataKey="value" 
                                cornerRadius={8}
                                cy="50%"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Center Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Total</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white mt-1">100%</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 shrink-0">
                    {chartData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <div>
                                <p className="text-xs font-bold text-zinc-900 dark:text-white">{entry.name}</p>
                                <p className="text-[10px] text-zinc-500">{((entry.value / (balance || 1)) * 100).toFixed(1)}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
