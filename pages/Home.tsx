
import React, { useMemo, useState } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, ChevronRight, CircleDollarSign, PieChart as PieIcon, Sparkles, Globe, ExternalLink, Calendar, Target, Zap, Layers, BarChart3, GripVertical } from 'lucide-react';
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

// Global safe formatter
const formatBRL = (val: any) => {
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

type AllocationView = 'ASSET' | 'CLASS' | 'SECTOR';

export const Home: React.FC<HomeProps> = ({ 
  portfolio, 
  dividendReceipts, 
  realizedGain = 0, 
  sources = [],
  isAiLoading = false
}) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationView, setAllocationView] = useState<AllocationView>('ASSET');

  // Cálculos de Patrimônio
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

  const totalReturnVal = (balance - invested) + realizedGain + received;
  const returnPercent = invested > 0 ? (totalReturnVal / invested) * 100 : 0;

  const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#14b8a6'];

  // Dados para Gráficos
  const assetData = useMemo(() => {
    return portfolio.map(p => ({ 
      name: p.ticker, 
      value: (p.currentPrice || p.averagePrice) * p.quantity 
    })).sort((a,b) => b.value - a.value);
  }, [portfolio]);

  const classData = useMemo(() => {
    const groups = { [AssetType.FII]: 0, [AssetType.STOCK]: 0 };
    portfolio.forEach(p => {
      const val = (p.currentPrice || p.averagePrice) * p.quantity;
      groups[p.assetType] = (groups[p.assetType] || 0) + val;
    });
    return [
      { name: 'FIIs', value: groups[AssetType.FII] },
      { name: 'Ações', value: groups[AssetType.STOCK] }
    ].filter(d => d.value > 0);
  }, [portfolio]);

  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    portfolio.forEach(p => {
      const val = (p.currentPrice || p.averagePrice) * p.quantity;
      const sec = p.segment || 'Outros';
      sectors[sec] = (sectors[sec] || 0) + val;
    });
    return Object.entries(sectors)
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a,b) => b.value - a.value);
  }, [portfolio]);

  const barData = useMemo(() => {
    const agg: Record<string, number> = {};
    dividendReceipts.filter(d => new Date(d.paymentDate + 'T12:00:00') <= new Date()).forEach(d => {
      const key = d.paymentDate.substring(0, 7);
      agg[key] = (agg[key] || 0) + d.totalReceived;
    });
    return Object.entries(agg).sort((a,b) => a[0].localeCompare(b[0])).slice(-6).map(([k, v]) => ({
      name: new Date(k + '-02').toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
      value: v
    }));
  }, [dividendReceipts]);

  return (
    <div className="pb-32 px-5 space-y-6">
      {/* Principal Card */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-7 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="flex items-center gap-2 mb-5">
               <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20"><Wallet className="w-4 h-4" /></div>
               <h2 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Saldo em Custódia</h2>
            </div>
            <div className="mb-8">
              <div className={`text-4xl font-black tracking-tighter tabular-nums mb-3 ${isAiLoading ? 'opacity-40 animate-pulse' : ''}`}>{formatBRL(balance)}</div>
              <div className="flex items-center gap-2">
                 <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black ${totalReturnVal >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
                    <Sparkles className="w-3 h-3" />
                    {totalReturnVal >= 0 ? '+' : ''}{returnPercent.toFixed(2)}% de Retorno Total
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-3xl border border-slate-100 dark:border-white/[0.05]">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Custo Médio</p>
                    <p className="text-sm font-bold">{formatBRL(invested)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-3xl border border-slate-100 dark:border-white/[0.05]">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Renda Passiva</p>
                    <p className="text-sm font-bold text-emerald-500">{formatBRL(received)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Renda e Agenda */}
      <div className="grid grid-cols-1 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowProventosModal(true)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 flex items-center justify-between shadow-sm active:scale-95 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20"><CircleDollarSign className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5">Renda Passiva</h3>
              <p className="text-lg font-black">{formatBRL(received)}</p>
            </div>
          </div>
          {upcoming > 0 && (
            <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">+{formatBRL(upcoming)}</div>
          )}
        </button>
      </div>

      {/* Alocação */}
      <button onClick={() => setShowAllocationModal(true)} className="w-full text-left animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-7 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-accent/10 rounded-2xl flex items-center justify-center text-accent border border-accent/20"><PieIcon className="w-5 h-5" /></div>
                    <h3 className="text-xs font-black uppercase tracking-widest">Estratégia de Carteira</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
            
            {portfolio.length > 0 ? (
                <div className="flex items-center gap-10">
                    <div className="w-32 h-32 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={assetData} innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                                    {assetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                        {assetData.slice(0, 3).map((asset, i) => (
                            <div key={asset.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">{asset.name}</span>
                                </div>
                                <span className="text-xs font-black">{((asset.value / (balance || 1)) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="py-6 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Aguardando Ordens...</p>
                </div>
            )}
        </div>
      </button>

      {/* Fontes Gemini */}
      {sources.length > 0 && (
        <div className="mt-8 p-6 bg-slate-50 dark:bg-white/[0.02] rounded-[2rem] border border-slate-200 dark:border-white/5">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Globe className="w-3 h-3" /> Inteligência de Mercado via Gemini
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

      {/* Modal de Proventos */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
            <h3 className="text-2xl font-black tracking-tighter mb-8">Análise de Renda</h3>
            <div className="h-48 w-full mb-8">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                    <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-slate-400 font-black text-xs uppercase">Sem histórico</div>}
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Últimos Lançamentos</h4>
              {dividendReceipts.slice(0, 8).map(r => (
                <div key={r.id} className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-3xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 flex items-center justify-center font-black text-xs">{r.ticker.slice(0,4)}</div>
                    <div><h5 className="font-black text-sm">{r.ticker}</h5><p className="text-[9px] font-bold text-slate-400">{r.paymentDate.split('-').reverse().join('/')}</p></div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-500">{formatBRL(r.totalReceived)}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{r.type}</p>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </SwipeableModal>

      {/* Modal Estratégia Melhorado */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
            <h3 className="text-2xl font-black tracking-tighter mb-6">Estratégia</h3>
            
            {/* Abas */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl mb-8">
               <button onClick={() => setAllocationView('ASSET')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${allocationView === 'ASSET' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                 <GripVertical className="w-3 h-3" /> Ativos
               </button>
               <button onClick={() => setAllocationView('CLASS')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${allocationView === 'CLASS' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                 <PieIcon className="w-3 h-3" /> Classe
               </button>
               <button onClick={() => setAllocationView('SECTOR')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${allocationView === 'SECTOR' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                 <Layers className="w-3 h-3" /> Setor
               </button>
            </div>

            {/* Conteúdo Dinâmico */}
            <div className="animate-fade-in">
              {allocationView === 'ASSET' && (
                <div className="space-y-4">
                  {assetData.map((asset, i) => {
                    const pct = ((asset.value / (balance || 1)) * 100);
                    return (
                      <div key={asset.name} className="bg-slate-50 dark:bg-white/[0.02] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 bg-slate-200/20 dark:bg-white/5" style={{ width: `${pct}%` }} />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <div><h4 className="font-black text-sm">{asset.name}</h4><p className="text-[10px] font-bold text-slate-400">{formatBRL(asset.value)}</p></div>
                          </div>
                          <div className="text-lg font-black">{pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {allocationView === 'CLASS' && (
                <div className="flex flex-col items-center">
                    <div className="w-64 h-64 relative mb-8">
                       <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={classData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>
                                    {classData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#0ea5e9'} />)}
                                </Pie>
                                <Tooltip formatter={(value) => formatBRL(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                               <p className="text-xl font-black text-slate-900 dark:text-white">{formatBRL(balance)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-full space-y-3">
                        {classData.map((item, i) => (
                           <div key={item.name} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
                              <div className="flex items-center gap-3">
                                 <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                                 <span className="font-bold text-sm">{item.name}</span>
                              </div>
                              <span className="font-black">{((item.value / balance) * 100).toFixed(1)}%</span>
                           </div>
                        ))}
                    </div>
                </div>
              )}

              {allocationView === 'SECTOR' && (
                <div className="space-y-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart layout="vertical" data={sectorData.slice(0, 8)} margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px' }} formatter={(val) => formatBRL(val)} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                               {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {sectorData.slice(0, 6).map((sec, i) => (
                            <div key={sec.name} className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-[10px] font-black uppercase text-slate-400 truncate">{sec.name}</span>
                                </div>
                                <div className="text-sm font-black">{((sec.value / balance) * 100).toFixed(1)}%</div>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
        </div>
      </SwipeableModal>
    </div>
  );
};
