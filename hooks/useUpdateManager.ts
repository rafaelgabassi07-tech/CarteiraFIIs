
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

    // 1. Tratamento de Cold Start (Changelog)
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

    // 2. Listener CRÍTICO de Mudança de Controlador
    // Este evento dispara quando o SW ativo muda.
    const handleControllerChange = () => {
        // Apenas recarrega a página se o usuário clicou no botão.
        // Se o navegador mudou o SW por conta própria (ex: background), NÃO recarregamos.
        // O usuário continuará vendo a versão antiga (cacheada na memória) até decidir reiniciar.
        if (isUserInitiatedUpdate.current) {
            window.location.reload();
        } else {
            console.log("SW mudou em background. Mantendo sessão atual sem reload.");
            // Opcional: Forçar a exibição do banner novamente se ele sumiu
            setIsUpdateAvailable(true);
            setShowUpdateBanner(true);
        }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 3. Monitoramento do SW
    navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        swRegistrationRef.current = reg;

        // Se já tem um SW esperando, mostra o banner
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
                        // Novo SW instalado e esperando. NÃO ativamos. Apenas avisamos.
                        fetchVersionJson().then(() => {
                            setIsUpdateAvailable(true);
                            setShowUpdateBanner(true);
                        });
                    }
                });
            }
        });
    });

    // Check periódico (opcional, a cada 1 hora)
    const interval = setInterval(() => {
        if (swRegistrationRef.current) swRegistrationRef.current.update();
    }, 60 * 60 * 1000);

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        clearInterval(interval);
    };
  }, [currentAppVersion, fetchVersionJson]);

  const manualCheck = useCallback(async () => {
     if (swRegistrationRef.current) {
         try { await swRegistrationRef.current.update(); } catch(e) {}
     }
     return await fetchVersionJson();
  }, [fetchVersionJson]);

  const startUpdateProcess = useCallback(() => {
     if (isUserInitiatedUpdate.current) return;
     isUserInitiatedUpdate.current = true; // Marca a intenção do usuário
     
     setUpdateProgress(1);
     let p = 1;
     // Simula progresso visual
     const timer = setInterval(() => {
        p += Math.max(2, Math.floor(Math.random() * 15));
        if (p >= 100) {
            p = 100;
            clearInterval(timer);
            setUpdateProgress(100);

            // Envia o sinal para o SW
            setTimeout(() => {
                if (swRegistrationRef.current && swRegistrationRef.current.waiting) {
                    swRegistrationRef.current.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
                } else {
                    // Fallback se não houver SW esperando (raro, mas possível)
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
