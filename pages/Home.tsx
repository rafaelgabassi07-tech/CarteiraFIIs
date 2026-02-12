
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, TrendingUp, TrendingDown, ArrowRight, Wallet, PieChart as PieIcon, Layers, Target, LayoutGrid, ListFilter, X, ChevronRight } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis } from 'recharts';
import { fetchFutureAnnouncements } from '../services/dataService';

interface HomeProps {
  portfolio: AssetPosition[];
  dividendReceipts: DividendReceipt[];
  salesGain: number;
  totalDividendsReceived: number;
  inflationRate?: number;
  invested: number;
  balance: number;
  totalAppreciation: number;
  transactions?: Transaction[];
  privacyMode?: boolean;
  onViewAsset?: (ticker: string) => void;
}

interface RadarEvent {
    id: string;
    ticker: string;
    type: string;
    eventType: 'PAYMENT' | 'DATACOM';
    date: string;
    amount: number;
    rate?: number;
}

interface HistoryItem {
    fullDate: string;
    name: string;
    value: number;
    year: number;
    monthIndex: number;
}

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#f43f5e'];

const CustomBarTooltip = ({ active, payload, label, privacyMode }: any) => { 
    if (active && payload && payload.length) { 
        const data = payload[0]; 
        return (
            <div className="bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label} {data.payload.year}</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatBRL(data.value, privacyMode)}</p>
            </div>
        ); 
    } 
    return null; 
};

// Item da Agenda
const AgendaItem: React.FC<{ event: RadarEvent, privacyMode: boolean }> = ({ event, privacyMode }) => {
    const isDatacom = event.eventType === 'DATACOM';
    const dateObj = new Date(event.date + 'T12:00:00');
    const day = dateObj.getDate();
    const weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 mb-2">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{weekDay}</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-white leading-none">{day}</span>
                </div>
                <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{event.ticker}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium">
                        {isDatacom ? 'Data de Corte (Data Com)' : `Pagamento de ${event.type}`}
                    </p>
                </div>
            </div>
            {!isDatacom && (
                <div className="text-right">
                    <span className="block text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        {formatBRL(event.amount, privacyMode)}
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                        Confirmado
                    </span>
                </div>
            )}
        </div>
    );
};

const HomeComponent: React.FC<HomeProps> = ({ portfolio, dividendReceipts, salesGain = 0, totalDividendsReceived = 0, invested, balance, totalAppreciation, privacyMode = false }) => {
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showProventosModal, setShowProventosModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'CLASS' | 'SECTOR'>('CLASS');
  const [activeIndexClass, setActiveIndexClass] = useState<number | undefined>(undefined);

  // --- DADOS DO RADAR (AGENDA) ---
  const [radarData, setRadarData] = useState<{
      events: RadarEvent[];
      totalConfirmed: number;
      loading: boolean;
      grouped: Record<string, RadarEvent[]>; // Agrupamento por Mês
  }>({ events: [], totalConfirmed: 0, loading: true, grouped: {} });

  useEffect(() => {
      let isActive = true;
      const runRadar = async () => {
          try {
              const predictions = await fetchFutureAnnouncements(portfolio);
              if (!isActive) return;

              const todayStr = new Date().toISOString().split('T')[0];
              const atomEvents: RadarEvent[] = [];
              const seenKeys = new Set<string>();

              const addEvent = (ticker: string, date: string, amount: number, rate: number, type: string, evtType: 'PAYMENT' | 'DATACOM') => {
                  const key = `${ticker}-${evtType}-${date}-${rate.toFixed(4)}`;
                  if (!seenKeys.has(key) && date >= todayStr) {
                      atomEvents.push({ id: key, ticker, type, eventType: evtType, date, amount, rate: rate }); 
                      seenKeys.add(key);
                  }
              };

              dividendReceipts.forEach(r => {
                  if (r.paymentDate) addEvent(r.ticker, r.paymentDate, r.totalReceived, r.rate, r.type, 'PAYMENT');
                  if (r.dateCom) addEvent(r.ticker, r.dateCom, 0, r.rate, r.type, 'DATACOM');
              });

              predictions.forEach(p => {
                  if (p.paymentDate) addEvent(p.ticker, p.paymentDate, p.projectedTotal, p.rate, p.type, 'PAYMENT');
                  if (p.dateCom) addEvent(p.ticker, p.dateCom, 0, p.rate, p.type, 'DATACOM');
              });

              atomEvents.sort((a, b) => a.date.localeCompare(b.date));
              const totalConfirmed = atomEvents.reduce((acc, e) => e.eventType === 'PAYMENT' ? acc + e.amount : acc, 0);

              // Agrupamento por Mês para exibição na Agenda
              const grouped: Record<string, RadarEvent[]> = {};
              atomEvents.forEach(ev => {
                  const d = new Date(ev.date + 'T12:00:00');
                  const monthKey = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  const keyCap = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
                  if (!grouped[keyCap]) grouped[keyCap] = [];
                  grouped[keyCap].push(ev);
              });

              setRadarData({ events: atomEvents, totalConfirmed, loading: false, grouped });
          } catch (e) {
              console.error(e);
              if (isActive) setRadarData(prev => ({ ...prev, loading: false }));
          }
      };
      runRadar();
      return () => { isActive = false; };
  }, [portfolio, dividendReceipts]);

  // --- DADOS DE ALOCAÇÃO ---
  const { typeData, classChartData, sectorChartData } = useMemo(() => {
      let fiisTotal = 0; let stocksTotal = 0;
      const enriched = (portfolio || []).map(p => {
          const val = (p.currentPrice || p.averagePrice) * p.quantity;
          if (p.assetType === AssetType.FII) fiisTotal += val; else stocksTotal += val;
          return { ...p, totalValue: val };
      });
      const total = fiisTotal + stocksTotal || 1;
      
      const classChartData = [
          { name: 'FIIs', value: fiisTotal, color: '#6366f1', percent: (fiisTotal / total) * 100 }, 
          { name: 'Ações', value: stocksTotal, color: '#0ea5e9', percent: (stocksTotal / total) * 100 }
      ].filter(d => d.value > 0);
      
      const sectorMap: Record<string, number> = {};
      enriched.forEach(p => { const s = p.segment || 'Outros'; sectorMap[s] = (sectorMap[s] || 0) + p.totalValue; });
      const sectorChartData = Object.entries(sectorMap)
          .map(([name, value], i) => ({ name, value, percent: (value / total) * 100, color: CHART_COLORS[i % CHART_COLORS.length] }))
          .sort((a,b) => b.value - a.value);
      
      return { typeData: { total }, classChartData, sectorChartData };
  }, [portfolio]);

  // --- DADOS DE HISTÓRICO DE PROVENTOS ---
  const { chartData } = useMemo(() => {
      const monthlySum: Record<string, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];

      (dividendReceipts || []).forEach(r => {
          if (r.paymentDate && r.paymentDate <= todayStr) {
              const key = r.paymentDate.substring(0, 7); 
              monthlySum[key] = (monthlySum[key] || 0) + r.totalReceived;
          }
      });

      const fullHistory: HistoryItem[] = Object.keys(monthlySum).sort().map(date => {
          const d = new Date(date + '-02'); 
          return {
              fullDate: date,
              name: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
              value: monthlySum[date],
              year: d.getFullYear(),
              monthIndex: d.getMonth()
          };
      });

      // Últimos 12 meses
      return { chartData: fullHistory.slice(-12) };
  }, [dividendReceipts]);

  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Card Principal (Patrimônio) */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 dark:border-zinc-800/50 anim-scale-in">
          <div className="relative z-10 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">Patrimônio Total</span>
              <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
                  {formatBRL(balance, privacyMode)}
              </h2>
              
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${totalReturn >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                  {totalReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-bold text-sm">
                      {totalReturnPercent > 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
                  </span>
                  <span className="text-[10px] opacity-70 uppercase font-bold ml-1">Retorno Real</span>
              </div>
          </div>
      </div>

      {/* 2. Grid de Ações Rápidas */}
      <div className="grid grid-cols-2 gap-4 anim-slide-up">
          <button onClick={() => setShowAgendaModal(true)} className="bg-indigo-600 dark:bg-indigo-600 text-white p-6 rounded-[2rem] flex flex-col justify-between h-40 shadow-lg shadow-indigo-600/20 press-effect relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform"><CalendarClock className="w-16 h-16" /></div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><CalendarClock className="w-5 h-5" /></div>
              <div>
                  <span className="text-xs font-medium opacity-80 uppercase tracking-wider block mb-1">Agenda</span>
                  {radarData.loading ? (
                      <span className="text-xs font-bold animate-pulse">Buscando...</span>
                  ) : (
                      <div className="flex flex-col">
                          <span className="text-2xl font-black tracking-tight">{radarData.events.length}</span>
                          <span className="text-[10px] font-bold opacity-80">Eventos Futuros</span>
                      </div>
                  )}
              </div>
          </button>

          <div className="flex flex-col gap-4">
              <button onClick={() => setShowProventosModal(true)} className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"><CircleDollarSign className="w-5 h-5" /></div>
                  <div className="min-w-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Proventos</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-white truncate block">{formatBRL(totalDividendsReceived, privacyMode)}</span>
                  </div>
              </button>

              <button onClick={() => setShowAllocationModal(true)} className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><PieIcon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Alocação</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-white truncate block">{classChartData.length} Classes</span>
                  </div>
              </button>
          </div>
      </div>

      {/* 3. Modal da Agenda (Automática) */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
            <div className="flex items-center justify-between mb-8 pt-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Agenda</h2>
                    <p className="text-sm text-zinc-500 font-bold">Próximos Pagamentos</p>
                </div>
                {radarData.loading && <div className="text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">Atualizando...</div>}
            </div>

            {radarData.events.length > 0 && (
                <div className="bg-emerald-500 rounded-3xl p-6 text-white mb-8 shadow-xl shadow-emerald-500/20">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Total Confirmado</p>
                    <p className="text-4xl font-black tracking-tighter">{formatBRL(radarData.totalConfirmed, privacyMode)}</p>
                </div>
            )}

            <div className="space-y-6">
                {Object.keys(radarData.grouped).length === 0 && !radarData.loading ? (
                    <div className="text-center py-20 opacity-40">
                        <CalendarClock className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
                        <p className="text-sm font-bold text-zinc-500">Nenhum evento previsto</p>
                    </div>
                ) : (
                    Object.keys(radarData.grouped).map(monthKey => (
                        <div key={monthKey}>
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 ml-2 sticky top-0 bg-[#F2F2F2] dark:bg-black py-2 z-10">{monthKey}</h3>
                            {radarData.grouped[monthKey].map(event => (
                                <AgendaItem key={event.id} event={event} privacyMode={privacyMode} />
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
      </SwipeableModal>

      {/* 4. Modal de Proventos (Restaurado com Gráfico) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             <div className="flex flex-col pt-6 pb-4">
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Acumulado</p>
                 <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                     {formatBRL(totalDividendsReceived, privacyMode)}
                 </h2>
             </div>

             {/* Gráfico Restaurado */}
             {chartData.length > 0 && (
                 <div className="h-48 w-full mt-4 mb-8">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }} dy={10} interval={0} />
                             <RechartsTooltip cursor={{fill: 'transparent'}} content={<CustomBarTooltip privacyMode={privacyMode} />} />
                             <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                 {chartData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={'#10b981'} />
                                 ))}
                             </Bar>
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
             )}
             
             <div className="mt-6">
                 <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Últimos Lançamentos</h3>
                 <div className="space-y-2">
                     {dividendReceipts.slice().reverse().slice(0, 10).map((r, idx) => (
                         <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                     {r.ticker.substring(0, 2)}
                                 </div>
                                 <div>
                                     <span className="block font-bold text-zinc-900 dark:text-white text-sm">{r.ticker}</span>
                                     <span className="text-[10px] text-zinc-400 font-bold uppercase">{r.type} • {new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span>
                                 </div>
                             </div>
                             <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                 {formatBRL(r.totalReceived, privacyMode)}
                             </span>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      </SwipeableModal>

      {/* 5. Modal de Alocação (Restaurado) */}
      <SwipeableModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)}>
         <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             <div className="flex items-center gap-4 mb-6 px-1 pt-4">
                 <div className="w-12 h-12 bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <PieIcon className="w-6 h-6" />
                 </div>
                 <div>
                     <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Alocação</h2>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Raio-X de Diversificação</p>
                 </div>
             </div>

             <div className="bg-zinc-200/50 dark:bg-zinc-900 p-1 rounded-2xl flex gap-1 mb-6">
                 {['CLASS', 'SECTOR'].map(t => (
                     <button key={t} onClick={() => setAllocationTab(t as any)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${allocationTab === t ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
                        {t === 'CLASS' ? 'Por Classe' : 'Por Setor'}
                     </button>
                 ))}
             </div>

             <div className="space-y-6">
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2.5rem] shadow-sm relative overflow-visible border border-zinc-200 dark:border-zinc-800 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={allocationTab === 'CLASS' ? classChartData : sectorChartData} 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={4} 
                                cornerRadius={6} 
                                dataKey="value" 
                                stroke="none" 
                                onMouseEnter={(_, index) => setActiveIndexClass(index)} 
                                onMouseLeave={() => setActiveIndexClass(undefined)}
                            >
                                {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke={activeIndexClass === index ? 'rgba(255,255,255,0.2)' : 'none'} strokeWidth={2} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                            {activeIndexClass !== undefined ? (allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].name : 'Total'}
                        </span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            {activeIndexClass !== undefined 
                                ? `${(allocationTab === 'CLASS' ? classChartData : sectorChartData)[activeIndexClass].percent.toFixed(1)}%` 
                                : formatBRL(typeData.total, privacyMode)}
                        </span>
                    </div>
                 </div>

                 <div className="space-y-3">
                     {(allocationTab === 'CLASS' ? classChartData : sectorChartData).map((item, index) => (
                         <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                             <div className="flex items-center gap-3">
                                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                 <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{item.name}</span>
                             </div>
                             <div className="text-right">
                                 <span className="block text-sm font-black text-zinc-900 dark:text-white">{formatBRL(item.value, privacyMode)}</span>
                                 <span className="text-[10px] font-bold text-zinc-400">{item.percent.toFixed(1)}%</span>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      </SwipeableModal>
    </div>
  );
};

export const Home = React.memo(HomeComponent);
