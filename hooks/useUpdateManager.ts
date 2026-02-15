
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

  const isNewerVersion = (newVer: string, currentVer: string) => {
    const n = newVer.split('.').map(Number);
    const c = currentVer.split('.').map(Number);
    for (let i = 0; i < Math.max(n.length, c.length); i++) {
      if ((n[i] || 0) > (c[i] || 0)) return true;
      if ((n[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  };

  const checkVersionMetadata = useCallback(async () => {
    try {
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

  const checkForUpdates = useCallback(async () => {
    const hasJsonUpdate = await checkVersionMetadata();
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      } catch (e) {
        console.warn('Erro ao atualizar SW (pode ser restrição de ambiente):', e);
      }
    }
    return hasJsonUpdate;
  }, [checkVersionMetadata]);

  // Estratégia de Atualização "Nuclear" (Limpa tudo para garantir funcionamento)
  const startUpdateProcess = useCallback(async () => {
    setIsUpdating(true);
    setUpdateProgress(10);

    const forceCleanReload = async () => {
        setUpdateProgress(90);
        
        // 1. Remove Service Workers
        if ('serviceWorker' in navigator) {
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) {
                    await reg.unregister();
                }
            } catch (e) { console.warn('Falha ao remover SWs:', e); }
        }
        
        // 2. Limpa Caches de Arquivos (Não localStorage)
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            } catch (e) { console.warn('Falha ao limpar caches:', e); }
        }

        // 3. Reload Forçado
        window.location.reload();
    };

    // Tenta atualização suave primeiro
    if ('serviceWorker' in navigator) {
      try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            if (reg.waiting) {
                setUpdateProgress(50);
                reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                return;
            }
            setUpdateProgress(30);
            try {
                await reg.update();
            } catch {}
          }
      } catch (e) {
          console.warn('Falha ao obter registro SW:', e);
      }
    }

    // Se não funcionar em 2s, detona tudo
    setTimeout(forceCleanReload, 2000);

  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      try {
          navigator.serviceWorker.getRegistration().then(reg => {
              if (reg?.waiting) {
                  setIsUpdateAvailable(true);
                  checkVersionMetadata();
              }
          }).catch(err => {
              console.warn("SW getRegistration failed:", err);
          });

          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
              if (!refreshing) {
                  refreshing = true;
                  window.location.reload();
              }
          });
      } catch (e) {
          console.warn("Service Worker not supported or restricted:", e);
      }
    }
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
