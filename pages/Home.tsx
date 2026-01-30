
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, Transaction, PortfolioInsight } from '../types';
import { CircleDollarSign, PieChart as PieIcon, CalendarDays, Banknote, Wallet, Calendar, CalendarClock, Coins, ChevronDown, ChevronUp, Target, Gem, TrendingUp, ArrowUpRight, Activity, X, Filter, TrendingDown, Lightbulb, AlertTriangle, ShieldCheck, ShieldAlert, Flame, History, BarChart2, Layers, Landmark, Bot, Sparkles, Zap, MessageCircle, ScanEye, Radio, Radar, Loader2, Signal, CheckCircle2, Check, LayoutGrid, ListFilter, Trophy, ArrowRight } from 'lucide-react';
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

// Componente Visual do Radar (Animação Otimizada e Compacta)
const RadarAnimation = ({ isScanning, totalProjected, privacyMode }: { isScanning: boolean, totalProjected: number, privacyMode: boolean }) => {
    return (
        <div className="relative w-full h-40 flex items-center justify-center overflow-hidden mb-2">
            <style>{`
                @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
            `}</style>
            
            {/* Background Grid Circles (Reduzidos) */}
            <div className="absolute w-[200px] h-[200px] border border-indigo-100/50 dark:border-indigo-900/20 rounded-full"></div>
            <div className="absolute w-[140px] h-[140px] border border-indigo-200/50 dark:border-indigo-900/30 rounded-full"></div>
            <div className="absolute w-[80px] h-[80px] border border-indigo-300/50 dark:border-indigo-900/40 rounded-full"></div>
            
            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-indigo-100/50 dark:bg-indigo-900/20"></div>
            <div className="absolute h-full w-[1px] bg-indigo-100/50 dark:bg-indigo-900/20"></div>

            {/* Sweep Animation */}
            {isScanning && (
                <div 
                    className="absolute w-[200px] h-[200px] rounded-full"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(99, 102, 241, 0.2) 360deg)',
                        animation: 'radar-spin 1.5s linear infinite',
                        borderRadius: '50%'
                    }}
                ></div>
            )}

            {/* Center Core (Compacto) */}
            <div className={`relative z-10 w-24 h-24 rounded-full bg-white dark:bg-zinc-900 border-4 border-indigo-50 dark:border-zinc-800 flex flex-col items-center justify-center shadow-xl shadow-indigo-500/10 transition-all duration-500 ${isScanning ? 'scale-95' : 'scale-100'}`}>
                {isScanning ? (
                    <>
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-1" />
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Scanning</span>
                    </>
                ) : (
                    <>
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1">
                            <Target className="w-3 h-3" />
                        </div>
                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Projetado</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-white tracking-tight">{formatBRL(totalProjected, privacyMode)}</span>
                    </>
                )}
            </div>

            {/* Ping Animations (Decorativo) */}
            {!isScanning && totalProjected > 0 && (
                <>
                    <div className="absolute top-[20%] left-[30%] w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399] animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute bottom-[25%] right-[25%] w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8] animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
                </>
            )}
        </div>
    );
};

const TimelineEvent: React.FC<{ event: any, isLast: boolean }> = ({ event, isLast }) => {
    const isPrediction = event.isPrediction === true;
    const tickerDisplay = event.ticker && typeof event.ticker === 'string' ? event.ticker.substring(0,2) : '??';

    let cardClass = "";
    let iconContent = null;
    let badgeContent = null;
    let amountClass = "";
    let labelClass = "";
    let labelText = "";
    let tickerBgClass = "";

    if (isPrediction) {
        cardClass = "bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-white dark:from-indigo-900/20 dark:via-purple-900/10 dark:to-zinc-900 border-indigo-200/50 dark:border-indigo-800/50";
        amountClass = "text-indigo-600 dark:text-indigo-300";
        labelClass = "text-indigo-400 dark:text-indigo-500";
        labelText = "Valor Estimado";
        tickerBgClass = "bg-white dark:bg-zinc-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200";
        
        iconContent = (
            <div className="absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center z-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-800">
                <Radar className="w-5 h-5" />
            </div>
        );
        badgeContent = (
            <div className="absolute right-0 top-0 bg-indigo-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                <ScanEye className="w-2.5 h-2.5" /> RADAR
            </div>
        );
    } else {
        cardClass = "bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-white dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-zinc-900 border-emerald-200/50 dark:border-emerald-800/50";
        amountClass = "text-emerald-700 dark:text-emerald-400";
        labelClass = "text-emerald-600/70 dark:text-emerald-500/70";
        labelText = "Valor Líquido";
        tickerBgClass = "bg-white dark:bg-zinc-900 border-emerald-100 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200";

        iconContent = (
            <div className="absolute left-0 top-3 w-10 h-10 rounded-full flex items-center justify-center z-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-5 h-5" />
            </div>
        );
        badgeContent = (
            <div className="absolute right-0 top-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> CONFIRMADO
            </div>
        );
    }
    
    return (
        <div className={`relative pl-12 py-2.5 group anim-fade-in`}>
            {!isLast && <div className={`absolute left-[19px] top-8 bottom-[-10px] w-[2px] ${isPrediction ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}></div>}
            
            {iconContent}
            
            <div className={`p-4 rounded-2xl border flex justify-between items-center relative shadow-sm overflow-hidden ${cardClass}`}>
                {badgeContent}
                
                <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black border transition-colors ${tickerBgClass}`}>
                        {tickerDisplay}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-black tracking-tight ${isPrediction ? 'text-indigo-900 dark:text-indigo-100' : 'text-zinc-900 dark:text-white'}`}>{event.ticker}</h4>
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isPrediction ? 'bg-white/50 text-indigo-600 dark:bg-black/20 dark:text-indigo-300' : 'bg-white/50 text-emerald-600 dark:bg-black/20 dark:text-emerald-400'}`}>
                                {isPrediction ? 'Previsão' : 'Pagamento'}
                            </span>
                        </div>
                        <p className={`text-[10px] font-medium mt-0.5 flex items-center gap-1 ${labelClass}`}>
                            {event.type} • {formatDateShort(event.date)}
                        </p>
                    </div>
                </div>
                
                <div className="text-right">
                    <p className={`text-sm font-black ${amountClass}`}>
                        {event.totalReceived ? event.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : event.projectedTotal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className={`text-[9px] font-medium ${labelClass}`}>
                        {labelText}
                    </p>
                </div>
            </div>
        </div>
    );
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false, onViewAsset }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRaioXModal, setShowRaioXModal] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  const [proventosYearFilter, setProventosYearFilter] = useState<string>('12M'); // 12M, 2024, 2023...
  
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  
  // --- ROBOT / RADAR LOGIC ---
  const [robotState, setRobotState] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [agendaItems, setAgendaItems] = useState<Record<string, any[]>>({}); 
  const [agendaCount, setAgendaCount] = useState(0);
  const [agendaTotalProjected, setAgendaTotalProjected] = useState(0);

  // Efeito de "Cálculo Leve" apenas para o Card da Dashboard
  useEffect(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const count = dividendReceipts.filter(r => r.paymentDate >= todayStr || r.dateCom >= todayStr).length;
      setAgendaCount(count);
  }, [dividendReceipts]);

  // EFEITO MESTRE DO ROBÔ (SCAN INSTANTÂNEO)
  useEffect(() => {
      if (showAgendaModal && robotState === 'idle') {
          const runScan = async () => {
              setRobotState('scanning');
              setAgendaItems({});
              setAgendaTotalProjected(0);
              
              try {
                  const predictions = await fetchFutureAnnouncements(portfolio);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const allEvents: any[] = [];
                  let projectedSum = 0;

                  // 1. Processa CONFIRMADOS (Do Banco de Dados)
                  dividendReceipts.forEach(r => {
                      if (!r) return;
                      if (r.paymentDate >= todayStr) { 
                          allEvents.push({ 
                              ...r, 
                              eventType: 'payment', 
                              date: r.paymentDate,
                              isPrediction: false
                          }); 
                          projectedSum += r.totalReceived;
                      }
                      if (r.dateCom >= todayStr) {
                          allEvents.push({ 
                              ...r, 
                              eventType: 'datacom', 
                              date: r.dateCom,
                              isPrediction: false 
                          });
                      }
                  });

                  // 2. Processa PREVISÕES (Do Scraper/IA)
                  predictions.forEach(pred => {
                        const isDuplicate = allEvents.some(e => 
                            e.ticker === pred.ticker && 
                            (e.date === pred.paymentDate || e.date === pred.dateCom) &&
                            Math.abs((e.rate || 0) - pred.rate) < 0.01
                        );

                        if (!isDuplicate) {
                            if (pred.paymentDate && pred.paymentDate >= todayStr) {
                                allEvents.push({ 
                                    ticker: pred.ticker, date: pred.paymentDate, eventType: 'payment',
                                    type: pred.type, totalReceived: pred.projectedTotal, rate: pred.rate,
                                    isPrediction: true
                                });
                                projectedSum += pred.projectedTotal;
                            }
                            if (pred.dateCom && pred.dateCom >= todayStr) {
                                allEvents.push({
                                    ticker: pred.ticker, date: pred.dateCom, eventType: 'datacom',
                                    type: pred.type, isPrediction: true
                                });
                            }
                        }
                  });

                  await new Promise(r => setTimeout(r, 600));

                  setAgendaTotalProjected(projectedSum);

                  const sorted = allEvents.sort((a, b) => a.date.localeCompare(b.date));
                  const grouped: Record<string, any[]> = { 'Hoje': [], 'Amanhã': [], 'Esta Semana': [], 'Este Mês': [], 'Futuro': [] };
                  
                  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
                  const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                  const nextWeekDate = new Date(todayDate); nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                  const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);

                  sorted.forEach((ev: any) => {
                      const evDate = new Date(ev.date + 'T00:00:00');
                      if (evDate.getTime() === todayDate.getTime()) grouped['Hoje'].push(ev);
                      else if (evDate.getTime() === tomorrowDate.getTime()) grouped['Amanhã'].push(ev);
                      else if (evDate <= nextWeekDate) grouped['Esta Semana'].push(ev);
                      else if (evDate <= endOfMonth) grouped['Este Mês'].push(ev);
                      else grouped['Futuro'].push(ev);
                  });

                  Object.keys(grouped).forEach(k => {
                      if (grouped[k].length === 0) delete grouped[k];
                  });

                  setAgendaItems(grouped);

              } catch(e) {
                  console.error(e);
              } finally {
                  setRobotState('done');
              }
          };
          runScan();
      }
  }, [showAgendaModal, robotState, portfolio, dividendReceipts]);

  const handleRobotInteract = useCallback(() => {
      if (robotState === 'done') {
          setRobotState('idle'); 
      }
  }, [robotState]);

  const { typeData, classChartData, assetsChartData, sectorChartData, topConcentration } = useMemo(() => {
      let fiisTotal = 0; let stocksTotal = 0;
      const enriched = (portfolio || []).map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val; else stocksTotal += val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      const assetsChartData = enriched.sort((a,b) => b.totalValue - a.totalValue).map((a, idx) => ({ name: a.ticker, value: a.totalValue, percent: (a.totalValue / total) * 100, color: CHART_COLORS[idx % CHART_COLORS.length] }));
      const classChartData = [{ name: 'FIIs', value: fiisTotal, color: '#6366f1', percent: (fiisTotal / total) * 100 }, { name: 'Ações', value: stocksTotal, color: '#0ea5e9', percent: (stocksTotal / total) * 100 }].filter(d => d.value > 0);
      const sectorMap: Record<string, number> = {};
      enriched.forEach(p => { const s = p.segment || 'Outros'; sectorMap[s] = (sectorMap[s] || 0) + p.totalValue; });
      const sectorChartData = Object.entries(sectorMap).map(([name, value], i) => ({ name, value, percent: (value / total) * 100, color: CHART_COLORS[i % CHART_COLORS.length] })).sort((a,b) => b.value - a.value);
      const topConcentration = assetsChartData.slice(0, 3).reduce((acc, curr) => acc + curr.percent, 0);
      return { typeData: { fiis: { percent: (fiisTotal/total)*100 }, stocks: { percent: (stocksTotal/total)*100 }, total }, classChartData, assetsChartData, sectorChartData, topConcentration };
  }, [portfolio]);

  const { received, provisionedTotal, fullHistoryData, availableYears, displayedChartData, displayedReceipts, stats } = useMemo(() => {
      let receivedTotal = 0;
      let provisionedSum = 0;
      const receiptsMap: Record<string, DividendReceipt[]> = {};
      const monthlySum: Record<string, number> = {};
      
      const todayStr = new Date().toISOString().split('T')[0];

      (dividendReceipts || []).forEach(r => {
          if (r.paymentDate && r.paymentDate <= todayStr) {
              receivedTotal += r.totalReceived;
              const key = r.paymentDate.substring(0, 7); // YYYY-MM
              
              monthlySum[key] = (monthlySum[key] || 0) + r.totalReceived;
              if (!receiptsMap[key]) receiptsMap[key] = [];
              receiptsMap[key].push(r);
          } else if (r.paymentDate && r.paymentDate > todayStr) {
              provisionedSum += r.totalReceived;
          }
      });

      // Dados brutos de histórico ordenados
      const sortedKeys = Object.keys(monthlySum).sort();
      const fullHistory = sortedKeys.map(date => {
          const d = new Date(date + '-02'); 
          return {
              fullDate: date,
              name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
              value: monthlySum[date],
              year: d.getFullYear(),
              monthIndex: d.getMonth()
          };
      });

      // Anos disponíveis para filtro
      const years = Array.from(new Set(fullHistory.map(h => h.year))).sort((a,b) => b - a);

      // Filtragem por período (12M ou Ano Específico)
      let chartData: typeof fullHistory = [];
      
      if (proventosYearFilter === '12M') {
          chartData = fullHistory.slice(-12);
      } else {
          const targetYear = parseInt(proventosYearFilter);
          // Preenche meses vazios se for um ano específico para o gráfico ficar bonito (Jan-Dez)
          if (!isNaN(targetYear)) {
              for (let m = 0; m < 12; m++) {
                  const key = `${targetYear}-${String(m+1).padStart(2, '0')}`;
                  const existing = fullHistory.find(h => h.fullDate === key);
                  if (existing) {
                      chartData.push(existing);
                  } else {
                      // Mês vazio (opcional: exibir barra zerada ou pular)
                      const d = new Date(targetYear, m, 2);
                      chartData.push({
                          fullDate: key,
                          name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                          value: 0,
                          year: targetYear,
                          monthIndex: m
                      });
                  }
              }
          }
      }

      // Estatísticas do período visualizado
      const periodTotal = chartData.reduce((acc, curr) => acc + curr.value, 0);
      const activeMonths = chartData.filter(d => d.value > 0).length;
      const periodAvg = activeMonths > 0 ? periodTotal / activeMonths : 0;
      const periodMax = Math.max(...chartData.map(d => d.value), 0);

      // Lista detalhada (Se tiver mês selecionado, filtra por ele. Senão, mostra tudo do período/ano)
      let listReceipts: DividendReceipt[] = [];
      if (selectedProventosMonth) {
          listReceipts = receiptsMap[selectedProventosMonth] || [];
      } else {
          // Pega todos os recibos dos meses que estão no chartData
          const visibleMonths = new Set(chartData.map(c => c.fullDate));
          Object.keys(receiptsMap).forEach(key => {
              if (visibleMonths.has(key)) {
                  listReceipts.push(...receiptsMap[key]);
              }
          });
      }
      
      // Ordena recibos por data decrescente
      listReceipts.sort((a,b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

      return { 
          received: receivedTotal, 
          provisionedTotal: provisionedSum,
          fullHistoryData: fullHistory, // Usado para inflação
          availableYears,
          displayedChartData: chartData,
          displayedReceipts: listReceipts,
          stats: { periodTotal, periodAvg, periodMax }
      };
  }, [dividendReceipts, proventosYearFilter, selectedProventosMonth]);

  // RESTORED: Inflation Analysis Logic
  const inflationAnalysis = useMemo(() => {
      const safeInflation = Number(inflationRate) || 4.62;
      const annualInflationRate = safeInflation; 
      
      const monthlyInflationRateDecimal = Math.pow(1 + (annualInflationRate / 100), 1/12) - 1;
      
      const currentMonthlyInflationCost = invested * monthlyInflationRateDecimal;

      const total12m = fullHistoryData.slice(-12).reduce((acc, c) => acc + c.value, 0);
      const monthlyAvg12m = total12m / 12;

      const nominalYield = invested > 0 ? (total12m / invested) * 100 : 0;
      const realYieldSpread = nominalYield - annualInflationRate;
      const coverageRatio = currentMonthlyInflationCost > 0 ? (monthlyAvg12m / currentMonthlyInflationCost) * 100 : 0;

      const chartData = fullHistoryData.slice(-12).map(d => {
          return {
              ...d,
              inflationCost: invested * monthlyInflationRateDecimal, // Aproximação baseada no patrimônio atual
              netIncome: d.value - (invested * monthlyInflationRateDecimal)
          };
      });

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
          monthlyInflationRatePercent: monthlyInflationRateDecimal * 100, 
          monthlyInflationCost: currentMonthlyInflationCost,
          coverageRatio,
          chartData,
          protectedPercent
      };
  }, [invested, inflationRate, fullHistoryData, portfolio]);

  // Styles e Handlers
  const cardBaseClass = "bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 transition-all press-effect relative overflow-hidden group shadow-2xl shadow-black/5 dark:shadow-black/20";
  const hoverBorderClass = "hover:border-zinc-300 dark:hover:border-zinc-700";
  const modalHeaderIconClass = "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm";
  const toggleMonthExpand = useCallback((month: string) => setExpandedMonth(prev => prev === month ? null : month), []);
  
  const handleBarClick = useCallback((data: any) => { 
      if (data && data.activePayload && data.activePayload.length > 0) { 
          const item = data.activePayload[0].payload; 
          if (item && item.fullDate) {
              // Se clicar no mesmo mês, limpa o filtro. Se for outro, seleciona.
              setSelectedProventosMonth(prev => prev === item.fullDate ? null : item.fullDate); 
          }
      } 
  }, []);
  
  const CustomBarTooltip = ({ active, payload, label }: any) => { if (active && payload && payload.length) { const data = payload[0]; return (<div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 text-center"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label} {data.payload.year}</p><p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(data.value, privacyMode)}</p></div>); } return null; };
  
  const CustomPieTooltip = ({ active, payload }: any) => { if (active && payload && payload.length) { const data = payload[0]; return (<div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700"><p className="text-xs font-bold text-zinc-900 dark:text-white mb-1">{data.name}</p><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{formatBRL(data.value, privacyMode)} ({data.payload.percent.toFixed(1)}%)</p></div>); } return null; };

  const CustomComposedTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const income = payload.find((p: any) => p.dataKey === 'value')?.value || 0;
          const inflation = payload.find((p: any) => p.dataKey === 'inflationCost')?.value || 0;
          const real = income - inflation;
          return (
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 text-left">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</p>
                  <div className="space-y-1">
                      <div className="flex justify-between gap-4"><span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Renda</span><span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">{formatBRL(income, privacyMode)}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[10px] text-rose-500 font-bold">Custo IPCA</span><span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300">{formatBRL(inflation, privacyMode)}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-[10px] text-zinc-900 dark:text-white font-black">Ganho Real</span><span className={`text-[10px] font-mono font-black ${real >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{real > 0 ? '+' : ''}{formatBRL(real, privacyMode)}</span></div>
                  </div>
              </div>
          );
      }
      return null;
  };

  // Cálculo de ROI Total (Capital + Proventos)
  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  return (
    <div className="space-y-4 pb-8">
      {/* 1. HERO CARD PATRIMÔNIO (RENOVADO) */}
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 relative overflow-hidden group shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
            {/* Background Effects */}
            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-20%] w-48 h-48 bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Cabeçalho */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 flex items-center gap-2">
                            <Wallet className="w-3 h-3" /> Patrimônio Total
                        </p>
                        <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none">
                            {formatBRL(balance, privacyMode)}
                        </h2>
                    </div>
                    
                    {/* Badge de Rentabilidade Total */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-sm ${totalReturn >= 0 ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50/80 border-rose-100 text-rose-700 dark:bg-rose-900/20 dark:border-rose-900/30 dark:text-rose-400'}`}>
                        {totalReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-[10px] font-black">{totalReturnPercent.toFixed(2)}%</span>
                            <span className="text-[7px] font-bold opacity-70 uppercase">Retorno Real</span>
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent mb-5 opacity-50"></div>

                {/* Grid de 3 Pilares */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Custo */}
                    <div className="flex flex-col gap-1 p-2 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <Coins className="w-3 h-3" /> Custo
                        </span>
                        <span className="text-xs font-black text-zinc-900 dark:text-white truncate">
                            {formatBRL(invested, privacyMode)}
                        </span>
                    </div>

                    {/* Capital (Valorização) */}
                    <div className="flex flex-col gap-1 p-2 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l border-zinc-100 dark:border-zinc-800 pl-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Resultado
                        </span>
                        <span className={`text-xs font-black truncate ${totalAppreciation + salesGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {totalAppreciation + salesGain > 0 ? '+' : ''}{formatBRL(totalAppreciation + salesGain, privacyMode)}
                        </span>
                    </div>

                    {/* Proventos */}
                    <div className="flex flex-col gap-1 p-2 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l border-zinc-100 dark:border-zinc-800 pl-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <Banknote className="w-3 h-3" /> Proventos
                        </span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 truncate">
                            +{formatBRL(totalDividendsReceived, privacyMode)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="anim-stagger-item" style={{ animationDelay: '100ms' }}>
        <button onClick={() => setShowAgendaModal(true)} className={`w-full text-left p-5 flex justify-between items-center ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30 shadow-sm"><Radar className="w-6 h-6" strokeWidth={1.5} /></div>
                <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Radar de Proventos</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-0.5">
                        {agendaCount > 0 ? `${agendaCount} Eventos Confirmados` : 'Toque para escanear'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-500 transition-colors">
                    <Signal className="w-4 h-4" />
                </div>
            </div>
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div><div className="flex justify-between items-start mb-3"><div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30"><CircleDollarSign className="w-5 h-5" /></div></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Renda Passiva</span><p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">{formatBRL(received, privacyMode)}</p></div>
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit"><p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Média {formatBRL(stats.periodAvg, true).split('R$')[1]}</p></div>
            </div>
        </button>

        <button onClick={() => setShowRaioXModal(true)} className={`p-5 text-left flex flex-col justify-between h-44 ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div><div className="flex justify-between items-start mb-3"><div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30"><Activity className="w-5 h-5" /></div></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">IPCA+</span><p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Inflação</p></div>
                <div className="py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 w-fit"><p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Acumulado {inflationRate?.toFixed(2)}%</p></div>
            </div>
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

      {/* --- MODAL RADAR DE PROVENTOS (AGENDA) - APRIMORADO --- */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full relative overflow-hidden">
            <div className="relative z-20 flex items-center gap-4 mb-4 px-2 anim-slide-up pt-4">
                <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border-zinc-200 dark:border-zinc-700`}>
                    <Radar className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Radar</h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Monitoramento em Tempo Real</p>
                </div>
            </div>
            
            {/* Radar Animation Area Compacta */}
            <div className="anim-scale-in">
                <RadarAnimation 
                    isScanning={robotState === 'scanning'} 
                    totalProjected={agendaTotalProjected} 
                    privacyMode={privacyMode || false}
                />
            </div>

            <div className="relative z-10 pt-2 pb-32 min-h-[50vh]">
                {robotState === 'scanning' ? (
                    <div className="flex flex-col items-center justify-center pt-6 anim-fade-in opacity-50">
                        <p className="text-[10px] text-zinc-400 max-w-[200px] text-center font-medium">Buscando dados no banco e projetando eventos futuros...</p>
                    </div>
                ) : (
                    Object.keys(agendaItems).length > 0 ? (
                        Object.keys(agendaItems).map((groupKey) => { 
                            const events = agendaItems[groupKey]; 
                            return (
                                <div key={groupKey} className="mb-6 anim-slide-up">
                                    <div className="sticky top-0 z-20 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md py-2 mb-2 flex items-center gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{groupKey}</h3>
                                    </div>
                                    <div className="relative space-y-1">
                                        {events.map((e: any, i: number) => <TimelineEvent key={i} event={e} isLast={i === events.length - 1} />)}
                                    </div>
                                </div>
                            ); 
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Nada no radar</p>
                            <button onClick={handleRobotInteract} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">Forçar Re-scan</button>
                        </div>
                    )
                )}
            </div>
        </div>
      </SwipeableModal>

      {/* RESTAURADO & REFINADO: Modal de Alocação Rico */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-6 px-2 anim-slide-up pt-2">
                 <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-700`}><PieIcon className="w-6 h-6" /></div>
                 <div>
                     <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Raio-X de Diversificação</p>
                 </div>
             </div>

             {/* Métricas Modernizadas */}
             <div className="flex gap-3 mb-6 anim-slide-up">
                 <div className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Layers className="w-5 h-5" /></div>
                     <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Setores</p>
                        <p className="text-xl font-black text-zinc-900 dark:text-white leading-none">{sectorChartData.length}</p>
                     </div>
                 </div>
                 <div className={`flex-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 ${topConcentration > 50 ? 'border-amber-200 dark:border-amber-900/50' : ''}`}>
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${topConcentration > 50 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}><Target className="w-5 h-5" /></div>
                     <div>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Risco Top 3</p>
                        <p className={`text-xl font-black leading-none ${topConcentration > 50 ? 'text-amber-500' : 'text-emerald-500'}`}>{topConcentration.toFixed(0)}%</p>
                     </div>
                 </div>
             </div>

             {/* Seletor de Abas Refinado */}
             <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-2xl flex gap-1 mb-6 anim-slide-up shrink-0">
                 {['CLASS', 'SECTOR', 'ASSET'].map(t => (
                     <button key={t} onClick={() => setAllocationTab(t as any)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                        {t === 'CLASS' ? <span className="flex items-center justify-center gap-2"><LayoutGrid className="w-3 h-3" /> Classe</span> : t === 'SECTOR' ? <span className="flex items-center justify-center gap-2"><Layers className="w-3 h-3" /> Setor</span> : <span className="flex items-center justify-center gap-2"><ListFilter className="w-3 h-3" /> Ativo</span>}
                     </button>
                 ))}
             </div>

             <div className="anim-slide-up px-1 pb-10">
                 {(allocationTab === 'CLASS' || allocationTab === 'SECTOR') ? (
                     <div className="space-y-6">
                         {/* Gráfico Refinado (Donut) */}
                         <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={allocationTab === 'CLASS' ? classChartData : sectorChartData} 
                                        innerRadius={70} 
                                        outerRadius={95} 
                                        paddingAngle={4} 
                                        cornerRadius={6} 
                                        dataKey="value" 
                                        stroke="none" 
                                        isAnimationActive={true} 
                                        animationDuration={800} 
                                        onMouseEnter={(_, index) => setActiveIndexClass(index)} 
                                        onMouseLeave={() => setActiveIndexClass(undefined)}
                                    >
                                        {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke={activeIndexClass === index ? 'rgba(255,255,255,0.2)' : 'none'} strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Centro do Donut */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none anim-fade-in select-none">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{activeIndexClass !== undefined ? (allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].name : 'Total'}</span>
                                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{activeIndexClass !== undefined ? formatPercent((allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].percent, privacyMode) : formatBRL(typeData.total, privacyMode)}</span>
                            </div>
                         </div>

                         {/* Lista Estilizada */}
                         <div className="space-y-3">
                             {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((item, index) => (
                                 <div key={index} className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 flex items-center justify-between overflow-hidden shadow-sm">
                                     <div className="absolute bottom-0 left-0 h-1 bg-zinc-50 dark:bg-zinc-950 w-full">
                                         <div className="h-full rounded-r-full transition-all duration-1000 ease-out" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                                     </div>
                                     <div className="flex items-center gap-3 relative z-10">
                                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                         <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{item.name}</span>
                                     </div>
                                     <div className="text-right relative z-10">
                                         <span className="block text-sm font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                         <span className="text-[10px] font-bold text-zinc-400">{item.percent.toFixed(1)}%</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 ) : (
                    <div className="space-y-2">
                        {assetsChartData.map((asset, index) => (
                            <div key={index} className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 relative overflow-hidden shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                {/* Barra de progresso de fundo */}
                                <div className="absolute bottom-0 left-0 h-0.5 bg-zinc-100 dark:bg-zinc-950 w-full">
                                    <div className="h-full rounded-r-full opacity-80" style={{ width: `${asset.percent}%`, backgroundColor: asset.color }}></div>
                                </div>
                                
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                    {asset.name.substring(0,2)}
                                </div>
                                
                                <div className="flex-1 flex justify-between items-center relative z-10">
                                    <div>
                                        <span className="block text-xs font-bold text-zinc-900 dark:text-white">{asset.name}</span>
                                        <span className="text-[9px] font-medium text-zinc-400">{formatPercent(asset.percent, privacyMode)} da carteira</span>
                                    </div>
                                    <span className="text-xs font-black text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                                        {formatBRL(asset.value, privacyMode)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
             </div>
         </div>
      </SwipeableModal>

      {/* MODAL DE PROVENTOS REFINADO (FUNÇÕES RESTAURADAS) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => { setShowProventosModal(false); setSelectedProventosMonth(null); setExpandedMonth(null); }}>
         <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-6 px-2 anim-slide-up pt-2">
                 <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-zinc-200 dark:border-zinc-700`}>
                     <Wallet className="w-6 h-6" />
                 </div>
                 <div>
                     <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Proventos</h2>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Histórico de Pagamentos</p>
                 </div>
             </div>

             {/* Cards de Resumo Dinâmicos */}
             <div className="grid grid-cols-2 gap-3 mb-6 anim-slide-up">
                 <div className="col-span-2 bg-emerald-500 p-5 rounded-[2rem] text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                     <div className="relative z-10 flex justify-between items-end">
                         <div>
                             <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Total no Período</p>
                             <h3 className="text-3xl font-black tracking-tight">{formatBRL(stats.periodTotal, privacyMode)}</h3>
                         </div>
                         <div className="text-right">
                             <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Média Mensal</p>
                             <p className="text-lg font-black">{formatBRL(stats.periodAvg, privacyMode)}</p>
                         </div>
                     </div>
                 </div>
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500" /> Recorde</p>
                     <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(stats.periodMax, privacyMode)}</p>
                 </div>
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CalendarClock className="w-3 h-3 text-indigo-500" /> Previsão</p>
                     <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(provisionedTotal, privacyMode)}</p>
                 </div>
             </div>

             {/* Filtro de Ano (Chips Scrollable) */}
             <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 px-1 anim-slide-up">
                 <button 
                     onClick={() => { setProventosYearFilter('12M'); setSelectedProventosMonth(null); }}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${proventosYearFilter === '12M' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                 >
                     Últimos 12 Meses
                 </button>
                 {availableYears.map(year => (
                     <button 
                         key={year}
                         onClick={() => { setProventosYearFilter(String(year)); setSelectedProventosMonth(null); }}
                         className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${proventosYearFilter === String(year) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                     >
                         {year}
                     </button>
                 ))}
             </div>

             <div className="mb-8 h-56 w-full bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm anim-slide-up relative">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 absolute top-4 left-5">Evolução</h3>
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={displayedChartData} onClick={handleBarClick} margin={{ top: 25, right: 0, left: -20, bottom: 0 }}>
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} interval={0} />
                         <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomBarTooltip />} />
                         <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                             {displayedChartData.map((entry, index) => (
                                 <Cell 
                                     key={`cell-${index}`} 
                                     fill={entry.fullDate === selectedProventosMonth ? '#10b981' : '#e4e4e7'} 
                                     className="transition-all duration-300 hover:opacity-80 dark:fill-zinc-700 dark:hover:fill-emerald-600 cursor-pointer" 
                                 />
                             ))}
                         </Bar>
                     </BarChart>
                 </ResponsiveContainer>
                 {selectedProventosMonth && (
                     <button 
                        onClick={() => setSelectedProventosMonth(null)} 
                        className="absolute top-3 right-3 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                     >
                         <X className="w-3 h-3" />
                     </button>
                 )}
             </div>

             <div className="space-y-4 pb-10 anim-slide-up">
                 <div className="flex items-center justify-between px-2">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                         {selectedProventosMonth 
                             ? `Detalhes de ${new Date(selectedProventosMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}` 
                             : 'Todos os Lançamentos'}
                     </h3>
                     <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">{displayedReceipts.length}</span>
                 </div>

                 {displayedReceipts.length > 0 ? (
                     <div className="space-y-2">
                         {displayedReceipts.map((r, idx) => {
                             const isFII = r.assetType === AssetType.FII;
                             return (
                                 <div key={idx} className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border shadow-sm ${isFII ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30' : 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30'}`}>
                                             {r.ticker.substring(0, 2)}
                                         </div>
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 <span className="font-bold text-sm text-zinc-900 dark:text-white">{r.ticker}</span>
                                                 <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded">{r.type}</span>
                                             </div>
                                             <p className="text-[10px] font-medium text-zinc-400">
                                                 Pago em {new Date(r.paymentDate).toLocaleDateString('pt-BR')}
                                             </p>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatBRL(r.totalReceived, privacyMode)}</p>
                                         <p className="text-[9px] font-bold text-zinc-400">Qtd: {r.quantityOwned}</p>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 ) : (
                     <div className="text-center py-10 opacity-50">
                         <p className="text-xs font-bold text-zinc-500">Nenhum provento neste período.</p>
                     </div>
                 )}
             </div>
         </div>
      </SwipeableModal>

      {/* RESTAURADO: Modal IPCA+ Rico */}
      <SwipeableModal isOpen={showRaioXModal} onClose={() => setShowRaioXModal(false)}>
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

                  {/* Card: Patrimônio Protegido */}
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
                      </h3>
                      <ResponsiveContainer width="100%" height="85%">
                          <ComposedChart data={inflationAnalysis.chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.2} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                              <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomComposedTooltip />} />
                              <Area type="monotone" dataKey="inflationCost" fill="#f43f5e" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0.05} />
                              <Line type="monotone" dataKey="inflationCost" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                              <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={12}>
                                  {inflationAnalysis.chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.value >= entry.inflationCost ? '#10b981' : '#fbbf24'} />
                                  ))}
                              </Bar>
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
