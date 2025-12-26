
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, ChevronDown, DollarSign, Target, ChevronRight, Briefcase, Calendar, PieChart, Scale, TrendingUp } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[] }> = ({ asset, index, history }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  
  const gainPercent = asset.averagePrice > 0 ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 : 0;
  
  // Cálculo de Yield on Cost (YoC)
  // (Total Proventos / Total Investido no Ativo) * 100
  const yoc = useMemo(() => {
    if (totalCost <= 0) return 0;
    return ((asset.totalDividends || 0) / totalCost) * 100;
  }, [asset.totalDividends, totalCost]);

  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div className={`transition-all duration-300 rounded-[1.8rem] border animate-fade-in-up ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/80 border-accent/20' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-white/[0.06] shadow-sm'}`} style={{ animationDelay: `${index * 50}ms` }}>
        <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-black text-slate-900 dark:text-white border border-slate-200 dark:border-white/5 uppercase">{asset.ticker.substring(0, 4)}</div>
            <div><h4 className="font-black text-slate-900 dark:text-white text-sm leading-none mb-1">{asset.ticker}</h4><div className="flex items-center gap-1.5"><span className="text-[10px] text-slate-500 font-bold">{asset.quantity} un</span><span className="text-[10px] text-slate-400 font-medium">PM R$ {formatCurrency(asset.averagePrice)}</span></div></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><div className="font-black text-slate-900 dark:text-white text-sm">R$ {formatCurrency(totalValue)}</div><div className={`text-[10px] font-bold ${gainPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%</div></div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-accent' : ''}`} />
          </div>
        </div>
        {isExpanded && (
          <div className="px-4 pb-4 animate-fade-in">
             <div className="h-px w-full bg-slate-200 dark:bg-white/10 mb-4"></div>
             <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-white/5"><div className="text-[9px] font-black text-slate-400 uppercase mb-1">Yield on Cost</div><div className="text-xs font-black text-emerald-500">{yoc.toFixed(2)}% retorno real</div></div>
                <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-white/5"><div className="text-[9px] font-black text-slate-400 uppercase mb-1">Renda Total</div><div className="text-xs font-black text-emerald-500">R$ {formatCurrency(asset.totalDividends || 0)}</div></div>
             </div>
             <button onClick={() => setShowHistoryModal(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase active:scale-95 transition-all">Histórico Completo <ChevronRight className="w-3 h-3" /></button>
          </div>
        )}
      </div>
      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 pt-2 pb-10 bg-white dark:bg-secondary-dark min-h-full">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent font-black text-xl border border-accent/20">{asset.ticker.slice(0, 4)}</div>
                <div><h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{asset.ticker}</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Histórico de Proventos</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-5 rounded-[2rem] bg-emerald-50 dark:bg-accent/5 border border-emerald-100 dark:border-accent/10">
                    <div className="text-[9px] font-black text-emerald-600 dark:text-accent uppercase tracking-[0.2em] mb-1">Acumulado</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">R$ {formatCurrency(asset.totalDividends || 0)}</div>
                </div>
                <div className="p-5 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                    <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">YoC Real</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">{yoc.toFixed(2)}%</div>
                </div>
            </div>
            <div className="space-y-3">
              {history.map(receipt => (
                <div key={receipt.id} className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-3xl border border-slate-200 dark:border-white/[0.04] flex justify-between items-center">
                  <div><div className="text-[10px] font-black text-slate-900 dark:text-white mb-1 uppercase tracking-wider">{receipt.paymentDate.split('-').reverse().join('/')}</div><p className="text-[9px] text-slate-500 font-bold uppercase">{receipt.type}</p></div>
                  <div className="text-right"><div className="text-sm font-black text-emerald-500">R$ {formatCurrency(receipt.totalReceived)}</div><p className="text-[8px] text-slate-400 font-bold">R$ {receipt.rate.toFixed(4)} p/un</p></div>
                </div>
              ))}
              {history.length === 0 && <div className="py-20 text-center opacity-30 font-black text-xs uppercase">Nenhum provento registrado</div>}
            </div>
        </div>
      </SwipeableModal>
    </>
  );
};

export const Portfolio: React.FC<{ portfolio: AssetPosition[], dividendReceipts: DividendReceipt[], monthlyContribution: number }> = ({ portfolio, dividendReceipts, monthlyContribution }) => {
  if (portfolio.length === 0) return <div className="flex flex-col items-center justify-center h-[70vh] text-center px-8"><Building2 className="w-12 h-12 text-slate-300 mb-4" /><h3 className="text-xl font-black text-slate-400">Custódia Vazia</h3></div>;
  
  const fiis = portfolio.filter(p => p.assetType === AssetType.FII);
  const stocks = portfolio.filter(p => p.assetType === AssetType.STOCK);
  
  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-32 pt-2 px-4 max-w-lg mx-auto">
      <div className="mb-6 animate-fade-in-up">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] font-black uppercase text-slate-400">Aportes do Mês</p><h3 className="text-slate-900 dark:text-white font-black text-base">R$ {formatCurrency(monthlyContribution)}</h3></div></div>
           <div className="text-right flex flex-col items-end">
             <div className="text-xs font-black text-slate-900 dark:text-white">{portfolio.length} ativos</div>
             <div className="text-[9px] font-bold text-slate-500 uppercase">Em custódia</div>
           </div>
        </div>
      </div>
      {fiis.length > 0 && <div className="mb-8"><div className="flex items-center gap-3 mb-4"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Fundos Imobiliários</h3><div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.05] ml-2" /></div><div className="space-y-3">{fiis.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i} history={dividendReceipts.filter(r => r.ticker === asset.ticker)} />)}</div></div>}
      {stocks.length > 0 && <div className="mb-8"><div className="flex items-center gap-3 mb-4"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Ações Brasileiras</h3><div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.05] ml-2" /></div><div className="space-y-3">{stocks.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i + fiis.length} history={dividendReceipts.filter(r => r.ticker === asset.ticker)} />)}</div></div>}
    </div>
  );
};
