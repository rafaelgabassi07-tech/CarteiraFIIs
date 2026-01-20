
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
                   <img src="./logo.svg?v=12" alt="Logo" className="w-full h-full object-contain" />
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
