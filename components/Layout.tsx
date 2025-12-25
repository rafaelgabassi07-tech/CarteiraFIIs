import React from 'react';
import { Home, PieChart, ArrowRightLeft, Settings, TrendingUp, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  onSettingsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onSettingsClick, showBack, onBack }) => {
  return (
    <header className="sticky top-0 z-50 bg-secondary/90 backdrop-blur-md border-b border-white/10 px-4 h-16 flex items-center justify-between shadow-lg transition-all duration-300">
      <div className="flex items-center gap-2">
        {showBack && onBack ? (
          <button 
            onClick={onBack}
            className="p-1 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        ) : (
          <TrendingUp className="w-6 h-6 text-accent" />
        )}
        <h1 className="text-lg font-bold text-white tracking-wide">{title}</h1>
      </div>
      
      {!showBack && onSettingsClick && (
        <button 
          onClick={onSettingsClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Configurações"
        >
          <Settings className="w-6 h-6 text-gray-300" />
        </button>
      )}
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
    <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-white/10 pb-safe pt-2 px-4 shadow-2xl z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full transition-all duration-300 ${
                isActive ? 'text-accent -translate-y-1' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'fill-accent/20' : ''}`} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};