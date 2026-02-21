
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, BarChart3, PieChart, Coins, DollarSign, Building2, FileText, MapPin, Zap, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, SquareStack, Map as MapIcon, CandlestickChart, LineChart as LineChartIcon, Award, RefreshCcw, ArrowLeft, Briefcase, MoreHorizontal, LayoutGrid, List, Activity, Scale, Percent, ChevronDown, ChevronUp, ListFilter } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, Label, Legend } from 'recharts';
import { formatBRL, formatDateShort, getMonthName } from '../utils/formatters';

// --- CONSTANTS ---
const TYPE_COLORS: Record<string, string> = {
    'DIV': '#10b981',   // Emerald 500
    'REND': '#10b981',  // Emerald 500
    'JCP': '#06b6d4',   // Cyan 500
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

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

// --- SUB-COMPONENTS & HELPERS ---

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
    // Pegamos os 50 pontos mais recentes
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
            candleData: { open, close, high, low }, // Mantém para compatibilidade com Tooltip
            price: close, 
            volume: d.volume || 0,
            sma20: calculateSMA(arr, 20, index),
            sma50: calculateSMA(arr, 50, index),
            volColor: isUp ? '#10b981' : '#f43f5e'
        };
    });

    const padding = (maxPrice - minPrice) * 0.2;
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

// Componente Visual do Candle (USANDO ESCALA DO EIXO PARA PRECISÃO TOTAL)
const CustomCandleShape = (props: any) => {
    const { x, width, payload, yAxis } = props;
    
    // Se não houver eixo Y ou dados, aborta
    if (!yAxis || !yAxis.scale || x == null || isNaN(x)) return null;

    const open = payload.open;
    const close = payload.close;
    const high = payload.high;
    const low = payload.low;
    
    if (open == null || close == null || high == null || low == null) return null;

    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#f43f5e'; 

    // Usamos a escala do eixo Y diretamente para obter as coordenadas em pixels
    // Isso é muito mais robusto que confiar no 'y' e 'height' do Recharts para barras de intervalo
    const yOpen = yAxis.scale(open);
    const yClose = yAxis.scale(close);
    const yHigh = yAxis.scale(high);
    const yLow = yAxis.scale(low);

    // Largura do corpo (80% do slot, mínimo 4px)
    const bodyWidth = Math.max(4, width * 0.8);
    const xOffset = (width - bodyWidth) / 2;
    const centerX = x + width / 2;

    // Coordenadas do corpo (Open/Close)
    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(2, bodyBottom - bodyTop);

    return (
        <g className="candle-group">
            {/* Pavio (Wick) - Do High ao Low */}
            <line 
                x1={centerX} 
                y1={yHigh} 
                x2={centerX} 
                y2={yLow} 
                stroke={color} 
                strokeWidth={1.5} 
                strokeOpacity={0.8}
            />
            
            {/* Corpo (Body) - Do Open ao Close */}
            <rect 
                x={x + xOffset} 
                y={bodyTop} 
                width={bodyWidth} 
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

// --- COMPONENTE ACORDEÃO (COLLAPSIBLE) ---
const CollapsibleCard = ({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden mb-3">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-transparent active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</h3>
                </div>
                <div className={`text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/50">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTES DE GRÁFICO ---
const PriceHistoryChart = ({ fullData, loading, error, ticker, range, onRangeChange }: any) => {
    const [chartType, setChartType] = useState<'AREA' | 'CANDLE'>('AREA');
    const [indicators, setIndicators] = useState({ sma20: false, sma50: false, volume: true });
    const [showFilterModal, setShowFilterModal] = useState(false);
    
    // Process data directly since API handles filtering
    const { processedData, yDomain, variation, lastPrice } = useMemo(() => processChartData(fullData), [fullData]);
    const isPositive = variation >= 0;

    const toggleIndicator = (key: keyof typeof indicators) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));

    const INTRADAY_OPTIONS = [
        { label: '1 Min', value: '1m' },
        { label: '5 Min', value: '5m' },
        { label: '10 Min', value: '10m' },
        { label: '15 Min', value: '15m' },
        { label: '30 Min', value: '30m' },
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
        if (['1m', '5m', '10m', '15m', '30m', '1h', '1d'].includes(range)) {
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
                                    <Bar 
                                        yAxisId="price" 
                                        dataKey="close" 
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
        { label: '1 Min', value: '1m' },
        { label: '5 Min', value: '5m' },
        { label: '10 Min', value: '10m' },
        { label: '15 Min', value: '15m' },
        { label: '30 Min', value: '30m' },
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
        if (['1m', '5m', '10m', '15m', '30m', '1h', '1d'].includes(range)) {
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

const ChartsContainer = ({ ticker, type, marketDividends }: { ticker: string, type: AssetType, asset?: AssetPosition, marketDividends: DividendReceipt[] }) => {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [range, setRange] = useState('1d'); // Default to 1d

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

const SimulatorCard = ({ data, ticker, dividends = [] }: any) => {
    const [amount, setAmount] = useState(1000);
    const [reinvest, setReinvest] = useState(true);
    
    const result = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 5);
        const simData = data.filter((d: any) => new Date(d.date) >= cutoff);
        
        if (simData.length === 0) return null;

        const first = simData[0];
        const last = simData[simData.length - 1];
        
        const startPrice = first.price || first.close;
        const endPrice = last.price || last.close;
        const startDate = new Date(first.date);
        
        if (!startPrice) return null;

        let shares = Math.floor(amount / startPrice);
        let cash = amount - (shares * startPrice);
        let totalDividendsReceived = 0;
        let dividendsUsedForReinvest = 0;
        
        if (dividends && dividends.length > 0) {
            const sortedDivs = [...dividends].sort((a: any, b: any) => {
                const dateA = new Date(a.paymentDate || a.dateCom).getTime();
                const dateB = new Date(b.paymentDate || b.dateCom).getTime();
                return dateA - dateB;
            });

            sortedDivs.forEach((div: DividendReceipt) => {
                const payDate = new Date(div.paymentDate || div.dateCom);
                
                if (payDate >= startDate) {
                    const receipt = shares * div.rate;
                    totalDividendsReceived += receipt;
                    
                    if (reinvest) {
                        cash += receipt;
                        const closestPoint = simData.find((p: any) => new Date(p.date) >= payDate);
                        const reinvestPrice = closestPoint ? (closestPoint.price || closestPoint.close) : endPrice;
                        
                        if (reinvestPrice && cash >= reinvestPrice) {
                            const newShares = Math.floor(cash / reinvestPrice);
                            shares += newShares;
                            cash -= (newShares * reinvestPrice);
                            dividendsUsedForReinvest += (newShares * reinvestPrice);
                        }
                    }
                }
            });
        }

        const finalEquity = (shares * endPrice);
        const finalTotal = reinvest ? (finalEquity + cash) : (finalEquity + cash + totalDividendsReceived);
        const cdiGrowth = (last.cdiPct || 0) / 100;
        const finalCDI = amount * (1 + cdiGrowth);
        
        return {
            shares,
            equity: finalEquity,
            dividends: totalDividendsReceived,
            total: finalTotal,
            profit: finalTotal - amount,
            cdi: finalCDI,
            roi: ((finalTotal - amount) / amount) * 100,
            reinvestedAmount: dividendsUsedForReinvest,
            initialShares: Math.floor(amount / startPrice)
        };
    }, [data, amount, dividends, reinvest]);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Simulador de Retorno</h3>
                        <p className="text-xs text-zinc-500 font-medium">Histórico de 5 Anos</p>
                    </div>
                </div>
                
                <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                    {[1000, 5000, 10000].map(val => (
                        <button 
                            key={val} 
                            onClick={() => setAmount(val)} 
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${amount === val ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {val/1000}k
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Resultado Final</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                                {result ? formatBRL(result.total) : '...'}
                            </span>
                        </div>
                        {result && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${result.profit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                    {result.profit > 0 ? '+' : ''}{result.roi.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-zinc-400">vs CDI: {result.cdi ? formatBRL(result.cdi) : '...'}</span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setReinvest(!reinvest)} 
                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 transition-all ${reinvest ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}
                    >
                        <RefreshCcw className={`w-5 h-5 mb-0.5 ${reinvest ? 'animate-spin-slow' : ''}`} />
                    </button>
                </div>

                {result && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Cotas Acumuladas</span>
                            <div className="flex items-end justify-between">
                                <span className="text-lg font-black text-zinc-900 dark:text-white">{result.shares}</span>
                                {reinvest && result.shares > result.initialShares && (
                                    <span className="text-[10px] font-bold text-emerald-500 mb-1">+{result.shares - result.initialShares}</span>
                                )}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Dividendos Totais</span>
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatBRL(result.dividends)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PositionSummaryCard = ({ asset, privacyMode }: { asset: AssetPosition, privacyMode: boolean }) => {
    const totalInvested = asset.quantity * asset.averagePrice;
    const totalValue = asset.quantity * (asset.currentPrice || 0);
    const result = totalValue - totalInvested;
    const resultPercent = totalInvested > 0 ? (result / totalInvested) * 100 : 0;
    const isProfit = result >= 0;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Custo Total</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatBRL(totalInvested, privacyMode)}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">PM: {formatBRL(asset.averagePrice, privacyMode)}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Valor Atual</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatBRL(totalValue, privacyMode)}</p>
                     <p className="text-[10px] text-zinc-400 font-medium">Cota: {formatBRL(asset.currentPrice, privacyMode)}</p>
                </div>
             </div>
             <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-500">Resultado</span>
                    <div className="text-right">
                         <span className={`text-lg font-black ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? '+' : ''}{formatBRL(result, privacyMode)}
                         </span>
                         <span className={`block text-[10px] font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isProfit ? '+' : ''}{resultPercent.toFixed(2)}%
                         </span>
                    </div>
                </div>
             </div>
        </div>
    );
};

const ValuationCard = ({ asset }: { asset: AssetPosition }) => {
    let fairPrice = 0;
    let upside = 0;
    const lpa = asset.lpa ?? 0;
    const vpa = asset.vpa ?? 0;
    
    // Lógica Específica por Tipo de Ativo
    if (asset.assetType === AssetType.STOCK) {
        // Graham (VPA * LPA * 22.5)
        if (lpa > 0 && vpa > 0) {
            fairPrice = Math.sqrt(22.5 * lpa * vpa);
        }
    } else if (asset.assetType === AssetType.FII) {
        // Bazin (Dividend Discount Model simplificado para FIIs - Cap Rate 6%)
        // Prioriza DY anualizado, senão usa último rendimento * 12
        const dividend = (asset.dy_12m && asset.dy_12m > 0) 
            ? (asset.dy_12m/100) * (asset.currentPrice || 0) 
            : (asset.last_dividend || 0) * 12;
            
        if (dividend > 0) fairPrice = dividend / 0.06;
    } else if (asset.dy_12m && asset.currentPrice) {
         // Fallback genérico (Bazin)
         const dividend = (asset.dy_12m/100) * asset.currentPrice;
         fairPrice = dividend / 0.06;
    }

    if (asset.currentPrice && fairPrice > 0) {
        upside = ((fairPrice - asset.currentPrice) / asset.currentPrice) * 100;
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Valuation & Preço Justo</h3>
            </div>
            
            <div className="flex items-center justify-between mt-2">
                <div>
                    <p className="text-xs font-bold text-zinc-500 mb-1">Preço Justo (Estimado)</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{formatBRL(fairPrice)}</p>
                </div>
                <div className="text-right">
                     <p className="text-xs font-bold text-zinc-500 mb-1">Potencial (Upside)</p>
                     <span className={`text-lg font-black ${upside >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {upside > 0 ? '+' : ''}{upside.toFixed(2)}%
                     </span>
                </div>
            </div>
            <p className="text-[9px] text-zinc-400 mt-3 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-2">
                *Estimativa baseada em {asset.assetType === AssetType.STOCK ? 'Graham (VPA*LPA)' : 'Bazin (Div/0.06)'}. Não é recomendação de compra.
            </p>
        </div>
    );
};

const DetailedInfoBlock = ({ asset }: { asset: AssetPosition }) => {
    const InfoRow = ({ label, value }: { label: string, value: string | number | undefined }) => {
        if (value === undefined || value === null || value === '') return null;
        return (
            <div className="flex justify-between py-2.5 text-xs border-b border-dashed border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 px-2 rounded-lg transition-colors">
                <span className="font-bold text-zinc-500">{label}</span>
                <span className="font-medium text-zinc-900 dark:text-white text-right max-w-[60%]">{value}</span>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Dados Gerais */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dados Corporativos</h3>
                </div>
                <div className="-mx-2">
                    <InfoRow label="Razão Social" value={asset.company_name} />
                    <InfoRow label="CNPJ" value={asset.cnpj} />
                    <InfoRow label="Segmento" value={asset.segment} />
                    {asset.assetType === AssetType.FII && <InfoRow label="Patrimônio Líquido" value={asset.assets_value} />}
                    {asset.assetType === AssetType.STOCK && <InfoRow label="Valor de Mercado" value={asset.market_cap} />}
                </div>
            </div>

            {/* Campos Específicos para AÇÕES */}
            {asset.assetType === AssetType.STOCK && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Activity className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Análise Fundamentalista</h3>
                    </div>
                    
                    <div className="-mx-2">
                        <h5 className="px-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 mt-1">Valuation</h5>
                        <InfoRow label="P/L (Preço/Lucro)" value={asset.p_l?.toFixed(2)} />
                        <InfoRow label="P/VP (Preço/Valor Patr.)" value={asset.p_vp?.toFixed(2)} />
                        <InfoRow label="VPA (Valor Patr./Ação)" value={formatBRL(asset.vpa)} />
                        <InfoRow label="EV/EBITDA" value={asset.ev_ebitda?.toFixed(2)} />

                        <h5 className="px-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 mt-4">Eficiência & Crescimento</h5>
                        <InfoRow label="Margem Líquida" value={asset.net_margin ? `${asset.net_margin.toFixed(2)}%` : undefined} />
                        <InfoRow label="Margem Bruta" value={asset.gross_margin ? `${asset.gross_margin.toFixed(2)}%` : undefined} />
                        <InfoRow label="ROE (Ret. s/ Patr.)" value={asset.roe ? `${asset.roe.toFixed(2)}%` : undefined} />
                        <InfoRow label="CAGR Lucros (5 anos)" value={asset.cagr_profits ? `${asset.cagr_profits.toFixed(2)}%` : undefined} />
                        <InfoRow label="Payout" value={asset.payout ? `${asset.payout.toFixed(2)}%` : undefined} />

                        <h5 className="px-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 mt-4">Endividamento</h5>
                        <InfoRow label="Dívida Líq / EBITDA" value={asset.net_debt_ebitda?.toFixed(2)} />
                        <InfoRow label="Dívida Líq / PL" value={asset.net_debt_equity?.toFixed(2)} />
                    </div>
                </div>
            )}

            {/* Campos Específicos para FIIs */}
            {asset.assetType === AssetType.FII && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Building2 className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dados do Fundo</h3>
                    </div>
                    <div className="-mx-2">
                        <InfoRow label="Vacância Física" value={asset.vacancy ? `${asset.vacancy.toFixed(2)}%` : undefined} />
                        <InfoRow label="P/VP" value={asset.p_vp?.toFixed(2)} />
                        <InfoRow label="Último Rendimento" value={formatBRL(asset.last_dividend)} />
                        <InfoRow label="Tipo de Gestão" value={asset.manager_type} />
                        <InfoRow label="Taxa de Adm." value={asset.management_fee} />
                        <InfoRow label="Público Alvo" value={asset.target_audience} />
                        <InfoRow label="Mandato" value={asset.mandate} />
                        <InfoRow label="Prazo" value={asset.duration} />
                    </div>
                </div>
            )}
        </div>
    );
};

const PropertiesAnalysis = ({ properties }: { properties: any[] }) => {
    // Agrupa imóveis por estado para o gráfico
    const locationData = useMemo(() => {
        const counts: Record<string, number> = {};
        properties.forEach(p => {
            let loc = p.location || 'Outros';
            // Simplifica location se for "Cidade - UF" para apenas "UF" se possível, ou usa como está
            if (loc.length > 2 && loc.includes('-')) {
                const parts = loc.split('-');
                const state = parts[parts.length - 1].trim();
                if (state.length === 2) loc = state;
            }
            // Tenta pegar UF se for apenas 2 letras
            if (loc.length === 2) loc = loc.toUpperCase();
            
            counts[loc] = (counts[loc] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [properties]);

    const total = properties.length;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Portfólio Imobiliário ({total})</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-6 mt-2">
                {/* Gráfico Donut */}
                <div className="w-full md:w-1/2 h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={locationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {locationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(val: number) => [`${val} imóveis`, 'Quantidade']}
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.9)', color: '#fff', fontSize: '11px' }}
                            />
                        </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-zinc-900 dark:text-white">{total}</span>
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase">Imóveis</span>
                        </div>
                    </div>
                </div>

                {/* Legenda Lateral */}
                <div className="w-full md:w-1/2 flex flex-col justify-center space-y-2">
                    {locationData.slice(0, 6).map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
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

            {/* Lista Completa */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Lista de Ativos</h4>
                <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {properties.map((prop, idx) => (
                        <div key={idx} className="flex justify-between items-start p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                            <div>
                                <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">{prop.name}</p>
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3" /> {prop.location || 'N/A'}
                                </p>
                            </div>
                            {prop.abl && (
                                <div className="text-right">
                                    <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                                        ABL: {prop.abl}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const IncomeAnalysisSection = ({ asset, chartData, marketHistory }: { asset: AssetPosition, chartData: { data: any[], average: number, activeTypes: string[] }, marketHistory: DividendReceipt[] }) => {
    const totalInvested = asset.quantity * asset.averagePrice;
    const yoc = totalInvested > 0 ? (asset.totalDividends || 0) / totalInvested * 100 : 0;
    const currentPrice = asset.currentPrice || 0;
    const monthlyReturn = asset.last_dividend || (asset.dy_12m ? (currentPrice * (asset.dy_12m/100))/12 : 0);
    const magicNumber = monthlyReturn > 0 ? Math.ceil(currentPrice / monthlyReturn) : 0;
    const magicProgress = magicNumber > 0 ? Math.min(100, (asset.quantity / magicNumber) * 100) : 0;
    const missingForMagic = Math.max(0, magicNumber - asset.quantity);
    const paybackYears = monthlyReturn > 0 ? (currentPrice / (monthlyReturn * 12)) : 0;

    // State for interactive simulator
    const [simMonthlyInvest, setSimMonthlyInvest] = useState<string>('1000');
    const [simYears, setSimYears] = useState<string>('5');
    const [simResult, setSimResult] = useState<{ qty: number, income: number } | null>(null);

    useEffect(() => {
        const monthlyInvest = parseFloat(simMonthlyInvest) || 0;
        const years = parseFloat(simYears) || 0;
        
        if (monthlyInvest > 0 && years > 0 && currentPrice > 0) {
            // Simple projection: assumes price stays same (buying power) and yield stays same
            // Future: could add price appreciation rate
            const months = years * 12;
            const totalInvestedFuture = monthlyInvest * months;
            const sharesBought = totalInvestedFuture / currentPrice;
            const totalSharesFuture = asset.quantity + sharesBought;
            const projectedIncome = totalSharesFuture * monthlyReturn;
            
            setSimResult({
                qty: Math.floor(totalSharesFuture),
                income: projectedIncome
            });
        } else {
            setSimResult(null);
        }
    }, [simMonthlyInvest, simYears, currentPrice, monthlyReturn, asset.quantity]);

    const perShareChartData = useMemo(() => {
        if (!marketHistory || marketHistory.length === 0) return [];
        
        // DEDUPLICAÇÃO INTELIGENTE DE EVENTOS DE DIVIDENDOS
        // Cria chave composta: Data (YYYY-MM) + Tipo + Valor para evitar somar duplicatas de importação
        const uniqueEvents = new Map<string, any>();
        
        marketHistory.forEach(d => {
            if (!d.paymentDate && !d.dateCom) return;
            const dateRef = d.paymentDate || d.dateCom;
            // Chave única para o evento específico
            const eventKey = `${dateRef}-${d.type}-${d.rate.toFixed(4)}`;
            
            if (!uniqueEvents.has(eventKey)) {
                uniqueEvents.set(eventKey, {
                    date: dateRef,
                    type: d.type,
                    rate: d.rate
                });
            }
        });

        const grouped: Record<string, { month: string, fullDate: string, DIV: number, JCP: number, REND: number, OUTROS: number, total: number }> = {};
        const today = new Date();
        
        // Inicializa últimos 12 meses
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7);
            grouped[key] = { month: getMonthLabel(key), fullDate: key, DIV: 0, JCP: 0, REND: 0, OUTROS: 0, total: 0 };
        }

        // Soma apenas eventos únicos no mês correspondente
        uniqueEvents.forEach((evt) => {
            const key = evt.date.substring(0, 7);
            
            if (grouped[key]) {
                let type = evt.type || 'OUTROS';
                if (type.includes('REND')) type = 'REND';
                else if (type.includes('DIV')) type = 'DIV';
                else if (type.includes('JCP') || type.includes('JURO')) type = 'JCP';
                else type = 'OUTROS';
                
                // Força REND para FIIs se vier algo estranho
                if (asset.assetType === AssetType.FII) type = 'REND';
                
                grouped[key][type as 'DIV' | 'JCP' | 'REND' | 'OUTROS'] += evt.rate;
                grouped[key].total += evt.rate;
            }
        });
        
        const allKeys = Object.keys(grouped).sort();
        return allKeys.map(k => grouped[k]);
    }, [marketHistory, asset.assetType]);

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-2xl border bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-indigo-100 dark:border-zinc-800 relative overflow-hidden shadow-sm">
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

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" /> Evolução da Renda (12m)
                    </h4>
                    <span className="text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-700">
                        Média: {formatBRL(chartData.average)}
                    </span>
                </div>
                <div className="h-60 w-full p-2 pt-4">
                    {chartData.data.some(d => d.total > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBarDiv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={TYPE_COLORS.DIV} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={TYPE_COLORS.DIV} stopOpacity={0.3}/>
                                    </linearGradient>
                                    <linearGradient id="colorBarJcp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={TYPE_COLORS.JCP} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={TYPE_COLORS.JCP} stopOpacity={0.3}/>
                                    </linearGradient>
                                    <linearGradient id="colorBarRend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={TYPE_COLORS.REND} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={TYPE_COLORS.REND} stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} interval={0} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}} 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.8)', color: '#fff', fontSize: '10px', padding: '8px 12px', backdropFilter: 'blur(8px)' }} 
                                    formatter={(value: number, name: string) => [formatBRL(value), TYPE_LABELS[name] || name]} 
                                />
                                {chartData.activeTypes.map(type => {
                                    let fillUrl = TYPE_COLORS[type];
                                    if (type === 'DIV') fillUrl = "url(#colorBarDiv)";
                                    if (type === 'JCP') fillUrl = "url(#colorBarJcp)";
                                    if (type === 'REND') fillUrl = "url(#colorBarRend)";
                                    
                                    return (
                                        <Bar 
                                            key={type} 
                                            dataKey={type} 
                                            stackId="a" 
                                            fill={fillUrl} 
                                            radius={[4, 4, 0, 0]} 
                                            maxBarSize={28}
                                            animationDuration={1500}
                                            animationEasing="ease-out"
                                        />
                                    );
                                })}
                                {chartData.average > 0 && <ReferenceLine y={chartData.average} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />}
                                <Legend iconType="circle" iconSize={6} formatter={(value) => <span className="text-[9px] font-bold text-zinc-500 uppercase">{TYPE_LABELS[value] || value}</span>} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">Sem histórico recente</div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase">Valor Pago por Cota (Histórico)</h4>
                </div>
                <div className="h-56 w-full p-2 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={perShareChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradUnitDiv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={TYPE_COLORS.DIV} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={TYPE_COLORS.DIV} stopOpacity={0.4}/>
                                </linearGradient>
                                <linearGradient id="gradUnitJcp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={TYPE_COLORS.JCP} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={TYPE_COLORS.JCP} stopOpacity={0.4}/>
                                </linearGradient>
                                <linearGradient id="gradUnitRend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={TYPE_COLORS.REND} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={TYPE_COLORS.REND} stopOpacity={0.4}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.8)', color: '#fff', fontSize: '10px', padding: '8px 12px', backdropFilter: 'blur(8px)' }} 
                                formatter={(value: number, name: string) => [formatBRL(value, false), name === 'REND' ? 'Rendimento' : name]} 
                            />
                            
                            {asset.assetType === AssetType.STOCK ? (
                                <>
                                    <Bar dataKey="DIV" stackId="a" fill="url(#gradUnitDiv)" name="Dividendos" maxBarSize={20} radius={[0,0,0,0]} animationDuration={1500} />
                                    <Bar dataKey="JCP" stackId="a" fill="url(#gradUnitJcp)" name="JCP" maxBarSize={20} radius={[4,4,0,0]} animationDuration={1500} />
                                </>
                            ) : (
                                <Bar dataKey="REND" fill="url(#gradUnitRend)" name="Rendimentos" maxBarSize={20} radius={[4,4,0,0]} animationDuration={1500} />
                            )}
                            
                            <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{r: 3, fill: "#f59e0b", strokeWidth: 0}} activeDot={{r: 5}} animationDuration={2000} name="Total Unitário" />
                            <Legend iconType="circle" iconSize={6} formatter={(val) => <span className="text-[9px] font-bold text-zinc-500 uppercase">{val}</span>} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Simulador de Renda Passiva</h4>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" /> Número Mágico</span>
                            <span className="text-[10px] font-black text-zinc-400 uppercase">{missingForMagic === 0 ? 'Atingido!' : `Faltam ${missingForMagic} cotas`}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${magicProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">Você precisa de <strong>{magicNumber}</strong> cotas para comprar uma nova cota todo mês apenas com os dividendos.</p>
                    </div>
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Metas de Renda Passiva</h5>
                        <div className="space-y-2">
                            {[50, 100, 1000].map(target => {
                                const needed = monthlyReturn > 0 ? Math.ceil(target / monthlyReturn) : 0;
                                const has = asset.quantity >= needed;
                                return (
                                    <div key={target} className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">{has ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Goal className="w-3.5 h-3.5 text-zinc-300" />} R$ {target}/mês</span>
                                        <span className={`font-mono font-medium ${has ? 'text-emerald-500' : 'text-zinc-400'}`}>{needed} cotas</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Projeção Futura</h5>
                        <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase mb-1 block">Aporte Mensal</label>
                                    <input 
                                        type="number" 
                                        value={simMonthlyInvest} 
                                        onChange={(e) => setSimMonthlyInvest(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-zinc-400 uppercase mb-1 block">Anos</label>
                                    <input 
                                        type="number" 
                                        value={simYears} 
                                        onChange={(e) => setSimYears(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>
                            {simResult && (
                                <div className="flex justify-between items-center pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                                    <div>
                                        <p className="text-[9px] text-zinc-400 font-medium">Renda Futura</p>
                                        <p className="text-sm font-black text-emerald-500">{formatBRL(simResult.income)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-400 font-medium">Total Cotas</p>
                                        <p className="text-sm font-black text-zinc-900 dark:text-white">{simResult.qty}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
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

interface PortfolioProps {
  portfolio: AssetPosition[];
  dividends: DividendReceipt[];
  marketDividends: DividendReceipt[];
  privacyMode: boolean;
  onAssetRefresh: (ticker: string) => Promise<void>;
  headerVisible: boolean;
  targetAsset: string | null;
  onClearTarget: () => void;
}

// Novo Card de Ativo Aprimorado
const AssetCard = ({ asset, maxVal, totalVal, privacyMode, onClick }: { asset: AssetPosition, maxVal: number, totalVal: number, privacyMode: boolean, onClick: () => void }) => {
    const currentVal = asset.quantity * (asset.currentPrice || 0);
    const invested = asset.quantity * asset.averagePrice;
    const gainLoss = currentVal - invested;
    const gainLossPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;
    const isPositive = gainLoss >= 0;
    
    const relativePercent = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;

    return (
        <button 
            onClick={onClick}
            className="w-full bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group hover:border-indigo-200 dark:hover:border-zinc-700 p-4"
        >
            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/20 dark:bg-indigo-400/20 transition-all duration-1000" style={{ width: `${relativePercent}%` }}></div>

            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3.5">
                    <div className="relative">
                        {asset.logoUrl ? (
                            <img src={asset.logoUrl} className="w-11 h-11 rounded-2xl object-cover bg-white shadow-sm border border-zinc-100 dark:border-zinc-800" />
                        ) : (
                            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-xs text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                {asset.ticker.substring(0, 2)}
                            </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-black ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        </div>
                    </div>
                    
                    <div className="text-left">
                        <h3 className="font-display font-black text-lg text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">{asset.ticker}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[120px]">
                            {asset.company_name || 'Ativo'}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="font-black text-lg text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">{formatBRL(currentVal, privacyMode)}</p>
                    <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[10px] font-medium text-zinc-400">{asset.quantity} un</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                            {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800/50">
                <div className="flex flex-col items-start">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Preço Médio</span>
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{formatBRL(asset.averagePrice, privacyMode)}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Preço Atual</span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{formatBRL(asset.currentPrice, privacyMode)}</span>
                </div>
            </div>
        </button>
    );
}

const PortfolioComponent: React.FC<PortfolioProps> = ({ 
    portfolio, dividends, marketDividends, privacyMode, 
    onAssetRefresh, headerVisible, targetAsset, onClearTarget 
}) => {
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYSIS' | 'INCOME'>('OVERVIEW');

    useEffect(() => {
        if (targetAsset) {
            setSelectedTicker(targetAsset);
            setActiveTab('OVERVIEW');
        }
    }, [targetAsset]);

    const handleBack = () => {
        setSelectedTicker(null);
        setActiveTab('OVERVIEW');
        if(onClearTarget) onClearTarget();
    };

    const sortedPortfolio = useMemo(() => {
        return portfolio
            .filter(p => p.ticker.includes(filter.toUpperCase()))
            .sort((a, b) => (b.quantity * (b.currentPrice||0)) - (a.quantity * (a.currentPrice||0)));
    }, [portfolio, filter]);

    // Grouping Assets
    const groupedAssets = useMemo(() => {
        const fiis: AssetPosition[] = [];
        const stocks: AssetPosition[] = [];
        let maxVal = 0;
        let totalVal = 0;
        let totalDailyChange = 0;

        sortedPortfolio.forEach(asset => {
            const val = asset.quantity * (asset.currentPrice || 0);
            if (val > maxVal) maxVal = val;
            totalVal += val;
            
            // Calculate weighted daily change
            if (asset.currentPrice) {
                const prevPrice = asset.currentPrice / (1 + (asset.dailyChange || 0) / 100);
                totalDailyChange += (asset.currentPrice - prevPrice) * asset.quantity;
            }

            if (asset.assetType === AssetType.FII) fiis.push(asset);
            else stocks.push(asset);
        });

        return { fiis, stocks, maxVal, totalVal, totalDailyChange };
    }, [sortedPortfolio]);

    const selectedAsset = useMemo(() => 
        portfolio.find(p => p.ticker === selectedTicker), 
    [portfolio, selectedTicker]);

    // Data prep for IncomeAnalysisSection
    const incomeChartData = useMemo(() => {
        if (!selectedAsset) return { data: [], average: 0, activeTypes: [] };
        
        // Filter dividends for this asset from wallet receipts
        const assetDivs = dividends.filter(d => d.ticker === selectedAsset.ticker);
        
        // Group by month
        const today = new Date();
        const last12m: Record<string, any> = {};
        for(let i=11; i>=0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const k = d.toISOString().substring(0, 7);
            last12m[k] = { month: getMonthLabel(k), DIV:0, JCP:0, REND:0, total: 0 };
        }
        
        const activeTypes = new Set<string>();
        
        assetDivs.forEach(d => {
            if(!d.paymentDate) return;
            const k = d.paymentDate.substring(0, 7);
            if(last12m[k]) {
                const type = d.type || 'DIV';
                activeTypes.add(type);
                last12m[k][type] = (last12m[k][type] || 0) + d.totalReceived;
                last12m[k].total += d.totalReceived;
            }
        });
        
        const data = Object.values(last12m);
        const total = data.reduce((acc, curr) => acc + curr.total, 0);
        
        return {
            data,
            average: total / 12,
            activeTypes: Array.from(activeTypes)
        };
    }, [selectedAsset, dividends]);

    const assetMarketHistory = useMemo(() => {
        if(!selectedAsset) return [];
        return marketDividends.filter(d => d.ticker === selectedAsset.ticker);
    }, [selectedAsset, marketDividends]);

    if (selectedAsset) {
        return (
            <div className="pb-24 animate-in slide-in-from-right duration-300">
                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 -mx-4 px-4 py-2 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={handleBack} className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-bold text-sm">Voltar</span>
                        </button>
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
                            <LayoutGrid className="w-3.5 h-3.5" /> Resumo
                        </button>
                        <button 
                            onClick={() => setActiveTab('ANALYSIS')} 
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            <FileText className="w-3.5 h-3.5" /> Análises
                        </button>
                        <button 
                            onClick={() => setActiveTab('INCOME')} 
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'INCOME' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            <Coins className="w-3.5 h-3.5" /> Renda
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {activeTab === 'OVERVIEW' && (
                        <div className="anim-fade-in space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sua Posição</h3>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                            </div>
                            <PositionSummaryCard asset={selectedAsset} privacyMode={privacyMode} />
                            
                            <div className="flex items-center gap-3 mt-8 mb-2">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Gráficos</h3>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                            </div>
                            <ChartsContainer 
                                ticker={selectedAsset.ticker} 
                                type={selectedAsset.assetType} 
                                marketDividends={assetMarketHistory}
                            />
                        </div>
                    )}

                    {activeTab === 'ANALYSIS' && (
                        <div className="anim-fade-in space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Valuation</h3>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                            </div>
                            <ValuationCard asset={selectedAsset} />
                            
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
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Geração de Renda</h3>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                            </div>
                            <IncomeAnalysisSection 
                                asset={selectedAsset} 
                                chartData={incomeChartData} 
                                marketHistory={assetMarketHistory} 
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-24">
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl -mx-4 px-4 pb-4 pt-2 transition-all">
                <div className="relative group mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Filtrar ativos..." 
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-10 pr-4 py-3 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                </div>

                {sortedPortfolio.length > 0 && (
                    <div className="flex justify-between items-center px-1">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Visível</p>
                            <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(groupedAssets.totalVal, privacyMode)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Variação Dia</p>
                            <span className={`text-sm font-black ${groupedAssets.totalDailyChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {groupedAssets.totalDailyChange >= 0 ? '+' : ''}{formatBRL(groupedAssets.totalDailyChange, privacyMode)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {sortedPortfolio.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Briefcase className="w-12 h-12 text-zinc-300 mb-2" strokeWidth={1} />
                    <p className="text-xs font-bold text-zinc-500">Sua carteira está vazia</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Grupo FIIs */}
                    {groupedAssets.fiis.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Fundos Imobiliários ({groupedAssets.fiis.length})</h3>
                            </div>
                            <div className="space-y-3">
                                {groupedAssets.fiis.map(asset => (
                                    <AssetCard 
                                        key={asset.ticker} 
                                        asset={asset} 
                                        maxVal={groupedAssets.maxVal} 
                                        totalVal={groupedAssets.totalVal}
                                        privacyMode={privacyMode} 
                                        onClick={() => setSelectedTicker(asset.ticker)} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Grupo Ações */}
                    {groupedAssets.stocks.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 px-1 pt-2">
                                <TrendingUp className="w-4 h-4 text-sky-500" />
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ações ({groupedAssets.stocks.length})</h3>
                            </div>
                            <div className="space-y-3">
                                {groupedAssets.stocks.map(asset => (
                                    <AssetCard 
                                        key={asset.ticker} 
                                        asset={asset} 
                                        maxVal={groupedAssets.maxVal} 
                                        totalVal={groupedAssets.totalVal}
                                        privacyMode={privacyMode} 
                                        onClick={() => setSelectedTicker(asset.ticker)} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);
