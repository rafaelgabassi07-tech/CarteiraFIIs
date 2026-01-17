
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType } from '../types';
import { Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Building2, Wallet, Target, Activity, ExternalLink, BarChart3, Droplets, PieChart as PieIcon, Info, Percent, Scale, X, Layers, Briefcase, Zap, Coins, Calculator } from 'lucide-react';
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

const formatCompactNumber = (num: number) => {
    if (!num) return '-';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

// Tile Ultra Compacto
const DataTile = ({ label, value, sub, color = 'zinc', highlight = false }: any) => {
    const hasValue = value !== undefined && value !== null && value !== '' && value !== 'N/A' && value !== '0' && value !== 0;
    
    // Tratamento especial para zero em porcentagens (ex: Vacância 0% é bom e é um valor válido)
    const displayValue = hasValue ? value : '-';
    
    const colors: any = {
        emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
        rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
        indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
        zinc: 'bg-white dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-200 border-zinc-200/50 dark:border-zinc-700/50'
    };

    const themeClass = highlight ? colors[color] : colors.zinc;

    return (
        <div className={`p-2.5 rounded-xl border flex flex-col justify-center min-h-[64px] ${themeClass}`}>
            <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider truncate leading-none mb-1">{label}</span>
            <span className="text-sm font-black tracking-tight leading-none">{displayValue}</span>
            {sub && <span className="text-[8px] font-bold opacity-50 mt-0.5 leading-none">{sub}</span>}
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
      {/* Search Bar - Mantida igual pois é funcional */}
      <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-3">
            <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
                <input 
                    type="text" 
                    placeholder="Buscar ativo..." 
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
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">{filteredAssets.length} Ativos</div>
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
            const totalCost = avgPrice * selectedAsset.quantity;
            const totalGainValue = totalCurrent - totalCost;
            const totalGainPercent = totalCost > 0 ? (totalGainValue / totalCost) * 100 : 0;
            const isPositive = totalGainValue >= 0;
            const isFII = selectedAsset.assetType === AssetType.FII;

            // Extração segura de dados
            const pvp = selectedAsset.p_vp || 0;
            const dy = selectedAsset.dy_12m || 0;
            const pl = selectedAsset.p_l || 0;
            const roe = selectedAsset.roe || 0;
            const vacancia = selectedAsset.vacancy; // Pode ser 0
            const valMercado = selectedAsset.market_cap;
            const divLiqEbitda = selectedAsset.net_debt_ebitda;
            const lastDiv = selectedAsset.last_dividend;

            return (
            <div className="p-5 pb-16 bg-zinc-50 dark:bg-black min-h-full">
                
                {/* 1. Header Minimalista */}
                <div className="flex justify-between items-start mb-6 anim-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shadow-sm">
                            {selectedAsset.logoUrl ? <img src={selectedAsset.logoUrl} className="w-full h-full object-contain p-1" /> : <span className="text-xs font-black text-zinc-400">{selectedAsset.ticker.substring(0,2)}</span>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{selectedAsset.ticker}</h1>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200 dark:border-indigo-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-200 dark:border-sky-800'}`}>
                                    {isFII ? 'FII' : 'Ação'}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{selectedAsset.segment || 'Geral'}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAsset(null)} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 2. Posição do Usuário (Compacto) */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-800 shadow-sm mb-5 anim-slide-up" style={{ animationDelay: '50ms' }}>
                    <div className="flex justify-between items-end mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Saldo Bruto</p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{formatBRL(totalCurrent, privacyMode)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Resultado</p>
                            <div className={`flex items-center justify-end gap-1 font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                <span className="text-sm">{isPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}</span>
                                <span className="text-[10px] opacity-80 bg-current/10 px-1 rounded">
                                    {formatPercent(totalGainPercent, privacyMode).replace('+', '')}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between gap-2 text-center">
                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Preço Médio</span>
                            <span className="block text-xs font-black text-zinc-700 dark:text-zinc-300">{formatBRL(avgPrice, privacyMode)}</span>
                        </div>
                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Cotação</span>
                            <span className="block text-xs font-black text-zinc-900 dark:text-white">{formatBRL(currentPrice, privacyMode)}</span>
                        </div>
                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Quantidade</span>
                            <span className="block text-xs font-black text-zinc-900 dark:text-white">{selectedAsset.quantity}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Fundamentos (Bento Grid) */}
                <div className="anim-slide-up space-y-4" style={{ animationDelay: '100ms' }}>
                    
                    {/* Linha 1: Essenciais */}
                    <div>
                        <h3 className="px-1 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Valuation & Retorno
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            <DataTile 
                                label="Div. Yield (12m)" 
                                value={dy ? `${dy}%` : undefined} 
                                highlight={dy > 6} 
                                color="emerald" 
                            />
                            <DataTile 
                                label="P/VP" 
                                value={pvp} 
                                highlight={pvp > 0 && pvp < 1} 
                                color="indigo" 
                            />
                            {isFII ? (
                                <DataTile 
                                    label="Último Rend." 
                                    value={lastDiv ? formatBRL(lastDiv, false) : undefined} 
                                />
                            ) : (
                                <DataTile label="P/L" value={pl} />
                            )}
                        </div>
                    </div>

                    {/* Linha 2: Métricas Específicas */}
                    <div>
                        <h3 className="px-1 mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {isFII ? 'Imóvel & Gestão' : 'Eficiência & Dívida'}
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {isFII ? (
                                <>
                                    <DataTile 
                                        label="Vacância" 
                                        value={vacancia !== undefined ? `${vacancia}%` : undefined} 
                                        highlight={vacancia === 0} 
                                        color={vacancia === 0 ? 'emerald' : 'rose'} 
                                    />
                                    <DataTile label="Valor Patrim." value={selectedAsset.assets_value} sub="Total Fundo" />
                                    <DataTile label="Gestão" value={selectedAsset.manager_type} />
                                </>
                            ) : (
                                <>
                                    <DataTile label="ROE" value={roe ? `${roe}%` : undefined} />
                                    <DataTile label="Margem Líq." value={selectedAsset.net_margin ? `${selectedAsset.net_margin}%` : undefined} />
                                    <DataTile label="Dív.Liq/EBITDA" value={divLiqEbitda} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Linha 3: Extras */}
                    <div className="grid grid-cols-2 gap-2">
                        <DataTile label="Valor Mercado" value={valMercado} />
                        <DataTile label="Liquidez Diária" value={selectedAsset.liquidity} />
                    </div>

                    {/* Botão Externo */}
                    <a 
                        href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${selectedAsset.ticker.toLowerCase()}/`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full p-3 mt-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Ver Detalhes Completos <ExternalLink className="w-3 h-3" />
                    </a>
                    
                    <div className="text-center">
                        <p className="text-[9px] text-zinc-400">Dados fornecidos por Gemini 2.5 Flash via Google Search</p>
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
