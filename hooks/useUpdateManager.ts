
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReleaseNote, VersionData } from '../types';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
};

// Helper puro
const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export const useUpdateManager = (currentAppVersion: string) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  // TRAVA DE SEGURANÇA: Só permite reload se o usuário iniciou o processo
  const isUserInitiatedUpdate = useRef(false);

  // 1. Fetch de Versão
  const fetchVersionJson = useCallback(async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        if (compareVersions(data.version, currentAppVersion) > 0) {
          setAvailableVersion(data.version);
          setReleaseNotes(data.notes || []);
          return true;
        }
      }
    } catch (e) {
      console.warn('Erro versão', e);
    }
    return false;
  }, [currentAppVersion]);

  // 2. Lifecycle do SW
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // A. Changelog no Cold Start
    const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
    if (compareVersions(currentAppVersion, lastSeen) > 0) {
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        fetch(`./version.json?t=${Date.now()}`).then(r => r.json()).then(data => {
            if (data.version === currentAppVersion) {
                setReleaseNotes(data.notes || []);
                setAvailableVersion(data.version);
                setShowChangelog(true);
            }
        }).catch(() => {});
    }

    // B. Lógica de Reload BLINDADA
    const handleControllerChange = () => {
        // Se o usuário clicou em atualizar, recarrega.
        // Se o navegador atualizou sozinho em background, IGNORA o reload para não atrapalhar o uso.
        if (isUserInitiatedUpdate.current) {
            window.location.reload();
        } else {
            console.log("SW atualizado em background. Reload ignorado até ação do usuário.");
        }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // C. Monitoramento de Instalação
    navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        swRegistrationRef.current = reg;

        // Já existe um esperando?
        if (reg.waiting) {
            fetchVersionJson().then((hasNew) => {
                if (hasNew) {
                    setIsUpdateAvailable(true);
                    setShowUpdateBanner(true);
                }
            });
        }

        // Monitorar novo worker surgindo
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Novo SW pronto, mas NÃO ativamos. Apenas avisamos a UI.
                        fetchVersionJson().then(() => {
                            setIsUpdateAvailable(true);
                            setShowUpdateBanner(true);
                        });
                    }
                });
            }
        });
    });

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [currentAppVersion, fetchVersionJson]);

  // 3. Ações
  const manualCheck = useCallback(async () => {
     if (swRegistrationRef.current) {
         try { await swRegistrationRef.current.update(); } catch(e) {}
     }
     return await fetchVersionJson();
  }, [fetchVersionJson]);

  const startUpdateProcess = useCallback(() => {
     if (isUserInitiatedUpdate.current) return;
     isUserInitiatedUpdate.current = true; // Marca que o usuário autorizou
     
     setUpdateProgress(1);
     let p = 1;
     const interval = setInterval(() => {
        p += Math.max(2, Math.floor(Math.random() * 15));
        if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setUpdateProgress(100);

            setTimeout(() => {
                if (swRegistrationRef.current && swRegistrationRef.current.waiting) {
                    // Envia comando específico e seguro
                    swRegistrationRef.current.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                } else {
                    window.location.reload();
                }
            }, 500);
        } else {
            setUpdateProgress(p);
        }
     }, 40);
  }, []);

  return {
    isUpdateAvailable,
    showUpdateBanner,
    availableVersion,
    releaseNotes,
    updateProgress,
    showChangelog,
    setShowUpdateBanner,
    setShowChangelog,
    checkForUpdates: manualCheck,
    startUpdateProcess,
  };
};
