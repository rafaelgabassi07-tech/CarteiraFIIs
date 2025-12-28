
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReleaseNote, VersionData } from '../types';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
};

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
  const isUserInitiatedUpdate = useRef(false);

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

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // 1. Cold Start: Mostrar notas se acabou de atualizar
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

    // 2. Listener de Mudança de Controlador (O Reload Real)
    const handleControllerChange = () => {
        if (isUserInitiatedUpdate.current) {
            console.log("🔄 SW Ativado. Recarregando...");
            window.location.reload();
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 3. Registrar e Monitorar SW
    navigator.serviceWorker.ready.then(reg => {
        swRegistrationRef.current = reg;
    });

    navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        swRegistrationRef.current = reg;

        // Se já tem um worker esperando, avisa o usuário
        if (reg.waiting) {
            fetchVersionJson().then((hasNew) => {
                if (hasNew) {
                    setIsUpdateAvailable(true);
                    setShowUpdateBanner(true);
                }
            });
        }

        // Monitora novas instalações
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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

  const manualCheck = useCallback(async () => {
     // Atualiza o SW no servidor
     if (swRegistrationRef.current) {
         try { 
             await swRegistrationRef.current.update(); 
         } catch(e) {
             console.warn("Falha ao atualizar SW manualmente", e);
         }
     }
     return await fetchVersionJson();
  }, [fetchVersionJson]);

  const startUpdateProcess = useCallback(async () => {
     if (isUserInitiatedUpdate.current) return;
     isUserInitiatedUpdate.current = true;
     
     setUpdateProgress(5);
     
     // 1. Garante que temos a referência mais atual
     let reg = swRegistrationRef.current;
     if (!reg) {
         reg = await navigator.serviceWorker.getRegistration();
     }

     // 2. Inicia Animação de Progresso
     let p = 5;
     const timer = setInterval(() => {
        p += Math.floor(Math.random() * 15) + 5;
        if (p >= 100) {
            p = 100;
            clearInterval(timer);
            setUpdateProgress(100);

            // 3. APLICAÇÃO DA ATUALIZAÇÃO
            // Envia mensagem para o worker esperando
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
            }
            
            // Tenta enviar para o installing também, caso tenha mudado de estado rápido
            if (reg && reg.installing) {
                reg.installing.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
            }

            // 4. FALLBACK DE SEGURANÇA (Reload Forçado)
            // Se o controllerchange não disparar em 1s, forçamos o reload
            // Isso evita que o app fique travado em 100%
            setTimeout(() => {
                console.warn("⚠️ Fallback de reload ativado");
                window.location.reload();
            }, 1000);

        } else {
            setUpdateProgress(p);
        }
     }, 100); 
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
