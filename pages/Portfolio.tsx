
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, BarChart3, PieChart, Coins, DollarSign, Building2, FileText, MapPin, Zap, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, SquareStack, Map as MapIcon, CandlestickChart, LineChart as LineChartIcon, Award, RefreshCcw, ArrowLeft, Percent, Scale, Activity, TrendingUp as TrendingUpIcon, Landmark, CircleDollarSign, PercentDiamond } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, Label, Legend } from 'recharts';
import { formatBRL, formatDateShort, getMonthName } from '../utils/formatters';
import { BrazilMap } from '../components/BrazilMap';

// --- SUB-COMPONENTS & HELPERS ---

const calculateSMA = (arr: any[], period: number, idx: number) => {
    if (idx < period - 1) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += arr[idx - i].close || arr[idx - i].price;
    }
    return sum / period;
};

// Filter data by Range (Local processing)
const filterDataByRange = (data: any[], range: string) => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    const cutoff = new Date();
    
    switch(range) {
        case '1M': cutoff.setMonth(now.getMonth() - 1); break;
        case '6M': cutoff.setMonth(now.getMonth() - 6); break;
        case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
        case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break;
        case 'MAX': return data; // No filter
        default: cutoff.setFullYear(now.getFullYear() - 1); // Default 1Y
    }
    
    return data.filter(d => new Date(d.date) >= cutoff);
};

const processChartData = (data: any[]) => {
    if (!data || data.length === 0) return { processedData: [], yDomain: ['auto', 'auto'], variation: 0, lastPrice: 0 };

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    data.forEach((d: any) => {
        const low = d.low || d.price;
        const high = d.high || d.price;
        if (low < minPrice) minPrice = low;
        if (high > maxPrice) maxPrice = high;
    });

    const processed = data.map((d: any, index: number, arr: any[]) => {
        const price = d.close || d.price;
        const open = d.open || price;
        const close = d.close || price;
        const isUp = close >= open;
        
        return {
            ...d,
            price: close, // For Area Chart
            volume: d.volume || 0,
            sma20: calculateSMA(arr, 20, index),
            volColor: isUp ? '#10b981' : '#f43f5e'
        };
    });

    const padding = (maxPrice - minPrice) * 0.05;
    const first = data[0].close || data[0].price;
    const last = data[data.length - 1].close || data[data.length - 1].price;
    const variation = ((last - first) / first) * 100;

    return { 
        processedData: processed, 
        yDomain: [minPrice - padding, maxPrice + padding],
        variation,
        lastPrice: last
    };
};

// --- Custom Tooltip Component (Glassmorphism) ---
const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        const close = d.close || d.price;
        const open = d.open || close;
        const isUp = close >= open;
        const change = ((close - open) / open) * 100;
        const date = new Date(label);

        return (
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 p-3 rounded-2xl shadow-xl backdrop-blur-md min-w-[140px] anim-scale-in">
                <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                    {d.open && (
                        <div className={`flex items-center gap-0.5 text-[9px] font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {Math.abs(change).toFixed(2)}%
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Fechamento</span>
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatBRL(close)}</span>
                </div>
            </div>
        );
    }
    return null;
};

const PriceHistoryChart = ({ fullData, loading, error }: any) => {
    const [range, setRange] = useState('1Y');
    const filteredData = useMemo(() => filterDataByRange(fullData, range), [fullData, range]);
    const { processedData, yDomain, variation } = useMemo(() => processChartData(filteredData), [filteredData]);
    const isPositive = variation >= 0;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-1 shadow-sm mb-6 relative overflow-hidden">
            <div className="p-4 flex flex-col gap-3 pb-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <CandlestickChart className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none">Cotação</h3>
                            <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPositive ? '+' : ''}{variation.toFixed(2)}% ({range})
                            </span>
                        </div>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        {['1M', '6M', '1Y', '5Y'].map((r) => (
                            <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{r}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="h-56 w-full relative mt-2">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10"><div className="animate-pulse text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">Carregando gráfico...</div></div>
                ) : error || !fullData || fullData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados indisponíveis</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={processedData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide />
                            <YAxis domain={yDomain} hide={false} orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#71717a'}} width={40} tickFormatter={(val) => val.toFixed(1)} tickMargin={5} />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area 
                                type="monotone" 
                                dataKey="price" 
                                stroke={isPositive ? '#10b981' : '#f43f5e'} 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill="url(#colorPrice)" 
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const ComparativeChart = ({ fullData, loading, ticker, type }: any) => {
    const [range, setRange] = useState('1Y');
    const [visibleBenchmarks, setVisibleBenchmarks] = useState({
        'CDI': true,
        'IPCA': true,
        'IBOV': true,
        'IFIX': type === 'FII' 
    });

    const toggleBenchmark = (key: string) => {
        const k = key as keyof typeof visibleBenchmarks;
        setVisibleBenchmarks(prev => ({ ...prev, [k]: !prev[k] }));
    };

    const filteredData = useMemo(() => filterDataByRange(fullData, range), [fullData, range]);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-1 shadow-sm mb-6 relative overflow-hidden transition-all duration-300">
            <div className="p-4 flex flex-col gap-3 pb-0">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Comparativo</h3>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        {['1Y', '2Y', '5Y', 'MAX'].map((r) => (
                            <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{r}</button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-900/20">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">{ticker}</span>
                    </div>
                    <button onClick={() => toggleBenchmark('CDI')} className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.CDI ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-zinc-500"></span><span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400">CDI</span>
                    </button>
                    {type === 'FII' && (
                        <button onClick={() => toggleBenchmark('IFIX')} className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IFIX ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">IFIX</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="h-48 w-full mt-2">
                {!fullData || fullData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-zinc-400">Dados insuficientes</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#52525b" opacity={0.1} />
                            <XAxis dataKey="date" hide />
                            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} width={35} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '10px', padding: '8px' }}
                                itemStyle={{ padding: 0 }}
                                formatter={(val: number) => [`${val.toFixed(2)}%`]}
                                labelFormatter={() => ''}
                            />
                            <Line type="monotone" dataKey="assetPct" stroke="#6366f1" strokeWidth={2} dot={false} />
                            {visibleBenchmarks.CDI && <Line type="monotone" dataKey="cdiPct" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                            {visibleBenchmarks.IPCA && <Line type="monotone" dataKey="ipcaPct" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                            {visibleBenchmarks.IFIX && type === 'FII' && <Line type="monotone" dataKey="ifixPct" stroke="#10b981" strokeWidth={1.5} dot={false} />}
                            {visibleBenchmarks.IBOV && type !== 'FII' && <Line type="monotone" dataKey="ibovPct" stroke="#f59e0b" strokeWidth={1.5} dot={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const FundamentalItem = ({ label, value, sub, icon: Icon, colorClass, highlight }: any) => (
    <div className={`flex flex-col p-3 rounded-2xl border ${highlight ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700' : 'bg-transparent border-zinc-100 dark:border-zinc-800'}`}>
        <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">{value || '-'}</span>
        {sub && <span className="text-[9px] text-zinc-400 font-medium">{sub}</span>}
    </div>
);

const FundamentalsGrid = ({ asset, type }: { asset: AssetPosition, type: AssetType }) => {
    if (type === AssetType.FII) {
        return (
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Indicadores FII</h3>
                <div className="grid grid-cols-2 gap-2">
                    <FundamentalItem 
                        label="Dividend Yield" 
                        value={formatBRL(asset.dy_12m) + '%'} 
                        sub="Últimos 12m" 
                        icon={Percent} 
                        colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        highlight
                    />
                    <FundamentalItem 
                        label="P/VP" 
                        value={asset.p_vp?.toFixed(2)} 
                        sub="Preço / Valor Patr." 
                        icon={Scale} 
                        colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                    />
                    <FundamentalItem 
                        label="Vacância" 
                        value={asset.vacancy ? `${asset.vacancy}%` : '0%'} 
                        sub="Física" 
                        icon={Building2} 
                        colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                    />
                    <FundamentalItem 
                        label="Último Rend." 
                        value={formatBRL(asset.last_dividend)} 
                        sub="Por Cota" 
                        icon={DollarSign} 
                        colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    />
                </div>
            </div>
        );
    }

    // Stocks Layout
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 mb-2">Valuation</h3>
                <div className="grid grid-cols-3 gap-2">
                    <FundamentalItem label="P/L" value={asset.p_l?.toFixed(1)} icon={Scale} colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20" />
                    <FundamentalItem label="P/VP" value={asset.p_vp?.toFixed(2)} icon={SquareStack} colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20" />
                    <FundamentalItem label="EV/EBITDA" value={asset.ev_ebitda?.toFixed(1)} icon={Activity} colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20" />
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 mb-2">Eficiência</h3>
                <div className="grid grid-cols-3 gap-2">
                    <FundamentalItem label="Marg. Líq." value={asset.net_margin ? `${asset.net_margin}%` : '-'} icon={PercentDiamond} colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" highlight />
                    <FundamentalItem label="ROE" value={asset.roe ? `${asset.roe}%` : '-'} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" />
                    <FundamentalItem label="Payout" value={asset.payout ? `${asset.payout}%` : '-'} icon={Coins} colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" />
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 mb-2">Dívida</h3>
                <div className="grid grid-cols-2 gap-2">
                    <FundamentalItem label="Dív. Líq/EBITDA" value={asset.net_debt_ebitda?.toFixed(2)} icon={Landmark} colorClass="bg-rose-50 text-rose-600 dark:bg-rose-900/20" />
                    <FundamentalItem label="Dív. Líq/PL" value={asset.net_debt_equity?.toFixed(2)} icon={Scale} colorClass="bg-rose-50 text-rose-600 dark:bg-rose-900/20" />
                </div>
            </div>
        </div>
    );
};

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends: DividendReceipt[];
  marketDividends?: DividendReceipt[];
  privacyMode: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
  headerVisible?: boolean;
  targetAsset?: string | null;
  onClearTarget?: () => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio, dividends, marketDividends = [], privacyMode, onAssetRefresh, headerVisible, targetAsset, onClearTarget }) => {
  const [filter, setFilter] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');
  const [sort, setSort] = useState<'VALUE' | 'NAME' | 'DY'>('VALUE');
  const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
  
  // Modal Data States
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  useEffect(() => {
      if (targetAsset) {
          const asset = portfolio.find(p => p.ticker === targetAsset);
          if (asset) handleAssetClick(asset);
          onClearTarget && onClearTarget();
      }
  }, [targetAsset, portfolio]);

  const filteredPortfolio = useMemo(() => {
    let res = portfolio;
    if (filter === 'FII') res = res.filter(a => a.assetType === AssetType.FII);
    if (filter === 'STOCK') res = res.filter(a => a.assetType === AssetType.STOCK);
    
    return res.sort((a, b) => {
        if (sort === 'VALUE') return (b.quantity * b.averagePrice) - (a.quantity * a.averagePrice);
        if (sort === 'DY') return (b.dy_12m || 0) - (a.dy_12m || 0);
        return a.ticker.localeCompare(b.ticker);
    });
  }, [portfolio, filter, sort]);

  const fetchHistory = async (ticker: string) => {
      setLoadingChart(true);
      try {
          const res = await fetch(`/api/history?ticker=${ticker}&range=5Y`);
          const data = await res.json();
          if (data.points) setChartData(data.points);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingChart(false);
      }
  };

  const handleAssetClick = (asset: AssetPosition) => {
      setSelectedAsset(asset);
      fetchHistory(asset.ticker);
  };

  const handleRefresh = async () => {
      if (!selectedAsset || !onAssetRefresh) return;
      setLoadingRefresh(true);
      await onAssetRefresh(selectedAsset.ticker);
      setLoadingRefresh(false);
  };

  const dividendHistory = useMemo(() => {
      if (!selectedAsset) return [];
      const history = marketDividends
          .filter(d => d.ticker === selectedAsset.ticker && d.paymentDate)
          .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
      
      const last12 = history.slice(-12);
      return last12.map(d => ({
          date: formatDateShort(d.paymentDate),
          value: d.rate,
          type: d.type
      }));
  }, [selectedAsset, marketDividends]);

  return (
    <div className="pb-32 anim-fade-in">
        <div className={`sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-primary-light dark:bg-primary-dark transition-all duration-300 -mx-4 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 shadow-sm ${headerVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === 'ALL' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>Todos</button>
                <button onClick={() => setFilter('FII')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === 'FII' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>Fundos Imobiliários</button>
                <button onClick={() => setFilter('STOCK')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === 'STOCK' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>Ações</button>
            </div>
        </div>

        <div className="mt-4 space-y-3">
            {filteredPortfolio.map(asset => {
                const totalValue = asset.quantity * (asset.currentPrice || 0);
                const gain = (asset.currentPrice || 0) - asset.averagePrice;
                const gainPct = asset.averagePrice > 0 ? (gain / asset.averagePrice) * 100 : 0;
                
                return (
                    <button 
                        key={asset.ticker}
                        onClick={() => handleAssetClick(asset)}
                        className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-[10px] text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                                {asset.ticker.substring(0, 2)}
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-sm text-zinc-900 dark:text-white">{asset.ticker}</h3>
                                    {asset.assetType === AssetType.FII && <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500">FII</span>}
                                </div>
                                <p className="text-xs text-zinc-500 font-medium">{asset.quantity} cotas</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-sm text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                            <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {gain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {gainPct.toFixed(1)}%
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>

        {selectedAsset && (
            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
                    
                    {/* Header */}
                    <div className="p-5 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0 sticky top-0 z-10 rounded-t-[2.5rem]">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{selectedAsset.ticker}</h2>
                                    <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">
                                        {selectedAsset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 font-medium mt-1 line-clamp-1 pr-4">{selectedAsset.company_name || selectedAsset.segment}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleRefresh} disabled={loadingRefresh} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-indigo-500 transition-colors">
                                    <RefreshCcw className={`w-4 h-4 ${loadingRefresh ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => setSelectedAsset(null)} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cotação Atual</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                        {formatBRL(selectedAsset.currentPrice)}
                                    </span>
                                    {(selectedAsset.dailyChange || 0) !== 0 && (
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${(selectedAsset.dailyChange || 0) > 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                            {(selectedAsset.dailyChange || 0) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {Math.abs(selectedAsset.dailyChange || 0).toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
                        {/* Charts */}
                        <PriceHistoryChart fullData={chartData} loading={loadingChart} ticker={selectedAsset.ticker} />
                        <ComparativeChart fullData={chartData} loading={loadingChart} ticker={selectedAsset.ticker} type={selectedAsset.assetType} />

                        {/* Fundamentals Grid */}
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <FundamentalsGrid asset={selectedAsset} type={selectedAsset.assetType} />
                        </div>

                        {/* Dividends Chart */}
                        {dividendHistory.length > 0 && (
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 mb-4">Histórico de Proventos</h3>
                                <div className="h-40 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dividendHistory}>
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {dividendHistory.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.type === 'JCP' ? '#0ea5e9' : '#10b981'} />
                                                ))}
                                            </Bar>
                                            <Tooltip 
                                                cursor={{fill: 'transparent'}}
                                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '10px' }}
                                                formatter={(val: number) => [formatBRL(val)]}
                                                labelStyle={{ color: '#a1a1aa' }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Map for Brick FIIs */}
                        {selectedAsset.assetType === AssetType.FII && selectedAsset.properties && selectedAsset.properties.length > 0 && (
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1 mb-2">Portfólio Imobiliário</h3>
                                <div className="h-64 relative">
                                    <BrazilMap 
                                        data={Object.entries(selectedAsset.properties.reduce((acc: any, curr: any) => {
                                            const loc = curr.location || 'Outros';
                                            acc[loc] = (acc[loc] || 0) + 1;
                                            return acc;
                                        }, {})).map(([name, value]: any) => ({ name, value }))}
                                        totalProperties={selectedAsset.properties.length}
                                    />
                                </div>
                                <div className="mt-4 space-y-2">
                                    {selectedAsset.properties.slice(0, 5).map((prop, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">{prop.name}</p>
                                                <p className="text-[10px] text-zinc-500">{prop.location} {prop.abl ? `• ${prop.abl} m²` : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedAsset.properties.length > 5 && (
                                        <p className="text-center text-[10px] text-zinc-400 font-bold mt-2">+ {selectedAsset.properties.length - 5} imóveis</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User Position */}
                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-5 rounded-3xl shadow-xl text-white mb-8">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Wallet className="w-3 h-3" /> Sua Posição
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Custo Total</p>
                                    <p className="text-lg font-bold">{formatBRL(selectedAsset.averagePrice * selectedAsset.quantity, privacyMode)}</p>
                                    <p className="text-[10px] text-zinc-500">PM: {formatBRL(selectedAsset.averagePrice)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Valor Atual</p>
                                    <p className="text-lg font-bold">{formatBRL((selectedAsset.currentPrice || 0) * selectedAsset.quantity, privacyMode)}</p>
                                    <div className={`flex items-center gap-1 text-[10px] font-bold ${((selectedAsset.currentPrice || 0) - selectedAsset.averagePrice) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {((selectedAsset.currentPrice || 0) - selectedAsset.averagePrice) >= 0 ? '+' : ''}
                                        {formatBRL(((selectedAsset.currentPrice || 0) - selectedAsset.averagePrice) * selectedAsset.quantity, privacyMode)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SwipeableModal>
        )}
    </div>
  );
};
