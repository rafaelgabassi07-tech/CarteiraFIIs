import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Lógica de Scroll Lock e Cleanup do Static Splash
  useEffect(() => {
    // Bloqueia scroll enquanto o splash está ativo
    document.body.style.overflow = 'hidden';

    // Remove o splash estático do HTML assim que o React monta
    const staticSplash = document.getElementById('root-splash');
    if (staticSplash) {
        requestAnimationFrame(() => {
            staticSplash.classList.add('loaded');
            setTimeout(() => {
                if(staticSplash.parentNode) staticSplash.parentNode.removeChild(staticSplash);
            }, 600);
        });
    }

    // Cleanup: Garante que o scroll seja liberado ao desmontar
    return () => {
        document.body.style.overflow = '';
    };
  }, []);

  // Interpolação suave do progresso visual
  useEffect(() => {
    const update = () => {
        setDisplayProgress(prev => {
            const diff = realProgress - prev;
            if (diff <= 0) return prev;
            // Avança suavemente
            return prev + (diff * 0.15); 
        });
    };
    const timer = setInterval(update, 20);
    return () => clearInterval(timer);
  }, [realProgress]);

  // Garante 100% e inicia saída final
  useEffect(() => {
    if (finishLoading) {
      setDisplayProgress(100);
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
          // Força liberação do scroll explicitamente ao finalizar a animação
          document.body.style.overflow = ''; 
        }, 800); // Tempo da transição de saída
        return () => clearTimeout(removeTimeout);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Ambience (Blobs alinhados com o tema) */}
      <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Grid Pattern Sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* App Icon Container (Estilo iOS/Glassmorphism) */}
        <div className="relative mb-10 group">
            {/* Glow Effect behind logo */}
            <div className={`absolute inset-0 bg-sky-500 blur-[40px] rounded-full transition-all duration-1000 ${finishLoading ? 'opacity-40 scale-125' : 'opacity-0 scale-100'}`}></div>
            
            <div className="relative w-28 h-28 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 ring-1 ring-black/50">
                {/* Logo Inner */}
                <div className="relative flex items-center justify-center">
                    <Wallet 
                        className={`w-12 h-12 text-white transition-all duration-700 ${finishLoading ? 'scale-110' : 'scale-100'}`} 
                        strokeWidth={1.5} 
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center border-[3px] border-[#020617] shadow-lg">
                        <TrendingUp className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                </div>
            </div>
        </div>

        {/* Brand Name */}
        <div className="text-center space-y-6">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-1">
                Invest<span className="text-sky-500">FIIs</span>
            </h1>
            
            {/* Loading Bar & Status */}
            <div className="flex flex-col items-center gap-2 min-w-[140px]">
                <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                        style={{ width: `${displayProgress}%` }}
                    />
                </div>
                
                <div className="flex items-center justify-between w-full px-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest transition-opacity duration-300">
                        {finishLoading ? 'Iniciando...' : 'Carregando'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-600 font-medium tabular-nums">
                        {Math.round(displayProgress)}%
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Version */}
      <div className="absolute bottom-10 opacity-30">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">FIIs & Ações</p>
      </div>
    </div>
  );
};