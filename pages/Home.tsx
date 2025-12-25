import React from 'react';
import { AssetPosition } from '../types';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
}

export const Home: React.FC<HomeProps> = ({ portfolio }) => {
  // Calculate totals (Note: Logic duplicated from App.tsx visually, but used here for display)
  const totalInvested = portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0);
  const currentBalance = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  const profitability = totalInvested > 0 ? ((currentBalance - totalInvested) / totalInvested) * 100 : 0;
  const totalDividends = portfolio.reduce((acc, curr) => acc + (curr.totalDividends || 0), 0);
  
  // Data for chart
  const data = portfolio
    .map(p => ({
      name: p.ticker,
      value: (p.currentPrice || p.averagePrice) * p.quantity
    }))
    .sort((a, b) => b.value - a.value);
  
  const COLORS = ['#38bdf8', '#22c55e', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#94a3b8', '#64748b'];

  return (
    <div className="pb-28 pt-6 px-5 space-y-6 max-w-lg mx-auto animate-fade-in">
      
      {/* Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-2xl shadow-black/20 border border-white/5 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-accent/10 transition-colors duration-700"></div>
        
        <div className="flex justify-between items-start mb-2">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Patrimônio Total</h2>
        </div>
        
        <div className="text-4xl font-bold text-white mb-6 tabular-nums tracking-tight">
          R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Wallet className="w-3.5 h-3.5" /> Custo
              </div>
              <div className="text-sm font-semibold text-slate-200 tabular-nums">
                R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
           </div>
           <div className="bg-slate-950/30 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> Rentabilidade
              </div>
              <div className={`text-sm font-bold tabular-nums ${profitability >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {profitability > 0 ? '+' : ''}{profitability.toFixed(2)}%
              </div>
           </div>
        </div>
      </div>

      {/* Dividends Card */}
      <div className="bg-secondary/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg hover:bg-secondary/70 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3.5 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Proventos</p>
            <h3 className="text-xl font-bold text-white mt-0.5 tabular-nums tracking-tight">
              R$ {totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Allocation Chart */}
      {portfolio.length > 0 ? (
        <div className="bg-secondary/30 rounded-2xl shadow-lg border border-white/5 p-6 backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-6 flex items-center justify-between text-sm">
              <span>Alocação</span>
              <span className="text-[10px] font-medium text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">Por Ativo</span>
            </h3>
            
            <div className="flex flex-col items-center">
              <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={data}
                              innerRadius={70}
                              outerRadius={95}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                              cornerRadius={6}
                          >
                              {data.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    stroke="none"
                                    className="outline-none hover:opacity-80 transition-opacity duration-300"
                                  />
                              ))}
                          </Pie>
                          <Tooltip 
                              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Valor']}
                              contentStyle={{ 
                                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                borderColor: 'rgba(255,255,255,0.1)', 
                                borderRadius: '0.75rem',
                                color: '#fff',
                                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
                                fontSize: '12px',
                                padding: '10px 14px'
                              }}
                              itemStyle={{ color: '#e2e8f0', fontWeight: 500 }}
                              separator=": "
                              cursor={false}
                          />
                      </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Total</span>
                  </div>
              </div>

              {/* Custom Legend */}
              <div className="w-full mt-6 space-y-3.5">
                {data.map((entry, index) => {
                  const percentage = (entry.value / currentBalance) * 100;
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-sm group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] ring-2 ring-transparent transition-all" 
                          style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-slate-300 font-medium">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 text-xs tabular-nums">R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="text-white font-bold w-12 text-right tabular-nums">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      ) : (
        <div className="bg-secondary/30 p-8 rounded-2xl border border-dashed border-white/10 text-center animate-pulse-slow">
          <p className="text-slate-400 text-sm font-medium">Adicione transações para visualizar gráficos.</p>
        </div>
      )}
    </div>
  );
};