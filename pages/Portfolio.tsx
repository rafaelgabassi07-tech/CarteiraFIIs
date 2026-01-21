
import React, { useState, useMemo } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, ExternalLink, X, TrendingUp, TrendingDown, Building2, BarChart3, Activity, Scale, Percent, AlertCircle, Banknote, Landmark, LineChart, DollarSign, PieChart, Users, ArrowUpRight, BarChart as BarChartIcon } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

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
    <div className={`p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden ${highlight ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800'}`}>
        <div className="flex items-start justify-between mb-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
            {Icon && <Icon className={`w-3.5 h-3.5 ${colorClass ? colorClass.split(' ')[0] : 'text-zinc-300'}`} />}
        </div>
        <div>
            <span className={`text-lg font-black tracking-tight leading-none block ${colorClass || 'text-zinc-900 dark:text-white'}`}>
                {value !== undefined && value !== null && value !== '' ? value : '-'}
            </span>
            {subtext && <span className="text-[9px] font-bold text-zinc-400 mt-1 block">{subtext}</span>}
        </div>
    </div>
);

const DetailRow = ({ label, value, highlight = false, isLast = false }: any) => (
    <div className={`flex justify-between items-center py-3 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}>
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <span className={`text-sm font-bold text-right ${highlight ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-400'}`}>
            {value || '-'}
        </span>
    </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 px-1">
        <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
            <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{title}</h3>
    </div>
);

// --- COMPONENTE INTERNO DO MODAL (CORREÇÃO DE HOOKS) ---
// Extraído para garantir que useMemo e useState sejam chamados corretamente no ciclo de vida do React
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

    // Cálculo de Histórico Mensal
    const monthlyDividends = useMemo(() => {
        if (!asset || !dividends) return [];
        
        const now = new Date();
        const monthsBack = divRange === '3M' ? 3 : divRange === '6M' ? 6 : 12;
        
        // Data de corte (primeiro dia do mês inicial)
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
        
        const filtered = dividends.filter(d => {
            if (!d.paymentDate || d.ticker !== asset.ticker) return false;
            const pDate = new Date(d.paymentDate);
            pDate.setUTCHours(12); // Garante meio-dia para evitar problemas de fuso
            return pDate >= cutoffDate;
        });

        // Agrupa por mês (YYYY-MM)
        const grouped: Record<string, number> = {};
        
        // Inicializa os meses com 0 para o gráfico ficar bonito
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7); // YYYY-MM
            grouped[key] = 0;
        }

        filtered.forEach(d => {
            const key = d.paymentDate.slice(0, 7);
            if (grouped[key] !== undefined) {
                grouped[key] += d.totalReceived;
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

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full pb-20">
            {/* Sticky Header - Solid */}
            <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 transition-all">
                <div className="flex justify-between items-center max-w-xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-xs font-black shadow-sm ${isFII ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/30'}`}>
                            {asset.logoUrl ? <img src={asset.logoUrl} className="w-full h-full object-contain p-1" /> : asset.ticker.substring(0,2)}
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{asset.ticker}</h1>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{asset.segment}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-4 max-w-xl mx-auto space-y-6">
                
                {/* Bloco 1: Minha Posição */}
                <div className="anim-slide-up">
                    <div className="bg-zinc-900 dark:bg-zinc-950 rounded-[2rem] p-6 shadow-xl relative overflow-hidden text-white border border-zinc-800">
                        <div className="relative z-10 flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Meu Patrimônio</p>
                                <p className="text-3xl font-black tracking-tighter">{formatBRL(totalCurrent, privacyMode)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Retorno</p>
                                <div className={`flex flex-col items-end font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <span className="text-lg leading-none mb-0.5">{isPositive ? '+' : ''}{formatBRL(totalGainValue, privacyMode)}</span>
                                    <span className="text-[10px] opacity-80 bg-white/10 px-1.5 py-0.5 rounded">{formatPercent(totalGainPercent, privacyMode)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 relative z-10">
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Preço Médio</p>
                                <p className="text-sm font-black">{formatBRL(avgPrice, privacyMode)}</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5 text-center">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cotação</p>
                                <p className="text-sm font-black">{formatBRL(currentPrice, privacyMode)}</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5 text-right">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Quantidade</p>
                                <p className="text-sm font-black">{asset.quantity}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bloco 2: Fundamentos */}
                <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                    {isFII ? (
                        <>
                            <SectionTitle title="Valuation & Rendimentos" icon={Activity} />
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <StatBox label="Dividend Yield (12m)" value={asset.dy_12m ? `${asset.dy_12m.toFixed(2)}%` : '-'} subtext="Isento de IR" highlight colorClass="text-emerald-600 dark:text-emerald-400" icon={Percent} />
                                <StatBox label="P/VP" value={asset.p_vp?.toFixed(2)} subtext={asset.p_vp && asset.p_vp < 1 ? 'Descontado' : asset.p_vp && asset.p_vp > 1.1 ? 'Ágio' : 'Preço Justo'} highlight colorClass={asset.p_vp && asset.p_vp <= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'} icon={Scale} />
                                <StatBox label="Último Rendimento" value={asset.last_dividend ? `R$ ${asset.last_dividend.toFixed(2)}` : '-'} subtext="Por cota" icon={DollarSign} />
                                <StatBox label="Valor Patrimonial" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} subtext="VP por cota" icon={Building2} />
                            </div>

                            <SectionTitle title="Perfil & Risco" icon={AlertCircle} />
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <DetailRow label="Patrimônio Líquido (Fundo)" value={asset.assets_value} highlight />
                                <DetailRow label="Vacância Física" value={asset.vacancy !== undefined ? `${asset.vacancy}%` : '-'} highlight={asset.vacancy && asset.vacancy > 0} />
                                <DetailRow label="Liquidez Diária" value={asset.liquidity} />
                                <DetailRow label="Tipo de Gestão" value={asset.manager_type} isLast />
                            </div>
                        </>
                    ) : (
                        <>
                            <SectionTitle title="Valuation" icon={Scale} />
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <StatBox label="P/L" value={asset.p_l?.toFixed(2)} subtext="Anos retorno" highlight icon={Activity} />
                                <StatBox label="P/VP" value={asset.p_vp?.toFixed(2)} subtext="Preço/Patrimônio" highlight icon={Building2} />
                                <StatBox label="LPA" value={asset.lpa ? `R$ ${asset.lpa.toFixed(2)}` : '-'} subtext="Lucro/Ação" icon={DollarSign} />
                                <StatBox label="VPA" value={asset.vpa ? `R$ ${asset.vpa.toFixed(2)}` : '-'} subtext="Valor/Ação" icon={Banknote} />
                            </div>

                            <SectionTitle title="Eficiência & Saúde" icon={BarChart3} />
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
                                    <div>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">ROE</p>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{asset.roe ? `${asset.roe.toFixed(1)}%` : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Margem Líquida</p>
                                        <p className="text-lg font-black text-zinc-900 dark:text-white">{asset.net_margin ? `${asset.net_margin.toFixed(1)}%` : '-'}</p>
                                    </div>
                                </div>
                                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
                                    <DetailRow label="Div. Yield (12m)" value={asset.dy_12m ? `${asset.dy_12m.toFixed(1)}%` : '-'} />
                                    <DetailRow label="CAGR Lucros (5a)" value={asset.cagr_profits ? `${asset.cagr_profits.toFixed(1)}%` : '-'} />
                                    <DetailRow label="Dív. Líq / EBITDA" value={asset.net_debt_ebitda?.toFixed(2)} isLast />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Bloco 3: Histórico de Proventos Mensal */}
                <div className="anim-slide-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center justify-between mb-3 mt-6 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <BarChartIcon className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Histórico de Proventos</h3>
                        </div>
                        
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                            {(['3M', '6M', '12M'] as const).map((range) => (
                                <button key={range} onClick={() => setDivRange(range)} className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${divRange === range ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{range}</button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        {monthlyDividends.length > 0 ? (
                            <>
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-0.5">Total no Período</p>
                                        <p className="text-xl font-black text-zinc-900 dark:text-white">{formatBRL(totalInPeriod, privacyMode)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-0.5">Média Mensal</p>
                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(averageInPeriod, privacyMode)}</p>
                                    </div>
                                </div>
                                <div className="h-40 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyDividends} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} interval={0} />
                                            <RechartsTooltip content={({ active, payload, label }) => { if (active && payload && payload.length) { return (<div className="bg-white dark:bg-zinc-900 p-2 rounded-lg shadow-xl border border-zinc-100 dark:border-zinc-700 z-50"><p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">{label}</p><p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(payload[0].value as number, privacyMode)}</p></div>); } return null; }} cursor={{ fill: '#71717a10', radius: 4 }} />
                                            <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={40}>
                                                {monthlyDividends.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.value > averageInPeriod ? '#10b981' : '#e4e4e7'} className="transition-all duration-300 hover:opacity-80 dark:fill-zinc-700" />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-center opacity-50">
                                <BarChartIcon className="w-8 h-8 mb-2 text-zinc-300" strokeWidth={1} />
                                <p className="text-[10px] font-bold text-zinc-400">Sem proventos registrados neste período.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fonte e Links */}
                <div className="pt-4 anim-slide-up" style={{ animationDelay: '250ms' }}>
                    <a href={`https://investidor10.com.br/${isFII ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-[0.15em] shadow-lg press-effect hover:shadow-xl transition-shadow">
                        Ver Detalhes no Investidor10 <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-[9px] text-center text-zinc-400 mt-4 font-medium">
                        Dados atualizados em: {asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : 'Hoje'}
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
      {/* Search Bar Refinada - Solid */}
      <div className="relative z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-2">
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
        {activeAsset && <AssetDetailView asset={activeAsset} dividends={dividends} privacyMode={privacyMode} onClose={() => setSelectedTicker(null)} />}
      </SwipeableModal>
    </div>
  );
};

export const Portfolio = React.memo(PortfolioComponent);
