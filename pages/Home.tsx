
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Calendar, X, ArrowUpRight, ReceiptText, Trophy, Building2, Briefcase, FilterX, Info, ExternalLink, ArrowDownToLine, Timer, ArrowUpCircle, ChevronRight, RefreshCw, Clock, Coins } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  const [filterClass, setFilterClass] = useState<AssetType | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'asset' | 'type'>('asset');

  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  
  const totalDividends = useMemo(() => dividendReceipts.reduce((acc, curr) => acc + curr.totalReceived, 0), [dividendReceipts]);
  
  // Total Return: Valorização Atual + Lucro Realizado + Dividendos
  const unrealizedGain = currentBalance - totalInvested;
  const totalReturnVal = unrealizedGain + realizedGain + totalDividends;
  const totalReturnPercent = totalInvested > 0 ? (totalReturnVal / totalInvested) * 100 : 0;

  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;
  const assetCount = portfolio.length;

  const dataByAsset = useMemo(() => {
    return portfolio
      .map(p => ({
        name: p.ticker,
        value: (p.currentPrice || p.averagePrice) * p.quantity,
        type: p.assetType,
        quantity: p.quantity,
        color: p.assetType === AssetType.FII ? '#38bdf8' : '#a855f7' // Azul para FII, Roxo para Ações
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

  const COLORS = ['#38bdf8', '#10b981', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#2dd4bf', '#818cf8'];
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Agrupamento de Proventos para o Modal
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

  // Ranking de Proventos para o Modal
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
    <div className="pb-32 pt-6 px-5 space-y-6">
      
      {/* Patrimônio Principal - APRIMORADO */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#1e293b] to-slate-900 border border-white/10 p-7 rounded-[2.5rem] shadow-2xl transition-all group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full group-hover:bg-accent/10 transition-all"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[60px] rounded-full"></div>
            
            {/* Header Card */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-accent" />
                        Patrimônio Líquido
                    </h2>
                </div>
                {isAiLoading && (
                  <div className="flex items-center gap-2 bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                    <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">Atualizando</span>
                  </div>
                )}
            </div>

            {/* Valor Principal */}
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

            {/* Divisor */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5 relative z-10"></div>

            {/* Grid de Detalhes */}
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

      {/* Renda Passiva Card */}
      <div 
        onClick={() => setShowProventosModal(true)}
        className="animate-fade-in-up tap-highlight cursor-pointer"
        style={{ animationDelay: '100ms' }}
      >
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[2.5rem] p-7 shadow-xl group hover:bg-emerald-500/5 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-500/20 rounded-2xl text-emerald-400 ring-1 ring-emerald-500/30">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Rendimentos</h3>
                        <p className="text-[10px] text-emerald-500/70 font-bold mt-1.5 uppercase tracking-widest">Acumulado 12 meses</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-500/30 group-hover:translate-x-1 transition-transform" />
            </div>
            
            <div className="flex items-baseline gap-3">
                <div className="text-3xl font-black text-white tabular-nums">R$ {formatCurrency(totalDividends)}</div>
                <div className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-xl border border-emerald-500/10">
                    YoC {yieldOnCost.toFixed(2)}%
                </div>
            </div>
        </div>
      </div>

      {/* Grid de Informações Secundárias */}
      <div className="grid grid-cols-1 gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {portfolio.length > 0 && (
            <div 
              onClick={() => setShowAllocationModal(true)}
              className="glass rounded-[2.5rem] p-6 hover:bg-white/5 transition-all group tap-highlight cursor-pointer"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-bold flex items-center gap-3 text-sm">
                        <div className="p-2 bg-accent/10 rounded-xl">
                            <PieIcon className="w-4 h-4 text-accent" />
                        </div>
                        Composição da Carteira
                    </h3>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        Ver detalhes <ChevronRight className="w-3 h-3" />
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="h-28 w-28 shrink-0 relative pointer-events-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                  data={dataByAsset} 
                                  innerRadius={30} 
                                  outerRadius={45} 
                                  paddingAngle={5} 
                                  dataKey="value" 
                                  stroke="none" 
                                  cornerRadius={8}
                                >
                                    {dataByAsset.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                        {dataByAsset.slice(0, 3).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{entry.name}</span>
                                </div>
                                <span className="text-xs text-white font-black tabular-nums">{((entry.value / (currentBalance || 1)) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
      </div>

      {/* Fontes Gemini */}
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

      {/* --- MODAL PROVENTOS --- */}
      {showProventosModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowProventosModal(false)} />
          <div className="bg-primary w-full h-[85vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col overflow-hidden">
            
            <div className="p-7 pb-4 shrink-0">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6"></div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Proventos</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Detalhamento de Renda</p>
                </div>
                <button onClick={() => setShowProventosModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] grid grid-cols-2">
                <button onClick={() => setProventosTab('statement')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'statement' ? 'bg-emerald-500 text-primary shadow-lg' : 'text-slate-500'}`}>Extrato</button>
                <button onClick={() => setProventosTab('ranking')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${proventosTab === 'ranking' ? 'bg-accent text-primary shadow-lg' : 'text-slate-500'}`}>Ranking</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 pb-10 space-y-6 no-scrollbar">
               {proventosTab === 'statement' ? (
                 Object.keys(proventosGrouped).length === 0 ? (
                    <div className="text-center py-20 text-slate-500 text-xs font-bold uppercase tracking-widest">Nenhum provento recebido</div>
                 ) : (
                    Object.entries(proventosGrouped).map(([month, receipts]: [string, DividendReceipt[]], i) => (
                        <div key={month} className="space-y-4 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="flex items-center gap-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{month}</h4>
                                <div className="h-px flex-1 bg-white/[0.05]"></div>
                                <span className="text-[10px] font-black text-emerald-400">R$ {formatCurrency(receipts.reduce((a, b) => a + b.totalReceived, 0))}</span>
                            </div>
                            {receipts.map(r => (
                                <div key={r.id} className="glass p-4 rounded-3xl flex items-center justify-between border border-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-[10px] font-black text-white ring-1 ring-white/5">
                                            {r.ticker.substring(0,4)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white leading-none mb-1">{r.ticker}</div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{r.paymentDate.split('-').reverse().join('/')}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-emerald-400 font-black text-sm">R$ {formatCurrency(r.totalReceived)}</div>
                                        <div className="text-[8px] text-slate-600 font-black uppercase tracking-wider">{r.type}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                 )
               ) : (
                 <div className="space-y-3">
                    {rankingProventos.map((item, idx) => (
                        <div key={item.ticker} className="glass p-4 rounded-[2rem] flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-black text-xs">
                                #{idx + 1}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-black text-white">{item.ticker}</span>
                                    <span className="font-black text-emerald-400">R$ {formatCurrency(item.total)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full" style={{ width: `${(item.total / rankingProventos[0].total) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ALOCAÇÃO --- */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowAllocationModal(false)} />
          <div className="bg-primary w-full h-[85vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col overflow-hidden">
            
            <div className="p-7 pb-4 shrink-0">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6"></div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Alocação</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Composição do Patrimônio</p>
                </div>
                <button onClick={() => setShowAllocationModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] grid grid-cols-2">
                <button onClick={() => setAllocationTab('asset')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'asset' ? 'bg-accent text-primary shadow-lg' : 'text-slate-500'}`}>Por Ativo</button>
                <button onClick={() => setAllocationTab('type')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${allocationTab === 'type' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500'}`}>Por Classe</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 pb-10 space-y-8 no-scrollbar">
                <div className="h-64 relative">
                     <ResponsiveContainer width="100%" height="100%">
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
                                    <Cell key={`cell-${index}`} fill={allocationTab === 'type' ? entry.color : COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(val: number) => `R$ {formatCurrency(val)}`}
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

                <div className="space-y-3">
                    {(allocationTab === 'asset' ? dataByAsset : dataByType).map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: allocationTab === 'type' ? entry.color : COLORS[index % COLORS.length] }}></div>
                                <div>
                                    <div className="text-sm font-black text-white">{entry.name}</div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{((entry.value / currentBalance) * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-200">R$ {formatCurrency(entry.value)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
