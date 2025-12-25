import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, DollarSign, Crown, PieChart as PieIcon, ChevronDown, ChevronUp, Calendar, Sparkles, Loader2, X, Layers, LayoutGrid, ArrowUpRight, List, BarChart3, RefreshCw } from 'lucide-react';
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

  // Dados para Gráfico por Ativo (Alocação)
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

  // Dados para Gráfico por Classe (Alocação)
  const dataByType = useMemo(() => {
    const fiisVal = dataByAsset.filter(d => d.type === AssetType.FII).reduce((acc, c) => acc + c.value, 0);
    const stocksVal = dataByAsset.filter(d => d.type === AssetType.STOCK).reduce((acc, c) => acc + c.value, 0);
    return [
      { name: 'FIIs', value: fiisVal, color: '#38bdf8' },
      { name: 'Ações', value: stocksVal, color: '#a855f7' }
    ].filter(d => d.value > 0);
  }, [dataByAsset]);

  // Dados para Ranking de Dividendos
  const dividendRanking = useMemo(() => {
    const map: Record<string, number> = {};
    dividendReceipts.forEach(d => {
        map[d.ticker] = (map[d.ticker] || 0) + d.totalReceived;
    });
    return Object.entries(map)
        .map(([ticker, total]) => ({ ticker, total }))
        .sort((a, b) => b.total - a.total);
  }, [dividendReceipts]);

  const lastDividend = useMemo(() => {
      if (dividendReceipts.length === 0) return null;
      // Assume que dividendReceipts já vem ordenado por data no App.tsx
      return dividendReceipts[0];
  }, [dividendReceipts]);

  // Dados filtrados para o Modal de Alocação
  const modalData = allocationTab === 'asset' ? dataByAsset : dataByType;
  
  const COLORS = ['#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#94a3b8', '#64748b'];

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`; // Exibe dia/mês para economizar espaço
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-28 pt-6 px-5 space-y-6 max-w-lg mx-auto">
      
      {/* Patrimônio */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                </span>
                Patrimônio Total
            </h2>
            <div className="text-4xl font-bold text-white mb-8 tabular-nums tracking-tight">
            R$ {formatCurrency(currentBalance)}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
                        <Wallet className="w-3.5 h-3.5" /> Custo
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                        R$ {formatCurrency(totalInvested)}
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

      {/* Proventos Card (Redesenhado) */}
      <div 
        onClick={() => setShowProventosModal(true)}
        className="animate-fade-in-up cursor-pointer group"
        style={{ animationDelay: '100ms' }}
      >
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/10 rounded-3xl p-6 shadow-lg relative overflow-hidden group-hover:bg-emerald-900/10 transition-all duration-300">
            {/* Background Glow Effect */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500"></div>

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400 ring-1 ring-emerald-500/20">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm leading-none">Meus Proventos</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Acumulado</p>
                    </div>
                </div>
                <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                     <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-6 relative z-10">
                <div className="text-3xl font-bold text-white tabular-nums">
                    R$ {formatCurrency(totalDividends)}
                </div>
                {yieldOnCost > 0 && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                        YoC {yieldOnCost.toFixed(2)}%
                    </span>
                )}
            </div>

            {/* Rodapé do Card com Resumo */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                {lastDividend ? (
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Último Pagamento</span>
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                             <span className="text-white font-bold">{lastDividend.ticker}</span> • R$ {lastDividend.totalReceived.toFixed(2)}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-slate-500 italic">Nenhum histórico recente</span>
                )}
                
                <div className="flex -space-x-2">
                    {/* Visual fake avatars or counts */}
                    {dividendReceipts.slice(0,3).map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                            $
                        </div>
                    ))}
                    {dividendReceipts.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-emerald-900 border border-slate-800 flex items-center justify-center text-[8px] text-emerald-400 font-bold">
                            +{dividendReceipts.length - 3}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Alocação Card */}
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
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE PROVENTOS --- */}
      {showProventosModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fade-in" onClick={() => setShowProventosModal(false)} />
          
          <div className="bg-slate-900 w-full h-[85vh] sm:h-auto sm:max-h-[80vh] sm:max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl border-t sm:border border-white/10 relative animate-slide-up z-10 ring-1 ring-white/5 flex flex-col">
             
             {/* Header Modal */}
             <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5">
                 <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        Proventos <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">YoC {yieldOnCost.toFixed(2)}%</span>
                    </h3>
                    <p className="text-xs text-slate-400">Total recebido: R$ {formatCurrency(totalDividends)}</p>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     {/* Botão de IA movido para cá */}
                     {onAiSync && (
                         <button 
                            onClick={onAiSync}
                            disabled={isAiLoading}
                            className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                         >
                            {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                         </button>
                     )}
                     <button onClick={() => setShowProventosModal(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors bg-white/5">
                         <X className="w-5 h-5" />
                     </button>
                 </div>
            </div>

            {/* Tabs */}
            <div className="p-4 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setProventosTab('statement')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${proventosTab === 'statement' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-secondary/40 text-slate-500 hover:text-white'}`}
                >
                    <List className="w-4 h-4" /> Extrato
                </button>
                <button 
                  onClick={() => setProventosTab('ranking')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${proventosTab === 'ranking' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-secondary/40 text-slate-500 hover:text-white'}`}
                >
                    <BarChart3 className="w-4 h-4" /> Ranking
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 min-h-[300px]">
                
                {dividendReceipts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 py-10">
                        <Sparkles className="w-8 h-8 opacity-50" />
                        <p className="text-sm">Nenhum provento registrado ainda.</p>
                        <p className="text-xs text-center max-w-[200px] opacity-70">Use o botão de brilho acima para buscar dados automaticamente.</p>
                    </div>
                ) : (
                    <>
                        {/* VIEW: EXTRATO */}
                        {proventosTab === 'statement' && dividendReceipts.map((receipt, idx) => (
                            <div key={`${receipt.id}-${idx}`} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white border border-white/5 group-hover:scale-105 transition-transform">
                                        {receipt.ticker.substring(0,4)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                            {receipt.ticker}
                                            <span className="text-[9px] font-normal text-slate-500 border border-white/10 px-1.5 rounded bg-slate-900">{receipt.type.substring(0,3)}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Pgto: {formatDate(receipt.paymentDate)}</span>
                                            <span className="opacity-50">|</span>
                                            <span>Com: {formatDate(receipt.dateCom)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-400">R$ {formatCurrency(receipt.totalReceived)}</div>
                                    <div className="text-[10px] text-slate-500 font-medium tabular-nums">{receipt.quantityOwned} un x R$ {receipt.rate.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}

                        {/* VIEW: RANKING */}
                        {proventosTab === 'ranking' && dividendRanking.map((item, idx) => {
                            const percent = (item.total / totalDividends) * 100;
                            return (
                                <div key={item.ticker} className="space-y-1 mb-2">
                                    <div className="flex justify-between items-end px-1">
                                        <div className="flex items-center gap-2">
                                            {idx === 0 && <Crown className="w-3 h-3 text-amber-400" />}
                                            <span className="text-xs font-bold text-white">{idx + 1}. {item.ticker}</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400">R$ {formatCurrency(item.total)}</span>
                                    </div>
                                    <div className="h-8 w-full bg-secondary/30 rounded-lg relative overflow-hidden border border-white/5">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600/40 to-emerald-500/40 border-r border-emerald-500/50 transition-all duration-700"
                                            style={{ width: `${percent}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-end px-3">
                                            <span className="text-[10px] font-bold text-slate-400">{percent.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </>
                )}
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