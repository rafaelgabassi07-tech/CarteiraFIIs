import React, { useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Wallet, TrendingUp, DollarSign, Crown, PieChart as PieIcon, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
}

export const Home: React.FC<HomeProps> = ({ portfolio }) => {
  // Calculate totals
  const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0);
  const currentBalance = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  const profitability = totalInvested > 0 ? ((currentBalance - totalInvested) / totalInvested) * 100 : 0;
  
  // Dividends Logic
  const totalDividends = portfolio.reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

  // Dividends Breakdown
  const dividendsByFII = portfolio
    .filter(p => p.assetType === AssetType.FII)
    .reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  
  const dividendsByStock = portfolio
    .filter(p => p.assetType === AssetType.STOCK)
    .reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);

  const topPayer = useMemo(() => {
    if (portfolio.length === 0) return null;
    return portfolio.reduce((prev, current) => 
        (prev.totalDividends || 0) > (current.totalDividends || 0) ? prev : current
    );
  }, [portfolio]);

  const topPayerValue = topPayer?.totalDividends || 0;
  const isDividendsEmpty = totalDividends === 0;

  // Data for chart
  const data = portfolio
    .map(p => ({
      name: p.ticker,
      value: (p.currentPrice || p.averagePrice) * p.quantity
    }))
    .filter(p => p.value > 0) // Filtra ativos que possam estar com valor 0 (ex: vendidos mas com histórico de dividendos)
    .sort((a, b) => b.value - a.value);
  
  const COLORS = ['#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#94a3b8', '#64748b'];

  return (
    <div className="pb-28 pt-6 px-5 space-y-6 max-w-lg mx-auto">
      
      {/* Summary Card */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 rounded-3xl shadow-2xl shadow-black/30 border border-white/10 group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/15 transition-all duration-700"></div>
            
            <div className="flex justify-between items-start mb-2 relative z-10">
                <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                    Patrimônio Total
                </h2>
            </div>
            
            <div className="text-4xl font-bold text-white mb-8 tabular-nums tracking-tight relative z-10">
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
                        <Wallet className="w-3.5 h-3.5" /> Custo
                    </div>
                    <div className="text-sm font-semibold text-slate-200 tabular-nums">
                        R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
                        <TrendingUp className="w-3.5 h-3.5" /> Rentabilidade
                    </div>
                    <div className={`text-sm font-bold tabular-nums ${profitability >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profitability > 0 ? '+' : ''}{profitability.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Advanced Dividends Card */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/10 rounded-3xl overflow-hidden relative shadow-lg shadow-black/20 group hover:border-emerald-500/20 transition-all duration-500">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700"></div>

            <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl text-emerald-400 shadow-inner ring-1 ring-emerald-500/10">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none tracking-tight">Proventos</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide opacity-80">Total Acumulado</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 shadow-sm">
                            <ArrowUpRight className="w-3 h-3" />
                            {yieldOnCost.toFixed(2)}% <span className="text-[9px] opacity-70 ml-0.5 font-normal">YoC</span>
                        </div>
                    </div>
                </div>

                <div className="text-3xl font-bold text-white mb-6 tabular-nums tracking-tight">
                R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>

                {/* Breakdown Bars */}
                {!isDividendsEmpty && (
                    <div className="space-y-4">
                        {/* FIIs Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-300">Fundos Imobiliários</span>
                                <span className="text-slate-200">R$ {dividendsByFII.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-950/50 rounded-full overflow-hidden ring-1 ring-white/5">
                                <div 
                                    className="h-full bg-accent shadow-[0_0_10px_rgba(56,189,248,0.4)] transition-all duration-1000 ease-out rounded-full" 
                                    style={{ width: `${totalDividends > 0 ? (dividendsByFII / totalDividends) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Stocks Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-slate-300">Ações</span>
                                <span className="text-slate-200">R$ {dividendsByStock.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-950/50 rounded-full overflow-hidden ring-1 ring-white/5">
                                <div 
                                    className="h-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.4)] transition-all duration-1000 ease-out rounded-full" 
                                    style={{ width: `${totalDividends > 0 ? (dividendsByStock / totalDividends) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Payer */}
                {!isDividendsEmpty && topPayer && topPayerValue > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400 animate-bounce-subtle" />
                            <span className="text-xs text-slate-400 font-medium">Maior Pagador</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 pr-3 pl-1.5 py-1 rounded-full border border-white/5">
                            <span className="text-[10px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded-full">{topPayer.ticker}</span>
                            <span className="text-xs font-bold text-emerald-400">R$ {topPayerValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                )}
                
                {isDividendsEmpty && (
                    <div className="text-center py-2 text-xs text-slate-500 italic">
                        Nenhum provento registrado ainda.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Allocation Chart */}
      {portfolio.length > 0 ? (
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-secondary/30 rounded-3xl shadow-xl border border-white/5 p-6 backdrop-blur-md">
                <h3 className="text-white font-semibold mb-6 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-slate-400" />
                    <span>Alocação</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 tracking-wide">POR ATIVO</span>
                </h3>
                
                <div className="flex flex-col items-center">
                <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={75}
                                outerRadius={95}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={8}
                            >
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                        stroke="none"
                                        className="outline-none hover:opacity-80 transition-opacity duration-300 cursor-pointer"
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Valor']}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                    borderColor: 'rgba(255,255,255,0.1)', 
                                    borderRadius: '1rem',
                                    color: '#fff',
                                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                                    fontSize: '12px',
                                    padding: '12px 16px',
                                    backdropFilter: 'blur(10px)'
                                }}
                                itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                                separator=": "
                                cursor={false}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest opacity-60">Total</span>
                    </div>
                </div>

                {/* Custom Legend */}
                <div className="w-full mt-8 space-y-3">
                    {data.map((entry, index) => {
                    const percentage = (entry.value / currentBalance) * 100;
                    return (
                        <div key={entry.name} className="flex items-center justify-between text-sm group hover:bg-white/5 p-2.5 rounded-xl transition-all border border-transparent hover:border-white/5 -mx-2.5">
                        <div className="flex items-center gap-3">
                            <div 
                            className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] ring-2 ring-transparent transition-all" 
                            style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-300 font-medium">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500 text-xs tabular-nums font-medium">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-white font-bold w-12 text-right tabular-nums">{percentage.toFixed(1)}%</span>
                        </div>
                        </div>
                    );
                    })}
                </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-secondary/30 p-10 rounded-3xl border border-dashed border-white/10 text-center animate-pulse-slow">
          <p className="text-slate-400 text-sm font-medium">Adicione transações para visualizar gráficos.</p>
        </div>
      )}
    </div>
  );
};