
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Wallet, Calendar, DollarSign, Clock, Zap, ChevronRight, Inbox, MessageSquare, Sparkles, PackageCheck, AlertCircle, Sparkle, PartyPopper, Loader2, CloudOff, Cloud, Wifi, Lock, Fingerprint, Delete, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ReleaseNote, AppNotification, ReleaseNoteType } from '../types';

const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
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
      className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+8px)] pb-1.5 px-4 text-[9px] font-black uppercase tracking-[0.15em] shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform will-change-transform ${
        isHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      } ${
        isConnected 
          ? 'bg-[#10b981] text-white' 
          : isSyncing 
            ? 'bg-indigo-500 text-white'
            : 'bg-slate-800 text-white'
      }`}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-2.5 h-2.5 animate-spin text-white/80" />
          <span>Sincronizando...</span>
        </>
      ) : isConnected ? (
        <div className="flex items-center gap-2">
          <Cloud className="w-3 h-3 text-white" strokeWidth={2.5} />
          <span>Sincronizado</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
           <CloudOff className="w-3 h-3" />
           <span>Offline</span>
        </div>
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
  appVersion = '5.0.0',
  bannerVisible = false
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
        const scrolled = window.scrollY > 10;
        if (scrolled !== isScrolled) setIsScrolled(scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolled]);

  return (
    <header 
      className={`fixed left-0 right-0 z-40 h-24 flex items-center justify-between px-6 transition-all duration-500 ease-out-quint will-change-transform ${
        bannerVisible ? 'top-10' : 'top-0'
      } ${
        isScrolled 
          ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl pt-2 border-b border-slate-200/50 dark:border-white/5' 
          : 'bg-transparent pt-4 border-b border-transparent'
      }`}
    >
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
                  {isRefreshing ? 'Sincronizando...' : 'FIIs & Ações'}
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
            {notificationCount > 0 && 
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full shadow-sm ring-2 ring-white dark:ring-[#020617] text-white text-[10px] font-bold flex items-center justify-center">
                {notificationCount}
              </span>
            }
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group border border-slate-100 dark:border-white/5">
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  );
};

interface SwipeableModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentDeltaY = useRef(0);
  const isDragging = useRef(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Só inicia o drag se o conteúdo interno estiver no topo (scroll zero)
    if (modalRef.current && modalRef.current.scrollTop <= 1) {
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
      isDragging.current = true;
      currentDeltaY.current = 0;
      
      // Resposta tátil imediata: remove transições
      modalRef.current.style.transition = 'none'; 
      if (backdropRef.current) backdropRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || !modalRef.current) return;
    
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - touchStartY.current;
    
    // Movimento para baixo (arrasto para fechar)
    if (deltaY > 0) {
      // Se o usuário rolou o conteúdo para baixo, cancela o gesto de arrasto do modal
      if (modalRef.current.scrollTop > 5) {
          isDragging.current = false;
          return;
      }

      if (e.cancelable) e.preventDefault();
      currentDeltaY.current = deltaY;
      
      if (rafId.current) cancelAnimationFrame(rafId.current);
      
      rafId.current = requestAnimationFrame(() => {
          if (modalRef.current) {
              // Aplica transform com GPU (translate3d)
              modalRef.current.style.transform = `translate3d(0, ${deltaY}px, 0)`;
              
              if (backdropRef.current) {
                  // Efeito de saída sincronizado: opacidade e desfoque diminuem proporcionalmente
                  const progress = Math.min(1, deltaY / (window.innerHeight * 0.4));
                  const opacity = Math.max(0, 1 - progress);
                  backdropRef.current.style.opacity = String(opacity);
                  backdropRef.current.style.backdropFilter = `blur(${Math.max(0, 8 * (1 - progress))}px)`;
              }
          }
      });
    } else {
        // Resistência elástica ao puxar para cima no topo do modal
        if (modalRef.current.scrollTop <= 0) {
            if (e.cancelable) e.preventDefault();
            const resistance = Math.pow(Math.abs(deltaY), 0.7); // Resistência logarítmica
            modalRef.current.style.transform = `translate3d(0, -${resistance}px, 0)`;
        } else {
            // Se estiver rolando o conteúdo normalmente, libera o gesto
            isDragging.current = false;
        }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !modalRef.current) return;
    isDragging.current = false;
    
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = currentDeltaY.current / deltaTime; // pixels por milissegundo
    
    // Restaura as transições para o fechamento ou retorno suave
    modalRef.current.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
    if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 0.4s ease, backdrop-filter 0.4s ease';
    }

    // Fechamento Inteligente: Gatilho por distância (150px) OU por velocidade (Flick)
    if (currentDeltaY.current > 150 || (velocity > 0.5 && currentDeltaY.current > 20)) { 
      onClose();
    } else {
      // Snap back: retorna à posição original
      modalRef.current.style.transform = 'translate3d(0, 0, 0)';
      if (backdropRef.current) {
          backdropRef.current.style.opacity = '1';
          backdropRef.current.style.backdropFilter = 'blur(8px)';
      }
    }
  };

  useEffect(() => {
      return () => {
          if (rafId.current) cancelAnimationFrame(rafId.current);
      };
  }, []);

  if (!isMounted) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-400 ease-out-quint overscroll-none ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div 
        ref={backdropRef}
        className={`absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-all duration-400 ease-out-quint will-change-[opacity,backdrop-filter] ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      ></div>
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-primary-light dark:bg-[#0b1121] rounded-t-[2.5rem] h-[93dvh] w-full overflow-y-auto overscroll-contain shadow-2xl pb-safe will-change-transform gpu ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
            transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
            WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Modal Handle - Área de Arraste Visual */}
        <div className="sticky top-0 z-[110] flex justify-center pt-4 pb-2 bg-primary-light/95 dark:bg-[#0b1121]/95 backdrop-blur-md touch-none">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full opacity-60 active:opacity-100 active:scale-x-110 transition-all"></div>
        </div>
        
        {children}
      </div>
    </div>,
    document.body
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 300);

  if (!isMounted) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
      ></div>
      <div 
        className={`relative bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-sm shadow-xl p-6 text-center transition-all duration-300 ease-out-quint transform will-change-transform ${
          isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'
        }`}
      >
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4 text-rose-500">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onCancel} 
            className="py-3 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="py-3 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-transform"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'portfolio', icon: PieChart, label: 'Carteira' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none pb-safe">
      <nav className="pointer-events-auto bg-[#0f172a] shadow-2xl shadow-black/50 p-2 rounded-full flex items-center gap-2 border border-white/10 backdrop-blur-2xl gpu">
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                relative flex items-center justify-center h-12 rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
                ${isActive 
                  ? 'bg-white text-[#0f172a] pl-5 pr-6 w-auto' 
                  : 'bg-transparent text-slate-500 hover:text-slate-300 w-12 hover:bg-white/5'
                }
              `}
            >
              <item.icon 
                className={`w-6 h-6 shrink-0 transition-colors duration-300 ${isActive ? 'text-[#0f172a]' : 'text-slate-500'}`} 
                strokeWidth={2.5} 
              />
              <div className={`
                overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isActive ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'}
              `}>
                <span className="text-sm font-bold whitespace-nowrap">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  notes?: ReleaseNote[];
  isUpdatePending: boolean;
  onUpdate: () => void;
  isUpdating: boolean;
  progress: number;
}

const getNoteIcon = (type: ReleaseNoteType) => {
  switch (type) {
    case 'feat': return { Icon: Rocket, color: 'text-indigo-500 bg-indigo-500/10' };
    case 'fix': return { Icon: Check, color: 'text-emerald-500 bg-emerald-500/10' };
    case 'perf': return { Icon: Zap, color: 'text-amber-500 bg-amber-500/10' };
    case 'ui': return { Icon: Palette, color: 'text-sky-500 bg-sky-500/10' };
    default: return { Icon: Star, color: 'text-slate-500 bg-slate-500/10' };
  }
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating, progress,
}) => {
  if (!isOpen) return null;

  return (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-8">
        <div className="text-center mb-6 mt-2">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 text-accent">
            <Gift className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Novidades na v{version}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Confira o que mudou na última atualização.</p>
        </div>
        <div className="space-y-4 mb-8">
          {notes.map((note, i) => {
            const { Icon, color } = getNoteIcon(note.type);
            return (
              <div key={i} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{note.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{note.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        {isUpdatePending && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#0b1121]/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-white/5 pb-safe">
             <div className="max-w-lg mx-auto">
              <button 
                onClick={onUpdate} 
                disabled={isUpdating}
                className="w-full relative overflow-hidden bg-accent text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-accent/30 active:scale-95 transition-all disabled:opacity-70"
              >
                 {isUpdating ? 'Atualizando...' : 'Instalar Atualização'}
                 {isUpdating && (
                    <div className="absolute top-0 left-0 h-full bg-white/20" style={{width: `${progress}%`}}></div>
                 )}
              </button>
             </div>
          </div>
        )}
      </div>
    </SwipeableModal>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClear: () => void;
}

const getNotificationIcon = (type: AppNotification['type']) => {
    switch(type) {
        case 'success': return { Icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' };
        case 'warning': return { Icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' };
        case 'update': return { Icon: ArrowUpCircle, color: 'text-accent bg-accent/10' };
        default: return { Icon: Info, color: 'text-slate-500 bg-slate-500/10' };
    }
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, notifications, onClear }) => {
  
  return (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-2 pb-8">
        <div className="flex items-center justify-between mb-6 mt-2">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                    <Bell className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notificações</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Central de Alertas</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                    <button onClick={onClear} className="text-xs font-bold text-rose-500 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Limpar
                    </button>
                )}
            </div>
        </div>
        
        {notifications.length === 0 ? (
            <div className="text-center py-20 opacity-60">
                <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1} />
                <p className="text-sm font-bold text-slate-500">Caixa de entrada vazia</p>
                <p className="text-xs text-slate-400 mt-1">Você está em dia com tudo.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {notifications.map(n => {
                    const { Icon, color } = getNotificationIcon(n.type);
                    return (
                        <div key={n.id} className={`p-4 rounded-2xl flex items-start gap-4 border ${n.read ? 'bg-slate-50 dark:bg-white/5 border-transparent opacity-60' : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-white/5 shadow-sm'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{n.title}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{n.message}</p>
                                {n.actionLabel && n.onAction && (
                                    <button onClick={n.onAction} className="mt-3 px-3 py-1 bg-accent/10 text-accent text-[10px] font-bold uppercase rounded-md">
                                        {n.actionLabel}
                                    </button>
                                )}
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-accent mt-1.5"></div>}
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </SwipeableModal>
  );
};

interface LockScreenProps {
  isOpen: boolean;
  correctPin: string;
  onUnlock: () => void;
  isBiometricsEnabled: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({ isOpen, correctPin, onUnlock, isBiometricsEnabled }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);

  const handleKeyPress = (key: string) => {
    if (error) setError(false);
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (pin.length < 4) {
      setPin(p => p + key);
    }
  };
  
  const attemptBiometrics = useCallback(async () => {
      if (!isBiometricsEnabled || !window.PublicKeyCredential) return;
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [],
            userVerification: 'required',
            timeout: 60000,
          }
        });
        onUnlock();
      } catch (e) {
        console.warn('Biometric auth failed or cancelled', e);
      }
  }, [isBiometricsEnabled, onUnlock]);
  
  useEffect(() => {
    if (isVisible && isBiometricsEnabled) {
      attemptBiometrics();
    }
  }, [isVisible, isBiometricsEnabled, attemptBiometrics]);
  
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin, correctPin, onUnlock]);

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[1000] bg-[#020617] backdrop-blur-2xl transition-opacity duration-300 flex flex-col justify-between items-center py-20 px-6 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Fingerprint className="w-8 h-8 text-white/50" />
        </div>
        <h2 className="text-xl font-bold text-white">App Bloqueado</h2>
        <p className="text-sm text-slate-400 mt-1">Insira seu PIN para continuar</p>
      </div>
      
      <div className="flex items-center gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${error ? 'bg-rose-500 animate-pulse' : pin.length > i ? 'bg-white' : 'bg-white/20'}`}></div>
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-6 max-w-[280px] mx-auto w-full">
        {[1,2,3,4,5,6,7,8,9].map(num => (
          <button key={num} onClick={() => handleKeyPress(String(num))} className="w-16 h-16 rounded-full bg-white/5 text-xl font-bold text-white flex items-center justify-center active:bg-white/20 transition-colors">
            {num}
          </button>
        ))}
        {isBiometricsEnabled ? (
            <button onClick={attemptBiometrics} className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/50 active:bg-white/20 transition-colors">
                <Fingerprint className="w-7 h-7" />
            </button>
        ) : <div className="w-16 h-16"></div>}
        <button onClick={() => handleKeyPress('0')} className="w-16 h-16 rounded-full bg-white/5 text-xl font-bold text-white flex items-center justify-center active:bg-white/20 transition-colors">
            0
        </button>
        <button onClick={() => handleKeyPress('del')} className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/50 active:bg-white/20 transition-colors">
            <Delete className="w-7 h-7" />
        </button>
      </div>
    </div>,
    document.body
  );
};
