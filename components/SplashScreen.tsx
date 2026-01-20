
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

const STATUS_TEXTS = [
  "Iniciando...",
  "Conectando...",
  "Sincronizando...",
  "Preparando ambiente...",
  "Carregando ativos...",
  "Quase pronto..."
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Sincroniza progresso com o Splash HTML (se existir)
  useEffect(() => {
    const htmlProgress = document.getElementById('splash-progress-bar');
    const htmlStatus = document.getElementById('splash-status-text');
    
    const reactProgress = document.getElementById('react-splash-progress');
    const reactStatus = document.getElementById('react-splash-status');

    const width = `${Math.max(5, realProgress)}%`;
    const textIndex = Math.min(
        Math.floor((realProgress / 100) * STATUS_TEXTS.length),
        STATUS_TEXTS.length - 1
    );
    const text = STATUS_TEXTS[textIndex];

    if (htmlProgress) htmlProgress.style.width = width;
    if (htmlStatus) htmlStatus.innerText = text;
    
    if (reactProgress) reactProgress.style.width = width;
    if (reactStatus) reactStatus.innerText = text;

  }, [realProgress]);

  // Gerencia a saída
  useEffect(() => {
    if (finishLoading) {
      const htmlSplash = document.getElementById('root-splash');
      if (htmlSplash) {
        const htmlProgress = document.getElementById('splash-progress-bar');
        const htmlStatus = document.getElementById('splash-status-text');
        if (htmlProgress) htmlProgress.style.width = '100%';
        if (htmlStatus) htmlStatus.innerText = "Pronto!";
        htmlSplash.classList.add('splash-exit');
      }

      setIsExiting(true);

      const timer = setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('app-revealed');
        
        if (htmlSplash && htmlSplash.parentNode) {
            htmlSplash.parentNode.removeChild(htmlSplash);
        }
        
        setShouldRender(false);
      }, 600); // Tempo da transição CSS

      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-primary-light dark:bg-primary-dark transition-opacity duration-700 ease-in-out ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
        {/* Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center">
            {/* BRAND CONTAINER */}
            <div className="flex items-center justify-center gap-4 mb-12 select-none">
                <div className="w-20 h-20 relative drop-shadow-2xl">
                   {/* Usa query string ?v=12 para evitar cache antigo */}
                   <img src="./logo.svg?v=12" alt="Logo InvestFIIs" className="w-full h-full object-contain" />
                </div>
                <span className="font-display text-[52px] font-extrabold tracking-tighter leading-none text-zinc-900 dark:text-white drop-shadow-sm">
                    NVEST
                </span>
            </div>
            
            {/* Barra de Progresso */}
            <div className="w-[140px] h-[3px] bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                <div id="react-splash-progress" className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-300 ease-out w-0 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>
            </div>
            
            <div id="react-splash-status" className="font-display text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em] animate-pulse">
                Carregando...
            </div>
        </div>
    </div>
  );
};
