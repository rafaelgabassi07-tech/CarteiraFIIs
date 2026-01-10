import React, { useEffect } from 'react';

interface SplashScreenProps {
  finishLoading: boolean;
  realProgress: number; 
}

/**
 * SplashScreen Controller
 * 
 * Este componente NÃO renderiza nada visualmente.
 * Ele atua como um controlador lógico para o elemento #root-splash que já existe no index.html.
 * Isso evita o "flash" branco causado pela hidratação do React e garante
 * uma transição suave entre o carregamento estático e a aplicação interativa.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ finishLoading, realProgress }) => {

  // Efeito para atualizar a barra de progresso no DOM
  useEffect(() => {
    const progressBar = document.getElementById('splash-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${Math.max(10, realProgress)}%`;
    }
  }, [realProgress]);

  // Efeito para lidar com a finalização e remoção do splash
  useEffect(() => {
    if (finishLoading) {
      const splashElement = document.getElementById('root-splash');
      const progressBar = document.getElementById('splash-progress-bar');
      
      if (splashElement) {
        // 1. Completa a barra visualmente antes de sair
        if (progressBar) progressBar.style.width = '100%';

        // 2. Aguarda um momento breve para o usuário ver o 100%
        setTimeout(() => {
          // 3. Adiciona a classe que dispara a transição CSS (opacity 0, scale up)
          splashElement.classList.add('splash-exit');
          
          // 4. Sinaliza para o CSS do body que o app foi revelado (para animações de entrada do conteúdo)
          document.body.classList.add('app-revealed');
          document.body.style.overflow = ''; // Libera o scroll

          // 5. Remove o elemento do DOM após a animação CSS terminar (600ms definido no CSS)
          setTimeout(() => {
            if (splashElement.parentNode) {
              splashElement.parentNode.removeChild(splashElement);
            }
          }, 600);
        }, 500);
      }
    } else {
        // Garante scroll travado enquanto carrega
        document.body.style.overflow = 'hidden';
    }
  }, [finishLoading]);

  // Não renderizamos nada via React. O HTML estático cuida do visual.
  return null;
};