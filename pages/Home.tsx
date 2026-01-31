
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

// Interface auxiliar para os dados do gráfico
interface HistoryItem {
    fullDate: string;
    name: string;
    value: number;
    year: number;
    monthIndex: number;
}

// Interface Unificada de Evento do Radar
interface RadarEvent {
    id: string;
    ticker: string;
    type: string;
    eventType: 'PAYMENT' | 'DATACOM';
    status: 'CONFIRMED' | 'PREDICTED';
    date: string;
    amount: number;
    rate: number;
    isAiPrediction?: boolean;
    confidence?: 'ALTA' | 'MEDIA' | 'BAIXA';
    reasoning?: string;
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

// Componente de Item da Agenda (Minimalista)
const AgendaItem: React.FC<{ event: RadarEvent, isLast: boolean, privacyMode: boolean }> = ({ event, isLast, privacyMode }) => {
    const isDatacom = event.eventType === 'DATACOM';
    const isConfirmed = event.status === 'CONFIRMED';
    
    // Cores baseadas no status
    const statusColor = isConfirmed ? 'bg-emerald-500' : 'bg-indigo-400';
    const amountColor = isConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400';

    return (
        <div className="flex gap-4 relative group">
            {/* Linha do Tempo */}
            <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">{new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">{event.date.split('-')[2]}</span>
                {!isLast && <div className="w-px h-full bg-zinc-200 dark:bg-zinc-800 my-2"></div>}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-6">
                <div className={`p-4 rounded-2xl border transition-all ${isConfirmed ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800' : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 border-dashed'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                            <span className="text-sm font-black text-zinc-900 dark:text-white">{event.ticker}</span>
                            <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 uppercase">{event.type}</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isConfirmed ? 'text-emerald-500' : 'text-indigo-400'}`}>
                            {isConfirmed ? 'Confirmado' : 'Previsto'}
                        </span>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            {isDatacom ? (
                                <p className="text-xs font-medium text-zinc-500">Data de Corte (Data Com)</p>
                            ) : (
                                <p className="text-[10px] text-zinc-400">
                                    {event.isAiPrediction ? 'Estimativa baseada em histórico' : 'Pagamento agendado'}
                                </p>
                            )}
                        </div>
                        {!isDatacom && (
                            <div className="text-right">
                                <span className={`text-sm font-black ${amountColor}`}>
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

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, isAiLoading = false, inflationRate, invested, balance, totalAppreciation, transactions = [], privacyMode = false, onViewAsset }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  
  const [selectedProventosMonth, setSelectedProventosMonth] = useState<string | null>(null);
  const [proventosYearFilter, setProventosYearFilter] = useState<string>('12M'); // 12M, 2024, 2023...
  
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'ASSET' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);
  
  // --- STATE UNIFICADO DO RADAR (C/ PERSISTÊNCIA LOCAL) ---
  const [radarData, setRadarData] = useState<{
      events: RadarEvent[];
      summary: { count: number; total: number; confirmed: number; estimated: number };
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
      return { events: [], summary: { count: 0, total: 0, confirmed: 0, estimated: 0 }, grouped: {}, loading: true, scanStatus: '' };
  });

  const [triggerRadar, setTriggerRadar] = useState({ active: false, useAI: false });

  // EFEITO MESTRE: Calcula Radar (Unificado)
  useEffect(() => {
      let isActive = true;
      const loadRadar = async () => {
          const useAI = triggerRadar.useAI;
          
          if (triggerRadar.active || radarData.events.length === 0) {
              setRadarData(prev => ({ ...prev, loading: true, scanStatus: useAI ? 'Atualizando...' : 'Buscando dados...' }));
          }
          
          try {
              // 1. Busca Previsões (Supabase + IA se solicitado)
              const predictions = await fetchFutureAnnouncements(portfolio, useAI);
              if (!isActive) return;

              const todayStr = new Date().toISOString().split('T')[0];
              const atomEvents: RadarEvent[] = [];
              
              const isDuplicate = (ticker: string, type: string, date: string, rate: number, evtType: string) => {
                  return atomEvents.some(e => 
                      e.ticker === ticker && 
                      e.eventType === evtType &&
                      e.date === date &&
                      Math.abs(e.rate - rate) < 0.001
                  );
              };

              // A. Processa Recibos do Banco (CONFIRMED) - Dados da carteira local/cache
              dividendReceipts.forEach(r => {
                  // Evento de Pagamento
                  if (r.paymentDate && r.paymentDate >= todayStr) {
                      atomEvents.push({
                          id: `db-pay-${r.id}`,
                          ticker: r.ticker,
                          type: r.type,
                          eventType: 'PAYMENT',
                          status: 'CONFIRMED',
                          date: r.paymentDate,
                          amount: r.totalReceived,
                          rate: r.rate,
                          isAiPrediction: false
                      });
                  }
                  // Evento de Datacom
                  if (r.dateCom && r.dateCom >= todayStr) {
                      atomEvents.push({
                          id: `db-com-${r.id}`,
                          ticker: r.ticker,
                          type: r.type,
                          eventType: 'DATACOM',
                          status: 'CONFIRMED',
                          date: r.dateCom,
                          amount: 0, 
                          rate: r.rate,
                          isAiPrediction: false
                      });
                  }
              });

              // B. Processa Previsões (PREDICTED) - Dados da Nuvem + IA
              predictions.forEach(p => {
                  // Pagamento Previsto
                  if (p.paymentDate && p.paymentDate >= todayStr) {
                      if (!isDuplicate(p.ticker, p.type, p.paymentDate, p.rate, 'PAYMENT')) {
                          atomEvents.push({
                              id: `pred-pay-${p.ticker}-${p.paymentDate}`,
                              ticker: p.ticker,
                              type: p.type,
                              eventType: 'PAYMENT',
                              status: 'PREDICTED',
                              date: p.paymentDate,
                              amount: p.projectedTotal,
                              rate: p.rate,
                              isAiPrediction: p.isAiPrediction,
                              confidence: p.confidence,
                              reasoning: p.reasoning
                          });
                      }
                  }

                  // Datacom Prevista
                  if (p.dateCom && p.dateCom >= todayStr) {
                      if (!isDuplicate(p.ticker, p.type, p.dateCom, p.rate, 'DATACOM')) {
                          atomEvents.push({
                              id: `pred-com-${p.ticker}-${p.dateCom}`,
                              ticker: p.ticker,
                              type: p.type,
                              eventType: 'DATACOM',
                              status: 'PREDICTED',
                              date: p.dateCom,
                              amount: 0,
                              rate: p.rate,
                              isAiPrediction: p.isAiPrediction,
                              confidence: p.confidence
                          });
                      }
                  }
              });

              // Ordenação Cronológica
              atomEvents.sort((a, b) => a.date.localeCompare(b.date));

              // Cálculo de Totais
              let sumConfirmed = 0;
              let sumEstimated = 0;

              atomEvents.forEach(e => {
                  if (e.eventType === 'PAYMENT') {
                      if (e.status === 'CONFIRMED') sumConfirmed += (e.amount || 0);
                      else sumEstimated += (e.amount || 0);
                  }
              });

              // Agrupamento para o Modal (Por Mês Extenso)
              const grouped: Record<string, RadarEvent[]> = {};
              
              atomEvents.forEach((ev) => {
                  const date = new Date(ev.date + 'T00:00:00');
                  const key = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  // Capitalize
                  const keyCap = key.charAt(0).toUpperCase() + key.slice(1);
                  
                  if (!grouped[keyCap]) grouped[keyCap] = [];
                  grouped[keyCap].push(ev);
              });

              const newData = {
                  events: atomEvents,
                  summary: { 
                      count: atomEvents.length, 
                      total: sumConfirmed + sumEstimated,
                      confirmed: sumConfirmed,
                      estimated: sumEstimated
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

      if (radarData.events.length === 0 || triggerRadar.active) {
          loadRadar();
      }
      
      return () => { isActive = false; };
  }, [portfolio, dividendReceipts, triggerRadar]);

  const handleRefreshAgenda = useCallback(() => {
      setTriggerRadar({ active: true, useAI: true });
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
              const key = r.paymentDate.substring(0, 7); // YYYY-MM
              
              monthlySum[key] = (monthlySum[key] || 0) + r.totalReceived;
              if (!receiptsMap[key]) receiptsMap[key] = [];
              receiptsMap[key].push(r);
          }
      });

      // Dados brutos de histórico ordenados
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

      // Últimos 6 meses para o Mini Gráfico do Card
      const last6Months = fullHistory.slice(-6);
      // Preencher com meses vazios se tiver menos de 6
      const last6MonthsData = [...last6Months];
      while(last6MonthsData.length < 6) {
          last6MonthsData.unshift({ fullDate: '', name: '', value: 0, year: 0, monthIndex: 0 });
      }
      // Calcular percentual relativo ao máximo para desenhar as barrinhas CSS
      const maxIn6 = Math.max(...last6MonthsData.map(d => d.value), 1);
      const normalized6 = last6MonthsData.map(d => ({ ...d, height: (d.value / maxIn6) * 100 }));

      // Anos disponíveis para filtro
      const years = Array.from(new Set(fullHistory.map(h => h.year))).sort((a,b) => b - a);

      // Filtragem por período (12M ou Ano Específico)
      let chartData: HistoryItem[] = [];
      
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
      const periodTotal = chartData.reduce((acc: number, curr: HistoryItem) => acc + curr.value, 0);
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

      // Calcula Split FII vs Ações para o período
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

  // Styles e Handlers
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
                
                {/* Mini Gráfico de Barras - Visualização Rápida */}
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

      {/* --- AGENDA SIMPLIFICADA E LIMPA --- */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 pb-20 pt-2 bg-zinc-50 dark:bg-zinc-950 min-h-full">
            <div className="flex justify-between items-center mb-6 pt-4">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Agenda</h2>
                    <p className="text-xs text-zinc-500 font-medium">Próximos eventos e previsões</p>
                </div>
                <button onClick={handleRefreshAgenda} disabled={radarData.loading} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors press-effect border border-zinc-200 dark:border-zinc-700">
                    <RefreshCw className={`w-4 h-4 ${radarData.loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Painel de Resumo Estático */}
            <div className="grid grid-cols-2 gap-3 mb-8 anim-scale-in">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Confirmado</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        {formatBRL(radarData.summary.confirmed, privacyMode)}
                    </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 border-dashed">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Previsto</p>
                    <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                        {formatBRL(radarData.summary.estimated, privacyMode)}
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
                            <button onClick={handleRefreshAgenda} className="text-indigo-500 font-bold text-xs hover:underline">
                                Verificar previsões
                            </button>
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
                 
                 {/* Mini Cards de Detalhe */}
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500" /> Recorde</p>
                     <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(stats.periodMax, privacyMode)}</p>
                 </div>
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                     <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CalendarClock className="w-3 h-3 text-indigo-500" /> Previsão</p>
                     <p className="text-lg font-black text-zinc-900 dark:text-white">{formatBRL(radarData.summary.total, privacyMode)}</p>
                 </div>
             </div>

             {/* Breakdown de Origem (FII vs Ações) */}
             <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4 mb-6 anim-slide-up">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">Origem dos Proventos</h3>
                 <div className="flex h-3 w-full rounded-full overflow-hidden bg-white dark:bg-zinc-800 mb-3 shadow-inner">
                     <div style={{ width: `${splitData.fiiPct}%` }} className="h-full bg-indigo-500 transition-all duration-1000 ease-out"></div>
                     <div style={{ width: `${splitData.stockPct}%` }} className="h-full bg-sky-500 transition-all duration-1000 ease-out"></div>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                         <span className="font-bold text-zinc-700 dark:text-zinc-300">FIIs</span>
                         <span className="font-medium text-zinc-400">{Math.round(splitData.fiiPct)}%</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <span className="font-medium text-zinc-400">{Math.round(splitData.stockPct)}%</span>
                         <span className="font-bold text-zinc-700 dark:text-zinc-300">Ações</span>
                         <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                     </div>
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
                 {availableYears.map((year: number) => (
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
                             {displayedChartData.map((entry: HistoryItem, index: number) => (
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
                         {displayedReceipts.map((r: DividendReceipt, idx: number) => {
                             const isFII = r.assetType === AssetType.FII;
                             return (
                                 <div key={idx} className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 border shadow-sm ${isFII ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-sky-50 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30 text-sky-600 dark:text-sky-400'}`}>
                                             {isFII ? <Building2 className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
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
    </div>
  );
};

export const Home = React.memo(HomeComponent);
