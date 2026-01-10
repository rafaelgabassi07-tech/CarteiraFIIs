
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Bloquear rolagem enquanto splash está ativo
    document.body.style.overflow = 'hidden';
    
    // Removemos o splash estático do HTML imediatamente.
    // Como este componente React usa as mesmas Variáveis CSS do index.html,
    // a transição visual é imperceptível (sem flash).
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash && staticSplash.parentNode) {
        staticSplash.parentNode.removeChild(staticSplash);
    }
    
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (finishLoading) {
      // Pequeno delay para garantir que o usuário perceba a marca
      // e para que a animação de saída seja suave
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = '';
          document.body.classList.add('app-revealed');
        }, 700); // Deve corresponder à duração da transição CSS
        return () => clearTimeout(removeTimeout);
      }, 800); 
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  // IMPORTANTE: Usamos style com var() do CSS global (index.html) ao invés de classes Tailwind
  // para garantir que a cor bata exatamente com o loader estático, independente 
  // se a classe 'dark' já foi injetada no HTML pelo React ou não.
  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ease-out-quint ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'var(--bg-splash)' }}
    >
      <div className={`relative z-10 flex flex-col items-center transition-transform duration-700 ${isFadingOut ? 'scale-105' : 'scale-100'}`}>
        
        {/* Logo Box */}
        <div 
            className="relative mb-8 w-24 h-24 rounded-[28px] flex items-center justify-center shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] border border-white/5"
            style={{ backgroundColor: 'var(--logo-bg)' }}
        >
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
              style={{ color: 'var(--text-main)' }}
            >
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/>
            </svg>
        </div>

        <h1 
            className="text-[32px] font-black tracking-tight flex items-center justify-center leading-none"
            style={{ color: 'var(--text-main)' }}
        >
            Invest<span style={{ color: 'var(--accent)' }}>FIIs</span>
        </h1>
            
        {/* Loader */}
        <div className={`mt-12 flex flex-col items-center gap-3 transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
             {/* Spinner manual para garantir cor correta */}
             <div 
                className="w-6 h-6 border-[3px] rounded-full animate-spin"
                style={{ 
                    borderColor: 'rgba(14, 165, 233, 0.2)', 
                    borderTopColor: 'var(--accent)' 
                }}
             ></div>
             
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
