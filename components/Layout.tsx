
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, Cloud, CloudOff, Loader2, AlertTriangle, Gift, Star, Inbox, RefreshCw, Smartphone, X, Check, Mail, Server, WifiOff, FileText, CheckCircle, Percent, TrendingUp, DollarSign, Activity, Newspaper, CloudLightning, Wifi } from 'lucide-react';
import { UpdateReportData } from '../types';

// Utility for smooth visibility transitions (Fixed for rapid toggling)
const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Cancela qualquer fechamento pendente
      if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
      }
      
      setIsMounted(true);
      
      // HACK: Double requestAnimationFrame garante que o browser pintou o estado 'isMounted' (display: block)
      // antes de aplicar a classe 'isVisible' (opacity/translate), forçando a transição CSS.
      requestAnimationFrame(() => {
          requestAnimationFrame(() => {
              setIsVisible(true);
          });
      });
    } else {
      setIsVisible(false);
      // Agenda a desmontagem após a animação
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
          setIsMounted(false);
          timeoutRef.current = null;
      }, duration);
    }
    
    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, duration]);

  return { isMounted, isVisible };
};

// Componente Discreto de Status da Nuvem (Integrado ao Header)
const HeaderCloudStatus: React.FC<{ status: 'disconnected' | 'connected' | 'hidden' | 'syncing' }> = ({ status }) => {
    if (status === 'hidden') return null;

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-all duration-300">
            {status === 'syncing' && (
                <>
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-500 dark:text-zinc-400" />
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:inline">Sincronizando</span>
                </>
            )}
            {status === 'connected' && (
                <>
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider hidden sm:inline">Salvo</span>
                </>
            )}
            {status === 'disconnected' && (
                <>
                    <WifiOff className="w-3 h-3 text-rose-500" />
                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider hidden sm:inline">Offline</span>
                </>
            )}
        </div>
    );
};

interface HeaderProps {
  title: string;
  subtitle?: React.ReactNode;
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
  cloudStatus?: 'disconnected' | 'connected' | 'hidden' | 'syncing';
  hideBorder?: boolean;
  isVisible?: boolean; // Novo prop para controle de animação
  headerIcon?: React.ReactNode; // Novo prop para o logo
}

export const Header: React.FC<HeaderProps> = ({ 
  title, subtitle, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, cloudStatus = 'hidden', hideBorder = false, onRefresh, isVisible = true, headerIcon
}) => {
  return (
    <header 
      className={`fixed left-0 right-0 z-40 flex flex-col justify-end px-4 bg-primary-light dark:bg-primary-dark border-b border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-in-out-expo h-20 pt-safe top-0 ${hideBorder ? '!border-b-0 shadow-none' : ''}`}
      style={{ transform: isVisible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="flex items-center justify-between h-14 mb-1">
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <div className="flex items-center gap-3 w-full anim-slide-in-right">
              <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 press-effect hover:bg-zinc-200 dark:hover:bg-zinc-700">
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">Voltar</h1>
            </div>
          ) : (
            <div className="flex flex-col anim-fade-in min-w-0">
                <div className="flex items-center gap-2">
                    {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />}
                    
                    {headerIcon && (
                        <div className="shrink-0 anim-scale-in flex items-center justify-center mr-1">
                            {headerIcon}
                        </div>
                    )}

                    <h1 className="text-2xl font-black tracking-tighter truncate bg-gradient-to-br from-zinc-700 via-zinc-900 to-zinc-700 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-400 text-transparent bg-clip-text">
                      {title}
                    </h1>
                    <HeaderCloudStatus status={cloudStatus} />
                </div>
                {subtitle && (
                    <div className="anim-slide-in-right mt-0.5 ml-0.5">
                        {subtitle}
                    </div>
                )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && !showBack && (
            <button onClick={onRefresh} disabled={isRefreshing} className={`w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 press-effect hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
            </button>
          )}
          {updateAvailable && !showBack && (
            <button onClick={onUpdateClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-500 text-white press-effect shadow-none">
              <Download className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
            </button>
          )}
          {onNotificationClick && !showBack && (
            <button onClick={onNotificationClick} className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 press-effect hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Bell className="w-4 h-4" strokeWidth={2} />
              {notificationCount > 0 && 
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              }
            </button>
          )}
          {!showBack && onSettingsClick && (
            <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-transparent text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 press-effect hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
  isVisible?: boolean; // Novo prop
}

const navItems = [
  { id: 'home', icon: Home, label: 'Geral' },
  { id: 'portfolio', icon: PieChart, label: 'Carteira' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
  { id: 'news', icon: Newspaper, label: 'Notícias' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, isVisible = true }) => {
  return (
    <div 
        className="fixed bottom-6 left-0 right-0 z-[100] pointer-events-none flex justify-center items-end px-4 transition-transform duration-500 ease-in-out-expo"
        style={{ transform: isVisible ? 'translateY(0)' : 'translateY(150%)' }}
    >
      <nav className="pointer-events-auto bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 rounded-full shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 px-2 py-2 flex gap-1 items-center max-w-sm w-full justify-between ring-1 ring-white/20 dark:ring-white/10 transition-all hover:scale-[1.02]">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`group relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ease-out-mola active:scale-90 ${isActive ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                <item.icon 
                    className={`w-6 h-6 transition-all duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'scale-100'}`} 
                />
                
                {isActive && (
                    <span className="absolute -top-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap">
                        {item.label}
                    </span>
                )}
              </button>
            );
          })}
      </nav>
    </div>
  );
};

export interface InstallPromptModalProps {
  isOpen: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  // Use 400ms to match CSS transition
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  useEffect(() => { 
      // Reset drag state on open
      if (isOpen) {
          setDragOffset(0);
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; }; 
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop > 0) {
        return;
    }
    
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff < 0 && dragOffset <= 0) return;

    if (diff > 0) {
        if (e.cancelable) e.preventDefault(); 
        const resistance = 1 + (Math.pow(diff, 0.8) / window.innerHeight);
        setDragOffset(diff / resistance);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragOffset > 100) { 
        onClose();
    } else {
        setDragOffset(0);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex flex-col justify-end items-end ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
          onClick={onClose} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
          style={{ opacity: isVisible ? 1 : 0 }} 
      ></div>
      
      <div
        ref={modalRef}
        style={{
            transform: isVisible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
            transition: isDragging ? 'none' : 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
            touchAction: 'none',
            height: '96dvh', 
            maxHeight: '96dvh',
            width: '100%',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0
        }}
        className={`bg-surface-light dark:bg-zinc-950 rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10`}
      >
        <div 
            className="flex-none pt-5 pb-3 flex justify-center w-full cursor-grab active:cursor-grabbing bg-surface-light dark:bg-zinc-950 z-20 touch-none border-b border-transparent"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="w-16 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full transition-colors hover:bg-zinc-400 dark:hover:bg-zinc-600"></div>
        </div>
        
        <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto overscroll-contain pb-safe pt-2 px-1"
            style={{ overflowY: isDragging ? 'hidden' : 'auto' }}
        >
          {children}
        </div>
      </div>
    </div>, document.body
  );
};

// ... (Restante do arquivo mantido sem alterações, apenas o SwipeableModal e useAnimatedVisibility foram focados)
interface ConfirmationModalProps { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 250);
  if (!isMounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-6 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/60 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel}></div>
      <div className={`relative bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-xs p-8 text-center shadow-2xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) border border-zinc-100 dark:border-zinc-800 ring-1 ring-black/5 dark:ring-white/5 ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}>
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

export const UpdateReportModal: React.FC<{ isOpen: boolean; onClose: () => void; results: UpdateReportData }> = ({ isOpen, onClose, results }) => {
    const updatedAssets = results.results.filter(r => r.status === 'success');
    const failedAssets = results.results.filter(r => r.status === 'error');
    const newDividends = results.results.flatMap(r => 
        (r.dividendsFound || []).map(d => ({ ...d, ticker: r.ticker }))
    );

    return (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="px-6 pb-20 bg-zinc-50 dark:bg-zinc-950 min-h-full">
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
            
            <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Atualizados</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">{updatedAssets.length}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Proventos</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{results.totalDividendsFound}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Erros</p>
                    <p className={`text-xl font-black ${failedAssets.length > 0 ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>{failedAssets.length}</p>
                </div>
            </div>

            <div className="space-y-6">
                {newDividends.length > 0 && (
                    <div className="anim-slide-up">
                        <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Novos Proventos Encontrados</h3>
                        <div className="space-y-2">
                            {newDividends.map((div, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                            {div.ticker.substring(0,2)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-white">{div.ticker}</p>
                                            <p className="text-[9px] text-zinc-500 font-medium">Pagamento: {div.paymentDate ? new Date(div.paymentDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">R$ {div.rate.toFixed(4)}</p>
                                        <p className="text-[9px] text-zinc-400 uppercase font-bold">{div.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="anim-slide-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Ativos Processados</h3>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                        {updatedAssets.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{r.ticker}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-medium text-zinc-400">R$ {r.details?.price?.toFixed(2)}</span>
                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                </div>
                            </div>
                        ))}
                        {failedAssets.map((r, i) => (
                            <div key={`err-${i}`} className="flex justify-between items-center p-3 bg-rose-50/50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/20 last:border-0">
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{r.ticker}</span>
                                <span className="text-[9px] font-bold text-rose-500 uppercase">Falha</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </SwipeableModal>
    );
};

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ isOpen, onInstall, onDismiss }) => {
    const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
    if (!isMounted) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-6 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className={`absolute inset-0 bg-black/80 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onDismiss}></div>
            <div className={`relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl animate-[float_4s_ease-in-out_infinite]">
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
      <div className="px-8 pb-24 pt-4">
        <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 anim-scale-in">
              <Gift className="w-10 h-10" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-2">Novidades</h2>
            <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500">Versão {version}</div>
        </div>
        <div className="space-y-4">
          {notes.map((note: any, i: number) => (
              <div key={i} className="flex gap-4 p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800 group transition-all hover:bg-white dark:hover:bg-zinc-700 anim-stagger-item" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm">
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
        <div className="px-6 pb-20 pt-2">
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
                        <div key={n.id} className={`p-4 rounded-2xl border flex gap-4 anim-stagger-item ${n.read ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-60' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`} style={{ animationDelay: `${i * 50}ms` }}>
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

const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
