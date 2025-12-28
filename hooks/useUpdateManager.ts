
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReleaseNote, VersionData } from '../types';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
  LAST_CHECK_TIME: 'investfiis_last_check_time',
  PENDING_VERSION: 'investfiis_pending_update_version', // Nova chave para persistência
  PENDING_NOTES: 'investfiis_pending_notes'
};

const compareVersions = (v1: string, v2: string) => {
  if (!v1 || !v2) return 0;
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
  const [availableVersion, setAvailableVersion] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.PENDING_VERSION) || null;
  });
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.PENDING_NOTES);
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
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
      const res = await fetch(`./version.json?t=${Date.now()}&r=${Math.random()}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' } 
      });
      
      if (res.ok) {
        const data: VersionData = await res.json();
        updateLastChecked();
        
        if (data.version && typeof data.version === 'string') {
            const hasNewVersion = compareVersions(data.version, currentAppVersion) > 0;
            
            if (hasNewVersion) {
              setAvailableVersion(data.version);
              setReleaseNotes(data.notes || []);
              
              // Persistência: Salva que existe uma versão nova detectada
              localStorage.setItem(STORAGE_KEYS.PENDING_VERSION, data.version);
              localStorage.setItem(STORAGE_KEYS.PENDING_NOTES, JSON.stringify(data.notes || []));
              return true;
            } 
            else if (data.version === currentAppVersion) {
               // Limpa pendências se já estamos na versão certa
               localStorage.removeItem(STORAGE_KEYS.PENDING_VERSION);
               localStorage.removeItem(STORAGE_KEYS.PENDING_NOTES);
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
    
    // Lógica de "Acabei de atualizar"
    if (compareVersions(currentAppVersion, lastSeen) > 0) {
        setWasUpdated(true);
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        // Limpa pendências antigas
        localStorage.removeItem(STORAGE_KEYS.PENDING_VERSION);
        fetchVersionJson().then(() => setShowChangelog(true));
    }

    if (!('serviceWorker' in navigator)) return;

    const channel = new BroadcastChannel('investfiis_sw_updates');
    
    // Escuta evento de ativação do SW
    channel.onmessage = (event) => {
        if (event.data.type === 'SW_ACTIVATED') {
            if (isUserInitiatedUpdate.current) {
                window.location.reload();
            }
        }
    };

    // Fallback de segurança para recarregar
    const handleControllerChange = () => {
        if (isUserInitiatedUpdate.current) {
            window.location.reload();
        }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const initSW = async () => {
        const reg = await navigator.serviceWorker.ready;
        swRegistrationRef.current = reg;

        // CHECK CRÍTICO: Se já existe um worker esperando (baixado em background ou sessão anterior)
        if (reg.waiting) {
            console.log("SW Waiting detectado na inicialização.");
            setIsUpdateAvailable(true);
            setShowUpdateBanner(true);
            // Tenta buscar o JSON só pra ter o número da versão e notas, mas o update já é garantido
            fetchVersionJson(); 
        } else {
            // Se não tem waiting, verifica se tem version nova no servidor
            const hasNew = await fetchVersionJson();
            if (hasNew) {
                // Se o JSON diz que tem novo, forçamos o SW a checar
                reg.update(); 
            }
        }

        // Monitora novas instalações enquanto o app está aberto
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Novo update baixado e pronto para instalar
                        setIsUpdateAvailable(true);
                        setShowUpdateBanner(true);
                        fetchVersionJson(); // Atualiza textos
                    }
                });
            }
        });
    };

    initSW();

    // Verificação periódica apenas se a aba ficar aberta muito tempo
    const interval = setInterval(() => {
        if (navigator.onLine && swRegistrationRef.current) {
            swRegistrationRef.current.update();
        }
    }, 60 * 60 * 1000); // 1 hora

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        channel.close();
        clearInterval(interval);
    };
  }, [currentAppVersion, fetchVersionJson]);

  const manualCheck = useCallback(async () => {
     if (!navigator.onLine) return false;

     // Se já tem um waiting, não precisa checar, já é true
     if (swRegistrationRef.current?.waiting) {
         setIsUpdateAvailable(true);
         return true;
     }

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
     const waitingWorker = reg.waiting;

     if (waitingWorker) {
         // Caminho Feliz: Já temos o worker esperando
         waitingWorker.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
         setUpdateProgress(50);
     } else {
         // Caminho Raro: Usuário mandou atualizar mas o worker não estava 'waiting'
         // Força update e torce pra ser rápido, ou recarrega direto
         try {
             await reg.update();
             // Captura novamente o worker para garantir que o TS entenda o tipo
             const newWorker = reg.waiting;
             if (newWorker) {
                 newWorker.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
             } else {
                 window.location.reload();
             }
         } catch (e) {
             window.location.reload();
         }
     }
     
     // Simulação visual de progresso enquanto o SW assume o controle
     let p = 50;
     const timer = setInterval(() => {
        p = Math.min(p + 15, 99);
        setUpdateProgress(p);
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
