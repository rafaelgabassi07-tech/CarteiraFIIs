
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, DollarSign, PieChart as PieIcon, Calendar, X, ArrowUpRight, ReceiptText, Trophy, Building2, Briefcase, FilterX, Info, ExternalLink, ArrowDownToLine, Timer, ArrowUpCircle, ChevronRight, RefreshCw } from 'lucide-react';
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

  const COLORS = ['#38bdf8', '#10b981', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#2dd4bf', '#818cf8'];
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-32 pt-6 px-5 space-y-6">
      
      {/* Patrimônio Principal */}
      <div className="animate-fade-in-up">
        <div className="relative overflow-hidden glass p-7 rounded-[2.5rem] shadow-2xl transition-all group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 blur-[80px] rounded-full group-hover:bg-accent/20 transition-all"></div>
            
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    Patrimônio Atual
                </h2>
                {isAiLoading && (
                  <div className="flex items-center gap-2 bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">
                    <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                    <span className="text-[8px] font-black text-accent uppercase tracking-widest">Sincronizando IA</span>
                  </div>
                )}
            </div>

            <div className="text-4xl font-black text-white mb-8 tracking-tighter tabular-nums">
              R$ {formatCurrency(currentBalance)}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mb-1 font-black uppercase tracking-widest">
                        <Wallet className="w-3.5 h-3.5" /> Total Investido
                    </div>
                    <div className="text-sm font-bold text-slate-200">R$ {formatCurrency(totalInvested)}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mb-1 font-black uppercase tracking-widest">
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Retorno Total
                    </div>
                    <div className={`text-sm font-bold flex items-center gap-1 ${totalReturnVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalReturnVal >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Renda Passiva Card */}
      <div 
        onClick={() => setShowProventosModal(true)}
        className="animate-fade-in-up tap-highlight"
        style={{ animationDelay: '100ms' }}
      >
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[2.5rem] p-7 shadow-xl group">
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
              className="glass rounded-[2.5rem] p-6 hover:bg-white/5 transition-all group tap-highlight"
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
                    <div className="h-28 w-28 shrink-0 relative">
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

      {/* Modais omitidos para brevidade, mantendo a estrutura refinada das props */}
    </div>
  );
};
