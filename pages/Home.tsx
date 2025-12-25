import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, DollarSign, Crown, PieChart as PieIcon, ChevronDown, ChevronUp, Calendar, Sparkles, Loader2, X, Layers, LayoutGrid, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  onAiSync?: () => void;
  isAiLoading?: boolean;
}

export const Home: React.FC<HomeProps> = ({ portfolio, dividendReceipts, onAiSync, isAiLoading }) => {
  const [showDividendDetails, setShowDividendDetails] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'asset' | 'type'>('asset');

  const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0);
  const currentBalance = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  const profitability = totalInvested > 0 ? ((currentBalance - totalInvested) / totalInvested) * 100 : 0;
  
  const totalDividends = portfolio.reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

  const dividendsByFII = portfolio
    .filter(p => p.assetType === AssetType.FII)
    .reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  
  const dividendsByStock = portfolio
    .filter(p => p.assetType === AssetType.STOCK)
    .reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);

  const topPayer = useMemo(() => {
    if (portfolio.length === 0) return null;
    const itemsWithDividends = portfolio.filter(p => (p.totalDividends || 0) > 0);
    if (itemsWithDividends.length === 0) return null;
    return itemsWithDividends.reduce((prev, current) => 
        (prev.totalDividends || 0) > (current.totalDividends || 0) ? prev : current
    );
  }, [portfolio]);

  // Dados para Gráfico por Ativo
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

  // Dados para Gráfico por Classe (FII vs Ação)
  const dataByType = useMemo(() => {
    const fiisVal = dataByAsset.filter(d => d.type === AssetType.FII).reduce((acc, c) => acc + c.value, 0);
    const stocksVal = dataByAsset.filter(d => d.type === AssetType.STOCK).reduce((acc, c) => acc + c.value, 0);
    return [
      { name: 'FIIs', value: fiisVal, color: '#38bdf8' }, // accent
      { name: 'Ações', value: stocksVal, color: '#a855f7' } // purple-500
    ].filter(d => d.value > 0);
  }, [dataByAsset]);

  // Dados filtrados para o Modal
  const modalData = allocationTab === 'asset' ? dataByAsset : dataByType;
  
  const COLORS = ['#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#94a3b8', '#64748b'];

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };

  return (
    <div className="pb-28 pt-6 px-5 space-y-6 max-w-lg mx-auto">
      
      {/* Patrimônio */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                Patrimônio Total
            </h2>
            <div className="text-4xl font-bold text-white mb-8 tabular-nums tracking-tight">
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
                        <Wallet className="w-3.5 h-3.5" /> Custo
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                        R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" /> Rentabilidade
                    </div>
                    <div className={`text-sm font-bold ${profitability >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profitability > 0 ? '+' : ''}{profitability.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Proventos Card */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/10 rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Proventos</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Total Histórico</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                        YoC: {yieldOnCost.toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="text-3xl font-bold text-white mb-6 tabular-nums">
                R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>

            {totalDividends > 0 ? (
              <div className="space-y-4">
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300">FIIs</span>
                          <span className="text-slate-200">R$ {dividendsByFII.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950/50 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${(dividendsByFII / totalDividends) * 100}%` }} />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300">Ações</span>
                          <span className="text-slate-200">R$ {dividendsByStock.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950/50 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400" style={{ width: `${(dividendsByStock / totalDividends) * 100}%` }} />
                      </div>
                  </div>

                  {/* Detalhes Toggle */}
                  <button 
                    onClick={() => setShowDividendDetails(!showDividendDetails)}
                    className="w-full mt-4 pt-4 border-t border-emerald-500/10 flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold hover:bg-emerald-500/5 py-2 rounded-lg transition-colors"
                  >
                    {showDividendDetails ? 'Ocultar Extrato' : 'Ver Extrato Detalhado'}
                    {showDividendDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  
                  {showDividendDetails && (
                    <div className="space-y-2 mt-2 animate-fade-in bg-slate-950/30 rounded-xl p-2 max-h-60 overflow-y-auto">
                      {dividendReceipts.map((receipt, idx) => (
                        <div key={`${receipt.id}-${idx}`} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white border border-white/5">
                               {receipt.ticker.substring(0,4)}
                             </div>
                             <div>
                                <div className="text-xs font-bold text-white">{receipt.ticker}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" /> Pago: {formatDate(receipt.paymentDate)}
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-bold text-emerald-400">R$ {receipt.totalReceived.toFixed(2)}</div>
                             <div className="text-[10px] text-slate-500">{receipt.quantityOwned} cotas x {receipt.rate.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {topPayer && !showDividendDetails && (
                    <div className="mt-2 pt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-400" /> Maior Pagador
                        </span>
                        <span className="text-xs font-bold text-white bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            {topPayer.ticker}: R$ {topPayer.totalDividends?.toFixed(2)}
                        </span>
                    </div>
                  )}
              </div>
            ) : (
               <div className="text-center py-2 flex flex-col items-center gap-3">
                  {isAiLoading ? (
                    <p className="text-xs text-emerald-400 italic flex items-center justify-center gap-2 animate-pulse">
                       <Loader2 className="w-4 h-4 animate-spin" />
                       IA analisando dividendos...
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 italic">
                        Nenhum provento identificado automaticamente.
                      </p>
                      {onAiSync && (
                        <button 
                          onClick={onAiSync}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                        >
                          <Sparkles className="w-3 h-3" /> Buscar com IA
                        </button>
                      )}
                    </>
                  )}
               </div>
            )}
        </div>
      </div>

      {/* Alocação CARD */}
      {portfolio.length > 0 && (
        <div 
          onClick={() => setShowAllocationModal(true)}
          className="animate-fade-in-up cursor-pointer group"
          style={{ animationDelay: '200ms' }}
        >
            <div className="bg-secondary/30 rounded-3xl border border-white/5 p-6 backdrop-blur-md hover:bg-secondary/50 transition-all duration-300 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                        <PieIcon className="w-4 h-4 text-accent" /> Alocação da Carteira
                    </h3>
                    <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Mini Gráfico */}
                    <div className="h-28 w-28 relative flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                  data={dataByAsset} 
                                  innerRadius={35} 
                                  outerRadius={50} 
                                  paddingAngle={4} 
                                  dataKey="value" 
                                  stroke="none" 
                                  cornerRadius={4}
                                >
                                    {dataByAsset.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-slate-500">{dataByAsset.length}</span>
                        </div>
                    </div>

                    {/* Resumo */}
                    <div className="flex-1 space-y-2">
                        {dataByAsset.slice(0, 3).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-slate-300 font-medium">{entry.name}</span>
                                </div>
                                <span className="text-white font-bold">{((entry.value / currentBalance) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                        {dataByAsset.length > 3 && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-white/5 mt-1">
                                <span>+ {dataByAsset.length - 3} outros ativos</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE ALOCAÇÃO */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fade-in" onClick={() => setShowAllocationModal(false)} />
          
          <div className="bg-slate-900 w-full h-[85vh] sm:h-auto sm:max-h-[80vh] sm:max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl border-t sm:border border-white/10 relative animate-slide-up z-10 ring-1 ring-white/5 flex flex-col">
             
             {/* Header Modal */}
             <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5">
                 <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-white tracking-tight">Distribuição</h3>
                    <p className="text-xs text-slate-400">Análise detalhada da carteira</p>
                 </div>
                 <button onClick={() => setShowAllocationModal(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors bg-white/5">
                     <X className="w-5 h-5" />
                 </button>
            </div>

            {/* Tabs */}
            <div className="p-4 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setAllocationTab('asset')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${allocationTab === 'asset' ? 'bg-accent/10 text-accent ring-1 ring-accent/20' : 'bg-secondary/40 text-slate-500 hover:text-white'}`}
                >
                    <LayoutGrid className="w-4 h-4" /> Por Ativo
                </button>
                <button 
                  onClick={() => setAllocationTab('type')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${allocationTab === 'type' ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20' : 'bg-secondary/40 text-slate-500 hover:text-white'}`}
                >
                    <Layers className="w-4 h-4" /> Por Classe
                </button>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full flex-shrink-0 relative my-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={modalData} 
                            innerRadius={70} 
                            outerRadius={100} 
                            paddingAngle={2} 
                            dataKey="value" 
                            stroke="none" 
                            cornerRadius={6}
                        >
                            {modalData.map((entry, index) => (
                                <Cell key={index} fill={allocationTab === 'type' ? (entry as any).color : COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip 
                           formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Valor']}
                           contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                           itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total</span>
                    <span className="text-lg font-bold text-white">R$ {currentBalance.toLocaleString('pt-BR', {notation: "compact", compactDisplay: "short"})}</span>
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                {modalData.map((entry, index) => {
                    const percentage = (entry.value / currentBalance) * 100;
                    const color = allocationTab === 'type' ? (entry as any).color : COLORS[index % COLORS.length];
                    
                    return (
                        <div key={entry.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color }} />
                                <div className="space-y-1 flex-1">
                                    <div className="flex justify-between items-center pr-2">
                                        <span className="text-sm font-bold text-white">{entry.name}</span>
                                        <span className="text-xs font-bold text-slate-300">{percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-right w-24">
                                <div className="text-xs font-medium text-slate-400">
                                    R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
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