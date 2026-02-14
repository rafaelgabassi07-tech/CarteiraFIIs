
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { CircleDollarSign, CalendarClock, PieChart as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, Wallet, ArrowRight, Zap, Target, Layers, LayoutGrid, Coins } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis } from 'recharts';
import { fetchFutureAnnouncements } from '../services/dataService';

// --- SUB-COMPONENTS ---
const BentoCard = ({ title, value, subtext, icon: Icon, colorClass, onClick, className }: any) => (
    <button onClick={onClick} className={`bg-white dark:bg-zinc-900 p-5 rounded-[1.5rem] flex flex-col justify-between items-start text-left shadow-[0_4px_20px_rgb(0,0,0,0.02)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 press-effect h-full ${className}`}>
        <div className="flex justify-between w-full mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                <ArrowRight className="w-4 h-4 -rotate-45" />
            </div>
        </div>
        <div>
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">{title}</h3>
            <p className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{value}</p>
            {subtext && <p className="text-[10px] text-zinc-400 font-medium mt-1">{subtext}</p>}
        </div>
    </button>
);

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return '••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

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

  // --- CALCS ---
  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  const { typeData, chartData } = useMemo(() => {
      let fiis = 0, stocks = 0;
      portfolio.forEach(p => {
          const v = p.quantity * (p.currentPrice || 0);
          if(p.assetType === AssetType.FII) fiis += v; else stocks += v;
      });
      const total = fiis + stocks || 1;
      return { 
          typeData: { fiis: (fiis/total)*100, stocks: (stocks/total)*100 },
          chartData: [
              { name: 'FIIs', value: fiis, color: '#6366f1' }, 
              { name: 'Ações', value: stocks, color: '#0ea5e9' }
          ].filter(d => d.value > 0)
      };
  }, [portfolio]);

  const proventosStats = useMemo(() => {
     // Simple summation for UI
     const total = dividendReceipts.reduce((acc, curr) => acc + curr.totalReceived, 0);
     return { total };
  }, [dividendReceipts]);

  return (
    <div className="space-y-6 pb-8">
        
        {/* HERO CARD - Estilo Cartão de Crédito Moderno */}
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 text-white p-7 shadow-2xl shadow-zinc-900/20 anim-fade-in">
            {/* Background Mesh Gradients */}
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

        {/* BENTO GRID WIDGETS */}
        <div className="grid grid-cols-2 gap-4 anim-slide-up">
            <BentoCard 
                title="Agenda" 
                value="Próximos" 
                subtext="Ver previsões"
                icon={CalendarClock} 
                colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                onClick={() => setShowAgenda(true)}
            />
            <BentoCard 
                title="Renda" 
                value={formatBRL(proventosStats.total, privacyMode)} 
                subtext="Recebido Total"
                icon={CircleDollarSign} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                onClick={() => setShowProventos(true)}
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
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> FIIs {typeData.fiis.toFixed(0)}%</span>
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div> Ações {typeData.stocks.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </button>
            </div>
        </div>

        {/* MODALS PLACEHOLDERS (Reusando lógica existente, visual novo via CSS global) */}
        <SwipeableModal isOpen={showAgenda} onClose={() => setShowAgenda(false)}>
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Agenda</h2>
                <p className="text-zinc-500">Funcionalidade detalhada aqui...</p>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showProventos} onClose={() => setShowProventos(false)}>
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Extrato de Renda</h2>
                <div className="h-64 w-full">
                     {/* Graph Logic Here */}
                </div>
            </div>
        </SwipeableModal>

        <SwipeableModal isOpen={showAllocation} onClose={() => setShowAllocation(false)}>
             <div className="p-6 h-[60vh]">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Diversificação</h2>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" cornerRadius={8}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
