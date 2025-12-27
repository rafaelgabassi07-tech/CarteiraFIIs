
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, ChevronDown, DollarSign, Target, ChevronRight, Briefcase, Calendar, PieChart, Scale, TrendingUp, History, Wallet } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[], totalPortfolioValue: number }> = ({ asset, index, history, totalPortfolioValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  
  const gainPercent = asset.averagePrice > 0 ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 : 0;
  
  // Porcentagem da carteira
  const portfolioShare = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

  const yoc = useMemo(() => {
    if (totalCost <= 0) return 0;
    return ((asset.totalDividends || 0) / totalCost) * 100;
  }, [asset.totalDividends, totalCost]);

  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div className={`relative transition-all duration-300 rounded-[2rem] border overflow-hidden animate-fade-in-up ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/80 border-accent/30 shadow-lg' : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`} style={{ animationDelay: `${index * 50}ms` }}>
        
        {/* Barra de Progresso de Alocação (Sutil no fundo) */}
        {!isExpanded && (
          <div 
            className="absolute bottom-0 left-0 top-0 bg-slate-100 dark:bg-white/[0.02] transition-all duration-1000 pointer-events-none" 
            style={{ width: `${portfolioShare}%` }} 
          />
        )}

        <div onClick={() => setIsExpanded(!isExpanded)} className="relative z-10 p-5 flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 uppercase shadow-sm">{asset.ticker.substring(0, 4)}</div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-base leading-none mb-1.5">{asset.ticker}</h4>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[9px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{asset.quantity} un</span>
                <span className="text-[10px] text-slate-400 font-medium">PM {formatCurrency(asset.averagePrice)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-black text-slate-900 dark:text-white text-base tabular-nums">R$ {formatCurrency(totalValue)}</div>
              <div className={`text-[10px] font-bold tabular-nums ${gainPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-400 transition-all duration-300 ${isExpanded ? 'bg-accent text-white rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-5 pb-5 animate-fade-in relative z-10">
             <div className="h-px w-full bg-slate-200 dark:bg-white/5 mb-5"></div>
             
             {/* Stats Grid */}
             <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Yield on Cost</span>
                  </div>
                  <div className="text-sm font-black text-emerald-500 tabular-nums">{yoc.toFixed(2)}%</div>
                </div>
                <div className="bg-white dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <PieChart className="w-3 h-3 text-accent" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Na Carteira</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{portfolioShare.toFixed(1)}%</div>
                </div>
             </div>

             <button onClick={() => setShowHistoryModal(true)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-slate-50 dark:hover:bg-white/10">
               Ver Histórico Completo <ChevronRight className="w-3 h-3" />
             </button>
          </div>
        )}
      </div>

      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="bg-slate-50 dark:bg-[#0b1121] min-h-full">
            
            {/* Header Sticky */}
            <div className="sticky top-0 bg-slate-50/80 dark:bg-[#0b1121]/80 backdrop-blur-xl p-6 z-20 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-[1.2rem] flex items-center justify-center text-slate-900 dark:text-white font-black text-sm border border-slate-200 dark:border-white/10 shadow-sm">{asset.ticker.slice(0, 4)}</div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{asset.ticker}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">Detalhes do Ativo</p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 space-y-8">
                {/* Performance Section */}
                <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Wallet className="w-3 h-3" /> Indicadores
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-20"><DollarSign className="w-8 h-8 text-emerald-500" /></div>
                            <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1">Total Recebido</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">R$ {formatCurrency(asset.totalDividends || 0)}</div>
                        </div>
                        <div className="p-5 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-20"><Scale className="w-8 h-8 text-indigo-500" /></div>
                            <div className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">YoC Real</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{yoc.toFixed(2)}%</div>
                        </div>
                    </div>
                </section>

                {/* History Section */}
                <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <History className="w-3 h-3" /> Extrato Detalhado
                    </h4>
                    <div className="space-y-3">
                      {history.length > 0 ? (
                          history.map(receipt => (
                            <div key={receipt.id} className="bg-white dark:bg-[#0f172a] p-5 rounded-[1.5rem] border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-8 rounded-full bg-emerald-500"></div>
                                <div>
                                  <div className="text-xs font-black text-slate-900 dark:text-white mb-0.5 uppercase tracking-wide">{receipt.paymentDate.split('-').reverse().slice(0,2).join('/')}</div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{receipt.type}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-emerald-500 tabular-nums">R$ {formatCurrency(receipt.totalReceived)}</div>
                                <p className="text-[9px] text-slate-400 font-medium tabular-nums">R$ {receipt.rate.toFixed(4)} p/un</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                          <Building2 className="w-8 h-8 mb-3 text-slate-300 stroke-1" />
                          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Sem histórico de proventos</span>
                        </div>
                      )}
                    </div>
                </section>
            </div>
        </div>
      </SwipeableModal>
    </>
  );
};

export const Portfolio: React.FC<{ portfolio: AssetPosition[], dividendReceipts: DividendReceipt[], monthlyContribution: number }> = ({ portfolio, dividendReceipts, monthlyContribution }) => {
  if (portfolio.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8 animate-fade-in">
      <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Carteira Vazia</h3>
      <p className="text-slate-500 text-sm max-w-[200px]">Adicione ativos na aba de Ordens para começar a acompanhar.</p>
    </div>
  );
  
  const totalPortfolioValue = portfolio.reduce((acc, curr) => acc + ((curr.currentPrice || curr.averagePrice) * curr.quantity), 0);
  const fiis = portfolio.filter(p => p.assetType === AssetType.FII);
  const stocks = portfolio.filter(p => p.assetType === AssetType.STOCK);
  
  const formatCurrency = (val: number) => (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="pb-32 pt-2 px-5 max-w-lg mx-auto">
      <div className="mb-8 animate-fade-in-up">
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
           <div className="absolute right-0 top-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
           <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 rounded-[1.2rem] bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
               <Calendar className="w-6 h-6" />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Aportes do Mês</p>
               <h3 className="text-slate-900 dark:text-white font-black text-xl tracking-tight">R$ {formatCurrency(monthlyContribution)}</h3>
             </div>
           </div>
        </div>
      </div>

      {fiis.length > 0 && (
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-5 pl-2">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Fundos Imobiliários</h3>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10 ml-2" />
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
          <div className="flex items-center gap-3 mb-5 pl-2">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Ações Brasileiras</h3>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10 ml-2" />
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
