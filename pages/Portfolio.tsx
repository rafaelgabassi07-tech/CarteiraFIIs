
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, Calendar, ArrowUp, ArrowDown, PieChart, Target, ChevronDown, ChevronUp, Layers, BadgeDollarSign, Landmark, ScrollText, ChartBar, Tag, Calculator, Hash, Wallet, Users, BarChart3, BookOpen, Activity, Percent, Newspaper, ExternalLink, Zap } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[], totalPortfolioValue: number }> = ({ asset, index, history, totalPortfolioValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
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
        className={`bg-white dark:bg-[#0f172a] rounded-[2.5rem] border transition-all duration-300 animate-fade-in-up active:scale-[0.98] overflow-hidden cursor-pointer group ${isExpanded ? 'border-accent/30 shadow-lg ring-1 ring-accent/5' : 'border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md'}`}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
             <div className="flex items-center gap-4">
                {/* Logo ou Monograma */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border shadow-sm ${asset.assetType === AssetType.FII ? 'bg-orange-500/5 border-orange-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-10 h-10 object-contain" onError={(e) => { (e.target as any).style.display='none'; }} />
                    ) : (
                        <span className={`text-sm font-bold uppercase ${asset.assetType === AssetType.FII ? 'text-orange-600' : 'text-blue-600'}`}>
                            {asset.ticker.substring(0, 4)}
                        </span>
                    )}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">{asset.ticker}</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{asset.quantity} Cotas</p>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{portfolioShare.toFixed(1)}%</p>
                  </div>
                </div>
             </div>
             <div className="text-right">
                <div className="font-bold text-lg text-slate-900 dark:text-white tabular-nums tracking-tight mb-1">R$ {formatCurrency(totalValue)}</div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold tabular-nums ${isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                   {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                   {Math.abs(gainPercent).toFixed(2)}%
                </div>
             </div>
          </div>

          {/* Barra de Progresso Discreta (Peso) */}
          <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-2">
              <div className={`h-full transition-all duration-1000 ${asset.assetType === AssetType.FII ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${portfolioShare}%` }}></div>
          </div>

          {isExpanded && (
            <div className="pt-6 mt-2 border-t border-slate-100 dark:border-white/5 animate-fade-in space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-3xl">
                        <p className="text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest flex items-center gap-1.5">
                            <Target className="w-3 h-3" /> Preço Médio
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">R$ {formatCurrency(asset.averagePrice)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-3xl">
                        <p className="text-[9px] text-slate-400 uppercase font-bold mb-1 tracking-widest flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" /> Valor Atual
                        </p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">R$ {formatCurrency(currentPrice)}</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#0b1121] rounded-3xl border border-slate-100 dark:border-white/5">
                       <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0"><BadgeDollarSign className="w-4 h-4" /></div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Yield On Cost</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{yoc.toFixed(2)}%</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#0b1121] rounded-3xl border border-slate-100 dark:border-white/5">
                       <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0"><Landmark className="w-4 h-4" /></div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dividendos</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">R$ {formatCurrency(asset.totalDividends || 0)}</p>
                       </div>
                    </div>
                 </div>

                 {/* Botões de Ação Duplos */}
                 <div className="flex gap-3 pt-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }} 
                        className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
                     >
                        <ScrollText className="w-4 h-4" /> Extrato
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }} 
                        className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                     >
                        <ChartBar className="w-4 h-4" /> Análise
                     </button>
                 </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Extrato */}
      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 py-4">
             <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-lg font-bold border shadow-sm overflow-hidden ${asset.assetType === AssetType.FII ? 'bg-orange-500/5 border-orange-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                    {asset.logoUrl ? (
                         <img src={asset.logoUrl} alt={asset.ticker} className="w-10 h-10 object-contain" />
                    ) : (
                         <span className={`font-bold uppercase ${asset.assetType === AssetType.FII ? 'text-orange-600' : 'text-blue-600'}`}>{asset.ticker.slice(0, 4)}</span>
                    )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">{asset.ticker}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md w-fit">
                     {asset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'} • {asset.segment || 'Geral'}
                  </p>
                </div>
            </div>
            
            <div className="space-y-3 pb-10">
                  {history.length > 0 ? history.map((h, i) => (
                      <div key={h.id} className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/5 flex justify-between items-center animate-fade-in-up hover:bg-slate-50 dark:hover:bg-white/10 transition-colors" style={{ animationDelay: `${i * 30}ms` }}>
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                 <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{h.paymentDate.split('-').reverse().slice(0,2).join('/')}</p>
                                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md uppercase tracking-wide">{h.type}</span>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-bold text-emerald-500 tabular-nums">R$ {formatCurrency(h.totalReceived)}</p>
                              <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5 tracking-wide">UN: R$ {h.rate.toFixed(4)}</p>
                          </div>
                      </div>
                  )) : (
                      <div className="text-center py-16 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                         <div className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Layers className="w-7 h-7 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                         </div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sem proventos registrados</p>
                      </div>
                  )}
            </div>
        </div>
      </SwipeableModal>

      {/* Modal de Detalhes Técnicos Fundamentalistas + Notícias */}
      <SwipeableModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
         <div className="px-6 py-4 pb-12">
             {/* Header Modal */}
             <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold border shadow-sm ${asset.assetType === AssetType.FII ? 'bg-orange-500/10 border-orange-500/20 text-orange-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-600'}`}>
                        {asset.assetType === AssetType.FII ? <Building2 className="w-7 h-7" /> : <TrendingUp className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{asset.ticker}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">R$ {formatCurrency(currentPrice)}</p>
                    </div>
                 </div>
                 <div className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide border ${isPositive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                     {isPositive ? 'Lucro' : 'Prejuízo'}
                 </div>
             </div>

             {/* Lucro/Prejuízo da Posição */}
             <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] text-center border border-slate-100 dark:border-white/5 mb-8 shadow-sm">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Resultado da Posição</p>
                 <div className={`text-4xl font-black tabular-nums tracking-tighter mb-2 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {isPositive ? '+' : ''}R$ {formatCurrency(gainValue)}
                 </div>
                 <div className="inline-block px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                     <span className={`text-xs font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {gainPercent.toFixed(2)}%
                     </span>
                 </div>
             </div>
             
             {/* Descrição e Sentimento do Mercado */}
             <div className="mb-8 animate-fade-in-up">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 mb-3 flex items-center gap-2">
                   <BookOpen className="w-3 h-3" /> Sobre o Ativo
                </h4>
                <div className="bg-white dark:bg-[#0b1121] p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                    {asset.description && (
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                            {asset.description}
                        </p>
                    )}
                    
                    {asset.sentiment && (
                       <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                           <div className="flex items-center gap-2 mb-2">
                               <Zap className={`w-3 h-3 ${asset.sentiment.includes('Otimista') ? 'text-emerald-500' : asset.sentiment.includes('Pessimista') ? 'text-rose-500' : 'text-amber-500'}`} fill="currentColor" />
                               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sentimento do Mercado</span>
                           </div>
                           <div className="flex gap-3 items-start">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide shrink-0 ${asset.sentiment.includes('Otimista') ? 'bg-emerald-100 text-emerald-700' : asset.sentiment.includes('Pessimista') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {asset.sentiment}
                              </span>
                              {asset.sentiment_reason && (
                                <p className="text-[11px] font-medium text-slate-500 leading-tight pt-0.5">{asset.sentiment_reason}</p>
                              )}
                           </div>
                       </div>
                    )}
                </div>
             </div>

             {/* Grid de Indicadores Fundamentalistas */}
             <div className="space-y-6 mb-8">
                 
                 {/* Valuation */}
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                       <BarChart3 className="w-3 h-3" /> Valuation
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-[#0b1121] p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">P/VP</span>
                            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                                {asset.p_vp ? asset.p_vp.toFixed(2) : '-'}
                            </div>
                        </div>
                        {asset.assetType === AssetType.STOCK && (
                            <div className="bg-white dark:bg-[#0b1121] p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">P/L</span>
                                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                                    {asset.p_l ? asset.p_l.toFixed(2) : '-'}
                                </div>
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Eficiência & Retorno */}
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                       <Percent className="w-3 h-3" /> Eficiência
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white dark:bg-[#0b1121] p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">DY (12M)</span>
                            <div className="text-lg font-bold text-emerald-500 tabular-nums">
                                {asset.dy_12m ? asset.dy_12m.toFixed(2) + '%' : '-'}
                            </div>
                         </div>
                         <div className="bg-white dark:bg-[#0b1121] p-4 rounded-3xl border border-slate-100 dark:border-white/5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Variação (12M)</span>
                            <div className={`text-lg font-bold tabular-nums ${gainPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {gainPercent.toFixed(2)}% <span className="text-[8px] text-slate-400">(Carteira)</span>
                            </div>
                         </div>
                    </div>
                 </div>

                 {/* Dados de Mercado */}
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                       <Activity className="w-3 h-3" /> Mercado
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white dark:bg-[#0b1121] p-4 rounded-3xl border border-slate-100 dark:border-white/5 col-span-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-3 h-3" /> Cotistas</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3 h-3" /> Liquidez Diária</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                    {asset.shareholders || '-'}
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                    {asset.liquidity || '-'}
                                </div>
                            </div>
                         </div>
                    </div>
                 </div>
             </div>

             {/* Seção de Notícias */}
             {asset.news && asset.news.length > 0 && (
                 <div className="space-y-3 mb-6 animate-fade-in-up">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                       <Newspaper className="w-3 h-3" /> Últimas Notícias
                    </h4>
                    <div className="space-y-2">
                        {asset.news.map((newsItem, idx) => (
                           <a 
                             key={idx} 
                             href={newsItem.url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="block bg-white dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98] transition-all group"
                           >
                              <div className="flex justify-between items-start gap-3">
                                  <div>
                                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug mb-1.5 line-clamp-2">{newsItem.title}</h5>
                                      <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400 uppercase tracking-wide">
                                         <span className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{newsItem.source}</span>
                                         <span>•</span>
                                         <span>{newsItem.date}</span>
                                      </div>
                                  </div>
                                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-accent transition-colors shrink-0" />
                              </div>
                           </a>
                        ))}
                    </div>
                 </div>
             )}
             
             {/* Footer Info */}
             <div className="text-center pt-4">
                 <p className="text-[9px] font-medium text-slate-400">Dados fornecidos por IA. Podem haver divergências.</p>
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
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-10 animate-fade-in">
      <div className="w-24 h-24 bg-white dark:bg-white/5 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/10 flex items-center justify-center mb-8">
        <Landmark className="w-10 h-10 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Onde estão seus ativos?</h3>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest max-w-[240px] leading-relaxed opacity-60">Adicione ordens de compra para começar a acompanhar sua evolução.</p>
    </div>
  );

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto space-y-8">
      
      {/* Hero: Aportes */}
      <div className="animate-fade-in-up">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 p-8 rounded-[3rem] border border-indigo-500/10 shadow-sm flex items-center justify-between group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
           <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-3xl bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30">
                < LandMarkIcon className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-indigo-500/70 tracking-[0.15em] mb-1">Total em Aportes</p>
                <h3 className="text-slate-900 dark:text-white font-bold text-2xl tracking-tighter tabular-nums">R$ {formatCurrency(monthlyContribution)}</h3>
              </div>
           </div>
           <div className="bg-white/40 dark:bg-white/5 p-3 rounded-2xl backdrop-blur-sm group-hover:bg-indigo-500 group-hover:text-white transition-all cursor-help">
              <TrendingUp className="w-5 h-5" />
           </div>
        </div>
      </div>

      {/* Grid de Ativos */}
      <div className="space-y-10">
        {fiis.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]"></span>
                    <h3 className="text-slate-900 dark:text-white text-[11px] font-bold uppercase tracking-[0.2em]">Fundos Imobiliários</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">{fiis.length} ativos</span>
            </div>
            <div className="space-y-4">
              {fiis.map((asset, i) => (
                <AssetCard key={asset.ticker} asset={asset} index={i} history={dividendReceipts.filter(r => r.ticker === asset.ticker)} totalPortfolioValue={totalPortfolioValue} />
              ))}
            </div>
          </div>
        )}

        {stocks.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]"></span>
                    <h3 className="text-slate-900 dark:text-white text-[11px] font-bold uppercase tracking-[0.2em]">Ações Brasileiras</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">{stocks.length} ativos</span>
            </div>
            <div className="space-y-4">
              {stocks.map((asset, i) => (
                <AssetCard key={asset.ticker} asset={asset} index={i + fiis.length} history={dividendReceipts.filter(r => r.ticker === asset.ticker)} totalPortfolioValue={totalPortfolioValue} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Ícone Auxiliar Local
const LandMarkIcon = (props: any) => (
    <svg 
        {...props}
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <line x1="3" y1="22" x2="21" y2="22"></line>
        <line x1="6" y1="18" x2="6" y2="11"></line>
        <line x1="10" y1="18" x2="10" y2="11"></line>
        <line x1="14" y1="18" x2="14" y2="11"></line>
        <line x1="18" y1="18" x2="18" y2="11"></line>
        <polygon points="12 2 20 7 4 7 12 2"></polygon>
    </svg>
);
