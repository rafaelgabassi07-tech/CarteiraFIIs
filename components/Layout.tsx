
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, Bell, Download, X, Trash2, Info, ArrowUpCircle, Check, Star, Palette, Rocket, Gift, Wallet, Calendar, DollarSign, Clock, Zap, ChevronRight, Inbox, MessageSquare, Sparkles } from 'lucide-react';
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
  onRefresh, // Mantido na interface para compatibilidade, mas não renderizado
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
    <header className={`fixed top-0 left-0 right-0 z-40 h-24 flex items-center justify-between px-6 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl pt-2' : 'bg-transparent pt-4'}`}>
      <div className="flex items-center gap-3 w-full">
        {showBack ? (
          <div className="flex items-center gap-4 animate-fade-in w-full">
            <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm group border border-slate-100 dark:border-white/5">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </button>
            <div className="flex flex-col ml-1">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">Ajustes</h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">InvestFIIs v{appVersion}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col animate-fade-in">
              <div className="flex items-center gap-2.5">
                  {/* Ponto Pulsante agora usa Accent */}
                  <div className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                  </div>

                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>

                  {updateAvailable && (
                    <span className="relative flex h-2 w-2 ml-1" onClick={onUpdateClick}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent cursor-pointer"></span>
                    </span>
                  )}
              </div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-0.5">Visão em Tempo Real</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {updateAvailable && !showBack && (
          <button onClick={onUpdateClick} className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30 active:scale-95 transition-all animate-scale-in hover:brightness-110 border border-white/20">
            <Download className="w-4 h-4 animate-pulse" strokeWidth={2.5} />
          </button>
        )}

        {/* Botão de Refresh removido conforme solicitação */}

        {onNotificationClick && !showBack && (
          <button onClick={onNotificationClick} className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group border border-slate-100 dark:border-white/5">
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" strokeWidth={2} />
            {notificationCount > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm ring-2 ring-white dark:ring-[#020617]"></span>}
          </button>
        )}

        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all shadow-sm group border border-slate-100 dark:border-white/5">
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" strokeWidth={2} />
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
      <div className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl shadow-accent/10 flex items-center justify-between gap-4 border border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
             <Rocket className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">Nova Versão {version}</h4>
            <p className="text-[10px] font-medium text-slate-500 leading-none mt-1">Atualização disponível</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onUpdate} className="px-3 py-2 bg-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md">
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
      <nav className="bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl p-2 rounded-[1.5rem] flex items-center gap-2 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 pointer-events-auto transition-all duration-300 border border-white/20 dark:border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)} 
              className={`relative flex items-center justify-center h-12 rounded-2xl transition-all duration-500 ease-out active:scale-90 ${isActive ? 'bg-accent text-white shadow-lg shadow-accent/30 px-6' : 'px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'}`}
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
        className="bg-white dark:bg-[#0b1121] w-full h-[calc(100dvh-4.5rem)] rounded-t-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto transition-transform duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) animate-slide-up border-t border-white/20 dark:border-white/5"
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
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex flex-col bg-slate-50 dark:bg-[#020617] animate-fade-in">
        <div className="px-6 pt-safe pb-4 bg-white dark:bg-[#0f172a] shadow-sm z-10 sticky top-0 border-b border-slate-100 dark:border-white/5">
             <div className="flex items-center justify-between pt-4">
                 <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all">
                     <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                 </button>
                 <div className="text-center">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">Notificações</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Central de Mensagens</p>
                 </div>
                 <button 
                   onClick={onClear} 
                   disabled={notifications.length === 0}
                   className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${notifications.length > 0 ? 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500' : 'opacity-0 pointer-events-none'}`}
                 >
                     <Trash2 className="w-5 h-5" />
                 </button>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] opacity-60">
                   <div className="w-24 h-24 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 animate-float">
                      <Inbox className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tudo Limpo</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[250px]">
                      Você não tem novas notificações. Avisaremos quando houver novidades.
                   </p>
                </div>
             ) : (
                notifications.map((n, i) => {
                  let Icon = MessageSquare;
                  let bgClass = 'bg-slate-100 text-slate-500';
                  let borderClass = 'border-slate-100 dark:border-white/5';

                  if (n.category === 'payment' || n.type === 'success') {
                    Icon = DollarSign;
                    bgClass = 'bg-emerald-500 text-white shadow-emerald-500/20';
                    borderClass = 'border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-500/5';
                  } else if (n.category === 'datacom') {
                    Icon = Calendar;
                    bgClass = 'bg-amber-500 text-white shadow-amber-500/20';
                    borderClass = 'border-amber-500/10 bg-amber-50/50 dark:bg-amber-500/5';
                  } else if (n.category === 'update') {
                    Icon = Rocket;
                    bgClass = 'bg-accent text-white shadow-accent/20';
                    borderClass = 'border-accent/10 bg-accent/5';
                  } else {
                    Icon = Info;
                    bgClass = 'bg-indigo-500 text-white shadow-indigo-500/20';
                    borderClass = 'border-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-500/5';
                  }

                  return (
                    <div 
                        key={n.id} 
                        className={`p-5 rounded-[1.8rem] border ${borderClass} flex gap-4 transition-all active:scale-[0.98] animate-fade-in-up shadow-sm`}
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${bgClass}`}>
                          <Icon className="w-6 h-6" strokeWidth={2.5} />
                       </div>
                       <div className="flex-1 min-w-0 pt-0.5">
                           <div className="flex justify-between items-start mb-1">
                               <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate pr-2">{n.title}</h4>
                               <span className="text-[10px] font-bold text-slate-400 shrink-0 opacity-80">Hoje</span>
                           </div>
                           <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                               {n.message}
                           </p>
                       </div>
                    </div>
                  );
                })
             )}
        </div>
    </div>,
    document.body
  );
};

export const ChangelogModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  version: string; 
  notes?: ReleaseNote[];
  isUpdatePending?: boolean;
  onUpdate?: () => void;
  progress?: number;
}> = ({ isOpen, onClose, version, notes, isUpdatePending, onUpdate, progress = 0 }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl transition-all" onClick={progress > 0 ? undefined : onClose} />
        
        <div className="relative bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-white/10">
            <div className="relative h-40 bg-slate-900 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-purple-600/20 mix-blend-overlay"></div>
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-accent/20 rounded-full blur-[60px]"></div>
                <div className="absolute -left-10 bottom-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px]"></div>
                
                <div className="absolute bottom-0 left-0 p-8 z-10 w-full">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mb-3 shadow-sm">
                        <Sparkles className="w-3 h-3 text-white" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">O que há de novo</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-1">v{version}</h2>
                    <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest">Release Notes</p>
                </div>
                
                {progress === 0 && (
                  <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-black/20 text-white/70 hover:bg-black/40 backdrop-blur-md transition-all active:scale-90 z-20">
                      <X className="w-5 h-5" />
                  </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[50vh] p-8 bg-white dark:bg-[#0f172a]">
                 <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-white/5">
                    {notes && notes.length > 0 ? notes.map((note, i) => (
                      <div key={i} className="relative animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-[3px] border-white dark:border-[#0f172a] shadow-sm z-10 ${note.type === 'feat' ? 'bg-amber-500' : note.type === 'ui' ? 'bg-accent' : 'bg-emerald-500'}`}></div>
                          <div>
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                    note.type === 'feat' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 
                                    note.type === 'ui' ? 'bg-accent/10 text-accent' : 
                                    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                  }`}>
                                      {note.type === 'feat' ? 'NOVO' : note.type === 'ui' ? 'VISUAL' : 'SISTEMA'}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{note.title}</h4>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium pl-0.5">
                                  {note.desc}
                              </p>
                          </div>
                      </div>
                    )) : (
                      <div className="text-center py-10 text-slate-400 text-xs">Sem notas disponíveis.</div>
                    )}
                 </div>
            </div>

            <div className="p-6 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-white/5 shrink-0">
               {isUpdatePending ? (
                 progress > 0 ? (
                   <div className="w-full">
                      <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                             {progress < 100 ? 'Baixando...' : 'Aplicando...'}
                          </span>
                          <span className="text-[10px] font-bold text-accent tabular-nums">
                             {progress}%
                          </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                          <div 
                             className="h-full bg-accent transition-all duration-300 ease-out relative overflow-hidden" 
                             style={{ width: `${progress}%` }}
                          >
                             <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite] w-full transform -skew-x-12 translate-x-[-100%]"></div>
                          </div>
                      </div>
                   </div>
                 ) : (
                   <button onClick={onUpdate} className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-accent/20 hover:shadow-2xl hover:brightness-110 flex items-center justify-center gap-3">
                      <Download className="w-4 h-4" strokeWidth={2.5} /> 
                      <span>Instalar Atualização</span>
                   </button>
                 )
               ) : (
                 <button onClick={onClose} className="w-full bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-white/10">
                    Fechar Notas
                 </button>
               )}
            </div>
        </div>
    </div>,
    document.body
  );
};
