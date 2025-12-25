import React, { useState } from 'react';
import { AssetPosition } from '../types';
import { Building2, TrendingUp, TrendingDown, Layers, ChevronDown, ChevronUp, DollarSign, BarChart3, Target, Calendar } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
}

const AssetCard: React.FC<{ asset: AssetPosition, index: number }> = React.memo(({ asset, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalCost = asset.averagePrice * asset.quantity;
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  
  const gainPercent = ((currentPrice - asset.averagePrice) / asset.averagePrice) * 100;
  const gainValue = totalValue - totalCost;
  
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div 
        className={`bg-secondary/40 hover:bg-secondary/60 transition-all duration-300 rounded-3xl border border-white/5 mb-4 overflow-hidden backdrop-blur-md shadow-sm animate-fade-in-up ${isExpanded ? 'ring-1 ring-accent/30 bg-secondary/70 shadow-lg' : ''}`}
        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      {/* Header do Card (Sempre visível) */}
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
            {/* Indicador de Tipo no Logo */}
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

      {/* Conteúdo Expandido */}
      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
        <div className="p-5 space-y-6 bg-black/20">
          
          {/* Grid de Métricas Principais */}
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

          {/* Comparativo Visual Custo vs Atual */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-slate-400">
               <span>Custo Total: R$ {formatCurrency(totalCost)}</span>
               <span className="text-accent">Mercado: R$ {formatCurrency(totalValue)}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
               <div className="h-full bg-slate-600" style={{ width: `${Math.min(100, (totalCost / Math.max(totalCost, totalValue)) * 100)}%` }} />
               <div className={`h-full ${gainValue >= 0 ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} style={{ width: `${Math.abs(((totalValue - totalCost) / Math.max(totalCost, totalValue)) * 100)}%` }} />
            </div>
          </div>

          {/* Dados de Mercado (Brapi) */}
          <div className="pt-2 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
               <BarChart3 className="w-3.5 h-3.5 text-accent" />
               <span className="text-[10px] font-bold text-white uppercase tracking-widest">Dados de Mercado</span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4">
               <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold">Máx / Mín Dia</span>
                  <span className="text-xs text-slate-200 font-medium tabular-nums">
                    R$ {asset.currentPrice ? formatCurrency(asset.currentPrice) : '-'} 
                    <span className="text-[10px] text-slate-500 font-normal ml-1">
                      (H: {asset.currentPrice ? '...' : '-'} L: {asset.currentPrice ? '...' : '-'})
                    </span>
                  </span>
               </div>
               <div>
                  <span className="block text-[9px] text-slate-500 uppercase font-bold">Patrimônio Alocado</span>
                  <span className="text-xs text-slate-200 font-medium">Calculando...</span>
               </div>
            </div>
            
            {/* Badge de Dividend Yield (Mock ou calculado se houver taxa) */}
            <div className="flex items-center justify-between p-3 bg-accent/5 rounded-2xl border border-accent/10">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-accent/20 rounded-lg text-accent">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-accent uppercase leading-none">Rendimento Total</div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {((asset.totalDividends || 0) / totalCost * 100).toFixed(2)}% sobre o custo
                    </div>
                  </div>
               </div>
               <button className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                 VER HISTÓRICO <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Helper component for small arrow
const ChevronRight: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio }) => {
  
  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-fade-in">
        <div className="bg-secondary/50 p-6 rounded-full mb-6 ring-1 ring-white/5 shadow-2xl">
            <Building2 className="w-12 h-12 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Carteira Vazia</h3>
        <p className="text-slate-400 text-sm max-w-[250px] leading-relaxed">Sua carteira está aguardando seus primeiros investimentos.</p>
      </div>
    );
  }

  // Split by type
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
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                </span>
                Fundos Imobiliários
            </h3>
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500 font-bold ml-auto border border-white/5">{fiis.length} ATIVOS</span>
          </div>
          <div className="space-y-1">
            {fiis.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i} />)}
          </div>
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-1 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-400"></span>
                </span>
                Ações
            </h3>
             <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500 font-bold ml-auto border border-white/5">{stocks.length} ATIVOS</span>
          </div>
          <div className="space-y-1">
             {stocks.map((asset, i) => <AssetCard key={asset.ticker} asset={asset} index={i + fiis.length} />)}
          </div>
        </div>
      )}
    </div>
  );
};