import React, { useEffect, useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash) {
        staticSplash.style.transition = 'opacity 0.15s ease-out';
        staticSplash.style.opacity = '0';
        setTimeout(() => {
            if(staticSplash.parentNode) staticSplash.parentNode.removeChild(staticSplash);
        }, 150);
    }
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (finishLoading) {
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = '';
          // Dispara animação de entrada no App via classe global
          document.body.classList.add('app-revealed');
        }, 600); 
        return () => clearTimeout(removeTimeout);
      }, 500); 
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-primary-light dark:bg-[#020617] flex flex-col items-center justify-center transition-all duration-700 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div className={`
            relative mb-10 w-24 h-24 rounded-[28px] bg-white dark:bg-[#0F1623] border border-zinc-100 dark:border-zinc-800/50 
            flex items-center justify-center shadow-2xl transition-all duration-500
            ${isFadingOut ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}
        `}>
            <Wallet className="w-11 h-11 text-zinc-900 dark:text-white" strokeWidth={1.5} />
        </div>

        <h1 className={`text-[32px] font-black text-zinc-900 dark:text-white tracking-tight flex items-center justify-center leading-none transition-all duration-500 delay-75 ${isFadingOut ? 'opacity-0 -translate-y-2' : 'opacity-100'}`}>
            Invest<span className="text-sky-500">FIIs</span>
        </h1>
            
        <div className={`mt-12 transition-all duration-500 ${isFadingOut ? 'opacity-0 scale-50' : 'opacity-100'}`}>
             <div className="w-6 h-6 border-3 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};
