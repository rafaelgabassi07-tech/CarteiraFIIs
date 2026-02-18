import React, { useState, useMemo, useEffect } from 'react';
import { AssetPosition, DividendReceipt, AssetType } from '../types';
import { Wallet, BarChart3, Coins, Zap, CheckCircle, Goal, TrendingUp, TrendingDown, ArrowRight, Search, X, AlertTriangle, Building2, RefreshCw, Filter, PieChart } from 'lucide-react';
import { SwipeableModal, InfoTooltip } from '../components/Layout';
import { BrazilMap } from '../components/BrazilMap';
import { formatBRL, formatPercent, formatNumber } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const TYPE_COLORS: Record<string, string> = {
    DIV: '#10b981',
    JCP: '#0ea5e9',
    REND: '#8b5cf6',
    AMORT: '#f59e0b',
    OUTROS: '#71717a'
};

const TYPE_LABELS: Record<string, string> = {
    DIV: 'Dividendos',
    JCP: 'JCP',
    REND: 'Rendimentos',
    AMORT: 'Amortização',
    OUTROS: 'Outros'
};

const getMonthLabel = (dateStr: string) => {
    try {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    } catch {
        return dateStr;
    }
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
            
            if (!grouped[key]) {
                 grouped[key] = { month: getMonthLabel(key), fullDate: key, DIV: 0, JCP: 0, REND: 0, OUTROS: 0 };
            }

            if (grouped[key]) {
                if (asset.assetType === AssetType.FII) {
                    // Para FIIs, somamos tudo em REND para representar o "Pagamento Mensal Total"
                    grouped[key]['REND'] += d.rate;
                } else {
                    // Para Ações, separamos os tipos
                    let type = d.type || 'OUTROS';
                    if (type.includes('REND')) type = 'REND';
                    else if (type.includes('DIV')) type = 'DIV';
                    else if (type.includes('JCP') || type.includes('JURO')) type = 'JCP';
                    else type = 'OUTROS';
                    
                    grouped[key][type as 'DIV' | 'JCP' | 'REND' | 'OUTROS'] += d.rate;
                }
            }
        });
        
        const allKeys = Object.keys(grouped).sort();
        // Pega os últimos 12 meses para o gráfico
        const last12Keys = allKeys.slice(-12);
        
        return last12Keys.map(k => grouped[k]);
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
                        <BarChart3 className="w-3 h-3" /> Evolução (12m)
                    </h4>
                    <span className="text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-700">
                        Média: {formatBRL(chartData.average)}
                    </span>
                </div>
                <div className="h-60 w-full p-2 pt-4">
                    {chartData.data.some(d => d.total > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 700 }} dy={5} interval={0} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px 12px' }} formatter={(value: number, name: string) => [formatBRL(value), TYPE_LABELS[name] || name]} />
                                
                                {asset.assetType === AssetType.FII ? (
                                    // FIIs: Mostra apenas o total consolidado (Barra única verde)
                                    <Bar dataKey="total" fill={TYPE_COLORS.REND} name="Rendimentos" radius={[2, 2, 0, 0]} maxBarSize={32} />
                                ) : (
                                    // Ações: Mostra discriminado (Empilhado)
                                    chartData.activeTypes.map(type => (
                                        <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type] || TYPE_COLORS['OUTROS']} radius={[0, 0, 0, 0]} maxBarSize={28} />
                                    ))
                                )}
                                
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
                        <BarChart data={perShareChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#71717a' }} />
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'rgba(24, 24, 27, 0.95)', color: '#fff', fontSize: '10px', padding: '8px 12px' }} formatter={(value: number, name: string) => [formatBRL(value, false), name === 'REND' ? 'Rendimento' : name]} />
                            
                            {asset.assetType === AssetType.STOCK ? (
                                <>
                                    <Bar dataKey="DIV" stackId="a" fill={TYPE_COLORS.DIV} name="Dividendos" maxBarSize={24} radius={[0,0,0,0]} />
                                    <Bar dataKey="JCP" stackId="a" fill={TYPE_COLORS.JCP} name="JCP" maxBarSize={24} radius={[4,4,0,0]} />
                                </>
                            ) : (
                                <Bar dataKey="REND" fill={TYPE_COLORS.REND} name="Rendimentos" maxBarSize={24} radius={[4,4,0,0]} />
                            )}
                            
                            <Legend iconType="circle" iconSize={6} formatter={(val) => <span className="text-[9px] font-bold text-zinc-500 uppercase">{val}</span>} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Raio-X de Renda</h4>
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

export const Portfolio: React.FC<PortfolioProps> = ({ 
    portfolio, 
    dividends, 
    marketDividends, 
    privacyMode, 
    onAssetRefresh, 
    headerVisible, 
    targetAsset, 
    onClearTarget 
}) => {
    const [selectedAsset, setSelectedAsset] = useState<AssetPosition | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'FII' | 'STOCK'>('ALL');

    useEffect(() => {
        if (targetAsset) {
            const asset = portfolio.find(p => p.ticker === targetAsset);
            if (asset) setSelectedAsset(asset);
        }
    }, [targetAsset, portfolio]);

    const handleCloseModal = () => {
        setSelectedAsset(null);
        if (targetAsset) onClearTarget();
    };

    const filteredPortfolio = useMemo(() => {
        return portfolio.filter(asset => {
            const matchesSearch = asset.ticker.includes(searchTerm.toUpperCase());
            const matchesType = filterType === 'ALL' || asset.assetType === (filterType === 'FII' ? AssetType.FII : AssetType.STOCK);
            return matchesSearch && matchesType;
        }).sort((a, b) => (b.quantity * b.averagePrice) - (a.quantity * a.averagePrice));
    }, [portfolio, searchTerm, filterType]);

    // Prepara dados de dividendos RECEBIDOS pelo usuário (Histórico 12m)
    const selectedAssetChartData = useMemo(() => {
        if (!selectedAsset) return { data: [], average: 0, activeTypes: [] };
        
        const today = new Date();
        const last12Months = [];
        for(let i=11; i>=0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            last12Months.push(d.toISOString().slice(0, 7));
        }
        
        const activeTypes = new Set<string>();
        const data = last12Months.map(monthKey => {
            const monthDivs = dividends.filter(d => 
                d.ticker === selectedAsset.ticker && 
                (d.paymentDate || '').startsWith(monthKey)
            );
            
            const point: any = { month: getMonthLabel(monthKey), total: 0 };
            monthDivs.forEach(d => {
                point.total += d.totalReceived;
                let type = d.type || 'OUTROS';
                // Normaliza
                if (type.includes('JURO')) type = 'JCP';
                else if (type.includes('DIV')) type = 'DIV';
                else if (type.includes('REND')) type = 'REND';
                
                point[type] = (point[type] || 0) + d.totalReceived;
                activeTypes.add(type);
            });
            return point;
        });
        
        const total = data.reduce((sum, item) => sum + item.total, 0);
        const average = total / 12;
        
        return { data, average, activeTypes: Array.from(activeTypes) };
    }, [selectedAsset, dividends]);

    // Prepara histórico de mercado (Bruto)
    const selectedAssetMarketHistory = useMemo(() => {
        if (!selectedAsset) return [];
        return marketDividends.filter(d => d.ticker === selectedAsset.ticker);
    }, [selectedAsset, marketDividends]);

    const propertyMapData = useMemo(() => {
        if (!selectedAsset?.properties) return [];
        const stateMap: Record<string, number> = {};
        selectedAsset.properties.forEach(p => {
            if (p.location) {
                // Tenta extrair UF (ex: "São Paulo - SP" -> "SP")
                const uf = p.location.length === 2 ? p.location : p.location.split('-').pop()?.trim() || '';
                if (uf.length === 2) {
                    stateMap[uf] = (stateMap[uf] || 0) + 1;
                }
            }
        });
        return Object.entries(stateMap).map(([name, value]) => ({ name, value }));
    }, [selectedAsset]);

    return (
        <div className="pb-24">
            <div className={`sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-primary-light dark:bg-primary-dark -mx-4 px-4 pt-2 pb-3 border-b border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex gap-2 mb-2">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar ativo..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value.toUpperCase())}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 pl-10 pr-4 py-2 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500/20" 
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
                        <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Tudo</button>
                        <button onClick={() => setFilterType('FII')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === 'FII' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>FIIs</button>
                        <button onClick={() => setFilterType('STOCK')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === 'STOCK' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Ações</button>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                {filteredPortfolio.length === 0 ? (
                    <div className="py-20 text-center opacity-50">
                        <p className="text-sm font-bold text-zinc-500">Nenhum ativo encontrado.</p>
                    </div>
                ) : (
                    filteredPortfolio.map(asset => (
                        <div key={asset.ticker} onClick={() => setSelectedAsset(asset)} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-transform press-effect relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                        {asset.logoUrl ? (
                                            <img src={asset.logoUrl} alt={asset.ticker} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        ) : (
                                            <span className="text-xs font-black text-zinc-400">{asset.ticker.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-base text-zinc-900 dark:text-white leading-none">{asset.ticker}</h3>
                                            {(asset.profitability_real_month !== undefined && asset.profitability_real_month > 0.5) && (
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-medium text-zinc-500 mt-1">{asset.segment}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-base text-zinc-900 dark:text-white tracking-tight">{formatBRL(asset.quantity * (asset.currentPrice || asset.averagePrice), privacyMode)}</p>
                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                        <span className="text-[10px] text-zinc-400">{asset.quantity} un</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-50 dark:border-zinc-800/50">
                                <div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-0.5">Preço</span>
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(asset.currentPrice)}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-0.5">PM</span>
                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatBRL(asset.averagePrice)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-0.5">Var. Dia</span>
                                    <div className={`flex items-center justify-end gap-1 ${asset.dailyChange && asset.dailyChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {asset.dailyChange && asset.dailyChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        <span className="text-xs font-black">{formatPercent(Math.abs(asset.dailyChange || 0)).replace('%', '')}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <SwipeableModal isOpen={!!selectedAsset} onClose={handleCloseModal}>
                {selectedAsset && (
                    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
                        <div className="px-5 pt-2 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900 z-10 sticky top-0">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                        {selectedAsset.logoUrl ? (
                                            <img src={selectedAsset.logoUrl} alt={selectedAsset.ticker} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg font-black text-zinc-400">{selectedAsset.ticker.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">{selectedAsset.ticker}</h2>
                                        <p className="text-xs font-medium text-zinc-500 mt-1">{selectedAsset.company_name || selectedAsset.segment}</p>
                                    </div>
                                </div>
                                <button onClick={() => onAssetRefresh(selectedAsset.ticker)} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors">
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <div>
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Saldo Atual</p>
                                    <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(selectedAsset.quantity * (selectedAsset.currentPrice || 0), privacyMode)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Rentabilidade</p>
                                    <div className={`text-sm font-black flex items-center justify-end gap-1 ${(selectedAsset.currentPrice || 0) >= selectedAsset.averagePrice ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {((selectedAsset.currentPrice || 0) / selectedAsset.averagePrice - 1) * 100 > 0 ? '+' : ''}
                                        {formatPercent(((selectedAsset.currentPrice || 0) / selectedAsset.averagePrice - 1) * 100)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 pb-20 no-scrollbar space-y-6">
                            
                            {/* Analysis Section (Income, Charts) */}
                            <IncomeAnalysisSection 
                                asset={selectedAsset} 
                                chartData={selectedAssetChartData} 
                                marketHistory={selectedAssetMarketHistory} 
                            />

                            {/* Propriedades (Map) */}
                            {selectedAsset.assetType === AssetType.FII && selectedAsset.properties && selectedAsset.properties.length > 0 && (
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-indigo-500" />
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Portfólio Imobiliário ({selectedAsset.properties.length})</h4>
                                    </div>
                                    <div className="h-[280px] w-full bg-zinc-50/50 dark:bg-zinc-800/30">
                                        <BrazilMap data={propertyMapData} totalProperties={selectedAsset.properties.length} />
                                    </div>
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                                        <p className="text-[10px] font-medium text-zinc-400 leading-relaxed text-center">
                                            Distribuição geográfica dos imóveis do fundo baseada nos relatórios gerenciais mais recentes.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Indicadores Fundamentais */}
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                                    <PieChart className="w-4 h-4 text-sky-500" />
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fundamentos</h4>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase">P/VP</p>
                                            <p className={`text-lg font-black ${selectedAsset.p_vp && selectedAsset.p_vp < 1 ? 'text-emerald-500' : 'text-zinc-900 dark:text-white'}`}>{formatNumber(selectedAsset.p_vp)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase">DY (12m)</p>
                                            <p className="text-lg font-black text-zinc-900 dark:text-white">{formatPercent(selectedAsset.dy_12m)}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {selectedAsset.assetType === AssetType.FII ? (
                                            <>
                                                <div>
                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Vacância</p>
                                                    <p className={`text-lg font-black ${selectedAsset.vacancy && selectedAsset.vacancy > 10 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>{formatPercent(selectedAsset.vacancy)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">Valor Patrimonial</p>
                                                    <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(selectedAsset.vpa)}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">P/L</p>
                                                    <p className="text-lg font-black text-zinc-900 dark:text-white">{formatNumber(selectedAsset.p_l)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-zinc-400 uppercase">ROE</p>
                                                    <p className="text-lg font-black text-zinc-900 dark:text-white">{formatPercent(selectedAsset.roe)}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Informações Extras */}
                            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                                <div className="flex items-start gap-3">
                                    <InfoTooltip title="Disclaimer" text="Dados fornecidos por fontes públicas. Podem haver atrasos ou inconsistências. Verifique sempre no RI oficial." />
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        Última atualização: {selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleString() : 'N/A'}. 
                                        <br/>
                                        Fonte: Integração B3/Investidor10.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SwipeableModal>
        </div>
    );
};