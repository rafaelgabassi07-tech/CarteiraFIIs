import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, BarChart3, PieChart, Coins, DollarSign, Building2, FileText, MapPin, Zap, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, SquareStack, Map as MapIcon, CandlestickChart, LineChart as LineChartIcon, Award, RefreshCcw, ArrowLeft, Briefcase, MoreHorizontal, LayoutGrid, List, Activity, Scale, Percent, ChevronDown, ChevronUp, ListFilter, BookOpen } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, Label, Legend, Scatter } from 'recharts';
import { formatBRL, formatDateShort, getMonthName } from '../utils/formatters';

// --- TYPES ---
interface AssetModalProps {
    asset: AssetPosition | null;
    onClose: () => void;
    onAssetRefresh: (ticker: string) => void;
    marketDividends: DividendReceipt[];
    incomeChartData: any;
    privacyMode: boolean;
}

// --- SUB-COMPONENTS & HELPERS ---

const TYPE_LABELS: { [key: string]: string } = {
    'JCP': 'JCP',
    'DIVIDENDO': 'Dividendo',
    'RENDIMENTO': 'Rendimento',
};

const getMonthLabel = (dateStr: string) => {
    return getMonthName(dateStr + '-01').substring(0, 3).toUpperCase();
};

const calculateSMA = (arr: any[], period: number, idx: number) => {
    if (idx < period - 1) return null;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < period; i++) {
        const val = arr[idx - i].close || arr[idx - i].price;
        if (val !== null && val !== undefined) {
            sum += val;
            count++;
        }
    }
    return count === period ? sum / period : null;
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

    // Limita a 50 pontos para manter a legibilidade dos Candles
    const limitedData = data.length > 50 ? data.slice(-50) : data;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    limitedData.forEach((d: any) => {
        const price = d.close || d.price || 0;
        const low = d.low || price;
        const high = d.high || price;
        
        if (low > 0 && low < minPrice) minPrice = low;
        if (high > maxPrice) maxPrice = high;
    });

    if (minPrice === Infinity) minPrice = 0;
    if (maxPrice === -Infinity) maxPrice = 100;

    const processed = limitedData.map((d: any, index: number, arr: any[]) => {
        const price = d.close || d.price || 0;
        const open = d.open ?? price;
        const high = d.high ?? price;
        const low = d.low ?? price;
        const close = d.close ?? price;
        
        const isUp = close >= open;
        
        return {
            ...d,
            open, high, low, close,
            price: close, 
            volume: d.volume || 0,
            sma20: calculateSMA(arr, 20, index),
            sma50: calculateSMA(arr, 50, index),
            volColor: isUp ? '#10b981' : '#f43f5e'
        };
    });

    const padding = (maxPrice - minPrice) * 0.15;
    const first = limitedData[0]?.close || limitedData[0]?.price || 0;
    const last = limitedData[limitedData.length - 1]?.close || limitedData[limitedData.length - 1]?.price || 0;
    const variation = first > 0 ? ((last - first) / first) * 100 : 0;

    return { 
        processedData: processed, 
        yDomain: [Math.max(0, minPrice - padding), maxPrice + padding],
        variation,
        lastPrice: last
    };
};

// Componente Visual do Candle (USANDO SCATTER PARA MÁXIMA CONFIABILIDADE)
const CustomCandleShape = (props: any) => {
    const { cx, cy, payload, yAxis } = props;
    
    if (!yAxis || !yAxis.scale || cx == null || cy == null) return null;

    const { open, close, high, low } = payload;
    if (open == null || close == null || high == null || low == null) return null;

    const scale = yAxis.scale;
    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#f43f5e'; 

    // Coordenadas Y em pixels
    const yO = scale(open);
    const yC = scale(close);
    const yH = scale(high);
    const yL = scale(low);

    // Largura fixa otimizada para 50 pontos
    const candleWidth = 6;
    const halfWidth = candleWidth / 2;

    const bodyTop = Math.min(yO, yC);
    const bodyBottom = Math.max(yO, yC);
    const bodyHeight = Math.max(2, bodyBottom - bodyTop);

    return (
        <g>
            {/* Pavio */}
            <line 
                x1={cx} 
                y1={yH} 
                x2={cx} 
                y2={yL} 
                stroke={color} 
                strokeWidth={1.5} 
                strokeOpacity={0.8}
            />
            {/* Corpo */}
            <rect 
                x={cx - halfWidth} 
                y={bodyTop} 
                width={candleWidth} 
                height={bodyHeight} 
                fill={color}
                stroke={color}
                strokeWidth={0.5}
            />
        </g>
    );
};

const CurrentPriceLabel = ({ viewBox, value }: any) => {
    const { y } = viewBox;
    // Posicionado dentro do gráfico, alinhado à direita
    // Desenha da direita para a esquerda
    return (
        <g transform={`translate(${viewBox.width}, ${y})`}>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
            </filter>
            {/* Seta apontando para a esquerda (linha do preço) */}
            <path d="M0,0 L-6,-11 H-46 A4,4 0 0 0 -50,-7 V7 A4,4 0 0 0 -46,11 H-6 L0,0 Z" fill="#6366f1" filter="url(#shadow)" />
            <text x={-28} y={4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold" fontFamily="Inter, sans-serif">
                {value.toFixed(2)}
            </text>
        </g>
    );
};

const PriceHistoryChart = ({ fullData, loading, error, ticker, range, onRangeChange }: any) => {
    const [chartType, setChartType] = useState<'AREA' | 'CANDLE'>('AREA');
    const [indicators, setIndicators] = useState({ sma20: false, sma50: false, volume: true });
    const [showFilterModal, setShowFilterModal] = useState(false);
    
    // Process data directly since API handles filtering
    const { processedData, yDomain, variation, lastPrice } = useMemo(() => processChartData(fullData), [fullData]);
    const isPositive = variation >= 0;

    const toggleIndicator = (key: keyof typeof indicators) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));

    const INTRADAY_OPTIONS = [
        { label: 'Hoje', value: '1D' },
        { label: '5 Dias', value: '5D' },
        { label: '1 Min', value: '1m' },
        { label: '5 Min', value: '5m' },
        { label: '15 Min', value: '15m' },
        { label: '1 Hora', value: '1h' },
    ];

    const HISTORY_OPTIONS = [
        { label: 'Diário', value: '1d' },
        { label: 'Semanal', value: '1wk' },
        { label: 'Mensal', value: '1mo' },
        { label: 'Trimestral', value: '3mo' },
        { label: 'Anual', value: '1y' },
    ];

    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem);
        if (['1m', '5m', '10m', '15m', '30m', '1h', '1D', '5D'].includes(range)) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <>
        <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 p-3 shadow-xl shadow-zinc-200/50 dark:shadow-black/20 mb-6 relative overflow-hidden">
            <div className="flex flex-col gap-3 mb-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <CandlestickChart className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white leading-none">Histórico de Preço</h3>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Análise Técnica</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                            <button onClick={() => setChartType('AREA')} className={`p-1.5 rounded-md transition-all ${chartType === 'AREA' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}><LineChartIcon className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setChartType('CANDLE')} className={`p-1.5 rounded-md transition-all ${chartType === 'CANDLE' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}><CandlestickChart className="w-3.5 h-3.5" /></button>
                        </div>
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className={`p-2 rounded-lg transition-all ${showFilterModal ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-lg">
                    <div className="flex gap-1.5">
                         <button onClick={() => toggleIndicator('sma20')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all ${indicators.sma20 ? 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400' : 'border-transparent text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>MA20</button>
                         <button onClick={() => toggleIndicator('sma50')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all ${indicators.sma50 ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-400' : 'border-transparent text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>MA50</button>
                    </div>
                    <div className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {isPositive ? '+' : ''}{variation.toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="h-60 w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10"><div className="animate-pulse text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">Carregando...</div></div>
                ) : error || !fullData || fullData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados indisponíveis</div>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded-br-xl border-r border-b border-zinc-100 dark:border-zinc-800">
                            <span className={`text-xs font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{isPositive ? '+' : ''}{variation.toFixed(2)}%</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={processedData} margin={{ top: 10, right: 0, left: -15, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="date" 
                                    hide={false} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 9, fill: '#71717a'}} 
                                    tickFormatter={formatXAxis}
                                    minTickGap={30}
                                    height={20}
                                />
                                <YAxis yAxisId="price" domain={yDomain} hide={false} orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#71717a'}} width={40} tickFormatter={(val) => val.toFixed(2)} tickMargin={5} />
                                <YAxis yAxisId="volume" hide={true} domain={[0, 'dataMax * 4']} />
                                <Tooltip 
                                    cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }} 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            const open = d.candleData?.open ?? d.open;
                                            const close = d.candleData?.close ?? d.close;
                                            const high = d.candleData?.high ?? d.high;
                                            const low = d.candleData?.low ?? d.low;
                                            const volume = d.volume;
                                            
                                            const change = close - open;
                                            const changePercent = open > 0 ? (change / open) * 100 : 0;
                                            const isUp = change >= 0;

                                            return (
                                                <div className="bg-zinc-900/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                                                            {new Date(label).toLocaleDateString('pt-BR')} {new Date(label).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] font-medium mb-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-zinc-500">Abe</span>
                                                            <span className="text-zinc-300 tabular-nums">{formatBRL(open)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-zinc-500">Max</span>
                                                            <span className="text-emerald-400/90 tabular-nums">{formatBRL(high)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-zinc-500">Min</span>
                                                            <span className="text-rose-400/90 tabular-nums">{formatBRL(low)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-zinc-500">Fec</span>
                                                            <span className={`font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {formatBRL(close)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {(volume > 0 || d.sma20 || d.sma50) && (
                                                        <div className="space-y-1 pt-2 border-t border-white/5">
                                                            {volume > 0 && (
                                                                <div className="flex justify-between text-[9px]">
                                                                    <span className="text-zinc-500 uppercase font-bold">Vol</span>
                                                                    <span className="text-zinc-400 tabular-nums">
                                                                        {(volume / 1000000).toFixed(2)}M
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {d.sma20 && (
                                                                <div className="flex justify-between text-[9px]">
                                                                    <span className="text-amber-500/80 uppercase font-bold">MA20</span>
                                                                    <span className="text-amber-500 tabular-nums">{formatBRL(d.sma20)}</span>
                                                                </div>
                                                            )}
                                                            {d.sma50 && (
                                                                <div className="flex justify-between text-[9px]">
                                                                    <span className="text-violet-500/80 uppercase font-bold">MA50</span>
                                                                    <span className="text-violet-500 tabular-nums">{formatBRL(d.sma50)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} 
                                />
                                <ReferenceLine y={lastPrice} yAxisId="price" stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.8} ifOverflow="extendDomain"><Label content={<CurrentPriceLabel value={lastPrice} />} position="right" /></ReferenceLine>
                                {indicators.volume && <Bar dataKey="volume" yAxisId="volume" barSize={range === '1Y' ? 2 : 4} fillOpacity={0.3} radius={[2, 2, 0, 0]}>{processedData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.volColor} />))}</Bar>}
                                
                                {chartType === 'AREA' ? (
                                    <Area 
                                        yAxisId="price" 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke={isPositive ? '#10b981' : '#f43f5e'} 
                                        strokeWidth={2} 
                                        fillOpacity={1} 
                                        fill="url(#colorPrice)" 
                                        animationDuration={1500} 
                                        animationEasing="ease-out"
                                        activeDot={{ r: 4, strokeWidth: 0, fill: isPositive ? '#10b981' : '#f43f5e' }}
                                    />
                                ) : (
                                    /* Passamos [low, high] para o Recharts calcular a escala Y, mas o shape cuida do corpo */
                                    <Scatter 
                                        yAxisId="price" 
                                        data={processedData} 
                                        shape={<CustomCandleShape />} 
                                        isAnimationActive={false} 
                                    />
                                )}

                                {indicators.sma20 && <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls animationDuration={1500} />}
                                {indicators.sma50 && <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1.5} dot={false} connectNulls animationDuration={1500} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>

        <SwipeableModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} className="h-[50dvh]">
            <div className="p-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <ListFilter className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-none">Intervalo de tempo</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">Selecione a granularidade do gráfico</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Intraday (Tempo Real)</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {INTRADAY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onRangeChange(opt.value); setShowFilterModal(false); }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${range === opt.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Histórico</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {HISTORY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onRangeChange(opt.value); setShowFilterModal(false); }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${range === opt.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>
        </>
    );
};

const ComparativeChart = ({ ticker, type }: any) => {
    const [range, setRange] = useState('1Y');
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    
    const [visibleBenchmarks, setVisibleBenchmarks] = useState({
        'CDI': true,
        'IPCA': true,
        'IBOV': true,
        'IFIX': type === 'FII' 
    });

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                // Fetch data specifically for this chart based on its own range
                const res = await fetch(`/api/history?ticker=${ticker}&range=${range}`);
                if (!res.ok) throw new Error('Failed to fetch history');
                const json = await res.json();
                if (mounted) setChartData(json.points || []);
            } catch (e) {
                console.error(e);
                if (mounted) setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [ticker, range]);

    const toggleBenchmark = (key: string) => {
        const k = key as keyof typeof visibleBenchmarks;
        setVisibleBenchmarks(prev => ({ ...prev, [k]: !prev[k] }));
    };

    // No need to filter locally anymore, API handles it
    const filteredData = chartData;

    const INTRADAY_OPTIONS = [
        { label: 'Hoje', value: '1D' },
        { label: '5 Dias', value: '5D' },
        { label: '1 Min', value: '1m' },
        { label: '5 Min', value: '5m' },
        { label: '15 Min', value: '15m' },
        { label: '1 Hora', value: '1h' },
    ];

    const HISTORY_OPTIONS = [
        { label: 'Diário', value: '1d' },
        { label: 'Semanal', value: '1wk' },
        { label: 'Mensal', value: '1mo' },
        { label: 'Trimestral', value: '3mo' },
        { label: 'Anual', value: '1y' },
    ];

    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem);
        if (['1m', '5m', '10m', '15m', '30m', '1h', '1D', '5D'].includes(range)) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm mb-4 relative overflow-hidden transition-all duration-300">
            <div className="flex flex-col gap-3 mb-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Rentabilidade
                    </h3>
                    <div className="flex items-center gap-2">
                         <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                            {['1Y', '2Y', '5Y', 'MAX'].map((r) => (
                                <button key={r} onClick={() => setRange(r)} className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{r}</button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className={`p-1.5 rounded-lg transition-all ${showFilterModal ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-900/20">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">{ticker}</span>
                    </div>
                    <button onClick={() => toggleBenchmark('CDI')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.CDI ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-zinc-500"></span><span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400">CDI</span>
                    </button>
                    <button onClick={() => toggleBenchmark('IPCA')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.IPCA ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span><span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-300">IPCA</span>
                    </button>
                    <button onClick={() => toggleBenchmark('IBOV')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.IBOV ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-[9px] font-bold text-amber-700 dark:text-amber-300">IBOV</span>
                    </button>
                    {type === 'FII' && (
                        <button onClick={() => toggleBenchmark('IFIX')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.IFIX ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">IFIX</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="h-56 w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
                        <div className="animate-pulse text-xs font-bold text-zinc-400">Carregando dados...</div>
                    </div>
                ) : !filteredData || filteredData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados insuficientes</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis 
                                dataKey="date" 
                                hide={false} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#71717a'}} 
                                tickFormatter={formatXAxis} 
                                minTickGap={40}
                                height={20}
                            />
                            <YAxis 
                                hide={false} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#71717a'}} 
                                width={35}
                                tickFormatter={(val) => `${val.toFixed(0)}%`}
                            />
                            <ReferenceLine y={0} stroke="#71717a" strokeOpacity={0.3} strokeWidth={1} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px', padding: '10px', backdropFilter: 'blur(8px)' }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR') + ' ' + new Date(label).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                itemSorter={(item) => -(item.value as number)}
                                formatter={(value: number, name: string) => {
                                    const formattedVal = `${value.toFixed(2)}%`;
                                    let color = '#fff';
                                    let label = name;
                                    
                                    if (name === 'assetPct') { label = ticker; color = '#6366f1'; }
                                    if (name === 'ibovPct') { label = 'IBOV'; color = '#f59e0b'; }
                                    if (name === 'ifixPct') { label = 'IFIX'; color = '#10b981'; }
                                    if (name === 'cdiPct') { label = 'CDI'; color = '#52525b'; }
                                    if (name === 'ipcaPct') { label = 'IPCA'; color = '#06b6d4'; }

                                    return [
                                        <span className="font-bold tabular-nums" style={{color}}>{formattedVal}</span>,
                                        <span className="flex items-center gap-1.5 text-zinc-400">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: color}}></span>
                                            {label}
                                        </span>
                                    ];
                                }}
                            />
                            
                            {visibleBenchmarks.CDI && <Line type="monotone" dataKey="cdiPct" stroke="#52525b" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="3 3" animationDuration={1000} />}
                            {visibleBenchmarks.IPCA && <Line type="monotone" dataKey="ipcaPct" stroke="#06b6d4" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="3 3" animationDuration={1000} />}
                            {visibleBenchmarks.IBOV && <Line type="monotone" dataKey="ibovPct" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls animationDuration={1000} />}
                            {visibleBenchmarks.IFIX && <Line type="monotone" dataKey="ifixPct" stroke="#10b981" strokeWidth={1.5} dot={false} connectNulls animationDuration={1000} />}
                            
                            <Line type="monotone" dataKey="assetPct" stroke="#6366f1" strokeWidth={2.5} dot={false} connectNulls animationDuration={1500} animationEasing="ease-out" activeDot={{ r: 5, strokeWidth: 0, fill: '#6366f1' }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>

        <SwipeableModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} className="h-[50dvh]">
            <div className="p-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <ListFilter className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-none">Intervalo de tempo</h2>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">Selecione a granularidade do gráfico</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Intraday (Tempo Real)</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {INTRADAY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setRange(opt.value); setShowFilterModal(false); }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${range === opt.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Histórico</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {HISTORY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setRange(opt.value); setShowFilterModal(false); }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${range === opt.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </SwipeableModal>
        </>
    );
};

const SimulatorCard = ({ data, ticker, dividends = [] }: any) => {
    const [amount, setAmount] = useState(1000);
    const [reinvest, setReinvest] = useState(true);
    
    const simulation = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 5);
        const simData = data.filter((d: any) => new Date(d.date) >= cutoff);
        
        if (simData.length === 0) return null;

        const first = simData[0];
        const last = simData[simData.length - 1];
        
        const startPrice = first.price || first.close;
        const startDate = new Date(first.date);
        const endDate = new Date(last.date);
        const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (!startPrice) return null;

        // Initial State
        let shares = Math.floor(amount / startPrice);
        let cash = amount - (shares * startPrice);
        let totalDividends = 0;
        let totalReinvested = 0;

        // Sort dividends
        const sortedDivs = [...dividends]
            .filter(d => new Date(d.paymentDate || d.dateCom) >= startDate)
            .sort((a: any, b: any) => new Date(a.paymentDate || a.dateCom).getTime() - new Date(b.paymentDate || b.dateCom).getTime());

        if (reinvest) {
            sortedDivs.forEach((div: any) => {
                const paymentDate = new Date(div.paymentDate || div.dateCom);
                const divAmount = shares * div.value;
                totalDividends += divAmount;
                cash += divAmount;

                const priceOnDate = simData.find((d: any) => new Date(d.date) >= paymentDate)?.price || last.price;
                if (priceOnDate) {
                    const newShares = Math.floor(cash / priceOnDate);
                    if (newShares > 0) {
                        shares += newShares;
                        const reinvestedValue = newShares * priceOnDate;
                        cash -= reinvestedValue;
                        totalReinvested += reinvestedValue;
                    }
                }
            });
        } else {
            totalDividends = sortedDivs.reduce((acc, div) => acc + (shares * div.value), 0);
        }

        const finalValue = (shares * (last.price || last.close)) + cash;
        const totalProfit = finalValue - amount;
        const totalProfitPercent = (totalProfit / amount) * 100;
        const cagr = (Math.pow(finalValue / amount, 1 / (totalDays / 365.25)) - 1) * 100;

        return {
            initial: amount,
            final: finalValue,
            profit: totalProfit,
            profitPercent: totalProfitPercent,
            dividends: totalDividends,
            reinvested: totalReinvested,
            cagr: cagr,
            period: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`
        };

    }, [data, amount, reinvest, dividends]);

    return (
        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Simulador de Investimento</h4>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-zinc-500">Reinvestir?</label>
                    <button onClick={() => setReinvest(!reinvest)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${reinvest ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                        <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${reinvest ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label className="text-[10px] font-bold text-zinc-400">Valor Inicial (R$)</label>
                <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-zinc-700 p-2 rounded-lg text-lg font-bold text-center mt-1"
                />
            </div>

            {simulation ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white dark:bg-zinc-700/50 p-3 rounded-lg">
                        <p className="text-xs text-zinc-500">Valor Final</p>
                        <p className="font-bold text-emerald-500 text-base">{formatBRL(simulation.final)}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-700/50 p-3 rounded-lg">
                        <p className="text-xs text-zinc-500">Lucro Total</p>
                        <p className="font-bold text-base">{formatBRL(simulation.profit)} ({simulation.profitPercent.toFixed(2)}%)</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-700/50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-zinc-500">Dividendos Recebidos</p>
                        <p className="font-bold text-base">{formatBRL(simulation.dividends)}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-700/50 p-3 rounded-lg">
                        <p className="text-xs text-zinc-500">CAGR</p>
                        <p className="font-bold text-base">{simulation.cagr.toFixed(2)}% a.a.</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-700/50 p-3 rounded-lg">
                        <p className="text-xs text-zinc-500">Período</p>
                        <p className="font-bold text-base">{simulation.period}</p>
                    </div>
                </div>
            ) : <p className="text-xs text-center text-zinc-400">Dados insuficientes para simulação.</p>}
        </div>
    );
};

const PositionSummaryCard = ({ asset, privacyMode }: { asset: AssetPosition, privacyMode: boolean }) => {
    if (asset.quantity === 0) return null;

    const totalValue = asset.quantity * (asset.currentPrice || 0);
    const totalCost = asset.quantity * asset.averagePrice;
    const result = totalValue - totalCost;
    const resultPercent = totalCost > 0 ? (result / totalCost) * 100 : 0;

    const isPositive = result >= 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Posição</p>
                <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter">{formatBRL(totalValue, privacyMode)}</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Resultado</p>
                <p className={`text-lg font-black tracking-tighter ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{isPositive ? '+' : ''}{formatBRL(result, privacyMode)}</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Evolução</p>
                <p className={`text-lg font-black tracking-tighter ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{isPositive ? '+' : ''}{resultPercent.toFixed(2)}%</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Qtd.</p>
                <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter">{asset.quantity}</p>
            </div>
        </div>
    );
};

const ValuationCard = ({ asset }: { asset: AssetPosition }) => {
    const pvp = asset['p_vp'] || 0;
    const pl = asset['p_l'] || 0;
    const dy = asset['dy_12m'] || 0;

    const getValuationColor = (value: number, thresholds: [number, number]) => {
        if (value <= thresholds[0]) return 'text-emerald-500';
        if (value <= thresholds[1]) return 'text-amber-500';
        return 'text-rose-500';
    };

    return (
        <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-1.5">P/VP <InfoTooltip title="P/VP" text="Preço sobre Valor Patrimonial. Idealmente abaixo de 1." /></p>
                <p className={`text-lg font-black tracking-tighter ${getValuationColor(pvp, [1, 1.5])}`}>{pvp.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-1.5">P/L <InfoTooltip title="P/L" text="Preço sobre Lucro. Mede o quão 'caro' o ativo está em relação ao lucro que gera." /></p>
                <p className={`text-lg font-black tracking-tighter ${getValuationColor(pl, [10, 15])}`}>{pl.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-1.5">Div. Yield <InfoTooltip title="Div. Yield" text="Dividend Yield. Rendimento de dividendos em relação ao preço." /></p>
                <p className="text-lg font-black tracking-tighter text-emerald-500">{(dy * 100).toFixed(2)}%</p>
            </div>
        </div>
    );
};

const DetailedInfoBlock = ({ asset }: { asset: AssetPosition }) => {
    const dataPoints = [
        { label: 'Cotação Atual', value: formatBRL(asset.currentPrice || 0), icon: DollarSign },
        { label: 'Preço Médio', value: formatBRL(asset.averagePrice), icon: Scale },
        { label: 'Tipo', value: asset.assetType, icon: Briefcase },
        { label: 'Segmento', value: asset.segment, icon: PieChart },
        { label: 'Patrim. Líquido', value: asset.assets_value, icon: Wallet },
        { label: 'P/VP', value: asset.p_vp?.toFixed(2), icon: Percent },
        { label: 'P/L', value: asset.p_l?.toFixed(2), icon: Percent },
        { label: 'Dividend Yield', value: asset.dy_12m ? `${(asset.dy_12m * 100).toFixed(2)}%` : 'N/A', icon: Coins },
        { label: 'Vacância', value: asset.vacancy ? `${(asset.vacancy * 100).toFixed(2)}%` : 'N/A', icon: MapPin },
        { label: 'Imóveis', value: asset.properties_count, icon: Building2 },
    ].filter(d => d.value);

    return (
        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                {dataPoints.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-start gap-2">
                        <Icon className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 leading-tight">{label}</p>
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white">{value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PropertiesAnalysis = ({ properties }: { properties: any[] }) => {
    if (!properties || properties.length === 0) return null;

    return (
        <div className="space-y-3">
            {properties.map((prop, index) => (
                <div key={index} className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-sm text-zinc-900 dark:text-white">{prop.name}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1"><MapIcon className="w-3 h-3" /> {prop.city} / {prop.state}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-zinc-500">ABL</p>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{(prop.area * 100).toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const IncomeAnalysisSection = ({ asset, chartData, marketHistory, isWatchlist = false }: any) => {
    // Tenta pegar dos dividendos do ativo (carteira) ou do histórico de mercado (watchlist)
    const lastDividend = asset.dividends.length > 0 
        ? asset.dividends[0] 
        : (marketHistory && marketHistory.length > 0 
            ? [...marketHistory].sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0] 
            : null);

    const totalInvested = (asset.averagePrice || 0) * (asset.quantity || 0);
    const yieldOnCost = totalInvested > 0 ? ((asset.totalDividends || 0) / totalInvested) * 100 : 0;

    // Se for watchlist, usamos o DY de 12m dos fundamentos
    const displayYield = isWatchlist ? (asset.dy_12m * 100) : yieldOnCost;
    const yieldLabel = isWatchlist ? "Dividend Yield (12m)" : "Yield on Cost";

    const nextEvents = marketHistory
        .filter((d: any) => new Date(d.paymentDate) >= new Date())
        .sort((a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
        .slice(0, 3);

    // Para Watchlist, o gráfico deve mostrar o histórico de pagamentos por cota (rate)
    // Para Carteira, mostra o total recebido (rate * quantity)
    // Como chartData vem pronto de fora (baseado em receipts), precisamos adaptar ou usar marketHistory
    
    const historyChartData = useMemo(() => {
        if (!isWatchlist) return chartData.data;

        // Agrupar marketHistory por mês para mostrar evolução dos pagamentos por cota
        const grouped = new Map();
        // Pegar últimos 12 meses ou 24 meses
        const sortedHistory = [...marketHistory].sort((a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        
        sortedHistory.forEach((d: any) => {
            if (!d.paymentDate) return;
            const date = new Date(d.paymentDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = getMonthLabel(key);
            
            if (!grouped.has(key)) {
                grouped.set(key, { month: monthLabel, date: key, total: 0 });
            }
            grouped.get(key).total += d.rate;
        });

        return Array.from(grouped.values())
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .slice(-12); // Últimos 12 meses com pagamento
    }, [chartData, marketHistory, isWatchlist]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Último Provento</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(lastDividend?.value || lastDividend?.rate || 0)}</p>
                    <p className="text-xs text-zinc-500">em {formatDateShort(lastDividend?.paymentDate)}</p>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-xl">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{yieldLabel}</p>
                    <p className="text-lg font-black text-emerald-500">{displayYield.toFixed(2)}%</p>
                    <p className="text-xs text-zinc-500">{isWatchlist ? 'Atual' : 'Sobre custo'}</p>
                </div>
            </div>

            <div>
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Próximos Eventos</h4>
                {nextEvents.length > 0 ? (
                    <div className="space-y-2">
                        {nextEvents.map((event: any, i: number) => (
                            <div key={i} className="bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{formatBRL(event.rate || event.value)} <span className="text-zinc-500 text-[10px]">({TYPE_LABELS[event.type] || event.type})</span></p>
                                    <p className="text-[10px] text-zinc-500">Data Com: {formatDateShort(event.dateCom)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-emerald-500">{formatDateShort(event.paymentDate)}</p>
                                    <p className="text-[10px] text-zinc-500">Pagamento</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-xs text-zinc-400 italic">Nenhum evento futuro anunciado.</p>}
            </div>

            <div className="h-60 w-full">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Histórico de Pagamentos (Por Cota)</p>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => formatBRL(val)} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number) => [formatBRL(value), isWatchlist ? 'Valor por Cota' : 'Total Recebido']} />
                        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const Investidor10ChartsSection = ({ ticker, assetType, onlyPayout = false }: any) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [chartType, setChartType] = useState(assetType === 'FII' ? 'net_worth' : 'net_profit');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                const res = await fetch(`/api/investidor10?ticker=${ticker}`);
                if (!res.ok) throw new Error('Failed to fetch data');
                const json = await res.json();
                setData(json);
            } catch (e) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [ticker]);

    const chartData = data ? data[chartType] : [];
    const isFII = assetType === 'FII';

    const chartConfig = {
        net_profit: { title: 'Receitas e Lucros', barKey: 'lucroLiquido', areaKey: 'receitaLiquida', barColor: '#8b5cf6', areaColor: '#ec4899' },
        payout_dy: { title: 'Payout x Dividend Yield', barKey: 'payout', areaKey: 'dy', barColor: isFII ? '#10b981' : '#06b6d4', areaColor: '#f59e0b' },
        net_worth: { title: isFII ? 'Histórico de Proventos' : 'Patrimônio Líquido', barKey: isFII ? 'rendimento' : 'patrimonioLiquido', areaKey: 'cotas', barColor: '#10b981', areaColor: '#6366f1' },
    };

    const currentChart = chartConfig[chartType as keyof typeof chartConfig];

    if (loading) return <div className="text-center text-zinc-400">Carregando...</div>;
    if (error || !data) return <div className="text-center text-zinc-400">Dados não disponíveis.</div>;
    if (onlyPayout) {
        return (
            <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data['payout_dy']} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number, name: string) => [name === 'payout' ? `${value.toFixed(2)}%` : `${(value * 100).toFixed(2)}%`, name === 'payout' ? 'Payout' : 'Div. Yield']} />
                        <Bar yAxisId="left" dataKey="payout" fill={isFII ? '#10b981' : '#06b6d4'} radius={[4, 4, 0, 0]} name="Payout" />
                        <Line yAxisId="right" dataKey="dy" stroke="#f59e0b" strokeWidth={2} dot={false} name="Div. Yield" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        )
    }

    return (
        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{currentChart.title}</h4>
                <div className="flex p-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg">
                    {isFII ? (
                        <>
                            <button onClick={() => setChartType('net_worth')} className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${chartType === 'net_worth' ? 'bg-white dark:bg-zinc-600' : ''}`}>Proventos</button>
                            <button onClick={() => setChartType('payout_dy')} className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${chartType === 'payout_dy' ? 'bg-white dark:bg-zinc-600' : ''}`}>DY</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setChartType('net_profit')} className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${chartType === 'net_profit' ? 'bg-white dark:bg-zinc-600' : ''}`}>Lucros</button>
                            <button onClick={() => setChartType('net_worth')} className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${chartType === 'net_worth' ? 'bg-white dark:bg-zinc-600' : ''}`}>Patrimônio</button>
                            <button onClick={() => setChartType('payout_dy')} className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${chartType === 'payout_dy' ? 'bg-white dark:bg-zinc-600' : ''}`}>Payout</button>
                        </>
                    )}
                </div>
            </div>
            <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => isFII && chartType === 'net_worth' ? formatBRL(val) : `R$${(val / 1e9).toFixed(1)}bi`} />
                        {chartType !== 'net_worth' && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1e9).toFixed(1)}bi`} />}
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number) => [formatBRL(value), null]} />
                        <Bar yAxisId="left" dataKey={currentChart.barKey} fill={currentChart.barColor} radius={[4, 4, 0, 0]} />
                        {currentChart.areaKey && <Area yAxisId={chartType === 'net_worth' ? 'left' : 'right'} dataKey={currentChart.areaKey} fill={currentChart.areaColor} stroke={currentChart.areaColor} fillOpacity={0.2} />}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ChartsContainer = ({ ticker, type, marketDividends }: { ticker: string, type: AssetType, marketDividends: DividendReceipt[] }) => {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [range, setRange] = useState('1D'); // Default to 1D (Intraday)

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                const res = await fetch(`/api/history?ticker=${ticker}&range=${range}`);
                if (!res.ok) throw new Error('Failed to fetch history');
                const json = await res.json();
                if (mounted) setHistoryData(json.points || []);
            } catch (e) {
                console.error(e);
                if (mounted) setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [ticker, range]);

    return (
        <div className="space-y-6">
            <PriceHistoryChart 
                fullData={historyData} 
                loading={loading} 
                error={error} 
                ticker={ticker} 
                range={range}
                onRangeChange={setRange}
            />
            <ComparativeChart 
                ticker={ticker} 
                type={type} 
            />
            <SimulatorCard 
                data={historyData} 
                ticker={ticker} 
                dividends={marketDividends} 
            />
        </div>
    );
};


// --- MAIN COMPONENT ---

const AssetModal = ({ asset, onClose, onAssetRefresh, marketDividends, incomeChartData, privacyMode }: AssetModalProps) => {
    const [activeTab, setActiveTab] = useState('OVERVIEW');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!asset) return null;

    const selectedAsset = asset;
    const assetMarketHistory = marketDividends.filter(d => d.ticker === selectedAsset.ticker);
    const isWatchlist = selectedAsset.quantity === 0;

    return (
        <SwipeableModal isOpen={!!asset} onClose={onClose}>
            {selectedAsset && (
                <div className="bg-primary-light dark:bg-primary-dark rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '95vh' }}>
                    <div className="p-4 sticky top-0 bg-primary-light dark:bg-primary-dark z-10 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                {selectedAsset.logoUrl && <img src={selectedAsset.logoUrl} className="w-6 h-6 rounded-full" />}
                                <span className="font-black text-lg">{selectedAsset.ticker}</span>
                            </div>
                            <button onClick={() => onAssetRefresh(selectedAsset.ticker)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full active:scale-95 transition-transform">
                                <RefreshCcw className="w-4 h-4 text-zinc-500" />
                            </button>
                        </div>

                        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                            <button 
                                onClick={() => setActiveTab('OVERVIEW')} 
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> {isWatchlist ? 'Análise' : 'Resumo'}
                            </button>
                            {!isWatchlist && (
                                <button 
                                    onClick={() => setActiveTab('ANALYSIS')} 
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                >
                                    <FileText className="w-3.5 h-3.5" /> Análises
                                </button>
                            )}
                            <button 
                                onClick={() => setActiveTab('INCOME')} 
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'INCOME' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            >
                                <Coins className="w-3.5 h-3.5" /> Proventos
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto p-4">
                        <div className="space-y-6">
                            {activeTab === 'OVERVIEW' && (
                                <div className="anim-fade-in space-y-6">
                                    {!isWatchlist && (
                                        <>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sua Posição</h3>
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                            </div>
                                            <PositionSummaryCard asset={selectedAsset} privacyMode={privacyMode} />
                                        </>
                                    )}
                                    
                                    <div className="flex items-center gap-3 mt-8 mb-2">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Gráficos</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                    </div>
                                    <ChartsContainer 
                                        ticker={selectedAsset.ticker} 
                                        type={selectedAsset.assetType} 
                                        marketDividends={assetMarketHistory}
                                    />

                                    {isWatchlist && (
                                        <>
                                            <div className="flex items-center gap-3 mt-8 mb-2">
                                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Valuation</h3>
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                            </div>
                                            <ValuationCard asset={selectedAsset} />
                                            
                                            <div className="flex items-center gap-3 mt-8 mb-2">
                                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Fundamentos</h3>
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                            </div>
                                            <DetailedInfoBlock asset={selectedAsset} />
                                            <Investidor10ChartsSection ticker={selectedAsset.ticker} assetType={selectedAsset.assetType} />
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'ANALYSIS' && !isWatchlist && (
                                <div className="anim-fade-in space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Valuation</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                    </div>
                                    <ValuationCard asset={selectedAsset} />
                                    
                                    <div className="flex items-center gap-3 mt-8 mb-2">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Histórico Fundamentalista</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                    </div>
                                    <Investidor10ChartsSection ticker={selectedAsset.ticker} assetType={selectedAsset.assetType} />

                                    <div className="flex items-center gap-3 mt-8 mb-2">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Indicadores</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                    </div>
                                    <DetailedInfoBlock asset={selectedAsset} />
                                    
                                    {selectedAsset.properties && selectedAsset.properties.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-3 mt-8 mb-2">
                                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Portfólio Físico</h3>
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                            </div>
                                            <PropertiesAnalysis properties={selectedAsset.properties} />
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'INCOME' && (
                                <div className="anim-fade-in space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Histórico de Proventos</h3>
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                    </div>
                                    <IncomeAnalysisSection 
                                        asset={selectedAsset} 
                                        chartData={incomeChartData}
                                        marketHistory={assetMarketHistory}
                                        isWatchlist={isWatchlist}
                                    />
                                    {selectedAsset.assetType === AssetType.STOCK && (
                                        <div className="mt-8">
                                            <div className="flex items-center gap-3 mb-4">
                                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Histórico de Payout</h3>
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                                            </div>
                                            <Investidor10ChartsSection ticker={selectedAsset.ticker} assetType={selectedAsset.assetType} onlyPayout={true} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </SwipeableModal>
    );
};

export default AssetModal;
