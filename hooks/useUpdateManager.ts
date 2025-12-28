
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
  const [wasUpdated, setWasUpdated] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME);
    return saved ? parseInt(saved) : Date.now();
  });

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  // TRAVA DE SEGURANÇA: Garante que o reload só ocorra se o usuário pediu
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
        
        if (data.version && typeof data.version === 'string') {
            if (compareVersions(data.version, currentAppVersion) > 0) {
              setAvailableVersion(data.version);
              setReleaseNotes(data.notes || []);
              return true;
            } 
            else if (data.version === currentAppVersion) {
               setReleaseNotes(data.notes || []);
            }
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar versão:', e);
    }
    return false;
  }, [currentAppVersion, updateLastChecked]);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
    
    if (compareVersions(currentAppVersion, lastSeen) > 0) {
        setWasUpdated(true);
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        fetchVersionJson().then(() => {
             setShowChangelog(true);
        });
    } else {
        fetchVersionJson();
    }

    if (!('serviceWorker' in navigator)) return;

    const channel = new BroadcastChannel('investfiis_sw_updates');
    
    channel.onmessage = (event) => {
        if (event.data.type === 'SW_ACTIVATED') {
            // SEGURANÇA: Só recarrega se a flag de usuário estiver true
            if (isUserInitiatedUpdate.current) {
                window.location.reload();
            } else {
                console.log("SW ativado em background, aguardando comando do usuário para reload.");
            }
        }
    };

    const handleControllerChange = () => {
        // SEGURANÇA: Só recarrega se a flag de usuário estiver true
        if (isUserInitiatedUpdate.current) {
            window.location.reload();
        }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            const now = Date.now();
            const last = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME) || '0');
            // Verifica a cada 1 hora apenas para não incomodar
            if (now - last > 60 * 60 * 1000) {
                 fetchVersionJson().then(hasNew => {
                    if (hasNew) {
                        setIsUpdateAvailable(true);
                        setShowUpdateBanner(true);
                    }
                });
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const initSW = async () => {
        const reg = await navigator.serviceWorker.ready;
        swRegistrationRef.current = reg;

        if (reg.waiting) {
            const hasNew = await fetchVersionJson();
            if (hasNew) {
                setIsUpdateAvailable(true);
                setShowUpdateBanner(true);
            }
        }

        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        fetchVersionJson().then((hasNew) => {
                            if (hasNew) {
                                setIsUpdateAvailable(true);
                                setShowUpdateBanner(true);
                            }
                        });
                    }
                });
            }
        });
        
        // REMOVIDO: update() automático de 5s. 
        // O app agora só verifica atualização quando o usuário abre o app (visibilityChange)
        // ou clica manualmente em verificar.
    };

    initSW();

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        channel.close();
    };
  }, [currentAppVersion, fetchVersionJson]);

  const manualCheck = useCallback(async () => {
     if (!navigator.onLine) return false;

     if (swRegistrationRef.current) {
         try { 
             await swRegistrationRef.current.update(); 
         } catch(e) { console.warn("Erro ao forçar update do SW:", e); }
     }
     return await fetchVersionJson();
  }, [fetchVersionJson]);

  const startUpdateProcess = useCallback(async () => {
     if (!swRegistrationRef.current) {
         window.location.reload();
         return;
     }
     
     // ATIVA A TRAVA: Usuário autorizou explicitamente
     isUserInitiatedUpdate.current = true;
     setUpdateProgress(5);
     
     const reg = swRegistrationRef.current;

     // Se não tem SW esperando, força check
     if (!reg.waiting) {
        await reg.update();
     }
     
     let p = 5;
     const timer = setInterval(() => {
        const increment = p < 70 ? (Math.random() * 10 + 5) : (Math.random() * 3 + 1);
        p = Math.min(p + increment, 99);
        setUpdateProgress(Math.floor(p));

        // Se chegou ao fim ou se já tem um worker esperando
        if (p >= 99 || reg.waiting) {
            clearInterval(timer);
            setUpdateProgress(100);
            
            setTimeout(() => {
                if (reg.waiting) {
                    // Envia sinal para o SW se destruir e assumir o controle
                    reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                } else {
                    // Fallback se não houver worker esperando mas usuário mandou atualizar
                    window.location.reload();
                }
            }, 500);
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
    wasUpdated,
    setShowUpdateBanner,
    setShowChangelog,
    checkForUpdates: manualCheck,
    startUpdateProcess,
  };
};
