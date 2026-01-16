
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Building2, Wallet, Target, Activity, ExternalLink, BarChart3, Droplets, PieChart as PieIcon, Info, Percent, Scale, X, Layers, Briefcase, Zap, Coins } from 'lucide-react';
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

// Tile de Indicador Premium
const IndicatorTile = ({ label, value, sublabel, highlight = false, icon: Icon, color = 'emerald' }: any) => {
    const hasValue = value !== undefined && value !== null && value !== '' && value !== 'N/A' && value !== 0;
    
    // Mapeamento de cores
    const colors: any = {
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-500' },
        sky: { bg: 'bg-sky-50 dark:bg-sky-950/20', border: 'border-sky-100 dark:border-sky-900/30', text: 'text-sky-700 dark:text-sky-400', icon: 'text-sky-500' },
        rose: { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-100 dark:border-rose-900/30', text: 'text-rose-700 dark:text-rose-400', icon: 'text-rose-500' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-100 dark:border-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', icon: 'text-indigo-500' },
        zinc: { bg: 'bg-white dark:bg-zinc-900', border: 'border-zinc-100 dark:border-zinc-800', text: 'text-zinc-900 dark:text-white', icon: 'text-zinc-300' }
    };

    const theme = highlight ? colors[color] : colors.zinc;

    return (
        <div className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all ${theme.bg} ${theme.border}`}>
            {highlight && <div className="absolute top-0 right-0 p-2 opacity-10"><Icon className={`w-12 h-12 ${theme.icon}`} /></div>}
            
            <div className="flex justify-between items-start mb-1.5 relative z-10">
                <span className={`text-[9px] font-black uppercase tracking-widest ${highlight ? theme.text : 'text-zinc-400'}`}>{label}</span>
                {!highlight && Icon && <Icon className="w-3.5 h-3.5 text-zinc-300" />}
            </div>
            
            <div className="relative z-10">
                <span className={`text-lg font-black tracking-tighter block ${theme.text}`}>
                    {hasValue ? value : '-'}
                </span>
                {sublabel && hasValue && (
                    <span className={`text-[9px] font-bold mt-0.5 block ${highlight ? theme.text : 'text-zinc-400'} opacity-70`}>{sublabel}</span>
                )}
            </div>
        </div>
    );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, privacyMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | AssetType>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);

  const filteredAssets = useMemo(() => {
    return portfolio
      .filter(p => {
        const matchesSearch = p.ticker.includes(searchTerm.toUpperCase()) || (p.segment || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || p.assetType === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => (b.currentPrice || 0) * b.quantity - (a.currentPrice || 0) * a.quantity); 
  }, [portfolio, searchTerm, filterType]);

  return (
    <div className="pb-32 min-h-screen">
      {/* Search Bar Blindada */}
      <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-3">
            <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Ativo ou setor..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-accent/10 transition-all shadow-inner"
                />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Tudo</button>
                    <button onClick={() => setFilterType(AssetType.FII)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.FII ? 'bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm' : 'text-zinc-400'}`}>FIIs</button>
                    <button onClick={() => setFilterType(AssetType.STOCK)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === AssetType.STOCK ? 'bg-white dark:bg-zinc-800 text-sky-500 shadow-sm' : 'text-zinc-400'}`}>Ações</button>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">{filteredAssets.length} Itens</div>
            </div>
        </div>
      </div>

      <div className="space-y-2 px-1 pt-4">
        {filteredAssets.length > 0 ? (
            filteredAssets.map((asset, index) => {
                const currentPrice = asset.currentPrice || 0;
                const totalValue = currentPrice * asset.quantity;
                const totalGainValue = (currentPrice - asset.averagePrice) * asset.quantity;
                const isPositive = totalGainValue >= 0;

                return (
                    <button key={asset.ticker} onClick={() => setSelectedAsset(asset)} className="w-full bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item" style={{ animationDelay: `${index * 40}ms` }}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {asset.logoUrl ? (
                                    <div className="w-12 h-12 rounded-2xl bg-white p-1.5 border border-zinc-50 shadow-sm flex items-center justify-center overflow-hidden"><img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" /></div>
                                ) : (
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>{asset.ticker.substring(0, 2)}</div>
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">{asset.ticker} <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded tracking-tighter">{asset.quantity} un</span></h3>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px]">{asset.segment || 'Geral'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                            <div className={`flex items-center justify-end gap-1 text-[10px] font-black mt-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {formatBRL(Math.abs(totalGainValue), privacyMode)}
                            </div>
                        </div>
                    </button>
                );
            })
        ) : (
            <div className="text-center py-20 opacity-30 anim-fade-in">
                <Search className="w-16 h-16 mx-auto mb-4 text-zinc-400" strokeWidth={1} />
                <p className="text-sm font-black uppercase tracking-widest">Nenhum ativo encontrado</p>
            </div>
        )}
        <div className="h-24"></div>
      </div>

      <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
        {selectedAsset && (() => {
            const currentPrice = selectedAsset.currentPrice || 0;
            const avgPrice = selectedAsset.averagePrice || 0;
            const totalCurrent = currentPrice * selectedAsset.quantity;
            const totalGainValue = (currentPrice - avgPrice) * selectedAsset.quantity;
            const totalGainPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
            const isPositive = totalGainValue >= 0;
            const isFII = selectedAsset.assetType === AssetType.FII;

            return (
            <div className="p-6 pb-20">
                {/* Header do Ativo */}
                <div className="flex justify-between items-start mb-8 anim-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 p-2 shadow-xl border border-zinc-100 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                            {selectedAsset.logoUrl ? <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-contain" /> : <span className="text-2xl font-black text-zinc-200 dark:text-zinc-700">{selectedAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{selectedAsset.ticker}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600'}`}>
                                    {isFII ? 'Fundo Imobiliário' : 'Ação'}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[150px]">{selectedAsset.segment || 'Setor Geral'}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAsset(null)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Card de Rentabilidade */}
                <div className="mb-6 p-6 bg-zinc-900 dark:bg-white rounded-[2rem] text-white dark:text-zinc-900 shadow-2xl relative overflow-hidden anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="absolute top-0 right-0 p-8 opacity-10"><BarChart3 className="w-24 h-24" /></div>
                    <div className="relative z-10 grid grid-cols-2 gap-6">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block mb-1">Lucro / Prejuízo</span>
                            <p className={`text-2xl font-black tracking-tight ${isPositive ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>
                                {isPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}
                            </p>
                            <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black ${isPositive ? 'bg-emerald-500/20 text-emerald-300 dark:text-emerald-700' : 'bg-rose-500/20 text-rose-300 dark:text-rose-700'}`}>
                                {formatPercent(totalGainPercent, privacyMode)}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block mb-1">Total Atual</span>
                            <p className="text-2xl font-black tracking-tight tabular-nums">{formatBRL(totalCurrent, privacyMode)}</p>
                            <p className="text-[10px] font-bold opacity-60 mt-2">Médio: {formatBRL(selectedAsset.averagePrice, privacyMode)}</p>
                        </div>
                    </div>
                </div>

                {/* --- SEÇÕES DE FUNDAMENTOS --- */}
                
                {/* 1. Destaques (Valuation e Dividendos) */}
                <div className="mb-6 anim-slide-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Activity className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Valuation & Dividendos</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <IndicatorTile 
                            label="Dividend Yield" 
                            value={selectedAsset.dy_12m ? `${selectedAsset.dy_12m}%` : undefined} 
                            sublabel="Últimos 12m" 
                            highlight={true} 
                            color="emerald"
                            icon={Percent} 
                        />
                        <IndicatorTile 
                            label="P/VP" 
                            value={selectedAsset.p_vp} 
                            sublabel={selectedAsset.p_vp ? (selectedAsset.p_vp < 1 ? 'Desconto' : 'Ágio') : ''} 
                            icon={Scale} 
                        />
                        {!isFII && (
                            <IndicatorTile 
                                label="P/L" 
                                value={selectedAsset.p_l} 
                                sublabel="Preço / Lucro" 
                                icon={Activity} 
                            />
                        )}
                        {!isFII && (
                            <IndicatorTile 
                                label="EV / EBITDA" 
                                value={selectedAsset.ev_ebitda} 
                                icon={Zap} 
                            />
                        )}
                        {selectedAsset.market_cap && (
                            <div className="col-span-2 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 flex justify-between items-center">
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Valor de Mercado</span>
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{selectedAsset.market_cap}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Eficiência e Crescimento (Apenas Ações) */}
                {!isFII && (
                    <div className="mb-6 anim-slide-up" style={{ animationDelay: '250ms' }}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <TrendingUp className="w-4 h-4 text-zinc-400" />
                            <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Eficiência</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <IndicatorTile label="ROE" value={selectedAsset.roe ? `${selectedAsset.roe}%` : undefined} />
                            <IndicatorTile label="Mg. Líq." value={selectedAsset.net_margin ? `${selectedAsset.net_margin}%` : undefined} />
                            <IndicatorTile label="Mg. Bruta" value={selectedAsset.gross_margin ? `${selectedAsset.gross_margin}%` : undefined} />
                        </div>
                        {(selectedAsset.cagr_revenue || selectedAsset.cagr_profits) && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <IndicatorTile label="CAGR Rec. (5a)" value={selectedAsset.cagr_revenue ? `${selectedAsset.cagr_revenue}%` : undefined} color="sky" highlight={true} icon={TrendingUp} />
                                <IndicatorTile label="CAGR Lucro (5a)" value={selectedAsset.cagr_profits ? `${selectedAsset.cagr_profits}%` : undefined} color="sky" highlight={true} icon={Coins} />
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Dívida (Apenas Ações) */}
                {!isFII && (
                    <div className="mb-6 anim-slide-up" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Briefcase className="w-4 h-4 text-zinc-400" />
                            <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Endividamento</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <IndicatorTile label="Dív. Líq / PL" value={selectedAsset.net_debt_equity} />
                            <IndicatorTile label="Dív. Líq / EBITDA" value={selectedAsset.net_debt_ebitda} />
                        </div>
                    </div>
                )}

                {/* 4. Dados do Fundo (Apenas FIIs) */}
                {isFII && (
                    <div className="mb-6 anim-slide-up" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Building2 className="w-4 h-4 text-zinc-400" />
                            <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Imóvel & Gestão</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <IndicatorTile 
                                label="Vacância Física" 
                                value={selectedAsset.vacancy !== undefined ? `${selectedAsset.vacancy}%` : undefined} 
                                highlight={true} 
                                color="rose"
                                icon={Building2} 
                            />
                            <IndicatorTile 
                                label="Liquidez Diária" 
                                value={selectedAsset.liquidity} 
                                icon={Droplets} 
                            />
                            <IndicatorTile label="Patrimônio" value={selectedAsset.assets_value} />
                            <IndicatorTile label="Taxa Adm." value={selectedAsset.management_fee} />
                            <div className="col-span-2 grid grid-cols-2 gap-3">
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Gestão</span>
                                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{selectedAsset.manager_type || '-'}</p>
                                </div>
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                                    <span className="text-[9px] font-black text-zinc-400 uppercase">Últ. Rend.</span>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{selectedAsset.last_dividend ? formatBRL(selectedAsset.last_dividend, false) : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '400ms' }}>
                     <div className="flex items-center gap-2 mb-4">
                         <Info className="w-4 h-4 text-zinc-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fonte de Dados</span>
                     </div>
                     <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">
                        Dados extraídos automaticamente do Investidor10. Cotações em tempo real via B3.
                     </p>
                     <a 
                        href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${selectedAsset.ticker.toLowerCase()}/`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 px-4 py-4 rounded-2xl shadow-lg press-effect"
                     >
                        <ExternalLink className="w-3 h-3" /> Ver Detalhes no Site
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
