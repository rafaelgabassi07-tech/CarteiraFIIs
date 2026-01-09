import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash && staticSplash.parentNode) {
        staticSplash.style.display = 'none';
        setTimeout(() => staticSplash.parentNode?.removeChild(staticSplash), 50);
    }
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const update = () => {
        setDisplayProgress(prev => {
            const target = Math.max(prev, realProgress);
            const diff = target - prev;
            if (diff <= 0.1) return prev;
            return prev + (diff * 0.15); 
        });
    };
    const timer = setInterval(update, 16);
    return () => clearInterval(timer);
  }, [realProgress]);

  useEffect(() => {
    if (finishLoading) {
      setDisplayProgress(100);
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = 'auto';
        }, 500);
        return () => clearTimeout(removeTimeout);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="mb-8 p-4 border border-white/10 rounded-3xl bg-white/5">
            <Wallet className="w-12 h-12 text-white stroke-1" />
        </div>

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-8">
            InvestFIIs
        </h1>
        
        <div className="w-32 h-[2px] bg-zinc-900 rounded-full overflow-hidden">
            <div 
                className="h-full bg-white transition-all duration-200 ease-out"
                style={{ width: `${displayProgress}%` }}
            />
        </div>
        
        <p className="mt-4 text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
            {finishLoading ? 'Pronto' : 'Carregando'}
        </p>
      </div>
    </div>
  );
};