
import React, { useEffect, useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; // Mantido para compatibilidade, mas não usado visualmente
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Remove o HTML estático assim que o React monta para evitar duplicação visual
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash) {
        // Transição suave do estático para o React
        staticSplash.style.transition = 'opacity 0.2s';
        staticSplash.style.opacity = '0';
        setTimeout(() => {
            if(staticSplash.parentNode) staticSplash.parentNode.removeChild(staticSplash);
        }, 200);
    }
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Lógica de saída (Fade out)
  useEffect(() => {
    if (finishLoading) {
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = ''; // Restaura scroll
        }, 600); // Tempo da animação de saída (CSS duration)
        return () => clearTimeout(removeTimeout);
      }, 800); // Garante que o spinner rode por um tempo mínimo para não parecer "glitch"
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#02040A] flex flex-col items-center justify-center transition-all duration-500 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Container Central */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo Box - Solid & Flat */}
        <div className={`
            relative mb-10 w-24 h-24 rounded-[28px] bg-[#0F1623] border border-slate-800 
            flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.05)]
            ${isFadingOut ? 'scale-90 opacity-0 transition-all duration-500' : ''}
        `}>
            <Wallet className="w-11 h-11 text-white" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-[32px] font-black text-white tracking-tight flex items-center justify-center gap-0.5 leading-none">
            Invest<span className="text-sky-500">FIIs</span>
        </h1>
            
        {/* Spinner Animation */}
        <div className="mt-12">
             <Loader2 className="w-7 h-7 text-sky-500 animate-spin" strokeWidth={2.5} />
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-60">
         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.25em]">
            Iniciando
         </p>
      </div>
    </div>
  );
};
