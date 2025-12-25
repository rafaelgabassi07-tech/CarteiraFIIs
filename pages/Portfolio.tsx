
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, TrendingDown, Layers, ChevronDown, DollarSign, BarChart3, Target, X, ArrowUpRight, ChevronRight, ArrowDownToLine, Timer, Briefcase, Info } from 'lucide-react';

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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] font-black text-white shadow-inner ring-1 ring-white/10 uppercase">
                  {asset.ticker.substring(0, 4)}
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border border-primary text-[8px] font-black ${asset.assetType === AssetType.FII ? 'bg-accent text-primary' : 'bg-purple-500 text-white'}`}>
                {asset.assetType === AssetType.FII ? 'F' : 'A'}
              </div>
            </div>
            <div>
              <h4 className="font-black text-white text-base tracking-tight leading-tight">{asset.ticker}</h4>
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5 uppercase tracking-wider">
                {asset.quantity} un • R$ {formatCurrency(asset.averagePrice)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-black text-white text-base tabular-nums tracking-tighter">R$ {formatCurrency(totalValue)}</div>
              <div className={`text-[10px] font-black flex items-center justify-end gap-1 mt-0.5 tabular-nums ${gainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </div>
            </div>
            <div className={`p-1.5 rounded-full bg-white/5 group-hover:bg-white/10 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-accent' : 'text-slate-500'}`}>
               <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
          <div className="p-5 space-y-6 bg-black/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3 h-3" /> Lucro Bruto
                </span>
                <div className={`text-sm font-black tabular-nums ${gainValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {gainValue >= 0 ? '+' : ''}{formatCurrency(gainValue)}
                </div>
              </div>
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="w-3 h-3 text-emerald-400" /> Proventos
                </span>
                <div className="text-sm font-black text-white tabular-nums">
                  R$ {formatCurrency(asset.totalDividends || 0)}
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                 <BarChart3 className="w-3.5 h-3.5 text-accent" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Métricas de Performance</span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 px-1">
                 <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Custo Total</span>
                    <span className="text-xs text-slate-200 font-black tabular-nums">
                      R$ {formatCurrency(totalCost)}
                    </span>
                 </div>
                 <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Yield on Cost (YoC)</span>
                    <span className="text-xs text-emerald-400 font-black">
                      {totalCost > 0 ? (((asset.totalDividends || 0) / totalCost) * 100).toFixed(2) : '0.00'}%
                    </span>
                 </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }}
                className="w-full flex items-center justify-between p-4 bg-accent/5 rounded-[1.8rem] border border-accent/10 hover:bg-accent/10 transition-colors group/btn"
              >
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-xl text-accent shadow-lg shadow-accent/10">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-black text-accent uppercase leading-none mb-1 tracking-widest">Rendimentos</div>
                      <div className="text-xs font-black text-white">
                        Ver histórico detalhado
                      </div>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-accent/50 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0">
          <div className="absolute inset-0 bg-primary/90 backdrop-blur-xl animate-fade-in" onClick={() => setShowHistoryModal(false)} />
          <div className="bg-primary w-full max-h-[90vh] rounded-t-[3rem] border-t border-white/10 shadow-2xl relative animate-slide-up flex flex-col pt-4 overflow-hidden">
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 shrink-0"></div>
            
            <div className="px-8 pb-6 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/5 rounded-[1.5rem] flex items-center justify-center text-accent font-black text-2xl shadow-xl ring-1 ring-accent/20">
                    {asset.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter">{asset.ticker}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Histórico de Proventos</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-4 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 glass rounded-[2.5rem] flex justify-between items-center bg-accent/5 border border-accent/10">
                <div>
                  <div className="text-[9px] font-black text-accent uppercase tracking-[0.3em] mb-1.5 opacity-70">Total Recebido</div>
                  <div className="text-3xl font-black text-white tabular-nums">R$ {formatCurrency(asset.totalDividends || 0)}</div>
                </div>
                <div className="p-4 bg-accent/10 rounded-[1.5rem] text-accent border border-accent/20 shadow-inner">
                   <DollarSign className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 no-scrollbar">
              {history.length === 0 ? (
                <div className="py-24 text-center opacity-40">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Nenhum provento registrado</p>
                </div>
              ) : (
                history.map((receipt, idx) => {
                   const isJcp = receipt.type.toUpperCase().includes('JCP');
                   return (
                    <div key={receipt.id} className="relative glass p-5 rounded-[2.2rem] animate-fade-in-up border border-white/[0.04]" style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${isJcp ? 'bg-purple-500' : 'bg-emerald-500'} shadow-[0_0_10px_currentColor]`} />
                      
                      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-black flex-shrink-0 ${isJcp ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                              {isJcp ? 'JCP' : 'DIVIDENDO'}
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-tight">
                              Pago em {receipt.paymentDate.split('-').reverse().join('/')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                               <Timer className="w-3 h-3" />
                               Data-Com: {receipt.dateCom.split('-').reverse().join('/')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-black text-emerald-400 tabular-nums leading-none">
                            R$ {formatCurrency(receipt.totalReceived)}
                          </div>
                          <div className="text-[10px] text-slate-600 font-black tabular-nums mt-2 tracking-tighter">
                            {receipt.quantityOwned} un × {receipt.rate.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-8 pb-12 border-t border-white/5 bg-secondary/30 shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Target className="w-4 h-4 text-slate-500" />
                   <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Yield sobre Custo (YoC)</span>
                </div>
                <span className="text-emerald-400 font-black text-xl tabular-nums">{totalCost > 0 ? (((asset.totalDividends || 0) / totalCost) * 100).toFixed(2) : '0.00'}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio, dividendReceipts }) => {
  const getAssetHistory = (ticker: string) => dividendReceipts.filter(r => r.ticker === ticker);

  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-10 animate-fade-in">
        <div className="bg-secondary/40 p-10 rounded-[3rem] mb-8 ring-1 ring-white/[0.05] shadow-2xl relative">
            <Building2 className="w-16 h-16 text-slate-600" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-primary font-black shadow-lg">?</div>
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Carteira Vazia</h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs">Registre suas compras de Ações ou FIIs para monitorar seu patrimônio em tempo real.</p>
      </div>
    );
  }

  const fiis = portfolio.filter(p => p.assetType === AssetType.FII);
  const stocks = portfolio.filter(p => p.assetType === AssetType.STOCK);

  return (
    <div className="pb-32 pt-6 px-5 max-w-lg mx-auto">
      {fiis.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="p-2 bg-accent/10 rounded-xl">
                <Building2 className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Fundos Imobiliários</h3>
            <div className="h-px flex-1 bg-white/[0.05] ml-2" />
          </div>
          <div className="space-y-1">
            {fiis.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i} history={getAssetHistory(asset.ticker)} />)}
          </div>
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="p-2 bg-purple-500/10 rounded-xl">
                <Briefcase className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Ações Brasileiras</h3>
            <div className="h-px flex-1 bg-white/[0.05] ml-2" />
          </div>
          <div className="space-y-1">
             {stocks.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i + fiis.length} history={getAssetHistory(asset.ticker)} />)}
          </div>
        </div>
      )}
    </div>
  );
};
