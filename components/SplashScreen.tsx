import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Interpolação suave do progresso visual
  useEffect(() => {
    const update = () => {
        setDisplayProgress(prev => {
            const diff = realProgress - prev;
            if (diff <= 0) return prev;
            // Avança 10% da diferença restante a cada tick para suavidade
            return prev + (diff * 0.1); 
        });
    };
    const timer = setInterval(update, 20);
    return () => clearInterval(timer);
  }, [realProgress]);

  // Garante 100% e inicia saída
  useEffect(() => {
    if (finishLoading) {
      setDisplayProgress(100);
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
        }, 1200); // Tempo da transição de saída
        return () => clearTimeout(removeTimeout);
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none blur-lg' : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Minimalist Logo Container with Ring Loader */}
        <div className="relative mb-12">
            {/* Inner Glow */}
            <div className={`absolute inset-0 bg-indigo-500 blur-[50px] rounded-full transition-opacity duration-1000 ${finishLoading ? 'opacity-30' : 'opacity-10'}`}></div>
            
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center">
                {/* Glass Background */}
                <div className="absolute inset-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/5 shadow-2xl"></div>

                {/* Icon */}
                <Wallet 
                    className={`relative w-8 h-8 text-white transition-all duration-1000 ${finishLoading ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'opacity-80'}`} 
                    strokeWidth={1.2} 
                />
                
                {/* SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]" viewBox="0 0 100 100">
                  {/* Track */}
                  <circle
                    className="text-white/5"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                  />
                  {/* Indicator */}
                  <circle
                    className="text-indigo-500 transition-all duration-100 ease-linear"
                    strokeWidth="1.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                  />
                </svg>
            </div>
        </div>

        {/* Elegant Typography */}
        <div className="text-center space-y-5">
            <h1 className="text-2xl font-light text-white tracking-[0.25em] font-sans antialiased opacity-90">
                INVEST<strong className="font-semibold text-white">FIIs</strong>
            </h1>
            
            <div className="flex items-center justify-center gap-4 opacity-60">
                <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-white/30"></div>
                <span className="text-[9px] font-medium text-slate-300 uppercase tracking-[0.4em] min-w-[80px] text-center transition-all duration-500">
                    {finishLoading ? 'Bem-vindo' : 'Carregando'}
                </span>
                <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-white/30"></div>
            </div>
        </div>
      </div>

      {/* Subtle Footer */}
      <div className="absolute bottom-12 opacity-20">
        <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Secure Environment</p>
      </div>
    </div>
  );
};