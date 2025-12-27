
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, Calendar, ArrowUp, ArrowDown, Target, DollarSign, Landmark, ScrollText, BarChart3, BookOpen, Activity, Percent, Newspaper, ExternalLink, Zap, Users, ChevronDown, Briefcase } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[], totalPortfolioValue: number }> = ({ asset, index, history, totalPortfolioValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  const gainPercent = asset.averagePrice > 0 ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 : 0;
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
        className={`relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] transition-all duration-500 animate-fade-in-up active:scale-[0.99] overflow-hidden cursor-pointer group border border-slate-200/50 dark:border-white/5 ${isExpanded ? 'shadow-2xl shadow-slate-200/50 dark:shadow-black/50 z-10' : 'shadow-sm hover:shadow-md'}`}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                {/* Logo ou Monograma Ultra Clean */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-all duration-300 ${isExpanded ? 'scale-110' : ''} ${asset.assetType === AssetType.FII ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-8 h-8 object-contain" onError={(e) => { (e.target as any).style.display='none'; }} />
                    ) : (
                        <span className="text-xs font-black tracking-tighter">
                            {asset.ticker.substring(0, 4)}
                        </span>
                    )}
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white tracking-tight leading-none mb-1">{asset.ticker}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{asset.quantity} Cotas</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span>{portfolioShare.toFixed(1)}%</span>
                  </div>
                </div>
             </div>
             
             <div className="text-right">
                <div className="font-bold text-base text-slate-900 dark:text-white tabular-nums tracking-tight">R$ {formatCurrency(totalValue)}</div>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold tabular-nums mt-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {isPositive ? '+' : ''}{gainPercent.toFixed(2)}%
                </div>
             </div>
          </div>

          {/* Área Expandida com Design Clean */}
          <div className={`grid transition-all duration-500 ease-out overflow-hidden ${isExpanded ? 'grid-rows-[1fr] opacity-100 pt-6' : 'grid-rows-[0fr] opacity-0 pt-0'}`}>
             <div className="min-h-0 space-y-4">
                 
                 {/* Cards Internos de Métricas */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.5rem] flex flex-col justify-between h-24 relative overflow-hidden border border-slate-100 dark:border-white/5">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Target className="w-12 h-12 text-slate-900 dark:text-white" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Preço Médio</span>
                        <div className="text-xl font-bold text-slate-700 dark:text-slate-200 tabular-nums tracking-tight">
                            <span className="text-xs align-top opacity-60 mr-0.5">R$</span>{formatCurrency(asset.averagePrice)}
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.5rem] flex flex-col justify-between h-24 relative overflow-hidden border border-slate-100 dark:border-white/5">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <TrendingUp className="w-12 h-12 text-slate-900 dark:text-white" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Preço Atual</span>
                        <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                            <span className="text-xs align-top opacity-60 mr-0.5">R$</span>{formatCurrency(currentPrice)}
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                       <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0"><DollarSign className="w-4 h-4" strokeWidth={2.5} /></div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Yield on Cost</p>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{yoc.toFixed(2)}%</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                       <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0"><Landmark className="w-4 h-4" strokeWidth={2.5} /></div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Segmento</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-[80px]">{asset.segment}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-2 pt-1">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }} 
                        className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95 border border-slate-200 dark:border-white/5"
                     >
                        Ver Histórico
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }} 
                        className="flex-1 py-3.5 bg-slate-900 dark:bg-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-white dark:text-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-900/20 dark:shadow-white/10 flex items-center justify-center gap-2"
                     >
                        <BarChart3 className="w-3 h-3" /> Fundamentos
                     </button>
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* Modais Mantidos (Histórico e Detalhes) */}
      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 py-2">
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><ScrollText className="w-6 h-6" strokeWidth={2} /></div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Histórico</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.ticker}</p>
                </div>
            </div>
            <div className="space-y-3 pb-8">
              {history.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-10 font-medium">Nenhum provento registrado.</p>
              ) : (
                history.slice(0, 12).map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 rounded-3xl animate-fade-in-up border border-slate-100 dark:border-white/5" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0f172a] flex items-center justify-center text-slate-400 text-xs font-black shadow-sm">
                          {h.paymentDate.split('-')[1]}
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{h.type.substring(0,3)}</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{h.paymentDate.split('-').reverse().join('/')}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">R$ {formatCurrency(h.rate)}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Por Cota</p>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
         <div className="px-5 py-2">
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500"><BookOpen className="w-6 h-6" strokeWidth={2} /></div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Fundamentos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.ticker}</p>
                </div>
            </div>

            <div className="space-y-6 pb-10">
                {asset.description && (
                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                        <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 italic">
                            "{asset.description}"
                        </p>
                    </div>
                )}

                <div>
                    <h4 className="px-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Indicadores Chave</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">P/VP</span>
                            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{asset.p_vp?.toFixed(2) || '-'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dividend Yield</span>
                            <span className="text-lg font-black text-emerald-500 tabular-nums">{asset.dy_12m ? asset.dy_12m.toFixed(2) + '%' : '-'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">P/L</span>
                            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{asset.p_l?.toFixed(2) || '-'}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquidez</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{asset.liquidity || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </SwipeableModal>
    </>
  );
};

export const Portfolio: React.FC<{ portfolio: AssetPosition[], dividendReceipts: DividendReceipt[] }> = ({ portfolio, dividendReceipts }) => {
  const totalValue = useMemo(() => portfolio.reduce((acc, p) => acc + ((p.currentPrice || p.averagePrice) * p.quantity), 0), [portfolio]);

  const { fiis, stocks } = useMemo(() => {
      const sorted = [...portfolio].sort((a,b) => {
          const valA = (a.currentPrice || a.averagePrice) * a.quantity;
          const valB = (b.currentPrice || b.averagePrice) * b.quantity;
          return valB - valA;
      });

      return {
          fiis: sorted.filter(p => p.assetType === AssetType.FII),
          stocks: sorted.filter(p => p.assetType === AssetType.STOCK)
      };
  }, [portfolio]);

  if (portfolio.length === 0) {
      return (
        <div className="pt-24 pb-28 px-5 max-w-lg mx-auto text-center py-20 animate-fade-in">
           <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
           </div>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Carteira Vazia</h3>
           <p className="text-slate-400 text-xs max-w-[200px] mx-auto leading-relaxed">Adicione suas ordens na aba de transações para começar.</p>
        </div>
      );
  }

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto space-y-8">
      
      {/* Seção FIIs */}
      {fiis.length > 0 && (
          <div className="space-y-4 animate-fade-in-up">
              <div className="flex items-center gap-3 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fundos Imobiliários</span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/5"></div>
                  <span className="text-[10px] font-bold text-slate-400">{fiis.length}</span>
              </div>
              {fiis.map((asset, index) => (
                <AssetCard 
                    key={asset.ticker} 
                    asset={asset} 
                    index={index} 
                    history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))}
                    totalPortfolioValue={totalValue}
                />
              ))}
          </div>
      )}

      {/* Seção Ações */}
      {stocks.length > 0 && (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações</span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/5"></div>
                  <span className="text-[10px] font-bold text-slate-400">{stocks.length}</span>
              </div>
              {stocks.map((asset, index) => (
                <AssetCard 
                    key={asset.ticker} 
                    asset={asset} 
                    index={index} 
                    history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))}
                    totalPortfolioValue={totalValue}
                />
              ))}
          </div>
      )}
    </div>
  );
};
