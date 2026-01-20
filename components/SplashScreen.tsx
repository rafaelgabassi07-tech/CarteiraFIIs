
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
                   <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkX21haW4iIHgxPSIyNTYiIHkxPSI0MCIgeDI9PSIyNTYiIHkyPSI0NzIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzRkMzk5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGVhNWU5Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRfc2hhZG93IiB4MT0iMjU2IiB5MT0iMjAwIiB4Mj0iMjU2IiB5Mj0iNDcyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzBlYTVlOSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzRmNDZlNSIvPjwvbGluZWFyR3JhZGllbnQ+PGZpbHRlciBpZD0iZHJvcFNoYWRvdyIgeD0iLTUwJSIgeT0iLTUwJSIgd2lkdGg9IjIwMCUiIGhlaWdodD0iMjAwJSI+PGZlR2F1c3NpYW5CbHVyIGluPSJTb3VyY2VBbHBoYSIgc3RkRGV2aWF0aW9uPSIxNiIvPjxmZU9mZnNldCBkeD0iMCIgZHk9IjI0IiByZXN1bHQ9Im9mZnNldGJsdXIiLz48ZmVGbG9vZCBmbG9vZC1jb2xvcj0iIzBlYTVlOSIgZmxvb2Qtb3BhY2l0eT0iMC4yNSIvPjxmZUNvbXBvc2l0ZSBpbjI9Im9mZnNldGJsdXIiIG9wZXJhdG9yPSJpbiIvPjxmZU1lcmdlPjxmZU1lcmdlTm9kZS8+PGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIi8+PC9mZU1lcmdlPjwvZmlsdGVyPjwvZGVmcz48ZyBmaWx0ZXI9InVybCgjZHJvcFNoYWRvdykiPjxwYXRoIGQ9Ik0yNTYgNjQgTDQ2NCAyNTYgSDM4NCBMMjU2IDEyOCBMMTI4IDI1NiBیندgTDI1NiA2NCBaIiBmaWxsPSJ1cmwoI2dyYWRfbWFpbikiLz48cGF0aCBkPSJNMTEyIDI4OCBindeEwgiVjMyMCBIMTEyIFYyODggWiIgZmlsbD0idXJsKCNncmFkX3NoYWRvdykiIGZpbGwtb3BhY2l0eT0iMC44Ii8+PHJlY3QgeD0iMTI4IiB5PSIzMzYiIHdpZHRoPSI0OCIgaGVpZ2h0PSI5NiIgcng9IjQiIGZpbGw9InVybCgjZ3JhZF9tYWluKSIvPjxyZWN0IHg9IjIzMiIgeT0iMzM2IiB3aWR0aD0iNDgiIGhlaWdodD0iOTYiIHJ4PSI0IiBmaWxsPSJ1cmwoI2dyYWRfbWFpbikiLz48cmVjdCB4PSIzMzYiIHk9IjMzNiIgd2lkdGg9IjQ4IiBoZWlnaHQ9Ijk2IiByeD0iNCIgZmlsbD0idXJsKCNncmFkX3tYWluKSIvPjxwYXRoIGQ9Ik05NiA0NDggSDQxNiBDNDI0LjggNDQ4IDQzMiA0NTUuMiA0MzIgNDY0IFY0ODAgSDgwIFY0NjQgQzgwIDQ1NS4yIDg3LjIgNDQ4IDk2IDQ0OCBaIiBmaWxsPSJ1cmwoI2dyYWRfc2hhZG93KSIvPjxwYXRoIGQ9Ik0yNTYgNjQgTDE2MCAxNjAgTDI1NiAyNTYgTDM1MiAxNjAgTDI1NiA2NCBaIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L2c+PC9zdmc+" alt="Logo" className="s-logo-img" />
                </div>
                <span className="s-brand-text">NVEST</span>
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
