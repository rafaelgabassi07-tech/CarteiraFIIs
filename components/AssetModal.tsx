import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, BarChart3, PieChart, Coins, DollarSign, Building2, FileText, MapPin, Zap, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, SquareStack, Map as MapIcon, CandlestickChart, LineChart as LineChartIcon, Award, RefreshCcw, ArrowLeft, Briefcase, MoreHorizontal, LayoutGrid, List, Activity, Scale, Percent, ChevronDown, ChevronUp, ListFilter, BookOpen, Calendar } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, Label, Legend, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBRL, formatCompactBRL, formatDateShort, getMonthName } from '../utils/formatters';

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

const DataRow = ({ label, value, color = 'text-zinc-900 dark:text-white', icon, subValue }: { label: string, value: string | React.ReactNode, color?: string, icon?: React.ReactNode, subValue?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 group">
        <div className="flex items-center gap-2.5">
            {icon && <div className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors">{icon}</div>}
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{label}</span>
                {subValue && <span className="text-[9px] font-bold text-zinc-500 mt-1">{subValue}</span>}
            </div>
        </div>
        <div className={`text-sm font-black tabular-nums text-right ${color}`}>{value}</div>
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string, icon: any, action?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em]">{title}</h3>
        </div>
        {action}
    </div>
);

const TYPE_LABELS: { [key: string]: string } = {
    'JCP': 'JCP',
    'DIVIDENDO': 'Dividendo',
    'RENDIMENTO': 'Rendimento',
};

const getMonthLabel = (dateStr: string): string => {
    if (!dateStr) return '';
    return getMonthName(`${dateStr}-01`).substring(0, 3).toUpperCase();
};

const calculateSMA = (arr: any[], period: number, idx: number): number | null => {
    if (idx < period - 1 || !arr || arr.length === 0) return null;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < period; i++) {
        const item = arr[idx - i];
        const val = item?.close ?? item?.price;
        if (typeof val === 'number' && !isNaN(val)) {
            sum += val;
            count++;
        }
    }
    return count === period ? sum / period : null;
};

// Filter data by Range (Local processing)
const filterDataByRange = (data: any[], range: string): any[] => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
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
    
    return data.filter(d => d?.date && new Date(d.date) >= cutoff);
};

const processChartData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return { processedData: [], yDomain: ['auto', 'auto'], variation: 0, lastPrice: 0 };

    // Limita a 50 pontos para manter a legibilidade dos Candles
    const limitedData = data.length > 50 ? data.slice(-50) : data;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    limitedData.forEach((d: any) => {
        if (!d) return;
        const price = d.close ?? d.price ?? 0;
        const low = d.low ?? price;
        const high = d.high ?? price;
        
        if (low > 0 && low < minPrice) minPrice = low;
        if (high > maxPrice) maxPrice = high;
    });

    if (minPrice === Infinity) minPrice = 0;
    if (maxPrice === -Infinity) maxPrice = 100;

    const processed = limitedData.map((d: any, index: number, arr: any[]) => {
        const price = d.close ?? d.price ?? 0;
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
    const first = limitedData[0]?.close ?? limitedData[0]?.price ?? 0;
    const last = limitedData[limitedData.length - 1]?.close ?? limitedData[limitedData.length - 1]?.price ?? 0;
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
    
    if (!yAxis?.scale || cx == null || cy == null || !payload) return null;

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
    if (!viewBox || typeof value !== 'number') return null;
    const { y, width } = viewBox;
    // Posicionado dentro do gráfico, alinhado à direita
    // Desenha da direita para a esquerda
    return (
        <g transform={`translate(${width}, ${y})`}>
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

interface PriceHistoryChartProps {
    fullData: any[];
    loading: boolean;
    error: boolean;
    ticker: string;
    range: string;
    onRangeChange: (range: string) => void;
    averagePrice?: number;
}

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ fullData, loading, error, ticker, range, onRangeChange, averagePrice }) => {
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
        <div className="mb-6 relative overflow-hidden">
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                            <LineChartIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Histórico de Preço</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className={`p-2 rounded-lg transition-all border ${showFilterModal ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 items-center justify-between py-2 border-y border-zinc-100 dark:border-zinc-900/50">
                    <div className="flex gap-1.5">
                         <button onClick={() => toggleIndicator('sma20')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all ${indicators.sma20 ? 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400' : 'border-transparent text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>MA20</button>
                         <button onClick={() => toggleIndicator('sma50')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all ${indicators.sma50 ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-400' : 'border-transparent text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>MA50</button>
                    </div>
                    <div className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {isPositive ? '+' : ''}{variation.toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="h-64 w-full relative">
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
                                {averagePrice && (
                                    <ReferenceLine 
                                        y={averagePrice} 
                                        yAxisId="price" 
                                        stroke="#8b5cf6" 
                                        strokeDasharray="3 3" 
                                        label={{ 
                                            value: 'Preço Médio', 
                                            position: 'left', 
                                            fill: '#8b5cf6', 
                                            fontSize: 8, 
                                            fontWeight: 900,
                                            className: 'uppercase tracking-widest'
                                        }} 
                                    />
                                )}
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

interface ComparativeChartProps {
    ticker: string;
    type: string;
}

const ComparativeChart: React.FC<ComparativeChartProps> = ({ ticker, type }) => {
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
            setChartData([]); // Reset data on change
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
        <div className="mb-6 relative overflow-hidden">
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            Rentabilidade
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800">
                            {['1Y', '2Y', '5Y', 'MAX'].map((r) => (
                                <button key={r} onClick={() => setRange(r)} className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{r}</button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowFilterModal(true)}
                            className={`p-1.5 rounded-lg transition-all border ${showFilterModal ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 py-2 border-y border-zinc-100 dark:border-zinc-900/50">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-900/20">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">{ticker}</span>
                    </div>
                    <button onClick={() => toggleBenchmark('CDI')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.CDI ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-zinc-500"></span><span className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400">CDI</span>
                    </button>
                    <button onClick={() => toggleBenchmark('IPCA')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.IPCA ? 'bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-[9px] font-bold text-orange-600 dark:text-orange-400">IPCA</span>
                    </button>
                    <button onClick={() => toggleBenchmark('IBOV')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.IBOV ? 'bg-sky-100 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span><span className="text-[9px] font-bold text-sky-600 dark:text-sky-400">IBOV</span>
                    </button>
                    {type === 'FII' && (
                        <button onClick={() => toggleBenchmark('IFIX')} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${visibleBenchmarks.IFIX ? 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">IFIX</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="h-64 w-full relative">
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

interface PositionSummaryCardProps {
    asset: AssetPosition;
    privacyMode: boolean;
}

const PositionSummaryCard: React.FC<PositionSummaryCardProps> = ({ asset, privacyMode }) => {
    if (asset.quantity === 0) return null;

    const totalValue = asset.quantity * (asset.currentPrice || 0);
    const totalCost = asset.quantity * asset.averagePrice;
    const result = totalValue - totalCost;
    const resultPercent = totalCost > 0 ? (result / totalCost) * 100 : 0;

    const isPositive = result >= 0;

    return (
        <div className="space-y-0">
            <DataRow 
                label="Patrimônio Atual" 
                value={formatBRL(totalValue, privacyMode)} 
                icon={<Wallet className="w-3.5 h-3.5" />}
                subValue={`${asset.quantity} cotas acumuladas`}
            />
            <DataRow 
                label="Preço Médio" 
                value={formatBRL(asset.averagePrice)} 
                icon={<Calculator className="w-3.5 h-3.5" />}
            />
            <DataRow 
                label="Custo Total" 
                value={formatBRL(totalCost, privacyMode)} 
                icon={<DollarSign className="w-3.5 h-3.5" />}
            />
            <DataRow 
                label="Resultado Total" 
                value={formatBRL(result, privacyMode)} 
                color={isPositive ? 'text-emerald-500' : 'text-rose-500'}
                icon={isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                subValue={`${isPositive ? '+' : ''}${resultPercent.toFixed(2)}% de rentabilidade`}
            />
        </div>
    );
};

interface ValuationCardProps {
    asset: AssetPosition;
}

const ValuationCard: React.FC<ValuationCardProps> = ({ asset }) => {
    const pvp = asset['p_vp'];
    const pl = asset['p_l'];
    const dy = asset['dy_12m'];

    return (
        <div className="space-y-0">
            <DataRow 
                label="P/VP" 
                value={pvp?.toFixed(2) || '-'} 
                color={(pvp || 0) > 1.1 ? 'text-rose-500' : (pvp || 0) < 0.9 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}
                icon={<Scale className="w-3.5 h-3.5" />}
                subValue="Preço sobre Valor Patrimonial"
            />
            <DataRow 
                label="P/L" 
                value={pl?.toFixed(2) || '-'} 
                icon={<Activity className="w-3.5 h-3.5" />}
                subValue="Preço sobre Lucro"
            />
            <DataRow 
                label="Dividend Yield" 
                value={dy ? `${dy.toFixed(2)}%` : '-'} 
                color="text-emerald-500"
                icon={<Percent className="w-3.5 h-3.5" />}
                subValue="Rendimento nos últimos 12 meses"
            />
        </div>
    );
};

interface DetailedInfoBlockProps {
    asset: AssetPosition;
}

const DetailedInfoBlock: React.FC<DetailedInfoBlockProps> = ({ asset }) => {
    const isFII = asset.assetType === 'FII';
    
    const infoItems = isFII ? [
        { label: 'Segmento', value: asset.segment || '-', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        { label: 'Vacância', value: asset.vacancy !== undefined ? `${asset.vacancy.toFixed(2)}%` : '-', icon: <X className="w-3.5 h-3.5" />, color: (asset.vacancy || 0) > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white' },
        { label: 'Qtd. Imóveis', value: asset.properties_count || '-', icon: <Building2 className="w-3.5 h-3.5" /> },
        { label: 'Liquidez Diária', value: asset.liquidity || '-', icon: <Zap className="w-3.5 h-3.5" /> },
    ] : [
        { label: 'Segmento', value: asset.segment || '-', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        { label: 'Margem Líquida', value: asset.net_margin !== undefined ? `${asset.net_margin.toFixed(2)}%` : '-', icon: <Activity className="w-3.5 h-3.5" /> },
        { label: 'CAGR Receita', value: asset.cagr_revenue !== undefined ? `${asset.cagr_revenue.toFixed(2)}%` : '-', icon: <TrendingUp className="w-3.5 h-3.5" /> },
        { label: 'Liquidez Diária', value: asset.liquidity || '-', icon: <Zap className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="space-y-0">
            {infoItems.map((item, idx) => (
                <DataRow 
                    key={idx}
                    label={item.label}
                    value={item.value}
                    icon={item.icon}
                    color={(item as any).color}
                />
            ))}
        </div>
    );
};

interface PropertiesAnalysisProps {
    properties: any[];
}

const PropertiesAnalysis: React.FC<PropertiesAnalysisProps> = ({ properties }) => {
    if (!properties || properties.length === 0) return null;

    const locationData = useMemo(() => {
        const counts: Record<string, number> = {};
        properties.forEach(p => {
            let loc = p.location || 'Outros';
            if (loc.length > 2 && loc.includes('-')) {
                const parts = loc.split('-');
                const state = parts[parts.length - 1].trim();
                if (state.length === 2) loc = state;
            }
            if (loc.length === 2) loc = loc.toUpperCase();
            counts[loc] = (counts[loc] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [properties]);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    const total = properties.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={locationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {locationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '10px' }} />
                        </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-zinc-900 dark:text-white">{total}</span>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase">Imóveis</span>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col justify-center space-y-2">
                    {locationData.slice(0, 6).map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <span className="font-bold text-zinc-600 dark:text-zinc-300">{item.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-medium text-zinc-900 dark:text-white">{item.value}</span>
                                <span className="text-zinc-400 text-[10px]">({((item.value / total) * 100).toFixed(0)}%)</span>
                            </div>
                        </div>
                    ))}
                    {locationData.length > 6 && (
                        <p className="text-[10px] text-zinc-400 italic text-center mt-2">+ {locationData.length - 6} outras regiões</p>
                    )}
                </div>
            </div>

            <div className="space-y-0 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {properties.map((prop, index) => (
                    <div key={index} className="py-3 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-black text-xs text-zinc-900 dark:text-white uppercase tracking-tight">{prop.name}</p>
                                    <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 mt-0.5"><MapIcon className="w-3 h-3" /> {prop.location || 'N/A'}</p>
                                </div>
                            </div>
                            {prop.abl && (
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">ABL</p>
                                    <p className="text-xs font-black text-zinc-900 dark:text-white">{prop.abl}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface IncomeAnalysisSectionProps {
    asset: AssetPosition;
    chartData: any;
    marketHistory: any[];
    isWatchlist?: boolean;
}

const IncomeAnalysisSection: React.FC<IncomeAnalysisSectionProps> = ({ asset, chartData, marketHistory, isWatchlist = false }) => {
    const lastDividend = (asset.dividends || []).length > 0 
        ? asset.dividends[0] 
        : ((marketHistory || []).length > 0 
            ? [...marketHistory].sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0] 
            : null);

    const totalInvested = (asset.averagePrice || 0) * (asset.quantity || 0);
    const yieldOnCost = totalInvested > 0 ? ((asset.totalDividends || 0) / totalInvested) * 100 : 0;

    const displayYield = isWatchlist ? ((asset.dy_12m || 0) * 100) : yieldOnCost;
    const yieldLabel = isWatchlist ? "Dividend Yield (12m)" : "Yield on Cost";

    const nextEvents = (marketHistory || [])
        .filter((d: any) => new Date(d.paymentDate) >= new Date())
        .sort((a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
        .slice(0, 3);

    const historyChartData = useMemo(() => {
        // If not watchlist, we might be using the wrong chartData or it might be missing
        // Let's try to calculate it from marketHistory in both cases to be sure,
        // or at least fix the calculation if it's indeed wrong.
        
        const grouped = new Map();
        const sortedHistory = [...marketHistory].sort((a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        
        sortedHistory.forEach((d: any) => {
            if (!d.paymentDate) return;
            const date = new Date(d.paymentDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = getMonthLabel(key);
            
            if (!grouped.has(key)) {
                grouped.set(key, { month: monthLabel, date: key, total: 0 });
            }
            // Use rate for "proventos por cota"
            grouped.get(key).total += d.rate;
        });

        return Array.from(grouped.values())
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .slice(-12);
    }, [marketHistory]);

    return (
        <div className="space-y-6">
            <div className="space-y-0">
                <DataRow 
                    label="Último Provento" 
                    value={formatBRL(lastDividend?.value || lastDividend?.rate || 0)} 
                    icon={<Coins className="w-3.5 h-3.5" />}
                    subValue={`Pago em ${formatDateShort(lastDividend?.paymentDate)}`}
                />
                <DataRow 
                    label={yieldLabel} 
                    value={`${displayYield.toFixed(2)}%`} 
                    color="text-emerald-500"
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    subValue={isWatchlist ? 'Rendimento anualizado' : 'Rentabilidade sobre custo'}
                />
            </div>

            {nextEvents.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Eventos Futuros</span>
                    </div>
                    <div className="space-y-0">
                        {nextEvents.map((event: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-900/30 last:border-0">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-zinc-900 dark:text-white">{formatBRL(event.rate || event.value)}</span>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Data Com: {formatDateShort(event.dateCom)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">{formatDateShort(event.paymentDate)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-4">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Histórico de Proventos</h4>
                    <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-tighter">Por Cota</span>
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.05} />
                                <XAxis 
                                    dataKey="month" 
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10} 
                                />
                                <YAxis 
                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(val) => `R$${val}`} 
                                />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const value = payload[0].value as number;
                                            return (
                                                <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <p className="text-sm font-black text-white">{formatBRL(value)}</p>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-zinc-500 mt-1 uppercase tracking-tighter">
                                                        {isWatchlist ? 'Valor por Cota' : 'Total Recebido'}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine 
                                    y={historyChartData.reduce((acc: number, curr: any) => acc + curr.total, 0) / (historyChartData.length || 1)} 
                                    stroke="#10b981" 
                                    strokeDasharray="3 3" 
                                    strokeOpacity={0.3}
                                    label={{ 
                                        position: 'right', 
                                        value: 'MÉDIA', 
                                        fill: '#10b981', 
                                        fontSize: 8, 
                                        fontWeight: 900,
                                        letterSpacing: 1,
                                        offset: 10
                                    }} 
                                />
                                <Bar 
                                    dataKey="total" 
                                    fill="url(#barGradient)" 
                                    radius={[6, 6, 0, 0]} 
                                    maxBarSize={32}
                                    animationDuration={1500}
                                    animationEasing="ease-out"
                                />
                            </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

interface Investidor10ChartsSectionProps {
    ticker: string;
    assetType: string;
    onlyPayout?: boolean;
}

const Investidor10ChartsSection: React.FC<Investidor10ChartsSectionProps> = ({ ticker, assetType, onlyPayout = false }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [chartType, setChartType] = useState(onlyPayout ? 'payout' : (assetType === 'FII' ? 'equity' : 'revenue_profit'));
    const [revenueYear, setRevenueYear] = useState<string>('');
    const [revenueSubTab, setRevenueSubTab] = useState<'type' | 'region'>('type');

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            setData(null); // Reset data on change
            try {
                // Determine the correct API chartType based on the UI chartType
                let apiChartType = chartType;
                if (chartType === 'net_profit') apiChartType = 'revenue_profit';
                if (chartType === 'payout' || chartType === 'payout_dy') apiChartType = 'payout';
                if (chartType === 'net_worth') apiChartType = 'equity';
                if (chartType === 'revenues_by_type') apiChartType = 'revenues_by_type';

                const res = await fetch(`/api/investidor10-charts?ticker=${ticker}&chartType=${apiChartType}&assetType=${assetType}`);
                if (!res.ok) throw new Error('Failed to fetch data');
                const json = await res.json();
                if (mounted) {
                    setData(json);
                    if (apiChartType === 'revenues_by_type' && json.revenuesByType) {
                        const years = Object.keys(json.revenuesByType).sort((a, b) => b.localeCompare(a));
                        if (years.length > 0) setRevenueYear(years[0]);
                    }
                }
            } catch (e) {
                if (mounted) setError(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [ticker, chartType, assetType]);

    const chartData = data || [];
    const isFII = assetType === 'FII';

    const chartConfig = useMemo(() => ({
        revenue_profit: { title: 'Receitas e Lucros', barKey: 'profit', areaKey: 'revenue', barColor: '#8b5cf6', areaColor: '#ec4899' },
        payout: { title: isFII ? 'Dividend Yield Histórico' : 'Payout x Dividend Yield', barKey: isFII ? 'dy' : 'payout', areaKey: isFII ? '' : 'dy', barColor: isFII ? '#10b981' : '#06b6d4', areaColor: '#f59e0b' },
        equity: { title: isFII ? 'Histórico de Valor Patrimonial' : 'Patrimônio Líquido', barKey: 'equity', areaKey: 'revenue', barColor: '#10b981', areaColor: '#6366f1' },
        revenues_by_type: { title: 'Composição da Receita', barKey: '', areaKey: '', barColor: '', areaColor: '' },
    }), [isFII]);

    const currentChart = chartConfig[chartType as keyof typeof chartConfig] || chartConfig.revenue_profit;

    const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#f43f5e', '#14b8a6'];

    const renderPieChart = () => {
        if (!data || chartType !== 'revenues_by_type') return null;

        const source = revenueSubTab === 'type' ? data.revenuesByType : data.revenuesByRegion;
        if (!source || !revenueYear || !source[revenueYear]) {
            return <div className="h-full flex items-center justify-center text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Sem dados para {revenueYear}</div>;
        }

        const yearData = source[revenueYear];
        const pieData = Object.entries(yearData).map(([name, val]: [string, any]) => ({
            name,
            value: val.value,
            revenue: val.revenue
        })).sort((a, b) => b.value - a.value);

        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-center gap-4 mb-4">
                    <button 
                        onClick={() => setRevenueSubTab('type')}
                        className={`text-[9px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${revenueSubTab === 'type' ? 'border-indigo-500 text-zinc-900 dark:text-white' : 'border-transparent text-zinc-400'}`}
                    >
                        Por Negócio
                    </button>
                    <button 
                        onClick={() => setRevenueSubTab('region')}
                        className={`text-[9px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${revenueSubTab === 'region' ? 'border-indigo-500 text-zinc-900 dark:text-white' : 'border-transparent text-zinc-400'}`}
                    >
                        Por Região
                    </button>
                </div>
                <div className="flex-1 flex items-center">
                    <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={1000}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '10px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number, name: string, props: any) => [`${value}% (${props.payload.revenue})`, name]}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 flex flex-col justify-center gap-2 pl-4">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">{item.name}</span>
                                    <span className="text-[8px] font-medium text-zinc-500">{item.value}% • {item.revenue}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                    {Object.keys(source).sort((a, b) => b.localeCompare(a)).map(year => (
                        <button
                            key={year}
                            onClick={() => setRevenueYear(year)}
                            className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${revenueYear === year ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) return <div className="text-center text-zinc-400">Carregando...</div>;
    if (error || !data) return <div className="text-center text-zinc-400">Dados não disponíveis.</div>;
    if (onlyPayout) {
        return (
            <div className="h-64 w-full py-4 border-y border-zinc-100 dark:border-zinc-900/50">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '10px' }} labelStyle={{ color: '#a1a1aa' }} formatter={(value: number, name: string) => [name === 'payout' ? `${value.toFixed(2)}%` : `${(value * 100).toFixed(2)}%`, name === 'payout' ? 'Payout' : 'Div. Yield']} />
                        <Bar yAxisId="left" dataKey="payout" fill={isFII ? '#10b981' : '#06b6d4'} radius={[4, 4, 0, 0]} name="Payout" />
                        <Line yAxisId="right" dataKey="dy" stroke="#f59e0b" strokeWidth={2} dot={false} name="Div. Yield" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        )
    }

    return (
        <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                        <Activity className="w-4 h-4" />
                    </div>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{currentChart.title}</h4>
                </div>
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {isFII ? (
                        <>
                            <button 
                                onClick={() => setChartType('equity')} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${chartType === 'equity' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <Building2 className="w-3 h-3" />
                                Patrimônio
                            </button>
                            <button 
                                onClick={() => setChartType('payout')} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${chartType === 'payout' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <Percent className="w-3 h-3" />
                                DY
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => setChartType('revenue_profit')} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${chartType === 'revenue_profit' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <TrendingUp className="w-3 h-3" />
                                Lucros
                            </button>
                            <button 
                                onClick={() => setChartType('equity')} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${chartType === 'equity' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <Scale className="w-3 h-3" />
                                Patrimônio
                            </button>
                            <button 
                                onClick={() => setChartType('payout')} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${chartType === 'payout' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <Percent className="w-3 h-3" />
                                Payout
                            </button>
                            <button 
                                onClick={() => setChartType('revenues_by_type')} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${chartType === 'revenues_by_type' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                <PieChart className="w-3 h-3" />
                                Receita
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="h-64 w-full overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={chartType}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="h-full w-full"
                    >
                        {chartType === 'revenues_by_type' ? renderPieChart() : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={currentChart.barColor} stopOpacity={1} />
                                            <stop offset="100%" stopColor={currentChart.barColor} stopOpacity={0.6} />
                                        </linearGradient>
                                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={currentChart.areaColor} stopOpacity={0.2} />
                                            <stop offset="100%" stopColor={currentChart.areaColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.05} />
                                    <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(val) => chartType === 'payout' ? `${val}%` : formatCompactBRL(val)} />
                                    {chartType !== 'equity' && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(val) => chartType === 'payout' ? `${val}%` : formatCompactBRL(val)} />}
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', backdropFilter: 'blur(8px)' }} 
                                        labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', marginBottom: '4px' }} 
                                        formatter={(value: number, name: string) => {
                                            const isPercent = name === 'payout' || name === 'dy';
                                            const label = name === 'revenue' ? 'Receita' : name === 'profit' ? 'Lucro' : name === 'equity' ? 'Patrimônio' : name === 'payout' ? 'Payout' : 'DY';
                                            return [isPercent ? `${value.toFixed(2)}%` : formatCompactBRL(value), label];
                                        }} 
                                    />
                                    <Bar yAxisId="left" dataKey={currentChart.barKey} fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                                    {currentChart.areaKey && (
                                        <Area 
                                            yAxisId={chartType === 'equity' ? 'left' : 'right'} 
                                            type="monotone"
                                            dataKey={currentChart.areaKey} 
                                            fill="url(#areaGradient)" 
                                            stroke={currentChart.areaColor} 
                                            fillOpacity={1} 
                                            strokeWidth={2} 
                                            animationDuration={1500}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};




interface SmartRadarProps {
    asset: AssetPosition;
    marketHistory: any[];
}

const SmartRadar: React.FC<SmartRadarProps> = ({ asset, marketHistory }) => {
    const [activeTab, setActiveTab] = useState<'datacom' | 'payment'>('datacom');

    const calendarData = useMemo(() => {
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            label: monthNames[i],
            datacom: 0,
            payment: 0
        }));

        const historyToUse = marketHistory && marketHistory.length > 0 ? marketHistory : (asset.dividends || []);

        if (historyToUse && Array.isArray(historyToUse)) {
            const parseDate = (dateStr: string) => {
                if (!dateStr) return null;
                
                // Try YYYY-MM-DD
                if (dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        const [year, month, day] = parts.map(Number);
                        return new Date(year, month - 1, day);
                    }
                }
                
                // Try DD/MM/YYYY
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const [day, month, year] = parts.map(Number);
                        return new Date(year, month - 1, day);
                    }
                }
                
                return new Date(dateStr);
            };

            const parsedDivs = historyToUse.map(div => ({
                comDate: parseDate(div.dateCom),
                payDate: parseDate(div.paymentDate)
            })).filter(d => d.comDate || d.payDate);

            if (parsedDivs.length > 0) {
                // Find the latest year in the data
                const latestYear = Math.max(...parsedDivs.map(d => {
                    const y1 = d.comDate ? d.comDate.getFullYear() : 0;
                    const y2 = d.payDate ? d.payDate.getFullYear() : 0;
                    return Math.max(y1, y2);
                }));

                // Look at the last 5 years
                const startYear = latestYear - 4;

                const datacomYears = new Array(12).fill(null).map(() => new Set<number>());
                const paymentYears = new Array(12).fill(null).map(() => new Set<number>());

                parsedDivs.forEach(d => {
                    if (d.comDate && d.comDate.getFullYear() >= startYear && d.comDate.getFullYear() <= latestYear) {
                        datacomYears[d.comDate.getMonth()].add(d.comDate.getFullYear());
                    }
                    if (d.payDate && d.payDate.getFullYear() >= startYear && d.payDate.getFullYear() <= latestYear) {
                        paymentYears[d.payDate.getMonth()].add(d.payDate.getFullYear());
                    }
                });

                // Calculate the actual number of years we have data for in this 5-year window
                const earliestYearInData = Math.max(startYear, Math.min(...parsedDivs.map(d => {
                    const y1 = d.comDate ? d.comDate.getFullYear() : 9999;
                    const y2 = d.payDate ? d.payDate.getFullYear() : 9999;
                    return Math.min(y1, y2);
                })));

                const yearsOfHistory = Math.max(1, latestYear - earliestYearInData + 1);

                for (let i = 0; i < 12; i++) {
                    months[i].datacom = datacomYears[i].size / yearsOfHistory;
                    months[i].payment = paymentYears[i].size / yearsOfHistory;
                }
            }
        }
        return months;
    }, [asset.dividends, marketHistory]);

    const nextProbableMonth = useMemo(() => {
        const currentMonth = new Date().getMonth() + 1;
        // Look for months from current onwards
        const futureMonths = [...calendarData.slice(currentMonth - 1), ...calendarData.slice(0, currentMonth - 1)];
        const probable = futureMonths.find(m => m[activeTab] >= 0.4);
        return probable;
    }, [calendarData, activeTab]);

    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Radar de Dividendos Inteligente</h4>
                    {nextProbableMonth && (
                        <span className="text-[9px] font-bold text-emerald-500 mt-0.5 uppercase tracking-wider">
                            Próximo provável: {nextProbableMonth.label} ({(nextProbableMonth[activeTab] * 100).toFixed(0)}%)
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-4 border border-zinc-200 dark:border-zinc-800">
                <button 
                    onClick={() => setActiveTab('datacom')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${activeTab === 'datacom' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}
                >
                    Data Com
                </button>
                <button 
                    onClick={() => setActiveTab('payment')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${activeTab === 'payment' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}
                >
                    Data Pagamento
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {calendarData.map((m) => {
                    const probability = m[activeTab];
                    const isHigh = probability >= 0.6;
                    const isMedium = probability >= 0.2 && probability < 0.6;
                    const isLow = probability > 0 && probability < 0.2;
                    const isNone = probability === 0;

                    let bgClass = 'bg-zinc-50 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700';
                    let iconClass = '';
                    
                    if (isHigh) {
                        bgClass = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
                        iconClass = 'text-emerald-500';
                    } else if (isMedium) {
                        bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-500/70 dark:text-emerald-400/70 border border-emerald-100 dark:border-emerald-800/50';
                        iconClass = 'text-emerald-400/70';
                    } else if (isLow) {
                        bgClass = 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border border-zinc-100 dark:border-zinc-800';
                        iconClass = 'text-zinc-400';
                    }

                    return (
                        <div 
                            key={m.month}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${bgClass}`}
                            title={`Probabilidade: ${(probability * 100).toFixed(0)}%`}
                        >
                            {!isNone && <Coins className={`w-3 h-3 ${iconClass}`} />}
                            {m.label}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Alta</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400/50"></div> Média</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700"></div> Rara/Nenhuma</div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const AssetModal = ({ asset, onClose, onAssetRefresh, marketDividends = [], incomeChartData = { data: [], average: 0, activeTypes: [] }, privacyMode }: AssetModalProps) => {
    console.log('AssetModal props:', { asset, marketDividends, incomeChartData });
    // History Data State (Moved from ChartsContainer)
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState(false);
    const [range, setRange] = useState('1D'); // Default to 1D (Intraday)

    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToSection = (id: string) => {
        setActiveTab(id);
        const element = document.getElementById(`section-${id}`);
        if (element && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            // Calculate position relative to container
            const offsetTop = element.offsetTop - (isWatchlist ? 140 : 180); 
            container.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Reset state when asset changes
    useEffect(() => {
        if (asset?.ticker) {
            setActiveTab('OVERVIEW');
            setRange('1D');
            setHistoryData([]);
            setHistoryError(false);
        }
    }, [asset?.ticker]);

    // Fetch History Data Effect
    useEffect(() => {
        if (!asset) return;
        
        let mounted = true;
        const fetchData = async () => {
            setHistoryLoading(true);
            setHistoryError(false);
            try {
                const res = await fetch(`/api/history?ticker=${asset.ticker}&range=${range}`);
                if (!res.ok) throw new Error('Failed to fetch history');
                const json = await res.json();
                if (mounted) setHistoryData(json.points || []);
            } catch (e) {
                console.error(e);
                if (mounted) setHistoryError(true);
            } finally {
                if (mounted) setHistoryLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [asset?.ticker, range]);

    const assetMarketHistory = useMemo(() => {
        if (!asset) return [];
        return (marketDividends || []).filter(d => d.ticker === asset.ticker);
    }, [asset?.ticker, marketDividends]);

    const isWatchlist = useMemo(() => {
        return asset ? asset.quantity === 0 : false;
    }, [asset?.quantity]);

    const tabs = useMemo(() => {
        if (!asset) return [];
        const baseTabs = [
            { id: 'OVERVIEW', label: 'Resumo', icon: LayoutGrid },
            { id: 'FUNDAMENTALS', label: 'Fundamentos', icon: List },
            { id: 'INCOME', label: 'Renda', icon: Coins },
            { id: 'CHARTS', label: 'Gráficos', icon: BarChart3 },
        ];
        if (asset.properties && asset.properties.length > 0) {
            baseTabs.splice(3, 0, { id: 'PROPERTIES', label: 'Imóveis', icon: Building2 });
        }
        return baseTabs;
    }, [asset?.ticker, asset?.properties]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const sections = tabs.map(tab => document.getElementById(`section-${tab.id}`));
            
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.getBoundingClientRect().top <= 200) {
                    setActiveTab(tabs[i].id);
                    break;
                }
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [tabs]);

    return (
        <SwipeableModal isOpen={!!asset} onClose={onClose}>
            {asset && (
                <div key={asset.ticker} className="bg-zinc-50 dark:bg-zinc-900 flex flex-col h-full overflow-hidden">
                    {/* Header Moderno & Clean */}
                    <div className="px-6 pt-6 pb-4 shrink-0 bg-white dark:bg-zinc-800 z-30 border-b border-zinc-200/50 dark:border-zinc-700/50 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-3xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    {asset.logoUrl ? (
                                        <img src={asset.logoUrl} className="w-full h-full object-cover" alt={asset.ticker} referrerPolicy="no-referrer" />
                                    ) : (
                                        <span className="font-black text-2xl text-zinc-300 dark:text-zinc-700">{asset.ticker.substring(0, 2)}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="font-black text-3xl tracking-tighter text-zinc-900 dark:text-white leading-none">{asset.ticker}</h2>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${asset.assetType === 'FII' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400'}`}>
                                            {asset.assetType}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[200px]">{asset.company_name || asset.ticker}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(asset.currentPrice || 0)}</span>
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${ (asset.dailyChange || 0) >= 0 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'}`}>
                                            {(asset.dailyChange || 0) >= 0 ? '+' : ''}{(asset.dailyChange || 0).toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onAssetRefresh && onAssetRefresh(asset.ticker)} 
                                    className="w-11 h-11 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-indigo-500 transition-all active:scale-90 border border-zinc-100 dark:border-zinc-800 shadow-sm"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="w-11 h-11 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-all active:scale-90 border border-zinc-100 dark:border-zinc-800 shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 scroll-smooth bg-zinc-50 dark:bg-zinc-900"
                    >
                        <div className="space-y-6 max-w-3xl mx-auto">
                            
                            {/* SEÇÃO: SUA POSIÇÃO */}
                            {!isWatchlist && (
                                <div id="section-OVERVIEW" className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                    <SectionHeader title="Sua Posição" icon={Wallet} />
                                    <PositionSummaryCard asset={asset} privacyMode={privacyMode} />
                                </div>
                            )}
                            
                            {/* SEÇÃO: COTAÇÃO & PERFORMANCE */}
                            <div id={isWatchlist ? "section-OVERVIEW" : "section-CHARTS"} className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                <SectionHeader title="Performance" icon={TrendingUp} />
                                <PriceHistoryChart 
                                    fullData={historyData} 
                                    loading={historyLoading} 
                                    error={historyError} 
                                    ticker={asset.ticker} 
                                    range={range}
                                    onRangeChange={setRange}
                                    averagePrice={!isWatchlist ? asset.averagePrice : undefined}
                                />
                            </div>

                            {/* SEÇÃO: DADOS FUNDAMENTAIS */}
                            <div id="section-FUNDAMENTALS" className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                <SectionHeader title="Análise Fundamentalista" icon={List} />
                                <div className="space-y-8">
                                    {asset.assetType !== 'FII' && (
                                        <SmartRadar asset={asset} marketHistory={assetMarketHistory} />
                                    )}
                                    <div className="space-y-6">
                                        <DetailedInfoBlock asset={asset} />
                                        <ValuationCard asset={asset} />
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO: PROVENTOS */}
                            <div id="section-INCOME" className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                <SectionHeader title="Dividendos & Proventos" icon={Coins} />
                                <IncomeAnalysisSection 
                                    asset={asset} 
                                    chartData={incomeChartData}
                                    marketHistory={assetMarketHistory}
                                    isWatchlist={isWatchlist}
                                />
                            </div>

                            {/* SEÇÃO: RENTABILIDADE COMPARADA */}
                            <div id="section-CHARTS-EXTRA" className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                <SectionHeader title="Comparativo de Mercado" icon={Activity} />
                                <ComparativeChart ticker={asset.ticker} type={asset.assetType} />
                            </div>

                            {/* SEÇÃO: EVOLUÇÃO FUNDAMENTALISTA */}
                            <div className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                <SectionHeader title="Evolução Histórica" icon={Activity} />
                                <Investidor10ChartsSection ticker={asset.ticker} assetType={asset.assetType} />
                            </div>

                            {/* SEÇÃO: PORTFÓLIO FÍSICO */}
                            {asset.properties && asset.properties.length > 0 && (
                                <div id="section-PROPERTIES" className="bg-white dark:bg-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 scroll-mt-32">
                                    <SectionHeader title="Portfólio de Imóveis" icon={Building2} />
                                    <PropertiesAnalysis properties={asset.properties} />
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
