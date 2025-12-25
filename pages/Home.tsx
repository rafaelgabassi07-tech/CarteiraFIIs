
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, DollarSign, PieChart as PieIcon, Calendar, X, ArrowUpRight, ReceiptText, Trophy, Building2, Briefcase, FilterX, Info, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  onAiSync?: () => void;
  isAiLoading?: boolean;
  sources?: { web: { uri: string; title: string } }[];
}

export const Home: React.FC<HomeProps> = ({ portfolio, dividendReceipts, onAiSync, isAiLoading, sources = [] }) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [proventosTab, setProventosTab] = useState<'statement' | 'ranking'>('statement');
  const [filterClass, setFilterClass] = useState<AssetType | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'asset' | 'type'>('asset');

  // Cálculos base com fallbacks seguros para evitar NaN ou Infinity
  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  const profitability = totalInvested > 0 ? ((currentBalance - totalInvested) / totalInvested) * 100 : 0;
  const totalDividends = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.totalDividends || 0), 0), [portfolio]);
  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

  const dataByAsset = useMemo(() => {
    return portfolio
      .map(p => ({
        name: p.ticker,
        value: (p.currentPrice || p.averagePrice) * p.quantity,
        type: p.assetType,
        quantity: p.quantity
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

  const { totalFiisDiv, totalStocksDiv } = useMemo(() => {
    return dividendReceipts.reduce((acc, r) => {
      if (r.assetType === AssetType.FII) acc.totalFiisDiv += r.totalReceived;
      else acc.totalStocksDiv += r.totalReceived;
      return acc;
    }, { totalFiisDiv: 0, totalStocksDiv: 0 });
  }, [dividendReceipts]);

  const dividendRanking = useMemo(() => {
    const map: Record<string, { total: number, type?: AssetType }> = {};
    dividendReceipts.forEach(d => { 
      if (!map[d.ticker]) map[d.ticker] = { total: 0, type: d.assetType };
      map[d.ticker].total += d.totalReceived;
    });
    return (Object.entries(map) as [string, { total: number, type?: AssetType }][])
      .map(([ticker, data]) => ({ ticker, total: data.total, type: data.type }))
      .sort((a, b) => b.total - a.total);
  }, [dividendReceipts]);

  const filteredReceipts = useMemo(() => {
    return filterClass ? dividendReceipts.filter(r => r.assetType === filterClass) : dividendReceipts;
  }, [dividendReceipts, filterClass]);

  const groupedReceipts = useMemo(() => {
    const groups: Record<string, DividendReceipt[]> = {};
    filteredReceipts.forEach(r => {
      const d = new Date(r.paymentDate + 'T12:00:00');
      const month = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(r);
    });
    return groups;
  }, [filteredReceipts]);

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
                                <Pie 
                                  data={dataByAsset} 
                                  innerRadius={28} 
                                  outerRadius={42} 
                                  paddingAngle={4} 
                                  dataKey="value" 
                                  stroke="none" 
                                  cornerRadius={6}
                                  activeShape={false}
                                >
                                    {dataByAsset.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                        {dataByAsset.slice(0, 3).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">{entry.name}</span>
                                <span className="text-white font-black">{((entry.value / (currentBalance || 1)) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Search Grounding Sources Compliance */}
      {sources.length > 0 && (
        <div className="animate-fade-in-up space-y-3" style={{ animationDelay: '300ms' }}>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
             <Info className="w-3.5 h-3.5" /> Fontes Web de Mercado
          </h3>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.web.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass py-2 px-4 rounded-xl text-[10px] font-bold text-slate-400 hover:text-accent border border-white/5 hover:border-accent/30 transition-all flex items-center gap-2 bg-white/[0.02]"
              >
                <ExternalLink className="w-3 h-3" />
                {source.web.title || 'Referência'}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Proventos */}
      {showProventosModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowProventosModal(false)} />
          <div className="bg-primary w-full max-h-[90vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col pt-4">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 shrink-0"></div>
            <div className="px-7 pb-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-black text-white">Extrato Detalhado</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {filterClass ? `Exibindo apenas ${filterClass === AssetType.FII ? 'FIIs' : 'Ações'}` : 'Fluxo de Caixa Acumulado'}
                </p>
              </div>
              <button onClick={() => setShowProventosModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-7 py-4 grid grid-cols-2 gap-4 shrink-0">
              <button 
                onClick={() => setFilterClass(filterClass === AssetType.FII ? null : AssetType.FII)}
                className={`text-left rounded-3xl p-4 border transition-all relative overflow-hidden ${filterClass === AssetType.FII ? 'bg-accent border-accent' : 'bg-accent/5 border-accent/20'}`}
              >
                <div className={`flex items-center gap-2 mb-1 ${filterClass === AssetType.FII ? 'text-primary' : 'text-accent'}`}>
                  <Building2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">FIIs</span>
                </div>
                <div className={`text-lg font-black tabular-nums ${filterClass === AssetType.FII ? 'text-primary' : 'text-white'}`}>R$ {formatCurrency(totalFiisDiv)}</div>
                {filterClass === AssetType.FII && <FilterX className="absolute bottom-2 right-2 w-3 h-3 text-primary opacity-50" />}
              </button>

              <button 
                onClick={() => setFilterClass(filterClass === AssetType.STOCK ? null : AssetType.STOCK)}
                className={`text-left rounded-3xl p-4 border transition-all relative overflow-hidden ${filterClass === AssetType.STOCK ? 'bg-purple-500 border-purple-500' : 'bg-purple-500/5 border-purple-500/20'}`}
              >
                <div className={`flex items-center gap-2 mb-1 ${filterClass === AssetType.STOCK ? 'text-primary' : 'text-purple-400'}`}>
                  <Briefcase className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Ações</span>
                </div>
                <div className={`text-lg font-black tabular-nums ${filterClass === AssetType.STOCK ? 'text-primary' : 'text-white'}`}>R$ {formatCurrency(totalStocksDiv)}</div>
                {filterClass === AssetType.STOCK && <FilterX className="absolute bottom-2 right-2 w-3 h-3 text-primary opacity-50" />}
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
                {filteredReceipts.length === 0 ? (
                    <div className="py-20 text-center text-slate-500 italic text-sm">Nenhum registro encontrado</div>
                ) : (
                    proventosTab === 'statement' ? (
                        (Object.entries(groupedReceipts) as [string, DividendReceipt[]][]).map(([month, receipts]) => (
                          <div key={month} className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" /> {month}
                            </h4>
                            <div className="space-y-3">
                              {receipts.map((receipt, idx) => {
                                const isJcp = receipt.type.toUpperCase().includes('JCP');
                                const isFii = receipt.assetType === AssetType.FII;
                                return (
                                  <div key={receipt.id} className="relative flex items-center justify-between p-4 glass rounded-[2rem] group animate-fade-in-up overflow-hidden" style={{ animationDelay: `${idx * 40}ms` }}>
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isFii ? 'bg-accent' : 'bg-purple-500'}`} />
                                      <div className="flex items-center gap-4 pl-1">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isFii ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                                            {isFii ? <Building2 className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
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
                              const percent = (item.total / (totalDividends || 1)) * 100;
                              const isFii = item.type === AssetType.FII;
                              return (
                                  <div key={idx} className="space-y-2 animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                                      <div className="flex justify-between items-baseline px-1">
                                          <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-600">{idx + 1}</span>
                                            <div className="flex items-center gap-2">
                                              <span className={`text-sm font-black ${isFii ? 'text-accent' : 'text-purple-400'}`}>{item.ticker}</span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-black text-white">R$ {formatCurrency(item.total)}</div>
                                            <div className={`text-[9px] font-bold uppercase tracking-wider ${isFii ? 'text-accent' : 'text-purple-400'}`}>{percent.toFixed(1)}%</div>
                                          </div>
                                      </div>
                                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                          <div className={`h-full rounded-full ${isFii ? 'bg-accent' : 'bg-purple-500'}`} style={{ width: `${percent}%` }} />
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

      {/* Modal de Alocação Aprimorado */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowAllocationModal(false)} />
          <div className="bg-primary w-full max-h-[95vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col pt-4 overflow-hidden">
            
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 shrink-0"></div>
            
            <div className="px-7 flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-white">Minha Alocação</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Visão Geral da Carteira</p>
                </div>
                <button onClick={() => setShowAllocationModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-95 transition-all">
                  <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="px-7 grid grid-cols-2 gap-3 mb-6 shrink-0">
                <button onClick={() => setAllocationTab('asset')} className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${allocationTab === 'asset' ? 'bg-accent border-accent text-primary' : 'bg-white/5 border-white/5 text-slate-400'}`}>Por Ativos</button>
                <button onClick={() => setAllocationTab('type')} className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${allocationTab === 'type' ? 'bg-accent border-accent text-primary' : 'bg-white/5 border-white/5 text-slate-400'}`}>Por Classe</button>
            </div>

            {/* Gráfico Donut com Legend Central */}
            <div className="h-64 relative mb-4 shrink-0">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-white tabular-nums">R$ {formatCurrency(currentBalance)}</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                          data={allocationTab === 'asset' ? dataByAsset : dataByType} 
                          innerRadius={75} 
                          outerRadius={95} 
                          paddingAngle={3} 
                          dataKey="value" 
                          stroke="none" 
                          cornerRadius={10}
                          activeShape={false}
                        >
                            {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => (
                                <Cell 
                                  key={index} 
                                  fill={allocationTab === 'type' ? (entry as any).color : COLORS[index % COLORS.length]} 
                                  className="outline-none"
                                />
                            ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl">
                                  <p className="text-[10px] font-black text-accent uppercase mb-1">{payload[0].name}</p>
                                  <p className="text-sm font-black text-white">R$ {formatCurrency(payload[0].value as number)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Lista de Ativos com Indicadores de Concentração */}
            <div className="flex-1 overflow-y-auto px-7 pb-12 space-y-3 no-scrollbar">
                {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => {
                    const percentage = (entry.value / (currentBalance || 1)) * 100;
                    const color = allocationTab === 'type' ? (entry as any).color : COLORS[index % COLORS.length];
                    
                    return (
                        <div key={index} className="group flex flex-col p-4 glass rounded-3xl animate-fade-in-up border border-white/5 hover:border-white/10 transition-all" style={{ animationDelay: `${index * 40}ms` }}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs border" style={{ backgroundColor: `${color}10`, borderColor: `${color}20`, color: color }}>
                                        {entry.name.slice(0, 4)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white uppercase tracking-tight">{entry.name}</div>
                                        {allocationTab === 'asset' && (
                                          <div className="text-[10px] text-slate-500 font-bold uppercase">{(entry as any).quantity} UNIDADES</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-white tabular-nums">{percentage.toFixed(1)}%</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tabular-nums">R$ {formatCurrency(entry.value)}</div>
                                </div>
                            </div>
                            
                            {/* Barra de progresso discreta para visualização de peso */}
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-1000 ease-out" 
                                  style={{ width: `${percentage}%`, backgroundColor: color }}
                                />
                            </div>
                        </div>
                    );
                })}
                
                {dataByAsset.length === 0 && (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="p-4 bg-white/5 rounded-full">
                      <Info className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Aguardando dados de mercado...</p>
                  </div>
                )}
            </div>
            
            {/* Resumo do Rodapé do Modal */}
            <div className="px-7 py-6 border-t border-white/5 bg-secondary/20 shrink-0">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ativos Listados</span>
                  <span className="text-xs font-black text-white">{allocationTab === 'asset' ? dataByAsset.length : dataByType.length}</span>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
