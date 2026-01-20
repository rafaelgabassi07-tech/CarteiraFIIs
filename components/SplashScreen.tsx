
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress?: number; 
}

const STATUS_TEXTS = [
  "Iniciando...",
  "Conectando...",
  "Sincronizando...",
  "Preparando ambiente...",
  "Carregando ativos...",
  "Quase pronto..."
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress = 0 }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Sincroniza progresso com o Splash HTML (se existir)
  useEffect(() => {
    const htmlProgress = document.getElementById('splash-progress-bar');
    const htmlStatus = document.getElementById('splash-status-text');
    
    // Calcula progresso visual
    const width = `${Math.max(10, Math.min(realProgress || 0, 90))}%`;
    
    // Estima o texto baseado no progresso ou tempo
    const textIndex = Math.min(
        Math.floor(((realProgress || 0) / 100) * STATUS_TEXTS.length),
        STATUS_TEXTS.length - 1
    );
    const text = STATUS_TEXTS[textIndex];

    if (htmlProgress) htmlProgress.style.width = width;
    if (htmlStatus) htmlStatus.innerText = text;

  }, [realProgress]);

  // Gerencia a saída (Unmount)
  useEffect(() => {
    if (finishLoading) {
      const htmlSplash = document.getElementById('root-splash');
      if (htmlSplash) {
        const htmlProgress = document.getElementById('splash-progress-bar');
        const htmlStatus = document.getElementById('splash-status-text');
        
        // Completa a barra visualmente antes de sair
        if (htmlProgress) htmlProgress.style.width = '100%';
        if (htmlStatus) htmlStatus.innerText = "Pronto!";
        
        // Adiciona classe de saída ao HTML estático
        htmlSplash.classList.add('splash-exit');
      }

      setIsExiting(true);

      const timer = setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('app-revealed');
        
        // Remove o elemento HTML da DOM para limpar memória
        if (htmlSplash && htmlSplash.parentNode) {
            htmlSplash.parentNode.removeChild(htmlSplash);
        }
        
        setShouldRender(false);
      }, 700); // Tempo um pouco maior que a transição CSS (0.6s)

      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  // Este JSX espelha o HTML estático para garantir que se o React carregar rápido,
  // o usuário não veja um "flicker". Ele serve como "dublê" durante a transição de saída.
  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-primary-light dark:bg-primary-dark transition-opacity duration-700 ease-in-out ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
        {/* Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center">
            {/* BRAND CONTAINER - Mesma estrutura do HTML */}
            <div className="flex items-center justify-center gap-4 mb-12 select-none">
                <div className="w-[72px] h-[72px] relative drop-shadow-2xl">
                   {/* INLINE SVG para garantir renderização sem cache externo */}
                   <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-contain">
                        <defs>
                            <linearGradient id="logo_grad_react" x1="128" y1="40" x2="384" y2="472" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#10b981"/>
                                <stop offset="50%" stopColor="#0ea5e9"/>
                                <stop offset="100%" stopColor="#4f46e5"/>
                            </linearGradient>
                            <filter id="dropShadow_react" x="0" y="0" width="512" height="530" filterUnits="userSpaceOnUse">
                                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0ea5e9" floodOpacity="0.25"/>
                            </filter>
                        </defs>
                        <g filter="url(#dropShadow_react)">
                            <path d="M256 64L464 272H384L256 144L128 272H48L256 64Z" fill="url(#logo_grad_react)"/>
                            <path d="M176 296L256 248L336 296V312H176V296Z" fill="url(#logo_grad_react)"/>
                            <rect x="184" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_react)"/>
                            <rect x="240" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_react)"/>
                            <rect x="296" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_react)"/>
                            <path d="M160 448H352C356.418 448 360 451.582 360 456V472H152V456C152 451.582 155.582 448 160 448Z" fill="url(#logo_grad_react)"/>
                        </g>
                    </svg>
                </div>
                <span className="font-display text-[56px] font-extrabold tracking-tighter leading-none text-zinc-900 dark:text-white drop-shadow-sm">
                    NVEST
                </span>
            </div>
            
            {/* Barra de Progresso (Visual React) */}
            <div className="w-[140px] h-[3px] bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                <div 
                    className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                    style={{ width: isExiting ? '100%' : `${Math.max(10, realProgress || 0)}%` }}
                ></div>
            </div>
            
            <div className="font-display text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.15em] animate-pulse">
                {isExiting ? 'Pronto!' : 'Carregando...'}
            </div>
        </div>
    </div>
  );
};
