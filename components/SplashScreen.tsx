import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [loadingText, setLoadingText] = useState('Iniciando...');
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    setDisplayProgress(prev => Math.max(prev, realProgress));
  }, [realProgress]);

  useEffect(() => {
    if (realProgress < 15) setLoadingText('Autenticando...');
    else if (realProgress < 40) setLoadingText('Sincronizando nuvem...');
    else if (realProgress < 70) setLoadingText('Atualizando cotações...');
    else if (realProgress < 90) setLoadingText('Processando Inteligência...');
    else setLoadingText('Bem-vindo');
  }, [realProgress]);

  useEffect(() => {
    if (finishLoading) {
      setDisplayProgress(100);
      
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
        }, 800); // Tempo da animação de saída um pouco maior para suavidade
        return () => clearTimeout(removeTimeout);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-110 pointer-events-none blur-sm' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:32px_32px] opacity-20"></div>
      
      {/* Animated Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      
      {/* Central Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-[80px]"></div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[320px]">
        
        {/* Premium Icon Container */}
        <div className="relative mb-10 group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative w-28 h-28 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl ring-1 ring-white/5">
            <Wallet className="w-12 h-12 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" strokeWidth={1.2} />
            
            {/* Notification Dot / Status */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center border-[4px] border-[#020617] shadow-lg">
               {finishLoading ? <Sparkles className="w-5 h-5 text-white animate-pulse" strokeWidth={2} /> : <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />}
            </div>
          </div>
        </div>

        {/* Brand Typography */}
        <div className="text-center mb-12 space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-xl bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                InvestFIIs
            </h1>
            <div className="flex items-center justify-center gap-2">
                <div className="h-[1px] w-4 bg-indigo-500/50"></div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">
                    Wealth Intelligence
                </p>
                <div className="h-[1px] w-4 bg-indigo-500/50"></div>
            </div>
        </div>

        {/* Minimalist Loader */}
        <div className="w-full px-8">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{loadingText}</span>
                <span className="text-xs font-mono font-bold text-white tabular-nums">{Math.round(displayProgress)}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 relative">
                {/* Progress Bar */}
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 rounded-full transition-all duration-500 ease-out relative shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{ width: `${displayProgress}%` }}
                >
                    {/* Shimmer Effect inside bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]"></div>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Badge */}
      <div className="absolute bottom-10 flex flex-col items-center gap-2 opacity-50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Ambiente Seguro</span>
        </div>
      </div>
    </div>
  );
};