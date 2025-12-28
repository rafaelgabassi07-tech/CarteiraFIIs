
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReleaseNote, VersionData } from '../types';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
  LAST_CHECK_TIME: 'investfiis_last_check_time'
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
  const [lastChecked, setLastChecked] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME);
    return saved ? parseInt(saved) : Date.now();
  });

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const isUserInitiatedUpdate = useRef(false);

  const updateLastChecked = useCallback(() => {
    const now = Date.now();
    setLastChecked(now);
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, now.toString());
  }, []);

  const fetchVersionJson = useCallback(async () => {
    if (!navigator.onLine) return false;

    try {
      const res = await fetch(`./version.json?t=${Date.now()}&r=${Math.random()}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } 
      });
      
      if (res.ok) {
        const data: VersionData = await res.json();
        updateLastChecked();
        
        if (compareVersions(data.version, currentAppVersion) > 0) {
          setAvailableVersion(data.version);
          setReleaseNotes(data.notes || []);
          return true;
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar versão:', e);
    }
    return false;
  }, [currentAppVersion, updateLastChecked]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // 1. Cold Start
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

    // 2. Reload Trigger
    const handleControllerChange = () => {
        if (isUserInitiatedUpdate.current) {
            console.log("🔄 SW Ativado via usuário. Recarregando...");
            window.location.reload();
        } else {
            // Se o controlador mudou sem o usuário pedir (raro agora com a correção), 
            // podemos optar por recarregar ou apenas avisar.
            // Para segurança, vamos logar.
            console.log("🔄 SW Atualizado em background.");
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const initSW = async () => {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) reg = await navigator.serviceWorker.ready;
        
        if (reg) {
            swRegistrationRef.current = reg;

            // A. Já existe um worker esperando (download concluído anteriormente)
            if (reg.waiting) {
                console.log("⚠️ SW Waiting detectado no início");
                const hasNew = await fetchVersionJson();
                if (hasNew) {
                    setIsUpdateAvailable(true);
                    setShowUpdateBanner(true);
                }
            }

            // B. Monitorar novas instalações
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        // O estado 'installed' significa que o SW terminou de baixar
                        // e agora está esperando (waiting) para ser ativado.
                        // É AQUI que devemos avisar o usuário.
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log("✅ Nova atualização baixada e pronta (waiting)");
                            fetchVersionJson().then(() => {
                                setIsUpdateAvailable(true);
                                setShowUpdateBanner(true);
                            });
                        }
                    });
                }
            });
            
            // Tenta buscar update silenciosamente ao iniciar
            reg.update().catch(() => {});
        }
    };

    initSW();

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [currentAppVersion, fetchVersionJson]);

  const manualCheck = useCallback(async () => {
     if (!navigator.onLine) return false;

     if (swRegistrationRef.current) {
         try { 
             await swRegistrationRef.current.update(); 
         } catch(e) { console.warn(e); }
     }
     return await fetchVersionJson();
  }, [fetchVersionJson]);

  const startUpdateProcess = useCallback(async () => {
     if (isUserInitiatedUpdate.current) return;
     isUserInitiatedUpdate.current = true;
     
     setUpdateProgress(5);
     
     let reg = swRegistrationRef.current;
     if (!reg) {
         const found = await navigator.serviceWorker.getRegistration();
         reg = found || null;
     }

     let p = 5;
     const timer = setInterval(() => {
        p += Math.floor(Math.random() * 15) + 5;
        if (p >= 100) {
            p = 100;
            clearInterval(timer);
            setUpdateProgress(100);

            // ENVIA COMANDO PARA O WORKER
            if (reg && reg.waiting) {
                console.log("🚀 Enviando comando SKIP_WAITING");
                reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
            } else {
                 // Fallback raro se não achar o worker waiting
                 console.warn("Worker waiting não encontrado, forçando reload");
                 window.location.reload();
            }

            // Fallback de segurança
            setTimeout(() => {
                window.location.reload();
            }, 2000);

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
    lastChecked,
    setShowUpdateBanner,
    setShowChangelog,
    checkForUpdates: manualCheck,
    startUpdateProcess,
  };
};
