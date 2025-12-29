
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReleaseNote, VersionData } from '../types';

export const useUpdateManager = (currentAppVersion: string) => {
  // Estados de UI
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  
  // Dados da Nova Versão
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  
  // Estados Internos
  const [wasUpdated, setWasUpdated] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const isUserUpdateRef = useRef(false);

  // 1. Busca Metadados (JSON)
  const fetchVersionMetadata = useCallback(async () => {
    try {
      // Adiciona timestamp e random para evitar cache agressivo de CDNs ou browsers
      const res = await fetch(`./version.json?t=${Date.now()}&r=${Math.random()}`, { 
        cache: 'no-store',
        headers: { 
            'Pragma': 'no-cache', 
            'Cache-Control': 'no-cache, no-store, must-revalidate' 
        }
      });
      
      if (res.ok) {
        const data: VersionData = await res.json();
        
        // SEMPRE atualiza as notas, independente da versão
        // Isso corrige o bug onde as notas sumiam se o app já estivesse atualizado
        setReleaseNotes(data.notes || []);
        
        // Verifica se a versão do JSON é diferente da atual
        if (data.version !== currentAppVersion) {
            setAvailableVersion(data.version);
            return data;
        }
      }
    } catch (error) {
      console.warn('Falha ao buscar metadados da versão:', error);
    }
    return null;
  }, [currentAppVersion]);

  // 2. Inicialização e Registro do Service Worker
  useEffect(() => {
    // Lógica de "Acabei de atualizar"
    const lastVersion = localStorage.getItem('investfiis_version');
    if (lastVersion && lastVersion !== currentAppVersion) {
        setWasUpdated(true);
        // Busca as notas para exibir no modal de Changelog pós-update
        fetchVersionMetadata().then(() => setShowChangelog(true));
    } else {
        // Se não houve update recente, busca notas apenas para popular a tela de Configurações
        fetchVersionMetadata();
    }
    
    localStorage.setItem('investfiis_version', currentAppVersion);

    if (!('serviceWorker' in navigator)) return;

    // Handler para quando a atualização de fato ocorre
    const handleControllerChange = () => {
        if (isUserUpdateRef.current) {
            window.location.reload();
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const registerSW = async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
            swRegistrationRef.current = reg;

            const handleUpdateFound = async () => {
                const meta = await fetchVersionMetadata(); 
                if (meta || reg.waiting) {
                    setIsUpdateAvailable(true);
                    setShowUpdateBanner(true);
                }
            };

            if (reg.waiting) {
                console.log('SW: Update waiting detected on load');
                handleUpdateFound();
            }

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('SW: New update installed and waiting');
                            handleUpdateFound();
                        }
                    });
                }
            });

            setInterval(() => {
                reg.update();
                fetchVersionMetadata(); // Também verifica o JSON periodicamente
            }, 60 * 60 * 1000);

        } catch (err) {
            console.error('SW: Registration failed', err);
        }
    };

    registerSW();

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [currentAppVersion, fetchVersionMetadata]);

  // 3. Checagem Manual
  const checkForUpdates = useCallback(async () => {
     setLastChecked(Date.now());
     
     // 1. Checagem rápida via JSON (Metadados)
     const meta = await fetchVersionMetadata();
     if (meta && meta.version !== currentAppVersion) {
         setIsUpdateAvailable(true);
         return true;
     }

     // 2. Checagem profunda via Service Worker
     if (swRegistrationRef.current) {
         try {
             await swRegistrationRef.current.update();
             if (swRegistrationRef.current.waiting || swRegistrationRef.current.installing) {
                 setIsUpdateAvailable(true);
                 return true;
             }
         } catch (e) {
             console.warn("Erro na checagem manual do SW:", e);
         }
     }
     
     return false;
  }, [currentAppVersion, fetchVersionMetadata]);

  // 4. Aplicar Atualização
  const startUpdateProcess = useCallback(() => {
     const reg = swRegistrationRef.current;
     
     if (!reg || !reg.waiting) {
         window.location.reload();
         return;
     }

     isUserUpdateRef.current = true;
     setUpdateProgress(10);
     
     reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
     
     let p = 10;
     const interval = setInterval(() => {
         p += 20;
         if (p > 90) p = 90;
         setUpdateProgress(p);
     }, 200);

     setTimeout(() => {
         clearInterval(interval);
         window.location.reload();
     }, 4000); 
  }, []);

  return {
    isUpdateAvailable,
    showUpdateBanner,
    setShowUpdateBanner,
    availableVersion,
    releaseNotes,
    updateProgress,
    showChangelog,
    setShowChangelog,
    wasUpdated,
    lastChecked,
    checkForUpdates,
    startUpdateProcess
  };
};
