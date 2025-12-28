
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, Calendar, ArrowUp, ArrowDown, Target, DollarSign, Landmark, ScrollText, BarChart3, BookOpen, Activity, Percent, Newspaper, ExternalLink, Zap, Users, ChevronDown, Briefcase, ChevronUp, Layers, Hash, Info } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

const AssetCard: React.FC<{ asset: AssetPosition, index: number, history: DividendReceipt[], totalPortfolioValue: number }> = ({ asset, index, history, totalPortfolioValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded]); // Recalculate on expand in case content changes
  
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
  
  const statusInvestUrl = asset.assetType === AssetType.FII
    ? `https://statusinvest.com.br/fundos-imobiliarios/${asset.ticker}`
    : `https://statusinvest.com.br/acoes/${asset.ticker}`;

  return (
    <>
      <div 
        className={`relative bg-white dark:bg-[#0f172a] rounded-[2rem] transition-all duration-500 active:scale-[0.98] overflow-hidden cursor-pointer group border border-slate-200/50 dark:border-white/5 ${isExpanded ? 'shadow-2xl shadow-slate-200/50 dark:shadow-black/50 z-10 ring-1 ring-slate-200 dark:ring-white/10' : 'shadow-sm hover:shadow-md'}`}
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
                   {gainPercent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </div>
             </div>
          </div>

          {/* Área Expandida com `max-height` */}
          <div 
            className="overflow-hidden transition-[max-height,opacity,padding] duration-500 ease-out-quint"
            style={{ maxHeight: isExpanded ? `${contentHeight}px` : '0px', opacity: isExpanded ? 1 : 0, paddingTop: isExpanded ? '1.5rem' : '0' }}
          >
             <div ref={contentRef}>
                 <div className="flex gap-4 mb-6 relative">
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
                 <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 text-center border border-slate-100 dark:border-white/5">
                        <div className="flex justify-center mb-1 text-emerald-500"><Target className="w-4 h-4" /></div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Yield on Cost</p>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{yoc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p>
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
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">{portfolioShare.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95">Extrato</button>
                     <button onClick={(e) => { e.stopPropagation(); setShowDetailsModal(true); }} className="flex-1 py-3 bg-slate-900 dark:bg-white rounded-full text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-900/10 dark:shadow-white/10 flex items-center justify-center gap-2">Fundamentos</button>
                 </div>
             </div>
          </div>
          <div className="flex justify-center mt-1">
             <ChevronDown className={`w-3 h-3 text-slate-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 opacity-0' : 'opacity-100'}`} />
          </div>
        </div>
      </div>

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
                  <div key={i} className="group relative bg-white dark:bg-[#0f172a] p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 font-bold shrink-0">
                               <span className="text-[9px] uppercase leading-none mb-0.5">{h.paymentDate.split('-')[1]}</span>
                               <span className="text-xs leading-none text-slate-900 dark:text-white">{h.paymentDate.split('-')[2]}</span>
                           </div>
                           <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-0.5">{h.type} <span className="text-slate-300 dark:text-slate-600">•</span> {h.paymentDate.split('-')[0]}</p>
                               <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Pagamento Realizado</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Total Recebido</p>
                           <p className="text-base font-black text-emerald-600 dark:text-emerald-500 tabular-nums">R$ {formatCurrency(h.totalReceived)}</p>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-medium text-slate-500">
                        <span className="flex items-center gap-1.5"><Hash className="w-3 h-3 text-slate-300" />Posição: <strong className="text-slate-700 dark:text-slate-300">{h.quantityOwned} Cotas</strong></span>
                        <span className="flex items-center gap-1.5"><Target className="w-3 h-3 text-slate-300" />Valor Unitário: <strong className="text-slate-700 dark:text-slate-300">R$ {h.rate.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)}>
        <div className="px-6 py-2">
          <div className="flex items-center gap-4 mb-8 mt-2">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center overflow-hidden shrink-0 shadow-md bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5">
                  {asset.logoUrl ? (
                      <img src={asset.logoUrl} alt={asset.ticker} className="w-12 h-12 object-contain" onError={(e) => { (e.target as any).style.display='none'; }} />
                  ) : (
                      <span className="text-xl font-black tracking-tighter">{asset.ticker.substring(0, 4)}</span>
                  )}
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{asset.ticker}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.segment}</p>
              </div>
          </div>

          {asset.sentiment && asset.sentiment_reason && (
            <div className={`p-5 rounded-[2rem] mb-6 border ${
              asset.sentiment === 'Otimista' ? 'bg-emerald-50/80 dark:bg-emerald-500/5 border-emerald-500/10' :
              asset.sentiment === 'Pessimista' ? 'bg-rose-50/80 dark:bg-rose-500/5 border-rose-500/10' :
              'bg-slate-50 dark:bg-white/5 border-slate-200/50 dark:border-white/5'
            }`}>
                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      asset.sentiment === 'Otimista' ? 'bg-emerald-500/10 text-emerald-500' :
                      asset.sentiment === 'Pessimista' ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-200 dark:bg-white/10 text-slate-500'
                    }`}>
                        <Zap className="w-4 h-4" />
                    </div>
                    {/* FIX: Updated model name from Gemini 2.5 to just Gemini for generality. */}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Análise IA (Gemini)</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    <strong className={`${
                      asset.sentiment === 'Otimista' ? 'text-emerald-600 dark:text-emerald-500' :
                      asset.sentiment === 'Pessimista' ? 'text-rose-600 dark:text-rose-500' :
                      'text-slate-700 dark:text-slate-200'
                    }`}>{asset.sentiment}:</strong> {asset.sentiment_reason}
                </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl text-center border border-slate-100 dark:border-transparent">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">P/VP</p>
                  <p className="text-base font-black text-slate-800 dark:text-white tabular-nums">{asset.p_vp?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl text-center border border-slate-100 dark:border-transparent">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">DY (12M)</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-500 tabular-nums">{asset.dy_12m?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}%</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-3xl text-center border border-slate-100 dark:border-transparent">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">P/L</p>
                  <p className="text-base font-black text-slate-800 dark:text-white tabular-nums">{asset.p_l?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}</p>
              </div>
          </div>

          <div className="space-y-3 pb-8">
            <div className="flex justify-between items-center bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Liquidez Diária</span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{asset.liquidity || '-'}</span>
            </div>
            <div className="flex justify-between items-center bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{asset.assetType === AssetType.FII ? 'Cotistas' : 'Acionistas'}</span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{asset.shareholders || '-'}</span>
            </div>
            <div className="flex justify-between items-center bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Landmark className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Market Cap</span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{asset.market_cap || '-'}</span>
            </div>
          </div>
          
          {asset.description && (
            <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl mb-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><Info className="w-3 h-3" /> Sobre o Ativo</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {asset.description}
              </p>
            </div>
          )}

          <a href={statusInvestUrl} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors mt-4">
            <ExternalLink className="w-3 h-3" />
            Ver no Status Invest
          </a>
        </div>
      </SwipeableModal>
    </>
  );
};

export const Portfolio: React.FC<{ portfolio: AssetPosition[], dividendReceipts: DividendReceipt[] }> = ({ portfolio, dividendReceipts }) => {
  const totalValue = useMemo(() => portfolio.reduce((acc, p) => acc + ((p.currentPrice || p.averagePrice) * p.quantity), 0), [portfolio]);

  const { fiis, stocks } = useMemo(() => {
      const sorted = [...portfolio].sort((a,b) => ((b.currentPrice || b.averagePrice) * b.quantity) - ((a.currentPrice || a.averagePrice) * a.quantity));
      return {
          fiis: sorted.filter(p => p.assetType === AssetType.FII),
          stocks: sorted.filter(p => p.assetType === AssetType.STOCK)
      };
  }, [portfolio]);

  if (portfolio.length === 0) {
      return (
        <div className="pt-24 pb-28 px-5 max-w-lg mx-auto text-center py-20">
           <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6"><Briefcase className="w-8 h-8 text-slate-300" strokeWidth={1.5} /></div>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Carteira Vazia</h3>
           <p className="text-slate-400 text-xs max-w-[200px] mx-auto leading-relaxed">Adicione suas ordens na aba de transações para começar.</p>
        </div>
      );
  }

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto space-y-8">
      {fiis.length > 0 && (
          <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fundos Imobiliários</span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/5"></div>
                  <span className="text-[10px] font-bold text-slate-400">{fiis.length}</span>
              </div>
              {fiis.map((asset, index) => <AssetCard key={asset.ticker} asset={asset} index={index} history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))} totalPortfolioValue={totalValue} />)}
          </div>
      )}
      {stocks.length > 0 && (
          <div className="space-y-4" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-3 px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações</span>
                  <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/5"></div>
                  <span className="text-[10px] font-bold text-slate-400">{stocks.length}</span>
              </div>
              {stocks.map((asset, index) => <AssetCard key={asset.ticker} asset={asset} index={index} history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))} totalPortfolioValue={totalValue} />)}
          </div>
      )}
    </div>
  );
};
