
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
        console.error('Erro ao atualizar SW:', e);
      }
    }
    return hasJsonUpdate;
  }, [checkVersionMetadata]);

  // Estratégia de Atualização Robusta
  const startUpdateProcess = useCallback(async () => {
    setIsUpdating(true);
    setUpdateProgress(10);

    // Função para forçar limpeza total (Nuclear Option)
    const forceCleanReload = async () => {
        setUpdateProgress(90);
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister(); // Remove o SW antigo
            }
        }
        // Limpa caches de armazenamento
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
        window.location.reload();
    };

    // Timeout de segurança: Se o SW não responder em 3s, força limpeza total
    const safetyTimer = setTimeout(() => {
        console.warn("Update timeout triggered. Forcing clean reload.");
        forceCleanReload();
    }, 3000);

    if ('serviceWorker' in navigator) {
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
        } catch (e) {
            console.error("SW Update failed", e);
            clearTimeout(safetyTimer);
            forceCleanReload();
            return;
        }
        
        if (reg.waiting) {
             setUpdateProgress(70);
             // @ts-ignore
             reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
             return;
        }
      }
    }

    // Se chegou aqui e não tem SW ou não achou update, força reload normal
    setUpdateProgress(100);
    clearTimeout(safetyTimer);
    window.location.reload();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
          if (reg?.waiting) {
              setIsUpdateAvailable(true);
              checkVersionMetadata();
          }
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
              refreshing = true;
              window.location.reload();
          }
      });
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
