
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, Calendar, ArrowUp, ArrowDown, PieChart, Target } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[], totalPortfolioValue: number }> = ({ asset, index, history, totalPortfolioValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  const gainPercent = asset.averagePrice > 0 ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 : 0;
  const gainValue = totalValue - totalCost;
  const isPositive = gainPercent >= 0;
  const portfolioShare = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

  const yoc = useMemo(() => {
    if (totalCost <= 0) return 0;
    return ((asset.totalDividends || 0) / totalCost) * 100;
  }, [asset.totalDividends, totalCost]);

  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div 
        className="bg-white dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-100 dark:border-white/5 overflow-hidden animate-fade-in-up active:scale-[0.98] transition-all duration-200"
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black border uppercase shadow-sm ${asset.assetType === AssetType.FII ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                    {asset.ticker.substring(0, 4)}
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white leading-none mb-1.5">{asset.ticker}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{asset.quantity} Cotas</p>
                </div>
             </div>
             <div className="text-right">
                <div className="font-black text-sm text-slate-900 dark:text-white tabular-nums tracking-tight">R$ {formatCurrency(totalValue)}</div>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-black uppercase ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                   {gainPercent.toFixed(2)}%
                </div>
             </div>
          </div>

          {isExpanded && (
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/5 animate-fade-in">
                 <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl text-center border border-slate-100 dark:border-white/5">
                        <p className="text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Preço Médio</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {formatCurrency(asset.averagePrice)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl text-center border border-slate-100 dark:border-white/5">
                        <p className="text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest">Preço Atual</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {formatCurrency(currentPrice)}</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#0b1121] rounded-2xl border border-slate-100 dark:border-white/5">
                       <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><TrendingUp className="w-4 h-4" /></div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">YOC</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{yoc.toFixed(2)}%</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#0b1121] rounded-2xl border border-slate-100 dark:border-white/5">
                       <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><PieChart className="w-4 h-4" /></div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Peso</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{portfolioShare.toFixed(1)}%</p>
                       </div>
                    </div>
                 </div>

                 <button onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }} className="w-full mt-4 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg">
                    Ver Histórico
                 </button>
            </div>
          )}
        </div>
      </div>

      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 py-4">
             <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-sm font-black border uppercase shadow-sm ${asset.assetType === AssetType.FII ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                    {asset.ticker.slice(0, 4)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{asset.ticker}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                     {asset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'} • {asset.segment || 'Geral'}
                  </p>
                </div>
            </div>
            
            <div className="space-y-3 pb-8">
                  {history.length > 0 ? history.map((h, i) => (
                      <div key={h.id} className="bg-white dark:bg-white/5 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5 flex justify-between items-center animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{h.paymentDate.split('-').reverse().slice(0,2).join('/')}</p>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md uppercase">{h.type}</span>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-black text-emerald-500 tabular-nums">R$ {formatCurrency(h.totalReceived)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Unit: R$ {h.rate.toFixed(4)}</p>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-12">
                         <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Target className="w-6 h-6 text-slate-300" />
                         </div>
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sem histórico recente</p>
                      </div>
                  )}
            </div>
        </div>
      </SwipeableModal>
    </>
  );
};

export const Portfolio: React.FC<{ portfolio: AssetPosition[], dividendReceipts: DividendReceipt[], monthlyContribution: number }> = ({ portfolio, dividendReceipts, monthlyContribution }) => {
  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalPortfolioValue = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  
  const fiis = portfolio.filter(p => p.assetType === AssetType.FII);
  const stocks = portfolio.filter(p => p.assetType === AssetType.STOCK);

  if (portfolio.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8 animate-fade-in">
      <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mb-6">
        <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Carteira Vazia</h3>
      <p className="text-slate-500 text-xs font-medium max-w-[200px] leading-relaxed">Adicione seus primeiros ativos na aba de Ordens para começar.</p>
    </div>
  );

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-6 rounded-[2.5rem] border border-indigo-500/10 flex items-center gap-5">
           <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <Calendar className="w-6 h-6" strokeWidth={2} />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Aportes do Mês</p>
             <h3 className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter">R$ {formatCurrency(monthlyContribution)}</h3>
           </div>
        </div>
      </div>

      {fiis.length > 0 && (
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-4 px-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-glow"></span>
            <h3 className="text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest">Fundos Imobiliários ({fiis.length})</h3>
          </div>
          <div className="space-y-4">
            {fiis.map((asset, i) => (
              <AssetCard key={asset.ticker} asset={asset} index={i} history={dividendReceipts.filter(r => r.ticker === asset.ticker)} totalPortfolioValue={totalPortfolioValue} />
            ))}
          </div>
        </div>
      )}

      {stocks.length > 0 && (
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-4 px-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-glow"></span>
            <h3 className="text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest">Ações ({stocks.length})</h3>
          </div>
          <div className="space-y-4">
            {stocks.map((asset, i) => (
              <AssetCard key={asset.ticker} asset={asset} index={i + fiis.length} history={dividendReceipts.filter(r => r.ticker === asset.ticker)} totalPortfolioValue={totalPortfolioValue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
