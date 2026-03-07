
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [loadingText, setLoadingText] = useState('Iniciando...');

  useEffect(() => {
    if (realProgress > 30) setLoadingText('Carregando dados...');
    if (realProgress > 70) setLoadingText('Finalizando...');
    if (realProgress >= 100) setLoadingText('Pronto!');
  }, [realProgress]);

  useEffect(() => {
    if (finishLoading) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 800); 
      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return createPortal(
    <div 
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isExiting ? 'opacity-0 scale-110 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0'} bg-zinc-50 dark:bg-zinc-950`}
    >
        <div className="flex flex-col items-center relative">
            
            <div className="relative mb-8 scale-150">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 relative z-10 rotate-3 hover:rotate-6 transition-transform duration-500">
                    <TrendingUp className="w-8 h-8 text-white" strokeWidth={3} />
                </div>
            </div>

            <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white mb-8 flex items-center gap-1">
                NVEST
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-3 animate-bounce"></span>
            </h1>

            <div className="flex flex-col items-center gap-4 w-64">
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800/50">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)] relative" 
                        style={{ width: `${realProgress}%` }}
                    >
                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
                
                <div className="flex justify-between w-full px-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest transition-all duration-300">
                        {loadingText}
                    </span>
                    <span className="text-[10px] font-black text-zinc-900 dark:text-white tabular-nums">
                        {Math.round(realProgress)}%
                    </span>
                </div>
            </div>
        </div>
        
        <div className="absolute bottom-10 text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.3em]">
            Seu patrimônio em foco
        </div>
    </div>,
    document.body
  );
};
