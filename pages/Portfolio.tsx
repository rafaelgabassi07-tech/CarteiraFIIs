
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, ExternalLink, X, TrendingUp, TrendingDown, Building2, BarChart3, Activity, Scale, Percent, AlertCircle, Banknote, Landmark, LineChart, DollarSign, PieChart, Users, ArrowUpRight, BarChart as BarChartIcon, Gem, Calendar } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
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

// --- COMPONENTES INTERNOS ---

const InfoRow = ({ label, value, subValue, highlight }: any) => (
    <div className={`flex justify-between items-center py-4 border-b border-zinc-100 dark:border-zinc-800 ${highlight ? 'bg-zinc-50/50 dark:bg-zinc-900/50 -mx-4 px-4' : ''}`}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
        <div className="text-right">
            <span className={`block text-sm font-bold ${highlight ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{value}</span>
            {subValue && <span className="block text-[10px] text-zinc-400 font-medium">{subValue}</span>}
        </div>
    </div>
);

const BigStat = ({ label, value, colorClass }: any) => (
    <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className={`text-xl font-black tracking-tight ${colorClass || 'text-zinc-900 dark:text-white'}`}>{value}</p>
    </div>
);

// --- MODAL DE DETALHES ---
const AssetDetailView = ({ asset, dividends, privacyMode, onClose }: { asset: AssetPosition, dividends: DividendReceipt[], privacyMode: boolean, onClose: () => void }) => {
    const [tab, setTab] = useState<'VISAO' | 'FUNDAMENTOS' | 'PROVENTOS'>('VISAO');
    const isFII = asset.assetType === AssetType.FII;

    // Cálculos de Posição
    const currentTotal = (asset.currentPrice || 0) * asset.quantity;
    const costTotal = asset.averagePrice * asset.quantity;
    const gainValue = currentTotal - costTotal;
    const gainPercent = costTotal > 0 ? (gainValue / costTotal) * 100 : 0;
    const isPositive = gainValue >= 0;

    // Dados de Gráfico (Proventos)
    const monthlyDividends = useMemo(() => {
        if (!dividends) return [];
        const last12 = dividends
            .filter(d => d.ticker.includes(asset.ticker.substring(0,4))) // Match flexível
            .sort((a,b) => a.paymentDate.localeCompare(b.paymentDate))
            .slice(-12);
        
        return last12.map(d => ({
            date: d.paymentDate.substring(0, 7), // YYYY-MM
            val: d.rate
        }));
    }, [asset, dividends]);

    return (
        <div className="bg-white dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header Clean */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 pt-safe px-6 pb-4">
                <div className="flex items-center justify-between mb-6 pt-2">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border shadow-sm ${isFII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                            {asset.ticker.substring(0, 2)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{asset.ticker}</h1>
                            <p className="text-xs font-medium text-zinc-400">{asset.segment || (isFII ? 'Fundo Imobiliário' : 'Ação')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>

                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                    {['VISAO', 'FUNDAMENTOS', 'PROVENTOS'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTab(t as any)}
                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${tab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {t === 'VISAO' ? 'Minha Posição' : t === 'PROVENTOS' ? 'Proventos' : 'Indicadores'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">
                
                {tab === 'VISAO' && (
                    <div className="space-y-8 anim-fade-in">
                        {/* Cartão Principal */}
                        <div className="text-center py-6">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Patrimônio Atual</p>
                            <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
                                {formatBRL(currentTotal, privacyMode)}
                            </h2>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {isPositive ? '+' : ''}{formatBRL(gainValue, privacyMode)} ({formatPercent(gainPercent, privacyMode)})
                            </div>
                        </div>

                        {/* Grid de Dados da Posição */}
                        <div className="grid grid-cols-2 gap-4">
                            <BigStat label="Preço Médio" value={formatBRL(asset.averagePrice, privacyMode)} />
                            <BigStat label="Cotação Atual" value={formatBRL(asset.currentPrice || 0, privacyMode)} colorClass={asset.dailyChange && asset.dailyChange > 0 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'} />
                            <BigStat label="Quantidade" value={asset.quantity} />
                            <BigStat label="Total Retorno" value={formatBRL(gainValue + (asset.totalDividends || 0), privacyMode)} colorClass="text-indigo-500" />
                        </div>

                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Estrutura</h3>
                            <InfoRow label="Custo de Aquisição" value={formatBRL(costTotal, privacyMode)} />
                            <InfoRow label="Proventos Acumulados" value={formatBRL(asset.totalDividends || 0, privacyMode)} />
                            <InfoRow label="Yield on Cost" value={`${((asset.totalDividends || 0) / (costTotal || 1) * 100).toFixed(2)}%`} highlight />
                        </div>
                    </div>
                )}

                {tab === 'FUNDAMENTOS' && (
                    <div className="space-y-8 anim-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <BigStat 
                                label="P/VP" 
                                value={asset.p_vp?.toFixed(2) || '-'} 
                                colorClass={asset.p_vp && asset.p_vp < 1 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'} 
                            />
                            <BigStat 
                                label="Dividend Yield" 
                                value={asset.dy_12m ? `${asset.dy_12m.toFixed(2)}%` : '-'} 
                                colorClass="text-emerald-500" 
                            />
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Valuation & Preço</h3>
                            <InfoRow label="Valor Patrimonial (VP)" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} />
                            {!isFII && <InfoRow label="P/L (Preço/Lucro)" value={asset.p_l?.toFixed(2) || '-'} />}
                            {!isFII && <InfoRow label="LPA (Lucro/Ação)" value={asset.lpa ? `R$ ${asset.lpa.toFixed(2)}` : '-'} />}
                            <InfoRow label="Valor de Mercado" value={asset.market_cap || '-'} />
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{isFII ? 'Qualidade & Imóveis' : 'Eficiência & Dívida'}</h3>
                            {isFII ? (
                                <>
                                    <InfoRow label="Vacância Física" value={asset.vacancy ? `${asset.vacancy}%` : '0%'} highlight={asset.vacancy && asset.vacancy > 10} />
                                    <InfoRow label="Liquidez Diária" value={asset.liquidity || '-'} />
                                    <InfoRow label="Patrimônio Líquido" value={asset.assets_value || '-'} />
                                    <InfoRow label="Nº Cotistas" value={asset.properties_count || '-'} />
                                </>
                            ) : (
                                <>
                                    <InfoRow label="ROE" value={asset.roe ? `${asset.roe}%` : '-'} />
                                    <InfoRow label="Margem Líquida" value={asset.net_margin ? `${asset.net_margin}%` : '-'} />
                                    <InfoRow label="Dív. Líq / EBITDA" value={asset.net_debt_ebitda?.toFixed(2) || '-'} />
                                    <InfoRow label="CAGR Lucros (5a)" value={asset.cagr_profits ? `${asset.cagr_profits}%` : '-'} />
                                </>
                            )}
                        </div>

                        <a 
                            href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest press-effect"
                        >
                            Ver no Investidor10 <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}

                {tab === 'PROVENTOS' && (
                    <div className="space-y-8 anim-fade-in">
                        <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Último Pagamento</p>
                            <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                                {asset.last_dividend ? `R$ ${asset.last_dividend.toFixed(2)}` : '-'}
                            </h3>
                            <p className="text-[10px] text-zinc-400 mt-2">Por cota/ação</p>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Histórico Recente</h3>
                            {monthlyDividends.length > 0 ? (
                                <div className="space-y-2">
                                    {monthlyDividends.slice().reverse().map((d, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">{d.date}</span>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">R$ {d.val.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-zinc-400 text-xs">
                                    Sem histórico registrado.
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false }) => {
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
      {/* Search Bar Refinada e Sólida */}
      <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-2">
        <div className="flex flex-col gap-3 pb-2">
            <div className="relative flex items-center group">
                <Search className="w-4 h-4 absolute left-4 text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filtrar por nome ou ticker..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                />
            </div>
            <div className="flex items-center justify-between px-1">
                <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl relative">
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`}
                        style={{ 
                            left: '4px',
                            transform: `translateX(${filterType === 'ALL' ? '0%' : filterType === AssetType.FII ? '100%' : '200%'})`
                        }}
                    ></div>
                    <button onClick={() => setFilterType('ALL')} className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${filterType === 'ALL' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Tudo</button>
                    <button onClick={() => setFilterType(AssetType.FII)} className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${filterType === AssetType.FII ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>FIIs</button>
                    <button onClick={() => setFilterType(AssetType.STOCK)} className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${filterType === AssetType.STOCK ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Ações</button>
                </div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{filteredAssets.length} Ativos</div>
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
                const isFII = asset.assetType === AssetType.FII;
                const showLogo = asset.logoUrl && !isFII;

                return (
                    <button key={asset.ticker} onClick={() => setSelectedTicker(asset.ticker)} className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 anim-stagger-item transition-all" style={{ animationDelay: `${index * 40}ms` }}>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {showLogo ? (
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden p-1">
                                        <img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border text-xs font-black shadow-sm ${asset.assetType === AssetType.FII ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/10 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>{asset.ticker.substring(0, 2)}</div>
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
                <Gem className="w-12 h-12 mb-4 text-zinc-300 anim-float" strokeWidth={1.5} />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nenhum ativo encontrado</p>
            </div>
        )}
      </div>

      <SwipeableModal isOpen={!!activeAsset} onClose={() => setSelectedTicker(null)}>
        {activeAsset && <AssetDetailView asset={activeAsset} dividends={dividends} privacyMode={privacyMode} onClose={() => setSelectedTicker(null)} />}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
