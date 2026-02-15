
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, Wallet, ArrowRight, Zap, Target, Layers, LayoutGrid, Coins, Sparkles, CheckCircle2, Lock, Calendar, Trophy, Medal, Star, ListFilter, TrendingUp as GrowthIcon, Anchor, Calculator, Repeat, ChevronRight, Hourglass, Landmark, Crown, LockKeyhole, Info, Footprints, BarChart3, LineChart, History, Building2, Briefcase } from 'lucide-react';
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
        return date.toLocaleDateString('pt-BR', { month: 'short' }); // Changed to short for charts
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
  // const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;
  
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

      const byAsset = assetList.sort((a,b) => b.value - a.value).slice(0, 15);

      return { byClass, byAsset };
  }, [portfolio, balance]);

  // 2. Agenda (Proventos Futuros)
  const agendaData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const validReceipts = dividendReceipts.filter(d => d && (d.paymentDate || d.dateCom));
      
      const future = validReceipts.filter(d => (d.paymentDate && d.paymentDate >= todayStr) || (!d.paymentDate && d.dateCom >= todayStr))
          .sort((a, b) => (a.paymentDate || a.dateCom || '').localeCompare(b.paymentDate || b.dateCom || ''));
      
      const totalFuture = future.reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
      const nextPayment = future[0];
      
      let daysToNext = 0;
      if (nextPayment) {
          daysToNext = getDaysUntil(nextPayment.paymentDate || nextPayment.dateCom);
      }

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

  // 3. Renda (Histórico)
  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      oneYearAgo.setDate(now.getDate() - 1);

      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toISOString().substring(0, 7);
          groups[key] = 0;
      }

      const receivedList: DividendReceipt[] = [];
      let last12mTotal = 0;

      dividendReceipts.forEach(d => {
          if (!d.paymentDate || d.paymentDate > todayStr) return;
          
          const pDate = new Date(d.paymentDate + 'T12:00:00');
          if (pDate >= oneYearAgo && pDate <= now) {
              last12mTotal += d.totalReceived || 0;
          }

          const key = d.paymentDate.substring(0, 7);
          if (groups[key] !== undefined) {
             groups[key] += d.totalReceived || 0;
          } else {
             // For older months if needed, or ignore
          }
          
          if(pDate <= now) receivedList.push(d);
      });
      
      // Sort desc
      receivedList.sort((a,b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

      const chartData = Object.keys(groups).sort().map(key => ({
          name: getMonthName(key),
          value: groups[key],
          fullKey: key
      }));

      return { chartData, last12mTotal, recent: receivedList.slice(0, 20), average12m: last12mTotal / 12 };
  }, [dividendReceipts]);

  // 4. Magic Number & Goals
  const magicNumberData = useMemo(() => {
      return portfolio.filter(p => p.assetType === AssetType.FII).map(p => {
          const lastYield = p.last_dividend || (p.currentPrice && p.dy_12m ? (p.currentPrice * p.dy_12m / 100 / 12) : 0) || 0;
          const price = p.currentPrice || p.averagePrice || 1;
          const magicN = lastYield > 0 ? Math.ceil(price / lastYield) : 0;
          return { ...p, magicNumber: magicN };
      }).filter(p => p.magicNumber > 0).sort((a,b) => {
          const aPct = a.quantity / a.magicNumber;
          const bPct = b.quantity / b.magicNumber;
          return bPct - aPct; 
      }).slice(0, 5);
  }, [portfolio]);


  return (
    <div className="space-y-4 anim-fade-in pb-12">
        {/* TOP SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3">
             <BentoCard 
                title="Patrimônio"
                value={formatBRL(balance, privacyMode)}
                subtext={`Investido: ${formatBRL(invested, privacyMode)}`}
                icon={Wallet}
                colorClass="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                className="col-span-2"
                info="Valor total atual da sua carteira, somando a cotação atual de todos os ativos."
             />
             <BentoCard 
                title="Proventos"
                value={formatBRL(totalDividendsReceived, privacyMode)}
                subtext={`Últimos 12m: ${formatBRL(incomeData.last12mTotal, privacyMode)}`}
                icon={CircleDollarSign}
                colorClass="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600"
                onClick={() => setShowProventos(true)}
             />
             <BentoCard 
                title="Retorno"
                value={formatBRL(totalReturn, privacyMode)}
                subtext={totalReturn >= 0 ? "Lucro Total" : "Prejuízo Total"}
                icon={totalReturn >= 0 ? TrendingUp : TrendingDown}
                colorClass={totalReturn >= 0 ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600" : "bg-rose-100 dark:bg-rose-900/20 text-rose-600"}
             />
        </div>

        {/* AGENDA SNIPPET */}
        {agendaData.totalFuture > 0 && (
            <button onClick={() => setShowAgenda(true)} className="w-full bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[1.8rem] p-5 text-white shadow-lg shadow-indigo-500/25 press-effect flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1 opacity-90">
                        <CalendarClock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Agenda Futura</span>
                    </div>
                    <p className="text-2xl font-black tracking-tight">{formatBRL(agendaData.totalFuture, privacyMode)}</p>
                    <p className="text-xs font-medium opacity-80 mt-1">
                        Próximo: {agendaData.nextPayment?.ticker} em {formatDateShort(agendaData.nextPayment?.paymentDate || agendaData.nextPayment?.dateCom)}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </button>
        )}

        {/* ALLOCATION SNIPPET */}
        <div className="bg-white dark:bg-zinc-900 rounded-[1.8rem] p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                     <PieIcon className="w-5 h-5 text-zinc-400" />
                     Alocação
                 </h3>
                 <button onClick={() => setShowAllocation(true)} className="text-xs font-bold text-indigo-500">Ver Detalhes</button>
             </div>
             
             <div className="flex h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                 {allocationData.byClass.map((item, idx) => (
                     <div key={idx} style={{ width: `${(item.value / balance) * 100}%`, backgroundColor: item.color }}></div>
                 ))}
             </div>
             
             <div className="flex flex-wrap gap-4">
                 {allocationData.byClass.map((item, idx) => (
                     <div key={idx} className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                         <span className="text-xs font-medium text-zinc-500">{item.name} <span className="text-zinc-900 dark:text-white font-bold">{((item.value / balance) * 100).toFixed(0)}%</span></span>
                     </div>
                 ))}
             </div>
        </div>

        {/* MODAL: PROVENTOS DETALHADOS */}
        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6 h-full flex flex-col">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 shrink-0">Histórico de Renda</h2>
                <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
                    {/* CHART */}
                    <div className="h-64 w-full mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incomeData.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => `R$${v}`} />
                                <RechartsTooltip 
                                    cursor={{ fill: '#f4f4f5', opacity: 0.4 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(val: number) => formatBRL(val, privacyMode)}
                                />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Últimos Pagamentos</h3>
                        {incomeData.recent.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{d.ticker}</p>
                                        <p className="text-xs text-zinc-500">{formatDateShort(d.paymentDate)}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(d.totalReceived, privacyMode)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* MODAL: AGENDA */}
        <SwipeableModal isOpen={showAgenda} onClose={() => setShowAgenda(false)}>
            <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Agenda de Proventos</h2>
                    <span className="text-sm font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                        Total: {formatBRL(agendaData.totalFuture, privacyMode)}
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pb-20 space-y-6">
                    {Object.keys(agendaData.grouped).sort().map(monthKey => (
                        <div key={monthKey}>
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 sticky top-0 bg-white dark:bg-zinc-900 py-2">
                                {getMonthName(monthKey + '-01')}
                            </h3>
                            <div className="space-y-3">
                                {agendaData.grouped[monthKey].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {new Date(item.paymentDate || item.dateCom).getDate()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.ticker}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {item.paymentDate ? 'Pagamento' : 'Data Com'} • {item.quantityOwned} cotas
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{formatBRL(item.totalReceived, privacyMode)}</p>
                                            <p className="text-[10px] text-zinc-400">{formatBRL(item.rate)}/cota</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {agendaData.list.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                            <p className="text-sm text-zinc-500 font-medium">Nenhum provento futuro previsto.</p>
                        </div>
                    )}
                </div>
            </div>
        </SwipeableModal>

        {/* MODAL: ALOCAÇÃO */}
        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
            <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Distribuição</h2>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        <button onClick={() => setAllocationView('CLASS')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${allocationView === 'CLASS' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-400'}`}>Classes</button>
                        <button onClick={() => setAllocationView('ASSET')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${allocationView === 'ASSET' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-400'}`}>Ativos</button>
                    </div>
                </div>

                <div className="h-64 w-full mb-8 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset}
                                cx="50%"
                                cy="50%"
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
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#18181b', color: '#fff' }}
                                formatter={(val: number) => formatBRL(val, privacyMode)}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 overflow-y-auto pb-20 space-y-3">
                    {(allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</p>
                                <p className="text-xs text-zinc-400">{item.percent.toFixed(1)}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};

// Componente auxiliar para ícone de DollarSign (não importado no topo em alguns casos)
const DollarSign = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);

export const Home = React.memo(HomeComponent);
