
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
    
    // Atualiza elementos DOM do React Splash (se montado)
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
      // 1. Trigger exit animation on HTML Splash
      const htmlSplash = document.getElementById('root-splash');
      if (htmlSplash) {
        const htmlProgress = document.getElementById('splash-progress-bar');
        const htmlStatus = document.getElementById('splash-status-text');
        if (htmlProgress) htmlProgress.style.width = '100%';
        if (htmlStatus) htmlStatus.innerText = "Pronto!";
        htmlSplash.classList.add('splash-exit');
      }

      // 2. Trigger exit animation on React Splash
      setIsExiting(true);

      // 3. Reveal App Content after small delay
      const timer = setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('app-revealed');
        
        if (htmlSplash && htmlSplash.parentNode) {
            htmlSplash.parentNode.removeChild(htmlSplash);
        }
        
        setShouldRender(false);
      }, 600); // Sync with CSS transition

      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  // React Splash Fallback
  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-primary-light dark:bg-primary-dark transition-opacity duration-500 ease-out-soft ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
        <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center gap-1 mb-14 relative select-none">
                <div className="w-[72px] h-[72px] flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
                   <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[0_16px_32px_rgba(79,70,229,0.3)]">
                        <defs>
                            <linearGradient id="grad_top_splash" x1="256" y1="128" x2="256" y2="256" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#34d399"/>
                                <stop offset="100%" stopColor="#0ea5e9"/>
                            </linearGradient>
                            <linearGradient id="grad_right_splash" x1="366" y1="192" x2="366" y2="448" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#0ea5e9"/>
                                <stop offset="100%" stopColor="#6366f1"/>
                            </linearGradient>
                            <linearGradient id="grad_left_splash" x1="146" y1="192" x2="146" y2="448" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#0284c7"/>
                                <stop offset="100%" stopColor="#4f46e5"/>
                            </linearGradient>
                        </defs>
                        <path d="M256 64L448 160L256 256L64 160L256 64Z" fill="url(#grad_top_splash)"/>
                        <path d="M448 160V352L256 448V256L448 160Z" fill="url(#grad_right_splash)"/>
                        <path d="M64 160V352L256 448V256L64 160Z" fill="url(#grad_left_splash)"/>
                        <path d="M256 64L256 256" stroke="white" strokeOpacity="0.2" strokeWidth="2"/>
                        <path d="M256 256L448 160" stroke="white" strokeOpacity="0.1" strokeWidth="2"/>
                        <path d="M256 256L64 160" stroke="white" strokeOpacity="0.1" strokeWidth="2"/>
                   </svg>
                </div>
                <span className="font-display text-[52px] font-extrabold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-600 dark:from-zinc-200 dark:via-zinc-100 dark:to-zinc-400 mt-2 -ml-2 drop-shadow-sm">
                    NVEST
                </span>
            </div>
            
            <div id="react-splash-status" className="font-display text-[10px] font-bold text-accent uppercase tracking-[0.25em] mb-6 h-[14px]">
                Iniciando...
            </div>
            <div className="w-[140px] h-[3px] bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div id="react-splash-progress" className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-300 ease-out w-0 shadow-[0_0_12px_rgba(14,165,233,0.6)]"></div>
            </div>
        </div>
    </div>
  );
};
