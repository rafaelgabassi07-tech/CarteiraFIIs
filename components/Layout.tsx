
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, Bell, Download, Trash2, Cloud, CloudOff, Loader2, AlertTriangle, Gift, Star, Inbox, RefreshCw, Smartphone, X, Check, Mail, Server, WifiOff, FileText, CheckCircle, Percent, TrendingUp, DollarSign, Activity, Newspaper, CloudLightning, Wifi, CircleHelp } from 'lucide-react';
import { UpdateReportData } from '../types';

// --- UTILS ---
const useAnimatedVisibility = (isOpen: boolean, duration: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
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

// --- COMPONENTS ---

export const InfoTooltip = ({ title, text }: { title: string, text: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} 
                className="text-zinc-400/70 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-0.5 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 flex items-center justify-center shrink-0"
                aria-label="Informação"
                style={{ marginTop: '-1px' }} // Micro ajuste visual
            >
                <CircleHelp className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => setIsOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl anim-scale-in border border-zinc-100 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
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
      {/* Unified Blur Background Layer */}
      <div className={`absolute inset-0 bg-primary-light/80 dark:bg-primary-dark/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 transition-opacity duration-300 ${hideBorder ? 'opacity-0' : 'opacity-100'}`}></div>

      <div className="relative z-10 flex flex-col justify-end px-6 h-[calc(3.5rem+env(safe-area-inset-top))] pb-3 pt-safe">
        <div className="flex items-center justify-between">
          
          {/* Left Section */}
          <div className="flex items-center gap-3 min-w-0">
            {showBack ? (
              <button onClick={onBack} className="flex items-center gap-1 text-zinc-900 dark:text-white -ml-2 press-effect">
                <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                <span className="text-lg font-bold">Voltar</span>
              </button>
            ) : (
              <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                    {headerIcon && <div className="w-6 h-6 anim-scale-in">{headerIcon}</div>}
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                      {title}
                    </h1>
                 </div>
                 {subtitle && <div className="text-xs text-zinc-500 font-medium ml-8">{subtitle}</div>}
              </div>
            )}
          </div>

          {/* Right Section */}
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
  { id: 'news', icon: Newspaper, label: 'News' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, isVisible = true }) => {
  return (
    <div 
        className="fixed bottom-6 left-0 right-0 z-[90] flex justify-center pointer-events-none transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
        style={{ transform: isVisible ? 'translateY(0)' : 'translateY(200%)' }}
    >
      <nav className="pointer-events-auto bg-zinc-900/85 dark:bg-zinc-800/85 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl shadow-black/30 ring-1 ring-black/5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isActive ? 'bg-white/20 text-white shadow-inner' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon 
                    className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} 
                    strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full anim-scale-in"></span>
                )}
              </button>
            );
          })}
      </nav>
    </div>
  );
};

// --- MODALS ---

interface SwipeableModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; }

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);
  const [dragY, setDragY] = useState(0);

  if (!isMounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex flex-col justify-end isolate`}>
      <div 
          onClick={onClose} 
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500"
          style={{ opacity: isVisible ? 1 : 0 }} 
      ></div>
      
      <div
        style={{
            transform: isVisible ? `translateY(${dragY}px)` : 'translateY(100%)',
            transition: dragY === 0 ? 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        className={`relative bg-white dark:bg-zinc-900 w-full h-[92dvh] rounded-t-[2.5rem] shadow-2xl shadow-black/50 overflow-hidden flex flex-col`}
      >
        {/* Handle */}
        <div className="w-full flex justify-center pt-4 pb-2 bg-white dark:bg-zinc-900 shrink-0 cursor-grab active:cursor-grabbing touch-none z-10"
             onTouchMove={(e) => {
               const val = e.touches[0].clientY - (window.innerHeight - (e.currentTarget.parentElement?.clientHeight || 0));
               if(val > 0) setDragY(val);
             }}
             onTouchEnd={() => {
               if(dragY > 150) onClose();
               setDragY(0);
             }}
        >
          <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 min-h-0 w-full relative flex flex-col">
            {children}
        </div>
      </div>
    </div>, document.body
  );
};

// --- OTHER MODALS ---
// ... (ConfirmationModal, InstallPromptModal, UpdateReportModal, ChangelogModal, NotificationsModal mantidos iguais)
export const ConfirmationModal: React.FC<any> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm anim-fade-in">
             <div className="bg-white dark:bg-zinc-900 w-full max-w-xs p-6 rounded-[2rem] text-center shadow-2xl anim-scale-in">
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
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-[2rem] shadow-2xl anim-slide-up">
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
            <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white shrink-0">Relatório de Atualização</h2>
            <div className="space-y-4 flex-1 overflow-y-auto pb-20">
                 <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl">
                     <div className="flex justify-between items-center">
                         <span className="text-sm font-medium text-zinc-500">Ativos Processados</span>
                         <span className="text-lg font-bold text-zinc-900 dark:text-white">{props.results?.results?.length || 0}</span>
                     </div>
                 </div>
            </div>
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

export const NotificationsModal: React.FC<any> = ({ isOpen, onClose, notifications, onClear }) => (
    <SwipeableModal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Notificações</h2>
                {notifications.length > 0 && <button onClick={onClear} className="text-xs font-bold text-zinc-400 uppercase">Limpar</button>}
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pb-20">
                {notifications.length === 0 ? (
                    <div className="text-center py-10 text-zinc-400">Nenhuma notificação recente.</div>
                ) : notifications.map((n: any) => (
                    <div key={n.id} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'}`}>
                            {n.type === 'success' ? <DollarSign className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{n.title}</h4>
                            <p className="text-xs text-zinc-500 mt-1">{n.message}</p>
                            <p className="text-[10px] text-zinc-400 mt-2">{new Date(n.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </SwipeableModal>
);
