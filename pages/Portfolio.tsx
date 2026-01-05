
import React, { useState, useMemo } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Building2, TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Globe, ExternalLink, Filter, LayoutGrid, List as ListIcon } from 'lucide-react';

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
  const isFII = asset.assetType === AssetType.FII;

  return (
    <div className={`bg-white dark:bg-[#0f172a] rounded-[1.75rem] transition-all duration-300 border border-slate-200/50 dark:border-white/5 overflow-hidden ${isExpanded ? 'shadow-xl scale-[1.01] ring-1 ring-accent/20 z-10' : 'shadow-sm active:scale-[0.98]'}`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm border border-white/10 ${isFII ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
               {isFII ? <Building2 className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
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
        
        {/* Allocation Bar */}
        <div className="flex items-center gap-2">
           <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div style={{ width: `${allocation}%` }} className={`h-full rounded-full ${isFII ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
           </div>
           <span className="text-[9px] font-bold text-slate-400 tabular-nums">{allocation.toFixed(1)}%</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-0 space-y-4 anim-fade-in">
           <div className="h-[1px] w-full bg-slate-100 dark:bg-white/5 mb-4"></div>
           
           <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Preço Médio</p>
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(asset.averagePrice)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cotação Atual</p>
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatBRL(currentPrice)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Proventos</p>
                 <p className="text-sm font-bold text-emerald-500">{formatBRL(asset.totalDividends || 0)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Yield on Cost</p>
                 <p className="text-sm font-bold text-emerald-500">{yoc.toFixed(2)}%</p>
              </div>
           </div>

           {/* Fundamentals Section */}
           {(asset.p_vp || asset.dy_12m) && (
             <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <div className="flex items-center gap-2 mb-3">
                   <Activity className="w-4 h-4 text-indigo-500" />
                   <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Fundamentos (IA)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                   <div className="text-center">
                      <span className="block text-[9px] font-bold text-indigo-400 uppercase">P/VP</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{asset.p_vp?.toFixed(2) || '-'}</span>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Últimos Pagamentos</p>
                <div className="space-y-1.5">
                   {history.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                         <span className="text-slate-500 dark:text-slate-400 font-mono">{h.paymentDate.split('-').reverse().join('/')}</span>
                         <span className="font-bold text-emerald-500">+{formatBRL(h.rate)}</span>
                      </div>
                   ))}
                </div>
             </div>
           )}

           {/* Footer Actions */}
           <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex gap-2">
                   {asset.sources && asset.sources.slice(0,1).map((src, i) => (
                      <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 dark:bg-white/5 text-[9px] font-bold text-slate-400 hover:text-accent">
                         <Globe className="w-2.5 h-2.5" /> Fonte
                      </a>
                   ))}
              </div>
              <a 
                href={`https://statusinvest.com.br/${isFII ? 'fundos-imobiliarios' : 'acoes'}/${asset.ticker.toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-accent transition-colors uppercase tracking-widest"
              >
                Detalhes <ExternalLink className="w-3 h-3" />
              </a>
           </div>
        </div>
      )}
    </div>
  );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividendReceipts = [], totalDividendsReceived = 0, invested = 0, balance = 0, salesGain = 0 }) => {
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');
  
  const filteredPortfolio = useMemo(() => {
     let data = portfolio;
     
     // 1. Filtro por Tipo (Tab)
     if (activeTab === 'FII') {
         data = data.filter(p => p.assetType === AssetType.FII);
     } else if (activeTab === 'STOCK') {
         data = data.filter(p => p.assetType === AssetType.STOCK);
     }

     // 2. Filtro de Texto
     if (filterText) {
        data = data.filter(p => p.ticker.includes(filterText.toUpperCase()) || p.segment?.toLowerCase().includes(filterText.toLowerCase()));
     }
     
     // Ordenar por valor total (maior para menor)
     return data.sort((a,b) => (b.quantity * (b.currentPrice||0)) - (a.quantity * (a.currentPrice||0)));
  }, [portfolio, filterText, activeTab]);

  // Cálculos baseados na view atual (FIIs, Ações ou Tudo)
  const currentViewBalance = useMemo(() => filteredPortfolio.reduce((acc, p) => acc + (p.quantity * (p.currentPrice || 0)), 0), [filteredPortfolio]);
  const currentViewInvested = useMemo(() => filteredPortfolio.reduce((acc, p) => acc + (p.quantity * p.averagePrice), 0), [filteredPortfolio]);
  const currentViewReturn = currentViewBalance - currentViewInvested;
  const currentViewReturnPercent = currentViewInvested > 0 ? (currentViewReturn / currentViewInvested) * 100 : 0;

  return (
    <div className="pt-24 pb-28 px-5 max-w-lg mx-auto min-h-screen">
      
      {/* Header Fixo com Busca e Abas */}
      <div className="sticky top-24 z-30 pt-2 pb-2 bg-slate-100/95 dark:bg-[#020617]/95 backdrop-blur-md -mx-5 px-5 transition-all space-y-3">
          {/* Abas de Navegação */}
          <div className="bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl flex items-center font-bold">
              <button 
                  onClick={() => setActiveTab('ALL')}
                  className={`flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 ${activeTab === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                  Tudo
              </button>
              <button 
                  onClick={() => setActiveTab('FII')}
                  className={`flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'FII' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-orange-500'}`}
              >
                  <Building2 className="w-3.5 h-3.5 mb-0.5" /> FIIs
              </button>
              <button 
                  onClick={() => setActiveTab('STOCK')}
                  className={`flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'STOCK' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-blue-500'}`}
              >
                  <BarChart3 className="w-3.5 h-3.5 mb-0.5" /> Ações
              </button>
          </div>

          {/* Campo de Busca */}
          <div className="relative group">
             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
             <input 
               type="text" 
               placeholder={`Filtrar ${activeTab === 'ALL' ? 'ativos' : activeTab === 'FII' ? 'FIIs' : 'ações'}...`}
               value={filterText}
               onChange={(e) => setFilterText(e.target.value)}
               className="w-full bg-white dark:bg-white/5 pl-11 pr-4 py-3 rounded-2xl outline-none font-semibold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm border border-slate-200/50 dark:border-white/5 focus:ring-2 focus:ring-accent/20 transition-all"
             />
          </div>
      </div>

      {/* Lista de Ativos */}
      <div className="space-y-4 mt-2">
         {filteredPortfolio.length === 0 ? (
           <div className="py-20 text-center opacity-60">
              <PieChart className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1} />
              <p className="text-sm font-bold text-slate-500">Nenhum ativo encontrado nesta categoria.</p>
           </div>
         ) : (
           filteredPortfolio.map((asset) => (
             <AssetCardInternal 
               key={asset.ticker} 
               asset={asset} 
               totalPortfolioValue={currentViewBalance} // Alocação relativa à view atual
               history={dividendReceipts.filter(d => d.ticker === asset.ticker).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))}
             />
           ))
         )}
      </div>

      {/* Resumo Contextual (Footer) */}
      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10 text-center anim-fade-in-up is-visible">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
             {activeTab === 'ALL' ? 'Patrimônio Total' : activeTab === 'FII' ? 'Total em FIIs' : 'Total em Ações'}
         </p>
         <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
             {formatBRL(currentViewBalance)}
         </p>
         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 text-xs font-bold uppercase tracking-wider ${currentViewReturn >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {currentViewReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {formatPercent(currentViewReturnPercent)}
         </div>
      </div>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
