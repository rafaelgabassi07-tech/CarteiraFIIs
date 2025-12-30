import { useState, useEffect, useCallback } from 'react';
import { ReleaseNote, VersionData } from '../types';

const isNewerVersion = (newVersion: string, oldVersion: string) => {
  const newParts = newVersion.split('.').map(Number);
  const oldParts = oldVersion.split('.').map(Number);
  for (let i = 0; i < newParts.length; i++) {
    const newPart = newParts[i];
    const oldPart = oldParts[i] || 0;
    if (newPart > oldPart) {
      return true;
    }
    if (newPart < oldPart) {
      return false;
    }
  }
  return false;
};

export const useUpdateManager = (currentAppVersion: string) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [wasUpdated, setWasUpdated] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const fetchVersionMetadata = useCallback(async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        setReleaseNotes(data.notes || []);
        if (isNewerVersion(data.version, currentAppVersion)) {
            setAvailableVersion(data.version);
            return data;
        }
      }
    } catch (error) {
      console.warn('Falha ao buscar metadados da versão:', error);
    }
    return null;
  }, [currentAppVersion]);

  // Effect for SW registration and update listening
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const onUpdate = (registration: ServiceWorkerRegistration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          fetchVersionMetadata().then(() => {
            setIsUpdateAvailable(true);
          });
        }
      };

      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          reg.update();
          
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  onUpdate(reg);
                }
              });
            }
          });
        })
        .catch(error => console.error('Service Worker registration failed:', error));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }
  }, [fetchVersionMetadata]);

  // Effect for checking if the app was just updated on load
  useEffect(() => {
    const lastVersion = localStorage.getItem('investfiis_version');
    if (lastVersion && isNewerVersion(currentAppVersion, lastVersion)) {
      setWasUpdated(true);
      fetchVersionMetadata().then((meta) => {
        setReleaseNotes(meta?.notes || []);
        setShowChangelog(true);
      });
    }
    localStorage.setItem('investfiis_version', currentAppVersion);
  }, [currentAppVersion, fetchVersionMetadata]);

  const checkForUpdates = useCallback(async () => {
     setLastChecked(Date.now());
     if ('serviceWorker' in navigator) {
       const reg = await navigator.serviceWorker.getRegistration();
       if (reg) {
         await reg.update();
         if (reg.waiting) {
             setIsUpdateAvailable(true);
             setWaitingWorker(reg.waiting);
             return true;
         }
       }
     }
     const meta = await fetchVersionMetadata();
     const hasUpdate = !!meta && isNewerVersion(meta.version, currentAppVersion);
     if (hasUpdate) {
         setIsUpdateAvailable(true);
     }
     return hasUpdate;
  }, [currentAppVersion, fetchVersionMetadata]);
  
  const startUpdateProcess = useCallback(() => {
    setIsUpdating(true);
    setUpdateProgress(30);

    if (waitingWorker) {
      setUpdateProgress(70);
      waitingWorker.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
    } else {
      setUpdateProgress(100);
      window.location.reload();
    }
  }, [waitingWorker]);

  return {
    isUpdateAvailable,
    availableVersion,
    releaseNotes,
    showChangelog,
    setShowChangelog,
    wasUpdated,
    lastChecked,
    checkForUpdates,
    startUpdateProcess,
    isUpdating,
    updateProgress,
  };
};