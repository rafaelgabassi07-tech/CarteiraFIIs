
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, Cloud, CloudOff, Loader2, AlertTriangle, Gift, Star, Inbox } from 'lucide-react';

// Utility for smooth visibility transitions
const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
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
      className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+6px)] pb-2 px-4 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 transform will-change-transform shadow-sm ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      } ${
        isConnected ? 'bg-emerald-600 text-white' : 
        isSyncing ? 'bg-slate-800 text-white' : 'bg-rose-600 text-white'
      }`}
    >
      {isSyncing ? (
        <> <Loader2 className="w-2.5 h-2.5 animate-spin text-white/80" /> <span>Sincronizando...</span> </>
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
}

export const Header: React.FC<HeaderProps> = ({ 
  title, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, bannerVisible = false
}) => {
  return (
    <header 
      className={`fixed left-0 right-0 z-40 h-20 flex items-center justify-between px-5 bg-white dark:bg-[#02040A] border-b border-slate-100 dark:border-slate-800 transition-all duration-300 ${
        bannerVisible ? 'top-8' : 'top-0'
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        {showBack ? (
          <div className="flex items-center gap-3 w-full anim-slide-in-right">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0F1623] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Voltar</h1>
          </div>
        ) : (
          <div className="flex flex-col anim-fade-in">
              <div className="flex items-center gap-2">
                  {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
                    {title}
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  </h1>
              </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500 text-white active:scale-95 transition-transform shadow-sm">
            <Download className="w-5 h-5 animate-bounce" strokeWidth={2.5} />
          </button>
        )}
        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0F1623] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Bell className="w-5 h-5" strokeWidth={2} />
            {notificationCount > 0 && 
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            }
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-[#0F1623] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Settings className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  );
};

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Visão Geral' },
  { id: 'portfolio', icon: PieChart, label: 'Custódia' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Histórico' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <nav className="bg-white dark:bg-[#0F1623] border-t border-slate-100 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] pt-2 px-6 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.02)] dark:shadow-none">
        <div className="flex items-center justify-between h-16 max-w-lg mx-auto">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  group relative flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all duration-300 ease-out-quint outline-none
                  active:scale-90
                `}
              >
                {/* Active Indicator (Solid) */}
                <div className={`absolute top-1 w-12 h-8 rounded-full bg-sky-50 dark:bg-sky-900 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}></div>

                <div className={`
                  relative z-10 transition-all duration-300
                  ${isActive ? 'text-sky-600 dark:text-sky-400 -translate-y-0.5' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}
                `}>
                  <item.icon 
                    className={`w-6 h-6 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} 
                  />
                </div>
                
                <span className={`
                  text-[10px] font-bold tracking-wide transition-all duration-300
                  ${isActive ? 'text-sky-600 dark:text-sky-400 opacity-100 translate-y-0' : 'text-slate-400 opacity-0 translate-y-2 hidden'}
                `}>
                  {item.label}
                </span>
                
                {/* Dot for inactive state */}
                 <span className={`
                  w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 transition-all duration-300 absolute bottom-3
                  ${!isActive ? 'opacity-0' : 'opacity-0'}
                `}></span>
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
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 300);
  const modalRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);

  useEffect(() => { 
      document.body.style.overflow = isOpen ? 'hidden' : ''; 
      return () => { document.body.style.overflow = ''; }; 
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
    }
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
    if (dragOffset > 150) {
      onClose();
    } else {
      setDragOffset(0);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] flex flex-col justify-end ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
          onClick={onClose} 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      ></div>
      
      <div
        ref={modalRef}
        style={{
            transform: isVisible 
                ? `translateY(${dragOffset}px)` 
                : 'translateY(100%)',
            transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)'
        }}
        className={`relative bg-white dark:bg-[#0F1623] rounded-t-[2rem] h-[90vh] w-full overflow-hidden flex flex-col shadow-2xl`}
      >
        <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-none p-4 flex justify-center bg-white dark:bg-[#0F1623] border-b border-slate-100 dark:border-slate-800 cursor-grab active:cursor-grabbing touch-none"
        >
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
        
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>, document.body
  );
};

interface ConfirmationModalProps { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 200);
  if (!isMounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel}></div>
      <div className={`relative bg-white dark:bg-[#0F1623] rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl transition-all duration-300 border border-slate-200 dark:border-slate-800 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-900 dark:text-white"><AlertTriangle className="w-6 h-6" /></div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-transform active:scale-95">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
};

export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating, progress }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-24">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-900 dark:text-white"><Gift className="w-8 h-8" /></div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Novidades v{version}</h2>
        </div>
        <div className="space-y-4">
          {notes.map((note: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm"><Star className="w-5 h-5" /></div>
                  <div><h4 className="font-bold text-slate-900 dark:text-white">{note.title}</h4><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{note.desc}</p></div>
              </div>
          ))}
        </div>
        {isUpdatePending && <button onClick={onUpdate} disabled={isUpdating} className="w-full mt-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-[#02040A] rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">{isUpdating ? `Atualizando ${progress}%` : 'Atualizar Agora'}</button>}
      </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 pb-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Notificações</h2>
                {notifications.length > 0 && <button onClick={onClear} className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform"><Trash2 className="w-3 h-3" /> Limpar</button>}
            </div>
            {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-40"><Inbox className="w-16 h-16 mx-auto mb-4" /><p className="text-sm font-bold">Tudo limpo por aqui</p></div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n: any, i: number) => (
                        <div key={n.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 anim-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </SwipeableModal>
);
