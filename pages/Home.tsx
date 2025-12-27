
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, ChevronRight, CircleDollarSign, PieChart as PieIcon, Sparkles, Globe, ExternalLink, Calendar, Target, Zap, Layers, BarChart3, GripVertical, Scale, TrendingDown, TrendingUp, Info, CheckCircle, ArrowRightCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis } from 'recharts';
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

  // Cálculos de Patrimônio
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
        // Encontrar o último dividendo pago ou anunciado para este ticker
        const lastDiv = [...dividendReceipts]
            .filter(d => d.ticker === p.ticker)
            .sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0];
        
        if (!lastDiv || !p.currentPrice) return null;
        
        const rate = lastDiv.rate;
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

  const COLORS = ['#22d3ee', '#818cf8', '#a855f7', '#f472b6', '#fb7185', '#fb923c'];

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
      .map(([k, v]) => ({ value: v }));
  }, [dividendReceipts]);

  const inflacaoPeriodo = 4.50; 
  const yieldCarteira = invested > 0 ? (received / invested) * 100 : 0;
  const ganhoReal = yieldCarteira - inflacaoPeriodo;
  const isAboveInflation = yieldCarteira > inflacaoPeriodo;

  return (
    <div className="pb-32 px-5 space-y-6">
      
      {/* Resumo Principal */}
      <div className="animate-fade-in-up">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-7 rounded-[2.5rem] shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="flex items-center gap-2 mb-5">
               <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent"><Wallet className="w-4 h-4" /></div>
               <h2 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Patrimônio Total</h2>
            </div>
            <div className="mb-4">
              <div className={`text-4xl font-black tracking-tighter tabular-nums ${isAiLoading ? 'opacity-40 animate-pulse' : ''}`}>{formatBRL(balance)}</div>
            </div>
            <div className="flex items-center gap-3">
               <div className="bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Custo Médio</span>
                  <span className="text-xs font-bold">{formatBRL(invested)}</span>
               </div>
               <div className="bg-emerald-500/10 dark:bg-emerald-500/5 px-4 py-2 rounded-2xl border border-emerald-500/20 flex flex-col">
                  <span className="text-[8px] font-black text-emerald-500 uppercase">Lucro Venda</span>
                  <span className="text-xs font-bold text-emerald-500">{formatBRL(realizedGain)}</span>
               </div>
            </div>
        </div>
      </div>

      {/* Card Alocação */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className="w-full text-left bg-slate-900 dark:bg-[#0a0f1e] border border-slate-800 dark:border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20"><PieIcon className="w-5 h-5" /></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Alocação</h3>
               </div>
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></div>
            </div>

            <div className="flex items-center gap-8 relative z-10">
               <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assetData} innerRadius={35} outerRadius={50} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                        {assetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="flex-1 space-y-4">
                  {assetData.slice(0, 3).map((asset, i) => (
                    <div key={asset.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-xs font-black text-white/80 tracking-tight">{asset.name}</span>
                      </div>
                      <span className="text-sm font-black text-white tabular-nums">{((asset.value / (balance || 1)) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  {assetData.length > 3 && (
                    <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] pt-2 text-center">+ {assetData.length - 3} OUTROS</div>
                  )}
               </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
        </button>
      </div>

      {/* Card Renda Mensal */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-gradient-to-br from-[#061a14] to-[#0a0f1e] border border-emerald-500/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20"><CircleDollarSign className="w-5 h-5" /></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Renda Passiva</h3>
               </div>
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></div>
            </div>

            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 relative z-10">Pagas e Anunciadas</p>

            <div className="flex items-end justify-between relative z-10">
               <div className="flex-1">
                  <div className="text-4xl font-black text-white tracking-tighter tabular-nums mb-1">{formatBRL(received + upcoming)}</div>
                  {upcoming > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider">+{formatBRL(upcoming)} Previsto</span>
                    </div>
                  )}
               </div>

               <div className="w-24 h-12 flex items-end gap-1 px-1">
                  {miniBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={miniBarData}>
                          <Bar dataKey="value" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.6} />
                       </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full border border-dashed border-white/10 rounded-lg">
                       <BarChart3 className="w-4 h-4 text-white/10" />
                    </div>
                  )}
               </div>
            </div>
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full"></div>
        </button>
      </div>

      {/* Card Ganho Real */}
      <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
         <div className="bg-gradient-to-br from-[#1a0b16] to-[#0a0f1e] border border-rose-500/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/20"><Scale className="w-5 h-5" /></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Ganho Real</h3>
               </div>
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30"><ChevronRight className="w-4 h-4" /></div>
            </div>

            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-6 relative z-10">Rentabilidade vs. Período</p>
            
            <div className="mb-8 relative z-10">
               <div className={`text-5xl font-black tracking-tighter tabular-nums mb-8 ${isAboveInflation ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {isAboveInflation ? '+' : ''}{ganhoReal.toFixed(2)}%
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-end mb-1">
                     <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Inflação (IPCA Est.)</span>
                     <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Seu Yield</span>
                  </div>
                  <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                     <div 
                        className="h-full bg-rose-500/60 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (inflacaoPeriodo / (yieldCarteira + inflacaoPeriodo)) * 100)}%` }} 
                     />
                     <div className="w-1 h-full bg-white/20 mx-0.5 rounded-full" />
                     <div 
                        className="h-full bg-emerald-500/60 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (yieldCarteira / (yieldCarteira + inflacaoPeriodo)) * 100)}%` }} 
                     />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black tabular-nums">
                     <span className="text-rose-400">{inflacaoPeriodo.toFixed(2)}%</span>
                     <span className="text-emerald-400">{yieldCarteira.toFixed(2)}%</span>
                  </div>
               </div>
            </div>

            <div className="relative z-10">
               <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest ${isAboveInflation ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                  {isAboveInflation ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isAboveInflation ? 'Acima da Inflação' : 'Abaixo da Inflação'}
               </div>
            </div>

            <div className={`absolute -bottom-16 -left-16 w-48 h-48 blur-[100px] rounded-full ${isAboveInflation ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}></div>
         </div>
      </div>

      {/* Fontes Gemini */}
      {sources.length > 0 && (
        <div className="mt-8 p-6 bg-slate-50 dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Zap className="w-3 h-3 text-amber-500" /> Inteligência de Mercado Gemini
           </h4>
           <div className="flex flex-wrap gap-2">
             {sources.slice(0, 3).map((source, i) => (
               <a key={i} href={source.web.uri} target="_blank" rel="noreferrer" className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-[9px] font-bold text-slate-500 flex items-center gap-2 hover:text-accent transition-colors">
                 {source.web.title.slice(0, 20)}... <ExternalLink className="w-3 h-3" />
               </a>
             ))}
           </div>
        </div>
      )}

      {/* Modal Alocação */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
           <h3 className="text-2xl font-black mb-6">Detalhamento</h3>
           <div className="space-y-4">
              {assetData.map((asset, i) => (
                <div key={asset.name} className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <div className="w-3 h-10 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <div><h4 className="font-black text-sm">{asset.name}</h4><p className="text-[10px] font-bold text-slate-400">{formatBRL(asset.value)}</p></div>
                   </div>
                   <div className="text-lg font-black">{((asset.value / (balance || 1)) * 100).toFixed(1)}%</div>
                </div>
              ))}
           </div>
        </div>
      </SwipeableModal>

      {/* Modal Proventos - CENTRAL DE INTELIGÊNCIA */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-6 pt-2 pb-20 bg-white dark:bg-secondary-dark min-h-full space-y-8">
            <header>
               <h3 className="text-3xl font-black mb-2 tracking-tighter">Central de Renda</h3>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full w-fit">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Auditado por Data Com vs Custódia</span>
               </div>
            </header>

            {/* Resumo de Projeção */}
            <div className="grid grid-cols-2 gap-3">
               <div className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Pago (Histórico)</p>
                  <div className="text-xl font-black">{formatBRL(received)}</div>
               </div>
               <div className="p-6 rounded-[2rem] bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Anunciado (Futuro)</p>
                  <div className="text-xl font-black">+{formatBRL(upcoming)}</div>
               </div>
            </div>

            {/* Seção Magic Number */}
            <section className="space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Target className="w-4 h-4 text-accent" /> Número Mágico
                  </h4>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-300" />
                    <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-slate-800 text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      Cotagem necessária para o ativo comprar uma nova cota dele mesmo com dividendos.
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {magicNumbers.slice(0, 3).map(m => (
                    <div key={m.ticker} className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/10">
                        <div className="flex justify-between items-center mb-4">
                           <div className="flex items-center gap-2">
                              <span className="font-black text-sm">{m.ticker}</span>
                              <span className="text-[10px] font-bold text-slate-400">R$ {m.rate.toFixed(2)} p/un</span>
                           </div>
                           <span className="text-[10px] font-black text-emerald-500">{m.progress.toFixed(0)}% completo</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                           <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${m.progress}%` }} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500">
                           {m.missing > 0 ? `Faltam ${m.missing} cotas para auto-sustentabilidade.` : 'Número Mágico atingido! 🎉'}
                        </p>
                    </div>
                  ))}
               </div>
            </section>

            {/* Listagem de Proventos Recentes/Futuros */}
            <section className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronograma Detalhado</h4>
               <div className="space-y-3">
                  {dividendReceipts.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate)).slice(0, 20).map(r => {
                    const isUpcoming = new Date(r.paymentDate + 'T12:00:00') > new Date();
                    return (
                        <div key={r.id} className={`p-5 rounded-3xl border flex justify-between items-center transition-all ${isUpcoming ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isUpcoming ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    {r.ticker.slice(0, 4)}
                                </div>
                                <div>
                                    <h5 className="font-black text-sm flex items-center gap-2">
                                        {r.ticker} {isUpcoming && <Sparkles className="w-3 h-3 text-emerald-500" />}
                                    </h5>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        Data Com: {r.dateCom.split('-').reverse().slice(0,2).join('/')} • {r.type}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-black ${isUpcoming ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{formatBRL(r.totalReceived)}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase">Paga em {r.paymentDate.split('-').reverse().slice(0,2).join('/')}</p>
                            </div>
                        </div>
                    );
                  })}
               </div>
            </section>
        </div>
      </SwipeableModal>

    </div>
  );
};
