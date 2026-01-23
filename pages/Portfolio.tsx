
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, ExternalLink, X, TrendingUp, TrendingDown, Building2, BarChart3, Activity, Scale, Percent, AlertCircle, Banknote, Landmark, LineChart, DollarSign, PieChart, Users, ArrowUpRight, BarChart as BarChartIcon, Gem, Calendar, Briefcase, Zap, Layers, AlertTriangle } from 'lucide-react';
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

const formatNumber = (val: number | string | undefined, suffix = '') => {
    if (val === undefined || val === null || val === '') return '-';
    if (typeof val === 'string') return val;
    return val.toLocaleString('pt-BR') + suffix;
};

const BigStat = ({ label, value, colorClass, icon: Icon }: any) => (
    <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center relative overflow-hidden group">
        {Icon && <Icon className="absolute top-2 right-2 w-4 h-4 text-zinc-200 dark:text-zinc-800 opacity-50 group-hover:opacity-100 transition-opacity" />}
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className={`text-xl font-black tracking-tight ${colorClass || 'text-zinc-900 dark:text-white'}`}>{value}</p>
    </div>
);

const InfoRow = ({ label, value, highlight, subtext }: any) => (
    <div className={`flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${highlight ? 'bg-zinc-50/50 dark:bg-zinc-900/50 -mx-4 px-4' : ''}`}>
        <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            {subtext && <span className="text-[9px] text-zinc-300 dark:text-zinc-600 font-medium">{subtext}</span>}
        </div>
        <span className={`text-sm font-bold ${highlight ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{value}</span>
    </div>
);

const SectionHeader = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 mb-3 mt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400">
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</h3>
    </div>
);

const AssetDetailView = ({ asset, dividends, privacyMode, onClose }: { asset: AssetPosition, dividends: DividendReceipt[], privacyMode: boolean, onClose: () => void }) => {
    const [tab, setTab] = useState<'VISAO' | 'FUNDAMENTOS' | 'PROVENTOS'>('VISAO');
    const isFII = asset.assetType === AssetType.FII;

    // Cálculos Gerais
    const currentTotal = (asset.currentPrice || 0) * asset.quantity;
    const costTotal = asset.averagePrice * asset.quantity;
    const gainValue = currentTotal - costTotal;
    const gainPercent = costTotal > 0 ? (gainValue / costTotal) * 100 : 0;
    const isPositive = gainValue >= 0;

    // --- CÁLCULOS DE PROVENTOS ---
    const assetDividends = useMemo(() => {
        if (!dividends) return [];
        return dividends
            .filter(d => d.ticker.includes(asset.ticker.substring(0,4)))
            .sort((a,b) => a.paymentDate.localeCompare(b.paymentDate));
    }, [asset, dividends]);

    const last12MonthsData = useMemo(() => {
        const today = new Date();
        const data: { month: string, value: number, year: number }[] = [];
        let total12m = 0;

        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7); // YYYY-MM
            
            // Soma dividendos pagos neste mês específico
            const monthSum = assetDividends
                .filter(div => div.paymentDate.substring(0, 7) === key)
                .reduce((acc, curr) => acc + (curr.totalReceived || 0), 0);
            
            total12m += monthSum;
            data.push({
                month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                value: monthSum,
                year: d.getFullYear()
            });
        }
        return { chartData: data, total12m, monthlyAvg: total12m / 12 };
    }, [assetDividends]);

    const yieldOnCost = costTotal > 0 ? (asset.totalDividends || 0) / costTotal * 100 : 0;

    return (
        <div className="bg-white dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 pt-safe px-6 pb-4">
                <div className="flex items-center justify-between mb-6 pt-2">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border shadow-sm ${isFII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                            {asset.ticker.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">{asset.ticker}</h1>
                            <p className="text-xs font-medium text-zinc-400 truncate max-w-[200px]">{asset.segment || (isFII ? 'Fundo Imobiliário' : 'Ação')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>

                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                    {['VISAO', 'FUNDAMENTOS', 'PROVENTOS'].map(t => (
                        <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${tab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                            {t === 'VISAO' ? 'Minha Posição' : t === 'PROVENTOS' ? 'Proventos' : 'Fundamentos'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">
                {tab === 'VISAO' && (
                    <div className="space-y-8 anim-fade-in">
                        <div className="text-center py-6">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Patrimônio Atual</p>
                            <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">{formatBRL(currentTotal, privacyMode)}</h2>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {isPositive ? '+' : ''}{formatBRL(gainValue, privacyMode)} ({formatPercent(gainPercent, privacyMode)})
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <BigStat label="Preço Médio" value={formatBRL(asset.averagePrice, privacyMode)} />
                            <BigStat label="Cotação Atual" value={formatBRL(asset.currentPrice || 0, privacyMode)} colorClass={asset.dailyChange && asset.dailyChange > 0 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'} />
                            <BigStat label="Quantidade" value={asset.quantity} />
                            <BigStat label="Total Retorno" value={formatBRL(gainValue + (asset.totalDividends || 0), privacyMode)} colorClass="text-indigo-500" />
                        </div>
                    </div>
                )}

                {tab === 'FUNDAMENTOS' && (
                    <div className="space-y-4 anim-fade-in">
                        {/* CARD DE DESTAQUES PRINCIPAIS */}
                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <BigStat 
                                label={isFII ? "P/VP" : "P/L"} 
                                value={isFII ? asset.p_vp?.toFixed(2) || '-' : asset.p_l?.toFixed(2) || '-'} 
                                colorClass={(isFII && asset.p_vp && asset.p_vp < 1) ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'} 
                                icon={Scale}
                            />
                            <BigStat 
                                label="Dividend Yield" 
                                value={asset.dy_12m ? `${asset.dy_12m.toFixed(2)}%` : '-'} 
                                colorClass="text-emerald-500" 
                                icon={DollarSign}
                            />
                        </div>

                        {/* --- BLOCOS FIIs --- */}
                        {isFII && (
                            <>
                                <SectionHeader title="Valuation & Cotas" icon={Scale} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="Preço / VP" value={asset.p_vp?.toFixed(2) || '-'} highlight />
                                    <InfoRow label="Valor Patrimonial" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} subtext="Por Cota" />
                                    <InfoRow label="Último Rendimento" value={asset.last_dividend ? `R$ ${asset.last_dividend.toFixed(2)}` : '-'} color="text-emerald-500" />
                                    <InfoRow label="Patrimônio Líquido" value={asset.assets_value || '-'} />
                                </div>

                                <SectionHeader title="Qualidade & Gestão" icon={Briefcase} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    {asset.vacancy !== undefined && (
                                        <InfoRow 
                                            label="Vacância Física" 
                                            value={`${asset.vacancy}%`} 
                                            highlight={asset.vacancy > 10} 
                                            subtext={asset.vacancy > 10 ? 'Atenção: Alta' : 'Controlada'}
                                        />
                                    )}
                                    <InfoRow label="Liquidez Diária" value={asset.liquidity || '-'} />
                                    <InfoRow label="Número de Cotistas" value={formatNumber(asset.properties_count)} />
                                    <InfoRow label="Tipo de Gestão" value={asset.manager_type || '-'} />
                                    {asset.management_fee && <InfoRow label="Taxa de Admin." value={asset.management_fee} />}
                                </div>
                            </>
                        )}

                        {/* --- BLOCOS AÇÕES --- */}
                        {!isFII && (
                            <>
                                <SectionHeader title="Valuation" icon={Scale} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="P/L (Preço/Lucro)" value={asset.p_l?.toFixed(2) || '-'} highlight />
                                    <InfoRow label="P/VP" value={asset.p_vp?.toFixed(2) || '-'} />
                                    <InfoRow label="EV / EBITDA" value={asset.ev_ebitda?.toFixed(2) || '-'} />
                                    <InfoRow label="VPA" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} />
                                    <InfoRow label="LPA" value={asset.lpa ? `R$ ${asset.lpa.toFixed(2)}` : '-'} />
                                </div>

                                <SectionHeader title="Eficiência & Rentabilidade" icon={Zap} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="ROE" value={asset.roe ? `${asset.roe.toFixed(1)}%` : '-'} highlight />
                                    <InfoRow label="Margem Líquida" value={asset.net_margin ? `${asset.net_margin.toFixed(1)}%` : '-'} />
                                    <InfoRow label="Margem Bruta" value={asset.gross_margin ? `${asset.gross_margin.toFixed(1)}%` : '-'} />
                                </div>

                                <SectionHeader title="Crescimento & Dívida" icon={TrendingUp} />
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
                                    <InfoRow label="CAGR Receita (5a)" value={asset.cagr_revenue ? `${asset.cagr_revenue.toFixed(1)}%` : '-'} />
                                    <InfoRow label="CAGR Lucros (5a)" value={asset.cagr_profits ? `${asset.cagr_profits.toFixed(1)}%` : '-'} />
                                    <InfoRow label="Dív. Líq. / EBITDA" value={asset.net_debt_ebitda ? `${asset.net_debt_ebitda.toFixed(2)}x` : '-'} />
                                </div>
                            </>
                        )}

                        <div className="pt-4">
                            <a href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest press-effect shadow-xl group">
                                Análise Completa Investidor10 <ExternalLink className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                )}

                {tab === 'PROVENTOS' && (
                    <div className="space-y-8 anim-fade-in">
                        {/* Cartão de Destaque */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800 p-6 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Total Recebido</p>
                                    <h3 className="text-3xl font-black tracking-tight">{formatBRL(asset.totalDividends || 0, privacyMode)}</h3>
                                </div>
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                    <Banknote className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="flex gap-4 border-t border-white/20 pt-4">
                                <div>
                                    <p className="text-[9px] font-bold opacity-70 uppercase tracking-wide">Yield on Cost</p>
                                    <p className="text-sm font-black">{yieldOnCost.toFixed(2)}%</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold opacity-70 uppercase tracking-wide">Média Mensal</p>
                                    <p className="text-sm font-black">{formatBRL(last12MonthsData.monthlyAvg, privacyMode)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Gráfico 12 Meses */}
                        <div className="h-48 w-full">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Histórico 12 Meses</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={last12MonthsData.chartData}>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={10} />
                                    <RechartsTooltip 
                                        cursor={{fill: 'transparent'}}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                                        {formatBRL(payload[0].value as number, privacyMode)}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                        {last12MonthsData.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#e4e4e7'} className="dark:fill-emerald-600 dark:bg-zinc-800" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Últimos Pagamentos (Lista) */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Últimos Pagamentos</h3>
                            {assetDividends.slice().reverse().slice(0, 5).map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-zinc-900 dark:text-white uppercase">{new Date(d.paymentDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">{d.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(d.totalReceived, privacyMode)}</p>
                                        <p className="text-[9px] text-zinc-400 font-medium">Unitário: {d.rate.toFixed(4)}</p>
                                    </div>
                                </div>
                            ))}
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
