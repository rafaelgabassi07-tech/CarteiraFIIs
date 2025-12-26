
import React, { useMemo, useState, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, ChevronRight, CircleDollarSign, PieChart as PieIcon, Layers, Sparkles, BarChart3, Star, Zap, Trophy, TrendingUp, Globe, ExternalLink, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  monthlyContribution?: number;
  sources?: { web: { uri: string; title: string } }[];
  isAiLoading?: boolean;
}

export const Home: React.FC<HomeProps> = ({ 
  portfolio, 
  dividendReceipts, 
  realizedGain = 0, 
  monthlyContribution = 0,
  sources = [],
  isAiLoading = false
}) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [proventosTab, setProventosTab] = useState<'history' | 'magic' | 'upcoming'>('history');

  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Somas de Patrimônio
  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  
  // Somas de Proventos
  const totalDividends = useMemo(() => dividendReceipts.filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') <= new Date()).reduce((acc, curr) => acc + (curr.totalReceived || 0), 0), [dividendReceipts]);
  const upcomingDividends = useMemo(() => dividendReceipts.filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') > new Date()).reduce((acc, curr) => acc + (curr.totalReceived || 0), 0), [dividendReceipts]);
  
  // Cálculo de Retorno (Wealth Growth)
  // Fórmula: (Valor Atual - Custo) + Lucro Realizado + Dividendos Recebidos
  const totalReturnVal = (currentBalance - totalInvested) + realizedGain + totalDividends;
  
  // Percentual de Retorno Seguro contra Divisão por Zero
  const totalReturnPercent = useMemo(() => {
    if (totalInvested <= 0) return totalReturnVal > 0 ? 100 : 0;
    return (totalReturnVal / totalInvested) * 100;
  }, [totalReturnVal, totalInvested]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b'];

  const assetAllocationData = useMemo(() => {
    if (!portfolio.length) return [];
    return portfolio.map(p => ({ 
      name: p.ticker, 
      value: (p.currentPrice || p.averagePrice) * p.quantity, 
      percent: (((p.currentPrice || p.averagePrice) * p.quantity) / (currentBalance || 1)) * 100 
    })).sort((a,b) => b.value - a.value);
  }, [portfolio, currentBalance]);
  
  const top3Assets = assetAllocationData.slice(0, 3);

  const dividendsChartData = useMemo(() => {
    const agg: Record<string, number> = {};
    dividendReceipts.filter(d => d.paymentDate && new Date(d.paymentDate + 'T12:00:00') <= new Date()).forEach(d => {
        const key = d.paymentDate.substring(0, 7); 
        agg[key] = (agg[key] || 0) + (d.totalReceived || 0);
    });
    return Object.entries(agg).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([key, val]) => {
        const [year, month] = key.split('-');
        return { name: new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), value: val };
    });
  }, [dividendReceipts]);

  const magicNumberData = useMemo(() => {
    return portfolio.map(p => {
      const tickerDivs = dividendReceipts.filter(d => d.ticker === p.ticker);
      const lastDiv = tickerDivs.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0];
      const rate = lastDiv?.rate || 0;
      const price = p.currentPrice || p.averagePrice;
      const sharesNeeded = rate > 0 ? Math.ceil(price / rate) : 0;
      return { ...p, sharesNeeded, progress: sharesNeeded > 0 ? (p.quantity / sharesNeeded) * 100 : 0, rate };
    }).filter(p => p.rate > 0).sort((a, b) => b.progress - a.progress);
  }, [portfolio, dividendReceipts]);

  return (
    <div className="pb-32 pt-2 px-5 space-y-6">
      {/* Patrimônio Principal */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-sm dark:shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20"><Wallet className="w-4 h-4" /></div>
               <h2 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Patrimônio Total</h2>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums mb-3">{formatCurrency(currentBalance)}</div>
              <div className="flex items-center gap-3">
                 <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${totalReturnVal >= 0 ? 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[10px] font-black">{totalReturnVal >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}% de retorno histórico</span>
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Custo Médio</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalInvested)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-100 dark:border-white/[0.05]">
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Dividendos</div>
                    <div className="text-sm font-bold text-emerald-500">{formatCurrency(totalDividends)}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Renda Passiva Card */}
      <button onClick={() => setShowProventosModal(true)} className="w-full text-left animate-fade-in-up">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm dark:shadow-xl hover:border-accent/40 transition-all active:scale-[0.98]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-200 dark:border-emerald-500/20"><CircleDollarSign className="w-5 h-5" /></div>
                    <h3 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight">Renda Passiva</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="flex items-end justify-between">
                <div>
                     <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter mb-1">{formatCurrency(totalDividends)}</div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recebido acumulado</div>
                </div>
                {upcomingDividends > 0 && <div className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">+ {formatCurrency(upcomingDividends)} pendente</div>}
            </div>
        </div>
      </button>

      {/* Alocação Card */}
      <button 
        onClick={() => setShowAllocationModal(true)} 
        className="w-full text-left animate-fade-in-up relative z-10"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-7 shadow-sm dark:shadow-2xl hover:border-accent/40 transition-all active:scale-[0.98]">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-accent/10 rounded-2xl flex items-center justify-center text-accent border border-accent/20"><PieIcon className="w-5 h-5" /></div>
                    <h3 className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-widest">Minha Alocação</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>
            
            {portfolio.length > 0 ? (
                <div className="flex items-center gap-8">
                    <div className="w-32 h-32 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={assetAllocationData} 
                                    innerRadius={35} 
                                    outerRadius={50} 
                                    paddingAngle={4} 
                                    dataKey="value" 
                                    stroke="none" 
                                    cornerRadius={6}
                                >
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
                                    <span className="text-[10px] font-black text-slate-700 dark:text-white/90 uppercase">{asset.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{asset.percent.toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-4 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                    <PieChartIcon className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase">Adicione ativos para ver o gráfico</p>
                </div>
            )}
        </div>
      </button>

      {/* Grounding Sources display */}
      {sources && sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 animate-fade-in-up">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Globe className="w-3 h-3" /> Fontes Consultadas via Gemini
           </h4>
           <div className="flex flex-wrap gap-2">
             {sources.map((source, i) => (
               <a 
                 key={i} 
                 href={source.web.uri} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 hover:text-accent transition-colors"
               >
                 {source.web.title || 'Referência'} <ExternalLink className="w-3 h-3" />
               </a>
             ))}
           </div>
        </div>
      )}

      {/* Proventos Details Modal */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
           <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Gestão de Renda</h3>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1">Histórico e Número Mágico</p>
           </div>
           <div className="flex bg-slate-100 dark:bg-slate-950/40 p-1.5 rounded-[1.5rem] mb-8 border border-slate-200 dark:border-white/5">
               <button onClick={() => setProventosTab('history')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'history' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Recebidos</button>
               <button onClick={() => setProventosTab('magic')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'magic' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Sustento</button>
               <button onClick={() => setProventosTab('upcoming')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'upcoming' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}>Próximos</button>
           </div>

           {proventosTab === 'history' && (
             <div className="space-y-8">
                <div className="h-48 w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                    {dividendsChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dividendsChartData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeights: 900 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px' }} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <BarChart3 className="w-8 h-8 mb-2" />
                            <span className="text-[10px] font-black uppercase">Sem histórico</span>
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                  {dividendReceipts.length === 0 ? <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">Sem dados para exibir</div> : dividendReceipts.slice(0, 10).map(r => (
                      <div key={r.id} className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-3xl flex items-center justify-between border border-slate-200 dark:border-white/[0.03]">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 shadow-sm">{r.ticker.substring(0,4)}</div>
                              <div><h4 className="text-sm font-black text-slate-900 dark:text-white">{r.ticker}</h4><p className="text-[9px] font-bold text-slate-400 uppercase">{r.paymentDate?.split('-').reverse().join('/')}</p></div>
                          </div>
                          <div className="text-right"><div className="text-sm font-black text-emerald-500">{formatCurrency(r.totalReceived)}</div><div className="text-[8px] text-slate-400 font-bold uppercase">{r.type}</div></div>
                      </div>
                  ))}
                </div>
             </div>
           )}

           {proventosTab === 'magic' && (
             <div className="space-y-4">
                {magicNumberData.length > 0 ? magicNumberData.map(item => (
                    <div key={item.ticker} className="bg-slate-50 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <div><span className="text-sm font-black text-slate-900 dark:text-white">{item.ticker}</span><p className="text-[9px] text-slate-400 font-bold uppercase">Meta: {item.sharesNeeded} un</p></div>
                            <div className="text-right"><span className="text-xs font-black text-slate-900 dark:text-white">{item.quantity} / {item.sharesNeeded}</span><p className="text-[9px] text-emerald-500 font-bold uppercase">{Math.min(100, item.progress).toFixed(1)}%</p></div>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div className={`h-full bg-emerald-500`} style={{ width: `${Math.min(100, item.progress)}%` }}></div>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">Número mágico exige histórico de dividendos</div>
                )}
             </div>
           )}
        </div>
      </SwipeableModal>

      {/* Alocação Details Modal */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
           <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Detalhamento</h3>
                <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mt-1">Alocação de Ativos</p>
           </div>
           
           {assetAllocationData.length > 0 ? (
             <>
               <div className="flex items-center justify-center mb-10">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={assetAllocationData} 
                                innerRadius={55} 
                                outerRadius={80} 
                                paddingAngle={4} 
                                dataKey="value" 
                                stroke="none" 
                                cornerRadius={8}
                            >
                                {assetAllocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="space-y-4">
                 {assetAllocationData.map((asset, i) => (
                    <div key={asset.name} className="bg-slate-50 dark:bg-white/[0.02] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{asset.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{formatCurrency(asset.value)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-black text-slate-900 dark:text-white">{asset.percent.toFixed(1)}%</div>
                        </div>
                    </div>
                 ))}
               </div>
             </>
           ) : (
             <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">Sua carteira está vazia</div>
           )}
        </div>
      </SwipeableModal>
    </div>
  );
};
