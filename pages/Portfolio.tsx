
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, ChevronDown, DollarSign, Target, X, ChevronRight, Briefcase, Info, Scale, PieChart } from 'lucide-react';
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
  
  const gainPercent = asset.averagePrice > 0 
    ? ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100 
    : 0;
    
  const gainValue = totalValue - totalCost;
  
  const yieldOnCost = totalCost > 0 
    ? ((asset.totalDividends || 0) / totalCost) * 100 
    : 0;
  
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div 
          className={`relative overflow-hidden transition-all duration-300 rounded-[1.8rem] mb-2.5 backdrop-blur-md animate-fade-in-up border ${isExpanded ? 'bg-slate-800/80 border-accent/20 shadow-lg ring-1 ring-accent/10' : 'bg-slate-800/40 border-white/[0.06] hover:bg-slate-800/60 shadow-sm'}`}
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 flex items-center justify-between cursor-pointer select-none group active:scale-[0.99] transition-transform"
        >
          {/* Lado Esquerdo: Ícone + Ticker + Qtd/PM */}
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {asset.logoUrl ? (
                <img src={asset.logoUrl} alt={asset.ticker} className="w-10 h-10 rounded-xl bg-white object-contain p-1 shadow-sm ring-1 ring-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-[9px] font-black text-white shadow-inner ring-1 ring-white/10 uppercase border border-white/5">
                  {asset.ticker.substring(0, 4)}
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-md flex items-center justify-center border-[1.5px] border-[#1e293b] text-[6px] font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-accent text-primary' : 'bg-purple-500 text-white'}`}>
                {asset.assetType === AssetType.FII ? 'F' : 'A'}
              </div>
            </div>
            <div>
              <h4 className="font-black text-white text-sm tracking-tight leading-none mb-1">{asset.ticker}</h4>
              <div className="flex items-center gap-1.5 opacity-80">
                 <span className="text-[10px] text-slate-300 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                   {asset.quantity} un
                 </span>
                 <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                   PM: R$ {formatCurrency(asset.averagePrice)}
                 </span>
              </div>
            </div>
          </div>
          
          {/* Lado Direito: Valor Total + Variação */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-black text-white text-sm tabular-nums tracking-tight">R$ {formatCurrency(totalValue)}</div>
              <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 mt-0.5 tabular-nums ${gainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'rotate-180 bg-accent text-primary' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>
               <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Área Expandida Compacta */}
        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
          <div className="px-4 pb-4 pt-0">
             <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4"></div>
             
             {/* Grid de Estatísticas Compacto */}
             <div className="grid grid-cols-2 gap-2.5 mb-3">
                {/* Lucro Bruto */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      <Target className="w-3 h-3" /> Lucro
                   </div>
                   <div className={`text-xs font-black tabular-nums ${gainValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {gainValue >= 0 ? '+' : ''}{formatCurrency(gainValue)}
                   </div>
                </div>

                {/* Proventos */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      <DollarSign className="w-3 h-3 text-accent" /> Proventos
                   </div>
                   <div className="text-xs font-black text-white tabular-nums">
                      R$ {formatCurrency(asset.totalDividends || 0)}
                   </div>
                </div>

                {/* Custo Total */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      <PieChart className="w-3 h-3" /> Custo
                   </div>
                   <div className="text-xs font-black text-slate-300 tabular-nums">
                      R$ {formatCurrency(totalCost)}
                   </div>
                </div>

                {/* Yield on Cost */}
                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex flex-col justify-center">
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      <Scale className="w-3 h-3" /> YoC
                   </div>
                   <div className="text-xs font-black text-emerald-400 tabular-nums">
                      {yieldOnCost.toFixed(2)}%
                   </div>
                </div>
             </div>
             
             {/* Botão Histórico Full Width */}
             <button 
               onClick={(e) => { e.stopPropagation(); setShowHistoryModal(true); }}
               className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all active:scale-[0.98] group/btn"
             >
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover/btn:text-white transition-colors">
                   Ver Histórico Completo
                </span>
                <ChevronRight className="w-3 h-3 text-slate-600 group-hover/btn:translate-x-0.5 transition-transform" />
             </button>
          </div>
        </div>
      </div>

      <SwipeableModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)}>
        <div className="px-6 pt-2 pb-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl flex items-center justify-center text-accent font-black text-xl shadow-xl ring-1 ring-accent/20">
                    {asset.ticker.slice(0, 4)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tighter">{asset.ticker}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Histórico de Proventos</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
            </div>
              
            <div className="p-5 glass rounded-[2rem] flex justify-between items-center bg-accent/5 border border-accent/10 mb-6">
                <div>
                  <div className="text-[9px] font-black text-accent uppercase tracking-[0.3em] mb-1.5 opacity-70">Total Recebido</div>
                  <div className="text-2xl font-black text-white tabular-nums">R$ {formatCurrency(asset.totalDividends || 0)}</div>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl text-accent border border-accent/20 shadow-inner">
                   <DollarSign className="w-6 h-6" />
                </div>
            </div>

            <div className="space-y-3 mb-6">
              {history.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Nenhum provento registrado</p>
                </div>
              ) : (
                history.map((receipt, idx) => {
                   const isJcp = receipt.type.toUpperCase().includes('JCP');
                   return (
                    <div key={receipt.id} className="relative glass p-4 rounded-3xl animate-fade-in-up border border-white/[0.04]" style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className={`absolute left-0 top-5 bottom-5 w-1 rounded-r-full ${isJcp ? 'bg-purple-500' : 'bg-emerald-500'} shadow-[0_0_8px_currentColor]`} />
                      
                      <div className="flex justify-between items-center pl-2">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                {receipt.paymentDate.split('-').reverse().join('/')}
                              </span>
                              <div className={`px-1.5 py-[2px] rounded border text-[8px] font-black ${isJcp ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                {isJcp ? 'JCP' : 'DIV'}
                              </div>
                           </div>
                           <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              Posição: <span className="text-slate-300">{receipt.quantityOwned} un</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-sm font-black text-emerald-400 tabular-nums">
                              R$ {formatCurrency(receipt.totalReceived)}
                           </div>
                           <div className="text-[9px] text-slate-600 font-bold tabular-nums">
                              {receipt.rate.toFixed(4)} / cota
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
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-8 animate-fade-in">
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] mb-6 ring-1 ring-white/[0.05] shadow-2xl relative">
            <Building2 className="w-12 h-12 text-slate-700" />
            <div className="absolute -top-1.5 -right-1.5 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-primary font-black shadow-lg animate-bounce">?</div>
        </div>
        <h3 className="text-xl font-black text-white mb-2 tracking-tight">Carteira Vazia</h3>
        <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-[200px]">Registre suas ordens para ver seu patrimônio.</p>
      </div>
    );
  }

  const fiis = portfolio.filter(p => p.assetType === AssetType.FII);
  const stocks = portfolio.filter(p => p.assetType === AssetType.STOCK);

  return (
    <div className="pb-32 pt-2 px-4 max-w-lg mx-auto relative">
      {/* Luz ambiente para quebrar o fundo preto */}
      <div className="fixed top-0 left-0 right-0 h-96 bg-accent/5 blur-[100px] -z-10 pointer-events-none rounded-b-[100px]"></div>

      {fiis.length > 0 && (
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="p-1.5 bg-accent/10 rounded-lg border border-accent/10">
                <Building2 className="w-3.5 h-3.5 text-accent" />
            </div>
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Fundos Imobiliários</h3>
            <div className="h-px flex-1 bg-white/[0.05] ml-2" />
          </div>
          <div className="space-y-1">
            {fiis.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i} history={getAssetHistory(asset.ticker)} />)}
          </div>
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/10">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Ações Brasileiras</h3>
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
