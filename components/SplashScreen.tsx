
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Gerencia a saída
  useEffect(() => {
    if (finishLoading) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center transition-opacity duration-500 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-zinc-50 dark:bg-zinc-950`}
    >
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-zinc-200 dark:border-zinc-800"></div>
                <div 
                    className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"
                ></div>
            </div>
            {realProgress < 100 && (
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">
                    Carregando {Math.floor(realProgress)}%
                </span>
            )}
        </div>
    </div>
  );
};
