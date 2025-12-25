
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Calendar, X, ArrowUpRight, ReceiptText, Trophy, Building2, Briefcase, FilterX, Info, ExternalLink, ArrowDownToLine, Timer, ArrowUpCircle, ChevronRight, RefreshCw, Clock, Coins, CircleDollarSign, BarChart3, ShieldCheck, Scale, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  onAiSync?: () => void;
  isAiLoading?: boolean;
  sources?: { web: { uri: string; title: string } }[];
}

export const Home: React.FC<HomeProps> = ({ portfolio, dividendReceipts, realizedGain = 0, onAiSync, isAiLoading, sources = [] }) => {
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
  const realYield = yieldOnCost - IPCA_12M;
  const isPositiveReal = realYield > 0;
  const efficiencyPercent = IPCA_12M > 0 ? (yieldOnCost / IPCA_12M) * 100 : 0;

  const comparisonData = [
    { name: 'IPCA', value: IPCA_12M, fill: '#f43f5e', label: 'Inflação' },
    { name: 'Você', value: yieldOnCost, fill: isPositiveReal ? '#10b981' : '#fbbf24', label: 'Sua Carteira' }
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
    if (fiisVal > 0) result.push({ name: 'FIIs', value: fiisVal, color: '#38bdf8' }); 
    if (stocksVal > 0) result.push({ name: 'Ações', value: stocksVal, color: '#a855f7' }); 
    return result;
  }, [dataByAsset]);

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
    <div className="pb-32 pt-6 px-5 space-y-4">
      
      {/* Patrimônio Principal */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#1e293b] to-slate-900 border border-white/10 p-6 rounded-[2.5rem] shadow-2xl transition-all group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[60px] rounded-full"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <Wallet className="w-5 h-5" />
                   </div>
                   <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        Patrimônio
                    </h2>
                </div>
                {isAiLoading && (
                  <div className="flex items-center gap-2 bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                    <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">Atualizando</span>
                  </div>
                )}
            </div>

            <div className="relative z-10 mb-6">
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter tabular-nums mb-3 drop-shadow-lg">
                R$ {formatCurrency(currentBalance)}
              </div>
              
              <div className="flex items-center gap-3">
                 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md ${totalReturnVal >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
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

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5 relative z-10"></div>

            <div className="grid grid-cols-3 gap-2 relative z-10">
                <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] flex flex-col justify-center">
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate flex items-center gap-1">
                       <Coins className="w-3 h-3" /> Custo
                    </div>
                    <div className="text-xs font-bold text-slate-300 truncate tracking-tight">R$ {formatCurrency(totalInvested)}</div>
                </div>
                <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] flex flex-col justify-center">
                     <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Ativos
                     </div>
                     <div className="text-xs font-bold text-white flex items-center gap-1">
                        {assetCount} <span className="text-[8px] text-slate-500 font-normal">Papéis</span>
                     </div>
                </div>
                 <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.05] flex flex-col justify-center">
                     <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 truncate flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-emerald-500" /> Lucro Real.
                     </div>
                     <div className="text-xs font-bold text-emerald-400 truncate tracking-tight">R$ {formatCurrency(realizedGain)}</div>
                </div>
            </div>
        </div>
      </div>

      <div 
        onClick={() => setShowProventosModal(true)}
        className="animate-fade-in-up tap-highlight cursor-pointer"
        style={{ animationDelay: '100ms' }}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/20 rounded-[2.5rem] p-6 shadow-xl group hover:border-emerald-500/30 transition-all">
            <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full"></div>
            
            <div className="relative z-10 flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm leading-none tracking-tight">Rendimentos</h3>
                        <p className="text-[10px] text-emerald-500/60 font-black mt-1 uppercase tracking-[0.2em]">Últimos 12 Meses</p>
                    </div>
                </div>
                <div className="p-2 rounded-full bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-colors">
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

      <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          
          {portfolio.length > 0 ? (
            <div 
              onClick={() => setShowAllocationModal(true)}
              className="relative overflow-hidden bg-gradient-to-br from-violet-900/20 to-slate-900 border border-violet-500/20 rounded-[2.5rem] p-5 hover:border-violet-500/40 transition-all group tap-highlight cursor-pointer h-64 flex flex-col justify-between"
            >
                <div className="absolute left-0 top-0 w-32 h-32 bg-violet-500/10 blur-[40px] rounded-full"></div>

                <div className="relative z-10 flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
                        <div className="w-8 h-8 flex items-center justify-center bg-violet-500/20 rounded-xl">
                            <PieIcon className="w-4 h-4 text-violet-400" />
                        </div>
                        Carteira
                    </h3>
                </div>
                
                <div className="relative z-10 flex flex-col gap-4 flex-1 justify-end">
                    <div className="h-24 w-full relative pointer-events-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                  data={dataByAsset} 
                                  innerRadius={25} 
                                  outerRadius={40} 
                                  paddingAngle={5} 
                                  dataKey="value" 
                                  stroke="none" 
                                  cornerRadius={4}
                                >
                                    {dataByAsset.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="min-w-0">
                       <div className="flex flex-col gap-1.5">
                           {dataByAsset.slice(0, 2).map((entry, index) => (
                               <div key={entry.name} className="flex items-center justify-between gap-2">
                                   <div className="flex items-center gap-1.5 overflow-hidden">
                                       <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                       <span className="text-[9px] font-bold text-slate-300 truncate">{entry.name}</span>
                                   </div>
                                   <span className="text-[9px] font-black text-white">
                                     {currentBalance > 0 ? ((entry.value / currentBalance) * 100).toFixed(0) : 0}%
                                   </span>
                               </div>
                           ))}
                           {dataByAsset.length > 2 && <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">+ {dataByAsset.length - 2} outros</div>}
                       </div>
                    </div>
                </div>
            </div>
          ) : (
             <div className="glass p-8 rounded-[2.5rem] h-64 flex flex-col items-center justify-center text-center opacity-60">
                <PieIcon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sem ativos</p>
             </div>
          )}

          <div 
             onClick={() => setShowInflationModal(true)}
             className={`relative overflow-hidden rounded-[2.5rem] p-5 transition-all group tap-highlight cursor-pointer h-64 flex flex-col justify-between ${isPositiveReal ? 'bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 hover:border-emerald-500/40' : 'bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/20 hover:border-rose-500/40'}`}
          >
             <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full"></div>

             <div className="relative z-10 flex justify-between items-start mb-4">
                 <h3 className="text-white font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${isPositiveReal ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                        <Scale className={`w-4 h-4 ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`} />
                    </div>
                    Real
                 </h3>
             </div>

             <div className="relative z-10 flex flex-col flex-1 justify-end">
                <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-2xl font-black tabular-nums tracking-tighter ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositiveReal ? '+' : ''}{realYield.toFixed(2)}%
                    </span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-lg border w-fit mb-4 ${isPositiveReal ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {isPositiveReal ? 'Ganho Real' : 'Perda Real'}
                </span>

                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden flex">
                    <div className="h-full bg-rose-500 opacity-60" style={{ width: '40%' }}></div>
                    <div className={`h-full ${isPositiveReal ? 'bg-emerald-400' : 'bg-yellow-400'} shadow-[0_0_10px_currentColor]`} style={{ width: '60%' }}></div>
                </div>
                
                <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-slate-500">
                    <span>IPCA {IPCA_12M}%</span>
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
                className="bg-white/[0.03] py-2.5 px-4 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-accent border border-white/5 hover:border-accent/30 transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-3 h-3" />
                {source.web.title || 'Referência de Mercado'}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* --- MODAL PROVENTOS (Com Swipe) --- */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        {/* ... (Conteúdo do modal inalterado para brevidade, mantém padrão interno) ... */}
        <div className="px-7 pt-2 pb-10">
           <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter">Proventos</h3>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">Evolução de Dividendos</p>
              </div>
              <button onClick={() => setShowProventosModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                <X className="w-5 h-5" />
              </button>
           </div>

           <div className="h-32 w-full mb-6">
                 {dividendsChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dividendsChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.8}/>
                                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} 
                            />
                            <Tooltip 
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(val: number) => [`R$ ${formatCurrency(val)}`, 'Recebido']}
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '4px' }}
                            />
                            <Bar 
                                dataKey="value" 
                                fill="url(#barGradient)" 
                                radius={[4, 4, 0, 0]} 
                                barSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sem dados suficientes</span>
                    </div>
                 )}
           </div>

           <div className="bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] grid grid-cols-2 mb-6">
              <button onClick={() => setProventosTab('statement')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'statement' ? 'bg-emerald-500 text-primary shadow-lg' : 'text-slate-500'}`}>Extrato</button>
              <button onClick={() => setProventosTab('ranking')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'ranking' ? 'bg-accent text-primary shadow-lg' : 'text-slate-500'}`}>Ranking</button>
           </div>

           <div className="space-y-6">
               {proventosTab === 'statement' ? (
                 Object.keys(proventosGrouped).length === 0 ? (
                    <div className="text-center py-20 text-slate-500 text-xs font-bold uppercase tracking-widest">Nenhum provento recebido</div>
                 ) : (
                    Object.entries(proventosGrouped).map(([month, receipts]: [string, DividendReceipt[]], i) => (
                        <div key={month} className="space-y-3 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="flex items-center gap-4 sticky top-0 bg-primary/95 backdrop-blur-sm z-10 py-2">
                                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{month}</h4>
                                <div className="h-px flex-1 bg-white/[0.05]"></div>
                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                                    Total: R$ {formatCurrency(receipts.reduce((a, b) => a + b.totalReceived, 0))}
                                </span>
                            </div>
                            {receipts.map(r => {
                                const isFii = r.assetType === AssetType.FII;
                                return (
                                <div key={r.id} className="glass p-4 rounded-3xl flex items-center justify-between border border-white/[0.02] hover:bg-white/[0.05] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center text-[7px] font-black ring-1 uppercase shadow-sm ${isFii ? 'bg-accent/10 text-accent ring-accent/20' : 'bg-purple-500/10 text-purple-400 ring-purple-500/20'}`}>
                                            <span className="text-[9px] mb-0.5">{r.ticker.substring(0,4)}</span>
                                            {isFii ? 'REND' : 'DIV'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white leading-none mb-1">{r.ticker}</div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5" />
                                                {r.paymentDate.split('-').reverse().join('/')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-emerald-400 font-black text-sm tabular-nums">R$ {formatCurrency(r.totalReceived)}</div>
                                        <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">{r.type.replace('RENDIMENTO', 'REND.').substring(0, 10)}</div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ))
                 )
               ) : (
                 <div className="space-y-3">
                    {rankingProventos.map((item, idx) => (
                        <div key={item.ticker} className="glass p-4 rounded-[2rem] flex items-center gap-4 animate-fade-in-up hover:bg-white/[0.05] transition-colors" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs border border-white/5">
                                #{idx + 1}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-black text-white text-sm">{item.ticker}</span>
                                    <span className="font-black text-emerald-400 tabular-nums">R$ {formatCurrency(item.total)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                                        style={{ width: `${(item.total / rankingProventos[0].total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
               )}
           </div>
        </div>
      </SwipeableModal>

      {/* --- MODAL INFLAÇÃO e ALOCAÇÃO (Mantidos sem alterações lógicas, apenas o grid foi ajustado acima) --- */}
      <SwipeableModal isOpen={showInflationModal} onClose={() => setShowInflationModal(false)}>
        {/* ... */}
        <div className="px-7 pt-2 pb-10">
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${isPositiveReal ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} border`}>
                         {isPositiveReal ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-white tracking-tighter">Poder de Compra</h3>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">Análise de Ganho Real</p>
                      </div>
                 </div>
                 <button onClick={() => setShowInflationModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                     <X className="w-5 h-5" />
                 </button>
             </div>

             <div className="h-32 w-full mb-6 relative">
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={comparisonData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 30 }} barCategoryGap={10}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                         <XAxis type="number" hide />
                         <YAxis 
                             dataKey="label" 
                             type="category" 
                             width={80} 
                             tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                             axisLine={false}
                             tickLine={false}
                         />
                         <Bar 
                             dataKey="value" 
                             radius={[0, 6, 6, 0]} 
                             barSize={24} 
                             label={{ position: 'right', fill: '#fff', fontSize: 11, fontWeight: 800, formatter: (v: any) => `${v.toFixed(2)}%` }}
                         >
                             {comparisonData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                         </Bar>
                     </BarChart>
                 </ResponsiveContainer>
             </div>

             <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                 <div className={`absolute top-0 bottom-0 left-0 w-1 ${isPositiveReal ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                 
                 <h4 className={`text-sm font-black mb-2 ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {isPositiveReal ? 'Patrimônio Protegido' : 'Alerta: Erosão de Valor'}
                 </h4>
                 
                 <p className="text-xs text-slate-300 leading-relaxed font-medium">
                     {isPositiveReal 
                         ? `Excelente! Seus rendimentos (Yield) estão ${realYield.toFixed(2)}% acima da inflação. Isso significa que você está aumentando seu poder de compra real.`
                         : `Atenção. Seus rendimentos estão abaixo da inflação. Na prática, seu dinheiro está perdendo ${Math.abs(realYield).toFixed(2)}% de poder de compra ao ano.`
                     }
                 </p>
             </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        {/* ... */}
        <div className="px-7 pt-2 pb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter">Alocação</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Composição do Patrimônio</p>
            </div>
            <button onClick={() => setShowAllocationModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] grid grid-cols-2 mb-8">
            <button onClick={() => setAllocationTab('asset')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'asset' ? 'bg-accent text-primary shadow-lg' : 'text-slate-500'}`}>Por Ativo</button>
            <button onClick={() => setAllocationTab('type')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'type' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500'}`}>Por Classe</button>
          </div>

          <div className="space-y-8">
              <div className="h-64 relative">
                   <ResponsiveContainer width="100%" height="100%" key={allocationTab}>
                      <PieChart>
                          <Pie 
                              data={allocationTab === 'asset' ? dataByAsset : dataByType} 
                              innerRadius={60} 
                              outerRadius={100} 
                              paddingAngle={5} 
                              dataKey="value" 
                              stroke="none" 
                              cornerRadius={8}
                          >
                              {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => (
                                  <Cell 
                                      key={`cell-${index}`} 
                                      fill={allocationTab === 'type' && entry.color ? entry.color : COLORS[index % COLORS.length]} 
                                  />
                              ))}
                          </Pie>
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                              formatter={(val: number) => `R$ ${formatCurrency(val)}`}
                          />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</div>
                          <div className="text-lg font-black text-white">R$ {formatCurrency(currentBalance)}</div>
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                  {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => {
                      const percent = currentBalance > 0 ? (entry.value / currentBalance) * 100 : 0;
                      const color = allocationTab === 'type' && entry.color ? entry.color : COLORS[index % COLORS.length];
                      
                      return (
                          <div key={entry.name} className="p-4 rounded-[2rem] bg-white/[0.02] border border-white/[0.04]">
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: `${color}20`, color: color }}>
                                          {index + 1}
                                      </div>
                                      <div>
                                          <div className="text-sm font-black text-white">{entry.name}</div>
                                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                              {percent.toFixed(1)}% do total
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-sm font-bold text-slate-200">R$ {formatCurrency(entry.value)}</div>
                                  </div>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                      className="h-full rounded-full" 
                                      style={{ width: `${percent}%`, backgroundColor: color }} 
                                  />
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
        </div>
      </SwipeableModal>
    </div>
  );
};
