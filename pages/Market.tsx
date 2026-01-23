
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Building2, TrendingUp, TrendingDown, DollarSign, Percent, X, ExternalLink, Activity, BarChart3, Clock, ArrowRight, Zap, Target, BookOpen, Scale, Info } from 'lucide-react';
import { fetchMarketOverview } from '../services/dataService';
import { SwipeableModal } from '../components/Layout';

// --- TYPES ---
interface MarketAsset {
    ticker: string;
    name: string;
    price: number;
    variation_percent?: number;
    dy_12m?: number;
    p_vp?: number;
    p_l?: number;
}

interface MarketCategoryData {
    gainers: MarketAsset[];
    losers: MarketAsset[];
    high_yield: MarketAsset[];
    discounted: MarketAsset[];
}

interface NewMarketOverview {
    market_status: string;
    last_update: string;
    highlights: {
        fiis: MarketCategoryData;
        stocks: MarketCategoryData;
    };
    error?: boolean;
}

// --- SUB-COMPONENTS ---

const MetricBadge = ({ label, value, color = "zinc" }: { label: string, value: string, color?: string }) => {
    const colors: any = {
        zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
        emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
        rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
        indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
    };

    return (
        <div className={`flex flex-col items-center justify-center p-2.5 rounded-2xl ${colors[color] || colors.zinc}`}>
            <span className="text-[9px] font-black uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
            <span className="text-sm font-black tracking-tight">{value}</span>
        </div>
    );
};

const ValuationGauge = ({ value, type }: { value: number, type: 'pvp' | 'pl' }) => {
    let position = 50; 
    let status = 'Neutro';
    let statusColor = 'text-zinc-500';

    if (type === 'pvp') {
        // Escala Logarítmica Suave: 0.5 a 1.5
        // 1.0 = 50%
        if (value <= 0.5) position = 0;
        else if (value >= 1.5) position = 100;
        else position = ((value - 0.5) / 1.0) * 100;

        if (value < 0.90) { status = 'Descontado'; statusColor = 'text-emerald-500'; }
        else if (value > 1.10) { status = 'Ágio'; statusColor = 'text-rose-500'; }
        else { status = 'Preço Justo'; statusColor = 'text-amber-500'; }
    } else {
        // P/L: 0 a 20
        position = Math.min(Math.max((value / 25) * 100, 0), 100);
        status = 'Múltiplo';
        statusColor = 'text-sky-500';
    }

    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        {type === 'pvp' ? <Activity className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                        {type === 'pvp' ? 'P/VP' : 'P/L'}
                    </span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mt-1">{value.toFixed(2)}x</span>
                </div>
                <div className={`px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700`}>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${statusColor}`}>{status}</span>
                </div>
            </div>

            <div className="relative h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full mb-1">
                {/* Gradiente de Fundo */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-zinc-300 dark:via-zinc-600 to-rose-400 opacity-30"></div>
                
                {/* Marcador Central (Justo) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 z-10"></div>

                {/* Ponteiro */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white dark:bg-zinc-700 border-[3px] border-zinc-900 dark:border-white rounded-full shadow-lg transition-all duration-1000 ease-out z-20"
                    style={{ left: `calc(${position}% - 10px)` }}
                ></div>
            </div>
            
            <div className="flex justify-between text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest px-1 mt-2">
                <span>Barato</span>
                <span>Caro</span>
            </div>
        </div>
    );
};

const StatRow = ({ icon: Icon, label, value, subtext }: any) => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{label}</span>
                {subtext && <span className="text-[9px] font-medium text-zinc-400">{subtext}</span>}
            </div>
        </div>
        <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
);

// --- MODAL DETALHADO ---

const MarketAssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const [tab, setTab] = useState<'VISAO' | 'INDICADORES'>('VISAO');
    
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const typeLabel = isFii ? 'Fundo Imobiliário' : 'Ação';
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header Sticky Minimalista */}
            <div className="sticky top-0 z-20 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{asset.ticker}</h2>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{asset.name.split(' ')[0]}</span>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Abas Estilo iOS */}
            <div className="px-6 pt-4 pb-2">
                <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-900 rounded-xl">
                    <button onClick={() => setTab('VISAO')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'VISAO' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm scale-[1.02]' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        Panorama
                    </button>
                    <button onClick={() => setTab('INDICADORES')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'INDICADORES' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm scale-[1.02]' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        Detalhes
                    </button>
                </div>
            </div>

            <div className="p-6 pb-24 space-y-6 overflow-y-auto">
                {tab === 'VISAO' && (
                    <div className="space-y-6 anim-fade-in">
                        {/* Big Price Card */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 text-center shadow-sm relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cotação Atual</span>
                                <h3 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mt-1 mb-3">
                                    <span className="text-2xl align-top opacity-50 mr-1">R$</span>
                                    {asset.price.toFixed(2)}
                                </h3>
                                {asset.variation_percent !== undefined && (
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${asset.variation_percent >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                        {asset.variation_percent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                        {asset.variation_percent > 0 ? '+' : ''}{asset.variation_percent.toFixed(2)}%
                                    </div>
                                )}
                            </div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-zinc-50 dark:bg-zinc-800 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex flex-col justify-between h-28">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Dividend Yield</span>
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300 tracking-tight">{asset.dy_12m ? asset.dy_12m.toFixed(2) : '-'}%</span>
                                    <p className="text-[9px] text-emerald-600 dark:text-emerald-500/70 mt-0.5">Últimos 12 meses</p>
                                </div>
                            </div>
                            
                            {isFii && asset.p_vp && (
                                <ValuationGauge value={asset.p_vp} type="pvp" />
                            )}
                            {!isFii && asset.p_l && (
                                <ValuationGauge value={asset.p_l} type="pl" />
                            )}
                        </div>
                    </div>
                )}

                {tab === 'INDICADORES' && (
                    <div className="space-y-6 anim-fade-in">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <StatRow icon={DollarSign} label="Dividend Yield (12m)" value={`${asset.dy_12m?.toFixed(2)}%`} subtext="Retorno anual" />
                            {asset.p_vp !== undefined && <StatRow icon={Activity} label="P/VP" value={asset.p_vp.toFixed(2)} subtext="Preço / Valor Patrimonial" />}
                            {asset.p_l !== undefined && <StatRow icon={Scale} label="P/L" value={asset.p_l.toFixed(2)} subtext="Preço / Lucro" />}
                            <StatRow icon={BookOpen} label="Liquidez" value="Média" subtext="Volume Diário" />
                            <StatRow icon={Target} label="Variação" value={asset.variation_percent ? `${asset.variation_percent.toFixed(2)}%` : '-'} subtext="Último Pregão" />
                        </div>

                        <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-4 px-8 leading-relaxed">
                                Acesse dados históricos completos e análise fundamentalista detalhada.
                            </p>
                            <a href={url} target="_blank" rel="noreferrer" className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 press-effect hover:shadow-xl transition-all">
                                Ver no Investidor10 <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LISTA DE ATIVOS ---

const AssetCard = ({ item, type, onClick }: any) => {
    const isUp = type === 'up';
    const isDown = type === 'down';
    
    return (
        <button 
            onClick={() => onClick(item)} 
            className="w-full bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm press-effect group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
            <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border transition-colors ${isUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30' : isDown ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30' : 'bg-zinc-50 text-zinc-500 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                    {item.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <span className="text-xs font-black text-zinc-900 dark:text-white block tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.ticker}</span>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block truncate max-w-[100px]">{item.name.split(' ')[0]}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-sm font-black text-zinc-900 dark:text-white block">R$ {item.price.toFixed(2)}</span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                    {item.variation_percent !== undefined && (
                        <span className={`text-[9px] font-black flex items-center gap-0.5 ${item.variation_percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.variation_percent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {Math.abs(item.variation_percent).toFixed(2)}%
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

export const Market: React.FC = () => {
    const [data, setData] = useState<NewMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fiis' | 'stocks'>('fiis');
    const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchMarketOverview();
            // @ts-ignore
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const currentData = data?.highlights?.[activeTab];

    return (
        <div className="pb-32 min-h-screen">
            {/* Header Sticky */}
            <div className="sticky top-20 z-30 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all -mx-4 px-4 py-3 mb-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">
                            Mercado
                        </h2>
                        {data && (
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {data.market_status} • {new Date(data.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        )}
                    </div>
                    <button onClick={loadData} disabled={loading} className={`w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-95'}`}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl relative">
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-all duration-300 ease-out-mola bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5`} style={{ left: '4px', transform: `translateX(${activeTab === 'fiis' ? '0%' : '100%'})` }}></div>
                    <button onClick={() => setActiveTab('fiis')} className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'fiis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                        <Building2 className="w-3.5 h-3.5" /> FIIs
                    </button>
                    <button onClick={() => setActiveTab('stocks')} className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'stocks' ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'}`}>
                        <TrendingUp className="w-3.5 h-3.5" /> Ações
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="space-y-4 animate-pulse px-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                    </div>
                    <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                </div>
            ) : currentData ? (
                <div className="space-y-8 px-1">
                    
                    {/* Seção 1: Destaques (Grid Compacto) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-500" /> Altas
                            </h3>
                            {currentData.gainers.slice(0, 3).map((item, i) => (
                                <AssetCard key={i} item={item} type="up" onClick={setSelectedAsset} />
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                <TrendingDown className="w-3 h-3 text-rose-500" /> Baixas
                            </h3>
                            {currentData.losers.slice(0, 3).map((item, i) => (
                                <AssetCard key={i} item={item} type="down" onClick={setSelectedAsset} />
                            ))}
                        </div>
                    </div>

                    {/* Seção 2: Oportunidades */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-indigo-500" /> 
                                {activeTab === 'fiis' ? 'Descontados (P/VP)' : 'Descontados (P/L)'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {currentData.discounted.map((item, i) => (
                                <AssetCard key={i} item={item} type="neutral" onClick={setSelectedAsset} />
                            ))}
                        </div>
                    </div>

                    {/* Seção 3: Dividendos */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <DollarSign className="w-3 h-3 text-amber-500" /> Top Dividendos
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {currentData.high_yield.map((item, i) => (
                                <AssetCard key={i} item={item} type="neutral" onClick={setSelectedAsset} />
                            ))}
                        </div>
                    </div>

                </div>
            ) : null}

            <SwipeableModal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)}>
                {selectedAsset && <MarketAssetDetail asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            </SwipeableModal>
        </div>
    );
};
