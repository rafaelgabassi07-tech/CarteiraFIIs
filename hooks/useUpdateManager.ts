
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
                setIsUpdateAvailable(true);
            }

            // Ouve por novas atualizações
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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
         // 1. Verifica SW (Força update no browser)
         if ('serviceWorker' in navigator) {
           const reg = await navigator.serviceWorker.getRegistration();
           if (reg) {
             await reg.update(); 
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
  
  const startUpdateProcess = useCallback(async () => {
    setIsUpdating(true);
    setUpdateProgress(10);

    // Safety timeout: se nada acontecer em 5s, recarrega forçado
    const safetyTimeout = setTimeout(() => {
        console.warn("Update timeout. Forcing reload.");
        window.location.reload();
    }, 5000);

    try {
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            
            if (reg) {
                // Caso 1: Já temos um worker esperando (Ideal)
                if (reg.waiting) {
                    setUpdateProgress(50);
                    reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                    return; // O reload acontece via controllerchange
                }

                // Caso 2: Não tem waiting, mas o JSON diz que tem update.
                // Forçamos o browser a checar novamente.
                setUpdateProgress(30);
                await reg.update();

                // Checa novamente após update explícito
                if (reg.waiting) {
                    setUpdateProgress(60);
                    // TS FIX: Cast explícito para ServiceWorker pois o TS estreita o tipo para 'never' ou 'null' devido ao 'if' anterior
                    (reg.waiting as ServiceWorker).postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                    return;
                }

                // Caso 3: Browser ainda não achou update ou algo travou.
                // Desregistramos o SW para garantir que o próximo load venha da rede (fresh).
                setUpdateProgress(80);
                await reg.unregister();
                console.log("SW Unregistered to force update apply.");
            }
        }
        
        // Finalização: Recarrega a página.
        // Se o SW foi desregistrado, o browser vai buscar tudo novo.
        setUpdateProgress(100);
        window.location.reload();

    } catch (e) {
        console.error("Critical update error:", e);
        window.location.reload();
    }
  }, []);

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
