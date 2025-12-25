
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt, AssetType } from './types';
import { getQuotes } from './services/brapiService';
import { fetchUnifiedMarketData } from './services/geminiService';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

const STORAGE_KEYS = {
  TXS: 'investfiis_transactions',
  TOKEN: 'investfiis_brapitoken',
  DIVS: 'investfiis_gemini_dividends_cache',
  SYNC: 'investfiis_last_gemini_sync',
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
  const [isSplashActive, setIsSplashActive] = useState(true);

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

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashActive(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.TOKEN, brapiToken);
    localStorage.setItem(STORAGE_KEYS.DIVS, JSON.stringify(geminiDividends));
  }, [transactions, brapiToken, geminiDividends]);

  const showToast = useCallback((type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getQuantityOnDate = useCallback((ticker: string, date: string, txs: Transaction[]) => {
    const target = date.split('T')[0];
    return txs
      .filter(t => t.ticker === ticker && t.date <= target)
      .reduce((acc, t) => t.type === 'BUY' ? acc + t.quantity : acc - t.quantity, 0);
  }, []);

  // MOTOR DE CÁLCULO: Transforma transações e dados externos em patrimônio e histórico de rendimentos
  const { portfolio, dividendReceipts } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    
    // 1. Calcula posições atuais e Preço Médio
    transactions.forEach(t => {
      const ticker = t.ticker.toUpperCase();
      if (!positions[ticker]) {
        positions[ticker] = { ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
      }
      const p = positions[ticker];
      if (t.type === 'BUY') {
        const cost = (p.quantity * p.averagePrice) + (t.quantity * t.price);
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? cost / p.quantity : 0;
      } else {
        p.quantity -= t.quantity;
      }
    });

    // 2. Processa dividendos vindos do Gemini contra o histórico de transações
    const uniqueGeminiDivs: DividendReceipt[] = Array.from(
      new Map<string, DividendReceipt>(geminiDividends.map(d => [d.id, d])).values()
    );

    const receipts: DividendReceipt[] = uniqueGeminiDivs.map(div => {
      const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, transactions);
      const total = qtyAtDate * div.rate;
      const assetType = positions[div.ticker]?.assetType;
      
      if (total > 0 && positions[div.ticker]) {
        positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + total;
      }
      
      return { ...div, quantityOwned: qtyAtDate, totalReceived: total, assetType };
    }).filter(r => r.totalReceived > 0);

    // Ordenação cronológica inversa (mais recentes primeiro)
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

  const handleAiSync = useCallback(async (force = false) => {
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (tickers.length === 0) return;
    
    if (!force) {
      const last = localStorage.getItem(STORAGE_KEYS.SYNC);
      if (last && Date.now() - parseInt(last) < 1000 * 60 * 60 * 2) return; // Sync auto a cada 2h
    }

    setIsAiLoading(true);
    try {
      const data = await fetchUnifiedMarketData(tickers);
      
      const aiQuotes: Record<string, BrapiQuote> = {};
      Object.entries(data.prices).forEach(([symbol, price]) => {
        aiQuotes[symbol] = { symbol, regularMarketPrice: price } as BrapiQuote;
      });
      setQuotes(prev => ({ ...prev, ...aiQuotes }));
      setGeminiDividends(data.dividends);
      
      localStorage.setItem(STORAGE_KEYS.SYNC, Date.now().toString());
      if (force) showToast('success', 'Sincronizado com Gemini 3 Flash');
    } catch (e: any) {
      showToast('error', 'Erro na sincronização inteligente');
    } finally {
      setIsAiLoading(false);
    }
  }, [transactions, showToast]);

  const handleFullRefresh = async () => {
    if (isRefreshing || isAiLoading) return;
    setIsRefreshing(true);
    const tickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    
    try {
      if (brapiToken) {
        const brQuotes = await getQuotes(tickers, brapiToken);
        const map: Record<string, BrapiQuote> = {};
        brQuotes.forEach(q => map[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...map }));
      }
      await handleAiSync(true);
    } catch (error) {
      showToast('error', 'Erro na atualização geral');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasRunAutoSync.current && transactions.length > 0) {
      hasRunAutoSync.current = true;
      setTimeout(() => handleAiSync(false), 3000);
    }
  }, [transactions.length, handleAiSync]);

  if (isSplashActive) {
    return (
      <div className="fixed inset-0 bg-primary z-[100] flex flex-col items-center justify-center p-6">
        <div className="relative mb-6 animate-pulse-neon">
          <div className="w-24 h-24 bg-gradient-to-br from-accent to-blue-600 rounded-3xl rotate-12 flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.3)]">
            <TrendingUp className="w-12 h-12 text-primary -rotate-12" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-white tracking-[0.2em] mb-2 animate-fade-in uppercase">InvestFIIs</h1>
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-accent animate-[slideRight_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans selection:bg-accent/30 overflow-x-hidden">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[80] transition-all duration-300 transform animate-fade-in-up backdrop-blur-xl border border-white/10 ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
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
      
      <main className="max-w-screen-sm mx-auto min-h-screen">
        {showSettings ? (
          <Settings 
            brapiToken={brapiToken} onSaveToken={setBrapiToken} 
            transactions={transactions} onImportTransactions={setTransactions}
            onResetApp={() => { localStorage.clear(); window.location.reload(); }}
          />
        ) : (
          <div key={currentTab} className="animate-fade-in">
            {currentTab === 'home' && <Home portfolio={portfolio} dividendReceipts={dividendReceipts} />}
            {currentTab === 'portfolio' && <Portfolio portfolio={portfolio} dividendReceipts={dividendReceipts} />}
            {currentTab === 'transactions' && (
              <Transactions 
                transactions={transactions} 
                onAddTransaction={(t) => setTransactions(p => [...p, { ...t, id: crypto.randomUUID() }])} 
                onDeleteTransaction={(id) => setTransactions(p => p.filter(x => x.id !== id))}
              />
            )}
          </div>
        )}
      </main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;
