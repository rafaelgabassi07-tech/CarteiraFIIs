
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
        
        // CORREÇÃO: Carrega as notas sempre, permitindo ver o changelog da versão atual
        if (data.notes && Array.isArray(data.notes)) {
            setReleaseNotes(data.notes);
        }

        if (compareVersions(data.version, currentAppVersion) > 0) {
          setAvailableVersion(data.version);
          return true;
        } else {
          // Garante que a versão disponível seja setada mesmo que seja igual a atual
          setAvailableVersion(data.version);
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
    } else {
        // Tenta buscar as notas silenciosamente ao iniciar para popular a tela de settings
        fetch(`./version.json?t=${Date.now()}`).then(r => r.json()).then(data => {
            if (data.notes) setReleaseNotes(data.notes);
            setAvailableVersion(data.version);
        }).catch(() => {});
    }

    // 2. Reload Trigger
    const handleControllerChange = () => {
        if (isUserInitiatedUpdate.current) {
            console.log("🔄 SW Ativado via usuário. Recarregando...");
            window.location.reload();
        } else {
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
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log("✅ Nova atualização baixada e pronta (waiting)");
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
     
     const reg = swRegistrationRef.current;

     let p = 5;
     const timer = setInterval(() => {
        const increment = p < 70 ? (Math.random() * 10 + 5) : (Math.random() * 3 + 1);
        p = Math.min(p + increment, 99);
        setUpdateProgress(Math.floor(p));

        if (p >= 99) {
            clearInterval(timer);
            setTimeout(() => {
                setUpdateProgress(100);

                if (reg && reg.waiting) {
                    console.log("🚀 Enviando comando SKIP_WAITING");
                    reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                } else {
                     console.warn("Worker waiting não encontrado, forçando reload");
                     setTimeout(() => window.location.reload(), 500);
                }
                
                // Fallback de segurança para garantir o reload
                setTimeout(() => window.location.reload(), 2000);
            }, 500); // Pequeno delay para o 100% ser visível
        }
     }, 150); 
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