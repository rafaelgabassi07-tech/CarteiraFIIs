
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, TrendingUp, Bell } from 'lucide-react';

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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 px-6 h-24 flex items-end pb-4 justify-between transition-all duration-500 ${isScrolled ? 'bg-primary/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
      <div className="flex items-center gap-4">
        {showBack ? (
          <button 
            onClick={onBack} 
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-white backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11 h-11 bg-gradient-to-tr from-accent to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(14,165,233,0.3)] border border-white/10 group">
            <TrendingUp className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={3} />
          </div>
        )}
        
        <div className="flex flex-col justify-center h-10">
          <h1 className="text-lg font-black text-white tracking-tight leading-none">
            {title}
          </h1>
          {!showBack && (
            <div className="flex items-center gap-1.5 mt-1 opacity-70">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Ao Vivo
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onNotificationClick && !showBack && (
           <button
             onClick={onNotificationClick}
             className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] active:scale-90 transition-all text-slate-400 hover:text-white backdrop-blur-md relative"
           >
             <Bell className="w-5 h-5" />
             {notificationCount > 0 && (
               <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]"></span>
             )}
           </button>
        )}

        {onRefresh && !showBack && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] active:scale-90 transition-all backdrop-blur-md ${isRefreshing ? 'text-accent border-accent/30 bg-accent/10' : 'text-slate-400 hover:text-white'}`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button 
            onClick={onSettingsClick} 
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] active:scale-90 transition-all text-slate-400 hover:text-white backdrop-blur-md"
          >
            <Settings className="w-5 h-5 transition-transform hover:rotate-45 duration-300" />
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
      <nav className="pointer-events-auto bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-1.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] flex items-center gap-1 transition-all hover:scale-[1.02]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3.5 rounded-[2rem] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group ${isActive ? 'bg-accent/10 flex-[1.4]' : 'bg-transparent flex-1 hover:bg-white/5'}`}
            >
               {/* Icon Container with Spring Animation */}
               <div className={`relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isActive ? '-translate-y-1 scale-110' : 'scale-100 group-active:scale-90'}`}>
                  <Icon 
                    className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-accent fill-accent/20' : 'text-slate-500 group-hover:text-slate-300'}`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {/* Glow effect behind active icon */}
                  {isActive && <div className="absolute inset-0 bg-accent/40 blur-lg rounded-full -z-10 animate-pulse-slow"></div>}
               </div>

               {/* Label Slide In/Out */}
               <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isActive ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'}`}>
                  <span className="text-[11px] font-black text-white tracking-wide whitespace-nowrap">
                    {tab.label}
                  </span>
               </div>
               
               {/* Bottom Dot Indicator */}
               <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
            </button>
          );
        })}
      </nav>
    </div>
  );
};

interface SwipeableModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const SwipeableModal: React.FC<SwipeableModalProps> = ({ isOpen, onClose, children }) => {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setOffsetY(0);
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; 
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      if (e.cancelable) e.preventDefault();
      setOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offsetY > 150) {
      onClose();
    } else {
      setOffsetY(0);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto"
        style={{ opacity: isDragging ? Math.max(0, 1 - offsetY / 500) : 1 }}
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div 
        className="bg-[#0f172a] w-full h-[95dvh] rounded-t-[2.5rem] border-t border-white/10 shadow-2xl relative flex flex-col overflow-hidden pointer-events-auto transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)"
        style={{ 
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)' 
        }}
      >
        {/* Drag Handle */}
        <div 
          className="w-full h-14 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none z-20 bg-gradient-to-b from-[#0f172a] to-transparent"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
           <div className="w-12 h-1.5 bg-slate-700/50 rounded-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-safe">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
