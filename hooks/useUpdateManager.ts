
import { useState, useEffect, useCallback } from 'react';
import { VersionData, ReleaseNote } from '../types';

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
  const [isChecking, setIsChecking] = useState(false);

  // Busca JSON de versão
  const fetchVersionJson = useCallback(async () => {
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        if (compareVersions(data.version, currentAppVersion) > 0) {
          setAvailableVersion(data.version);
          setReleaseNotes(data.notes || []);
          setIsUpdateAvailable(true);
          return true;
        }
      }
    } catch (e) {
      console.warn('Falha ao buscar version.json', e);
    }
    return false;
  }, [currentAppVersion]);

  // Função Principal de Verificação
  const checkForUpdates = useCallback(async (manual = false) => {
    if (isChecking) return;
    setIsChecking(true);

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      
      // 1. Já existe um esperando?
      if (reg && reg.waiting) {
        setIsUpdateAvailable(true);
        fetchVersionJson();
      } 
      // 2. Se for manual, força o update do SW
      else if (manual && reg) {
        await reg.update(); 
      }
    }

    // Sempre verifica o JSON para garantir metadados
    await fetchVersionJson();
    setIsChecking(false);
  }, [fetchVersionJson, isChecking]);

  const performUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
    }
    window.location.reload();
  }, []);

  // Monitoramento Ativo do Ciclo de Vida do SW
  useEffect(() => {
    const init = async () => {
      await checkForUpdates();

      // Lógica de "Last Seen" para changelog automático
      const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
      if (compareVersions(currentAppVersion, lastSeen) > 0) {
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        try {
            const res = await fetch(`./version.json?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.version === currentAppVersion) {
                    setReleaseNotes(data.notes || []);
                }
            }
        } catch(e){}
      }
    };
    init();

    // LISTENER CRÍTICO: Detecta quando um novo SW termina de instalar em background
    if ('serviceWorker' in navigator) {
        const handleUpdateFound = (reg: ServiceWorkerRegistration) => {
            const installingWorker = reg.installing;
            if (installingWorker) {
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Novo conteúdo disponível e pronto (waiting)
                        setIsUpdateAvailable(true);
                        fetchVersionJson();
                    }
                };
            }
        };

        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
                reg.addEventListener('updatefound', () => handleUpdateFound(reg));
            }
        });

        // Handler para recarregar a página quando o novo SW assumir
        navigator.serviceWorker.addEventListener('controllerchange', () => {
             window.location.reload();
        });
    }
  }, [checkForUpdates, currentAppVersion, fetchVersionJson]);

  return {
    isUpdateAvailable,
    availableVersion,
    releaseNotes,
    checkForUpdates,
    performUpdate,
    isChecking
  };
};
