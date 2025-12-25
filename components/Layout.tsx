import React from 'react';
import { Home, PieChart, ArrowRightLeft, Settings, TrendingUp, ChevronLeft, RefreshCw } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between transition-all duration-300 pt-safe">
      <div className="flex items-center gap-3">
        {showBack && onBack ? (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-all text-white group"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <div className="bg-accent/10 p-2 rounded-lg">
             <TrendingUp className="w-5 h-5 text-accent" />
          </div>
        )}
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
      </div>
      
      <div className="flex items-center gap-1">
        {onRefresh && !showBack && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {!showBack && onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="p-2.5 rounded-full hover:bg-white/10 active:rotate-45 transition-all duration-300 text-gray-400 hover:text-white"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'portfolio', icon: PieChart, label: 'Carteira' },
    { id: 'transactions', icon: ArrowRightLeft, label: 'Transações' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-primary/90 backdrop-blur-lg border-t border-white/5 pb-safe pt-1 px-6 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-50">
      <div className="flex justify-between items-center h-16 max-w-sm mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-16 h-full transition-all duration-300 group`}
            >
              {isActive && (
                <div className="absolute -top-1 w-8 h-1 bg-accent rounded-full shadow-[0_0_10px_rgba(56,189,248,0.7)] animate-in fade-in zoom-in duration-300" />
              )}
              
              <Icon 
                className={`w-6 h-6 transition-all duration-300 ${
                  isActive 
                    ? 'text-accent -translate-y-0.5' 
                    : 'text-gray-500 group-hover:text-gray-300'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] mt-1 font-medium transition-colors duration-300 ${
                isActive ? 'text-accent' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};