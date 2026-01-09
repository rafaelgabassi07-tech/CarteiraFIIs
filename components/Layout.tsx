import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Loader2, CloudOff, Cloud, Inbox, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ReleaseNote, AppNotification, ReleaseNoteType } from '../types';

const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
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
  return (
    <div className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-center h-1 transition-all duration-500 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className={`h-full w-full ${status === 'connected' ? 'bg-emerald-500' : status === 'syncing' ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`}></div>
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

export const Header: React.FC<HeaderProps> = ({ title, onSettingsClick, showBack, onBack, isRefreshing, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-20 flex items-center justify-between px-6 bg-black/80 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="flex items-center gap-4">
        {showBack ? (
          <button onClick={onBack} className="text-white active:opacity-50"><ChevronLeft className="w-6 h-6" /></button>
        ) : (
          <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>
              {isRefreshing && <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest animate-pulse">Syncing...</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {updateAvailable && (
          <button onClick={onUpdateClick} className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full animate-pulse">
            <Download className="w-4 h-4" />
          </button>
        )}
        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative text-zinc-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="text-zinc-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] flex flex-col justify-end transition-opacity duration-400 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div ref={backdropRef} onClick={onClose} className={`absolute inset-0 bg-black/90 transition-opacity duration-400 ${isVisible ? 'opacity-100' : 'opacity-0'}`}></div>
      <div ref={modalRef} className={`relative bg-[#09090b] rounded-t-[2rem] max-h-[90vh] w-full overflow-y-auto border-t border-white/10 shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="sticky top-0 z-[110] flex justify-center pt-3 pb-2 bg-[#09090b]"><div className="w-10 h-1 bg-zinc-800 rounded-full"></div></div>
        {children}
      </div>
    </div>, document.body
  );
};

interface ConfirmationModalProps { isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 300);
  if (!isMounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/90" onClick={onCancel}></div>
      <div className={`relative bg-[#09090b] border border-white/10 rounded-3xl w-full max-w-sm p-6 text-center transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3 bg-zinc-900 rounded-xl text-xs font-bold text-zinc-400 uppercase tracking-widest">Cancelar</button>
          <button onClick={onConfirm} className="py-3 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
};

export const BottomNav: React.FC<{ currentTab: string; onTabChange: (tab: string) => void; }> = ({ currentTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-safe pt-4 bg-gradient-to-t from-black via-black to-transparent pointer-events-none">
      <nav className="pointer-events-auto bg-[#09090b] border border-white/10 rounded-full px-6 py-3 flex gap-8 shadow-2xl mb-4">
        {[ { id: 'home', icon: Home }, { id: 'portfolio', icon: PieChart }, { id: 'transactions', icon: ArrowRightLeft } ].map(item => (
            <button key={item.id} onClick={() => onTabChange(item.id)} className={`transition-colors duration-300 ${currentTab === item.id ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
              <item.icon className="w-6 h-6 stroke-[1.5px]" />
            </button>
        ))}
      </nav>
    </div>
  );
};

/* --- Changelog & Notification Modals (Simplified) --- */
export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, notes = [], isUpdatePending, onUpdate, isUpdating }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-10">
        <h2 className="text-xl font-bold text-white mb-6">Novidades</h2>
        <div className="space-y-6">
          {notes.map((note: any, i: number) => (
            <div key={i}>
                <h4 className="font-bold text-white text-sm mb-1">{note.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{note.desc}</p>
            </div>
          ))}
        </div>
        {isUpdatePending && (
          <button onClick={onUpdate} disabled={isUpdating} className="w-full mt-8 bg-white text-black py-4 rounded-xl font-bold text-xs uppercase tracking-widest">
             {isUpdating ? 'Atualizando...' : 'Atualizar App'}
          </button>
        )}
      </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-10">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Notificações</h2>
            {notifications.length > 0 && <button onClick={onClear} className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Limpar</button>}
        </div>
        {notifications.length === 0 ? (
            <p className="text-center text-zinc-600 py-10 text-sm">Sem novas mensagens.</p>
        ) : (
            <div className="space-y-4">
                {notifications.map((n: any) => (
                    <div key={n.id} className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
                        <h4 className="font-bold text-sm text-white mb-1">{n.title}</h4>
                        <p className="text-xs text-zinc-400">{n.message}</p>
                    </div>
                ))}
            </div>
        )}
      </div>
    </SwipeableModal>
);