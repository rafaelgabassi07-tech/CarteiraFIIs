
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, TrendingUp, Bell, Rocket, Sparkles, Check, Wrench, Zap, Palette, ArrowUpCircle, X, Trash2, Info, Download, Star } from 'lucide-react';
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
               <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${updateAvailable ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${updateAvailable ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${updateAvailable ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}>
                {updateAvailable ? 'Nova Versão' : 'Sincronizado'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 animate-fade-in">
        {updateAvailable && !showBack && (
           <button onClick={onUpdateClick} className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 animate-pulse active:scale-95 transition-all">
             <Download className="w-5 h-5" />
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

  const getIcon = (type: string) => {
    switch(type) {
      case 'feat': return <Star className="w-4 h-4" />;
      case 'fix': return <Wrench className="w-4 h-4" />;
      case 'perf': return <Zap className="w-4 h-4" />;
      case 'ui': return <Palette className="w-4 h-4" />;
      default: return <Check className="w-4 h-4" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch(type) {
      case 'feat': return 'bg-amber-500 text-white shadow-amber-500/30';
      case 'fix': return 'bg-rose-500 text-white shadow-rose-500/30';
      case 'perf': return 'bg-cyan-500 text-white shadow-cyan-500/30';
      case 'ui': return 'bg-purple-500 text-white shadow-purple-500/30';
      default: return 'bg-emerald-500 text-white shadow-emerald-500/30';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg transition-all" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[3rem] p-0 border border-white/10 shadow-2xl flex flex-col items-center animate-slide-up overflow-hidden max-h-[85vh]">
            
            {/* Header com Gradiente */}
            <div className={`w-full p-8 pb-10 flex flex-col items-center justify-center relative overflow-hidden ${isUpdatePending ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-emerald-400 to-teal-600'}`}>
                {/* Efeitos de Fundo */}
                <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white dark:from-[#0f172a] to-transparent"></div>

                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-white mb-4 relative z-10 border border-white/30 shadow-xl">
                    <Rocket className="w-10 h-10 drop-shadow-md" strokeWidth={2} />
                </div>
                
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 mb-2 relative z-10">
                   <Sparkles className="w-3 h-3 text-yellow-300" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      {isUpdatePending ? 'Nova Versão Disponível' : 'Atualizado com Sucesso'}
                   </span>
                </div>

                <h3 className="text-3xl font-black text-white tracking-tight relative z-10">v{version}</h3>
            </div>
            
            {/* Timeline de Mudanças */}
            <div className="w-full px-6 -mt-4 relative z-10 flex-1 overflow-y-auto no-scrollbar pb-6">
               <div className="space-y-0 relative">
                 {/* Linha Vertical da Timeline */}
                 <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-white/5"></div>

                 {notes && notes.length > 0 ? notes.map((note, i) => (
                   <div key={i} className="relative pl-12 py-3 group">
                      {/* Ícone na Timeline */}
                      <div className={`absolute left-0 top-3.5 w-10 h-10 rounded-2xl flex items-center justify-center z-10 shadow-lg border-2 border-white dark:border-[#0f172a] transition-transform group-hover:scale-110 ${getColorClasses(note.type)}`}>
                        {getIcon(note.type)}
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider opacity-80 ${note.type === 'feat' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {note.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{note.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{note.desc}</p>
                      </div>
                   </div>
                 )) : (
                   <div className="text-center py-8 text-slate-400 text-xs">Melhorias internas de performance e estabilidade.</div>
                 )}
               </div>
            </div>

            {/* Footer com Ação */}
            <div className="w-full p-6 pt-2 bg-white dark:bg-[#0f172a] relative z-20">
              {isUpdatePending ? (
                 <button onClick={onUpdate} className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 flex items-center justify-center gap-2 animate-pulse-slow">
                    <Download className="w-4 h-4" /> Instalar Atualização
                 </button>
              ) : (
                <button onClick={onClose} className="w-full bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/20">
                    Fechar
                </button>
              )}
            </div>
        </div>
    </div>,
    document.body
  );
};
