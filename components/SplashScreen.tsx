
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
      const htmlSplash = document.getElementById('root-splash');
      if (htmlSplash) {
        const htmlProgress = document.getElementById('splash-progress-bar');
        const htmlStatus = document.getElementById('splash-status-text');
        if (htmlProgress) htmlProgress.style.width = '100%';
        if (htmlStatus) htmlStatus.innerText = "Pronto!";
        htmlSplash.classList.add('splash-exit');
      }

      setIsExiting(true);

      const timer = setTimeout(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('app-revealed');
        
        if (htmlSplash && htmlSplash.parentNode) {
            htmlSplash.parentNode.removeChild(htmlSplash);
        }
        
        setShouldRender(false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [finishLoading]);

  if (!shouldRender) return null;

  return (
    <div 
        className={`fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-primary-light dark:bg-primary-dark transition-opacity duration-500 ease-out-soft ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ perspective: '1000px' }}
    >
        <div className="flex flex-col items-center w-full animate-[float_6s_ease-in-out_infinite]">
            {/* BRAND CONTAINER 3D */}
            <div className="flex items-center justify-center gap-2 mb-16 relative select-none transform-style-3d">
                <div className="w-[84px] h-[84px] flex items-center justify-center relative z-10 drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)]">
                   <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJsb2dvX2dyYWQiIHgxPSIxMjgiIHkxPSI0MCIgeDI9IjM4NCIgeTI9IjQ3MiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxMGI5ODEiLz48c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iIzBlYTVlOSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzRmNDZlNSIvPjwvbGluZWFyR3JhZGllbnQ+PGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIxMiIgcmVzdWx0PSJibHVyIi8+PGZlQ29tcG9zaXRlIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9ImJsdXIiIG9wZXJhdG9yPSJvdmVyIi8+PC9maWx0ZXI+PGZpbHRlciBpZD0iZHJvcFNoYWRvdyIgeD0iMCIgeT0iMCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MzAiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGZlRHJvcFNoYWRvdyBkeD0iMCIgZHk9IjgiIHN0ZERldmlhdGlvbj0iMTIiIGZsb29kLWNvbG9yPSIjMGVhNWU5IiBmbG9vZC1vcGFjaXR5PSIwLjI1Ii8+PC9maWx0ZXI+PC9kZWZzPjxnIGZpbHRlcj0idXJsKCNkcm9wU2hhZG93KSI+PHBhdGggZD0iTTI1NiA2NEw0NjQgMjcySDM4NEwyNTYgMTQ0TDEyOCAyNzJINDhMMjU2IDY0WiIgZmlsbD0idXJsKCNsb2dvX2dyYWQpIi8+PHBhdGggZD0iTTE3NiAyOTZMMjU2IDI0OEwzMzYgMjk2VjMxMkgxNzZWMjk2WiIgZmlsbD0idXJsKCNsb2dvX2dyYWQpIi8+PHJlY3QgeD0iMTg0IiB5PSIzMjgiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxMDQiIHJ4PSI2IiBmaWxsPSJ1cmwoI2xvZ29fZ3JhZCkiLz48cmVjdCB4PSIyNDAiIHk9IjMyOCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjEwNCIgcng9IjYiIGZpbGw9InVybCgjsb2dvX2dyYWQpIi8+PHJlY3QgeD0iMjk2IiB5PSIzMjgiIHdpZHRoPSIzMiIgaGVpZ2h0PSIxMDQiIHJ4PSI2IiBmaWxsPSJ1cmwoI2xvZ29fZ3JhZCkiLz48cGF0aCBkPSJNMTYwIDQ0OEgzNTJDMzU2LjQxOCA0NDggMzYwIDQ1MS41ODIgMzYwIDQ1NlY0NzJGMTUyVjQ1NkMxNTIgNDUxLjU4MiAxNTUuNTgyIDQ0OCAxNjAgNDQ4WiIgZmlsbD0idXJsKCNsb2dvX2dyYWQpIi8+PC9nPjwvc3ZnPg==" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display text-[56px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-zinc-700 via-zinc-500 to-zinc-800 dark:from-white dark:via-zinc-200 dark:to-zinc-400 mt-2 -ml-1 drop-shadow-sm">
                    NVEST
                </span>
            </div>
            
            <div id="react-splash-status" className="font-display text-[11px] font-bold text-accent uppercase tracking-[0.2em] mb-4">
                Iniciando...
            </div>
            <div className="w-[160px] h-[4px] bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div id="react-splash-progress" className="h-full bg-gradient-to-r from-emerald-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-300 ease-out w-0 shadow-[0_0_12px_rgba(14,165,233,0.5)]"></div>
            </div>
        </div>
    </div>
  );
};
