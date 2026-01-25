
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Gerencia a saída
  useEffect(() => {
    if (finishLoading) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 600); 
      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return createPortal(
    <div 
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-zinc-50 dark:bg-zinc-950`}
    >
        <div className="flex flex-col items-center relative">
            
            {/* BRAND COMPOSITION */}
            <div className="flex items-center justify-center gap-1 mb-8 relative select-none scale-110">
                <div className="w-[58px] h-[68px] flex items-center justify-center relative z-10 animate-[float_4s_ease-in-out_infinite]">
                   <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[0_12px_24px_rgba(14,165,233,0.3)]">
                        <defs>
                            <linearGradient id="logo_grad_splash" x1="128" y1="40" x2="384" y2="472" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#10b981"/>
                                <stop offset="50%" stopColor="#0ea5e9"/>
                                <stop offset="100%" stopColor="#4f46e5"/>
                            </linearGradient>
                        </defs>
                        <path d="M256 64L464 272H384L256 144L128 272H48L256 64Z" fill="url(#logo_grad_splash)"/>
                        <path d="M176 296L256 248L336 296V312H176V296Z" fill="url(#logo_grad_splash)"/>
                        <rect x="184" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_splash)"/>
                        <rect x="240" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_splash)"/>
                        <rect x="296" y="328" width="32" height="104" rx="6" fill="url(#logo_grad_splash)"/>
                        <path d="M160 448H352C356.418 448 360 451.582 360 456V472H152V456C152 451.582 155.582 448 160 448Z" fill="url(#logo_grad_splash)"/>
                   </svg>
                </div>
                <span className="font-display text-[42px] font-extrabold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400 mt-1 -ml-1 drop-shadow-sm">
                    NVEST
                </span>
            </div>

            <div className="flex flex-col items-center gap-3 w-48">
                <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]" 
                        style={{ width: `${realProgress}%` }}
                    ></div>
                </div>
                
                {realProgress < 100 && (
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] animate-pulse">
                        Carregando...
                    </span>
                )}
            </div>
        </div>
    </div>,
    document.body
  );
};
