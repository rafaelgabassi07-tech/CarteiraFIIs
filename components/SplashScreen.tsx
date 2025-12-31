import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; // Nova prop para progresso real
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [loadingText, setLoadingText] = useState('Iniciando...');
  
  // O progresso visual agora segue o progresso real, mas com uma transição suave via CSS
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Atualiza o progresso visual baseado no real, garantindo que não retroceda
    setDisplayProgress(prev => Math.max(prev, realProgress));
  }, [realProgress]);

  useEffect(() => {
    // Textos dinâmicos baseados na porcentagem real aproximada
    if (realProgress < 20) setLoadingText('Autenticando...');
    else if (realProgress < 40) setLoadingText('Buscando carteira...');
    else if (realProgress < 70) setLoadingText('Atualizando cotações (BRAPI)...');
    else if (realProgress < 90) setLoadingText('Processando Inteligência (Gemini)...');
    else setLoadingText('Finalizando...');
  }, [realProgress]);

  useEffect(() => {
    if (finishLoading) {
      setDisplayProgress(100);
      setLoadingText('Pronto');
      
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimeout = setTimeout(() => {
          setShouldRender(false);
        }, 600); // Tempo da animação de saída
        return () => clearTimeout(removeTimeout);
      }, 300); // Pequeno delay para ver o 100%
      return () => clearTimeout(timeout);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ease-out-quint ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
      
      <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '5s' }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
            <Wallet className="w-10 h-10 text-white" strokeWidth={1.5} />
            <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center border-4 border-[#020617] shadow-lg">
               <TrendingUp className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">InvestFIIs</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-12">Wealth Intelligence</p>

        {/* Loading Bar & Text */}
        <div className="w-64 space-y-3">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300 ease-out relative"
                    style={{ width: `${displayProgress}%` }}
                >
                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium font-mono h-4">
                <span className="text-slate-400 animate-pulse">{loadingText}</span>
                <span className="text-emerald-500 tabular-nums">{Math.round(displayProgress)}%</span>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-10 flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-60">
        <ShieldCheck className="w-3 h-3" />
        <span>Secure Environment</span>
      </div>
    </div>
  );
};