import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, Cloud, CloudOff, Loader2, AlertTriangle, Gift, Star, Inbox, RefreshCw, Smartphone, X, Check, Mail, Server, WifiOff, FileText, CheckCircle, Percent, TrendingUp, DollarSign, Activity, Newspaper, CloudLightning, Wifi, CircleHelp, Calendar, Award, Clock } from 'lucide-react';
import { UpdateReportData } from '../types';

const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsMounted(true);
      // Double requestAnimationFrame ensures the element is in the DOM before adding the visible class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timeoutRef.current = window.setTimeout(() => {
          setIsMounted(false);
          timeoutRef.current = null;
      }, duration);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isOpen, duration]);

  return { isMounted, isVisible };
};

export const InfoTooltip = ({ title, text }: { title: string, text: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} 
                className="text-zinc-400/70 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-0.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 flex items-center justify-center shrink-0"
                aria-label="Informação"
                style={{ marginTop: '-1px' }}
            >
                <CircleHelp className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => setIsOpen(false)}>
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl anim-scale-in border border-zinc-100 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 text-indigo-600 mx-auto border-4 border-white dark:border-zinc-900 shadow-sm">
                            <CircleHelp className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-zinc-900 dark:text-white mb-2">{title}</h3>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-relaxed mb-6 font-medium">
                            {text}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm press-effect shadow-lg">
                            Entendi
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

const HeaderCloudStatus: React.FC<{ status: 'disconnected' | 'connected' | 'hidden' | 'syncing' }> = ({ status }) => {
    if (status === 'hidden') return null;
    return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 transition-all">
            {status === 'syncing' && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            {status === 'connected' && <Cloud className="w-3 h-3 text-emerald-500" />}
            {status === 'disconnected' && <WifiOff className="w-3 h-3 text-rose-500" />}
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
  isVisible?: boolean;
  headerIcon?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, subtitle, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, cloudStatus = 'hidden', hideBorder = false, onRefresh, isVisible = true, headerIcon
}) => {
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className={`absolute inset-0 bg-primary-light/80 dark:bg-primary-dark/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 transition-opacity duration-300 ${hideBorder ? 'opacity-0' : 'opacity-100'}`}></div>

      <div className="relative z-10 flex flex-col justify-end px-4 h-[calc(3.2rem+env(safe-area-inset-top))] pb-2 pt-safe">
        <div className="flex items-center justify-between">
          
          <div className="flex items-center gap-3.5 min-w-0">
            {showBack ? (
              <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-900 dark:text-white -ml-2 press-effect">
                <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
                <span className="text-xl font-black tracking-tight">Voltar</span>
              </button>
            ) : (
              <div className="flex flex-col justify-center">
                 <div className="flex items-center gap-3">
                    {headerIcon && <div className="w-9 h-9 flex items-center justify-center anim-scale-in shrink-0 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm">{headerIcon}</div>}
                    <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white truncate leading-none">
                      {title}
                    </h1>
                 </div>
                 {subtitle && <div className={`text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5 ${headerIcon ? 'ml-12' : 'ml-0'}`}>{subtitle}</div>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
             <HeaderCloudStatus status={cloudStatus} />
             
             {isRefreshing && (
               <div className="w-9 h-9 flex items-center justify-center">
                 <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
               </div>
             )}

             {onRefresh && !showBack && !isRefreshing && (
               <button onClick={onRefresh} className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors press-effect">
                 <RefreshCw className="w-4 h-4" />
               </button>
             )}

             {updateAvailable && (
               <button onClick={onUpdateClick} className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-500 text-white press-effect shadow-lg shadow-indigo-500/30 anim-scale-in">
                 <Download className="w-4 h-4" />
               </button>
             )}

             {onNotificationClick && !showBack && (
               <button onClick={onNotificationClick} className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors press-effect relative">
                 <Bell className="w-5 h-5" />
                 {notificationCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-black anim-scale-in"></span>}
               </button>
             )}

             {!showBack && onSettingsClick && (
               <button onClick={onSettingsClick} className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors press-effect">
                 <Settings className="w-5 h-5" />
               </button>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isVisible?: boolean;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'portfolio', icon: PieChart, label: 'Carteira' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
  { id: 'watchlist', icon: Star, label: 'Favoritos' },
  { id: 'news', icon: Newspaper, label: 'News' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, isVisible = true }) => {
  return (
    <div 
        className="fixed bottom-6 left-0 right-0 z-[90] flex justify-center pointer-events-none transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
        style={{ transform: isVisible ? 'translateY(0)' : 'translateY(200%)' }}
    >
      <nav className="pointer-events-auto bg-zinc-900/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl shadow-black/40 ring-1 ring-white/5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 group ${isActive ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
              >
                <item.icon 
                    className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-100' : 'scale-100 group-active:scale-90'}`} 
                    strokeWidth={isActive ? 2.5 : 2}
                />
              </button>
            );
          })}
      </nav>
    </div>
  );
};

interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; className?: string; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children, className = 'h-[92dvh]' }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const [dragY, setDragY] = useState(0);

  // Scroll Lock Effect
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      // Cleanup only if unmounting while open (edge case)
      if (isOpen) {
          const scrollY = document.body.style.top;
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.top = '';
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen]);

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex flex-col justify-end isolate touch-none`}>
      <div 
          onClick={onClose} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
          style={{ opacity: isVisible ? 1 : 0 }} 
      ></div>
      
      <div
        style={{
            transform: isVisible ? `translateY(${dragY}px)` : 'translateY(100%)',
            transition: dragY === 0 ? 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        className={`relative bg-white dark:bg-zinc-900 w-full ${className} rounded-t-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/5`}
      >
        <div className="w-full flex justify-center pt-3 pb-3 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none z-10"
             onTouchMove={(e) => {
               // Simple drag logic
               const val = e.touches[0].clientY - (window.innerHeight - (e.currentTarget.parentElement?.clientHeight || 0));
               if(val > 0) setDragY(val);
             }}
             onTouchEnd={() => {
               if(dragY > 150) onClose();
               setDragY(0);
             }}
        >
          <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700"></div>
        </div>

        <div className="flex-1 min-h-0 w-full relative flex flex-col overflow-y-auto overscroll-contain">
            {children}
        </div>
      </div>
    </div>, document.body
  );
};

export const ConfirmationModal: React.FC<any> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm anim-fade-in">
             <div className="bg-white dark:bg-zinc-900 w-full max-w-xs p-6 rounded-3xl text-center shadow-2xl anim-scale-in">
                 <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                     <AlertTriangle className="w-7 h-7" />
                 </div>
                 <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
                 <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{message}</p>
                 <div className="grid grid-cols-2 gap-3">
                     <button onClick={onCancel} className="py-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-sm press-effect">Cancelar</button>
                     <button onClick={onConfirm} className="py-3.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm press-effect shadow-lg">Confirmar</button>
                 </div>
             </div>
        </div>
    )
}

export const InstallPromptModal: React.FC<any> = ({ isOpen, onInstall, onDismiss }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl anim-slide-up">
                 <div className="flex items-start gap-4 mb-6">
                     <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-sky-500 rounded-2xl shadow-lg flex items-center justify-center text-white shrink-0">
                         <Smartphone className="w-7 h-7" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Instalar App</h3>
                         <p className="text-sm text-zinc-500 mt-1">Adicione à tela inicial para melhor experiência.</p>
                     </div>
                 </div>
                 <button onClick={onInstall} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm mb-3 press-effect shadow-xl">Instalar Agora</button>
                 <button onClick={onDismiss} className="w-full py-2 text-zinc-400 font-medium text-xs">Agora não</button>
            </div>
        </div>
    );
};

export const UpdateReportModal: React.FC<any> = (props) => (
    <SwipeableModal {...props}>
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">Atualização Concluída</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Resumo de Mercado</p>
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pb-20">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Ativos</p>
                        <p className="text-xl font-black text-zinc-900 dark:text-white">{props.results?.results?.length || 0}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Proventos</p>
                        <p className="text-xl font-black text-emerald-500">+{props.results?.totalDividendsFound || 0}</p>
                    </div>
                 </div>

                 <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                     <div className="flex justify-between items-center mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                         <div className="flex items-center gap-2">
                             <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                             <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">CDI (12m)</span>
                         </div>
                         <span className="text-sm font-black text-zinc-900 dark:text-white">{props.results?.cdiRate?.toFixed(2)}%</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2">
                             <Activity className="w-3.5 h-3.5 text-cyan-500" />
                             <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">IPCA (12m)</span>
                         </div>
                         <span className="text-sm font-black text-zinc-900 dark:text-white">{props.results?.inflationRate?.toFixed(2)}%</span>
                     </div>
                 </div>

                 <div className="pt-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 ml-1">Ativos Sincronizados</p>
                    <div className="space-y-2">
                        {props.results?.results?.slice(0, 10).map((r: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">{r.ticker}</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">OK</span>
                                </div>
                            </div>
                        ))}
                        {props.results?.results?.length > 10 && (
                            <p className="text-center text-[10px] text-zinc-400 font-medium py-2">E mais {props.results.results.length - 10} ativos...</p>
                        )}
                    </div>
                 </div>
            </div>

            <button onClick={props.onClose} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl press-effect mt-auto">
                Entendido
            </button>
        </div>
    </SwipeableModal>
);

export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes, onUpdate, isUpdating }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-8 text-center h-full flex flex-col overflow-y-auto pb-20">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shrink-0">
                <Gift className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 shrink-0">Novidades v{version}</h2>
            <div className="space-y-4 text-left mt-8 mb-8 flex-1">
                {notes?.map((n: any, i: number) => (
                    <div key={i} className="flex gap-4">
                        <Star className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{n.title}</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">{n.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            {onUpdate && (
                <button onClick={onUpdate} disabled={isUpdating} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold shadow-lg press-effect shrink-0">
                    {isUpdating ? 'Atualizando...' : 'Instalar Atualização'}
                </button>
            )}
        </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onMarkAllRead, onDeleteAll, onDeleteRead }) => {
    const groupedNotifications = useMemo(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups: { [key: string]: any[] } = {
            'Hoje': [],
            'Ontem': [],
            'Antigas': []
        };

        notifications.forEach((n: any) => {
            const date = new Date(n.timestamp);
            if (date.toDateString() === today.toDateString()) {
                groups['Hoje'].push(n);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups['Ontem'].push(n);
            } else {
                groups['Antigas'].push(n);
            }
        });

        return groups;
    }, [notifications]);

    const hasNotifications = notifications.length > 0;
    const hasReadNotifications = notifications.some((n: any) => n.read);
    const hasUnreadNotifications = notifications.some((n: any) => !n.read);

    return (
        <SwipeableModal isOpen={isOpen} onClose={onClose}>
            <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
                {/* Compact Header */}
                <div className="px-5 pt-6 pb-5 shrink-0 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Central de Avisos</p>
                            </div>
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">Notificações</h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 border border-zinc-200/50 dark:border-zinc-800/50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Action Bar - Clean & Professional */}
                    {hasNotifications && (
                        <div className="flex items-center gap-2 mt-5">
                            {hasUnreadNotifications && (
                                <button 
                                    onClick={onMarkAllRead}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                >
                                    <Check className="w-3 h-3" /> Marcar Lidas
                                </button>
                            )}
                            {hasReadNotifications && (
                                <button 
                                    onClick={onDeleteRead}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> Limpar Lidas
                                </button>
                            )}
                            <button 
                                onClick={onDeleteAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors ml-auto"
                            >
                                <Trash2 className="w-3 h-3" /> Tudo
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto pb-24 px-5 py-6 space-y-8 no-scrollbar bg-zinc-50/30 dark:bg-zinc-950">
                    {!hasNotifications ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center text-zinc-200 dark:text-zinc-800 mb-5 relative shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <Bell className="w-8 h-8" strokeWidth={1} />
                                <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 animate-[spin_40s_linear_infinite]"></div>
                            </div>
                            <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight mb-1">Tudo em ordem</h3>
                            <p className="text-[11px] font-medium text-zinc-400 max-w-[240px] leading-relaxed">
                                Nenhuma notificação por aqui no momento.
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedNotifications).map(([label, group]) => (
                            group.length > 0 && (
                                <div key={label} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
                                        <div className="h-px flex-1 bg-zinc-200/50 dark:bg-zinc-800/50"></div>
                                    </div>
                                    <div className="space-y-2.5">
                                        {group.map((n: any) => (
                                            <div 
                                                key={n.id} 
                                                className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                                                    n.read 
                                                        ? 'bg-white/40 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800/30 opacity-60' 
                                                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-indigo-500/30'
                                                }`}
                                            >
                                                {!n.read && (
                                                    <div className="absolute top-4 right-4 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                                        n.category === 'payment' ? 'bg-emerald-500 text-white' : 
                                                        n.category === 'datacom' ? 'bg-indigo-500 text-white' :
                                                        n.category === 'alert' ? 'bg-rose-500 text-white' :
                                                        n.category === 'event' ? 'bg-purple-500 text-white' :
                                                        'bg-sky-500 text-white'
                                                    }`}>
                                                        {n.category === 'payment' ? <DollarSign className="w-5 h-5" strokeWidth={2.5} /> : 
                                                         n.category === 'datacom' ? <Calendar className="w-5 h-5" strokeWidth={2.5} /> :
                                                         n.category === 'alert' ? <AlertTriangle className="w-5 h-5" strokeWidth={2.5} /> :
                                                         n.category === 'event' ? <Award className="w-5 h-5" strokeWidth={2.5} /> :
                                                         <Inbox className="w-5 h-5" strokeWidth={2.5} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-0.5 pr-6">
                                                            <h4 className={`text-xs font-black tracking-tight leading-tight ${n.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                                                                {n.title}
                                                            </h4>
                                                        </div>
                                                        <p className={`text-[11px] leading-relaxed font-medium mb-3 ${n.read ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                            {n.message}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                <span className="text-[8px] font-black uppercase tracking-widest">
                                                                    {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">
                                                                {n.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))
                    )}
                </div>
            </div>
        </SwipeableModal>
    );
};
