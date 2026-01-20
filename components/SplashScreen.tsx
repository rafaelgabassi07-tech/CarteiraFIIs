
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

const STATUS_TEXTS = [
  "Iniciando...",
  "Conectando...",
  "Sincronizando...",
  "Validando sessão...",
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

    const width = `${Math.max(10, realProgress)}%`;
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
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-primary-light dark:bg-primary-dark transition-opacity duration-500 ease-out-soft ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ perspective: '1000px' }}
    >
        <div className="flex flex-col items-center w-full animate-[float_6s_ease-in-out_infinite]">
            {/* BRAND CONTAINER 3D */}
            <div className="flex items-center justify-center gap-2 mb-16 relative select-none transform-style-3d">
                <div className="w-[84px] h-[84px] flex items-center justify-center relative z-10 drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)]">
                   <img src="./logo.svg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display text-[56px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-zinc-700 via-zinc-500 to-zinc-800 dark:from-white dark:via-zinc-200 dark:to-zinc-400 mt-2 -ml-1 drop-shadow-sm">
                    NVEST
                </span>
            </div>
            
            <div id="react-splash-status" className="font-display text-[11px] font-bold text-accent uppercase tracking-[0.2em] mb-4">
                Iniciando...
            </div>
            <div className="w-[160px] h-[4px] bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div id="react-splash-progress" className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-300 ease-out w-0 shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
            </div>
        </div>
    </div>
  );
};
