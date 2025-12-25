import React from 'react';
import { AssetPosition } from '../types';
import { Building2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface PortfolioProps {
  portfolio: AssetPosition[];
  onSelectAsset?: (ticker: string) => void;
}

const AssetCard: React.FC<{ asset: AssetPosition }> = ({ asset }) => {
  const totalValue = (asset.currentPrice || asset.averagePrice) * asset.quantity;
  const gain = asset.currentPrice 
    ? (asset.currentPrice - asset.averagePrice) / asset.averagePrice * 100 
    : 0;

  return (
    <div className="bg-secondary p-4 rounded-xl border border-white/5 mb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {asset.logoUrl ? (
          <img src={asset.logoUrl} alt={asset.ticker} className="w-10 h-10 rounded-full bg-white object-contain p-0.5" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            {asset.ticker.substring(0, 2)}
          </div>
        )}
        <div>
          <h4 className="font-bold text-white text-sm">{asset.ticker}</h4>
          <span className="text-xs text-gray-400">{asset.quantity} cotas • PM: R$ {asset.averagePrice.toFixed(2)}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-white text-sm">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        <div className={`text-xs flex items-center justify-end gap-1 ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
          {gain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {gain.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio }) => {
  
  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <Building2 className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Carteira Vazia</h3>
        <p className="text-gray-400 text-sm">Adicione transações para ver seus ativos aqui.</p>
      </div>
    );
  }

  // Split by type
  const fiis = portfolio.filter(p => p.assetType === 'FII');
  const stocks = portfolio.filter(p => p.assetType === 'ACAO');

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      {fiis.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Fundos Imobiliários</h3>
          {fiis.map(asset => <AssetCard key={asset.ticker} asset={asset} />)}
        </div>
      )}
      
      {stocks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">Ações</h3>
          {stocks.map(asset => <AssetCard key={asset.ticker} asset={asset} />)}
        </div>
      )}
    </div>
  );
};