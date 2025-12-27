
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, ChevronDown, DollarSign, Target, ChevronRight, Calendar, PieChart, Scale, TrendingUp, Wallet, ArrowUp, ArrowDown } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[], totalPortfolioValue: number }> = ({ asset, index, history, totalPortfolioValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  
  const gainPercent = asset.averagePrice > 0 
    ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 
    : 0;
  
  const gainValue = totalValue - totalCost;
  const portfolioShare = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

  const yoc = useMemo(() => {
    if (totalCost <= 0) return 0;
    return ((asset.totalDividends || 0) / totalCost) * 100;
  }, [asset.totalDividends, totalCost]);

  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isPositive = gainPercent >= 0;

  return (
    <>
      <div 
        className={`relative transition-all duration-300 rounded-[2.5rem] border overflow-hidden animate-fade-in-up group ${isExpanded ? 'bg-white dark:bg-[#0f172a] border-slate-300 dark:border-white/20 shadow-xl z-10' : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`} 
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div onClick={() => setIsExpanded(!isExpanded)} className="relative z-10 p-5 cursor-pointer">
          <div className="flex items-start justify-between mb-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-white/5 uppercase shadow-sm">
                    {asset.ticker.substring(0, 4)}
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white leading-none mb-1">{asset.ticker}</h4>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{asset.quantity} Cotas</span>
                     {asset.segment && (
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wide ${asset.assetType === AssetType.FII ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {asset.segment.split(' ')[0]}
                         </span>
                     )}
                  </div>
                </div>
             </div>
             <div className="text-right">
                <div className="font-black text-lg text-slate-900 dark:text-white tabular-nums tracking-tight">R$ {formatCurrency(totalValue)}</div>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-black uppercase tabular-nums ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                   {gainPercent.toFixed(2)}% (R$ {formatCurrency(gainValue)})
                </div>
             </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex-1 text-center border-r border-slate-200 dark:border-white/5 last:border-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Preço Médio</p>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums">R$ {formatCurrency(asset.averagePrice)}</p>
              </div>
              <div className="flex-1 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Preço Atual</p>
                  <p className={`text-xs font-black tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>R$ {formatCurrency(currentPrice)}</p>
              </div>
          </div>

          {isExpanded && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 animate-fade-in grid grid-cols-2 gap-3">
                 <div className="p-3 bg-white dark:bg-[#0b1121] rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Yield on Cost</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{yoc.toFixed(2)}%</p>
                 </div>
                 <div className="p-3 bg-white dark:bg-[#0b1121] rounded-2xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <PieChart className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Peso %</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{portfolioShare.toFixed(1)}%</p>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }} className="col-span-2 mt-2 w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    Ver Histórico Completo
                 </button>
            </div>
          )}
        </div>
      </div>

      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            <div className="sticky top-0 bg-slate-50/95 dark:bg-[#0b1121]/95 backdrop-blur-xl pt-8 pb-4 px-6 z-20 border-b border-transparent">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white font-black text-sm border border-slate-200 dark:border-white/10 shadow-sm">{asset.ticker.slice(0, 4)}</div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{asset.ticker}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                         {asset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'} • {asset.segment || 'Geral'}
                      </p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 pb-12">
                 <div className="relative pl-6 space-y-0">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-white/5"></div>
                      {history.length > 0 ? history.map((h, i) => (
                          <div key={h.id} className="relative py-4 group">
                              <div className="absolute left-[-6px] top-6 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-slate-50 dark:border-[#0b1121] z-10"></div>
                              <div className="bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400">{h.paymentDate.split('-').reverse().slice(0,2).join('/')}</span>
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">{h.type}</span>
                                  </div>
                                  <div className="flex justify-between items-end">
                                      <div>
                                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Valor Unit.</p>
                                          <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {h.rate.toFixed(4)}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-lg font-black text-emerald-500 tabular-nums">R$ {formatCurrency(h.totalReceived)}</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12">
                             <Target className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                             <p className="text-xs text-slate-400 font-bold uppercase">Sem histórico recente</p>
                          </div>
                      )}
                 </div>
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
      <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Carteira Vazia</h3>
      <p className="text-slate-500 text-sm max-w-[200px]">Adicione ativos na aba de Ordens para começar a acompanhar.</p>
    </div>
  );

  return (
    <div className="pb-32 pt-2 px-5 max-w-lg mx-auto">
      {/* Resumo de Aportes */}
      <div className="mb-8 animate-fade-in-up">
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-accent/10 transition-colors"></div>
           <div className="flex items-center gap-5 relative z-10">
             <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
               <Calendar className="w-6 h-6" />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Aportes do Mês</p>
               <h3 className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter">R$ {formatCurrency(monthlyContribution)}</h3>
             </div>
           </div>
        </div>
      </div>

      {fiis.length > 0 && (
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-5 px-2">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <h3 className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wider">Fundos Imobiliários</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{fiis.length}</span>
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
          <div className="flex items-center gap-3 mb-5 px-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <h3 className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wider">Ações Brasileiras</h3>
             <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{stocks.length}</span>
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
