import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, Activity, BarChart3, PieChart, Coins, AlertCircle, ChevronDown, DollarSign, Percent, Briefcase, Building2, Users, FileText, MapPin, Zap, Info, Clock, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, Scale, SquareStack, Calendar, Map as MapIcon, ChevronRight, Share2, MousePointerClick, CandlestickChart, LineChart as LineChartIcon, SlidersHorizontal } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, Legend, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, ErrorBar, Label } from 'recharts';
import { formatBRL, formatPercent, formatNumber, formatDateShort } from '../utils/formatters';

// --- CONSTANTS ---
const TYPE_COLORS: Record<string, string> = {
    'DIV': '#10b981',   // Emerald 500
    'REND': '#10b981',  // Emerald 500
    'JCP': '#0ea5e9',   // Sky 500
    'AMORT': '#f59e0b', // Amber 500
    'REST': '#f59e0b',  // Amber 500
    'OUTROS': '#6366f1' // Indigo 500
};

const TYPE_LABELS: Record<string, string> = {
    'DIV': 'Dividendos',
    'REND': 'Rendimentos',
    'JCP': 'JCP',
    'AMORT': 'Amortização',
    'REST': 'Restituição',
    'OUTROS': 'Outros'
};

const CHART_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#d946ef', '#84cc16'];

// --- SUB-COMPONENTS ---

const MetricCard = ({ label, value, highlight = false, colorClass = "text-zinc-900 dark:text-white", subtext }: any) => (
    <div className={`p-3 rounded-2xl border flex flex-col justify-center min-h-[72px] transition-all ${highlight ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-white dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-700/50'}`}>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 truncate">{label}</span>
        <span className={`text-sm font-black truncate ${colorClass}`}>{value}</span>
        {subtext && <span className="text-[9px] text-zinc-400 mt-0.5">{subtext}</span>}
    </div>
);

// Custom Candle Shape Profissional
const CustomCandleShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;
    
    if (open == null || close == null || high == null || low == null) return null;

    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#f43f5e'; // Emerald / Rose
    
    // Cálculo de pixels relativos
    const range = high - low;
    const ratio = range === 0 ? 0 : height / range;
    
    const yOpen = y + (high - open) * ratio;
    const yClose = y + (high - close) * ratio;
    const yHigh = y;
    const yLow = y + height;
    
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yOpen - yClose)); // Altura mínima do corpo de 1px

    // Estética da Vela
    const candleWidth = Math.min(Math.max(width * 0.6, 2), 8); // Largura um pouco mais fina para elegância
    const xCentered = x + (width - candleWidth) / 2;
    const wickX = x + width / 2;

    return (
        <g>
            {/* Pavio (Wick) */}
            <line 
                x1={wickX} 
                y1={yHigh} 
                x2={wickX} 
                y2={yLow} 
                stroke={color} 
                strokeWidth={1.5} 
                opacity={0.8}
            />
            {/* Corpo (Body) */}
            <rect 
                x={xCentered} 
                y={bodyTop} 
                width={candleWidth} 
                height={bodyHeight} 
                fill={color}
                rx={1} 
            />
        </g>
    );
};

// Tag de Preço no Eixo Y
const CurrentPriceLabel = (props: any) => {
    const { viewBox, value } = props;
    const { y } = viewBox;
    
    return (
        <g transform={`translate(${viewBox.width + 2}, ${y})`}>
            {/* Fundo da Tag */}
            <path 
                d="M0,0 L5,-10 H42 A4,4 0 0 1 46,-6 V6 A4,4 0 0 1 42,10 H5 L0,0 Z" 
                fill="#6366f1" 
                transform="translate(0, 0)" 
            />
            {/* Texto do Preço */}
            <text 
                x={24} 
                y={3} 
                textAnchor="middle" 
                fill="#fff" 
                fontSize={9} 
                fontWeight="bold"
                fontFamily="Inter, sans-serif"
            >
                {value.toFixed(2)}
            </text>
        </g>
    );
};

// Componente 1: Gráfico de Preço (Linha ou Candle)
const PriceHistoryChart = ({ data, loading, error, ticker, range, setRange }: any) => {
    const [chartType, setChartType] = useState<'AREA' | 'CANDLE'>('AREA');

    // Calcula variação simples para cor do gráfico
    const variation = useMemo(() => {
        if (!data || data.length < 2) return 0;
        const first = data[0].close || data[0].price;
        const last = data[data.length - 1].close || data[data.length - 1].price;
        return ((last - first) / first) * 100;
    }, [data]);

    const lastPrice = useMemo(() => data && data.length > 0 ? (data[data.length - 1].close || data[data.length - 1].price) : 0, [data]);
    const isPositive = variation >= 0;

    // Prepara dados e calcula Domínio Y para "Zoom" nas velas
    const { candleData, yDomain } = useMemo(() => {
        if (!data || data.length === 0) return { candleData: [], yDomain: ['auto', 'auto'] };
        
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        const processed = data.map((d: any) => {
            const low = d.low || d.price;
            const high = d.high || d.price;
            if (low < minPrice) minPrice = low;
            if (high > maxPrice) maxPrice = high;
            
            return {
                ...d,
                candleRange: [low, high] 
            };
        });

        // Margem reduzida para 2% para aproveitar melhor a altura
        const padding = (maxPrice - minPrice) * 0.02; 
        return { 
            candleData: processed, 
            yDomain: [minPrice - padding, maxPrice + padding] 
        };
    }, [data]);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setChartType(prev => prev === 'AREA' ? 'CANDLE' : 'AREA')}
                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        {chartType === 'AREA' ? <LineChartIcon className="w-4 h-4" /> : <CandlestickChart className="w-4 h-4" />}
                    </button>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        Cotação
                    </h4>
                </div>
                
                <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                    {['1M', '6M', '1Y', '5Y'].map((r) => (
                        <button 
                            key={r} 
                            onClick={() => setRange(r)}
                            className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-64 w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
                        <div className="animate-pulse text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">Carregando...</div>
                    </div>
                ) : error || !data || data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados indisponíveis</div>
                ) : (
                    <>
                        {/* Tag de variação no topo esquerdo */}
                        <div className="absolute top-0 left-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded-br-xl border-r border-b border-zinc-100 dark:border-zinc-800">
                            <span className={`text-xs font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPositive ? '+' : ''}{variation.toFixed(2)}%
                            </span>
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'AREA' ? (
                                <AreaChart data={data} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" hide axisLine={false} tickLine={false} />
                                    <YAxis 
                                        domain={yDomain} 
                                        hide={false} 
                                        orientation="right" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 9, fill: '#71717a'}} 
                                        width={40}
                                        tickFormatter={(val) => val.toFixed(2)}
                                        tickMargin={5}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px', padding: '8px 12px' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                        formatter={(value: number) => [formatBRL(value), 'Preço']}
                                    />
                                    <ReferenceLine 
                                        y={lastPrice} 
                                        stroke="#6366f1" 
                                        strokeDasharray="3 3" 
                                        strokeOpacity={0.5} 
                                        ifOverflow="extendDomain"
                                    >
                                        <Label content={<CurrentPriceLabel value={lastPrice} />} position="right" />
                                    </ReferenceLine>
                                    <Area 
                                        type="monotone" 
                                        dataKey="close" 
                                        stroke={isPositive ? '#10b981' : '#f43f5e'} 
                                        strokeWidth={2} 
                                        fillOpacity={1} 
                                        fill="url(#colorPrice)" 
                                    />
                                </AreaChart>
                            ) : (
                                <BarChart data={candleData} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                                    <XAxis dataKey="date" hide />
                                    <YAxis 
                                        domain={yDomain} 
                                        hide={false} 
                                        orientation="right" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 9, fill: '#71717a'}} 
                                        width={40}
                                        tickFormatter={(val) => val.toFixed(2)}
                                        tickMargin={5}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                const isOpenUp = d.close >= d.open;
                                                return (
                                                    <div className="bg-zinc-900/95 border border-zinc-800 p-3 rounded-xl shadow-xl backdrop-blur-md">
                                                        <p className="text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wide">
                                                            {new Date(label).toLocaleDateString('pt-BR')}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                                                            <span className="text-zinc-500">Abe:</span>
                                                            <span className="text-white text-right">{formatBRL(d.open)}</span>
                                                            <span className="text-zinc-500">Max:</span>
                                                            <span className="text-emerald-400 text-right">{formatBRL(d.high)}</span>
                                                            <span className="text-zinc-500">Min:</span>
                                                            <span className="text-rose-400 text-right">{formatBRL(d.low)}</span>
                                                            <span className="text-zinc-500">Fec:</span>
                                                            <span className={`text-right font-bold ${isOpenUp ? 'text-emerald-500' : 'text-rose-500'}`}>{formatBRL(d.close)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <ReferenceLine 
                                        y={lastPrice} 
                                        stroke="#6366f1" 
                                        strokeDasharray="3 3" 
                                        strokeOpacity={0.8}
                                        ifOverflow="extendDomain"
                                    >
                                        <Label content={<CurrentPriceLabel value={lastPrice} />} position="right" />
                                    </ReferenceLine>
                                    <Bar 
                                        dataKey="candleRange" 
                                        shape={<CustomCandleShape />} 
                                        isAnimationActive={false}
                                    />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>
    );
};

// Componente 2: Gráfico Comparativo Completo com Filtros
const ComparativeHistoryChart = ({ data, loading, ticker, type, range, setRange }: any) => {
    
    const [visibleBenchmarks, setVisibleBenchmarks] = useState({
        'CDI': true,
        'IPCA': true,
        'IBOV': true,
        'IFIX': type === 'FII' 
    });

    const toggleBenchmark = (key: string) => {
        setVisibleBenchmarks(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-6 relative overflow-hidden">
            <div className="mb-4">
                <div className="flex justify-between items-start mb-4">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" /> Comparativo
                    </h4>
                    
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        {['1Y', '2Y', '5Y', '10Y'].map((r) => (
                            <button 
                                key={r} 
                                onClick={() => setRange(r)}
                                className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-900/20">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">{ticker}</span>
                    </div>

                    <button onClick={() => toggleBenchmark('CDI')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.CDI ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">CDI</span>
                    </button>

                    <button onClick={() => toggleBenchmark('IPCA')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IPCA ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                        <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300">IPCA</span>
                    </button>

                    <button onClick={() => toggleBenchmark('IBOV')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IBOV ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">IBOV</span>
                    </button>

                    {type === 'FII' && (
                        <button onClick={() => toggleBenchmark('IFIX')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IFIX ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">IFIX</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="h-56 w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
                        <div className="animate-pulse text-xs font-bold text-zinc-400">Carregando comparativo...</div>
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados insuficientes</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis 
                                dataKey="date" 
                                hide={false} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#71717a'}} 
                                tickFormatter={(val) => formatDateShort(val)} 
                                minTickGap={40}
                            />
                            <YAxis 
                                hide={false} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#71717a'}} 
                                width={30}
                                tickFormatter={(val) => `${val.toFixed(0)}%`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px', padding: '8px 12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                formatter={(value: number, name: string) => {
                                    if (name === 'assetPct') return [`${value.toFixed(2)}%`, ticker];
                                    if (name === 'ibovPct') return [`${value.toFixed(2)}%`, 'IBOV'];
                                    if (name === 'ifixPct') return [`${value.toFixed(2)}%`, 'IFIX'];
                                    if (name === 'cdiPct') return [`${value.toFixed(2)}%`, 'CDI'];
                                    if (name === 'ipcaPct') return [`${value.toFixed(2)}%`, 'IPCA'];
                                    return [value, name];
                                }}
                            />
                            <ReferenceLine y={0} stroke="#71717a" strokeOpacity={0.3} strokeDasharray="3 3" />
                            
                            {/* CDI */}
                            {visibleBenchmarks.CDI && (
                                <Line 
                                    type="monotone" 
                                    dataKey="cdiPct" 
                                    stroke="#52525b" 
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    strokeDasharray="2 2"
                                    animationDuration={1000}
                                />
                            )}

                            {/* IPCA */}
                            {visibleBenchmarks.IPCA && (
                                <Line 
                                    type="monotone" 
                                    dataKey="ipcaPct" 
                                    stroke="#06b6d4" 
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    strokeDasharray="2 2"
                                    animationDuration={1000}
                                />
                            )}
                            
                            {/* IBOV */}
                            {visibleBenchmarks.IBOV && (
                                <Line 
                                    type="monotone" 
                                    dataKey="ibovPct" 
                                    stroke="#f59e0b"
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    animationDuration={1000}
                                />
                            )}
                            
                            {/* IFIX */}
                            {visibleBenchmarks.IFIX && (
                                <Line 
                                    type="monotone" 
                                    dataKey="ifixPct" 
                                    stroke="#10b981"
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    animationDuration={1000}
                                />
                            )}

                            {/* Asset - Destaque */}
                            <Line 
                                type="monotone" 
                                dataKey="assetPct" 
                                stroke="#6366f1"
                                strokeWidth={2.5} 
                                dot={false} 
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

// Container para gerenciar dados dos gráficos
const ChartsContainer = ({ ticker, type }: { ticker: string, type: AssetType }) => {
    const [data, setData] = useState<any[]>([]);
    const [range, setRange] = useState('1Y');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            setLoading(true);
            setError(false);
            try {
                // Fetch comparative data (returns price AND percentages)
                const res = await fetch(`/api/history?ticker=${ticker}&range=${range}`);
                if (!res.ok) throw new Error('Falha');
                const json = await res.json();
                
                if (isMounted && json.points) {
                    setData(json.points);
                }
            } catch (e) {
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [ticker, range]);

    return (
        <>
            <PriceHistoryChart 
                data={data} 
                loading={loading} 
                error={error} 
                ticker={ticker} 
                range={range} 
                setRange={setRange} 
            />
            <ComparativeHistoryChart 
                data={data} 
                loading={loading} 
                ticker={ticker} 
                type={type}
                range={range}
                setRange={setRange}
            />
        </>
    );
}

// ... Resto dos componentes (PositionSummaryCard, MarketPerformanceCard, etc) mantidos iguais ...
// Card de Resumo da Posição do Usuário (Redesenhado)
const PositionSummaryCard = ({ asset, privacyMode }: { asset: AssetPosition, privacyMode: boolean }) => {
    const totalValue = asset.quantity * (asset.currentPrice || 0);
    const totalCost = asset.quantity * asset.averagePrice;
    const profitValue = totalValue - totalCost;
    const profitPercent = totalCost > 0 ? (profitValue / totalCost) * 100 : 0;
    const isProfit = profitValue >= 0;

    return (
        <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-200/20 dark:bg-zinc-800/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Patrimônio Atual</p>
                    <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalValue, privacyMode)}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${isProfit ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'}`}>
                    {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                    <span className="text-xs font-black">{formatBRL(profitValue, privacyMode)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="p-3 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Preço Médio</p>
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(asset.averagePrice, privacyMode)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Rentabilidade</p>
                    <p className={`text-sm font-black ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                    </p>
                </div>
            </div>
        </div>
    );
};

// Novo Card de Performance de Mercado (Compacto e Visual)
const MarketPerformanceCard = ({ asset }: { asset: AssetPosition }) => {
    let benchmarkVal = asset.benchmark_cdi_12m;
    let benchmarkLabel = 'CDI';
    
    if (asset.assetType === AssetType.FII && asset.benchmark_ifix_12m) {
        benchmarkVal = asset.benchmark_ifix_12m;
        benchmarkLabel = 'IFIX';
    } else if (asset.assetType === AssetType.STOCK && asset.benchmark_ibov_12m) {
        benchmarkVal = asset.benchmark_ibov_12m;
        benchmarkLabel = 'IBOV';
    }

    const assetReturn = asset.profitability_12m;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-6">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Rentabilidade (12 Meses)
            </h4>
            
            <div className="space-y-4">
                <div className="relative pt-2">
                    <div className="flex justify-between items-end mb-2 text-xs font-bold">
                        <span className="text-zinc-600 dark:text-zinc-300">{asset.ticker}</span>
                        <span className={assetReturn !== undefined ? (assetReturn >= 0 ? 'text-emerald-500' : 'text-rose-500') : 'text-zinc-400'}>
                            {assetReturn !== undefined ? `${assetReturn > 0 ? '+' : ''}${assetReturn.toFixed(1)}%` : '--'}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        {assetReturn !== undefined && (
                            <div 
                                className={`h-full rounded-full ${assetReturn >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                                style={{ width: `${Math.min(100, Math.max(10, Math.abs(assetReturn) * 2))}%` }} 
                            ></div>
                        )}
                    </div>
                </div>

                {benchmarkVal !== undefined && (
                    <div className="relative">
                        <div className="flex justify-between items-end mb-2 text-xs font-bold">
                            <span className="text-zinc-400">{benchmarkLabel}</span>
                            <span className="text-zinc-400">
                                {benchmarkVal > 0 ? '+' : ''}{benchmarkVal.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full bg-zinc-300 dark:bg-zinc-600" 
                                style={{ width: `${Math.min(100, Math.max(10, Math.abs(benchmarkVal) * 2))}%` }} 
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ValuationCard = ({ asset }: { asset: AssetPosition }) => {
    let fairPrice = 0;
    let method = '';

    if (asset.assetType === AssetType.FII) {
        if (asset.vpa && asset.vpa > 0) {
            fairPrice = asset.vpa;
            method = 'Valor Patrimonial (VP)';
        }
    } else {
        if (asset.lpa && asset.lpa > 0 && asset.vpa && asset.vpa > 0) {
            fairPrice = Math.sqrt(22.5 * asset.lpa * asset.vpa);
            method = 'Graham (22.5 x LPA x VPA)';
        }
    }

    if (!fairPrice || fairPrice <= 0) return null;

    const upside = asset.currentPrice ? ((fairPrice - asset.currentPrice) / asset.currentPrice) * 100 : 0;
    const isUndervalued = upside > 0;

    return (
        <div className="mb-6">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Calculator className="w-3 h-3" /> Valuation Estimado
            </h4>
            <div className={`p-5 rounded-3xl border flex justify-between items-center relative overflow-hidden ${isUndervalued ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'}`}>
                <div className="relative z-10">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isUndervalued ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>Preço Justo</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL(fairPrice)}</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium opacity-80">{method}</span>
                </div>
                <div className="text-right relative z-10">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Potencial</p>
                    <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-black ${isUndervalued ? 'bg-white dark:bg-black/20 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'bg-white dark:bg-black/20 text-amber-600 dark:text-amber-400 shadow-sm'}`}>
                        {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

const InfoRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="flex items-center gap-3">
            {Icon && <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"><Icon className="w-4 h-4" /></div>}
            <span className="text-xs font-medium text-zinc-500">{label}</span>
        </div>
        <span className="text-xs font-bold text-zinc-900 dark:text-white text-right max-w-[180px] break-words leading-tight">{value || '-'}</span>
    </div>
);

const DetailedInfoBlock = ({ asset }: { asset: AssetPosition }) => {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-6">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-3 h-3" /> Dados Cadastrais
            </h4>
            
            <InfoRow label="Razão Social" value={asset.company_name} icon={Building2} />
            <InfoRow label="CNPJ" value={asset.cnpj} icon={FileText} />
            <InfoRow label="Segmento" value={asset.segment_secondary || asset.segment} icon={PieChart} />
            
            {asset.assetType === AssetType.FII && (
                <>
                    <InfoRow label="VP/Cota" value={asset.vpa ? formatBRL(asset.vpa) : '-'} icon={Calculator} />
                    <InfoRow label="Público-Alvo" value={asset.target_audience} icon={Users} />
                    <InfoRow label="Mandato" value={asset.mandate} icon={Briefcase} />
                    <InfoRow label="Tipo de Gestão" value={asset.manager_type} icon={Activity} />
                    <InfoRow label="Taxa Adm." value={asset.management_fee} icon={Percent} />
                    <InfoRow label="Liquidez Diária" value={asset.liquidity} icon={Activity} />
                    <InfoRow label="Vacância Física" value={asset.vacancy !== undefined ? `${asset.vacancy}%` : '-'} icon={AlertCircle} />
                    <InfoRow label="Num. Cotistas" value={asset.properties_count ? formatNumber(asset.properties_count, 0) : '-'} icon={Users} />
                    <InfoRow label="Num. Cotas" value={asset.num_quotas} icon={Coins} />
                    <InfoRow label="Patrimônio Líq." value={asset.assets_value} icon={Wallet} />
                </>
            )}

            {asset.assetType === AssetType.STOCK && (
                <>
                    <InfoRow label="Valor de Mercado" value={asset.market_cap} icon={Wallet} />
                    <InfoRow label="Liquidez Diária" value={asset.liquidity} icon={Activity} />
                </>
            )}
        </div>
    );
};

const IncomeAnalysisSection = ({ asset, chartData }: { asset: AssetPosition, chartData: { data: any[], average: number, activeTypes: string[] }, history: DividendReceipt[] }) => {
    const totalInvested = asset.quantity * asset.averagePrice;
    const yoc = totalInvested > 0 ? (asset.totalDividends || 0) / totalInvested * 100 : 0;
    
    const currentPrice = asset.currentPrice || 0;
    const monthlyReturn = asset.last_dividend || (asset.dy_12m ? (currentPrice * (asset.dy_12m/100))/12 : 0);
    
    const magicNumber = monthlyReturn > 0 ? Math.ceil(currentPrice / monthlyReturn) : 0;
    const magicProgress = magicNumber > 0 ? Math.min(100, (asset.quantity / magicNumber) * 100) : 0;
    const missingForMagic = Math.max(0, magicNumber - asset.quantity);
    const paybackYears = monthlyReturn > 0 ? (currentPrice / (monthlyReturn * 12)) : 0;

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-3xl border bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-indigo-100 dark:border-zinc-800 relative overflow-hidden shadow-sm">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-600 dark:text-indigo-400 opacity-80">Retorno com Proventos</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-zinc-900 dark:text-white">
                                {formatBRL(asset.totalDividends || 0)}
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-black/20 border border-indigo-100 dark:border-white/5">
                                <span className="text-[9px] font-bold text-zinc-500">Yield on Cost:</span>
                                <span className="text-[9px] font-black text-emerald-500">+{yoc.toFixed(2)}%</span>
                            </div>
                            {asset.payout !== undefined && asset.payout > 0 && (
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-black/20 border border-indigo-100 dark:border-white/5">
                                    <span className="text-[9px] font-bold text-zinc-500">Payout:</span>
                                    <span className="text-[9px] font-black text-zinc-900 dark:text-white">{asset.payout.toFixed(1)}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" /> Evolução (12m)
                    </h4>
                    <span className="text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-700">
                        Média: {formatBRL(chartData.average)}
                    </span>
                </div>
                
                <div className="h-64 w-full p-2 pt-4">
                    {chartData.data.some(d => d.total > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} interval={0} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px 12px' }}
                                    formatter={(value: number, name: string) => [formatBRL(value), TYPE_LABELS[name] || name]}
                                />
                                {chartData.activeTypes.map(type => (
                                    <Bar 
                                        key={type} 
                                        dataKey={type} 
                                        stackId="a" 
                                        fill={TYPE_COLORS[type] || TYPE_COLORS['OUTROS']} 
                                        radius={[2, 2, 0, 0]} 
                                        maxBarSize={28} 
                                    />
                                ))}
                                {chartData.average > 0 && (
                                    <ReferenceLine y={chartData.average} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />
                                )}
                                <Legend 
                                    iconType="circle" 
                                    iconSize={6}
                                    formatter={(value) => <span className="text-[9px] font-bold text-zinc-500 uppercase">{TYPE_LABELS[value] || value}</span>}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                            Sem histórico recente
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Raio-X de Renda</h4>
                </div>
                
                <div className="p-5 space-y-5">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-amber-500" /> Número Mágico
                            </span>
                            <span className="text-[10px] font-black text-zinc-400 uppercase">
                                {missingForMagic === 0 ? 'Atingido!' : `Faltam ${missingForMagic} cotas`}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${magicProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                            Você precisa de <strong>{magicNumber}</strong> cotas para comprar uma nova cota todo mês apenas com os dividendos.
                        </p>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Metas de Renda Passiva</h5>
                        <div className="space-y-3">
                            {[50, 100, 1000].map(target => {
                                const needed = monthlyReturn > 0 ? Math.ceil(target / monthlyReturn) : 0;
                                const has = asset.quantity >= needed;
                                return (
                                    <div key={target} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {has ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Goal className="w-3.5 h-3.5 text-zinc-300" />}
                                            R$ {target}/mês
                                        </span>
                                        <span className={`font-mono font-medium ${has ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                            {needed} cotas
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Payback Estimado</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">{paybackYears > 0 ? paybackYears.toFixed(1) : '-'} <span className="text-xs font-medium text-zinc-500">anos</span></p>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Renda/Cota</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(monthlyReturn)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AssetListItem: React.FC<any> = ({ asset, onOpenDetails, privacyMode, isExpanded, onToggle }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalVal = asset.quantity * (asset.currentPrice || 0);
    const profitValue = (asset.currentPrice && asset.averagePrice) ? (asset.currentPrice - asset.averagePrice) * asset.quantity : 0;
    const profitPercent = asset.averagePrice > 0 ? ((asset.currentPrice || 0) / asset.averagePrice - 1) * 100 : 0;
    const isProfit = profitPercent >= 0;

    return (
        <div className={`mb-3 rounded-3xl border transition-all duration-300 overflow-hidden bg-white dark:bg-zinc-900 ${isExpanded ? 'border-indigo-200 dark:border-indigo-500/30 shadow-md ring-1 ring-indigo-500/10' : 'border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}`}>
            <button onClick={onToggle} className="w-full flex items-center justify-between p-4 bg-transparent press-effect outline-none">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-black tracking-wider shadow-sm transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'}`}>
                        {asset.ticker.substring(0, 2)}
                    </div>
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.ticker}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{asset.quantity} Cotas</span>
                            {asset.dy_12m !== undefined && asset.dy_12m > 0 && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                    DY {asset.dy_12m.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col items-end">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">{formatBRL(totalVal, privacyMode)}</p>
                        {asset.dailyChange !== undefined && (
                            <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {Math.abs(asset.dailyChange).toFixed(2)}%
                            </div>
                        )}
                    </div>
                    <div className={`w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'}`}>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                </div>
            </button>
            <div className={`transition-all duration-500 ease-out-mola overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0">
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 overflow-hidden mb-3">
                        <div className="flex border-b border-zinc-100 dark:border-zinc-800/50">
                            <div className="flex-1 p-3 border-r border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Preço Médio</span>
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 block">{formatBRL(asset.averagePrice, privacyMode)}</span>
                            </div>
                            <div className="flex-1 p-3">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Preço Atual</span>
                                <span className="text-sm font-black text-zinc-900 dark:text-white block">{formatBRL(asset.currentPrice, privacyMode)}</span>
                            </div>
                        </div>
                        <div className="flex">
                            <div className="flex-1 p-3 border-r border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Resultado (R$)</span>
                                <span className={`text-sm font-black block ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {profitValue > 0 ? '+' : ''}{formatBRL(profitValue, privacyMode)}
                                </span>
                            </div>
                            <div className="flex-1 p-3">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Variação (%)</span>
                                <span className={`text-sm font-black block ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onOpenDetails(); }} className="w-full h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 press-effect shadow-md">
                        Ver Análise Completa
                    </button>
                </div>
            </div>
        </div>
    );
};

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends?: DividendReceipt[];
  privacyMode?: boolean;
  onAssetRefresh?: (ticker: string) => Promise<void>;
  headerVisible?: boolean;
  targetAsset?: string | null;
  onClearTarget?: () => void;
}

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false }) => {
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [expandedAssetTicker, setExpandedAssetTicker] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'RESUMO' | 'RENDA' | 'ANÁLISE' | 'IMOVEIS'>('RESUMO');

    // Sincroniza selectedAsset com o portfolio em tempo real para refletir atualizações do scraper
    useEffect(() => {
        if (selectedAsset) {
            const updated = portfolio.find(p => p.ticker === selectedAsset.ticker);
            if (updated && updated !== selectedAsset) {
                setSelectedAsset(updated);
            }
        }
    }, [portfolio]);

    const filtered = useMemo(() => {
        if (!search) return portfolio;
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    const fiis = filtered.filter(p => p.assetType === AssetType.FII);
    const stocks = filtered.filter(p => p.assetType === AssetType.STOCK);

    const assetDividendChartData = useMemo(() => {
        if (!selectedAsset) return { data: [], average: 0, activeTypes: [] };
        
        const today = new Date();
        const startDates: string[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            startDates.push(d.toISOString().substring(0, 7)); // YYYY-MM
        }
        
        const history = dividends
            .filter(d => d.ticker === selectedAsset.ticker)
            .filter(d => {
                const dateStr = d.paymentDate || d.dateCom;
                if (!dateStr) return false;
                const monthKey = dateStr.substring(0, 7);
                return monthKey >= startDates[0];
            })
            .sort((a, b) => (a.paymentDate || a.dateCom).localeCompare(b.paymentDate || b.dateCom));

        const grouped: Record<string, Record<string, number>> = {};
        const typesFound = new Set<string>();

        history.forEach(d => {
            const dateRef = d.paymentDate || d.dateCom;
            const key = dateRef.substring(0, 7);
            
            if (!grouped[key]) grouped[key] = { total: 0 };
            
            let type = d.type || 'OUTROS';
            if (type.includes('REND')) type = 'REND';
            else if (type.includes('DIV')) type = 'DIV';
            else if (type.includes('JCP') || type.includes('JURO')) type = 'JCP';
            else if (type.includes('AMORT')) type = 'AMORT';
            
            typesFound.add(type);
            
            const amount = Number(d.totalReceived) || (d.quantityOwned * d.rate);
            
            grouped[key][type] = (grouped[key][type] || 0) + amount;
            grouped[key].total += amount;
        });

        const result = [];
        let grandTotal = 0;
        let count = 0;

        for (const key of startDates) {
            const monthLabel = getMonthLabel(key);
            
            const monthData = grouped[key] || { total: 0 };
            
            if (monthData.total > 0) {
                grandTotal += monthData.total;
                count++;
            }

            result.push({ 
                month: monthLabel, 
                fullDate: key, 
                ...monthData, 
                total: monthData.total
            });
        }
        
        return { 
            data: result, 
            average: count > 0 ? grandTotal / count : 0,
            activeTypes: Array.from(typesFound)
        };
    }, [selectedAsset, dividends]);

    const assetHistory = useMemo(() => {
        if (!selectedAsset) return [];
        return dividends.filter(d => d.ticker === selectedAsset.ticker);
    }, [selectedAsset, dividends]);

    // Lógica de Imóveis (Novo Layout)
    const propertiesByState = useMemo(() => {
        if (!selectedAsset || !selectedAsset.properties) return [];
        const groups: Record<string, number> = {};
        
        selectedAsset.properties.forEach(p => {
            const parts = (p.location || 'N/A').split('-');
            const state = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
            const cleanState = state.length > 3 && !state.includes(' ') ? 'Outros' : state;
            groups[cleanState] = (groups[cleanState] || 0) + 1;
        });

        return Object.entries(groups)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], index) => ({
                name,
                value,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));
    }, [selectedAsset]);

    return (
        <div className="pb-32">
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text" placeholder="Buscar ativo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:bg-white dark:focus:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-3.5 h-3.5" /></button>}
                </div>
            </div>

            {fiis.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fundos Imobiliários</h3>
                        <InfoTooltip title="FIIs" text="Cotações com delay de ~15 minutos." />
                    </div>
                    {fiis.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} isExpanded={expandedAssetTicker === p.ticker} onToggle={() => setExpandedAssetTicker(prev => prev === p.ticker ? null : p.ticker)} onOpenDetails={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}

            {stocks.length > 0 && (
                <div className="mb-6 anim-fade-in">
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ações</h3>
                        <InfoTooltip title="Ações" text="Cotações com delay de ~15 minutos." />
                    </div>
                    {stocks.map(p => (
                        <AssetListItem key={p.ticker} asset={p} privacyMode={privacyMode} isExpanded={expandedAssetTicker === p.ticker} onToggle={() => setExpandedAssetTicker(prev => prev === p.ticker ? null : p.ticker)} onOpenDetails={() => setSelectedAsset(p)} />
                    ))}
                </div>
            )}
            
            {filtered.length === 0 && (
                <div className="text-center py-20 opacity-40 anim-fade-in">
                    <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum ativo encontrado</p>
                </div>
            )}

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && (
                    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
                        {/* Header Glassmorphism */}
                        <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 px-6 py-4 shrink-0 rounded-t-[2.5rem]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-lg font-black text-zinc-500 shadow-sm border border-zinc-200 dark:border-zinc-800">
                                        {selectedAsset.ticker.substring(0,2)}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">{selectedAsset.ticker}</h2>
                                        <p className="text-xs font-bold text-zinc-400 uppercase mt-1">{selectedAsset.assetType === AssetType.FII ? 'Fundo Imobiliário' : 'Ação'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.currentPrice, privacyMode)}</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${ (selectedAsset.dailyChange || 0) >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' }`}>
                                        {(selectedAsset.dailyChange || 0) > 0 ? '+' : ''}{(selectedAsset.dailyChange || 0).toFixed(2)}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-x-auto no-scrollbar">
                                {['RESUMO', 'RENDA', 'ANÁLISE', 'IMOVEIS'].map(tab => {
                                    if (tab === 'IMOVEIS' && (!selectedAsset.properties || selectedAsset.properties.length === 0)) return null;
                                    
                                    return (
                                        <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{tab}</button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Reduced padding here from p-6 to p-4/p-3 */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
                            {/* ABA RESUMO */}
                            {activeTab === 'RESUMO' && (
                                <div className="space-y-6 anim-fade-in">
                                    <PositionSummaryCard asset={selectedAsset} privacyMode={privacyMode} />
                                    
                                    {/* Gráficos Gerenciados pelo Container */}
                                    <ChartsContainer ticker={selectedAsset.ticker} type={selectedAsset.assetType} />
                                    
                                    <MarketPerformanceCard asset={selectedAsset} />

                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Indicadores Chave
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <MetricCard label="DY (12m)" value={formatPercent(selectedAsset.dy_12m)} highlight colorClass="text-emerald-600 dark:text-emerald-400" />
                                        <MetricCard label="P/VP" value={formatNumber(selectedAsset.p_vp)} />
                                        {selectedAsset.assetType !== AssetType.FII ? (
                                            <MetricCard label="P/L" value={formatNumber(selectedAsset.p_l)} />
                                        ) : (
                                            <MetricCard label="VP/Cota" value={selectedAsset.vpa ? formatBRL(selectedAsset.vpa) : '-'} />
                                        )}
                                    </div>

                                    {selectedAsset.vacancy !== undefined && selectedAsset.vacancy > 10 && (
                                        <div className={`p-4 rounded-xl border flex items-center justify-between bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600`}>
                                                    <AlertCircle className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold text-rose-700 dark:text-rose-400`}>Vacância Física</p>
                                                    <p className="text-[10px] opacity-70">Alerta de Ocupação</p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-black">{selectedAsset.vacancy}%</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ABA RENDA */}
                            {activeTab === 'RENDA' && (
                                <div className="anim-fade-in">
                                    <IncomeAnalysisSection asset={selectedAsset} chartData={assetDividendChartData} history={assetHistory} />
                                </div>
                            )}

                            {/* ABA ANÁLISE */}
                            {activeTab === 'ANÁLISE' && (
                                <div className="anim-fade-in">
                                    <ValuationCard asset={selectedAsset} />
                                    
                                    <DetailedInfoBlock asset={selectedAsset} />
                                    
                                    {selectedAsset.assetType === AssetType.STOCK && (
                                        <div className="mt-6">
                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <BarChart3 className="w-3 h-3" /> Eficiência & Crescimento
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <MetricCard label="ROE" value={formatPercent(selectedAsset.roe)} highlight />
                                                <MetricCard label="Margem Líq." value={formatPercent(selectedAsset.net_margin)} />
                                                <MetricCard label="Margem Bruta" value={formatPercent(selectedAsset.gross_margin)} />
                                                <MetricCard label="Margem EBIT" value={formatPercent(selectedAsset.ebit_margin)} />
                                                
                                                <MetricCard label="CAGR Rec. (5a)" value={formatPercent(selectedAsset.cagr_revenue)} />
                                                <MetricCard label="CAGR Lucro (5a)" value={formatPercent(selectedAsset.cagr_profits)} />
                                                
                                                <MetricCard label="EV/EBITDA" value={formatNumber(selectedAsset.ev_ebitda)} />
                                                <MetricCard label="Dív.Líq/EBITDA" value={formatNumber(selectedAsset.net_debt_ebitda)} />
                                                <MetricCard label="Dív.Líq/PL" value={formatNumber(selectedAsset.net_debt_equity)} />
                                                
                                                <MetricCard label="LPA" value={formatBRL(selectedAsset.lpa)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ABA IMÓVEIS */}
                            {activeTab === 'IMOVEIS' && selectedAsset.properties && (
                                <div className="anim-fade-in space-y-6">
                                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm mb-6">
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                                            <MapIcon className="w-4 h-4 text-zinc-400" /> Distribuição por Estado
                                        </h3>
                                        
                                        <div className="flex flex-col items-center">
                                            <div className="h-64 w-full relative">
                                                <ResponsiveContainer>
                                                    <RePieChart>
                                                        <Pie
                                                            data={propertiesByState}
                                                            innerRadius="60%"
                                                            outerRadius="80%"
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {propertiesByState.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px'}} itemStyle={{color:'#fff'}} />
                                                    </RePieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                                                    <span className="text-3xl font-black text-zinc-900 dark:text-white leading-none">{selectedAsset.properties.length}</span>
                                                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest leading-none">Imóveis</span>
                                                </div>
                                            </div>

                                            <div className="w-full mt-8 space-y-3">
                                                {propertiesByState.map((item) => (
                                                    <div key={item.name} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                                                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase">{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
                                                                <div className="h-full rounded-full" style={{ width: `${(item.value / selectedAsset.properties!.length) * 100}%`, backgroundColor: item.color }}></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-zinc-900 dark:text-white">{item.value}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Lista de Imóveis</h3>
                                        {selectedAsset.properties.map((prop, idx) => (
                                            <div key={idx} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 flex gap-4 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                                                    <Building2 className="w-6 h-6" strokeWidth={1.5} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wide leading-tight mb-2 line-clamp-2">
                                                        {prop.name}
                                                    </h4>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                                            <span className="font-medium">Estado:</span>
                                                            <span className="text-zinc-700 dark:text-zinc-300 font-bold">{prop.location ? (prop.location.includes('-') ? prop.location.split('-').pop()?.trim() : prop.location) : 'N/A'}</span>
                                                        </div>
                                                        {prop.abl && (
                                                            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                                                <span className="font-medium">Área bruta locável:</span>
                                                                <span className="text-zinc-700 dark:text-zinc-300 font-bold">{prop.abl}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SwipeableModal>
        </div>
    );
};

// Helper para obter label do mês
const getMonthLabel = (key: string) => {
    try {
        const [y, m] = key.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
    } catch {
        return key;
    }
};

export const Portfolio = React.memo(PortfolioComponent);