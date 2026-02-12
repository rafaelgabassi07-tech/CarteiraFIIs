import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AssetPosition, DividendReceipt, AssetType, Transaction } from '../types';
import { CircleDollarSign, CalendarClock, TrendingUp, TrendingDown, ArrowRight, Wallet, PieChart as PieIcon, Layers, Target, LayoutGrid, ListFilter } from 'lucide-react';
import { SwipeableModal } from '../components/Layout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis } from 'recharts';
import { fetchFutureAnnouncements } from '../services/dataService';

// Interfaces simplificadas
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

const formatBRL = (val: any, privacy = false) => {
  if (privacy) return 'R$ ••••••';
  const num = typeof val === 'number' ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Item da Agenda Redesenhado (Minimalista)
const AgendaItem: React.FC<{ event: RadarEvent, privacyMode: boolean }> = ({ event, privacyMode }) => {
    const isDatacom = event.eventType === 'DATACOM';
    const dateObj = new Date(event.date + 'T12:00:00'); // Garante meio-dia local
    const day = dateObj.getDate();
    const weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 mb-2">
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{weekDay}</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">{day}</span>
                </div>
                <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-base">{event.ticker}</h4>
                    <p className="text-xs text-zinc-500 font-medium">
                        {isDatacom ? 'Data de Corte (Data Com)' : `Pagamento de ${event.type}`}
                    </p>
                </div>
            </div>
            {!isDatacom && (
                <div className="text-right">
                    <span className="block text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        {formatBRL(event.amount, privacyMode)}
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
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
  
  // Estado do Radar (Agenda)
  const [radarData, setRadarData] = useState<{
      events: RadarEvent[];
      totalConfirmed: number;
      loading: boolean;
  }>({ events: [], totalConfirmed: 0, loading: true });

  // Automação: Efeito que roda sempre que o portfólio ou recibos mudam (Mount & Updates)
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
                      atomEvents.push({ id: key, ticker, type, eventType: evtType, date, amount, rate: rate }); // rate kept for sort stability if needed
                      seenKeys.add(key);
                  }
              };

              // Merge de fontes (BD + Robô)
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

              setRadarData({ events: atomEvents, totalConfirmed, loading: false });
          } catch (e) {
              console.error(e);
              if (isActive) setRadarData(prev => ({ ...prev, loading: false }));
          }
      };
      
      runRadar();
      return () => { isActive = false; };
  }, [portfolio, dividendReceipts]);

  // Cálculos de Rentabilidade
  const totalReturn = (totalAppreciation + salesGain) + totalDividendsReceived;
  const totalReturnPercent = invested > 0 ? (totalReturn / invested) * 100 : 0;

  // Renderização Minimalista
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

      {/* 2. Grid de Ações Rápidas (Agenda e Proventos) */}
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

          <button onClick={() => setShowProventosModal(true)} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] flex flex-col justify-between h-40 border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect relative overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><CircleDollarSign className="w-5 h-5" /></div>
              <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Proventos</span>
                  <div className="flex flex-col">
                      <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight truncate">{formatBRL(totalDividendsReceived, privacyMode)}</span>
                      <span className="text-[10px] font-bold text-zinc-500">Total Recebido</span>
                  </div>
              </div>
          </button>
      </div>

      {/* 3. Modal da Agenda (Automática) */}
      <SwipeableModal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)}>
        <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
            <div className="flex items-center justify-between mb-8 pt-4">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Agenda</h2>
                    <p className="text-sm text-zinc-500 font-bold">Próximos Pagamentos</p>
                </div>
                {/* Botão de atualizar removido conforme pedido. Apenas indicador se estiver carregando. */}
                {radarData.loading && <div className="text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">Atualizando...</div>}
            </div>

            {radarData.events.length > 0 && (
                <div className="bg-emerald-500 rounded-3xl p-6 text-white mb-8 shadow-xl shadow-emerald-500/20">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Total Confirmado</p>
                    <p className="text-4xl font-black tracking-tighter">{formatBRL(radarData.totalConfirmed, privacyMode)}</p>
                </div>
            )}

            <div className="space-y-2">
                {radarData.events.length === 0 && !radarData.loading ? (
                    <div className="text-center py-20 opacity-40">
                        <CalendarClock className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
                        <p className="text-sm font-bold text-zinc-500">Nenhum evento previsto</p>
                    </div>
                ) : (
                    radarData.events.map(event => (
                        <AgendaItem key={event.id} event={event} privacyMode={privacyMode} />
                    ))
                )}
            </div>
        </div>
      </SwipeableModal>

      {/* 4. Modal de Proventos (Visual Clean) */}
      <SwipeableModal isOpen={showProventosModal} onClose={() => setShowProventosModal(false)}>
         <div className="px-6 pb-20 pt-2 bg-[#F2F2F2] dark:bg-black min-h-full">
             <div className="flex flex-col pt-6 pb-4">
                 <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Acumulado</p>
                 <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                     {formatBRL(totalDividendsReceived, privacyMode)}
                 </h2>
             </div>
             
             {/* Lista simples dos últimos pagamentos */}
             <div className="mt-6">
                 <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Histórico Recente</h3>
                 <div className="space-y-2">
                     {dividendReceipts.slice().reverse().slice(0, 10).map((r, idx) => (
                         <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">
                                     {r.ticker.substring(0, 2)}
                                 </div>
                                 <div>
                                     <span className="block font-bold text-zinc-900 dark:text-white">{r.ticker}</span>
                                     <span className="text-[10px] text-zinc-400 font-bold uppercase">{r.type} • {new Date(r.paymentDate).toLocaleDateString('pt-BR')}</span>
                                 </div>
                             </div>
                             <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                 {formatBRL(r.totalReceived, privacyMode)}
                             </span>
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