
import React, { useMemo, useState } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Wallet, TrendingUp, TrendingDown, Coins, Building2, ArrowUpCircle, ChevronRight, RefreshCw, CircleDollarSign, PieChart as PieIcon, Scale, Info, ExternalLink, X, Calendar, Trophy, ReceiptText, BarChart3, Calculator } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SwipeableModal } from '../components/Layout';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  realizedGain?: number;
  onAiSync?: () => void;
  isAiLoading?: boolean;
  sources?: { web: { uri: string; title: string } }[];
  portfolioStartDate?: string;
}

export const Home: React.FC<HomeProps> = ({ portfolio, dividendReceipts, realizedGain = 0, onAiSync, isAiLoading, sources = [], portfolioStartDate }) => {
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [proventosTab, setProventosTab] = useState<'statement' | 'ranking'>('statement');
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'asset' | 'type'>('asset');
  const [showInflationModal, setShowInflationModal] = useState(false);

  const totalInvested = useMemo(() => portfolio.reduce((acc, curr) => acc + (curr.averagePrice * curr.quantity), 0), [portfolio]);
  const currentBalance = useMemo(() => portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0), [portfolio]);
  const totalDividends = useMemo(() => dividendReceipts.reduce((acc, curr) => acc + curr.totalReceived, 0), [dividendReceipts]);
  const monthlyAverage = useMemo(() => totalDividends > 0 ? totalDividends / 12 : 0, [totalDividends]);
  const totalReturnVal = (currentBalance - totalInvested) + realizedGain + totalDividends;
  const totalReturnPercent = totalInvested > 0 ? (totalReturnVal / totalInvested) * 100 : 0;
  const yieldOnCost = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

  const IPCA_12M = 4.62; 
  const { benchmarkInflation, inflationLabel } = useMemo(() => {
    if (!portfolioStartDate) return { benchmarkInflation: IPCA_12M, inflationLabel: "12 Meses" };
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(portfolioStartDate).getTime()) / 86400000);
    if (diffDays < 365 && diffDays > 0) return { benchmarkInflation: (IPCA_12M / 365) * diffDays, inflationLabel: "Período" };
    return { benchmarkInflation: IPCA_12M, inflationLabel: "12 Meses" };
  }, [portfolioStartDate]);

  const realYield = yieldOnCost - benchmarkInflation;
  const isPositiveReal = realYield > 0;

  const dataByAsset = useMemo(() => {
    return portfolio.map(p => ({
        name: p.ticker,
        value: (p.currentPrice || p.averagePrice) * p.quantity,
        segment: p.segment || "Outros"
    })).sort((a,b) => b.value - a.value);
  }, [portfolio]);

  const dataBySegment = useMemo(() => {
    const map: Record<string, number> = {};
    portfolio.forEach(p => {
        const seg = p.segment || "Outros";
        map[seg] = (map[seg] || 0) + ((p.currentPrice || p.averagePrice) * p.quantity);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
  }, [portfolio]);

  const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#34d399', '#fbbf24', '#60a5fa'];
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-32 pt-2 px-5 space-y-5">
      <div className="bg-gradient-to-br from-[#1e293b] to-[#020617] p-6 rounded-[2.5rem] border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl"></div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Patrimônio</span>
          {isAiLoading && <RefreshCw className="w-3 h-3 text-accent animate-spin" />}
        </div>
        <div className="text-4xl font-black text-white mb-2">R$ {formatCurrency(currentBalance)}</div>
        <div className={`text-xs font-bold ${totalReturnVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalReturnVal >= 0 ? '+' : ''}R$ {formatCurrency(totalReturnVal)} ({totalReturnPercent.toFixed(2)}%)
        </div>
      </div>

      <div onClick={() => setShowProventosModal(true)} className="bg-slate-900 p-6 rounded-[2rem] border border-emerald-500/10 cursor-pointer active:scale-95 transition-all">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Rendimentos Acumulados</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-black text-white mb-1">R$ {formatCurrency(totalDividends)}</div>
        <p className="text-[10px] text-slate-500">Média mensal de R$ {formatCurrency(monthlyAverage)}</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
          <div onClick={() => setShowAllocationModal(true)} className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 cursor-pointer min-h-[14rem] flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Alocação por Setor</span>
              {/* Fix: Adicionado style com minHeight para garantir que o Recharts tenha dimensões para calcular */}
              <div className="h-32 w-full" style={{ minHeight: '128px' }}>
                  {dataBySegment.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={dataBySegment} innerRadius={35} outerRadius={50} dataKey="value" stroke="none">
                                {dataBySegment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      Sem dados
                    </div>
                  )}
              </div>
              <div className="space-y-1">
                  {dataBySegment.length > 0 ? dataBySegment.slice(0, 2).map((s, i) => (
                      <div key={i} className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400 truncate max-w-[70%]">{s.name}</span>
                          <span className="text-white">{currentBalance > 0 ? ((s.value / currentBalance)*100).toFixed(0) : 0}%</span>
                      </div>
                  )) : (
                    <div className="text-[10px] text-slate-700 text-center">Adicione ativos para ver o gráfico</div>
                  )}
              </div>
          </div>

          <div onClick={() => setShowInflationModal(true)} className={`p-6 rounded-[2rem] border border-white/5 cursor-pointer min-h-[14rem] flex flex-col justify-between ${isPositiveReal ? 'bg-emerald-950/20' : 'bg-rose-950/20'}`}>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Renda x Inflação ({inflationLabel})</span>
              <div>
                  <div className={`text-4xl font-black ${isPositiveReal ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositiveReal ? '+' : ''}{realYield.toFixed(2)}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Ganho Real sobre custo</p>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="bg-rose-500 h-full" style={{ width: `${Math.min((benchmarkInflation / (Math.max(yieldOnCost, 0.1))) * 100, 100)}%` }}></div>
                  <div className="bg-emerald-500 h-full flex-1"></div>
              </div>
          </div>
      </div>

      {sources && sources.length > 0 && (
        <div className="mt-4 p-6 bg-slate-900/50 rounded-[2rem] border border-white/5">
          <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" /> Fontes de Dados (IA)
          </h4>
          <div className="space-y-2">
            {sources.map((source, i) => (
              <a 
                key={i} 
                href={source.web.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/5 transition-colors group"
              >
                <span className="text-[10px] text-slate-400 font-bold truncate pr-4">{source.web.title}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-accent transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
        <div className="p-6 space-y-6">
            <h3 className="text-xl font-black text-white">Extrato de Proventos</h3>
            <div className="space-y-3">
                {dividendReceipts.length === 0 ? <p className="text-center py-10 opacity-40 text-xs">Nenhum provento encontrado pela IA.</p> : 
                dividendReceipts.slice(0, 10).map(r => (
                    <div key={r.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                            <div className="text-sm font-black text-white">{r.ticker}</div>
                            <div className="text-[10px] text-slate-500">{r.paymentDate.split('-').reverse().join('/')}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-black text-emerald-400">R$ {formatCurrency(r.totalReceived)}</div>
                            <div className="text-[8px] text-slate-600 uppercase font-bold">{r.quantityOwned} cotas</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
        <div className="p-6 space-y-6">
            <h3 className="text-xl font-black text-white">Detalhes da Carteira</h3>
            <div className="bg-white/5 p-1.5 rounded-2xl grid grid-cols-2">
                <button onClick={()=>setAllocationTab('asset')} className={`py-3 rounded-xl text-[10px] font-black uppercase ${allocationTab==='asset'?'bg-accent text-primary':'text-slate-500'}`}>Ativos</button>
                <button onClick={()=>setAllocationTab('type')} className={`py-3 rounded-xl text-[10px] font-black uppercase ${allocationTab==='type'?'bg-accent text-primary':'text-slate-500'}`}>Setores</button>
            </div>
            <div className="space-y-3">
                {(allocationTab==='asset' ? dataByAsset : dataBySegment).map((item, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-2xl flex justify-between">
                        <span className="text-sm font-bold text-slate-300">{item.name}</span>
                        <span className="text-sm font-black text-white">R$ {formatCurrency(item.value)}</span>
                    </div>
                ))}
            </div>
        </div>
      </SwipeableModal>
    </div>
  );
};
