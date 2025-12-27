
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Wallet } from 'lucide-react';
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
  onUpdateClick
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 h-20 flex items-center justify-between px-6 transition-all duration-500 ${isScrolled ? 'bg-white/90 dark:bg-[#020617]/90 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 shadow-sm' : 'bg-transparent'}`}>
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 active:scale-90 transition-all hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
          </button>
        ) : (
          <div className="flex flex-col animate-fade-in pl-1">
              <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{title}</h1>
              </div>
              <div className="pl-[1.35rem] mt-1">
                {updateAvailable ? (
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse inline-flex items-center gap-1">
                        Nova Versão <ArrowUpCircle className="w-3 h-3" />
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">InvestFIIs Ultra</span>
                )}
              </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 active:scale-90 transition-all animate-scale-in hover:brightness-110">
            <Download className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
          </button>
        )}

        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all shadow-sm group">
            <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" strokeWidth={2} />
            {notificationCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-primary-dark animate-pulse"></span>}
          </button>
        )}

        {onRefresh && !showBack && (
          <button onClick={onRefresh} disabled={isRefreshing} className={`w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all shadow-sm ${isRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:rotate-180 duration-700'}`}>
             <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
        )}

        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all shadow-sm group">
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
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
      <nav className="bg-slate-950/90 dark:bg-[#020617]/95 backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] pointer-events-auto transition-all duration-300 ring-1 ring-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)} 
              className={`relative flex items-center justify-center h-12 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isActive ? 'bg-white text-slate-950 px-5 rounded-xl shadow-xl scale-100' : 'text-slate-400 dark:text-slate-500 px-4 scale-95 hover:text-slate-200'}`}
            >
               <Icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110 mr-2.5' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
               <span className={`text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 ease-in-out ${isActive ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                 {tab.label}
               </span>
               {isActive && (
                 <div className="absolute inset-0 bg-white -z-10 animate-fade-in" />
               )}
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 animate-fade-in" onClick={onClose} />
      <div 
        className="bg-slate-50 dark:bg-[#0b1121] w-full max-h-[92dvh] rounded-t-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto transition-transform duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) animate-slide-up ring-1 ring-white/10"
        style={{ transform: `translateY(${offsetY}px)` }}
        onTouchStart={(e) => { setIsDragging(true); startY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => { if(!isDragging) return; const diff = e.touches[0].clientY - startY.current; if(diff > 0) setOffsetY(diff); }}
        onTouchEnd={() => { setIsDragging(false); if(offsetY > 120) onClose(); else setOffsetY(0); }}
      >
        <div className="w-full h-8 flex items-center justify-center shrink-0 touch-none bg-transparent pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-300/50 dark:bg-white/20 rounded-full" />
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all" onClick={onClose} />
        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col animate-scale-in max-h-[70vh]">
            <div className="p-5 bg-white dark:bg-[#0b1121] border-b border-slate-100 dark:border-white/5 flex justify-between items-center sticky top-0 z-10">
               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Notificações</h3>
               {notifications.length > 0 && (
                   <button onClick={onClear} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-rose-500 transition-colors active:scale-90">
                     <Trash2 className="w-4 h-4" />
                   </button>
               )}
            </div>
            
            <div className="overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                   <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-slate-300" />
                   </div>
                   <p className="text-xs font-medium">Tudo limpo por aqui.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 flex gap-4 transition-all hover:bg-white dark:hover:bg-white/10">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'update' ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-white/10 text-slate-500 shadow-sm'}`}>
                        {n.type === 'update' ? <ArrowUpCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{n.title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                      </div>
                  </div>
                ))
              )}
            </div>
            
            <button onClick={onClose} className="p-4 text-center border-t border-slate-100 dark:border-white/5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest bg-white dark:bg-[#0b1121] active:bg-slate-50 dark:active:bg-white/5 transition-colors">
              Fechar
            </button>
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-0 shadow-2xl flex flex-col items-center animate-scale-in overflow-hidden ring-1 ring-white/10">
            <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 active:scale-90 transition-all z-50">
              <X className="w-5 h-5" />
            </button>

            <div className="w-full px-8 pt-10 pb-6 text-center bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 mb-4 text-white transform -rotate-3">
                  {isUpdatePending ? <Gift className="w-8 h-8" strokeWidth={1.5} /> : <Rocket className="w-8 h-8" strokeWidth={1.5} />}
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                  {isUpdatePending ? 'Atualização Disponível' : 'O que há de novo?'}
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Versão {version}
                </p>
            </div>

            <div className="w-full px-6 py-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                <div className="space-y-3">
                  {notes && notes.length > 0 ? notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${note.type === 'feat' ? 'bg-amber-100 text-amber-600' : note.type === 'ui' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {note.type === 'feat' ? <Star className="w-4 h-4" /> : note.type === 'ui' ? <Palette className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{note.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{note.desc}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-slate-400 text-xs">Melhorias de performance e correções de bugs.</div>
                  )}
                </div>
            </div>

            <div className="w-full p-6">
              {isUpdatePending ? (
                 <button onClick={onUpdate} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" strokeWidth={2.5} /> Atualizar Agora
                 </button>
              ) : (
                <button onClick={onClose} className="w-full bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/10">
                    Entendi
                </button>
              )}
            </div>
        </div>
    </div>,
    document.body
  );
};
