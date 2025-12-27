
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, TrendingUp, Bell, Rocket, Sparkles, Check, Wrench, Zap, Palette, ArrowUpCircle, X, Trash2, Info, Download, Star, Gift, ChevronRight } from 'lucide-react';
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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 px-6 h-28 flex items-end pb-6 justify-between transition-all duration-500 ${isScrolled ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm' : 'bg-transparent'}`}>
      <div className="flex items-center gap-4 animate-fade-in">
        {showBack ? (
          <button onClick={onBack} className="p-3 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white active:scale-90 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-12 h-12 bg-gradient-to-tr from-accent to-indigo-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-accent/20 border border-white/20">
            <TrendingUp className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
        )}
        
        <div className="flex flex-col justify-center">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{title}</h1>
          {!showBack && (
            <div className="flex items-center gap-2 mt-1.5 opacity-80">
               {updateAvailable ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10">
                    <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Nova Versão</span>
                  </div>
               ) : (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sincronizado</span>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 animate-fade-in">
        {updateAvailable && !showBack && (
           <button onClick={onUpdateClick} className="h-10 px-3 flex items-center justify-center gap-2 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 animate-pulse active:scale-95 transition-all">
             <Download className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase hidden sm:inline">Atualizar</span>
           </button>
        )}

        {onNotificationClick && !showBack && (
           <button onClick={onNotificationClick} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 active:scale-90 transition-all text-slate-500 dark:text-slate-400 hover:text-accent relative hover:bg-slate-50 dark:hover:bg-white/10">
             <Bell className="w-5 h-5" />
             {notificationCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-primary-dark"></span>}
           </button>
        )}
        
        {onRefresh && !showBack && (
          <button onClick={onRefresh} disabled={isRefreshing} className={`w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 active:scale-90 transition-all hover:bg-slate-50 dark:hover:bg-white/10 ${isRefreshing ? 'text-accent animate-spin' : 'text-slate-500 dark:text-slate-400'}`}>
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 active:scale-90 transition-all text-slate-500 dark:text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-white/10">
            <Settings className="w-5 h-5" />
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
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none pb-safe">
      <nav className="pointer-events-auto bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-full p-2 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 flex items-center gap-2 transform transition-all duration-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)} 
              className={`relative flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 overflow-hidden group ${isActive ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-slate-500'}`}
            >
               <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 2.5 : 2} />
               {isActive && (
                 <span className="text-[11px] font-black tracking-wide relative z-10 animate-fade-in whitespace-nowrap">
                   {tab.label}
                 </span>
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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 animate-fade-in" onClick={onClose} />
      <div 
        className="bg-slate-50 dark:bg-[#0b1121] w-full h-[92dvh] rounded-t-[3rem] shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) animate-slide-up ring-1 ring-white/10"
        style={{ transform: `translateY(${offsetY}px)` }}
        onTouchStart={(e) => { setIsDragging(true); startY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => { if(!isDragging) return; const diff = e.touches[0].clientY - startY.current; if(diff > 0) setOffsetY(diff); }}
        onTouchEnd={() => { setIsDragging(false); if(offsetY > 150) onClose(); else setOffsetY(0); }}
      >
        <div className="w-full h-12 flex items-center justify-center shrink-0 touch-none bg-gradient-to-b from-white/50 to-transparent dark:from-white/5">
          <div className="w-16 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export const NotificationsModal: React.FC<{ isOpen: boolean; onClose: () => void; notifications: AppNotification[]; onClear: () => void }> = ({ isOpen, onClose, notifications, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-all" onClick={onClose} />
        <div className="relative bg-slate-50 dark:bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl flex flex-col animate-slide-up max-h-[70vh]">
            <div className="p-6 bg-white dark:bg-[#0b1121] border-b border-slate-100 dark:border-white/5 flex justify-between items-center sticky top-0 z-10">
               <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Notificações</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{notifications.length} novas mensagens</p>
               </div>
               {notifications.length > 0 && (
                   <button onClick={onClear} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-colors">
                     <Trash2 className="w-4 h-4" />
                   </button>
               )}
            </div>
            
            <div className="overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                   <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                   <p className="text-xs font-medium">Tudo limpo por aqui.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-4 rounded-2xl border flex gap-4 ${n.type === 'update' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.type === 'update' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                        {n.type === 'update' ? <ArrowUpCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{n.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{n.message}</p>
                        {n.actionLabel && (
                          <button onClick={() => { n.onAction && n.onAction(); onClose(); }} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                            {n.actionLabel}
                          </button>
                        )}
                      </div>
                  </div>
                ))
              )}
            </div>
            
            <button onClick={onClose} className="p-4 text-center border-t border-slate-100 dark:border-white/5 text-xs font-bold text-slate-500 hover:text-accent uppercase tracking-widest bg-white dark:bg-[#0b1121]">
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
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-all" onClick={onClose} />
        
        <div className="relative bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] p-0 border border-white/20 shadow-2xl flex flex-col items-center animate-scale-in overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            
            {/* Header Clean */}
            <div className="w-full px-8 pt-10 pb-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 mb-6 text-white">
                  {isUpdatePending ? <Gift className="w-8 h-8" /> : <Rocket className="w-8 h-8" />}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  {isUpdatePending ? 'Atualização Disponível' : 'Novidades da Versão'}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Versão {version} • {isUpdatePending ? 'Pronta para instalar' : 'Instalada com sucesso'}
                </p>
            </div>

            {/* Lista Clean */}
            <div className="w-full px-6 py-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                <div className="space-y-3">
                  {notes && notes.length > 0 ? notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                       <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${note.type === 'feat' ? 'bg-amber-100 text-amber-600' : note.type === 'ui' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {note.type === 'feat' ? <Star className="w-3.5 h-3.5" /> : note.type === 'ui' ? <Palette className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{note.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{note.desc}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-slate-400 text-xs">Melhorias de estabilidade e correções de bugs.</div>
                  )}
                </div>
            </div>

            {/* Footer */}
            <div className="w-full p-6 bg-transparent">
              {isUpdatePending ? (
                 <button onClick={onUpdate} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Atualizar Agora
                 </button>
              ) : (
                <button onClick={onClose} className="w-full bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/10">
                    Entendi
                </button>
              )}
            </div>
        </div>
    </div>,
    document.body
  );
};
