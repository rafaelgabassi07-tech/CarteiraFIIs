import React from 'react';
import { AssetPosition } from '../types';
import { Building2, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
}

const AssetCard: React.FC<{ asset: AssetPosition, index: number }> = React.memo(({ asset, index }) => {
  const totalValue = (asset.currentPrice || asset.averagePrice) * asset.quantity;
  const gain = asset.currentPrice 
    ? (asset.currentPrice - asset.averagePrice) / asset.averagePrice * 100 
    : 0;

  return (
    <div 
        className="bg-secondary/40 hover:bg-secondary/60 active:scale-[0.98] transition-all duration-300 p-4 rounded-2xl border border-white/5 mb-3 flex items-center justify-between group backdrop-blur-md shadow-sm hover:shadow-md animate-fade-in-up"
        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-4">
        {asset.logoUrl ? (
          <img src={asset.logoUrl} alt={asset.ticker} className="w-12 h-12 rounded-full bg-white object-contain p-0.5 shadow-md ring-1 ring-white/10" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white shadow-inner ring-1 ring-white/10">
            {asset.ticker.substring(0, 2)}
          </div>
        )}
        <div>
          <h4 className="font-bold text-white text-base tracking-tight">{asset.ticker}</h4>
          <span className="text-xs text-slate-400 font-medium inline-block mt-0.5 bg-white/5 px-2 py-0.5 rounded-md">
            {asset.quantity} {asset.quantity === 1 ? 'cota' : 'cotas'} • PM: R$ {asset.averagePrice.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-white text-base tabular-nums tracking-tight">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        <div className={`text-xs font-bold flex items-center justify-end gap-1 mt-1 tabular-nums px-2 py-0.5 rounded-lg w-fit ml-auto ${gain >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {gain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {gain.toFixed(2)}%
        </div>
      </div>
    </div>
  );
});

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
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Fundos Imobiliários</h3>
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
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ações</h3>
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