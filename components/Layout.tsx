import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, Cloud, CloudOff, Loader2, AlertTriangle, Gift, Star, Inbox, RefreshCw, Smartphone, X, Check, Mail, Server, WifiOff, FileText, CheckCircle, Percent, TrendingUp, DollarSign, Activity, Newspaper } from 'lucide-react';
import { UpdateReportData } from '../types';

// Utility for smooth visibility transitions
const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Double RAF ensures the browser has painted the mounted state before applying the visible class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  return { isMounted, isVisible };
};

export const CloudStatusBanner: React.FC<{ status: 'disconnected' | 'connected' | 'hidden' | 'syncing' }> = ({ status }) => {
  const isHidden = status === 'hidden';
  const isConnected = status === 'connected';
  const isSyncing = status === 'syncing';

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+6px)] pb-2 px-4 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500 ease-out-mola transform will-change-transform shadow-sm ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      } ${
        isConnected ? 'bg-emerald-600 text-white' : 
        isSyncing ? 'bg-zinc-800 text-white' : 'bg-rose-600 text-white'
      }`}
    >
      {isSyncing ? (
        <> <Loader2 className="w-2.5 h-2.5 animate-spin text-white" /> <span>Sincronizando...</span> </>
      ) : isConnected ? (
        <div className="flex items-center gap-2"> <Cloud className="w-3 h-3 text-white" strokeWidth={3} /> <span>Salvo na Nuvem</span> </div>
      ) : (
        <div className="flex items-center gap-2"> <CloudOff className="w-3 h-3" /> <span>Offline</span> </div>
      )}
    </div>
  );
};

interface HeaderProps {
  title: string;
  onSettingsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNotificationClick?: () => void;
  notificationCount?: number;
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
  appVersion?: string;
  bannerVisible?: boolean;
  hideBorder?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, bannerVisible = false, hideBorder = false, onRefresh
}) => {
  return (
    <header 
      className={`fixed left-0 right-0 z-40 flex flex-col justify-end px-4 transition-all duration-500 ease-out-soft glass-effect ${
        bannerVisible ? 'h-24 pt-6' : 'h-20 pt-safe' 
      } top-0 ${hideBorder ? '!border-b-0 shadow-none' : ''}`}
    >
      <div className="flex items-center justify-between h-14 mb-1">
        <div className="flex items-center gap-3 w-full">
          {showBack ? (
            <div className="flex items-center gap-3 w-full anim-slide-in-right">
              <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 press-effect hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Voltar</h1>
            </div>
          ) : (
            <div className="flex flex-col anim-fade-in">
                <div className="flex items-center gap-3">
                    {isRefreshing && <Loader2 className="w-5 h-5 animate-spin text-accent" />}
                    <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 selection:bg-accent/20">
                      {title}
                      {!isRefreshing && (
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_12px_rgb(var(--color-accent-rgb))]"></span>
                      )}
                    </h1>
                </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && !showBack && (
            <button onClick={onRefresh} disabled={isRefreshing} className={`w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 press-effect hover:bg-zinc-50 dark:hover:bg-zinc-800 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
          )}
          {updateAvailable && !showBack && (
            <button onClick={onUpdateClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-500 text-white press-effect shadow-lg shadow-sky-500/30">
              <Download className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
            </button>
          )}
          {onNotificationClick && !showBack && (
            <button onClick={onNotificationClick} className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 press-effect hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <Bell className="w-4 h-4" strokeWidth={2} />
              {notificationCount > 0 && 
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              }
            </button>
          )}
          {!showBack && onSettingsClick && (
            <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 press-effect hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <Settings className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Geral' },
  { id: 'portfolio', icon: PieChart, label: 'Custódia' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
  { id: 'news', icon: Newspaper, label: 'Notícias' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const activeIndex = navItems.findIndex(item => item.id === currentTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      {/* Totalmente Sólido */}
      <nav className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1.5 w-full max-w-[22rem] mx-4 relative overflow-hidden transition-all duration-300">
        
        {/* Sliding Active Indicator */}
        <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(25%-0.25rem)] bg-zinc-100 dark:bg-zinc-800 rounded-xl shadow-inner border border-black/5 dark:border-white/5 transition-all duration-500 ease-out-mola will-change-transform z-0"
            style={{ 
                left: '0.125rem',
                transform: `translateX(calc(${activeIndex} * 100% + ${activeIndex * 0.25}rem))`
            }}
        ></div>

        {/* Buttons Grid */}
        <div className="relative z-10 grid grid-cols-4 h-14">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center relative outline-none select-none press-effect group"
              >
                {/* Icon Wrapper */}
                <div className={`relative transition-all duration-500 ease-out-mola ${isActive ? '-translate-y-1.5 scale-110' : 'translate-y-1 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400'}`}>
                    
                    {/* Active Glow Removed, just solid color icon */}
                    <item.icon 
                        className={`w-6 h-6 relative z-10 transition-all duration-500 ${
                            isActive 
                                ? 'text-accent stroke-[2.5px]' 
                                : 'stroke-[2px]'
                        }`} 
                    />
                </div>
                
                {/* Label */}
                <span className={`absolute bottom-2 text-[8px] font-black uppercase tracking-wider transition-all duration-500 ease-out-mola ${
                    isActive 
                        ? 'opacity-100 translate-y-0 text-zinc-900 dark:text-white delay-75' 
                        : 'opacity-0 translate-y-3 pointer-events-none'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 500);
  const modalRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);

  useEffect(() => { 
      document.body.style.overflow = isOpen ? 'hidden' : ''; 
      return () => { document.body.style.overflow = ''; }; 
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touchY = e.touches[0].clientY;
    const diff = touchY - startY.current;
    if (diff > 0) {
      setDragOffset(diff);
      if (e.cancelable) e.preventDefault(); 
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > 150) { onClose(); }
    setDragOffset(0);
  };

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] flex flex-col justify-end ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Solid Dimmed Backdrop */}
      <div 
          onClick={onClose} 
          className={`absolute inset-0 bg-black/80 transition-opacity duration-500 ease-out-soft ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      ></div>
      
      <div
        ref={modalRef}
        style={{
            transform: isVisible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
            transition: isDragging ? 'none' : 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)' 
        }}
        className={`relative bg-white dark:bg-zinc-900 rounded-t-3xl h-[92vh] w-full overflow-hidden flex flex-col shadow-2xl border-t border-zinc-200 dark:border-zinc-800 will-change-transform`}
      >
        <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-none p-4 flex justify-center bg-transparent cursor-grab active:cursor-grabbing touch-none z-10"
        >
            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
        </div>
        
        <div className={`flex-1 overflow-y-auto overscroll-contain pb-safe transition-opacity duration-500 delay-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {children}
        </div>
      </div>
    </div>, document.body
  );
};

interface ConfirmationModalProps { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 250);
  if (!isMounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel}></div>
      <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-xs p-8 text-center shadow-2xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) border border-zinc-100 dark:border-zinc-800 ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}>
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed font-medium">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors press-effect">Cancelar</button>
          <button onClick={onConfirm} className="py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg press-effect">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
};

// --- Modal de Relatório de Atualização Melhorado ---
export const UpdateReportModal: React.FC<{ isOpen: boolean; onClose: () => void; results: UpdateReportData }> = ({ isOpen, onClose, results }) => {
    const [tab, setTab] = useState<'assets' | 'dividends' | 'indicators'>('assets');
    const allDividends = results.results.flatMap(r => (r.dividendsFound || []).map(d => ({ ...d, ticker: r.ticker })));

    return (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30">
                        <FileText className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Relatório</h2>
                        <p className="text-xs text-zinc-500 font-medium">Resumo da Atualização</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors press-effect">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl text-center border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ativos</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">{results.results.length}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Proventos</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{results.totalDividendsFound}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl text-center border border-rose-100 dark:border-rose-900/30">
                    <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">IPCA (12m)</p>
                    <p className="text-lg font-black text-rose-700 dark:text-rose-300">{results.inflationRate.toFixed(2)}%</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6">
                <button onClick={() => setTab('assets')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === 'assets' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Cotações</button>
                <button onClick={() => setTab('dividends')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === 'dividends' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Novos Proventos</button>
                <button onClick={() => setTab('indicators')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === 'indicators' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Indicadores</button>
            </div>

            {/* Content */}
            <div className="space-y-3 min-h-[200px]">
                {tab === 'assets' && (
                    results.results.length === 0 ? (
                        <div className="text-center py-10 opacity-40"><Server className="w-12 h-12 mx-auto mb-2" /><p className="text-xs font-bold">Nada atualizado</p></div>
                    ) : (
                        results.results.map((r, i) => {
                            const isBrapiPrice = r.sourceMap?.price === 'Brapi';
                            const isInv10Fund = r.sourceMap?.fundamentals === 'Investidor10';
                            
                            return (
                                <div key={i} className={`p-4 rounded-2xl border flex gap-4 anim-stagger-item relative overflow-hidden ${r.status === 'success' ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800' : 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'}`} style={{ animationDelay: `${i * 50}ms` }}>
                                    
                                    {/* Column 1: Status Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${r.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 border-rose-200 dark:border-rose-900/30'}`}>
                                        {r.status === 'success' ? <CheckCircle className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                                    </div>
                                    
                                    {/* Column 2: Data */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <h4 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{r.ticker}</h4>
                                                <div className="flex gap-1 mt-1">
                                                    {isBrapiPrice && <span className="text-[8px] font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">BRAPI</span>}
                                                    {isInv10Fund && <span className="text-[8px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-800">INV10</span>}
                                                </div>
                                            </div>
                                            
                                            {r.status === 'success' && r.details?.price && (
                                                <div className="text-right">
                                                    <span className="block text-xs font-black text-zinc-900 dark:text-white">R$ {r.details.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                                    <span className="text-[9px] font-bold text-zinc-400">{isBrapiPrice ? 'Tempo Real' : 'Fechamento'}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {r.status === 'success' && r.details ? (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 font-medium">
                                                {r.details.dy !== undefined && <span className="text-emerald-600 dark:text-emerald-400">DY {r.details.dy}%</span>}
                                                {r.details.pvp !== undefined && <span>P/VP {r.details.pvp}</span>}
                                                {r.details.pl !== undefined && r.details.pl > 0 && <span>P/L {r.details.pl}</span>}
                                                {r.details.vacancy !== undefined && r.details.vacancy > 0 && <span className="text-rose-500">Vacância {r.details.vacancy}%</span>}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-rose-500 mt-1 leading-tight font-medium">{r.message}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )
                )}

                {tab === 'dividends' && (
                    allDividends.length === 0 ? (
                        <div className="text-center py-10 opacity-40"><DollarSign className="w-12 h-12 mx-auto mb-2" /><p className="text-xs font-bold">Nenhum novo provento detectado nesta varredura.</p></div>
                    ) : (
                        allDividends.map((d, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center anim-stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                                <div>
                                    <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                        {d.ticker} <span className="text-[9px] px-1.5 py-0.5 bg-white dark:bg-emerald-950 rounded border border-emerald-200 dark:border-emerald-800">{d.type}</span>
                                    </h4>
                                    <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                                        Data Com: {new Date(d.dateCom).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">R$ {d.rate.toFixed(4)}</p>
                                    <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-500/60">por cota</p>
                                </div>
                            </div>
                        ))
                    )
                )}

                {tab === 'indicators' && (
                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-rose-500" />
                                <h3 className="text-sm font-black text-rose-900 dark:text-rose-100">IPCA Acumulado (12 Meses)</h3>
                            </div>
                            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{results.inflationRate.toFixed(2)}%</p>
                            <p className="text-[10px] text-rose-800/60 dark:text-rose-300/60 mt-2 font-medium">
                                Fonte: Banco Central do Brasil / Investidor10. Utilizado para cálculo de rentabilidade real.
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-xs font-bold text-zinc-900 dark:text-white mb-1">Impacto na Carteira</h3>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                Seus investimentos precisam render acima de <strong>{results.inflationRate}%</strong> no último ano para garantir ganho real de poder de compra.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </SwipeableModal>
    );
};

// Modal de Instalação PWA
interface InstallPromptModalProps { isOpen: boolean; onInstall: () => void; onDismiss: () => void; }
export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ isOpen, onInstall, onDismiss }) => {
    const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
    if (!isMounted) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-6 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onDismiss}></div>
            <div className={`relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-sky-500/20 animate-[float_4s_ease-in-out_infinite]">
                        <Smartphone className="w-10 h-10" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">Instalar App</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed font-medium">
                        Adicione o <strong>InvestFIIs</strong> à sua tela inicial para uma experiência de tela cheia, mais rápida e offline.
                    </p>
                    <button onClick={onInstall} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl flex items-center justify-center gap-3 press-effect mb-4 hover:shadow-2xl transition-all">
                        <Download className="w-4 h-4" /> Adicionar Agora
                    </button>
                    <button onClick={onDismiss} className="text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-wider py-2">
                        Agora não
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating, progress }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-8 pb-24">
        <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 anim-scale-in">
              <Gift className="w-10 h-10" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-2">Novidades</h2>
            <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500">Versão {version}</div>
        </div>
        <div className="space-y-4">
          {notes.map((note: any, i: number) => (
              <div key={i} className="flex gap-4 p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 group transition-all hover:bg-white dark:hover:bg-zinc-800 anim-stagger-item" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <Star className="w-6 h-6 text-amber-500" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 dark:text-white tracking-tight">{note.title}</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed font-medium">{note.desc}</p>
                  </div>
              </div>
          ))}
        </div>
        {isUpdatePending && (
          <button 
            onClick={onUpdate} 
            disabled={isUpdating} 
            className="w-full mt-10 py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl press-effect flex items-center justify-center gap-3 anim-slide-up"
          >
            {isUpdating ? (
              <> <Loader2 className="w-5 h-5 animate-spin" /> <span>Atualizando {progress}%</span> </>
            ) : (
              <> <Download className="w-5 h-5" /> <span>Instalar Atualização</span> </>
            )}
          </button>
        )}
      </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 pb-20">
            <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/30">
                        <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Notificações</h2>
                        <p className="text-xs text-zinc-500 font-medium">Caixa de Entrada</p>
                    </div>
                </div>
                {notifications.length > 0 && (
                  <button onClick={onClear} className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors press-effect" title="Marcar como lidas">
                    <Check className="w-5 h-5" />
                  </button>
                )}
            </div>
            
            {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-40 flex flex-col items-center">
                  <Mail className="w-16 h-16 mb-4 text-zinc-200 dark:text-zinc-800" strokeWidth={1} />
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Tudo limpo por aqui</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n: any, i: number) => (
                        <div key={n.id} className={`p-4 rounded-2xl border flex gap-4 anim-stagger-item ${n.read ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-60' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'}`} style={{ animationDelay: `${i * 50}ms` }}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${n.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/30' : n.type === 'info' ? 'bg-sky-100 dark:bg-sky-900/20 text-sky-600 border-sky-200 dark:border-sky-900/30' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 border-zinc-300 dark:border-zinc-600'}`}>
                                {n.type === 'success' ? <DollarSignIcon /> : <InfoIcon />}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">{n.title}</h4>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed font-medium">{n.message}</p>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">
                                  {new Date(n.timestamp).toLocaleDateString('pt-BR')} • {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </SwipeableModal>
);

// Ícones simples para uso interno
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;