import React, { useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Wallet, TrendingUp, DollarSign, Crown, PieChart as PieIcon, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
}

export const Home: React.FC<HomeProps> = ({ portfolio }) => {
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

  const data = portfolio
    .map(p => ({
      name: p.ticker,
      value: (p.currentPrice || p.averagePrice) * p.quantity
    }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const COLORS = ['#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#94a3b8', '#64748b'];

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

      {/* Proventos - REFORÇADO */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/10 rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Proventos</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Total Recebido</p>
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
                  {topPayer && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-400" /> Destaque
                        </span>
                        <span className="text-xs font-bold text-white bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            {topPayer.ticker}: R$ {topPayer.totalDividends?.toFixed(2)}
                        </span>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-2">
                Aguardando dados da API ou novas transações...
              </p>
            )}
        </div>
      </div>

      {/* Alocação */}
      {portfolio.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-secondary/30 rounded-3xl border border-white/5 p-6 backdrop-blur-md">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2 text-sm">
                    <PieIcon className="w-4 h-4 text-slate-400" /> Alocação
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} innerRadius={75} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={8}>
                                {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                    {data.slice(0, 5).map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-slate-300">{entry.name}</span>
                            </div>
                            <span className="text-white font-bold">{((entry.value / currentBalance) * 100).toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};