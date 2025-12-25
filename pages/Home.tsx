
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, DollarSign, PieChart as PieIcon, ChevronDown, ChevronUp, Calendar, Sparkles, Loader2, X, Layers, LayoutGrid, ArrowUpRight, List, BarChart3, ReceiptText, Trophy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  onAiSync?: () => void;
  isAiLoading?: boolean;
}

export const Home: React.FC<HomeProps> = ({ portfolio, dividendReceipts, onAiSync, isAiLoading }) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [proventosTab, setProventosTab] = useState<'statement' | 'ranking'>('statement');
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'asset' | 'type'>('asset');

  const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0);
  const currentBalance = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  const profitability = totalInvested > 0 ? ((currentBalance - totalInvested) / totalInvested) * 100 : 0;
  const totalDividends = portfolio.reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

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

  const dataByType = useMemo(() => {
    const fiisVal = dataByAsset.filter(d => d.type === AssetType.FII).reduce((acc, c) => acc + c.value, 0);
    const stocksVal = dataByAsset.filter(d => d.type === AssetType.STOCK).reduce((acc, c) => acc + c.value, 0);
    return [
      { name: 'FIIs', value: fiisVal, color: '#38bdf8' },
      { name: 'Ações', value: stocksVal, color: '#a855f7' }
    ].filter(d => d.value > 0);
  }, [dataByAsset]);

  const dividendRanking = useMemo(() => {
    const map: Record<string, number> = {};
    dividendReceipts.forEach(d => { map[d.ticker] = (map[d.ticker] || 0) + d.totalReceived; });
    // Fix: Cast Object.entries to resolve potential 'unknown' type inference issues
    return (Object.entries(map) as [string, number][]).map(([ticker, total]) => ({ ticker, total })).sort((a, b) => b.total - a.total);
  }, [dividendReceipts]);

  const groupedReceipts = useMemo(() => {
    const groups: Record<string, DividendReceipt[]> = {};
    dividendReceipts.forEach(r => {
      const d = new Date(r.paymentDate + 'T12:00:00');
      const month = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(r);
    });
    return groups;
  }, [dividendReceipts]);

  const COLORS = ['#38bdf8', '#10b981', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-28 pt-6 px-5 space-y-6">
      
      {/* Patrimônio */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden glass p-7 rounded-[2.5rem] shadow-2xl transition-all hover:border-white/10 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] rounded-full group-hover:bg-accent/20 transition-all"></div>
            <h2 className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                Patrimônio Atual
            </h2>
            <div className="text-4xl font-black text-white mb-8 tracking-tighter tabular-nums">
              R$ {formatCurrency(currentBalance)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                        <Wallet className="w-3.5 h-3.5" /> Total Investido
                    </div>
                    <div className="text-sm font-bold text-slate-200">R$ {formatCurrency(totalInvested)}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                        <TrendingUp className="w-3.5 h-3.5" /> Lucro/Prejuízo
                    </div>
                    <div className={`text-sm font-bold ${profitability >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profitability > 0 ? '+' : ''}{profitability.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Proventos Card */}
      <div 
        onClick={() => setShowProventosModal(true)}
        className="animate-fade-in-up cursor-pointer transition-all active:scale-[0.97]"
        style={{ animationDelay: '100ms' }}
      >
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[2.5rem] p-7 shadow-lg group hover:bg-emerald-500/20 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 ring-1 ring-emerald-500/30">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Rendimentos</h3>
                        <p className="text-[10px] text-emerald-500/70 font-bold mt-1 uppercase tracking-[0.1em]">Total Recebido</p>
                    </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
                <div className="text-3xl font-black text-white tabular-nums">R$ {formatCurrency(totalDividends)}</div>
                {yieldOnCost > 0 && (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        YoC {yieldOnCost.toFixed(2)}%
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Alocação Mini Card */}
      {portfolio.length > 0 && (
        <div 
          onClick={() => setShowAllocationModal(true)}
          className="animate-fade-in-up cursor-pointer transition-all active:scale-[0.97]"
          style={{ animationDelay: '200ms' }}
        >
            <div className="glass rounded-[2.5rem] p-7 hover:bg-white/5 transition-all group">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                        <PieIcon className="w-5 h-5 text-accent" /> Alocação Estratégica
                    </h3>
                    <ArrowUpRight className="w-5 h-5 text-slate-500/50 group-hover:text-accent transition-colors" />
                </div>
                <div className="flex items-center gap-8">
                    <div className="h-24 w-24 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={dataByAsset} innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={6}>
                                    {dataByAsset.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                        {dataByAsset.slice(0, 3).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">{entry.name}</span>
                                <span className="text-white font-black">{((entry.value / currentBalance) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal de Proventos Aprimorado */}
      {showProventosModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowProventosModal(false)} />
          <div className="bg-primary w-full max-h-[90vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col pt-4">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 shrink-0"></div>
            <div className="px-7 pb-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-black text-white">Extrato Detalhado</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Acumulado: R$ {formatCurrency(totalDividends)}</p>
              </div>
              <button onClick={() => setShowProventosModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-7 py-4 grid grid-cols-2 gap-3 shrink-0">
                <button 
                  onClick={() => setProventosTab('statement')} 
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'statement' ? 'bg-accent text-primary' : 'bg-white/5 text-slate-500'}`}
                >
                  <ReceiptText className="w-4 h-4" /> Extrato
                </button>
                <button 
                  onClick={() => setProventosTab('ranking')} 
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'ranking' ? 'bg-accent text-primary' : 'bg-white/5 text-slate-500'}`}
                >
                  <Trophy className="w-4 h-4" /> Ranking
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-7 pb-12 space-y-8 no-scrollbar">
                {dividendReceipts.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 italic text-sm">Nenhum registro encontrado</div>
                ) : (
                    proventosTab === 'statement' ? (
                        // Fix: Explicitly cast Object.entries result to resolve 'unknown' map error on line 205
                        (Object.entries(groupedReceipts) as [string, DividendReceipt[]][]).map(([month, receipts], gIdx) => (
                          <div key={month} className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" /> {month}
                            </h4>
                            <div className="space-y-3">
                              {receipts.map((receipt, idx) => {
                                const isJcp = receipt.type.toUpperCase().includes('JCP');
                                return (
                                  <div key={receipt.id} className="flex items-center justify-between p-4 glass rounded-[2rem] group animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-[10px] text-accent border border-white/5">
                                            {receipt.ticker.slice(0,4)}
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-white">{receipt.ticker}</span>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${isJcp ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                  {isJcp ? 'JCP' : 'DIV'}
                                                </span>
                                              </div>
                                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                                Pago em {receipt.paymentDate.split('-').reverse().join('/')}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-sm font-black text-emerald-400 tabular-nums">R$ {formatCurrency(receipt.totalReceived)}</div>
                                          <div className="text-[9px] text-slate-500 font-bold uppercase tabular-nums">Base: {receipt.dateCom.split('-').reverse().join('/')}</div>
                                      </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                    ) : (
                        <div className="space-y-6 pt-2">
                          {dividendRanking.map((item, idx) => {
                              const percent = (item.total / totalDividends) * 100;
                              return (
                                  <div key={idx} className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                                      <div className="flex justify-between items-baseline px-1">
                                          <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-600">{idx + 1}</span>
                                            <span className="text-sm font-black text-white">{item.ticker}</span>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-black text-white">R$ {formatCurrency(item.total)}</div>
                                            <div className="text-[9px] font-bold text-accent uppercase tracking-wider">{percent.toFixed(1)}% do total</div>
                                          </div>
                                      </div>
                                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-accent rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(56,189,248,0.3)]" style={{ width: `${percent}%` }} />
                                      </div>
                                  </div>
                              )
                          })}
                        </div>
                    )
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alocação Reestilizado */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowAllocationModal(false)} />
          <div className="bg-primary w-full max-h-[90vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col pt-4">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6"></div>
            <div className="px-7 flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white">Alocação</h3>
                <button onClick={() => setShowAllocationModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="px-7 grid grid-cols-2 gap-3 mb-8">
                <button onClick={() => setAllocationTab('asset')} className={`py-3 rounded-2xl text-xs font-bold transition-all ${allocationTab === 'asset' ? 'bg-accent text-primary' : 'bg-white/5 text-slate-400'}`}>Ativos</button>
                <button onClick={() => setAllocationTab('type')} className={`py-3 rounded-2xl text-xs font-bold transition-all ${allocationTab === 'type' ? 'bg-accent text-primary' : 'bg-white/5 text-slate-400'}`}>Classe</button>
            </div>

            <div className="h-64 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={allocationTab === 'asset' ? dataByAsset : dataByType} innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}>
                            {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => (
                                <Cell key={index} fill={allocationTab === 'type' ? (entry as any).color : COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="flex-1 overflow-y-auto px-7 pb-12 space-y-4 no-scrollbar">
                {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => {
                    const percentage = (entry.value / currentBalance) * 100;
                    return (
                        <div key={index} className="flex items-center justify-between p-4 glass rounded-3xl animate-fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: allocationTab === 'type' ? (entry as any).color : COLORS[index % COLORS.length] }} />
                                <span className="text-sm font-bold text-white uppercase">{entry.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-white">{percentage.toFixed(1)}%</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">R$ {formatCurrency(entry.value)}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
