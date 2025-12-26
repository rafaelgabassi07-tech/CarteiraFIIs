
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, TrendingDown, Coins, Building2, ArrowUpCircle, ChevronRight, RefreshCw, CircleDollarSign, PieChart as PieIcon, Scale, Info, ExternalLink, X, Calendar, Trophy, ReceiptText, BarChart3, Calculator, Percent, Sparkles, Layers, ShieldCheck, Flame } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
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
  const [showInflationModal, setShowInflationModal] = useState(false);

  const cleanDividendReceipts = useMemo(() => {
    const map = new Map<string, DividendReceipt>();
    dividendReceipts.forEach(div => map.set(div.id, div));
    return Array.from(map.values());
  }, [dividendReceipts]);

  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  const totalDividends = useMemo(() => cleanDividendReceipts.reduce((acc, curr) => acc + curr.totalReceived, 0), [cleanDividendReceipts]);
  const unrealizedGain = currentBalance - totalInvested;
  const totalReturnVal = unrealizedGain + realizedGain + totalDividends;
  const totalReturnPercent = totalInvested > 0 ? (totalReturnVal / totalInvested) * 100 : 0;

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // IPCA Acumulado Médio (Simulação 1 ano ou proporcional)
  const estimatedInflation = 4.5; // 4.5% ao ano (estimativa IPCA)
  const realGainPercent = ((1 + totalReturnPercent/100) / (1 + estimatedInflation/100) - 1) * 100;

  const dataByAsset = useMemo(() => {
    return portfolio
      .map(p => ({
        name: p.ticker,
        value: (p.currentPrice || p.averagePrice) * p.quantity,
        type: p.assetType
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const dividendsChartData = useMemo(() => {
    const agg: Record<string, number> = {};
    cleanDividendReceipts.forEach(d => {
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
                name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
                value: val
            };
        });
  }, [cleanDividendReceipts]);

  const proventosGrouped = useMemo(() => {
    const sorted = [...cleanDividendReceipts].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    const groups: Record<string, DividendReceipt[]> = {};
    sorted.forEach(d => {
        const dateObj = new Date(d.paymentDate + 'T12:00:00');
        const monthYear = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        if (!groups[monthYear]) groups[monthYear] = [];
        groups[monthYear].push(d);
    });
    return groups;
  }, [cleanDividendReceipts]);

  const rankingProventos = useMemo(() => {
    const map = new Map<string, number>();
    cleanDividendReceipts.forEach(d => {
        const current = map.get(d.ticker) || 0;
        map.set(d.ticker, current + d.totalReceived);
    });
    return Array.from(map.entries())
        .map(([ticker, total]) => ({ ticker, total }))
        .sort((a, b) => b.total - a.total);
  }, [cleanDividendReceipts]);

  return (
    <div className="pb-32 pt-2 px-5 space-y-6">
      
      {/* PATRIMÔNIO TOTAL */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-[#0f172a] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 blur-[100px] rounded-full group-hover:bg-accent/15 transition-all duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>
            
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
                        Lucro Total: R$ {formatCurrency(totalReturnVal)}
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
                        <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Custo</div>
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

      {/* CARD DIVIDENDOS */}
      <div 
        onClick={() => setShowProventosModal(true)}
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
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>
            
            <div className="relative z-10 flex items-end justify-between">
                <div>
                     <div className="text-3xl font-black text-white tabular-nums tracking-tighter mb-1">
                        R$ {formatCurrency(totalDividends)}
                     </div>
                     <div className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Total Acumulado</div>
                </div>
                <div className="flex h-10 items-end gap-1">
                    {dividendsChartData.slice(-5).map((d, i) => (
                        <div key={i} className="w-1.5 bg-emerald-500/20 rounded-t-sm" style={{ height: `${Math.max(10, (d.value / (rankingProventos[0]?.total || 1)) * 100)}%` }}>
                            <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: '40%' }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* CARDS SECUNDÁRIOS REFORMULADOS */}
      <div className="grid grid-cols-1 gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          
          {/* Card Alocação */}
          <div 
            onClick={() => setShowAllocationModal(true)} 
            className="group relative overflow-hidden bg-gradient-to-r from-indigo-500/5 to-slate-900 border border-indigo-500/10 p-5 rounded-[2.2rem] flex items-center justify-between transition-all hover:border-indigo-500/30 active:scale-[0.98] cursor-pointer"
          >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full"></div>
              <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-transform">
                      <PieIcon className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="text-white font-black text-sm uppercase tracking-tight">Alocação Ativa</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{portfolio.length} ativos distribuídos</p>
                  </div>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-600 group-hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
              </div>
          </div>

          {/* Card Ganho Real */}
          <div 
            onClick={() => setShowInflationModal(true)} 
            className="group relative overflow-hidden bg-gradient-to-r from-yellow-500/5 to-slate-900 border border-yellow-500/10 p-5 rounded-[2.2rem] flex items-center justify-between transition-all hover:border-yellow-500/30 active:scale-[0.98] cursor-pointer"
          >
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[50px] rounded-full"></div>
              <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-lg shadow-yellow-500/5 group-hover:scale-110 transition-transform">
                      <Scale className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="text-white font-black text-sm uppercase tracking-tight">Ganho Real</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Poder de compra real</p>
                  </div>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-600 group-hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
              </div>
          </div>
      </div>

      {/* FONTES DE DADOS */}
      {sources.length > 0 && (
        <div className="animate-fade-in-up py-4 px-2" style={{ animationDelay: '300ms' }}>
          <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3">Fontes de Dados (IA)</h3>
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <a key={i} href={s.web.uri} target="_blank" className="bg-white/[0.02] py-2 px-3 rounded-xl text-[9px] font-bold text-slate-500 border border-white/5 flex items-center gap-2 hover:border-accent/30 transition-all">
                <ExternalLink className="w-2.5 h-2.5" /> {s.web.title?.slice(0, 20)}...
              </a>
            ))}
          </div>
        </div>
      )}

      {/* MODAIS */}
      
      {/* Modal Proventos */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-6 pt-2 pb-10">
           <div className="mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter">Proventos</h3>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">Extrato de Rendimentos</p>
           </div>
           <div className="h-48 w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dividendsChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
           </div>
           <div className="bg-white/[0.03] p-1 rounded-2xl flex mb-6 border border-white/5">
              <button onClick={() => setProventosTab('statement')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'statement' ? 'bg-emerald-500 text-primary shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>Extrato</button>
              <button onClick={() => setProventosTab('ranking')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'ranking' ? 'bg-emerald-500 text-primary shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}>Ranking</button>
           </div>
           <div className="space-y-6">
               {proventosTab === 'statement' ? (
                 (Object.entries(proventosGrouped) as [string, DividendReceipt[]][]).map(([month, receipts]) => (
                    <div key={month} className="space-y-3">
                        <div className="flex items-center gap-3 py-2 border-b border-white/5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{month}</h4>
                            <span className="text-[10px] font-black text-emerald-400 ml-auto">R$ {formatCurrency(receipts.reduce((a, b) => a + b.totalReceived, 0))}</span>
                        </div>
                        {receipts.map(r => (
                            <div key={r.id} className="bg-white/[0.02] p-4 rounded-3xl flex items-center justify-between border border-white/[0.03]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-black text-white border border-white/5">{r.ticker.substring(0,4)}</div>
                                    <div>
                                        <div className="text-sm font-black text-white">{r.ticker}</div>
                                        <div className="text-[9px] font-bold text-slate-500 uppercase">{r.paymentDate.split('-').reverse().join('/')}</div>
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
               ) : (
                 <div className="space-y-3">
                    {rankingProventos.map((item, idx) => (
                        <div key={item.ticker} className="bg-white/[0.02] p-4 rounded-3xl flex items-center gap-4 border border-white/[0.03]">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-xs text-slate-500">#{idx + 1}</div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="font-black text-white text-sm">{item.ticker}</span>
                                    <span className="font-black text-emerald-400 text-sm">R$ {formatCurrency(item.total)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${(item.total / rankingProventos[0].total) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
               )}
           </div>
        </div>
      </SwipeableModal>

      {/* Modal Ganho Real */}
      <SwipeableModal isOpen={showInflationModal} onClose={() => setShowInflationModal(false)}>
        <div className="px-6 pt-2 pb-10">
            <div className="mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter">Ganho Real</h3>
                <p className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.2em] mt-1">Rentabilidade Acima da Inflação</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5">
                   <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carteira</span>
                   </div>
                   <div className="text-2xl font-black text-white">{totalReturnPercent.toFixed(2)}%</div>
                   <p className="text-[9px] text-slate-500 font-bold mt-1">Total Acumulado</p>
                </div>
                <div className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5">
                   <div className="flex items-center gap-2 mb-3">
                      <Flame className="w-4 h-4 text-rose-400" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inflação</span>
                   </div>
                   <div className="text-2xl font-black text-white">{estimatedInflation.toFixed(2)}%</div>
                   <p className="text-[9px] text-slate-500 font-bold mt-1">IPCA Estimado</p>
                </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-slate-900 border border-yellow-500/20 p-8 rounded-[2.5rem] mb-8 text-center">
                <div className="absolute top-0 left-0 w-24 h-24 bg-yellow-500/5 blur-3xl"></div>
                <div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-4">Seu Ganho Real é de</div>
                <div className={`text-6xl font-black tracking-tighter mb-4 ${realGainPercent >= 0 ? 'text-white' : 'text-rose-500'}`}>
                    {realGainPercent >= 0 ? '+' : ''}{realGainPercent.toFixed(2)}%
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full border border-yellow-500/20 inline-flex">
                    <ShieldCheck className="w-4 h-4 text-yellow-500" />
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Protegido contra inflação</span>
                </div>
            </div>

            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-accent" /> Entenda o cálculo
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    O ganho real é o que sobra da sua rentabilidade após descontar o aumento generalizado de preços (IPCA). É o que efetivamente aumenta seu poder de compra.
                </p>
                <div className="mt-4 p-3 bg-white/[0.02] rounded-xl border border-white/5 text-[10px] font-mono text-slate-400 text-center">
                    (1 + Carteira) / (1 + Inflação) - 1
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* Modal Alocação */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pt-2 pb-10">
            <h3 className="text-2xl font-black text-white tracking-tighter mb-8">Alocação</h3>
            <div className="h-56 w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dataByAsset} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>
                            {dataByAsset.map((_, i) => <Cell key={i} fill={['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#34d399'][i % 6]} />)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-3">
                {dataByAsset.map((e, i) => (
                    <div key={e.name} className="bg-white/[0.02] p-4 rounded-3xl flex justify-between items-center border border-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#34d399'][i % 6] }}></div>
                            <span className="text-sm font-bold text-white">{e.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-300">R$ {formatCurrency(e.value)}</span>
                    </div>
                ))}
            </div>
         </div>
      </SwipeableModal>
    </div>
  );
};
