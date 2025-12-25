import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, BottomNav } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Transaction, AssetPosition, BrapiQuote, DividendReceipt } from './types';
import { getQuotes } from './services/brapiService';
import { fetchDividendsViaGemini } from './services/geminiService';
import { DownloadCloud, Sparkles } from 'lucide-react';

const INITIAL_TRANSACTIONS_KEY = 'investfiis_transactions';
const BRAPI_TOKEN_KEY = 'investfiis_brapitoken';
const GEMINI_DIVIDENDS_KEY = 'investfiis_gemini_dividends_cache'; // Novo cache local

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(INITIAL_TRANSACTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [brapiToken, setBrapiToken] = useState(() => {
    const local = localStorage.getItem(BRAPI_TOKEN_KEY);
    return local || '';
  });

  const [quotes, setQuotes] = useState<Record<string, BrapiQuote>>({});
  
  // Estado inicial carrega do cache local para não perder dados ao recarregar
  const [geminiDividends, setGeminiDividends] = useState<DividendReceipt[]>(() => {
    const saved = localStorage.getItem(GEMINI_DIVIDENDS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- SERVICE WORKER REGISTRATION ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            };
          }
        };
      }).catch((error) => console.error('Erro ao registrar SW:', error));

      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    }
  }, []);

  // Persistência
  useEffect(() => { localStorage.setItem(INITIAL_TRANSACTIONS_KEY, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(BRAPI_TOKEN_KEY, brapiToken); }, [brapiToken]);
  // Salva resultado da IA
  useEffect(() => { localStorage.setItem(GEMINI_DIVIDENDS_KEY, JSON.stringify(geminiDividends)); }, [geminiDividends]);

  // Função crítica: Calcula a quantidade exata de cotas em uma data passada
  const getQuantityOnDate = useCallback((ticker: string, targetDateStr: string, transactionList: Transaction[]) => {
    if (!targetDateStr) return 0;
    const targetDate = targetDateStr.split('T')[0];
    
    return transactionList
      .filter(t => t.ticker === ticker && t.date <= targetDate)
      .reduce((acc, t) => {
        return t.type === 'BUY' ? acc + t.quantity : acc - t.quantity;
      }, 0);
  }, []);

  // UseMemo para calcular Portfólio E Lista de Extrato de Dividendos
  const { portfolio, dividendReceipts } = useMemo(() => {
    const positions: Record<string, AssetPosition> = {};
    const receipts: DividendReceipt[] = [];
    
    // 1. Calcula Posição Atual e Preço Médio
    transactions.forEach(t => {
      if (!positions[t.ticker]) {
        positions[t.ticker] = { ticker: t.ticker, quantity: 0, averagePrice: 0, assetType: t.assetType, totalDividends: 0 };
      }
      const p = positions[t.ticker];
      if (t.type === 'BUY') {
        const totalCost = (p.quantity * p.averagePrice) + (t.quantity * t.price);
        p.quantity += t.quantity;
        p.averagePrice = p.quantity > 0 ? totalCost / p.quantity : 0;
      } else {
        p.quantity -= t.quantity;
      }
    });

    // 2. Calcula Proventos (EXCLUSIVO VIA GEMINI)
    // A Brapi não é mais consultada para dividendos. Apenas a IA preenche isso.
    if (geminiDividends.length > 0) {
      geminiDividends.forEach(div => {
         const qtyAtDate = getQuantityOnDate(div.ticker, div.dateCom, transactions);
         if (qtyAtDate > 0) {
            const totalReceived = qtyAtDate * div.rate;
            
            // Adiciona ao extrato
            receipts.push({
              ...div,
              quantityOwned: qtyAtDate,
              totalReceived: totalReceived
            });

            // Soma ao total do ativo
            if (positions[div.ticker]) {
              positions[div.ticker].totalDividends = (positions[div.ticker].totalDividends || 0) + totalReceived;
            }
         }
      });
    }

    // Ordena extrato pela data de pagamento (mais recente primeiro)
    receipts.sort((a, b) => {
        const dateA = a.paymentDate || a.dateCom;
        const dateB = b.paymentDate || b.dateCom;
        return dateB.localeCompare(dateA);
    });

    const finalPortfolio = Object.values(positions)
      .filter(p => p.quantity > 0 || (p.totalDividends && p.totalDividends > 0))
      .map(p => ({
        ...p,
        // Cotação vem da Brapi (ou cache da Brapi)
        currentPrice: quotes[p.ticker]?.regularMarketPrice,
        logoUrl: quotes[p.ticker]?.logourl
      }));
      
    return { portfolio: finalPortfolio, dividendReceipts: receipts };
  }, [transactions, quotes, geminiDividends, getQuantityOnDate]);

  const fetchMarketData = useCallback(async (isManual = false) => {
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (!brapiToken || uniqueTickers.length === 0) {
      if (isManual) setIsRefreshing(false);
      return;
    }

    if (isManual) setIsRefreshing(true);
    try {
      const results = await getQuotes(uniqueTickers, brapiToken);
      if (results.length > 0) {
        const newQuoteMap: Record<string, BrapiQuote> = {};
        results.forEach(q => newQuoteMap[q.symbol] = q);
        setQuotes(prev => ({ ...prev, ...newQuoteMap }));
      }
    } catch (error) {
      console.error("Erro ao atualizar cotações", error);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [transactions, brapiToken]);

  const handleSyncDividendsWithAI = async () => {
    const uniqueTickers: string[] = Array.from(new Set(transactions.map(t => t.ticker)));
    if (uniqueTickers.length === 0) return;

    setIsAiLoading(true);
    try {
      // Chama o serviço do Gemini focado em Proventos
      const aiResults = await fetchDividendsViaGemini(uniqueTickers);
      if (aiResults.length > 0) {
        setGeminiDividends(aiResults); // Atualiza estado e dispara useEffect de persistência
      }
    } catch (e) {
      console.error("Erro na sincronização IA:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Auto-fetch market data on load
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(() => fetchMarketData(false), 2 * 60 * 1000); // 2 minutos
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const handleUpdateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const renderPage = () => {
    if (showSettings) return (
      <Settings 
        brapiToken={brapiToken} 
        onSaveToken={(t) => setBrapiToken(t)} 
        transactions={transactions}
        onImportTransactions={(data) => setTransactions(data)}
        onResetApp={() => {
          setTransactions([]);
          setBrapiToken('');
          setGeminiDividends([]); // Limpa cache de dividendos
          localStorage.removeItem(GEMINI_DIVIDENDS_KEY);
          setShowSettings(false);
        }}
      />
    );

    switch (currentTab) {
      case 'home': return <Home portfolio={portfolio} dividendReceipts={dividendReceipts} onAiSync={handleSyncDividendsWithAI} isAiLoading={isAiLoading} />;
      case 'portfolio': return <Portfolio portfolio={portfolio} />;
      case 'transactions': return (
        <Transactions 
          transactions={transactions} 
          onAddTransaction={(t) => setTransactions(prev => [...prev, { ...t, id: crypto.randomUUID() }])} 
          onDeleteTransaction={(id) => setTransactions(prev => prev.filter(x => x.id !== id))}
        />
      );
      default: return <Home portfolio={portfolio} dividendReceipts={dividendReceipts} onAiSync={handleSyncDividendsWithAI} isAiLoading={isAiLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-primary text-gray-100 font-sans">
      {updateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] animate-slide-up">
          <div className="bg-slate-800/95 backdrop-blur-xl border border-accent/20 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DownloadCloud className="w-5 h-5 text-accent" />
              <p className="font-bold text-white text-sm">Nova versão disponível</p>
            </div>
            <button onClick={handleUpdateApp} className="bg-accent text-slate-950 text-xs font-bold py-2 px-4 rounded-lg">Atualizar</button>
          </div>
        </div>
      )}

      <Header 
        title={showSettings ? 'Configurações' : (currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Minha Carteira' : 'Transações')} 
        onSettingsClick={() => setShowSettings(true)} 
        showBack={showSettings}
        onBack={() => setShowSettings(false)}
        onRefresh={() => fetchMarketData(true)}
        isRefreshing={isRefreshing}
      />
      
      <main className="fade-in">{renderPage()}</main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
    </div>
  );
};

export default App;