
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, AlertTriangle, Cloud, CloudOff, Loader2, Star, Gift, Inbox } from 'lucide-react';

// Utility for smooth visibility transitions
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
      className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+8px)] pb-3 px-4 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform will-change-transform pointer-events-none ${
        isHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className={`px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-colors duration-300 ${
         isConnected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
         isSyncing ? 'bg-slate-800 text-white shadow-slate-900/20' : 'bg-rose-500 text-white shadow-rose-500/20'
      }`}>
        {isSyncing ? (
          <> <Loader2 className="w-3 h-3 animate-spin text-white/90" /> <span>Sincronizando...</span> </>
        ) : isConnected ? (
          <> <Cloud className="w-3 h-3 text-white" strokeWidth={2.5} /> <span>Salvo na Nuvem</span> </>
        ) : (
          <> <CloudOff className="w-3 h-3" /> <span>Offline</span> </>
        )}
      </div>
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 10); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed left-0 right-0 z-40 h-[6.5rem] flex items-end justify-between px-6 pb-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform ${
        bannerVisible ? 'translate-y-6' : 'translate-y-0'
      } ${
        isScrolled 
          ? 'bg-white/90 dark:bg-[#020617]/90 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 shadow-sm' 
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        {showBack ? (
          <div className="flex items-center gap-3 w-full anim-fade-in">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white active:scale-90 transition-all border border-slate-200 dark:border-white/5 shadow-sm">
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Voltar</h1>
          </div>
        ) : (
          <div className="flex flex-col anim-fade-in">
              <div className="flex items-center gap-3">
                  {isRefreshing ? 
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div> 
                    : <div className="w-8 h-8" />
                  }
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none pt-1">{title}</h1>
              </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 active:scale-90 transition-all shadow-md">
            <Download className="w-5 h-5 animate-bounce" strokeWidth={2.5} />
          </button>
        )}
        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-all border border-slate-200 dark:border-white/5 shadow-sm">
            <Bell className="w-5 h-5" strokeWidth={2} />
            {notificationCount > 0 && 
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-[#020617]"></span>
            }
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-90 transition-all border border-slate-200 dark:border-white/5 shadow-sm">
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
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'portfolio', icon: PieChart, label: 'Carteira' },
  { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-safe">
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent pointer-events-none opacity-80 dark:opacity-100"></div>
      <nav className="relative mb-6 pointer-events-auto bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-1.5 rounded-full flex items-center gap-1 border border-white/20 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5 transform translate-z-0">
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                relative flex items-center justify-center h-12 rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isActive 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 pl-5 pr-6 gap-2 w-auto shadow-md scale-100' 
                  : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-12 hover:bg-black/5 dark:hover:bg-white/5 scale-95'
                }
              `}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="text-xs font-bold overflow-hidden whitespace-nowrap anim-fade-in">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// Generic Modals (Swipeable, Confirmation, etc)
interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] flex flex-col justify-end transition-all duration-500 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div ref={backdropRef} onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}></div>
      <div
        ref={modalRef}
        className={`relative bg-[#f8fafc] dark:bg-[#020617] rounded-t-[2.5rem] max-h-[92dvh] w-full shadow-[0_-10px_60px_rgba(0,0,0,0.5)] border-t border-white/10 transition-transform duration-500 cubic-bezier(0.32,0.72,0,1) flex flex-col ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="shrink-0 flex justify-center pt-4 pb-2 bg-[#f8fafc] dark:bg-[#020617] rounded-t-[2.5rem]" onClick={onClose}>
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full active:bg-slate-300 dark:active:bg-slate-600 transition-colors"></div>
        </div>
        <div className="overflow-y-auto overflow-x-hidden flex-1 pb-safe">
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
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onCancel}></div>
      <div className={`relative bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-xs p-8 text-center shadow-2xl border border-slate-200 dark:border-white/10 transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}`}>
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5 text-slate-900 dark:text-white shadow-inner"><AlertTriangle className="w-7 h-7" strokeWidth={1.5} /></div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-transform">Cancelar</button>
          <button onClick={onConfirm} className="py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg active:scale-95 transition-transform">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
};

export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating, progress }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-8 pb-24">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 text-slate-900 dark:text-white shadow-sm"><Gift className="w-8 h-8" strokeWidth={1.5} /></div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Novidades v{version}</h2>
        </div>
        <div className="space-y-6">
          {notes.map((note: any, i: number) => (
              <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-900 dark:text-white"><Star className="w-5 h-5" /></div>
                  <div><h4 className="font-bold text-slate-900 dark:text-white text-sm">{note.title}</h4><p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{note.desc}</p></div>
              </div>
          ))}
        </div>
        {isUpdatePending && <button onClick={onUpdate} disabled={isUpdating} className="w-full mt-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform">{isUpdating ? `Atualizando ${progress}%` : 'Atualizar Agora'}</button>}
      </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 pb-24">
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Notificações</h2>
                {notifications.length > 0 && <button onClick={onClear} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1 py-2 px-3 bg-rose-50 dark:bg-rose-500/10 rounded-lg active:scale-95 transition-transform"><Trash2 className="w-3 h-3" /> Limpar</button>}
            </div>
            {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-40"><Inbox className="w-16 h-16 mx-auto mb-4 stroke-1" /><p className="text-sm font-bold">Tudo limpo por aqui</p></div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n: any) => (
                        <div key={n.id} className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900 dark:bg-white"></div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{n.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-slate-300 dark:text-slate-600 font-mono mt-3 block">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </SwipeableModal>
);
