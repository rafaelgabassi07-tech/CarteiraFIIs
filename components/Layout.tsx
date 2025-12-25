
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw, TrendingUp } from 'lucide-react';

interface HeaderProps {
  title: string;
  onSettingsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onSettingsClick, 
  showBack, 
  onBack,
  onRefresh,
  isRefreshing 
}) => {
  return (
    <header className="sticky top-0 z-50 bg-primary/40 backdrop-blur-[24px] border-b border-white/[0.04] px-6 h-20 flex items-center justify-between pt-safe transition-all duration-500">
      <div className="flex items-center gap-4">
        {showBack ? (
          <button 
            onClick={onBack} 
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-blue-500 rounded-xl flex items-center justify-center shadow-[0_4px_20px_rgba(56,189,248,0.2)] border border-white/10 animate-float">
            <TrendingUp className="w-5 h-5 text-primary" strokeWidth={3} />
          </div>
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-white uppercase tracking-[0.15em] leading-none">
              {title}
            </h1>
          </div>
          {!showBack && (
            <div className="flex items-center gap-1.5 mt-1 opacity-60">
               <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em]">
                Live Market
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onRefresh && !showBack && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-slate-400 ${isRefreshing ? 'text-accent border-accent/30 bg-accent/5' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button 
            onClick={onSettingsClick} 
            className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-slate-400"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

export const BottomNav: React.FC<{ currentTab: string; onTabChange: (tab: string) => void }> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'portfolio', icon: PieChart, label: 'Posição' },
    { id: 'transactions', icon: ArrowRightLeft, label: 'Ordens' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-[100] nav-shadow">
      <nav className="glass rounded-[2rem] px-4 py-3 flex justify-around items-center border border-white/10 relative overflow-hidden shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1.5 transition-all duration-300 px-6 py-2 rounded-2xl tap-highlight ${isActive ? 'text-accent' : 'text-slate-500'}`}
            >
              {/* Active Background Glow */}
              {isActive && (
                <div className="absolute inset-0 bg-accent/10 blur-xl rounded-full animate-pulse-neon" />
              )}
              
              <Icon 
                className={`w-5 h-5 transition-all duration-500 ease-out ${isActive ? 'scale-110 -translate-y-0.5' : 'opacity-40'}`} 
                strokeWidth={isActive ? 3 : 2} 
              />
              
              <span className={`text-[8px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 scale-90 translate-y-1'}`}>
                {tab.label}
              </span>

              {/* Dot indicator */}
              <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-accent transition-all duration-500 ${isActive ? 'opacity-100 scale-100 shadow-[0_0_8px_#38bdf8]' : 'opacity-0 scale-0'}`} />
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
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      setOffsetY(0);
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; // Prevents background scrolling on iOS
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => { 
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if we are at the top of the content
    if (contentRef.current && contentRef.current.scrollTop > 0) return;
    
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - startY.current;

    // Only allow dragging down
    if (diff > 0) {
      if (e.cancelable) e.preventDefault();
      setOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Threshold to close
    if (offsetY > 120) {
      onClose();
    } else {
      setOffsetY(0); // Snap back
    }
  };

  if (!isOpen) return null;

  // Utiliza Portal para renderizar fora da hierarquia principal (acima do Header sticky)
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* Backdrop com transição de opacidade baseada no arrasto */}
      <div 
        className="absolute inset-0 bg-primary/80 backdrop-blur-md transition-opacity duration-300 ease-out"
        style={{ opacity: isDragging ? Math.max(0, 1 - offsetY / 600) : 1 }}
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className="bg-primary w-full h-[96dvh] rounded-t-[2.5rem] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative flex flex-col overflow-hidden will-change-transform"
        style={{ 
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)' 
        }}
      >
        {/* Drag Handle Area - Aumentada para melhor precisão */}
        <div 
          className="w-full h-10 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 absolute top-0 left-0 right-0 z-20 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
           {/* Visual Handle */}
           <div className="w-16 h-1.5 bg-slate-600/50 rounded-full" />
        </div>

        {/* Content Area */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto no-scrollbar pt-10" // Adicionado padding-top para compensar o handle
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
