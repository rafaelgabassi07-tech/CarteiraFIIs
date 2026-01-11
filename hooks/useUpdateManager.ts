
import { useState, useEffect, useCallback } from 'react';
import { ReleaseNote, VersionData } from '../types';

export const useUpdateManager = (currentAppVersion: string) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [currentVersionDate, setCurrentVersionDate] = useState<string | null>(null);

  // Compara versões semânticas (ex: 8.2.3 vs 8.2.4)
  const isNewerVersion = (newVer: string, currentVer: string) => {
    const n = newVer.split('.').map(Number);
    const c = currentVer.split('.').map(Number);
    for (let i = 0; i < Math.max(n.length, c.length); i++) {
      if ((n[i] || 0) > (c[i] || 0)) return true;
      if ((n[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  };

  // Verifica metadados no version.json
  const checkVersionMetadata = useCallback(async () => {
    try {
      // Adiciona timestamp para evitar cache do browser no arquivo JSON
      const response = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return false;
      
      const data: VersionData = await response.json();
      
      if (data.version && isNewerVersion(data.version, currentAppVersion)) {
        setAvailableVersion(data.version);
        setReleaseNotes(data.notes || []);
        if (data.date) setCurrentVersionDate(data.date);
        setIsUpdateAvailable(true);
        return true;
      }
    } catch (error) {
      console.warn('Erro ao verificar version.json:', error);
    }
    return false;
  }, [currentAppVersion]);

  // Função manual de verificação (chamada pelo botão)
  const checkForUpdates = useCallback(async () => {
    // 1. Verifica metadados remotos
    const hasJsonUpdate = await checkVersionMetadata();

    // 2. Verifica se o Service Worker tem algo novo
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update(); // Força check de byte-to-byte no sw.js
      } catch (e) {
        console.error('Erro ao atualizar SW:', e);
      }
    }

    return hasJsonUpdate;
  }, [checkVersionMetadata]);

  // Inicia o processo de atualização (Instalar e Recarregar)
  const startUpdateProcess = useCallback(async () => {
    setIsUpdating(true);
    setUpdateProgress(10);

    // Timeout de segurança: se o SW falhar em responder, recarrega forçado em 4s
    const safetyTimer = setTimeout(() => {
        window.location.reload();
    }, 4000);

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      
      if (reg) {
        // Se já existe um worker aguardando (Waiting), ativa-o imediatamente
        if (reg.waiting) {
            setUpdateProgress(50);
            reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
            return;
        }

        // Se não tem worker aguardando, forçamos um update e esperamos
        setUpdateProgress(30);
        await reg.update();
        
        // Verifica novamente após o update manual
        if (reg.waiting) {
             setUpdateProgress(70);
             // @ts-ignore
             reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
             return;
        }
      }
    }

    // Fallback: se não houver SW ou algo falhar, recarrega a página
    setUpdateProgress(100);
    clearTimeout(safetyTimer);
    window.location.reload();
  }, []);

  // Monitoramento do ciclo de vida do Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Ao montar, verifica se já existe um worker esperando (atualização em background)
      navigator.serviceWorker.getRegistration().then(reg => {
          if (reg?.waiting) {
              setIsUpdateAvailable(true);
              checkVersionMetadata();
          }
      });

      // Escuta por novos workers sendo instalados
      navigator.serviceWorker.addEventListener('updatefound', () => {
         // Se detectarmos updatefound globalmente (menos preciso que via registration, mas útil)
         // A lógica principal fica no registration.onupdatefound se tivéssemos acesso fácil aqui,
         // mas o checkVersionMetadata e o polling costumam cobrir.
      });

      // O evento 'controllerchange' ocorre quando o novo SW assume o controle.
      // É o sinal final para recarregar a página e mostrar o novo app.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
              refreshing = true;
              window.location.reload();
          }
      });
    }

    // Verifica versão ao iniciar o hook
    checkVersionMetadata();
  }, [checkVersionMetadata]);

  return {
    isUpdateAvailable,
    availableVersion,
    releaseNotes,
    showChangelog,
    setShowChangelog,
    checkForUpdates,
    startUpdateProcess,
    isUpdating,
    updateProgress,
    currentVersionDate
  };
};
