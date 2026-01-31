
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AssetPosition, DividendReceipt, AssetType, Transaction, PortfolioInsight } from '../types';
import { CircleDollarSign, PieChart as PieIcon, CalendarDays, Banknote, Wallet, Calendar, CalendarClock, Coins, ChevronDown, ChevronUp, Target, Gem, TrendingUp, ArrowUpRight, Activity, X, Filter, TrendingDown, Lightbulb, AlertTriangle, ShieldCheck, ShieldAlert, Flame, History, BarChart2, Layers, Landmark, Bot, Sparkles, Zap, MessageCircle, ScanEye, Radio, Radar, Loader2, Signal, CheckCircle2, Check, LayoutGrid, ListFilter, Trophy, ArrowRight, Megaphone, Clock, Building2, Briefcase, Cloud, RefreshCw, BrainCircuit, Wand2 } from 'lucide-react';
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

interface HistoryItem {
    fullDate: string;
    name: string;
    value: number;
    year: number;
    monthIndex: number;
}

interface RadarEvent {
    id: string;
    ticker: string;
    type: string;
    eventType: 'PAYMENT' | 'DATACOM';
    status: 'CONFIRMED';
    date: string;
    amount: number;
    rate: number;
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

const AgendaItem: React.FC<{ event: RadarEvent, isLast: boolean, privacyMode: boolean }> = ({ event, isLast, privacyMode }) => {
    const isDatacom = event.eventType === 'DATACOM';
    const statusColor = 'bg-emerald-500';
    const typeLabel = event.type || (isDatacom ? 'DATACOM' : 'PROVENTO');

    return (
        <div className="flex gap-4 relative group">
            <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">{new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">{event.date.split('-')[2]}</span>
                {!isLast && <div className="w-px h-full bg-zinc-200 dark:bg-zinc-800 my-2"></div>}
            </div>

            <div className="flex-1 pb-6">
                <div className="p-4 rounded-2xl border transition-all bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{event.ticker}</span>
                            <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 uppercase">{typeLabel}</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                            Confirmado
                        </span>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            {isDatacom ? (
                                <p className="text-xs font-medium text-zinc-500">Data de Corte (Data Com)</p>
                            ) : (
                                <p className="text-[10px] text-zinc-400">
                                    Pagamento em {formatDateShort(event.date)}
                                </p>
                            )}
                        </div>
                        {!isDatacom && (
                            <div className="text-right">
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {formatBRL(event.amount, privacyMode)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false, onViewAsset }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  const [proventosYearFilter, setProventosYearFilter] = useState<string>('12M'); 
  
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  
  const [radarData, setRadarData] = useState<{
      events: RadarEvent[];
      summary: { count: number; total: number; confirmed: number };
      grouped: Record<string, RadarEvent[]>;
      loading: boolean;
      scanStatus: string; 
  }>(() => {
      try {
          const saved = localStorage.getItem('investfiis_radar_cache_v4'); 
          if (saved) {
              const parsed = JSON.parse(saved);
              const age = Date.now() - (parsed.timestamp || 0);
              if (age < 4 * 3600 * 1000) {
                  return { ...parsed.data, loading: false, scanStatus: '' };
              }
          }
      } catch {}
      return { events: [], summary: { count: 0, total: 0, confirmed: 0 }, grouped: {}, loading: true, scanStatus: '' };
  });

  const [triggerRadar, setTriggerRadar] = useState(false);

  useEffect(() => {
      let isActive = true;
      const loadRadar = async () => {
          if (triggerRadar || radarData.events.length === 0) {
              setRadarData(prev => ({ ...prev, loading: true, scanStatus: 'Buscando dados...' }));
          }
          
          try {
              // Busca dados "oficiais" do robô (que consulta o Supabase)
              // O robô já filtra por data >= ontem, então traz eventos futuros/recentes.
              const futureAnnouncements = await fetchFutureAnnouncements(portfolio);
              if (!isActive) return;

              const todayStr = new Date().toISOString().split('T')[0];
              const atomEvents: RadarEvent[] = [];
              const seenKeys = new Set<string>(); // Chave única para deduplicação rígida

              // Função auxiliar para gerar chave única do evento
              const getEventKey = (ticker: string, date: string, rate: number, evtType: string) => {
                  return `${ticker}-${evtType}-${date}-${rate.toFixed(4)}`;
              };

              // 1. Processa dados retornados pelo Robô (Prioritários para Agenda)
              futureAnnouncements.forEach(p => {
                  if (p.paymentDate && p.paymentDate >= todayStr) {
                      const key = getEventKey(p.ticker, p.paymentDate, p.rate, 'PAYMENT');
                      if (!seenKeys.has(key)) {
                          atomEvents.push({
                              id: `robot-pay-${key}`,
                              ticker: p.ticker,
                              type: p.type,
                              eventType: 'PAYMENT',
                              status: 'CONFIRMED',
                              date: p.paymentDate,
                              amount: p.projectedTotal,
                              rate: p.rate
                          });
                          seenKeys.add(key);
                      }
                  }

                  if (p.dateCom && p.dateCom >= todayStr) {
                      const key = getEventKey(p.ticker, p.dateCom, p.rate, 'DATACOM');
                      if (!seenKeys.has(key)) {
                          atomEvents.push({
                              id: `robot-com-${key}`,
                              ticker: p.ticker,
                              type: p.type,
                              eventType: 'DATACOM',
                              status: 'CONFIRMED',
                              date: p.dateCom,
                              amount: 0,
                              rate: p.rate
                          });
                          seenKeys.add(key);
                      }
                  }
              });

              // 2. Processa dividendReceipts locais (Histórico/Cache Local)
              // Serve como fallback caso o robô falhe ou o App.tsx tenha dados mais frescos de cache
              dividendReceipts.forEach(r => {
                  if (r.paymentDate && r.paymentDate >= todayStr) {
                      const key = getEventKey(r.ticker, r.paymentDate, r.rate, 'PAYMENT');
                      if (!seenKeys.has(key)) {
                          atomEvents.push({
                              id: `local-pay-${key}`,
                              ticker: r.ticker,
                              type: r.type,
                              eventType: 'PAYMENT',
                              status: 'CONFIRMED',
                              date: r.paymentDate,
                              amount: r.totalReceived,
                              rate: r.rate
                          });
                          seenKeys.add(key);
                      }
                  }
                  if (r.dateCom && r.dateCom >= todayStr) {
                      const key = getEventKey(r.ticker, r.dateCom, r.rate, 'DATACOM');
                      if (!seenKeys.has(key)) {
                          atomEvents.push({
                              id: `local-com-${key}`,
                              ticker: r.ticker,
                              type: r.type,
                              eventType: 'DATACOM',
                              status: 'CONFIRMED',
                              date: r.dateCom,
                              amount: 0, 
                              rate: r.rate
                          });
                          seenKeys.add(key);
                      }
                  }
              });

              atomEvents.sort((a, b) => a.date.localeCompare(b.date));

              let sumConfirmed = 0;
              atomEvents.forEach(e => {
                  if (e.eventType === 'PAYMENT' && e.status === 'CONFIRMED') {
                      sumConfirmed += (e.amount || 0);
                  }
              });

              const grouped: Record<string, RadarEvent[]> = {};
              
              atomEvents.forEach((ev) => {
                  const date = new Date(ev.date + 'T00:00:00');
                  const key = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  const keyCap = key.charAt(0).toUpperCase() + key.slice(1);
                  
                  if (!grouped[keyCap]) grouped[keyCap] = [];
                  grouped[keyCap].push(ev);
              });

              const newData = {
                  events: atomEvents,
                  summary: { 
                      count: atomEvents.length, 
                      total: sumConfirmed,
                      confirmed: sumConfirmed
                  },
                  grouped,
                  loading: false,
                  scanStatus: ''
              };

              setRadarData(newData);
              
              localStorage.setItem('investfiis_radar_cache_v4', JSON.stringify({
                  timestamp: Date.now(),
                  data: newData
              }));

          } catch (e) {
              console.error(e);
              if (isActive) setRadarData(prev => ({ ...prev, loading: false, scanStatus: 'Erro na busca' }));
          }
      };

      if (radarData.events.length === 0 || triggerRadar) {
          loadRadar();
      }
      
      return () => { isActive = false; };
  }, [portfolio, dividendReceipts, triggerRadar]);

  const handleRefreshAgenda = useCallback(() => {
      setTriggerRadar(true);
      setTimeout(() => setTriggerRadar(false), 500); // Reset trigger
  }, []);

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

  const { received, fullHistoryData, availableYears, displayedChartData, displayedReceipts, stats, splitData, last6MonthsData } = useMemo(() => {
      let receivedTotal = 0;
      const receiptsMap: Record<string, DividendReceipt[]> = {};
      const monthlySum: Record<string, number> = {};
      
      const todayStr = new Date().toISOString().split('T')[0];

      (dividendReceipts || []).forEach(r => {
          if (r.paymentDate && r.paymentDate <= todayStr) {
              receivedTotal += r.totalReceived;
              const key = r.paymentDate.substring(0, 7); 
              
              monthlySum[key] = (monthlySum[key] || 0) + r.totalReceived;
              if (!receiptsMap[key]) receiptsMap[key] = [];
              receiptsMap[key].push(r);
          }
      });

      const sortedKeys = Object.keys(monthlySum).sort();
      const fullHistory: HistoryItem[] = sortedKeys.map(date => {
          const d = new Date(date + '-02'); 
          return {
              fullDate: date,
              name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
              value: monthlySum[date],
              year: d.getFullYear(),
              monthIndex: d.getMonth()
          };
      });

      const last6Months = fullHistory.slice(-6);
      const last6MonthsData = [...last6Months];
      while(last6MonthsData.length < 6) {
          last6MonthsData.unshift({ fullDate: '', name: '', value: 0, year: 0, monthIndex: 0 });
      }
      const maxIn6 = Math.max(...last6MonthsData.map(d => d.value), 1);
      const normalized6 = last6MonthsData.map(d => ({ ...d, height: (d.value / maxIn6) * 100 }));

      const years = Array.from(new Set(fullHistory.map(h => h.year))).sort((a,b) => b - a);

      let chartData: HistoryItem[] = [];
      if (proventosYearFilter === '12M') {
          chartData = fullHistory.slice(-12);
      } else {
          const targetYear = parseInt(proventosYearFilter);
          if (!isNaN(targetYear)) {
              for (let m = 0; m < 12; m++) {
                  const key = `${targetYear}-${String(m+1).padStart(2, '0')}`;
                  const existing = fullHistory.find(h => h.fullDate === key);
                  if (existing) {
                      chartData.push(existing);
                  } else {
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

      const periodTotal = chartData.reduce((acc: number, curr: HistoryItem) => acc + curr.value, 0);
      const activeMonths = chartData.filter(d => d.value > 0).length;
      const periodAvg = activeMonths > 0 ? periodTotal / activeMonths : 0;
      const periodMax = Math.max(...chartData.map(d => d.value), 0);

      let listReceipts: DividendReceipt[] = [];
      if (selectedProventosMonth) {
          listReceipts = receiptsMap[selectedProventosMonth] || [];
      } else {
          const visibleMonths = new Set(chartData.map(c => c.fullDate));
          Object.keys(receiptsMap).forEach(key => {
              if (visibleMonths.has(key)) {
                  listReceipts.push(...receiptsMap[key]);
              }
          });
      }
      listReceipts.sort((a,b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

      let splitFII = 0;
      let splitStock = 0;
      listReceipts.forEach(r => {
          if (r.assetType === AssetType.FII) splitFII += r.totalReceived;
          else splitStock += r.totalReceived;
      });
      const splitTotal = splitFII + splitStock || 1;

      return { 
          received: receivedTotal, 
          fullHistoryData: fullHistory, 
          availableYears: years,
          displayedChartData: chartData,
          displayedReceipts: listReceipts,
          stats: { periodTotal, periodAvg, periodMax },
          splitData: { fii: splitFII, stock: splitStock, fiiPct: (splitFII/splitTotal)*100, stockPct: (splitStock/splitTotal)*100 },
          last6MonthsData: normalized6
      };
  }, [dividendReceipts, proventosYearFilter, selectedProventosMonth]);

  const cardBaseClass = "bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 transition-all press-effect relative overflow-hidden group shadow-2xl shadow-black/5 dark:shadow-black/20";
  const hoverBorderClass = "hover:border-zinc-300 dark:hover:border-zinc-700";
  const modalHeaderIconClass = "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm";
  
  const handleBarClick = useCallback((data: any) => { 
      if (data && data.activePayload && data.activePayload.length > 0) { 
          const item = data.activePayload[0].payload; 
          if (item && item.fullDate) {
              setSelectedProventosMonth(prev => prev === item.fullDate ? null : item.fullDate); 
          }
      } 
  }, []);
  
  const CustomBarTooltip = ({ active, payload, label }: any) => { if (active && payload && payload.length) { const data = payload[0]; return (<div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 text-center"><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label} {data.payload.year}</p><p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatBRL(data.value, privacyMode)}</p></div>); } return null; };
  
  const CustomPieTooltip = ({ active, payload }: any) => { if (active && payload && payload.length) { const data = payload[0]; return (<div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700"><p className="text-xs font-bold text-zinc-900 dark:text-white mb-1">{data.name}</p><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{formatBRL(data.value, privacyMode)} ({data.payload.percent.toFixed(1)}%)</p></div>); } return null; };

  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  return (
    <div className="space-y-4 pb-8">
      <div className="anim-stagger-item" style={{ animationDelay: '0ms' }}>
        <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-6 relative overflow-hidden group shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-20%] w-48 h-48 bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1 flex items-center gap-2">
                            <Wallet className="w-3 h-3" /> Patrimônio Total
                        </p>
                        <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter tabular-nums leading-none">
                            {formatBRL(balance, privacyMode)}
                        </h2>
                    </div>
                    
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-sm ${totalReturn >= 0 ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400' : 'bg-rose-50/80 border-rose-100 text-rose-700 dark:bg-rose-900/20 dark:border-rose-900/30 dark:text-rose-400'}`}>
                        {totalReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-[10px] font-black">{totalReturnPercent.toFixed(2)}%</span>
                            <span className="text-[7px] font-bold opacity-70 uppercase">Retorno Real</span>
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent mb-5 opacity-50"></div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1 p-2 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <Coins className="w-3 h-3" /> Custo
                        </span>
                        <span className="text-xs font-black text-zinc-900 dark:text-white truncate">
                            {formatBRL(invested, privacyMode)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 p-2 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l border-zinc-100 dark:border-zinc-800 pl-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Resultado
                        </span>
                        <span className={`text-xs font-black truncate ${totalAppreciation + salesGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {totalAppreciation + salesGain > 0 ? '+' : ''}{formatBRL(totalAppreciation + salesGain, privacyMode)}
                        </span>
                    </div>

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
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30 shadow-sm">
                    <CalendarClock className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Agenda de Proventos</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        {radarData.loading ? (
                            <span className="text-[10px] font-bold text-zinc-400 animate-pulse">{radarData.scanStatus || 'Atualizando...'}</span>
                        ) : (
                            <>
                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                    {radarData.summary.count > 0 ? `${radarData.summary.count} Eventos` : 'Sem eventos próximos'}
                                </span>
                                {radarData.summary.total > 0 && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatBRL(radarData.summary.total, privacyMode)}
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
                <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-500 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>
        </button>
      </div>
      
      <div className="anim-stagger-item" style={{ animationDelay: '200ms' }}>
        <button onClick={() => setShowProventosModal(true)} className={`w-full text-left p-5 flex justify-between items-center ${cardBaseClass} ${hoverBorderClass}`}>
            <div className="flex items-center gap-4 relative z-10 w-full justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/30 shadow-sm">
                        <CircleDollarSign className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Renda Passiva</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Total: {formatBRL(received, privacyMode)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-end gap-1 h-8 opacity-70">
                    {last6MonthsData.map((d, i) => (
                        <div 
                            key={i} 
                            className="w-1.5 rounded-t-sm bg-emerald-300 dark:bg-emerald-800"
                            style={{ height: `${Math.max(d.height, 10)}%` }}
                        ></div>
                    ))}
                </div>
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

      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
            <div className="flex justify-between items-center mb-6 pt-4">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                    <p className="text-xs text-zinc-500 font-medium">Próximos eventos confirmados</p>
                </div>
                <button onClick={handleRefreshAgenda} disabled={radarData.loading} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors press-effect border border-zinc-200 dark:border-zinc-700">
                    <RefreshCw className={`w-4 h-4 ${radarData.loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8 anim-scale-in">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Confirmado</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        {formatBRL(radarData.summary.confirmed, privacyMode)}
                    </p>
                </div>
            </div>

            <div className="space-y-8 pb-24">
                {radarData.loading && radarData.events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                        <p className="text-xs text-zinc-500 font-bold">Atualizando agenda...</p>
                    </div>
                ) : (
                    Object.keys(radarData.grouped).length > 0 ? (
                        Object.keys(radarData.grouped).map((groupKey, groupIndex) => { 
                            const events = radarData.grouped[groupKey]; 
                            return (
                                <div key={groupKey} className="anim-slide-up" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                                    <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-4 sticky top-0 bg-zinc-50 dark:bg-zinc-950 py-2 z-10">
                                        {groupKey}
                                    </h3>
                                    <div className="space-y-0">
                                        {events.map((e, i) => (
                                            <AgendaItem 
                                                key={e.id} 
                                                event={e} 
                                                isLast={i === events.length - 1} 
                                                privacyMode={privacyMode || false} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            ); 
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Calendar className="w-12 h-12 text-zinc-300 mb-3" strokeWidth={1} />
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Agenda vazia</p>
                        </div>
                    )
                )}
            </div>
        </div>
      </SwipeableModal>

      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             <div className="flex items-center gap-4 mb-6 px-2 anim-slide-up pt-2">
                 <div className={`${modalHeaderIconClass} bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-700`}><PieIcon className="w-6 h-6" /></div>
                 <div>
                     <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Raio-X de Diversificação</p>
                 </div>
             </div>

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
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none anim-fade-in select-none">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{activeIndexClass !== undefined ? (allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].name : 'Total'}</span>
                                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{activeIndexClass !== undefined ? formatPercent((allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].percent, privacyMode) : formatBRL(typeData.total, privacyMode)}</span>
                            </div>
                         </div>

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

      <SwipeableModal isOpen={showProventosModal} onClose={() => { setShowProventosModal(false); setSelectedProventosMonth(null); }}>
         <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
             
             <div className="flex flex-col pt-6 pb-2 px-2 anim-slide-up">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Total em Proventos</p>
                 <div className="flex items-baseline justify-between">
                     <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                         {selectedProventosMonth ? formatBRL(displayedChartData.find(d => d.fullDate === selectedProventosMonth)?.value || 0, privacyMode) : formatBRL(stats.periodTotal, privacyMode)}
                     </h2>
                     <div className="flex gap-1 overflow-x-auto no-scrollbar">
                         {availableYears.map((year: number) => (
                             <button 
                                 key={year}
                                 onClick={() => { setProventosYearFilter(String(year)); setSelectedProventosMonth(null); }}
                                 className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors ${proventosYearFilter === String(year) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                             >
                                 {year}
                             </button>
                         ))}
                         <button 
                             onClick={() => { setProventosYearFilter('12M'); setSelectedProventosMonth(null); }}
                             className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors ${proventosYearFilter === '12M' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                         >
                             12M
                         </button>
                     </div>
                 </div>
                 <div className="flex gap-4 mt-2 text-[10px] font-medium text-zinc-500">
                     <span>FIIs: {Math.round(splitData.fiiPct)}%</span>
                     <span>Ações: {Math.round(splitData.stockPct)}%</span>
                     <span>Média: {formatBRL(stats.periodAvg, privacyMode)}</span>
                 </div>
             </div>

             <div className="h-48 w-full mt-6 mb-8 anim-slide-up" style={{ animationDelay: '100ms' }}>
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={displayedChartData} onClick={handleBarClick} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} interval={0} />
                         <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomBarTooltip />} />
                         <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                             {displayedChartData.map((entry: HistoryItem, index: number) => (
                                 <Cell 
                                     key={`cell-${index}`} 
                                     fill={entry.fullDate === selectedProventosMonth ? '#10b981' : '#e4e4e7'} 
                                     className="transition-all duration-300 hover:opacity-80 dark:fill-zinc-800 dark:hover:fill-emerald-600 cursor-pointer" 
                                 />
                             ))}
                         </Bar>
                     </BarChart>
                 </ResponsiveContainer>
                 {selectedProventosMonth && (
                     <button onClick={() => setSelectedProventosMonth(null)} className="absolute top-0 right-0 p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                         <X className="w-4 h-4" />
                     </button>
                 )}
             </div>

             <div className="space-y-4 pb-10 anim-slide-up" style={{ animationDelay: '200ms' }}>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2 mb-2">
                     {selectedProventosMonth 
                         ? `Extrato de ${new Date(selectedProventosMonth + '-02').toLocaleDateString('pt-BR', { month: 'long' })}` 
                         : 'Todos os Lançamentos'}
                 </h3>

                 {displayedReceipts.length > 0 ? (
                     <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-2 shadow-sm border border-zinc-100 dark:border-zinc-800">
                         {displayedReceipts.map((r: DividendReceipt, idx: number) => {
                             return (
                                 <div key={idx} className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 dark:text-zinc-400">
                                             {r.ticker.substring(0, 2)}
                                         </div>
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 <span className="font-bold text-sm text-zinc-900 dark:text-white">{r.ticker}</span>
                                             </div>
                                             <p className="text-[10px] font-medium text-zinc-400">
                                                 {new Date(r.paymentDate).toLocaleDateString('pt-BR')} • {r.type}
                                             </p>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatBRL(r.totalReceived, privacyMode)}</p>
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
    </div>
  );
};

export const Home = React.memo(HomeComponent);
