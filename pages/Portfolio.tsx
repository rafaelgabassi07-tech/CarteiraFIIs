
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3, PieChart, Activity, DollarSign, Calendar, ExternalLink, Info, AlertCircle, Globe } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividendReceipts?: DividendReceipt[];
  totalDividendsReceived?: number;
  invested?: number;
  balance?: number;
  salesGain?: number;
}

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (val: number) => `${val.toFixed(2)}%`;

const AssetCardInternal: React.FC<{ asset: AssetPosition, totalPortfolioValue: number, history: DividendReceipt[] }> = ({ asset, totalPortfolioValue, history }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentPrice = asset.currentPrice || asset.averagePrice;
  const totalValue = currentPrice * asset.quantity;
  const totalCost = asset.averagePrice * asset.quantity;
  const gainValue = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? (gainValue / totalCost) * 100 : 0;
  const isPositive = gainValue >= 0;
  const allocation = totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0;

  const yoc = totalCost > 0 ? ((asset.totalDividends || 0) / totalCost) * 100 : 0;

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[1.75rem] transition-all duration-300 border border-slate-200 dark:border-slate-800 overflow-hidden ${isExpanded ? 'shadow-md scale-[1.01] ring-1 ring-slate-200 dark:ring-slate-700' : 'shadow-sm active:scale-[0.98]'}`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm border ${asset.assetType === AssetType.FII ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500 border-orange-100 dark:border-orange-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 border-blue-100 dark:border-blue-500/20'}`}>
               {asset.assetType === AssetType.FII ? <Building2 className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
            </div>
            <div>
               <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{asset.ticker}</h3>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.segment || 'Geral'}</span>
                 <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                 <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{asset.quantity} cotas</span>
               </div>
            </div>
          </div>
          <div className="text-right">
             <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(totalValue)}</p>
             <div className={`flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatPercent(gainPercent)}
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div style={{ width: `${allocation}%` }} className={`h-full rounded-full ${asset.assetType === AssetType.FII ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
           </div>
           <span className="text-[9px] font-bold text-slate-400 tabular-nums">{allocation.toFixed(1)}%</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-0 space-y-4 anim-fade-in">
           <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800 mb-4"></div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Preço Médio</p>
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(asset.averagePrice)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cotação Atual</p>
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(currentPrice)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dividendos (Total)</p>
                 <p className="text-sm font-bold text-emerald-500">{formatBRL(asset.totalDividends || 0)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Yield on Cost</p>
                 <p className="text-sm font-bold text-emerald-500">{yoc.toFixed(2)}%</p>
              </div>
           </div>

           {/* Fundamentals (from Gemini/Brapi) */}
           {asset.p_vp && (
             <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <div className="flex items-center gap-2 mb-3">
                   <Activity className="w-4 h-4 text-indigo-500" />
                   <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Indicadores</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                   <div className="text-center">
                      <span className="block text-[9px] font-bold text-indigo-400 uppercase">P/VP</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{asset.p_vp.toFixed(2)}</span>
                   </div>
                   <div className="text-center">
                      <span className="block text-[9px] font-bold text-indigo-400 uppercase">DY 12M</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{asset.dy_12m ? asset.dy_12m.toFixed(2) : '-'}%</span>
                   </div>
                   <div className="text-center">
                      <span className="block text-[9px] font-bold text-indigo-400 uppercase">Sentimento</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{asset.sentiment || 'Neutro'}</span>
                   </div>
                </div>
             </div>
           )}
           
           {history.length > 0 && (
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Últimos Proventos</p>
                <div className="space-y-1.5">
                   {history.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                         <span className="text-slate-500 dark:text-slate-400 font-mono">{h.paymentDate.split('-').reverse().join('/')}</span>
                         <span className="font-bold text-emerald-500">+{formatBRL(h.rate)}/cota</span>
                      </div>
                   ))}
                </div>
             </div>
           )}

           {/* Grounding Sources (Google Search Citations) */}
           {/* Fix: ALWAYS list URLs from groundingChunks to satisfy Google GenAI guidelines. */}
           {asset.sources && asset.sources.length > 0 && (
             <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fontes de Pesquisa (IA)</p>
                <div className="flex flex-wrap gap-2">
                   {asset.sources.map((src, i) => (
                      <a 
                        key={i} 
                        href={src.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 hover:text-accent transition-colors border border-slate-200 dark:border-slate-700"
                      >
                         <Globe className="w-2.5 h-2.5" /> {src.title.length > 25 ? src.title.substring(0, 25) + '...' : src.title}
                      </a>
                   ))}
                </div>
             </div>
           )}

           {/* Links */}
           <div className="flex justify-end pt-2">
              <a 
                href={`https://statusinvest.com.br/${asset.assetType === AssetType.FII ? 'fundos-imobiliarios' : 'acoes'}/${asset.ticker.toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-accent transition-colors uppercase tracking-widest"
              >
                Status Invest <ExternalLink className="w-3 h-3" />
              </a>
           </div>
        </div>
      )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividendReceipts = [], totalDividendsReceived = 0, invested = 0, balance = 0, salesGain = 0 }) => {
  const [filter, setFilter] = useState('');
  
  const filteredPortfolio = useMemo(() => {
     if (!filter) return portfolio;
     return portfolio.filter(p => p.ticker.includes(filter.toUpperCase()) || p.segment?.toLowerCase().includes(filter.toLowerCase()));
  }, [portfolio, filter]);

  const totalReturn = (balance - invested) + totalDividendsReceived + salesGain;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto min-h-screen">
      
      {/* Search Header */}
      <div className="sticky top-24 z-30 pt-2 pb-4 bg-slate-50 dark:bg-slate-950 -mx-5 px-5 transition-all">
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
               <PieChart className="w-5 h-5" />
             </div>
             <input 
               type="text" 
               placeholder="Buscar ativo ou segmento..." 
               value={filter}
               onChange={(e) => setFilter(e.target.value)}
               className="w-full bg-white dark:bg-slate-900 pl-12 pr-4 py-3.5 rounded-2xl outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-accent/50 transition-all"
             />
          </div>
      </div>

      <div className="space-y-4">
         {filteredPortfolio.length === 0 ? (
           <div className="py-20 text-center opacity-60">
              <PieChart className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1} />
              <p className="text-sm font-bold text-slate-500">Nenhum ativo encontrado</p>
           </div>
         ) : (
           filteredPortfolio.map((asset, index) => (
             <AssetCardInternal 
               key={asset.ticker} 
               asset={asset} 
               totalPortfolioValue={balance}
               history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))}
             />
           ))
         )}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Custodiado</p>
         <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{formatBRL(balance)}</p>
         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 text-xs font-bold uppercase tracking-wider ${totalReturn >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {totalReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {formatPercent(totalReturnPercent)} Retorno Total
         </div>
      </div>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
