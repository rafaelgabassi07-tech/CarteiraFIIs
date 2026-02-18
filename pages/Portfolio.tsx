import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, Activity, BarChart3, PieChart, Coins, AlertCircle, ChevronDown, DollarSign, Percent, Briefcase, Building2, Users, FileText, MapPin, Zap, Info, Clock, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, Scale, SquareStack, Calendar, Map as MapIcon, ChevronRight, Share2, MousePointerClick, CandlestickChart, LineChart as LineChartIcon, SlidersHorizontal, Layers, Award, HelpCircle, Edit3, RefreshCw, Banknote, RefreshCcw } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { BrazilMap } from '../components/BrazilMap';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, Legend, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, ErrorBar, Label } from 'recharts';
import { formatBRL, formatPercent, formatNumber, formatDateShort, getMonthName } from '../utils/formatters';

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

const CHART_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#d946ef', '#84cc16'];

// --- SUB-COMPONENTS & HELPERS ---

const getMonthLabel = (dateStr: string) => {
    // dateStr format: YYYY-MM
    return getMonthName(dateStr + '-01').substring(0, 3).toUpperCase();
};

const MetricCard = ({ label, value, highlight = false, colorClass = "text-zinc-900 dark:text-white", subtext }: any) => (
    <div className={`p-3 rounded-2xl border flex flex-col justify-center min-h-[72px] transition-all ${highlight ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-white dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-700/50'}`}>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 truncate">{label}</span>
        <span className={`text-sm font-black truncate ${colorClass}`}>{value}</span>
        {subtext && <span className="text-[9px] text-zinc-400 mt-0.5">{subtext}</span>}
    </div>
);

const calculateSMA = (arr: any[], period: number, idx: number) => {
    if (idx < period - 1) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += arr[idx - i].close || arr[idx - i].price;
    }
    return sum / period;
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
        const low = d.low || price;
        const high = d.high || price;
        const open = d.open || price;
        const close = d.close || price;
        const isUp = close >= open;
        
        return {
            ...d,
            candleRange: [low, high], 
            open, close, high, low,
            sma20: calculateSMA(arr, 20, index),
            sma50: calculateSMA(arr, 50, index),
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

const CustomCandleShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;
    if (open == null || close == null || high == null || low == null) return null;

    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#f43f5e'; 
    const wickColor = isUp ? '#10b981' : '#f43f5e';
    const priceRange = high - low;
    
    if (priceRange === 0) {
        return <line x1={x} y1={y + height / 2} x2={x + width} y2={y + height / 2} stroke={wickColor} strokeWidth={2} />;
    }

    const ratio = height / priceRange;
    const yHigh = y;
    const yOpen = y + (high - open) * ratio;
    const yClose = y + (high - close) * ratio;
    const yLow = y + height;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));
    const candleWidth = Math.max(1, width * 0.6);
    const xCentered = x + (width - candleWidth) / 2;
    const wickX = x + width / 2;

    return (
        <g>
            <line x1={wickX} y1={yHigh} x2={wickX} y2={yLow} stroke={wickColor} strokeWidth={1} />
            <rect x={xCentered} y={bodyTop} width={candleWidth} height={bodyHeight} fill={color} rx={0} />
        </g>
    );
};

const CurrentPriceLabel = ({ viewBox, value }: any) => {
    const { y } = viewBox;
    return (
        <g transform={`translate(${viewBox.width + 2}, ${y})`}>
            <path d="M0,0 L5,-10 H42 A4,4 0 0 1 46,-6 V6 A4,4 0 0 1 42,10 H5 L0,0 Z" fill="#6366f1" />
            <text x={24} y={3} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold" fontFamily="Inter, sans-serif">
                {value.toFixed(2)}
            </text>
        </g>
    );
};

// --- COMPONENT 1: PriceHistoryChart (Cotação Pura) ---
const PriceHistoryChart = ({ data, loading, error, ticker, range, setRange }: any) => {
    const [chartType, setChartType] = useState<'AREA' | 'CANDLE'>('AREA');
    const [indicators, setIndicators] = useState({ sma20: false, sma50: false, volume: true });
    const { processedData, yDomain, variation, lastPrice } = useMemo(() => processChartData(data), [data]);
    const isPositive = variation >= 0;

    const toggleIndicator = (key: keyof typeof indicators) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-6 relative overflow-hidden">
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <CandlestickChart className="w-3.5 h-3.5" /> Histórico de Preços
                        </h3>
                        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700"></div>
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                            <button onClick={() => setChartType('AREA')} className={`p-1.5 rounded-md transition-all ${chartType === 'AREA' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}><LineChartIcon className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setChartType('CANDLE')} className={`p-1.5 rounded-md transition-all ${chartType === 'CANDLE' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}><CandlestickChart className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        {['1M', '6M', '1Y', '5Y'].map((r) => (
                            <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{r}</button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-1 items-center justify-end">
                    <button onClick={() => toggleIndicator('sma20')} className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-colors ${indicators.sma20 ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400' : 'border-transparent text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>MA20</button>
                    <button onClick={() => toggleIndicator('sma50')} className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-colors ${indicators.sma50 ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/20 dark:border-violet-900/50 dark:text-violet-400' : 'border-transparent text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>MA50</button>
                    <InfoTooltip title="Médias Móveis (MA)" text={<div className="text-left space-y-2"><p><strong>MA20 (Curto Prazo):</strong> Tendência rápida.</p><p><strong>MA50 (Médio Prazo):</strong> Tendência geral.</p></div>} />
                </div>
            </div>

            <div className="h-72 w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10"><div className="animate-pulse text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">Carregando...</div></div>
                ) : error || !data || data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados indisponíveis</div>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded-br-xl border-r border-b border-zinc-100 dark:border-zinc-800">
                            <span className={`text-xs font-black ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{isPositive ? '+' : ''}{variation.toFixed(2)}%</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={processedData} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis yAxisId="price" domain={yDomain} hide={false} orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#71717a'}} width={40} tickFormatter={(val) => val.toFixed(2)} tickMargin={5} />
                                <YAxis yAxisId="volume" hide={true} domain={[0, 'dataMax * 4']} />
                                <Tooltip cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }} content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        const isOpenUp = d.close >= d.open;
                                        return (
                                            <div className="bg-zinc-900/95 border border-zinc-800 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[140px]">
                                                <p className="text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wide border-b border-zinc-800 pb-1">{new Date(label).toLocaleDateString('pt-BR')}</p>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono mb-2">
                                                    <span className="text-zinc-500">O:</span><span className="text-white text-right">{formatBRL(d.open)}</span>
                                                    <span className="text-zinc-500">H:</span><span className="text-emerald-400 text-right">{formatBRL(d.high)}</span>
                                                    <span className="text-zinc-500">L:</span><span className="text-rose-400 text-right">{formatBRL(d.low)}</span>
                                                    <span className="text-zinc-500">C:</span><span className={`text-right font-bold ${isOpenUp ? 'text-emerald-500' : 'text-rose-500'}`}>{formatBRL(d.close)}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                                <ReferenceLine y={lastPrice} yAxisId="price" stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.8} ifOverflow="extendDomain"><Label content={<CurrentPriceLabel value={lastPrice} />} position="right" /></ReferenceLine>
                                {indicators.volume && <Bar dataKey="volume" yAxisId="volume" barSize={range === '1Y' ? 2 : 4} fillOpacity={0.3}>{processedData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.volColor} />))}</Bar>}
                                {chartType === 'AREA' ? <Area yAxisId="price" type="monotone" dataKey="close" stroke={isPositive ? '#10b981' : '#f43f5e'} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" /> : <Bar yAxisId="price" dataKey="candleRange" shape={<CustomCandleShape />} isAnimationActive={false} />}
                                {indicators.sma20 && <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                                {indicators.sma50 && <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT 2: ComparativeChart (Percentual) ---
const ComparativeChart = ({ data, loading, ticker, type, range, setRange }: any) => {
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
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm mb-6 relative overflow-hidden transition-all duration-300">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Rentabilidade Comparativa
                    </h3>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        {['1Y', '2Y', '5Y', 'MAX'].map((r) => (
                            <button key={r} onClick={() => setRange(r)} className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${range === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{r}</button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-900/20">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">{ticker}</span>
                    </div>
                    <button onClick={() => toggleBenchmark('CDI')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.CDI ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-zinc-500"></span><span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">CDI</span>
                    </button>
                    <button onClick={() => toggleBenchmark('IPCA')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IPCA ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span><span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300">IPCA</span>
                    </button>
                    <button onClick={() => toggleBenchmark('IBOV')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IBOV ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">IBOV</span>
                    </button>
                    {type === 'FII' && (
                        <button onClick={() => toggleBenchmark('IFIX')} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${visibleBenchmarks.IFIX ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-transparent border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">IFIX</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="h-64 w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
                        <div className="animate-pulse text-xs font-bold text-zinc-400">Carregando dados...</div>
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Dados insuficientes</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis dataKey="date" hide={false} axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#71717a'}} tickFormatter={(val) => formatDateShort(val)} minTickGap={40} />
                            <YAxis 
                                hide={false} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#71717a'}} 
                                width={35}
                                tickFormatter={(val) => `${val.toFixed(0)}%`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '11px', padding: '8px 12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                formatter={(value: number, name: string) => {
                                    const formattedVal = `${value.toFixed(2)}%`;
                                    if (name === 'assetPct') return [formattedVal, ticker];
                                    if (name === 'ibovPct') return [formattedVal, 'IBOV'];
                                    if (name === 'ifixPct') return [formattedVal, 'IFIX'];
                                    if (name === 'cdiPct') return [formattedVal, 'CDI'];
                                    if (name === 'ipcaPct') return [formattedVal, 'IPCA'];
                                    return [formattedVal, name];
                                }}
                            />
                            
                            {visibleBenchmarks.CDI && <Line type="monotone" dataKey="cdiPct" stroke="#52525b" strokeWidth={1.5} dot={false} strokeDasharray="2 2" animationDuration={1000} />}
                            {visibleBenchmarks.IPCA && <Line type="monotone" dataKey="ipcaPct" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="2 2" animationDuration={1000} />}
                            {visibleBenchmarks.IBOV && <Line type="monotone" dataKey="ibovPct" stroke="#f59e0b" strokeWidth={1.5} dot={false} animationDuration={1000} />}
                            {visibleBenchmarks.IFIX && <Line type="monotone" dataKey="ifixPct" stroke="#10b981" strokeWidth={1.5} dot={false} animationDuration={1000} />}
                            
                            <Line type="monotone" dataKey="assetPct" stroke="#6366f1" strokeWidth={2.5} dot={false} animationDuration={1000} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

// --- COMPONENT 3: SimulatorCard (R$) APRIMORADO ---
const SimulatorCard = ({ data, ticker, dividends = [] }: any) => {
    const [amount, setAmount] = useState(1000);
    const [reinvest, setReinvest] = useState(true); // Lógica de Bola de Neve
    
    const result = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        // 1. Encontrar ponto inicial e final
        const first = data[0];
        const last = data[data.length - 1];
        
        const startPrice = first.price || first.close;
        const endPrice = last.price || last.close;
        const startDate = new Date(first.date);
        
        if (!startPrice) return null;

        // 2. Simular compra inicial
        let shares = Math.floor(amount / startPrice);
        let cash = amount - (shares * startPrice);
        let totalDividendsReceived = 0;
        let dividendsUsedForReinvest = 0;
        
        // 3. Processar dividendos cronologicamente (Reinvestimento)
        if (dividends && dividends.length > 0) {
            // Ordena dividendos por data de pagamento
            const sortedDivs = [...dividends].sort((a: any, b: any) => {
                const dateA = new Date(a.paymentDate || a.dateCom).getTime();
                const dateB = new Date(b.paymentDate || b.dateCom).getTime();
                return dateA - dateB;
            });

            sortedDivs.forEach((div: DividendReceipt) => {
                const payDate = new Date(div.paymentDate || div.dateCom);
                
                // Só processa se for após a compra
                if (payDate >= startDate) {
                    const receipt = shares * div.rate;
                    totalDividendsReceived += receipt;
                    
                    if (reinvest) {
                        cash += receipt;
                        // Simula preço na data do dividendo (aproximado pela data mais próxima no array de historico)
                        // Para simplificar e ser rápido, usamos o startPrice se não acharmos (mas vamos tentar achar)
                        // Acha o preço mais próximo no histórico
                        const closestPoint = data.find((p: any) => new Date(p.date) >= payDate);
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
        
        // Benchmarks
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
            reinvestedAmount: dividendsUsedForReinvest
        };
    }, [data, amount, dividends, reinvest]);

    return (
        <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Award className="w-3.5 h-3.5" /> Simulador
                    </h3>
                    {reinvest && <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">Composto</span>}
                </div>
                
                <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                    {[1000, 5000, 10000].map(val => (
                        <button 
                            key={val} 
                            onClick={() => setAmount(val)} 
                            className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${amount === val ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                        >
                            {val/1000}k
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <p className="text-[10px] text-zinc-400 mb-1">Resultado final ({reinvest ? 'Reinvestindo' : 'Sacando'}):</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                        {result ? formatBRL(result.total) : '...'}
                    </span>
                    {result && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${result.profit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                            {result.profit > 0 ? '+' : ''}{result.roi.toFixed(1)}%
                        </span>
                    )}
                </div>
                <button 
                    onClick={() => setReinvest(!reinvest)} 
                    className="mt-3 flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-indigo-500 transition-colors"
                >
                    <RefreshCcw className={`w-3 h-3 ${reinvest ? 'text-indigo-500' : ''}`} />
                    {reinvest ? 'Desativar Reinvestimento' : 'Ativar Juros Compostos'}
                </button>
            </div>

            {result && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-0.5">Cotas Finais</span>
                            <span className="font-bold text-zinc-900 dark:text-white block">{result.shares} un</span>
                            {reinvest && <span className="text-[9px] text-emerald-500 font-bold">+{(result.shares - Math.floor(amount / (data[0]?.price || 1)))} ganhas</span>}
                        </div>
                        <div className="bg-white dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-0.5">Dividendos Totais</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block">+{formatBRL(result.dividends)}</span>
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 font-medium">Comparativo CDI</span>
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-400 line-through decoration-zinc-300 dark:decoration-zinc-700">{formatBRL(result.cdi)}</span>
                                <span className={`font-bold ${result.total >= result.cdi ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {result.total >= result.cdi ? 'Superou' : 'Perdeu'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ChartsContainer = ({ ticker, type, asset, marketDividends = [] }: { ticker: string, type: AssetType, asset: AssetPosition, marketDividends?: DividendReceipt[] }) => {
    const [range, setRange] = useState('1Y');
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/history?ticker=${ticker}&range=${range}`);
                if (!res.ok) throw new Error('Falha ao carregar gráfico');
                const data = await res.json();
                if (data.points) setHistoryData(data.points);
            } catch (err) {
                setError('Dados indisponíveis');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [ticker, range]);

    return (
        <>
            <PriceHistoryChart 
                data={historyData} 
                loading={loading} 
                error={error} 
                ticker={ticker} 
                range={range} 
                setRange={setRange} 
            />
            
            <ComparativeChart 
                data={historyData} 
                loading={loading} 
                ticker={ticker} 
                type={type}
                range={range}
                setRange={setRange}
            />

            <SimulatorCard data={historyData} ticker={ticker} dividends={marketDividends} />
        </>
    );
};

const PositionSummaryCard = ({ asset, privacyMode }: { asset: AssetPosition, privacyMode: boolean }) => {
    const totalInvested = asset.quantity * asset.averagePrice;
    const totalValue = asset.quantity * (asset.currentPrice || 0);
    const result = totalValue - totalInvested;
    const resultPercent = totalInvested > 0 ? (result / totalInvested) * 100 : 0;
    const isProfit = result >= 0;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
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
             <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
    
    // Extração segura para evitar erros de TS (possibly undefined)
    const lpa = asset.lpa ?? 0;
    const vpa = asset.vpa ?? 0;
    
    if (asset.assetType === AssetType.STOCK && lpa > 0 && vpa > 0) {
        fairPrice = Math.sqrt(22.5 * lpa * vpa);
    } else if (asset.dy_12m && asset.currentPrice) {
         const dividend = (asset.dy_12m/100) * asset.currentPrice;
         fairPrice = dividend / 0.06;
    }

    if (asset.currentPrice && fairPrice > 0) {
        upside = ((fairPrice - asset.currentPrice) / asset.currentPrice) * 100;
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-6">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5" /> Valuation
            </h3>
            <div className="flex items-center justify-between">
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
            <p className="text-[9px] text-zinc-400 mt-3 leading-relaxed">
                *Estimativa baseada em {asset.assetType === AssetType.STOCK ? 'Graham (VPA*LPA)' : 'Bazin (Dividendos)'}. Não é recomendação de compra.
            </p>
        </div>
    );
};

const DetailedInfoBlock = ({ asset }: { asset: AssetPosition }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Informações Detalhadas</h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[
                { label: 'Razão Social', value: asset.company_name },
                { label: 'CNPJ', value: asset.cnpj },
                { label: 'Segmento', value: asset.segment },
                { label: 'Gestão', value: asset.manager_type },
                { label: 'Taxa Adm.', value: asset.management_fee },
                { label: 'Público Alvo', value: asset.target_audience },
                { label: 'Mandato', value: asset.mandate },
                { label: 'Prazo', value: asset.duration }
            ].map((item, i) => (
                item.value && (
                    <div key={i} className="flex justify-between p-4 text-xs">
                        <span className="font-bold text-zinc-500">{item.label}</span>
                        <span className="font-medium text-zinc-900 dark:text-white text-right max-w-[60%]">{item.value}</span>
                    </div>
                )
            ))}
        </div>
    </div>
);

const IncomeAnalysisSection = ({ asset, chartData, marketHistory }: { asset: AssetPosition, chartData: { data: any[], average: number, activeTypes: string[] }, marketHistory: DividendReceipt[] }) => {
    const totalInvested = asset.quantity * asset.averagePrice;
    const yoc = totalInvested > 0 ? (asset.totalDividends || 0) / totalInvested * 100 : 0;
    const currentPrice = asset.currentPrice || 0;
    const monthlyReturn = asset.last_dividend || (asset.dy_12m ? (currentPrice * (asset.dy_12m/100))/12 : 0);
    const magicNumber = monthlyReturn > 0 ? Math.ceil(currentPrice / monthlyReturn) : 0;
    const magicProgress = magicNumber > 0 ? Math.min(100, (asset.quantity / magicNumber) * 100) : 0;
    const missingForMagic = Math.max(0, magicNumber - asset.quantity);
    const paybackYears = monthlyReturn > 0 ? (currentPrice / (monthlyReturn * 12)) : 0;

    // Chart Data baseada no HISTÓRICO DE MERCADO (Investidor10 Raw Data)
    const perShareChartData = useMemo(() => {
        if (!marketHistory || marketHistory.length === 0) return [];
        const grouped: Record<string, { month: string, fullDate: string, DIV: number, JCP: number, REND: number, OUTROS: number }> = {};
        const today = new Date();
        
        // Garante últimas 12 barras vazias se não houver dados, para manter escala
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7);
            grouped[key] = { month: getMonthLabel(key), fullDate: key, DIV: 0, JCP: 0, REND: 0, OUTROS: 0 };
        }

        marketHistory.forEach(d => {
            const dateRef = d.paymentDate || d.dateCom;
            if (!dateRef) return;
            const key = dateRef.substring(0, 7);
            
            // Só adiciona se estiver dentro do range de 12 meses visualizado ou se for histórico relevante
            // Aqui vamos permitir histórico mais longo se disponível, ordenado depois
            if (!grouped[key]) {
                 grouped[key] = { month: getMonthLabel(key), fullDate: key, DIV: 0, JCP: 0, REND: 0, OUTROS: 0 };
            }

            if (grouped[key]) {
                let type = d.type || 'OUTROS';
                if (type.includes('REND')) type = 'REND';
                else if (type.includes('DIV')) type = 'DIV';
                else if (type.includes('JCP') || type.includes('JURO')) type = 'JCP';
                else type = 'OUTROS';
                if (asset.assetType === AssetType.FII) type = 'REND';
                
                // Soma a TAXA UNITÁRIA (Rate) pois é valor por cota
                grouped[key][type as 'DIV' | 'JCP' | 'REND' | 'OUTROS'] += d.rate;
            }
        });
        
        // Filtra apenas os últimos 12 meses para o gráfico ou mostra tudo? 
        // O padrão geralmente é 12m, mas histórico é legal. Vamos pegar os últimos 12 meses com dados + os vazios até hoje.
        const allKeys = Object.keys(grouped).sort();
        const last12Keys = allKeys.slice(-12);
        
        return last12Keys.map(k => grouped[k]);
    }, [marketHistory, asset.assetType]);

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
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px 12px' }} formatter={(value: number, name: string) => [formatBRL(value), TYPE_LABELS[name] || name]} />
                                {chartData.activeTypes.map(type => (<Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type] || TYPE_COLORS['OUTROS']} radius={[2, 2, 0, 0]} maxBarSize={28} />))}
                                {chartData.average > 0 && <ReferenceLine y={chartData.average} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.6} />}
                                <Legend iconType="circle" iconSize={6} formatter={(value) => <span className="text-[9px] font-bold text-zinc-500 uppercase">{TYPE_LABELS[value] || value}</span>} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">Sem histórico recente</div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase">Valor Pago por Cota (Histórico)</h4>
                </div>
                <div className="h-56 w-full p-2 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perShareChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px 12px' }} formatter={(value: number, name: string) => [formatBRL(value, false), name === 'REND' ? 'Rendimento' : name]} />
                            {asset.assetType === AssetType.STOCK ? (<><Bar dataKey="DIV" stackId="a" fill={TYPE_COLORS.DIV} name="Dividendos" maxBarSize={24} radius={[0,0,0,0]} /><Bar dataKey="JCP" stackId="a" fill={TYPE_COLORS.JCP} name="JCP" maxBarSize={24} radius={[4,4,0,0]} /></>) : (<Bar dataKey="REND" fill={TYPE_COLORS.REND} name="Rendimentos" maxBarSize={24} radius={[4,4,0,0]} />)}
                            <Legend iconType="circle" iconSize={6} formatter={(val) => <span className="text-[9px] font-bold text-zinc-500 uppercase">{val}</span>} />
                        </BarChart>
                    </ResponsiveContainer>
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
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" /> Número Mágico</span>
                            <span className="text-[10px] font-black text-zinc-400 uppercase">{missingForMagic === 0 ? 'Atingido!' : `Faltam ${missingForMagic} cotas`}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${magicProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">Você precisa de <strong>{magicNumber}</strong> cotas para comprar uma nova cota todo mês apenas com os dividendos.</p>
                    </div>
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Metas de Renda Passiva</h5>
                        <div className="space-y-3">
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

const PortfolioHeader = ({ totalBalance, totalInvested, privacyMode }: { totalBalance: number, totalInvested: number, privacyMode: boolean }) => {
    const gain = totalBalance - totalInvested;
    const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
    const isPositive = gain >= 0;

    return (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-primary-light/95 dark:bg-primary-dark/95 backdrop-blur-xl px-4 pt-3 pb-3 border-b border-zinc-200 dark:border-zinc-800 transition-all">
            <div className="flex justify-between items-end">
                <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5 block">Patrimônio Filtrado</span>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                        {formatBRL(totalBalance, privacyMode)}
                    </h2>
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" strokeWidth={3} /> : <TrendingDown className="w-3.5 h-3.5" strokeWidth={3} />}
                    {gainPct.toFixed(2)}%
                </div>
            </div>
        </div>
    );
};

const AssetListItem: React.FC<any> = ({ asset, onOpenDetails, privacyMode, isExpanded, onToggle, totalPortfolioValue }) => {
    const isPositive = (asset.dailyChange || 0) >= 0;
    const totalVal = asset.quantity * (asset.currentPrice || 0);
    const profitValue = (asset.currentPrice && asset.averagePrice) ? (asset.currentPrice - asset.averagePrice) * asset.quantity : 0;
    const profitPercent = asset.averagePrice > 0 ? ((asset.currentPrice || 0) / asset.averagePrice - 1) * 100 : 0;
    const isProfit = profitPercent >= 0;
    
    const allocationPct = totalPortfolioValue > 0 ? (totalVal / totalPortfolioValue) * 100 : 0;

    return (
        <div className={`mb-3 rounded-3xl border transition-all duration-300 overflow-hidden bg-white dark:bg-zinc-900 ${isExpanded ? 'border-zinc-200 dark:border-zinc-700 shadow-lg ring-2 ring-zinc-100 dark:ring-zinc-800' : 'border-zinc-100 dark:border-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'}`}>
            <button onClick={onToggle} className="w-full relative p-4 bg-transparent press-effect outline-none">
                
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-black tracking-wider shadow-sm transition-colors ${asset.assetType === AssetType.FII ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30'}`}>
                            {asset.ticker.substring(0, 2)}
                        </div>
                        <div className="text-left">
                            <h4 className="text-base font-black text-zinc-900 dark:text-white leading-none">{asset.ticker}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-medium text-zinc-400">{asset.quantity} un</span>
                                {asset.dy_12m !== undefined && asset.dy_12m > 0 && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                        DY {asset.dy_12m.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <p className="text-base font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">{formatBRL(totalVal, privacyMode)}</p>
                        {asset.dailyChange !== undefined && (
                            <div className={`flex justify-end items-center gap-1 mt-0.5 text-[10px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(asset.dailyChange).toFixed(2)}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Allocation Bar */}
                <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex items-center">
                    <div 
                        className={`h-full rounded-full ${asset.assetType === AssetType.FII ? 'bg-indigo-500' : 'bg-sky-500'}`} 
                        style={{ width: `${allocationPct}%` }}
                    ></div>
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
                    <button onClick={(e) => { e.stopPropagation(); onOpenDetails(); }} className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 press-effect shadow-md">
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
  marketDividends?: DividendReceipt[];
}

const PortfolioComponent: React.FC<PortfolioProps> = ({ portfolio, dividends = [], privacyMode = false, marketDividends = [], onAssetRefresh, targetAsset, onClearTarget }) => {
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [expandedAssetTicker, setExpandedAssetTicker] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'RESUMO' | 'RENDA' | 'ANALISE'>('RESUMO');

    useEffect(() => {
        if (targetAsset) {
            const found = portfolio.find(p => p.ticker === targetAsset);
            if (found) {
                setSelectedAsset(found);
            }
            if (onClearTarget) onClearTarget();
        }
    }, [targetAsset, portfolio, onClearTarget]);

    const filteredPortfolio = useMemo(() => {
        return portfolio.filter(p => p.ticker.includes(search.toUpperCase()));
    }, [portfolio, search]);

    const totalFilteredBalance = useMemo(() => {
        return filteredPortfolio.reduce((acc, a) => acc + ((a.currentPrice || 0) * a.quantity), 0);
    }, [filteredPortfolio]);

    const totalFilteredInvested = useMemo(() => {
        return filteredPortfolio.reduce((acc, a) => acc + (a.averagePrice * a.quantity), 0);
    }, [filteredPortfolio]);

    const getAssetChartData = (ticker: string) => {
        const assetDividends = dividends.filter(d => d.ticker === ticker);
        const todayStr = new Date().toISOString().split('T')[0];
        const groups: Record<string, any> = {};
        
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const k = d.toISOString().substring(0, 7);
            groups[k] = { month: getMonthLabel(k), total: 0, DIV: 0, JCP: 0, REND: 0, OUTROS: 0 };
        }

        assetDividends.forEach(d => {
            if (d.paymentDate && d.paymentDate <= todayStr) {
                const k = d.paymentDate.substring(0, 7);
                if (groups[k]) {
                    groups[k].total += d.totalReceived;
                    let t = d.type || 'OUTROS';
                    if (!['DIV','JCP','REND','AMORT','REST'].includes(t)) {
                        t = 'OUTROS';
                    }
                    if (groups[k][t] === undefined) groups[k][t] = 0;
                    groups[k][t] += d.totalReceived;
                }
            }
        });

        const data = Object.values(groups);
        const average = data.reduce((acc: number, c: any) => acc + c.total, 0) / 12;
        const activeTypes = ['DIV', 'JCP', 'REND', 'AMORT', 'REST', 'OUTROS'].filter(t => data.some((d: any) => d[t] > 0));

        return { data, average, activeTypes };
    };

    const selectedAssetChartData = useMemo(() => {
        if (!selectedAsset) return { data: [], average: 0, activeTypes: [] };
        return getAssetChartData(selectedAsset.ticker);
    }, [selectedAsset, dividends]);

    const selectedAssetMarketHistory = useMemo(() => {
        if (!selectedAsset) return [];
        return marketDividends.filter(d => d.ticker === selectedAsset.ticker);
    }, [selectedAsset, marketDividends]);

    // Calcula dados do gráfico de pizza para imóveis (Agrupado por Estado)
    const propertyStats = useMemo(() => {
        if (!selectedAsset?.properties) return [];
        const counts: Record<string, number> = {};
        selectedAsset.properties.forEach(p => {
            const loc = p.location ? p.location.split('-')[0].trim().substring(0, 2).toUpperCase() : 'ND';
            counts[loc] = (counts[loc] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value], idx) => ({ 
                name, 
                value, 
                color: CHART_COLORS[idx % CHART_COLORS.length] 
            }))
            .sort((a, b) => b.value - a.value);
    }, [selectedAsset]);

    return (
        <div className="pb-24 -mt-2"> {/* Negative margin to pull closer to main header */}
             
             <PortfolioHeader totalBalance={totalFilteredBalance} totalInvested={totalFilteredInvested} privacyMode={privacyMode} />

             <div className="px-4 py-3 bg-primary-light dark:bg-primary-dark sticky top-[calc(3.5rem+env(safe-area-inset-top)+65px)] z-10">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Filtrar por nome ou ticker..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value.toUpperCase())} 
                        className="w-full bg-zinc-100 dark:bg-zinc-800 pl-10 pr-4 py-2.5 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500/20" 
                    />
                </div>
             </div>

             <div className="px-1 mt-2">
                {filteredPortfolio.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-sm font-bold text-zinc-500">Nenhum ativo encontrado.</p>
                    </div>
                ) : (
                    filteredPortfolio.map((asset) => (
                        <AssetListItem 
                            key={asset.ticker} 
                            asset={asset} 
                            privacyMode={privacyMode}
                            isExpanded={expandedAssetTicker === asset.ticker}
                            onToggle={() => setExpandedAssetTicker(prev => prev === asset.ticker ? null : asset.ticker)}
                            onOpenDetails={() => {
                                setSelectedAsset(asset);
                                if (onAssetRefresh) onAssetRefresh(asset.ticker);
                            }}
                            totalPortfolioValue={totalFilteredBalance}
                        />
                    ))
                )}
             </div>

             <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && (
                    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
                        <div className="px-6 py-5 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                {selectedAsset.logoUrl ? (
                                    <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-12 h-12 rounded-full object-contain bg-white p-1 border border-zinc-100 dark:border-zinc-800" />
                                ) : (
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                        {selectedAsset.ticker.substring(0, 2)}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-black text-zinc-900 dark:text-white">{selectedAsset.ticker}</h2>
                                    <p className="text-xs text-zinc-500 font-medium">{selectedAsset.company_name || 'Detalhes do Ativo'}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 pt-4 pb-2 bg-white dark:bg-zinc-900 shrink-0">
                            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                                {['RESUMO', 'RENDA', 'ANALISE'].map((tab) => (
                                    <button 
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                    >
                                        {tab === 'ANALISE' ? 'Análise' : tab === 'RENDA' ? 'Renda' : 'Resumo'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {activeTab === 'RESUMO' && (
                                <div className="anim-fade-in space-y-6">
                                    <PositionSummaryCard asset={selectedAsset} privacyMode={privacyMode} />
                                    <DetailedInfoBlock asset={selectedAsset} />
                                    
                                    {selectedAsset.properties && selectedAsset.properties.length > 0 && (
                                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <MapIcon className="w-4 h-4 text-zinc-400" />
                                                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mapa de Imóveis</h3>
                                                </div>
                                                <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full uppercase tracking-wider">
                                                    {selectedAsset.properties.length} Imóveis
                                                </span>
                                            </div>

                                            {/* CAROUSEL: GRÁFICO + MAPA */}
                                            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 -mx-4 px-4">
                                                {/* Slide 1: Gráfico */}
                                                <div className="min-w-full snap-center flex items-center justify-center h-56 relative">
                                                    <div className="absolute top-2 left-0 z-10 px-2 py-1 bg-white/80 dark:bg-black/50 rounded-lg backdrop-blur-sm text-[9px] font-bold uppercase text-zinc-500">
                                                        Distribuição
                                                    </div>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RePieChart>
                                                            <Pie
                                                                data={propertyStats}
                                                                innerRadius={50}
                                                                outerRadius={70}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {propertyStats.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip 
                                                                contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px 12px' }}
                                                            />
                                                            <Legend 
                                                                layout="vertical" 
                                                                verticalAlign="middle" 
                                                                align="right"
                                                                iconType="circle"
                                                                iconSize={6}
                                                                formatter={(val, entry: any) => <span className="text-[10px] font-bold text-zinc-500 ml-1">{val} ({entry.payload.value})</span>}
                                                            />
                                                        </RePieChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Slide 2: Mapa */}
                                                <div className="min-w-full snap-center h-56 relative">
                                                    <div className="absolute top-2 left-0 z-10 px-2 py-1 bg-white/80 dark:bg-black/50 rounded-lg backdrop-blur-sm text-[9px] font-bold uppercase text-zinc-500">
                                                        Geolocalização
                                                    </div>
                                                    <BrazilMap 
                                                        data={selectedAsset.properties.map(p => ({ name: p.location || '', value: 1 }))} 
                                                        totalProperties={selectedAsset.properties.length} 
                                                    />
                                                </div>
                                            </div>

                                            {/* Paginação */}
                                            <div className="flex justify-center gap-1.5 mb-6">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                                            </div>

                                            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                                                {selectedAsset.properties.slice(0, 5).map((prop, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                                        <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[70%]">{prop.name}</span>
                                                        <span className="text-[10px] font-black text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-700 uppercase">{prop.location || 'BR'}</span>
                                                    </div>
                                                ))}
                                                {selectedAsset.properties.length > 5 && (
                                                    <button className="w-full py-3 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/30 rounded-xl mt-2">
                                                        Ver todos ({selectedAsset.properties.length})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'RENDA' && (
                                <div className="anim-fade-in">
                                    <IncomeAnalysisSection asset={selectedAsset} chartData={selectedAssetChartData} marketHistory={selectedAssetMarketHistory} />
                                </div>
                            )}

                            {activeTab === 'ANALISE' && (
                                <div className="anim-fade-in space-y-6">
                                    <ChartsContainer 
                                        ticker={selectedAsset.ticker} 
                                        type={selectedAsset.assetType} 
                                        asset={selectedAsset}
                                        marketDividends={selectedAssetMarketHistory}
                                    />
                                    <ValuationCard asset={selectedAsset} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
             </SwipeableModal>
        </div>
    );
};

export const Portfolio = React.memo(PortfolioComponent);