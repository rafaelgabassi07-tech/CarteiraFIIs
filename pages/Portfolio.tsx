
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, ExternalLink, X, TrendingUp, TrendingDown, Building2, BarChart3, Activity, Scale, Percent, AlertCircle, Banknote, Landmark, LineChart, DollarSign, PieChart, Users, ArrowUpRight, BarChart as BarChartIcon, Gem } from 'lucide-react';
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

// --- COMPONENTES VISUAIS AUXILIARES ---

const StatBox = ({ label, value, subtext, colorClass, icon: Icon, highlight = false }: any) => (
    <div className={`p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${highlight ? 'bg-white dark:bg-zinc-800 shadow-md border border-zinc-200 dark:border-zinc-700' : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800'}`}>
        <div className="flex items-start justify-between mb-3">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
            {Icon && <div className={`p-1.5 rounded-lg ${colorClass ? 'bg-current opacity-10' : 'bg-zinc-200 dark:bg-zinc-700'}`}><Icon className={`w-3.5 h-3.5 ${colorClass ? colorClass.split(' ')[0] : 'text-zinc-400'}`} /></div>}
        </div>
        <div>
            <span className={`text-xl font-black tracking-tight leading-none block ${colorClass || 'text-zinc-900 dark:text-white'}`}>
                {value !== undefined && value !== null && value !== '' ? value : '-'}
            </span>
            {subtext && <span className="text-[9px] font-bold text-zinc-400 mt-1 block">{subtext}</span>}
        </div>
    </div>
);

const DetailRow = ({ label, value, highlight = false, isLast = false }: any) => (
    <div className={`flex justify-between items-center py-3.5 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <span className={`text-sm font-bold text-right ${highlight ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-400'}`}>
            {value || '-'}
        </span>
    </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="flex items-center gap-2 mb-4 mt-8 px-1">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-zinc-500 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{title}</h3>
    </div>
);

// --- COMPONENTE INTERNO DO MODAL ---
const AssetDetailView = ({ asset, dividends, privacyMode, onClose }: { asset: AssetPosition, dividends: DividendReceipt[], privacyMode: boolean, onClose: () => void }) => {
    const [divRange, setDivRange] = useState<'3M' | '6M' | '12M'>('12M');

    const currentPrice = asset.currentPrice || 0;
    const avgPrice = asset.averagePrice || 0;
    const totalCurrent = currentPrice * asset.quantity;
    const totalCost = avgPrice * asset.quantity;
    const totalGainValue = totalCurrent - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGainValue / totalCost) * 100 : 0;
    const isPositive = totalGainValue >= 0;
    const isFII = asset.assetType === AssetType.FII;

    // Cálculo da Barra de Preço (Simulada para estética, idealmente usaria min/max 52 semanas)
    const priceRangeMin = Math.min(avgPrice, currentPrice) * 0.9;
    const priceRangeMax = Math.max(avgPrice, currentPrice) * 1.1;
    const pricePosition = ((currentPrice - priceRangeMin) / (priceRangeMax - priceRangeMin)) * 100;

    // Cálculo de Histórico Mensal
    const monthlyDividends = useMemo(() => {
        if (!asset || !dividends) return [];
        
        const now = new Date();
        const monthsBack = divRange === '3M' ? 3 : divRange === '6M' ? 6 : 12;
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
        
        let targetTicker = asset.ticker.trim().toUpperCase();
        if (targetTicker.endsWith('F') && !targetTicker.endsWith('11F') && targetTicker.length <= 6) {
            targetTicker = targetTicker.slice(0, -1);
        }

        const filtered = dividends.filter(d => {
            if (!d.paymentDate || !d.ticker) return false;
            if (d.ticker.trim().toUpperCase() !== targetTicker) return false;
            const pDate = new Date(d.paymentDate);
            pDate.setUTCHours(12); 
            return pDate >= cutoffDate;
        });

        const grouped: Record<string, number> = {};
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7); 
            grouped[key] = 0;
        }

        filtered.forEach(d => {
            const key = d.paymentDate.slice(0, 7);
            if (grouped[key] !== undefined) {
                const rate = typeof d.rate === 'number' ? d.rate : parseFloat(String(d.rate).replace(',', '.')) || 0;
                grouped[key] += rate;
            }
        });

        return Object.entries(grouped)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, val]) => {
                const [y, m] = key.split('-');
                const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                return {
                    name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                    fullDate: key,
                    value: val
                };
            });
    }, [asset, dividends, divRange]);

    const totalInPeriod = monthlyDividends.reduce((acc, curr) => acc + curr.value, 0);
    const averageInPeriod = monthlyDividends.length > 0 ? totalInPeriod / monthlyDividends.length : 0;
    const chartColor = isFII ? '#6366f1' : '#0ea5e9';

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full pb-20">
            {/* Premium Sticky Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe pb-4 px-4 transition-all shadow-sm">
                <div className="flex justify-between items-center max-w-xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-[3px] text-xs font-black shadow-lg overflow-hidden shrink-0 ${asset.logoUrl && !isFII ? 'bg-white border-white dark:border-zinc-700' : (isFII ? 'bg-indigo-500 text-white border-indigo-200 dark:border-indigo-900' : 'bg-sky-500 text-white border-sky-200 dark:border-sky-900')}`}>
                            {asset.logoUrl && !isFII ? <img src={asset.logoUrl} className="w-full h-full object-cover" /> : asset.ticker.substring(0,2)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{asset.ticker}</h1>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 truncate max-w-[200px]">{asset.segment}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors press-effect">
                        <X className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            <div className="p-5 max-w-xl mx-auto space-y-8">
                
                {/* Bloco 1: Minha Posição (Cartão Premium) */}
                <div className="anim-slide-up">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-black rounded-[2.5rem] p-7 shadow-2xl relative overflow-hidden text-white border border-white/10 group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
                        
                        <div className="relative z-10 flex justify-between items-start mb-8">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Patrimônio</p>
                                <p className="text-4xl font-black tracking-tighter">{formatBRL(totalCurrent, privacyMode)}</p>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex flex-col items-end font-bold px-3 py-1.5 rounded-xl border border-white/10 ${isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    <span className="text-lg leading-none mb-0.5">{isPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}</span>
                                    <span className="text-[10px] opacity-80">{formatPercent(totalGainPercent, privacyMode)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Preço Visual */}
                        <div className="relative z-10 mb-6">
                            <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                                <span>Médio {formatBRL(avgPrice, privacyMode)}</span>
                                <span>Atual {formatBRL(currentPrice, privacyMode)}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                                <div className={`absolute top-0 bottom-0 w-full bg-gradient-to-r from-emerald-500/30 via-zinc-500/10 to-rose-500/30`}></div>
                                <div 
                                    className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-[0_0_10px_white]" 
                                    style={{ left: `${Math.min(Math.max(pricePosition, 0), 100)}%` }} 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Preço Médio</p>
                                <p className="text-xl font-black tracking-tight">{formatBRL(avgPrice, privacyMode)}</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 text-right">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Quantidade</p>
                                <p className="text-xl font-black tracking-tight">{asset.quantity}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bloco 2: Fundamentos */}
                <div className="space-y-8">
                    {isFII ? (
                        <>
                            <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
                                <SectionTitle title="Valuation" icon={Scale} />
                                <div className="grid grid-cols-2 gap-4">
                                    <StatBox label="Dividend Yield (12m)" value={asset.dy_12m ? `${asset.dy_12m.toFixed(2)}%` : '-'} subtext="Isento de IR" highlight colorClass="text-emerald-600 dark:text-emerald-400" icon={Percent} />
                                    <StatBox label="P/VP" value={asset.p_vp?.toFixed(2)} subtext={asset.p_vp && asset.p_vp < 1 ? 'Descontado' : asset.p_vp && asset.p_vp > 1.1 ? 'Ágio' : 'Preço Justo'} highlight colorClass={asset.p_vp && asset.p_vp <= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'} icon={Activity} />
                                    <StatBox label="Último Rendimento" value={asset.last_dividend ? `R$ ${asset.last_dividend.toFixed(2)}` : '-'} subtext="Por cota" icon={DollarSign} />
                                    <StatBox label="Valor Patrimonial" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} subtext="VP por cota" icon={Building2} />
                                </div>
                            </div>

                            <div className="anim-stagger-item" style={{ animationDelay: '150ms' }}>
                                <SectionTitle title="Qualidade & Risco" icon={AlertCircle} />
                                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    <DetailRow label="Patrimônio Líquido" value={asset.assets_value} highlight />
                                    <DetailRow label="Vacância Física" value={asset.vacancy !== undefined ? `${asset.vacancy}%` : '-'} highlight={asset.vacancy && asset.vacancy > 0} />
                                    <DetailRow label="Liquidez Diária" value={asset.liquidity} />
                                    <DetailRow label="Gestão" value={asset.manager_type} isLast />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
                                <SectionTitle title="Indicadores de Preço" icon={Scale} />
                                <div className="grid grid-cols-2 gap-4">
                                    <StatBox label="P/L" value={asset.p_l?.toFixed(2)} subtext="Anos retorno" highlight icon={Activity} />
                                    <StatBox label="P/VP" value={asset.p_vp?.toFixed(2)} subtext="Preço/Patrimônio" highlight icon={Building2} />
                                    <StatBox label="LPA" value={asset.lpa ? `R$ ${asset.lpa.toFixed(2)}` : '-'} subtext="Lucro/Ação" icon={DollarSign} />
                                    <StatBox label="VPA" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} subtext="Valor/Ação" icon={Banknote} />
                                </div>
                            </div>

                            <div className="anim-stagger-item" style={{ animationDelay: '150ms' }}>
                                <SectionTitle title="Eficiência da Empresa" icon={BarChart3} />
                                <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{asset.roe ? asset.roe.toFixed(0) : '-'}%</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ROE</p>
                                        </div>
                                        <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 flex items-center justify-center mx-auto mb-2">
                                                <span className="text-[10px] font-black text-sky-600 dark:text-sky-400">{asset.net_margin ? asset.net_margin.toFixed(0) : '-'}%</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Mg. Líq.</p>
                                        </div>
                                        <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800"></div>
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 flex items-center justify-center mx-auto mb-2">
                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{asset.cagr_profits ? asset.cagr_profits.toFixed(0) : '-'}%</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">CAGR</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
                                        <DetailRow label="Div. Yield (12m)" value={asset.dy_12m ? `${asset.dy_12m.toFixed(1)}%` : '-'} />
                                        <DetailRow label="Dív. Líq / EBITDA" value={asset.net_debt_ebitda?.toFixed(2)} isLast />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Bloco 3: Histórico de Proventos Mensal */}
                <div className="anim-stagger-item" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center justify-between mb-4 mt-8 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm border border-zinc-200 dark:border-zinc-700">
                                <BarChartIcon className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Proventos (1 Cota)</h3>
                        </div>
                        
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            {(['3M', '6M', '12M'] as const).map((range) => (
                                <button key={range} onClick={() => setDivRange(range)} className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all press-effect ${divRange === range ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{range}</button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                        {monthlyDividends.length > 0 ? (
                            <>
                                <div className="flex justify-between items-end mb-6 relative z-10">
                                    <div>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Acumulado</p>
                                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalInPeriod, privacyMode)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Média Mensal</p>
                                        <p className={`text-lg font-black ${isFII ? 'text-indigo-500' : 'text-sky-500'}`}>{formatBRL(averageInPeriod, privacyMode)}</p>
                                    </div>
                                </div>
                                <div className="h-56 w-full relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyDividends} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={chartColor} stopOpacity={1}/>
                                                    <stop offset="100%" stopColor={chartColor} stopOpacity={0.4}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} interval={0} />
                                            <YAxis hide domain={[0, 'auto']} />
                                            <ReferenceLine y={averageInPeriod} stroke="#fbbf24" strokeDasharray="3 3" strokeWidth={1.5} isFront />
                                            <RechartsTooltip 
                                                cursor={{fill: 'transparent'}} 
                                                content={({ active, payload, label }) => { 
                                                    if (active && payload && payload.length) { 
                                                        return (
                                                            <div className="bg-zinc-900/95 dark:bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/10 dark:border-zinc-200 z-50 min-w-[120px] text-center">
                                                                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 mb-1 uppercase tracking-widest">{label}</p>
                                                                <p className="text-xl font-black text-white dark:text-zinc-900 tracking-tight leading-none">{formatBRL(payload[0].value as number, privacyMode)}</p>
                                                            </div>
                                                        ); 
                                                    } 
                                                    return null; 
                                                }} 
                                            />
                                            <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
                                                {monthlyDividends.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill="url(#chartGradient)"
                                                        fillOpacity={entry.value >= averageInPeriod ? 1 : 0.4} 
                                                        className="transition-all duration-300 hover:fillOpacity-100" 
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-center opacity-40">
                                <BarChartIcon className="w-12 h-12 mb-3 text-zinc-300 anim-float" strokeWidth={1} />
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sem proventos neste período</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fonte e Links */}
                <div className="pt-2 pb-6 anim-slide-up" style={{ animationDelay: '250ms' }}>
                    <a href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full p-5 rounded-[1.5rem] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-[0.15em] shadow-xl press-effect hover:shadow-2xl transition-all">
                        Análise Completa <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <p className="text-[9px] text-center text-zinc-400 mt-4 font-medium opacity-60">
                        Última atualização: {asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : 'Hoje'}
                    </p>
                </div>
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
      {/* Search Bar Refinada */}
      <div className="sticky top-20 z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all -mx-4 px-4 py-2">
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
                // Exibe logo apenas se existir E não for FII (removendo brapi de FIIs)
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
