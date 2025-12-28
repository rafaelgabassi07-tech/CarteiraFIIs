
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
  const isUserUpdateRef = useRef(false); // Ref para controlar se o reload foi solicitado pelo usuário

  // 1. Busca Metadados (JSON)
  const fetchVersionMetadata = useCallback(async () => {
    try {
      // Adiciona timestamp para evitar cache do navegador na requisição fetch
      const res = await fetch(`./version.json?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const data: VersionData = await res.json();
        setAvailableVersion(data.version);
        setReleaseNotes(data.notes || []);
        return data;
      }
    } catch (error) {
      console.warn('Falha ao buscar metadados da versão:', error);
      // Fallback visual caso o JSON falhe
      setReleaseNotes([{ type: 'fix', title: 'Melhorias de Desempenho', desc: 'Atualização de estabilidade e correções internas.' }]);
    }
    return null;
  }, []);

  // 2. Inicialização e Registro do Service Worker
  useEffect(() => {
    // Lógica de "Acabei de atualizar"
    const lastVersion = localStorage.getItem('investfiis_version');
    if (lastVersion && lastVersion !== currentAppVersion) {
        setWasUpdated(true);
        // Só mostramos o changelog se realmente mudou a versão
        fetchVersionMetadata().then(() => setShowChangelog(true));
    }
    localStorage.setItem('investfiis_version', currentAppVersion);

    if (!('serviceWorker' in navigator)) return;

    // Handler para quando a atualização de fato ocorre
    const handleControllerChange = () => {
        // CRÍTICO: Só recarrega a página se o usuário clicou em "Atualizar"
        // Isso previne loops de reload se o navegador atualizar o SW em background
        if (isUserUpdateRef.current) {
            window.location.reload();
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const registerSW = async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
            swRegistrationRef.current = reg;

            // Função auxiliar para processar update encontrado
            const handleUpdateFound = async () => {
                await fetchVersionMetadata(); // Garante que temos as notas ANTES de avisar
                setIsUpdateAvailable(true);
                setShowUpdateBanner(true);
            };

            // A) Já existe um worker esperando? (Update baixado anteriormente)
            if (reg.waiting) {
                console.log('SW: Update waiting detected on load');
                handleUpdateFound();
            }

            // B) Monitorar novas instalações
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        // Se chegou em 'installed' e já existe um controlador atual, é um update
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('SW: New update installed and waiting');
                            handleUpdateFound();
                        }
                    });
                }
            });

            // Checagem periódica suave (a cada 1 hora)
            setInterval(() => {
                reg.update();
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
     
     if (!swRegistrationRef.current) {
         const meta = await fetchVersionMetadata();
         return meta ? meta.version !== currentAppVersion : false;
     }

     try {
         await swRegistrationRef.current.update();
         
         if (swRegistrationRef.current.waiting) {
             await fetchVersionMetadata();
             setIsUpdateAvailable(true);
             return true;
         }
     } catch (e) {
         console.warn("Erro na checagem manual:", e);
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

     // MARCA A REF: Agora sim permitimos o reload automático no controllerchange
     isUserUpdateRef.current = true;
     setUpdateProgress(10);
     
     // Envia sinal para o SW pular a espera
     reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
     
     let p = 10;
     const interval = setInterval(() => {
         p += 20;
         if (p > 90) p = 90;
         setUpdateProgress(p);
     }, 200);

     setTimeout(() => clearInterval(interval), 5000); 
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
