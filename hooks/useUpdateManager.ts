
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
  const [currentVersionDate, setCurrentVersionDate] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [wasUpdated, setWasUpdated] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(Date.now());
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const fetchVersionMetadata = useCallback(async () => {
    try {
      // Adiciona timestamp para evitar cache agressivo do JSON de versão
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        setReleaseNotes(data.notes || []);
        if (data.date) setCurrentVersionDate(data.date);
        
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

  // Gerenciamento do Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const setupUpdateListener = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Se já existe um worker esperando quando o app carrega
            if (registration.waiting) {
                setWaitingWorker(registration.waiting);
                setIsUpdateAvailable(true);
            }

            // Ouve por novas atualizações
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setWaitingWorker(newWorker);
                    setIsUpdateAvailable(true);
                  }
                });
              }
            });
        } catch (e) {
            console.error("Erro ao configurar listener do SW:", e);
        }
      };

      setupUpdateListener();

      // Recarrega a página quando o novo SW assume o controle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
    
    fetchVersionMetadata();
  }, [fetchVersionMetadata]);

  // Verifica se o app acabou de ser atualizado
  useEffect(() => {
    const lastVersion = localStorage.getItem('investfiis_version');
    if (lastVersion && isNewerVersion(currentAppVersion, lastVersion)) {
      setWasUpdated(true);
      fetchVersionMetadata().then((meta) => {
        setReleaseNotes(meta?.notes || []);
        setShowChangelog(true);
      });
    }
    // Sempre atualiza a versão no storage
    localStorage.setItem('investfiis_version', currentAppVersion);
  }, [currentAppVersion, fetchVersionMetadata]);

  const checkForUpdates = useCallback(async () => {
     setLastChecked(Date.now());
     setUpdateError(null);
     
     try {
         // 1. Verifica SW
         if ('serviceWorker' in navigator) {
           const reg = await navigator.serviceWorker.getRegistration();
           if (reg) {
             await reg.update(); // Força a verificação no browser
           }
         }
         
         // 2. Verifica Metadados (JSON)
         const meta = await fetchVersionMetadata();
         const hasUpdate = !!meta && isNewerVersion(meta.version, currentAppVersion);
         
         if (hasUpdate) {
             setIsUpdateAvailable(true);
         }
         return hasUpdate;
         
     } catch (e: any) {
        console.error("Erro ao verificar atualizações:", e);
        setUpdateError("Não foi possível verificar.");
        return false;
     }
  }, [currentAppVersion, fetchVersionMetadata]);
  
  const startUpdateProcess = useCallback(() => {
    setIsUpdating(true);
    setUpdateProgress(10);

    // Fallback de segurança: Se o SW não recarregar em 4 segundos, forçamos o reload.
    // Isso evita que o app fique travado na tela de "Atualizando...".
    const safetyTimeout = setTimeout(() => {
        console.warn("Update timeout reached. Forcing reload.");
        window.location.reload();
    }, 4000);

    try {
        if (waitingWorker) {
          setUpdateProgress(50);
          waitingWorker.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
        } else if ('serviceWorker' in navigator) {
           // Tenta forçar via registration se waitingWorker se perdeu
           navigator.serviceWorker.getRegistration().then(reg => {
               if (reg && reg.waiting) {
                   reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
               } else {
                   // Se não achou worker, reload direto
                   setUpdateProgress(100);
                   window.location.reload();
               }
           });
        } else {
          // Fallback para ambientes sem SW
          setUpdateProgress(100);
          window.location.reload();
        }
    } catch (e) {
        console.error("Critical update error:", e);
        window.location.reload(); // Último recurso
    }
    
    // O reload deve acontecer via 'controllerchange' ou pelo safetyTimeout
  }, [waitingWorker]);

  return {
    isUpdateAvailable,
    availableVersion,
    currentVersionDate,
    releaseNotes,
    showChangelog,
    setShowChangelog,
    wasUpdated,
    lastChecked,
    checkForUpdates,
    startUpdateProcess,
    isUpdating,
    updateProgress,
    updateError
  };
};
