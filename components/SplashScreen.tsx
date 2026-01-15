
import React, { useEffect } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

const STATUS_TEXTS = [
  "Iniciando...",
  "Conectando ao banco...",
  "Sincronizando carteira...",
  "Verificando cotações...",
  "Analisando fundamentos...",
  "Preparando dashboard...",
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
      
      if (splashElement) {
        if (progressBar) progressBar.style.width = '100%';
        if (statusText) statusText.innerText = "Tudo pronto!";

        setTimeout(() => {
          splashElement.classList.add('splash-exit');
          
          // LIBERA O SCROLL DEFINITIVAMENTE
          document.body.classList.remove('is-loading');
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.classList.add('app-revealed');
          
          setTimeout(() => {
            if (splashElement.parentNode) {
              splashElement.parentNode.removeChild(splashElement);
            }
          }, 800);
        }, 500);
      }
    }
  }, [finishLoading]);

  return null;
};
