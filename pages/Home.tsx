import React, { useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Wallet, TrendingUp, DollarSign, Crown, PieChart as PieIcon, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HomeProps {
  portfolio: AssetPosition[];
  aiAnalysis?: string | null;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
}

// Simple Markdown Formatter Component to avoid heavy dependencies if possible
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  
  // Split by double newlines for paragraphs
  const paragraphs = text.split('\n\n');

  return (
    <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
      {paragraphs.map((p, i) => {
        // Simple bold parser: **text**
        const parts = p.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const Home: React.FC<HomeProps> = ({ portfolio, aiAnalysis, isAnalyzing, onAnalyze }) => {
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

      {/* Advanced Dividends Card */}
      <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/10 rounded-2xl overflow-hidden relative shadow-lg">
         {/* Decoration */}
         <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

         <div className="p-5">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-none">Proventos</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Total Acumulado</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/10">
                        <ArrowUpRight className="w-3 h-3" />
                        {yieldOnCost.toFixed(2)}% <span className="text-[8px] opacity-70">YoC</span>
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
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-300">Fundos Imobiliários</span>
                            <span className="text-slate-200">R$ {dividendsByFII.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-accent transition-all duration-1000 ease-out" 
                                style={{ width: `${totalDividends > 0 ? (dividendsByFII / totalDividends) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Stocks Bar */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-300">Ações</span>
                            <span className="text-slate-200">R$ {dividendsByStock.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-400 transition-all duration-1000 ease-out" 
                                style={{ width: `${totalDividends > 0 ? (dividendsByStock / totalDividends) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Top Payer */}
            {!isDividendsEmpty && topPayer && topPayerValue > 0 && (
                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-slate-400 font-medium">Maior Pagador</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-white/5 px-2 py-0.5 rounded-md">{topPayer.ticker}</span>
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

      {/* AI Analysis Card */}
      {portfolio.length > 0 && onAnalyze && (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/30 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-lg">
           {/* Decoration */}
           <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none -ml-10 -mt-10"></div>
           
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                          <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="text-white font-bold text-lg leading-none">Consultor IA</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Gemini 2.5 Flash</p>
                      </div>
                  </div>
              </div>

              {!aiAnalysis && !isAnalyzing && (
                 <div className="text-center py-4">
                    <p className="text-slate-400 text-sm mb-4">Obtenha uma análise detalhada da saúde da sua carteira, diversificação e sugestões.</p>
                    <button 
                        onClick={onAnalyze}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
                    >
                        <Sparkles className="w-4 h-4" /> Gerar Análise
                    </button>
                 </div>
              )}

              {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-xs text-indigo-300 font-medium animate-pulse">Analisando seus investimentos...</p>
                  </div>
              )}

              {aiAnalysis && !isAnalyzing && (
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 animate-fade-in">
                      <MarkdownText text={aiAnalysis} />
                      <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                         <button 
                            onClick={onAnalyze}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors"
                         >
                            <Sparkles className="w-3 h-3" /> Atualizar Análise
                         </button>
                      </div>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* Allocation Chart */}
      {portfolio.length > 0 ? (
        <div className="bg-secondary/30 rounded-2xl shadow-lg border border-white/5 p-6 backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-6 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                 <PieIcon className="w-4 h-4 text-slate-400" />
                 <span>Alocação</span>
              </div>
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