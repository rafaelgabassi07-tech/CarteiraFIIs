
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, Transaction, PortfolioInsight, NewsItem, MarketOverview } from '../types';
import { CircleDollarSign, PieChart as PieIcon, CalendarDays, Banknote, Wallet, Calendar, CalendarClock, Coins, ChevronDown, ChevronUp, Target, Gem, TrendingUp, ArrowUpRight, BarChart3, Activity, X, Filter, Percent, Layers, Building2, TrendingDown, Lightbulb, AlertTriangle, Sparkles, Zap, Info, Globe, Newspaper, ArrowLeft, ArrowRight } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, Sector } from 'recharts';
import { analyzePortfolio } from '../services/analysisService';
import { fetchMarketOverview } from '../services/dataService';

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
    if (!dateStr || dateStr.length < 10) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
};

// --- LOGICA DE TIMELINE DO MODAL AGENDA ---
const TimelineEvent: React.FC<{ event: any, isLast: boolean }> = ({ event, isLast }) => {
    const isPayment = event.eventType === 'payment';
    const isToday = new Date(event.date + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0);
    
    let iconBg = 'bg-zinc-100 dark:bg-zinc-800';
    let iconColor = 'text-zinc-400';
    let Icon = Calendar;
    let borderColor = 'border-zinc-200 dark:border-zinc-800';

    if (isPayment) {
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

    return (
        <div className="relative pl-12 py-2">
            {!isLast && <div className="absolute left-[19px] top-8 bottom-[-8px] w-[2px] bg-zinc-100 dark:bg-zinc-800"></div>}
            <div className={`absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 z-10 ${iconBg} ${iconColor} shadow-sm`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border ${borderColor} shadow-sm flex justify-between items-center relative overflow-hidden group`}>
                {isToday && <div className="absolute right-0 top-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg">HOJE</div>}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-500 border border-zinc-100 dark:border-zinc-700">
                        {event.ticker.substring(0,2)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-zinc-900 dark:text-white">{event.ticker}</h4>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isPayment ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {isPayment ? 'Pagamento' : 'Data Com'}
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                            {event.type} • {formatDateShort(event.date)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    {isPayment ? (
                        <>
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{event.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <p className="text-[9px] text-zinc-400">Total Previsto</p>
                        </>
                    ) : (
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Corte</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- STORY VIEWER & FEED ---

const StoryViewer = ({ insights, startIndex, onClose, onMarkAsRead }: { insights: PortfolioInsight[], startIndex: number, onClose: () => void, onMarkAsRead: (id: string) => void }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const DURATION = 5000; // 5 segundos por story
    
    // Touch Logic
    const touchStartY = useRef(0);
    const touchEndY = useRef(0);

    const currentStory = insights[currentIndex];

    useEffect(() => {
        setProgress(0);
    }, [currentIndex]);

    useEffect(() => {
        if (!isPaused) {
            const interval = 50; // Update every 50ms
            const step = (100 * interval) / DURATION;
            
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        if (currentIndex < insights.length - 1) {
                            onMarkAsRead(currentStory.id);
                            setCurrentIndex(c => c + 1);
                            return 0;
                        } else {
                            onMarkAsRead(currentStory.id);
                            onClose();
                            return 100;
                        }
                    }
                    return prev + step;
                });
            }, interval);
            return () => clearInterval(timer);
        }
    }, [currentIndex, isPaused, insights.length, onClose, onMarkAsRead, currentStory]);

    const handleNext = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        onMarkAsRead(currentStory.id);
        if (currentIndex < insights.length - 1) {
            setCurrentIndex(c => c + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(c => c - 1);
        }
    };

    const openLink = () => {
        if (currentStory.url) {
            window.open(currentStory.url, '_blank', 'noopener,noreferrer');
            setIsPaused(true);
        }
    };

    // Handlers de Toque para Swipe Up
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsPaused(true);
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
        setIsPaused(false);
        const distance = touchStartY.current - touchEndY.current;
        // Se arrastou mais de 50px pra cima e não foi apenas um toque (touchEndY !== 0)
        if (touchEndY.current !== 0 && distance > 60) {
            openLink();
        }
        // Reseta
        touchStartY.current = 0;
        touchEndY.current = 0;
    };

    if (!currentStory) return null;

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'volatility_up': return 'bg-emerald-500';
            case 'volatility_down': return 'bg-rose-500';
            case 'warning': return 'bg-amber-500';
            case 'opportunity': return 'bg-indigo-500';
            case 'success': return 'bg-emerald-600';
            default: return 'bg-sky-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'volatility_up': return TrendingUp;
            case 'volatility_down': return TrendingDown;
            case 'warning': return AlertTriangle;
            case 'opportunity': return Target;
            case 'success': return Coins;
            default: return Lightbulb;
        }
    };

    const Icon = getTypeIcon(currentStory.type);
    const colorClass = getTypeColor(currentStory.type);

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Progress Bars */}
            <div className="flex gap-1 p-2 pt-safe z-20">
                {insights.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-white transition-all duration-100 linear"
                            style={{ 
                                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 z-20 text-white">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-sm">{currentStory.title}</span>
                </div>
                <button onClick={onClose}><X className="w-6 h-6" /></button>
            </div>

            {/* Content Area */}
            <div 
                className="flex-1 relative flex flex-col justify-center items-center p-8 text-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
            >
                {/* Click Areas */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrev}></div>
                <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext}></div>

                {/* Visual Content */}
                <div className="w-full max-w-sm relative z-0 anim-scale-in pointer-events-none">
                    <div className={`w-32 h-32 rounded-[2rem] ${colorClass} bg-opacity-20 flex items-center justify-center mb-8 mx-auto border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
                        <div className="text-4xl font-black text-white drop-shadow-md">
                            {currentStory.relatedTicker ? currentStory.relatedTicker.substring(0,2) : <Icon className="w-16 h-16" />}
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-white mb-4 leading-tight">{currentStory.message}</h2>
                    
                    {currentStory.relatedTicker && (
                        <div className="inline-block px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm mb-6">
                            {currentStory.relatedTicker}
                        </div>
                    )}

                    {currentStory.url && (
                        <div className="absolute bottom-[-140px] left-0 right-0 flex justify-center animate-bounce opacity-80">
                            <div className="flex flex-col items-center gap-2">
                                <ChevronUp className="w-6 h-6 text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Deslize para detalhes</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Action */}
            {currentStory.url && (
                <div className="p-6 pb-safe z-20">
                    <a 
                        href={currentStory.url} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={(e) => { e.stopPropagation(); setIsPaused(true); }}
                        className="block w-full py-4 bg-white text-black text-center rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                    >
                        Ver Detalhes do Ativo
                    </a>
                </div>
            )}
        </div>,
        document.body
    );
};

const SmartFeed = ({ insights, onMarkAsRead, readStories }: { insights: PortfolioInsight[], onMarkAsRead: (id: string) => void, readStories: Set<string> }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (insights.length === 0) return null;

    return (
        <div className="mb-6 -mx-4 overflow-x-auto no-scrollbar pl-4 pb-2 flex gap-4 snap-x">
            {insights.map((item, index) => {
                const isRead = readStories.has(item.id);
                
                // Cores do anel baseadas no tipo de destaque
                let ringColors = 'from-indigo-500 via-purple-500 to-pink-500';
                if (item.type === 'volatility_up' || item.type === 'success') ringColors = 'from-emerald-400 via-green-500 to-teal-500';
                if (item.type === 'volatility_down' || item.type === 'warning') ringColors = 'from-rose-400 via-red-500 to-orange-500';
                
                const Icon = item.type === 'volatility_up' ? TrendingUp : item.type === 'volatility_down' ? TrendingDown : item.type === 'opportunity' ? Target : Coins;

                return (
                    <button 
                        key={item.id}
                        onClick={() => setActiveIndex(index)}
                        className="flex flex-col items-center gap-1.5 snap-start group"
                    >
                        <div className={`w-[60px] h-[60px] rounded-full p-[2px] ${isRead ? 'bg-zinc-200 dark:bg-zinc-800' : `bg-gradient-to-tr ${ringColors}`}`}>
                            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-950 p-[2px] relative overflow-hidden flex items-center justify-center">
                                <div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center relative overflow-hidden">
                                    {/* Logo Background ou Ícone */}
                                    {item.relatedTicker ? (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                            <span className="text-[20px] font-black">{item.relatedTicker.substring(0,2)}</span>
                                        </div>
                                    ) : null}
                                    
                                    <Icon className={`w-5 h-5 relative z-10 ${isRead ? 'text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`} />
                                    
                                    {item.relatedTicker && (
                                        <span className="absolute bottom-1.5 text-[7px] font-black uppercase text-zinc-400 relative z-10">{item.relatedTicker.substring(0,4)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400 w-16 truncate text-center leading-tight">
                            {item.title}
                        </span>
                    </button>
                );
            })}
            
            {activeIndex !== null && (
                <StoryViewer 
                    insights={insights} 
                    startIndex={activeIndex} 
                    onClose={() => setActiveIndex(null)}
                    onMarkAsRead={onMarkAsRead}
                />
            )}
        </div>
    );
};

// ... Resto das funções utilitárias e constantes mantidas para garantir integridade do arquivo ...
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRaioXModal, setShowRaioXModal] = useState(false);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  const [raioXTab, setRaioXTab] = useState<'GERAL' | 'CLASSES'>('GERAL');
  
  const [insights, setInsights] = useState<PortfolioInsight[]>([]);
  const [marketOverview, setMarketOverview] = useState<MarketOverview | undefined>(undefined);
  
  const [readStories, setReadStories] = useState<Set<string>>(() => {
      try {
          const saved = localStorage.getItem('investfiis_read_stories');
          return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
          return new Set();
      }
  });

  // Carregamento de Destaques de Mercado para os Stories
  useEffect(() => {
      const loadData = async () => {
          try {
              const safeInflation = Number(inflationRate) || 4.62;
              const marketData = await fetchMarketOverview();
              setMarketOverview(marketData);
              
              const generatedInsights = analyzePortfolio(portfolio, safeInflation, marketData);
              setInsights(generatedInsights);
          } catch (e) {
              console.error(e);
          }
      };
      loadData();
  }, [portfolio, inflationRate]);

  const markAsRead = useCallback((id: string) => {
      setReadStories(prev => {
          if (prev.has(id)) return prev;
          const newSet = new Set(prev);
          newSet.add(id);
          localStorage.setItem('investfiis_read_stories', JSON.stringify(Array.from(newSet)));
          return newSet;
      });
  }, []);

  const safeInflation = Number(inflationRate) || 4.62;

  // Cálculos de Rentabilidade e Dados (Mantidos)
  const capitalGainValue = useMemo(() => balance - invested, [balance, invested]);
  const capitalGainPercent = useMemo(() => invested > 0 ? (capitalGainValue / invested) * 100 : 0, [capitalGainValue, invested]);
  const isCapitalGainPositive = capitalGainValue >= 0;
  const totalProfitValue = useMemo(() => totalAppreciation + salesGain + totalDividendsReceived, [totalAppreciation, salesGain, totalDividendsReceived]);
  const realReturnPercent = useMemo(() => {
      const nominalFactor = 1 + (totalProfitValue / invested); // Simplificado para ROI total
      const inflationFactor = 1 + (safeInflation / 100);
      return invested > 0 ? ((nominalFactor / inflationFactor) - 1) * 100 : 0;
  }, [totalProfitValue, invested, safeInflation]);

  const { typeData, classChartData, assetsChartData } = useMemo(() => {
      let fiisTotal = 0;
      let stocksTotal = 0;
      const safePortfolio = Array.isArray(portfolio) ? portfolio : [];
      const enriched = safePortfolio.map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val;
          else stocksTotal += val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      const assetsChartData = enriched.map((a, idx) => ({
          name: a.ticker,
          value: a.totalValue,
          percent: (a.totalValue / total) * 100,
          color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
      const classChartData = [
          { name: 'FIIs', value: fiisTotal, color: '#6366f1', percent: (fiisTotal / total) * 100 },
          { name: 'Ações', value: stocksTotal, color: '#0ea5e9', percent: (stocksTotal / total) * 100 }
      ].filter(d => d.value > 0);

      return {
          typeData: { fiis: { percent: (fiisTotal / total) * 100 }, stocks: { percent: (stocksTotal / total) * 100 }, total },
          classChartData,
          assetsChartData
      };
  }, [portfolio]);

  const { upcomingEvents, received, groupedEvents, provisionedTotal, history, receiptsByMonth, divStats, dividendsChartData } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const allEvents: any[] = [];
    let receivedTotal = 0;
    let provTotal = 0;
    
    const safeReceipts = Array.isArray(dividendReceipts) ? dividendReceipts : [];

    // Lógica combinada de eventos e histórico para otimização
    const map: Record<string, number> = {};
    const receiptsMap: Record<string, DividendReceipt[]> = {};
    let total12m = 0;
    let maxMonthly = 0;
    const oneYearAgoStr = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

    safeReceipts.forEach(r => {
        if (!r) return;
        // Eventos Futuros / Hoje
        if (r.paymentDate >= todayStr) {
            allEvents.push({ ...r, eventType: 'payment', date: r.paymentDate });
            provTotal += r.totalReceived;
        }
        if (r.dateCom >= todayStr) allEvents.push({ ...r, eventType: 'datacom', date: r.dateCom });
        
        // Histórico Recebido
        if (r.paymentDate <= todayStr) {
            receivedTotal += r.totalReceived;
            const key = r.paymentDate.substring(0, 7);
            map[key] = (map[key] || 0) + r.totalReceived;
            if (!receiptsMap[key]) receiptsMap[key] = [];
            receiptsMap[key].push(r);
            if (r.paymentDate >= oneYearAgoStr) total12m += r.totalReceived;
        }
    });
    
    // Ordenação e Agrupamento da Agenda
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

    // Gráficos de Proventos
    Object.keys(receiptsMap).forEach(k => { if (map[k] > maxMonthly) maxMonthly = map[k]; });
    const sortedHistory = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
    const dividendsChartData = sortedHistory.map(([date, val]) => {
        const [y, m] = date.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return {
            fullDate: date,
            name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
            value: val, year: y
        };
    }).slice(-12);
    const monthlyAvg = dividendsChartData.length > 0 ? (totalDividendsReceived / dividendsChartData.length) : 0;

    return { 
        upcomingEvents: sortedEvents, received: receivedTotal, groupedEvents: grouped,
        provisionedTotal: provTotal, history: sortedHistory.reverse(), dividendsChartData, 
        receiptsByMonth: receiptsMap, divStats: { total12m, maxMonthly, monthlyAvg }
    };
  }, [dividendReceipts, totalDividendsReceived]);

  // --- Handlers & Components for Charts ---

  const toggleMonthExpand = useCallback((month: string) => {
    setExpandedMonth(prev => prev === month ? null : month);
  }, []);

  const handleBarClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
        const item = data.activePayload[0].payload;
        if (item && item.fullDate) {
            setSelectedProventosMonth(item.fullDate);
        }
    }
  }, []);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700">
                <p className="text-xs font-bold text-zinc-900 dark:text-white mb-1">{data.name}</p>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatBRL(data.value, privacyMode)} ({data.payload.percent.toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
     if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label} {data.payload.year}</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatBRL(data.value, privacyMode)}
                </p>
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
      
      {/* 0. SMART FEED (STORIES - RANKINGS DE MERCADO) */}
      <SmartFeed insights={insights} onMarkAsRead={markAsRead} readStories={readStories} />

      {/* 1. CARTÃO DE PATRIMÔNIO ATUAL */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 dark:from-zinc-800 dark:via-zinc-900 dark:to-black rounded-[2rem] border border-white/10 shadow-2xl shadow-black/30 relative overflow-hidden text-white animate-gradient">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            
            <div className="p-6 text-center border-b border-white/5 relative z-10">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-1.5">
                    <Wallet className="w-3 h-3" /> Patrimônio Atual
                </p>
                <h2 className="text-4xl font-black tracking-tighter tabular-nums leading-none">
                    {formatBRL(balance, privacyMode)}
                </h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/5 relative z-10">
                <div className="p-5 flex flex-col items-center justify-center hover:bg-white/5 transition-colors">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Total Aplicado</p>
                    <span className="text-sm font-black text-zinc-200 tracking-tight">
                        {formatBRL(invested, privacyMode)}
                    </span>
                </div>
                <div className="p-5 flex flex-col items-center justify-center hover:bg-white/5 transition-colors relative overflow-hidden">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Rentabilidade</p>
                    <div className="flex flex-col items-center relative z-10">
                        <span className={`text-sm font-black flex items-center gap-1 tracking-tight ${isCapitalGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCapitalGainPositive ? '+' : ''}{formatBRL(capitalGainValue, privacyMode)}
                        </span>
                        <span className={`text-[9px] font-bold ${isCapitalGainPositive ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                            {isCapitalGainPositive ? <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />}
                            {formatPercent(capitalGainPercent, privacyMode)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. BOTÃO AGENDA */}
      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className={`w-full text-left p-5 flex justify-between items-center ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    <CalendarDays className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                        {upcomingEvents.length > 0 ? `${upcomingEvents.length} Eventos Próximos` : 'Tudo tranquilo'}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
                {upcomingEvents.length > 0 && (
                    <div className="flex -space-x-2">
                         {upcomingEvents.slice(0,3).map((ev: any, i: number) => <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-600 dark:text-zinc-400 shadow-sm">{ev.ticker.substring(0,2)}</div>)}
                         {upcomingEvents.length > 3 && <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-500 shadow-sm">+{upcomingEvents.length - 3}</div>}
                    </div>
                )}
                <ArrowUpRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
            </div>
        </button>
      </div>
      
      {/* 3. GRID PROVENTOS & RAIO-X */}
      <div className="grid grid-cols-2 gap-4 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        
        <button onClick={() => setShowProventosModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30"><CircleDollarSign className="w-5 h-5" /></div>
                        <ArrowUpRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Renda Passiva</span>
                    <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">{formatBRL(received, privacyMode)}</p>
                </div>
                {provisionedTotal > 0 ? (
                    <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit">
                        <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                            + {formatBRL(provisionedTotal, privacyMode)} <span className="opacity-50">Futuro</span>
                        </p>
                    </div>
                ) : (
                    <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Média {formatBRL(divStats.monthlyAvg, true).split('R$')[1]}</p>
                    </div>
                )}
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all opacity-50 group-hover:opacity-100"></div>
        </button>

        <button onClick={() => setShowRaioXModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30">
                            <Activity className="w-5 h-5" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Ganho Real</span>
                    <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{realReturnPercent > 0 ? '+' : ''}{realReturnPercent.toFixed(2)}%</p>
                </div>
                
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit">
                    <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        IPCA (12m) {safeInflation}%
                    </p>
                </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
                <BarChart3 className="w-24 h-24 text-rose-500 -mb-4 -mr-4" />
            </div>
        </button>
      </div>

      {/* 4. CARD ALOCAÇÃO */}
      <div className="anim-stagger-item" style={{ animationDelay: '300ms' }}>
        <button onClick={() => setShowAllocationModal(true)} className={`w-full text-left p-5 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex justify-between items-end mb-5 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-900/30"><PieIcon className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Diversificação da Carteira</p>
                    </div>
                </div>
                <div className="text-right">
                    <ArrowUpRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 ml-auto mb-1" />
                    <span className="text-xs font-black text-zinc-900 dark:text-white block">{typeData.total > 0 ? 'Balanceado' : 'Vazio'}</span>
                </div>
            </div>
            
            <div className="relative z-10">
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3 shadow-inner">
                    <div style={{ width: `${typeData.fiis.percent}%` }} className="h-full bg-indigo-500 transition-all duration-1000 ease-out"></div>
                    <div style={{ width: `${typeData.stocks.percent}%` }} className="h-full bg-sky-500 transition-all duration-1000 ease-out"></div>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-indigo-600 dark:text-indigo-400">FIIs {Math.round(typeData.fiis.percent)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sky-600 dark:text-sky-400">Ações {Math.round(typeData.stocks.percent)}%</span>
                        <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                    </div>
                </div>
            </div>
        </button>
      </div>

      {/* --- MODAIS DE DETALHES --- */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
            <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700`}>
                    <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">
                        Agenda
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Cronograma de Eventos</p>
                </div>
            </div>

            {Object.keys(groupedEvents).map((groupKey) => {
                const events = groupedEvents[groupKey];
                if (events.length === 0) return null;
                return (
                    <div key={groupKey} className="mb-10 anim-slide-up">
                        <div className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-950 py-2 mb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                {groupKey}
                            </h3>
                        </div>
                        <div className="relative">
                            {events.map((e: any, i: number) => (
                                <TimelineEvent key={i} event={e} isLast={i === events.length - 1} />
                            ))}
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
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-700`}><PieIcon className="w-6 h-6" strokeWidth={1.5} /></div>
                <div><h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">Alocação</h2><p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Diversificação</p></div>
             </div>
             
             <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-xl flex gap-1 mb-6 shadow-sm border border-zinc-200 dark:border-zinc-800 anim-slide-up shrink-0" style={{ animationDelay: '50ms' }}>
                 <button onClick={() => setAllocationTab('CLASS')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === 'CLASS' ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Por Classe</button>
                 <button onClick={() => setAllocationTab('ASSET')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === 'ASSET' ? 'bg-zinc-900 dark:bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Por Ativo</button>
             </div>
             
             <div className="anim-slide-up px-1 pb-10" style={{ animationDelay: '100ms' }}>
                 {allocationTab === 'CLASS' ? (
                     <div className="space-y-6">
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800">
                            <div className="h-64 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={classChartData} 
                                            innerRadius={65} 
                                            outerRadius={90} 
                                            paddingAngle={5} 
                                            cornerRadius={8} 
                                            dataKey="value" 
                                            stroke="none" 
                                            isAnimationActive={true} 
                                            animationDuration={1000} 
                                            activeIndex={activeIndexClass} 
                                            activeShape={(props: any) => {
                                                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                                                return (
                                                    <g>
                                                        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} className="drop-shadow-lg filter" cornerRadius={6} />
                                                        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={innerRadius - 6} outerRadius={innerRadius - 2} fill={fill} />
                                                    </g>
                                                );
                                            }}
                                            onMouseEnter={(_, index) => setActiveIndexClass(index)} 
                                            onTouchStart={(_, index) => setActiveIndexClass(index)}
                                            onMouseLeave={() => setActiveIndexClass(undefined)}
                                        >
                                            {classChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none anim-fade-in select-none">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                        {activeIndexClass !== undefined ? classChartData[activeIndexClass].name : 'Total'}
                                    </span>
                                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                        {activeIndexClass !== undefined ? formatPercent(classChartData[activeIndexClass].percent, privacyMode) : formatBRL(typeData.total, privacyMode)}
                                    </span>
                                </div>
                            </div>
                         </div>
                         <div className="space-y-3">
                             {classChartData.map((item, index) => (
                                 <button key={index} onClick={() => setActiveIndexClass(index === activeIndexClass ? undefined : index)} className={`w-full p-4 rounded-2xl border flex items-center gap-4 group transition-all duration-300 ${index === activeIndexClass ? 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm" style={{ backgroundColor: item.color }}>
                                        {Math.round(item.percent)}%
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</span>
                                            <span className="text-xs font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                        </div>
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-2 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                                        </div>
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
                                    <div key={index} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 anim-stagger-item" style={{ animationDelay: `${index * 30}ms` }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border border-zinc-100 dark:border-zinc-800" style={{ color: asset.color, backgroundColor: `${asset.color}15` }}>
                                            {asset.name.substring(0,2)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{asset.name}</span>
                                                <span className="text-xs font-black text-zinc-900 dark:text-white">{formatPercent(asset.percent, privacyMode)}</span>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full rounded-full opacity-90" style={{ width: `${asset.percent}%`, backgroundColor: asset.color }}></div>
                                            </div>
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
         <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-8 px-2">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-zinc-200 dark:border-zinc-700`}><Wallet className="w-6 h-6" strokeWidth={1.5} /></div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">Proventos</h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Histórico</p>
                </div>
             </div>
             
             <div className="grid grid-cols-3 gap-3 mb-6 anim-slide-up">
                 {[
                     { label: 'Média Mensal', val: divStats.monthlyAvg, color: 'text-zinc-900 dark:text-white' },
                     { label: 'Recorde', val: divStats.maxMonthly, color: 'text-emerald-600 dark:text-emerald-400' },
                     { label: 'Total 12m', val: divStats.total12m, color: 'text-zinc-900 dark:text-white' }
                 ].map((s, i) => (
                     <div key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center shadow-sm">
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{s.label}</p>
                         <p className={`text-xs font-black ${s.color}`}>{formatBRL(s.val, privacyMode)}</p>
                     </div>
                 ))}
             </div>

             {dividendsChartData.length > 0 && (
                 <div className="mb-8 h-48 w-full bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm anim-slide-up">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dividendsChartData} onClick={handleBarClick}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomBarTooltip />} />
                            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                {dividendsChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fullDate === selectedProventosMonth ? '#10b981' : '#e4e4e7'} className="transition-colors duration-300 hover:opacity-80 dark:fill-zinc-700 dark:hover:fill-emerald-600" />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="text-[9px] text-zinc-400 text-center mt-2 font-medium">Toque nas barras para filtrar detalhes</p>
                 </div>
             )}
             
             <div className="space-y-3">
                {selectedProventosMonth ? (
                    <div className="anim-scale-in">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {new Date(selectedProventosMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </h3>
                            <button onClick={() => setSelectedProventosMonth(null)} className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                                <Filter className="w-3 h-3" /> Limpar Filtro
                            </button>
                        </div>
                        
                        {receiptsByMonth[selectedProventosMonth] ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                                {receiptsByMonth[selectedProventosMonth].map((r, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors anim-stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${r.type === 'JCP' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} dark:bg-zinc-800 dark:border-zinc-700`}>
                                                {r.ticker.substring(0,2)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-zinc-900 dark:text-white">{r.ticker}</span>
                                                    <span className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded text-zinc-500">{r.type}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-400 font-medium">Pago em {new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-zinc-900 dark:text-white block">{formatBRL(r.totalReceived, privacyMode)}</span>
                                            <span className="text-[10px] text-zinc-400 font-medium">{r.quantityOwned} un x {r.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Total do Mês</span>
                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                        {formatBRL(dividendsChartData.find(d => d.fullDate === selectedProventosMonth)?.value || 0, privacyMode)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-xs text-zinc-400 py-4">Sem dados para este mês.</p>
                        )}
                    </div>
                ) : (
                    history.map(([month, val], i) => (
                        <div key={month} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden anim-stagger-item shadow-sm" style={{ animationDelay: `${i * 30}ms` }}>
                            <button 
                                onClick={() => toggleMonthExpand(month)}
                                className="w-full flex justify-between items-center p-4 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${expandedMonth === month ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                        {expandedMonth === month ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                        {new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(val, privacyMode)}</span>
                            </button>
                            
                            {expandedMonth === month && receiptsByMonth[month] && (
                                <div className="bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 space-y-2">
                                    {receiptsByMonth[month].map((r, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-0 anim-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                <div>
                                                    <span className="text-xs font-black text-zinc-900 dark:text-white block">{r.ticker}</span>
                                                    <span className="text-[9px] text-zinc-400 font-bold uppercase">{new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">{formatBRL(r.totalReceived, privacyMode)}</span>
                                                <span className="text-[9px] text-zinc-400 font-medium">
                                                    {r.quantityOwned} un x {r.rate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
             </div>
         </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showRaioXModal} onClose={() => setShowRaioXModal(false)}>
          <div className="p-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
              <div className="flex items-center gap-4 mb-8 px-2">
                  <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-rose-500 border-zinc-200 dark:border-zinc-700`}><Target className="w-6 h-6" /></div>
                  <div>
                      <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">Raio-X</h2>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Performance</p>
                  </div>
              </div>
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl mb-6">
                  <button onClick={() => setRaioXTab('GERAL')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${raioXTab === 'GERAL' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Geral</button>
                  <button onClick={() => setRaioXTab('CLASSES')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${raioXTab === 'CLASSES' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Classes</button>
              </div>

              {raioXTab === 'GERAL' && (
                  <div className="space-y-6 anim-slide-up">
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm text-center relative overflow-hidden">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Rentabilidade Real</p>
                          <h3 className={`text-4xl font-black tracking-tighter ${realReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {realReturnPercent > 0 ? '+' : ''}{realReturnPercent.toFixed(2)}%
                          </h3>
                          <p className="text-[10px] text-zinc-400 font-medium mt-2 max-w-[200px] mx-auto flex items-center justify-center gap-1.5">
                              Retorno descontado da inflação 
                              <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-md text-[9px] font-black">IPCA {safeInflation}%</span>
                          </p>
                      </div>
                      <div className="space-y-3">
                          <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Composição do Resultado</h3>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                  <div className="mb-2 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Valorização</p>
                                  <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalAppreciation + salesGain, privacyMode)}</p>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                  <div className="mb-2 w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center"><CircleDollarSign className="w-4 h-4" /></div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Proventos</p>
                                  <p className="text-sm font-black text-zinc-900 dark:text-white">{formatBRL(totalDividendsReceived, privacyMode)}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
