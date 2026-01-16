
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
        // Force 100%
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
        
        // Cleanup HTML Splash
        if (htmlSplash && htmlSplash.parentNode) {
            htmlSplash.parentNode.removeChild(htmlSplash);
        }
        
        // Unmount React Splash
        setShouldRender(false);
      }, 600); // Sync with CSS transition

      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  // React Splash Fallback
  // z-index 9998 garante que fique atrás do HTML Splash (9999) mas sobre o App
  // Se o HTML Splash for removido pelo failsafe, este aqui assume.
  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-primary-light dark:bg-primary-dark transition-opacity duration-500 ease-out-soft ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
        <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center gap-0 mb-12 relative">
                <div className="w-[52px] h-[80px] flex items-center justify-center">
                   <img src="./logo.svg" alt="I" className="w-full h-auto drop-shadow-lg" />
                </div>
                <span className="text-[56px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-teal-700 to-sky-500 dark:from-teal-400 dark:to-sky-400 transform -translate-x-4">
                    NVEST
                </span>
            </div>
            
            <div id="react-splash-status" className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-6 h-[14px]">
                Iniciando...
            </div>
            <div className="w-[140px] h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div id="react-splash-progress" className="h-full bg-accent rounded-full transition-all duration-300 ease-out w-0"></div>
            </div>
        </div>
    </div>
  );
};
