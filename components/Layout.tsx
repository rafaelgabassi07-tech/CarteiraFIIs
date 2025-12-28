
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Wallet, Calendar, DollarSign, Clock, Zap, ChevronRight, Inbox, MessageSquare, Sparkles } from 'lucide-react';
import { ReleaseNote, AppNotification } from '../types';

// Custom hook for managing enter/exit animations
const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsMounted(false), duration);
    }
  }, [isOpen, duration]);

  return { isMounted, isVisible };
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
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onSettingsClick, 
  showBack, 
  onBack,
  onRefresh, 
  isRefreshing,
  onNotificationClick,
  notificationCount = 0,
  updateAvailable,
  onUpdateClick,
  appVersion = '5.0.0'
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 h-24 flex items-center justify-between px-6 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl pt-2 border-b border-slate-200/50 dark:border-white/5' : 'bg-transparent pt-4 border-b border-transparent'}`}>
      <div className="flex items-center gap-3 w-full">
        {showBack ? (
          <div className="flex items-center gap-3 w-full anim-fade-in-up is-visible">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm group border border-slate-100 dark:border-white/5">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </button>
            <div className="flex flex-col ml-1">
                <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Ajustes</h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">InvestFIIs v{appVersion}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col anim-fade-in-up is-visible">
              <div className="flex items-center gap-2.5">
                  <div className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent ring-2 ring-white dark:ring-[#020617]"></span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>
                  {updateAvailable && (
                    <button 
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 cursor-pointer active:scale-95 transition-transform" 
                        onClick={onUpdateClick}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                      <span className="text-[8px] font-bold text-accent uppercase">Upd</span>
                    </button>
                  )}
              </div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-5 pl-0.5">
                  {isRefreshing ? 'Sincronizando...' : 'Conectado'}
              </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30 active:scale-95 transition-all border border-white/20">
            <Download className="w-4 h-4 animate-pulse" strokeWidth={2.5} />
          </button>
        )}
        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group border border-slate-100 dark:border-white/5">
            <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" strokeWidth={2} />
            {notificationCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full shadow-sm ring-2 ring-white dark:ring-[#020617]"></span>}
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group border border-slate-100 dark:border-white/5">
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  );
};

export const UpdateBanner: React.FC<{ 
  isOpen: boolean; 
  onDismiss: () => void; 
  onUpdate: () => void; 
  version: string 
}> = ({ isOpen, onDismiss, onUpdate, version }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 300);
  if (!isMounted) return null;

  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm anim-fade-in-up ${isVisible ? 'is-visible' : ''}`}>
      <div className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl shadow-accent/10 flex items-center justify-between gap-4 border border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
             <Rocket className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">Nova Versão {version}</h4>
            <p className="text-[10px] font-medium text-slate-500 leading-none mt-1">Atualização disponível</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onUpdate} className="px-3 py-2 bg-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md">
             Atualizar
           </button>
           <button onClick={onDismiss} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white active:scale-90 transition-all">
             <X className="w-4 h-4" strokeWidth={2.5} />
           </button>
        </div>
      </div>
    </div>
  );
};

export const BottomNav: React.FC<{ currentTab: string; onTabChange: (tab: string) => void }> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'portfolio', icon: PieChart, label: 'Carteira' },
    { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <nav className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl p-2 rounded-[1.5rem] flex items-center gap-2 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 pointer-events-auto transition-all duration-300 border border-white/20 dark:border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)} 
              className={`relative flex items-center justify-center h-12 rounded-2xl transition-all duration-500 ease-out-quint active:scale-95 ${isActive ? 'bg-accent text-white shadow-lg shadow-accent/30 px-6' : 'px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
               <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
               <div className={`overflow-hidden transition-[max-width,opacity,margin] duration-500 ease-out-quint flex items-center ${isActive ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`}>
                 <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                   {tab.label}
                 </span>
               </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export const SwipeableModal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 500);
  const [offsetY, setOffsetY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const triggerClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isMounted) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (!isDragging.current && diff > 5 && contentRef.current?.scrollTop === 0) {
      isDragging.current = true;
    }
    
    if (isDragging.current) {
      e.preventDefault();
      setOffsetY(Math.max(0, diff));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const modalHeight = modalRef.current?.clientHeight || window.innerHeight;
    const closeThreshold = Math.max(120, modalHeight * 0.3);

    if (offsetY > closeThreshold) {
      triggerClose();
    } else {
      setOffsetY(0);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-auto">
      <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto anim-fade-in ${isVisible ? 'is-visible' : ''}`} onClick={triggerClose} />
      <div 
        ref={modalRef}
        className={`bg-white dark:bg-[#0b1121] w-full h-[calc(100dvh-4.5rem)] rounded-t-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto anim-slide-up border-t border-white/20 dark:border-white/5 ${isVisible ? 'is-visible' : ''}`}
        style={{
          transform: `translateY(${offsetY}px)`,
          transition: isDragging.current ? 'none' : 'transform var(--duration-normal) var(--ease-out-quint)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full h-10 flex items-center justify-center shrink-0 touch-none bg-transparent">
          <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto no-scrollbar pb-10 px-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export const NotificationsModal: React.FC<{ isOpen: boolean; onClose: () => void; notifications: AppNotification[]; onClear: () => void }> = ({ isOpen, onClose, notifications, onClear }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[2000] flex flex-col bg-slate-50 dark:bg-[#020617] anim-fade-in ${isVisible ? 'is-visible' : ''}`}>
        <div className="px-6 pt-safe pb-4 bg-white dark:bg-[#0f172a] shadow-sm z-10 sticky top-0 border-b border-slate-100 dark:border-white/5">
             <div className="flex items-center justify-between pt-4">
                 <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-transform">
                     <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                 </button>
                 <div className="text-center">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">Notificações</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Central de Mensagens</p>
                 </div>
                 <button onClick={onClear} disabled={notifications.length === 0} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${notifications.length > 0 ? 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500' : 'opacity-0 pointer-events-none'}`}>
                     <Trash2 className="w-5 h-5" />
                 </button>
             </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] opacity-60">
                   <div className="w-24 h-24 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 anim-fade-in is-visible">
                      <Inbox className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>Tudo Limpo</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[250px] anim-fade-in-up is-visible" style={{ animationDelay: '200ms' }}>Você não tem novas notificações.</p>
                </div>
             ) : (
                notifications.map((n, i) => (
                    <div key={n.id} className={`p-5 rounded-[1.8rem] border flex gap-4 transition-all active:scale-[0.98] anim-fade-in-up shadow-sm ${isVisible ? 'is-visible' : ''}`} style={{ transitionDelay: `${i * 50}ms` }}>
                       {/* Conteúdo do Card de Notificação... */}
                    </div>
                ))
             )}
        </div>
    </div>,
    document.body
  );
};

export const ChangelogModal: React.FC<{ 
  isOpen: boolean; onClose: () => void; version: string; notes?: ReleaseNote[];
  isUpdatePending?: boolean; onUpdate?: () => void; progress?: number;
}> = ({ isOpen, onClose, version, notes, isUpdatePending, onUpdate, progress = 0 }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6">
        <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-xl anim-fade-in ${isVisible ? 'is-visible' : ''}`} onClick={progress > 0 ? undefined : onClose} />
        <div className={`relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden anim-scale-in border border-white/10 ${isVisible ? 'is-visible' : ''}`}>
            <div className="relative h-40 bg-slate-900 overflow-hidden shrink-0">{/* ... */}</div>
            <div className="flex-1 overflow-y-auto max-h-[50vh] p-8 bg-white dark:bg-[#0f172a]">{/* ... */}</div>
            <div className="p-6 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-white/5 shrink-0">{/* ... */}</div>
        </div>
    </div>,
    document.body
  );
};
