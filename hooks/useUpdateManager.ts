
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

  // 1. Busca Metadados (JSON) apenas para exibir na UI (não controla a lógica de update em si)
  const fetchVersionMetadata = useCallback(async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        setAvailableVersion(data.version);
        setReleaseNotes(data.notes || []);
        return data;
      }
    } catch (error) {
      console.warn('Falha ao buscar metadados da versão:', error);
    }
    return null;
  }, []);

  // 2. Inicialização e Registro do Service Worker
  useEffect(() => {
    // Verifica se houve atualização recente via localStorage
    const lastVersion = localStorage.getItem('investfiis_version');
    if (lastVersion && lastVersion !== currentAppVersion) {
        setWasUpdated(true);
        setShowChangelog(true);
        fetchVersionMetadata(); // Busca notas para mostrar o que mudou
    }
    localStorage.setItem('investfiis_version', currentAppVersion);

    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
        // Quando o SW assume o controle, recarregamos a página
        window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const registerSW = async () => {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
            swRegistrationRef.current = reg;

            // A) Já existe um worker esperando? (Update baixado em background anteriormente)
            if (reg.waiting) {
                console.log('SW: Update waiting detected on load');
                await fetchVersionMetadata();
                setIsUpdateAvailable(true);
                setShowUpdateBanner(true);
            }

            // B) Monitorar novas instalações
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        // Se chegou em 'installed' e já existe um controlador atual, é um update
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('SW: New update installed and waiting');
                            fetchVersionMetadata().then(() => {
                                setIsUpdateAvailable(true);
                                setShowUpdateBanner(true);
                            });
                        }
                    });
                }
            });

            // Checagem periódica (a cada 1 hora)
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

  // 3. Checagem Manual (Botão "Verificar Atualizações" nas Configurações)
  const checkForUpdates = useCallback(async () => {
     setLastChecked(Date.now());
     
     if (!swRegistrationRef.current) {
         // Fallback se SW não estiver ativo
         const meta = await fetchVersionMetadata();
         return meta ? meta.version !== currentAppVersion : false;
     }

     try {
         await swRegistrationRef.current.update();
         
         // Se após o update tiver algo waiting, retorna true
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

  // 4. Aplicar Atualização (Botão "Atualizar Agora")
  const startUpdateProcess = useCallback(() => {
     const reg = swRegistrationRef.current;
     if (!reg || !reg.waiting) {
         // Fallback de segurança
         window.location.reload();
         return;
     }

     setUpdateProgress(10);
     
     // Envia sinal para o SW pular a espera e assumir o controle
     // Isso disparará o evento 'controllerchange' definido no useEffect, recarregando a página
     reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
     
     // Simula progresso visual enquanto o navegador processa a troca
     let p = 10;
     const interval = setInterval(() => {
         p += 20;
         if (p > 90) p = 90;
         setUpdateProgress(p);
     }, 200);

     setTimeout(() => clearInterval(interval), 5000); // Cleanup de segurança
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
