
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, TrendingDown, Layers, ChevronDown, DollarSign, BarChart3, Target, X, ArrowUpRight, ChevronRight, ArrowDownToLine, Timer, Briefcase, Info, Scale } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

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
  const isFii = asset.assetType === AssetType.FII;
  
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div 
          className={`relative mb-3 overflow-hidden rounded-[2.2rem] transition-all duration-300 animate-fade-in-up group active:scale-[0.99]
            ${isFii 
                ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-sky-500/10 hover:border-sky-500/20 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.1)]' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/10 hover:border-purple-500/20 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.1)]'}
            ${isExpanded ? 'ring-1 ring-white/10 z-10 scale-[1.01]' : ''}
          `}
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
      >
        {/* Barra Lateral Colorida para Identificação Rápida */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isFii ? 'bg-sky-500' : 'bg-purple-500'} opacity-80`} />

        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-5 pl-7 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              {asset.logoUrl ? (
                <img src={asset.logoUrl} alt={asset.ticker} className="w-12 h-12 rounded-2xl bg-white object-contain p-1 shadow-md ring-1 ring-white/10" />
              ) : (
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black text-white shadow-inner ring-1 ring-white/10 uppercase border border-white/5 ${isFii ? 'bg-gradient-to-br from-sky-600 to-sky-800' : 'bg-gradient-to-br from-purple-600 to-purple-800'}`}>
                  {asset.ticker.substring(0, 4)}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-black text-white text-base tracking-tight leading-tight flex items-center gap-2">
                  {asset.ticker}
                  <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${isFii ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                      {isFii ? 'FII' : 'Ação'}
                  </span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-wider">
                {asset.quantity} un • <span className="text-slate-500">Médio:</span> R$ {formatCurrency(asset.averagePrice)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-black text-white text-base tabular-nums tracking-tighter">R$ {formatCurrency(totalValue)}</div>
              <div className={`text-[10px] font-black flex items-center justify-end gap-1 mt-0.5 tabular-nums ${gainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </div>
            </div>
            <div className={`p-1.5 rounded-full bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white bg-white/10' : 'text-slate-500'}`}>
               <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
          <div className="p-5 pl-7 space-y-6 bg-black/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3 h-3" /> Lucro Bruto
                </span>
                <div className={`text-sm font-black tabular-nums ${gainValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {gainValue >= 0 ? '+' : ''}{formatCurrency(gainValue)}
                </div>
              </div>
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="w-3 h-3 text-emerald-400" /> Proventos
                </span>
                <div className="text-sm font-black text-white tabular-nums">
                  R$ {formatCurrency(asset.totalDividends || 0)}
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                 <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Métricas de Performance</span>
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
                className={`w-full flex items-center justify-between p-4 rounded-[1.8rem] border transition-colors group/btn active:scale-[0.98] mt-2
                    ${isFii ? 'bg-sky-500/5 border-sky-500/10 hover:bg-sky-500/10' : 'bg-purple-500/5 border-purple-500/10 hover:bg-purple-500/10'}
                `}
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shadow-lg ${isFii ? 'bg-sky-500/20 text-sky-400 shadow-sky-500/10' : 'bg-purple-500/20 text-purple-400 shadow-purple-500/10'}`}>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className={`text-[9px] font-black uppercase leading-none mb-1 tracking-widest ${isFii ? 'text-sky-400' : 'text-purple-400'}`}>Rendimentos</div>
                      <div className="text-xs font-black text-white">
                        Ver histórico detalhado
                      </div>
                    </div>
                 </div>
                 <ChevronRight className={`w-4 h-4 transition-transform group-hover/btn:translate-x-1 ${isFii ? 'text-sky-500/50' : 'text-purple-500/50'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 pt-2 pb-10">
            {/* Conteúdo do modal mantido para brevidade */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 bg-gradient-to-br rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl ring-1 ${isFii ? 'from-sky-500/20 to-sky-500/5 text-sky-400 ring-sky-500/20' : 'from-purple-500/20 to-purple-500/5 text-purple-400 ring-purple-500/20'}`}>
                    {asset.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter">{asset.ticker}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Histórico de Proventos</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
            </div>
              
            <div className="p-6 glass rounded-[2.5rem] flex justify-between items-center bg-slate-800/50 border border-white/5 mb-6">
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1.5">Total Recebido</div>
                  <div className="text-3xl font-black text-white tabular-nums">R$ {formatCurrency(asset.totalDividends || 0)}</div>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] text-emerald-400 border border-emerald-500/20 shadow-inner">
                   <DollarSign className="w-8 h-8" />
                </div>
            </div>

            <div className="space-y-4 mb-6">
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
                    <div key={receipt.id} className="relative bg-white/[0.03] p-5 rounded-[2.2rem] animate-fade-in-up border border-white/[0.04]" style={{ animationDelay: `${idx * 40}ms` }}>
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
                          <div className="flex flex-col gap-1">
                             <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                               <Timer className="w-3 h-3" />
                               Data-Com: {receipt.dateCom.split('-').reverse().join('/')}
                            </span>
                            <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                               <Scale className="w-3 h-3" />
                               Posição na data: {receipt.quantityOwned} un
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-black text-emerald-400 tabular-nums leading-none">
                            R$ {formatCurrency(receipt.totalReceived)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-black tabular-nums mt-2 tracking-tighter">
                            {receipt.quantityOwned} un × {receipt.rate.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        </div>
      </SwipeableModal>
    </>
  );
});

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio, dividendReceipts }) => {
  const getAssetHistory = (ticker: string) => dividendReceipts.filter(r => r.ticker === ticker);

  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-10 animate-fade-in">
        <div className="bg-[#0f172a] p-10 rounded-[3rem] mb-8 ring-1 ring-white/[0.05] shadow-2xl relative">
            <Building2 className="w-16 h-16 text-slate-700" />
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-primary font-black shadow-lg animate-bounce">?</div>
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Carteira Vazia</h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs">Registre suas compras de Ações ou FIIs para monitorar seu patrimônio em tempo real.</p>
      </div>
    );
  }

  const fiis = portfolio.filter(p => p.assetType === AssetType.FII);
  const stocks = portfolio.filter(p => p.assetType === AssetType.STOCK);

  return (
    <div className="pb-32 pt-2 px-5 max-w-lg mx-auto">
      {fiis.length > 0 && (
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-5 px-2">
            <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/10">
                <Building2 className="w-4 h-4 text-sky-500" />
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
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-5 px-2">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/10">
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
