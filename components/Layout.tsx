
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
      className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+6px)] pb-2 px-4 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 transform will-change-transform shadow-sm ${
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
}

export const Header: React.FC<HeaderProps> = ({ 
  title, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, bannerVisible = false
}) => {
  return (
    <header 
      className={`fixed left-0 right-0 z-40 flex flex-col justify-end px-4 transition-all duration-300 border-b border-zinc-200 dark:border-zinc-800 bg-primary-light dark:bg-zinc-900 ${
        bannerVisible ? 'h-28 pt-8' : 'h-20 pt-safe'
      } top-0`}
    >
      <div className="flex items-center justify-between h-14 mb-1">
        <div className="flex items-center gap-3 w-full">
          {showBack ? (
            <div className="flex items-center gap-3 w-full anim-slide-in-right">
              <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-transform">
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Voltar</h1>
            </div>
          ) : (
            <div className="flex flex-col anim-fade-in">
                <div className="flex items-center gap-2">
                    {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-baseline gap-1">
                      {title}
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    </h1>
                </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {updateAvailable && !showBack && (
            <button onClick={onUpdateClick} className="w-9 h-9 flex items-center justify-center rounded-lg bg-sky-500 text-white active:scale-95 transition-transform shadow-sm">
              <Download className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
            </button>
          )}
          {onNotificationClick && !showBack && (
            <button onClick={onNotificationClick} className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-transform shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
              <Bell className="w-4 h-4" strokeWidth={2} />
              {notificationCount > 0 && 
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              }
            </button>
          )}
          {!showBack && onSettingsClick && (
            <button onClick={onSettingsClick} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-transform shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700">
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
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'portfolio', icon: PieChart, label: 'Custódia' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const activeIndex = navItems.findIndex(item => item.id === currentTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <nav className="pointer-events-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-1.5 w-full max-w-[20rem] mx-6 relative overflow-hidden">
        
        {/* Sliding Active Indicator */}
        <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(33.33%-0.25rem)] bg-zinc-100 dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform z-0"
            style={{ 
                left: '0.125rem',
                transform: `translateX(calc(${activeIndex} * 100% + ${activeIndex * 0.25}rem))` 
            }}
        ></div>

        {/* Buttons Grid */}
        <div className="relative z-10 grid grid-cols-3 h-12">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center relative outline-none select-none active:scale-95 transition-transform duration-200 group"
              >
                <div className={`relative transition-all duration-300 ${isActive ? 'text-sky-600 dark:text-sky-400 -translate-y-0.5' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}>
                    <item.icon 
                        className={`w-5 h-5 relative z-10 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} 
                    />
                </div>
                
                {isActive && (
                    <span className="absolute bottom-1 text-[8px] font-black uppercase tracking-wider text-zinc-900 dark:text-white anim-scale-in">
                    {item.label}
                    </span>
                )}
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
      <div 
          onClick={onClose} 
          className={`absolute inset-0 bg-zinc-950/40 dark:bg-black/70 backdrop-blur-[2px] transition-all duration-500 ease-out-soft ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      ></div>
      
      <div
        ref={modalRef}
        style={{
            transform: isVisible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
            transition: isDragging ? 'none' : 'transform 500ms cubic-bezier(0.19, 1, 0.22, 1)'
        }}
        className={`relative bg-surface-light dark:bg-zinc-900 rounded-t-2xl h-[94vh] w-full overflow-hidden flex flex-col shadow-2xl border-t border-zinc-200 dark:border-zinc-800 will-change-transform`}
      >
        <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-none p-3 flex justify-center bg-transparent cursor-grab active:cursor-grabbing touch-none z-10"
        >
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full"></div>
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
      <div className={`absolute inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-sm transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel}></div>
      <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl transition-all duration-500 cubic-bezier(0.19, 1, 0.22, 1) border border-zinc-100 dark:border-zinc-800 ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}>
        <div className="mx-auto w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <AlertTriangle className="w-6 h-6" strokeWidth={2.5} />
        </div>
        <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed font-medium">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="py-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 active:scale-95 transition-transform shadow-lg">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
};

export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating, progress }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-24">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
              <Gift className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-2">Novidades</h2>
            <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500">Versão {version}</div>
        </div>
        <div className="space-y-3">
          {notes.map((note: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 group transition-all hover:bg-white dark:hover:bg-zinc-800">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <Star className="w-5 h-5 text-amber-500" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 dark:text-white tracking-tight text-sm">{note.title}</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed font-medium">{note.desc}</p>
                  </div>
              </div>
          ))}
        </div>
        {isUpdatePending && (
          <button 
            onClick={onUpdate} 
            disabled={isUpdating} 
            className="w-full mt-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isUpdating ? (
              <> <Loader2 className="w-4 h-4 animate-spin" /> <span>Atualizando {progress}%</span> </>
            ) : (
              <> <Download className="w-4 h-4" /> <span>Instalar Atualização</span> </>
            )}
          </button>
        )}
      </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 pb-24">
            <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Notificações</h2>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Avisos e Pagamentos</p>
                </div>
                {notifications.length > 0 && (
                  <button onClick={onClear} className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center border border-rose-100 dark:border-rose-900/30 active:scale-90 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
            </div>
            {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="w-8 h-8 text-zinc-300 dark:text-zinc-600" strokeWidth={1} />
                  </div>
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nada por aqui</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n: any, i: number) => (
                        <div key={n.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 anim-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <h4 className="font-black text-zinc-900 dark:text-white tracking-tight text-sm">{n.title}</h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed font-medium">{n.message}</p>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-3">
                              {new Date(n.timestamp).toLocaleDateString('pt-BR')} às {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </SwipeableModal>
);
