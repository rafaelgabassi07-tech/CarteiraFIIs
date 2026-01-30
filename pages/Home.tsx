
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, Transaction, PortfolioInsight } from '../types';
import { CircleDollarSign, PieChart as PieIcon, CalendarDays, Banknote, Wallet, Calendar, CalendarClock, Coins, ChevronDown, ChevronUp, Target, Gem, TrendingUp, ArrowUpRight, Activity, X, Filter, TrendingDown, Lightbulb, AlertTriangle, ShieldCheck, ShieldAlert, Flame, History, BarChart2, Layers, Landmark, Bot, Sparkles, Zap, MessageCircle, ScanEye, Radio } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, Sector, ComposedChart, Line, CartesianGrid, Area } from 'recharts';
import { analyzePortfolio } from '../services/analysisService';
import { fetchFutureAnnouncements, FutureDividendPrediction } from '../services/dataService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  isAiLoading?: boolean;
  inflationRate?: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  transactions?: Transaction[];
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (val: any, privacy = false) => {
  if (privacy) return '•••%';
  const num = typeof val === 'number' ? val : 0;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const formatDateShort = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
};

// --- WALKING BOT CHARACTER (Personagem Completo) ---
const WalkingBot = ({ isThinking, onInteract }: { isThinking: boolean, onInteract: () => void }) => {
    const [pos, setPos] = useState({ x: 50, y: 20 }); // % position
    const [direction, setDirection] = useState<'left' | 'right'>('right');
    const [isWalking, setIsWalking] = useState(false);
    const moveTimerRef = useRef<any>(null);

    // Estilos de animação injetados localmente para o personagem articulado
    const robotStyles = `
        @keyframes robotWalkBody { 
            0%, 100% { transform: translateY(0); } 
            50% { transform: translateY(-2px); } 
        }
        @keyframes limbSwingLeft { 
            0% { transform: rotate(20deg); } 
            100% { transform: rotate(-20deg); } 
        }
        @keyframes limbSwingRight { 
            0% { transform: rotate(-20deg); } 
            100% { transform: rotate(20deg); } 
        }
        .bot-walking .bot-body { animation: robotWalkBody 0.3s ease-in-out infinite; }
        .bot-walking .bot-arm-l, .bot-walking .bot-leg-r { animation: limbSwingRight 0.6s ease-in-out infinite alternate; }
        .bot-walking .bot-arm-r, .bot-walking .bot-leg-l { animation: limbSwingLeft 0.6s ease-in-out infinite alternate; }
        .bot-thinking .bot-head-light { animation: pulseRed 1s infinite; }
        @keyframes pulseRed { 0%, 100% { background-color: #ef4444; box-shadow: 0 0 5px #ef4444; } 50% { background-color: #fee2e2; box-shadow: 0 0 2px #ef4444; } }
        @keyframes pulseGreen { 0%, 100% { background-color: #10b981; box-shadow: 0 0 8px #10b981; } 50% { background-color: #d1fae5; box-shadow: 0 0 3px #10b981; } }
    `;

    const moveRandomly = () => {
        // Define novo destino dentro da área superior da lista
        const newX = 10 + Math.random() * 80; 
        const newY = 5 + Math.random() * 25;  

        setDirection(newX > pos.x ? 'right' : 'left');
        setIsWalking(true); 
        setPos({ x: newX, y: newY });

        // Para de andar quando "chegar" (tempo estimado da transição CSS)
        setTimeout(() => {
            setIsWalking(false);
        }, 2000); 
    };

    useEffect(() => {
        moveRandomly();
        const interval = setInterval(moveRandomly, 6000 + Math.random() * 4000);
        moveTimerRef.current = interval;
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <style>{robotStyles}</style>
            <div 
                className={`absolute z-30 transition-all duration-[2000ms] ease-in-out pointer-events-none ${isWalking ? 'bot-walking' : ''} ${isThinking ? 'bot-thinking' : ''}`}
                style={{ 
                    top: `${pos.y}%`, 
                    left: `${pos.x}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                <div 
                    className="relative pointer-events-auto cursor-pointer group scale-125" 
                    onClick={(e) => { e.stopPropagation(); onInteract(); }}
                >
                    {/* Character Container */}
                    <div className={`relative transition-transform duration-300 ${direction === 'left' ? '-scale-x-100' : 'scale-x-100'}`}>
                        
                        {/* Antena */}
                        <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 w-0.5 h-3 bg-zinc-400 dark:bg-zinc-500 origin-bottom animate-[limbSwingLeft_2s_infinite]"></div>
                        <div className={`absolute -top-[19px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bot-head-light ${isThinking ? 'bg-amber-400 shadow-[0_0_5px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_5px_#10b981] animate-[pulseGreen_2s_infinite]'}`}></div>

                        {/* Braço Esquerdo (Trás) */}
                        <div className="bot-arm-l absolute top-3 left-0 w-2 h-6 bg-zinc-400 dark:bg-zinc-600 rounded-full origin-top -rotate-12">
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-300 dark:bg-zinc-500 rounded-full"></div>
                        </div>

                        {/* Pernas */}
                        <div className="absolute top-[26px] left-[6px] w-2 h-5 bg-zinc-700 dark:bg-zinc-800 rounded-b-md origin-top bot-leg-l">
                             <div className="absolute bottom-0 w-3 h-1.5 bg-black dark:bg-zinc-900 -left-0.5 rounded-sm"></div>
                        </div>
                        <div className="absolute top-[26px] right-[6px] w-2 h-5 bg-zinc-700 dark:bg-zinc-800 rounded-b-md origin-top bot-leg-r">
                             <div className="absolute bottom-0 w-3 h-1.5 bg-black dark:bg-zinc-900 -left-0.5 rounded-sm"></div>
                        </div>

                        {/* Corpo */}
                        <div className="bot-body relative z-10 w-8 h-9 bg-gradient-to-b from-indigo-500 to-indigo-700 dark:from-indigo-600 dark:to-indigo-800 rounded-xl border border-indigo-400/50 shadow-sm flex items-center justify-center">
                            <div className="w-5 h-4 bg-black/20 rounded border border-white/10 flex items-center justify-center">
                                <Activity className={`w-3 h-3 text-emerald-400 ${isThinking ? 'animate-spin' : ''}`} />
                            </div>
                        </div>

                        {/* Cabeça */}
                        <div className="bot-body absolute -top-[13px] left-1/2 -translate-x-1/2 w-9 h-7 bg-zinc-100 dark:bg-zinc-200 rounded-lg border-2 border-zinc-300 dark:border-zinc-400 z-20 flex items-center justify-center overflow-hidden shadow-sm">
                            <div className="w-full h-3 bg-black/80 absolute top-1 flex justify-center items-center gap-1">
                                {isThinking ? (
                                    <div className="flex gap-0.5"><div className="w-1 h-1 bg-rose-500 rounded-full animate-bounce"></div><div className="w-1 h-1 bg-rose-500 rounded-full animate-bounce delay-75"></div></div>
                                ) : (
                                    <div className="flex gap-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_2px_cyan]"></div><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_2px_cyan]"></div></div>
                                )}
                            </div>
                        </div>

                        {/* Braço Direito (Frente) */}
                        <div className="bot-arm-r absolute top-3 right-0 w-2 h-6 bg-zinc-400 dark:bg-zinc-600 rounded-full origin-top rotate-12 z-20">
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-300 dark:bg-zinc-500 rounded-full"></div>
                        </div>

                        {/* Sombra */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black/20 rounded-full blur-[2px]"></div>
                    </div>
                </div>
            </div>
        </>
    );
};

const TimelineEvent: React.FC<{ event: any, isLast: boolean }> = ({ event, isLast }) => {
    const isPayment = event.eventType === 'payment';
    const isPrediction = event.isPrediction === true; // Flag para dados do robô
    
    const eventDate = new Date(event.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const isToday = eventDate.getTime() === today.getTime();

    // Estilo especial para previsões do Robô
    let iconBg, iconColor, Icon, borderColor;
    
    if (isPrediction) {
        iconBg = 'bg-purple-100 dark:bg-purple-900/20'; 
        iconColor = 'text-purple-600 dark:text-purple-400'; 
        Icon = Radio; 
        borderColor = 'border-purple-200 dark:border-purple-900/30';
    } else if (isPayment) { 
        iconBg = 'bg-emerald-100 dark:bg-emerald-900/20'; 
        iconColor = 'text-emerald-600 dark:text-emerald-400'; 
        Icon = Banknote; 
        borderColor = 'border-emerald-200 dark:border-emerald-900/30'; 
    } else { 
        iconBg = 'bg-amber-100 dark:bg-amber-900/20'; 
        iconColor = 'text-amber-600 dark:text-amber-400'; 
        Icon = CalendarClock; 
        borderColor = 'border-amber-200 dark:border-amber-900/30'; 
    }

    const tickerDisplay = event.ticker && typeof event.ticker === 'string' ? event.ticker.substring(0,2) : '??';
    
    return (
        <div className={`relative pl-12 py-2 ${isPrediction ? 'anim-fade-in' : ''}`}>
            {!isLast && <div className="absolute left-[19px] top-8 bottom-[-8px] w-[2px] bg-zinc-100 dark:bg-zinc-800"></div>}
            
            <div className={`absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 z-10 ${iconBg} ${iconColor} shadow-sm`}>
                <Icon className="w-5 h-5" />
            </div>
            
            <div className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border ${borderColor} shadow-sm flex justify-between items-center relative overflow-hidden group`}>
                {isToday && !isPrediction && <div className="absolute right-0 top-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg">HOJE</div>}
                {isPrediction && <div className="absolute right-0 top-0 bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><ScanEye className="w-3 h-3" /> RADAR</div>}
                
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 border border-zinc-100 dark:border-zinc-700">
                        {tickerDisplay}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-zinc-900 dark:text-white">{event.ticker}</h4>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isPrediction ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : isPayment ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {isPrediction ? 'Detectado' : isPayment ? 'Pagamento' : 'Data Com'}
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                            {event.type} • {formatDateShort(event.date)}
                        </p>
                    </div>
                </div>
                
                <div className="text-right">
                    {isPayment || isPrediction ? (
                        <>
                            <p className="text-sm font-black text-zinc-900 dark:text-white">
                                {event.totalReceived ? event.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : event.projectedTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <p className="text-[9px] text-zinc-400">
                                {isPrediction ? 'Estimado' : 'Total Previsto'}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Corte</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StoryViewer = ({ insights, startIndex, onClose, onMarkAsRead, onViewAsset }: { insights: PortfolioInsight[], startIndex: number, onClose: () => void, onMarkAsRead: (id: string) => void, onViewAsset?: (ticker: string) => void }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const DURATION = 6000;
    if (!insights || insights.length === 0 || currentIndex >= insights.length) return null;
    const currentStory = insights[currentIndex];
    useEffect(() => { setProgress(0); }, [currentIndex]);
    useEffect(() => {
        if (!isPaused) {
            const interval = 50; const step = (100 * interval) / DURATION;
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        if (currentIndex < insights.length - 1) { onMarkAsRead(currentStory.id); setCurrentIndex(c => c + 1); return 0; } else { onMarkAsRead(currentStory.id); onClose(); return 100; }
                    }
                    return prev + step;
                });
            }, interval);
            return () => clearInterval(timer);
        }
    }, [currentIndex, isPaused, insights.length, onClose, onMarkAsRead, currentStory]);
    const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); if (currentStory) onMarkAsRead(currentStory.id); if (currentIndex < insights.length - 1) setCurrentIndex(c => c + 1); else onClose(); };
    const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); if (currentIndex > 0) setCurrentIndex(c => c - 1); };
    if (!currentStory) return null;
    const getTypeIcon = (type: string) => { if(type === 'volatility_up') return TrendingUp; if(type === 'volatility_down') return TrendingDown; if(type === 'warning') return AlertTriangle; if(type === 'opportunity') return Target; if(type === 'success') return Coins; return Lightbulb; };
    const getTheme = (type: string) => { if(type === 'volatility_up' || type === 'success') return { bg: 'from-emerald-900 to-black', accent: 'bg-emerald-500' }; if(type === 'volatility_down') return { bg: 'from-rose-900 to-black', accent: 'bg-rose-500' }; if(type === 'warning') return { bg: 'from-amber-900 to-black', accent: 'bg-amber-500' }; return { bg: 'from-indigo-900 to-black', accent: 'bg-indigo-500' }; };
    const Icon = getTypeIcon(currentStory.type); const theme = getTheme(currentStory.type); const timeAgo = currentStory.timestamp ? formatDistanceToNow(currentStory.timestamp, { addSuffix: true, locale: ptBR }) : 'Agora';
    
    return createPortal(
        <div className={`fixed inset-0 z-[9999] bg-gradient-to-b ${theme.bg} flex flex-col anim-fade-in backdrop-blur-3xl`}>
            <div className="absolute inset-0 bg-black/40 z-0"></div>
            <div className="flex gap-1.5 p-3 pt-safe z-20">{insights.map((_, idx) => (<div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm"><div className="h-full bg-white transition-all duration-100 linear" style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }} /></div>))}</div>
            <div className="flex items-center justify-between px-4 py-2 z-20 text-white"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center ${theme.accent} shadow-lg`}><Icon className="w-5 h-5 text-white" /></div><div><span className="font-bold text-sm block">{currentStory.title}</span><span className="text-[10px] text-white/70 font-medium">{timeAgo}</span></div></div><button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X className="w-6 h-6" /></button></div>
            <div className="flex-1 relative flex flex-col justify-center items-center p-8 text-center" onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}><div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev}></div><div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext}></div><div className="w-full max-w-sm relative z-0 anim-scale-in"><div className={`w-32 h-32 rounded-[2.5rem] ${theme.accent} flex items-center justify-center mb-10 mx-auto shadow-2xl relative transform rotate-3`}><div className="absolute inset-0 rounded-[2.5rem] bg-white/20 -rotate-6 scale-90 -z-10"></div><div className="text-4xl font-black text-white drop-shadow-2xl">{currentStory.relatedTicker ? currentStory.relatedTicker.substring(0,4) : <Icon className="w-16 h-16" />}</div></div><h2 className="text-3xl font-black text-white mb-6 leading-tight drop-shadow-md">{currentStory.message}</h2>{currentStory.relatedTicker && <div className="inline-block px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest">{currentStory.relatedTicker}</div>}</div></div>
            
            {/* Lógica de Botão Inteligente: Prioriza Navegação Interna */}
            {(currentStory.relatedTicker || currentStory.url) && (
                <div className="p-6 pb-safe z-20 anim-slide-up">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Evita navegar para próximo slide
                            if (currentStory.relatedTicker && onViewAsset) {
                                onClose(); // Fecha o story
                                onViewAsset(currentStory.relatedTicker); // Navega para o ativo
                            } else if (currentStory.url) {
                                window.open(currentStory.url, '_blank'); // Fallback externo
                            }
                        }} 
                        className="block w-full py-4 bg-white text-black text-center rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-transform hover:bg-zinc-100"
                    >
                        Ver Detalhes
                    </button>
                </div>
            )}
        </div>, document.body
    );
};

const SmartFeed = ({ insights, onMarkAsRead, readStories, onViewAsset }: { insights: PortfolioInsight[], onMarkAsRead: (id: string) => void, readStories: Set<string>, onViewAsset?: (ticker: string) => void }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const validInsights = useMemo(() => { if (!insights) return []; const now = Date.now(); const ONE_DAY_MS = 24 * 60 * 60 * 1000; return insights.filter(i => (now - (i.timestamp || now)) < ONE_DAY_MS); }, [insights]);
    if (!validInsights || validInsights.length === 0) return null;
    return (
        <div className="mb-6 -mx-4 overflow-x-auto no-scrollbar pl-4 pb-2 flex gap-4 snap-x">
            {validInsights.map((item, index) => {
                const isRead = readStories.has(item.id);
                let ringColors = 'from-indigo-500 via-purple-500 to-pink-500';
                if (item.type === 'volatility_up' || item.type === 'success') ringColors = 'from-emerald-400 via-teal-400 to-cyan-400';
                if (item.type === 'volatility_down' || item.type === 'warning') ringColors = 'from-rose-500 via-orange-500 to-amber-500';
                const Icon = item.type === 'volatility_up' ? TrendingUp : item.type === 'volatility_down' ? TrendingDown : item.type === 'opportunity' ? Target : item.type === 'warning' ? AlertTriangle : Coins;
                return (
                    <button key={item.id} onClick={() => setActiveIndex(index)} className="flex flex-col items-center gap-2 snap-start group active:scale-95 transition-transform">
                        <div className={`w-[74px] h-[74px] rounded-full p-[3px] transition-all duration-300 ${isRead ? 'bg-zinc-200 dark:bg-zinc-800 opacity-60' : `bg-gradient-to-tr ${ringColors} shadow-lg shadow-black/10`}`}><div className="w-full h-full rounded-full bg-white dark:bg-zinc-950 p-[3px] relative overflow-hidden flex items-center justify-center"><div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center relative">{item.relatedTicker && !isRead ? (<span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{item.relatedTicker.substring(0,4)}</span>) : (<Icon className={`w-6 h-6 ${isRead ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`} strokeWidth={1.5} />)}{!isRead && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></div>}</div></div></div><span className={`text-[9px] font-bold w-16 truncate text-center leading-tight ${isRead ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-300'}`}>{item.title}</span>
                    </button>
                );
            })}
            {activeIndex !== null && <StoryViewer insights={validInsights} startIndex={activeIndex} onClose={() => setActiveIndex(null)} onMarkAsRead={onMarkAsRead} onViewAsset={onViewAsset} />}
        </div>
    );
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false, onViewAsset }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRaioXModal, setShowRaioXModal] = useState(false);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  
  const [insights, setInsights] = useState<PortfolioInsight[]>([]);
  const [readStories, setReadStories] = useState<Set<string>>(() => {
      try { return new Set(JSON.parse(localStorage.getItem('investfiis_read_stories') || '[]')); } catch { return new Set(); }
  });

  // --- ROBOT STATE & DATA ---
  const [robotState, setRobotState] = useState<'idle' | 'thinking' | 'done'>('idle');
  const [futureSimulations, setFutureSimulations] = useState<FutureDividendPrediction[]>([]);

  useEffect(() => {
      const loadData = async () => {
          try {
              const safeInflation = Number(inflationRate) || 4.62;
              const generatedInsights = analyzePortfolio(portfolio, safeInflation);
              const CACHE_KEY = 'investfiis_insights_history_v1';
              let cachedInsights: PortfolioInsight[] = [];
              try { const saved = localStorage.getItem(CACHE_KEY); if (saved) cachedInsights = JSON.parse(saved); } catch {}
              const mergedInsights = generatedInsights.map(newStory => {
                  const existing = Array.isArray(cachedInsights) ? cachedInsights.find(c => c && c.id === newStory.id) : null;
                  if (existing && existing.timestamp) return { ...newStory, timestamp: existing.timestamp };
                  return newStory;
              });
              setInsights(mergedInsights);
              localStorage.setItem(CACHE_KEY, JSON.stringify(mergedInsights));
          } catch (e) { console.error(e); }
      };
      loadData();
  }, [portfolio, inflationRate]);

  // Lógica do Robô: Atualiza automaticamente ao abrir a Agenda
  useEffect(() => {
      if (showAgendaModal && robotState === 'idle') {
          const runRobot = async () => {
              setRobotState('thinking');
              // Simula tempo de processamento para animação
              await new Promise(r => setTimeout(r, 2500));
              
              try {
                  const predictions = await fetchFutureAnnouncements(portfolio);
                  setFutureSimulations(predictions);
              } catch(e) {
                  console.error(e);
              } finally {
                  setRobotState('done');
              }
          };
          runRobot();
      }
  }, [showAgendaModal, robotState, portfolio]);

  // Função para forçar re-scan quando clica no robô
  const handleRobotInteract = useCallback(() => {
      if (robotState !== 'thinking') {
          setRobotState('thinking');
          setFutureSimulations([]); // Limpa para efeito visual de "novo scan"
          setTimeout(async () => {
              try {
                  const predictions = await fetchFutureAnnouncements(portfolio);
                  setFutureSimulations(predictions);
              } catch(e) { console.error(e); } finally { setRobotState('done'); }
          }, 2000);
      }
  }, [portfolio, robotState]);

  const markAsRead = useCallback((id: string) => {
      setReadStories(prev => {
          if (prev.has(id)) return prev;
          const newSet = new Set(prev); newSet.add(id);
          localStorage.setItem('investfiis_read_stories', JSON.stringify(Array.from(newSet)));
          return newSet;
      });
  }, []);

  const safeInflation = Number(inflationRate) || 4.62;
  const capitalGainValue = useMemo(() => balance - invested, [balance, invested]);
  const capitalGainPercent = useMemo(() => invested > 0 ? (capitalGainValue / invested) * 100 : 0, [capitalGainValue, invested]);
  const isCapitalGainPositive = capitalGainValue >= 0;
  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const realReturnPercent = useMemo(() => {
      const nominalFactor = 1 + (totalProfitValue / invested);
      const inflationFactor = 1 + (safeInflation / 100);
      return invested > 0 ? ((nominalFactor / inflationFactor) - 1) * 100 : 0;
  }, [totalProfitValue, invested, safeInflation]);

  const { typeData, classChartData, assetsChartData, sectorChartData, topConcentration } = useMemo(() => {
      let fiisTotal = 0; let stocksTotal = 0;
      const safePortfolio = Array.isArray(portfolio) ? portfolio : [];
      const enriched = safePortfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val; else stocksTotal += val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      
      // Dados por Ativo
      const assetsChartData = enriched
          .sort((a,b) => b.totalValue - a.totalValue)
          .map((a, idx) => ({ name: a.ticker, value: a.totalValue, percent: (a.totalValue / total) * 100, color: CHART_COLORS[idx % CHART_COLORS.length] }));
      
      // Dados por Classe
      const classChartData = [{ name: 'FIIs', value: fiisTotal, color: '#6366f1', percent: (fiisTotal / total) * 100 }, { name: 'Ações', value: stocksTotal, color: '#0ea5e9', percent: (stocksTotal / total) * 100 }].filter(d => d.value > 0);
      
      // Dados por Setor
      const sectorMap: Record<string, number> = {};
      enriched.forEach(p => {
          const s = p.segment || 'Outros';
          sectorMap[s] = (sectorMap[s] || 0) + p.totalValue;
      });
      const sectorChartData = Object.entries(sectorMap)
          .map(([name, value], i) => ({ name, value, percent: (value / total) * 100, color: CHART_COLORS[i % CHART_COLORS.length] }))
          .sort((a,b) => b.value - a.value);

      // Top 3 Concentração
      const topConcentration = assetsChartData.slice(0, 3).reduce((acc, curr) => acc + curr.percent, 0);

      return { 
          typeData: { fiis: { percent: (fiisTotal / total) * 100 }, stocks: { percent: (stocksTotal / total) * 100 }, total }, 
          classChartData, 
          assetsChartData,
          sectorChartData,
          topConcentration
      };
  }, [portfolio]);

  const { upcomingEvents, received, groupedEvents, provisionedTotal, history, receiptsByMonth, divStats, dividendsChartData } = useMemo(() => {
    // CRITICAL FIX: Use local date to prevent timezone issues hiding today's events
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const allEvents: any[] = [];
    let receivedTotal = 0; let provTotal = 0;
    const safeReceipts = Array.isArray(dividendReceipts) ? dividendReceipts : [];
    const map: Record<string, number> = {}; const receiptsMap: Record<string, DividendReceipt[]> = {};
    let total12m = 0; let maxMonthly = 0;
    const oneYearAgoStr = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

    // 1. Processa Recibos Confirmados (DB)
    safeReceipts.forEach(r => {
        if (!r) return;
        // Check using >= local date
        if (r.paymentDate >= todayStr) { allEvents.push({ ...r, eventType: 'payment', date: r.paymentDate }); provTotal += r.totalReceived; }
        if (r.dateCom >= todayStr) allEvents.push({ ...r, eventType: 'datacom', date: r.dateCom });
        if (r.paymentDate <= todayStr) {
            receivedTotal += r.totalReceived;
            const key = r.paymentDate.substring(0, 7);
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsMap[key]) receiptsMap[key] = [];
            receiptsMap[key].push(r);
            if (r.paymentDate >= oneYearAgoStr) total12m += r.totalReceived;
        }
    });

    // 2. Integra Previsões do Robô (Deduplicação Inteligente)
    // Se já existe um evento oficial para o mesmo ticker/data/valor, não adiciona a previsão.
    if (futureSimulations.length > 0) {
        futureSimulations.forEach(pred => {
            const isDuplicate = allEvents.some(e => 
                e.ticker === pred.ticker && 
                (e.date === pred.paymentDate || e.date === pred.dateCom) &&
                Math.abs(e.rate - pred.rate) < 0.001
            );

            if (!isDuplicate) {
                // Adiciona como evento previsto
                if (pred.paymentDate && pred.paymentDate >= todayStr) {
                    allEvents.push({ 
                        ticker: pred.ticker,
                        date: pred.paymentDate,
                        eventType: 'payment',
                        type: pred.type,
                        totalReceived: pred.projectedTotal,
                        rate: pred.rate,
                        isPrediction: true // Flag para UI
                    });
                }
                if (pred.dateCom && pred.dateCom >= todayStr) {
                    allEvents.push({
                        ticker: pred.ticker,
                        date: pred.dateCom,
                        eventType: 'datacom',
                        type: pred.type,
                        isPrediction: true
                    });
                }
            }
        });
    }
    
    const sortedEvents = allEvents.sort((a, b) => a.date.localeCompare(b.date));
    const grouped: Record<string, any[]> = { 'Hoje': [], 'Amanhã': [], 'Esta Semana': [], 'Este Mês': [], 'Futuro': [] };
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const nextWeekDate = new Date(todayDate); nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);

    sortedEvents.forEach((ev: any) => {
        const evDate = new Date(ev.date + 'T00:00:00');
        if (evDate.getTime() === todayDate.getTime()) grouped['Hoje'].push(ev);
        else if (evDate.getTime() === tomorrowDate.getTime()) grouped['Amanhã'].push(ev);
        else if (evDate <= nextWeekDate) grouped['Esta Semana'].push(ev);
        else if (evDate <= endOfMonth) grouped['Este Mês'].push(ev);
        else grouped['Futuro'].push(ev);
    });

    Object.keys(receiptsMap).forEach(k => { if (map[k] > maxMonthly) maxMonthly = map[k]; });
    
    // Sort keys ascending (Old -> New)
    const sortedKeys = Object.keys(map).sort((a, b) => a.localeCompare(b));
    const sortedHistory = sortedKeys.map(k => [k, map[k]] as [string, number]);
    
    // Last 12 months ascending
    const dividendsChartData = sortedKeys.slice(-12).map(date => {
        const [y, m] = date.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return { 
            fullDate: date, 
            name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), 
            value: map[date], 
            year: y 
        };
    });
    
    const sumLast12m = dividendsChartData.reduce((acc, curr) => acc + curr.value, 0);
    const monthlyAvg = dividendsChartData.length > 0 ? (sumLast12m / dividendsChartData.length) : 0;

    return { upcomingEvents: sortedEvents, received: receivedTotal, groupedEvents: grouped, provisionedTotal: provTotal, history: sortedHistory.reverse(), dividendsChartData, receiptsByMonth: receiptsMap, divStats: { total12m, maxMonthly, monthlyAvg } };
  }, [dividendReceipts, totalDividendsReceived, futureSimulations]);

  // (inflationAnalysis logic remains unchanged...)
  const inflationAnalysis = useMemo(() => {
      // 1. Taxa Anual (Fonte Confiável)
      const annualInflationRate = safeInflation; 
      
      // 2. Taxa Mensal Equivalente (Juros Compostos)
      // Fórmula: (1 + taxa_anual)^(1/12) - 1
      const monthlyInflationRateDecimal = Math.pow(1 + (annualInflationRate / 100), 1/12) - 1;
      const monthlyInflationRatePercent = monthlyInflationRateDecimal * 100;
      
      // 3. Custo de Erosão Mensal Atual (Para o card)
      const currentMonthlyInflationCost = invested * monthlyInflationRateDecimal;

      // 4. Yield on Cost Anualizado
      const nominalYield = invested > 0 ? (divStats.total12m / invested) * 100 : 0;
      
      // 5. Spread Real (Yield Anual - IPCA Anual)
      const realYieldSpread = nominalYield - annualInflationRate;
      
      // 6. Cobertura (Renda Média / Custo Mensal da Inflação)
      const coverageRatio = currentMonthlyInflationCost > 0 ? (divStats.monthlyAvg / currentMonthlyInflationCost) * 100 : 0;

      // Helper para reconstruir patrimônio histórico
      const getHistoricalInvested = (dateLimit: string) => {
          if (!transactions || transactions.length === 0) return 0;
          const pos: Record<string, {q:number, c:number}> = {};
          
          // Assume que transactions não está ordenado (sort por segurança)
          const sortedTxs = [...transactions].sort((a,b) => a.date.localeCompare(b.date));

          for (const t of sortedTxs) {
              if (t.date > dateLimit) break;
              
              if (!pos[t.ticker]) pos[t.ticker] = {q:0, c:0};
              
              if (t.type === 'BUY') {
                  pos[t.ticker].q += t.quantity;
                  pos[t.ticker].c += t.quantity * t.price;
              } else {
                  if (pos[t.ticker].q > 0) {
                      const avg = pos[t.ticker].c / pos[t.ticker].q;
                      pos[t.ticker].q -= t.quantity;
                      pos[t.ticker].c -= t.quantity * avg;
                      if (pos[t.ticker].q < 0.0001) { pos[t.ticker].q = 0; pos[t.ticker].c = 0; }
                  }
              }
          }
          return Object.values(pos).reduce((acc, p) => acc + p.c, 0);
      };

      // 7. Dados Gráficos com Custo Histórico Dinâmico
      // dividendsChartData já está em ordem ascendente (Jan -> Dez)
      const chartData = dividendsChartData.map(d => {
          const [y, m] = d.fullDate.split('-').map(Number);
          const lastDayOfMonth = new Date(y, m, 0).toISOString().split('T')[0];
          
          const historicInvested = getHistoricalInvested(lastDayOfMonth);
          const historicCost = historicInvested * monthlyInflationRateDecimal;

          return {
              ...d,
              inflationCost: historicCost,
              investedAtTime: historicInvested,
              netIncome: d.value - historicCost
          };
      });

      // 8. Ativos que vencem a inflação (Novo KPI)
      let protectedEquity = 0;
      let totalAnalyzableEquity = 0;
      
      portfolio.forEach(p => {
          const val = (p.currentPrice || 0) * p.quantity;
          if (p.dy_12m !== undefined && p.dy_12m !== null) {
              totalAnalyzableEquity += val;
              if (p.dy_12m >= annualInflationRate) {
                  protectedEquity += val;
              }
          }
      });
      const protectedPercent = totalAnalyzableEquity > 0 ? (protectedEquity / totalAnalyzableEquity) * 100 : 0;

      return {
          realYieldSpread,
          nominalYield,
          annualInflationRate,
          monthlyInflationRatePercent, 
          monthlyInflationCost: currentMonthlyInflationCost,
          coverageRatio,
          chartData,
          protectedPercent
      };
  }, [invested, safeInflation, divStats, dividendsChartData, transactions, portfolio]);

  const toggleMonthExpand = useCallback((month: string) => setExpandedMonth(prev => prev === month ? null : month), []);
  const handleBarClick = useCallback((data: any) => { if (data && data.activePayload && data.activePayload.length > 0) { const item = data.activePayload[0].payload; if (item && item.fullDate) setSelectedProventosMonth(item.fullDate); } }, []);
  const CustomPieTooltip = ({ active, payload }: any) => { if (active && payload && payload.length) { const data = payload[0]; return (<div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700"><p className="text-xs font-bold text-zinc-900 dark:text-white mb-1">{data.name}</p><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{formatBRL(data.value, privacyMode)} ({data.payload.percent.toFixed(1)}%)</p></div>); } return null; };
  const CustomBarTooltip = ({ active, payload, label }: any) => { if (active && payload && payload.length) { const data = payload[0]; return (<div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 text-center"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label} {data.payload.year}</p><p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(data.value, privacyMode)}</p></div>); } return null; };
  
  const CustomComposedTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const income = payload.find((p: any) => p.dataKey === 'value')?.value || 0;
          const inflation = payload.find((p: any) => p.dataKey === 'inflationCost')?.value || 0;
          const investedHist = payload[0]?.payload?.investedAtTime || 0;
          const real = income - inflation;
          return (
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 text-left">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
                  <div className="space-y-1">
                      <div className="flex justify-between gap-4"><span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Renda</span><span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">{formatBRL(income, privacyMode)}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[10px] text-rose-500 font-bold">Custo IPCA</span><span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">{formatBRL(inflation, privacyMode)}</span></div>
                      <div className="flex justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-1 mb-1"><span className="text-[8px] text-zinc-400">Sobre Patrimônio</span><span className="text-[8px] font-mono text-zinc-400">{formatBRL(investedHist, privacyMode)}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[10px] text-zinc-900 dark:text-white font-black">Ganho Real</span><span className={`text-[10px] font-mono font-black ${real >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{real > 0 ? '+' : ''}{formatBRL(real, privacyMode)}</span></div>
                  </div>
              </div>
          );
      }
      return null;
  };

  const cardBaseClass = "bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 transition-all press-effect relative overflow-hidden group shadow-2xl shadow-black/5 dark:shadow-black/20";
  const hoverBorderClass = "hover:border-zinc-300 dark:hover:border-zinc-700";
  const modalHeaderIconClass = "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm";

  return (
    <div className="space-y-4 pb-8">
      <SmartFeed insights={insights} onMarkAsRead={markAsRead} readStories={readStories} onViewAsset={onViewAsset} />

      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 relative overflow-hidden group">
            <div className="flex flex-col items-center justify-center text-center relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 flex items-center gap-2"><Wallet className="w-3 h-3" /> Patrimônio</p>
                <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none">{formatBRL(balance, privacyMode)}</h2>
                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isCapitalGainPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                    {isCapitalGainPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{isCapitalGainPositive ? '+' : ''}{formatBRL(capitalGainValue, privacyMode)}</span>
                    <span className="opacity-60 text-[10px]">({formatPercent(capitalGainPercent, privacyMode)})</span>
                </div>
            </div>
            <div className="mt-8 grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Custo Total</span><span className="text-sm font-black text-zinc-700 dark:text-zinc-300 tracking-tight">{formatBRL(invested, privacyMode)}</span></div>
                <div className="flex flex-col items-center"><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Retorno Real</span><span className={`text-sm font-black tracking-tight ${realReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{realReturnPercent > 0 ? '+' : ''}{realReturnPercent.toFixed(2)}%</span></div>
            </div>
        </div>
      </div>

      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className={`w-full text-left p-5 flex justify-between items-center ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-sm"><CalendarDays className="w-6 h-6" strokeWidth={1.5} /></div>
                <div><h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h3><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-0.5">{upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos Próximos` : 'Sem eventos próximos'}</p></div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
                {upcomingEvents.length > 0 && (<div className="flex -space-x-3">{upcomingEvents.slice(0,3).map((ev: any, i: number) => <div key={i} className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-900 flex items-center justify-center text-[8px] font-black text-zinc-600 dark:text-zinc-400 shadow-sm">{ev.ticker ? ev.ticker.substring(0,2) : '?'}</div>)}{upcomingEvents.length > 3 && <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-50 dark:border-zinc-900 flex items-center justify-center text-[8px] font-black text-zinc-500 shadow-sm">+{upcomingEvents.length - 3}</div>}</div>)}
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl"><ArrowUpRight className="w-4 h-4 text-zinc-400" /></div>
            </div>
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div><div className="flex justify-between items-start mb-3"><div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30"><CircleDollarSign className="w-5 h-5" /></div></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Renda Passiva</span><p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">{formatBRL(received, privacyMode)}</p></div>
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit"><p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{provisionedTotal > 0 ? `+ ${formatBRL(provisionedTotal, privacyMode)} Futuro` : `Média ${formatBRL(divStats.monthlyAvg, true).split('R$')[1]}`}</p></div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all opacity-50 group-hover:opacity-100"></div>
        </button>

        <button onClick={() => setShowRaioXModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div><div className="flex justify-between items-start mb-3"><div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30"><Activity className="w-5 h-5" /></div></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">IPCA+</span><p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Renda Real</p></div>
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit"><p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Inflação: {safeInflation.toFixed(2)}%</p></div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10"><svg className="w-24 h-24 text-rose-500 -mb-4 -mr-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg></div>
        </button>
      </div>

      <div className="anim-stagger-item" style={{ animationDelay: '300ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className={`w-full text-left p-5 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex justify-between items-end mb-5 relative z-10">
                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-900/30"><PieIcon className="w-6 h-6" /></div><div><h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h3><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Diversificação da Carteira</p></div></div>
                <div className="text-right"><div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl"><ArrowUpRight className="w-4 h-4 text-zinc-400" /></div></div>
            </div>
            <div className="relative z-10"><div className="flex h-3 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3 shadow-inner"><div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-500 transition-all duration-1000 ease-out"></div><div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 transition-all duration-1000 ease-out"></div></div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span></div><div className="flex items-center gap-1.5"><span className="text-sky-600 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span><div className="w-2 h-2 rounded-full bg-sky-500"></div></div></div></div>
        </button>
      </div>

      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full relative overflow-hidden">
            
            {/* Header Fixo */}
            <div className="relative z-20 flex items-center gap-4 mb-4 px-2 anim-slide-up pt-4">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700`}>
                    <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Cronograma de Eventos</p>
                </div>
            </div>
            
            {/* ÁREA DE VOO DO ROBÔ (Bot Playground) */}
            {/* Aumentamos o container relativo para o bot ter espaço de voo sobre a lista */}
            <div className="relative min-h-[60vh] w-full">
                
                {/* WALKING BOT CHARACTER (Personagem) */}
                <WalkingBot 
                    isThinking={robotState === 'thinking'}
                    onInteract={handleRobotInteract}
                />

                {/* Lista de Eventos (Conteúdo unificado) */}
                <div className="relative z-10 pt-4">
                    {Object.keys(groupedEvents).map((groupKey) => { 
                        const events = groupedEvents[groupKey]; 
                        if (events.length === 0) return null; 
                        return (
                            <div key={groupKey} className="mb-10 anim-slide-up">
                                <div className="sticky top-0 z-20 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-sm py-2 mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">{groupKey}</h3>
                                </div>
                                <div className="relative">
                                    {events.map((e: any, i: number) => <TimelineEvent key={i} event={e} isLast={i === events.length - 1} />)}
                                </div>
                            </div>
                        ); 
                    })}
                    
                    {upcomingEvents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <Calendar className="w-16 h-16 text-zinc-300 mb-4" strokeWidth={1} />
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Agenda Vazia</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </SwipeableModal>

      {/* MODAL DE ALOCAÇÃO APERFEIÇOADO */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-8 px-2 anim-slide-up">
                 <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-700`}>
                     <PieIcon className="w-6 h-6" strokeWidth={1.5} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Raio-X de Diversificação</p>
                 </div>
             </div>

             {/* KPIs de Diversificação */}
             <div className="grid grid-cols-2 gap-3 mb-6 anim-slide-up">
                 <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Setores</p>
                     <p className="text-lg font-black text-zinc-900 dark:text-white">{sectorChartData.length}</p>
                 </div>
                 <div className={`bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm ${topConcentration > 50 ? 'border-amber-200 dark:border-amber-900/50' : ''}`}>
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Risco (Top 3)</p>
                     <p className={`text-lg font-black ${topConcentration > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>{topConcentration.toFixed(1)}%</p>
                 </div>
             </div>

             <div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl flex gap-1 mb-6 shadow-inner anim-slide-up shrink-0" style={{ animationDelay: '50ms' }}>
                 {['CLASS', 'SECTOR', 'ASSET'].map(t => (
                     <button 
                        key={t} 
                        onClick={() => setAllocationTab(t as any)} 
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                     >
                        {t === 'CLASS' ? 'Classe' : t === 'SECTOR' ? 'Setor' : 'Ativo'}
                     </button>
                 ))}
             </div>

             <div className="anim-slide-up px-1 pb-10" style={{ animationDelay: '100ms' }}>
                 {(allocationTab === 'CLASS' || allocationTab === 'SECTOR') ? (
                     <div className="space-y-6">
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800">
                            <div className="h-64 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={allocationTab === 'CLASS' ? classChartData : sectorChartData} 
                                            innerRadius={65} 
                                            outerRadius={90} 
                                            paddingAngle={5} 
                                            cornerRadius={8} 
                                            dataKey="value" 
                                            stroke="none" 
                                            isAnimationActive={true} 
                                            animationDuration={1000} 
                                            {...{ activeIndex: activeIndexClass } as any} 
                                            activeShape={(props: any) => { const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props; return (<g><Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} className="drop-shadow-lg filter" cornerRadius={6} /><Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={innerRadius - 6} outerRadius={innerRadius - 2} fill={fill} /></g>); }} 
                                            onMouseEnter={(_, index) => setActiveIndexClass(index)} 
                                            onTouchStart={(_, index) => setActiveIndexClass(index)} 
                                            onMouseLeave={() => setActiveIndexClass(undefined)}
                                        >
                                            {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none anim-fade-in select-none">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                        {activeIndexClass !== undefined 
                                            ? (allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].name 
                                            : 'Total'}
                                    </span>
                                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                        {activeIndexClass !== undefined 
                                            ? formatPercent((allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].percent, privacyMode) 
                                            : formatBRL(typeData.total, privacyMode)}
                                    </span>
                                </div>
                            </div>
                         </div>
                         
                         <div className="space-y-3">
                             {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((item, index) => (
                                 <button key={index} onClick={() => setActiveIndexClass(index === activeIndexClass ? undefined : index)} className={`w-full p-4 rounded-2xl border flex items-center gap-4 group transition-all duration-300 relative overflow-hidden ${index === activeIndexClass ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                     {/* Progress Bar Background */}
                                     <div className="absolute bottom-0 left-0 h-1 bg-zinc-100 dark:bg-zinc-950 w-full">
                                         <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                                     </div>
                                     
                                     <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0" style={{ backgroundColor: item.color }}>
                                         {Math.round(item.percent)}%
                                     </div>
                                     <div className="flex-1 text-left min-w-0">
                                         <div className="flex justify-between items-center mb-1">
                                             <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{item.name}</span>
                                             <span className="text-xs font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                         </div>
                                         <p className="text-[10px] text-zinc-400 font-medium">Peso na carteira</p>
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 ) : (
                    <div className="space-y-4">
                        {assetsChartData.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {assetsChartData.map((asset, index) => (
                                    <div key={index} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 anim-stagger-item relative overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border border-zinc-100 dark:border-zinc-800" style={{ color: asset.color, backgroundColor: `${asset.color}15` }}>{asset.name.substring(0,2)}</div>
                                        <div className="flex-1 text-left relative z-10">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{asset.name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(asset.percent, privacyMode)}</span>
                                                    <span className="text-[9px] font-medium text-zinc-400">{formatBRL(asset.value, privacyMode)}</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden"><div className="h-full rounded-full opacity-90" style={{ width: `${asset.percent}%`, backgroundColor: asset.color }}></div></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="flex flex-col items-center justify-center py-20 opacity-50"><Gem className="w-12 h-12 text-zinc-300 mb-4" strokeWidth={1} /><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum ativo</p></div>}
                    </div>
                 )}
             </div>
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showProventosModal} onClose={() => { setShowProventosModal(false); setSelectedProventosMonth(null); setExpandedMonth(null); }}>
         {/* ... (Mantém modal de Proventos) ... */}
         <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-8 px-2 anim-slide-up"><div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-zinc-200 dark:border-zinc-700`}><Wallet className="w-6 h-6" strokeWidth={1.5} /></div><div><h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2><p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Histórico</p></div></div>
             
             <div className="grid grid-cols-3 gap-3 mb-6 anim-slide-up">{[{ label: 'Média Mensal', val: divStats.monthlyAvg, color: 'text-zinc-900 dark:text-white' }, { label: 'Recorde', val: divStats.maxMonthly, color: 'text-emerald-600 dark:text-emerald-400' }, { label: 'Total 12m', val: divStats.total12m, color: 'text-zinc-900 dark:text-white' }].map((s, i) => (<div key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center shadow-sm"><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p><p className={`text-xs font-black ${s.color}`}>{formatBRL(s.val, privacyMode)}</p></div>))}</div>
             {dividendsChartData.length > 0 && (<div className="mb-8 h-48 w-full bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm anim-slide-up"><ResponsiveContainer width="100%" height="100%"><BarChart data={dividendsChartData} onClick={handleBarClick}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} /><RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomBarTooltip />} /><Bar dataKey="value" radius={[4, 4, 4, 4]}>{dividendsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fullDate === selectedProventosMonth ? '#10b981' : '#e4e4e7'} className="transition-colors duration-300 hover:opacity-80 dark:fill-zinc-700 dark:hover:fill-emerald-600" />)}</Bar></BarChart></ResponsiveContainer><p className="text-[9px] text-zinc-400 text-center mt-2 font-medium">Toque nas barras para filtrar detalhes</p></div>)}
             <div className="space-y-3">{selectedProventosMonth ? (<div className="anim-scale-in"><div className="flex justify-between items-center mb-4 px-1"><h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{new Date(selectedProventosMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3><button onClick={() => setSelectedProventosMonth(null)} className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg"><Filter className="w-3 h-3" /> Limpar Filtro</button></div>{receiptsByMonth[selectedProventosMonth] ? (<div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">{receiptsByMonth[selectedProventosMonth].map((r, idx) => (<div key={idx} className="flex justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors anim-stagger-item" style={{ animationDelay: `${idx * 50}ms` }}><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${r.type === 'JCP' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} dark:bg-zinc-800 dark:border-zinc-700`}>{r.ticker.substring(0,2)}</div><div><div className="flex items-center gap-2"><span className="text-sm font-black text-zinc-900 dark:text-white">{r.ticker}</span><span className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded text-zinc-500">{r.type}</span></div><span className="text-[10px] text-zinc-400 font-medium">Pago em {new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span></div></div><div className="text-right"><span className="text-sm font-black text-zinc-900 dark:text-white block">{formatBRL(r.totalReceived, privacyMode)}</span><span className="text-[10px] text-zinc-400 font-medium">{r.quantityOwned} un x {r.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div></div>))}<div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Total do Mês</span><span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatBRL(dividendsChartData.find(d => d.fullDate === selectedProventosMonth)?.value || 0, privacyMode)}</span></div></div>) : (<p className="text-center text-xs text-zinc-400 py-4">Sem dados para este mês.</p>)}</div>) : (history.map(([month, val], i) => (<div key={month} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden anim-stagger-item shadow-sm" style={{ animationDelay: `${i * 30}ms` }}><button onClick={() => toggleMonthExpand(month)} className="w-full flex justify-between items-center p-4 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${expandedMonth === month ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>{expandedMonth === month ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div><span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span></div><span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(val, privacyMode)}</span></button>{expandedMonth === month && receiptsByMonth[month] && (<div className="bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 space-y-2">{receiptsByMonth[month].map((r, idx) => (<div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-0 anim-slide-up" style={{ animationDelay: `${idx * 30}ms` }}><div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div><div><span className="text-xs font-black text-zinc-900 dark:text-white block">{r.ticker}</span><span className="text-[9px] text-zinc-400 font-bold uppercase">{new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span></div></div><div className="text-right"><span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">{formatBRL(r.totalReceived, privacyMode)}</span><span className="text-[9px] text-zinc-400 font-medium">{r.quantityOwned} un x {r.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div></div>))}</div>)}</div>)))}</div>
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showRaioXModal} onClose={() => setShowRaioXModal(false)}>
          {/* ... (Mantém modal IPCA+) ... */}
          <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
              <div className="flex items-center gap-4 mb-8 px-2 anim-slide-up">
                  <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-rose-500 border-zinc-200 dark:border-zinc-700`}><Target className="w-6 h-6" /></div>
                  <div>
                      <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">IPCA+</h2>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Renda vs Inflação</p>
                  </div>
              </div>
              
              <div className="space-y-6 anim-slide-up">
                  {/* Hero Card: Spread Real */}
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Flame className="w-16 h-16 text-zinc-500" />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Yield Real (Spread vs IPCA)</p>
                      <h3 className={`text-4xl font-black tracking-tighter ${inflationAnalysis.realYieldSpread >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {inflationAnalysis.realYieldSpread > 0 ? '+' : ''}{inflationAnalysis.realYieldSpread.toFixed(2)}%
                      </h3>
                      <div className="mt-4 flex flex-col gap-2 justify-center items-center text-[10px] font-bold">
                          <div className="flex items-center gap-2">
                              <span className="text-zinc-400 uppercase tracking-widest">Inflação Anual</span>
                              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">{inflationAnalysis.annualInflationRate.toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-zinc-400 uppercase tracking-widest">Equivalente Mensal</span>
                              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{inflationAnalysis.monthlyInflationRatePercent.toFixed(2)}% a.m.</span>
                          </div>
                      </div>
                  </div>

                  {/* Insight: Cobertura */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-sm ${inflationAnalysis.coverageRatio >= 100 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${inflationAnalysis.coverageRatio >= 100 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {inflationAnalysis.coverageRatio >= 100 ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                      </div>
                      <div>
                          <h4 className={`text-sm font-black ${inflationAnalysis.coverageRatio >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                              Cobertura: {inflationAnalysis.coverageRatio.toFixed(0)}%
                          </h4>
                          <p className="text-[10px] font-medium opacity-80 leading-tight">
                              {inflationAnalysis.coverageRatio >= 100 
                                  ? 'Sua renda passiva supera a erosão inflacionária mensal.' 
                                  : `Seus dividendos cobrem apenas ${inflationAnalysis.coverageRatio.toFixed(0)}% da desvalorização mensal.`}
                          </p>
                      </div>
                  </div>

                  {/* Novo Card: Patrimônio Protegido */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                              <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-100">Patrimônio Protegido</h4>
                              <p className="text-[10px] text-indigo-700 dark:text-indigo-300 opacity-80">DY acima da inflação</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{inflationAnalysis.protectedPercent.toFixed(0)}%</span>
                      </div>
                  </div>

                  {/* Gráfico: Batalha Mensal */}
                  <div className="h-64 w-full bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2 flex justify-between">
                          <span>Renda vs Custo Inflação</span>
                          <span className="text-[9px] normal-case opacity-60">Linha Vermelha = Custo s/ Histórico</span>
                      </h3>
                      <ResponsiveContainer width="100%" height="85%">
                          <ComposedChart data={inflationAnalysis.chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.2} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                              <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomComposedTooltip />} />
                              
                              {/* Custo Inflação (Area/Line) */}
                              <Area type="monotone" dataKey="inflationCost" fill="url(#colorInflation)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0.05} />
                              <Line type="monotone" dataKey="inflationCost" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                              
                              {/* Renda (Bar) */}
                              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={12}>
                                  {inflationAnalysis.chartData.map((entry, index) => (
                                      <Cell 
                                          key={`cell-${index}`} 
                                          fill={entry.value >= entry.inflationCost ? '#10b981' : '#fbbf24'} // Verde se bateu a meta, Amarelo se não
                                      />
                                  ))}
                              </Bar>
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>

                  {/* Breakdown Financeiro */}
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Renda Média</p>
                          <p className="text-sm font-black text-emerald-500">{formatBRL(divStats.monthlyAvg, privacyMode)}</p>
                          <p className="text-[8px] text-zinc-400 mt-0.5">Últimos 12 meses</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Erosão Estimada</p>
                          <p className="text-sm font-black text-rose-500">{formatBRL(inflationAnalysis.monthlyInflationCost, privacyMode)}</p>
                          <p className="text-[8px] text-zinc-400 mt-0.5">Custo mensal s/ patrimônio atual</p>
                      </div>
                  </div>
              </div>
          </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
