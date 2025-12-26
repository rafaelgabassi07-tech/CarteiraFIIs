
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, TrendingUp, Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  title: string;
  onSettingsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNotificationClick?: () => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onSettingsClick, 
  showBack, 
  onBack,
  onRefresh,
  isRefreshing,
  onNotificationClick,
  notificationCount = 0
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 px-6 h-24 flex items-end pb-4 justify-between transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-primary-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm' : 'bg-transparent'}`}>
      <div className="flex items-center gap-4">
        {showBack ? (
          <button onClick={onBack} className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] text-slate-600 dark:text-white active:scale-90 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11 h-11 bg-gradient-to-tr from-accent to-blue-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
            <TrendingUp className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
        )}
        
        <div className="flex flex-col justify-center h-10">
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">{title}</h1>
          {!showBack && (
            <div className="flex items-center gap-1.5 mt-1">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Ao Vivo</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onNotificationClick && !showBack && (
           <button onClick={onNotificationClick} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] active:scale-90 transition-all text-slate-500 dark:text-slate-400 hover:text-accent relative shadow-sm">
             <Bell className="w-5 h-5" />
             {notificationCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-primary-dark"></span>}
           </button>
        )}
        {onRefresh && !showBack && (
          <button onClick={onRefresh} disabled={isRefreshing} className={`w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] active:scale-90 transition-all shadow-sm ${isRefreshing ? 'text-accent animate-spin' : 'text-slate-500 dark:text-slate-400'}`}>
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] active:scale-90 transition-all text-slate-500 dark:text-slate-400 hover:text-accent shadow-sm">
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
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto bg-white/90 dark:bg-secondary-dark/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-1.5 shadow-2xl flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`relative flex items-center gap-2 px-5 py-3.5 rounded-[2rem] transition-all duration-300 ${isActive ? 'bg-accent/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
               <Icon className={`w-6 h-6 ${isActive ? 'text-accent' : 'text-slate-400 dark:text-slate-500'}`} />
               {isActive && <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-wide">{tab.label}</span>}
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
    <div className="fixed inset-0 z-[300] flex items-end justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div 
        className="bg-white dark:bg-secondary-dark w-full h-[95dvh] rounded-t-[2.5rem] border-t border-slate-200 dark:border-white/10 shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto transition-transform duration-500 ease-out"
        style={{ transform: `translateY(${offsetY}px)` }}
        onTouchStart={(e) => { setIsDragging(true); startY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => { if(!isDragging) return; const diff = e.touches[0].clientY - startY.current; if(diff > 0) setOffsetY(diff); }}
        onTouchEnd={() => { setIsDragging(false); if(offsetY > 150) onClose(); else setOffsetY(0); }}
      >
        <div className="w-full h-10 flex items-center justify-center shrink-0 touch-none"><div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" /></div>
        <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>,
    document.body
  );
};
