
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Building2, TrendingUp, TrendingDown, DollarSign, Percent, X, ExternalLink, Activity, BarChart3, Clock, ArrowRight, Zap, Target, BookOpen, Scale } from 'lucide-react';
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

// Barra Visual de Preço (Termômetro)
const ValuationGauge = ({ value, type }: { value: number, type: 'pvp' | 'pl' }) => {
    // Lógica: 
    // P/VP: < 1.0 (Verde/Barato), 1.0 (Cinza/Justo), > 1.0 (Vermelho/Caro)
    // P/L: Apenas visualização de escala
    
    let position = 50; // 0 a 100%
    let color = 'bg-zinc-400';
    let status = 'Neutro';

    if (type === 'pvp') {
        // Mapeia 0.5 -> 0%, 1.0 -> 50%, 1.5 -> 100%
        position = Math.min(Math.max(((value - 0.5) / 1) * 100, 0), 100);
        if (value < 0.98) { color = 'bg-emerald-500'; status = 'Descontado'; }
        else if (value > 1.05) { color = 'bg-rose-500'; status = 'Ágio'; }
        else { color = 'bg-amber-500'; status = 'Preço Justo'; }
    } else {
        // P/L simplificado (0 a 30)
        position = Math.min(Math.max((value / 30) * 100, 0), 100);
        color = 'bg-sky-500';
        status = 'Múltiplo';
    }

    return (
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{type === 'pvp' ? 'P/VP (Preço/Valor)' : 'P/L (Preço/Lucro)'}</span>
                <div className="text-right">
                    <span className={`text-xs font-black uppercase tracking-wider ${type === 'pvp' && value < 1 ? 'text-emerald-600' : 'text-zinc-400'}`}>{status}</span>
                </div>
            </div>
            
            <div className="relative h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full mb-1">
                {/* Marcadores */}
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/20 z-10"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-zinc-400/30 z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/20 z-10"></div>

                {/* Ponteiro */}
                <div 
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm transition-all duration-1000 ease-out ${color}`}
                    style={{ left: `calc(${position}% - 8px)` }}
                ></div>
            </div>
            
            <div className="flex justify-between text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5 px-0.5">
                <span>Barato</span>
                <span className="text-zinc-300 dark:text-zinc-600">{value.toFixed(2)}x</span>
                <span>Caro</span>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, subtext, accent = 'zinc' }: any) => {
    const colors: any = {
        zinc: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400',
        emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400',
        sky: 'text-sky-600 bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400',
        amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400',
        indigo: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400',
    };

    return (
        <div className="flex flex-col p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors[accent]}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{value}</span>
            {subtext && <span className="text-[9px] font-medium text-zinc-400 mt-0.5">{subtext}</span>}
        </div>
    );
};

// --- DETALHES DO ATIVO (MODAL) ---

const MarketAssetDetail = ({ asset, onClose }: { asset: MarketAsset, onClose: () => void }) => {
    const [tab, setTab] = useState<'VISAO' | 'INDICADORES'>('VISAO');
    
    const isFii = asset.ticker.endsWith('11') || asset.ticker.endsWith('11B');
    const typeLabel = isFii ? 'Fundo Imobiliário' : 'Ação';
    const url = `https://investidor10.com.br/${isFii ? 'fiis' : 'acoes'}/${asset.ticker.toLowerCase()}/`;

    // Tags Automáticas
    const tags = [];
    if (asset.dy_12m && asset.dy_12m > 12) tags.push({ label: 'High Yield', bg: 'bg-emerald-500' });
    if (isFii && asset.p_vp && asset.p_vp < 0.90) tags.push({ label: 'Descontado', bg: 'bg-indigo-500' });
    if (asset.variation_percent && Math.abs(asset.variation_percent) > 3) tags.push({ label: 'Alta Volatilidade', bg: 'bg-amber-500' });

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-full flex flex-col">
            {/* Header Sticky */}
            <div className="sticky top-0 z-20 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md pt-6 px-6 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border shadow-lg ${isFii ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                            {asset.ticker.substring(0, 2)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{asset.ticker}</h2>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{typeLabel}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Abas de Navegação */}
                <div className="flex p-1 bg-zinc-200 dark:bg-zinc-900 rounded-xl mb-2">
                    <button onClick={() => setTab('VISAO')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'VISAO' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        Visão Geral
                    </button>
                    <button onClick={() => setTab('INDICADORES')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'INDICADORES' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                        Indicadores
                    </button>
                </div>
            </div>

            <div className="p-6 pb-20 space-y-6 overflow-y-auto">
                {tab === 'VISAO' && (
                    <div className="space-y-6 anim-fade-in">
                        {/* Preço Hero */}
                        <div className="text-center py-4">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cotação Atual</span>
                            <div className="flex items-center justify-center gap-3 mt-1">
                                <h3 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                    R$ {asset.price.toFixed(2)}
                                </h3>
                            </div>
                            {asset.variation_percent !== undefined && (
                                <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-black ${asset.variation_percent >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                    {asset.variation_percent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    {asset.variation_percent > 0 ? '+' : ''}{asset.variation_percent.toFixed(2)}%
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex justify-center gap-2 flex-wrap">
                                {tags.map((t, i) => (
                                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300 shadow-sm">
                                        <span className={`w-2 h-2 rounded-full ${t.bg}`}></span>
                                        {t.label}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Valuation Gauge */}
                        {asset.p_vp && asset.p_vp > 0 && <ValuationGauge value={asset.p_vp} type="pvp" />}
                        {asset.p_l && asset.p_l > 0 && <ValuationGauge value={asset.p_l} type="pl" />}

                        {/* Stats Principais */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard 
                                icon={DollarSign} 
                                label="Dividend Yield" 
                                value={asset.dy_12m ? `${asset.dy_12m.toFixed(2)}%` : '-'} 
                                subtext="Últimos 12 meses"
                                accent="emerald"
                            />
                            <StatCard 
                                icon={isFii ? Activity : Scale} 
                                label={isFii ? 'P/VP' : 'P/L'} 
                                value={isFii ? asset.p_vp?.toFixed(2) : asset.p_l?.toFixed(1)} 
                                subtext={isFii ? 'Valor Patrimonial' : 'Preço / Lucro'}
                                accent="indigo"
                            />
                        </div>
                    </div>
                )}

                {tab === 'INDICADORES' && (
                    <div className="space-y-6 anim-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                            {asset.dy_12m !== undefined && (
                                <div className="col-span-2">
                                    <StatCard icon={DollarSign} label="Yield 12m" value={`${asset.dy_12m.toFixed(2)}%`} subtext="Retorno em dividendos" accent="emerald" />
                                </div>
                            )}
                            
                            {asset.p_vp !== undefined && <StatCard icon={Activity} label="P/VP" value={asset.p_vp.toFixed(2)} accent="zinc" />}
                            {asset.p_l !== undefined && <StatCard icon={BarChart3} label="P/L" value={asset.p_l.toFixed(2)} accent="zinc" />}
                            
                            {/* Campos placeholder para layout rico (dados reais viriam da API expandida) */}
                            <StatCard icon={BookOpen} label="Liquidez" value="Média" subtext="Vol. Diário" accent="sky" />
                            <StatCard icon={Target} label="Variação 12m" value="+15.4%" subtext="Estimado" accent="amber" />
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">Para análise profunda e dados históricos completos:</p>
                            <a href={url} target="_blank" rel="noreferrer" className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase tracking-[0.15em] shadow-lg flex items-center justify-center gap-2 press-effect">
                                Ver no Investidor10 <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LISTAGEM ---

const AssetRow = ({ item, type, onClick }: any) => {
    const isUp = type === 'up';
    const isDown = type === 'down';
    
    return (
        <button 
            onClick={() => onClick(item)} 
            className="w-full flex items-center justify-between p-3.5 mb-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all press-effect group"
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border ${isUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : isDown ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                    {item.ticker.substring(0, 2)}
                </div>
                <div className="text-left">
                    <span className="text-xs font-black text-zinc-900 dark:text-white block">{item.ticker}</span>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block truncate max-w-[100px]">{item.name.split(' ')[0]}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">R$ {item.price.toFixed(2)}</span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                    {item.variation_percent && (
                        <span className={`text-[9px] font-black ${item.variation_percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.variation_percent > 0 ? '+' : ''}{item.variation_percent.toFixed(2)}%
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
                    <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                    <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
                </div>
            ) : currentData ? (
                <div className="space-y-6 px-1">
                    
                    {/* Bloco 1: Destaques */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-500" /> Altas
                            </h3>
                            {currentData.gainers.slice(0, 3).map((item, i) => (
                                <AssetRow key={i} item={item} type="up" onClick={setSelectedAsset} />
                            ))}
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                                <TrendingDown className="w-3 h-3 text-rose-500" /> Baixas
                            </h3>
                            {currentData.losers.slice(0, 3).map((item, i) => (
                                <AssetRow key={i} item={item} type="down" onClick={setSelectedAsset} />
                            ))}
                        </div>
                    </div>

                    {/* Bloco 2: Oportunidades (Lista Corrida) */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-indigo-500" /> 
                                {activeTab === 'fiis' ? 'Descontados (P/VP)' : 'Descontados (P/L)'}
                            </h3>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-3xl">
                            {currentData.discounted.map((item, i) => (
                                <AssetRow key={i} item={item} type="neutral" onClick={setSelectedAsset} />
                            ))}
                        </div>
                    </div>

                    {/* Bloco 3: High Yield */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-2">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <DollarSign className="w-3 h-3 text-amber-500" /> Top Dividendos
                            </h3>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-3xl">
                            {currentData.high_yield.map((item, i) => (
                                <AssetRow key={i} item={item} type="neutral" onClick={setSelectedAsset} />
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
