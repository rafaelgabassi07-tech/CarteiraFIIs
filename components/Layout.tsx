
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Cloud, Loader2, WifiOff, Newspaper, X, CheckCircle, Smartphone, Gift, Star, Inbox, FileText, Check } from 'lucide-react';
import { UpdateReportData } from '../types';

// Utility for smooth visibility transitions
const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    } else {
      setIsVisible(false);
      timeoutRef.current = window.setTimeout(() => setIsMounted(false), duration);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isOpen, duration]);

  return { isMounted, isVisible };
};

const HeaderCloudStatus: React.FC<{ status: 'disconnected' | 'connected' | 'hidden' | 'syncing' }> = ({ status }) => {
    if (status === 'hidden' || status === 'connected') return null; // Só mostra se tiver processando ou erro

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50">
            {status === 'syncing' && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
            {status === 'disconnected' && <WifiOff className="w-3 h-3 text-rose-500" />}
        </div>
    );
};

interface HeaderProps {
  title: string;
  onSettingsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
  updateAvailable?: boolean;
  onUpdateClick?: () => void;
  cloudStatus?: 'disconnected' | 'connected' | 'hidden' | 'syncing';
  isVisible?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, onSettingsClick, showBack, onBack, onNotificationClick, notificationCount = 0, updateAvailable, onUpdateClick, cloudStatus = 'hidden', isVisible = true
}) => {
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 px-6 pt-safe h-24 flex flex-col justify-center transition-transform duration-500 ease-in-out-expo bg-[#F2F2F2]/90 dark:bg-black/90 backdrop-blur-md`}
      style={{ transform: isVisible ? 'translateY(0)' : 'translateY(-100%)' }}
    >
      <div className="flex items-center justify-between w-full">
        {showBack ? (
            <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-zinc-900 dark:text-white press-effect">
                <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
            </button>
        ) : (
            <div className="flex flex-col">
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                    {title}
                    <HeaderCloudStatus status={cloudStatus} />
                </h1>
            </div>
        )}

        <div className="flex items-center gap-1">
          {updateAvailable && (
            <button onClick={onUpdateClick} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 press-effect shadow-lg shadow-zinc-900/10">
              <Download className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
            </button>
          )}
          
          <button onClick={onNotificationClick} className="relative w-10 h-10 flex items-center justify-center rounded-full text-zinc-900 dark:text-white press-effect hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors">
            <Bell className="w-5 h-5" strokeWidth={2} />
            {notificationCount > 0 && 
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#F2F2F2] dark:border-black"></span>
            }
          </button>
          
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-900 dark:text-white press-effect hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors">
            <Settings className="w-5 h-5" strokeWidth={2} />
          </button>
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
  { id: 'transactions', icon: ArrowRightLeft, label: 'Extrato' },
  { id: 'news', icon: Newspaper, label: 'News' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, isVisible = true }) => {
  return (
    <div 
        className="fixed bottom-8 left-0 right-0 z-[100] pointer-events-none flex justify-center px-6 transition-transform duration-500 ease-in-out-expo"
        style={{ transform: isVisible ? 'translateY(0)' : 'translateY(160%)' }}
    >
      <nav className="pointer-events-auto bg-black/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-full shadow-2xl shadow-black/20 dark:shadow-black/50 px-2 py-2 flex items-center justify-between w-full max-w-xs ring-1 ring-white/10">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-white dark:bg-white text-black dark:text-black shadow-lg scale-110' : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-300'}`}
              >
                <item.icon 
                    className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} 
                />
              </button>
            );
          })}
      </nav>
    </div>
  );
};

interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef<number>(0);
  const isDragging = useRef(false);

  if (!isMounted) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      
      const diff = e.touches[0].clientY - startY.current;
      
      // Impede o refresh da página enquanto arrasta o modal
      if (e.cancelable && diff > 0) {
          e.preventDefault();
      }

      if (diff > 0) {
          setDragOffset(diff);
      }
  };

  const handleTouchEnd = () => {
      isDragging.current = false;
      if (dragOffset > 100) {
          onClose();
      }
      // Sempre reseta o offset se não fechou, ou deixa a animação de saída lidar se fechou
      setDragOffset(0);
  };

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex flex-col justify-end ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
          onClick={onClose} 
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500"
          style={{ opacity: isVisible ? 1 : 0 }} 
      ></div>
      
      <div
        className="bg-[#F2F2F2] dark:bg-[#000000] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] relative"
        style={{
            transform: isVisible ? `translateY(${dragOffset}px)` : 'translateY(100%)',
            transition: isDragging.current ? 'none' : 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Área de "Pega" (Handle) - Eventos de toque MOVIDOS para cá */}
        <div 
            className="w-full flex justify-center pt-4 pb-2 bg-[#F2F2F2] dark:bg-[#000000] z-10 shrink-0 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-full"></div>
        </div>
        
        {/* Conteúdo Livre para rolagem */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-1 pb-10">
            {children}
        </div>
      </div>
    </div>, document.body
  );
};

export const InstallPromptModal: React.FC<any> = ({ isOpen, onInstall, onDismiss }) => {
    const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
    if (!isMounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <div className={`absolute inset-0 bg-black/60 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onDismiss} />
            <div className={`relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}>
                <div className="text-center">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-900 dark:text-white"><Smartphone className="w-8 h-8" strokeWidth={1.5} /></div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Instalar App</h3>
                    <p className="text-sm text-zinc-500 mb-6">Tenha a melhor experiência em tela cheia.</p>
                    <button onClick={onInstall} className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm press-effect mb-3">Instalar Agora</button>
                    <button onClick={onDismiss} className="text-xs font-bold text-zinc-400 py-2">Agora não</button>
                </div>
            </div>
        </div>, document.body
    );
};

export const ConfirmationModal: React.FC<any> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 250);
    if (!isMounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <div className={`absolute inset-0 bg-black/60 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel} />
            <div className={`relative bg-white dark:bg-zinc-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs">Cancelar</button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs">Confirmar</button>
                </div>
            </div>
        </div>, document.body
    );
};

export const ChangelogModal: React.FC<any> = ({ isOpen, onClose, version, notes = [], isUpdatePending, onUpdate, isUpdating }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="px-6 pb-12 pt-4">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-1">Novidades</h2>
                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest">v{version}</span>
            </div>
            <div className="space-y-4">
                {notes.map((note: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 text-amber-500"><Star className="w-5 h-5" fill="currentColor" /></div>
                        <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white text-sm">{note.title}</h4>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{note.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            {isUpdatePending && (
                <button onClick={onUpdate} disabled={isUpdating} className="w-full mt-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-xs uppercase tracking-widest press-effect">
                    {isUpdating ? 'Atualizando...' : 'Instalar Atualização'}
                </button>
            )}
        </div>
    </SwipeableModal>
);

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="px-6 pb-20 pt-2">
            <div className="flex justify-between items-center mb-6 px-1">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Notificações</h2>
                {notifications.length > 0 && <button onClick={onClear} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"><Check className="w-4 h-4" /></button>}
            </div>
            {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-40"><Inbox className="w-12 h-12 mx-auto mb-3 text-zinc-300" /><p className="text-xs font-bold text-zinc-500">Tudo limpo</p></div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n: any) => (
                        <div key={n.id} className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm flex gap-4 ${n.read ? 'opacity-50' : ''}`}>
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white font-bold">!</div>
                            <div>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{n.title}</h4>
                                <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </SwipeableModal>
);

export const UpdateReportModal: React.FC<any> = ({ isOpen, onClose, results }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="px-6 pb-20 pt-2">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600"><FileText className="w-6 h-6" /></div>
                <div><h2 className="text-xl font-black text-zinc-900 dark:text-white">Relatório</h2><p className="text-xs text-zinc-500">Resumo da Atualização</p></div>
            </div>
            <div className="space-y-2">
                {results.results.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">{r.ticker}</span>
                        <span className={`text-xs font-bold ${r.status === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{r.status === 'success' ? 'Atualizado' : 'Erro'}</span>
                    </div>
                ))}
            </div>
        </div>
    </SwipeableModal>
);
