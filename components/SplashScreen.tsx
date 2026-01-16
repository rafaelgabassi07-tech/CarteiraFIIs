
import React, { useEffect } from 'react';

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

  useEffect(() => {
    const progressBar = document.getElementById('splash-progress-bar');
    const statusText = document.getElementById('splash-status-text');
    
    if (progressBar) {
      progressBar.style.width = `${Math.max(10, realProgress)}%`;
    }

    if (statusText) {
      const textIndex = Math.min(
        Math.floor((realProgress / 100) * STATUS_TEXTS.length),
        STATUS_TEXTS.length - 1
      );
      statusText.innerText = STATUS_TEXTS[textIndex];
    }
  }, [realProgress]);

  useEffect(() => {
    if (finishLoading) {
      const splashElement = document.getElementById('root-splash');
      const progressBar = document.getElementById('splash-progress-bar');
      const statusText = document.getElementById('splash-status-text');
      
      if (splashElement && !splashElement.classList.contains('splash-exit')) {
        if (progressBar) progressBar.style.width = '100%';
        if (statusText) statusText.innerText = "Pronto!";

        // Pequeno delay para usuário ver o 100%
        setTimeout(() => {
          splashElement.classList.add('splash-exit');
          
          document.body.classList.remove('is-loading');
          document.body.classList.add('app-revealed');
          
          // Remove do DOM após a transição CSS (0.6s)
          setTimeout(() => {
            if (splashElement.parentNode) {
              splashElement.parentNode.removeChild(splashElement);
            }
          }, 800);
        }, 400);
      }
    }
  }, [finishLoading]);

  return null;
};
