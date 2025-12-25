
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt } from '../types';
import { Building2, TrendingUp, TrendingDown, Layers, ChevronDown, DollarSign, BarChart3, Target, X, ArrowUpRight, ChevronRight, ArrowDownToLine, Timer } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
}

const AssetCard: React.FC<{ 
  asset: AssetPosition, 
  index: number, 
  history: DividendReceipt[] 
}> = React.memo(({ asset, index, history }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const totalCost = asset.averagePrice * asset.quantity;
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  
  const gainPercent = asset.averagePrice > 0 ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 : 0;
  const gainValue = totalValue - totalCost;
  
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div 
          className={`bg-secondary/40 hover:bg-secondary/60 transition-all duration-300 rounded-3xl border border-white/5 mb-4 overflow-hidden backdrop-blur-md shadow-sm animate-fade-in-up ${isExpanded ? 'ring-1 ring-accent/30 bg-secondary/70 shadow-lg' : ''}`}
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 flex items-center justify-between cursor-pointer select-none group"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              {asset.logoUrl ? (
                <img src={asset.logoUrl} alt={asset.ticker} className="w-12 h-12 rounded-2xl bg-white object-contain p-1 shadow-md ring-1 ring-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-inner ring-1 ring-white/10">
                  {asset.ticker.substring(0, 2)}
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border border-primary text-[8px] font-bold ${asset.assetType === 'FII' ? 'bg-accent text-primary' : 'bg-purple-500 text-white'}`}>
                {asset.assetType === 'FII' ? 'F' : 'A'}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white text-base tracking-tight">{asset.ticker}</h4>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                {asset.quantity} un • PM R$ {formatCurrency(asset.averagePrice)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-bold text-white text-base tabular-nums tracking-tight">R$ {formatCurrency(totalValue)}</div>
              <div className={`text-[10px] font-bold flex items-center justify-end gap-1 mt-0.5 tabular-nums ${gainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </div>
            </div>
            <div className={`p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
               <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[550px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
          <div className="p-5 space-y-6 bg-black/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Resultado
                </span>
                <div className={`text-sm font-bold tabular-nums ${gainValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {gainValue >= 0 ? '+' : ''}{formatCurrency(gainValue)}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" /> Proventos Acum.
                </span>
                <div className="text-sm font-bold text-white tabular-nums">
                  R$ {formatCurrency(asset.totalDividends || 0)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                 <BarChart3 className="w-3.5 h-3.5 text-accent" />
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest">Resumo Financeiro</span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4">
                 <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">Custo Total</span>
                    <span className="text-xs text-slate-200 font-medium tabular-nums">
                      R$ {formatCurrency(totalCost)}
                    </span>
                 </div>
                 <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">YoC (Yield On Cost)</span>
                    <span className="text-xs text-slate-200 font-medium">
                      {totalCost > 0 ? (((asset.totalDividends || 0) / totalCost) * 100).toFixed(2) : '0.00'}%
                    </span>
                 </div>
              </div>
              
              <div 
                onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }}
                className="flex items-center justify-between p-4 bg-accent/5 rounded-2xl border border-accent/10 cursor-pointer hover:bg-accent/10 transition-colors"
              >
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-xl text-accent shadow-lg shadow-accent/10">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-accent uppercase leading-none mb-1">Rendimento Total</div>
                      <div className="text-xs font-black text-white">
                        R$ {formatCurrency(asset.totalDividends || 0)} recebidos
                      </div>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-accent/50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Histórico Individual */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-md animate-fade-in" onClick={() => setShowHistoryModal(false)} />
          <div className="bg-primary w-full max-h-[85vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col pt-4 overflow-hidden">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 shrink-0"></div>
            
            <div className="px-8 pb-6 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl flex items-center justify-center text-accent font-black text-xl shadow-lg ring-1 ring-accent/20">
                    {asset.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{asset.ticker}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Linha do Tempo</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-2 p-4 glass rounded-[2rem] flex justify-between items-center bg-accent/5 border border-accent/10 shadow-xl">
                <div>
                  <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">Rendimento Bruto</div>
                  <div className="text-2xl font-black text-white tabular-nums">R$ {formatCurrency(asset.totalDividends || 0)}</div>
                </div>
                <div className="p-3 bg-accent/10 rounded-2xl text-accent border border-accent/20">
                   <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 no-scrollbar">
              {history.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Sem registros</p>
                </div>
              ) : (
                history.map((receipt, idx) => {
                   const isJcp = receipt.type.toUpperCase().includes('JCP');
                   return (
                    <div key={receipt.id} className="relative glass p-4 rounded-[1.8rem] animate-fade-in-up border border-white/5" style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isJcp ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                      
                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`px-1.5 py-0.5 rounded-lg border text-[8px] font-black flex-shrink-0 ${isJcp ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                              {isJcp ? 'JCP' : 'DIV'}
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-tight">
                              Pago em {receipt.paymentDate.split('-').reverse().join('/')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1">
                               <Timer className="w-2.5 h-2.5" />
                               Base: {receipt.dateCom.split('-').reverse().join('/')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-base font-black text-emerald-400 tabular-nums">
                            R$ {formatCurrency(receipt.totalReceived)}
                          </div>
                          <div className="text-[9px] text-slate-600 font-bold tabular-nums mt-0.5">
                            {receipt.quantityOwned} un × {receipt.rate.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-8 pb-10 border-t border-white/5 bg-secondary/30 shrink-0">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-widest">Yield sobre Custo</span>
                <span className="text-white font-black text-base">{totalCost > 0 ? (((asset.totalDividends || 0) / totalCost) * 100).toFixed(2) : '0.00'}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio, dividendReceipts }) => {
  const getAssetHistory = (ticker: string) => {
    return dividendReceipts.filter(r => r.ticker === ticker);
  };

  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-fade-in">
        <div className="bg-secondary/50 p-6 rounded-full mb-6 ring-1 ring-white/5 shadow-2xl">
            <Building2 className="w-12 h-12 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Carteira Vazia</h3>
        <p className="text-slate-400 text-sm max-w-[250px] leading-relaxed">Adicione suas primeiras ordens de compra para ver seu patrimônio aqui.</p>
      </div>
    );
  }

  const fiis = portfolio.filter(p => p.assetType === 'FII');
  const stocks = portfolio.filter(p => p.assetType === 'ACAO');

  return (
    <div className="pb-28 pt-6 px-4 max-w-lg mx-auto">
      {fiis.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1 animate-fade-in">
            <div className="p-1.5 bg-accent/10 rounded-lg">
                <Layers className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Fundos Imobiliários</h3>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500 font-bold ml-auto border border-white/5">{fiis.length} ATIVOS</span>
          </div>
          <div className="space-y-1">
            {fiis.map((asset, i) => (
              <AssetCard 
                key={asset.ticker} 
                asset={asset} 
                index={i} 
                history={getAssetHistory(asset.ticker)} 
              />
            ))}
          </div>
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Ações</h3>
             <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500 font-bold ml-auto border border-white/5">{stocks.length} ATIVOS</span>
          </div>
          <div className="space-y-1">
             {stocks.map((asset, i) => (
               <AssetCard 
                 key={asset.ticker} 
                 asset={asset} 
                 index={i + fiis.length} 
                 history={getAssetHistory(asset.ticker)} 
               />
             ))}
          </div>
        </div>
      )}
    </div>
  );
};
