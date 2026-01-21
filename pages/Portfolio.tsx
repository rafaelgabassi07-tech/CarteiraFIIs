
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, Wallet, ExternalLink, X, TrendingUp, TrendingDown, Building2, BarChart3, Activity, Scale, Percent, AlertCircle, Banknote, Landmark, LineChart, DollarSign } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';

interface PortfolioProps {
  portfolio: AssetPosition[];
  privacyMode?: boolean;
}

const formatBRL = (val: number, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: number, privacy = false) => {
  if (privacy) return '•••%';
  const signal = val > 0 ? '+' : '';
  return `${signal}${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

// Componente auxiliar para Cards de Métricas mais limpo e moderno
const MetricCard = ({ label, value, subtext, highlight = false, colorClass, icon: Icon }: any) => (
    <div className={`p-4 rounded-2xl flex flex-col justify-between h-full transition-all ${highlight ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm' : 'bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50'}`}>
        <div>
            <div className="flex items-center gap-1.5 mb-1.5">
                {Icon && <Icon className="w-3 h-3 text-zinc-400" />}
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
            </div>
            <p className={`text-lg font-black tracking-tight leading-none ${colorClass || 'text-zinc-900 dark:text-white'}`}>
                {value !== undefined && value !== null && value !== '' ? value : '-'}
            </p>
        </div>
        {subtext && <p className="text-[9px] font-bold text-zinc-400/70 mt-2">{subtext}</p>}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <h3 className="px-1 mb-3 mt-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
        <Icon className="w-3 h-3" /> {title}
    </h3>
);

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | AssetType>('ALL');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    return portfolio
      .filter(p => {
        const matchesSearch = p.ticker.includes(searchTerm.toUpperCase()) || (p.segment || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || p.assetType === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => (b.currentPrice || 0) * b.quantity - (a.currentPrice || 0) * a.quantity); 
  }, [portfolio, searchTerm, filterType]);

  const activeAsset = useMemo(() => {
      return portfolio.find(p => p.ticker === selectedTicker) || null;
  }, [portfolio, selectedTicker]);

  return (
    <div className="pb-32 min-h-screen">
      {/* Search Bar Refinada - Removido Sticky para rolar com a página */}
      <div className="relative z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all -mx-4 px-4 py-2">
        <div className="flex flex-col gap-3 pb-2">
            <div className="relative flex items-center group">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filtrar por nome ou ticker..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all shadow-sm"
                />
            </div>
            <div className="flex items-center justify-between px-1">
                <div className="flex gap-2">
                    <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${filterType === 'ALL' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>Tudo</button>
                    <button onClick={() => setFilterType(AssetType.FII)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${filterType === AssetType.FII ? 'bg-indigo-500 text-white border-transparent' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>FIIs</button>
                    <button onClick={() => setFilterType(AssetType.STOCK)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${filterType === AssetType.STOCK ? 'bg-sky-500 text-white border-transparent' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>Ações</button>
                </div>
                <div className="text-[9px] font-bold text-zinc-400">{filteredAssets.length} Ativos</div>
            </div>
        </div>
      </div>

      <div className="space-y-3 px-1 pt-6">
        {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => {
                const currentPrice = asset.currentPrice || 0;
                const totalValue = currentPrice * asset.quantity;
                const dailyVar = asset.dailyChange || 0;
                const isPositiveDaily = dailyVar >= 0;

                return (
                    <button key={asset.ticker} onClick={() => setSelectedTicker(asset.ticker)} className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none press-effect group hover:border-zinc-200 dark:hover:border-zinc-700 anim-stagger-item" style={{ animationDelay: `${index * 40}ms` }}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {asset.logoUrl ? (
                                    <div className="w-12 h-12 rounded-xl bg-white p-1.5 border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden"><img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" /></div>
                                ) : (
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/10 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>{asset.ticker.substring(0, 2)}</div>
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">{asset.ticker}</h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">{asset.segment || 'Geral'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                            <div className="flex flex-col items-end mt-0.5">
                                <span className="text-[10px] font-medium text-zinc-400">{formatBRL(currentPrice, privacyMode)}</span>
                                <span className={`text-[9px] font-bold ${isPositiveDaily ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isPositiveDaily ? '+' : ''}{dailyVar.toFixed(2)}% (24h)
                                </span>
                            </div>
                        </div>
                    </button>
                );
            })
        ) : (
            <div className="text-center py-20 opacity-40 anim-fade-in flex flex-col items-center">
                <Search className="w-12 h-12 mb-4 text-zinc-300" strokeWidth={1.5} />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nenhum ativo encontrado</p>
            </div>
        )}
      </div>

      <SwipeableModal isOpen={!!activeAsset} onClose={() => setSelectedTicker(null)}>
        {activeAsset && (() => {
            const currentPrice = activeAsset.currentPrice || 0;
            const avgPrice = activeAsset.averagePrice || 0;
            const totalCurrent = currentPrice * activeAsset.quantity;
            const totalCost = avgPrice * activeAsset.quantity;
            const totalGainValue = totalCurrent - totalCost;
            const totalGainPercent = totalCost > 0 ? (totalGainValue / totalCost) * 100 : 0;
            const isPositive = totalGainValue >= 0;
            const isFII = activeAsset.assetType === AssetType.FII;

            return (
            <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
                
                {/* Header do Ativo */}
                <div className="flex justify-between items-start mb-8 anim-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shadow-sm">
                            {activeAsset.logoUrl ? <img src={activeAsset.logoUrl} className="w-full h-full object-contain p-2" /> : <span className="text-lg font-black text-zinc-400">{activeAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{activeAsset.ticker}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-200 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/10 text-sky-600 border-sky-200 dark:border-sky-800'}`}>
                                    {isFII ? 'FII' : 'AÇÃO'}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 rounded">{activeAsset.segment || 'Geral'}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedTicker(null)} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Bloco 1: Minha Posição */}
                <div className="mb-4 anim-slide-up" style={{ animationDelay: '50ms' }}>
                     <h3 className="px-1 mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Wallet className="w-3 h-3" /> Minha Posição
                     </h3>
                     <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 opacity-10 pointer-events-none ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        
                        <div className="flex justify-between items-end mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800 relative z-10">
                             <div>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Patrimônio</p>
                                 <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalCurrent, privacyMode)}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Retorno</p>
                                 <div className={`flex flex-col items-end font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                     <span className="text-lg leading-none mb-1 flex items-center gap-1">
                                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        {formatBRL(totalGainValue, privacyMode)}
                                     </span>
                                     <span className="text-[10px] opacity-80">
                                         {formatPercent(totalGainPercent, privacyMode)}
                                     </span>
                                 </div>
                             </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 relative z-10">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Médio</span>
                                <span className="block text-sm font-black text-zinc-700 dark:text-zinc-300">{formatBRL(avgPrice, privacyMode)}</span>
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cotação</span>
                                <span className="block text-sm font-black text-zinc-900 dark:text-white">{formatBRL(currentPrice, privacyMode)}</span>
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-right">
                                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Quantidade</span>
                                <span className="block text-sm font-black text-zinc-900 dark:text-white">{activeAsset.quantity}</span>
                            </div>
                        </div>
                     </div>
                </div>

                {/* FUNDAMENTOS */}
                <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex justify-between items-center px-1 mb-2 mt-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Fundamentos
                        </h3>
                        {activeAsset.updated_at && (
                            <span className="text-[8px] font-bold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                Atualizado: {new Date(activeAsset.updated_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    
                    {isFII ? (
                        <>
                            {/* Valuation & Rendimentos FII */}
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard 
                                    label="P/VP" 
                                    value={activeAsset.p_vp !== undefined ? activeAsset.p_vp.toFixed(2) : '-'} 
                                    subtext="Preço Justo ~ 1.0" 
                                    highlight
                                    colorClass={activeAsset.p_vp && activeAsset.p_vp < 1 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}
                                    icon={Scale}
                                />
                                <MetricCard 
                                    label="Dividend Yield (12m)" 
                                    value={activeAsset.dy_12m !== undefined ? `${activeAsset.dy_12m.toFixed(2)}%` : '-'} 
                                    subtext="Retorno Isento" 
                                    highlight
                                    colorClass="text-indigo-500"
                                    icon={Percent}
                                />
                                <MetricCard 
                                    label="Último Rendimento" 
                                    value={activeAsset.last_dividend !== undefined ? `R$ ${activeAsset.last_dividend.toFixed(2)}` : '-'} 
                                    subtext="Por cota" 
                                    icon={Wallet}
                                />
                                <MetricCard 
                                    label="Valor Patrimonial" 
                                    value={activeAsset.vpa !== undefined ? `R$ ${activeAsset.vpa.toFixed(2)}` : '-'} 
                                    subtext="VP por cota" 
                                    icon={Building2}
                                />
                            </div>

                            {/* Qualidade e Risco FII */}
                            <SectionHeader title="Carteira & Risco" icon={Building2} />
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard 
                                    label="Vacância Física" 
                                    value={activeAsset.vacancy !== undefined ? `${activeAsset.vacancy.toFixed(2)}%` : '0.00%'} 
                                    subtext="Imóveis Vagos" 
                                    colorClass={activeAsset.vacancy && activeAsset.vacancy > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}
                                    icon={AlertCircle}
                                />
                                <MetricCard 
                                    label="Liquidez Diária" 
                                    value={activeAsset.liquidity || '-'} 
                                    subtext="Volume Médio" 
                                    icon={Activity}
                                />
                                <MetricCard 
                                    label="Patrimônio Líquido" 
                                    value={activeAsset.assets_value || '-'} 
                                    subtext="Valor dos Ativos" 
                                    icon={Landmark}
                                />
                                <MetricCard 
                                    label="Gestão" 
                                    value={activeAsset.manager_type || '-'} 
                                    subtext="Tipo de Gestão" 
                                    icon={Scale}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Valuation Ações */}
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard 
                                    label="P/L" 
                                    value={activeAsset.p_l !== undefined ? activeAsset.p_l.toFixed(2) : '-'} 
                                    subtext="Anos p/ retorno" 
                                    highlight
                                    icon={Scale}
                                />
                                <MetricCard 
                                    label="P/VP" 
                                    value={activeAsset.p_vp !== undefined ? activeAsset.p_vp.toFixed(2) : '-'} 
                                    subtext="Preço / Patrimônio" 
                                    highlight
                                    icon={Building2}
                                />
                                <MetricCard 
                                    label="LPA" 
                                    value={activeAsset.lpa !== undefined ? `R$ ${activeAsset.lpa.toFixed(2)}` : '-'} 
                                    subtext="Lucro por Ação" 
                                    icon={DollarSign}
                                />
                                <MetricCard 
                                    label="VPA" 
                                    value={activeAsset.vpa !== undefined ? `R$ ${activeAsset.vpa.toFixed(2)}` : '-'} 
                                    subtext="Valor Patrimonial/Ação" 
                                    icon={Banknote}
                                />
                            </div>

                            {/* Eficiência */}
                            <SectionHeader title="Eficiência & Rentabilidade" icon={BarChart3} />
                            <div className="grid grid-cols-3 gap-3">
                                <MetricCard 
                                    label="ROE" 
                                    value={activeAsset.roe !== undefined ? `${activeAsset.roe.toFixed(1)}%` : '-'} 
                                    subtext="Retorno s/ PL" 
                                    colorClass="text-emerald-500"
                                />
                                <MetricCard 
                                    label="Margem Líq." 
                                    value={activeAsset.net_margin !== undefined ? `${activeAsset.net_margin.toFixed(1)}%` : '-'} 
                                    subtext="Lucro / Receita" 
                                />
                                <MetricCard 
                                    label="Div. Yield" 
                                    value={activeAsset.dy_12m !== undefined ? `${activeAsset.dy_12m.toFixed(1)}%` : '-'} 
                                    subtext="12 Meses" 
                                    colorClass="text-indigo-500"
                                />
                            </div>

                            {/* Crescimento e Dívida */}
                            <SectionHeader title="Crescimento & Dívida" icon={LineChart} />
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard 
                                    label="CAGR Lucros (5a)" 
                                    value={activeAsset.cagr_profits !== undefined ? `${activeAsset.cagr_profits.toFixed(1)}%` : '-'} 
                                    subtext="Cresc. Médio Anual" 
                                    icon={TrendingUp}
                                />
                                <MetricCard 
                                    label="Dív. Líq / EBITDA" 
                                    value={activeAsset.net_debt_ebitda !== undefined ? activeAsset.net_debt_ebitda.toFixed(2) : '-'} 
                                    subtext="Alavancagem" 
                                    colorClass={activeAsset.net_debt_ebitda && activeAsset.net_debt_ebitda > 3 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}
                                    icon={AlertCircle}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Fonte e Links */}
                <div className="mt-8 anim-slide-up" style={{ animationDelay: '150ms' }}>
                    <a 
                        href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${activeAsset.ticker.toLowerCase()}/`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-[0.15em] shadow-lg press-effect"
                    >
                        Ver Detalhes no Investidor10 <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
            );
        })()}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
