import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Wallet, Calendar, DollarSign, Clock, Zap, ChevronRight, Inbox, MessageSquare, Sparkles, PackageCheck, AlertCircle, Sparkle, PartyPopper, Loader2, CloudOff, Cloud, Wifi, Lock, Fingerprint, Delete, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AppNotification } from '../types';

// Custom hook for managing enter/exit animations
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
      className={`fixed top-0 left-0 right-0 h-8 z-[60] flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-700 ease-out-quint shadow-sm ${
        isHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      } ${
        isConnected 
          ? 'bg-emerald-500 text-white' 
          : 'bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-white/5'
      }`}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Migrando dados...</span>
        </>
      ) : isConnected ? (
        <>
          <Cloud className="w-3 h-3 animate-bounce" />
          <span>Sincronizado com a Nuvem</span>
        </>
      ) : (
        <>
          <CloudOff className="w-3 h-3" />
          <span>Modo Convidado (Offline)</span>
        </>
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
  appVersion = '5.0.0',
  bannerVisible = false
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed left-0 right-0 z-40 h-24 flex items-center justify-between px-6 transition-all duration-500 ease-out-quint ${
        bannerVisible ? 'top-8' : 'top-0'
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
              </div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-5 pl-0.5">
                  {isRefreshing ? 'Sincronizando...' : 'FIIs & Ações'}
              </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
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
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
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
        className={`bg-white dark:bg-[#0b1121] w-full h-[calc(100dvh-5rem)] rounded-t-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto anim-slide-up border-t border-white/20 dark:border-white/5 ${isVisible ? 'is-visible' : ''}`}
        style={{
          transform: isDragging.current ? `translateY(${offsetY}px)` : undefined,
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
                    <div key={n.id} className={`relative p-5 rounded-[1.8rem] border flex gap-4 transition-all active:scale-[0.98] anim-fade-in-up shadow-sm bg-white dark:bg-[#0f172a] border-slate-100 dark:border-white/5 ${n.read ? 'opacity-50' : ''}`} style={{ transitionDelay: `${i * 50}ms` }}>
                       {!n.read && <div className="w-2 h-2 rounded-full bg-accent absolute top-4 right-4 ring-4 ring-white dark:ring-[#0f172a]"></div>}
                       <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{n.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-semibold">{new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                    </div>
                ))
             )}
        </div>
    </div>,
    document.body
  );
};

export const LockScreen: React.FC<{ 
  isOpen: boolean; 
  onUnlock: () => void; 
  correctPin: string; 
  isBiometricsEnabled: boolean;
}> = ({ isOpen, onUnlock, correctPin, isBiometricsEnabled }) => {
    const [inputPin, setInputPin] = useState('');
    const [error, setError] = useState(false);
    
    useEffect(() => {
        if (isOpen && isBiometricsEnabled) {
            handleBiometric();
        }
    }, [isOpen, isBiometricsEnabled]);

    const handleBiometric = async () => {
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            
            await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname,
                    userVerification: 'required',
                    timeout: 60000
                }
            });
            onUnlock();
            setInputPin('');
        } catch (e) {
            console.log("Biometria cancelada ou falhou", e);
        }
    };

    const handleNumPress = (num: string) => {
        if (inputPin.length < 4) {
            const newPin = inputPin + num;
            setInputPin(newPin);
            if (newPin.length === 4) {
                if (newPin === correctPin) {
                    setTimeout(() => {
                        onUnlock();
                        setInputPin('');
                    }, 100);
                } else {
                    setError(true);
                    setTimeout(() => {
                        setInputPin('');
                        setError(false);
                    }, 500);
                }
            }
        }
    };

    const handleDelete = () => {
        setInputPin(prev => prev.slice(0, -1));
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center p-6 touch-none">
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs">
                 <div className="mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-black/50">
                        <Lock className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">InvestFIIs Bloqueado</h2>
                    <p className="text-xs font-medium text-slate-500 mt-2">Digite seu PIN ou use a biometria</p>
                 </div>

                 <div className="flex gap-4 mb-12 h-4">
                     {[0, 1, 2, 3].map(i => (
                         <div 
                            key={i} 
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                inputPin.length > i 
                                    ? error ? 'bg-rose-500 scale-110' : 'bg-emerald-500 scale-110' 
                                    : 'bg-slate-700'
                            }`}
                         />
                     ))}
                 </div>

                 <div className="grid grid-cols-3 gap-6 w-full">
                     {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                         <button 
                            key={num}
                            onClick={() => handleNumPress(num.toString())}
                            className="w-16 h-16 rounded-full bg-slate-800/50 text-white text-2xl font-medium flex items-center justify-center active:bg-slate-700 transition-colors mx-auto"
                         >
                            {num}
                         </button>
                     ))}
                     <div className="flex items-center justify-center">
                        {isBiometricsEnabled && (
                            <button onClick={handleBiometric} className="w-16 h-16 rounded-full flex items-center justify-center text-emerald-500 active:scale-95 transition-transform">
                                <Fingerprint className="w-8 h-8" />
                            </button>
                        )}
                     </div>
                     <button 
                        onClick={() => handleNumPress('0')}
                        className="w-16 h-16 rounded-full bg-slate-800/50 text-white text-2xl font-medium flex items-center justify-center active:bg-slate-700 transition-colors mx-auto"
                     >
                        0
                     </button>
                     <div className="flex items-center justify-center">
                        <button onClick={handleDelete} className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 active:scale-95 transition-transform hover:text-white">
                            <Delete className="w-6 h-6" />
                        </button>
                     </div>
                 </div>
            </div>
            <div className="mt-8 text-center opacity-40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secure Vault</p>
            </div>
        </div>,
        document.body
    );
};

export const ConfirmationModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { isMounted, isVisible } = useAnimatedVisibility(isOpen, 400);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-md anim-fade-in ${isVisible ? 'is-visible' : ''}`}
        onClick={onCancel}
      />
      <div
        className={`relative bg-white dark:bg-[#0f172a] w-full max-w-[22rem] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden anim-scale-in border border-white/20 dark:border-white/5 ${isVisible ? 'is-visible' : ''}`}
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-rose-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-black/20 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-3.5 rounded-2xl bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-[0.15em] active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-[0.15em] active:scale-95 transition-all shadow-lg shadow-rose-500/20"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};