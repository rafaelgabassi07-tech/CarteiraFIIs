
import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, AssetType, DividendReceipt } from '../types';
import { Search, Wallet, TrendingUp, TrendingDown, X, Calculator, BarChart3, PieChart, Coins, DollarSign, Building2, FileText, MapPin, Zap, CheckCircle, Goal, ArrowUpRight, ArrowDownLeft, SquareStack, Map as MapIcon, CandlestickChart, LineChart as LineChartIcon, Award, RefreshCcw, ArrowLeft, Briefcase, MoreHorizontal, LayoutGrid, List, Activity, Scale, Percent, ChevronDown, ChevronUp, ListFilter, BookOpen } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, ReferenceLine, ComposedChart, CartesianGrid, AreaChart, Area, YAxis, PieChart as RePieChart, Pie, Cell, LineChart, Line, Label, Legend, Scatter } from 'recharts';
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

import AssetModal from '../components/AssetModal';

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
















const IncomeAnalysisSection = ({ asset, chartData, marketHistory: rawMarketHistory }: { asset: AssetPosition, chartData: { data: any[], average: number, activeTypes: string[] }, marketHistory: DividendReceipt[] }) => {
    // DEDUPLICAÇÃO GLOBAL DE PROVENTOS PARA EVITAR DUPLICIDADE EM TODOS OS GRÁFICOS
    const marketHistory = useMemo(() => {
        if (!rawMarketHistory) return [];
        const unique = new Map<string, DividendReceipt>();
        rawMarketHistory.forEach(d => {
            const dateRef = d.paymentDate || d.dateCom || 'N/A';
            const key = `${d.ticker}-${dateRef}-${d.type}-${d.rate.toFixed(4)}`;
            if (!unique.has(key)) {
                unique.set(key, d);
            }
        });
        return Array.from(unique.values());
    }, [rawMarketHistory]);

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
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [yieldRange, setYieldRange] = useState('5y');

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const res = await fetch(`/api/history?ticker=${asset.ticker}&range=${yieldRange}`);
                const data = await res.json();
                if (data && data.points) {
                    setPriceHistory(data.points);
                }
            } catch (error) {
                console.error("Failed to fetch history for yield chart", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [asset.ticker, yieldRange]);

    const yieldHistoryData = useMemo(() => {
        if (!priceHistory.length || !marketHistory.length) return [];

        // Sort dividends by date
        const sortedDivs = [...marketHistory].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

        // Sample price history to reduce points (e.g., one per week or month) to improve performance
        // Taking the last price of each month is a good standard
        const monthlyPrices = new Map<string, number>();
        priceHistory.forEach(p => {
            const d = new Date(p.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            // Overwrite to keep the latest price of the month
            monthlyPrices.set(key, p.close);
        });

        const chartPoints: any[] = [];
        
        monthlyPrices.forEach((price, monthKey) => {
            const [year, month] = monthKey.split('-').map(Number);
            const dateObj = new Date(year, month - 1, 28); // End of month approx
            
            // Calculate trailing 12m dividends
            const oneYearAgo = new Date(dateObj);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const trailingDivs = sortedDivs.filter(d => {
                const payDate = new Date(d.paymentDate);
                return payDate > oneYearAgo && payDate <= dateObj;
            });

            const totalDivs = trailingDivs.reduce((sum, d) => sum + d.rate, 0);
            
            if (totalDivs > 0 && price > 0) {
                const dy = (totalDivs / price) * 100;
                // Filter out unrealistic spikes (e.g. data errors)
                if (dy < 100) {
                    chartPoints.push({
                        date: monthKey,
                        displayDate: `${month}/${year}`,
                        yield: dy,
                        price: price,
                        dividends: totalDivs
                    });
                }
            }
        });

        return chartPoints.sort((a, b) => a.date.localeCompare(b.date));
    }, [priceHistory, marketHistory]);

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
        
        const grouped: Record<string, { month: string, fullDate: string, DIV: number, JCP: number, REND: number, OUTROS: number, total: number }> = {};
        const today = new Date();
        
        // Inicializa últimos 12 meses
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toISOString().substring(0, 7);
            grouped[key] = { month: getMonthLabel(key), fullDate: key, DIV: 0, JCP: 0, REND: 0, OUTROS: 0, total: 0 };
        }

        // Soma eventos no mês correspondente (já deduplicados no topo)
        marketHistory.forEach((evt) => {
            const dateRef = evt.paymentDate || evt.dateCom;
            if (!dateRef) return;
            const key = dateRef.substring(0, 7);
            
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

    const yearlyDividendData = useMemo(() => {
        if (!marketHistory || marketHistory.length === 0) return [];
        
        const yearlyMap = new Map<number, number>();
        marketHistory.forEach(d => {
            if (!d.paymentDate) return;
            const year = new Date(d.paymentDate).getFullYear();
            const current = yearlyMap.get(year) || 0;
            // Prioritize actual total received, fallback to rate * quantityOwned, then rate * current quantity
            const amount = d.totalReceived || (d.rate * (d.quantityOwned || asset.quantity));
            yearlyMap.set(year, current + amount);
        });

        const years = Array.from(yearlyMap.keys()).sort();
        return years.map((year, index) => {
            const total = yearlyMap.get(year) || 0;
            let growth = 0;
            if (index > 0) {
                const prevTotal = yearlyMap.get(years[index - 1]) || 0;
                if (prevTotal > 0) {
                    growth = ((total - prevTotal) / prevTotal) * 100;
                }
            }
            return {
                year: year.toString(),
                total,
                growth
            };
        });
    }, [marketHistory, asset.quantity]);

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                            <BarChart3 className="w-3 h-3" /> Evolução Mensal (12m)
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
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">Sem histórico recente</div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Evolução Anual de Proventos
                            </h4>
                        </div>
                        <p className="text-[9px] text-zinc-500 font-medium leading-tight">
                            Acompanhe o crescimento do seu fluxo de caixa passivo total recebido por ano. Este gráfico ilustra o efeito "bola de neve" ao longo do tempo.
                        </p>
                    </div>
                    <div className="h-60 w-full p-2 pt-4">
                        {yearlyDividendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={yearlyDividendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBarYearly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.8)', color: '#fff', fontSize: '10px', padding: '8px 12px', backdropFilter: 'blur(8px)' }} 
                                        formatter={(value: number, name: string) => {
                                            if (name === 'growth') return [`${value.toFixed(1)}%`, 'Crescimento'];
                                            return [formatBRL(value), 'Total Recebido'];
                                        }} 
                                    />
                                    <Bar 
                                        dataKey="total" 
                                        fill="url(#colorBarYearly)" 
                                        radius={[4, 4, 0, 0]} 
                                        maxBarSize={40}
                                        animationDuration={1500}
                                        name="Total"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="growth" 
                                        stroke="#10b981" 
                                        strokeWidth={2} 
                                        dot={{r: 3, fill: "#10b981"}} 
                                        name="Crescimento %"
                                        yAxisId="right"
                                    />
                                    <YAxis yAxisId="right" orientation="right" hide />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">Sem histórico anual</div>
                        )}
                    </div>
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

            {/* Yield History Chart */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase">Dividend Yield Histórico (12m)</h4>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        {['1y', '2y', '5y', 'max'].map((r) => (
                            <button 
                                key={r} 
                                onClick={() => setYieldRange(r)} 
                                className={`px-2 py-0.5 text-[8px] font-bold rounded-md transition-all ${yieldRange === r ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-60 w-full p-2 pt-4">
                    {yieldHistoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={yieldHistoryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.4} />
                                <XAxis 
                                    dataKey="displayDate" 
                                    tick={{fontSize: 9, fill: '#71717a'}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    dy={10}
                                    minTickGap={30}
                                />
                                <YAxis 
                                    tick={{fontSize: 9, fill: '#71717a'}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    tickFormatter={(val) => `${val.toFixed(1)}%`}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(24, 24, 27, 0.8)', color: '#fff', fontSize: '10px', padding: '8px 12px', backdropFilter: 'blur(8px)' }}
                                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'DY (12m)']}
                                    labelStyle={{ color: '#71717a', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Bar 
                                    dataKey="yield" 
                                    fill={asset.assetType === AssetType.FII ? "url(#gradUnitRend)" : "url(#gradUnitDiv)"} 
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={20}
                                    animationDuration={1500}
                                    name="DY Mensal"
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="yield" 
                                    stroke="#f59e0b" 
                                    strokeWidth={2}
                                    dot={{r: 3, fill: "#f59e0b", strokeWidth: 0}}
                                    activeDot={{r: 5}}
                                    animationDuration={2000}
                                    name="DY Histórico"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400 text-xs">
                            {isLoadingHistory ? 'Carregando histórico...' : 'Sem dados históricos suficientes'}
                        </div>
                    )}
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

    const [activeTab, setActiveTab] = useState('OVERVIEW');

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
            <AssetModal 
                asset={selectedAsset} 
                onClose={handleBack} 
                onAssetRefresh={onAssetRefresh}
                marketDividends={assetMarketHistory}
                incomeChartData={incomeChartData}
                privacyMode={privacyMode}
            />
        )
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
