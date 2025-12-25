import React from 'react';
import { AssetPosition } from '../types';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
}

export const Home: React.FC<HomeProps> = ({ portfolio }) => {
  // Calculate totals
  const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0);
  const currentBalance = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  const profitability = totalInvested > 0 ? ((currentBalance - totalInvested) / totalInvested) * 100 : 0;
  
  // Calculate Dividends (Placeholder logic based on types, assuming data might be populated later)
  const totalDividends = portfolio.reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  
  // Data for chart
  const data = portfolio.map(p => ({
    name: p.ticker,
    value: (p.currentPrice || p.averagePrice) * p.quantity
  }));
  
  const COLORS = ['#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];

  return (
    <div className="pb-24 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-secondary to-slate-800 p-6 rounded-2xl shadow-xl border border-white/5">
        <h2 className="text-gray-400 text-sm font-medium mb-1">Patrimônio Total</h2>
        <div className="text-3xl font-bold text-white mb-4">
          R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-black/20 p-3 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                <Wallet className="w-3 h-3" /> Custo
              </div>
              <div className="text-sm font-semibold text-gray-200">
                R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
           </div>
           <div className="bg-black/20 p-3 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                <TrendingUp className="w-3 h-3" /> Rentabilidade
              </div>
              <div className={`text-sm font-semibold ${profitability >= 0 ? 'text-success' : 'text-danger'}`}>
                {profitability > 0 ? '+' : ''}{profitability.toFixed(2)}%
              </div>
           </div>
        </div>
      </div>

      {/* Dividends Card */}
      <div className="bg-secondary p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Proventos Acumulados</p>
            <h3 className="text-xl font-bold text-white mt-0.5">
              R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Allocation Chart */}
      {portfolio.length > 0 ? (
        <div className="bg-secondary p-5 rounded-2xl shadow-lg border border-white/5">
            <h3 className="text-white font-semibold mb-4">Alocação por Ativo</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      ) : (
        <div className="bg-secondary p-8 rounded-2xl border border-white/5 text-center">
          <p className="text-gray-400 text-sm">Adicione transações para visualizar gráficos da sua carteira.</p>
        </div>
      )}
    </div>
  );
};