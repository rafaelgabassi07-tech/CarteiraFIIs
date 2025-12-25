
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
    <header className="sticky top-0 z-50 bg-primary/80 backdrop-blur-2xl border-b border-white/5 px-6 h-20 flex items-center justify-between pt-safe">
      <div className="flex items-center gap-4">
        {showBack ? (
          <button onClick={onBack} className="p-2 -ml-2 rounded-2xl hover:bg-white/5 active:scale-90 transition-all text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="relative">
            <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            {/* Ponto pulsante restaurado */}
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-primary animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        )}
        <h1 className="text-lg font-black text-white uppercase tracking-widest">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {onRefresh && !showBack && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-3 rounded-2xl hover:bg-white/5 active:scale-90 transition-all text-slate-400 ${isRefreshing ? 'text-accent' : ''}`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        {!showBack && onSettingsClick && (
          <button onClick={onSettingsClick} className="p-3 rounded-2xl hover:bg-white/5 active:scale-90 transition-all text-slate-400">
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
    { id: 'transactions', icon: ArrowRightLeft, label: 'Histórico' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-primary/90 backdrop-blur-2xl border-t border-white/5 pb-safe px-6 z-[90]">
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
              <Icon className={`w-6 h-6 transition-all ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {isActive && <div className="absolute -top-1 w-1 h-1 bg-accent rounded-full animate-pulse shadow-[0_0_8px_#38bdf8]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
