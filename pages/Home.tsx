import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, ChevronRight, RefreshCw, CircleDollarSign, PieChart as PieIcon, Scale, ExternalLink, Sparkles, Layers, TrendingDown, LayoutGrid, PieChart as PieIcon2, ShoppingBag, BarChart3, Info, Target, ArrowUpCircle, ShieldCheck, Calendar, Zap, Star, Trophy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
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
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showInflationModal, setShowInflationModal] = useState(false);
  
  const [proventosTab, setProventosTab] = useState<'history' | 'magic' | 'upcoming'>('history');
  const [allocationTab, setAllocationTab] = useState<'assets' | 'classes' | 'rebalance'>('assets');

  // Filtro de segurança para IDs únicos
  const cleanDividendReceipts = useMemo(() => {
    const map = new Map<string, DividendReceipt>();
    dividendReceipts.forEach(div => {
      if (div && div.id) map.set(div.id, div);
    });
    return Array.from(map.values());
  }, [dividendReceipts]);

  // Cálculos de Patrimônio
  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  
  const totalDividends = useMemo(() => 
    cleanDividendReceipts
      .filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') <= new Date())
      .reduce((acc, curr) => acc + (curr.totalReceived || 0), 0)
  , [cleanDividendReceipts]);

  const upcomingDividends = useMemo(() => 
    cleanDividendReceipts
      .filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') > new Date())
      .reduce((acc, curr) => acc + (curr.totalReceived || 0), 0)
  , [cleanDividendReceipts]);

  const unrealizedGain = currentBalance - totalInvested;
  const totalReturnVal = unrealizedGain + realizedGain + totalDividends;
  const totalReturnPercent = totalInvested > 0 ? (totalReturnVal / totalInvested) * 100 : 0;

  const estimatedInflation = 4.5; 
  const realGainPercent = totalInvested > 0 ? (((1 + totalReturnPercent/100) / (1 + estimatedInflation/100) - 1) * 100) : 0;

  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const COLORS = ['#38bdf8', '#818cf8', '#a855f7', '#f472b6', '#fb7185', '#34d399', '#facc15'];

  // Dados de Alocação
  const assetAllocationData = useMemo(() => {
    if (currentBalance === 0) return [];
    return portfolio
      .map(p => ({
        name: p.ticker,
        value: (p.currentPrice || p.averagePrice) * p.quantity,
        percent: (((p.currentPrice || p.averagePrice) * p.quantity) / currentBalance) * 100,
        type: p.assetType,
        segment: p.segment || 'Geral'
      }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio, currentBalance]);

  const top3Assets = useMemo(() => assetAllocationData.slice(0, 3), [assetAllocationData]);
  const othersCount = useMemo(() => Math.max(0, assetAllocationData.length - 3), [assetAllocationData]);

  const classAllocation = useMemo(() => {
    const agg: Record<string, number> = {};
    assetAllocationData.forEach(p => {
      const label = p.type === AssetType.FII ? 'Fundos Imobiliários' : 'Ações';
      agg[label] = (agg[label] || 0) + p.value;
    });
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  }, [assetAllocationData]);

  const rebalanceData = useMemo(() => {
    if (assetAllocationData.length === 0) return [];
    const n = assetAllocationData.length;
    const idealValuePerAsset = currentBalance / n;
    return assetAllocationData.map(asset => ({
      ...asset,
      idealPercent: 100 / n,
      valueNeeded: Math.max(0, idealValuePerAsset - asset.value)
    }));
  }, [assetAllocationData, currentBalance]);

  // Novidade: Magic Number Logic
  const magicNumberData = useMemo(() => {
    return portfolio.map(p => {
      const tickerDivs = cleanDividendReceipts.filter(d => d.ticker === p.ticker);
      const lastDiv = tickerDivs.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0];
      const rate = lastDiv?.rate || 0;
      const price = p.currentPrice || p.averagePrice;
      const sharesNeeded = rate > 0 ? Math.ceil(price / rate) : 0;
      const progress = sharesNeeded > 0 ? (p.quantity / sharesNeeded) * 100 : 0;
      return { ...p, sharesNeeded, progress, rate };
    }).filter(p => p.rate > 0).sort((a, b) => b.progress - a.progress);
  }, [portfolio, cleanDividendReceipts]);

  // Gráfico de Proventos Mensais
  const dividendsChartData = useMemo(() => {
    const agg: Record<string, number> = {};
    cleanDividendReceipts
      .filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') <= new Date())
      .forEach(d => {
        const key = d.paymentDate.substring(0, 7); 
        agg[key] = (agg[key] || 0) + (d.totalReceived || 0);
    });

    return Object.entries(agg)
        .sort((a, b) => a[0].localeCompare(b[0])) 
        .slice(-12)
        .map(([key, val]) => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return {
                name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
                value: val
            };
        });
  }, [cleanDividendReceipts]);

  const proventosGrouped = useMemo(() => {
    const sorted = [...cleanDividendReceipts]
      .filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') <= new Date())
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    const groups: Record<string, DividendReceipt[]> = {};
    sorted.forEach(d => {
        const dateObj = new Date(d.paymentDate + 'T12:00:00');
        const monthYear = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(d);
    });
    return groups;
  }, [cleanDividendReceipts]);

  const upcomingProventos = useMemo(() => {
    return cleanDividendReceipts
      .filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') > new Date())
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  }, [cleanDividendReceipts]);

  return (
    <div className="pb-32 pt-2 px-5 space-y-6">
      
      {/* PATRIMÔNIO TOTAL */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-[#0f172a] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 blur-[100px] rounded-full group-hover:bg-accent/15 transition-all duration-700"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-2">
                   <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                      <Wallet className="w-5 h-5" />
                   </div>
                   <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Meu Patrimônio</h2>
                </div>
                {isAiLoading && (
                  <div className="flex items-center gap-2 bg-accent/20 px-3 py-1 rounded-full border border-accent/30 animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 text-accent animate-spin" />
                    <span className="text-[8px] font-black text-accent uppercase">IA Ativa</span>
                  </div>
                )}
            </div>

            <div className="relative z-10 mb-8">
              <div className="text-sm font-bold text-slate-500 mb-1">Total Atual</div>
              <div className="text-5xl font-black text-white tracking-tighter tabular-nums mb-4">
                R$ {formatCurrency(currentBalance)}
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${totalReturnVal >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-black">
                        Retorno: R$ {formatCurrency(totalReturnVal)}
                    </span>
                 </div>
                 <div className={`text-xs font-black ${totalReturnVal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {totalReturnVal >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] flex justify-between items-center">
                    <div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Custo Médio</div>
                        <div className="text-sm font-bold text-slate-300">R$ {formatCurrency(totalInvested)}</div>
                    </div>
                    <Layers className="w-4 h-4 text-slate-700" />
                </div>
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.05] flex justify-between items-center">
                    <div>
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Rendimentos</div>
                        <div className="text-sm font-bold text-emerald-400">R$ {formatCurrency(totalDividends)}</div>
                    </div>
                    <CircleDollarSign className="w-4 h-4 text-emerald-900" />
                </div>
            </div>
        </div>
      </div>

      {/* CARD PROVENTOS - ACIONADOR DO MODAL */}
      <div 
        onClick={() => { console.log('Opening Proventos Modal'); setShowProventosModal(true); }}
        className="animate-fade-in-up tap-highlight cursor-pointer"
        style={{ animationDelay: '100ms' }}
      >
        <div className="relative overflow-hidden bg-gradient-to-tr from-emerald-500/5 to-slate-900 border border-emerald-500/10 rounded-[2.5rem] p-6 shadow-xl group hover:border-emerald-500/30 transition-all active:scale-[0.99]">
            <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/10 blur-[60px] rounded-full"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 ring-1 ring-emerald-500/20">
                        <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-black text-sm uppercase tracking-tight">Dividendos</h3>
                </div>
                <div className="flex items-center gap-2">
                   {upcomingDividends > 0 && (
                     <div className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-1 rounded-lg border border-emerald-500/20 animate-pulse">
                        + R$ {formatCurrency(upcomingDividends)} Pendente
                     </div>
                   )}
                   <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                </div>
            </div>
            <div className="relative z-10 flex items-end justify-between">
                <div>
                     <div className="text-3xl font-black text-white tabular-nums tracking-tighter mb-1">
                        R$ {formatCurrency(totalDividends)}
                     </div>
                     <div className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Total Recebido</div>
                </div>
                <div className="flex h-10 items-end gap-1">
                    {dividendsChartData.slice(-5).map((d, i) => (
                        <div key={i} className="w-1.5 bg-emerald-500/20 rounded-t-sm" style={{ height: `${Math.min(100, Math.max(10, (d.value / 1000) * 100))}%` }}>
                            <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: '40%' }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* CARD ALOCAÇÃO */}
      <div 
        onClick={() => setShowAllocationModal(true)}
        className="animate-fade-in-up cursor-pointer group"
        style={{ animationDelay: '200ms' }}
      >
        <div className="relative bg-[#0f172a]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-7 shadow-2xl transition-all hover:bg-[#0f172a]/80 active:scale-[0.98]">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner">
                        <PieIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Estratégia</h3>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </div>
            </div>
            <div className="flex items-center gap-8">
                <div className="w-32 h-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={assetAllocationData} innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                                {assetAllocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4">
                    {top3Assets.map((asset, i) => (
                        <div key={asset.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                <span className="text-xs font-black text-white/90 uppercase tracking-tighter">{asset.name}</span>
                            </div>
                            <span className="text-xs font-black text-white tabular-nums">{asset.percent.toFixed(0)}%</span>
                        </div>
                    ))}
                    {othersCount > 0 && <div className="pt-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">+ {othersCount} OUTROS</div>}
                </div>
            </div>
        </div>
      </div>

      {/* CARD GANHO REAL */}
      <div 
        onClick={() => setShowInflationModal(true)}
        className="animate-fade-in-up cursor-pointer group"
        style={{ animationDelay: '300ms' }}
      >
        <div className={`relative overflow-hidden bg-gradient-to-br transition-all hover:brightness-110 active:scale-[0.98] border border-white/5 rounded-[2.5rem] p-7 shadow-2xl ${realGainPercent >= 0 ? 'from-emerald-900/40 to-[#0f172a]' : 'from-rose-900/40 to-[#0f172a]'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner ${realGainPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        <Scale className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Ganho Real</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Patrimônio vs Inflação</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </div>
            </div>
            <div className="text-center py-6">
                <div className={`text-6xl font-black tracking-tighter tabular-nums ${realGainPercent >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {realGainPercent >= 0 ? '+' : ''}{realGainPercent.toFixed(2)}%
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Inflação IPC-A Est.</span>
                    <span>Seu Yield Real</span>
                </div>
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex ring-1 ring-white/5">
                    <div className="h-full bg-rose-500/60" style={{ width: `${Math.min(100, (estimatedInflation / 10) * 100)}%` }}></div>
                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ width: `${Math.max(0, Math.min(100, (totalReturnPercent / 10) * 100))}%` }}></div>
                </div>
            </div>
        </div>
      </div>

      {/* MODAL PROVENTOS (REFORMULADO) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-6 pt-2 pb-10 flex flex-col min-h-full">
           <div className="mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter">Minha Renda</h3>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">Gestão de Proventos</p>
           </div>

           {/* Abas do Modal */}
           <div className="flex bg-slate-950/40 p-1.5 rounded-[1.5rem] mb-8 border border-white/5">
               <button onClick={() => setProventosTab('history')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'history' ? 'bg-emerald-500 text-primary shadow-lg' : 'text-slate-500'}`}>
                  <BarChart3 className="w-3.5 h-3.5" /> Histórico
               </button>
               <button onClick={() => setProventosTab('magic')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'magic' ? 'bg-emerald-500 text-primary shadow-lg' : 'text-slate-500'}`}>
                  <Star className="w-3.5 h-3.5" /> Mágico
               </button>
               <button onClick={() => setProventosTab('upcoming')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'upcoming' ? 'bg-emerald-500 text-primary shadow-lg' : 'text-slate-500'}`}>
                  <Zap className="w-3.5 h-3.5" /> Agenda
               </button>
           </div>

           {proventosTab === 'history' && (
             <div className="space-y-8 animate-fade-in">
                <div className="h-48 w-full bg-slate-900/50 rounded-3xl p-4 border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dividendsChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-6">
                    {Object.keys(proventosGrouped).length === 0 ? (
                        <div className="py-20 text-center opacity-30">Nenhum provento recebido ainda.</div>
                    ) : (
                        (Object.entries(proventosGrouped) as [string, DividendReceipt[]][]).map(([month, receipts]) => (
                            <div key={month} className="space-y-3">
                                <div className="flex items-center gap-3 py-2 border-b border-white/5">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{month}</h4>
                                    <span className="text-[10px] font-black text-emerald-400 ml-auto">R$ {formatCurrency(receipts.reduce((a, b) => a + (b.totalReceived || 0), 0))}</span>
                                </div>
                                {receipts.map(r => (
                                    <div key={r.id} className="bg-white/[0.02] p-4 rounded-3xl flex items-center justify-between border border-white/[0.03]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-black text-white border border-white/5">{r.ticker.substring(0,4)}</div>
                                            <div>
                                                <div className="text-sm font-black text-white">{r.ticker}</div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase">{r.paymentDate?.split('-').reverse().join('/')}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-emerald-400">R$ {formatCurrency(r.totalReceived)}</div>
                                            <div className="text-[8px] text-slate-600 font-bold uppercase">{r.type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
             </div>
           )}

           {proventosTab === 'magic' && (
             <div className="space-y-4 animate-fade-in">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl mb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Aposentadoria de Ativos</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Veja quanto falta para que os dividendos de um ativo comprem uma nova cota dele mesmo todos os meses.
                    </p>
                </div>

                {magicNumberData.length === 0 ? (
                    <div className="py-20 text-center opacity-30">Aguardando dados de proventos para calcular...</div>
                ) : (
                    magicNumberData.map((item, i) => (
                        <div key={item.ticker} className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 space-y-4 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm font-black text-white">{item.ticker}</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Meta: {item.sharesNeeded} un</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black text-white">{item.quantity} / {item.sharesNeeded}</span>
                                    <p className="text-[9px] text-emerald-500 font-bold uppercase">{Math.min(100, item.progress).toFixed(1)}%</p>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex ring-1 ring-white/5">
                                <div className={`h-full ${item.progress >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-emerald-500/40'}`} style={{ width: `${Math.min(100, item.progress)}%` }}></div>
                            </div>
                            {item.progress >= 100 && (
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <ShieldCheck className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Auto-sustentável</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
             </div>
           )}

           {proventosTab === 'upcoming' && (
             <div className="space-y-4 animate-fade-in">
                {upcomingDividends > 0 ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2.5rem] mb-6 text-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Total Pendente</p>
                    <div className="text-4xl font-black text-white tabular-nums">R$ {formatCurrency(upcomingDividends)}</div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-40">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nada na agenda para os próximos dias</p>
                  </div>
                )}

                {upcomingProventos.map((r, i) => (
                  <div key={r.id} className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 flex items-center justify-between animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-black text-white text-base">{r.ticker}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previsto: {r.paymentDate?.split('-').reverse().join('/')}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black text-emerald-400">R$ {formatCurrency(r.totalReceived)}</div>
                        <div className="text-[9px] font-bold text-slate-600 uppercase">Data Com: {r.dateCom?.split('-').reverse().join('/')}</div>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </SwipeableModal>

      {/* MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pt-2 pb-10">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter">Estratégia</h3>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">Rebalanceamento de Carteira</p>
            </div>

            <div className="flex bg-slate-950/40 p-1.5 rounded-[1.5rem] mb-8 border border-white/5">
               <button onClick={() => setAllocationTab('assets')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'assets' ? 'bg-indigo-500 text-primary shadow-lg' : 'text-slate-500'}`}>
                 Ativos
               </button>
               <button onClick={() => setAllocationTab('classes')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'classes' ? 'bg-indigo-500 text-primary shadow-lg' : 'text-slate-500'}`}>
                 Classes
               </button>
               <button onClick={() => setAllocationTab('rebalance')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'rebalance' ? 'bg-indigo-500 text-primary shadow-lg' : 'text-slate-500'}`}>
                 Aportes
               </button>
            </div>

            {allocationTab !== 'rebalance' ? (
                <>
                    <div className="h-64 w-full mb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                data={allocationTab === 'assets' ? assetAllocationData : classAllocation} 
                                innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}
                                >
                                    {(allocationTab === 'assets' ? assetAllocationData : classAllocation).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                        {(allocationTab === 'assets' ? assetAllocationData : classAllocation).map((e, i) => (
                            <div key={e.name} className="bg-white/[0.02] p-4 rounded-3xl flex justify-between items-center border border-white/[0.03]">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="text-xs font-bold text-white uppercase">{e.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-white">R$ {formatCurrency(e.value)}</div>
                                    <div className="text-[10px] font-black text-slate-500">{((e.value / currentBalance) * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="bg-indigo-500/10 p-5 rounded-3xl mb-6">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Simulação de pesos iguais. Foque seus novos aportes nos ativos que estão abaixo da meta ideal.
                        </p>
                    </div>
                    {rebalanceData.map((e) => (
                        <div key={e.name} className="bg-white/[0.02] p-5 rounded-3xl border border-white/5 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-white">{e.name}</span>
                                <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${e.valueNeeded > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                                    {e.valueNeeded > 0 ? 'Aportar' : 'No Peso'}
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                                <span>Atual: {e.percent.toFixed(1)}%</span>
                                <span>Meta: {e.idealPercent.toFixed(1)}%</span>
                            </div>
                            {e.valueNeeded > 0 && (
                                <div className="mt-1 flex items-center gap-2">
                                    <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-black text-white">Faltam: R$ {formatCurrency(e.valueNeeded)}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
         </div>
      </SwipeableModal>

      {/* MODAL GANHO REAL */}
      <SwipeableModal isOpen={showInflationModal} onClose={() => setShowInflationModal(false)}>
        <div className="px-6 pt-2 pb-10">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter">Poder de Compra</h3>
                <p className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em] mt-1">Análise de Rentabilidade Real</p>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-slate-900 border border-white/5 p-8 rounded-[2.5rem] mb-8 text-center">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Seu Ganho Real</div>
                <div className={`text-6xl font-black tracking-tighter mb-4 ${realGainPercent >= 0 ? 'text-white' : 'text-rose-500'}`}>
                    {realGainPercent >= 0 ? '+' : ''}{realGainPercent.toFixed(2)}%
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/20 inline-flex">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Patrimônio Protegido</span>
                </div>
            </div>

            <div className="bg-slate-950/40 p-6 rounded-[2.2rem] border border-white/5 space-y-4">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0 border border-yellow-500/10">
                      <ShoppingBag className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Cesta de Consumo</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Ao vencer a inflação est. de {estimatedInflation}%, seus dividendos não apenas mantém o valor, mas expandem sua capacidade real de consumo todos os meses.
                      </p>
                   </div>
                </div>
            </div>
        </div>
      </SwipeableModal>
    </div>
  );
};
