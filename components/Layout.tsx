
import React from 'react';
import { Home, PieChart, ArrowRightLeft, Settings, ChevronLeft, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  onSettingsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Ícone do Logotipo Customizado (Prédios + Crescimento)
const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="14" width="4" height="6" rx="1" fill="currentColor" opacity="0.4" />
    <rect x="7" y="10" width="4" height="10" rx="1" fill="currentColor" opacity="0.6" />
    <rect x="12" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.4" />
    <rect x="17" y="7" width="4" height="13" rx="1" fill="currentColor" opacity="0.6" />
    <path d="M2 18L8 12L13 16L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 4H22V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onSettingsClick, 
  showBack, 
  onBack,
  onRefresh,
  isRefreshing 
}) => {
  return (
    <header className="sticky top-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between transition-all duration-300 pt-safe shadow-lg shadow-black/5">
      <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDuration: '0.4s' }}>
        {showBack && onBack ? (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-all text-white group"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <div className="bg-gradient-to-br from-accent/20 to-accent/5 p-2 rounded-xl ring-1 ring-white/10 shadow-[0_0_15px_rgba(56,189,248,0.15)] text-accent">
             <LogoIcon />
          </div>
        )}
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-1 animate-fade-in-up" style={{ animationDuration: '0.4s', animationDelay: '0.1s' }}>
        {onRefresh && !showBack && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2.5 rounded-full hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-white disabled:opacity-50 ${isRefreshing ? 'bg-white/5 text-accent' : ''}`}
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {!showBack && onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="p-2.5 rounded-full hover:bg-white/5 active:rotate-45 transition-all duration-300 text-gray-400 hover:text-white"
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
    <nav className="fixed bottom-0 left-0 right-0 bg-primary/85 backdrop-blur-2xl border-t border-white/5 pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
      <div className="flex justify-between items-center h-14 max-w-sm mx-auto relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-20 h-full transition-all duration-500 group`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-white/5 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
              
              <Icon 
                className={`w-6 h-6 transition-all duration-500 relative z-10 ${
                  isActive 
                    ? 'text-accent -translate-y-1' 
                    : 'text-slate-500 group-hover:text-slate-300'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              
              <span className={`text-[10px] font-semibold transition-all duration-500 absolute bottom-1.5 ${
                isActive ? 'text-accent opacity-100 translate-y-0' : 'text-slate-500 opacity-0 translate-y-2'
              }`}>
                {tab.label}
              </span>
              
               {isActive && (
                <div className="absolute top-2 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-scale-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
