
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, ArrowUpRight, Wallet, ArrowRight, Sparkles, Trophy, Coins, Anchor, ArrowDownRight, Briefcase } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, XAxis, YAxis, AreaChart, Area } from 'recharts';

// --- UTILS & HELPERS ---

const formatBRL = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateShort = (dateStr?: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return '--/--';
    try {
        const parts = dateStr.split('-'); 
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return '--/--';
    } catch {
        return '--/--';
    }
};

const getMonthName = (dateStr: string) => {
    try {
        const date = new Date(dateStr + 'T12:00:00');
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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#84cc16'];

// --- COMPONENTS ---

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
            <p className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none truncate">{typeof value === 'object' ? '' : value}</p>
            {subtext && <p className="text-[10px] text-zinc-400 font-medium mt-1.5 truncate">{subtext}</p>}
        </div>
    </button>
);

const ProgressBar = ({ current, target, label, colorClass }: any) => {
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
                <span>{formatBRL(current)}</span>
                <span>Meta: {formatBRL(target)}</span>
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
  onViewAsset?: (ticker: string) => void;
}

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, totalDividendsReceived, invested, balance, totalAppreciation, salesGain }) => {
  const [showAgenda, setShowAgenda] = useState(false);
  const [showProventos, setShowProventos] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [allocationView, setAllocationView] = useState<'CLASS' | 'ASSET'>('CLASS');
  const [showMagicNumber, setShowMagicNumber] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  // --- CALCS ---
  // Rentabilidade Real = (Valor Atual + Dividendos + Lucro Vendas) - Investido
  const profitValue = (balance + totalDividendsReceived + salesGain) - invested;
  const profitPercent = invested > 0 ? (profitValue / invested) * 100 : 0;
  
  // Alocação
  const allocationData = useMemo(() => {
      let fiis = 0, stocks = 0;
      const assetList: any[] = [];
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

      return { 
          byClass: [
              { name: 'FIIs', value: fiis, color: '#6366f1' }, 
              { name: 'Ações', value: stocks, color: '#0ea5e9' }
          ].filter(d => d.value > 0),
          byAsset: assetList.sort((a,b) => b.value - a.value).slice(0, 15) 
      };
  }, [portfolio, balance]);

  // Agenda
  const agendaData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const future = dividendReceipts.filter(d => (d.paymentDate && d.paymentDate >= todayStr) || (!d.paymentDate && d.dateCom >= todayStr))
          .sort((a, b) => (a.paymentDate || a.dateCom || '').localeCompare(b.paymentDate || b.dateCom || ''));
      
      const grouped: Record<string, DividendReceipt[]> = {};
      future.forEach(item => {
          const dateRef = item.paymentDate || item.dateCom;
          if (!dateRef) return;
          const monthKey = dateRef.substring(0, 7);
          if (!grouped[monthKey]) grouped[monthKey] = [];
          grouped[monthKey].push(item);
      });

      return { 
          list: future, 
          grouped, 
          totalFuture: future.reduce((acc, curr) => acc + (curr.totalReceived || 0), 0),
          nextPayment: future[0],
          daysToNext: future[0] ? getDaysUntil(future[0].paymentDate || future[0].dateCom) : 0
      };
  }, [dividendReceipts]);

  // Renda Mensal
  const incomeData = useMemo(() => {
      const groups: Record<string, number> = {};
      const now = new Date();
      // Inicializa últimos 6 meses
      for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          groups[d.toISOString().substring(0, 7)] = 0;
      }

      dividendReceipts.forEach(d => {
          if (!d.paymentDate) return;
          const monthKey = d.paymentDate.substring(0, 7);
          if (groups[monthKey] !== undefined) groups[monthKey] += d.totalReceived;
      });
      
      const chartData = Object.entries(groups)
          .map(([date, value]) => {
              const [year, month] = date.split('-');
              const d = new Date(parseInt(year), parseInt(month)-1, 1);
              return { 
                  date, 
                  value, 
                  label: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.','')
              };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

      const currentMonthVal = chartData[chartData.length - 1]?.value || 0;
      return { chartData, currentMonthVal };
  }, [dividendReceipts]);

  // Magic Number
  const magicData = useMemo(() => {
      const reached = portfolio.filter(p => {
          const div = (p.dy_12m && p.currentPrice) ? (p.currentPrice * (p.dy_12m/100)/12) : (p.last_dividend || 0);
          const magicNum = div > 0 ? Math.ceil(p.currentPrice! / div) : 999999;
          return p.quantity >= magicNum;
      }).length;
      return reached;
  }, [portfolio]);

  // Goals
  const goalsData = useMemo(() => {
      const levels = [
          { level: 1, name: 'Iniciante', target: 1000 },
          { level: 2, name: 'Aprendiz', target: 5000 },
          { level: 3, name: 'Investidor', target: 10000 },
          { level: 4, name: 'Sócio', target: 50000 },
          { level: 5, name: 'Barão', target: 100000 },
          { level: 6, name: 'Magnata', target: 500000 },
          { level: 7, name: 'Independente', target: 1000000 }
      ];
      let curr = levels[0];
      let next = levels[1];
      for (const l of levels) {
          if (balance >= l.target) { curr = l; next = levels[l.level] || { ...l, target: l.target * 2 }; } 
          else break;
      }
      return { curr, next };
  }, [balance]);

  return (
    <div className="space-y-5 pb-8">
        
        {/* HERO CARD - PROFESSIONAL BANKING STYLE */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 shadow-xl anim-fade-in">
            {/* Decoração Sutil */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-[4rem] pointer-events-none border-b border-l border-zinc-100 dark:border-zinc-800/50"></div>
            
            <div className="p-7 relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 opacity-60">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Patrimônio Líquido</span>
                        </div>
                        <h1 className="text-[2.5rem] font-bold text-zinc-900 dark:text-white tracking-tighter leading-none">
                            {formatBRL(balance)}
                        </h1>
                    </div>
                    
                    {/* Badge de Rentabilidade */}
                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${profitValue >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                        {profitValue >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={3} /> : <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={3} />}
                        <span className="text-xs font-black">{profitPercent.toFixed(2)}%</span>
                    </div>
                </div>

                {/* Grid de Métricas Secundárias */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Custo Total</p>
                        <p className="text-base font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(invested)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Lucro Aberto</p>
                        <p className={`text-base font-bold ${profitValue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {profitValue >= 0 ? '+' : ''}{formatBRL(profitValue)}
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
                info="Previsão de pagamentos baseada em datas COM e anúncios oficiais."
            />
            
            <BentoCard 
                title="Renda Mensal" 
                value={formatBRL(incomeData.currentMonthVal)} 
                subtext="Acumulado Mês"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
                info="Soma de todos os proventos (Dividendos, JCP, Rendimentos) recebidos no mês atual."
            />

            <BentoCard 
                title="Bola de Neve" 
                value={magicData.toString()} 
                subtext="Ativos Mágicos"
                icon={Sparkles} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                onClick={() => setShowMagicNumber(true)}
                info="Ativos cuja renda mensal já compra uma nova cota automaticamente."
            />

            <BentoCard 
                title="Nível" 
                value={goalsData.curr.level.toString()} 
                subtext={goalsData.curr.name}
                icon={Trophy} 
                colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                onClick={() => setShowGoals(true)}
                info="Seu nível de investidor baseado no patrimônio acumulado."
            />

            <div className="col-span-2">
                <button onClick={() => setShowAllocation(true)} className="w-full bg-white dark:bg-zinc-900 p-5 rounded-[1.8rem] shadow-[0_2px_10px_rgb(0,0,0,0.03)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <PieIcon className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Alocação de Ativos</h3>
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

        {/* MODALS - Minimal Changes needed since logic is internal */}
        <SwipeableModal isOpen={showAgenda} onClose={() => setShowAgenda(false)}>
            <div className="p-6 h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">Agenda de Proventos</h2>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {agendaData.list.length === 0 ? <p className="text-zinc-500">Sem pagamentos futuros.</p> : 
                        Object.entries(agendaData.grouped).map(([m, items]) => (
                            <div key={m} className="mb-4">
                                <h3 className="font-bold text-xs uppercase text-zinc-400 mb-2">{getMonthName(m+'-01')}</h3>
                                {(items as DividendReceipt[]).map((i) => (
                                    <div key={i.id} className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                                        <div>
                                            <span className="font-bold text-zinc-900 dark:text-white block">{i.ticker}</span>
                                            <span className="text-[10px] text-zinc-500">{formatDateShort(i.paymentDate || i.dateCom)}</span>
                                        </div>
                                        <span className="font-bold text-emerald-500">{formatBRL(i.totalReceived)}</span>
                                    </div>
                                ))}
                            </div>
                        ))
                    }
                </div>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6 h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Histórico de Renda</h2>
                <div className="h-48 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={incomeData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9}} tickFormatter={(v) => `R$${v}`} />
                            <RechartsTooltip contentStyle={{backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl flex justify-between items-center">
                        <span className="font-bold text-zinc-500">Total Recebido</span>
                        <span className="font-black text-xl text-emerald-500">{formatBRL(totalDividendsReceived)}</span>
                    </div>
                </div>
            </div>
        </SwipeableModal>

        {/* Other modals remain similar but stripped of privacy logic */}
        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
             <div className="p-6 h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Alocação</h2>
                <div className="h-64 relative mb-6">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset} innerRadius={60} outerRadius={80} dataKey="value">
                                {(allocationView === 'CLASS' ? allocationData.byClass : allocationData.byAsset).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(val: number) => formatBRL(val)} contentStyle={{backgroundColor: '#18181b', borderRadius: '8px', border: 'none', color: '#fff'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-4">
                    <button onClick={() => setAllocationView('CLASS')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${allocationView === 'CLASS' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}>Classes</button>
                    <button onClick={() => setAllocationView('ASSET')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${allocationView === 'ASSET' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}>Ativos</button>
                </div>
             </div>
        </SwipeableModal>

    </div>
  );
};

export const Home = React.memo(HomeComponent);
