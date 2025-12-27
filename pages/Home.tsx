
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, ChevronRight, CircleDollarSign, PieChart as PieIcon, Sparkles, Globe, ExternalLink, Calendar, Target, Zap, Layers, BarChart3, GripVertical, Scale, TrendingDown, TrendingUp, Info, CheckCircle, ArrowRightCircle, Coins, ArrowUpRight, ListFilter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, Legend } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  monthlyContribution?: number;
  sources?: { web: { uri: string; title: string } }[];
  isAiLoading?: boolean;
}

const formatBRL = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const Home: React.FC<HomeProps> = ({ 
  portfolio, 
  dividendReceipts, 
  realizedGain = 0, 
  sources = [],
  isAiLoading = false
}) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealGainModal, setShowRealGainModal] = useState(false);

  // --- CÁLCULOS ---
  const { invested, balance } = useMemo(() => {
    return portfolio.reduce((acc, curr) => ({
      invested: acc.invested + (curr.averagePrice * curr.quantity),
      balance: acc.balance + ((curr.currentPrice || curr.averagePrice) * curr.quantity)
    }), { invested: 0, balance: 0 });
  }, [portfolio]);

  const { received, upcoming, totalHistory } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return dividendReceipts.reduce((acc, curr) => {
      const pDate = new Date(curr.paymentDate + 'T12:00:00');
      if (pDate <= today) acc.received += curr.totalReceived;
      else acc.upcoming += curr.totalReceived;
      acc.totalHistory += curr.totalReceived;
      return acc;
    }, { received: 0, upcoming: 0, totalHistory: 0 });
  }, [dividendReceipts]);

  // Magic Number Calculation
  const magicNumbers = useMemo(() => {
    return portfolio.map(p => {
        const lastDiv = [...dividendReceipts]
            .filter(d => d.ticker === p.ticker)
            .sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0];
        
        if (!lastDiv || !p.currentPrice) return null;
        const rate = lastDiv.rate;
        if (rate <= 0) return null;

        const magicQty = Math.ceil(p.currentPrice / rate);
        const progress = Math.min(100, (p.quantity / magicQty) * 100);
        
        return {
            ticker: p.ticker,
            currentQty: p.quantity,
            magicQty,
            progress,
            missing: Math.max(0, magicQty - p.quantity),
            rate
        };
    }).filter(m => m !== null).sort((a,b) => (b?.progress || 0) - (a?.progress || 0));
  }, [portfolio, dividendReceipts]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];

  const assetData = useMemo(() => {
    return portfolio.map(p => ({ 
      name: p.ticker, 
      value: (p.currentPrice || p.averagePrice) * p.quantity 
    })).sort((a,b) => b.value - a.value);
  }, [portfolio]);

  const miniBarData = useMemo(() => {
    const agg: Record<string, number> = {};
    const today = new Date();
    dividendReceipts.filter(d => new Date(d.paymentDate + 'T12:00:00') <= today).forEach(d => {
      const key = d.paymentDate.substring(0, 7);
      agg[key] = (agg[key] || 0) + d.totalReceived;
    });
    return Object.entries(agg)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, v]) => ({ name: k, value: v }));
  }, [dividendReceipts]);

  const inflacaoPeriodo = 4.50; 
  const yieldCarteira = invested > 0 ? (received / invested) * 100 : 0;
  const ganhoReal = yieldCarteira - inflacaoPeriodo;
  const isAboveInflation = yieldCarteira > inflacaoPeriodo;

  return (
    <div className="pb-32 px-5 space-y-4 max-w-lg mx-auto">
      
      {/* 1. PATRIMÔNIO TOTAL (Hero) */}
      <div className="animate-fade-in-up">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-black/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm"><Wallet className="w-5 h-5" /></div>
                   <h2 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Patrimônio Líquido</h2>
                </div>
                
                <div className="mb-8">
                  <div className={`text-4xl font-black tracking-tight tabular-nums text-slate-900 dark:text-white ${isAiLoading ? 'opacity-50 animate-pulse' : ''}`}>{formatBRL(balance)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-50 dark:bg-white/[0.03] px-5 py-4 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Investido</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</span>
                   </div>
                   <div className="bg-emerald-500/5 px-5 py-4 rounded-2xl border border-emerald-500/10 flex flex-col gap-1">
                      <span className="text-[9px] font-black text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wide">Retorno Realizado</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(realizedGain)}</span>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. CARD DE RENDA PASSIVA */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-gradient-to-br from-[#022c22] to-[#064e3b] dark:from-[#022c22] dark:to-[#020617] p-1 rounded-[2.5rem] shadow-2xl group active:scale-[0.99] transition-all">
            <div className="bg-[#020617]/40 backdrop-blur-md rounded-[2.3rem] p-8 border border-white/10 relative overflow-hidden h-full">
                {/* Background Chart Effect */}
                <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none translate-y-4 scale-x-110">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={miniBarData}>
                          <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><CircleDollarSign className="w-5 h-5" /></div>
                      <h3 className="text-xs font-black text-emerald-100 uppercase tracking-widest">Renda Passiva</h3>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-emerald-900 transition-all"><ArrowUpRight className="w-4 h-4" /></div>
                </div>

                <div className="flex items-end justify-between relative z-10">
                   <div>
                      <p className="text-[9px] font-bold text-emerald-300/60 uppercase tracking-widest mb-1">Total Recebido + Previsto</p>
                      <div className="text-3xl font-black text-white tracking-tight tabular-nums">{formatBRL(received + upcoming)}</div>
                   </div>
                   {upcoming > 0 && (
                     <div className="text-right">
                       <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                         <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                         <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">+{formatBRL(upcoming)}</span>
                       </div>
                     </div>
                   )}
                </div>
            </div>
        </button>
      </div>

      {/* 3. CARD ALOCAÇÃO (Empilhado) */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
         <button onClick={() => setShowAllocationModal(true)} className="w-full bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-lg active:scale-[0.99] transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
             
             <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500"><PieIcon className="w-4 h-4" /></div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alocação</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
             </div>

             <div className="flex items-center gap-6 relative z-10">
                 <div className="w-24 h-24 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={assetData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={4}>
                          {assetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-[10px] font-black text-slate-300">{assetData.length}</span>
                    </div>
                 </div>
                 <div className="flex-1 space-y-2">
                    {assetData.slice(0, 3).map((a, i) => (
                        <div key={i} className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i]}} /> {a.name}</div>
                             <span className="font-mono opacity-70">{((a.value/balance)*100).toFixed(0)}%</span>
                        </div>
                    ))}
                    {assetData.length > 3 && (
                        <div className="text-[9px] font-medium text-slate-400 text-right">+ {assetData.length - 3} outros</div>
                    )}
                 </div>
             </div>
         </button>
      </div>

      {/* 4. CARD GANHO REAL (Empilhado) */}
      <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
         <button onClick={() => setShowRealGainModal(true)} className="w-full bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-lg active:scale-[0.99] transition-all group relative overflow-hidden">
             <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 ${isAboveInflation ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}></div>

             <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isAboveInflation ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}><Scale className="w-4 h-4" /></div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ganho Real</h3>
                </div>
                <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${isAboveInflation ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                    {isAboveInflation ? 'Superavit' : 'Deficit'}
                </div>
             </div>

             <div className="relative z-10 text-center py-2">
                 <div className="flex items-baseline justify-center gap-2">
                    <div className={`text-4xl font-black tabular-nums tracking-tighter ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isAboveInflation ? '+' : ''}{ganhoReal.toFixed(1)}%
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">vs IPCA</span>
                 </div>
                 <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 mt-4 overflow-hidden flex relative">
                    <div className="bg-rose-400 h-full transition-all duration-1000" style={{ width: '100%' }}></div>
                    <div className="absolute top-0 left-0 h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${Math.min(100, (yieldCarteira / (yieldCarteira + inflacaoPeriodo)) * 100)}%` }}></div>
                 </div>
             </div>
         </button>
      </div>

      {/* Fontes */}
      {sources.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap opacity-60 hover:opacity-100 transition-opacity">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Fontes:</span>
           {sources.slice(0, 3).map((source, i) => (
             <a key={i} href={source.web.uri} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-slate-500 hover:text-accent border-b border-transparent hover:border-accent transition-all truncate max-w-[100px]">
               {source.web.title}
             </a>
           ))}
        </div>
      )}

      {/* --- MODAIS APRIMORADOS --- */}

      {/* 1. MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
           <div className="sticky top-0 bg-slate-50/80 dark:bg-[#0b1121]/80 backdrop-blur-xl p-6 z-20 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm"><PieIcon className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sua Alocação</h3>
                        <p className="text-xs text-slate-500 font-medium">Diversificação da carteira</p>
                    </div>
                </div>
           </div>

           <div className="p-6 space-y-6">
                {/* Seção Gráfico */}
                <section className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Visão Geral</h4>
                    <div className="h-48 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={assetData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={6}>
                                    {assetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => formatBRL(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                                />
                            </PieChart>
                         </ResponsiveContainer>
                    </div>
                </section>

                {/* Seção Lista */}
                <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Detalhamento por Ativo</h4>
                    <div className="space-y-3">
                        {assetData.map((asset, i) => {
                            const percent = ((asset.value / (balance || 1)) * 100);
                            return (
                            <div key={asset.name} className="p-4 rounded-[1.5rem] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 relative overflow-hidden group shadow-sm">
                                <div className="relative z-10 flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{asset.name}</h4>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{percent.toFixed(1)}%</span>
                                </div>
                                <div className="relative z-10 flex justify-between items-end">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{formatBRL(asset.value)}</p>
                                </div>
                                {/* Barra de fundo */}
                                <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-white/10 w-full mt-3">
                                    <div className="h-full rounded-r-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </section>
           </div>
        </div>
      </SwipeableModal>

      {/* 2. MODAL GANHO REAL */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
         <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            <div className="sticky top-0 bg-slate-50/80 dark:bg-[#0b1121]/80 backdrop-blur-xl p-6 z-20 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center border shadow-sm ${isAboveInflation ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}><Scale className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ganho Real</h3>
                        <p className="text-xs text-slate-500 font-medium">Rentabilidade vs Inflação</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Scorecard */}
                <section className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1 p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sua Carteira</p>
                            <p className="text-2xl font-black text-emerald-500 tabular-nums">{yieldCarteira.toFixed(2)}%</p>
                        </div>
                        <div className="font-black text-slate-300 dark:text-slate-600">VS</div>
                        <div className="flex-1 p-4 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inflação (IPCA)</p>
                            <p className="text-2xl font-black text-rose-500 tabular-nums">{inflacaoPeriodo.toFixed(2)}%</p>
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Batalha de Rentabilidade</h4>
                        <div className="relative h-6 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                            <div className="h-full bg-emerald-500 flex items-center justify-start pl-3 text-[9px] font-black text-white/90" style={{ width: `${Math.min(100, (yieldCarteira / (yieldCarteira + inflacaoPeriodo)) * 100)}%` }}>VOCÊ</div>
                            <div className="h-full bg-rose-500 flex items-center justify-end pr-3 text-[9px] font-black text-white/90" style={{ width: `${Math.min(100, (inflacaoPeriodo / (yieldCarteira + inflacaoPeriodo)) * 100)}%` }}>IPCA</div>
                        </div>
                    </div>
                </section>

                {/* Insight IA */}
                <section className={`p-6 rounded-[1.5rem] border ${isAboveInflation ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                    <div className="flex items-center gap-3 mb-3">
                         <div className={`p-2 rounded-full ${isAboveInflation ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {isAboveInflation ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <h4 className={`font-black text-sm uppercase tracking-wide ${isAboveInflation ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                            Análise de Poder de Compra
                        </h4>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80 font-medium">
                        {isAboveInflation 
                           ? "Parabéns! Seus investimentos estão gerando riqueza real acima da inflação. Isso significa que seu dinheiro está comprando mais hoje do que ontem." 
                           : "Atenção: Seus rendimentos atuais estão abaixo da inflação estimada. Em termos reais, seu poder de compra pode estar diminuindo. Considere reinvestir dividendos."}
                    </p>
                </section>
            </div>
         </div>
      </SwipeableModal>

      {/* 3. MODAL RENDA PASSIVA (Central de Inteligência) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            <div className="sticky top-0 bg-slate-50/80 dark:bg-[#0b1121]/80 backdrop-blur-xl p-6 z-20 border-b border-slate-200 dark:border-white/5">
               <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-[1.2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-sm"><CircleDollarSign className="w-6 h-6" /></div>
                   <div>
                       <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Central de Renda</h3>
                       <div className="flex items-center gap-1.5 mt-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Dados Auditados</span>
                       </div>
                   </div>
               </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Seção Resumo */}
                <section className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fluxo de Caixa</h4>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recebido</p>
                             <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(received)}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-100 dark:bg-white/10"></div>
                        <div className="flex-1">
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Futuro</p>
                             <p className="text-xl font-black text-emerald-500 tabular-nums">{formatBRL(upcoming)}</p>
                        </div>
                    </div>
                </section>

                {/* Magic Numbers List */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Target className="w-3 h-3 text-accent" /> Metas (Magic Number)
                        </h4>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                        {magicNumbers.slice(0, 5).map(m => (
                            <div key={m.ticker} className="min-w-[200px] p-5 bg-white dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md">{m.ticker}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.progress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {m.progress.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-3">
                                        <div className="h-full bg-accent" style={{ width: `${m.progress}%` }}></div>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium border-t border-slate-100 dark:border-white/5 pt-2 mt-1">
                                    {m.missing > 0 ? `Faltam ${m.missing} cotas para autossustento` : 'Ativo autossustentável!'}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Timeline */}
                <section>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                       <ListFilter className="w-3 h-3" /> Extrato
                   </h4>
                   <div className="space-y-0 relative pl-4">
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-white/5"></div>
                      
                      {dividendReceipts.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 20).map((r, idx) => {
                        const isUpcoming = new Date(r.paymentDate + 'T12:00:00') > new Date();
                        return (
                            <div key={`${r.id}-${idx}`} className="relative pl-8 py-2 group">
                                <div className={`absolute left-0.5 top-6 w-5 h-5 -ml-1 rounded-full border-4 border-slate-50 dark:border-[#0b1121] z-10 ${isUpcoming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                
                                <div className={`p-4 rounded-[1.5rem] border transition-all flex justify-between items-center ${isUpcoming ? 'bg-white dark:bg-[#0f172a] border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/5'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-xs text-slate-900 dark:text-white">{r.ticker}</span>
                                            {isUpcoming && <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md uppercase">Futuro</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase font-bold">
                                            <span>{r.type.substring(0,3)}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{r.paymentDate.split('-').reverse().slice(0,2).join('/')}</span>
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm tabular-nums ${isUpcoming ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{formatBRL(r.totalReceived)}</span>
                                </div>
                            </div>
                        );
                      })}
                   </div>
                </section>
            </div>
        </div>
      </SwipeableModal>

    </div>
  );
};
