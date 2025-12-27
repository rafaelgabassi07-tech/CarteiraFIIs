
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, ChevronRight, CircleDollarSign, PieChart as PieIcon, Sparkles, Calendar, Target, Zap, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Tooltip } from 'recharts';
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

// Componente Interno de Abas
const ModalTabs = ({ tabs, active, onChange }: { tabs: { id: string, label: string }[], active: string, onChange: (id: any) => void }) => (
  <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl mb-6 mx-6 relative z-30">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${active === tab.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const Home: React.FC<HomeProps> = ({ 
  portfolio, 
  dividendReceipts, 
  realizedGain = 0, 
  sources = [],
  isAiLoading = false
}) => {
  // Estados dos Modais
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRealGainModal, setShowRealGainModal] = useState(false);

  // Estados das Abas
  const [allocationTab, setAllocationTab] = useState<'assets' | 'types' | 'segments'>('assets');
  const [incomeTab, setIncomeTab] = useState<'summary' | 'magic' | 'calendar'>('summary');
  const [gainTab, setGainTab] = useState<'general' | 'benchmark'>('general');

  // --- CÁLCULOS ---
  const { invested, balance } = useMemo(() => {
    return portfolio.reduce((acc, curr) => ({
      invested: acc.invested + (curr.averagePrice * curr.quantity),
      balance: acc.balance + ((curr.currentPrice || curr.averagePrice) * curr.quantity)
    }), { invested: 0, balance: 0 });
  }, [portfolio]);

  const { received, upcoming } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return dividendReceipts.reduce((acc, curr) => {
      const pDate = new Date(curr.paymentDate + 'T12:00:00');
      if (pDate <= today) acc.received += curr.totalReceived;
      else acc.upcoming += curr.totalReceived;
      return acc;
    }, { received: 0, upcoming: 0 });
  }, [dividendReceipts]);

  // Dados Agrupados para Alocação
  const { assetData, typeData, segmentData } = useMemo(() => {
    // CORREÇÃO: Variável renomeada de 'assets' para 'assetData' para evitar erro de referência no retorno
    const assetData = portfolio.map(p => ({ 
      name: p.ticker, 
      value: (p.currentPrice || p.averagePrice) * p.quantity 
    })).sort((a,b) => b.value - a.value);

    const typesMap: Record<string, number> = {};
    const segmentsMap: Record<string, number> = {};

    portfolio.forEach(p => {
      const val = (p.currentPrice || p.averagePrice) * p.quantity;
      
      // Tipos
      const t = p.assetType === AssetType.FII ? 'FIIs' : 'Ações';
      typesMap[t] = (typesMap[t] || 0) + val;

      // Segmentos
      const s = p.segment || 'Outros';
      segmentsMap[s] = (segmentsMap[s] || 0) + val;
    });

    const typeData = Object.entries(typesMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);
    const segmentData = Object.entries(segmentsMap).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value);

    return { assetData, typeData, segmentData };
  }, [portfolio]);

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

  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b', '#3b82f6', '#ec4899'];

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
      
      {/* 1. PATRIMÔNIO TOTAL (Compacto) */}
      <div className="animate-fade-in-up">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-black/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm"><Wallet className="w-4 h-4" /></div>
                   <h2 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Patrimônio</h2>
                </div>
                <div className={`text-2xl font-black tracking-tight tabular-nums text-slate-900 dark:text-white ${isAiLoading ? 'opacity-50 animate-pulse' : ''}`}>{formatBRL(balance)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div className="bg-slate-50 dark:bg-white/[0.03] px-4 py-3 rounded-xl border border-slate-100 dark:border-white/5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide block mb-1">Aplicado</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(invested)}</span>
               </div>
               <div className="bg-emerald-500/5 px-4 py-3 rounded-xl border border-emerald-500/10">
                  <span className="text-[8px] font-black text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wide block mb-1">Lucro Realizado</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">{formatBRL(realizedGain)}</span>
               </div>
            </div>
        </div>
      </div>

      {/* 2. CARD DE RENDA PASSIVA (Compacto) */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="w-full text-left bg-gradient-to-br from-[#022c22] to-[#064e3b] dark:from-[#022c22] dark:to-[#020617] p-0.5 rounded-[2rem] shadow-lg group active:scale-[0.99] transition-all">
            <div className="bg-[#020617]/40 backdrop-blur-md rounded-[1.9rem] p-6 border border-white/10 relative overflow-hidden h-full">
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none translate-y-2 scale-x-110">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={miniBarData}>
                          <Bar dataKey="value" fill="#34d399" radius={[2, 2, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><CircleDollarSign className="w-4 h-4" /></div>
                      <h3 className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Renda Passiva</h3>
                   </div>
                   {upcoming > 0 && (
                     <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
                       <Sparkles className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                       <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wide">+{formatBRL(upcoming)}</span>
                     </div>
                   )}
                </div>

                <div className="relative z-10">
                    <p className="text-[9px] font-bold text-emerald-300/60 uppercase tracking-widest mb-0.5">Total Acumulado</p>
                    <div className="text-2xl font-black text-white tracking-tight tabular-nums">{formatBRL(received + upcoming)}</div>
                </div>
            </div>
        </button>
      </div>

      {/* 3. CARD ALOCAÇÃO (Stack Compacto) */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
         <button onClick={() => setShowAllocationModal(true)} className="w-full bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-md active:scale-[0.99] transition-all group relative overflow-hidden flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <div className="h-14 w-14 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={assetData} innerRadius={15} outerRadius={25} paddingAngle={0} dataKey="value" stroke="none">
                          {assetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="text-left">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-0.5">Alocação</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{assetData.length} ativos em carteira</p>
                 </div>
             </div>
             <ChevronRight className="w-5 h-5 text-slate-300" />
         </button>
      </div>

      {/* 4. CARD GANHO REAL (Stack Compacto) */}
      <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
         <button onClick={() => setShowRealGainModal(true)} className="w-full bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-md active:scale-[0.99] transition-all group relative overflow-hidden">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Scale className={`w-4 h-4 ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`} />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganho Real vs IPCA</h3>
                </div>
                <div className={`text-sm font-black tabular-nums ${isAboveInflation ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isAboveInflation ? '+' : ''}{ganhoReal.toFixed(1)}%
                </div>
             </div>
             <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden flex relative">
                <div className="bg-rose-400 h-full transition-all duration-1000" style={{ width: '100%' }}></div>
                <div className="absolute top-0 left-0 h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${Math.min(100, (yieldCarteira / (yieldCarteira + inflacaoPeriodo)) * 100)}%` }}></div>
             </div>
         </button>
      </div>

      {/* Fontes */}
      {sources.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap opacity-60 hover:opacity-100 transition-opacity pb-4">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-amber-500" /> IA Sources:</span>
           {sources.slice(0, 3).map((source, i) => (
             <a key={i} href={source.web.uri} target="_blank" rel="noreferrer" className="text-[8px] font-bold text-slate-500 hover:text-accent border-b border-transparent hover:border-accent transition-all truncate max-w-[80px]">
               {source.web.title}
             </a>
           ))}
        </div>
      )}

      {/* --- MODAIS APRIMORADOS COM TABS --- */}

      {/* 1. MODAL ALOCAÇÃO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full flex flex-col">
           <div className="sticky top-0 bg-slate-50/95 dark:bg-[#0b1121]/95 backdrop-blur-xl pt-6 px-6 z-20 border-b border-transparent">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-[1rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm"><PieIcon className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sua Alocação</h3>
                    </div>
                </div>
                
                <ModalTabs 
                    active={allocationTab} 
                    onChange={setAllocationTab} 
                    tabs={[
                        { id: 'assets', label: 'Ativos' },
                        { id: 'types', label: 'Tipos' },
                        { id: 'segments', label: 'Segmentos' }
                    ]} 
                />
           </div>

           <div className="p-6 space-y-6 flex-1">
                {/* Gráfico Dinâmico */}
                <section className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="h-48 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData} 
                                    innerRadius={50} 
                                    outerRadius={70} 
                                    paddingAngle={2} 
                                    dataKey="value" 
                                    stroke="none" 
                                    cornerRadius={6}
                                >
                                    {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatBRL(value)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            </PieChart>
                         </ResponsiveContainer>
                    </div>
                </section>

                {/* Lista Dinâmica */}
                <section className="space-y-3 pb-8">
                    {(allocationTab === 'assets' ? assetData : allocationTab === 'types' ? typeData : segmentData).map((item, i) => {
                        const percent = ((item.value / (balance || 1)) * 100);
                        return (
                        <div key={item.name} className="p-4 rounded-[1.5rem] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 relative overflow-hidden group shadow-sm flex justify-between items-center">
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                <div>
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white">{item.name}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{formatBRL(item.value)}</p>
                                </div>
                            </div>
                            <span className="relative z-10 text-sm font-black text-slate-900 dark:text-white tabular-nums">{percent.toFixed(1)}%</span>
                            <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-white/10 w-full mt-3">
                                <div className="h-full rounded-r-full" style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                            </div>
                        </div>
                        );
                    })}
                </section>
           </div>
        </div>
      </SwipeableModal>

      {/* 2. MODAL GANHO REAL */}
      <SwipeableModal isOpen={showRealGainModal} onClose={() => setShowRealGainModal(false)}>
         <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            <div className="sticky top-0 bg-slate-50/95 dark:bg-[#0b1121]/95 backdrop-blur-xl pt-6 px-6 z-20">
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center border shadow-sm ${isAboveInflation ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}><Scale className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Ganho Real</h3>
                    </div>
                </div>
                <ModalTabs 
                    active={gainTab} 
                    onChange={setGainTab} 
                    tabs={[
                        { id: 'general', label: 'Rentabilidade' },
                        { id: 'benchmark', label: 'Benchmark' }
                    ]} 
                />
            </div>

            <div className="p-6 space-y-6">
                {gainTab === 'general' && (
                    <div className="space-y-6 animate-fade-in">
                        <section className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resultado Líquido (Estimado)</p>
                            <div className={`text-4xl font-black tabular-nums tracking-tighter ${ganhoReal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {ganhoReal >= 0 ? '+' : ''}{ganhoReal.toFixed(2)}%
                            </div>
                            <p className="text-xs text-slate-500 mt-2 font-medium">Acima da Inflação Oficial</p>
                        </section>

                        <section className={`p-6 rounded-[1.5rem] border ${isAboveInflation ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-full ${isAboveInflation ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {isAboveInflation ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                                <h4 className={`font-black text-sm uppercase tracking-wide ${isAboveInflation ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                    Análise
                                </h4>
                            </div>
                            <p className="text-xs leading-relaxed opacity-80 font-medium">
                                {isAboveInflation 
                                ? "Seu patrimônio está crescendo acima da inflação, garantindo aumento real de poder de compra." 
                                : "Seus rendimentos estão abaixo da inflação. Considere ativos atrelados ao IPCA ou aumentar os aportes."}
                            </p>
                        </section>
                    </div>
                )}

                {gainTab === 'benchmark' && (
                     <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex-1 p-5 bg-white dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-white/5 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Você</p>
                                <p className="text-xl font-black text-emerald-500 tabular-nums">{yieldCarteira.toFixed(2)}%</p>
                            </div>
                            <div className="flex-1 p-5 bg-white dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-white/5 text-center shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">IPCA</p>
                                <p className="text-xl font-black text-rose-500 tabular-nums">{inflacaoPeriodo.toFixed(2)}%</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Comparativo Visual</h4>
                             <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mb-1"><span>Sua Carteira</span> <span>{yieldCarteira.toFixed(2)}%</span></div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, yieldCarteira * 5)}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mb-1"><span>Inflação (12m)</span> <span>{inflacaoPeriodo.toFixed(2)}%</span></div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, inflacaoPeriodo * 5)}%` }}></div>
                                    </div>
                                </div>
                             </div>
                        </div>
                     </div>
                )}
            </div>
         </div>
      </SwipeableModal>

      {/* 3. MODAL RENDA PASSIVA */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            <div className="sticky top-0 bg-slate-50/95 dark:bg-[#0b1121]/95 backdrop-blur-xl pt-6 px-6 z-20">
               <div className="flex items-center gap-4 mb-6">
                   <div className="w-10 h-10 rounded-[1rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-sm"><CircleDollarSign className="w-5 h-5" /></div>
                   <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Central de Renda</h3>
                   </div>
               </div>
               <ModalTabs 
                    active={incomeTab} 
                    onChange={setIncomeTab} 
                    tabs={[
                        { id: 'summary', label: 'Resumo' },
                        { id: 'magic', label: 'Magic Number' },
                        { id: 'calendar', label: 'Calendário' }
                    ]} 
                />
            </div>

            <div className="p-6 space-y-6">
                
                {incomeTab === 'summary' && (
                    <div className="space-y-6 animate-fade-in">
                        <section className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fluxo de Caixa Total</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Já Recebido</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(received)}</p>
                                </div>
                                <div className="w-px h-10 bg-slate-100 dark:bg-white/10"></div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Provisionado</p>
                                    <p className="text-xl font-black text-emerald-500 tabular-nums">{formatBRL(upcoming)}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {incomeTab === 'magic' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-200 dark:border-white/5 mb-2">
                             <div className="flex gap-2 items-center text-accent mb-2">
                                <Target className="w-4 h-4" />
                                <span className="text-xs font-black uppercase">O que é?</span>
                             </div>
                             <p className="text-[10px] text-slate-500 leading-relaxed">O número mágico é a quantidade de cotas necessárias para que os dividendos mensais comprem uma nova cota automaticamente.</p>
                        </div>
                        {magicNumbers.map(m => (
                            <div key={m.ticker} className="p-5 bg-white dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-md">{m.ticker}</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.progress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {m.progress.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-3">
                                    <div className="h-full bg-accent" style={{ width: `${m.progress}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">
                                    {m.missing > 0 ? `Faltam ${m.missing} cotas` : 'Objetivo Atingido!'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {incomeTab === 'calendar' && (
                    <div className="space-y-0 relative pl-4 animate-fade-in">
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
                                            <span>•</span>
                                            <span>{r.paymentDate.split('-').reverse().slice(0,2).join('/')}</span>
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm tabular-nums ${isUpcoming ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>{formatBRL(r.totalReceived)}</span>
                                </div>
                            </div>
                        );
                      })}
                    </div>
                )}
            </div>
        </div>
      </SwipeableModal>

    </div>
  );
};
