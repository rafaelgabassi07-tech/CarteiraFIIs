import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType, AssetFundamentals, MarketIndicators } from '../types';
import { getQuotes } from '../services/brapiService';
import { fetchUnifiedMarketData } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

// Helper to prepare a transaction object for Supabase, mapping camelCase to snake_case
const cleanTxForSupabase = (tx: Omit<Transaction, 'id'> | Transaction) => {
  const { assetType, ...restOfTx } = tx;
  return { ...restOfTx, asset_type: assetType };
};

const getQuantityOnDate = (ticker: string, date: string, transactions: Transaction[]) => transactions.filter(t => t.ticker === ticker && t.date <= date).reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);

interface DataContextType {
  transactions: Transaction[];
  quotes: Record<string, BrapiQuote>;
  geminiDividends: DividendReceipt[];
  setGeminiDividends: (divs: DividendReceipt[]) => void;
  marketIndicators: { ipca: number; startDate: string };
  assetsMetadata: Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>;
  lastSyncTime: Date | null;
  isAiLoading: boolean;
  isRefreshing: boolean;
  isCloudSyncing: boolean;
  cloudStatus: 'disconnected' | 'connected' | 'hidden' | 'syncing';
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updated: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  requestDeleteConfirmation: (id: string) => void;
  importTransactions: (importedTxs: Transaction[]) => Promise<void>;
  syncAll: (force?: boolean) => Promise<void>;
  portfolio: AssetPosition[];
  invested: number;
  balance: number;
  totalAppreciation: number;
  totalDividendsReceived: number;
  salesGain: number;
  dividendReceipts: DividendReceipt[];
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TXS: 'investfiis_v4_transactions',
  DIVS: 'investfiis_v4_div_cache',
  INDICATORS: 'investfiis_v4_indicators',
  LAST_SYNC: 'investfiis_last_sync_time',
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const { showToast, setConfirmModal, addSyncToast } = useNotifications();

  const [transactions, setTransactions] = useState<Transaction[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.TXS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.DIVS); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [marketIndicators, setMarketIndicators] = useState<{ipca: number, startDate: string}>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.INDICATORS); return s ? JSON.parse(s) : { ipca: 4.5, startDate: '' }; } catch { return { ipca: 4.5, startDate: '' }; } });
  const [assetsMetadata, setAssetsMetadata] = useState<Record<string, { segment: string; type: AssetType; fundamentals?: AssetFundamentals }>>({});
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => { try { const s = localStorage.getItem(STORAGE_KEYS.LAST_SYNC); return s ? new Date(s) : null; } catch { return null; } });
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'hidden' | 'syncing'>('hidden');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends)); }, [geminiDividends]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(marketIndicators)); }, [marketIndicators]);
  useEffect(() => { if (lastSyncTime) localStorage.setItem(STORAGE_KEYS.LAST_SYNC, lastSyncTime.toISOString()); }, [lastSyncTime]);

  const syncAll = useCallback(async (force = false, transactionsToSync: Transaction[] = transactions) => {
    const tickers = Array.from(new Set(transactionsToSync.map(t => t.ticker.toUpperCase())));
    if (tickers.length === 0) { setQuotes({}); setGeminiDividends([]); setAssetsMetadata({}); return; }
    
    setIsRefreshing(true);
    try {
      const { quotes: newQuotesData } = await getQuotes(tickers);
      setQuotes(prev => ({...prev, ...newQuotesData.reduce((acc, q) => ({...acc, [q.symbol]: q }), {})}));
      
      setIsAiLoading(true);
      const startDate = transactionsToSync.length > 0 ? transactionsToSync.reduce((min, t) => t.date < min ? t.date : min, transactionsToSync[0].date) : '';
      const aiData = await fetchUnifiedMarketData(tickers, startDate, force);
      
      if (aiData.error === 'quota_exceeded') showToast('info', 'IA em pausa (Cota). Usando cache.');
      else if (force) showToast('success', 'Carteira Sincronizada');
      
      if (aiData.dividends) setGeminiDividends(aiData.dividends);
      if (aiData.metadata) setAssetsMetadata(aiData.metadata);
      if (aiData.indicators?.ipca_cumulative) setMarketIndicators({ ipca: aiData.indicators.ipca_cumulative, startDate: aiData.indicators.start_date_used });
      setLastSyncTime(new Date());
    } catch (e) { if (force) showToast('error', 'Sem conexão'); } 
    finally { setIsRefreshing(false); setIsAiLoading(false); }
  }, [transactions, showToast]);

  const fetchTransactionsFromCloud = useCallback(async () => {
    if (!session) return;
    setIsCloudSyncing(true);
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', session.user.id);
    if (error) { showToast('error', 'Erro ao buscar dados da nuvem.'); } 
    else if (data) {
      const cloudTxs: Transaction[] = data.map((t: any) => ({ id: t.id, ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, assetType: t.asset_type }));
      setTransactions(cloudTxs);
      await syncAll(false, cloudTxs);
    }
    setIsCloudSyncing(false);
  }, [session, showToast, syncAll]);

  const migrateGuestDataToCloud = useCallback(async (user_id: string) => {
    const localTxs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TXS) || '[]') as Transaction[];
    if (localTxs.length === 0) return;
    setCloudStatus('syncing');
    showToast('info', 'Migrando dados locais para a nuvem...');
    const dataToInsert = localTxs.map(tx => ({ ...cleanTxForSupabase(tx), user_id }));
    const { error } = await supabase.from('transactions').insert(dataToInsert);
    if (error) { showToast('error', 'Erro ao migrar dados.'); }
    else { showToast('success', 'Dados locais salvos na nuvem!'); }
  }, [showToast]);

  useEffect(() => {
    if (session && !initialLoadComplete) {
      setInitialLoadComplete(true); // Previne re-execução em refresh de token
      const wasGuest = localStorage.getItem('investfiis_guest_mode') === 'true';
      if (wasGuest) {
        migrateGuestDataToCloud(session.user.id).then(() => syncAll(true));
      } else {
        fetchTransactionsFromCloud();
      }
      setCloudStatus('connected');
      setTimeout(() => setCloudStatus('hidden'), 4000);
    } else if (!session) {
      // Reset no logout
      setTransactions([]);
      setQuotes({});
      setGeminiDividends([]);
      setInitialLoadComplete(false);
      setCloudStatus(localStorage.getItem('investfiis_guest_mode') === 'true' ? 'disconnected' : 'hidden');
    }
  }, [session, initialLoadComplete, fetchTransactionsFromCloud, migrateGuestDataToCloud, syncAll]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('transactions-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        const mapRecord = (r: any): Transaction => ({ id: r.id, ticker: r.ticker, type: r.type, quantity: r.quantity, price: r.price, date: r.date, assetType: r.asset_type });
        setTransactions(currentTxs => {
            if (payload.eventType === 'INSERT') {
              if (currentTxs.some(t => t.id === payload.new.id)) return currentTxs;
              addSyncToast(`Nova ordem para ${payload.new.ticker} sincronizada.`, 'add');
              return [...currentTxs, mapRecord(payload.new)];
            }
            if (payload.eventType === 'UPDATE') {
              addSyncToast(`Ordem de ${payload.new.ticker} atualizada.`, 'update');
              return currentTxs.map(t => t.id === payload.new.id ? mapRecord(payload.new) : t);
            }
            if (payload.eventType === 'DELETE') {
              addSyncToast(`Ordem de ${payload.old.ticker} removida da nuvem.`, 'delete');
              return currentTxs.filter(t => t.id !== payload.old.id);
            }
            return currentTxs;
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, addSyncToast]);

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    const newTx = { ...t, id: crypto.randomUUID() };
    setTransactions(p => [...p, newTx]);
    if (session) {
      const { error } = await supabase.from('transactions').insert({ ...cleanTxForSupabase(newTx), user_id: session.user.id });
      if (error) { showToast('error', 'Erro ao salvar.'); setTransactions(p => p.filter(tx => tx.id !== newTx.id)); }
    }
  };
  const updateTransaction = async (id: string, updated: Omit<Transaction, 'id'>) => {
    const originalTx = transactions.find(t => t.id === id);
    setTransactions(p => p.map(t => t.id === id ? { ...updated, id } : t));
    if (session && originalTx) {
      const { error } = await supabase.from('transactions').update(cleanTxForSupabase(updated)).match({ id });
      if (error) { showToast('error', 'Falha ao atualizar.'); setTransactions(p => p.map(t => t.id === id ? originalTx : t)); }
    }
  };
  const deleteTransaction = async (id: string) => {
    const deletedTx = transactions.find(t => t.id === id);
    setTransactions(p => p.filter(t => t.id !== id));
    if (session && deletedTx) {
      const { error } = await supabase.from('transactions').delete().match({ id });
      if (error) { showToast('error', 'Falha ao apagar.'); setTransactions(p => [...p, deletedTx]); }
    }
  };
  const requestDeleteConfirmation = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setConfirmModal({ isOpen: true, title: 'Confirmar Exclusão', message: `Deseja apagar a ordem de ${tx.type === 'BUY' ? 'compra' : 'venda'} de ${tx.ticker}?`, onConfirm: () => { deleteTransaction(id); setConfirmModal(null); } });
  };
  const importTransactions = async (importedTxs: Transaction[]) => {
    if (!Array.isArray(importedTxs)) return;
    const originalTxs = transactions;
    setTransactions(importedTxs);
    if (session) {
        setIsCloudSyncing(true);
        showToast('info', 'Sincronizando backup...');
        try {
            await supabase.from('transactions').delete().eq('user_id', session.user.id);
            if (importedTxs.length > 0) {
              const { error } = await supabase.from('transactions').insert(importedTxs.map(t => ({ ...cleanTxForSupabase(t), user_id: session.user.id })));
              if (error) throw error;
            }
            showToast('success', 'Backup restaurado!');
        } catch (e: any) { showToast('error', 'Erro na nuvem. Restaurando dados.'); setTransactions(originalTxs);
        } finally { setIsCloudSyncing(false); }
    } else { showToast('success', 'Backup restaurado localmente.'); }
  };

  const salesGain = useMemo(() => {
    let totalGain = 0; const tracker: Record<string, { q: number; c: number }> = {};
    [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(t => {
        if (!tracker[t.ticker]) tracker[t.ticker] = { q: 0, c: 0 };
        if (t.type === 'BUY') { tracker[t.ticker].q += t.quantity; tracker[t.ticker].c += t.quantity * t.price; } 
        else if (tracker[t.ticker].q > 0) { const avg = tracker[t.ticker].c / tracker[t.ticker].q; const cost = t.quantity * avg; totalGain += (t.quantity * t.price) - cost; tracker[t.ticker].c = Math.max(0, tracker[t.ticker].c - cost); tracker[t.ticker].q = Math.max(0, tracker[t.ticker].q - t.quantity); }
    });
    return totalGain;
  }, [transactions]);

  const { portfolio, invested, balance, totalAppreciation, totalDividendsReceived, dividendReceipts } = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const todayStr = new Date().toISOString().split('T')[0];
    const receipts = geminiDividends.map(div => ({...div, quantityOwned: getQuantityOnDate(div.ticker, div.dateCom, sortedTxs), totalReceived: getQuantityOnDate(div.ticker, div.dateCom, sortedTxs) * div.rate})).filter(r => r.totalReceived > 0);
    const divPaidMap: Record<string, number> = {};
    let totalDivs = 0;
    receipts.forEach(r => { if (r.paymentDate <= todayStr) { divPaidMap[r.ticker] = (divPaidMap[r.ticker] || 0) + r.totalReceived; totalDivs += r.totalReceived; } });
    const positions: Record<string, AssetPosition> = {};
    sortedTxs.forEach(t => {
      if (!positions[t.ticker]) positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: divPaidMap[t.ticker] || 0, segment: assetsMetadata[t.ticker]?.segment || 'Geral' };
      const p = positions[t.ticker];
      if (t.type === 'BUY') { p.averagePrice = (p.quantity * p.averagePrice + t.quantity * t.price) / (p.quantity + t.quantity); p.quantity += t.quantity; } 
      else { p.quantity -= t.quantity; }
    });
    const finalPortfolio = Object.values(positions).filter(p => p.quantity > 0.0001).map(p => ({ ...p, currentPrice: quotes[p.ticker]?.regularMarketPrice || p.averagePrice, logoUrl: quotes[p.ticker]?.logourl, assetType: assetsMetadata[p.ticker]?.type || p.assetType, segment: assetsMetadata[p.ticker]?.segment || p.segment, ...assetsMetadata[p.ticker]?.fundamentals }));
    const inv = finalPortfolio.reduce((acc, p) => acc + (p.averagePrice * p.quantity), 0);
    const bal = finalPortfolio.reduce((acc, p) => acc + ((p.currentPrice || p.averagePrice) * p.quantity), 0);
    return { portfolio: finalPortfolio, dividendReceipts: receipts, totalDividendsReceived: totalDivs, invested: inv, balance: bal, totalAppreciation: bal - inv };
  }, [transactions, quotes, geminiDividends, assetsMetadata]);

  return <DataContext.Provider value={{ transactions, quotes, geminiDividends, setGeminiDividends, marketIndicators, assetsMetadata, lastSyncTime, isAiLoading, isRefreshing, isCloudSyncing, cloudStatus, addTransaction, updateTransaction, deleteTransaction, requestDeleteConfirmation, importTransactions, syncAll, portfolio, invested, balance, totalAppreciation, totalDividendsReceived, salesGain, dividendReceipts }}>{children}</DataContext.Provider>;
};