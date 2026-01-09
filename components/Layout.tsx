
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, Info, CheckCircle2, AlertTriangle, Cloud, CloudOff, Loader2, ArrowUpCircle, Inbox, Gift, Rocket, Check, Zap, Palette, Star } from 'lucide-react';
import { ReleaseNote, AppNotification, ReleaseNoteType } from '../types';

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
      className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top)+6px)] pb-2 px-4 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform will-change-transform ${
        isHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      } ${
        isConnected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
        isSyncing ? 'bg-surface-dark text-white border-b border-white/10' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
      }`}
    >
      {isSyncing ? (
        <> <Loader2 className="w-2.5 h-2.5 animate-spin text-white/80" /> <span>Sync...</span> </>
      ) : isConnected ? (
        <div className="flex items-center gap-2"> <Cloud className="w-3 h-3 text-white" strokeWidth={2.5} /> <span>Salvo</span> </div>
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
  title, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, appVersion = '8.0', bannerVisible = false
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed left-0 right-0 z-40 h-24 flex items-center justify-between px-6 transition-all duration-300 ease-out will-change-transform ${
        bannerVisible ? 'top-8' : 'top-0'
      } ${
        isScrolled 
          ? 'bg-white/90 dark:bg-[#02040A]/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 pt-2' 
          : 'bg-transparent pt-4 border-b border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 w-full">
        {showBack ? (
          <div className="flex items-center gap-3 w-full anim-fade-in">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-surface-dark text-slate-900 dark:text-white active:scale-95 transition-all border border-transparent dark:border-white/5">
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Voltar</h1>
          </div>
        ) : (
          <div className="flex flex-col anim-fade-in">
              <div className="flex items-center gap-2">
                  {isRefreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
              </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 active:scale-95 transition-all shadow-lg shadow-black/10">
            <Download className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
          </button>
        )}
        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 active:scale-95 transition-all border border-transparent dark:border-white/5">
            <Bell className="w-4 h-4" strokeWidth={2.5} />
            {notificationCount > 0 && 
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#02040A]"></span>
            }
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 active:scale-95 transition-all border border-transparent dark:border-white/5">
            <Settings className="w-4 h-4" strokeWidth={2.5} />
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
    <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto bg-white/90 dark:bg-[#0B101A]/90 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-1.5 rounded-full flex items-center gap-1 border border-slate-200/50 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5 transform translate-z-0">
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                relative flex items-center justify-center h-11 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${isActive 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-[#02040A] pl-4 pr-5 gap-2 w-auto shadow-sm' 
                  : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 w-11 hover:bg-slate-100 dark:hover:bg-white/5'
                }
              `}
            >
              <item.icon className={`w-5 h-5 shrink-0`} strokeWidth={isActive ? 2.5 : 2} />
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
    <div className={`fixed inset-0 z-[200] flex flex-col justify-end transition-opacity duration-300 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div ref={backdropRef} onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}></div>
      <div
        ref={modalRef}
        className={`relative bg-[#f8fafc] dark:bg-[#02040A] rounded-t-[2.5rem] h-[92dvh] w-full overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-white/10 transition-transform duration-500 cubic-bezier(0.32,0.72,0,1) ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="sticky top-0 z-50 flex justify-center pt-4 pb-2 bg-[#f8fafc] dark:bg-[#02040A]">
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>
        {children}
      </div>
    </div>, document.body
  );
};

interface ConfirmationModalProps { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 200);
  if (!isMounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel}></div>
      <div className={`relative bg-white dark:bg-surface-dark rounded-3xl w-full max-w-xs p-6 text-center shadow-2xl border border-slate-200 dark:border-white/10 transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-900 dark:text-white"><AlertTriangle className="w-6 h-6" /></div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Cancelar</button>
          <button onClick={onConfirm} className="py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-[#02040A] shadow-lg">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
};

// Changelog & Notifications Modals (Simplified for brevity as structure is same)
export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating, progress }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-8 pb-24">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-surface-dark rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-900 dark:text-white border border-transparent dark:border-white/5"><Gift className="w-8 h-8" /></div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Novidades v{version}</h2>
        </div>
        <div className="space-y-6">
          {notes.map((note: any, i: number) => (
              <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center shrink-0 text-slate-900 dark:text-white"><Star className="w-5 h-5" /></div>
                  <div><h4 className="font-bold text-slate-900 dark:text-white">{note.title}</h4><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{note.desc}</p></div>
              </div>
          ))}
        </div>
        {isUpdatePending && <button onClick={onUpdate} disabled={isUpdating} className="w-full mt-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-[#02040A] rounded-2xl font-bold text-xs uppercase tracking-widest">{isUpdating ? `Atualizando ${progress}%` : 'Atualizar Agora'}</button>}
      </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 pb-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Notificações</h2>
                {notifications.length > 0 && <button onClick={onClear} className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1"><Trash2 className="w-3 h-3" /> Limpar</button>}
            </div>
            {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-40"><Inbox className="w-16 h-16 mx-auto mb-4" /><p className="text-sm font-bold">Tudo limpo por aqui</p></div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n: any) => (
                        <div key={n.id} className="p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </SwipeableModal>
);
