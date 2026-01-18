
import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Sparkles, ArrowRight, Loader2, Target, BarChart3, Percent, Globe, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchMarketOverview } from '../services/geminiService';
import { MarketOverview, MarketAsset } from '../types';

const AssetCard: React.FC<{ asset: MarketAsset }> = ({ asset }) => {
    const isGain = asset.type === 'gain';
    const isLoss = asset.type === 'loss';
    
    // Cor do valor de variação
    let changeColor = "text-zinc-500";
    if (isGain) changeColor = "text-emerald-500";
    if (isLoss) changeColor = "text-rose-500";
    if (asset.type === 'opportunity') changeColor = "text-indigo-500";

    return (
        <div className="flex-shrink-0 w-40 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm snap-start flex flex-col justify-between h-36 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-10 transition-all group-hover:opacity-20 ${
                isGain ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-indigo-500'
            }`}></div>

            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        asset.assetType === 'FII' 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800' 
                        : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-800'
                    }`}>
                        {asset.assetType}
                    </span>
                </div>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-tight">
                    {asset.description || asset.name}
                </p>
            </div>

            <div>
                 <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                     {asset.price > 0 ? asset.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                 </p>
                 <div className={`flex items-center gap-1 text-[10px] font-bold ${changeColor}`}>
                     {isGain ? <TrendingUp className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                     {asset.change !== 0 ? `${asset.change > 0 ? '+' : ''}${asset.change}%` : 'Oportunidade'}
                 </div>
            </div>
        </div>
    );
};

const SectionHeader = ({ title, icon: Icon, colorClass }: any) => (
    <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">{title}</h3>
    </div>
);

export const Market: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState<MarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const loadMarketData = async (force = false) => {
        setLoading(true);
        setHasError(false);
        try {
            // Cache check
            if (!force) {
                const cached = localStorage.getItem('investfiis_market_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // 10 minutos de cache
                    if (Date.now() - parsed.lastUpdate < 1000 * 60 * 10) {
                        setData(parsed);
                        setLoading(false);
                        return;
                    }
                }
            }

            const newData = await fetchMarketOverview();
            
            // Verifica se veio com flag de erro ou vazio
            if ((newData as any).error || (newData.gainers.length === 0 && newData.opportunities.length === 0)) {
                setHasError(true);
                setData(null);
            } else {
                setData(newData);
                localStorage.setItem('investfiis_market_cache', JSON.stringify(newData));
            }
        } catch (e) {
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMarketData();
    }, []);

    const hasData = data && (data.gainers.length > 0 || data.opportunities.length > 0);

    return (
        <div className="pb-32 min-h-screen">
            {/* Search Header */}
            <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
                 <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar na B3..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-accent/10 transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => window.open(`https://www.google.com/search?q=ação+${searchTerm}+fundamentos`, '_blank')}
                            className="absolute right-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                            Ir
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400 anim-fade-in">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-accent" />
                    <p className="text-xs font-bold uppercase tracking-widest">Analisando Mercado...</p>
                    <p className="text-[10px] mt-2 opacity-50">Gemini 3 Flash • Buscando dados recentes</p>
                </div>
            ) : hasError || !hasData ? (
                <div className="flex flex-col items-center justify-center py-20 text-center anim-fade-in px-6">
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500 mb-4 border border-rose-100 dark:border-rose-900/30">
                        <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Dados Indisponíveis</h3>
                    <p className="text-xs text-zinc-500 mb-6 max-w-xs">Não foi possível conectar com a IA de mercado no momento. Tente novamente.</p>
                    <button 
                        onClick={() => loadMarketData(true)}
                        className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 press-effect shadow-lg"
                    >
                        <RefreshCw className="w-3 h-3" /> Tentar Novamente
                    </button>
                </div>
            ) : (
                <div className="space-y-8 pt-6">
                    
                    {/* Maiores Altas */}
                    {data && data.gainers.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '0ms' }}>
                            <SectionHeader title="Maiores Altas Hoje" icon={TrendingUp} colorClass="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.gainers.map((asset, i) => <AssetCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Oportunidades (P/VP Baixo) */}
                    {data && data.opportunities.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                            <SectionHeader title="FIIs Descontados" icon={Target} colorClass="bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.opportunities.map((asset, i) => <AssetCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Maiores Baixas */}
                    {data && data.losers.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '200ms' }}>
                            <SectionHeader title="Maiores Baixas Hoje" icon={TrendingDown} colorClass="bg-rose-100 dark:bg-rose-900/20 text-rose-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.losers.map((asset, i) => <AssetCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 px-4 py-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center anim-fade-in">
                        <Globe className="w-6 h-6 text-zinc-400 mx-auto mb-3" />
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-1">Dados de Mercado</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                            As informações são geradas por IA (Gemini 3) com base em buscas recentes na internet. Podem haver atrasos ou imprecisões.
                        </p>
                        <button onClick={() => loadMarketData(true)} className="mt-4 text-[10px] font-bold text-accent uppercase tracking-wider hover:underline">
                            Atualizar Agora
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
