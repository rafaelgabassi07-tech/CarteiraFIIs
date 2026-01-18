
import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, ExternalLink, Loader2, Target, RefreshCw, AlertTriangle, Globe } from 'lucide-react';
import { fetchMarketOverview } from '../services/geminiService';
import { MarketOverview, MarketAsset } from '../types';

// Interface estendida localmente para incluir fontes
interface ExtendedMarketOverview extends MarketOverview {
    sources?: { title: string; uri: string }[];
    error?: boolean;
    message?: string;
}

const AssetCard: React.FC<{ asset: MarketAsset }> = ({ asset }) => {
    const isGain = asset.type === 'gain';
    const isLoss = asset.type === 'loss';
    
    let changeColor = "text-zinc-500";
    let bgColor = "bg-white dark:bg-zinc-900";
    let borderColor = "border-zinc-200 dark:border-zinc-800";

    if (isGain) {
        changeColor = "text-emerald-500";
        borderColor = "border-emerald-100 dark:border-emerald-900/30";
    }
    if (isLoss) {
        changeColor = "text-rose-500";
        borderColor = "border-rose-100 dark:border-rose-900/30";
    }
    if (asset.type === 'opportunity') {
        changeColor = "text-indigo-500";
        borderColor = "border-indigo-100 dark:border-indigo-900/30";
    }

    return (
        <div className={`flex-shrink-0 w-44 p-4 rounded-2xl border shadow-sm snap-start flex flex-col justify-between h-40 relative overflow-hidden group ${bgColor} ${borderColor}`}>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-base font-black text-zinc-900 dark:text-white">{asset.ticker}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        asset.assetType === 'FII' 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800' 
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                    }`}>
                        {asset.assetType}
                    </span>
                </div>
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">
                    {asset.description || asset.name}
                </p>
            </div>

            <div className="relative z-10 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                 <div className="flex justify-between items-end">
                     <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">Preço</p>
                        <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                            {asset.price > 0 ? asset.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                        </p>
                     </div>
                     <div className={`flex items-center gap-0.5 text-xs font-black ${changeColor} bg-zinc-50 dark:bg-zinc-800 px-1.5 py-1 rounded-lg`}>
                         {isGain ? <TrendingUp className="w-3 h-3" /> : isLoss ? <TrendingDown className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                         {asset.change !== 0 ? `${asset.change > 0 ? '+' : ''}${asset.change}%` : 'TOP'}
                     </div>
                 </div>
            </div>
        </div>
    );
};

const SectionHeader = ({ title, icon: Icon, colorClass }: any) => (
    <div className="flex items-center gap-2 mb-3 px-1 mt-6 first:mt-0">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">{title}</h3>
    </div>
);

export const Market: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState<ExtendedMarketOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const loadMarketData = async (force = false) => {
        setLoading(true);
        setHasError(false);
        try {
            if (!force) {
                const cached = localStorage.getItem('investfiis_market_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Cache de 15 minutos para evitar chamadas excessivas ao Gemini
                    if (Date.now() - parsed.lastUpdate < 1000 * 60 * 15) {
                        setData(parsed);
                        setLoading(false);
                        return;
                    }
                }
            }

            const newData = await fetchMarketOverview() as ExtendedMarketOverview;
            
            if (newData.error || (!newData.gainers?.length && !newData.opportunities?.length)) {
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
                        placeholder="Pesquisar ativos, notícias..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-accent/10 transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => window.open(`https://www.google.com/search?q=ação+${searchTerm}+fundamentos`, '_blank')}
                            className="absolute right-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                            Google
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-zinc-400 anim-fade-in">
                    <div className="relative mb-6">
                         <div className="w-12 h-12 rounded-full border-4 border-zinc-100 dark:border-zinc-800 border-t-accent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                             <Globe className="w-4 h-4 text-zinc-300" />
                         </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Consultando Fontes...</p>
                    <p className="text-[10px] mt-2 opacity-50 max-w-[200px] text-center">Gemini 3 analisando dados recentes do Google Search</p>
                </div>
            ) : hasError || !hasData ? (
                <div className="flex flex-col items-center justify-center py-20 text-center anim-fade-in px-6 mt-10">
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500 mb-6 border border-rose-100 dark:border-rose-900/30">
                        <AlertTriangle className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Mercado Indisponível</h3>
                    <p className="text-sm text-zinc-500 mb-8 max-w-xs leading-relaxed">
                        Não conseguimos processar os dados do mercado agora. Isso pode ser uma instabilidade temporária na IA.
                    </p>
                    <button 
                        onClick={() => loadMarketData(true)}
                        className="px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 press-effect shadow-xl"
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar Novamente
                    </button>
                </div>
            ) : (
                <div className="space-y-6 pt-6 anim-fade-in">
                    
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mercado Aberto</span>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-400">
                             Atualizado: {new Date(data!.lastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Maiores Altas */}
                    {data && data.gainers.length > 0 && (
                        <div className="anim-slide-up" style={{ animationDelay: '0ms' }}>
                            <SectionHeader title="Destaques de Alta" icon={TrendingUp} colorClass="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.gainers.map((asset, i) => <AssetCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Oportunidades */}
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
                            <SectionHeader title="Maiores Baixas" icon={TrendingDown} colorClass="bg-rose-100 dark:bg-rose-900/20 text-rose-600" />
                            <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-4 -mx-1 snap-x">
                                {data.losers.map((asset, i) => <AssetCard key={i} asset={asset} />)}
                            </div>
                        </div>
                    )}

                    {/* Grounding Sources (Fontes) */}
                    {data?.sources && data.sources.length > 0 && (
                        <div className="mt-8 px-5 py-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-left anim-fade-in">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Fontes de Dados
                            </h3>
                            <div className="space-y-2">
                                {data.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="block text-[10px] font-medium text-zinc-500 hover:text-accent truncate transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                                        {source.title}
                                    </a>
                                ))}
                            </div>
                            <p className="text-[9px] text-zinc-400 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 leading-relaxed">
                                Gerado por IA (Gemini 3) com base em buscas recentes. Verifique sempre os dados em sua corretora antes de investir.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
