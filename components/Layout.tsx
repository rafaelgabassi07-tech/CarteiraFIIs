
import React from 'react';
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
    <header className="sticky top-0 z-50 bg-primary/70 backdrop-blur-[40px] border-b border-white/[0.04] px-6 h-22 flex items-center justify-between pt-safe transition-all duration-500">
      <div className="flex items-center gap-4">
        {showBack ? (
          <button 
            onClick={onBack} 
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-white shadow-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11 h-11 bg-gradient-to-br from-accent to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(56,189,248,0.25)] border border-white/15">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
        )}
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-white uppercase tracking-[0.18em] leading-none">
              {title}
            </h1>
            {!showBack && (
              <div className="flex items-center gap-1.5 ml-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
                </span>
              </div>
            )}
          </div>
          {!showBack && (
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 opacity-50">
              Sincronização em Tempo Real
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {onRefresh && !showBack && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-slate-400 ${isRefreshing ? 'text-accent border-accent/30' : ''}`}
          >
            <RefreshCw className={`w-4.5 h-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button 
            onClick={onSettingsClick} 
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/10 active:scale-90 transition-all text-slate-400"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
    </header>
  );
};

export const BottomNav: React.FC<{ currentTab: string; onTabChange: (tab: string) => void }> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'portfolio', icon: PieChart, label: 'Patrimônio' },
    { id: 'transactions', icon: ArrowRightLeft, label: 'Histórico' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-primary/80 backdrop-blur-[40px] border-t border-white/[0.04] pb-safe px-6 z-[90]">
      <div className="flex justify-between items-center h-20 max-w-sm mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1.5 transition-all relative px-4 ${isActive ? 'text-accent' : 'text-slate-500'}`}
            >
              <Icon className={`w-5.5 h-5.5 transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-40 hover:opacity-100'}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-0.5'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -top-1 w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_12px_#38bdf8]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
