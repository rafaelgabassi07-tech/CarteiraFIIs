
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Prevenir rolagem durante o carregamento
    document.body.style.overflow = 'hidden';
    
    // A remoção do splash estático (HTML) agora é feita de forma mais suave
    // para garantir que o React já renderizou o substituto idêntico.
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash) {
        requestAnimationFrame(() => {
           staticSplash.style.transition = 'opacity 0.2s ease-out';
           staticSplash.style.opacity = '0';
           setTimeout(() => {
               if(staticSplash.parentNode) staticSplash.parentNode.removeChild(staticSplash);
           }, 200);
        });
    }
    
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (finishLoading) {
      // Delay para garantir que o usuário veja a marca por um instante
      // e para suavizar transições de estado muito rápidas (ex: cache hit)
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = '';
          document.body.classList.add('app-revealed');
        }, 700); // Tempo da transição CSS
        return () => clearTimeout(removeTimeout);
      }, 800); 
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ease-out-quint bg-[#F4F4F5] dark:bg-[#020617] ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Box - Match exato com index.html */}
        <div className={`
            relative mb-8 w-24 h-24 rounded-[28px] bg-white dark:bg-[#0F1623] 
            flex items-center justify-center shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]
            border border-white/5 transition-all duration-500
            ${isFadingOut ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}
        `}>
            {/* SVG Idêntico ao index.html para evitar layout shift */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="44" 
              height="44" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-[#18181b] dark:text-white"
            >
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/>
            </svg>
        </div>

        <h1 className={`text-[32px] font-black text-[#18181b] dark:text-white tracking-tight flex items-center justify-center leading-none transition-all duration-500 delay-75 ${isFadingOut ? 'opacity-0 -translate-y-2' : 'opacity-100'}`}>
            Invest<span className="text-[#0ea5e9]">FIIs</span>
        </h1>
            
        {/* Loader e Barra de Progresso Discreta */}
        <div className={`mt-12 flex flex-col items-center gap-3 transition-all duration-500 ${isFadingOut ? 'opacity-0 scale-50' : 'opacity-100'}`}>
             <div className="w-6 h-6 border-[3px] border-[#0ea5e9]/20 border-t-[#0ea5e9] rounded-full animate-spin"></div>
             
             {/* Indicador de progresso opcional se o carregamento demorar */}
             {realProgress > 0 && realProgress < 100 && (
               <div className="w-24 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-[#0ea5e9] transition-all duration-300 ease-out"
                    style={{ width: `${realProgress}%` }}
                  ></div>
               </div>
             )}
        </div>
      </div>
    </div>
  );
};
