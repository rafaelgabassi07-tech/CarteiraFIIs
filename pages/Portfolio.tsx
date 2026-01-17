
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

// Tile Compacto para Alta Densidade de Informação
const CompactTile = ({ label, value, sublabel, highlight = false, color = 'zinc', colSpan = 1 }: any) => {
    const hasValue = value !== undefined && value !== null && value !== '' && value !== 'N/A' && value !== 0;
    
    const colors: any = {
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400' },
        rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400' },
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-400' },
        sky: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
        zinc: { bg: 'bg-white dark:bg-zinc-800/50', text: 'text-zinc-900 dark:text-zinc-200' }
    };

    const theme = highlight ? colors[color] : colors.zinc;
    const borderClass = highlight ? `border-${color}-100 dark:border-${color}-900/50` : 'border-zinc-200/50 dark:border-zinc-700/50';

    return (
        <div className={`relative p-2.5 rounded-xl border ${theme.bg} ${borderClass} flex flex-col justify-center transition-all ${colSpan > 1 ? `col-span-${colSpan}` : ''}`}>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5 truncate">{label}</span>
            <span className={`text-sm font-black tracking-tight leading-tight ${theme.text}`}>
                {hasValue ? value : '-'}
            </span>
            {sublabel && hasValue && (
                <span className="text-[8px] font-bold opacity-60 mt-0.5">{sublabel}</span>
            )}
        </div>
    );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
    <div className="flex items-center gap-1.5 mb-2 mt-4 px-1">
        <Icon className="w-3 h-3 text-zinc-400" strokeWidth={2.5} />
        <h3 className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{title}</h3>
    </div>
);

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
            <div className="p-5 pb-16">
                {/* Header Compacto */}
                <div className="flex justify-between items-center mb-6 anim-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 p-1.5 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                            {selectedAsset.logoUrl ? <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-contain" /> : <span className="text-sm font-black text-zinc-400">{selectedAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{selectedAsset.ticker}</h2>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-800'}`}>
                                    {isFII ? 'FII' : 'Ação'}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide truncate max-w-[200px]">{selectedAsset.segment || 'Setor Geral'}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAsset(null)} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Minha Posição (Grid Compacto) */}
                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-800/50 mb-4 anim-slide-up" style={{ animationDelay: '50ms' }}>
                    <div className="flex justify-between items-end mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5">Saldo Atual</span>
                            <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalCurrent, privacyMode)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-0.5">Variação</span>
                            <span className={`text-base font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Qtd</span>
                            <span className="block text-xs font-black text-zinc-900 dark:text-white">{selectedAsset.quantity}</span>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Médio</span>
                            <span className="block text-xs font-black text-zinc-900 dark:text-white">{formatBRL(avgPrice, privacyMode).replace('R$', '')}</span>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Atual</span>
                            <span className="block text-xs font-black text-zinc-900 dark:text-white">{formatBRL(currentPrice, privacyMode).replace('R$', '')}</span>
                        </div>
                        <div className={`text-center p-2 rounded-xl border shadow-sm ${isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'}`}>
                            <span className={`block text-[8px] font-bold uppercase ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>%</span>
                            <span className={`block text-xs font-black ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{formatPercent(totalGainPercent, privacyMode).replace('%','')}</span>
                        </div>
                    </div>
                </div>

                {/* Fundamentos (Grid 3 colunas) */}
                <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <SectionHeader icon={Activity} title="Indicadores de Mercado" />
                    <div className="grid grid-cols-3 gap-2">
                        <CompactTile 
                            label="D.Y. (12m)" 
                            value={selectedAsset.dy_12m ? `${selectedAsset.dy_12m}%` : undefined} 
                            highlight={true} 
                            color="emerald" 
                        />
                        <CompactTile label="P/VP" value={selectedAsset.p_vp} />
                        
                        {isFII ? (
                            <CompactTile 
                                label="Vacância" 
                                value={selectedAsset.vacancy !== undefined ? `${selectedAsset.vacancy}%` : undefined} 
                                highlight={selectedAsset.vacancy === 0} 
                                color={selectedAsset.vacancy === 0 ? 'emerald' : 'rose'} 
                            />
                        ) : (
                            <CompactTile label="P/L" value={selectedAsset.p_l} />
                        )}

                        {isFII ? (
                            <CompactTile label="Últ. Rend." value={selectedAsset.last_dividend ? formatBRL(selectedAsset.last_dividend, false) : undefined} />
                        ) : (
                            <CompactTile label="ROE" value={selectedAsset.roe ? `${selectedAsset.roe}%` : undefined} />
                        )}

                        {isFII ? (
                            <CompactTile label="Patrimônio" value={selectedAsset.assets_value} sublabel="Valor total do Fundo" />
                        ) : (
                            <CompactTile label="Margem Líq." value={selectedAsset.net_margin ? `${selectedAsset.net_margin}%` : undefined} />
                        )}

                        <CompactTile label="Valor Mercado" value={selectedAsset.market_cap} />
                    </div>

                    {!isFII && (selectedAsset.net_debt_ebitda || selectedAsset.ev_ebitda) && (
                        <>
                            <SectionHeader icon={Briefcase} title="Dívida & Valor" />
                            <div className="grid grid-cols-3 gap-2">
                                <CompactTile label="Div.Líq/EBITDA" value={selectedAsset.net_debt_ebitda} />
                                <CompactTile label="EV/EBITDA" value={selectedAsset.ev_ebitda} />
                                <CompactTile label="Payout" value={selectedAsset.payout ? `${selectedAsset.payout}%` : undefined} />
                            </div>
                        </>
                    )}

                    {isFII && (
                        <>
                            <SectionHeader icon={Building2} title="Gestão & Taxas" />
                            <div className="grid grid-cols-2 gap-2">
                                <CompactTile label="Gestão" value={selectedAsset.manager_type} />
                                <CompactTile label="Taxa Adm." value={selectedAsset.management_fee} />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 anim-slide-up" style={{ animationDelay: '200ms' }}>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                            <Info className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Fonte: Investidor10</span>
                        </div>
                        <a 
                            href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${selectedAsset.ticker.toLowerCase()}/`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                        >
                            Ver Site <ExternalLink className="w-3 h-3" />
                        </a>
                     </div>
                </div>
            </div>
            );
        })()}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
