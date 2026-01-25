
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div 
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-zinc-50 dark:bg-zinc-950`}
    >
        <div className="flex flex-col items-center gap-6 relative">
            {/* Logo Abstrato Animado */}
            <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-2xl shadow-2xl flex items-center justify-center text-white relative z-10 animate-[float_3s_ease-in-out_infinite]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>

            <div className="flex flex-col items-center gap-3">
                <div className="h-1 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                        style={{ width: `${realProgress}%` }}
                    ></div>
                </div>
                
                {realProgress < 100 && (
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] animate-pulse">
                        Carregando {Math.floor(realProgress)}%
                    </span>
                )}
            </div>
        </div>
    </div>,
    document.body
  );
};
