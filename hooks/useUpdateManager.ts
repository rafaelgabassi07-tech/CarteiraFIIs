
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
  const isUserInitiatedUpdate = useRef(false);

  const updateLastChecked = useCallback(() => {
    const now = Date.now();
    setLastChecked(now);
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, now.toString());
  }, []);

  const fetchVersionJson = useCallback(async () => {
    if (!navigator.onLine) return false;

    try {
      // Adicionamos timestamp E random para garantir que o browser vá a rede (bypass cache)
      const res = await fetch(`./version.json?t=${Date.now()}&r=${Math.random()}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } 
      });
      
      if (res.ok) {
        const data: VersionData = await res.json();
        updateLastChecked();
        
        // Só atualiza o estado se a versão for válida
        if (data.version && typeof data.version === 'string') {
            // Se estamos checando uma atualização nova
            if (compareVersions(data.version, currentAppVersion) > 0) {
              setAvailableVersion(data.version);
              setReleaseNotes(data.notes || []);
              return true;
            } 
            // Se estamos buscando notas da versão atual (após update)
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
    // 1. Lógica de "Cold Start" (Primeira vez abrindo após update)
    // Isso roda independente do Service Worker
    const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
    
    // Se a versão atual é maior que a última vista, houve update!
    if (compareVersions(currentAppVersion, lastSeen) > 0) {
        setWasUpdated(true);
        // Salva a nova versão
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        
        // Busca as notas para mostrar o changelog de "O que há de novo"
        fetchVersionJson().then(() => {
             setShowChangelog(true);
        });
    } else {
        // Apenas carrega as notas para a tela de settings (sem abrir modal)
        fetchVersionJson();
    }

    if (!('serviceWorker' in navigator)) return;

    // 2. Configuração do BroadcastChannel para comunicação SW -> Client
    const channel = new BroadcastChannel('investfiis_sw_updates');
    
    channel.onmessage = (event) => {
        if (event.data.type === 'SW_ACTIVATED') {
            console.log("✅ Novo SW ativado via BroadcastChannel.");
            // Só recarrega se o usuário tiver clicado no botão de atualizar
            if (isUserInitiatedUpdate.current) {
                window.location.reload();
            }
        }
    };

    // 3. Fallback de Controller Change (para browsers antigos)
    const handleControllerChange = () => {
        if (isUserInitiatedUpdate.current) {
            console.log("🔄 Fallback: Controller mudou. Recarregando...");
            window.location.reload();
        }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 4. Auto-Check ao voltar para a aba
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            if (swRegistrationRef.current) {
                swRegistrationRef.current.update().catch(() => {});
            }
            fetchVersionJson().then(hasNew => {
                if (hasNew) {
                    setIsUpdateAvailable(true);
                    setShowUpdateBanner(true);
                }
            });
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 5. Inicialização do Service Worker
    const initSW = async () => {
        const reg = await navigator.serviceWorker.ready;
        swRegistrationRef.current = reg;

        // Se já tiver um worker esperando (download feito anteriormente)
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
        
        // Verifica updates 10s após carregar a página
        setTimeout(() => {
            reg.update().catch(() => {});
        }, 10000);
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
     if (!swRegistrationRef.current || !swRegistrationRef.current.waiting) {
        // Se não tem SW esperando, tenta forçar um update primeiro
        if (swRegistrationRef.current) {
            await swRegistrationRef.current.update();
        }
        if (!swRegistrationRef.current?.waiting) {
             console.warn("Nenhum SW esperando para ativar.");
             // Pode ser que o update já esteja lá mas não em waiting?
             // Em dev, as vezes acontece. Mas em prod, se availableVersion > current, deve haver SW.
             return;
        }
     }
     
     if (isUserInitiatedUpdate.current) return; // Já em andamento

     isUserInitiatedUpdate.current = true;
     setUpdateProgress(5);
     
     const reg = swRegistrationRef.current;
     
     // Simulação visual de progresso enquanto o SW ativa
     let p = 5;
     const timer = setInterval(() => {
        const increment = p < 70 ? (Math.random() * 10 + 5) : (Math.random() * 3 + 1);
        p = Math.min(p + increment, 99);
        setUpdateProgress(Math.floor(p));

        if (p >= 99) {
            clearInterval(timer);
            setTimeout(() => {
                setUpdateProgress(100);
                // Comando real para o SW
                if (reg.waiting) {
                    console.log("🚀 Enviando comando SKIP_WAITING...");
                    reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                } else {
                    window.location.reload();
                }
                
                // Fail-safe
                setTimeout(() => {
                    if (isUserInitiatedUpdate.current) window.location.reload();
                }, 4000);
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
