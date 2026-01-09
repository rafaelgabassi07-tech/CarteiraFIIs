import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(10);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash && staticSplash.parentNode) {
        staticSplash.style.display = 'none';
        setTimeout(() => staticSplash.parentNode?.removeChild(staticSplash), 100);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    const update = () => {
        setDisplayProgress(prev => {
            const target = Math.max(prev, realProgress);
            const diff = target - prev;
            if (diff <= 0.5) return prev;
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
        }, 600);
        return () => clearTimeout(removeTimeout);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 60%)' }}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8">
            <div className={`w-24 h-24 bg-[#0f172a] rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/5 ring-1 ring-black/50 transition-all duration-700 ${finishLoading ? 'scale-110 shadow-sky-500/20' : 'scale-100'}`}>
                <Wallet className="w-10 h-10 text-white opacity-90" strokeWidth={2} />
            </div>
        </div>

        <div className="text-center space-y-6">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1">
                Invest<span className="text-sky-500">FIIs</span>
            </h1>
            
            <div className="w-[120px] h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    style={{ width: `${displayProgress}%` }}
                />
            </div>
        </div>
      </div>

      <div className="absolute bottom-10 opacity-30">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em]">Simples & Funcional</p>
      </div>
    </div>
  );
};