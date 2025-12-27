
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Wallet, Calendar, DollarSign, Clock, Zap } from 'lucide-react';
import { ReleaseNote, AppNotification } from '../types';

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
    <header className={`fixed top-0 left-0 right-0 z-40 h-24 flex items-center justify-between px-6 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 pt-2' : 'bg-transparent pt-4'}`}>
      <div className="flex items-center gap-3 w-full">
        {showBack ? (
          <div className="flex items-center gap-4 animate-fade-in w-full">
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm group">
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </button>
            <div className="flex flex-col ml-1">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Ajustes</h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">InvestFIIs v{appVersion}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col animate-fade-in">
              <div className="flex items-center gap-2.5">
                  {/* Ponto Pulsante (Live Status) - Reposicionado para o início */}
                  <div className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-[#020617]"></span>
                  </div>

                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>

                  {updateAvailable && (
                    <span className="relative flex h-2 w-2 ml-1" onClick={onUpdateClick}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 cursor-pointer"></span>
                    </span>
                  )}
              </div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-0.5">Visão em Tempo Real</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all animate-scale-in hover:brightness-110">
            <Download className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
          </button>
        )}

        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group">
            <Bell className="w-6 h-6 group-hover:rotate-12 transition-transform" strokeWidth={2} />
            {notificationCount > 0 && <span className="absolute top-3 right-3.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#020617]"></span>}
          </button>
        )}

        {onRefresh && !showBack && (
          <button onClick={onRefresh} disabled={isRefreshing} className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/10'}`}>
             <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
        )}

        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group">
            <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" strokeWidth={2} />
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
  if (!isOpen) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm animate-fade-in-up">
      <div className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-indigo-500/20 ring-1 ring-indigo-500/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
             <Rocket className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">Nova Versão {version}</h4>
            <p className="text-[10px] font-medium text-slate-500 leading-none mt-1">Atualização disponível</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onUpdate} className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md">
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
      <nav className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 p-2 rounded-[1.5rem] flex items-center gap-2 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 pointer-events-auto transition-all duration-300 ring-1 ring-black/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)} 
              className={`relative flex items-center justify-center h-12 rounded-2xl transition-all duration-500 ease-out active:scale-90 ${isActive ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md px-6' : 'px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
               <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
               
               {/* Texto com Animação de Slide e Opacidade */}
               <div className={`overflow-hidden transition-all duration-500 ease-out flex items-center ${isActive ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`}>
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
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
        setOffsetY(0);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 animate-fade-in" onClick={onClose} />
      <div 
        className="bg-white dark:bg-[#0b1121] w-full h-[calc(100dvh-4.5rem)] rounded-t-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto transition-transform duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) animate-slide-up ring-1 ring-slate-900/5 dark:ring-white/10"
        style={{ transform: `translateY(${offsetY}px)` }}
        onTouchStart={(e) => { setIsDragging(true); startY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => { if(!isDragging) return; const diff = e.touches[0].clientY - startY.current; if(diff > 0) setOffsetY(diff); }}
        onTouchEnd={() => { setIsDragging(false); if(offsetY > 120) onClose(); else setOffsetY(0); }}
      >
        <div className="w-full h-10 flex items-center justify-center shrink-0 touch-none bg-transparent">
          <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10 px-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export const NotificationsModal: React.FC<{ isOpen: boolean; onClose: () => void; notifications: AppNotification[]; onClear: () => void }> = ({ isOpen, onClose, notifications, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-all" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/5 shadow-2xl flex flex-col animate-scale-in max-h-[75vh] ring-1 ring-white/10">
            <div className="p-6 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center sticky top-0 z-10">
               <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Central</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notificações</p>
               </div>
               {notifications.length > 0 && (
                   <button onClick={onClear} className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors active:scale-95 uppercase tracking-wide">
                     Limpar
                   </button>
               )}
            </div>
            
            <div className="overflow-y-auto p-4 space-y-4 bg-white dark:bg-[#0f172a]">
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 dark:border-white/5 rotate-3">
                      <Bell className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                   </div>
                   <p className="text-sm font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Tudo tranquilo por aqui</p>
                   <p className="text-[11px] text-slate-500 uppercase tracking-wide max-w-[200px] leading-relaxed">Você será avisado sobre pagamentos e datas importantes.</p>
                </div>
              ) : (
                notifications.map(n => {
                  let Icon = Info;
                  let bgClass = 'bg-slate-100 text-slate-500';
                  let borderClass = 'border-slate-100 dark:border-white/5';
                  
                  if (n.category === 'payment' || n.type === 'success') {
                    Icon = DollarSign;
                    bgClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
                    borderClass = 'border-emerald-500/20 bg-emerald-500/5';
                  } else if (n.category === 'datacom') {
                    Icon = Calendar;
                    bgClass = 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
                    borderClass = 'border-amber-500/20 bg-amber-500/5';
                  } else if (n.category === 'update') {
                    Icon = Rocket;
                    bgClass = 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20';
                    borderClass = 'border-indigo-500/20 bg-indigo-500/5';
                  } else {
                    Icon = Bell;
                    bgClass = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200';
                  }

                  return (
                    <div key={n.id} className={`p-4 rounded-[2rem] border ${borderClass} flex gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bgClass}`}>
                          <Icon className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex justify-between items-start mb-1">
                             <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide truncate pr-2">{n.title}</h4>
                             <span className="text-[9px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Hoje
                             </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                        </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-[#0f172a] border-t border-slate-50 dark:border-white/5">
                <button onClick={onClose} className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98] transition-all shadow-xl">
                Fechar Central
                </button>
            </div>
        </div>
    </div>
  );
};

export const ChangelogModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  version: string; 
  notes?: ReleaseNote[];
  isUpdatePending?: boolean;
  onUpdate?: () => void;
}> = ({ isOpen, onClose, version, notes, isUpdatePending, onUpdate }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-all" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-0 shadow-2xl flex flex-col items-center animate-scale-in overflow-hidden ring-1 ring-white/10">
            <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 active:scale-90 transition-all z-50">
              <X className="w-5 h-5" />
            </button>

            <div className="w-full px-8 pt-10 pb-8 text-center bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 mb-5 text-white transform -rotate-3">
                  {isUpdatePending ? <Gift className="w-8 h-8" strokeWidth={1.5} /> : <Rocket className="w-8 h-8" strokeWidth={1.5} />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                  {isUpdatePending ? 'Atualização Disponível' : 'O que há de novo?'}
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Versão {version}
                </p>
            </div>

            <div className="w-full px-6 py-6 max-h-[40vh] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                  {notes && notes.length > 0 ? notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${note.type === 'feat' ? 'bg-amber-100 text-amber-600' : note.type === 'ui' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {note.type === 'feat' ? <Star className="w-4 h-4" /> : note.type === 'ui' ? <Palette className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{note.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{note.desc}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-slate-400 text-xs">Melhorias de performance e correções de bugs.</div>
                  )}
                </div>
            </div>

            <div className="w-full p-6 bg-white dark:bg-[#0f172a]">
              {isUpdatePending ? (
                 <button onClick={onUpdate} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" strokeWidth={2.5} /> Atualizar Agora
                 </button>
              ) : (
                <button onClick={onClose} className="w-full bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/10">
                    Entendi
                </button>
              )}
            </div>
        </div>
    </div>,
    document.body
  );
};
