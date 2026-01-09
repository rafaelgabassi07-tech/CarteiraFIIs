
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

  // Remove o HTML estático assim que o React monta para evitar duplicação visual
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash) {
        staticSplash.style.opacity = '0';
        setTimeout(() => {
            if(staticSplash.parentNode) staticSplash.parentNode.removeChild(staticSplash);
        }, 300);
    }
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Suavização da barra de progresso
  useEffect(() => {
    const update = () => {
        setDisplayProgress(prev => {
            const target = Math.max(prev, realProgress);
            const diff = target - prev;
            if (diff <= 0.5) return prev;
            return prev + (diff * 0.1); 
        });
    };
    const timer = setInterval(update, 16);
    return () => clearInterval(timer);
  }, [realProgress]);

  // Lógica de saída (Fade out)
  useEffect(() => {
    if (finishLoading) {
      setDisplayProgress(100);
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = ''; // Restaura scroll
        }, 600); // Tempo da animação de saída
        return () => clearTimeout(removeTimeout);
      }, 500); // Pequeno delay com a barra cheia
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#02040A] flex flex-col items-center justify-center transition-all duration-500 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Container Central */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo Box - Solid & Flat */}
        <div className={`
            relative mb-8 w-[88px] h-[88px] rounded-3xl bg-[#0F1623] border border-slate-800 
            flex items-center justify-center transition-all duration-700 ease-in-out
            ${isFadingOut ? 'scale-90 opacity-0' : 'animate-pulse-slow'}
        `}>
            <Wallet className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>

        {/* Title & Progress */}
        <div className="text-center space-y-8">
            <h1 className="text-[28px] font-black text-white tracking-tight flex items-center justify-center gap-0.5 leading-none">
                Invest<span className="text-sky-500">FIIs</span>
            </h1>
            
            {/* Progress Track */}
            <div className="w-[140px] h-[3px] bg-[#0F1623] rounded-full overflow-hidden mx-auto">
                <div 
                    className="h-full bg-sky-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${displayProgress}%` }}
                />
            </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] animate-pulse">
            Carregando Carteira
         </p>
      </div>

      {/* Custom Keyframes for React Component context if needed */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.96); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};
