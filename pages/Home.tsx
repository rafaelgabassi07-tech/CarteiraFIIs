
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, TrendingDown, Coins, Building2, ArrowUpCircle, ChevronRight, RefreshCw, CircleDollarSign, PieChart as PieIcon, Scale, Info, ExternalLink, X, Calendar, Trophy, ReceiptText, BarChart3, Calculator, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  onAiSync?: () => void;
  isAiLoading?: boolean;
  sources?: { web: { uri: string; title: string } }[];
  portfolioStartDate?: string;
}

export const Home: React.FC<HomeProps> = ({ portfolio, dividendReceipts, realizedGain = 0, onAiSync, isAiLoading, sources = [], portfolioStartDate }) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [proventosTab, setProventosTab] = useState<'statement' | 'ranking'>('statement');
  
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'asset' | 'type'>('asset');
  
  const [showInflationModal, setShowInflationModal] = useState(false);

  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  
  const totalDividends = useMemo(() => dividendReceipts.reduce((acc, curr) => acc + curr.totalReceived, 0), [dividendReceipts]);
  const monthlyAverage = useMemo(() => totalDividends > 0 ? totalDividends / 12 : 0, [totalDividends]);
  
  const unrealizedGain = currentBalance - totalInvested;
  const totalReturnVal = unrealizedGain + realizedGain + totalDividends;
  const totalReturnPercent = totalInvested > 0 ? (totalReturnVal / totalInvested) * 100 : 0;

  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;
  const assetCount = portfolio.length;

  const IPCA_12M = 4.62; 
  
  // Cálculo de Inflação Proporcional
  const { benchmarkInflation, inflationLabel } = useMemo(() => {
    if (!portfolioStartDate) return { benchmarkInflation: IPCA_12M, inflationLabel: "12 Meses" };
    
    const start = new Date(portfolioStartDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Se a carteira tem menos de 12 meses (aprox 365 dias), usa inflação proporcional
    if (diffDays < 365 && diffDays > 0) {
        const proportional = (IPCA_12M / 365) * diffDays;
        return { 
            benchmarkInflation: proportional, 
            inflationLabel: "Proporcional" // Indica que é inflação do período, não 12m cheios
        };
    }
    
    return { benchmarkInflation: IPCA_12M, inflationLabel: "12 Meses" };
  }, [portfolioStartDate]);

  const realYield = yieldOnCost - benchmarkInflation;
  const isPositiveReal = realYield > 0;
  
  const comparisonData = [
    { name: `Inflação (${inflationLabel})`, value: benchmarkInflation, fill: '#f43f5e' }, // Rose 500
    { name: 'Seus Dividendos', value: yieldOnCost, fill: isPositiveReal ? '#10b981' : '#fbbf24' } // Emerald 500 or Amber 400
  ];

  const dataByAsset = useMemo(() => {
    return portfolio
      .map(p => ({
        name: p.ticker,
        value: (p.currentPrice || p.averagePrice) * p.quantity,
        type: p.assetType,
        quantity: p.quantity,
        color: p.assetType === AssetType.FII ? '#38bdf8' : '#a855f7' 
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const dataByType = useMemo(() => {
    const fiisVal = dataByAsset.filter(d => d.type === AssetType.FII).reduce((acc, c) => acc + c.value, 0);
    const stocksVal = dataByAsset.filter(d => d.type === AssetType.STOCK).reduce((acc, c) => acc + c.value, 0);
    const result = [];
    if (fiisVal > 0) result.push({ name: 'Fundos Imobiliários', value: fiisVal, color: '#38bdf8' }); 
    if (stocksVal > 0) result.push({ name: 'Ações', value: stocksVal, color: '#a855f7' }); 
    return result;
  }, [dataByAsset]);

  // Helper para dados corretos no modal de alocação
  const currentAllocationData = allocationTab === 'asset' ? dataByAsset : dataByType;

  const dividendsChartData = useMemo(() => {
    const agg: Record<string, number> = {};
    dividendReceipts.forEach(d => {
        const key = d.paymentDate.substring(0, 7); 
        agg[key] = (agg[key] || 0) + d.totalReceived;
    });

    return Object.entries(agg)
        .sort((a, b) => a[0].localeCompare(b[0])) 
        .slice(-12)
        .map(([key, val]) => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return {
                rawDate: key,
                name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
                fullDate: date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
                value: val
            };
        });
  }, [dividendReceipts]);

  const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#34d399', '#fbbf24', '#60a5fa'];
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const proventosGrouped = useMemo(() => {
    const sorted = [...dividendReceipts].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    const groups: Record<string, DividendReceipt[]> = {};
    
    sorted.forEach(d => {
        const dateObj = new Date(d.paymentDate + 'T12:00:00');
        const monthYear = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(d);
    });
    return groups;
  }, [dividendReceipts]);

  const rankingProventos = useMemo(() => {
    const map = new Map<string, number>();
    dividendReceipts.forEach(d => {
        const current = map.get(d.ticker) || 0;
        map.set(d.ticker, current + d.totalReceived);
    });
    return Array.from(map.entries())
        .map(([ticker, total]) => ({ ticker, total }))
        .sort((a, b) => b.total - a.total);
  }, [dividendReceipts]);

  return (
    <div className="pb-32 pt-2 px-5 space-y-5">
      
      {/* Patrimônio Principal */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-black border border-white/10 p-6 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] group">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[60px] rounded-full"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none mix-blend-overlay"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-accent ring-1 ring-white/10 backdrop-blur-md">
                      <Wallet className="w-5 h-5" />
                   </div>
                   <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        Patrimônio Total
                    </h2>
                </div>
                {isAiLoading && (
                  <div className="flex items-center gap-2 bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20 backdrop-blur-md">
                    <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">Atualizando</span>
                  </div>
                )}
            </div>

            <div className="relative z-10 mb-8">
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter tabular-nums mb-3 drop-shadow-xl">
                R$ {formatCurrency(currentBalance)}
              </div>
              
              <div className="flex items-center gap-3">
                 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg ${totalReturnVal >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {totalReturnVal >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span className="text-xs font-black tabular-nums">
                        R$ {formatCurrency(Math.abs(totalReturnVal))}
                    </span>
                 </div>
                 <span className={`text-xs font-black tracking-tight ${totalReturnVal >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                    ({totalReturnVal >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
                 </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 relative z-10">
                <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] flex flex-col justify-center backdrop-blur-sm">
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate flex items-center gap-1">
                       <Coins className="w-3 h-3" /> Custo
                    </div>
                    <div className="text-xs font-bold text-slate-300 truncate tracking-tight">R$ {formatCurrency(totalInvested)}</div>
                </div>
                <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] flex flex-col justify-center backdrop-blur-sm">
                     <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Posições
                     </div>
                     <div className="text-xs font-bold text-white flex items-center gap-1">
                        {assetCount} <span className="text-[8px] text-slate-500 font-normal">Ativos</span>
                     </div>
                </div>
                 <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] flex flex-col justify-center backdrop-blur-sm">
                     <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-emerald-500" /> Lucro Real.
                     </div>
                     <div className="text-xs font-bold text-emerald-400 truncate tracking-tight">R$ {formatCurrency(realizedGain)}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Card de Rendimentos */}
      <div 
        onClick={() => setShowProventosModal(true)}
        className="animate-fade-in-up tap-highlight cursor-pointer"
        style={{ animationDelay: '100ms' }}
      >
        <div className="relative overflow-hidden bg-gradient-to-tr from-emerald-950/40 to-slate-900 border border-emerald-500/10 rounded-[2.5rem] p-6 shadow-xl group hover:border-emerald-500/30 transition-all active:scale-[0.99]">
            <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full"></div>
            
            <div className="relative z-10 flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm leading-none tracking-tight">Rendimentos</h3>
                        <p className="text-[10px] text-emerald-500/60 font-black mt-1 uppercase tracking-[0.2em]">Últimos 12 Meses</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
            
            <div className="relative z-10 flex items-end justify-between">
                <div>
                     <div className="text-3xl font-black text-white tabular-nums tracking-tighter drop-shadow-sm mb-1">
                        R$ {formatCurrency(totalDividends)}
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10 uppercase tracking-wider">
                           Média: R$ {formatCurrency(monthlyAverage)}/mês
                        </div>
                     </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Yield on Cost</span>
                    <span className="text-xl font-black text-emerald-400 tabular-nums">{yieldOnCost.toFixed(2)}%</span>
                </div>
            </div>
        </div>
      </div>

      {/* Grid de Alocação e Inflação */}
      <div className="grid grid-cols-1 gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          
          {/* Alocação */}
          {portfolio.length > 0 ? (
            <div 
              onClick={() => setShowAllocationModal(true)}
              className="relative overflow-hidden bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/10 rounded-[2.5rem] p-6 hover:border-indigo-500/30 transition-all group tap-highlight cursor-pointer min-h-[16rem] flex flex-col justify-between active:scale-[0.99] z-10"
            >
                <div className="absolute left-0 top-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex items-center justify-between mb-2 pointer-events-none">
                    <h3 className="text-white font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
                        <div className="w-8 h-8 flex items-center justify-center bg-indigo-500/20 rounded-xl text-indigo-400">
                            <PieIcon className="w-4 h-4" />
                        </div>
                        Alocação
                    </h3>
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                </div>
                
                <div className="relative z-10 flex flex-row items-center gap-6 flex-1">
                    {/* IMPORTANTE: pointer-events-none aqui garante que o clique passe para o card */}
                    <div className="h-32 w-32 relative pointer-events-none shrink-0 drop-shadow-xl">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                  data={dataByAsset} 
                                  innerRadius={30} 
                                  outerRadius={55} 
                                  paddingAngle={5} 
                                  dataKey="value" 
                                  stroke="none" 
                                  cornerRadius={6}
                                >
                                    {dataByAsset.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="min-w-0 flex-1 pointer-events-none">
                       <div className="flex flex-col gap-3">
                           {dataByAsset.slice(0, 3).map((entry, index) => (
                               <div key={entry.name} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                   <div className="flex items-center gap-2 overflow-hidden">
                                       <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }} />
                                       <span className="text-xs font-bold text-slate-300 truncate">{entry.name}</span>
                                   </div>
                                   <span className="text-xs font-black text-white tabular-nums">
                                     {currentBalance > 0 ? ((entry.value / currentBalance) * 100).toFixed(0) : 0}%
                                   </span>
                               </div>
                           ))}
                           {dataByAsset.length > 3 && <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center mt-1">+ {dataByAsset.length - 3} outros</div>}
                       </div>
                    </div>
                </div>
            </div>
          ) : (
             <div className="glass p-8 rounded-[2.5rem] h-64 flex flex-col items-center justify-center text-center opacity-60 border border-dashed border-white/10">
                <PieIcon className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sem ativos registrados</p>
             </div>
          )}

          {/* Ganho Real - Aprimorado com Lógica Proporcional */}
          <div 
             onClick={() => setShowInflationModal(true)}
             className={`relative overflow-hidden rounded-[2.5rem] p-6 transition-all group tap-highlight cursor-pointer min-h-[16rem] flex flex-col justify-between shadow-lg active:scale-[0.99] z-10 ${isPositiveReal ? 'bg-gradient-to-tr from-emerald-950/50 to-slate-900 border border-emerald-500/20 hover:border-emerald-500/40' : 'bg-gradient-to-tr from-rose-950/50 to-slate-900 border border-rose-500/20 hover:border-rose-500/40'}`}
          >
             <div className={`absolute right-0 top-0 w-48 h-48 blur-[80px] rounded-full opacity-20 pointer-events-none ${isPositiveReal ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

             <div className="relative z-10 flex justify-between items-start mb-6 pointer-events-none">
                 <div>
                    <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider mb-1">
                        <Scale className={`w-4 h-4 ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`} />
                        Ganho Real
                    </h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                         {inflationLabel === "Proporcional" ? "Rentabilidade vs. Período" : "Poder de Compra (12m)"}
                    </p>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                 </div>
             </div>

             <div className="relative z-10 flex flex-col flex-1 justify-end pointer-events-none">
                <div className="flex items-center gap-3 mb-4">
                   <div className={`text-5xl font-black tabular-nums tracking-tighter drop-shadow-lg ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositiveReal ? '+' : ''}{realYield.toFixed(2)}%
                   </div>
                </div>

                {/* Barra de Progresso Comparativa */}
                <div className="space-y-2">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <span>Inflação ({inflationLabel})</span>
                      <span>Seu Yield</span>
                   </div>
                   <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex ring-1 ring-white/10 relative">
                       {/* Marcador de Zero/Inflação */}
                       <div 
                         className="h-full bg-rose-500/60 z-10 relative" 
                         style={{ width: `${Math.min(100, (benchmarkInflation / Math.max(benchmarkInflation, yieldOnCost)) * 80)}%` }} 
                       />
                       
                       {/* Barra de Yield */}
                       <div 
                         className={`absolute top-0 left-0 h-full z-20 transition-all duration-1000 ease-out ${isPositiveReal ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-yellow-400 opacity-80'}`} 
                         style={{ width: `${Math.min(100, (yieldOnCost / Math.max(benchmarkInflation, yieldOnCost)) * 100)}%` }}
                       />
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-white tabular-nums">
                      <span className="text-rose-400">{benchmarkInflation.toFixed(2)}%</span>
                      <span className={isPositiveReal ? 'text-emerald-400' : 'text-yellow-400'}>{yieldOnCost.toFixed(2)}%</span>
                   </div>
                </div>

                <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest w-fit ${isPositiveReal ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                   {isPositiveReal ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                   {isPositiveReal ? 'Superando a Inflação' : 'Abaixo da Inflação'}
                </div>
             </div>
          </div>
      </div>

      {sources.length > 0 && (
        <div className="animate-fade-in-up space-y-4" style={{ animationDelay: '300ms' }}>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] px-2 flex items-center gap-2">
             <Info className="w-3.5 h-3.5" /> Verificação Web Gemini
          </h3>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.web.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/[0.03] py-2.5 px-4 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-accent border border-white/5 hover:border-accent/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <ExternalLink className="w-3 h-3" />
                {source.web.title || 'Referência de Mercado'}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* --- MODAL PROVENTOS --- */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-6 pt-2 pb-10">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Proventos</h3>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">Evolução de Dividendos</p>
              </div>
           </div>

           <div className="h-56 w-full mb-8 relative">
                 {dividendsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dividendsChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                            />
                            <Tooltip 
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(val: number) => [`R$ ${formatCurrency(val)}`, 'Recebido']}
                            />
                            <Bar 
                                dataKey="value" 
                                fill="url(#barGradient)" 
                                radius={[6, 6, 0, 0]} 
                                barSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sem histórico recente</span>
                    </div>
                 )}
           </div>

           <div className="bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] grid grid-cols-2 mb-6">
              <button onClick={() => setProventosTab('statement')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'statement' ? 'bg-emerald-500 text-primary shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>Extrato Detalhado</button>
              <button onClick={() => setProventosTab('ranking')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'ranking' ? 'bg-accent text-primary shadow-lg shadow-accent/20' : 'text-slate-500 hover:text-white'}`}>Ranking Top</button>
           </div>

           <div className="space-y-6 pb-safe">
               {proventosTab === 'statement' ? (
                 Object.keys(proventosGrouped).length === 0 ? (
                    <div className="text-center py-12">
                        <div className="p-4 bg-white/[0.03] rounded-full w-fit mx-auto mb-3">
                             <ReceiptText className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Nenhum provento registrado</p>
                    </div>
                 ) : (
                    Object.entries(proventosGrouped).map(([month, receipts]: [string, DividendReceipt[]], i) => (
                        <div key={month} className="space-y-3 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="flex items-center gap-4 sticky top-0 bg-[#0f172a]/95 backdrop-blur-md z-10 py-3 border-b border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{month}</h4>
                                <div className="h-px flex-1"></div>
                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                                    Total: R$ {formatCurrency(receipts.reduce((a, b) => a + b.totalReceived, 0))}
                                </span>
                            </div>
                            {receipts.map(r => {
                                const isFii = r.assetType === AssetType.FII;
                                return (
                                <div key={r.id} className="glass p-5 rounded-[2rem] flex items-center justify-between border border-white/[0.03] hover:bg-white/[0.05] transition-colors shadow-sm active:scale-[0.98] duration-200">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-[8px] font-black ring-1 uppercase shadow-sm ${isFii ? 'bg-accent/10 text-accent ring-accent/20' : 'bg-purple-500/10 text-purple-400 ring-purple-500/20'}`}>
                                            <span className="text-[10px] mb-0.5">{r.ticker.substring(0,4)}</span>
                                            {isFii ? 'FII' : 'AÇÃO'}
                                        </div>
                                        <div>
                                            <div className="text-base font-black text-white leading-none mb-1.5">{r.ticker}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                Pago: {r.paymentDate.split('-').reverse().join('/')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-emerald-400 font-black text-sm tabular-nums">R$ {formatCurrency(r.totalReceived)}</div>
                                        <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">{r.type === 'DIVIDENDO' ? 'DIV' : 'JCP'}</div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ))
                 )
               ) : (
                 <div className="space-y-3">
                    {rankingProventos.length === 0 ? (
                         <div className="text-center py-12">
                            <div className="p-4 bg-white/[0.03] rounded-full w-fit mx-auto mb-3">
                                 <Trophy className="w-6 h-6 text-slate-600" />
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sem dados para ranking</p>
                        </div>
                    ) : (
                        rankingProventos.map((item, idx) => (
                            <div key={item.ticker} className="glass p-5 rounded-[2rem] flex items-center gap-4 animate-fade-in-up hover:bg-white/[0.05] transition-colors border border-white/[0.03] active:scale-[0.98]" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${idx === 0 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : idx === 1 ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' : idx === 2 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                    #{idx + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-white text-base">{item.ticker}</span>
                                        <span className="font-black text-emerald-400 tabular-nums">R$ {formatCurrency(item.total)}</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden ring-1 ring-white/5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                                            style={{ width: `${(item.total / rankingProventos[0].total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
               )}
           </div>
        </div>
      </SwipeableModal>

      {/* --- MODAL ALOCAÇÃO (NOVO) --- */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pt-2 pb-10">
            <div className="flex items-center justify-between mb-8">
               <div>
                 <h3 className="text-2xl font-black text-white tracking-tighter">Alocação</h3>
                 <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">Diversificação da Carteira</p>
               </div>
            </div>

            <div className="flex justify-center mb-6">
                <div className="h-56 w-full relative drop-shadow-2xl">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={currentAllocationData} 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={5} 
                                dataKey="value" 
                                stroke="none" 
                                cornerRadius={8}
                            >
                                {currentAllocationData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(val: number) => [`R$ ${formatCurrency(val)}`, 'Valor']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <span className="text-3xl font-black text-white tracking-tighter tabular-nums">
                            {allocationTab === 'asset' ? dataByAsset.length : dataByType.length}
                         </span>
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {allocationTab === 'asset' ? 'Ativos' : 'Classes'}
                         </span>
                    </div>
                </div>
            </div>

            <div className="bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] grid grid-cols-2 mb-6">
               <button onClick={() => setAllocationTab('asset')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'asset' ? 'bg-indigo-500 text-primary shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}>Por Ativo</button>
               <button onClick={() => setAllocationTab('type')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'type' ? 'bg-indigo-500 text-primary shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}>Por Classe</button>
            </div>

            <div className="space-y-3 pb-safe">
                {currentAllocationData.map((entry, index) => (
                    <div key={entry.name} className="glass p-4 rounded-[1.5rem] flex items-center justify-between border border-white/[0.03] animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                         <div className="flex items-center gap-3">
                             <div className="w-3 h-10 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                             <div>
                                 <div className="text-sm font-black text-white">{entry.name}</div>
                                 <div className="text-[10px] text-slate-500 font-bold tabular-nums">R$ {formatCurrency(entry.value)}</div>
                             </div>
                         </div>
                         <div className="text-right">
                             <div className="text-sm font-black text-white tabular-nums">
                                 {currentBalance > 0 ? ((entry.value / currentBalance) * 100).toFixed(1) : 0}%
                             </div>
                         </div>
                    </div>
                ))}
            </div>
         </div>
      </SwipeableModal>

      {/* --- MODAL GANHO REAL (NOVO) --- */}
      <SwipeableModal isOpen={showInflationModal} onClose={() => setShowInflationModal(false)}>
          <div className="px-6 pt-2 pb-10">
             <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter">Ganho Real</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Sua Rentabilidade vs. Inflação</p>
                </div>
             </div>

             <div className="bg-slate-900 rounded-[2.5rem] p-6 mb-6 border border-white/5 relative overflow-hidden">
                <div className="relative z-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Resultado Final ({inflationLabel})</p>
                    <div className={`text-6xl font-black tracking-tighter tabular-nums mb-2 drop-shadow-xl ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositiveReal ? '+' : ''}{realYield.toFixed(2)}%
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${isPositiveReal ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {isPositiveReal ? 'Acima da Inflação' : 'Abaixo da Inflação'}
                    </div>
                </div>
             </div>

             <div className="space-y-4 mb-8">
                 <div className="flex items-center gap-2 mb-2">
                     <Calculator className="w-4 h-4 text-accent" />
                     <h4 className="text-xs font-black text-white uppercase tracking-wider">A Matemática da Riqueza</h4>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                     <div className="text-center">
                         <div className="text-2xl font-black text-white tabular-nums">{yieldOnCost.toFixed(2)}%</div>
                         <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Yield Nominal</div>
                     </div>
                     <div className="text-slate-600 font-black text-xl">-</div>
                     <div className="text-center">
                         <div className="text-2xl font-black text-rose-400 tabular-nums">{benchmarkInflation.toFixed(2)}%</div>
                         <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">IPCA ({inflationLabel})</div>
                     </div>
                     <div className="text-slate-600 font-black text-xl">=</div>
                     <div className="text-center">
                         <div className={`text-2xl font-black tabular-nums ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {realYield.toFixed(2)}%
                         </div>
                         <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Real</div>
                     </div>
                 </div>
             </div>

             <div className="h-48 w-full mb-6 relative">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 absolute -top-6 left-0">Comparativo Visual</p>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical" barSize={30} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(val: number) => [`${val.toFixed(2)}%`, 'Taxa']}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {comparisonData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                 </ResponsiveContainer>
             </div>

             <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed">
                 <div className="flex items-center gap-2 mb-2 font-bold text-indigo-400 uppercase tracking-wider text-[10px]">
                     <Info className="w-3.5 h-3.5" /> Entenda
                 </div>
                 O <strong>Ganho Real</strong> desconta a inflação do seu retorno. Se sua carteira tem menos de 1 ano, usamos a inflação proporcional ao tempo investido para uma comparação justa.
             </div>
          </div>
      </SwipeableModal>
    </div>
  );
};
