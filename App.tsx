
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const STORAGE_KEYS = {
  TXS: 'investfiis_transactions',
  TOKEN: 'investfiis_brapitoken',
  DIVS: 'investfiis_gemini_dividends_cache',
  SYNC: 'investfiis_last_gemini_sync',
  METADATA: 'investfiis_assets_metadata'
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);

  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.TXS) || '[]'));
  
  const [brapiToken, setBrapiToken] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TOKEN) || '');

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.DIVS) || '[]'));

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const hasRunAutoSync = useRef(false);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken);
    localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends));
  }, [transactions, brapiToken, geminiDividends]);

  // --- Helpers ---
  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getQuantityOnDate = useCallback((ticker: string, date: string, txs: Transaction[]) => {
    const target = date.split('T')[0];
    return txs
      .filter(t => t.ticker === ticker && t.date <= target)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  // --- Derived Data (The Engine) ---
  const { portfolio, dividendReceipts } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    
    // 1. Process Positions
    transactions.forEach(t => {
      if (!positions[t.ticker]) {
        positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
      }
      const p = positions[t.ticker];
      if (t.type === 'BUY') {
        const cost = (p.quantity * p.averagePrice) + (t.quantity * t.price);
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? cost / p.quantity : 0;
      } else {
        p.quantity -= t.quantity;
      }
    });

    // 2. Map Dividends to Positions
    const receipts: DividendReceipt[] = geminiDividends.map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, transactions);
      const total = qtyAtDate * div.rate;
      if (total > 0 && positions[div.ticker]) {
        positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + total;
      }
      return { ...div, quantityOwned: qtyAtDate, totalReceived: total };
    }).filter(r => r.totalReceived > 0);

    receipts.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0 || (p.totalDividends || 0) > 0)
      .map(p => ({
        ...p,
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));

    return { portfolio: finalPortfolio, dividendReceipts: receipts };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  // --- Actions ---
  const handleAiSync = useCallback(async (force = false) => {
    // Fix: Use Array.from with explicit typing to ensure tickers is inferred as string[]
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (tickers.length === 0) return;

    if (!force) {
      const last = localStorage.getItem(STORAGE_KEYS.SYNC);
      if (last && Date.now() - parseInt(last) < 1000 * 60 * 60 * 4) return; // 4h cache
    }

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(tickers);
      
      // Update Quotes from Gemini
      const aiQuotes: Record<string, BrapiQuote> = {};
      Object.entries(data.prices).forEach(([symbol, price]) => {
        aiQuotes[symbol] = { symbol, regularMarketPrice: price } as BrapiQuote;
      });
      setQuotes(prev => ({ ...prev, ...aiQuotes }));
      
      // Update Dividends
      setGeminiDividends(data.dividends);
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      if (force) showToast('success', 'Dados atualizados via Gemini AI');
    } catch (e: any) {
      showToast('error', e.message === 'COTA_EXCEDIDA' ? 'Limite da IA atingido' : 'Erro ao sincronizar com IA');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    
    // Fix: Use Array.from with explicit typing to ensure tickers is inferred as string[]
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    
    try {
      // 1. Tenta Brapi (Cotações rápidas)
      if (brapiToken) {
        const brQuotes = await getQuotes(tickers, brapiToken);
        const map: Record<string, BrapiQuote> = {};
        brQuotes.forEach(q => map[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...map }));
      }
      
      // 2. Sempre chama o Gemini para dividendos e como fallback de preço
      await handleAiSync(true);
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (!hasRunAutoSync.current && transactions.length > 0) {
      hasRunAutoSync.current = true;
      setTimeout(() => handleAiSync(false), 1500);
    }
  }, [transactions.length, handleAiSync]);

  const renderPage = () => {
    if (showSettings) return (
      <Settings 
        brapiToken={brapiToken} onSaveToken={setBrapiToken} 
        transactions={transactions} onImportTransactions={setTransactions}
        onResetApp={() => { localStorage.clear(); window.location.reload(); }}
      />
    );

    switch (currentTab) {
      case 'home': return <Home portfolio={portfolio} dividendReceipts={dividendReceipts} onAiSync={() => handleAiSync(true)} isAiLoading={isAiLoading} />;
      case 'portfolio': return <Portfolio portfolio={portfolio} />;
      case 'transactions': return (
        <Transactions 
          transactions={transactions} 
          onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])} 
          onDeleteTransaction={(id) => setTransactions(p => p.filter(x => x.id !== id))}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[80] transition-all duration-300 transform backdrop-blur-md ring-1 ring-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.text}</span>
        </div>
      )}

      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'InvestFIIs' : currentTab === 'portfolio' ? 'Patrimônio' : 'Histórico'} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={handleFullRefresh} 
        isRefreshing={isRefreshing || isAiLoading} 
      />
      
      <main className="fade-in">{renderPage()}</main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
