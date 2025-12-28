import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, Calendar, ArrowUp, ArrowDown, Target, DollarSign, Landmark, ScrollText, BarChart3, BookOpen, Activity, Percent, Newspaper, ExternalLink, Zap, Users, ChevronDown, Briefcase, ChevronUp, Layers, Hash, Info } from 'lucide-react';
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
        className={`relative bg-white dark:bg-[#0f172a] rounded-[2rem] transition-all duration-500 animate-fade-in-up active:scale-[0.99] overflow-hidden cursor-pointer group border border-slate-200/50 dark:border-white/5 ${isExpanded ? 'shadow-2xl shadow-slate-200/50 dark:shadow-black/50 z-10 ring-1 ring-slate-200 dark:ring-white/10' : 'shadow-sm hover:shadow-md'}`}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-5">
          {/* Header do Card (Sempre visível) */}
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-all duration-300 ${isExpanded ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 scale-110' : asset.assetType === AssetType.FII ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
                    {asset.logoUrl ? (
                        <img src={asset.logoUrl} alt={asset.ticker} className="w-8 h-8 object-contain" onError={(e) => { (e.target as any).style.display='none'; }} />
                    ) : (
                        <span className="text-xs font-black tracking-tighter">{asset.ticker.substring(0, 4)}</span>
                    )}
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-none mb-1">{asset.ticker}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{asset.quantity} Cotas</span>
                    {asset.segment && (
                        <>
                            <span className="w-0.5 h-3 bg-slate-200 dark:bg-white/10"></span>
                            <span className="truncate max-w-[100px]">{asset.segment}</span>
                        </>
                    )}
                  </div>
                </div>
             </div>
             
             <div className="text-right">
                <div className="font-black text-lg text-slate-900 dark:text-white tabular-nums tracking-tight">R$ {formatCurrency(totalValue)}</div>
                <div className={`flex items-center justify-end gap-1 text-[10px] font-bold tabular-nums mt-0.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {isPositive ? <ArrowUp className="w-3 h-3" strokeWidth={3} /> : <ArrowDown className="w-3 h-3" strokeWidth={3} />}
                   {gainPercent.toFixed(2)}%
                </div>
             </div>
          </div>

          {/* Área Expandida (Clean Design) */}
          <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100 pt-6' : 'grid-rows-[0fr] opacity-0 pt-0'}`}>
             <div className="min-h-0">
                 
                 {/* Linha 1: Comparativo Preço/Custo */}
                 <div className="flex gap-4 mb-6 relative">
                     {/* Linha vertical decorativa */}
                     <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-100 dark:bg-white/5 -ml-[0.5px]"></div>

                     <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Preço Médio</p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 tabular-nums">R$ {formatCurrency(asset.averagePrice)}</p>
                     </div>
                     <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Última Cotação</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">R$ {formatCurrency(currentPrice)}</p>
                     </div>
                 </div>

                 {/* Linha 2: Indicadores Chave (Cards Minimalistas) */}
                 <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-slate-100 dark:border-white/5">
                        <div className="flex justify-center mb-1 text-emerald-500"><Target className="w-4 h-4" /></div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Yield on Cost</p>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{yoc.toFixed(2)}%</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-slate-100 dark:border-white/5">
                        <div className="flex justify-center mb-1 text-blue-500"><Activity className="w-4 h-4" /></div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Rentabilidade</p>
                        <p className={`text-xs font-black tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                           {isPositive ? '+' : ''}{formatCurrency(gainValue)}
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-slate-100 dark:border-white/5">
                        <div className="flex justify-center mb-1 text-amber-500"><Percent className="w-4 h-4" /></div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Peso Carteira</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{portfolioShare.toFixed(1)}%</p>
                    </div>
                 </div>

                 {/* Botões de Ação (Estilo Pílula) */}
                 <div className="flex gap-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }} 
                        className="flex-1 py-3 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95"
                     >
                        Extrato
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }} 
                        className="flex-1 py-3 bg-slate-900 dark:bg-white rounded-full text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-900/10 dark:shadow-white/10 flex items-center justify-center gap-2"
                     >
                        Fundamentos
                     </button>
                 </div>
             </div>
          </div>
          
          {/* Indicador de expansão sutil */}
          <div className="flex justify-center mt-1">
             <ChevronDown className={`w-3 h-3 text-slate-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 opacity-0' : 'opacity-100'}`} />
          </div>
        </div>
      </div>

      {/* MODAL HISTÓRICO (PROVENTOS REAIS) */}
      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 py-2">
            <div className="flex items-center gap-3 mb-8 px-2 mt-2">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><ScrollText className="w-6 h-6" strokeWidth={2} /></div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">Extrato de Ganhos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.ticker}</p>
                </div>
            </div>

            <div className="space-y-4 pb-8">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <ScrollText className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-center text-slate-400 text-xs font-medium">Nenhum provento registrado.</p>
                </div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="group relative bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 animate-fade-in-up shadow-sm" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 font-bold shrink-0">
                               <span className="text-[9px] uppercase leading-none mb-0.5">{h.paymentDate.split('-')[1]}</span>
                               <span className="text-xs leading-none text-slate-900 dark:text-white">{h.paymentDate.split('-')[2]}</span>
                           </div>
                           <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-0.5">
                                   {h.type} <span className="text-slate-300 dark:text-slate-600">•</span> {h.paymentDate.split('-')[0]}
                               </p>
                               <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                   Pagamento Realizado
                               </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Total Recebido</p>
                           <p className="text-base font-black text-emerald-600 dark:text-emerald-500 tabular-nums">
                               R$ {formatCurrency(h.totalReceived)}
                           </p>
                        </div>
                    </div>
                    
                    {/* Detalhamento do cálculo */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Hash className="w-3 h-3 text-slate-300" />
                            Posição: <strong className="text-slate-700 dark:text-slate-300">{h.quantityOwned} Cotas</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Target className="w-3 h-3 text-slate-300" />
                            Valor Unitário: <strong className="text-slate-700 dark:text-slate-300">R$ {h.rate.toFixed(4)}</strong>
                        </span>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL FUNDAMENTOS (ESTILO DASHBOARD) */}
      <SwipeableModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
         <div className="px-5 py-2">
            <div className="flex items-center justify-between mb-8 px-2 mt-2">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${asset.assetType === AssetType.FII ? 'bg-orange-500 shadow-orange-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                        {asset.assetType === AssetType.FII ? <Building2 className="w-7 h-7" /> : <Briefcase className="w-7 h-7" />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">{asset.ticker}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded uppercase tracking-wide">
                                {asset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação / Empresa'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 pb-10">
                {/* DESCRIÇÃO / SOBRE */}
                {asset.description && (
                    <div className="bg-slate-50/50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2 opacity-50">
                            <Info className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Sobre o Ativo</span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300 text-justify">
                            {asset.description}
                        </p>
                    </div>
                )}

                {/* BLOCO 1: PERFIL */}
                <div>
                   <h4 className="px-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Perfil & Setor
                   </h4>
                   <div className="grid grid-cols-2 gap-3">
                       <div className="bg-white dark:bg-[#0f172a] p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                           <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segmento</span>
                           <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                               {asset.segment || 'Geral'}
                           </span>
                       </div>
                       <div className="bg-white dark:bg-[#0f172a] p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                           <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base de Cotistas</span>
                           <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                               {asset.shareholders || 'N/A'}
                           </span>
                       </div>
                   </div>
                </div>

                {/* BLOCO 2: VALUATION & PREÇO */}
                <div>
                    <h4 className="px-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Target className="w-3 h-3" /> Valuation
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.8rem] border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">P/VP</span>
                            <span className={`text-base font-black tabular-nums ${asset.p_vp && asset.p_vp < 1 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                {asset.p_vp?.toFixed(2) || '-'}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.8rem] border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">P/L</span>
                            <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                                {asset.p_l?.toFixed(1) || '-'}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.8rem] border border-slate-100 dark:border-white/5 text-center">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">DY 12m</span>
                            <span className="text-base font-black text-emerald-500 tabular-nums">
                                {asset.dy_12m ? asset.dy_12m.toFixed(1) + '%' : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BLOCO 3: LIQUIDEZ */}
                <div className="bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                    <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquidez Diária</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{asset.liquidity || 'Não Informado'}</span>
                    </div>
                    <Activity className="w-5 h-5 text-slate-300" />
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